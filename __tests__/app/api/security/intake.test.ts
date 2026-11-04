import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const m = vi.hoisted(() => ({
  sql: vi.fn(),
  session: vi.fn(),
  admin: vi.fn(),
  verify: vi.fn(),
  submit: vi.fn(),
}))
vi.mock('@/lib/db/client', () => ({ sql: m.sql }))
vi.mock('next-auth', () => ({ getServerSession: m.session }))
vi.mock('@/lib/auth/config', () => ({ authOptions: {} }))
vi.mock('@/lib/utils/admin-auth', () => ({ checkAdminAuth: m.admin }))
vi.mock('@/lib/api/settings', () => ({
  getAISystemStatus: async () => ({ isVerificationActive: true }),
}))
vi.mock('@/lib/ai-agents/verification-agent', () => ({
  VerificationAgent: class {
    verify = m.verify
    logVerification = vi.fn()
    flagForHuman = vi.fn()
  },
}))
vi.mock('@/lib/api/suggestions', () => ({
  submitSuggestion: m.submit,
  getUserSuggestions: vi.fn(),
  getPendingSuggestions: vi.fn(),
}))
import { POST as suggest } from '@/app/api/suggestions/route'
import { POST as batch } from '@/app/api/resources/suggest-batch/route'
import { POST as analytics } from '@/app/api/analytics/batch/route'
const req = (path: string, data: unknown) =>
  new NextRequest('https://reentrymap.org/api/' + path, {
    method: 'POST',
    body: JSON.stringify(data),
  })
const candidate = {
  name: 'Help',
  city: 'Oakland',
  state: 'CA',
  address: '123 Main St',
  website: 'https://example.org',
}
beforeEach(() => {
  vi.clearAllMocks()
  m.session.mockResolvedValue(null)
  m.admin.mockResolvedValue({ isAuthorized: false })
  m.submit.mockResolvedValue({ data: { id: 'new' }, error: null })
  m.sql.mockImplementation(async (strings: TemplateStringsArray) =>
    strings.join('').includes('INSERT INTO resource_suggestions') ? [{ id: 'new' }] : []
  )
})
describe('public intake boundaries', () => {
  it('ignores public moderation and attribution fields', async () => {
    m.session.mockResolvedValue({ user: { id: 'session-user' } })
    expect(
      (
        await suggest(
          req('suggestions', {
            ...candidate,
            status: 'approved',
            suggested_by: 'attacker',
            reviewed_by: 'attacker',
            admin_notes: 'trusted',
          })
        )
      ).status
    ).toBe(201)
    expect(m.submit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', suggested_by: 'session-user' })
    )
    expect(m.submit.mock.calls[0][0]).not.toHaveProperty('reviewed_by')
    expect(m.submit.mock.calls[0][0]).not.toHaveProperty('admin_notes')
  })
  it('rejects malformed JSON and invalid public content before persistence', async () => {
    expect(
      (
        await suggest(
          new NextRequest('https://reentrymap.org/api/suggestions', { method: 'POST', body: '{' })
        )
      ).status
    ).toBe(400)
    expect((await suggest(req('suggestions', { name: 123 }))).status).toBe(400)
    expect(m.submit).not.toHaveBeenCalled()
  })
  it('does not disclose SQL errors', async () => {
    m.submit.mockResolvedValue({
      data: null,
      error: { message: 'SQL secret', code: 'database-code' },
    })
    const response = await suggest(req('suggestions', candidate))
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('SQL secret')
  })
  it('accepts anonymous batch pending without browser or AI verification', async () => {
    const response = await batch(req('resources/suggest-batch', { resources: [candidate] }))
    expect(response.status).toBe(200)
    expect(m.verify).not.toHaveBeenCalled()
    expect((await response.json()).stats.flagged_for_human).toBe(1)
  })
  it('keeps anonymous attribution empty and hides batch persistence errors', async () => {
    await suggest(req('suggestions', { ...candidate, suggested_by: 'forged' }))
    expect(m.submit).toHaveBeenCalledWith(
      expect.objectContaining({ suggested_by: null, status: 'pending' })
    )
    m.sql.mockImplementation(async (strings: TemplateStringsArray) => {
      if (strings.join('').includes('INSERT INTO resource_suggestions'))
        throw new Error('SQL secret')
      return []
    })
    const response = await batch(req('resources/suggest-batch', { resources: [candidate] }))
    expect(await response.text()).not.toContain('SQL secret')
  })
  it('enforces two active trusted batches and releases capacity after completion', async () => {
    m.admin.mockResolvedValue({ isAuthorized: true })
    let release!: (value: unknown) => void
    const pending = new Promise((resolve) => {
      release = resolve
    })
    m.verify.mockReturnValue(pending)
    const first = batch(req('resources/suggest-batch', { resources: [candidate] }))
    const second = batch(req('resources/suggest-batch', { resources: [candidate] }))
    await vi.waitFor(() => expect(m.verify).toHaveBeenCalledTimes(2))
    expect((await batch(req('resources/suggest-batch', { resources: [candidate] }))).status).toBe(
      429
    )
    release({ decision: 'flag_for_human', decision_reason: 'review', overall_score: 0 })
    await Promise.all([first, second])
    expect((await batch(req('resources/suggest-batch', { resources: [candidate] }))).status).toBe(
      200
    )
  })
  it('strips forged analytics identity from unauthenticated events', async () => {
    await analytics(
      req('analytics/batch', [
        {
          event: 'page_view',
          timestamp: new Date().toISOString(),
          client_timestamp: Date.now(),
          session_id: 'anon-session',
          anonymous_id: 'abc',
          page_path: '/',
          user_id: '11111111-1111-4111-8111-111111111111',
          is_admin: true,
        },
      ])
    )
    const eventCall = m.sql.mock.calls.find((call) =>
      call[0].join('').includes('analytics_page_views')
    )!
    expect(eventCall[2]).toBe(null)
    expect(eventCall[4]).toBe(false)
  })
  it('derives analytics identity from session and never changes session ownership on conflict', async () => {
    const claimed = '11111111-1111-4111-8111-111111111111'
    const authenticated = '22222222-2222-4222-8222-222222222222'
    m.session.mockResolvedValue({ user: { id: authenticated, isAdmin: false } })
    await analytics(
      req('analytics/batch', [
        {
          event: 'page_view',
          timestamp: new Date().toISOString(),
          client_timestamp: Date.now(),
          session_id: 'abc',
          anonymous_id: 'abc',
          page_path: '/',
          user_id: claimed,
          is_admin: true,
        },
      ])
    )
    await vi.waitFor(() =>
      expect(m.sql.mock.calls.some((call) => call[0].join('').includes('analytics_sessions'))).toBe(
        true
      )
    )
    const eventCall = m.sql.mock.calls.find((call) =>
      call[0].join('').includes('analytics_page_views')
    )!
    expect(eventCall).toContain(authenticated)
    expect(eventCall).not.toContain(claimed)
    expect(eventCall).not.toContain(true)
    const sessionCall = m.sql.mock.calls.find((call) =>
      call[0].join('').includes('analytics_sessions')
    )!
    expect(sessionCall[0].join('')).not.toContain('DO UPDATE')
  })
})
