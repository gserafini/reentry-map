'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { TextField, Button, Box } from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { useRouter, useSearchParams } from 'next/navigation'
import { LocationInput } from './LocationInput'
import { useUserLocation } from '@/lib/context/LocationContext'

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
  const router = useRouter()
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

    const query = searchQuery.trim()
    const params = new URLSearchParams()

    if (query) {
      params.set('search', query)
    }

    // Carry location params through from LocationInput/context
    // Priority: existing URL params > LocationContext coordinates
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const locationName = searchParams.get('locationName')
    const distance = searchParams.get('distance')

    if (lat && lng) {
      params.set('lat', lat)
      params.set('lng', lng)
      if (locationName) params.set('locationName', locationName)
      params.set('distance', distance || '25')
    } else if (coordinates) {
      // Fall back to LocationContext (set by LocationInput or GeoIP)
      params.set('lat', coordinates.latitude.toString())
      params.set('lng', coordinates.longitude.toString())
      if (displayName) params.set('locationName', displayName)
      params.set('distance', '25')
    }

    const qs = params.toString()
    router.push(qs ? `/search?${qs}` : '/search')
  }

  return (
    <Box
      id="hero-search"
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        gap: 0.5,
        width: '100%',
        bgcolor: 'background.paper',
        p: '6px',
        borderRadius: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        '&:hover': {
          boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
        },
      }}
    >
      {/* What search */}
      <Box sx={{ flex: '1 1 50%', borderRight: '1px solid rgba(0,0,0,0.1)' }}>
        <TextField
          fullWidth
          placeholder="What are you looking for?"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
          inputRef={searchInputRef}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'transparent',
              '& fieldset': {
                border: 'none',
              },
              '& input': {
                py: 1.25,
                px: 2,
              },
            },
          }}
        />
      </Box>

      {/* Where search */}
      <Box sx={{ flex: '1 1 30%' }}>
        <LocationInput size="small" fullWidth />
      </Box>

      {/* Search button - icon only */}
      <Button
        type="submit"
        variant="contained"
        size="small"
        sx={{
          px: 1.5,
          py: 1.25,
          minWidth: 'auto',
          borderRadius: '18px',
        }}
      >
        <SearchIcon />
      </Button>
    </Box>
  )
}
