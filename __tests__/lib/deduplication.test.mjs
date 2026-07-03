import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('deduplication utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('does not treat same-name non-physical resources with different coverage as duplicates', async () => {
    const sql = vi.fn().mockResolvedValue([
      {
        id: 'resource-1',
        name: 'Reconnect 180',
        org_name: 'Reconnect 180',
        city: 'Reno',
        state: 'NV',
        address_type: 'regional',
        service_area: { type: 'city', values: ['Reno'] },
        status: 'active',
      },
    ])

    vi.doMock('@/lib/db/client', () => ({ sql }))

    const { checkForDuplicate } = await import('../../lib/utils/deduplication.ts')

    const result = await checkForDuplicate({
      name: 'Reconnect 180',
      address: '',
      city: 'Reno',
      state: 'NV',
      addressType: 'regional',
      serviceArea: { type: 'statewide', values: ['Nevada'] },
    })

    expect(result.isDuplicate).toBe(false)
  })
})
