'use client'

import { useState } from 'react'
import {
  AppBar as MuiAppBar,
  Toolbar,
  IconButton,
  Box,
  Container,
  Button,
  Drawer,
  Stack,
} from '@mui/material'
import { Menu as MenuIcon, Close } from '@mui/icons-material'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { theme } from '@/lib/theme'
import { HeroSearch } from '@/components/search/HeroSearch'

interface AppBarProps {
  authButton?: React.ReactNode
  showSearch?: boolean
  isAuthenticated?: boolean
}
const links = [
  { href: '/resources', label: 'Resources' },
  { href: '/favorites', label: 'Saved resources' },
  { href: '/suggest-resource', label: 'Suggest a resource' },
]

export function AppBar({ authButton, showSearch = false }: AppBarProps) {
  const params = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <>
      <MuiAppBar
        position="sticky"
        elevation={1}
        sx={{ bgcolor: theme.colors.brand, color: theme.colors.brandText }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 1, minHeight: { xs: 60, md: 64 } }}>
            <Link
              href="/"
              aria-label="Reentry Map home"
              style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >
              <Image
                src="/ReentryMap_logo_400x100.png"
                alt="Reentry Map"
                width={180}
                height={45}
                priority
                style={{ objectFit: 'contain', height: 'auto' }}
              />
            </Link>
            <Box sx={{ flex: 1 }} />
            <Box
              component="nav"
              aria-label="Main navigation"
              sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}
            >
              {links.map((link) => (
                <Button key={link.href} component={Link} href={link.href} color="inherit">
                  {link.label}
                </Button>
              ))}
            </Box>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>{authButton}</Box>
            <IconButton
              color="inherit"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              sx={{ display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </Container>
        {showSearch && (
          <Box sx={{ bgcolor: '#f5f5f5', borderTop: '1px solid rgba(0,0,0,.08)' }}>
            <Container maxWidth="lg" sx={{ py: 1 }}>
              <HeroSearch initialValue={params.get('search') || ''} />
            </Container>
          </Box>
        )}
      </MuiAppBar>
      <Drawer anchor="right" open={menuOpen} onClose={() => setMenuOpen(false)}>
        <Box sx={{ width: 280, p: 2 }}>
          <Box sx={{ textAlign: 'right' }}>
            <IconButton aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              <Close />
            </IconButton>
          </Box>
          <Stack component="nav" aria-label="Mobile navigation" spacing={1}>
            {links.map((link) => (
              <Button
                key={link.href}
                component={Link}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                sx={{ justifyContent: 'flex-start', minHeight: 48 }}
              >
                {link.label}
              </Button>
            ))}
            {authButton}
          </Stack>
        </Box>
      </Drawer>
    </>
  )
}
