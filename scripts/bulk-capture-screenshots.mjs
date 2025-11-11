#!/usr/bin/env node
/**
 * Bulk capture screenshots for all resources with websites
 *
 * Uses the bulk screenshot API endpoint to process resources in batches
 *
 * Usage:
 *   node bulk-capture-screenshots.mjs         # Skip resources with existing screenshots
 *   node bulk-capture-screenshots.mjs --force # Recapture all screenshots
 */

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

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

// Check for --force flag
const force = process.argv.includes('--force')

async function main() {
  const overallStartTime = Date.now()

  if (force) {
    console.log('📸 Bulk capturing screenshots for ALL resources (force mode)...\n')
  } else {
    console.log('📸 Bulk capturing screenshots for resources without screenshots...\n')
  }

  let offset = 0
  const limit = 1 // Process 1 at a time for real-time progress feedback
  let hasMore = true
  let totalProcessed = 0
  let totalSuccessful = 0
  let totalFailed = 0

  while (hasMore) {
    try {
      const startTime = Date.now()

      const response = await fetch(
        `${appUrl}/api/admin/resources/screenshots/bulk?limit=${limit}&offset=${offset}&force=${force}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
          },
        }
      )

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

      if (!response.ok) {
        console.error(`❌ API request failed: ${response.status} ${response.statusText}`)
        const error = await response.text()
        console.error(error)
        break
      }

      const result = await response.json()

      // Show successful results with progress and URLs
      if (result.results && result.results.length > 0) {
        result.results.forEach((r, idx) => {
          const current = totalSuccessful + idx + 1
          const total = result.total
          console.log(
            `✅ [${current}/${total}] ${r.name} (${elapsed}s)\n   🔗 ${appUrl}/resources/${r.id}\n   📸 ${r.screenshot_url}\n`
          )
        })
      }

      // Show errors
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((e, idx) => {
          const current = totalProcessed + totalFailed + idx + 1
          const total = result.total
          console.log(`❌ [${current}/${total}] ${e.name} (${elapsed}s)\n   Error: ${e.error}\n`)
        })
      }

      totalProcessed += result.processed
      totalSuccessful += result.successful
      totalFailed += result.failed

      hasMore = result.pagination.hasMore
      offset = result.pagination.nextOffset
    } catch (_error) {
      console.error('❌ Error processing batch:', error)
      break
    }
  }

  const overallElapsed = ((Date.now() - overallStartTime) / 1000).toFixed(1)

  console.log('\n\n✅ Bulk screenshot capture complete!')
  console.log(`   Total Processed: ${totalProcessed}`)
  console.log(`   Total Successful: ${totalSuccessful}`)
  console.log(`   Total Failed: ${totalFailed}`)
  console.log(`   Total Time: ${overallElapsed}s`)
}

main().catch(console.error)
