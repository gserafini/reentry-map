import { describe, expect, it, vi } from 'vitest'

function makeSelectChain(result, includeOrderBy = true) {
  const whereResult = includeOrderBy
    ? {
        orderBy: vi.fn().mockResolvedValue(result),
      }
    : Promise.resolve(result)

  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(whereResult),
    }),
  }
}

describe('admin prompt generator', () => {
  it('includes strong data-quality requirements for contact info and addresses', async () => {
    vi.resetModules()

    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          makeSelectChain(
            [
              {
                name: 'Existing Resource',
                address: '100 Existing St',
                city: 'Lubbock',
                state: 'TX',
                zip: '79401',
                primaryCategory: 'housing',
              },
            ],
            true
          )
        )
        .mockReturnValueOnce(makeSelectChain([{ value: 1 }], false)),
    }

    vi.doMock('@/lib/db/client', () => ({ db }))

    const { POST } = await import('../../app/api/admin/prompt-generator/route.ts')

    const request = new Request('https://reentrymap.org/api/admin/prompt-generator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: 'Lubbock',
        state: 'TX',
        targetCount: 10,
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(body.prompt).toContain('Email is required effort')
    expect(body.prompt).toContain('No vague addresses')
    expect(body.prompt).toContain('No PO Box-only entries')
    expect(body.prompt).toContain('complete contact info (name, address, phone, website, email)')
    expect(body.prompt).toContain('2-3 thorough sentences')
  })
})
