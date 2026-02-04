import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  /**
   * Server-side environment variables schema
   * These are never exposed to the client
   */
  server: {
    // NextAuth.js configuration
    DATABASE_URL: z.string().url().optional(),
    DIRECT_DATABASE_URL: z.string().url().optional(),
    NEXTAUTH_SECRET: z.string().min(16).optional(),

    // Twilio SMS configuration
    TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
    TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
    TWILIO_PHONE_NUMBER: z.string().min(1).optional(),

    // AI API keys
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(), // Legacy - not currently used

    // AI model configuration (easily updatable as models change)
    ANTHROPIC_VERIFICATION_MODEL: z.string().default('claude-sonnet-4-20250514'), // For URL auto-fix with web search
    ANTHROPIC_ENRICHMENT_MODEL: z.string().default('claude-haiku-4-5-20250514'), // For content verification

    // Google Maps server-side key (for geocoding, etc.)
    GOOGLE_MAPS_KEY: z.string().min(1).optional(),

    // Admin contact for system alerts and monitoring
    ADMIN_EMAIL: z.string().email().optional(),

    // Admin API key for machine-to-machine authentication (Claude Code, scripts)
    ADMIN_API_KEY: z.string().min(32).optional(),

    // GeoIP: Use external IP lookup in development for testing (set to 'true' to enable)
    // When enabled, fetches your actual external IP for GeoIP instead of using localhost
    USE_EXTERNAL_IP_IN_DEV: z
      .enum(['true', 'false'])
      .default('false')
      .transform((val) => val === 'true'),
  },

  /**
   * Client-side environment variables schema
   * These must be prefixed with NEXT_PUBLIC_
   */
  client: {
    // Application URL (for redirects, SEO, etc.)
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),

    // Google Maps client-side key
    NEXT_PUBLIC_GOOGLE_MAPS_KEY: z.string().min(1).optional(),

    // Default location (for initial map center and fallback)
    NEXT_PUBLIC_DEFAULT_CITY: z.string().default('Oakland'),
    NEXT_PUBLIC_DEFAULT_REGION: z.string().default('CA'),
    NEXT_PUBLIC_DEFAULT_LATITUDE: z.coerce.number().default(37.8044),
    NEXT_PUBLIC_DEFAULT_LONGITUDE: z.coerce.number().default(-122.2712),

    // Analytics configuration
    NEXT_PUBLIC_ANALYTICS_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((val) => val === 'true'),
  },

  /**
   * Runtime environment variables
   * Destructure all variables from `process.env` here
   */
  runtimeEnv: {
    // Server-only
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_VERIFICATION_MODEL: process.env.ANTHROPIC_VERIFICATION_MODEL,
    ANTHROPIC_ENRICHMENT_MODEL: process.env.ANTHROPIC_ENRICHMENT_MODEL,
    GOOGLE_MAPS_KEY: process.env.GOOGLE_MAPS_KEY,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_API_KEY: process.env.ADMIN_API_KEY,
    USE_EXTERNAL_IP_IN_DEV: process.env.USE_EXTERNAL_IP_IN_DEV,

    // Client-side
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
    NEXT_PUBLIC_DEFAULT_CITY: process.env.NEXT_PUBLIC_DEFAULT_CITY,
    NEXT_PUBLIC_DEFAULT_REGION: process.env.NEXT_PUBLIC_DEFAULT_REGION,
    NEXT_PUBLIC_DEFAULT_LATITUDE: process.env.NEXT_PUBLIC_DEFAULT_LATITUDE,
    NEXT_PUBLIC_DEFAULT_LONGITUDE: process.env.NEXT_PUBLIC_DEFAULT_LONGITUDE,
    NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
  },

  /**
   * Skip validation during build if SKIP_ENV_VALIDATION is set
   * Useful for Docker builds or CI where env vars are injected at runtime
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
