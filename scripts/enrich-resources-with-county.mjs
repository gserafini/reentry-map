#!/usr/bin/env node

/**
 * Enrich Resources with County FIPS Codes
 *
 * This script uses reverse geocoding to add county_fips to existing resources
 * based on their latitude/longitude coordinates.
 *
 * Usage: node scripts/enrich-resources-with-county.mjs
 *
 * Environment Variables Required:
 * - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

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

// Load environment variables
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
 * Simple point-in-polygon test to determine if a point is in a county
 * This is a basic implementation - for production, you'd want to use
 * PostGIS ST_Contains with actual county boundary geometries
 */
function determineCountyFips(lat, lng, counties) {
  // For now, use a simple nearest-neighbor approach
  // Find the county with the closest center point

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

  // Only assign if within reasonable distance (100km)
  if (nearestCounty && minDistance < 100) {
    return nearestCounty.fips_code
  }

  return null
}

async function enrichResources() {
  console.log('🔍 Fetching resources without county_fips...')

  try {
    // Get all resources that don't have county_fips set
    const { data: resources, error: resourcesError } = await supabase
      .from('resources')
      .select('id, name, address, city, state, latitude, longitude, county_fips')
      .or('county_fips.is.null,county_fips.eq.')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (resourcesError) throw resourcesError

    if (!resources || resources.length === 0) {
      console.log('✅ All resources already have county_fips assigned')
      return
    }

    console.log(`📊 Found ${resources.length} resources to enrich`)

    // Get all counties
    const { data: counties, error: countiesError } = await supabase
      .from('county_data')
      .select('fips_code, state_code, county_name, center_lat, center_lng')

    if (countiesError) throw countiesError

    console.log(`📍 Loaded ${counties.length} counties for matching`)

    // Group counties by state for faster lookup
    const countiesByState = {}
    counties.forEach((county) => {
      if (!countiesByState[county.state_code]) {
        countiesByState[county.state_code] = []
      }
      countiesByState[county.state_code].push(county)
    })

    console.log('\n🔄 Enriching resources...')
    let enriched = 0
    let skipped = 0

    for (const resource of resources) {
      // Get state-specific counties to search
      const stateCounties = countiesByState[resource.state] || []

      if (stateCounties.length === 0) {
        console.log(`   ⚠️  No counties found for state: ${resource.state} (${resource.name})`)
        skipped++
        continue
      }

      // Determine county FIPS
      const countyFips = determineCountyFips(resource.latitude, resource.longitude, stateCounties)

      if (countyFips) {
        // Update resource with county_fips
        const { error: updateError } = await supabase
          .from('resources')
          .update({ county_fips: countyFips })
          .eq('id', resource.id)

        if (updateError) {
          console.error(`   ❌ Error updating resource ${resource.id}:`, updateError.message)
          skipped++
        } else {
          enriched++
          if (enriched % 10 === 0) {
            console.log(`   ✅ Enriched ${enriched}/${resources.length} resources`)
          }
        }
      } else {
        console.log(
          `   ⚠️  Could not determine county for: ${resource.name} (${resource.city}, ${resource.state})`
        )
        skipped++
      }
    }

    console.log(`\n✅ Enrichment complete!`)
    console.log(`   📊 Successfully enriched: ${enriched} resources`)
    console.log(`   ⚠️  Skipped: ${skipped} resources`)
  } catch (error) {
    console.error('❌ Error enriching resources:', error)
    throw error
  }
}

async function showStats() {
  console.log('\n📊 Resource County Coverage Statistics')
  console.log('='.repeat(60))

  try {
    // Total resources
    const { count: totalCount } = await supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })

    // Resources with county_fips
    const { count: withCounty } = await supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .not('county_fips', 'is', null)

    // Resources by county
    const { data: countyData } = await supabase
      .from('resources')
      .select('county_fips')
      .not('county_fips', 'is', null)

    const countyCounts = {}
    countyData?.forEach((row) => {
      countyCounts[row.county_fips] = (countyCounts[row.county_fips] || 0) + 1
    })

    const coverage = totalCount > 0 ? ((withCounty / totalCount) * 100).toFixed(1) : 0

    console.log(`Total resources: ${totalCount || 0}`)
    console.log(`Resources with county: ${withCounty || 0}`)
    console.log(`Coverage: ${coverage}%`)
    console.log(`\nUnique counties with resources: ${Object.keys(countyCounts).length}`)

    // Top counties by resource count
    const topCounties = Object.entries(countyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    console.log('\nTop 10 Counties by Resource Count:')
    for (const [fips, count] of topCounties) {
      // Get county name
      const { data: county } = await supabase
        .from('county_data')
        .select('county_name, state_code')
        .eq('fips_code', fips)
        .single()

      const name = county ? `${county.county_name}, ${county.state_code}` : fips
      console.log(`  ${name}: ${count} resources`)
    }
  } catch (error) {
    console.error('❌ Error fetching statistics:', error)
  }
}

async function main() {
  console.log('🚀 Resource County Enrichment Script')
  console.log('='.repeat(60))

  await enrichResources()
  await showStats()

  console.log('\n' + '='.repeat(60))
  console.log('✅ Resource enrichment complete!')
  console.log('\n📍 Next steps:')
  console.log('   1. Go to /admin/coverage-map in your app')
  console.log('   2. Click "Recalculate All Metrics" to generate coverage scores')
  console.log('   3. View coverage statistics and maps')
  console.log('\n💡 Note: This script uses a simple nearest-neighbor algorithm.')
  console.log('   For production accuracy, consider using PostGIS ST_Contains')
  console.log('   with actual county boundary polygons (GeoJSON).')
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
