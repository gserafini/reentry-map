/**
 * POST /api/auth/otp/send
 *
 * Sends a phone OTP via Twilio
 * Creates entry in phone_otps table with 10-minute expiry
 */

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

// Database connection (lazy initialization)
let pool: Pool | null = null
function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required')
    }
    const isLocalhost =
      connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
    pool = new Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
    })
  }
  return pool
}

// Twilio client (lazy initialization to avoid build errors with missing credentials)
function getTwilioClient() {
  // Dynamic import to avoid issues during build
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const twilio = require('twilio')
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
}

/**
 * Normalize phone to E.164 format (+1XXXXXXXXXX)
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }

  if (digits.length === 10) {
    return `+1${digits}`
  }

  if (phone.startsWith('+')) {
    return phone
  }

  return `+${digits}`
}

/**
 * Generate a 6-digit OTP code
 */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

interface OtpSendRequest {
  phone: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OtpSendRequest
    const { phone } = body

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // Validate US phone number
    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone.match(/^\+1\d{10}$/)) {
      return NextResponse.json({ error: 'Invalid US phone number format' }, { status: 400 })
    }

    // Check for recent OTP (rate limiting - 1 per 60 seconds)
    const { rows: recentOtps } = await getPool().query(
      `SELECT id FROM phone_otps
       WHERE phone = $1
         AND created_at > NOW() - INTERVAL '60 seconds'
       LIMIT 1`,
      [normalizedPhone]
    )

    if (recentOtps.length > 0) {
      return NextResponse.json(
        { error: 'Please wait 60 seconds before requesting another code' },
        { status: 429 }
      )
    }

    // Generate OTP
    const code = generateOtp()

    // Store OTP in database (expires in 10 minutes)
    await getPool().query(
      `INSERT INTO phone_otps (phone, code, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [normalizedPhone, code]
    )

    // Check if Twilio is configured
    if (
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      !process.env.TWILIO_PHONE_NUMBER
    ) {
      // Development mode - return code in response
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] OTP for ${normalizedPhone}: ${code}`)
        return NextResponse.json({
          success: true,
          message: 'Verification code sent (dev mode)',
          // Only include code in development
          devCode: code,
        })
      }

      return NextResponse.json({ error: 'SMS service not configured' }, { status: 503 })
    }

    // Send SMS via Twilio
    await getTwilioClient().messages.create({
      body: `Your Reentry Map verification code is: ${code}. It expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: normalizedPhone,
    })

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
    })
  } catch (error) {
    console.error('Error sending OTP:', error)
    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 })
  }
}
