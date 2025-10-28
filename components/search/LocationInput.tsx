'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { TextField, MenuItem, ListItemIcon, ListItemText, CircularProgress } from '@mui/material'
import { MyLocation as MyLocationIcon, Place as PlaceIcon } from '@mui/icons-material'
import { useRouter, useSearchParams } from 'next/navigation'
import { initializeGoogleMaps } from '@/lib/google-maps'
import { useUserLocation } from '@/lib/context/LocationContext'

interface LocationInputProps {
  fullWidth?: boolean
  size?: 'small' | 'medium'
}

/**
 * LocationInput with "Current Location" option and Google Places Autocomplete
 * Dropdown location picker for header search
 */
export function LocationInput({ fullWidth = false, size = 'medium' }: LocationInputProps) {
  const { displayName, requestLocation, setManualLocation, loading, coordinates, source } =
    useUserLocation()
  const router = useRouter()
  const searchParams = useSearchParams()
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
      params.set('lat', lat.toString())
      params.set('lng', lng.toString())
      params.set('locationName', locationName)
      if (distance) {
        params.set('distance', distance.toString())
      } else if (!params.has('distance')) {
        // Set default distance if not present
        params.set('distance', '25')
      }
      router.push(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
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

  // Pre-fill location from GeoIP on mount (only if no location set yet)
  useEffect(() => {
    // Only pre-fill if we don't have a location yet
    if (coordinates || displayName) return

    const fetchGeoIPLocation = async () => {
      try {
        const response = await fetch('/api/location/ip')
        if (!response.ok) throw new Error('GeoIP fetch failed')

        const data = await response.json()

        // Format as "City, ST"
        const locationText = `${data.city}, ${data.region}`

        // Pre-fill the input
        setInputValue(locationText)

        // Set the location in context
        setManualLocation(
          {
            latitude: data.latitude,
            longitude: data.longitude,
          },
          locationText
        )

        // Update URL with GeoIP location
        updateURLWithLocation(data.latitude, data.longitude, locationText)
      } catch (err) {
        console.debug('GeoIP pre-fill skipped:', err)
        // Silently fail - user can still enter location manually
      }
    }

    fetchGeoIPLocation()
  }, []) // Only run on mount
  // Intentionally excluding dependencies to only run once

  // Update input value when displayName changes
  useEffect(() => {
    if (displayName) {
      setInputValue(displayName)
    }
  }, [displayName])

  // Reverse geocode when we get geolocation coordinates
  useEffect(() => {
    if (!coordinates || source !== 'geolocation' || !geocodingLibrary || isReverseGeocoding) {
      return
    }

    const reverseGeocode = async () => {
      setIsReverseGeocoding(true)
      setInputValue('Getting location...')

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
          const formattedLocation =
            city && state ? `${city}, ${state}` : cityResult.formatted_address

          // Update the location with the geocoded city/state
          setManualLocation(coordinates, formattedLocation)
          setInputValue(formattedLocation)
          // Update URL with location params
          updateURLWithLocation(coordinates.latitude, coordinates.longitude, formattedLocation)
        }
      } catch (err) {
        console.error('Reverse geocoding error:', err)
        // Fall back to "Current Location"
        setInputValue('Current Location')
      } finally {
        setIsReverseGeocoding(false)
      }
    }

    reverseGeocode()
  }, [
    coordinates,
    source,
    geocodingLibrary,
    isReverseGeocoding,
    setManualLocation,
    updateURLWithLocation,
  ])

  // Reset selected index when predictions change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [predictions])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!showDropdown) return

    // Total items = 1 (Current Location) + predictions.length + (1 if user input shown)
    const hasUserInput = inputValue.trim() && predictions.length === 0 && !loading
    const totalItems = 1 + predictions.length + (hasUserInput ? 1 : 0)

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
        if (selectedIndex === -1) return

        // Index 0 = Current Location
        if (selectedIndex === 0) {
          handleCurrentLocation()
        }
        // Index 1 to predictions.length = predictions
        else if (selectedIndex <= predictions.length) {
          const prediction = predictions[selectedIndex - 1]
          handlePlaceSelect(prediction.place_id, prediction.description)
        }
        // Last index = user's typed input (if shown)
        else if (hasUserInput && selectedIndex === totalItems - 1) {
          setShowDropdown(false)
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
          componentRestrictions: { country: 'us' }, // US only for now
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

        // Use description as display name (e.g., "Oakland, CA" or "94601")
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
        placeholder="Enter location or zip"
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
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
          '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
            border: 'none',
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
            left: '-20px',
            right: '-20px',
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

          {/* User's typed input as fallback option */}
          {inputValue.trim() && predictions.length === 0 && !loading && (
            <MenuItem
              id="location-option-1"
              role="option"
              aria-selected={selectedIndex === 1}
              onClick={() => {
                setHoverText('')
                setShowDropdown(false)
                // Keep the user's typed input - they can search with it as-is
              }}
              onMouseEnter={() => {
                setHoverText(inputValue)
                setSelectedIndex(1) // Index 1 since Current Location is 0
              }}
              onMouseLeave={() => setHoverText('')}
              sx={{
                py: 1.5,
                px: 2,
                backgroundColor: selectedIndex === 1 ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <PlaceIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText
                primary={inputValue}
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
          )}
        </div>
      )}
    </div>
  )
}
