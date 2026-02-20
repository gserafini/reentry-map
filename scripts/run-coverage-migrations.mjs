#!/usr/bin/env node

/**
 * Run Coverage Tracking System Migrations
 *
 * This script executes the coverage tracking database migrations
 * in the correct order on your database.
 *
 * Usage: node scripts/run-coverage-migrations.mjs
 *
 * Environment Variables Required:
 * - DATABASE_URL
 */

import postgres from 'postgres'
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
    // .env.local may not exist
  }
}

loadEnv()

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not set. Add it to .env.local')
  process.exit(1)
}
const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
const sql = postgres(databaseUrl, {
  ssl: isLocalhost ? false : 'require',
})

// Migration files in order
const migrations = [
  '20250129000000_coverage_tracking_tables.sql',
  '20250129000001_coverage_calculation_function.sql',
]

async function runMigration(filename) {
  console.log(`\n📄 Running migration: ${filename}`)

  try {
    const filepath = join(projectRoot, 'supabase', 'migrations', filename)
    const migrationSql = readFileSync(filepath, 'utf-8')

    // Execute the SQL directly
    await sql.unsafe(migrationSql)

    console.log(`   ✅ Migration completed successfully`)
    return true
  } catch (_error) {
    console.error(`   ❌ Error running migration:`, error.message)
    console.log('   ℹ️  You may need to run this migration manually:')
    console.log(`   📍 ${join(projectRoot, 'supabase', 'migrations', filename)}`)
    return false
  }
}

async function verifyTables() {
  console.log('\n🔍 Verifying table creation...')

  const tables = ['county_data', 'coverage_metrics']
  let allExist = true

  for (const table of tables) {
    try {
      await sql.unsafe(`SELECT id FROM ${table} LIMIT 1`)
      console.log(`   ✅ Table '${table}' exists`)
    } catch (_error) {
      console.log(`   ❌ Table '${table}' not found`)
      allExist = false
    }
  }

  return allExist
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  console.log('🚀 Coverage Tracking System - Database Migration')
  console.log('='.repeat(60))
  console.log(`📍 Database: ${databaseUrl.replace(/:[^:@]+@/, ':***@')}`)
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
    console.log('   Check the migration files for any errors.')
    console.log('\n📍 Manual migration instructions:')
    console.log('   1. Check migration files in: supabase/migrations/')
    console.log('   2. Execute each migration file in order against your database')
  }

  await sql.end()
}

main().catch(async (error) => {
  console.error('\n❌ Fatal error:', error)
  await sql.end()
  process.exit(1)
})
