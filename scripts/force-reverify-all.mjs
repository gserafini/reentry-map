#!/usr/bin/env node
/**
 * Force all active resources with websites to be re-verified
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  console.log('🔄 Forcing re-verification for all resources with websites...\n')

  // Set verification time to 1 hour ago to ensure they're picked up
  const oneHourAgo = new Date()
  oneHourAgo.setHours(oneHourAgo.getHours() - 1)

  const { data, error } = await supabase
    .from('resources')
    .update({
      next_verification_at: oneHourAgo.toISOString(),
    })
    .eq('status', 'active')
    .not('website', 'is', null)
    .select('id')

  if (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }

  console.log(`✅ Updated ${data.length} resources`)
  console.log('   All active resources with websites are now due for immediate verification\n')
}

main().catch(console.error)
