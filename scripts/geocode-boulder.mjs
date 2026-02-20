#!/usr/bin/env node

/**
 * Geocode Boulder County resources missing coordinates.
 * 1. Reads resource list via psql
 * 2. Geocodes via Google Maps API
 * 3. Writes SQL update file and executes via psql
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const GOOGLE_MAPS_KEY = 'AIzaSyDuB6MEGAFkub6L4HHclrdzHWaWnKQiN4w'
const PSQL = `PGPASSWORD=reentrymap123 psql -h dc3-1.serafinihosting.com -U reentrymap -d reentry_map`

async function geocodeAddress(address, city, state, zip) {
  const fullAddress = [address, city, state, zip].filter(Boolean).join(', ')
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_MAPS_KEY}`
  const response = await fetch(url)
  const data = await response.json()
  if (data.status === 'OK' && data.results.length > 0) {
    const loc = data.results[0].geometry.location
    const formatted = data.results[0].formatted_address
    return { lat: loc.lat, lng: loc.lng, formatted }
  }
  return null
}

async function main() {
  const output = execSync(
    `${PSQL} -t -A -F '|' -c "SELECT id, name, address, city, state, zip FROM resources WHERE city IN ('Boulder','Longmont','Lafayette','Louisville','Broomfield') AND state='CO' AND latitude IS NULL ORDER BY name"`,
    { encoding: 'utf-8', shell: '/bin/bash' }
  ).trim()

  if (!output) {
    console.log('No resources need geocoding.')
    return
  }

  const rows = output.split('\n').filter((r) => r.trim())
  console.log(`Found ${rows.length} resources to geocode\n`)

  let success = 0,
    failed = 0
  const updates = []

  for (const row of rows) {
    const [id, name, address, city, state, zip] = row.split('|')
    try {
      const result = await geocodeAddress(address, city, state, zip)
      if (result) {
        const escaped = result.formatted.replace(/'/g, "''")
        updates.push(
          `UPDATE resources SET latitude=${result.lat}, longitude=${result.lng}, formatted_address='${escaped}', county='Boulder' WHERE id='${id}';`
        )
        console.log(`  OK: ${name} -> ${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}`)
        success++
      } else {
        console.log(`  FAIL: ${name} - no geocode results`)
        failed++
      }
      await new Promise((r) => setTimeout(r, 100))
    } catch (err) {
      console.log(`  ERROR: ${name} - ${err.message}`)
      failed++
    }
  }

  if (updates.length > 0) {
    const sqlFile = path.join(__dirname, '../tmp-geocode-updates.sql')
    fs.writeFileSync(sqlFile, updates.join('\n'))
    console.log(`\nApplying ${updates.length} coordinate updates...`)
    execSync(`${PSQL} -f "${sqlFile}"`, { shell: '/bin/bash', stdio: 'inherit' })
    fs.unlinkSync(sqlFile)
    console.log('Done.')
  }

  console.log(`\nGeocoding complete: ${success} success, ${failed} failed`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
