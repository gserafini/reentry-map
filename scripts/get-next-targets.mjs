#!/usr/bin/env node

/**
 * Get Next Research Targets
 *
 * Queries the expansion priorities database to get the highest-priority
 * locations ready for research by AI agents.
 *
 * Usage:
 *   node scripts/get-next-targets.mjs [limit] [status] [research_status]
 *
 * Examples:
 *   node scripts/get-next-targets.mjs 10
 *   node scripts/get-next-targets.mjs 5 identified not_started
 *   node scripts/get-next-targets.mjs 20 identified,researching not_started,blocked
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

// Parse command line args
const limit = parseInt(process.argv[2] || '10')
const statusFilter = process.argv[3] ? process.argv[3].split(',') : ['identified', 'researching']
const researchStatusFilter = process.argv[4]
  ? process.argv[4].split(',')
  : ['not_started', 'blocked']

async function getNextTargets() {
  try {
    const data = await sql`
      SELECT *
      FROM expansion_priorities
      WHERE status = ANY(${statusFilter})
        AND research_status = ANY(${researchStatusFilter})
      ORDER BY priority_score DESC
      LIMIT ${limit}
    `

    // Display results
    if (data.length === 0) {
      console.log('\n⚠️  No targets found matching criteria')
      console.log(`   Status: ${statusFilter.join(', ')}`)
      console.log(`   Research Status: ${researchStatusFilter.join(', ')}`)
      return
    }

    console.log(`\n📍 Top ${data.length} Next Research Targets:\n`)
    console.log(
      `Filters: status=[${statusFilter.join(', ')}], research_status=[${researchStatusFilter.join(', ')}]\n`
    )

    data.forEach((target, index) => {
      console.log(`${index + 1}. ${target.city}, ${target.state}`)
      console.log(`   Priority Score: ${target.priority_score}`)
      console.log(`   Tier: ${target.priority_tier}`)
      console.log(`   Phase: ${target.phase || 'N/A'}`)
      console.log(`   Status: ${target.status}`)
      console.log(`   Research Status: ${target.research_status}`)
      if (target.metro_area) {
        console.log(`   Metro Area: ${target.metro_area}`)
      }
      if (target.population) {
        console.log(`   Metro Population: ${target.population.toLocaleString()}`)
      }
      if (target.strategic_rationale) {
        console.log(`   Rationale: ${target.strategic_rationale}`)
      }
      console.log()
    })

    console.log(`Total targets found: ${data.length}`)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

getNextTargets()
