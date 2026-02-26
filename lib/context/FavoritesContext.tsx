'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface FavoritesContextValue {
  /** Set of favorited resource IDs */
  favoriteIds: Set<string>
  /** Check if a resource is favorited */
  isFavorited: (resourceId: string) => boolean
  /** Toggle favorite status — optimistic update + API call */
  toggleFavorite: (resourceId: string) => Promise<boolean>
  /** Whether initial load is in progress */
  isLoading: boolean
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favoriteIds: new Set(),
  isFavorited: () => false,
  toggleFavorite: async () => false,
  isLoading: false,
})

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  // Fetch all favorite IDs once when user is authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setIsLoading(true)
      fetch('/api/favorites/ids')
        .then(async (res) => {
          const data = (await res.json()) as { ids?: string[] }
          setFavoriteIds(new Set(data.ids || []))
        })
        .catch(() => {
          // Silently fail — favorites just won't show as checked
          setFavoriteIds(new Set())
        })
        .finally(() => setIsLoading(false))
    } else if (status === 'unauthenticated') {
      setFavoriteIds(new Set())
    }
  }, [status, session?.user])

  const isFavorited = useCallback(
    (resourceId: string) => favoriteIds.has(resourceId),
    [favoriteIds]
  )

  const toggleFavorite = useCallback(
    async (resourceId: string): Promise<boolean> => {
      const wasFavorited = favoriteIds.has(resourceId)

      // Optimistic update
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (wasFavorited) {
          next.delete(resourceId)
        } else {
          next.add(resourceId)
        }
        return next
      })

      try {
        const method = wasFavorited ? 'DELETE' : 'POST'
        const response = await fetch('/api/favorites', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceId }),
        })

        if (!response.ok) {
          // Revert on failure
          setFavoriteIds((prev) => {
            const reverted = new Set(prev)
            if (wasFavorited) {
              reverted.add(resourceId)
            } else {
              reverted.delete(resourceId)
            }
            return reverted
          })
          return wasFavorited
        }

        return !wasFavorited
      } catch {
        // Revert on failure
        setFavoriteIds((prev) => {
          const reverted = new Set(prev)
          if (wasFavorited) {
            reverted.add(resourceId)
          } else {
            reverted.delete(resourceId)
          }
          return reverted
        })
        return wasFavorited
      }
    },
    [favoriteIds]
  )

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorited, isLoading, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  return useContext(FavoritesContext)
}
