'use client'

import { useState, useEffect } from 'react'
import { BottomNavigation, BottomNavigationAction, Paper, Box } from '@mui/material'
import {
  Home as HomeIcon,
  Search as SearchIcon,
  Favorite as FavoriteIcon,
  Person as PersonIcon,
} from '@mui/icons-material'
import { usePathname, useRouter } from 'next/navigation'

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [value, setValue] = useState(0)

  // Update active tab based on current route
  useEffect(() => {
    if (pathname === '/') setValue(0)
    else if (pathname?.startsWith('/resources')) setValue(1)
    else if (pathname?.startsWith('/favorites')) setValue(2)
    else if (pathname?.startsWith('/protected') || pathname?.startsWith('/auth')) setValue(3)
  }, [pathname])

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)

    // Navigate based on selected tab
    switch (newValue) {
      case 0:
        router.push('/')
        break
      case 1:
        router.push('/resources')
        break
      case 2:
        router.push('/favorites')
        break
      case 3:
        router.push('/protected')
        break
    }
  }

  return (
    <Box sx={{ display: { xs: 'block', md: 'none' } }}>
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
        elevation={3}
      >
        <BottomNavigation value={value} onChange={handleChange} showLabels>
          <BottomNavigationAction label="Home" icon={<HomeIcon />} />
          <BottomNavigationAction label="Search" icon={<SearchIcon />} />
          <BottomNavigationAction label="Favorites" icon={<FavoriteIcon />} />
          <BottomNavigationAction label="Account" icon={<PersonIcon />} />
        </BottomNavigation>
      </Paper>
      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <Box sx={{ height: 56 }} />
    </Box>
  )
}
