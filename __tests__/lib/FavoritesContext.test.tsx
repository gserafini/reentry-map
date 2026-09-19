import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FavoritesProvider, useFavorites } from '@/lib/context/FavoritesContext'
import { SAVED_RESOURCES_KEY } from '@/lib/utils/saved-resources'
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}))
function Probe() {
  const { toggleFavorite, savedResources, clearDeviceFavorites, error } = useFavorites()
  return (
    <>
      <button onClick={() => void toggleFavorite('one', { name: 'Job Help', phone: '555-1000' })}>
        Save
      </button>
      <button onClick={clearDeviceFavorites}>Clear</button>
      <p>{savedResources.map((r) => r.name).join(',')}</p>
      <p>{error}</p>
    </>
  )
}
describe('guest saved resources', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })
  it('saves without network/login, persists reload, and clears for a shared device', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const view = render(
      <FavoritesProvider>
        <Probe />
      </FavoritesProvider>
    )
    fireEvent.click(screen.getByText('Save'))
    await screen.findByText('Job Help')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(localStorage.getItem(SAVED_RESOURCES_KEY)).toContain('555-1000')
    view.unmount()
    render(
      <FavoritesProvider>
        <Probe />
      </FavoritesProvider>
    )
    await screen.findByText('Job Help')
    fireEvent.click(screen.getByText('Clear'))
    await waitFor(() => expect(screen.queryByText('Job Help')).not.toBeInTheDocument())
    expect(localStorage.getItem(SAVED_RESOURCES_KEY)).toBeNull()
  })
  it('explains blocked device storage instead of falsely reporting a save', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    render(
      <FavoritesProvider>
        <Probe />
      </FavoritesProvider>
    )
    fireEvent.click(screen.getByText('Save'))
    await screen.findByText(/could not save/i)
    expect(screen.queryByText('Job Help')).not.toBeInTheDocument()
  })
})
