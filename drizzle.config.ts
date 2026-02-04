import type { Config } from 'drizzle-kit'

/**
 * Drizzle Kit configuration for database migrations
 *
 * Used for:
 * - Generating migrations from schema changes
 * - Pushing schema changes to database
 * - Running Drizzle Studio for database browsing
 *
 * @see https://orm.drizzle.team/kit-docs/config-reference
 */
export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Only include our tables, not PostGIS system tables
  tablesFilter: ['!spatial_ref_sys'],
} satisfies Config
