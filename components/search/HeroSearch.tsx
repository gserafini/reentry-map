'use client'

import { useState, FormEvent } from 'react'
import { TextField, Button, Box } from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { useRouter } from 'next/navigation'

/**
 * Hero section search component
 * Allows users to search for resources from the homepage
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
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        gap: 0.5,
        maxWidth: 600,
        mx: 'auto',
        bgcolor: 'background.paper',
        p: '6px',
        borderRadius: 2,
        boxShadow: 1,
      }}
    >
      <TextField
        fullWidth
        placeholder="Search for resources..."
        variant="outlined"
        size="small"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: 'background.paper',
            '& fieldset': {
              border: 'none',
            },
            '& input': {
              py: 1.25,
            },
          },
        }}
      />
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
        }}
      >
        Search
      </Button>
    </Box>
  )
}
