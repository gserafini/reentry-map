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
  .from('resources')
  .select('name, change_log')
  .eq('id', '49530977-9a34-40ef-83f6-ee7815b413b1')
  .single()

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

console.log(`Resource: ${data.name}`)
console.log('\nChange Log:')
console.log(JSON.stringify(data.change_log, null, 2))
