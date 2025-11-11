#!/usr/bin/env node

/**
 * Load all US counties from GeoJSON into county_data table
 *
 * Usage: node scripts/load-us-counties.mjs
 *
 * Environment Variables Required:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// State name mapping
const stateNames = {
  '01': 'Alabama',
  '02': 'Alaska',
  '04': 'Arizona',
  '05': 'Arkansas',
  '06': 'California',
  '08': 'Colorado',
  '09': 'Connecticut',
  10: 'Delaware',
  11: 'District of Columbia',
  12: 'Florida',
  13: 'Georgia',
  15: 'Hawaii',
  16: 'Idaho',
  17: 'Illinois',
  18: 'Indiana',
  19: 'Iowa',
  20: 'Kansas',
  21: 'Kentucky',
  22: 'Louisiana',
  23: 'Maine',
  24: 'Maryland',
  25: 'Massachusetts',
  26: 'Michigan',
  27: 'Minnesota',
  28: 'Mississippi',
  29: 'Missouri',
  30: 'Montana',
  31: 'Nebraska',
  32: 'Nevada',
  33: 'New Hampshire',
  34: 'New Jersey',
  35: 'New Mexico',
  36: 'New York',
  37: 'North Carolina',
  38: 'North Dakota',
  39: 'Ohio',
  40: 'Oklahoma',
  41: 'Oregon',
  42: 'Pennsylvania',
  44: 'Rhode Island',
  45: 'South Carolina',
  46: 'South Dakota',
  47: 'Tennessee',
  48: 'Texas',
  49: 'Utah',
  50: 'Vermont',
  51: 'Virginia',
  53: 'Washington',
  54: 'West Virginia',
  55: 'Wisconsin',
  56: 'Wyoming',
  60: 'American Samoa',
  66: 'Guam',
  69: 'Northern Mariana Islands',
  72: 'Puerto Rico',
  78: 'Virgin Islands',
}

// State abbreviations
const stateAbbrev = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  'District of Columbia': 'DC',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
  'American Samoa': 'AS',
  Guam: 'GU',
  'Northern Mariana Islands': 'MP',
  'Puerto Rico': 'PR',
  'Virgin Islands': 'VI',
}

/**
 * Calculate centroid of a polygon
 */
function calculateCentroid(geometry) {
  if (!geometry || !geometry.coordinates) return { lat: null, lng: null }

  let coordinates = geometry.coordinates

  // Handle MultiPolygon
  if (geometry.type === 'MultiPolygon') {
    // Use the first (usually largest) polygon
    coordinates = coordinates[0]
  }

  // Flatten the polygon ring
  const ring = coordinates[0]

  // Calculate centroid
  let latSum = 0
  let lngSum = 0
  let count = 0

  for (const point of ring) {
    lngSum += point[0]
    latSum += point[1]
    count++
  }

  return {
    lat: latSum / count,
    lng: lngSum / count,
  }
}

async function loadCounties() {
  console.log('🚀 US Counties Data Loader')
  console.log('='.repeat(60))

  try {
    // Read GeoJSON file
    console.log('📖 Reading GeoJSON file...')
    const geojson = JSON.parse(readFileSync('/tmp/us-counties.json', 'utf-8'))

    const features = geojson.features
    console.log(`📊 Found ${features.length} counties in GeoJSON`)

    // Prepare county records
    const counties = []

    for (const feature of features) {
      const props = feature.properties
      const stateFips = props.STATE
      const countyFips = props.COUNTY
      const fipsCode = feature.id || `${stateFips}${countyFips}` // Full 5-digit FIPS

      const stateName = stateNames[stateFips] || 'Unknown'
      const stateCode = stateAbbrev[stateName] || stateFips

      // Calculate centroid
      const centroid = calculateCentroid(feature.geometry)

      counties.push({
        fips_code: fipsCode,
        state_fips: stateFips,
        county_fips: countyFips,
        state_code: stateCode,
        state_name: stateName,
        county_name: `${props.NAME} ${props.LSAD}`,
        geometry: feature.geometry,
        center_lat: centroid.lat,
        center_lng: centroid.lng,
        // Placeholder values - can be filled in later
        total_population: null,
        population_year: 2020,
        estimated_annual_releases: null,
        reentry_data_source: null,
        reentry_data_year: null,
        priority_tier: null,
        priority_weight: 1.0,
        priority_reason: null,
      })
    }

    console.log(`\n📥 Preparing to insert ${counties.length} counties...`)
    console.log('⚠️  This will replace any existing counties\n')

    // Delete existing counties
    console.log('🗑️  Deleting existing counties...')
    const { error: deleteError } = await supabase
      .from('county_data')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (deleteError) {
      console.error('Error deleting existing counties:', deleteError)
    }

    // Insert in batches of 500
    const batchSize = 500
    let inserted = 0

    for (let i = 0; i < counties.length; i += batchSize) {
      const batch = counties.slice(i, i + batchSize)

      const { error } = await supabase.from('county_data').insert(batch)

      if (error) {
        console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error.message)
        continue
      }

      inserted += batch.length
      console.log(`   ✅ Inserted ${inserted}/${counties.length} counties`)
    }

    console.log(`\n✅ Successfully loaded ${inserted} US counties!`)

    // Show some stats
    const { count: totalCount } = await supabase
      .from('county_data')
      .select('*', { count: 'exact', head: true })

    const { data: stateStats } = await supabase
      .from('county_data')
      .select('state_code')
      .neq('state_code', null)

    const stateCount = new Set(stateStats?.map((s) => s.state_code)).size

    console.log('\n📊 Database Statistics')
    console.log('='.repeat(60))
    console.log(`Total counties in database: ${totalCount}`)
    console.log(`States/territories represented: ${stateCount}`)
  } catch (_error) {
    console.error('❌ Error loading counties:', error)
    throw error
  }
}

loadCounties()
  .then(() => {
    console.log('\n✅ County data load complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
