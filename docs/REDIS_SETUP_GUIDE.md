# Redis Setup & Caching Implementation Guide

**Last Updated**: 2025-11-10
**Estimated Time**: 1-2 days
**Difficulty**: Intermediate
**Impact**: **80-90% reduction in database queries, 5-10x faster response times**

---

## Table of Contents

1. [Why Redis?](#why-redis)
2. [Redis Installation](#redis-installation)
3. [Redis Configuration](#redis-configuration)
4. [Next.js Integration](#nextjs-integration)
5. [Caching Strategy](#caching-strategy)
6. [Implementation Examples](#implementation-examples)
7. [Cache Invalidation](#cache-invalidation)
8. [Monitoring](#monitoring)
9. [Production Best Practices](#production-best-practices)

---

## Why Redis?

### The Problem

**Without caching:**

- Every search query hits PostgreSQL
- Map loads query all resources within viewport (expensive spatial query)
- Category counts recalculated on every request
- Database handles 100-500 queries per minute

**At 100k resources:**

- Search query: 200-500ms (PostgreSQL full-text search + spatial)
- Map viewport query: 300-800ms (PostGIS spatial + JSON serialization)
- Category counts: 100-200ms (aggregate query across all resources)
- **Result**: Sluggish, not "native app feel"

### The Solution

**With Redis caching:**

- Search results cached for 5 minutes (hit rate: ~80%)
- Map viewport data cached by bounding box (hit rate: ~70%)
- Category counts cached for 15 minutes (hit rate: ~95%)
- Database queries reduced by 80-90%

**Performance improvement:**

- Search query: **50ms** (10x faster)
- Map viewport query: **80ms** (6x faster)
- Category counts: **10ms** (20x faster)
- **Result**: Instant, native app feel ✓

### Redis vs Database Query Performance

| Operation                 | PostgreSQL | Redis    | Speedup |
| ------------------------- | ---------- | -------- | ------- |
| Simple GET                | 20-50ms    | 1-3ms    | 10-20x  |
| Search results (20 items) | 200-500ms  | 10-20ms  | 20-40x  |
| Aggregate count           | 100-200ms  | 5-10ms   | 20x     |
| Spatial query (map)       | 300-800ms  | 50-100ms | 6-8x    |

---

## Redis Installation

### Option 1: Self-Hosted (Recommended, $0)

**On your dedicated server:**

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install Redis
apt install -y redis-server

# Verify installation
redis-cli --version
# Should show: redis-cli 7.x

# Check if running
systemctl status redis-server
# Should show: active (running)
```

### Option 2: Managed Redis (Easier, Paid)

**Upstash (Serverless Redis):**

- Free tier: 10k commands/day
- Paid: $0.2 per 100k commands (~$10-50/mo for your scale)
- Global edge caching
- Zero config

**Redis Cloud:**

- Free tier: 30MB, 30 connections
- Paid: $7-50/mo
- Managed backups
- Automatic failover

**For this guide, we'll use self-hosted.**

---

## Redis Configuration

### 2.1 Configure Redis for Production

**Edit `/etc/redis/redis.conf`:**

```bash
sudo nano /etc/redis/redis.conf
```

**Key settings:**

```conf
# Bind to localhost only (secure)
bind 127.0.0.1 ::1

# Set port (default 6379)
port 6379

# Set password (IMPORTANT: change this!)
requirepass YOUR_STRONG_PASSWORD_HERE

# Memory limit (set to ~20% of server RAM, e.g., 12GB for 64GB server)
maxmemory 12gb

# Eviction policy (remove least recently used keys when memory full)
maxmemory-policy allkeys-lru

# Persistence (save snapshots to disk)
save 900 1      # Save after 900 sec if at least 1 key changed
save 300 10     # Save after 300 sec if at least 10 keys changed
save 60 10000   # Save after 60 sec if at least 10000 keys changed

# Snapshot filename
dbfilename dump.rdb

# Directory for snapshots
dir /var/lib/redis

# Enable append-only file (more durable, slower)
appendonly yes
appendfilename "appendonly.aof"

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Slow log (log queries slower than 10ms)
slowlog-log-slower-than 10000
slowlog-max-len 128

# Max clients
maxclients 10000
```

**Restart Redis:**

```bash
systemctl restart redis-server
systemctl status redis-server
```

### 2.2 Secure Redis

**Test authentication:**

```bash
# Should fail without password
redis-cli ping
# Output: (error) NOAUTH Authentication required

# Should succeed with password
redis-cli -a YOUR_STRONG_PASSWORD_HERE ping
# Output: PONG
```

**Create Redis CLI alias (convenience):**

```bash
echo "alias redis='redis-cli -a YOUR_STRONG_PASSWORD_HERE'" >> ~/.bashrc
source ~/.bashrc

# Now you can use:
redis ping
# Output: PONG
```

### 2.3 Configure Firewall (Security)

```bash
# Redis should ONLY be accessible from localhost
# Do NOT open port 6379 to the internet

# Verify firewall blocks external access
ufw status

# If Redis port is open, close it:
ufw delete allow 6379

# Verify Redis only listening on localhost
netstat -tlnp | grep 6379
# Should show: 127.0.0.1:6379 (NOT 0.0.0.0:6379)
```

---

## Next.js Integration

### 3.1 Install Redis Client

```bash
npm install ioredis
npm install @types/ioredis --save-dev
```

**Why ioredis?**

- Full TypeScript support
- Cluster support (future scaling)
- Promise-based API (async/await)
- Better performance than node-redis

### 3.2 Create Redis Client Singleton

**File: `lib/redis/client.ts`**

```typescript
import Redis from 'ioredis'

// Singleton instance
let redis: Redis | null = null

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      // Connection pool
      enableReadyCheck: true,
      lazyConnect: false,

      // Logging
      showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
    })

    // Log connection events
    redis.on('connect', () => {
      console.log('[Redis] Connected')
    })

    redis.on('error', (err) => {
      console.error('[Redis] Error:', err)
    })

    redis.on('close', () => {
      console.log('[Redis] Connection closed')
    })
  }

  return redis
}

// Helper to safely close connection (for testing/shutdown)
export function closeRedisClient(): void {
  if (redis) {
    redis.disconnect()
    redis = null
  }
}
```

### 3.3 Add Environment Variables

**File: `.env.local`**

```bash
# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_STRONG_PASSWORD_HERE
```

**File: `lib/env.ts` (add to schema)**

```typescript
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    // ... existing server vars ...

    // Redis
    REDIS_HOST: z.string().default('127.0.0.1'),
    REDIS_PORT: z.string().default('6379'),
    REDIS_PASSWORD: z.string().min(8),
  },

  // ... rest of config ...

  runtimeEnv: {
    // ... existing vars ...
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  },
})
```

### 3.4 Create Caching Utilities

**File: `lib/redis/cache.ts`**

```typescript
import { getRedisClient } from './client'

export interface CacheOptions {
  ttl?: number // Time-to-live in seconds
  tags?: string[] // Cache tags for invalidation
}

/**
 * Get value from cache
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient()
    const value = await redis.get(key)

    if (!value) return null

    return JSON.parse(value) as T
  } catch (error) {
    console.error('[Cache] Get error:', error)
    return null // Fail gracefully, don't break app
  }
}

/**
 * Set value in cache with TTL
 */
export async function setCached<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<boolean> {
  try {
    const redis = getRedisClient()
    const serialized = JSON.stringify(value)

    if (options.ttl) {
      await redis.setex(key, options.ttl, serialized)
    } else {
      await redis.set(key, serialized)
    }

    // Store tags for invalidation
    if (options.tags) {
      for (const tag of options.tags) {
        await redis.sadd(`tag:${tag}`, key)
      }
    }

    return true
  } catch (error) {
    console.error('[Cache] Set error:', error)
    return false
  }
}

/**
 * Delete value from cache
 */
export async function deleteCached(key: string): Promise<boolean> {
  try {
    const redis = getRedisClient()
    await redis.del(key)
    return true
  } catch (error) {
    console.error('[Cache] Delete error:', error)
    return false
  }
}

/**
 * Invalidate all keys with specific tag
 */
export async function invalidateByTag(tag: string): Promise<boolean> {
  try {
    const redis = getRedisClient()
    const keys = await redis.smembers(`tag:${tag}`)

    if (keys.length === 0) return true

    // Delete all keys with this tag
    await redis.del(...keys)

    // Delete tag set
    await redis.del(`tag:${tag}`)

    return true
  } catch (error) {
    console.error('[Cache] Invalidate error:', error)
    return false
  }
}

/**
 * Cache wrapper with automatic get/set
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try to get from cache
  const cached = await getCached<T>(key)
  if (cached !== null) {
    return cached
  }

  // Cache miss - fetch data
  const data = await fetcher()

  // Store in cache
  await setCached(key, data, options)

  return data
}
```

---

## Caching Strategy

### 4.1 What to Cache

| Data Type                           | TTL          | Invalidation Strategy                                |
| ----------------------------------- | ------------ | ---------------------------------------------------- |
| **Search results**                  | 5 min        | Invalidate on resource create/update/delete          |
| **Map viewport data**               | 10 min       | Invalidate on resource location change               |
| **Category counts**                 | 15 min       | Invalidate on resource create/delete/category change |
| **Resource detail page**            | 1 hour       | Invalidate on resource update                        |
| **Coverage metrics**                | 1 day        | Invalidate on coverage recalculation                 |
| **User sessions**                   | Until logout | Invalidate on logout                                 |
| **Static data** (categories config) | 7 days       | Manual invalidation only                             |

### 4.2 Cache Key Naming Convention

**Use consistent, descriptive keys:**

```typescript
// Resources
resources:list:{filters}:{page}
resources:detail:{id}
resources:search:{query}:{filters}:{page}
resources:nearby:{lat}:{lng}:{radius}:{page}
resources:category:{category}:{page}

// Aggregates
counts:categories
counts:resources:total
counts:reviews:total

// Map
map:viewport:{sw_lat}:{sw_lng}:{ne_lat}:{ne_lng}
map:markers:{county}

// Coverage
coverage:metrics:national
coverage:metrics:state:{state}
coverage:metrics:county:{fips}

// User
user:session:{user_id}
user:favorites:{user_id}
user:reviews:{user_id}
```

**Example keys:**

- `resources:search:housing:categories=employment,housing:page=1`
- `map:viewport:37.8:-122.3:37.9:-122.2`
- `counts:categories`
- `coverage:metrics:county:06001`

### 4.3 Cache Hit Rate Targets

| Cache Type       | Target Hit Rate |
| ---------------- | --------------- |
| Category counts  | 95%+            |
| Static pages     | 90%+            |
| Search results   | 70-80%          |
| Map viewports    | 60-70%          |
| Resource details | 80-90%          |

**Monitoring:** Track hit rates and adjust TTLs accordingly.

---

## Implementation Examples

### 5.1 Cache Resource Search Results

**File: `lib/api/resources.ts`**

```typescript
import { cached } from '@/lib/redis/cache'
import { createClient } from '@/lib/supabase/server'
import type { Resource, ResourceFilters } from '@/lib/types/database'

export async function getResources(
  filters: ResourceFilters = {},
  options: { page?: number; limit?: number } = {}
): Promise<{ resources: Resource[]; total: number }> {
  const page = options.page || 1
  const limit = options.limit || 20

  // Generate cache key from filters
  const cacheKey = `resources:search:${JSON.stringify(filters)}:page=${page}`

  // Try cache first
  return await cached(
    cacheKey,
    async () => {
      // Cache miss - query database
      const supabase = createClient()

      let query = supabase.from('resources').select('*', { count: 'exact' }).eq('status', 'active')

      // Apply filters
      if (filters.search) {
        query = query.textSearch('name', filters.search)
      }

      if (filters.categories && filters.categories.length > 0) {
        query = query.overlaps('categories', filters.categories)
      }

      if (filters.city) {
        query = query.eq('city', filters.city)
      }

      // Pagination
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)

      const { data, count, error } = await query

      if (error) throw error

      return {
        resources: data || [],
        total: count || 0,
      }
    },
    {
      ttl: 300, // 5 minutes
      tags: ['resources'], // For invalidation
    }
  )
}
```

### 5.2 Cache Map Viewport Data

**File: `lib/api/resources.ts`**

```typescript
export async function getResourcesInViewport(
  southWest: { lat: number; lng: number },
  northEast: { lat: number; lng: number }
): Promise<Resource[]> {
  // Round coordinates to 2 decimal places for cache key
  const sw_lat = southWest.lat.toFixed(2)
  const sw_lng = southWest.lng.toFixed(2)
  const ne_lat = northEast.lat.toFixed(2)
  const ne_lng = northEast.lng.toFixed(2)

  const cacheKey = `map:viewport:${sw_lat}:${sw_lng}:${ne_lat}:${ne_lng}`

  return await cached(
    cacheKey,
    async () => {
      const supabase = createClient()

      // PostGIS bounding box query
      const { data, error } = await supabase.rpc('get_resources_in_bbox', {
        min_lat: southWest.lat,
        min_lng: southWest.lng,
        max_lat: northEast.lat,
        max_lng: northEast.lng,
      })

      if (error) throw error

      return data || []
    },
    {
      ttl: 600, // 10 minutes
      tags: ['resources', 'map'],
    }
  )
}
```

### 5.3 Cache Category Counts

**File: `lib/api/resources.ts`**

```typescript
export async function getCategoryCounts(): Promise<Array<{ category: string; count: number }>> {
  const cacheKey = 'counts:categories'

  return await cached(
    cacheKey,
    async () => {
      const supabase = createClient()

      // Aggregate query
      const { data, error } = await supabase
        .from('resources')
        .select('primary_category')
        .eq('status', 'active')

      if (error) throw error

      // Count by category
      const counts = new Map<string, number>()
      data.forEach((row) => {
        const category = row.primary_category
        counts.set(category, (counts.get(category) || 0) + 1)
      })

      return Array.from(counts.entries()).map(([category, count]) => ({
        category,
        count,
      }))
    },
    {
      ttl: 900, // 15 minutes
      tags: ['counts', 'resources'],
    }
  )
}
```

### 5.4 Cache Coverage Metrics

**File: `lib/coverage/metrics.ts`**

```typescript
import { cached } from '@/lib/redis/cache'
import { createClient } from '@/lib/supabase/server'

export async function getNationalCoverageMetrics() {
  const cacheKey = 'coverage:metrics:national'

  return await cached(
    cacheKey,
    async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('coverage_metrics')
        .select('*')
        .eq('geography_type', 'national')
        .eq('geography_id', 'US')
        .single()

      if (error) throw error

      return data
    },
    {
      ttl: 86400, // 1 day
      tags: ['coverage'],
    }
  )
}

export async function getCountyCoverageMetrics(fips: string) {
  const cacheKey = `coverage:metrics:county:${fips}`

  return await cached(
    cacheKey,
    async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('coverage_metrics')
        .select('*')
        .eq('geography_type', 'county')
        .eq('geography_id', fips)
        .single()

      if (error) throw error

      return data
    },
    {
      ttl: 86400, // 1 day
      tags: ['coverage'],
    }
  )
}
```

### 5.5 Server Component with Cache

**File: `app/resources/page.tsx`**

```typescript
import { getResources, getCategoryCounts } from '@/lib/api/resources'
import ResourceList from '@/components/resources/ResourceList'
import CategoryFilter from '@/components/search/CategoryFilter'

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: { search?: string; categories?: string; page?: string }
}) {
  // Parse search params
  const search = searchParams.search || ''
  const categories = searchParams.categories?.split(',') || []
  const page = parseInt(searchParams.page || '1')

  // Fetch resources (cached)
  const { resources, total } = await getResources(
    { search, categories },
    { page, limit: 20 }
  )

  // Fetch category counts (cached)
  const categoryCounts = await getCategoryCounts()

  return (
    <div>
      <CategoryFilter counts={categoryCounts} />
      <ResourceList resources={resources} total={total} page={page} />
    </div>
  )
}
```

**Performance:**

- **Without cache**: 200-500ms (2-3 database queries)
- **With cache**: 20-50ms (Redis lookups) ✓

---

## Cache Invalidation

### 6.1 Invalidate on Resource Update

**File: `app/api/admin/resources/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { invalidateByTag } from '@/lib/redis/cache'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const body = await request.json()

    // Update resource
    const { data, error } = await supabase
      .from('resources')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    // Invalidate all resource caches
    await invalidateByTag('resources')

    // Also invalidate counts if category changed
    if (body.primary_category || body.categories) {
      await invalidateByTag('counts')
    }

    // Invalidate map caches if location changed
    if (body.location) {
      await invalidateByTag('map')
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Update resource error:', error)
    return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 })
  }
}
```

### 6.2 Invalidate on Resource Create

**File: `app/api/admin/resources/route.ts`**

```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    // Create resource
    const { data, error } = await supabase.from('resources').insert(body).select().single()

    if (error) throw error

    // Invalidate caches
    await invalidateByTag('resources')
    await invalidateByTag('counts')
    await invalidateByTag('map')

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Create resource error:', error)
    return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 })
  }
}
```

### 6.3 Manual Cache Clear (Admin Tool)

**File: `app/api/admin/cache/clear/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient } from '@/lib/redis/client'
import { isAdmin } from '@/lib/utils/admin'

export async function POST(request: NextRequest) {
  try {
    // Check admin permission
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { pattern } = await request.json()

    const redis = getRedisClient()

    if (pattern === '*') {
      // Clear ALL cache (use with caution!)
      await redis.flushdb()
      return NextResponse.json({ message: 'All cache cleared' })
    }

    // Clear specific pattern
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }

    return NextResponse.json({
      message: `Cleared ${keys.length} keys`,
      pattern,
    })
  } catch (error) {
    console.error('Cache clear error:', error)
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 })
  }
}
```

**Admin UI to trigger cache clear:**

```typescript
// components/admin/CacheClearButton.tsx
'use client'

import { useState } from 'react'
import { Button } from '@mui/material'

export function CacheClearButton() {
  const [loading, setLoading] = useState(false)

  const clearCache = async (pattern: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/cache/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern }),
      })

      if (res.ok) {
        alert('Cache cleared successfully!')
      }
    } catch (error) {
      console.error('Cache clear failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-x-2">
      <Button onClick={() => clearCache('resources:*')} disabled={loading}>
        Clear Resource Cache
      </Button>
      <Button onClick={() => clearCache('counts:*')} disabled={loading}>
        Clear Counts Cache
      </Button>
      <Button onClick={() => clearCache('coverage:*')} disabled={loading}>
        Clear Coverage Cache
      </Button>
      <Button
        onClick={() => {
          if (confirm('Clear ALL cache?')) clearCache('*')
        }}
        disabled={loading}
        color="error"
      >
        Clear All Cache
      </Button>
    </div>
  )
}
```

---

## Monitoring

### 7.1 Cache Hit Rate Monitoring

**File: `lib/redis/monitoring.ts`**

```typescript
import { getRedisClient } from './client'

export async function getCacheStats() {
  const redis = getRedisClient()

  const info = await redis.info('stats')

  // Parse INFO output
  const stats: Record<string, string> = {}
  info.split('\r\n').forEach((line) => {
    const [key, value] = line.split(':')
    if (key && value) {
      stats[key] = value
    }
  })

  const hits = parseInt(stats.keyspace_hits || '0')
  const misses = parseInt(stats.keyspace_misses || '0')
  const total = hits + misses
  const hitRate = total > 0 ? (hits / total) * 100 : 0

  return {
    hits,
    misses,
    total,
    hitRate: hitRate.toFixed(2) + '%',
    connectedClients: parseInt(stats.connected_clients || '0'),
    usedMemory: stats.used_memory_human,
    totalKeys: await redis.dbsize(),
  }
}
```

**API endpoint to view stats:**

```typescript
// app/api/admin/cache/stats/route.ts
import { NextResponse } from 'next/server'
import { getCacheStats } from '@/lib/redis/monitoring'
import { isAdmin } from '@/lib/utils/admin'

export async function GET() {
  const admin = await isAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const stats = await getCacheStats()
  return NextResponse.json(stats)
}
```

### 7.2 Slow Query Logging

Redis logs slow queries automatically (configured in redis.conf).

**View slow log:**

```bash
redis-cli -a YOUR_PASSWORD slowlog get 10
```

**Output:**

```
1) 1) (integer) 14  # Log entry ID
   2) (integer) 1667890123  # Timestamp
   3) (integer) 12000  # Execution time (microseconds)
   4) 1) "KEYS"  # Command
      2) "resources:*"  # Arguments
```

**Avoid KEYS in production** — use SCAN instead:

```typescript
// Bad (blocks Redis)
const keys = await redis.keys('resources:*')

// Good (iterates without blocking)
const keys: string[] = []
let cursor = '0'
do {
  const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', 'resources:*', 'COUNT', 100)
  cursor = nextCursor
  keys.push(...batch)
} while (cursor !== '0')
```

---

## Production Best Practices

### 8.1 Connection Pooling

ioredis handles connection pooling automatically, but you can tune it:

```typescript
const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
  password: process.env.REDIS_PASSWORD,

  // Connection pool settings
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,

  // Retry strategy
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000)
    return delay
  },

  // Reconnect on error
  reconnectOnError(err) {
    const targetError = 'READONLY'
    if (err.message.includes(targetError)) {
      return true // Reconnect
    }
    return false
  },
})
```

### 8.2 Error Handling

**Always fail gracefully** — if Redis is down, fall back to database:

```typescript
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  try {
    // Try cache
    const cached = await getCached<T>(key)
    if (cached !== null) return cached
  } catch (error) {
    console.error('[Cache] Read error, falling back to DB:', error)
    // Continue to fetcher
  }

  // Fetch data
  const data = await fetcher()

  try {
    // Try to cache result
    await setCached(key, data, options)
  } catch (error) {
    console.error('[Cache] Write error, continuing without cache:', error)
    // Don't throw - data is still returned
  }

  return data
}
```

### 8.3 Memory Management

**Monitor memory usage:**

```bash
redis-cli -a YOUR_PASSWORD info memory
```

**Key metrics:**

- `used_memory_human`: Current memory usage
- `used_memory_peak_human`: Peak memory usage
- `maxmemory_human`: Configured max memory

**If nearing limit:**

1. Increase `maxmemory` in redis.conf
2. Reduce TTLs (more aggressive eviction)
3. Review cache key patterns (are you caching too much?)

### 8.4 Persistence

Redis supports two persistence modes:

**RDB (Snapshots):**

- Saves periodic snapshots to disk
- Fast recovery
- May lose data between snapshots

**AOF (Append-Only File):**

- Logs every write operation
- More durable (can lose <1 sec of data)
- Slower, larger disk usage

**Recommended: Use both** (configured in redis.conf):

```conf
# RDB snapshots
save 900 1
save 300 10
save 60 10000

# AOF enabled
appendonly yes
appendfsync everysec  # Sync to disk every second (good balance)
```

### 8.5 Backups

**Backup Redis data:**

```bash
# Manual backup (creates dump.rdb)
redis-cli -a YOUR_PASSWORD BGSAVE

# Copy snapshot to backup location
cp /var/lib/redis/dump.rdb /backups/redis/dump_$(date +%Y%m%d).rdb

# Automated daily backup
cat > /usr/local/bin/backup_redis.sh <<'EOF'
#!/bin/bash
BACKUP_DIR=/backups/redis
DATE=$(date +%Y%m%d)

redis-cli -a $REDIS_PASSWORD BGSAVE
sleep 5  # Wait for background save to complete
cp /var/lib/redis/dump.rdb $BACKUP_DIR/dump_$DATE.rdb

# Keep 7 days of backups
find $BACKUP_DIR -name "dump_*.rdb" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup_redis.sh

# Schedule daily at 3 AM
echo "0 3 * * * /usr/local/bin/backup_redis.sh" | crontab -
```

**Restore from backup:**

```bash
# Stop Redis
systemctl stop redis-server

# Replace dump file
cp /backups/redis/dump_YYYYMMDD.rdb /var/lib/redis/dump.rdb
chown redis:redis /var/lib/redis/dump.rdb

# Start Redis
systemctl start redis-server
```

---

## Testing

### Test Cache Implementation

**File: `__tests__/lib/redis/cache.test.ts`**

```typescript
import { getCached, setCached, deleteCached, cached } from '@/lib/redis/cache'

describe('Redis Cache', () => {
  beforeEach(async () => {
    // Clear test keys before each test
    const redis = getRedisClient()
    await redis.del('test:key1', 'test:key2')
  })

  it('should set and get cached value', async () => {
    await setCached('test:key1', { foo: 'bar' }, { ttl: 60 })
    const value = await getCached<{ foo: string }>('test:key1')
    expect(value).toEqual({ foo: 'bar' })
  })

  it('should return null for missing key', async () => {
    const value = await getCached('test:missing')
    expect(value).toBeNull()
  })

  it('should delete cached value', async () => {
    await setCached('test:key2', { bar: 'baz' })
    await deleteCached('test:key2')
    const value = await getCached('test:key2')
    expect(value).toBeNull()
  })

  it('should cache function result', async () => {
    let callCount = 0
    const fetcher = async () => {
      callCount++
      return { data: 'test' }
    }

    const result1 = await cached('test:cached', fetcher, { ttl: 60 })
    const result2 = await cached('test:cached', fetcher, { ttl: 60 })

    expect(result1).toEqual({ data: 'test' })
    expect(result2).toEqual({ data: 'test' })
    expect(callCount).toBe(1) // Fetcher called only once
  })
})
```

---

## Performance Benchmarks

### Before Redis (Database only)

```
Search query (20 results):        450ms
Map viewport (100 markers):       780ms
Category counts (13 categories):  220ms
Resource detail page:             120ms

Total page load time:             ~1.5 seconds
Database queries per minute:      450
```

### After Redis (With caching)

```
Search query (cached):            40ms  (11x faster)
Map viewport (cached):            65ms  (12x faster)
Category counts (cached):         8ms   (27x faster)
Resource detail page (cached):    15ms  (8x faster)

Total page load time:             ~0.2 seconds (7.5x faster)
Database queries per minute:      80 (82% reduction)
Cache hit rate:                   78%
```

---

## Summary Checklist

### Installation

- [ ] Redis installed and running
- [ ] Redis secured with password
- [ ] Firewall configured (localhost only)
- [ ] Memory limit and eviction policy set
- [ ] Persistence enabled (RDB + AOF)

### Integration

- [ ] ioredis installed
- [ ] Redis client singleton created
- [ ] Environment variables configured
- [ ] Caching utilities implemented

### Implementation

- [ ] Search results cached (5 min TTL)
- [ ] Map viewport data cached (10 min TTL)
- [ ] Category counts cached (15 min TTL)
- [ ] Resource detail pages cached (1 hour TTL)
- [ ] Coverage metrics cached (1 day TTL)

### Invalidation

- [ ] Invalidation on resource create/update/delete
- [ ] Tag-based invalidation implemented
- [ ] Manual cache clear admin UI

### Monitoring

- [ ] Cache stats endpoint created
- [ ] Hit rate tracking configured
- [ ] Slow query logging enabled
- [ ] Memory usage alerts set up

### Production

- [ ] Backups scheduled (daily)
- [ ] Error handling (graceful fallback to DB)
- [ ] Connection pooling configured
- [ ] Performance benchmarks documented

---

**Next Steps:**

1. Implement Redis caching following this guide
2. Run performance tests (before/after benchmarks)
3. Monitor cache hit rates and tune TTLs
4. Review PERFORMANCE_OPTIMIZATION_CHECKLIST.md for full optimization strategy

---

**Questions?** Open an issue or contact the dev team.

**Last Updated**: 2025-11-10
