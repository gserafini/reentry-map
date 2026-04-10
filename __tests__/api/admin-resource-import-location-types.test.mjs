import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('admin resource import location types', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('passes address_type and service_area through admin imports for regional resources', async () => {
    const returning = vi.fn().mockResolvedValue([
      {
        id: 'resource-1',
        name: 'Texas 211',
        address: '',
        city: 'Lubbock',
        state: 'TX',
        latitude: null,
        longitude: null,
        addressType: 'regional',
      },
    ])
    const values = vi.fn().mockReturnValue({ returning })

    const db = {
      insert: vi.fn().mockReturnValue({ values }),
      update: vi.fn(),
    }

    vi.doMock('@/lib/utils/admin-auth', () => ({
      checkAdminAuth: vi.fn().mockResolvedValue({ isAuthorized: true, authMethod: 'api_key' }),
    }))
    vi.doMock('@/lib/db/client', () => ({ db }))
    vi.doMock('@/lib/utils/deduplication', () => ({
      checkForDuplicate: vi.fn().mockResolvedValue({ isDuplicate: false }),
      detectParentChildRelationships: vi.fn().mockResolvedValue(new Map()),
    }))

    const { POST } = await import('../../app/api/admin/resources/import/route.ts')

    const response = await POST(
      new Request('https://reentrymap.org/api/admin/resources/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resources: [
            {
              name: 'Texas 211',
              city: 'Lubbock',
              state: 'TX',
              primary_category: 'general-support',
              website: 'https://www.211texas.org/',
              address_type: 'regional',
              service_area: { type: 'statewide', values: ['Texas'] },
            },
          ],
        }),
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.stats.created).toBe(1)
    expect(values).toHaveBeenCalledOnce()
    expect(values.mock.calls[0][0]).toMatchObject({
      addressType: 'regional',
      serviceArea: { type: 'statewide', values: ['Texas'] },
      address: '',
    })
  })
})
