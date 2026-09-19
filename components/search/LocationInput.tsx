'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { TextField, MenuItem, ListItemIcon, ListItemText, CircularProgress } from '@mui/material'
import { MyLocation as MyLocationIcon, Place as PlaceIcon } from '@mui/icons-material'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { getPathLocation, resolveSearchLocation } from '@/lib/utils/search-location'
import { initializeGoogleMaps } from '@/lib/google-maps'
import { isValidCoordinates } from '@/lib/hooks/useLocation'
import { useUserLocation } from '@/lib/context/LocationContext'
import { parseStateLocationName, resolveVisibleLocationName } from '@/lib/utils/location-scope'
interface LocationInputProps {
  fullWidth?: boolean
  size?: 'small' | 'medium'
  onValidityChange?: (valid: boolean) => void
}

/**
 * LocationInput with "Current Location" option and Google Places Autocomplete
 * Dropdown location picker for header search
 */
export function LocationInput({
  fullWidth = false,
  size = 'medium',
  onValidityChange,
}: LocationInputProps) {
  const { displayName, requestLocation, setManualLocation, loading, coordinates, source, error } =
    useUserLocation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const locationScope = resolveSearchLocation(searchParams, pathname)
  const urlLocationName = locationScope.label === 'Nationwide' ? null : locationScope.label
  const useHomeDefault = pathname === '/'

  const geolocationRequested = useRef(false)
  const [locationError, setLocationError] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [hoverText, setHoverText] = useState('')
  const [placesLibrary, setPlacesLibrary] = useState<google.maps.PlacesLibrary | null>(null)
  const [geocodingLibrary, setGeocodingLibrary] = useState<google.maps.GeocodingLibrary | null>(
    null
  )
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Helper function to update URL with location parameters
  const updateURLWithLocation = useCallback(
    (lat: number, lng: number, locationName: string, distance?: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('locationName', locationName)
      for (const key of ['north', 'south', 'east', 'west', 'page', 'city', 'state'])
        params.delete(key)
      if (params.get('sort') === 'distance-asc') params.delete('sort')

      const stateLocation = parseStateLocationName(locationName)

      if (stateLocation) {
        params.delete('lat')
        params.delete('lng')
        params.delete('distance')
      } else {
        params.set('lat', lat.toString())
        params.set('lng', lng.toString())
        if (distance) {
          params.set('distance', distance.toString())
        } else if (!params.has('distance')) {
          // Set default distance if not present
          params.set('distance', '25')
        }
      }
      const routeCategory = pathname.match(/\/category\/([^/]+)/)?.[1]
      if (routeCategory) params.set('categories', routeCategory)
      router.push(`${getPathLocation(pathname) ? '/search' : ''}?${params.toString()}`, {
        scroll: false,
      })
    },
    [router, searchParams, pathname]
  )

  // Initialize Google Maps services (singleton - safe to call from multiple instances)
  useEffect(() => {
    initializeGoogleMaps()
      .then(({ places, geocoding }) => {
        setPlacesLibrary(places)
        setGeocodingLibrary(geocoding)
      })
      .catch((err) => {
        console.error('Error loading Google Maps:', err)
      })
  }, [])

  // Update input value when displayName changes
  useEffect(() => {
    const nextVisibleLocation = resolveVisibleLocationName(
      urlLocationName,
      useHomeDefault ? displayName : null
    )
    setInputValue(nextVisibleLocation || '')
    onValidityChange?.(true)
  }, [displayName, urlLocationName, useHomeDefault, onValidityChange])

  useEffect(() => {
    if (!error || !geolocationRequested.current) return
    geolocationRequested.current = false
    setLocationError('Location unavailable. Enter a city, state, or ZIP.')
    setInputValue(urlLocationName || '')
    onValidityChange?.(true)
  }, [error, urlLocationName, onValidityChange])

  // Reverse geocode when we get geolocation coordinates
  useEffect(() => {
    if (
      !geolocationRequested.current ||
      loading ||
      !coordinates ||
      source !== 'geolocation' ||
      !geocodingLibrary ||
      isReverseGeocoding
    ) {
      return
    }

    const reverseGeocode = async () => {
      geolocationRequested.current = false
      setIsReverseGeocoding(true)
      setInputValue('Getting location...')
      let formattedLocation = 'Current Location'

      try {
        const { Geocoder } = geocodingLibrary
        const geocoder = new Geocoder()

        const result = await geocoder.geocode({
          location: {
            lat: coordinates.latitude,
            lng: coordinates.longitude,
          },
        })

        if (result.results && result.results.length > 0) {
          // Find the most appropriate result (locality level)
          const cityResult =
            result.results.find((r) => r.types.includes('locality')) || result.results[0]

          // Extract city and state from address components
          let city = ''
          let state = ''

          for (const component of cityResult.address_components) {
            if (component.types.includes('locality')) {
              city = component.long_name
            }
            if (component.types.includes('administrative_area_level_1')) {
              state = component.short_name
            }
          }

          // Format as "City, State"
          formattedLocation = city && state ? `${city}, ${state}` : cityResult.formatted_address
        }
      } catch (err) {
        console.debug('Location name unavailable; using GPS coordinates:', err)
      } finally {
        onValidityChange?.(true)
        setInputValue(formattedLocation)
        updateURLWithLocation(coordinates.latitude, coordinates.longitude, formattedLocation)
        setIsReverseGeocoding(false)
      }
    }

    reverseGeocode()
  }, [
    coordinates,
    source,
    loading,
    geocodingLibrary,
    isReverseGeocoding,
    updateURLWithLocation,
    onValidityChange,
  ])

  // Reset selected index when predictions change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [predictions])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!showDropdown) return

    // Total items = 1 (Current Location) + predictions.length + (1 if user input shown)
    const totalItems = 1 + predictions.length

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex === -1) {
          const first = predictions[0]
          if (first) handlePlaceSelect(first.place_id, first.description)
          return
        }

        // Index 0 = Current Location
        if (selectedIndex === 0) {
          handleCurrentLocation()
        }
        // Index 1 to predictions.length = predictions
        else if (selectedIndex <= predictions.length) {
          const prediction = predictions[selectedIndex - 1]
          handlePlaceSelect(prediction.place_id, prediction.description)
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowDropdown(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Handle input change and fetch predictions
  const handleInputChange = async (value: string) => {
    setInputValue(value)
    setLocationError('')
    onValidityChange?.(false)

    if (!value.trim()) {
      setPredictions([])
      setShowDropdown(false)
      return
    }

    setShowDropdown(true)

    if (placesLibrary) {
      try {
        const { AutocompleteService } = placesLibrary
        const service = new AutocompleteService()

        const request = {
          input: value,
          componentRestrictions: { country: 'us' },
          types: ['(regions)'],
        }

        const response = await service.getPlacePredictions(request)
        setPredictions(response?.predictions || [])
      } catch (err) {
        console.error('Autocomplete error:', err)
        setPredictions([])
      }
    }
  }

  // Handle "Current Location" selection
  const handleCurrentLocation = () => {
    geolocationRequested.current = true
    setLocationError('')
    onValidityChange?.(false)
    setHoverText('') // Clear hover text immediately to prevent flash
    setInputValue('Getting location...') // Show loading state
    setShowDropdown(false)
    requestLocation() // This will trigger the reverse geocoding useEffect
  }

  // Handle place selection from autocomplete
  const handlePlaceSelect = async (placeId: string, description: string) => {
    if (!placesLibrary) return

    // Clear hover text immediately to prevent flash
    setHoverText('')
    // Set input value immediately so text stays visible
    setInputValue(description)

    try {
      const { Place } = placesLibrary

      const place = new Place({ id: placeId })
      await place.fetchFields({ fields: ['location'] })

      if (place.location) {
        const coords = {
          latitude: place.location.lat(),
          longitude: place.location.lng(),
        }

        if (!isValidCoordinates(coords) || !description.trim()) {
          setLocationError('Location unavailable. Choose another suggestion.')
          onValidityChange?.(false)
          return
        }

        // Use description as display name (e.g., "Oakland, CA" or "94601")
        onValidityChange?.(true)
        setManualLocation(coords, description)
        // Update URL with location params
        updateURLWithLocation(coords.latitude, coords.longitude, description)
        setShowDropdown(false)
        setPredictions([])
        // Don't call onLocationChange - let user press Enter to submit
      }
    } catch (err) {
      console.error('Error fetching place details:', err)
    }
  }

  return (
    <div style={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
      <TextField
        ref={inputRef}
        value={hoverText || inputValue}
        onChange={(e) => {
          handleInputChange(e.target.value)
          setHoverText('')
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          // Always show dropdown on focus (with Current Location option)
          setShowDropdown(true)
        }}
        onBlur={() => {
          // Delay hiding dropdown to allow clicking on items
          setTimeout(() => {
            setShowDropdown(false)
            setHoverText('')
            setSelectedIndex(-1)
          }, 200)
        }}
        label="Where?"
        helperText={locationError || undefined}
        error={Boolean(locationError)}
        placeholder="City, state, or ZIP"
        size={size}
        fullWidth={fullWidth}
        autoComplete="off"
        inputProps={{
          role: 'combobox',
          'aria-label': 'Location search',
          'aria-autocomplete': 'list',
          'aria-controls': 'location-suggestions',
          'aria-expanded': showDropdown,
          'aria-activedescendant':
            selectedIndex >= 0 ? `location-option-${selectedIndex}` : undefined,
        }}
        InputProps={{
          endAdornment: loading ? <CircularProgress size={20} /> : null,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'transparent',
          },
        }}
      />

      {/* Dropdown */}
      {showDropdown && (
        <div
          id="location-suggestions"
          role="listbox"
          aria-label="Location suggestions"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300,
            marginTop: '8px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            maxHeight: '350px',
            overflowY: 'auto',
          }}
        >
          {/* Current Location option - always show first */}
          <MenuItem
            id="location-option-0"
            role="option"
            aria-selected={selectedIndex === 0}
            onClick={handleCurrentLocation}
            onMouseEnter={() => {
              setHoverText('Current Location')
              setSelectedIndex(0)
            }}
            onMouseLeave={() => setHoverText('')}
            sx={{
              borderBottom: predictions.length > 0 ? '1px solid' : 'none',
              borderColor: 'divider',
              py: 1.5,
              px: 2,
              backgroundColor: selectedIndex === 0 ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <MyLocationIcon sx={{ color: '#1976d2', fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText
              primary="Current Location"
              primaryTypographyProps={{
                sx: {
                  color: 'text.primary',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  textAlign: 'left',
                },
              }}
            />
          </MenuItem>

          {/* Autocomplete predictions */}
          {predictions.map((prediction, index) => (
            <MenuItem
              key={prediction.place_id}
              id={`location-option-${index + 1}`}
              role="option"
              aria-selected={selectedIndex === index + 1}
              onClick={() => handlePlaceSelect(prediction.place_id, prediction.description)}
              onMouseEnter={() => {
                setHoverText(prediction.description)
                setSelectedIndex(index + 1) // +1 because index 0 is Current Location
              }}
              onMouseLeave={() => setHoverText('')}
              sx={{
                py: 1.5,
                px: 2,
                backgroundColor:
                  selectedIndex === index + 1 ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <PlaceIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText
                primary={prediction.structured_formatting.main_text}
                secondary={prediction.structured_formatting.secondary_text}
                primaryTypographyProps={{
                  sx: {
                    color: 'text.primary',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    textAlign: 'left',
                  },
                }}
                secondaryTypographyProps={{
                  sx: {
                    color: 'text.secondary',
                    fontSize: '0.85rem',
                    textAlign: 'left',
                  },
                }}
              />
            </MenuItem>
          ))}

          {inputValue.trim() && predictions.length === 0 && !loading && (
            <MenuItem disabled sx={{ whiteSpace: 'normal', fontSize: '0.875rem' }}>
              Type a city, state, or ZIP and choose a suggestion.
            </MenuItem>
          )}
        </div>
      )}
    </div>
  )
}
