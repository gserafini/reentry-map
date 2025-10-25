'use client'

import { useState } from 'react'
import {
  AppBar as MuiAppBar,
  Toolbar,
  IconButton,
  Box,
  Container,
  Button,
  TextField,
  InputAdornment,
} from '@mui/material'
import { Menu as MenuIcon, Search as SearchIcon } from '@mui/icons-material'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { theme } from '@/lib/theme'

interface AppBarProps {
  authButton?: React.ReactNode
  showSearch?: boolean
}

export function AppBar({ authButton, showSearch = false }: AppBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/resources?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }
  return (
    <MuiAppBar
      position="sticky"
      elevation={1}
      sx={{ bgcolor: theme.colors.brand, color: theme.colors.brandText }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ gap: 2, color: theme.colors.brandText }}>
          {/* Logo / Brand */}
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                height: 50,
                flexGrow: { xs: 1, sm: 0 },
              }}
            >
              <Image
                src="/ReentryMap_logo_400x100.png"
                alt="Reentry Map"
                width={200}
                height={50}
                priority
                style={{
                  objectFit: 'contain',
                  height: 'auto',
                  maxHeight: '50px',
                }}
              />
            </Box>
          </Link>

          {/* Desktop Navigation */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, flexGrow: 1, ml: 4 }}>
            <Link href="/resources" style={{ textDecoration: 'none' }}>
              <Button color="inherit">Resources</Button>
            </Link>
            <Link href="/favorites" style={{ textDecoration: 'none' }}>
              <Button color="inherit">Favorites</Button>
            </Link>
            <Link href="/suggest-resource" style={{ textDecoration: 'none' }}>
              <Button color="inherit">Suggest</Button>
            </Link>
          </Box>

          {/* Search bar (desktop) */}
          {showSearch && (
            <Box
              component="form"
              onSubmit={handleSearch}
              sx={{ display: { xs: 'none', md: 'block' }, flexGrow: 1, maxWidth: 400, mx: 2 }}
            >
              <TextField
                size="small"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  sx: {
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.25)' },
                    '&.Mui-focused': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
                  },
                }}
              />
            </Box>
          )}

          {/* Right side actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>{authButton}</Box>

            {/* Mobile menu button */}
            <IconButton
              color="inherit"
              aria-label="menu"
              sx={{ display: { xs: 'flex', md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>

        {/* Mobile search bar (second row on mobile) */}
        {showSearch && (
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{
              display: { xs: 'block', md: 'none' },
              pb: 1.5,
              pt: 0.5,
            }}
          >
            <TextField
              size="small"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.25)' },
                  '&.Mui-focused': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
                },
              }}
            />
          </Box>
        )}
      </Container>
    </MuiAppBar>
  )
}
