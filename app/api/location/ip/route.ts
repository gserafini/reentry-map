import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

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

    const data = await response.json()

    // Check for rate limit error
    if (data.error) {
      console.warn('ipapi.co error:', data.reason)
      throw new Error(data.reason || 'GeoIP service error')
    }

    // Return standardized location format
    return NextResponse.json({
      city: data.city || 'Oakland',
      region: data.region || 'CA',
      country: data.country_name || 'United States',
      latitude: data.latitude || 37.8044,
      longitude: data.longitude || -122.2712,
      ip: data.ip,
    })
  } catch (error) {
    console.error('GeoIP lookup failed:', error)

    // Return default Oakland location on error
    return NextResponse.json({
      city: 'Oakland',
      region: 'CA',
      country: 'United States',
      latitude: 37.8044,
      longitude: -122.2712,
      ip: null,
      error: 'Failed to determine location, using default',
    })
  }
}
