'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useLocation, UseLocationResult } from '@/lib/hooks/useLocation'

/**
 * Context for sharing user's location across the app
 */
const LocationContext = createContext<UseLocationResult | undefined>(undefined)

interface LocationProviderProps {
  children: ReactNode
}

/**
 * Provider component that makes user location available to all child components
 *
 * @example
 * ```tsx
 * <LocationProvider>
 *   <App />
 * </LocationProvider>
 * ```
 */
export function LocationProvider({ children }: LocationProviderProps) {
  const location = useLocation(false) // Don't auto-request on mount

  return <LocationContext.Provider value={location}>{children}</LocationContext.Provider>
}

/**
 * Hook to access user location from anywhere in the app
 *
 * @throws Error if used outside LocationProvider
 * @returns User location state and controls
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { coordinates, requestLocation, loading } = useUserLocation()
 *
 *   return (
 *     <button onClick={requestLocation} disabled={loading}>
 *       {coordinates ? 'Update Location' : 'Get My Location'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useUserLocation(): UseLocationResult {
  const context = useContext(LocationContext)

  if (context === undefined) {
    throw new Error('useUserLocation must be used within a LocationProvider')
  }

  return context
}
