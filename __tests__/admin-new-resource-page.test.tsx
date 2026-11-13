import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NewResourcePage from '@/app/admin/resources/new/page'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))
vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'admin-1' }, isLoading: false, isAuthenticated: true }),
}))
vi.mock('@/lib/utils/admin', () => ({ checkCurrentUserIsAdmin: vi.fn().mockResolvedValue(true) }))
vi.mock('@/lib/utils/geocoding', () => ({ geocodeAddress: vi.fn() }))

describe('admin quick-add resource page', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: { id: 'new-1' } }) })
    vi.stubGlobal('fetch', fetchMock)
  })

  async function fillRequired() {
    render(<NewResourcePage />)
    fireEvent.change(await screen.findByLabelText(/Resource Name/i), {
      target: { value: 'Hope House' },
    })
    fireEvent.change(screen.getByLabelText(/^Address/i), {
      target: { value: '1 Main St, Pueblo, CO' },
    })
  }

  function sentBody() {
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/admin/resources')
    return JSON.parse(init.body)
  }

  it('creates listings in the stored category format with record fields left unset', async () => {
    await fillRequired()
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(sentBody()).toMatchObject({
      primary_category: 'general-support',
      record_restrictions: null,
      reentry_focused: false,
    })
  })

  it('sends record restrictions and the reentry label', async () => {
    await fillRequired()
    fireEvent.change(screen.getByLabelText(/Record-related restrictions/i), {
      target: { value: '  The provider’s website says: “No arson convictions.”  ' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: /Built for people with records/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(sentBody()).toMatchObject({
      record_restrictions: 'The provider’s website says: “No arson convictions.”',
      reentry_focused: true,
    })
  })
})
