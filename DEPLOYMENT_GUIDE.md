# Reentry Map - Deployment Guide

## Overview

This guide covers deploying Reentry Map to production using Vercel and Supabase.

## Prerequisites

- [ ] GitHub account
- [ ] Vercel account (free tier is fine)
- [ ] Supabase account (free tier is fine)
- [ ] Google Cloud account (for Maps API)
- [ ] OpenAI account (for AI features)
- [ ] Domain name (optional but recommended)

---

## Production Infrastructure
```
┌─────────────────────────────────────────┐
│           Vercel (Hosting)              │
│  - Next.js application                  │
│  - Serverless functions                 │
│  - CDN                                  │
│  - SSL certificates                     │
└──────────────┬──────────────────────────┘
               │
               ├─────────► Supabase (Database)
               │           - PostgreSQL
               │           - Auth
               │           - Storage
               │
               ├─────────► Google Cloud
               │           - Maps API
               │           - Geocoding API
               │
               └─────────► OpenAI
                           - GPT-4o-mini
```

---

## Step 1: Prepare Repository

### 1.1 Create GitHub Repository
```bash
# Initialize git (if not already done)
git init

# Add remote
git remote add origin https://github.com/gserafini/reentry-map.git

# Commit all changes
git add .
git commit -m "Initial commit - Phase 1 MVP"

# Push to GitHub
git push -u origin main
```

### 1.2 Create Branches
```bash
# Create staging branch
git checkout -b staging
git push -u origin staging

# Switch back to main
git checkout main
```

**Branch strategy**:
- `main` → Production environment
- `staging` → Staging environment
- `feature/*` → Feature branches (merge to staging first)

---

## Step 2: Set Up Production Database

### 2.1 Create Production Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New project"
3. Settings:
   - **Name**: reentry-map-prod
   - **Database Password**: Generate strong password (save securely!)
   - **Region**: Choose closest to users (us-west-1 for Oakland)
   - **Plan**: Free tier to start

### 2.2 Run Database Migrations

1. Go to SQL Editor in Supabase dashboard
2. Run each migration file in order:
   - `supabase/migrations/20250101000000_initial_schema.sql`
   - `supabase/migrations/20250101000001_rls_policies.sql`
   - `supabase/migrations/20250101000002_functions_triggers.sql`
   - `supabase/migrations/20250101000003_seed_data.sql`

3. Verify tables created:
   - Go to Database > Tables
   - Should see: resources, users, favorites, reviews, etc.

### 2.3 Configure Auth

1. Go to Authentication > Settings
2. Enable Phone provider
3. Configure Twilio (or use Supabase's default SMS provider)
4. Set rate limits:
   - Max SMS per hour: 10
   - Max verification attempts: 3

### 2.4 Configure Storage

1. Go to Storage
2. Create bucket: `resource-photos`
3. Set policy: Public read, authenticated write

---

## Step 3: Deploy to Vercel

### 3.1 Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import `gserafini/reentry-map`
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3.2 Configure Environment Variables

Add these in Vercel dashboard (Settings > Environment Variables):
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIza...
GOOGLE_MAPS_KEY=AIza...

# OpenAI
OPENAI_API_KEY=sk-...

# App URL
NEXT_PUBLIC_APP_URL=https://reentry-map.vercel.app

# Cron Secret (generate random string)
CRON_SECRET=your-random-secret-here

# Optional: Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=auto
```

**Important**: Set environment variables for **both** Production and Preview environments.

### 3.3 Deploy

1. Click "Deploy"
2. Wait for deployment (2-3 minutes)
3. Visit your site: `https://reentry-map.vercel.app`

---

## Step 4: Configure Custom Domain (Optional)

### 4.1 Add Domain to Vercel

1. Go to Project Settings > Domains
2. Add domain: `reentrymap.org`
3. Vercel will provide DNS records

### 4.2 Configure DNS

Add these records to your domain registrar:
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 4.3 Wait for DNS Propagation

- Usually takes 5-30 minutes
- Vercel will automatically provision SSL certificate
- Site will be accessible at `https://reentrymap.org`

### 4.4 Update Environment Variables
```bash
NEXT_PUBLIC_APP_URL=https://reentrymap.org
```

---

## Step 5: Configure Cron Jobs

### 5.1 Create Cron Configuration

Already in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/agents",
    "schedule": "0 2 * * 0"
  }]
}
```

This runs AI agents every Sunday at 2am.

### 5.2 Test Cron Endpoint
```bash
curl -X GET https://reentry-map.vercel.app/api/cron/agents \
  -H "Authorization: Bearer your-cron-secret"
```

Should return:
```json
{
  "success": true,
  "jobs_run": [
    "discovery",
    "verification"
  ]
}
```

---

## Step 6: Set Up Monitoring

### 6.1 Vercel Analytics

Already enabled if you added `NEXT_PUBLIC_VERCEL_ANALYTICS_ID=auto`.

Access at: Project > Analytics

Tracks:
- Page views
- User sessions
- Core Web Vitals
- Performance metrics

### 6.2 Error Monitoring

Vercel automatically captures errors.

Access at: Project > Logs

Filter by:
- Error level
- Time range
- Function/route

### 6.3 Set Up Alerts

1. Go to Project > Settings > Notifications
2. Add email for:
   - Deployment failures
   - Error rate spikes
   - Performance degradation

---

## Step 7: Populate Production Data

### 7.1 Add Initial Resources

Two options:

**Option A: Manual Entry** (Recommended for first 50)
1. Sign in as admin
2. Go to Admin > Resources
3. Add resources one by one

**Option B: Bulk Import**
```bash
# Prepare CSV: resources.csv
# Run import script
npm run import-resources -- --file resources.csv --env production
```

### 7.2 Run AI Enrichment
```bash
# From admin dashboard
POST /api/agents/enrich
```

Or use admin UI: Admin > AI Agents > "Enrich All Resources"

### 7.3 Verify Data Quality

1. Spot check 10 random resources
2. Verify geocoding correct
3. Check photos loaded
4. Verify categories assigned
5. Test search functionality

---

## Step 8: Security Checklist

### 8.1 Environment Variables

- [ ] All secrets in Vercel environment variables (not in code)
- [ ] `.env.local` in `.gitignore`
- [ ] Service role key only in server-side code
- [ ] API keys restricted to specific domains

### 8.2 Supabase Security

- [ ] RLS enabled on all tables
- [ ] Policies tested and working
- [ ] Service role key kept secret
- [ ] Database backups enabled

### 8.3 API Security

- [ ] Rate limiting configured
- [ ] CORS restricted to your domain
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using Supabase client)
- [ ] XSS protection (React escapes by default)

### 8.4 Authentication

- [ ] Phone authentication working
- [ ] Session cookies HTTP-only
- [ ] HTTPS enforced
- [ ] OTP expiration set (10 minutes)
- [ ] Rate limiting on OTP requests

---

## Step 9: Performance Optimization

### 9.1 Enable Caching

Already configured in Next.js:
- Static pages cached automatically
- API routes can set Cache-Control headers
- Images optimized with next/image

### 9.2 Configure CDN

Vercel CDN enabled by default. No configuration needed.

### 9.3 Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_resources_category_rating 
ON resources(primary_category, rating_average DESC);

CREATE INDEX IF NOT EXISTS idx_resources_location_category 
ON resources USING GIST (ST_MakePoint(longitude, latitude)::geography)
WHERE primary_category IS NOT NULL;

-- Analyze tables
ANALYZE resources;
ANALYZE resource_reviews;
```

### 9.4 Monitor Performance

Run Lighthouse audit:
```bash
npm run lighthouse
```

Target scores:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

---

## Step 10: Backup Strategy

### 10.1 Database Backups

Supabase Pro includes daily backups. On free tier:

**Manual Backups**:
```bash
# Weekly manual backup
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" > backup-$(date +%Y%m%d).sql
```

Store backups securely (encrypted cloud storage).

### 10.2 Code Backups

GitHub is your code backup. Ensure:
- [ ] All code committed
- [ ] Tags for releases
- [ ] README up to date

### 10.3 Environment Variables Backup

Keep secure copy of all environment variables:
```bash
# Save to password manager
# Or encrypted file
```

---

## Step 11: Launch Checklist

### Pre-Launch (Day Before)

- [ ] All features working in staging
- [ ] Content reviewed (no typos, accurate info)
- [ ] 50+ resources added and verified
- [ ] Test user flows manually
- [ ] Performance tested (Lighthouse > 90)
- [ ] Mobile tested (iOS and Android)
- [ ] Accessibility tested
- [ ] Security reviewed
- [ ] Backups configured
- [ ] Monitoring enabled
- [ ] Support email set up
- [ ] Privacy policy published
- [ ] Terms of service published

### Launch Day

- [ ] Final smoke test in production
- [ ] Monitor error logs
- [ ] Watch analytics for traffic
- [ ] Be ready to respond to issues
- [ ] Announce launch
- [ ] Share with initial users

### Post-Launch (First Week)

- [ ] Daily monitoring
- [ ] Respond to feedback quickly
- [ ] Fix critical bugs immediately
- [ ] Document issues and learnings
- [ ] Thank early users

---

## Troubleshooting

### Deployment Fails

**Error**: Build fails
```bash
# Check build logs in Vercel
# Common issues:
- TypeScript errors
- Missing environment variables
- Dependency issues

# Fix:
npm run type-check
npm run build
```

**Error**: Runtime errors after deployment
```bash
# Check Vercel logs
# Common issues:
- Environment variables not set
- API endpoint 404s
- Database connection issues

# Verify env vars in Vercel dashboard
```

### Database Connection Issues

**Error**: Supabase connection fails
```bash
# Check:
- NEXT_PUBLIC_SUPABASE_URL correct
- NEXT_PUBLIC_SUPABASE_ANON_KEY correct
- Supabase project not paused

# Test connection:
curl https://your-project.supabase.co/rest/v1/resources \
  -H "apikey: your-anon-key"
```

### Performance Issues

**Problem**: Slow page loads
```bash
# Run Lighthouse
npm run lighthouse

# Common causes:
- Large images not optimized
- Too many API calls
- Missing indexes

# Fix:
- Use next/image for all images
- Implement pagination
- Add database indexes
```

---

## Rollback Procedure

If critical bug in production:

### Option 1: Revert Deployment (Fast)

1. Go to Vercel Dashboard > Deployments
2. Find last working deployment
3. Click "..." > "Promote to Production"
4. Takes effect immediately

### Option 2: Revert Code (Thorough)
```bash
# Find last good commit
git log

# Revert to that commit
git revert <commit-hash>

# Push to trigger new deployment
git push origin main
```

---

## Scaling Considerations

### When to Upgrade

**Supabase**:
- Free tier: 500MB database, 2GB bandwidth/month
- Upgrade when: > 400MB used or > 1.5GB bandwidth

**Vercel**:
- Free tier: 100GB bandwidth/month, 100 function invocations/day
- Upgrade when: Approaching limits

### Performance at Scale

**1,000 users**:
- Current setup handles easily
- No changes needed

**10,000 users**:
- May need Supabase Pro ($25/month)
- May need Vercel Pro ($20/month)
- Add Redis caching

**100,000 users**:
- Definitely need paid tiers
- Add CDN for assets
- Implement advanced caching
- Consider database read replicas

---

## Maintenance Schedule

### Daily
- Check error logs
- Monitor user feedback
- Respond to support requests

### Weekly
- Review analytics
- Check performance metrics
- Update content as needed

### Monthly
- Security updates (dependencies)
- Database maintenance (vacuum, analyze)
- Review and respond to user suggestions
- Generate reports for stakeholders

### Quarterly
- Comprehensive security audit
- Performance optimization review
- Feature prioritization planning
- User survey

---

## Support & Escalation

### Support Channels

**User Support**:
- Email: support@reentrymap.org
- Response time: 24 hours

**Technical Issues**:
- Email: gserafini@gmail.com
- GitHub Issues: github.com/gserafini/reentry-map/issues

### Escalation Path

**Critical (Site Down)**:
1. Check Vercel status
2. Check Supabase status
3. Review recent deployments
4. Rollback if needed

**High (Feature Broken)**:
1. Reproduce issue
2. Check error logs
3. Create hotfix branch
4. Deploy fix
5. Verify resolution

**Medium (Bug Report)**:
1. Document issue
2. Add to backlog
3. Prioritize in next sprint

---

## Success Metrics Post-Launch

Track these weekly:

### User Metrics
- Active users (DAU/MAU)
- New signups
- Retention rate

### Engagement
- Searches per user
- Resources viewed
- Favorites added
- Reviews written

### Quality
- Error rate < 0.1%
- Performance score > 90
- User satisfaction > 4/5

### Business
- Resources in database
- Data accuracy rate
- Support ticket volume

---

## Conclusion

You're now live! 🎉

Remember:
- Monitor closely first week
- Respond to feedback quickly
- Iterate based on user needs
- Don't stress over small bugs
- Celebrate the launch!

This is just the beginning. Phase 2 awaits! 🚀