#!/usr/bin/env node

/**
 * Single-Item Verification Queue
 *
 * Fetches ONE resource at a time for verification, preventing batch processing
 * and enforcing quality gates.
 *
 * Usage:
 *   node scripts/verify-next-resource.mjs              # Get next resource to verify
 *   node scripts/verify-next-resource.mjs --status     # Show queue status
 *   node scripts/verify-next-resource.mjs --help       # Show help
 *
 * Environment:
 *   Requires .env.local with DATABASE_URL
 */

import postgres from 'postgres'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '..', '.env.local')

// Simple .env parser
try {
  const envFile = readFileSync(envPath, 'utf-8')
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      process.env[key] = value
    }
  })
} catch (error) {
  console.error('⚠️  Could not load .env.local:', error.message)
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

// Parse command line arguments
const args = process.argv.slice(2)
const showStatus = args.includes('--status')
const showHelp = args.includes('--help')

if (showHelp) {
  console.log(`
Single-Item Verification Queue

Fetches ONE resource at a time to prevent batch processing shortcuts.

Usage:
  node scripts/verify-next-resource.mjs              Get next resource to verify
  node scripts/verify-next-resource.mjs --status     Show queue statistics
  node scripts/verify-next-resource.mjs --help       Show this help message

Verification Process:
  1. Run this script to get next resource
  2. Use WebFetch or WebSearch to verify the resource
  3. Use approve-with-corrections API to update
  4. Run script again for next resource (one at a time!)

Quality Gates:
  - External verification required (WebFetch/WebSearch)
  - correction_notes must include source URL
  - Email address must be attempted
  - No batch processing allowed

See: docs/VERIFICATION_PROTOCOL.md
`)
  await sql.end()
  process.exit(0)
}

if (showStatus) {
  await showQueueStatus()
  await sql.end()
  process.exit(0)
}

// Main: Get next resource to verify
await getNextResource()
await sql.end()

/**
 * Show verification queue statistics
 */
async function showQueueStatus() {
  console.log('\n📊 Verification Queue Status\n')

  // Get total resources
  const [{ count: totalResources }] = await sql`
    SELECT COUNT(*)::int AS count FROM resources WHERE status = 'active'
  `

  // Get resources with email
  const [{ count: withEmail }] = await sql`
    SELECT COUNT(*)::int AS count FROM resources WHERE status = 'active' AND email IS NOT NULL
  `

  // Get resources with verification source
  const [{ count: withSource }] = await sql`
    SELECT COUNT(*)::int AS count FROM resources WHERE status = 'active' AND verification_source IS NOT NULL
  `

  // Get resources missing email
  const [{ count: missingEmail }] = await sql`
    SELECT COUNT(*)::int AS count FROM resources WHERE status = 'active' AND email IS NULL
  `

  // Calculate percentages
  const emailPercent = totalResources > 0 ? ((withEmail / totalResources) * 100).toFixed(1) : 0
  const sourcePercent = totalResources > 0 ? ((withSource / totalResources) * 100).toFixed(1) : 0

  console.log(`Total Active Resources:     ${totalResources}`)
  console.log(`With Email:                 ${withEmail} (${emailPercent}%)`)
  console.log(`With Verification Source:   ${withSource} (${sourcePercent}%)`)
  console.log(`Missing Email:              ${missingEmail}`)
  console.log('')

  // Show priority breakdown
  console.log('Priority Queue Breakdown:')
  console.log(`  🔴 Missing email:              ${missingEmail}`)

  const [{ count: noSource }] = await sql`
    SELECT COUNT(*)::int AS count FROM resources WHERE status = 'active' AND verification_source IS NULL
  `

  console.log(`  🟡 No verification source:     ${noSource}`)

  const [{ count: noContact }] = await sql`
    SELECT COUNT(*)::int AS count FROM resources WHERE status = 'active' AND phone IS NULL AND email IS NULL
  `

  console.log(`  🟠 No contact info at all:     ${noContact}`)
  console.log('')
}

/**
 * Get and display next resource to verify
 */
async function getNextResource() {
  console.log('\n🔍 Fetching next resource to verify...\n')

  // Fetch resource with highest priority for verification
  // Priority:
  // 1. Missing email (priority: 100)
  // 2. No verification source (priority: 90)
  // 3. No contact info (priority: 70)
  // 4. Oldest verification (priority: 50)

  const resources = await sql`
    SELECT
      id,
      name,
      address,
      city,
      state,
      zip,
      phone,
      email,
      website,
      hours,
      services_offered,
      eligibility_requirements,
      primary_category,
      verification_source,
      last_verified_at,
      created_at
    FROM resources
    WHERE status = 'active'
    ORDER BY created_at ASC
    LIMIT 1
  `

  if (!resources || resources.length === 0) {
    console.log('✅ No resources in queue!')
    console.log('')
    console.log('Run with --status to see verification metrics')
    return
  }

  const resource = resources[0]

  // Determine priority reason
  let priorityReason = ''
  let priority = 50 // Default

  if (!resource.email) {
    priorityReason = 'Missing email address'
    priority = 100
  } else if (!resource.verification_source) {
    priorityReason = 'No verification source documented'
    priority = 90
  } else if (!resource.phone && !resource.email) {
    priorityReason = 'No contact information'
    priority = 70
  } else {
    priorityReason = 'Routine re-verification'
    priority = 50
  }

  // Display resource details
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`📋 RESOURCE TO VERIFY`)
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('')
  console.log(`ID:                  ${resource.id}`)
  console.log(`Name:                ${resource.name}`)
  console.log(`Category:            ${resource.primary_category || 'Not set'}`)
  console.log(`Website:             ${resource.website || '❌ Not available'}`)
  console.log('')
  console.log('─────────────────────────────────────────────────────────────────')
  console.log('CONTACT INFORMATION')
  console.log('─────────────────────────────────────────────────────────────────')
  console.log(`Address:             ${resource.address || 'Not set'}`)
  console.log(
    `City, State, Zip:    ${resource.city || '?'}, ${resource.state || '?'} ${resource.zip || '?'}`
  )
  console.log(`Phone:               ${resource.phone || '❌ Missing'}`)
  console.log(`Email:               ${resource.email || '❌ Missing'}`)
  console.log('')
  console.log('─────────────────────────────────────────────────────────────────')
  console.log('SERVICES & HOURS')
  console.log('─────────────────────────────────────────────────────────────────')

  if (resource.hours) {
    console.log('Hours:')
    const hours = typeof resource.hours === 'string' ? JSON.parse(resource.hours) : resource.hours
    Object.entries(hours).forEach(([day, time]) => {
      console.log(`  ${day.padEnd(15)}: ${time}`)
    })
  } else {
    console.log('Hours:               ❌ Not set')
  }

  console.log('')

  if (resource.services_offered && resource.services_offered.length > 0) {
    console.log('Services:')
    resource.services_offered.forEach((service) => {
      console.log(`  • ${service}`)
    })
  } else {
    console.log('Services:            ❌ Not set')
  }

  console.log('')

  if (resource.eligibility_requirements) {
    console.log(`Eligibility:         ${resource.eligibility_requirements}`)
  } else {
    console.log('Eligibility:         ❌ Not set')
  }

  console.log('')
  console.log('─────────────────────────────────────────────────────────────────')
  console.log('VERIFICATION STATUS')
  console.log('─────────────────────────────────────────────────────────────────')
  console.log(`Priority:            ${priority} - ${priorityReason}`)
  console.log(`Verification Source: ${resource.verification_source || '❌ Not documented'}`)
  console.log(
    `Last Verified:       ${resource.last_verified_at ? new Date(resource.last_verified_at).toLocaleDateString() : 'Never'}`
  )
  console.log(`Created:             ${new Date(resource.created_at).toLocaleDateString()}`)
  console.log('')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('')

  // Show next steps
  console.log('📝 NEXT STEPS:')
  console.log('')
  console.log('1. Verify this resource using WebFetch or WebSearch:')

  if (resource.website) {
    console.log(`   WebFetch: ${resource.website}`)
    console.log('   Extract: address, phone, EMAIL, hours, services, eligibility')
  } else {
    console.log(`   WebSearch: "${resource.name} ${resource.city} contact"`)
  }

  console.log('')
  console.log('2. Update resource with corrections:')
  console.log(`   POST /api/admin/flagged-resources/[id]/update-resource`)
  console.log(`   Resource ID: ${resource.id}`)
  console.log('')
  console.log('3. IMPORTANT: Include in correction_notes:')
  console.log('   - Verification source (URL or search query)')
  console.log('   - What was updated/corrected')
  console.log('   - Email address (found or "not listed on website")')
  console.log('')
  console.log('4. Run this script again to get next resource')
  console.log('   (ONE AT A TIME - no batch processing!)')
  console.log('')
  console.log('See: docs/VERIFICATION_PROTOCOL.md for full guidelines')
  console.log('')
}
