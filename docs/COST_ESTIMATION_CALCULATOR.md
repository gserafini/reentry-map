# Cost Estimation Calculator

**Reentry Map: Infrastructure Cost Estimator**

Use this calculator to estimate infrastructure costs at various scales and make informed decisions about when to migrate from managed services to self-hosted.

Last Updated: 2025-11-10

---

## Quick Calculator

### Your Current Metrics

Enter your current or projected metrics:

| Metric                       | Value  | Unit     |
| ---------------------------- | ------ | -------- |
| Total resources in database  | **\_** | count    |
| Monthly active users         | **\_** | users    |
| Monthly page views           | **\_** | views    |
| Database size                | **\_** | GB       |
| SMS/phone OTP sent per month | **\_** | messages |

### Monthly Cost Comparison

Based on your metrics above, estimate costs:

---

## Detailed Cost Breakdown

### Option 1: Managed Services (Supabase + Vercel)

#### Supabase Pricing

| Tier           | Database Size | Price/Month | Included Features                               |
| -------------- | ------------- | ----------- | ----------------------------------------------- |
| **Free**       | <500MB        | $0          | 500MB database, 2GB bandwidth, 50k auth users   |
| **Pro**        | <8GB          | $25         | 8GB database, 50GB bandwidth, 100k auth users   |
| **Team**       | <100GB        | $599        | 100GB database, 250GB bandwidth, unlimited auth |
| **Enterprise** | Unlimited     | Custom      | Custom limits, SLA, support                     |

**Formula:**

```
Supabase Cost =
  IF database < 0.5GB AND users < 10k: $0
  ELSE IF database < 8GB AND users < 50k: $25
  ELSE IF database < 100GB AND users < 200k: $599
  ELSE: $1,500+
```

**Your estimate:**

- Database size: **\_** GB
- Monthly users: **\_**
- **Supabase tier:** **\_**
- **Supabase cost:** $**\_**

#### Vercel Pricing

| Tier           | Bandwidth | Function Invocations | Price/Month           |
| -------------- | --------- | -------------------- | --------------------- |
| **Hobby**      | 100GB     | 100 hours            | $0                    |
| **Pro**        | 1TB       | 1000 hours           | $20                   |
| **Team**       | Custom    | Custom               | $20/member + overages |
| **Enterprise** | Custom    | Custom               | Custom pricing        |

**Overages (Pro tier):**

- Bandwidth: $40 per 100GB
- Function execution: $40 per 100 hours

**Formula:**

```
Vercel Base = $20 (Pro tier)
Bandwidth Overage = MAX(0, (Bandwidth GB - 1000) / 100) × $40
Function Overage = MAX(0, (Function Hours - 1000) / 100) × $40

Vercel Total = Vercel Base + Bandwidth Overage + Function Overage
```

**Bandwidth estimation:**

```
Bandwidth (GB) = Page Views × Average Page Size (MB)

Typical page sizes:
- Homepage: 0.5 MB
- Search results: 0.3 MB
- Resource detail: 0.2 MB
- Map view: 0.8 MB

Average: 0.4 MB

Bandwidth (GB) = Page Views × 0.4 MB / 1000
```

**Function execution estimation:**

```
Function Hours = (API Requests × Average Duration) / 3600

Typical:
- API requests per page view: 3-5
- Average function duration: 200ms

Function Hours = Page Views × 4 × 0.2 / 3600
               = Page Views × 0.0002
```

**Your estimate:**

- Monthly page views: **\_**
- Bandwidth: **\_** GB
- Function hours: **\_** hours
- Bandwidth overages: $**\_** (if > 1TB)
- Function overages: $**\_** (if > 1000 hrs)
- **Vercel total:** $**\_**

#### Other Managed Service Costs

| Service               | Purpose                         | Cost/Month                          |
| --------------------- | ------------------------------- | ----------------------------------- |
| **Google Maps**       | Maps, geocoding                 | $0-200 (typically <$50)             |
| **OpenAI**            | AI agents                       | $10-100 (sporadic use)              |
| **Twilio (optional)** | SMS OTP (if not using Supabase) | Included in Supabase or $0.0079/SMS |
| **Sentry**            | Error tracking                  | $0 (free tier: 5k errors/mo)        |
| **Uptime monitoring** | UptimeRobot                     | $0 (free tier: 50 monitors)         |

**Your estimate:**

- Google Maps: $**\_**
- OpenAI: $**\_**
- Other: $**\_**

#### Total Managed Services Cost

```
Total Managed = Supabase + Vercel + Google Maps + OpenAI + Other
```

**Your total:** $**\_**

---

### Option 2: Self-Hosted (Your Dedicated Server)

#### Fixed Costs

| Item                      | Cost/Month | Notes                                                       |
| ------------------------- | ---------- | ----------------------------------------------------------- |
| **Dedicated server**      | $0 - $200  | You already have one. Additional servers at scale: ~$200/ea |
| **Twilio SMS**            | Variable   | $0.0079 per SMS                                             |
| **Backblaze B2 backups**  | Variable   | $5 per TB/month                                             |
| **Cloudflare**            | $0 - $20   | Free tier sufficient, Pro at $20 optional                   |
| **Domain**                | $10        | Annual cost amortized                                       |
| **Monitoring (optional)** | $0 - $100  | Prometheus free, DataDog $15/host                           |

#### Twilio SMS Cost

**Formula:**

```
Twilio Cost = OTP Messages × $0.0079

OTP estimation:
- New signups: ~30% of new users
- Returning logins: ~10% of monthly users
- Total OTP = (New Users × 0.3 × 2) + (Returning Users × 0.1 × 2)
             = (New Users × 0.6) + (MAU × 0.1 × 2)

Conservative estimate:
Total OTP ≈ Monthly Users × 0.25

Twilio Cost = Monthly Users × 0.25 × $0.0079
            = Monthly Users × $0.002
```

**Your estimate:**

- Monthly users: **\_**
- OTP messages: **\_** (users × 0.25)
- **Twilio cost:** $**\_** (messages × $0.0079)

#### Backblaze B2 Backup Cost

**Formula:**

```
Backup Cost = Database Size × Retention Factor × $5/TB

Retention factor:
- Daily backups, 30 day retention: 1.2x
- Daily backups, 90 day retention: 1.5x
- Hourly backups, 7 day retention: 1.3x

Typical retention: 30 days daily = 1.2x

Backup Cost (GB) = Database Size × 1.2 × $5 / 1000
```

**Your estimate:**

- Database size: **\_** GB
- Retention: **\_** days
- Total backup storage: **\_** GB (DB × 1.2)
- **Backup cost:** $**\_** (storage GB × $5 / 1000)

#### Cloudflare Cost

| Tier         | Price/Month | Features                                                |
| ------------ | ----------- | ------------------------------------------------------- |
| **Free**     | $0          | Unlimited bandwidth, basic CDN, SSL                     |
| **Pro**      | $20         | Image optimization, mobile optimization, better caching |
| **Business** | $200        | Custom caching rules, load balancing                    |

**Your estimate:** $**\_**

#### Total Self-Hosted Cost

```
Total Self-Hosted = Server + Twilio + Backups + Cloudflare + Monitoring + Domain
```

**Your total:** $**\_**

---

## Cost Comparison at Different Scales

### Scale 1: MVP (500 resources, 1k users/mo)

| Metric        | Value  |
| ------------- | ------ |
| Resources     | 500    |
| Monthly users | 1,000  |
| Page views    | 5,000  |
| Database size | 500 MB |
| OTP messages  | 250    |

**Managed Services:**

- Supabase Free: $0
- Vercel Pro: $20
- Google Maps: $5
- **Total: $25/mo** ($300/year)

**Self-Hosted:**

- Server: $0
- Twilio: $2
- Backups: $0 (<1GB)
- Cloudflare: $0
- **Total: $2/mo** ($24/year)

**Savings:** $276/year (but not worth migration effort at this scale)

---

### Scale 2: Oakland Launch (2k resources, 5k users/mo)

| Metric        | Value  |
| ------------- | ------ |
| Resources     | 2,000  |
| Monthly users | 5,000  |
| Page views    | 25,000 |
| Database size | 2 GB   |
| OTP messages  | 1,250  |

**Managed Services:**

- Supabase Pro: $25
- Vercel Pro: $20
- Google Maps: $10
- **Total: $55/mo** ($660/year)

**Self-Hosted:**

- Server: $0
- Twilio: $10
- Backups: $5
- Cloudflare: $0
- **Total: $15/mo** ($180/year)

**Savings:** $480/year (still not worth migration)

---

### Scale 3: Bay Area (5k resources, 10k users/mo)

| Metric        | Value   |
| ------------- | ------- |
| Resources     | 5,000   |
| Monthly users | 10,000  |
| Page views    | 100,000 |
| Database size | 5 GB    |
| OTP messages  | 2,500   |

**Managed Services:**

- Supabase Pro: $25
- Vercel Pro: $20 + $50 overages = $70
- Google Maps: $20
- OpenAI: $10
- **Total: $125/mo** ($1,500/year)

**Self-Hosted:**

- Server: $0
- Twilio: $20
- Backups: $5
- Cloudflare: $0
- **Total: $25/mo** ($300/year)

**Savings:** $1,200/year ⭐ **Migration worth considering**

---

### Scale 4: California (20k resources, 50k users/mo)

| Metric        | Value   |
| ------------- | ------- |
| Resources     | 20,000  |
| Monthly users | 50,000  |
| Page views    | 500,000 |
| Database size | 20 GB   |
| OTP messages  | 12,500  |

**Managed Services:**

- Supabase Pro: $25 (still under 8GB) or Team $599
- Vercel Pro: $20 + $200 overages = $220
- Google Maps: $50
- OpenAI: $30
- **Total (Pro): $325/mo** or **(Team): $900/mo**

**Self-Hosted:**

- Server: $0
- Twilio: $100
- Backups: $10
- Cloudflare: $20 (Pro for optimization)
- **Total: $130/mo** ($1,560/year)

**Savings:** $2,340/year (Pro) or $9,240/year (Team) ⭐⭐ **Definitely migrate**

---

### Scale 5: Multi-State (40k resources, 100k users/mo)

| Metric        | Value     |
| ------------- | --------- |
| Resources     | 40,000    |
| Monthly users | 100,000   |
| Page views    | 1,000,000 |
| Database size | 40 GB     |
| OTP messages  | 25,000    |

**Managed Services:**

- Supabase Team: $599
- Vercel Pro: $20 + $400 overages = $420
- Google Maps: $100
- OpenAI: $50
- **Total: $1,169/mo** ($14,028/year)

**Self-Hosted:**

- Server: $0-200 (may need second server)
- Twilio: $200
- Backups: $20
- Cloudflare Pro: $20
- Monitoring: $50
- **Total: $290-490/mo** ($3,480-5,880/year)

**Savings:** $8,148-10,548/year ⭐⭐⭐ **Absolutely migrate**

---

### Scale 6: National (100k resources, 500k users/mo)

| Metric        | Value     |
| ------------- | --------- |
| Resources     | 100,000   |
| Monthly users | 500,000   |
| Page views    | 5,000,000 |
| Database size | 75 GB     |
| OTP messages  | 125,000   |

**Managed Services:**

- Supabase Team/Enterprise: $599-1,500
- Vercel Enterprise: $500-2,000
- Google Maps: $200
- OpenAI: $100
- **Total: $1,400-3,800/mo** ($16,800-45,600/year)

**Self-Hosted:**

- Servers (3): $600 (primary + 2 replicas)
- Twilio: $1,000
- Backups: $50
- Cloudflare Pro: $20
- Monitoring: $100
- **Total: $1,770/mo** ($21,240/year)

**Savings:** $0-24,360/year (depends on Vercel Enterprise pricing)

**At this scale:** Fully self-hosted is significantly cheaper than managed services at their enterprise tiers.

---

## Break-Even Analysis

### When Does Migration Pay Off?

**Migration effort:**

- Phase 2 (Database only): 80 hours dev time
- Phase 3 (Fully self-hosted): 120 hours dev time

**Your dev time value:** $**\_** /hour (typical: $50-150/hr)

**Migration cost:**

- Phase 2: 80 hrs × $/hr = $**\_**
- Phase 3: 120 hrs × $/hr = $**\_**

**Monthly savings at different scales:**

| Scale | Users/mo | Savings/mo            | Months to ROI (Phase 2) | Months to ROI (Phase 3) |
| ----- | -------- | --------------------- | ----------------------- | ----------------------- |
| 1k    | $40      | 200 months (16 years) | 300 months (25 years)   |
| 5k    | $100     | 80 months (6.7 years) | 120 months (10 years)   |
| 10k   | $120     | 67 months (5.6 years) | 100 months (8.3 years)  |
| 50k   | $650     | 12 months             | 18 months               |
| 100k  | $1,200   | 7 months              | 10 months               |
| 500k  | $2,000   | 4 months              | 6 months                |

**Rule of thumb:**

- Migrate Phase 2 when monthly savings > $300 (ROI in 1-2 years)
- Migrate Phase 3 when monthly savings > $700 (ROI in 1 year)

---

## Scenario Calculator

### Your Custom Scenario

Fill in your projected metrics:

**Projected Scale:**

- Resources: **\_**
- Monthly users: **\_**
- Page views: **\_**
- Database size: **\_** GB

**Managed Services Cost:**

1. Supabase tier: **\_** → $**\_**/mo
2. Vercel cost:
   - Bandwidth: **\_** GB × ($40/100GB) = $**\_**
   - Functions: **\_** hrs × ($40/100hrs) = $**\_**
   - Total Vercel: $20 + $**\_** + $**\_** = $**\_**
3. Other services: $**\_**
4. **Total managed:** $**\_**/mo

**Self-Hosted Cost:**

1. Server: $**\_**/mo
2. Twilio: (users × 0.002) = $**\_**/mo
3. Backups: (DB GB × 1.2 × $5 / 1000) = $**\_**/mo
4. Cloudflare: $**\_**/mo
5. Other: $**\_**/mo
6. **Total self-hosted:** $**\_**/mo

**Analysis:**

- **Monthly savings:** $**\_** (Managed - Self-hosted)
- **Annual savings:** $**\_** × 12 = $**\_**
- **Migration cost:** $**\_** (80-120 hrs × $/hr)
- **Months to ROI:** Migration cost / Monthly savings = **\_** months

**Decision:**

- If ROI < 12 months → ✅ **Migrate now**
- If ROI 12-24 months → ⚠️ **Consider migrating**
- If ROI > 24 months → ❌ **Stay on managed services**

---

## Hidden Costs to Consider

### Managed Services Hidden Costs

**Pros:**

- ✅ No ops time (worth $0-2,000/mo depending on your time value)
- ✅ Automatic scaling (no planning required)
- ✅ Built-in backups, monitoring, security

**Cons:**

- ❌ Vendor lock-in (migration effort if you outgrow)
- ❌ Limited customization (can't optimize specific bottlenecks)
- ❌ Unpredictable overages (bandwidth, functions)

### Self-Hosted Hidden Costs

**Pros:**

- ✅ Full control (optimize exactly what you need)
- ✅ Predictable costs (fixed server cost)
- ✅ No vendor lock-in

**Cons:**

- ❌ Ops time (monitoring, updates, troubleshooting)
  - Estimate: 5-10 hrs/month at Phase 2
  - Estimate: 10-20 hrs/month at Phase 3
  - Value: 10 hrs × $100/hr = $1,000/mo opportunity cost
- ❌ Downtime risk (if not configured properly)
- ❌ Security responsibility (must stay on top of patches)

**Adjusted self-hosted cost:**

```
True Self-Hosted Cost = Infrastructure + (Ops Hours × $/hr)

Example at 50k users:
- Infrastructure: $130/mo
- Ops time: 10 hrs × $100/hr = $1,000/mo
- True cost: $1,130/mo

Vs managed at $900/mo → Managed is cheaper!
```

**Key insight:** If your time is valuable (>$100/hr), managed services may be cheaper even with higher infrastructure costs.

---

## Recommendations by Scale

### 0-10k users/month

**Recommendation:** ✅ **Stay on managed services (Supabase + Vercel)**

**Why:**

- Cost difference minimal ($40-100/mo savings)
- Your time better spent on product/growth
- Automatic scaling handles unexpected traffic
- Zero ops overhead

**Action:** Implement Redis caching (even with Supabase)

---

### 10k-50k users/month

**Recommendation:** ⚠️ **Consider Phase 2 migration (Database only)**

**Why:**

- Savings: $1,200-5,000/year
- ROI: 1-2 years
- You have predictable traffic (can plan migration)
- Your time less critical (product-market fit established)

**Evaluation criteria:**

1. Is monthly cost >$100? → Migrate
2. Is traffic predictable (not 10x month-over-month)? → Migrate
3. Do you have 2-3 weeks for project? → Migrate
4. Is your dev time worth <$150/hr? → Migrate

**Action:** Read MIGRATION_GUIDE.md, plan Phase 2

---

### 50k-200k users/month

**Recommendation:** ✅ **Definitely migrate Phase 2, consider Phase 3**

**Why:**

- Savings: $5,000-15,000/year
- ROI: 6-12 months
- Managed services getting expensive
- You need custom optimization anyway

**Action:** Migrate to Phase 2, evaluate Phase 3 after 6 months

---

### 200k+ users/month

**Recommendation:** ✅ **Migrate to Phase 3 (Fully self-hosted)**

**Why:**

- Savings: $15,000-30,000/year
- ROI: 4-6 months
- Enterprise pricing very expensive
- You need full control for optimization
- Ops overhead justified by savings

**Action:** Migrate to Phase 3, hire part-time DevOps if needed

---

## Decision Tree

```
START: What is your monthly cost?
  │
  ├─ < $50/mo → STAY managed, focus on growth
  │
  ├─ $50-100/mo → Implement Redis, monitor growth
  │
  ├─ $100-300/mo → Evaluate Phase 2 migration
  │   │
  │   ├─ Dev time < $100/hr? → Migrate Phase 2
  │   └─ Dev time > $150/hr? → Stay managed a bit longer
  │
  ├─ $300-1,000/mo → Definitely migrate Phase 2
  │   │
  │   └─ After 6 months, evaluate Phase 3
  │
  └─ > $1,000/mo → Migrate to Phase 3 (fully self-hosted)
      │
      └─ Consider hiring DevOps contractor
```

---

## Summary

**Use this calculator to:**

1. Estimate current and projected infrastructure costs
2. Compare managed vs self-hosted at your scale
3. Calculate ROI for migration
4. Make data-driven decisions

**Key insights:**

- Managed services optimal for <10k users
- Self-hosted database pays off at >10k users
- Fully self-hosted makes sense at >50k users
- Factor in your time value (ops overhead)

**Next steps:**

1. Fill in your metrics above
2. Calculate costs for both options
3. Determine ROI timeline
4. Make migration decision
5. If migrating, read [SCALING_GUIDE_OVERVIEW.md](SCALING_GUIDE_OVERVIEW.md)

---

**Last Updated:** 2025-11-10

**Related Documentation:**

- [SCALING_GUIDE_OVERVIEW.md](SCALING_GUIDE_OVERVIEW.md) - Strategic roadmap
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Step-by-step migration
- [REDIS_SETUP_GUIDE.md](REDIS_SETUP_GUIDE.md) - Caching setup
- [PERFORMANCE_OPTIMIZATION_CHECKLIST.md](PERFORMANCE_OPTIMIZATION_CHECKLIST.md) - Testing
