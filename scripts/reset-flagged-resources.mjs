#!/usr/bin/env node
/**
 * Reset flagged resources for re-verification
 */

import postgres from 'postgres'
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

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://reentrymap:password@localhost:5432/reentry_map'
const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
const sql = postgres(databaseUrl, {
  ssl: isLocalhost ? false : 'require',
})

async function main() {
  console.log('🔄 Resetting flagged resources for re-verification...\n')

  // Set verification time to 1 hour ago to ensure they're picked up
  const oneHourAgo = new Date()
  oneHourAgo.setHours(oneHourAgo.getHours() - 1)

  try {
    const data = await sql`
      UPDATE resources
      SET verification_status = 'verified',
          human_review_required = false,
          next_verification_at = ${oneHourAgo.toISOString()}
      WHERE verification_status = 'flagged'
      RETURNING id
    `

    console.log(`✅ Reset ${data.length} resources`)
    console.log(
      '   All flagged resources are now marked as verified and due for immediate re-verification\n'
    )
  } catch (error) {
    console.error('❌ Error:', error)
    await sql.end()
    process.exit(1)
  }

  await sql.end()
}

main().catch(async (err) => {
  console.error(err)
  await sql.end()
})
