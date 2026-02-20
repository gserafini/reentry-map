#!/usr/bin/env node
/**
 * Check screenshot status for resources
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

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not set. Add it to .env.local')
  process.exit(1)
}
const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
const sql = postgres(databaseUrl, {
  ssl: isLocalhost ? false : 'require',
})

async function main() {
  console.log('📸 Checking screenshot status...\n')

  // Try RPC function first, fall back to manual query
  try {
    const data = await sql`SELECT * FROM get_screenshot_stats()`
    console.log(data)
  } catch (_rpcError) {
    // Fallback to manual query if RPC doesn't exist
    try {
      const resources = await sql`
        SELECT id, name, website, screenshot_url, screenshot_captured_at
        FROM resources
      `

      const totalResources = resources.length
      const resourcesWithWebsites = resources.filter((r) => r.website).length
      const resourcesWithScreenshots = resources.filter((r) => r.screenshot_url).length

      console.log(`📊 Screenshot Status:`)
      console.log(`   Total resources: ${totalResources}`)
      console.log(`   Resources with websites: ${resourcesWithWebsites}`)
      console.log(`   Resources with screenshots: ${resourcesWithScreenshots}`)
      console.log(`   Missing screenshots: ${resourcesWithWebsites - resourcesWithScreenshots}`)

      if (resourcesWithScreenshots > 0) {
        console.log('\n✅ Resources with screenshots:')
        resources
          .filter((r) => r.screenshot_url)
          .forEach((r) => {
            console.log(`   - ${r.name}`)
            console.log(`     Screenshot: ${r.screenshot_url}`)
            console.log(`     Captured: ${new Date(r.screenshot_captured_at).toLocaleString()}`)
          })
      }

      if (resourcesWithWebsites - resourcesWithScreenshots > 0) {
        console.log('\n⚠️  Resources missing screenshots:')
        resources
          .filter((r) => r.website && !r.screenshot_url)
          .slice(0, 10)
          .forEach((r) => {
            console.log(`   - ${r.name}`)
            console.log(`     Website: ${r.website}`)
          })

        if (resourcesWithWebsites - resourcesWithScreenshots > 10) {
          console.log(`   ... and ${resourcesWithWebsites - resourcesWithScreenshots - 10} more`)
        }
      }
    } catch (error) {
      console.error('❌ Error fetching resources:', error)
      await sql.end()
      process.exit(1)
    }
  }

  await sql.end()
}

main().catch(async (err) => {
  console.error(err)
  await sql.end()
})
