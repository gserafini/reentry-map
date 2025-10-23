import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  /**
   * Server-side environment variables schema
   * These are never exposed to the client
   */
  server: {
    // Add server-only env vars here in the future
    // Example: DATABASE_URL: z.string().url(),
  },

  /**
   * Client-side environment variables schema
   * These must be prefixed with NEXT_PUBLIC_
   */
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  },

  /**
   * Runtime environment variables
   * Destructure all variables from `process.env` here
   */
  runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },

  /**
   * Skip validation in build for now (we'll enable this once migration is complete)
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
