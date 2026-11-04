/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window approach with automatic cleanup.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()
const MAX_ENTRIES = 10_000

// Clean up expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check if a request is within rate limits.
 * @param key - Unique identifier (e.g., IP address or IP+path)
 * @param limit - Maximum requests per window
 * @param windowMs - Time window in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  cleanup()

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    if (!entry && store.size >= MAX_ENTRIES) {
      for (const [storedKey, storedEntry] of store) {
        if (now > storedEntry.resetAt) store.delete(storedKey)
      }
    }
    if (!entry && store.size >= MAX_ENTRIES) {
      // Do not allocate another attacker-controlled key. Fail closed until an
      // existing window expires and cleanup can reclaim an entry.
      const earliestReset = Math.min(...Array.from(store.values(), (item) => item.resetAt))
      return { allowed: false, remaining: 0, resetAt: Math.max(now + 1, earliestReset) }
    }
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  entry.count++
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}
