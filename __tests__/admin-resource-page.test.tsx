import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditResourcePage from '@/app/admin/resources/[id]/page'
import { sql } from '@/lib/db/client'
import { notFound } from 'next/navigation'

vi.mock('@/app/admin/resources/[id]/EditResourceClient', () => ({
  EditResourceClient: () => null,
}))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

describe('admin resource page route parameters', () => {
  beforeEach(() => vi.clearAllMocks())

  it('awaits route parameters before querying the selected resource', async () => {
    const resource = { id: '11111111-1111-1111-1111-111111111111', name: 'Resource' }
    vi.mocked(sql).mockResolvedValueOnce([resource])

    const result = await EditResourcePage({ params: Promise.resolve({ id: resource.id }) })

    expect(sql).toHaveBeenCalledWith(expect.any(Array), resource.id)
    expect(result.props.resource).toEqual(resource)
  })

  it('retains the not-found response when the selected resource is missing', async () => {
    vi.mocked(sql).mockResolvedValueOnce([])

    await expect(
      EditResourcePage({ params: Promise.resolve({ id: 'missing-resource' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalledOnce()
  })
})
