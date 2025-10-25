'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { TextField, IconButton, InputAdornment, SxProps, Theme } from '@mui/material'
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material'

interface SearchBarProps {
  value?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  placeholder?: string
  debounceMs?: number
  showSearchIcon?: boolean
  sx?: SxProps<Theme>
  inputSx?: SxProps<Theme>
  size?: 'small' | 'medium'
}

/**
 * SearchBar component with debouncing and clear functionality
 *
 * Features:
 * - 300ms debounce (configurable)
 * - Clear button when text is present
 * - Optional search icon
 * - Form submission support
 * - Fully accessible
 */
export function SearchBar({
  value = '',
  onChange,
  onSubmit,
  placeholder = 'Search resources...',
  debounceMs = 300,
  showSearchIcon = true,
  sx,
  inputSx,
  size = 'small',
}: SearchBarProps) {
  const [query, setQuery] = useState<string>(value)

  // Sync external value changes
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Debounced onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onChange) {
        onChange(query)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, onChange, debounceMs])

  const handleClear = useCallback(() => {
    setQuery('')
    if (onChange) {
      onChange('')
    }
  }, [onChange])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (onSubmit) {
        onSubmit(query.trim())
      }
    },
    [query, onSubmit]
  )

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <TextField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        size={size}
        fullWidth
        inputProps={{
          'aria-label': 'Search resources',
        }}
        slotProps={{
          input: {
            startAdornment: showSearchIcon ? (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ) : null,
            endAdornment: query ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClear} aria-label="Clear search" edge="end">
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
            sx: inputSx,
          },
        }}
        sx={sx}
      />
    </form>
  )
}

export default SearchBar
