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

    const where = vi.fn().mockResolvedValue(undefined)
    const set = vi.fn().mockReturnValue({ where })
    const db = {
      insert: vi.fn().mockReturnValue({ values }),
      update: vi.fn().mockReturnValue({ set }),
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          status: 'OK',
          results: [
            {
              formatted_address: 'Lubbock, TX, USA',
              geometry: { location: { lat: 33.5779, lng: -101.8552 } },
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
    expect(body.stats.geocoded).toBe(1)
    expect(values).toHaveBeenCalledOnce()
    expect(values.mock.calls[0][0]).toMatchObject({
      addressType: 'regional',
      serviceArea: { type: 'statewide', values: ['Texas'] },
      address: '',
    })
    expect(db.update).toHaveBeenCalledOnce()
    expect(set).toHaveBeenCalledWith({
      latitude: 33.5779,
      longitude: -101.8552,
      formattedAddress: 'Lubbock, TX, USA',
    })
  })

  it('creates same-name non-physical siblings without creating a synthetic parent row', async () => {
    const insertedPayloads = []

    const db = {
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn((payload) => {
          insertedPayloads.push(payload)
          return {
            returning: vi.fn().mockResolvedValue([
              {
                id: `resource-${insertedPayloads.length}`,
                ...payload,
              },
            ]),
          }
        }),
      })),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }

    vi.doMock('@/lib/utils/admin-auth', () => ({
      checkAdminAuth: vi.fn().mockResolvedValue({ isAuthorized: true, authMethod: 'api_key' }),
    }))
    vi.doMock('@/lib/db/client', () => ({ db }))
    vi.doMock('@/lib/utils/deduplication', async (importOriginal) => {
      const actual = await importOriginal()
      return {
        ...actual,
        checkForDuplicate: vi.fn().mockResolvedValue({ isDuplicate: false }),
        detectParentChildRelationships: vi.fn().mockResolvedValue(
          new Map([
            [
              'Reconnect 180',
              [
                { name: 'Reconnect 180', city: 'Reno' },
                { name: 'Reconnect 180', city: 'Las Vegas' },
              ],
            ],
          ])
        ),
      }
    })

    const { POST } = await import('../../app/api/admin/resources/import/route.ts')

    const response = await POST(
      new Request('https://reentrymap.org/api/admin/resources/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resources: [
            {
              name: 'Reconnect 180',
              city: 'Reno',
              state: 'NV',
              primary_category: 'general-support',
              address_type: 'regional',
              service_area: { type: 'city', values: ['Reno'] },
              latitude: 39.5296,
              longitude: -119.8138,
            },
            {
              name: 'Reconnect 180',
              city: 'Las Vegas',
              state: 'NV',
              primary_category: 'general-support',
              address_type: 'regional',
              service_area: { type: 'city', values: ['Las Vegas'] },
              latitude: 36.1699,
              longitude: -115.1398,
            },
          ],
        }),
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.stats.created).toBe(2)
    expect(insertedPayloads).toHaveLength(2)
    expect(insertedPayloads.every((payload) => payload.name === 'Reconnect 180')).toBe(true)
    expect(insertedPayloads.every((payload) => payload.orgName === 'Reconnect 180')).toBe(true)
    expect(insertedPayloads.some((payload) => payload.isParent === true)).toBe(false)
  })
})
