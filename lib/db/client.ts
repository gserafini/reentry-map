/**
 * Drizzle ORM Database Client
 *
 * Singleton database client for self-hosted PostgreSQL.
 * Direct database connection via postgres.js.
 *
 * @see https://orm.drizzle.team/docs/get-started-postgresql
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Connection URL from environment
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required. Set it in .env.local')
}

// Determine if we need SSL (not for localhost)
const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1')

// Create postgres.js client with connection pool
// Using singleton pattern to avoid creating multiple connections
const globalForDb = globalThis as unknown as {
  sql: ReturnType<typeof postgres> | undefined
}

const sql =
  globalForDb.sql ??
  postgres(connectionString, {
    // SSL required for remote connections
    ssl: isLocalhost ? false : 'require',
    // Connection pool settings optimized for serverless
    max: 10, // Maximum connections in pool
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Timeout for new connections
  })

// Preserve connection across hot reloads in development
if (process.env.NODE_ENV !== 'production') {
  globalForDb.sql = sql
}

// Create Drizzle ORM instance with schema
export const db = drizzle(sql, { schema })

// Export the raw sql client for advanced queries (PostGIS, etc.)
export { sql }

// Export types for use in other files
export type Database = typeof db
