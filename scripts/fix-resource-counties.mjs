#!/usr/bin/env node

/**
 * Fix Resource County Assignments
 *
 * This script uses proper point-in-polygon testing with GeoJSON boundaries
 * to correctly assign county_fips to resources based on their lat/lng.
 *
 * This fixes the issue where nearest-neighbor matching incorrectly assigned
 * Oakland resources to San Francisco County instead of Alameda County.
 *
 * Usage: node scripts/fix-resource-counties.mjs
 *
 * Environment Variables Required:
 * - DATABASE_URL
 */

import postgres from 'postgres'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Load city-county lookup table
const cityCountyLookup = JSON.parse(
  readFileSync(join(projectRoot, 'lib/data/city-county-lookup.json'), 'utf-8')
)

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = join(projectRoot, '.env.local')
    const envFile = readFileSync(envPath, 'utf-8')
    const lines = envFile.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=').trim()

      if (key && value && !process.env[key]) {
        process.env[key] = value
      }
    }
  } catch (_error) {
    console.warn('⚠️  Could not load .env.local file')
  }
}

loadEnv()

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not set. Add it to .env.local')
  process.exit(1)
}
const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
const sql = postgres(databaseUrl, {
  ssl: isLocalhost ? false : 'require',
})

/**
 * Remove " County" suffix from county name for cleaner storage
 */
function cleanCountyName(countyName) {
  if (!countyName) return null
  return countyName.replace(/ (County|Parish|Borough|Census Area|Municipality)$/i, '')
}

/**
 * Determine county using hybrid approach:
 * 1. City/State lookup (fastest, most reliable for known cities)
 * 2. Point-in-polygon test (handles missing city data)
 * 3. Nearest-neighbor fallback (edge cases)
 */
function determineCountyFips(resource, counties) {
  const { city, state, latitude: lat, longitude: lng } = resource

  // Strategy 1: City/State lookup (O(1), handles 95% of cases)
  if (city && state) {
    const lookupKey = `${city.toLowerCase()}|${state.toLowerCase()}`
    const countyData = cityCountyLookup[lookupKey]

    if (countyData) {
      return {
        fips: countyData.fips,
        name: countyData.county,
        method: 'city-lookup',
      }
    }
  }

  // Strategy 2: Point-in-polygon test
  if (lat && lng) {
    const resourcePoint = point([lng, lat]) // GeoJSON uses [lng, lat] order

    for (const county of counties) {
      if (!county.geometry) continue

      try {
        if (booleanPointInPolygon(resourcePoint, county.geometry)) {
          return {
            fips: county.fips_code,
            name: cleanCountyName(county.county_name),
            method: 'polygon',
          }
        }
      } catch (_error) {
        // Skip invalid geometries
        continue
      }
    }
  }

  // Strategy 3: Nearest-neighbor fallback
  if (lat && lng) {
    let nearestCounty = null
    let minDistance = Infinity

    for (const county of counties) {
      if (!county.center_lat || !county.center_lng) continue

      // Calculate Haversine distance
      const R = 6371 // Earth's radius in km
      const dLat = ((county.center_lat - lat) * Math.PI) / 180
      const dLng = ((county.center_lng - lng) * Math.PI) / 180

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((county.center_lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2)

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distance = R * c

      if (distance < minDistance) {
        minDistance = distance
        nearestCounty = county
      }
    }

    // Only assign if within reasonable distance (50km for fallback)
    if (nearestCounty && minDistance < 50) {
      return {
        fips: nearestCounty.fips_code,
        name: cleanCountyName(nearestCounty.county_name),
        method: 'nearest-neighbor',
        distance: minDistance,
      }
    }
  }

  return null
}

async function fixResourceCounties() {
  console.log('🚀 Fix Resource County Assignments')
  console.log('='.repeat(60))
  console.log('🔍 Fetching resources with coordinates...\n')

  try {
    // Get all resources that have coordinates
    const resources = await sql`
      SELECT id, name, address, city, state, latitude, longitude, county_fips, county
      FROM resources
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `

    if (resources.length === 0) {
      console.log('❌ No resources found with coordinates')
      return
    }

    console.log(`📊 Found ${resources.length} resources to process`)

    // Get all counties with geometry
    const counties = await sql`
      SELECT fips_code, state_code, county_name, center_lat, center_lng, geometry
      FROM county_data
    `

    console.log(`📍 Loaded ${counties.length} counties with boundaries\n`)

    // Debug: Check a few counties to verify geometry format
    const sampleCounty = counties.find((c) => c.county_name.includes('Alameda'))
    if (sampleCounty) {
      console.log(`🔍 Sample county: ${sampleCounty.county_name}, ${sampleCounty.state_code}`)
      console.log(`   FIPS: ${sampleCounty.fips_code}`)
      console.log(`   Has geometry: ${!!sampleCounty.geometry}`)
      console.log(`   Geometry type: ${sampleCounty.geometry?.type || 'N/A'}`)
      console.log(`   Center: ${sampleCounty.center_lat}, ${sampleCounty.center_lng}\n`)
    }

    // Show current state
    const currentAssignments = {}
    resources.forEach((r) => {
      if (r.county_fips) {
        currentAssignments[r.county_fips] = (currentAssignments[r.county_fips] || 0) + 1
      }
    })

    console.log('📌 Current county assignments:')
    for (const [fips, count] of Object.entries(currentAssignments).sort((a, b) => b[1] - a[1])) {
      const county = counties.find((c) => c.fips_code === fips)
      const name = county ? `${county.county_name}, ${county.state_code}` : fips
      console.log(`   ${name}: ${count} resources`)
    }

    console.log('\n🔄 Re-assigning counties using hybrid approach...\n')
    let updated = 0
    let unchanged = 0
    let failed = 0
    const methodCounts = {
      'city-lookup': 0,
      polygon: 0,
      'nearest-neighbor': 0,
    }

    for (const resource of resources) {
      const oldFips = resource.county_fips

      // Determine correct county using hybrid approach
      const countyResult = determineCountyFips(resource, counties)

      if (!countyResult) {
        console.log(
          `   ❌ Could not determine county for: ${resource.name} (${resource.city}, ${resource.state})`
        )
        failed++
        continue
      }

      const { fips: newFips, name: countyName, method, distance } = countyResult

      if (newFips !== oldFips) {
        const oldCounty = counties.find((c) => c.fips_code === oldFips)
        const oldName = oldCounty
          ? `${cleanCountyName(oldCounty.county_name)}, ${oldCounty.state_code}`
          : oldFips || 'null'
        const newName = `${countyName}, ${resource.state || 'CA'}`

        // Show method used
        const methodIcon = method === 'city-lookup' ? '🏙️' : method === 'polygon' ? '📍' : '⚠️'
        const methodInfo =
          method === 'nearest-neighbor' ? ` (${distance.toFixed(1)}km, fallback)` : ` (${method})`

        console.log(`   ${methodIcon} ${resource.name}`)
        console.log(`      ${oldName} → ${newName}${methodInfo}`)

        // Update resource
        try {
          await sql`
            UPDATE resources
            SET county_fips = ${newFips}, county = ${countyName}
            WHERE id = ${resource.id}
          `
          updated++
          methodCounts[method] = (methodCounts[method] || 0) + 1
        } catch (updateError) {
          console.error(`   ❌ Error updating resource ${resource.id}:`, updateError.message)
          failed++
        }
      } else {
        unchanged++
        if (unchanged % 10 === 0) {
          console.log(`   ✅ ${unchanged} resources already correctly assigned`)
        }
      }
    }

    console.log('\n📊 Assignment Methods Used:')
    console.log(`   🏙️  City lookup: ${methodCounts['city-lookup']} (fast)`)
    console.log(`   📍 Polygon test: ${methodCounts['polygon']} (accurate)`)
    console.log(`   ⚠️  Nearest-neighbor: ${methodCounts['nearest-neighbor']} (fallback)`)

    console.log('\n📊 Summary')
    console.log('='.repeat(60))
    console.log(`✅ Updated: ${updated} resources`)
    console.log(`✓  Unchanged: ${unchanged} resources`)
    console.log(`❌ Failed: ${failed} resources`)
    console.log(`📌 Total processed: ${resources.length} resources`)

    // Show new state
    const updatedResources = await sql`
      SELECT county_fips FROM resources WHERE county_fips IS NOT NULL
    `

    const newAssignments = {}
    updatedResources.forEach((r) => {
      newAssignments[r.county_fips] = (newAssignments[r.county_fips] || 0) + 1
    })

    console.log('\n📌 New county assignments:')
    for (const [fips, count] of Object.entries(newAssignments).sort((a, b) => b[1] - a[1])) {
      const county = counties.find((c) => c.fips_code === fips)
      const name = county ? `${county.county_name}, ${county.state_code}` : fips
      console.log(`   ${name}: ${count} resources`)
    }

    if (updated > 0) {
      console.log('\n💡 Next steps:')
      console.log('   1. Go to /admin/coverage-map to verify counties are correct')
      console.log('   2. Click "Recalculate All Metrics" to update coverage scores')
      console.log('   3. Review the coverage dashboard')
    }
  } catch (error) {
    console.error('❌ Error fixing resource counties:', error)
    throw error
  }
}

async function main() {
  console.log('\n🔧 Resource County Assignment Fix Tool')
  console.log('Uses proper GeoJSON polygon boundaries for accuracy')
  console.log('='.repeat(60) + '\n')

  try {
    await fixResourceCounties()
    console.log('\n✅ County assignment fix complete!')
  } finally {
    await sql.end()
  }
}

main().catch(async (error) => {
  console.error('\n❌ Fatal error:', error)
  await sql.end()
  process.exit(1)
})
