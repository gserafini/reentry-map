'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { TextField, IconButton, InputAdornment, SxProps, Theme } from '@mui/material'
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material'
import { CategoryDropdown } from './CategoryDropdown'

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
  showCategoryDropdown?: boolean
}

/**
 * SearchBar component with debouncing and clear functionality
 *
 * Features:
 * - 300ms debounce (configurable)
 * - Clear button when text is present
 * - Optional search icon
 * - Form submission support
 * - Optional category dropdown
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
  showCategoryDropdown = false,
}: SearchBarProps) {
  const [query, setQuery] = useState<string>(value)
  const [showDropdown, setShowDropdown] = useState(false)
  const [hoverText, setHoverText] = useState('')

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

  const displayValue = hoverText || query

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <TextField
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value)
            setHoverText('')
          }}
          onFocus={() => {
            if (showCategoryDropdown) {
              setShowDropdown(true)
            }
          }}
          onBlur={() => {
            // Delay hiding dropdown to allow clicking on items
            setTimeout(() => {
              setShowDropdown(false)
              setHoverText('')
            }, 200)
          }}
          placeholder={placeholder}
          size={size}
          fullWidth
          autoComplete="off"
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
                  <IconButton
                    size="small"
                    onClick={handleClear}
                    aria-label="Clear search"
                    edge="end"
                  >
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

      {/* Category Dropdown */}
      {showCategoryDropdown && showDropdown && (
        <CategoryDropdown
          onHover={setHoverText}
          onSelect={(text) => {
            setQuery(text)
            setHoverText('')
          }}
          onClose={() => {
            setShowDropdown(false)
            setHoverText('')
          }}
        />
      )}
    </div>
  )
}

export default SearchBar
