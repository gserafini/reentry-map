'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { analytics } from '@/lib/analytics/queue'

interface PageViewTrackerProps {
  pageTitle?: string
  loadTimeMs?: number
}

/**
 * Client component to track page views
 * Should be included in every page layout or page component
 */
export function PageViewTracker({ pageTitle, loadTimeMs }: PageViewTrackerProps) {
  const pathname = usePathname()

  useEffect(() => {
    // Track page view when component mounts
    const startTime = performance.now()

    analytics.track('page_view', {
      page_title: pageTitle || document.title,
      load_time_ms: loadTimeMs || Math.round(startTime),
    })

    // Log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Page view tracked:', {
        page_title: pageTitle || document.title,
        pathname,
      })
    }
  }, [pathname, pageTitle, loadTimeMs])

  return null // This component renders nothing
}
