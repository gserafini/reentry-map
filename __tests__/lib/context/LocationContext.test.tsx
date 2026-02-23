import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock the useLocation hook
vi.mock('@/lib/hooks/useLocation', () => ({
  useLocation: () => ({
    coordinates: null,
    loading: false,
    error: null,
    requestLocation: vi.fn(),
    locationName: null,
    source: null,
  }),
}))

import { LocationProvider, useUserLocation } from '@/lib/context/LocationContext'

describe('LocationContext', () => {
  it('throws when useUserLocation is used outside LocationProvider', () => {
    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useUserLocation())
    }).toThrow('useUserLocation must be used within a LocationProvider')

    consoleSpy.mockRestore()
  })

  it('provides location context within LocationProvider', () => {
    const { result } = renderHook(() => useUserLocation(), {
      wrapper: ({ children }) => <LocationProvider>{children}</LocationProvider>,
    })

    expect(result.current).toBeDefined()
    expect(result.current.coordinates).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(typeof result.current.requestLocation).toBe('function')
  })
})
