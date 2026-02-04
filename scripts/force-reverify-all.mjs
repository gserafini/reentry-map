#!/usr/bin/env node
/**
 * Force all active resources with websites to be re-verified
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

const sql = postgres(
  process.env.DATABASE_URL || 'postgresql://reentrymap:password@localhost:5432/reentry_map'
)

async function main() {
  console.log('🔄 Forcing re-verification for all resources with websites...\n')

  // Set verification time to 1 hour ago to ensure they're picked up
  const oneHourAgo = new Date()
  oneHourAgo.setHours(oneHourAgo.getHours() - 1)

  try {
    const data = await sql`
      UPDATE resources
      SET next_verification_at = ${oneHourAgo.toISOString()}
      WHERE status = 'active'
        AND website IS NOT NULL
      RETURNING id
    `

    console.log(`✅ Updated ${data.length} resources`)
    console.log('   All active resources with websites are now due for immediate verification\n')
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
