'use client'

import { useState, useRef, useEffect } from 'react'
import { TextField, MenuItem, ListItemIcon, ListItemText, CircularProgress } from '@mui/material'
import { MyLocation as MyLocationIcon, Place as PlaceIcon } from '@mui/icons-material'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { useUserLocation } from '@/lib/context/LocationContext'
import { env } from '@/lib/env'

interface LocationInputProps {
  onLocationChange?: () => void
  fullWidth?: boolean
  size?: 'small' | 'medium'
}

/**
 * LocationInput with "Current Location" option and Google Places Autocomplete
 * Yelp-style location picker for header search
 */
export function LocationInput({
  onLocationChange,
  fullWidth = false,
  size = 'medium',
}: LocationInputProps) {
  const { displayName, requestLocation, setManualLocation, loading } = useUserLocation()
  const [inputValue, setInputValue] = useState('')
  const [autocompleteService, setAutocompleteService] =
    useState<google.maps.places.AutocompleteService | null>(null)
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null)
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
    if (window.google?.maps?.places) {
      setAutocompleteService(new google.maps.places.AutocompleteService())
      const dummyDiv = document.createElement('div')
      setPlacesService(new google.maps.places.PlacesService(dummyDiv))
      return
    }

    // Use new functional API - must set options before importing library
    setOptions({ key: apiKey, v: 'weekly' })

    importLibrary('places')
      .then(() => {
        if (window.google?.maps?.places) {
          setAutocompleteService(new google.maps.places.AutocompleteService())
          // Create a dummy div for PlacesService (it needs a map or div)
          const dummyDiv = document.createElement('div')
          setPlacesService(new google.maps.places.PlacesService(dummyDiv))
        }
      })
      .catch((err: Error) => {
        console.error('Error loading Google Maps:', err)
      })
  }, [])

  // Update input value when displayName changes
  useEffect(() => {
    if (displayName) {
      setInputValue(displayName)
    }
  }, [displayName])

  // Handle input change and fetch predictions
  const handleInputChange = (value: string) => {
    setInputValue(value)

    if (!value.trim()) {
      setPredictions([])
      setShowDropdown(false)
      return
    }

    setShowDropdown(true)

    if (autocompleteService) {
      autocompleteService.getPlacePredictions(
        {
          input: value,
          types: ['geocode'], // Cities, addresses, postal codes
          componentRestrictions: { country: 'us' }, // US only for now
        },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results)
          } else {
            setPredictions([])
          }
        }
      )
    }
  }

  // Handle "Current Location" selection
  const handleCurrentLocation = () => {
    requestLocation()
    setShowDropdown(false)
    onLocationChange?.()
  }

  // Handle place selection from autocomplete
  const handlePlaceSelect = (placeId: string, description: string) => {
    if (!placesService) return

    placesService.getDetails(
      {
        placeId,
        fields: ['geometry', 'name', 'formatted_address'],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const coords = {
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
          }

          // Use description as display name (e.g., "Oakland, CA" or "94601")
          setManualLocation(coords, description)
          setInputValue(description)
          setShowDropdown(false)
          setPredictions([])
          onLocationChange?.()
        }
      }
    )
  }

  return (
    <div style={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
      <TextField
        ref={inputRef}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (predictions.length > 0 || inputValue.trim()) {
            setShowDropdown(true)
          }
        }}
        onBlur={() => {
          // Delay hiding dropdown to allow clicking on items
          setTimeout(() => setShowDropdown(false), 200)
        }}
        placeholder="Enter location or zip"
        size={size}
        fullWidth={fullWidth}
        InputProps={{
          endAdornment: loading ? <CircularProgress size={20} /> : null,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'background.paper',
          },
        }}
      />

      {/* Dropdown */}
      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300,
            marginTop: '4px',
            backgroundColor: 'white',
            borderRadius: '4px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {/* Current Location option - always show first */}
          <MenuItem
            onClick={handleCurrentLocation}
            sx={{
              borderBottom: predictions.length > 0 ? '1px solid' : 'none',
              borderColor: 'divider',
            }}
          >
            <ListItemIcon>
              <MyLocationIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Current Location" secondary="Use my current location" />
          </MenuItem>

          {/* Autocomplete predictions */}
          {predictions.map((prediction) => (
            <MenuItem
              key={prediction.place_id}
              onClick={() => handlePlaceSelect(prediction.place_id, prediction.description)}
            >
              <ListItemIcon>
                <PlaceIcon />
              </ListItemIcon>
              <ListItemText
                primary={prediction.structured_formatting.main_text}
                secondary={prediction.structured_formatting.secondary_text}
              />
            </MenuItem>
          ))}

          {/* No results */}
          {inputValue.trim() && predictions.length === 0 && !loading && (
            <MenuItem disabled>
              <ListItemText primary="No locations found" secondary="Try a different search" />
            </MenuItem>
          )}
        </div>
      )}
    </div>
  )
}
