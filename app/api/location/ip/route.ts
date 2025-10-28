import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { env } from '@/lib/env'

interface GeoIPResponse {
  city?: string
  region?: string
  country_name?: string
  latitude?: number
  longitude?: number
  ip?: string
  error?: boolean
  reason?: string
}

/**
 * GeoIP API endpoint - Returns location data based on client IP
 *
 * Uses ipapi.co free service (30k requests/month):
 * - No API key required for basic usage
 * - Returns city, region, country, lat/lng
 * - Falls back to default Oakland location on error
 *
 * Free tier limits:
 * - 30,000 requests per month
 * - 1,000 requests per day
 * - HTTPS supported
 */
export async function GET() {
  try {
    const headersList = await headers()

    // Get client IP from various proxy headers
    const forwardedFor = headersList.get('x-forwarded-for')
    const realIp = headersList.get('x-real-ip')
    const cfConnectingIp = headersList.get('cf-connecting-ip') // Cloudflare

    // Extract first IP if multiple (x-forwarded-for can be a list)
    const ip = forwardedFor?.split(',')[0]?.trim() || realIp || cfConnectingIp || '127.0.0.1'

    // For localhost/development, use ipapi.co without IP to get server location
    // In production, this will use the actual client IP
    const apiUrl = ip === '127.0.0.1' ? 'https://ipapi.co/json/' : `https://ipapi.co/${ip}/json/`

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Reentry Map App',
      },
      // Cache for 1 hour to reduce API calls
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      throw new Error(`ipapi.co responded with ${response.status}`)
    }

    const data = (await response.json()) as GeoIPResponse

    // Check for rate limit error
    if (data.error) {
      console.warn('ipapi.co error:', data.reason)
      throw new Error(data.reason || 'GeoIP service error')
    }

    // Return standardized location format
    return NextResponse.json({
      city: data.city || env.NEXT_PUBLIC_DEFAULT_CITY,
      region: data.region || env.NEXT_PUBLIC_DEFAULT_REGION,
      country: data.country_name || 'United States',
      latitude: data.latitude || env.NEXT_PUBLIC_DEFAULT_LATITUDE,
      longitude: data.longitude || env.NEXT_PUBLIC_DEFAULT_LONGITUDE,
      ip: data.ip,
    })
  } catch (error) {
    console.error('GeoIP lookup failed:', error)

    // Return default location on error (from environment config)
    return NextResponse.json({
      city: env.NEXT_PUBLIC_DEFAULT_CITY,
      region: env.NEXT_PUBLIC_DEFAULT_REGION,
      country: 'United States',
      latitude: env.NEXT_PUBLIC_DEFAULT_LATITUDE,
      longitude: env.NEXT_PUBLIC_DEFAULT_LONGITUDE,
      ip: null,
      error: 'Failed to determine location, using default',
    })
  }
}
