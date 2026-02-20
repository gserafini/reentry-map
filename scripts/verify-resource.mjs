#!/usr/bin/env node
/**
 * Run verification agent on a specific resource
 * Usage: node scripts/verify-resource.mjs <city> <state> <slug>
 */

import postgres from 'postgres'
import { readFileSync } from 'fs'
import { join } from 'path'

// Simple .env.local parser
try {
  const envPath = join(process.cwd(), '.env.local')
  const envFile = readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
} catch (_error) {
  // .env.local not found, will use existing env vars
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not set. Add it to .env.local')
  process.exit(1)
}
const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
const sql = postgres(databaseUrl, {
  ssl: isLocalhost ? false : 'require',
})

async function main() {
  const city = process.argv[2] || 'oakland'
  const state = process.argv[3] || 'ca'
  const slug = process.argv[4] || 'center-for-employment-opportunities-ceo-oakland'

  console.log(`\n🔍 Finding resource: ${city}, ${state}, ${slug}`)

  // Find resource by city, state, and slug
  try {
    const resources = await sql`
      SELECT * FROM resources
      WHERE LOWER(city) = LOWER(${city})
        AND LOWER(state) = LOWER(${state})
    `

    if (!resources || resources.length === 0) {
      console.error(`No resources found in ${city}, ${state}`)
      await sql.end()
      process.exit(1)
    }

    // Match by slug (normalize name to slug format)
    const normalizeSlug = (name) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }

    const resource = resources.find((r) => normalizeSlug(r.name) === slug)

    if (!resource) {
      console.error(`Resource not found with slug: ${slug}`)
      console.log('Available resources:')
      resources.forEach((r) => {
        console.log(`  - ${r.name} (${normalizeSlug(r.name)})`)
      })
      await sql.end()
      process.exit(1)
    }

    console.log(`\n✅ Found resource: ${resource.name}`)
    console.log(`   ID: ${resource.id}`)
    console.log(`   Address: ${resource.address}`)
    console.log(`   Phone: ${resource.phone || 'N/A'}`)
    console.log(`   Website: ${resource.website || 'N/A'}`)
    console.log(`   Category: ${resource.primary_category || 'N/A'}`)

    // Create a temporary suggestion from this resource for verification
    const suggestion = {
      id: resource.id, // Use actual resource ID (it's a valid UUID)
      name: resource.name,
      description: resource.description,
      address: resource.address,
      city: resource.city,
      state: resource.state,
      zip: resource.zip,
      latitude: resource.latitude,
      longitude: resource.longitude,
      phone: resource.phone,
      email: resource.email,
      website: resource.website,
      hours: resource.hours,
      services_offered: resource.services_offered,
      eligibility_requirements: resource.eligibility_requirements,
      required_documents: resource.required_documents,
      fees: resource.fees,
      languages: resource.languages,
      accessibility_features: resource.accessibility_features,
      primary_category: resource.primary_category,
      categories: resource.categories,
      tags: resource.tags,
      category: resource.primary_category, // For VerificationAgent compatibility
    }

    // Now we need to call the verification agent
    // Since we can't import TypeScript directly, we'll make an API call
    console.log('\n📡 Calling verification API endpoint...')

    const response = await fetch('http://localhost:3003/api/admin/verify-resource', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resource_id: resource.id,
        suggestion,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('API Error:', error)
      await sql.end()
      process.exit(1)
    }

    const result = await response.json()
    console.log('\n📊 Verification Result:')
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('Error:', error)
    await sql.end()
    process.exit(1)
  }

  await sql.end()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  sql.end().then(() => process.exit(1))
})
