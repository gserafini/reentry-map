'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useMediaQuery, useTheme } from '@mui/material'
import { AppBar } from './AppBar'

interface ClientAppBarProps {
  authButton?: React.ReactNode
}

/**
 * Client wrapper for AppBar that handles:
 * - Mobile: Always show search bar as second row
 * - Desktop: Show search on all pages except homepage
 * - Desktop homepage: Show search when scrolled past hero (500px)
 */
export function ClientAppBar({ authButton }: ClientAppBarProps) {
  const pathname = usePathname()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isHomepage = pathname === '/'
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    if (!isHomepage) return

    const handleScroll = () => {
      // Show search bar when scrolled past hero section (approximately 500px)
      setIsScrolled(window.scrollY > 500)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isHomepage])

  // Mobile: always show search
  // Desktop: show if not homepage OR if homepage and scrolled
  const showSearch = isMobile || !isHomepage || isScrolled

  return <AppBar authButton={authButton} showSearch={showSearch} />
}
