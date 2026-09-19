'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { TextField, Button, Box } from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { LocationInput } from './LocationInput'
import { useUserLocation } from '@/lib/context/LocationContext'
import { parseViewportBounds } from '@/lib/utils/map-viewport'
import { getSelectedCategories } from '@/lib/utils/search-filters'
import { getPathLocation } from '@/lib/utils/search-location'
import { parseStateLocationName } from '@/lib/utils/location-scope'

interface HeroSearchProps {
  /**
   * Initial search query value (e.g., from URL params)
   */
  initialValue?: string
}

/**
 * Hero section search component
 * Dual search: What + Where
 */
export function HeroSearch({ initialValue = '' }: HeroSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialValue)
  const [locationValid, setLocationValid] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { coordinates, displayName } = useUserLocation()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Update when initialValue changes (e.g., URL navigation)
  useEffect(() => {
    setSearchQuery(initialValue)
  }, [initialValue])

  // Add keyboard shortcut listener for \u201C/" key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if "/" was pressed
      if (event.key === '/') {
        // Don't trigger if user is already typing in an input/textarea
        const target = event.target as HTMLElement
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return
        }

        // Prevent default "/" character from being typed
        event.preventDefault()

        // Focus the search input and select all text
        if (searchInputRef.current) {
          searchInputRef.current.focus()
          searchInputRef.current.select()
        }
      }
    }

    // Add event listener
    window.addEventListener('keydown', handleKeyDown)

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!locationValid) return

    const query = searchQuery.trim()
    const params = new URLSearchParams()

    if (query) {
      params.set('search', query)
    }

    const categories = getSelectedCategories(searchParams, pathname)
    if (categories.length) params.set('categories', categories.join(','))
    if (searchParams.get('tags')) params.set('tags', searchParams.get('tags')!)

    // Carry location params through from LocationInput/context
    // Priority: existing URL params > LocationContext coordinates
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const locationName = searchParams.get('locationName')
    const distance = searchParams.get('distance')
    const stateLocation = parseStateLocationName(locationName)

    if (locationName) {
      params.set('locationName', locationName)
    }

    const pathLocation = getPathLocation(pathname)
    const mapBounds = parseViewportBounds(searchParams)
    if (pathLocation) {
      params.set('state', pathLocation.state)
      if (pathLocation.city) params.set('city', pathLocation.city)
      params.set('locationName', pathLocation.label)
    } else if (mapBounds) {
      for (const [key, value] of Object.entries(mapBounds)) params.set(key, String(value))
    } else if (searchParams.get('state')) {
      if (searchParams.get('city')) params.set('city', searchParams.get('city')!)
      params.set('state', searchParams.get('state')!)
    } else if (stateLocation) {
      params.delete('lat')
      params.delete('lng')
      params.delete('distance')
    } else if (lat && lng) {
      params.set('lat', lat)
      params.set('lng', lng)
      params.set('distance', distance || '25')
    } else if (coordinates && pathname === '/') {
      // Fall back to LocationContext (set by LocationInput or GeoIP)
      params.set('lat', coordinates.latitude.toString())
      params.set('lng', coordinates.longitude.toString())
      if (displayName) {
        params.set('locationName', displayName)
      }
      if (!parseStateLocationName(displayName)) {
        params.set('distance', '25')
      }
    }

    const qs = params.toString()
    router.push(qs ? `/search?${qs}` : '/search')
  }

  return (
    <Box
      id="hero-search"
      component="form"
      aria-label="Find resources"
      onSubmit={handleSubmit}
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 1,
        bgcolor: 'background.paper',
        p: 1.5,
        borderRadius: 2,
        boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
      }}
    >
      <TextField
        fullWidth
        label="What do you need?"
        placeholder="Housing, jobs, food, or an organization"
        size="small"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        autoComplete="off"
        inputRef={searchInputRef}
        sx={{ flex: 1, minWidth: 0 }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <LocationInput size="small" fullWidth onValidityChange={setLocationValid} />
      </Box>
      <Button
        type="submit"
        variant="contained"
        startIcon={<SearchIcon />}
        disabled={!locationValid}
        sx={{ flexShrink: 0, whiteSpace: 'nowrap', minHeight: 40 }}
      >
        Find help
      </Button>
    </Box>
  )
}
