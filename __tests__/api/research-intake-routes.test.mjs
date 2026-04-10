import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('research intake routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('publishes trusted candidates directly to resources with pending verification', async () => {
    const insertReturning = vi.fn().mockResolvedValue([{ id: 'resource-1' }])
    const insertValues = vi.fn().mockReturnValue({ returning: insertReturning })
    const updateWhere = vi.fn().mockResolvedValue(undefined)
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere })
    const selectLimit = vi.fn().mockResolvedValue([
      {
        id: 'priority-1',
        city: 'Lubbock',
        state: 'TX',
        county: 'Lubbock',
        currentResourceCount: 5,
        targetResourceCount: 8,
        researchStatus: 'researching',
      },
    ])
    const selectWhere = vi.fn().mockReturnValue({ limit: selectLimit })
    const selectFrom = vi.fn().mockReturnValue({ where: selectWhere })
    const sql = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 6 }])

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
    vi.doMock('@/lib/utils/deduplication', () => ({
      checkForDuplicate: vi.fn().mockResolvedValue({ isDuplicate: false }),
    }))
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
          name: 'Texas 211',
          city: 'Lubbock',
          state: 'TX',
          website: 'https://www.211texas.org/',
          category: 'general_support',
          address_type: 'regional',
          service_area: { type: 'statewide', values: ['Texas'] },
          discovered_via: 'websearch',
          discovery_notes:
            'Found via search for Lubbock Texas reentry support and confirmed statewide hotline coverage.',
        }),
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.resource_id).toBe('resource-1')
    expect(body.task_progress).toMatchObject({
      found: 6,
      target: 8,
      remaining: 2,
      task_complete: false,
    })

    expect(insertValues).toHaveBeenCalledOnce()
    expect(insertValues.mock.calls[0][0]).toMatchObject({
      name: 'Texas 211',
      city: 'Lubbock',
      state: 'TX',
      county: 'Lubbock',
      primaryCategory: 'general-support',
      addressType: 'regional',
      serviceArea: { type: 'statewide', values: ['Texas'] },
      status: 'active',
      source: 'trusted_research_intake',
      verificationStatus: 'pending',
      verified: false,
      humanReviewRequired: false,
      provenance: expect.objectContaining({
        intake_method: 'trusted_agent_intake',
        expansion_priority_id: 'priority-1',
        discovered_via: 'websearch',
      }),
    })
  })

  it('returns the trusted submit URL plus existing and already-submitted resources for the active target', async () => {
    const sql = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'priority-1',
          city: 'Lubbock',
          state: 'TX',
          priority_score: 987,
          target_resource_count: 10,
          current_resource_count: 4,
          priority_categories: ['housing', 'employment'],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'existing-1',
          name: 'Lubbock Workforce Center',
          primary_category: 'employment',
          address_type: 'physical',
          verification_status: 'verified',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'submitted-1',
          name: 'Texas 211',
          primary_category: 'general_support',
          verification_status: 'pending',
          created_at: '2026-04-09T22:00:00.000Z',
        },
      ])

    vi.doMock('@/lib/utils/admin-auth', () => ({
      checkAdminAuth: vi.fn().mockResolvedValue({ isAuthorized: true, authMethod: 'api_key' }),
    }))
    vi.doMock('@/lib/db/client', () => ({ sql }))

    const { GET } = await import('../../app/api/research/next/route.ts')

    const response = await GET(
      new Request('https://reentrymap.org/api/research/next', {
        headers: { 'x-admin-api-key': 'test-key' },
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.task_id).toBe('priority-1')
    expect(body.submit_url).toBe('/api/research/submit-candidate')
    expect(body.existing_resources).toEqual([
      expect.objectContaining({
        id: 'existing-1',
        name: 'Lubbock Workforce Center',
      }),
    ])
    expect(body.submitted_this_task).toEqual([
      expect.objectContaining({
        id: 'submitted-1',
        name: 'Texas 211',
        verification_status: 'pending',
      }),
    ])
  })
})
