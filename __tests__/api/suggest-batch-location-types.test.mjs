import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('suggest-batch location types', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('accepts regional resources without a street address when service_area is provided', async () => {
    const sqlCalls = []
    const sql = vi.fn(async (strings, ...values) => {
      sqlCalls.push({ text: strings.join('<?>'), values })

      if (sqlCalls.length === 1) return []
      if (sqlCalls.length === 2) return []
      if (sqlCalls.length === 3) return [{ id: 'suggestion-1' }]

      throw new Error(`Unexpected SQL call ${sqlCalls.length}`)
    })

    vi.doMock('@/lib/db/client', () => ({ sql }))
    vi.doMock('@/lib/api/settings', () => ({
      getAISystemStatus: vi.fn().mockResolvedValue({ isVerificationActive: false }),
    }))
    vi.doMock('@/lib/ai-agents/verification-agent', () => ({
      VerificationAgent: vi.fn(),
    }))

    const { POST } = await import('../../app/api/resources/suggest-batch/route.ts')

    const response = await POST(
      new Request('https://reentrymap.org/api/resources/suggest-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resources: [
            {
              name: 'Texas 211',
              city: 'Lubbock',
              state: 'TX',
              website: 'https://www.211texas.org/',
              primary_category: 'general-support',
              address_type: 'regional',
              service_area: { type: 'statewide', values: ['Texas'] },
            },
          ],
        }),
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.stats.submitted).toBe(1)
    expect(body.stats.errors).toBe(0)

    const insertCall = sqlCalls[2]
    expect(insertCall.values).toContain('regional')
    expect(insertCall.values).toContain('{"type":"statewide","values":["Texas"]}')
  })

  it('still rejects physical resources that omit a street address', async () => {
    const sql = vi.fn()

    vi.doMock('@/lib/db/client', () => ({ sql }))
    vi.doMock('@/lib/api/settings', () => ({
      getAISystemStatus: vi.fn().mockResolvedValue({ isVerificationActive: false }),
    }))
    vi.doMock('@/lib/ai-agents/verification-agent', () => ({
      VerificationAgent: vi.fn(),
    }))

    const { POST } = await import('../../app/api/resources/suggest-batch/route.ts')

    const response = await POST(
      new Request('https://reentrymap.org/api/resources/suggest-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resources: [
            {
              name: 'Missing Address Org',
              city: 'Lubbock',
              state: 'TX',
              primary_category: 'housing',
              address_type: 'physical',
            },
          ],
        }),
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.stats.submitted).toBe(0)
    expect(body.stats.errors).toBe(1)
    expect(sql).not.toHaveBeenCalled()
  })
})
