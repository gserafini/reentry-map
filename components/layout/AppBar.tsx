'use client'

import { AppBar as MuiAppBar, Toolbar, IconButton, Box, Container, Button } from '@mui/material'
import { Menu as MenuIcon, Search as SearchIcon } from '@mui/icons-material'
import Link from 'next/link'
import Image from 'next/image'
import { theme } from '@/lib/theme'

interface AppBarProps {
  authButton?: React.ReactNode
}

export function AppBar({ authButton }: AppBarProps) {
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

          {/* Right side actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Link
              href="/resources?search=true"
              aria-label="Search resources"
              style={{ textDecoration: 'none' }}
            >
              <IconButton color="inherit" sx={{ display: { xs: 'flex', sm: 'none' } }}>
                <SearchIcon />
              </IconButton>
            </Link>

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
    </MuiAppBar>
  )
}
