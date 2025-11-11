#!/usr/bin/env node
/**
 * Export US county GeoJSON from database to static file
 *
 * This script exports all county boundaries from the database to a static
 * GeoJSON file that can be loaded quickly by the client, avoiding expensive
 * database queries with large geometry payloads.
 *
 * Usage: node scripts/export-county-geojson.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function exportCountyGeoJSON() {
  console.log('Fetching county data from database...')

  // Fetch all counties with pagination (Supabase limit is 1000)
  const allCounties = []
  const pageSize = 1000
  let page = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('county_data')
      .select('fips_code, state_code, state_name, county_name, center_lat, center_lng, geometry')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error('Error fetching counties:', error)
      process.exit(1)
    }

    if (data && data.length > 0) {
      allCounties.push(...data)
      console.log(`  Fetched page ${page + 1}: ${data.length} counties`)
      hasMore = data.length === pageSize
      page++
    } else {
      hasMore = false
    }
  }

  console.log(`Total counties fetched: ${allCounties.length}`)

  // Convert to GeoJSON FeatureCollection
  const geojson = {
    type: 'FeatureCollection',
    features: allCounties.map((county) => ({
      type: 'Feature',
      properties: {
        fips_code: county.fips_code,
        state_code: county.state_code,
        state_name: county.state_name,
        county_name: county.county_name,
        center_lat: county.center_lat,
        center_lng: county.center_lng,
      },
      geometry: county.geometry,
    })),
  }

  // Create public/data directory if it doesn't exist
  const outputDir = join(__dirname, '..', 'public', 'data')
  mkdirSync(outputDir, { recursive: true })

  // Write to file
  const outputPath = join(outputDir, 'us-counties.geojson')
  writeFileSync(outputPath, JSON.stringify(geojson, null, 2))

  const fileSizeMB = (JSON.stringify(geojson).length / 1024 / 1024).toFixed(2)
  console.log(`\n✅ Successfully exported ${allCounties.length} counties`)
  console.log(`📁 File: ${outputPath}`)
  console.log(`📦 Size: ${fileSizeMB} MB`)
}

exportCountyGeoJSON().catch((error) => {
  console.error('Export failed:', error)
  process.exit(1)
})
