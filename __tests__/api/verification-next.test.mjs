import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('verification next route', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('prioritizes weak physical addresses for verification review', async () => {
    const limit = vi.fn().mockResolvedValue([
      {
        id: 'suggestion-standard',
        name: 'Standard Suggestion',
        address: '123 Main St',
        city: 'Denver',
        state: 'CO',
        zip: '80202',
        phone: '303-555-1234',
        email: 'info@example.org',
        website: 'https://example.org',
        description: 'Normal pending suggestion',
        category: 'housing',
        servicesOffered: ['Housing assistance'],
        hours: { monday: '9-5' },
        eligibilityRequirements: null,
        discoveredVia: 'websearch',
        discoveryNotes: 'Found on official website',
        researchTaskId: null,
        createdAt: '2026-04-20T18:00:00.000Z',
        taskCounty: null,
        taskState: null,
        taskCategory: null,
      },
      {
        id: 'suggestion-weak-address',
        name: 'Weak Address Suggestion',
        address: 'San Diego, CA',
        city: 'San Diego',
        state: 'CA',
        zip: null,
        phone: '619-555-1234',
        email: 'help@example.org',
        website: 'https://example.org/contact',
        description: 'Pending suggestion with weak physical address',
        category: 'housing',
        servicesOffered: ['Case management'],
        hours: { monday: '9-5' },
        eligibilityRequirements: null,
        discoveredVia: 'websearch',
        discoveryNotes: 'Found on official website',
        researchTaskId: null,
        createdAt: '2026-04-20T19:00:00.000Z',
        taskCounty: null,
        taskState: null,
        taskCategory: null,
      },
    ])
    const orderBy = vi.fn().mockReturnValue({ limit })
    const where = vi.fn().mockReturnValue({ orderBy })
    const leftJoin = vi.fn().mockReturnValue({ where })
    const from = vi.fn().mockReturnValue({ leftJoin })
    const select = vi.fn().mockReturnValue({ from })

    vi.doMock('@/lib/utils/admin-auth', () => ({
      checkAdminAuth: vi.fn().mockResolvedValue({ isAuthorized: true, authMethod: 'api_key' }),
    }))
    vi.doMock('@/lib/db/client', () => ({
      db: { select },
    }))
    vi.doMock('@/lib/db/schema', () => ({
      resourceSuggestions: {
        id: 'resource_suggestions.id',
        name: 'resource_suggestions.name',
        address: 'resource_suggestions.address',
        city: 'resource_suggestions.city',
        state: 'resource_suggestions.state',
        zip: 'resource_suggestions.zip',
        phone: 'resource_suggestions.phone',
        email: 'resource_suggestions.email',
        website: 'resource_suggestions.website',
        description: 'resource_suggestions.description',
        category: 'resource_suggestions.category',
        servicesOffered: 'resource_suggestions.services_offered',
        hours: 'resource_suggestions.hours',
        eligibilityRequirements: 'resource_suggestions.eligibility_requirements',
        discoveredVia: 'resource_suggestions.discovered_via',
        discoveryNotes: 'resource_suggestions.discovery_notes',
        researchTaskId: 'resource_suggestions.research_task_id',
        createdAt: 'resource_suggestions.created_at',
        status: 'resource_suggestions.status',
        addressType: 'resource_suggestions.address_type',
      },
      researchTasks: {
        id: 'research_tasks.id',
        county: 'research_tasks.county',
        state: 'research_tasks.state',
        category: 'research_tasks.category',
      },
    }))
    vi.doMock('drizzle-orm', () => ({
      eq: vi.fn((left, right) => ({ left, right })),
      asc: vi.fn((value) => value),
    }))

    const { GET } = await import('../../app/api/verification/next/route.ts')

    const response = await GET(
      new Request('https://reentrymap.org/api/verification/next', {
        headers: { 'x-admin-api-key': 'test-key' },
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.suggestion_id).toBe('suggestion-weak-address')
    expect(body.priority.reason).toContain('street-level address')
    expect(body.instructions).toContain('address')
  })
})
