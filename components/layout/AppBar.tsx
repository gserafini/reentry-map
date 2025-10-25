'use client'

import { AppBar as MuiAppBar, Toolbar, IconButton, Box, Container, Button } from '@mui/material'
import { Menu as MenuIcon } from '@mui/icons-material'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { theme } from '@/lib/theme'
import { HeroSearch } from '@/components/search/HeroSearch'

interface AppBarProps {
  authButton?: React.ReactNode
  showSearch?: boolean
}

export function AppBar({ authButton, showSearch = false }: AppBarProps) {
  const searchParams = useSearchParams()

  // Read current search query from URL to populate search input
  const currentSearch = searchParams.get('search') || ''

  return (
    <MuiAppBar
      position="sticky"
      elevation={1}
      sx={{ bgcolor: theme.colors.brand, color: theme.colors.brandText }}
    >
      {/* First row: Logo, Navigation, Auth */}
      <Container maxWidth="lg">
        <Toolbar
          disableGutters
          sx={{
            gap: 2,
            color: theme.colors.brandText,
            minHeight: { xs: 64, md: 80 },
            py: 1.5,
          }}
        >
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
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              gap: 1,
              flexGrow: showSearch ? 0 : 1,
              ml: 4,
            }}
          >
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

          {/* HeroSearch - Desktop only (inline with toolbar) */}
          {showSearch && (
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                flexGrow: 1,
                maxWidth: 700,
                mx: 2,
              }}
            >
              <HeroSearch initialValue={currentSearch} />
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
      </Container>

      {/* Second row: Mobile search (full-width grey bar below yellow header) */}
      {showSearch && (
        <Box
          sx={{
            display: { xs: 'block', md: 'none' },
            bgcolor: '#f5f5f5', // Light grey background
            borderTop: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <Container maxWidth="lg" sx={{ py: 2 }}>
            <HeroSearch initialValue={currentSearch} />
          </Container>
        </Box>
      )}
    </MuiAppBar>
  )
}
