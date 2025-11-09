#!/usr/bin/env node

/**
 * Run Coverage Tracking System Migrations
 *
 * This script executes the coverage tracking database migrations
 * in the correct order on your Supabase database.
 *
 * Usage: node scripts/run-coverage-migrations.mjs
 *
 * Environment Variables Required:
 * - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('')
  console.error('💡 Make sure these are set in your .env.local file')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Migration files in order
const migrations = [
  '20250129000000_coverage_tracking_tables.sql',
  '20250129000001_coverage_calculation_function.sql',
]

async function runMigration(filename) {
  console.log(`\n📄 Running migration: ${filename}`)

  try {
    const filepath = join(projectRoot, 'supabase', 'migrations', filename)
    const sql = readFileSync(filepath, 'utf-8')

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single()

    if (error) {
      // If exec_sql RPC doesn't exist, try direct execution via REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql_query: sql }),
      })

      if (!response.ok) {
        // Fallback: try to execute via the SQL editor endpoint
        console.log('   ⚠️  Direct SQL execution not available via RPC')
        console.log('   ℹ️  Please run this migration manually in Supabase SQL Editor:')
        console.log(`   📍 ${filepath}`)
        console.log('')
        console.log('   Steps:')
        console.log('   1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new')
        console.log('   2. Copy the contents of the migration file')
        console.log('   3. Paste and run in SQL Editor')
        return false
      }
    }

    console.log(`   ✅ Migration completed successfully`)
    return true
  } catch (error) {
    console.error(`   ❌ Error running migration:`, error.message)
    return false
  }
}

async function verifyTables() {
  console.log('\n🔍 Verifying table creation...')

  const tables = ['county_data', 'coverage_metrics']
  let allExist = true

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('id').limit(1)

      if (error) {
        console.log(`   ❌ Table '${table}' not found`)
        allExist = false
      } else {
        console.log(`   ✅ Table '${table}' exists`)
      }
    } catch (error) {
      console.log(`   ❌ Error checking table '${table}':`, error.message)
      allExist = false
    }
  }

  return allExist
}

async function main() {
  console.log('🚀 Coverage Tracking System - Database Migration')
  console.log('='.repeat(60))
  console.log(`📍 Supabase URL: ${supabaseUrl}`)
  console.log(`📦 Migrations to run: ${migrations.length}`)

  let successCount = 0

  for (const migration of migrations) {
    const success = await runMigration(migration)
    if (success) successCount++
  }

  // Verify tables were created
  const tablesExist = await verifyTables()

  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary')
  console.log('='.repeat(60))
  console.log(`✅ Successful migrations: ${successCount}/${migrations.length}`)
  console.log(`${tablesExist ? '✅' : '❌'} Tables verified: ${tablesExist ? 'Yes' : 'No'}`)

  if (successCount === migrations.length && tablesExist) {
    console.log('\n🎉 All migrations completed successfully!')
    console.log('\n📍 Next steps:')
    console.log('   1. Run: node scripts/seed-county-data.mjs')
    console.log('   2. Run: node scripts/enrich-resources-with-county.mjs')
    console.log('   3. Calculate initial coverage metrics via admin dashboard')
  } else {
    console.log('\n⚠️  Some migrations may need to be run manually.')
    console.log('   Check the Supabase SQL Editor for any errors.')
    console.log('\n📍 Manual migration instructions:')
    console.log('   1. Go to: https://supabase.com/dashboard')
    console.log('   2. Navigate to: SQL Editor → New Query')
    console.log('   3. Copy contents from: supabase/migrations/')
    console.log('   4. Execute each migration file in order')
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
