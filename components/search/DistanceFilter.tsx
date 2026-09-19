'use client'

import { recordSearchRefinement } from '@/lib/analytics/search-journey'

import { Box, Slider, Typography, IconButton, Stack } from '@mui/material'
import { RestartAlt } from '@mui/icons-material'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useDebouncedCallback } from 'use-debounce'

interface DistanceFilterProps {
  hasLocation: boolean
  defaultDistance?: number
}

export function DistanceFilter({ hasLocation, defaultDistance = 25 }: DistanceFilterProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlDistance = Number(searchParams.get('distance') || defaultDistance)
  const queryDistance =
    Number.isFinite(urlDistance) && urlDistance >= 1 && urlDistance <= 100
      ? urlDistance
      : defaultDistance
  const [distance, setDistance] = useState(queryDistance)
  useEffect(() => setDistance(queryDistance), [queryDistance])
  const updateUrl = useDebouncedCallback((value: number) => {
    recordSearchRefinement('distance')
    const params = new URLSearchParams(searchParams.toString())
    params.set('distance', String(value))
    params.delete('page')
    router.push(`${pathname}?${params}`)
  }, 500)
  const handleChange = (_event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue
    setDistance(value)
    updateUrl(value)
  }
  const handleReset = () => {
    updateUrl.cancel()
    const params = new URLSearchParams(searchParams.toString())
    params.delete('distance')
    params.delete('page')
    setDistance(25)
    try {
      localStorage.removeItem('preferredDistance')
    } catch {
      /* Browser storage is optional. */
    }
    router.push(params.size ? `${pathname}?${params}` : pathname)
  }
  if (!hasLocation) return null
  return (
    <Box sx={{ px: 2, py: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="body2" fontWeight={600}>
          Distance
        </Typography>
        {searchParams.has('distance') && (
          <IconButton onClick={handleReset} size="small" aria-label="Reset distance to 25 miles">
            <RestartAlt fontSize="small" />
          </IconButton>
        )}
      </Stack>
      <Slider
        value={distance}
        onChange={handleChange}
        min={1}
        max={100}
        step={1}
        marks={[
          { value: 1, label: '1mi' },
          { value: 25, label: '25mi' },
          { value: 50, label: '50mi' },
          { value: 100, label: '100mi' },
        ]}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => `${value} miles`}
        aria-label="Distance filter"
      />
      <Typography variant="body2" sx={{ mt: 1 }}>
        Showing resources within <strong>{distance} miles</strong>, plus services covering this
        area.
      </Typography>
    </Box>
  )
}
