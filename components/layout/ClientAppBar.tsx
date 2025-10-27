'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AppBar } from './AppBar'

interface ClientAppBarProps {
  authButton?: React.ReactNode
  isAuthenticated?: boolean
}

/**
 * Client wrapper for AppBar that handles search bar visibility:
 * - Homepage: Show header search only when hero search is scrolled out of view
 * - Non-homepage: Always show header search
 *
 * Uses IntersectionObserver to detect when hero search (#hero-search) is visible
 */
export function ClientAppBar({ authButton, isAuthenticated = false }: ClientAppBarProps) {
  const pathname = usePathname()
  const isHomepage = pathname === '/'
  const [heroSearchVisible, setHeroSearchVisible] = useState(isHomepage)

  useEffect(() => {
    if (!isHomepage) {
      setHeroSearchVisible(false)
      return
    }

    let observer: IntersectionObserver | null = null

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const heroSearch = document.getElementById('hero-search')
      if (!heroSearch) {
        console.warn('Hero search element #hero-search not found')
        return
      }

      // Create intersection observer to watch hero search visibility
      observer = new IntersectionObserver(
        ([entry]) => {
          // When hero search is visible, hide header search
          // When hero search is hidden, show header search
          setHeroSearchVisible(entry.isIntersecting)
        },
        {
          // Trigger when any part of the hero search enters/leaves viewport
          threshold: 0,
          // Use viewport as root
          root: null,
          // Small margin to trigger slightly before element completely leaves
          rootMargin: '-10px',
        }
      )

      observer.observe(heroSearch)
    }, 100)

    // Cleanup function
    return () => {
      clearTimeout(timer)
      if (observer) {
        observer.disconnect()
      }
    }
  }, [isHomepage])

  // Homepage: show header search only when hero search is not visible
  // Non-homepage: always show header search
  const showSearch = !isHomepage || !heroSearchVisible

  return (
    <AppBar authButton={authButton} showSearch={showSearch} isAuthenticated={isAuthenticated} />
  )
}
