#!/usr/bin/env node
/**
 * Import Oakland resources from initial-oakland-resources.json
 * Uses Supabase service role key to bypass RLS
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing required environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function importResources() {
  try {
    // Read the JSON file
    const dataPath = join(__dirname, '..', 'data', 'initial-oakland-resources.json')
    console.log(`Reading data from: ${dataPath}`)

    const fileContent = readFileSync(dataPath, 'utf-8')
    const resources = JSON.parse(fileContent)

    console.log(`Found ${resources.length} resources to import`)

    // Map field names from JSON to database schema
    const mappedResources = resources.map((resource) => ({
      name: resource.name,
      description: resource.description || null,
      primary_category: resource.primary_category,
      categories: resource.categories || null,
      tags: resource.tags || null,
      address: resource.address,
      city: resource.city || null,
      state: resource.state || 'CA',
      zip: resource.zip || resource.zip_code || null,
      latitude: resource.latitude || null,
      longitude: resource.longitude || null,
      phone: resource.phone || null,
      email: resource.email || null,
      website: resource.website || null,
      hours: resource.hours || null,
      services_offered: resource.services || resource.services_offered || null,
      eligibility_requirements:
        resource.eligibility_criteria || resource.eligibility_requirements || null,
      required_documents: resource.required_documents || null,
      fees: resource.fees || null,
      languages: resource.languages || null,
      accessibility_features: resource.accessibility || resource.accessibility_features || null,
      status: resource.status || 'active',
      verified: resource.verified || false,
      ai_enriched: resource.ai_enriched || false,
      completeness_score: resource.completeness_score || null,
      verification_score: resource.verification_score || null,
      source: 'initial_import',
    }))

    console.log('Importing resources to database...')

    // Insert resources in batches of 10 to avoid timeouts
    const batchSize = 10
    let imported = 0

    for (let i = 0; i < mappedResources.length; i += batchSize) {
      const batch = mappedResources.slice(i, i + batchSize)

      const { data, error } = await supabase.from('resources').insert(batch).select()

      if (error) {
        console.error(`Error importing batch ${i / batchSize + 1}:`, error)
        throw error
      }

      imported += data?.length || 0
      console.log(`Imported batch ${i / batchSize + 1}: ${data?.length || 0} resources`)
    }

    console.log(`\n✅ Success! Imported ${imported} resources`)
    console.log('\nNext steps:')
    console.log('1. Visit http://localhost:3003/ to see resources on the map')
    console.log('2. Visit http://localhost:3003/oakland-ca to see the Oakland city hub page')
    console.log('3. Run the dev server if not already running: npm run dev')

    return imported
  } catch (error) {
    console.error('❌ Import failed:', error)
    process.exit(1)
  }
}

// Run the import
importResources()
