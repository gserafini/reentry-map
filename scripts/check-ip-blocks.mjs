#!/usr/bin/env node
/**
 * Check for IP blocking issues in verification logs
 *
 * Analyzes verification_logs to identify resources where our IP is being blocked
 * but the website is actually working (verified via redundant check).
 *
 * Usage:
 *   node scripts/check-ip-blocks.mjs [--days=7]
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

// Parse CLI args
const args = process.argv.slice(2)
const days = parseInt(args.find((a) => a.startsWith('--days='))?.split('=')[1] || '30')

async function main() {
  console.log(`🚨 Checking for IP blocking issues (last ${days} days)...\n`)

  // Calculate date threshold
  const threshold = new Date()
  threshold.setDate(threshold.getDate() - days)

  try {
    // Fetch verification logs with joined resource data
    const logs = await sql`
      SELECT vl.*, r.id AS resource_id_joined, r.name AS resource_name, r.website AS resource_website
      FROM verification_logs vl
      LEFT JOIN resources r ON r.id = vl.resource_id
      WHERE vl.created_at >= ${threshold.toISOString()}
      ORDER BY vl.created_at DESC
    `

    // Filter for IP blocks (checks_performed has ip_block_detected = true)
    const ipBlocks = logs.filter((log) => log.checks_performed?.ip_block_detected === true)

    if (ipBlocks.length === 0) {
      console.log('✅ No IP blocking issues detected in the last ' + days + ' days')
      return
    }

    console.log(`🚨 FOUND ${ipBlocks.length} IP BLOCKING INCIDENTS\n`)

    // Group by resource URL to identify patterns
    const blocksByUrl = {}
    ipBlocks.forEach((log) => {
      const url = log.checks_performed.ip_block_details?.url
      if (url) {
        if (!blocksByUrl[url]) {
          blocksByUrl[url] = {
            url,
            resource_name: log.resource_name || 'Unknown',
            resource_id: log.resource_id,
            incidents: [],
          }
        }
        blocksByUrl[url].incidents.push({
          timestamp: log.created_at,
          direct_error: log.checks_performed.ip_block_details.direct_error,
          direct_status: log.checks_performed.ip_block_details.direct_status,
          redundant_status: log.checks_performed.ip_block_details.redundant_status,
        })
      }
    })

    // Sort by number of incidents (most problematic first)
    const sortedBlocks = Object.values(blocksByUrl).sort(
      (a, b) => b.incidents.length - a.incidents.length
    )

    console.log('📊 IP BLOCKING REPORT\n')
    console.log('='.repeat(80))

    sortedBlocks.forEach((block, idx) => {
      console.log(`\n${idx + 1}. ${block.resource_name}`)
      console.log(`   URL: ${block.url}`)
      console.log(`   Resource ID: ${block.resource_id}`)
      console.log(`   Incidents: ${block.incidents.length}`)
      console.log(`   Latest incident: ${new Date(block.incidents[0].timestamp).toLocaleString()}`)
      console.log(`   Error: ${block.incidents[0].direct_error}`)
      console.log(
        `   Status codes: Direct ${block.incidents[0].direct_status || 'N/A'}, Redundant ${block.incidents[0].redundant_status}`
      )
    })

    console.log('\n' + '='.repeat(80))

    // Analyze patterns
    console.log('\n\n🔍 PATTERN ANALYSIS\n')

    // Group by error type
    const errorTypes = {}
    ipBlocks.forEach((log) => {
      const error = log.checks_performed.ip_block_details?.direct_error || 'Unknown'
      errorTypes[error] = (errorTypes[error] || 0) + 1
    })

    console.log('Error types:')
    Object.entries(errorTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([error, count]) => {
        console.log(`  - ${error}: ${count} incidents`)
      })

    // Check for domain patterns
    console.log('\nDomain analysis:')
    const domains = {}
    Object.keys(blocksByUrl).forEach((url) => {
      try {
        const domain = new URL(url).hostname
        domains[domain] = (domains[domain] || 0) + 1
      } catch (_e) {
        // Invalid URL, skip
      }
    })

    Object.entries(domains)
      .sort((a, b) => b[1] - a[1])
      .forEach(([domain, count]) => {
        console.log(`  - ${domain}: ${count} resource(s) affected`)
      })

    // Recommendations
    console.log('\n\n📋 RECOMMENDED ACTIONS\n')
    console.log('1. Infrastructure:')
    console.log('   - Consider using a proxy service or VPN for verification checks')
    console.log('   - Rotate IP addresses if possible')
    console.log('   - Add delays between requests to same domain')
    console.log('')
    console.log('2. Outreach:')
    console.log('   - Contact affected websites to whitelist verification bot')
    console.log('   - Provide User-Agent: ReentryMap-Verification/1.0 for identification')
    console.log('')
    console.log('3. Monitoring:')
    console.log('   - Run this script weekly to track IP blocking trends')
    console.log('   - Alert if IP blocks increase > 20% week-over-week')
    console.log('')
    console.log('4. Patterns:')
    if (Object.keys(domains).length === 1) {
      console.log('   ⚠️  All blocks from same domain - likely targeted blocking')
    } else if (Object.keys(errorTypes).length === 1) {
      console.log('   ⚠️  All blocks same error type - likely infrastructure issue')
    } else {
      console.log('   ℹ️  Mixed patterns - investigate case-by-case')
    }
  } catch (error) {
    console.error('❌ Error fetching logs:', error)
    await sql.end()
    process.exit(1)
  }

  await sql.end()
}

main().catch(async (err) => {
  console.error(err)
  await sql.end()
})
