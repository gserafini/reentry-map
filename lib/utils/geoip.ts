import geoip from 'geoip-lite'
import { getTrustedClientIP } from '@/lib/utils/client-ip'

export interface GeoIPLocation {
  latitude: number
  longitude: number
  city?: string
  region?: string
  country?: string
  timezone?: string
}

/**
 * Get geolocation from IP address
 * Returns null for localhost/private IPs
 */
export function getLocationFromIP(ip: string): GeoIPLocation | null {
  // Skip localhost and private IPs
  if (
    !ip ||
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.')
  ) {
    return null
  }

  const geo = geoip.lookup(ip)
  if (!geo) {
    return null
  }

  return {
    latitude: geo.ll[0],
    longitude: geo.ll[1],
    city: geo.city,
    region: geo.region,
    country: geo.country,
    timezone: geo.timezone,
  }
}

/**
 * Get IP address from Next.js request headers
 * Checks common proxy headers first
 */
export function getClientIP(headers: Headers): string | null {
  const ip = getTrustedClientIP(headers)
  return ip === 'unknown' ? null : ip
}
