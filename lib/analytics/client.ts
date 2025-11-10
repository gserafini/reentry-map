/**
 * Analytics Client - Convenience functions for tracking
 *
 * Import and use anywhere in your app:
 *   import { trackPageView, trackSearch, trackResourceView } from '@/lib/analytics/client'
 */

import { track } from './queue'

/**
 * Track page view
 * Call in layout or page components
 */
export function trackPageView(pageTitle?: string, loadTimeMs?: number) {
  track('page_view', {
    page_title: pageTitle || document.title,
    load_time_ms: loadTimeMs,
  })
}

/**
 * Track search
 */
export function trackSearch(
  query: string,
  filters: Record<string, any>,
  resultsCount: number
) {
  track('search', {
    query,
    filters,
    results_count: resultsCount,
  })
}

/**
 * Track resource view
 */
export function trackResourceView(
  resourceId: string,
  source: 'search' | 'map' | 'category' | 'favorite' | 'direct'
) {
  track('resource_view', {
    resource_id: resourceId,
    source,
  })
}

/**
 * Track resource action
 */
export function trackResourceAction(
  resourceId: string,
  action: 'call' | 'directions' | 'website' | 'favorite_add' | 'favorite_remove'
) {
  track(`resource_${action}`, {
    resource_id: resourceId,
  })
}

/**
 * Track map interaction
 */
export function trackMapMove(
  centerLat: number,
  centerLng: number,
  zoomLevel: number,
  visibleMarkers: number
) {
  track('map_move', {
    center_lat: centerLat,
    center_lng: centerLng,
    zoom_level: zoomLevel,
    visible_markers: visibleMarkers,
  })
}

/**
 * Track feature usage
 */
export function trackFeatureUse(
  featureName: string,
  metadata?: Record<string, any>
) {
  track(`feature_${featureName}`, {
    event_type: 'use',
    ...metadata,
  })
}

/**
 * Track error
 */
export function trackError(
  errorMessage: string,
  errorStack?: string,
  metadata?: Record<string, any>
) {
  track('error', {
    error_message: errorMessage,
    error_stack: errorStack,
    ...metadata,
  })
}

/**
 * Track performance metric
 */
export function trackPerformance(metricName: string, metricValue: number) {
  track('performance', {
    metric_name: metricName,
    metric_value: metricValue,
  })
}

/**
 * Automatic error tracking
 * Call this once in your root layout
 */
export function setupErrorTracking() {
  if (typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    trackError(event.message, event.error?.stack, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    trackError(
      `Unhandled promise rejection: ${event.reason}`,
      event.reason?.stack
    )
  })
}

/**
 * Automatic performance tracking
 * Call this once in your root layout
 */
export function setupPerformanceTracking() {
  if (typeof window === 'undefined') return
  if (!('PerformanceObserver' in window)) return

  // Track Core Web Vitals
  try {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as any
      trackPerformance('lcp', Math.round(lastEntry.renderTime || lastEntry.loadTime))
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries() as any
      entries.forEach((entry: any) => {
        trackPerformance('fid', Math.round(entry.processingStart - entry.startTime))
      })
    })
    fidObserver.observe({ type: 'first-input', buffered: true })

    // Cumulative Layout Shift (CLS)
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries() as any
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      })
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })

    // Report CLS on page hide
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        trackPerformance('cls', Math.round(clsValue * 1000) / 1000)
      }
    })
  } catch (error) {
    // Performance Observer not supported, skip
  }
}
