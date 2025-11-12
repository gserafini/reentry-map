#!/usr/bin/env node

/**
 * Execute migrations - prints SQL for manual execution
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

const migrations = [
  'supabase/migrations/20250109000000_verification_system.sql',
  'supabase/migrations/20250109000001_ai_usage_tracking.sql',
]

console.log('\n📋 MIGRATION SQL\n')
console.log('Copy and paste this into Supabase SQL Editor:\n')
console.log('='.repeat(80))

migrations.forEach((migrationPath) => {
  const fullPath = join(projectRoot, migrationPath)
  const sql = readFileSync(fullPath, 'utf-8')
  console.log(sql)
  console.log('\n')
})

console.log('='.repeat(80))
console.log('\n✅ After running, restart dev server:\n')
console.log('   killall -9 node && rm -rf .next && npm run dev\n')
