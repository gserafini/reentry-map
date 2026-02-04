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

const sql = postgres(
  envVars.DATABASE_URL || 'postgresql://reentrymap:password@localhost:5432/reentry_map'
)

try {
  const data = await sql`
    SELECT name, change_log
    FROM resources
    WHERE id = '49530977-9a34-40ef-83f6-ee7815b413b1'
    LIMIT 1
  `

  if (data.length === 0) {
    console.error('Error: Resource not found')
    await sql.end()
    process.exit(1)
  }

  console.log(`Resource: ${data[0].name}`)
  console.log('\nChange Log:')
  console.log(JSON.stringify(data[0].change_log, null, 2))
} catch (error) {
  console.error('Error:', error.message)
  await sql.end()
  process.exit(1)
}

await sql.end()
