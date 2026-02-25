/**
 * CLI Direct Database Client - for operations without API support.
 * Uses postgres.js with SSL auto-detection (same pattern as all scripts).
 */
import postgres from 'postgres'
import { DATABASE_URL } from './config.mjs'

let _sql = null

/**
 * Get or create postgres.js connection.
 * Lazy-initialized singleton.
 */
export function getDb() {
  if (!_sql) {
    if (!DATABASE_URL) {
      console.error('Error: DATABASE_URL not found in .env.local')
      process.exit(1)
    }
    const isLocalhost = DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    _sql = postgres(DATABASE_URL, {
      ssl: isLocalhost ? false : 'require',
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  }
  return _sql
}

/**
 * Close the database connection.
 */
export async function closeDb() {
  if (_sql) {
    await _sql.end()
    _sql = null
  }
}
