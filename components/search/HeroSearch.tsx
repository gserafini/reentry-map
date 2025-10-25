'use client'

import { useState, FormEvent } from 'react'
import { TextField, Button, Box } from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { LocationInput } from './LocationInput'

/**
 * Hero section search component
 * Dual search: What + Where
 */
export function HeroSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Trim the search query
    const query = searchQuery.trim()

    // Navigate to search page with query
    if (query) {
      router.push(`/search?search=${encodeURIComponent(query)}`)
    } else {
      // If empty, just go to the search page
      router.push('/search')
    }
  }

  return (
    <Box
      id="hero-search"
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        gap: 0.5,
        maxWidth: 700,
        mx: 'auto',
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

      {/* Search button */}
      <Button
        type="submit"
        variant="contained"
        size="small"
        startIcon={<SearchIcon />}
        sx={{
          px: 2.5,
          py: 1.25,
          minWidth: 'auto',
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          fontWeight: 600,
          fontSize: '0.875rem',
          borderRadius: '18px',
        }}
      >
        Search
      </Button>
    </Box>
  )
}
