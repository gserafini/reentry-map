'use client'

import { ToggleButtonGroup, ToggleButton, useMediaQuery, useTheme } from '@mui/material'
import { ViewList as ViewListIcon, Map as MapIcon } from '@mui/icons-material'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export type ViewType = 'list' | 'map'

interface ViewToggleProps {
  /**
   * Default view ('list' or 'map')
   * @default 'list'
   */
  defaultView?: ViewType

  /**
   * Callback when view changes
   */
  onViewChange?: (view: ViewType) => void
}

const STORAGE_KEY = 'preferredView'

/**
 * View toggle component for switching between list and map views
 *
 * Features:
 * - Material UI ToggleButtonGroup with list/map options
 * - Updates URL search param (view=list or view=map)
 * - Saves preference to localStorage
 * - Reads initial value from URL params, then localStorage, then default
 * - Preserves all other search params when toggling
 * - Responsive design (smaller buttons on mobile)
 * - Exclusive selection (only one active at a time)
 *
 * @example
 * ```tsx
 * <ViewToggle
 *   defaultView="list"
 *   onViewChange={(view) => console.log('View changed to:', view)}
 * />
 * ```
 */
export function ViewToggle({ defaultView = 'list', onViewChange }: ViewToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  /**
   * Get initial view from URL params, localStorage, or default
   * Priority: URL params > localStorage > defaultView
   */
  const getInitialView = (): ViewType => {
    // Check URL params first
    const urlView = searchParams.get('view')
    if (urlView === 'list' || urlView === 'map') {
      return urlView
    }

    // Check localStorage second
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'list' || stored === 'map') {
        return stored
      }
    }

    // Fall back to default
    return defaultView
  }

  const [view, setView] = useState<ViewType>(getInitialView)

  /**
   * Handle view change
   * Updates local state, URL params, localStorage, and calls callback
   */
  const handleChange = (_event: React.MouseEvent<HTMLElement>, newView: ViewType | null) => {
    // Ignore if clicking the same button (ensure exclusive selection)
    if (newView === null || newView === view) {
      return
    }

    setView(newView)

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newView)
    }

    // Update URL params
    const params = new URLSearchParams(searchParams.toString())
    if (newView === defaultView) {
      // Remove param if it matches default to keep URLs clean
      params.delete('view')
    } else {
      params.set('view', newView)
    }

    // Update URL
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.push(newUrl)

    // Call callback if provided
    onViewChange?.(newView)
  }

  /**
   * Sync state with URL params when they change externally
   */
  useEffect(() => {
    const urlView = searchParams.get('view')
    if (urlView === 'list' || urlView === 'map') {
      setView(urlView)
    } else {
      // If no URL param, check localStorage or use default
      const initialView = getInitialView()
      setView(initialView)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <ToggleButtonGroup
      value={view}
      exclusive
      onChange={handleChange}
      aria-label="view toggle"
      size={isMobile ? 'small' : 'medium'}
      sx={{
        '& .MuiToggleButton-root': {
          px: isMobile ? 1.5 : 2,
          py: isMobile ? 0.5 : 0.75,
          fontSize: isMobile ? '0.875rem' : '0.9375rem',
          fontWeight: 500,
          borderColor: 'divider',
          color: 'text.secondary',
          '&.Mui-selected': {
            color: 'primary.main',
            backgroundColor: 'action.selected',
            '&:hover': {
              backgroundColor: 'action.selected',
            },
          },
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        },
      }}
    >
      <ToggleButton value="list" aria-label="list view">
        <ViewListIcon
          sx={{
            fontSize: isMobile ? '1.25rem' : '1.5rem',
            mr: isMobile ? 0.5 : 1,
          }}
        />
        List
      </ToggleButton>
      <ToggleButton value="map" aria-label="map view">
        <MapIcon
          sx={{
            fontSize: isMobile ? '1.25rem' : '1.5rem',
            mr: isMobile ? 0.5 : 1,
          }}
        />
        Map
      </ToggleButton>
    </ToggleButtonGroup>
  )
}
