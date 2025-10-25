'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AppBar } from './AppBar'

interface ClientAppBarProps {
  authButton?: React.ReactNode
}

/**
 * Client wrapper for AppBar that handles search bar visibility:
 * - Homepage (mobile + desktop): Show search only when scrolled past hero (500px)
 * - Non-homepage (mobile + desktop): Always show search
 */
export function ClientAppBar({ authButton }: ClientAppBarProps) {
  const pathname = usePathname()
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

  // Homepage: show search only when scrolled
  // Non-homepage: always show search
  const showSearch = !isHomepage || isScrolled

  return <AppBar authButton={authButton} showSearch={showSearch} />
}
