import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  // Each static worker owns a PostgreSQL pool; bound concurrency on the shared server.
  experimental: { cpus: 2 },
  turbopack: {}, // Enable Turbopack compatibility (Next.js 16 default)
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
  },
}

// Offline support uses public/sw.js so it works with Turbopack and Webpack.
export default withBundleAnalyzer(nextConfig)
