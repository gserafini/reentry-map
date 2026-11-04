import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  fetch: vi.fn(),
}))
vi.mock('@/lib/hooks/useAuth', () => ({ useAuth: mocks.useAuth }))
vi.mock('@/lib/hooks/useGravatar', () => ({
  useGravatar: () => ({ gravatarUrl: null, hasGravatar: false }),
}))

import ProfilePage from '@/app/profile/page'

const savedProfile = {
  id: '2fae590f-832b-48a3-b126-b8dca41e1b65',
  email: 'member@example.test',
  name: 'Jordan Lee',
  phone: null,
  avatar_url: null,
  is_admin: false,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-02T00:00:00.000Z',
}

describe('ProfilePage full-name editing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useAuth.mockReturnValue({
      user: {
        id: savedProfile.id,
        email: savedProfile.email,
        phone: null,
        created_at: savedProfile.created_at,
      },
      isLoading: false,
      isAuthenticated: true,
      signOut: vi.fn(),
    })
    mocks.fetch.mockImplementation(async (_url: string, options?: RequestInit) => {
      if (options?.method === 'PATCH') {
        return {
          ok: true,
          json: async () => ({ data: { ...savedProfile, name: 'Jordan Amara Lee' } }),
        }
      }
      return { ok: true, json: async () => ({ data: savedProfile }) }
    })
    vi.stubGlobal('fetch', mocks.fetch)
  })

  it('loads, edits, and saves one complete name field', async () => {
    render(<ProfilePage />)
    expect(await screen.findAllByText('Jordan Lee')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }))
    const nameInput = screen.getByRole('textbox', { name: 'Name' })
    expect(nameInput).toHaveValue('Jordan Lee')
    fireEvent.change(nameInput, { target: { value: 'Jordan Amara Lee' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() =>
      expect(mocks.fetch).toHaveBeenCalledWith(
        '/api/profile',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Jordan Amara Lee' }),
        })
      )
    )
    expect(await screen.findAllByText('Jordan Amara Lee')).toHaveLength(2)
  })

  it('shows a useful error when the session has no matching users row', async () => {
    mocks.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Profile not found' }),
    })
    render(<ProfilePage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Profile not found')
  })
})
