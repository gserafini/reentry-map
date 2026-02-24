/**
 * Drizzle ORM Database Client
 *
 * Lazy-initialized singleton database client for self-hosted PostgreSQL.
 * Both sql and db are created on first use, not at import time, so that
 * `next build` can complete in CI without DATABASE_URL.
 *
 * @see https://orm.drizzle.team/docs/get-started-postgresql
 */

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Singleton storage — survives hot reloads in development
const globalForDb = globalThis as unknown as {
  sql: ReturnType<typeof postgres> | undefined
  db: PostgresJsDatabase<typeof schema> | undefined
}

function createSqlClient(): ReturnType<typeof postgres> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required. Set it in .env.local')
  }

  const isLocalhost =
    connectionString.includes('localhost') || connectionString.includes('127.0.0.1')

  return postgres(connectionString, {
    ssl: isLocalhost ? false : 'require',
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })
}

function getSqlClient(): ReturnType<typeof postgres> {
  if (globalForDb.sql) return globalForDb.sql
  const client = createSqlClient()
  globalForDb.sql = client
  return client
}

function getDbInstance(): PostgresJsDatabase<typeof schema> {
  if (globalForDb.db) return globalForDb.db
  const instance = drizzle(getSqlClient(), { schema })
  globalForDb.db = instance
  return instance
}

/**
 * Lazy-initialized postgres.js client.
 *
 * Supports tagged template literal usage: sql`SELECT ...`
 * Connection is created on first query, not at import time.
 */
const sql: ReturnType<typeof postgres> = new Proxy(
  function () {} as unknown as ReturnType<typeof postgres>,
  {
    apply(_target, thisArg, args) {
      return Reflect.apply(getSqlClient() as unknown as (...a: unknown[]) => unknown, thisArg, args)
    },
    get(_target, prop) {
      return Reflect.get(getSqlClient() as unknown as Record<string | symbol, unknown>, prop)
    },
  }
)

/**
 * Lazy-initialized Drizzle ORM instance with full schema.
 * Created on first property access, not at import time.
 */
const db: PostgresJsDatabase<typeof schema> = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    return Reflect.get(getDbInstance() as object, prop)
  },
})

export { db, sql }

export type Database = typeof db
