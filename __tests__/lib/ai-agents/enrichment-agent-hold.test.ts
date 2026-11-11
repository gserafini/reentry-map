import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EnrichmentAgent } from '@/lib/ai-agents/enrichment-agent'

const { mockSql, mockGeocode, mockExtractWebsiteContent, mockOllamaChat, mockOllamaHealthCheck } =
  vi.hoisted(() => ({
    mockSql: vi.fn(),
    mockGeocode: vi.fn(),
    mockExtractWebsiteContent: vi.fn(),
    mockOllamaChat: vi.fn(),
    mockOllamaHealthCheck: vi.fn(),
  }))

vi.mock('@/lib/db/client', () => ({ sql: mockSql }))
vi.mock('@/lib/utils/geocoding', () => ({ geocodeAddress: mockGeocode }))
vi.mock('@/lib/utils/verification', () => ({ extractWebsiteContent: mockExtractWebsiteContent }))
vi.mock('@/lib/ai-agents/ollama-client', () => ({
  ollamaChat: mockOllamaChat,
  ollamaHealthCheck: mockOllamaHealthCheck,
  parseJsonFromOutput: (content: string) => JSON.parse(content),
}))

interface EnrichmentRow {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  description: string | null
  hours: Record<string, string> | null
  website: string | null
  services_offered: string[] | null
  status: string
  ai_enriched: boolean
}

interface EnrichmentAgentHarness {
  getResourcesNeedingEnrichment(): Promise<EnrichmentRow[]>
  enrichResource(
    resource: EnrichmentRow
  ): Promise<{ success: boolean; costCents?: number; error?: string }>
  enrichFromWebsite(websiteUrl: string): Promise<{
    hours?: string
    description?: string
    services?: string[]
    costCents?: number
  }>
}

// The class keeps these workflow steps private; this narrow adapter exposes only the seams under test.
function testHarness(agent: EnrichmentAgent): EnrichmentAgentHarness {
  return agent as unknown as EnrichmentAgentHarness
}

describe('EnrichmentAgent source-review hold', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('excludes explicitly held resources in its database selection query', async () => {
    mockSql.mockResolvedValueOnce([])
    const { EnrichmentAgent } = await import('@/lib/ai-agents/enrichment-agent')
    const agent = new EnrichmentAgent()

    await testHarness(agent).getResourcesNeedingEnrichment()

    const query = mockSql.mock.calls[0]?.[0]?.join(' ') ?? ''
    expect(query).toContain(
      "(provenance->'coverage_review'->'automation_hold') IS DISTINCT FROM 'true'::jsonb"
    )
  })

  it('does not count field updates when a hold prevents the guarded UPDATE', async () => {
    mockExtractWebsiteContent.mockResolvedValue(
      'An official provider page with enough source text to analyze.'
    )
    mockOllamaHealthCheck.mockResolvedValue({ available: true })
    mockOllamaChat.mockResolvedValue({
      content: JSON.stringify({
        hours: 'Monday-Friday 9am-5pm',
        description: 'Official service description with sufficient detail.',
        services: ['Service listed on provider page'],
      }),
    })
    mockSql.mockResolvedValue([])
    const { EnrichmentAgent } = await import('@/lib/ai-agents/enrichment-agent')
    const agent = new EnrichmentAgent()

    const result = await testHarness(agent).enrichResource({
      id: 'resource-1',
      name: 'Example provider',
      address: null,
      latitude: 1,
      longitude: 1,
      description: null,
      hours: null,
      website: 'https://example.org',
      services_offered: null,
      status: 'active',
      ai_enriched: false,
    })

    expect(result.success).toBe(false)
    expect(mockSql).toHaveBeenCalled()
    for (const [strings] of mockSql.mock.calls) {
      const query = strings.join(' ')
      expect(query).toContain(
        "(provenance->'coverage_review'->'automation_hold') IS DISTINCT FROM 'true'::jsonb"
      )
      expect(query).toContain('RETURNING id')
    }
  })

  it('returns success and marks enrichment when unheld guarded updates succeed', async () => {
    mockExtractWebsiteContent.mockResolvedValue(
      'An official provider page with enough source text to analyze.'
    )
    mockOllamaHealthCheck.mockResolvedValue({ available: true })
    mockOllamaChat.mockResolvedValue({
      content: JSON.stringify({
        hours: 'Monday-Friday 9am-5pm',
        description: 'Official service description with sufficient detail.',
        services: ['Service listed on provider page'],
      }),
    })
    mockSql.mockResolvedValue([{ id: 'resource-1' }])
    const { EnrichmentAgent } = await import('@/lib/ai-agents/enrichment-agent')
    const agent = new EnrichmentAgent()

    const result = await testHarness(agent).enrichResource({
      id: 'resource-1',
      name: 'Example provider',
      address: null,
      latitude: 1,
      longitude: 1,
      description: null,
      hours: null,
      website: 'https://example.org',
      services_offered: null,
      status: 'active',
      ai_enriched: false,
    })

    expect(result).toMatchObject({ success: true })
    expect(mockSql).toHaveBeenCalledTimes(4)
    expect(mockSql.mock.calls.at(-1)?.[0]?.join(' ')).toContain('ai_enriched = true')
    for (const [strings] of mockSql.mock.calls) {
      expect(strings.join(' ')).toContain(
        "(provenance->'coverage_review'->'automation_hold') IS DISTINCT FROM 'true'::jsonb"
      )
    }
  })

  it('returns empty data with a clear remedy when local Ollama is unavailable', async () => {
    mockExtractWebsiteContent.mockResolvedValue(
      'Official provider page text, long enough for extraction.'
    )
    mockOllamaHealthCheck.mockResolvedValue({ available: false, error: 'offline' })
    const { EnrichmentAgent } = await import('@/lib/ai-agents/enrichment-agent')
    const agent = new EnrichmentAgent()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await testHarness(agent).enrichFromWebsite('https://example.org')

    expect(result).toEqual({})
    expect(mockOllamaChat).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('retry local Ollama later; no automatic provider fallback')
    )
  })

  it('returns empty data with the same remedy when local extraction fails', async () => {
    mockExtractWebsiteContent.mockResolvedValue(
      'Official provider page text, long enough for extraction.'
    )
    mockOllamaHealthCheck.mockResolvedValue({ available: true })
    mockOllamaChat.mockRejectedValue(new Error('request timeout'))
    const { EnrichmentAgent } = await import('@/lib/ai-agents/enrichment-agent')
    const agent = new EnrichmentAgent()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await testHarness(agent).enrichFromWebsite('https://example.org')

    expect(result).toEqual({})
    expect(mockOllamaChat).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('retry local Ollama later; no automatic provider fallback')
    )
  })
})
