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

// Module-level cache for external IP (persists across requests during dev session)
let cachedExternalIP: string | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * GeoIP API endpoint - Returns location data based on client IP
 *
 * Uses ipapi.co free service (30k requests/month):
 * - No API key required for basic usage
 * - Returns city, region, country, lat/lng
 * - Falls back to default Oakland location on error
 *
 * Behavior for private/reserved IPs:
 * - Detects private/reserved IPs (localhost, 10.x, 192.168.x, 172.16-31.x, ::ffff:x.x.x.x, etc.)
 * - By default: Skips API call and returns default location (prevents errors, saves API calls)
 * - With USE_EXTERNAL_IP_IN_DEV=true: Fetches your actual external IP for testing real geolocation
 *
 * Testing real geolocation in development:
 * 1. Add to .env.local: USE_EXTERNAL_IP_IN_DEV=true
 * 2. Restart dev server
 * 3. Your actual location will be detected instead of default Oakland
 * 4. Uses ipify.org to fetch external IP (cached for 24 hours), then ipapi.co for geolocation
 *
 * Caching:
 * - External IP is cached in memory for 24 hours (avoids repeated ipify.org calls)
 * - Cache persists across requests until server restart
 * - GeoIP results cached for 1 hour via Next.js cache
 *
 * Free tier limits:
 * - ipapi.co: 30,000 requests per month, 1,000 per day
 * - ipify.org: Unlimited (used only when USE_EXTERNAL_IP_IN_DEV=true, cached 24h)
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

    // Check if IP is private/local/reserved (can't be geolocated)
    const isPrivateIP = (ipAddr: string): boolean => {
      // Handle IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
      // Common when IPv6 is enabled but IPv4 addresses are being used
      let checkAddr = ipAddr
      if (ipAddr.startsWith('::ffff:')) {
        // Extract the IPv4 address from the IPv6-mapped format
        checkAddr = ipAddr.substring(7) // Remove '::ffff:' prefix
        console.log(`[GeoIP] Detected IPv4-mapped IPv6 address: ${ipAddr} -> ${checkAddr}`)
      }

      return (
        // IPv4 localhost
        checkAddr === '127.0.0.1' ||
        checkAddr === 'localhost' ||
        // IPv6 localhost
        checkAddr === '::1' ||
        // Class A private (10.0.0.0/8)
        checkAddr.startsWith('10.') ||
        // Class C private (192.168.0.0/16)
        checkAddr.startsWith('192.168.') ||
        // Class B private (172.16.0.0/12)
        checkAddr.startsWith('172.16.') ||
        checkAddr.startsWith('172.17.') || // Docker default
        checkAddr.startsWith('172.18.') ||
        checkAddr.startsWith('172.19.') ||
        checkAddr.startsWith('172.20.') ||
        checkAddr.startsWith('172.21.') ||
        checkAddr.startsWith('172.22.') ||
        checkAddr.startsWith('172.23.') ||
        checkAddr.startsWith('172.24.') ||
        checkAddr.startsWith('172.25.') ||
        checkAddr.startsWith('172.26.') ||
        checkAddr.startsWith('172.27.') ||
        checkAddr.startsWith('172.28.') ||
        checkAddr.startsWith('172.29.') ||
        checkAddr.startsWith('172.30.') ||
        checkAddr.startsWith('172.31.') ||
        // Link-local (169.254.0.0/16)
        checkAddr.startsWith('169.254.') ||
        // IPv6 unique local addresses
        checkAddr.toLowerCase().startsWith('fc00:') ||
        checkAddr.toLowerCase().startsWith('fd00:') ||
        // IPv6 link-local
        checkAddr.toLowerCase().startsWith('fe80:')
      )
    }

    // For localhost/development (private/reserved IPs), handle based on configuration
    if (isPrivateIP(ip)) {
      // If USE_EXTERNAL_IP_IN_DEV is enabled, fetch your actual external IP for testing
      if (env.USE_EXTERNAL_IP_IN_DEV) {
        try {
          console.log(
            `[GeoIP] Private IP detected (${ip}), checking external IP for development testing...`
          )

          let externalIP = cachedExternalIP

          // Check if cache is valid (exists and not expired)
          const isCacheValid =
            externalIP && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION_MS

          if (!isCacheValid) {
            console.log('[GeoIP] Fetching fresh external IP from ipify.org...')

            // Use ipify.org to get the external IP (free, simple, returns just the IP as text)
            const ipifyResponse = await fetch('https://api.ipify.org?format=json', {
              next: { revalidate: 3600 }, // Cache for 1 hour
            })

            if (ipifyResponse.ok) {
              const ipifyData = (await ipifyResponse.json()) as { ip: string }
              externalIP = ipifyData.ip

              // Update cache
              cachedExternalIP = externalIP
              cacheTimestamp = Date.now()

              console.log(`[GeoIP] External IP cached: ${externalIP} (valid for 24 hours)`)
            }
          } else {
            console.log(`[GeoIP] Using cached external IP: ${externalIP}`)
          }

          if (externalIP) {
            console.log(`[GeoIP] Using external IP ${externalIP} for GeoIP lookup`)

            // Use the external IP for GeoIP lookup
            const apiUrl = `https://ipapi.co/${externalIP}/json/`
            const response = await fetch(apiUrl, {
              headers: {
                'User-Agent': 'Reentry Map App',
              },
              next: { revalidate: 3600 },
            })

            if (response.ok) {
              const data = (await response.json()) as GeoIPResponse

              if (!data.error) {
                return NextResponse.json({
                  city: data.city || env.NEXT_PUBLIC_DEFAULT_CITY,
                  region: data.region || env.NEXT_PUBLIC_DEFAULT_REGION,
                  country: data.country_name || 'United States',
                  latitude: data.latitude || env.NEXT_PUBLIC_DEFAULT_LATITUDE,
                  longitude: data.longitude || env.NEXT_PUBLIC_DEFAULT_LONGITUDE,
                  ip: externalIP,
                  isExternalIPLookup: true,
                })
              }
            }
          }

          // If external IP lookup fails, fall through to default location
          console.warn('[GeoIP] External IP lookup failed, using default location')
        } catch (error) {
          console.error('[GeoIP] Error fetching external IP:', error)
          // Fall through to default location
        }
      }

      // Default behavior: skip API call and return default location
      // This avoids wasting API calls and prevents "Reserved IP Address" errors
      console.log(
        `[GeoIP] Private/reserved IP (${ip}), using default location (set USE_EXTERNAL_IP_IN_DEV=true to test with your actual location)`
      )
      return NextResponse.json({
        city: env.NEXT_PUBLIC_DEFAULT_CITY,
        region: env.NEXT_PUBLIC_DEFAULT_REGION,
        country: 'United States',
        latitude: env.NEXT_PUBLIC_DEFAULT_LATITUDE,
        longitude: env.NEXT_PUBLIC_DEFAULT_LONGITUDE,
        ip: ip,
        isDefaultLocation: true,
      })
    }

    // In production with real IPs, call the GeoIP service
    const apiUrl = `https://ipapi.co/${ip}/json/`

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
