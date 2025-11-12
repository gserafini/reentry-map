#!/usr/bin/env node
/**
 * Re-geocode all resources to populate geocoding metadata
 *
 * Fetches all resources with addresses, re-geocodes them using Google Maps API,
 * and updates with complete metadata: county, state, city, zip, neighborhood,
 * google_place_id, location_type, formatted_address, county_fips
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '..', '.env.local')

try {
  const envFile = readFileSync(envPath, 'utf-8')
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      process.env[key] = value
    }
  })
} catch (_error) {
  console.error('⚠️  Could not load .env.local file')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const googleMapsKey = process.env.GOOGLE_MAPS_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

if (!googleMapsKey) {
  console.error('❌ Missing GOOGLE_MAPS_KEY environment variable')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Clean county name by removing suffixes
 */
function cleanCountyName(name) {
  return name.replace(/ (County|Parish|Borough|Census Area|Municipality)$/i, '')
}

/**
 * Extract address component by type
 */
function extractAddressComponent(components, type, useShortName = false) {
  const component = components.find((c) => c.types.includes(type))
  if (!component) return null
  return useShortName ? component.short_name : component.long_name
}

/**
 * Geocode an address using Google Maps Geocoding API (server-side)
 */
async function geocodeAddress(address) {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', address)
  url.searchParams.set('key', googleMapsKey)

  try {
    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error(`  ❌ Geocoding failed: ${data.status}`)
      return null
    }

    const result = data.results[0]
    const location = result.geometry.location
    const components = result.address_components

    // Extract all metadata
    const countyRaw = extractAddressComponent(components, 'administrative_area_level_2')
    const county = countyRaw ? cleanCountyName(countyRaw) : null

    return {
      latitude: location.lat,
      longitude: location.lng,
      formattedAddress: result.formatted_address,
      county,
      state: extractAddressComponent(components, 'administrative_area_level_1', true),
      city: extractAddressComponent(components, 'locality'),
      zip: extractAddressComponent(components, 'postal_code'),
      neighborhood: extractAddressComponent(components, 'neighborhood'),
      placeId: result.place_id,
      locationType: result.geometry.location_type,
    }
  } catch (_error) {
    console.error(`  ❌ Geocoding error:`, error.message)
    return null
  }
}

/**
 * Look up FIPS code from county name and state
 */
async function lookupCountyFips(countyName, stateCode) {
  if (!countyName || !stateCode) return null

  const { data, error } = await supabase
    .from('county_data')
    .select('fips_code')
    .eq('county_name', countyName)
    .eq('state_code', stateCode.toUpperCase())
    .single()

  if (error || !data) return null
  return data.fips_code
}

/**
 * Determine county from coordinates using PostGIS
 */
async function determineCountyFromCoordinates(latitude, longitude) {
  if (!latitude || !longitude) return null

  const { data, error } = await supabase.rpc('find_county_for_point', {
    lat: latitude,
    lng: longitude,
  })

  if (error || !data || data.length === 0) return null

  return {
    county: data[0].county_name,
    county_fips: data[0].fips_code,
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔄 Re-geocoding all resources...\n')

  // Fetch all resources with addresses
  const { data: resources, error } = await supabase
    .from('resources')
    .select('id, name, address, city, state, latitude, longitude')
    .not('address', 'is', null)
    .order('name')

  if (error) {
    console.error('❌ Error fetching resources:', error)
    process.exit(1)
  }

  console.log(`📋 Found ${resources.length} resources with addresses\n`)

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (let i = 0; i < resources.length; i++) {
    const resource = resources[i]
    const progress = `[${i + 1}/${resources.length}]`

    console.log(`${progress} ${resource.name}`)
    console.log(`  📍 ${resource.address}, ${resource.city}, ${resource.state}`)

    // Construct full address for geocoding
    const fullAddress = `${resource.address}, ${resource.city}, ${resource.state}`

    // Geocode the address
    const geocodeResult = await geocodeAddress(fullAddress)

    if (!geocodeResult) {
      console.log(`  ⚠️  Skipping - geocoding failed\n`)
      skipCount++
      continue
    }

    // Determine county FIPS
    let countyFips = null
    if (geocodeResult.county && geocodeResult.state) {
      countyFips = await lookupCountyFips(geocodeResult.county, geocodeResult.state)
    }

    // Fallback to coordinate-based lookup if no FIPS yet
    if (!countyFips && geocodeResult.latitude && geocodeResult.longitude) {
      const countyData = await determineCountyFromCoordinates(
        geocodeResult.latitude,
        geocodeResult.longitude
      )
      if (countyData) {
        countyFips = countyData.county_fips
        if (!geocodeResult.county) {
          geocodeResult.county = countyData.county
        }
      }
    }

    // Update resource with all geocoding metadata
    const { error: updateError } = await supabase
      .from('resources')
      .update({
        latitude: geocodeResult.latitude,
        longitude: geocodeResult.longitude,
        city: geocodeResult.city || resource.city,
        state: geocodeResult.state || resource.state,
        zip: geocodeResult.zip,
        county: geocodeResult.county,
        county_fips: countyFips,
        neighborhood: geocodeResult.neighborhood,
        google_place_id: geocodeResult.placeId,
        location_type: geocodeResult.locationType,
        formatted_address: geocodeResult.formattedAddress,
      })
      .eq('id', resource.id)

    if (updateError) {
      console.log(`  ❌ Update failed:`, updateError.message)
      errorCount++
    } else {
      console.log(`  ✅ Updated with:`)
      console.log(`     - Coordinates: ${geocodeResult.latitude}, ${geocodeResult.longitude}`)
      console.log(`     - County: ${geocodeResult.county || 'N/A'} (FIPS: ${countyFips || 'N/A'})`)
      console.log(`     - Neighborhood: ${geocodeResult.neighborhood || 'N/A'}`)
      console.log(`     - Place ID: ${geocodeResult.placeId}`)
      console.log(`     - Accuracy: ${geocodeResult.locationType}`)
      successCount++
    }

    console.log()

    // Rate limiting: Google allows 50 requests/second, but let's be conservative
    await new Promise((resolve) => setTimeout(resolve, 100)) // 10 requests/second
  }

  console.log('\n✅ Re-geocoding complete!')
  console.log(`   - Success: ${successCount}`)
  console.log(`   - Skipped: ${skipCount}`)
  console.log(`   - Errors: ${errorCount}`)
  console.log(`   - Total: ${resources.length}`)
}

main().catch(console.error)
