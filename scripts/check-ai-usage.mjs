#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)

const { data, error } = await supabase
  .from('ai_usage_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10)

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

console.log(`AI Usage Tracking (last 10 entries):`)
console.log('='.repeat(80))

if (data.length === 0) {
  console.log('No API usage tracked yet.')
} else {
  let totalCost = 0
  for (const entry of data) {
    console.log(`\n${entry.created_at}`)
    console.log(`  Operation: ${entry.operation_type}`)
    console.log(`  Provider: ${entry.provider}`)
    console.log(`  Model: ${entry.model}`)
    console.log(
      `  Tokens: ${entry.input_tokens} in + ${entry.output_tokens} out = ${entry.total_tokens} total`
    )
    console.log(`  Cost: $${parseFloat(entry.total_cost_usd).toFixed(6)}`)
    if (entry.suggestion_id) console.log(`  Suggestion: ${entry.suggestion_id}`)
    if (entry.resource_id) console.log(`  Resource: ${entry.resource_id}`)
    if (entry.duration_ms) console.log(`  Duration: ${entry.duration_ms}ms`)
    totalCost += parseFloat(entry.total_cost_usd)
  }

  console.log('\n' + '='.repeat(80))
  console.log(`Total cost (last 10): $${totalCost.toFixed(6)}`)
}
