#!/usr/bin/env node

/**
 * Test AI System Controls via API
 * Verifies that the batch suggestion endpoint respects AI system settings
 */

import { createClient } from '@supabase/supabase-js'

// Load environment from .env.local
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

try {
  const envLocal = readFileSync(join(projectRoot, '.env.local'), 'utf-8')
  envLocal.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=')
    if (key && !key.startsWith('#')) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  })
} catch (_err) {
  console.error('Failed to load .env.local')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)

console.log('🧪 Testing AI System Controls\n')

// Test 1: Check current AI system status
console.log('📊 Test 1: Checking current AI system status...')
const { data: settings } = await supabase.from('app_settings').select('*').single()

if (settings) {
  console.log('\n✅ Current Settings:')
  console.log(`   Master AI: ${settings.ai_master_enabled ? '🟢 ENABLED' : '🔴 DISABLED'}`)
  console.log(`   Verification: ${settings.ai_verification_enabled ? '🟢 ENABLED' : '🔴 DISABLED'}`)
  console.log(`   Discovery: ${settings.ai_discovery_enabled ? '🟢 ENABLED' : '🔴 DISABLED'}`)
  console.log(`   Enrichment: ${settings.ai_enrichment_enabled ? '🟢 ENABLED' : '🔴 DISABLED'}`)
  console.log(
    `   Realtime Monitoring: ${settings.ai_realtime_monitoring_enabled ? '🟢 ENABLED' : '🔴 DISABLED'}`
  )

  const isVerificationActive = settings.ai_master_enabled && settings.ai_verification_enabled
  console.log(`\n   Verification Active: ${isVerificationActive ? '✅ YES' : '❌ NO'}`)
} else {
  console.log('❌ Failed to fetch settings')
}

// Test 2: Test with AI systems disabled
console.log('\n\n📊 Test 2: Ensuring AI systems are disabled...')
await supabase
  .from('app_settings')
  .update({
    ai_master_enabled: false,
    ai_verification_enabled: false,
  })
  .eq('id', settings.id)

console.log('✅ Disabled AI systems')

// Test 3: Submit a test resource and verify it's flagged (not auto-verified)
console.log('\n📊 Test 3: Submitting resource with AI disabled...')
const testResource = {
  name: 'Test Resource - AI Disabled',
  category: 'employment',
  address: '1234 Test St, Oakland, CA 94601',
  phone: '510-555-0100',
  website: 'https://example.com',
  hours: 'Mon-Fri 9am-5pm',
  description: 'Test resource for AI system verification',
}

const response = await fetch('http://localhost:3003/api/resources/suggest-batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    resources: [testResource],
  }),
})

const result = await response.json()

console.log('\n✅ API Response:')
console.log(`   Success: ${result.success}`)
console.log(`   Message: ${result.message}`)
if (result.ai_systems) {
  console.log(`\n   AI Systems Status: ${result.ai_systems.status}`)
  console.log(`   Verification Enabled: ${result.ai_systems.verification_enabled}`)
}

if (result.verification_results && result.verification_results.length > 0) {
  const firstResult = result.verification_results[0]
  console.log(`\n   Resource Status: ${firstResult.status}`)
  console.log(`   Decision Reason: ${firstResult.decision_reason}`)

  if (firstResult.status === 'flagged') {
    console.log('\n✅ PASS: Resource correctly flagged for manual review (AI disabled)')
  } else {
    console.log('\n❌ FAIL: Resource was not flagged despite AI being disabled')
  }
}

// Test 4: Enable AI and test again
console.log('\n\n📊 Test 4: Enabling AI systems...')
await supabase
  .from('app_settings')
  .update({
    ai_master_enabled: true,
    ai_verification_enabled: true,
  })
  .eq('id', settings.id)

console.log('✅ Enabled AI systems')

// Test 5: Submit another resource and verify AI processes it
console.log('\n📊 Test 5: Submitting resource with AI enabled...')
const testResource2 = {
  name: 'Test Resource - AI Enabled',
  category: 'housing',
  address: '5678 Test Ave, Oakland, CA 94601',
  phone: '510-555-0200',
  website: 'https://example.org',
  hours: 'Mon-Fri 8am-6pm',
  description: 'Test resource with AI verification enabled',
}

const response2 = await fetch('http://localhost:3003/api/resources/suggest-batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    resources: [testResource2],
  }),
})

const result2 = await response2.json()

console.log('\n✅ API Response:')
console.log(`   Success: ${result2.success}`)
console.log(`   Message: ${result2.message}`)
if (result2.ai_systems) {
  console.log(`\n   AI Systems Status: ${result2.ai_systems.status}`)
  console.log(`   Verification Enabled: ${result2.ai_systems.verification_enabled}`)
}

if (result2.ai_systems && result2.ai_systems.verification_enabled) {
  console.log('\n✅ PASS: AI verification is active')
} else {
  console.log('\n❌ FAIL: AI verification should be active but is not')
}

// Clean up - restore original state
console.log('\n\n🧹 Cleanup: Restoring AI settings to disabled...')
await supabase
  .from('app_settings')
  .update({
    ai_master_enabled: false,
    ai_verification_enabled: false,
  })
  .eq('id', settings.id)

console.log('✅ AI systems restored to disabled state')

console.log('\n\n✅ All API tests completed!\n')
