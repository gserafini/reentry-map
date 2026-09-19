import { NextRequest, NextResponse } from 'next/server'
import { isIP } from 'node:net'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import {
  submitUpdate,
  getPendingUpdates,
  getUserUpdates,
  getResourceUpdates,
} from '@/lib/api/updates'
import { checkAdminAuth } from '@/lib/utils/admin-auth'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (type === 'pending') {
    const auth = await checkAdminAuth(request)
    if (!auth.isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    }
    const result = await getPendingUpdates()
    return NextResponse.json(result)
  }

  if (type === 'user') {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const result = await getUserUpdates(session.user.id)
    return NextResponse.json(result)
  }

  const resourceId = searchParams.get('resourceId')
  if (resourceId) {
    const auth = await checkAdminAuth(request)
    if (!auth.isAuthorized)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: auth.error === 'Not authenticated' ? 401 : 403 }
      )
    const result = await getResourceUpdates(resourceId)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Missing type or resourceId parameter' }, { status: 400 })
}

const correctionSchema = z.object({
  resource_id: z.string().uuid(),
  update_type: z.enum([
    'incorrect_info',
    'closed',
    'moved',
    'phone_wrong',
    'address_wrong',
    'hours_wrong',
    'other',
  ]),
  description: z.string().trim().min(3).max(2000),
  new_value: z.string().trim().max(1000).nullable().optional(),
  contact_website: z.string().max(0).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    let sameOrigin = true
    if (origin) {
      try {
        sameOrigin = new URL(origin).origin === new URL(request.url).origin
      } catch {
        sameOrigin = false
      }
    }
    if (request.headers.get('sec-fetch-site') === 'cross-site' || !sameOrigin) {
      return NextResponse.json(
        { data: null, error: 'Submit corrections from this website.' },
        { status: 403 }
      )
    }
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json(
        { data: null, error: 'Send the correction as JSON.' },
        { status: 415 }
      )
    }
    // Deployment contract: requests reach Next.js through our single trusted Apache
    // reverse proxy, which appends its client address as the rightmost X-Forwarded-For
    // value. The Node port must not be exposed directly. Earlier values and X-Real-IP
    // can be caller-supplied; never use them as rate-limit identities. If ingress
    // changes, revise this trusted-hop contract before adding another proxy.
    const forwardedClient = request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
    const ip = forwardedClient && isIP(forwardedClient) ? forwardedClient : 'unknown'
    const limit = rateLimit('corrections:' + ip, 5, 15 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { data: null, error: 'Too many reports. Please try again in 15 minutes.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))),
          },
        }
      )
    }
    const reader = request.body?.getReader()
    const decoder = new TextDecoder()
    let raw = ''
    let bytes = 0
    if (reader) {
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        bytes += chunk.value.byteLength
        if (bytes > 16000) {
          await reader.cancel()
          return NextResponse.json(
            { data: null, error: 'Please keep your report under 2000 characters.' },
            { status: 413 }
          )
        }
        raw += decoder.decode(chunk.value, { stream: true })
      }
      raw += decoder.decode()
    }
    if (raw.length > 8000)
      return NextResponse.json(
        { data: null, error: 'Please keep your report under 2000 characters.' },
        { status: 413 }
      )
    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      return NextResponse.json({ data: null, error: 'Invalid report format.' }, { status: 400 })
    }
    const parsed = correctionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          data: null,
          error: 'Choose an issue type and describe the correction in 3–2000 characters.',
        },
        { status: 400 }
      )
    }
    const session = await getServerSession(authOptions)
    const { resource_id, update_type, description, new_value } = parsed.data
    const result = await submitUpdate({
      resource_id,
      update_type,
      description,
      new_value: new_value || null,
      reported_by: session?.user?.id || null,
      status: 'pending',
    })
    if (result.error || !result.data)
      return NextResponse.json(
        { data: null, error: 'Your report could not be saved. Please try again.' },
        { status: 500 }
      )
    return NextResponse.json({ data: result.data, error: null }, { status: 201 })
  } catch {
    return NextResponse.json({ data: null, error: 'Failed to submit update' }, { status: 500 })
  }
}
