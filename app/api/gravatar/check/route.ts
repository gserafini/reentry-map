import { NextRequest, NextResponse } from 'next/server'
import CryptoJS from 'crypto-js'

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

    // Generate Gravatar hash
    const trimmedEmail = email.trim().toLowerCase()
    const hash = CryptoJS.MD5(trimmedEmail).toString()

    // Use d=404 to check if Gravatar exists
    // Server-side fetch won't log browser console errors
    const url = `https://www.gravatar.com/avatar/${hash}?d=404`
    const response = await fetch(url, { method: 'HEAD' })

    return NextResponse.json({
      exists: response.ok, // true if 200-299, false if 404
    })
  } catch (error) {
    console.error('Error checking Gravatar:', error)
    return NextResponse.json({ error: 'Failed to check Gravatar' }, { status: 500 })
  }
}
