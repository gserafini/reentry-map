import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('research intake coverage-aware deduplication', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('allows same-name non-physical resources when coverage differs', async () => {
    const insertReturning = vi.fn().mockResolvedValue([{ id: 'resource-coverage-1' }])
    const insertValues = vi.fn().mockReturnValue({ returning: insertReturning })
    const updateWhere = vi.fn().mockResolvedValue(undefined)
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere })
    const selectLimit = vi.fn().mockResolvedValue([
      {
        id: 'priority-1',
        city: 'Reno',
        state: 'NV',
        county: 'Washoe',
        currentResourceCount: 5,
        targetResourceCount: 8,
        researchStatus: 'researching',
      },
    ])
    const selectWhere = vi.fn().mockReturnValue({ limit: selectLimit })
    const selectFrom = vi.fn().mockReturnValue({ where: selectWhere })

    const sql = vi.fn((strings) => {
      const query = String.raw({ raw: strings }, '').toLowerCase()

      if (query.includes('select count(*)')) {
        return Promise.resolve([{ count: 6 }])
      }

      if (query.includes('select id, name, primary_category from resources')) {
        return Promise.resolve([
          {
            id: 'existing-nonphysical-1',
            name: 'Reconnect 180',
            primary_category: 'general-support',
          },
        ])
      }

      return Promise.resolve([])
    })

    const db = {
      select: vi.fn().mockReturnValue({ from: selectFrom }),
      insert: vi.fn().mockReturnValue({ values: insertValues }),
      update: vi.fn().mockReturnValue({ set: updateSet }),
    }

    vi.doMock('@/lib/utils/admin-auth', () => ({
      checkAdminAuth: vi.fn().mockResolvedValue({ isAuthorized: true, authMethod: 'api_key' }),
    }))
    vi.doMock('@/lib/db/client', () => ({ db, sql }))
    vi.doMock('@/lib/db/schema', () => ({
      expansionPriorities: { id: 'expansion_priorities.id' },
      resources: {},
    }))
    const checkForDuplicate = vi.fn().mockResolvedValue({ isDuplicate: false })

    vi.doMock('@/lib/utils/deduplication', async (importOriginal) => {
      const actual = await importOriginal()
      return {
        ...actual,
        checkForDuplicate,
      }
    })
    vi.doMock('drizzle-orm', () => ({
      eq: vi.fn((left, right) => ({ left, right })),
    }))

    const { POST } = await import('../../app/api/research/submit-candidate/route.ts')

    const response = await POST(
      new Request('https://reentrymap.org/api/research/submit-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-api-key': 'test-key' },
        body: JSON.stringify({
          task_id: 'priority-1',
          name: 'Reconnect 180',
          city: 'Reno',
          state: 'NV',
          website: 'https://www.reconnect180.org/',
          category: 'general_support',
          address_type: 'regional',
          service_area: { type: 'statewide', values: ['Nevada'] },
          discovered_via: 'websearch',
          discovery_notes:
            'Confirmed statewide hotline coverage for Nevada from the organization website.',
        }),
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.resource_id).toBe('resource-coverage-1')
    expect(checkForDuplicate).toHaveBeenCalledOnce()
    expect(checkForDuplicate).toHaveBeenCalledWith({
      name: 'Reconnect 180',
      address: '',
      city: 'Reno',
      state: 'NV',
      zip: null,
      addressType: 'regional',
      serviceArea: { type: 'statewide', values: ['Nevada'] },
    })
    expect(insertValues).toHaveBeenCalledOnce()
    expect(insertValues.mock.calls[0][0]).toMatchObject({
      name: 'Reconnect 180',
      city: 'Reno',
      state: 'NV',
      addressType: 'regional',
      serviceArea: { type: 'statewide', values: ['Nevada'] },
    })
  })
})
