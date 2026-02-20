#!/usr/bin/env node
/**
 * Periodic Data Quality Verification
 *
 * Runs automated verification on all resources that are due for re-verification
 * based on field-level cadence (next_verification_at).
 *
 * Usage:
 *   node periodic-verification.mjs [--limit=10] [--dry-run]
 *
 * Schedule with cron (weekly):
 *   0 2 * * 0 node /path/to/periodic-verification.mjs >> /var/log/verification.log 2>&1
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

// Parse CLI args
const args = process.argv.slice(2)
const limit = parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || '50')
const dryRun = args.includes('--dry-run')

/**
 * Check if a URL is reachable using Playwright
 * Renders page like a real browser to bypass bot detection
 */
async function checkUrlWithRedundancy(url) {
  const start = Date.now()
  let directCheck = { pass: false, error: 'Not tested' }

  try {
    // Use Playwright to check URL (renders like real browser, bypasses bot detection)
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    })
    const page = await context.newPage()

    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      })

      const status = response?.status() || 0

      directCheck = {
        pass: status >= 200 && status < 400,
        status_code: status,
      }
    } catch (pageError) {
      directCheck = {
        pass: false,
        error: pageError instanceof Error ? pageError.message : 'Unknown error',
      }
    } finally {
      await browser.close()
    }
  } catch (error) {
    directCheck = {
      pass: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Playwright check is comprehensive - if it passes, site is working
  const finalPass = directCheck.pass
  const latency_ms = Date.now() - start
  const status_code = directCheck.status_code
  const errorMsg = !finalPass ? directCheck.error : undefined

  return {
    pass: finalPass,
    checked_at: new Date().toISOString(),
    latency_ms,
    status_code,
    error: errorMsg,
    direct_check: directCheck,
    redundant_check: undefined, // No longer using redundant check (is-it-up.org is down)
  }
}

/**
 * Verify a single resource
 */
async function verifyResource(resource) {
  const checks = {
    url_reachable: null,
    // TODO: Add phone validation, geocoding, etc.
  }

  let passed = 0
  let failed = 0
  let ipBlockDetected = false
  let ipBlockDetails = null

  // Check URL if present
  if (resource.website) {
    checks.url_reachable = await checkUrlWithRedundancy(resource.website)
    if (checks.url_reachable.pass) {
      passed++
    } else {
      failed++

      // Note: With Playwright, 403 responses mean site IS responding (just has bot protection)
      // This is now handled by Playwright's browser rendering, so 403s should be less common
      // If we still get 403, it's strong bot protection even Playwright can't bypass
      if (checks.url_reachable.status_code === 403) {
        ipBlockDetected = true
        ipBlockDetails = {
          url: resource.website,
          status_code: 403,
          error: 'Strong bot protection - 403 Forbidden even with Playwright',
          timestamp: new Date().toISOString(),
        }
      }
    }
  }

  // Calculate overall score
  const totalChecks = passed + failed
  const score = totalChecks > 0 ? passed / totalChecks : null

  // Determine status
  let newStatus = resource.verification_status
  let needsHumanReview = false

  if (failed > 0) {
    newStatus = 'flagged'
    needsHumanReview = true
  } else if (score >= 0.8) {
    newStatus = 'verified'
  }

  return {
    resource_id: resource.id,
    checks,
    score,
    newStatus,
    needsHumanReview,
    failureReasons: failed > 0 ? checks : null,
    ipBlockDetected,
    ipBlockDetails,
  }
}

async function main() {
  const startTime = Date.now()

  console.log('🔍 Starting periodic data quality verification...\n')

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No database updates will be made\n')
  }

  // Fetch resources due for verification
  try {
    const resources = await sql`
      SELECT id, name, website, verification_status, next_verification_at, last_verified_at
      FROM resources
      WHERE (next_verification_at IS NULL OR next_verification_at <= NOW())
        AND status = 'active'
      ORDER BY next_verification_at ASC NULLS FIRST
      LIMIT ${limit}
    `

    console.log(`📋 Found ${resources.length} resources due for verification\n`)

    let verified = 0
    let flagged = 0
    let errors = 0
    let ipBlocksDetected = []

    // Process each resource
    for (const resource of resources) {
      try {
        console.log(`\n🔍 Verifying: ${resource.name}`)

        const result = await verifyResource(resource)

        if (result.newStatus === 'verified') {
          console.log(`  ✅ VERIFIED (score: ${(result.score * 100).toFixed(0)}%)`)
          verified++

          // Check for strong bot protection (403 with Playwright)
          if (result.ipBlockDetected) {
            console.log(`  🚨 STRONG BOT PROTECTION - ${result.ipBlockDetails.error}`)
            console.log(`     URL: ${result.ipBlockDetails.url}`)
            ipBlocksDetected.push(result.ipBlockDetails)
          }
        } else if (result.newStatus === 'flagged') {
          console.log(`  ⚠️  FLAGGED for review`)
          console.log(
            `     Reason: ${result.failureReasons?.url_reachable?.error || 'Unknown error'}`
          )
          flagged++
        }

        // Update database (unless dry run)
        if (!dryRun) {
          // Calculate next verification date (30 days from now for failed checks, 60 for website)
          const nextVerification = new Date()
          nextVerification.setDate(
            nextVerification.getDate() + (result.newStatus === 'flagged' ? 7 : 60)
          )

          await sql`
            UPDATE resources
            SET verification_status = ${result.newStatus},
                verification_confidence = ${result.score},
                last_verified_at = ${new Date().toISOString()},
                next_verification_at = ${nextVerification.toISOString()},
                human_review_required = ${result.needsHumanReview}
            WHERE id = ${resource.id}
          `

          // Log to verification_logs
          const decisionReason =
            result.newStatus === 'flagged'
              ? `URL check failed: ${result.failureReasons?.url_reachable?.error || 'Unknown error'}`
              : result.ipBlockDetected
                ? `All checks passed (strong bot protection detected - 403 with Playwright)`
                : 'All checks passed'

          await sql`
            INSERT INTO verification_logs (
              resource_id, verification_type, agent_version, overall_score,
              checks_performed, decision, decision_reason, completed_at, duration_ms
            ) VALUES (
              ${resource.id}, 'periodic', 'periodic-verification-v1.0.0', ${result.score},
              ${JSON.stringify({
                ...result.checks,
                ip_block_detected: result.ipBlockDetected,
                ip_block_details: result.ipBlockDetails,
              })},
              ${result.newStatus === 'verified' ? 'auto_approve' : 'flag_for_human'},
              ${decisionReason},
              ${new Date().toISOString()},
              ${Date.now() - startTime}
            )
          `
        }
      } catch (error) {
        console.error(`  ❌ Error verifying ${resource.name}:`, error.message)
        errors++
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('\n\n✅ Periodic verification complete!')
    console.log(`   Resources verified: ${verified}`)
    console.log(`   Resources flagged: ${flagged}`)
    console.log(`   Errors: ${errors}`)
    console.log(`   Duration: ${duration}s`)

    // Report strong bot protection detected
    if (ipBlocksDetected.length > 0) {
      console.log(`\n🚨 STRONG BOT PROTECTION DETECTED: ${ipBlocksDetected.length}`)
      console.log(
        '   ADMIN ACTION REQUIRED: These resources have strong bot protection (403 even with Playwright):'
      )
      ipBlocksDetected.forEach((block, idx) => {
        console.log(`   ${idx + 1}. ${block.url}`)
        console.log(`      Status: ${block.status_code}`)
        console.log(`      Issue: ${block.error}`)
      })
      console.log(
        '\n   Recommended actions:\n' +
          '   - Verify manually from browser\n' +
          '   - Consider adding to allowlist for manual verification only\n' +
          '   - Check if site uses Cloudflare or similar advanced bot protection\n' +
          '   - May need custom verification approach for these sites'
      )
    }

    if (dryRun) {
      console.log('\n⚠️  DRY RUN - No changes were made to the database')
    }
  } catch (error) {
    console.error('❌ Error fetching resources:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main().catch(console.error)
