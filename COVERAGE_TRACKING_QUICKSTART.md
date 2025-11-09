# Coverage Tracking System - Quick Start Guide

**5-minute setup** to activate the Coverage Tracking System.

## Step 1: Run Database Migrations (2 minutes)

1. Open Supabase SQL Editor:
   - Go to: https://supabase.com/dashboard/project/scvshbntarpyjvdexpmp/sql/new

2. Copy and paste this file:

   ```
   supabase/migrations/combined_coverage_tracking.sql
   ```

3. Click **RUN**

4. Verify tables were created - you should see success messages for:
   - `county_data` table
   - `coverage_metrics` table
   - PostgreSQL functions

**✅ Checkpoint**: Run this query to verify:

```sql
SELECT COUNT(*) FROM county_data;
SELECT COUNT(*) FROM coverage_metrics;
```

Should return 0 for both (empty tables, ready for data).

## Step 2: Seed Initial County Data (1 minute)

Run the seeding script to add 6 Bay Area counties:

```bash
node scripts/seed-county-data.mjs
```

**Expected output:**

```
🌱 Seeding county data...
📊 Counties to insert: 6
📥 Inserting 6 new counties...
   ✅ Inserted 6/6 counties

✅ Successfully seeded 6 counties
```

**✅ Checkpoint**: Verify in Supabase:

```sql
SELECT county_name, state_code, priority_tier
FROM county_data
ORDER BY priority_tier, county_name;
```

Should show 6 California counties.

## Step 3: Enrich Resources with County Data (1 minute)

Add county FIPS codes to your existing resources:

```bash
node scripts/enrich-resources-with-county.mjs
```

**Expected output:**

```
🔍 Fetching resources without county_fips...
📊 Found X resources to enrich
📍 Loaded 6 counties for matching

🔄 Enriching resources...
   ✅ Enriched X/X resources

✅ Enrichment complete!
```

**✅ Checkpoint**: Verify resources have counties:

```sql
SELECT
  name,
  city,
  county_fips,
  (SELECT county_name FROM county_data WHERE fips_code = resources.county_fips) as county
FROM resources
WHERE county_fips IS NOT NULL
LIMIT 10;
```

## Step 4: Calculate Coverage Metrics (1 minute)

### Option A: Via Admin Dashboard (Recommended)

1. Start your dev server:

   ```bash
   npm run dev
   ```

2. Log in as admin at: http://localhost:3000/auth

3. Navigate to: http://localhost:3000/admin/coverage-map

4. Click: **"Recalculate All Metrics"** button

5. Wait 10-30 seconds for calculation

### Option B: Via API (if you prefer)

```bash
# First, get your session token by logging in
# Then make this request:
curl -X POST http://localhost:3000/api/admin/coverage/calculate \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json"
```

**✅ Checkpoint**: Visit `/admin/coverage-map` and verify:

- Summary statistics show numbers (not zeros)
- Map displays (even if empty initially)
- Tabs work (Coverage, Resources, Priority)

## Step 5: Verify Setup Complete ✅

Visit: http://localhost:3000/admin/coverage-map

You should see:

- **Total Resources**: (your current resource count)
- **National Coverage**: (calculated score 0-100)
- **States Covered**: 1 (California)
- **Counties Covered**: up to 6
- **Tier 1 Coverage**: Shows percentage of Tier 1 counties covered

**Buttons should work:**

- ✅ "Recalculate All Metrics" - triggers recalculation
- ✅ "Export CSV Report" - downloads coverage data
- ✅ "Generate Donor Report" - creates HTML report

## Troubleshooting

### "Table 'county_data' does not exist"

**Solution**: Complete Step 1 (run migrations)

### "No counties found for state: CA"

**Solution**: Complete Step 2 (seed county data)

### All coverage scores show 0%

**Solution**: Complete Step 4 (calculate metrics)

### Script fails with "Missing required environment variables"

**Solution**: Verify `.env.local` has:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://scvshbntarpyjvdexpmp.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_HwHPDH4YOc61xw0sstMHCQ_z4RroQhV
```

### "Unauthorized" error when accessing /admin/coverage-map

**Solution**:

1. Log in as admin
2. Verify your user has `is_admin = true` in the `users` table

## Next Steps

After setup is complete:

1. **Add More Counties**: Edit `scripts/seed-county-data.mjs` to include more US counties
2. **Improve Accuracy**: Add GeoJSON boundaries for precise county matching
3. **Set Goals**: Define coverage targets for Tier 1 counties
4. **Generate Reports**: Use donor reports for fundraising

## Quick Reference

**Admin Dashboard**: http://localhost:3000/admin/coverage-map

**Key Scripts**:

- `node scripts/seed-county-data.mjs` - Add counties
- `node scripts/enrich-resources-with-county.mjs` - Update resources
- Combined migration: `supabase/migrations/combined_coverage_tracking.sql`

**Documentation**:

- Full setup guide: `COVERAGE_TRACKING_SETUP.md`
- System design: `docs/COVERAGE_TRACKING_SYSTEM.md`

---

**Setup Time**: ~5 minutes
**Status**: Ready for production ✅
**Last Updated**: 2025-01-29
