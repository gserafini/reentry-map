import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSql, MockOpenAI } = vi.hoisted(() => ({
  mockSql: vi.fn(),
  MockOpenAI: class {
    chat = {
      completions: {
        create: vi.fn(),
      },
    }
  },
}))

vi.mock('@/lib/db/client', () => ({
  sql: mockSql,
}))

vi.mock('@/lib/env', () => ({
  env: {
    OPENAI_API_KEY: 'test-openai-key',
  },
}))

vi.mock('openai', () => ({
  default: MockOpenAI,
}))

describe('BaseAgent logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('writes agent lifecycle logs using the current ai_agent_logs schema', async () => {
    mockSql.mockResolvedValueOnce([{ id: 'log-123' }]).mockResolvedValueOnce([])

    const { BaseAgent } = await import('@/lib/ai-agents/base-agent')

    class TestAgent extends BaseAgent {
      constructor() {
        super('discovery')
      }

      async run(): Promise<void> {}

      async start(): Promise<string> {
        return await this.startLog()
      }

      async finish(): Promise<void> {
        await this.updateLog({
          status: 'success',
          resources_processed: 3,
          resources_added: 2,
          resources_updated: 1,
          cost_cents: 17,
          metadata: {
            source: 'unit-test',
          },
        })
      }
    }

    const agent = new TestAgent()
    await agent.start()
    await agent.finish()

    expect(mockSql).toHaveBeenCalledTimes(2)

    const startSql = mockSql.mock.calls[0]?.[0]?.join(' ') ?? ''
    expect(startSql).toContain('INSERT INTO ai_agent_logs')
    expect(startSql).toContain('agent_type')
    expect(startSql).toContain('action')
    expect(startSql).toContain('success')
    expect(startSql).not.toContain('status')
    expect(startSql).not.toContain('resources_processed')
    expect(startSql).not.toContain('resources_added')
    expect(startSql).not.toContain('resources_updated')

    const updateSql = mockSql.mock.calls[1]?.[0]?.join(' ') ?? ''
    expect(updateSql).toContain('UPDATE ai_agent_logs SET')
    expect(updateSql).toContain('success =')
    expect(updateSql).toContain('output =')
    expect(updateSql).toContain('cost =')
    expect(updateSql).toContain('duration_ms =')
    expect(updateSql).not.toContain('status')
    expect(updateSql).not.toContain('resources_processed')
    expect(updateSql).not.toContain('resources_added')
    expect(updateSql).not.toContain('resources_updated')
  })
})
