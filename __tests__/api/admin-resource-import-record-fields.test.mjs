import { beforeEach, describe, expect, it, vi } from 'vitest'

// New listings carry source-backed record restrictions and an explicit reentry focus;
// imports never certify "accepts records" by default.
describe('admin resource import record fields', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  async function importOne(resource) {
    const returning = vi.fn().mockResolvedValue([{ id: 'resource-1', name: resource.name }])
    const values = vi.fn().mockReturnValue({ returning })
    const where = vi.fn().mockResolvedValue(undefined)
    const db = {
      insert: vi.fn().mockReturnValue({ values }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where }) }),
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          status: 'OK',
          results: [
            {
              formatted_address: '728 W 4th St, Pueblo, CO 81003, USA',
              geometry: { location: { lat: 38.2706, lng: -104.6168 } },
            },
          ],
        }),
      })
    )
    process.env.GOOGLE_MAPS_KEY = 'test-key'
    vi.doMock('@/lib/utils/admin-auth', () => ({
      checkAdminAuth: vi.fn().mockResolvedValue({ isAuthorized: true, authMethod: 'api_key' }),
    }))
    vi.doMock('@/lib/db/client', () => ({ db }))
    vi.doMock('@/lib/utils/deduplication', async (importOriginal) => {
      const actual = await importOriginal()
      return {
        ...actual,
        checkForDuplicate: vi.fn().mockResolvedValue({ isDuplicate: false }),
        detectParentChildRelationships: vi.fn().mockResolvedValue(new Map()),
      }
    })
    const { POST } = await import('../../app/api/admin/resources/import/route.ts')
    const response = await POST(
      new Request('https://reentrymap.org/api/admin/resources/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resources: [resource] }),
      })
    )
    expect(response.status).toBe(200)
    expect(values).toHaveBeenCalledOnce()
    return values.mock.calls[0][0]
  }

  const base = {
    name: 'Example Shelter',
    address: '728 W 4th St',
    city: 'Pueblo',
    state: 'CO',
    primary_category: 'housing',
    website: 'https://example.org/',
  }

  it('passes source-backed record restrictions and reentry focus through imports', async () => {
    const payload = await importOne({
      ...base,
      record_restrictions: '  No one on a sex-offender registry.  ',
      reentry_focused: true,
    })
    expect(payload).toMatchObject({
      recordRestrictions: 'No one on a sex-offender registry.',
      reentryFocused: true,
    })
  })

  it('leaves both unset, and never defaults accepts-records, when the source is silent', async () => {
    const payload = await importOne({ ...base, accepts_records: true, reentry_focused: 'yes' })
    expect(payload.recordRestrictions).toBeNull()
    expect(payload.reentryFocused).toBe(false)
    expect(payload).not.toHaveProperty('acceptsRecords')
  })
})
