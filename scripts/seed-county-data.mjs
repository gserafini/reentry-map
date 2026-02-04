#!/usr/bin/env node

/**
 * Seed US County Data for Coverage Tracking
 *
 * This script populates the county_data table with US counties,
 * including FIPS codes, population data, and priority tiers.
 *
 * Usage: node scripts/seed-county-data.mjs
 *
 * Environment Variables Required:
 * - DATABASE_URL
 */

import postgres from 'postgres'
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

const sql = postgres(
  process.env.DATABASE_URL || 'postgresql://reentrymap:password@localhost:5432/reentry_map'
)

/**
 * Initial seed data for California Bay Area counties (Tier 1 priority)
 * This demonstrates the data structure. Full US county data can be loaded
 * from census.gov or other sources.
 */
const initialCounties = [
  {
    fips_code: '06001',
    state_fips: '06',
    county_fips: '001',
    state_code: 'CA',
    state_name: 'California',
    county_name: 'Alameda County',
    total_population: 1671329,
    population_year: 2023,
    estimated_annual_releases: 8500,
    reentry_data_source: 'CA DOC Statistical Reports 2023',
    reentry_data_year: 2023,
    priority_tier: 1,
    priority_weight: 5.0,
    priority_reason:
      'Major urban center with high reentry population, existing reentry infrastructure',
    center_lat: 37.6017,
    center_lng: -121.7195,
  },
  {
    fips_code: '06013',
    state_fips: '06',
    county_fips: '013',
    state_code: 'CA',
    state_name: 'California',
    county_name: 'Contra Costa County',
    total_population: 1165927,
    population_year: 2023,
    estimated_annual_releases: 4200,
    reentry_data_source: 'CA DOC Statistical Reports 2023',
    reentry_data_year: 2023,
    priority_tier: 2,
    priority_weight: 3.0,
    priority_reason: 'Bay Area county with significant reentry needs',
    center_lat: 37.9161,
    center_lng: -121.9506,
  },
  {
    fips_code: '06075',
    state_fips: '06',
    county_fips: '075',
    state_code: 'CA',
    state_name: 'California',
    county_name: 'San Francisco County',
    total_population: 873965,
    population_year: 2023,
    estimated_annual_releases: 3800,
    reentry_data_source: 'CA DOC Statistical Reports 2023',
    reentry_data_year: 2023,
    priority_tier: 1,
    priority_weight: 5.0,
    priority_reason: 'Major urban center, high cost of living area with critical reentry services',
    center_lat: 37.7749,
    center_lng: -122.4194,
  },
  {
    fips_code: '06081',
    state_fips: '06',
    county_fips: '081',
    state_code: 'CA',
    state_name: 'California',
    county_name: 'San Mateo County',
    total_population: 764442,
    population_year: 2023,
    estimated_annual_releases: 2100,
    reentry_data_source: 'CA DOC Statistical Reports 2023',
    reentry_data_year: 2023,
    priority_tier: 2,
    priority_weight: 3.0,
    priority_reason: 'Bay Area county with high cost of living',
    center_lat: 37.4337,
    center_lng: -122.4014,
  },
  {
    fips_code: '06085',
    state_fips: '06',
    county_fips: '085',
    state_code: 'CA',
    state_name: 'California',
    county_name: 'Santa Clara County',
    total_population: 1936259,
    population_year: 2023,
    estimated_annual_releases: 5200,
    reentry_data_source: 'CA DOC Statistical Reports 2023',
    reentry_data_year: 2023,
    priority_tier: 1,
    priority_weight: 5.0,
    priority_reason:
      'Largest Bay Area county by population, major tech hub with reentry challenges',
    center_lat: 37.3541,
    center_lng: -121.9552,
  },
  {
    fips_code: '06095',
    state_fips: '06',
    county_fips: '095',
    state_code: 'CA',
    state_name: 'California',
    county_name: 'Solano County',
    total_population: 453491,
    population_year: 2023,
    estimated_annual_releases: 2400,
    reentry_data_source: 'CA DOC Statistical Reports 2023',
    reentry_data_year: 2023,
    priority_tier: 2,
    priority_weight: 3.0,
    priority_reason: 'Bay Area adjacent county with state prison facilities',
    center_lat: 38.2494,
    center_lng: -121.9018,
  },
]

async function seedCounties() {
  console.log('🌱 Seeding county data...')
  console.log(`📊 Counties to insert: ${initialCounties.length}`)

  try {
    // Check if counties already exist
    const existingCounties = await sql`SELECT fips_code FROM county_data`

    const existingFips = new Set(existingCounties.map((c) => c.fips_code))

    // Filter out counties that already exist
    const newCounties = initialCounties.filter((c) => !existingFips.has(c.fips_code))

    if (newCounties.length === 0) {
      console.log('ℹ️  All counties already exist in database')
      return
    }

    console.log(`📥 Inserting ${newCounties.length} new counties...`)

    // Insert counties one at a time
    let inserted = 0

    for (const county of newCounties) {
      await sql`
        INSERT INTO county_data (
          fips_code, state_fips, county_fips, state_code, state_name, county_name,
          total_population, population_year, estimated_annual_releases,
          reentry_data_source, reentry_data_year, priority_tier,
          priority_weight, priority_reason, center_lat, center_lng
        ) VALUES (
          ${county.fips_code}, ${county.state_fips}, ${county.county_fips},
          ${county.state_code}, ${county.state_name}, ${county.county_name},
          ${county.total_population}, ${county.population_year}, ${county.estimated_annual_releases},
          ${county.reentry_data_source}, ${county.reentry_data_year}, ${county.priority_tier},
          ${county.priority_weight}, ${county.priority_reason}, ${county.center_lat}, ${county.center_lng}
        )
      `
      inserted++
    }

    console.log(`   ✅ Inserted ${inserted}/${newCounties.length} counties`)

    console.log(`\n✅ Successfully seeded ${inserted} counties`)
  } catch (error) {
    console.error('❌ Error seeding counties:', error)
    throw error
  }
}

async function showStats() {
  console.log('\n📊 County Data Statistics')
  console.log('='.repeat(60))

  try {
    // Total counties
    const [{ count: totalCount }] = await sql`SELECT COUNT(*)::int AS count FROM county_data`

    // Counties by priority tier
    const tierData = await sql`
      SELECT priority_tier FROM county_data WHERE priority_tier IS NOT NULL
    `

    const tierCounts = {}
    tierData.forEach((row) => {
      tierCounts[row.priority_tier] = (tierCounts[row.priority_tier] || 0) + 1
    })

    console.log(`Total counties: ${totalCount || 0}`)
    console.log('\nCounties by Priority Tier:')
    for (let tier = 1; tier <= 5; tier++) {
      console.log(`  Tier ${tier}: ${tierCounts[tier] || 0} counties`)
    }

    // Counties by state
    const stateData = await sql`SELECT state_code, state_name FROM county_data`

    const stateCounts = {}
    stateData.forEach((row) => {
      stateCounts[row.state_code] = (stateCounts[row.state_code] || 0) + 1
    })

    const stateList = Object.entries(stateCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    console.log('\nTop 10 States by County Count:')
    stateList.forEach(([code, count]) => {
      console.log(`  ${code}: ${count} counties`)
    })
  } catch (error) {
    console.error('❌ Error fetching statistics:', error)
  }
}

async function main() {
  console.log('🚀 County Data Seeding Script')
  console.log('='.repeat(60))

  try {
    await seedCounties()
    await showStats()

    console.log('\n' + '='.repeat(60))
    console.log('✅ County data seeding complete!')
    console.log('\n📍 Next steps:')
    console.log('   1. Add more counties from full US Census data (optional)')
    console.log('   2. Run: node scripts/enrich-resources-with-county.mjs')
    console.log('   3. Calculate coverage metrics via admin dashboard')
    console.log('\n💡 To load full US county data:')
    console.log(
      '   - Download from: https://www.census.gov/geographies/reference-files/2020/demo/popest/2020-fips.html'
    )
    console.log('   - Or use this script as a template to bulk import your data')
  } finally {
    await sql.end()
  }
}

main().catch(async (error) => {
  console.error('\n❌ Fatal error:', error)
  await sql.end()
  process.exit(1)
})
