'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { analytics } from '@/lib/analytics/queue'

interface ResourceViewTrackerProps {
  resourceId: string
  resourceName: string
}

/**
 * Client component to track resource detail page views
 * Includes source attribution based on referrer
 */
export function ResourceViewTracker({ resourceId, resourceName }: ResourceViewTrackerProps) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const startTime = performance.now()
    let source: 'search' | 'map' | 'category' | 'favorite' | 'direct' = 'direct'

    // Determine source from query params or referrer
    const refSource = searchParams.get('source')
    if (refSource === 'search' || refSource === 'map' || refSource === 'category') {
      source = refSource
    } else {
      // Infer from referrer if not explicitly set
      const referrer = document.referrer
      if (referrer.includes('/search') || referrer.includes('?q=')) {
        source = 'search'
      } else if (referrer.includes('/category/') || referrer.includes('/tag/')) {
        source = 'category'
      } else if (referrer.includes('/favorites')) {
        source = 'favorite'
      }
    }

    // Track resource view
    analytics.track('resource_view', {
      resource_id: resourceId,
      source,
    })

    // Track page view as well
    analytics.track('page_view', {
      page_title: `${resourceName} | Reentry Resources`,
      load_time_ms: Math.round(startTime),
    })

    // Track scroll depth on unmount
    let maxScrollDepth = 0
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0
      maxScrollDepth = Math.max(maxScrollDepth, scrollPercent)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)

      // Track scroll depth when user leaves page
      if (maxScrollDepth > 0) {
        const timeSpent = Math.round((performance.now() - startTime) / 1000) // Convert to seconds

        analytics.track('resource_view', {
          resource_id: resourceId,
          source,
          scroll_depth_percent: maxScrollDepth,
          time_spent_seconds: timeSpent,
        })
      }
    }
  }, [resourceId, resourceName, searchParams])

  return null
}
