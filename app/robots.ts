import { MetadataRoute } from 'next'

/**
 * robots.txt Configuration
 * Controls which pages search engines can crawl
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/_next/static/', '/_next/image/'],
        disallow: [
          '/api/', // API routes
          '/admin/', // Admin dashboard
          '/auth/', // Auth pages
          '/protected/', // Protected pages
          '/profile/', // User profiles (private)
          '/my-suggestions/', // User's suggestions (private)
        ],
      },
    ],
    sitemap: 'https://reentrymap.org/sitemap.xml',
  }
}
