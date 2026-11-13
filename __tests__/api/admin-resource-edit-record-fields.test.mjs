import { beforeEach, describe, expect, it, vi } from 'vitest'

// The admin create and edit routes accept the B085 record fields: provider-stated
// restrictions (trimmed, empty means none) and a strictly boolean reentry label.
describe('admin resource create/edit record fields', () => {
  let db
  let set
  let values

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    const returning = vi.fn().mockResolvedValue([{ id: 'resource-1', website: null }])
    set = vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning }) })
    values = vi.fn().mockReturnValue({ returning })
    db = { update: vi.fn().mockReturnValue({ set }), insert: vi.fn().mockReturnValue({ values }) }
    vi.doMock('@/lib/utils/admin-auth', () => ({
      checkAdminAuth: vi.fn().mockResolvedValue({ isAuthorized: true, authMethod: 'api_key' }),
    }))
    vi.doMock('@/lib/db/client', () => ({ db }))
    vi.doMock('@/lib/utils/screenshot', () => ({ captureWebsiteScreenshot: vi.fn() }))
    vi.doMock('@/lib/utils/county', () => ({ determineCounty: vi.fn().mockResolvedValue(null) }))
  })

  async function put(body) {
    const { PUT } = await import('../../app/api/admin/resources/[id]/route.ts')
    const response = await PUT(
      new Request('https://reentrymap.org/api/admin/resources/resource-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: 'resource-1' }) }
    )
    return { status: response.status, set: set.mock.calls[0]?.[0] }
  }

  async function post(body) {
    const { POST } = await import('../../app/api/admin/resources/route.ts')
    const response = await POST(
      new Request('https://reentrymap.org/api/admin/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Hope House',
          address: '1 Main St',
          primary_category: 'housing',
          ...body,
        }),
      })
    )
    return { status: response.status, values: values.mock.calls[0]?.[0] }
  }

  it('edits record restrictions and the reentry label', async () => {
    const result = await put({
      record_restrictions: '  No registered sex offenders.  ',
      reentry_focused: true,
    })
    expect(result.status).toBe(200)
    expect(result.set).toEqual({
      recordRestrictions: 'No registered sex offenders.',
      reentryFocused: true,
    })
  })

  it('clears blank restrictions and never stores a non-boolean label', async () => {
    const result = await put({ record_restrictions: '   ', reentry_focused: 'yes' })
    expect(result.set).toEqual({ recordRestrictions: null, reentryFocused: false })
  })

  it('creates listings with the record fields, defaulting to none', async () => {
    const withFields = await post({ record_restrictions: ' No arson. ', reentry_focused: true })
    expect(withFields.status).toBe(201)
    expect(withFields.values).toMatchObject({
      recordRestrictions: 'No arson.',
      reentryFocused: true,
    })
    vi.clearAllMocks()
    const silent = await post({})
    expect(silent.values).toMatchObject({ recordRestrictions: null, reentryFocused: false })
  })
})
