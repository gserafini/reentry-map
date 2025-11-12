#!/usr/bin/env node

/**
 * Coverage Tracking Setup - One Command Setup
 *
 * This script guides you through the complete setup process
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { execSync } from 'child_process'

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables')
  console.error(
    '   Add to .env.local: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
  console.log('🔍 Step 1: Checking database tables...')

  const { error } = await supabase.from('county_data').select('id').limit(1)

  if (error) {
    console.log('\\n❌ Coverage tracking tables not found!')
    console.log('\\n📋 You need to run migrations in Supabase Dashboard:')
    console.log('\\n1. Open this URL in your browser:')
    console.log('   https://supabase.com/dashboard/project/scvshbntarpyjvdexpmp/sql/new')
    console.log('\\n2. Copy and paste the entire contents of this file:')
    console.log('   supabase/migrations/combined_coverage_tracking.sql')
    console.log('\\n3. Click the "RUN" button')
    console.log('\\n4. Then run this script again: node scripts/setup-coverage.mjs')
    console.log('\\n💡 Tip: The migration file is ~530 lines. Copy all of it!')
    return false
  }

  console.log('   ✅ Tables exist!')
  return true
}

async function seedCounties() {
  console.log('\\n🌱 Step 2: Seeding county data...')

  try {
    execSync('node scripts/seed-county-data.mjs', { stdio: 'inherit', cwd: projectRoot })
    console.log('   ✅ County data seeded!')
    return true
  } catch (_error) {
    console.error('   ❌ Failed to seed counties')
    return false
  }
}

async function enrichResources() {
  console.log('\\n🔄 Step 3: Enriching resources with county data...')

  try {
    execSync('node scripts/enrich-resources-with-county.mjs', {
      stdio: 'inherit',
      cwd: projectRoot,
    })
    console.log('   ✅ Resources enriched!')
    return true
  } catch (_error) {
    console.error('   ❌ Failed to enrich resources')
    return false
  }
}

async function main() {
  console.log('🚀 Coverage Tracking System - Automated Setup')
  console.log('='.repeat(60))

  // Step 1: Check tables
  const tablesExist = await checkTables()
  if (!tablesExist) {
    console.log('\\n⚠️  Setup paused - complete migration step first')
    process.exit(1)
  }

  // Step 2: Seed counties
  const countiesSeeded = await seedCounties()
  if (!countiesSeeded) {
    console.log('\\n⚠️  Setup stopped at county seeding')
    process.exit(1)
  }

  // Step 3: Enrich resources
  const resourcesEnriched = await enrichResources()
  if (!resourcesEnriched) {
    console.log('\\n⚠️  Setup stopped at resource enrichment')
    process.exit(1)
  }

  // Step 4: Instructions for coverage calculation
  console.log('\\n📊 Step 4: Calculate coverage metrics')
  console.log('\\n🎯 Final step - calculate coverage metrics:')
  console.log('\\n   Option A (Recommended): Via Admin Dashboard')
  console.log('   1. Start dev server: npm run dev')
  console.log('   2. Login as admin')
  console.log('   3. Go to: http://localhost:3000/admin/coverage-map')
  console.log('   4. Click: "Recalculate All Metrics"')
  console.log('\\n   Option B: Via API')
  console.log('   curl -X POST http://localhost:3000/api/admin/coverage/calculate \\')
  console.log('     -H "Cookie: your-auth-cookie"')

  console.log('\\n' + '='.repeat(60))
  console.log('✅ Automated setup complete!')
  console.log('='.repeat(60))
  console.log('\\n📍 Next: Complete Step 4 to activate coverage tracking')
}

main().catch((error) => {
  console.error('\\n❌ Fatal error:', error)
  process.exit(1)
})
