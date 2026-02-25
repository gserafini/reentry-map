/**
 * CLI Configuration - Loads .env.local and exports shared config values.
 * Reuses the env loading pattern from periodic-verification.mjs.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const PROJECT_ROOT = join(__dirname, '..', '..')

// Load .env.local (manual parsing — no dotenv dependency)
const envPath = join(PROJECT_ROOT, '.env.local')
try {
  const envFile = readFileSync(envPath, 'utf-8')
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
} catch {
  // .env.local may not exist in CI
}

export const BASE_URL = process.env.ADMIN_CLI_BASE_URL || 'http://localhost:3003'
export const ADMIN_API_KEY = process.env.ADMIN_API_KEY || ''
export const DATABASE_URL = process.env.DATABASE_URL || ''

if (!ADMIN_API_KEY) {
  console.error('Error: ADMIN_API_KEY not found in .env.local')
  process.exit(1)
}
