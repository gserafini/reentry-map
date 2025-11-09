# Coverage Tracking System Setup Guide

This guide will help you set up and activate the Coverage Tracking System for Reentry Map.

## Prerequisites

- Admin access to your Supabase project
- Admin user account in your Reentry Map application
- Service role key from Supabase (for scripts) - **optional**

## Setup Steps

### Step 1: Run Database Migrations

The coverage tracking system requires two database migrations. You have two options:

#### Option A: Run via Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor** → **New Query**
3. Run the migrations in order:

**Migration 1: Tables** (`supabase/migrations/20250129000000_coverage_tracking_tables.sql`)

```sql
-- Copy and paste the entire contents of:
-- supabase/migrations/20250129000000_coverage_tracking_tables.sql
```

**Migration 2: Functions** (`supabase/migrations/20250129000001_coverage_calculation_function.sql`)

```sql
-- Copy and paste the entire contents of:
-- supabase/migrations/20250129000001_coverage_calculation_function.sql
```

4. Click **Run** for each migration

#### Option B: Run via Script (Requires Service Role Key)

1. Add your Supabase service role key to `.env.local`:

   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

2. Run the migration script:
   ```bash
   node scripts/run-coverage-migrations.mjs
   ```

**Where to find your service role key:**

- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
- Under "Project API keys" → Copy the **service_role** key
- ⚠️ **WARNING**: This key has full admin access. Never commit it to git!

### Step 2: Seed County Data

The system needs US county reference data with FIPS codes.

#### Option A: Seed Initial Bay Area Counties (Quick Start)

Run the seeding script to add 6 Bay Area counties:

```bash
node scripts/seed-county-data.mjs
```

This will add:

- Alameda County (06001) - Tier 1
- Contra Costa County (06013) - Tier 2
- San Francisco County (06075) - Tier 1
- San Mateo County (06081) - Tier 2
- Santa Clara County (06085) - Tier 1
- Solano County (06095) - Tier 2

#### Option B: Load Full US County Dataset

For comprehensive coverage tracking across the entire US:

1. Download US county data from US Census Bureau:
   - FIPS codes: https://www.census.gov/geographies/reference-files/2020/demo/popest/2020-fips.html
   - Population estimates: https://www.census.gov/data/datasets/time-series/demo/popest/2020s-counties-total.html

2. Modify `scripts/seed-county-data.mjs` to include all counties

3. Optional: Add GeoJSON county boundaries for accurate choropleth maps:
   - Download from: https://github.com/plotly/datasets/blob/master/geojson-counties-fips.json
   - Add `geometry` field to each county record

### Step 3: Enrich Resources with County Data

Add county FIPS codes to your existing resources:

```bash
node scripts/enrich-resources-with-county.mjs
```

This script will:

- Find all resources with lat/lng but no `county_fips`
- Use nearest-neighbor matching to assign county FIPS codes
- Update resources with county information

**Note**: The script uses a simple nearest-neighbor algorithm. For production accuracy, consider using PostGIS `ST_Contains` with actual county boundary polygons.

### Step 4: Calculate Initial Coverage Metrics

You have two options to trigger the initial coverage calculation:

#### Option A: Via Admin Dashboard (Recommended)

1. Log in as an admin user
2. Navigate to: `/admin/coverage-map`
3. Click the **"Recalculate All Metrics"** button
4. Wait for calculation to complete (~30-60 seconds)

#### Option B: Via API Endpoint

```bash
curl -X POST https://your-app-url.vercel.app/api/admin/coverage/calculate \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json"
```

### Step 5: Verify Setup

1. Go to `/admin/coverage-map`
2. You should see:
   - ✅ Summary statistics (total resources, national coverage, etc.)
   - ✅ Coverage map with county data
   - ✅ View mode tabs (Coverage, Resources, Priority)
   - ✅ Export and report generation buttons

3. Test functionality:
   - Click counties on the map to view details
   - Switch between view modes
   - Generate a CSV export
   - Create a donor report

## Troubleshooting

### "Missing required environment variables"

**Solution**: Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`:

1. Go to Supabase Dashboard → Settings → API
2. Copy the **service_role** key
3. Add to `.env.local`: `SUPABASE_SERVICE_ROLE_KEY=your_key_here`
4. Restart your dev server

### "Table 'county_data' not found"

**Solution**: Run the database migrations (Step 1)

### "No counties found for state: CA"

**Solution**: Run the county seeding script (Step 2)

### "All resources already have county_fips assigned"

**Solution**: This is normal if you've already run the enrichment script. Resources are already enriched!

### Coverage scores showing 0%

**Solution**: Run the coverage calculation (Step 4)

## Features Available

Once setup is complete, you can:

### For Admins

- **View Coverage Map**: Interactive choropleth map showing coverage by county
- **Analyze Metrics**: Detailed statistics at national, state, and county levels
- **Export Reports**: CSV exports for analysis
- **Donor Reports**: Auto-generated HTML reports with talking points
- **Trigger Research**: Queue AI agents to find resources in underserved areas

### Coverage Scoring Formula

The composite coverage score (0-100) is calculated as:

```
Coverage Score =
  (Resource Count × 30%) +
  (Category Coverage × 30%) +
  (Population Adequacy × 20%) +
  (Verification Quality × 20%)
```

**Priority Tiers** (based on estimated reentry population):

- **Tier 1** (5.0x weight): Highest priority - major urban centers
- **Tier 2** (3.0x weight): High priority - significant reentry needs
- **Tier 3** (2.0x weight): Medium priority
- **Tier 4** (1.5x weight): Lower priority
- **Tier 5** (1.0x weight): Baseline priority

## Next Steps

After setup:

1. **Expand Geographic Coverage**:
   - Add more county data beyond Bay Area
   - Prioritize Tier 1 counties (highest reentry population)
   - Use AI discovery agents to find resources

2. **Improve Data Quality**:
   - Run verification agents quarterly
   - Encourage community reviews and ratings
   - Flag and update outdated information

3. **Track Progress**:
   - Set coverage goals (e.g., 80% of Tier 1 counties by Q3)
   - Monitor unique resources vs. 211 directories
   - Generate monthly donor reports

4. **Use Insights for Fundraising**:
   - Show donors coverage gaps
   - Demonstrate impact with statistics
   - Target expansion to high-priority areas

## API Endpoints

Available admin endpoints for coverage tracking:

- `GET /api/admin/coverage/metrics` - Get summary statistics
- `GET /api/admin/coverage/county/[fips]` - Get county-specific metrics
- `POST /api/admin/coverage/calculate` - Recalculate all metrics
- `POST /api/admin/coverage/trigger-research` - Queue AI research for county
- `GET /api/admin/coverage/donor-report` - Generate donor-ready HTML report

## Resources

- **US Census Bureau**: https://www.census.gov/data.html
- **FIPS Codes Reference**: https://www.nist.gov/pml/productsservices/fips-code-information
- **County GeoJSON Data**: https://github.com/plotly/datasets/
- **Supabase PostGIS Docs**: https://supabase.com/docs/guides/database/extensions/postgis

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review migration files in `supabase/migrations/`
3. Check browser console for errors at `/admin/coverage-map`
4. Verify environment variables in `.env.local`

---

**Last Updated**: 2025-01-29
**System Version**: 1.0.0
**Status**: Production Ready ✅
