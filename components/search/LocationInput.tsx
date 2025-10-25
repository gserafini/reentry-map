'use client'

import { useState, useRef, useEffect } from 'react'
import { TextField, MenuItem, ListItemIcon, ListItemText, CircularProgress } from '@mui/material'
import { MyLocation as MyLocationIcon, Place as PlaceIcon } from '@mui/icons-material'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { useUserLocation } from '@/lib/context/LocationContext'
import { env } from '@/lib/env'

interface LocationInputProps {
  fullWidth?: boolean
  size?: 'small' | 'medium'
}

/**
 * LocationInput with "Current Location" option and Google Places Autocomplete
 * Dropdown location picker for header search
 */
export function LocationInput({ fullWidth = false, size = 'medium' }: LocationInputProps) {
  const { displayName, requestLocation, setManualLocation, loading } = useUserLocation()
  const [inputValue, setInputValue] = useState('')
  const [hoverText, setHoverText] = useState('')
  const [placesLibrary, setPlacesLibrary] = useState<google.maps.PlacesLibrary | null>(null)
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize Google Maps services
  useEffect(() => {
    const apiKey = env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!apiKey) {
      console.warn('Google Maps API key not configured')
      return
    }

    // Check if already loaded
    if (placesLibrary) {
      return
    }

    // Use new functional API - must set options before importing library
    setOptions({ key: apiKey, v: 'weekly' })

    importLibrary('places')
      .then((lib) => {
        setPlacesLibrary(lib as google.maps.PlacesLibrary)
      })
      .catch((err: Error) => {
        console.error('Error loading Google Maps:', err)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update input value when displayName changes
  useEffect(() => {
    if (displayName) {
      setInputValue(displayName)
    }
  }, [displayName])

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
        setPredictions(response.predictions || [])
      } catch (err) {
        console.error('Autocomplete error:', err)
        setPredictions([])
      }
    }
  }

  // Handle "Current Location" selection
  const handleCurrentLocation = () => {
    requestLocation()
    setInputValue('Current Location')
    setShowDropdown(false)
    // Don't call onLocationChange - let user press Enter to submit
  }

  // Handle place selection from autocomplete
  const handlePlaceSelect = async (placeId: string, description: string) => {
    if (!placesLibrary) return

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
        setInputValue(description)
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
        onFocus={() => {
          // Always show dropdown on focus (with Current Location option)
          setShowDropdown(true)
        }}
        onBlur={() => {
          // Delay hiding dropdown to allow clicking on items
          setTimeout(() => {
            setShowDropdown(false)
            setHoverText('')
          }, 200)
        }}
        placeholder="Enter location or zip"
        size={size}
        fullWidth={fullWidth}
        autoComplete="off"
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
            onClick={handleCurrentLocation}
            onMouseEnter={() => setHoverText('Current Location')}
            onMouseLeave={() => setHoverText('')}
            sx={{
              borderBottom: predictions.length > 0 ? '1px solid' : 'none',
              borderColor: 'divider',
              py: 1.5,
              px: 2,
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
          {predictions.map((prediction) => (
            <MenuItem
              key={prediction.place_id}
              onClick={() => handlePlaceSelect(prediction.place_id, prediction.description)}
              onMouseEnter={() => setHoverText(prediction.description)}
              onMouseLeave={() => setHoverText('')}
              sx={{
                py: 1.5,
                px: 2,
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

          {/* No results */}
          {inputValue.trim() && predictions.length === 0 && !loading && (
            <MenuItem disabled>
              <ListItemText
                primary="No locations found"
                secondary="Try a different search"
                primaryTypographyProps={{
                  sx: { textAlign: 'left' },
                }}
                secondaryTypographyProps={{
                  sx: { textAlign: 'left' },
                }}
              />
            </MenuItem>
          )}
        </div>
      )}
    </div>
  )
}
