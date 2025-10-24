'use client'

import React, { useState, useEffect } from 'react'
import { TextField, Button, Box } from '@mui/material'

interface SearchBarProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
}

export function SearchBar({
  value = '',
  onChange,
  placeholder = 'Search resources...',
}: SearchBarProps) {
  const [query, setQuery] = useState<string>(value)

  useEffect(() => {
    const t = setTimeout(() => onChange?.(query), 300)
    return () => clearTimeout(t)
  }, [query, onChange])

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }} role="search">
      <TextField
        aria-label="Search resources"
        placeholder={placeholder}
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
        fullWidth
        size="small"
        variant="outlined"
      />
      {query && (
        <Button size="small" variant="text" onClick={() => setQuery('')} aria-label="Clear search">
          Clear
        </Button>
      )}
    </Box>
  )
}

export default SearchBar
