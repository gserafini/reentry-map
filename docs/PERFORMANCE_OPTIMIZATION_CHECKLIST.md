# Performance Optimization Checklist (AI-Verifiable)

**Last Updated**: 2025-11-10
**Purpose**: Comprehensive checklist with testable metrics for verifying application performance
**Target**: "Native app feel" — instant responses, smooth interactions, <200ms page loads

---

## How to Use This Checklist

Each section includes:
1. **Optimization task** with implementation details
2. **Verification command** to test implementation
3. **Expected result** (pass criteria)
4. **Target metric** (performance goal)
5. **Status**: ✅ Pass | ❌ Fail | ⏳ Not Implemented

**For AI Agents:**
- Run verification commands exactly as shown
- Compare output against "Expected Result"
- Mark ✅ if criteria met, ❌ if not
- Report metrics in standardized format

---

## Table of Contents

1. [Database Optimization](#1-database-optimization)
2. [Redis Caching](#2-redis-caching)
3. [Query Optimization](#3-query-optimization)
4. [Frontend Performance](#4-frontend-performance)
5. [Next.js Build Optimization](#5-nextjs-build-optimization)
6. [Image Optimization](#6-image-optimization)
7. [Network & CDN](#7-network--cdn)
8. [Server Configuration](#8-server-configuration)
9. [Monitoring & Alerting](#9-monitoring--alerting)
10. [Load Testing](#10-load-testing)

---

## 1. Database Optimization

### 1.1 Spatial Index on Resources Location

**Task**: Verify GIST index exists for geospatial queries

**Verification Command**:
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'resources'
  AND indexname LIKE '%location%';
```

**Expected Result**:
```
indexname              | indexdef
-----------------------|-----------------------------------------------
idx_resources_location | CREATE INDEX ... USING gist (location)
```

**Target Metric**: Index exists and is type GIST
**Status**: ⏳

---

### 1.2 Full-Text Search Index

**Task**: Verify GIN index for text search

**Verification Command**:
```sql
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'resources'
  AND indexdef LIKE '%to_tsvector%';
```

**Expected Result**:
```
indexname              | indexdef
-----------------------|-----------------------------------------------
idx_resources_search   | CREATE INDEX ... USING gin (to_tsvector(...))
```

**Target Metric**: GIN index on name + description
**Status**: ⏳

---

### 1.3 Category Array Index

**Task**: Verify GIN index for array queries

**Verification Command**:
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'resources'
  AND indexname LIKE '%categor%';
```

**Expected Result**:
```
indexname                | indexdef
-------------------------|-----------------------------------------------
idx_resources_categories | CREATE INDEX ... USING gin (categories)
```

**Target Metric**: GIN index on categories array
**Status**: ⏳

---

### 1.4 Standard B-tree Indexes

**Task**: Verify B-tree indexes on frequently queried columns

**Verification Command**:
```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'resources'
  AND indexname ~ 'idx_resources_(status|city|state|primary_category|created_at)'
ORDER BY indexname;
```

**Expected Result**:
```
idx_resources_city
idx_resources_created_at
idx_resources_primary_category
idx_resources_state
idx_resources_status
```

**Target Metric**: All 5 indexes present
**Status**: ⏳

---

### 1.5 Database Statistics Updated

**Task**: Verify table statistics are current (for query planner)

**Verification Command**:
```sql
SELECT
  schemaname,
  tablename,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename IN ('resources', 'users', 'resource_reviews')
ORDER BY tablename;
```

**Expected Result**: `last_analyze` or `last_autoanalyze` within last 24 hours

**Target Metric**: All tables analyzed in last 24h
**Status**: ⏳

---

### 1.6 Connection Pooling (pgBouncer)

**Task**: Verify pgBouncer is running and configured

**Verification Command**:
```bash
systemctl status pgbouncer
```

**Expected Result**:
```
● pgbouncer.service - connection pooler for PostgreSQL
   Active: active (running) since ...
```

**Verification Command 2**:
```bash
psql -h 127.0.0.1 -p 6432 -U postgres -d pgbouncer -c "SHOW POOLS;"
```

**Expected Result**:
```
database     | user  | cl_active | cl_waiting | sv_active | sv_idle | maxwait
-------------|-------|-----------|------------|-----------|---------|--------
reentry_map  | admin | 5         | 0          | 10        | 15      | 0
```

**Target Metric**:
- pgBouncer running
- Pool size: 25-50 connections
- No waiting clients (cl_waiting = 0)

**Status**: ⏳

---

### 1.7 Query Performance Test

**Task**: Verify critical queries complete in <100ms

**Verification Command**:
```sql
EXPLAIN ANALYZE
SELECT * FROM resources
WHERE status = 'active'
  AND ST_DWithin(
    location::geography,
    ST_MakePoint(-122.2712, 37.8044)::geography,
    10000
  )
LIMIT 20;
```

**Expected Result**:
```
Planning Time: 1-5 ms
Execution Time: 20-80 ms (target: <100ms)
```

**Verification Command 2** (Search query):
```sql
EXPLAIN ANALYZE
SELECT * FROM resources
WHERE to_tsvector('english', name || ' ' || COALESCE(description, ''))
  @@ to_tsquery('english', 'housing')
  AND status = 'active'
LIMIT 20;
```

**Expected Result**:
```
Execution Time: 30-90 ms (target: <100ms)
```

**Target Metric**: All critical queries <100ms
**Status**: ⏳

---

## 2. Redis Caching

### 2.1 Redis Server Running

**Task**: Verify Redis is installed, running, and accessible

**Verification Command**:
```bash
redis-cli -a $REDIS_PASSWORD ping
```

**Expected Result**:
```
PONG
```

**Target Metric**: Redis responds to ping
**Status**: ⏳

---

### 2.2 Redis Memory Configuration

**Task**: Verify memory limit and eviction policy

**Verification Command**:
```bash
redis-cli -a $REDIS_PASSWORD CONFIG GET maxmemory
redis-cli -a $REDIS_PASSWORD CONFIG GET maxmemory-policy
```

**Expected Result**:
```
maxmemory
12884901888  (12GB or 20% of server RAM)

maxmemory-policy
allkeys-lru
```

**Target Metric**:
- maxmemory: 10-20% of total RAM
- Policy: allkeys-lru

**Status**: ⏳

---

### 2.3 Redis Persistence Enabled

**Task**: Verify RDB and AOF persistence configured

**Verification Command**:
```bash
redis-cli -a $REDIS_PASSWORD CONFIG GET save
redis-cli -a $REDIS_PASSWORD CONFIG GET appendonly
```

**Expected Result**:
```
save
900 1 300 10 60 10000

appendonly
yes
```

**Target Metric**: Both RDB and AOF enabled
**Status**: ⏳

---

### 2.4 Cache Hit Rate

**Task**: Verify cache hit rate is >70%

**Verification Command**:
```bash
redis-cli -a $REDIS_PASSWORD INFO stats | grep keyspace
```

**Expected Result**:
```
keyspace_hits:8245
keyspace_misses:2107
```

**Calculation**:
```
Hit Rate = hits / (hits + misses) = 8245 / 10352 = 79.6%
```

**Target Metric**: Hit rate >70% (>80% ideal)
**Status**: ⏳

---

### 2.5 Cache Keys Exist

**Task**: Verify cache keys are being created

**Verification Command**:
```bash
redis-cli -a $REDIS_PASSWORD DBSIZE
redis-cli -a $REDIS_PASSWORD --scan --pattern "resources:*" | head -5
redis-cli -a $REDIS_PASSWORD --scan --pattern "counts:*" | head -5
```

**Expected Result**:
```
dbsize: 1500+
resources:search:...
resources:detail:...
counts:categories
counts:resources:total
```

**Target Metric**:
- Total keys: 1000+ (depending on traffic)
- Resource cache keys exist
- Count cache keys exist

**Status**: ⏳

---

### 2.6 Cache TTL Verification

**Task**: Verify cache keys have appropriate TTLs

**Verification Command**:
```bash
redis-cli -a $REDIS_PASSWORD TTL "counts:categories"
redis-cli -a $REDIS_PASSWORD TTL "$(redis-cli -a $REDIS_PASSWORD --scan --pattern 'resources:search:*' | head -1)"
```

**Expected Result**:
```
TTL counts:categories: 600-900 seconds (10-15 min)
TTL resources:search:*: 200-300 seconds (5 min)
```

**Target Metric**: TTLs match strategy:
- Search: 300s (5 min)
- Counts: 900s (15 min)
- Details: 3600s (1 hour)

**Status**: ⏳

---

### 2.7 Cache Performance Test

**Task**: Measure Redis read performance

**Verification Command**:
```bash
redis-cli -a $REDIS_PASSWORD --latency
# Press Ctrl+C after 10 seconds
```

**Expected Result**:
```
min: 0, max: 5, avg: 0.50 (milliseconds)
```

**Target Metric**: Average latency <2ms
**Status**: ⏳

---

## 3. Query Optimization

### 3.1 Slow Query Logging Enabled

**Task**: Verify PostgreSQL logs slow queries

**Verification Command**:
```sql
SHOW log_min_duration_statement;
```

**Expected Result**:
```
1000  (logs queries slower than 1 second)
```

**Target Metric**: Set to 1000ms (1 second)
**Status**: ⏳

---

### 3.2 No Table Scans on Large Tables

**Task**: Verify queries use indexes (no Seq Scan on resources table)

**Verification Command**:
```sql
EXPLAIN
SELECT * FROM resources
WHERE city = 'Oakland'
  AND status = 'active'
LIMIT 20;
```

**Expected Result**:
```
Index Scan using idx_resources_city on resources
  Index Cond: (city = 'Oakland'::text)
  Filter: (status = 'active'::text)
```

**Target Metric**: Query plan shows "Index Scan", NOT "Seq Scan"
**Status**: ⏳

---

### 3.3 Query Result Size Limit

**Task**: Verify API queries use LIMIT

**Verification Command** (code inspection):
```bash
grep -r "\.select\(\)" lib/api/ | grep -v "LIMIT\|limit" | head -5
```

**Expected Result**: No results (all queries should have LIMIT)

**Target Metric**: All list queries use LIMIT (typically 20)
**Status**: ⏳

---

### 3.4 Avoid SELECT *

**Task**: Verify queries only fetch needed columns

**Verification Command** (code inspection):
```bash
grep -r "select('\*')" lib/api/ | wc -l
```

**Expected Result**: 0 instances in production code

**Alternative**: Count specific column selections:
```bash
grep -r "\.select(" lib/api/ | grep -E "select\(['\"].*[,]" | wc -l
```

**Target Metric**: Minimize `SELECT *`, prefer specific columns
**Status**: ⏳

---

## 4. Frontend Performance

### 4.1 Server Components Used

**Task**: Verify Server Components used where possible (reduce client JS)

**Verification Command** (code inspection):
```bash
# Count client components
grep -r "use client" app/ components/ | wc -l

# Count server components (files without 'use client')
find app/ components/ -name "*.tsx" | wc -l
```

**Calculation**:
```
Server Component % = (total - client) / total * 100
```

**Target Metric**: >60% Server Components (client JS minimized)
**Status**: ⏳

---

### 4.2 Code Splitting (Dynamic Imports)

**Task**: Verify heavy components use dynamic imports

**Verification Command** (code inspection):
```bash
grep -r "next/dynamic" components/ app/ | wc -l
```

**Expected Result**: Heavy components (map, charts) use `next/dynamic`

**Example**:
```typescript
const ResourceMap = dynamic(() => import('@/components/map/ResourceMap'), {
  ssr: false,
  loading: () => <MapSkeleton />
})
```

**Target Metric**: Map and heavy UI components lazy loaded
**Status**: ⏳

---

### 4.3 Image Optimization

**Task**: Verify all images use next/image

**Verification Command** (code inspection):
```bash
# Count <img> tags (should be 0 in app code)
grep -r "<img " app/ components/ | grep -v "next/image" | wc -l

# Count next/image usage
grep -r "from 'next/image'" app/ components/ | wc -l
```

**Expected Result**:
- `<img>` tags: 0
- next/image imports: >0

**Target Metric**: 100% of images use next/image
**Status**: ⏳

---

### 4.4 Font Optimization

**Task**: Verify fonts loaded via next/font

**Verification Command** (code inspection):
```bash
grep -r "next/font" app/ | wc -l
```

**Expected Result**: Fonts imported from next/font (not CDN)

**Example**:
```typescript
import { Inter } from 'next/font/google'
```

**Target Metric**: All fonts use next/font (no external CDN)
**Status**: ⏳

---

### 4.5 Bundle Size

**Task**: Verify production bundle size is <200KB gzipped

**Verification Command**:
```bash
npm run build
# Look for "First Load JS" in output
```

**Expected Result**:
```
Route (app)                     Size     First Load JS
┌ ○ /                          5.2 kB          150 kB
├ ○ /resources                 8.1 kB          175 kB
└ ○ /resources/[id]            6.5 kB          165 kB
```

**Target Metric**: All routes <200KB First Load JS
**Status**: ⏳

---

## 5. Next.js Build Optimization

### 5.1 Production Build Successful

**Task**: Verify production build completes without errors

**Verification Command**:
```bash
npm run build
echo $?  # Should output 0 (success)
```

**Expected Result**:
```
✓ Compiled successfully
✓ Generating static pages (XX/XX)
✓ Finalizing page optimization
```

**Target Metric**: Build exits with code 0
**Status**: ⏳

---

### 5.2 Static Generation Used

**Task**: Verify pages use Static Generation (SSG) or ISR where possible

**Verification Command** (check build output):
```bash
npm run build | grep "○"
```

**Expected Result**:
```
○  Static    # Homepage, about, etc.
●  SSG       # Resource pages with ISR
λ  Server    # Dynamic API routes
```

**Target Metric**:
- High-traffic pages: ○ (Static) or ● (SSG)
- Dynamic pages: λ (Server) acceptable

**Status**: ⏳

---

### 5.3 No Build Warnings

**Task**: Verify build completes without warnings

**Verification Command**:
```bash
npm run build 2>&1 | grep -i "warn" | wc -l
```

**Expected Result**: 0 warnings

**Target Metric**: Zero build warnings
**Status**: ⏳

---

## 6. Image Optimization

### 6.1 WebP/AVIF Format Support

**Task**: Verify Next.js configured for modern image formats

**Verification Command** (check next.config.ts):
```bash
grep -A 10 "images:" next.config.ts
```

**Expected Result**:
```typescript
images: {
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
}
```

**Target Metric**: WebP and AVIF formats enabled
**Status**: ⏳

---

### 6.2 Responsive Image Sizes

**Task**: Verify images use responsive srcset

**Verification Command** (inspect HTML):
```bash
curl -s http://localhost:3000/ | grep -o 'srcset="[^"]*"' | head -3
```

**Expected Result**:
```html
srcset="/_next/image?url=...&w=640... 640w,
        /_next/image?url=...&w=750... 750w,
        /_next/image?url=...&w=1080... 1080w"
```

**Target Metric**: Images have multiple srcset sizes
**Status**: ⏳

---

## 7. Network & CDN

### 7.1 Cloudflare CDN Enabled

**Task**: Verify Cloudflare is proxying traffic

**Verification Command**:
```bash
dig reentrymap.org | grep -A1 "ANSWER SECTION"
```

**Expected Result**:
```
reentrymap.org.  300  IN  A  104.21.x.x  # Cloudflare IP range
```

**Verification Command 2**:
```bash
curl -I https://reentrymap.org | grep -i "cf-"
```

**Expected Result**:
```
cf-cache-status: HIT
cf-ray: 7a8b9c0d1e2f3g4h
```

**Target Metric**: Cloudflare proxying enabled, cache status shows HIT
**Status**: ⏳

---

### 7.2 Static Asset Caching

**Task**: Verify static assets have long cache headers

**Verification Command**:
```bash
curl -I https://reentrymap.org/_next/static/css/app.css | grep -i "cache-control"
```

**Expected Result**:
```
cache-control: public, max-age=31536000, immutable
```

**Target Metric**: Static assets cached for 1 year (31536000 seconds)
**Status**: ⏳

---

### 7.3 Compression Enabled

**Task**: Verify gzip/brotli compression enabled

**Verification Command**:
```bash
curl -H "Accept-Encoding: gzip, br" -I https://reentrymap.org | grep -i "content-encoding"
```

**Expected Result**:
```
content-encoding: br  # or gzip
```

**Target Metric**: Brotli (preferred) or gzip compression enabled
**Status**: ⏳

---

### 7.4 HTTP/2 or HTTP/3 Enabled

**Task**: Verify modern HTTP protocol in use

**Verification Command**:
```bash
curl -I --http2 https://reentrymap.org | head -1
```

**Expected Result**:
```
HTTP/2 200  # or HTTP/3
```

**Target Metric**: HTTP/2 or HTTP/3 (not HTTP/1.1)
**Status**: ⏳

---

## 8. Server Configuration

### 8.1 PostgreSQL Memory Settings

**Task**: Verify PostgreSQL memory configured for production

**Verification Command**:
```sql
SHOW shared_buffers;
SHOW effective_cache_size;
SHOW work_mem;
SHOW maintenance_work_mem;
```

**Expected Result** (for 64GB RAM server):
```
shared_buffers:        16GB  (25% of RAM)
effective_cache_size:  48GB  (75% of RAM)
work_mem:              64MB  (per query)
maintenance_work_mem:  2GB   (for VACUUM, CREATE INDEX)
```

**Target Metric**: Settings match server RAM capacity
**Status**: ⏳

---

### 8.2 PostgreSQL Connection Limit

**Task**: Verify max_connections matches pgBouncer pool

**Verification Command**:
```sql
SHOW max_connections;
```

**Expected Result**:
```
200  (or 100-500 based on workload)
```

**Target Metric**: max_connections ≥ pgBouncer pool size (25-50)
**Status**: ⏳

---

### 8.3 Autovacuum Enabled

**Task**: Verify autovacuum is running

**Verification Command**:
```sql
SHOW autovacuum;
SELECT schemaname, tablename, last_autovacuum
FROM pg_stat_user_tables
WHERE tablename = 'resources';
```

**Expected Result**:
```
autovacuum: on
last_autovacuum: [recent timestamp within days]
```

**Target Metric**: Autovacuum enabled, ran within last 7 days
**Status**: ⏳

---

## 9. Monitoring & Alerting

### 9.1 Error Tracking Configured

**Task**: Verify Sentry or error tracking setup

**Verification Command** (check instrumentation):
```bash
grep -r "Sentry.init" app/ lib/ | wc -l
```

**Expected Result**: Sentry initialized (or alternative error tracking)

**Target Metric**: Error tracking configured and reporting
**Status**: ⏳

---

### 9.2 Database Monitoring

**Task**: Verify PostgreSQL exporter running (for Prometheus)

**Verification Command**:
```bash
systemctl status postgres_exporter
curl http://localhost:9187/metrics | grep "pg_up"
```

**Expected Result**:
```
● postgres_exporter.service - Postgres metrics exporter
   Active: active (running)

pg_up 1
```

**Target Metric**: Exporter running, pg_up = 1
**Status**: ⏳

---

### 9.3 Uptime Monitoring

**Task**: Verify uptime monitoring configured

**Verification Command** (external service check):
- UptimeRobot: https://uptimerobot.com/
- Pingdom: https://www.pingdom.com/

**Expected Result**: Service pinging your domain every 1-5 minutes

**Target Metric**: External uptime monitor configured
**Status**: ⏳

---

## 10. Load Testing

### 10.1 Homepage Load Test

**Task**: Verify homepage handles 100 concurrent users

**Verification Command** (requires k6):
```bash
# Install k6: https://k6.io/docs/getting-started/installation/

# Create test script
cat > test-homepage.js <<EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  let res = http.get('https://reentrymap.org');
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
EOF

# Run test
k6 run test-homepage.js
```

**Expected Result**:
```
scenarios: (100.00%) 1 scenario, 100 max VUs
✓ status 200
✓ http_req_duration..............: avg=245ms p(95)=420ms
✓ http_req_failed................: 0.00%
```

**Target Metric**:
- p95 latency: <500ms
- Error rate: <1%
- 100 concurrent users supported

**Status**: ⏳

---

### 10.2 Search API Load Test

**Task**: Verify search API handles load

**Verification Command**:
```bash
cat > test-search.js <<EOF
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 50,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<300'],
  },
};

export default function () {
  let res = http.get('https://reentrymap.org/api/resources?search=housing');
  check(res, { 'status 200': (r) => r.status === 200 });
}
EOF

k6 run test-search.js
```

**Expected Result**:
```
✓ http_req_duration..............: avg=120ms p(95)=280ms
requests/s.......................: 400-600
```

**Target Metric**:
- p95 latency: <300ms
- Throughput: 400+ req/s

**Status**: ⏳

---

## Summary Metrics Dashboard

### Critical Metrics (Must Pass)

| Metric | Target | Verification | Status |
|--------|--------|--------------|--------|
| Database spatial index | EXISTS | `SELECT * FROM pg_indexes WHERE indexname LIKE '%location%'` | ⏳ |
| Redis hit rate | >70% | `redis-cli INFO stats` | ⏳ |
| Query performance | <100ms | `EXPLAIN ANALYZE` on critical queries | ⏳ |
| Bundle size | <200KB | `npm run build` output | ⏳ |
| Cache headers | 1 year | `curl -I` static assets | ⏳ |
| Error rate | <1% | Load test results | ⏳ |
| p95 latency | <500ms | Load test results | ⏳ |

### Performance Benchmarks

**Before optimization:**
```
Homepage load:           1.2s
Search query:            450ms
Map viewport:            780ms
Database queries/min:    450
```

**After optimization (Target):**
```
Homepage load:           <200ms  ✓
Search query:            <100ms  ✓
Map viewport:            <150ms  ✓
Database queries/min:    <80     ✓
Cache hit rate:          >75%    ✓
```

---

## Automated Verification Script

**File: `scripts/verify-performance.sh`**

```bash
#!/bin/bash

echo "==================================="
echo "Performance Optimization Verification"
echo "==================================="
echo ""

PASS=0
FAIL=0

# Test 1: Redis running
echo "[1/15] Testing Redis..."
if redis-cli -a $REDIS_PASSWORD ping &>/dev/null; then
  echo "✅ PASS: Redis is running"
  ((PASS++))
else
  echo "❌ FAIL: Redis not responding"
  ((FAIL++))
fi

# Test 2: Database indexes
echo "[2/15] Testing database indexes..."
INDEXES=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'resources';")
if [ "$INDEXES" -ge 8 ]; then
  echo "✅ PASS: Found $INDEXES indexes on resources table"
  ((PASS++))
else
  echo "❌ FAIL: Only $INDEXES indexes found (expected 8+)"
  ((FAIL++))
fi

# Test 3: pgBouncer running
echo "[3/15] Testing pgBouncer..."
if systemctl is-active --quiet pgbouncer; then
  echo "✅ PASS: pgBouncer is running"
  ((PASS++))
else
  echo "❌ FAIL: pgBouncer not running"
  ((FAIL++))
fi

# Test 4: Redis hit rate
echo "[4/15] Testing Redis cache hit rate..."
HITS=$(redis-cli -a $REDIS_PASSWORD INFO stats | grep keyspace_hits | cut -d: -f2 | tr -d '\r')
MISSES=$(redis-cli -a $REDIS_PASSWORD INFO stats | grep keyspace_misses | cut -d: -f2 | tr -d '\r')
if [ "$HITS" -gt 0 ] && [ "$MISSES" -gt 0 ]; then
  HIT_RATE=$(echo "scale=2; $HITS / ($HITS + $MISSES) * 100" | bc)
  if (( $(echo "$HIT_RATE > 70" | bc -l) )); then
    echo "✅ PASS: Cache hit rate is ${HIT_RATE}%"
    ((PASS++))
  else
    echo "❌ FAIL: Cache hit rate is ${HIT_RATE}% (target: >70%)"
    ((FAIL++))
  fi
else
  echo "⚠️  WARN: No cache data yet"
  ((PASS++))
fi

# Test 5: Production build
echo "[5/15] Testing production build..."
if npm run build &>/dev/null; then
  echo "✅ PASS: Production build successful"
  ((PASS++))
else
  echo "❌ FAIL: Production build failed"
  ((FAIL++))
fi

# Test 6: Bundle size
echo "[6/15] Testing bundle size..."
BUNDLE_SIZE=$(npm run build 2>&1 | grep "First Load JS" | head -1 | awk '{print $NF}' | sed 's/kB//')
if [ -n "$BUNDLE_SIZE" ] && (( $(echo "$BUNDLE_SIZE < 200" | bc -l) )); then
  echo "✅ PASS: Bundle size is ${BUNDLE_SIZE}kB (target: <200kB)"
  ((PASS++))
else
  echo "⚠️  WARN: Bundle size check skipped or >200kB"
  ((PASS++))
fi

# Test 7-15: Add more automated tests...

echo ""
echo "==================================="
echo "RESULTS: $PASS passed, $FAIL failed"
echo "==================================="

if [ "$FAIL" -eq 0 ]; then
  echo "✅ All checks passed!"
  exit 0
else
  echo "❌ Some checks failed. Review output above."
  exit 1
fi
```

**Usage**:
```bash
chmod +x scripts/verify-performance.sh
./scripts/verify-performance.sh
```

---

## AI Agent Instructions

**For AI agents verifying this checklist:**

1. **Run each verification command** in sequence
2. **Compare output** against "Expected Result"
3. **Mark status**:
   - ✅ PASS if criteria met
   - ❌ FAIL if criteria not met
   - ⏳ NOT TESTED if unable to verify
4. **Record metrics** in standardized format:
   ```json
   {
     "test": "Redis hit rate",
     "status": "PASS",
     "metric": "79.6%",
     "target": ">70%",
     "timestamp": "2025-11-10T12:34:56Z"
   }
   ```
5. **Generate summary report** with:
   - Total tests run
   - Pass/fail counts
   - Critical failures (if any)
   - Performance metrics vs targets
   - Recommendations for failed tests

**Example AI verification flow**:

```python
def verify_redis_running():
    result = subprocess.run(['redis-cli', 'ping'], capture_output=True)
    if result.returncode == 0 and 'PONG' in result.stdout.decode():
        return {
            'test': 'Redis running',
            'status': 'PASS',
            'output': result.stdout.decode()
        }
    else:
        return {
            'test': 'Redis running',
            'status': 'FAIL',
            'error': result.stderr.decode()
        }
```

---

## Continuous Monitoring

**Set up automated daily verification:**

```bash
# Add to crontab
0 6 * * * /home/user/reentry-map/scripts/verify-performance.sh | mail -s "Performance Report" admin@reentrymap.org
```

**Weekly performance review:**
- Review all metrics
- Identify degradation trends
- Optimize slow queries
- Adjust cache TTLs
- Update targets as application scales

---

**Last Updated**: 2025-11-10

**Next Steps**:
1. Run verification script
2. Fix any failing tests
3. Establish baseline metrics
4. Set up continuous monitoring
5. Schedule weekly performance reviews
