import { NextRequest, NextResponse } from 'next/server'
import { getClientIP, getLocationFromIP } from '@/lib/utils/geoip'

/**
 * GET /api/location/ip
 * Returns geolocation based on client IP address
 * Returns null for localhost/private IPs
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request.headers)

    if (!ip) {
      return NextResponse.json(
        { location: null, message: 'No public IP address detected' },
        { status: 200 }
      )
    }

    const location = getLocationFromIP(ip)

    if (!location) {
      return NextResponse.json(
        { location: null, message: 'Location not found for IP address' },
        { status: 200 }
      )
    }

    return NextResponse.json({ location, ip }, { status: 200 })
  } catch (error) {
    console.error('Error in /api/location/ip:', error)
    return NextResponse.json(
      { location: null, error: 'Failed to get location from IP' },
      { status: 500 }
    )
  }
}
