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
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 */

import { createClient } from '@supabase/supabase-js'
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  console.error('   (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as fallback)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    const { data: resources, error: resourcesError } = await supabase
      .from('resources')
      .select('id, name, address, city, state, latitude, longitude, county_fips, county')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (resourcesError) throw resourcesError

    if (!resources || resources.length === 0) {
      console.log('❌ No resources found with coordinates')
      return
    }

    console.log(`📊 Found ${resources.length} resources to process`)

    // Get all counties with geometry (paginated to handle 3000+ counties)
    let counties = []
    let page = 0
    const pageSize = 1000

    while (true) {
      const { data: batch, error: countiesError } = await supabase
        .from('county_data')
        .select('fips_code, state_code, county_name, center_lat, center_lng, geometry')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (countiesError) throw countiesError
      if (!batch || batch.length === 0) break

      counties = counties.concat(batch)
      page++

      if (batch.length < pageSize) break
    }

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
        const { error: updateError } = await supabase
          .from('resources')
          .update({
            county_fips: newFips,
            county: countyName,
          })
          .eq('id', resource.id)

        if (updateError) {
          console.error(`   ❌ Error updating resource ${resource.id}:`, updateError.message)
          failed++
        } else {
          updated++
          methodCounts[method] = (methodCounts[method] || 0) + 1
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
    const { data: updatedResources } = await supabase
      .from('resources')
      .select('county_fips')
      .not('county_fips', 'is', null)

    const newAssignments = {}
    updatedResources?.forEach((r) => {
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
  } catch (_error) {
    console.error('❌ Error fixing resource counties:', error)
    throw error
  }
}

async function main() {
  console.log('\n🔧 Resource County Assignment Fix Tool')
  console.log('Uses proper GeoJSON polygon boundaries for accuracy')
  console.log('='.repeat(60) + '\n')

  await fixResourceCounties()

  console.log('\n✅ County assignment fix complete!')
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
