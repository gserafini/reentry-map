import { beforeEach, describe, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({
  checkAdminAuth: vi.fn(),
  dbSelect: vi.fn(),
  dbUpdate: vi.fn(),
  eq: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
}))

vi.mock('@/lib/utils/admin-auth', () => ({ checkAdminAuth: fixture.checkAdminAuth }))
vi.mock('@/lib/db/client', () => ({
  db: { select: fixture.dbSelect, update: fixture.dbUpdate },
}))
vi.mock('@/lib/db/schema', () => ({ resources: { id: 'resources.id' } }))
vi.mock('drizzle-orm', () => ({ eq: fixture.eq }))

const resourceId = '11111111-1111-4111-8111-111111111111'
const verificationSource = 'https://provider.example/current-intake'
const verificationNotes = 'Confirmed phone and intake hours on the current provider page.'

async function sendPatch(body) {
  const { PATCH } = await import('../../app/api/admin/resources/[id]/update/route.ts')
  return PATCH(
    new Request(`https://reentrymap.org/api/admin/resources/${resourceId}/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: resourceId }) }
  )
}

function prepareDatabase(resource) {
  fixture.limit.mockResolvedValue([resource])
  fixture.where.mockResolvedValue(undefined)
  const limit = fixture.limit
  const where = fixture.where
  const set = fixture.set

  fixture.dbSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ limit }),
    }),
  })
  fixture.dbUpdate.mockReturnValue({
    set: vi.fn((payload) => {
      set(payload)
      return { where }
    }),
  })
}

describe('admin resource update verification notes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    fixture.checkAdminAuth.mockResolvedValue({ isAuthorized: true, userId: 'admin-user' })
    fixture.eq.mockImplementation((column, value) => ({ column, value }))
    fixture.limit.mockReset()
    fixture.where.mockReset()
    fixture.set.mockReset()
    fixture.dbSelect.mockReset()
    fixture.dbUpdate.mockReset()
  })

  it('persists the required verification note when no correction note exists', async () => {
    prepareDatabase({ id: resourceId, correctionNotes: null })

    const response = await sendPatch({
      updates: { phone: '555-0100' },
      verification_source: verificationSource,
      verification_notes: verificationNotes,
    })

    expect(response.status).toBe(200)
    expect(fixture.set).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '555-0100',
        correctionNotes: verificationNotes,
        verificationSource,
        verifiedBy: 'admin-user',
      })
    )
  })

  it('appends verification notes as a new paragraph and retains prior correction notes', async () => {
    prepareDatabase({ id: resourceId, correctionNotes: 'Prior verified correction.' })

    const response = await sendPatch({
      updates: { phone: '555-0100' },
      verification_source: verificationSource,
      verification_notes: verificationNotes,
    })

    expect(response.status).toBe(200)
    expect(fixture.set).toHaveBeenCalledWith(
      expect.objectContaining({
        correctionNotes: `Prior verified correction.\n\nVerification update: ${verificationNotes}`,
      })
    )
  })

  it('preserves a caller-supplied nonempty correctionNotes value', async () => {
    prepareDatabase({ id: resourceId, correctionNotes: 'Prior note.' })

    const response = await sendPatch({
      updates: { correctionNotes: 'Caller-authored complete correction note.' },
      verification_source: verificationSource,
      verification_notes: verificationNotes,
    })

    expect(response.status).toBe(200)
    expect(fixture.set).toHaveBeenCalledWith(
      expect.objectContaining({
        correctionNotes: 'Caller-authored complete correction note.',
      })
    )
  })

  it.each([undefined, null, 123, {}, '   '])(
    'rejects malformed or blank verification notes (%s) before reading the resource',
    async (notes) => {
      const body = {
        updates: { phone: '555-0100' },
        verification_source: verificationSource,
      }
      if (notes !== undefined) body.verification_notes = notes

      const response = await sendPatch(body)

      expect(response.status).toBe(400)
      expect(fixture.dbSelect).not.toHaveBeenCalled()
      expect(fixture.dbUpdate).not.toHaveBeenCalled()
    }
  )
})
