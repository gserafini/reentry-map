import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('verification log human review helper', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('marks the latest verification log as human reviewed when present', async () => {
    const updateWhere = vi.fn().mockResolvedValue(undefined)
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere })
    const update = vi.fn().mockReturnValue({ set: updateSet })
    const limit = vi.fn().mockResolvedValue([{ id: 'log-1' }])
    const orderBy = vi.fn().mockReturnValue({ limit })
    const where = vi.fn().mockReturnValue({ orderBy })
    const from = vi.fn().mockReturnValue({ where })
    const select = vi.fn().mockReturnValue({ from })

    vi.doMock('@/lib/db/client', () => ({
      db: { select, update },
    }))
    vi.doMock('@/lib/db/schema', () => ({
      verificationLogs: {
        id: 'verification_logs.id',
        suggestionId: 'verification_logs.suggestion_id',
        createdAt: 'verification_logs.created_at',
      },
    }))
    vi.doMock('drizzle-orm', () => ({
      desc: vi.fn((value) => value),
      eq: vi.fn((left, right) => ({ left, right })),
    }))

    const { markVerificationLogHumanReview } =
      await import('../../lib/utils/verification-log-human-review.ts')

    const result = await markVerificationLogHumanReview({
      suggestionId: 'suggestion-1',
      reviewerId: 'user-1',
      decision: 'approved',
      notes: 'Verified via official site',
    })

    expect(result).toBe(true)
    expect(updateSet).toHaveBeenCalledWith({
      humanReviewed: true,
      humanReviewerId: 'user-1',
      humanDecision: 'approved',
      humanNotes: 'Verified via official site',
    })
    expect(updateWhere).toHaveBeenCalledOnce()
  })

  it('returns false when no verification log exists for the suggestion', async () => {
    const update = vi.fn()
    const limit = vi.fn().mockResolvedValue([])
    const orderBy = vi.fn().mockReturnValue({ limit })
    const where = vi.fn().mockReturnValue({ orderBy })
    const from = vi.fn().mockReturnValue({ where })
    const select = vi.fn().mockReturnValue({ from })

    vi.doMock('@/lib/db/client', () => ({
      db: { select, update },
    }))
    vi.doMock('@/lib/db/schema', () => ({
      verificationLogs: {
        id: 'verification_logs.id',
        suggestionId: 'verification_logs.suggestion_id',
        createdAt: 'verification_logs.created_at',
      },
    }))
    vi.doMock('drizzle-orm', () => ({
      desc: vi.fn((value) => value),
      eq: vi.fn((left, right) => ({ left, right })),
    }))

    const { markVerificationLogHumanReview } =
      await import('../../lib/utils/verification-log-human-review.ts')

    const result = await markVerificationLogHumanReview({
      suggestionId: 'missing-log',
      decision: 'approved',
    })

    expect(result).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })

  it('does not throw when the human review update fails', async () => {
    const updateWhere = vi.fn().mockRejectedValue(new Error('column does not exist'))
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere })
    const update = vi.fn().mockReturnValue({ set: updateSet })
    const limit = vi.fn().mockResolvedValue([{ id: 'log-1' }])
    const orderBy = vi.fn().mockReturnValue({ limit })
    const where = vi.fn().mockReturnValue({ orderBy })
    const from = vi.fn().mockReturnValue({ where })
    const select = vi.fn().mockReturnValue({ from })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    vi.doMock('@/lib/db/client', () => ({
      db: { select, update },
    }))
    vi.doMock('@/lib/db/schema', () => ({
      verificationLogs: {
        id: 'verification_logs.id',
        suggestionId: 'verification_logs.suggestion_id',
        createdAt: 'verification_logs.created_at',
      },
    }))
    vi.doMock('drizzle-orm', () => ({
      desc: vi.fn((value) => value),
      eq: vi.fn((left, right) => ({ left, right })),
    }))

    const { markVerificationLogHumanReview } =
      await import('../../lib/utils/verification-log-human-review.ts')

    const result = await markVerificationLogHumanReview({
      suggestionId: 'suggestion-1',
      decision: 'approved_with_corrections',
    })

    expect(result).toBe(false)
    expect(warn).toHaveBeenCalled()
  })
})
