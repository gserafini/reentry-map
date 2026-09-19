'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  MAX_SAVED_RESOURCES,
  parseSavedResources,
  SAVED_RESOURCES_KEY,
  snapshotResource,
  type SavedResource,
  type SavedResourceInput,
} from '@/lib/utils/saved-resources'

interface FavoritesContextValue {
  favoriteIds: Set<string>
  isFavorited: (resourceId: string) => boolean
  toggleFavorite: (resourceId: string, resource?: SavedResourceInput) => Promise<boolean>
  isLoading: boolean
  savedResources: SavedResource[]
  removeDeviceFavorite: (resourceId: string) => void
  clearDeviceFavorites: () => void
  error: string | null
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favoriteIds: new Set(),
  isFavorited: () => false,
  toggleFavorite: async () => false,
  isLoading: false,
  savedResources: [],
  removeDeviceFavorite: () => {},
  clearDeviceFavorites: () => {},
  error: null,
})

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [accountIds, setAccountIds] = useState<Set<string>>(new Set())
  const [savedResources, setSavedResources] = useState<SavedResource[]>([])
  const savedRef = useRef(savedResources)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const read = () => {
      try {
        const saved = parseSavedResources(localStorage.getItem(SAVED_RESOURCES_KEY))
        savedRef.current = saved
        setSavedResources(saved)
      } catch {
        setError('Device storage is unavailable. Download your support list before leaving.')
      }
    }
    read()
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === SAVED_RESOURCES_KEY) read()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    let active = true
    if (status === 'authenticated' && session?.user?.id) {
      setIsLoading(true)
      fetch('/api/favorites/ids')
        .then(async (res) => {
          if (!res.ok) throw new Error('Favorites unavailable')
          const data = (await res.json()) as { ids?: string[] }
          if (active) setAccountIds(new Set(data.ids || []))
        })
        .catch(() => {
          if (active)
            setError('Account favorites could not load. Device saves are still available.')
        })
        .finally(() => {
          if (active) setIsLoading(false)
        })
    } else {
      setAccountIds(new Set())
      setIsLoading(false)
    }
    return () => {
      active = false
    }
  }, [status, session?.user?.id])

  const writeDevice = useCallback((next: SavedResource[]) => {
    try {
      if (next.length)
        localStorage.setItem(SAVED_RESOURCES_KEY, JSON.stringify({ version: 1, resources: next }))
      else localStorage.removeItem(SAVED_RESOURCES_KEY)
      savedRef.current = next
      setSavedResources(next)
      setError(null)
      return true
    } catch {
      setError(
        'We could not save changes on this device. Check browser storage settings or download your list.'
      )
      return false
    }
  }, [])

  const favoriteIds = useMemo(
    () => (status === 'authenticated' ? accountIds : new Set(savedResources.map((r) => r.id))),
    [status, accountIds, savedResources]
  )
  const isFavorited = useCallback((id: string) => favoriteIds.has(id), [favoriteIds])

  const toggleFavorite = useCallback(
    async (resourceId: string, resource?: SavedResourceInput) => {
      const wasFavorited = favoriteIds.has(resourceId)
      if (status !== 'authenticated') {
        const current = savedRef.current
        if (current.some((r) => r.id === resourceId))
          return writeDevice(current.filter((r) => r.id !== resourceId)) ? false : true
        if (!resource?.name) {
          setError('Open this resource and save it from its details page.')
          return false
        }
        if (current.length >= MAX_SAVED_RESOURCES) {
          setError('Your device list has 100 resources. Remove an item before saving another.')
          return false
        }
        return writeDevice([...current, snapshotResource(resourceId, resource)])
      }

      setAccountIds((prev) => {
        const next = new Set(prev)
        if (wasFavorited) next.delete(resourceId)
        else next.add(resourceId)
        return next
      })
      try {
        const response = await fetch('/api/favorites', {
          method: wasFavorited ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceId }),
        })
        if (!response.ok) throw new Error('Save failed')
        setError(null)
        return !wasFavorited
      } catch {
        setAccountIds((prev) => {
          const next = new Set(prev)
          if (wasFavorited) next.add(resourceId)
          else next.delete(resourceId)
          return next
        })
        setError('Your account save could not be updated. Check your connection and try again.')
        return wasFavorited
      }
    },
    [favoriteIds, status, writeDevice]
  )

  const removeDeviceFavorite = useCallback(
    (id: string) => {
      writeDevice(savedRef.current.filter((r) => r.id !== id))
    },
    [writeDevice]
  )
  const clearDeviceFavorites = useCallback(() => {
    writeDevice([])
  }, [writeDevice])

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        isFavorited,
        isLoading,
        toggleFavorite,
        savedResources,
        removeDeviceFavorite,
        clearDeviceFavorites,
        error,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  return useContext(FavoritesContext)
}
