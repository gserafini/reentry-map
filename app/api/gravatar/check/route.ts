import { NextRequest, NextResponse } from 'next/server'
import CryptoJS from 'crypto-js'

const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_CACHE_ENTRIES = 500
const existenceCache = new Map<string, { exists: boolean; expiresAt: number }>()

/**
 * API route to check if a Gravatar exists for an email
 * This server-side check prevents browser console errors from 404 responses
 *
 * GET /api/gravatar/check?email=user@example.com
 * Returns: { exists: boolean }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()
    if (trimmedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Invalid email parameter' }, { status: 400 })
    }

    const hash = CryptoJS.MD5(trimmedEmail).toString()
    const cached = existenceCache.get(hash)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(
        { exists: cached.exists },
        { headers: { 'Cache-Control': 'private, max-age=300' } }
      )
    }
    if (cached) existenceCache.delete(hash)

    const url = `https://www.gravatar.com/avatar/${hash}?d=404`
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'error',
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    })
    const exists = response.ok

    if (existenceCache.size >= MAX_CACHE_ENTRIES) {
      for (const [key, entry] of existenceCache) {
        if (entry.expiresAt <= Date.now()) existenceCache.delete(key)
      }
      if (existenceCache.size >= MAX_CACHE_ENTRIES) {
        existenceCache.delete(existenceCache.keys().next().value!)
      }
    }
    existenceCache.set(hash, { exists, expiresAt: Date.now() + CACHE_TTL_MS })

    return NextResponse.json({ exists }, { headers: { 'Cache-Control': 'private, max-age=300' } })
  } catch (error) {
    console.error('Error checking Gravatar:', error)
    return NextResponse.json({ error: 'Failed to check Gravatar' }, { status: 500 })
  }
}
