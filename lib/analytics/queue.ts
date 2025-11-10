/**
 * Analytics Queue - Zero-impact async event tracking
 *
 * Performance guarantees:
 * - track() call: <1ms (just array push)
 * - Flush: Non-blocking (requestIdleCallback or setTimeout)
 * - API call: Fire-and-forget (sendBeacon or fetch with keepalive)
 *
 * Usage:
 *   import { analytics } from '@/lib/analytics/queue'
 *   analytics.track('button_click', { button_id: 'submit' })
 */

interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  timestamp?: string
  client_timestamp?: number
  session_id?: string
  user_id?: string | null
  anonymous_id?: string
  page_path?: string
  referrer?: string
  viewport?: {
    width: number
    height: number
  }
  device?: {
    type: string
    browser: string
    os: string
  }
}

class AnalyticsQueue {
  private queue: AnalyticsEvent[] = []
  private isFlushing = false
  private maxBatchSize = 50
  private flushInterval = 5000 // 5 seconds
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    if (typeof window === 'undefined') return // Server-side guard

    // Automatically flush periodically
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval)

    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flushSync())
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushSync()
      }
    })
  }

  /**
   * Track event - returns IMMEDIATELY (<1ms)
   * Queues event for async processing
   */
  track(event: string, properties?: Record<string, any>): void {
    if (typeof window === 'undefined') return // Server-side guard

    // Add to queue synchronously (just array push, <1ms)
    this.queue.push({
      event,
      properties,
      client_timestamp: Date.now(),
      timestamp: new Date().toISOString(),
      session_id: this.getSessionId(),
      anonymous_id: this.getAnonymousId(),
      user_id: this.getUserId(),
      page_path: window.location.pathname,
      referrer: document.referrer || undefined,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      device: this.getDeviceInfo(),
    })

    // If queue is getting large, flush async
    if (this.queue.length >= this.maxBatchSize) {
      this.scheduleFlush()
    }
  }

  /**
   * Schedule async flush (non-blocking)
   * Uses requestIdleCallback for truly idle-time processing
   */
  private scheduleFlush(): void {
    if (this.isFlushing) return

    // Use requestIdleCallback if available (runs only when browser is idle)
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => this.flush(), { timeout: 2000 })
    } else {
      // Fallback: setTimeout (still non-blocking)
      setTimeout(() => this.flush(), 100)
    }
  }

  /**
   * Flush queue to server asynchronously
   */
  private async flush(): Promise<void> {
    if (this.queue.length === 0 || this.isFlushing) return

    this.isFlushing = true
    const batch = this.queue.splice(0, this.maxBatchSize)

    try {
      // Use sendBeacon for fire-and-forget (doesn't block, survives navigation)
      if ('sendBeacon' in navigator) {
        const blob = new Blob([JSON.stringify(batch)], {
          type: 'application/json',
        })
        const success = navigator.sendBeacon('/api/analytics/batch', blob)

        if (!success) {
          // Beacon failed (payload too large?), fallback to fetch
          await this.fetchFallback(batch)
        }
      } else {
        await this.fetchFallback(batch)
      }
    } catch (error) {
      // Silent failure - never let analytics break the app
      if (process.env.NODE_ENV === 'development') {
        console.debug('Analytics flush failed:', error)
      }
    } finally {
      this.isFlushing = false

      // If more events queued while we were flushing, schedule another flush
      if (this.queue.length > 0) {
        this.scheduleFlush()
      }
    }
  }

  /**
   * Fetch fallback (with keepalive for page navigation)
   */
  private async fetchFallback(batch: AnalyticsEvent[]): Promise<void> {
    await fetch('/api/analytics/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
      keepalive: true, // Survives page navigation
    })
  }

  /**
   * Synchronous flush (for page unload)
   */
  private flushSync(): void {
    if (this.queue.length === 0) return

    const batch = this.queue.splice(0)

    // Use sendBeacon for synchronous unload
    if ('sendBeacon' in navigator) {
      const blob = new Blob([JSON.stringify(batch)], {
        type: 'application/json',
      })
      navigator.sendBeacon('/api/analytics/batch', blob)
    }
  }

  /**
   * Get or create session ID (lasts until browser close)
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') return ''

    let sessionId = sessionStorage.getItem('analytics_session_id')
    if (!sessionId) {
      sessionId = this.generateId()
      sessionStorage.setItem('analytics_session_id', sessionId)
    }
    return sessionId
  }

  /**
   * Get or create anonymous ID (persists across sessions)
   */
  private getAnonymousId(): string {
    if (typeof window === 'undefined') return ''

    let anonymousId = localStorage.getItem('analytics_anonymous_id')
    if (!anonymousId) {
      anonymousId = this.generateId()
      localStorage.setItem('analytics_anonymous_id', anonymousId)
    }
    return anonymousId
  }

  /**
   * Get authenticated user ID if logged in
   */
  private getUserId(): string | null {
    // This will be set by the app when user signs in
    if (typeof window === 'undefined') return null
    return localStorage.getItem('analytics_user_id')
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): { type: string; browser: string; os: string } {
    if (typeof window === 'undefined') {
      return { type: 'unknown', browser: 'unknown', os: 'unknown' }
    }

    const ua = navigator.userAgent
    const width = window.innerWidth

    // Device type
    let type = 'desktop'
    if (width < 768) type = 'mobile'
    else if (width < 1024) type = 'tablet'

    // Browser
    let browser = 'unknown'
    if (ua.includes('Chrome')) browser = 'chrome'
    else if (ua.includes('Safari')) browser = 'safari'
    else if (ua.includes('Firefox')) browser = 'firefox'
    else if (ua.includes('Edge')) browser = 'edge'

    // OS
    let os = 'unknown'
    if (ua.includes('Win')) os = 'windows'
    else if (ua.includes('Mac')) os = 'macos'
    else if (ua.includes('Linux')) os = 'linux'
    else if (ua.includes('Android')) os = 'android'
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad'))
      os = 'ios'

    return { type, browser, os }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Cleanup (for testing)
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
  }
}

// Singleton instance
export const analytics = new AnalyticsQueue()

// Convenience function
export function track(eventName: string, properties?: Record<string, any>): void {
  analytics.track(eventName, properties)
}

// Set user ID when user signs in
export function identifyUser(userId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('analytics_user_id', userId)
  }
}

// Clear user ID when user signs out
export function clearUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('analytics_user_id')
  }
}
