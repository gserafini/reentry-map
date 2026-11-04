import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const marker = 'SYNTHETIC_SQL_SECRET_SELECT_PRIVATE_TABLE'
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  failure: vi.fn(),
  duplicate: vi.fn(),
  select: vi.fn(),
}))
vi.mock('next-auth', () => ({ getServerSession: mocks.session }))
vi.mock('@/lib/auth/config', () => ({ authOptions: {} }))
vi.mock('@/lib/api/reviews', () => ({
  getResourceReviews: mocks.failure,
  getUserReview: mocks.failure,
  submitReview: mocks.failure,
  updateReview: mocks.failure,
  deleteReview: mocks.failure,
  voteReviewHelpfulness: mocks.failure,
  removeHelpfulnessVote: mocks.failure,
  getUserHelpfulnessVotes: mocks.failure,
}))
vi.mock('@/lib/api/ratings', () => ({
  getUserRating: mocks.failure,
  submitRating: mocks.failure,
  deleteRating: mocks.failure,
  getRatingStats: mocks.failure,
}))
vi.mock('@/lib/utils/deduplication', () => ({ checkForDuplicate: mocks.duplicate }))
vi.mock('@/lib/db/client', () => ({ db: { select: mocks.select } }))
vi.mock('@/lib/db/schema', () => ({ resources: { city: 'city', state: 'state', name: 'name' } }))
import * as reviews from '@/app/api/reviews/route'
import * as ratings from '@/app/api/ratings/route'
import * as helpfulness from '@/app/api/reviews/helpfulness/route'
import { GET as duplicate } from '@/app/api/resources/check-duplicate/route'
import { POST as prompt } from '@/app/api/admin/prompt-generator/route'
const request = (method: string, query = '') =>
  new NextRequest('https://reentrymap.org/api/test' + query, {
    method,
    ...(method === 'GET'
      ? {}
      : {
          body: JSON.stringify({
            resourceId: 'resource',
            reviewId: 'review',
            rating: 4,
            isHelpful: true,
            city: 'Oakland',
            state: 'CA',
            targetCount: 5,
          }),
        }),
  })
beforeEach(() => {
  vi.clearAllMocks()
  mocks.session.mockResolvedValue({ user: { id: 'session-user' } })
  mocks.failure.mockResolvedValue({
    data: null,
    error: { message: marker, detail: 'private query' },
  })
  mocks.duplicate.mockRejectedValue(new Error(marker))
  mocks.select.mockImplementation(() => {
    throw new Error(marker)
  })
})
describe('public API database error redaction', () => {
  it.each([
    ['reviews GET', reviews.GET, 'GET', '?resourceId=resource'],
    ['reviews POST', reviews.POST, 'POST', ''],
    ['reviews PATCH', reviews.PATCH, 'PATCH', ''],
    ['reviews DELETE', reviews.DELETE, 'DELETE', ''],
    ['ratings GET stats', ratings.GET, 'GET', '?resourceId=resource&statsOnly=true'],
    ['ratings POST', ratings.POST, 'POST', ''],
    ['ratings DELETE', ratings.DELETE, 'DELETE', ''],
    ['helpfulness GET', helpfulness.GET, 'GET', '?reviewIds=review'],
    ['helpfulness POST', helpfulness.POST, 'POST', ''],
    ['helpfulness DELETE', helpfulness.DELETE, 'DELETE', ''],
    ['duplicate GET', duplicate, 'GET', '?name=Help'],
    ['public prompt POST', prompt, 'POST', ''],
  ] as const)(
    '%s returns a generic 500 without database details',
    async (_name, handler, method, query) => {
      const response = await handler(request(method, query))
      expect(response.status).toBe(500)
      const text = await response.text()
      expect(text).not.toContain(marker)
      expect(text).not.toContain('private query')
      expect(JSON.parse(text).error).toEqual(expect.any(String))
    }
  )
  it('preserves validation and authentication failures without invoking persistence', async () => {
    expect((await reviews.GET(request('GET'))).status).toBe(400)
    expect((await duplicate(request('GET'))).status).toBe(400)
    mocks.session.mockResolvedValue(null)
    expect((await reviews.POST(request('POST'))).status).toBe(401)
    expect((await ratings.POST(request('POST'))).status).toBe(401)
    expect((await helpfulness.POST(request('POST'))).status).toBe(401)
    expect(mocks.failure).not.toHaveBeenCalled()
  })
  it('keeps the authenticated user as the update/delete ownership argument', async () => {
    await reviews.PATCH(request('PATCH'))
    expect(mocks.failure).toHaveBeenLastCalledWith('review', 'session-user', expect.any(Object))
    await reviews.DELETE(request('DELETE'))
    expect(mocks.failure).toHaveBeenLastCalledWith('review', 'session-user')
  })
})
