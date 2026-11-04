// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const { session, add, get, remove } = vi.hoisted(() => ({
  session: vi.fn(),
  add: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('next-auth', () => ({ getServerSession: session }))
vi.mock('@/lib/auth/config', () => ({ authOptions: {} }))
vi.mock('@/lib/api/favorites', () => ({
  addFavorite: add,
  getUserFavorites: get,
  removeFavorite: remove,
}))
import { GET, POST, DELETE } from '@/app/api/favorites/route'
beforeEach(() => {
  vi.clearAllMocks()
  session.mockResolvedValue({ user: { id: 'synthetic' } })
})
const request = () =>
  new NextRequest('https://example.test/api/favorites', {
    method: 'POST',
    body: JSON.stringify({ resourceId: 'resource' }),
  })
it('reports an unavailable resource as a normal not-found response', async () => {
  add.mockResolvedValue({ data: null, error: new Error('Resource is unavailable') })
  expect((await POST(request())).status).toBe(404)
})
it.each(['GET', 'POST', 'DELETE'])(
  'does not expose internal persistence errors on %s',
  async (method) => {
    const error = { data: null, error: new Error('internal-table-fixture-error') }
    add.mockResolvedValue(error)
    get.mockResolvedValue(error)
    remove.mockResolvedValue(error)
    const response = await { GET, POST, DELETE }[method](request())
    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('internal-table-fixture-error')
  }
)
