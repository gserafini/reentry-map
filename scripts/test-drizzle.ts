/**
 * Test script for Drizzle ORM connection
 *
 * Usage: npx tsx scripts/test-drizzle.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local FIRST before any other imports
const envResult = dotenv.config({ path: resolve(process.cwd(), '.env.local') })
console.log('Loaded env from .env.local:', envResult.parsed ? 'success' : 'failed')
console.log('DATABASE_URL set:', !!process.env.DATABASE_URL)

// Test with direct postgres.js connection first (bypassing our client)
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { users, phoneOtps, resources } from '../lib/db/schema'
import { count, eq } from 'drizzle-orm'

async function testDrizzleConnection() {
  const connectionString = process.env.DATABASE_URL!
  console.log('\nTesting Drizzle ORM connection...')
  console.log('Connection string:', connectionString.replace(/:[^@]+@/, ':***@'))

  // Create postgres.js client directly
  const sql = postgres(connectionString, {
    ssl: 'require', // Try with SSL required
    connect_timeout: 10,
    debug: (connection, query, _params) => {
      console.log('DEBUG query:', query)
    },
  })

  const db = drizzle(sql, { schema: { users, phoneOtps, resources } })

  try {
    // Test 1: Users count
    console.log('\n1. Testing users query...')
    const userCount = await db.select({ count: count() }).from(users)
    console.log(`   ✓ Users count: ${userCount[0].count}`)

    // Test 2: Resources count
    console.log('\n2. Testing resources query...')
    const resourceCount = await db.select({ count: count() }).from(resources)
    console.log(`   ✓ Resources count: ${resourceCount[0].count}`)

    // Test 3: Resources by city
    console.log('\n3. Testing resources by city...')
    const oaklandResources = await db
      .select({ count: count() })
      .from(resources)
      .where(eq(resources.city, 'Oakland'))
    console.log(`   ✓ Oakland resources: ${oaklandResources[0].count}`)

    // Test 4: Sample resource
    console.log('\n4. Testing resource select...')
    const sampleResource = await db
      .select({
        id: resources.id,
        name: resources.name,
        city: resources.city,
        primaryCategory: resources.primaryCategory,
      })
      .from(resources)
      .limit(1)

    if (sampleResource.length > 0) {
      console.log(
        `   ✓ Sample: "${sampleResource[0].name}" in ${sampleResource[0].city} (${sampleResource[0].primaryCategory})`
      )
    }

    console.log('\n✅ All Drizzle connection tests passed!\n')

    // Close connection
    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Drizzle connection test failed:', error)
    try {
      await sql.end()
    } catch {}
    process.exit(1)
  }
}

testDrizzleConnection()
