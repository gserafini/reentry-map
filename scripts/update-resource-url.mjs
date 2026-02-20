#!/usr/bin/env node

import postgres from 'postgres'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '..', '.env.local')

// Load .env.local
const envFile = readFileSync(envPath, 'utf-8')
const envVars = {}
for (const line of envFile.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/)
  if (match) {
    envVars[match[1]] = match[2]
  }
}

const databaseUrl =
  envVars.DATABASE_URL || 'postgresql://reentrymap:password@localhost:5432/reentry_map'
const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
const sql = postgres(databaseUrl, {
  ssl: isLocalhost ? false : 'require',
})

const resourceId = '49530977-9a34-40ef-83f6-ee7815b413b1'
const brokenUrl = 'https://www.ceoworks.org/locations/oakland-ca'

console.log(`Updating CEO Oakland resource URL to: ${brokenUrl}`)
console.log('This URL returns 404 - perfect for testing AI auto-fix!\n')

try {
  const data = await sql`
    UPDATE resources
    SET website = ${brokenUrl}
    WHERE id = ${resourceId}
    RETURNING name, website
  `

  if (data.length === 0) {
    console.error('Error: Resource not found')
    await sql.end()
    process.exit(1)
  }

  console.log('✅ Updated successfully!')
  console.log(`Resource: ${data[0].name}`)
  console.log(`New URL: ${data[0].website}`)
  console.log(
    '\nNow run: node scripts/verify-resource.mjs oakland ca center-for-employment-opportunities-ceo-oakland'
  )
} catch (error) {
  console.error('Error:', error.message)
  await sql.end()
  process.exit(1)
}

await sql.end()
