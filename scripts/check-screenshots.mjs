#!/usr/bin/env node
/**
 * Check screenshot status for resources
 */

import { createClient } from '@supabase/supabase-js'
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('📸 Checking screenshot status...\n')

  // Get counts
  const { data, error } = await supabase.rpc('get_screenshot_stats', {})

  if (error) {
    // Fallback to manual query if RPC doesn't exist
    const { data: resources, error: fetchError } = await supabase
      .from('resources')
      .select('id, name, website, screenshot_url, screenshot_captured_at')

    if (fetchError) {
      console.error('❌ Error fetching resources:', fetchError)
      process.exit(1)
    }

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
  } else {
    console.log(data)
  }
}

main().catch(console.error)
