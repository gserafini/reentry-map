'use client'

import { AppBar as MuiAppBar, Toolbar, IconButton, Box, Container, Button } from '@mui/material'
import { Menu as MenuIcon } from '@mui/icons-material'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { theme } from '@/lib/theme'
import { SearchBar } from '@/components/search/SearchBar'
import { LocationInput } from '@/components/search/LocationInput'

interface AppBarProps {
  authButton?: React.ReactNode
  showSearch?: boolean
}

export function AppBar({ authButton, showSearch = false }: AppBarProps) {
  const router = useRouter()

  const handleSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/search?search=${encodeURIComponent(query.trim())}`)
    } else {
      // If empty search, go to search page
      router.push('/search')
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

          {/* Dual search (desktop) - Yelp style: What + Where */}
          {showSearch && (
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                flexGrow: 1,
                maxWidth: 600,
                mx: 2,
                gap: 1,
              }}
            >
              <Box sx={{ flex: '1 1 60%' }}>
                <SearchBar
                  onSubmit={handleSearch}
                  placeholder="What are you looking for?"
                  inputSx={{
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.25)' },
                    '&.Mui-focused': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
                  }}
                />
              </Box>
              <Box sx={{ flex: '1 1 40%' }}>
                <LocationInput
                  onLocationChange={() => {
                    // Re-trigger search when location changes
                    // This will update distance sorting if user is on search page
                  }}
                  size="small"
                  fullWidth
                />
              </Box>
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

        {/* Mobile dual search (second row on mobile) */}
        {showSearch && (
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              flexDirection: 'column',
              gap: 1,
              pb: 1.5,
              pt: 0.5,
            }}
          >
            <SearchBar
              onSubmit={handleSearch}
              placeholder="What are you looking for?"
              inputSx={{
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.25)' },
                '&.Mui-focused': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
              }}
            />
            <LocationInput
              onLocationChange={() => {
                // Re-trigger search when location changes
              }}
              size="small"
              fullWidth
            />
          </Box>
        )}
      </Container>
    </MuiAppBar>
  )
}
