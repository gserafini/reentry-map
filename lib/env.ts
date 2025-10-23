import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  /**
   * Server-side environment variables schema
   * These are never exposed to the client
   */
  server: {
    // Supabase server-only keys
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

    // AI API keys
    OPENAI_API_KEY: z.string().min(1).optional(),

    // Google Maps server-side key (for geocoding, etc.)
    GOOGLE_MAPS_KEY: z.string().min(1).optional(),
  },

  /**
   * Client-side environment variables schema
   * These must be prefixed with NEXT_PUBLIC_
   */
  client: {
    // Supabase public configuration
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),

    // Application URL (for redirects, SEO, etc.)
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),

    // Google Maps client-side key
    NEXT_PUBLIC_GOOGLE_MAPS_KEY: z.string().min(1).optional(),
  },

  /**
   * Runtime environment variables
   * Destructure all variables from `process.env` here
   */
  runtimeEnv: {
    // Server-only
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_MAPS_KEY: process.env.GOOGLE_MAPS_KEY,

    // Client-side
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
  },

  /**
   * Skip validation during build if SKIP_ENV_VALIDATION is set
   * Useful for Docker builds or CI where env vars are injected at runtime
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
