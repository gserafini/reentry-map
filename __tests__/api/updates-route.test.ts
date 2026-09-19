// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({
  submit: vi.fn(),
  session: vi.fn(),
  admin: vi.fn(),
  rate: vi.fn(),
  resources: vi.fn(),
}))
vi.mock('next-auth', () => ({ getServerSession: mocks.session }))
vi.mock('@/lib/auth/config', () => ({ authOptions: {} }))
vi.mock('@/lib/utils/admin-auth', () => ({ checkAdminAuth: mocks.admin }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mocks.rate }))
vi.mock('@/lib/api/updates', () => ({
  submitUpdate: mocks.submit,
  getResourceUpdates: mocks.resources,
  getUserUpdates: vi.fn(),
  getPendingUpdates: vi.fn(),
}))
import { GET, POST } from '@/app/api/updates/route'

const body = {
  resource_id: '5590a462-76af-4c53-ab4e-e6e15d879e9e',
  update_type: 'hours_wrong',
  description: 'The office now closes at 4pm.',
}
const request = (data: object, headers = {}) =>
  new NextRequest('https://reentrymap.org/api/updates', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
describe('moderated factual corrections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.session.mockResolvedValue(null)
    mocks.resources.mockResolvedValue({ data: [], error: null })
    mocks.admin.mockResolvedValue({ isAuthorized: false, error: 'Not authenticated' })
    mocks.rate.mockReturnValue({ allowed: true, resetAt: Date.now() + 1000 })
    mocks.submit.mockResolvedValue({ data: { id: 'report-id' }, error: null })
  })
  it('accepts a guest report but forces pending and ignores forged reporter/status', async () => {
    const response = await POST(
      request({ ...body, status: 'applied', reported_by: 'another-user' })
    )
    expect(response.status).toBe(201)
    expect(mocks.submit).toHaveBeenCalledWith({
      ...body,
      new_value: null,
      reported_by: null,
      status: 'pending',
    })
  })
  it('returns the complete newly inserted report promised by the client contract', async () => {
    const inserted = {
      ...body,
      id: 'report-id',
      reported_by: null,
      old_value: null,
      new_value: null,
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      created_at: '2026-09-19T03:30:00.000Z',
    }
    mocks.submit.mockResolvedValue({ data: inserted, error: null })
    const response = await POST(request(body))
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ data: inserted, error: null })
    expect(mocks.resources).not.toHaveBeenCalled()
  })
  it('does not report success when insertion returns no report', async () => {
    mocks.submit.mockResolvedValue({ data: null, error: null })
    const response = await POST(request(body))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      data: null,
      error: 'Your report could not be saved. Please try again.',
    })
  })
  it('attributes signed-in reports only to the current session', async () => {
    mocks.session.mockResolvedValue({ user: { id: 'current-user' } })
    await POST(request({ ...body, reported_by: 'another-user' }))
    expect(mocks.submit.mock.calls[0][0].reported_by).toBe('current-user')
  })
  it('rejects invalid fields and excessive content before writing', async () => {
    expect(
      (await POST(request({ ...body, update_type: 'publish', description: 'x'.repeat(2100) })))
        .status
    ).toBe(400)
    expect(mocks.submit).not.toHaveBeenCalled()
  })
  it('rejects an oversized stream and malformed origin safely', async () => {
    expect((await POST(request({ ...body, description: 'x'.repeat(9000) }))).status).toBe(413)
    expect((await POST(request(body, { origin: 'not a url' }))).status).toBe(403)
    expect(mocks.submit).not.toHaveBeenCalled()
  })
  it('uses the client appended by Apache, not caller-supplied forwarded prefixes', async () => {
    await POST(request(body, { 'x-forwarded-for': '203.0.113.10, 198.51.100.8' }))
    await POST(request(body, { 'x-forwarded-for': '203.0.113.11, 198.51.100.8' }))
    expect(mocks.rate.mock.calls.map(([key]) => key)).toEqual([
      'corrections:198.51.100.8',
      'corrections:198.51.100.8',
    ])
  })
  it('shares a conservative bucket when the trusted hop is missing or malformed', async () => {
    await POST(
      request(body, {
        'x-forwarded-for': '203.0.113.10, not-an-ip',
        'x-real-ip': '203.0.113.20',
      })
    )
    await POST(request(body, { 'x-real-ip': '203.0.113.21' }))
    expect(mocks.rate.mock.calls.map(([key]) => key)).toEqual([
      'corrections:unknown',
      'corrections:unknown',
    ])
  })
  it('accepts the appended IPv6 client address', async () => {
    await POST(request(body, { 'x-forwarded-for': '203.0.113.10, 2001:db8::8' }))
    expect(mocks.rate).toHaveBeenCalledWith('corrections:2001:db8::8', 5, 15 * 60 * 1000)
  })
  it('rate limits repeated reports', async () => {
    mocks.rate.mockReturnValue({ allowed: false, resetAt: Date.now() + 10000 })
    const response = await POST(request(body))
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBeTruthy()
    expect(mocks.submit).not.toHaveBeenCalled()
  })
  it('rejects cross-origin posts and filled bot fields', async () => {
    expect((await POST(request(body, { origin: 'https://other.example' }))).status).toBe(403)
    expect((await POST(request({ ...body, contact_website: 'spam' }))).status).toBe(400)
    expect(mocks.submit).not.toHaveBeenCalled()
  })
  it('does not expose private unmoderated reports through resource lookup', async () => {
    const response = await GET(
      new NextRequest('https://reentrymap.org/api/updates?resourceId=' + body.resource_id)
    )
    expect(response.status).toBe(401)
    expect(mocks.resources).not.toHaveBeenCalled()
  })
})
