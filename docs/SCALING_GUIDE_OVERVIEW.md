# Scaling Guide Overview

**Reentry Map: From MVP to 100,000 Resources Nationwide**

Last Updated: 2025-11-10

---

## Quick Navigation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[This Overview](#)** | Strategic roadmap and decision framework | Start here |
| **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** | Supabase → Self-hosted PostgreSQL | When costs hit $100/mo |
| **[REDIS_SETUP_GUIDE.md](REDIS_SETUP_GUIDE.md)** | Caching implementation | Before launch, critical for scale |
| **[PERFORMANCE_OPTIMIZATION_CHECKLIST.md](PERFORMANCE_OPTIMIZATION_CHECKLIST.md)** | Verification and testing | Before every major release |
| **[COVERAGE_TRACKING_SYSTEM.md](COVERAGE_TRACKING_SYSTEM.md)** | Geographic expansion tracking | When expanding beyond Bay Area |

---

## Executive Summary

### The Challenge
Scale Reentry Map from **75 resources** in Oakland to **75,000-100,000 resources** nationwide while maintaining:
- ⚡ **"Native app feel"** (<200ms response times)
- 💰 **Cost efficiency** (avoid managed service pricing at scale)
- 🔧 **Maintainability** (minimize ops burden)

### The Solution
Your current architecture (Next.js + PostgreSQL + PostGIS) is **fundamentally correct** and will scale to millions of users with proper optimization.

### Key Numbers

| Metric | Current (MVP) | Regional (CA) | National (100%) |
|--------|--------------|---------------|-----------------|
| **Resources** | 75 | 5,000 | 75,000-100,000 |
| **Users/month** | <100 | 10,000 | 500,000-1M |
| **Page views/month** | <1,000 | 100,000 | 5-10M |
| **Database size** | <1GB | ~5GB | 50-75GB |
| **Monthly cost** | $45 | $80-200 | $300-1,400 |
| **Response time target** | <500ms | <300ms | <200ms |

---

## Three-Phase Scaling Strategy

### Phase 1: MVP → Launch (NOW - Month 6)

**Current State: ✅ Optimal**

**Stack:**
- Supabase (managed PostgreSQL + Auth + Storage)
- Vercel (Next.js hosting)
- Google Maps API
- OpenAI API (for AI agents)

**Monthly Cost:** $45
- Supabase Pro: $25
- Vercel Pro: $20
- Google Maps: $0-5 (free tier)

**Why Stay Here:**
- ✅ Zero ops overhead — focus on product
- ✅ Fast development velocity
- ✅ Automatic backups, monitoring, scaling
- ✅ Cost is negligible at this scale

**Action Items:**
- [x] Continue building features
- [ ] Implement Redis caching (even with Supabase) — **DO THIS BEFORE LAUNCH**
- [ ] Monitor costs monthly (migrate when >$100/mo)
- [ ] Run performance checks before launch

**Trigger to Move to Phase 2:**
- Monthly costs exceed $100/mo (typically at 5k-10k users)
- OR: 6 months into production (stable product, predictable traffic)

---

### Phase 2: Regional Scale (Month 6-12)

**Target State: Self-Hosted Database + Managed Hosting**

**Stack Changes:**
- ✅ **PostgreSQL + PostGIS** on your dedicated server
- ✅ **pgBouncer** for connection pooling
- ✅ **Redis** (self-hosted) for caching
- ✅ **Twilio** for phone OTP (replace Supabase Auth)
- ✅ **Cloudflare** free CDN
- ⏸️ **Keep Vercel** for Next.js hosting (migrate later)

**Monthly Cost:** $80-120
- Dedicated server: $0 (already owned)
- Twilio SMS: $20-50
- Backups (Backblaze): $10
- Vercel: $20
- Cloudflare: $0

**Savings:** $120-180/month vs staying on Supabase

**Migration Effort:** 2-3 weeks
- Week 1: Server setup, PostgreSQL config, data migration
- Week 2: Auth migration (Twilio integration), testing
- Week 3: Cutover, monitoring, optimization

**Action Items:**
1. **Read:** [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
2. **Set up:** PostgreSQL + PostGIS + pgBouncer on server
3. **Migrate:** Export from Supabase, restore to self-hosted
4. **Implement:** Twilio phone OTP
5. **Test:** Full application with new database
6. **Cutover:** During low-traffic window (Sunday 2-6 AM)
7. **Monitor:** Closely for first week

**Performance Targets:**
- Database queries: <100ms
- API endpoints: <150ms
- Homepage load: <300ms
- Search results: <200ms

**Trigger to Move to Phase 3:**
- Monthly users exceed 50k
- Vercel costs exceed $200/mo (bandwidth/function invocations)
- OR: Year 2 of operations (predictable at scale)

---

### Phase 3: National Scale (Year 2+)

**Target State: Fully Self-Hosted**

**Stack Changes:**
- ✅ **Next.js self-hosted** on your server (PM2 + Nginx)
- ✅ **PostgreSQL read replicas** (2-3 servers for scaling)
- ✅ **Redis cluster** (high availability)
- ✅ **Cloudflare Pro** CDN ($20/mo)
- ✅ **Load balancer** (Nginx)
- ✅ **Advanced monitoring** (Prometheus + Grafana)

**Monthly Cost:** $300-1,400
- Dedicated servers (3): $0-600 (if adding more)
- Twilio SMS: $200-500 (at scale)
- Cloudflare Pro: $20
- Backups + monitoring: $100

**Savings:** $700-2,300/month vs Supabase Enterprise + Vercel Enterprise

**Migration Effort:** 3-4 weeks
- Week 1: Set up Next.js hosting (PM2, Nginx, CI/CD)
- Week 2: Configure read replicas, load balancing
- Week 3: Redis cluster setup
- Week 4: Cutover, testing, optimization

**Action Items:**
1. **Self-host Next.js:** PM2 process manager, Nginx reverse proxy
2. **CI/CD:** GitHub Actions for automatic deployment
3. **Read replicas:** 2-3 PostgreSQL replicas (read-heavy workload)
4. **Redis HA:** Redis Sentinel or Cluster mode
5. **Monitoring:** Prometheus + Grafana dashboard
6. **Alerts:** PagerDuty for critical issues

**Performance Targets:**
- All endpoints: <200ms (p95)
- Homepage: <100ms (cached)
- Search: <100ms (cached)
- Map viewport: <150ms (cached)
- Database: <50ms (with replicas)
- Cache hit rate: >80%

**Capacity:**
- ✅ 100,000 resources
- ✅ 1M users/month
- ✅ 10M page views/month
- ✅ 99.9% uptime

---

## Critical Optimizations (Must-Do)

These optimizations provide **80% of performance gains** and are **required** for scale:

### 1. Redis Caching (Highest Impact)

**When:** Before launch (even with Supabase)

**Impact:**
- 80-90% reduction in database queries
- 5-10x faster response times
- Enables <200ms "native app feel"

**Effort:** 1-2 days

**Guide:** [REDIS_SETUP_GUIDE.md](REDIS_SETUP_GUIDE.md)

**What to cache:**
- Search results (5 min TTL)
- Map viewport data (10 min TTL)
- Category counts (15 min TTL)
- Resource detail pages (1 hour TTL)
- Coverage metrics (1 day TTL)

**Expected results:**
- Search: 450ms → **40ms** (11x faster)
- Map: 780ms → **65ms** (12x faster)
- Counts: 220ms → **8ms** (27x faster)

---

### 2. Database Indexes

**When:** Immediately (Phase 1)

**Impact:**
- 10-50x faster queries
- Required for >1,000 resources

**Effort:** 1 hour

**Critical indexes:**
```sql
-- Spatial index (GIST) for map queries
CREATE INDEX idx_resources_location ON resources USING GIST (location);

-- Full-text search index (GIN)
CREATE INDEX idx_resources_search ON resources USING GIN (
  to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- Category filter index (GIN for arrays)
CREATE INDEX idx_resources_categories ON resources USING GIN (categories);

-- Standard B-tree indexes
CREATE INDEX idx_resources_status ON resources (status);
CREATE INDEX idx_resources_city ON resources (city);
CREATE INDEX idx_resources_state ON resources (state);
CREATE INDEX idx_resources_primary_category ON resources (primary_category);
```

**Verification:**
```bash
psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename = 'resources';"
```

---

### 3. Connection Pooling (pgBouncer)

**When:** Phase 2 (self-hosted database)

**Impact:**
- Handles serverless function connections (Next.js/Vercel)
- Prevents "too many clients" errors
- 2-5x more concurrent users supported

**Effort:** 2 hours

**Why needed:**
- PostgreSQL max connections: 100-200
- Vercel functions create new connection per request
- Without pooling: Database overwhelmed at 50-100 concurrent users
- With pooling: Supports 1000+ concurrent users

**Guide:** See [MIGRATION_GUIDE.md - Section 4](MIGRATION_GUIDE.md#connection-pooling-pgbouncer)

---

### 4. Cloudflare CDN

**When:** Phase 2 (even works with Vercel)

**Impact:**
- 50-70% latency reduction globally
- Unlimited bandwidth (free tier)
- DDoS protection
- Free SSL

**Effort:** 1 hour (DNS change + config)

**Cost:** $0 (free tier works great)

**What it does:**
- Caches static assets (images, CSS, JS) at 300+ global edge locations
- Can cache API responses with proper headers
- Reduces server load by 60-80%

---

## Performance Verification

### Before Every Major Release

**Run automated verification:**
```bash
cd /path/to/reentry-map
./scripts/verify-performance.sh
```

**Expected output:**
```
Performance Verification Summary
Total Tests: 25
Passed: 23
Failed: 0
Skipped: 2

Pass Rate: 92%
✅ All mandatory checks passed!
```

**What it checks:**
- ✅ Redis running and configured
- ✅ Database indexes exist
- ✅ Query performance <100ms
- ✅ Bundle size <200KB
- ✅ Compression enabled
- ✅ SSL valid
- ✅ No TypeScript/ESLint errors
- ✅ Production build succeeds

**Manual checklist:** [PERFORMANCE_OPTIMIZATION_CHECKLIST.md](PERFORMANCE_OPTIMIZATION_CHECKLIST.md)

---

## Cost Analysis by Scale

### Detailed Cost Breakdown

| Scale | Resources | Users/mo | Supabase + Vercel | Self-Hosted | Savings/Year |
|-------|-----------|----------|-------------------|-------------|--------------|
| **MVP** | 500 | 1,000 | $540 | $120 | **$420** |
| **Oakland** | 1,000 | 2,000 | $720 | $180 | **$540** |
| **Bay Area** | 5,000 | 10,000 | $1,800 | $720 | **$1,080** |
| **California** | 20,000 | 50,000 | $7,200 | $3,000 | **$4,200** |
| **West Coast** | 40,000 | 100,000 | $14,400 | $6,000 | **$8,400** |
| **National** | 100,000 | 500,000 | $32,400 | $16,800 | **$15,600** |

### Cost Components (Self-Hosted at National Scale)

| Item | Cost/Month | Notes |
|------|-----------|-------|
| **Dedicated servers (3)** | $600 | Primary + 2 read replicas |
| **Twilio SMS** | $500 | ~60k OTP messages/mo @ $0.0079 ea |
| **Backblaze backups** | $50 | 10TB @ $5/TB |
| **Cloudflare Pro** | $20 | Image optimization, advanced caching |
| **Monitoring (optional)** | $50 | DataDog or self-hosted Prometheus |
| **Buffer** | $180 | Unexpected overages |
| **Total** | **$1,400/mo** | vs $2,700 managed services |

### When Self-Hosting Pays Off

**Break-even analysis:**

| Migration | One-Time Effort | Monthly Savings | Months to ROI |
|-----------|----------------|-----------------|---------------|
| **Phase 2** (DB only) | 80 hours | $120 | 6 months |
| **Phase 3** (Fully self-hosted) | 120 hours | $700 | 4 months |

**ROI at scale:**
- Year 1: ~$1,000 savings (not worth it for MVP)
- Year 2: ~$8,000 savings (worth it at regional scale)
- Year 3: ~$15,000 savings (definitely worth it at national scale)

---

## Architecture Validation

### Why Next.js is Correct (vs WordPress)

You mentioned familiarity with WordPress and caching. Here's why Next.js is superior for Reentry Map:

| Feature | WordPress | Next.js | Winner |
|---------|-----------|---------|--------|
| **Interactive Maps** | Heavy plugins (Leaflet/MapPress), clunky | React + Google Maps = smooth 60fps | ✅ Next.js |
| **Geospatial Search** | Requires plugins, slow MySQL queries | PostGIS native, millisecond queries | ✅ Next.js |
| **Mobile Performance** | 500KB+ page weight, slow | 100-200KB, fast PWA | ✅ Next.js |
| **Search/Filter UX** | Page reloads, slow | Instant client-side updates | ✅ Next.js |
| **Real-time Features** | Very difficult (polling) | Native (WebSockets, SSE) | ✅ Next.js |
| **Caching** | Mature plugins (W3TC, WP Rocket) | Built-in + requires Redis setup | ⚖️ Tie |
| **Developer Experience** | PHP, dated patterns | TypeScript, modern patterns | ✅ Next.js |
| **Scalability** | Difficult beyond 100k users | Proven at millions of users | ✅ Next.js |
| **API Development** | REST API clunky | API routes elegant | ✅ Next.js |
| **PWA Support** | Plugins (buggy) | Native, excellent | ✅ Next.js |

**Verdict:** Next.js is the right choice. Don't switch to WordPress.

### PostGIS vs MySQL Geospatial

| Query Type | MySQL | PostGIS | Speedup |
|------------|-------|---------|---------|
| Point within radius | 200-500ms | 20-50ms | **10x faster** |
| Bounding box query | 300-800ms | 30-80ms | **10x faster** |
| Complex polygon search | 1-3 seconds | 100-300ms | **10x faster** |

**Why PostGIS wins:**
- Native spatial indexing (GIST)
- Optimized for geographic queries
- Industry standard for mapping applications
- Used by Uber, Foursquare, OpenStreetMap

---

## Decision Framework

### When Should I Migrate?

Use this flowchart:

```
START
  ↓
Monthly costs > $100?
  ├─ NO → Stay on Supabase + Vercel (Phase 1) ✅
  └─ YES
      ↓
    Have 2-3 weeks for migration?
      ├─ NO → Stay on managed services, revisit in 3 months
      └─ YES
          ↓
        Traffic predictable (not rapidly growing)?
          ├─ NO → Wait until growth stabilizes
          └─ YES → Migrate to Phase 2 (Database first) ✅
              ↓
            Monthly costs > $500?
              ├─ NO → Stay in Phase 2
              └─ YES
                  ↓
                Users > 50k/month?
                  ├─ NO → Optimize Phase 2 further
                  └─ YES → Migrate to Phase 3 (Fully self-hosted) ✅
```

### Should I Implement Redis Now?

**YES, always.** Even with Supabase.

**Why:**
- Works with managed or self-hosted database
- Biggest performance impact (5-10x speedup)
- Low effort (1-2 days)
- Required for "native app feel"
- Cost: $0 (self-hosted on your server)

**When:**
- Before launch: ✅ Critical
- After 100 users: ✅ Recommended
- After 1,000 users: ✅ Absolutely required

---

## Common Pitfalls (Avoid These)

### ❌ Don't: Premature Optimization

**Mistake:** Migrating to self-hosted at MVP stage (< 1k users)

**Why bad:**
- Wastes 2-3 weeks on infrastructure instead of features
- Adds ops burden when product-market fit not proven
- Minimal cost savings ($420/year) vs dev time value

**Do instead:** Stay on Supabase, focus on user acquisition

---

### ❌ Don't: Skipping Redis

**Mistake:** Thinking "I'll add caching later when I need it"

**Why bad:**
- Performance degrades as you grow → bad user experience
- Harder to retrofit caching into existing codebase
- Users experience slow app, then you lose them

**Do instead:** Implement Redis before launch (even with Supabase)

---

### ❌ Don't: Missing Database Indexes

**Mistake:** Launching without spatial/search indexes

**Why bad:**
- Queries become 10-50x slower as data grows
- App feels sluggish even with caching (cache misses)
- Database becomes bottleneck

**Do instead:** Create all indexes during Phase 1 (see checklist)

---

### ❌ Don't: No Performance Monitoring

**Mistake:** Not tracking response times, error rates, cache hit rates

**Why bad:**
- Can't identify bottlenecks when problems arise
- Don't know when to scale (blind guessing)
- Performance degradation goes unnoticed

**Do instead:**
- Add simple monitoring from day 1 (Vercel Analytics free)
- Run `verify-performance.sh` weekly
- Set up alerts for critical metrics

---

### ❌ Don't: Migrating Without Testing

**Mistake:** Migrating database during business hours without rollback plan

**Why bad:**
- Data loss risk
- Extended downtime if issues arise
- Users frustrated

**Do instead:**
- Follow [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) cutover plan
- Test restore to staging environment first
- Migrate Sunday 2-6 AM (low traffic)
- Have rollback plan ready (30 min revert to Supabase)

---

## Quick Start Checklist

### Right Now (Phase 1)

- [ ] **Read this overview** ✓
- [ ] **Implement database indexes** (1 hour)
  ```sql
  -- Run these in Supabase SQL editor
  CREATE INDEX idx_resources_location ON resources USING GIST (location);
  CREATE INDEX idx_resources_search ON resources USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));
  CREATE INDEX idx_resources_categories ON resources USING GIN (categories);
  CREATE INDEX idx_resources_status ON resources (status);
  CREATE INDEX idx_resources_city ON resources (city);
  CREATE INDEX idx_resources_state ON resources (state);
  ```
- [ ] **Set up Redis caching** (1-2 days)
  - Follow [REDIS_SETUP_GUIDE.md](REDIS_SETUP_GUIDE.md)
  - Install Redis on your dedicated server
  - Integrate with Next.js
  - Cache search, map, counts
- [ ] **Run performance verification** (10 min)
  ```bash
  ./scripts/verify-performance.sh
  ```
- [ ] **Monitor costs monthly** (set calendar reminder)

### Before Launch

- [ ] All database indexes created ✓
- [ ] Redis caching implemented ✓
- [ ] Performance verification passing ✓
- [ ] Load testing completed (100+ concurrent users)
- [ ] Error tracking configured (Sentry or Vercel)
- [ ] Backups verified (Supabase automatic)

### At $100/month costs

- [ ] Read [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
- [ ] Schedule 2-3 week migration project
- [ ] Test database migration on staging
- [ ] Implement Twilio phone OTP
- [ ] Plan cutover window (low-traffic period)
- [ ] Migrate database to self-hosted PostgreSQL

### At 50k users/month

- [ ] Evaluate Next.js self-hosting vs Vercel
- [ ] Consider read replicas if database slow
- [ ] Upgrade to Cloudflare Pro for image optimization
- [ ] Set up advanced monitoring (Prometheus + Grafana)

---

## Support & Resources

### Documentation
- **This overview:** Strategic roadmap
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md):** Step-by-step database migration
- **[REDIS_SETUP_GUIDE.md](REDIS_SETUP_GUIDE.md):** Caching implementation
- **[PERFORMANCE_OPTIMIZATION_CHECKLIST.md](PERFORMANCE_OPTIMIZATION_CHECKLIST.md):** Testing & verification
- **[COVERAGE_TRACKING_SYSTEM.md](COVERAGE_TRACKING_SYSTEM.md):** Geographic expansion

### Tools
- **Verification script:** `./scripts/verify-performance.sh`
- **Load testing:** k6 (https://k6.io)
- **Monitoring:** Prometheus + Grafana or DataDog
- **Uptime:** UptimeRobot (free tier)

### Community Resources
- Next.js Docs: https://nextjs.org/docs
- PostGIS Docs: https://postgis.net/documentation/
- Redis Best Practices: https://redis.io/docs/management/optimization/
- Vercel Performance: https://vercel.com/docs/concepts/edge-network/overview

---

## Frequently Asked Questions

### Q: Can a single server really handle 100k resources and 1M users/month?

**A:** Yes, absolutely. With proper optimization (Redis caching, database indexes, connection pooling), a modern dedicated server (8+ cores, 64GB RAM) can easily handle:
- 100k resources (~50GB database)
- 1M users/month (~10M page views)
- 500+ concurrent users (peak)
- <200ms response times

Real-world examples:
- Stack Overflow: Served 8M users from 9 servers (pre-2013)
- Discourse: Handles 100k+ users on single server
- Many SaaS apps: 1M+ users on 2-3 servers

Your bottleneck will be **database queries**, solved by Redis caching (80-90% reduction).

---

### Q: Why not just use WordPress? I know it well.

**A:** WordPress is great for blogs/content sites but poor for:
- **Interactive maps** (heavy plugins, clunky UX)
- **Geospatial search** (MySQL spatial features much slower than PostGIS)
- **Mobile-first PWA** (plugins buggy, heavy page weight)
- **Real-time features** (future chat, notifications)
- **API-driven** (WordPress REST API is clunky)

Next.js excels at all these. The learning curve is worth it.

---

### Q: When should I hire a DevOps engineer?

**A:**
- **Phase 1-2:** Not needed (manage yourself with guides)
- **Phase 3:** Consider contractor for 2-4 weeks (migration setup)
- **Beyond 1M users:** Part-time DevOps (10-20 hrs/week) for monitoring, optimization

**Cost:** $50-100/hr contractor vs $8,000-15,000/mo full-time

**Alternative:** Managed services (stay on Vercel) if your time is more valuable than $700-2,000/mo savings.

---

### Q: What if I grow faster than expected?

**A:** Managed services (Supabase/Vercel) **scale automatically**. Stay there until you can plan migration properly. Fast growth is a good problem to have — pay the premium for managed services until you stabilize.

**Red flags to migrate earlier:**
- Costs >$500/mo and predictable traffic
- Performance degrading (need Redis anyway)
- Vendor limitations (Supabase connection limits, Vercel function timeouts)

---

### Q: Can I migrate back to Supabase if self-hosting fails?

**A:** Yes! Rollback plan in [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md):
1. Export from self-hosted (pg_dump)
2. Import to Supabase (pg_restore)
3. Update environment variables
4. Redeploy

**Downtime:** 30 minutes - 2 hours

Keep Supabase project active (paused) for 30 days after migration as backup.

---

### Q: How much dev time is required for each phase?

**Phase 1 (Current):**
- Redis setup: 1-2 days
- Database indexes: 1 hour
- Performance testing: ongoing

**Phase 2 (Database migration):**
- Learning: 1 week (read guides, test on staging)
- Setup: 3-5 days (server config, PostgreSQL, pgBouncer)
- Migration: 2-4 hours (cutover)
- Testing: 1 week (monitoring, optimization)
- **Total: 2-3 weeks**

**Phase 3 (Fully self-hosted):**
- Next.js hosting setup: 1 week
- Read replicas: 3-5 days
- Redis cluster: 2-3 days
- Monitoring: 2-3 days
- Testing: 1 week
- **Total: 3-4 weeks**

**Opportunity cost:** Is 3-4 weeks of your time worth $15,000/year savings at national scale? Usually yes.

---

## Conclusion

**Your architecture is solid.** Next.js + PostgreSQL + PostGIS will scale to 100k resources and millions of users.

**Your migration path is clear:**
1. **Now - Month 6:** Stay on Supabase, add Redis, focus on growth
2. **Month 6-12:** Migrate database when costs justify effort
3. **Year 2+:** Fully self-hosted when at national scale

**Your biggest wins:**
1. 🚀 **Redis caching** (80-90% query reduction, 5-10x speedup)
2. 📊 **Database indexes** (10-50x faster queries)
3. 🔗 **Connection pooling** (handles serverless functions)
4. 🌐 **Cloudflare CDN** (50-70% latency reduction)

**Start here:**
1. Implement Redis caching (even with Supabase) — **DO THIS BEFORE LAUNCH**
2. Create all database indexes
3. Run `./scripts/verify-performance.sh` regularly
4. Monitor costs and performance
5. Migrate when costs >$100/mo or users >5k/mo

You're building something that will scale. These guides ensure you get there efficiently.

---

**Last Updated:** 2025-11-10
**Questions?** Review the detailed guides or open an issue.

**Next:** [Read REDIS_SETUP_GUIDE.md →](REDIS_SETUP_GUIDE.md)
