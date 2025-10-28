import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { env } from '@/lib/env'
import { monitorGeoIPService } from '@/lib/monitoring/dependency-monitor'

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

    // Check if IP is private/local (can't be geolocated)
    const isPrivateIP = (ipAddr: string): boolean => {
      return (
        ipAddr === '127.0.0.1' || // Localhost
        ipAddr === '::1' || // IPv6 localhost
        ipAddr.startsWith('10.') || // Class A private (10.0.0.0/8)
        ipAddr.startsWith('192.168.') || // Class C private (192.168.0.0/16)
        /^172\.(1[6-9]|2\d|3[01])\./.test(ipAddr) // Class B private (172.16.0.0/12)
      )
    }

    // For localhost/development (private IPs), use ipapi.co without IP to get server location
    // In production, this will use the actual client IP
    const apiUrl = isPrivateIP(ip) ? 'https://ipapi.co/json/' : `https://ipapi.co/${ip}/json/`

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
      const error = new Error(data.reason || 'GeoIP service error')
      console.warn('ipapi.co error:', data.reason)

      // Send monitoring alert (rate limited to 1 per hour)
      await monitorGeoIPService(error, {
        reason: data.reason,
        ip,
        response_status: response.status,
      })

      throw error
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
