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

import postgres from 'postgres'
import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
const envPath = join(__dirname, '..', '.env.local')
try {
  const envFile = readFileSync(envPath, 'utf-8')
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  })
} catch (_error) {
  // .env.local may not exist
}

const sql = postgres(
  process.env.DATABASE_URL || 'postgresql://reentrymap:password@localhost:5432/reentry_map'
)

async function exportCountyGeoJSON() {
  console.log('Fetching county data from database...')

  try {
    const allCounties = await sql`
      SELECT fips_code, state_code, state_name, county_name, center_lat, center_lng, geometry
      FROM county_data
    `

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
  } catch (error) {
    console.error('Export failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

exportCountyGeoJSON()
