import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EditResourcePage from '@/app/admin/resources/[id]/edit/page'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useParams: () => ({ id: 'r-1' }),
}))
vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'admin-1' }, isLoading: false, isAuthenticated: true }),
}))
vi.mock('@/lib/utils/admin', () => ({ checkCurrentUserIsAdmin: vi.fn().mockResolvedValue(true) }))
vi.mock('@/lib/utils/geocoding', () => ({ geocodeAddress: vi.fn() }))

// GET /api/admin/resources/[id] returns the Drizzle row (camelCase keys).
const stored = {
  id: 'r-1',
  name: 'Hope House',
  primaryCategory: 'housing',
  address: '1 Main St',
  city: 'Pueblo',
  state: 'CO',
  zip: '81003',
  phone: '7195550100',
  description: 'Transitional housing.',
  website: 'https://hope.example/',
  hours: { monday: '9:00 AM - 5:00 PM' },
  email: null,
  servicesOffered: ['Shelter', 'Meals'],
  verified: false,
  status: 'active',
  latitude: 38.27,
  longitude: -104.61,
  recordRestrictions: 'The provider’s website says: “No arson convictions.”',
  reentryFocused: false,
}

describe('admin edit resource page', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock = vi.fn((url: string, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'PUT'
          ? { ok: true, json: async () => ({ data: stored }) }
          : { ok: true, json: async () => ({ data: stored }) }
      )
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  async function open() {
    render(<EditResourcePage />)
    await waitFor(() => expect(screen.getByLabelText(/Resource Name/i)).toHaveValue('Hope House'))
  }

  function putBody() {
    const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(call?.[0]).toBe('/api/admin/resources/r-1')
    return JSON.parse(call?.[1]?.body as string)
  }

  it('loads the record fields', async () => {
    await open()
    expect(screen.getByLabelText(/Record-related restrictions/i)).toHaveValue(
      'The provider’s website says: “No arson convictions.”'
    )
    expect(
      screen.getByRole('checkbox', { name: /Built for people with records/i })
    ).not.toBeChecked()
  })

  it('sends only changed fields, leaving structured hours and services untouched', async () => {
    await open()
    fireEvent.change(screen.getByLabelText(/Record-related restrictions/i), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: /Built for people with records/i }))
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/resources'))
    expect(putBody()).toEqual({ record_restrictions: null, reentry_focused: true })
  })

  it('saves edited services under the API field name', async () => {
    await open()
    fireEvent.change(screen.getByLabelText(/Services/i), {
      target: { value: 'Shelter, Meals, Case management' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/resources'))
    expect(putBody()).toEqual({ services_offered: ['Shelter', 'Meals', 'Case management'] })
  })

  it('returns to the list without a request when nothing changed', async () => {
    await open()
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/resources'))
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false)
  })
})
