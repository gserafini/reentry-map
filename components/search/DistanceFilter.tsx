'use client'

import { Box, Slider, Typography, IconButton, Stack } from '@mui/material'
import { Clear as ClearIcon } from '@mui/icons-material'
import { useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useDebouncedCallback } from 'use-debounce'

interface DistanceFilterProps {
  /**
   * Whether user location is available (shows/hides component)
   */
  hasLocation: boolean

  /**
   * Default distance in miles
   * @default 25
   */
  defaultDistance?: number
}

const MIN_DISTANCE = 1
const MAX_DISTANCE = 50
const DEBOUNCE_MS = 500
const STORAGE_KEY = 'preferredDistance'

/**
 * Distance filter slider component
 *
 * Features:
 * - Material UI Slider (1-50 miles range)
 * - Shows current distance value (e.g., "Within 25 miles")
 * - Updates URL search params when value changes (debounced)
 * - Reads initial value from URL params
 * - Saves preference to localStorage
 * - Responsive mobile-first design
 * - Clear button to remove filter
 *
 * @example
 * ```tsx
 * <DistanceFilter hasLocation={!!coordinates} defaultDistance={25} />
 * ```
 */
export function DistanceFilter({ hasLocation, defaultDistance = 25 }: DistanceFilterProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get initial distance from URL params, localStorage, or default
  const getInitialDistance = (): number => {
    const urlDistance = searchParams.get('distance')
    if (urlDistance) {
      const parsed = parseInt(urlDistance, 10)
      if (!isNaN(parsed) && parsed >= MIN_DISTANCE && parsed <= MAX_DISTANCE) {
        return parsed
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed) && parsed >= MIN_DISTANCE && parsed <= MAX_DISTANCE) {
          return parsed
        }
      }
    }

    return defaultDistance
  }

  const [distance, setDistance] = useState<number>(getInitialDistance)
  const [isActive, setIsActive] = useState<boolean>(!!searchParams.get('distance'))

  // Update URL with debounce to avoid too many navigation calls
  // Use window.history.replaceState to avoid page refresh
  const updateUrl = useDebouncedCallback((value: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('distance', value.toString())

    // Reset to page 1 when changing distance
    params.delete('page')

    const newUrl = `${pathname}?${params.toString()}`

    // Use replaceState instead of router.push to avoid page refresh
    window.history.replaceState({}, '', newUrl)

    // Trigger a popstate event so Next.js updates searchParams
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, DEBOUNCE_MS)

  // Handle slider change
  const handleChange = (_event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue
    setDistance(value)
    setIsActive(true)

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, value.toString())
    }

    // Update URL with debounce
    updateUrl(value)
  }

  // Handle clear filter
  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('distance')
    params.delete('page')

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname

    // Use replaceState instead of router.push to avoid page refresh
    window.history.replaceState({}, '', newUrl)
    window.dispatchEvent(new PopStateEvent('popstate'))

    setDistance(defaultDistance)
    setIsActive(false)

    // Clear from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Sync state with URL params when they change externally
  useEffect(() => {
    const urlDistance = searchParams.get('distance')
    if (urlDistance) {
      const parsed = parseInt(urlDistance, 10)
      if (!isNaN(parsed) && parsed >= MIN_DISTANCE && parsed <= MAX_DISTANCE) {
        setDistance(parsed)
        setIsActive(true)
      }
    } else {
      setIsActive(false)
      setDistance(getInitialDistance())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Don't render if location is not available
  if (!hasLocation) {
    return null
  }

  return (
    <Box
      sx={{
        width: '100%',
        px: 2,
        py: 2,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
            fontSize: '0.875rem',
          }}
        >
          Distance
        </Typography>

        {isActive && (
          <IconButton
            onClick={handleClear}
            size="small"
            aria-label="Clear distance filter"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'error.main',
              },
            }}
          >
            <ClearIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>

      <Box sx={{ mt: 1 }}>
        <Slider
          value={distance}
          onChange={handleChange}
          min={MIN_DISTANCE}
          max={MAX_DISTANCE}
          step={1}
          marks={[
            { value: 1, label: '1mi' },
            { value: 25, label: '25mi' },
            { value: 50, label: '50mi' },
          ]}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${value} miles`}
          aria-label="Distance filter"
          sx={{
            '& .MuiSlider-thumb': {
              width: 20,
              height: 20,
              '&:hover, &.Mui-focusVisible': {
                boxShadow: '0 0 0 8px rgba(25, 118, 210, 0.16)',
              },
            },
            '& .MuiSlider-track': {
              height: 4,
            },
            '& .MuiSlider-rail': {
              height: 4,
              opacity: 0.3,
            },
            '& .MuiSlider-mark': {
              display: 'none',
            },
            '& .MuiSlider-markLabel': {
              fontSize: '0.75rem',
              color: 'text.secondary',
              top: 28,
            },
          }}
        />

        <Typography
          variant="body2"
          align="center"
          sx={{
            mt: 2,
            color: 'text.secondary',
            fontSize: '0.875rem',
          }}
        >
          Showing resources within <strong>{distance} miles</strong>
        </Typography>
      </Box>
    </Box>
  )
}
