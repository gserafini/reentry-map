# Coverage Tracking System
## Internal Metrics, Heat Map, and Expansion Dashboard

**Last Updated**: 2025-11-08
**Purpose**: Internal system to measure, visualize, and communicate geographic coverage success
**Owner**: Product & Data teams

---

## Executive Summary

This document defines our **Coverage Tracking System** - an internal admin tool that provides real-time visibility into our geographic expansion progress. Think "DevOps system map for reentry resources" with heat map visualization, donor-ready metrics, and expansion prioritization.

**Key Features**:
- 🗺️ **Interactive County-Level Heat Map** (Leaflet-based)
- 📊 **Coverage Metrics** (nationwide, state, county, city levels)
- 🎯 **Priority Visualization** (see where we should expand next)
- 📈 **Donor-Ready Stats** ("90% coverage of CA's highest-reentry counties")
- 🔍 **Comparison Tracking** (vs. 211 directories, government sources)
- ⚡ **Research Triggers** (click county → dispatch AI agents)

---

## Part 1: Coverage Metrics & Scoring System

### 1.1 Core Coverage Dimensions

We measure coverage across **4 geographic levels**:

#### Level 1: National Coverage
**Metric**: Nationwide percentage of reentry population served

**Formula**:
```
National Coverage % = (Covered Reentry Population / Total US Reentry Population) × 100
```

**Data Required**:
- Total US annual releases: ~600,000 (prisons) + 7.2M (jails, de-duped to ~2-3M unique)
- Covered population: Sum of annual releases in counties where we have resources

**Example**:
- We cover Bay Area counties (Alameda, SF, Contra Costa, Solano): ~100,000 annual releases
- National coverage: 100,000 / 2,000,000 = **5%**

#### Level 2: State Coverage
**Metric**: Percentage of state's reentry population served

**Formula**:
```
State Coverage % = (Covered Counties Reentry Pop / State Reentry Pop) × 100
```

**Example - California**:
- CA total: ~987,000 annual releases
- We cover: Alameda (50K), SF (30K), Contra Costa (20K), Solano (15K) = 115K
- CA coverage: 115,000 / 987,000 = **11.7%**

#### Level 3: County Coverage
**Metric**: Resource coverage adequacy score (0-100%)

**Formula** (weighted composite):
```
County Coverage Score =
  (Resource Count Score × 0.30) +
  (Category Coverage Score × 0.30) +
  (Population Coverage Score × 0.20) +
  (Verification Score × 0.20)
```

**Breakdown**:

**Resource Count Score** (0-100):
- 0 resources: 0%
- 1-9 resources: 20%
- 10-19 resources: 40%
- 20-29 resources: 60%
- 30-49 resources: 80%
- 50+ resources: 100%

**Category Coverage Score** (0-100):
- 0 categories: 0%
- 1-2 categories: 15%
- 3-4 categories: 30%
- 5-6 categories: 50%
- 7-9 categories: 75%
- 10+ categories (of 13 total): 100%

**Population Coverage Score** (0-100):
- Based on resources per capita:
  - Excellent: 1 resource per 5,000 population = 100%
  - Good: 1 resource per 10,000 population = 80%
  - Fair: 1 resource per 20,000 population = 60%
  - Poor: 1 resource per 50,000 population = 40%
  - Minimal: 1 resource per 100,000+ population = 20%

**Verification Score** (0-100):
- % of resources verified in last 90 days
- 90%+ verified: 100%
- 75-89% verified: 80%
- 50-74% verified: 60%
- 25-49% verified: 40%
- <25% verified: 20%

**Example - Alameda County** (Oakland):
- Resource count: 75 resources → 100%
- Category coverage: 11 of 13 categories → 100%
- Population: 1.7M, 75 resources = 1:22,667 → 65%
- Verification: 68 verified in 90 days (90.6%) → 100%
- **County Score: (100×0.3) + (100×0.3) + (65×0.2) + (100×0.2) = 93%**

#### Level 4: City Coverage
**Metric**: Same formula as county, but city-specific

**Example - Oakland, CA**:
- Resource count: 60 resources → 100%
- Category coverage: 11 of 13 → 100%
- Population: 440K, 60 resources = 1:7,333 → 85%
- Verification: 54 verified (90%) → 100%
- **City Score: 96.5%**

### 1.2 Priority-Weighted Coverage

Not all counties are equal. We weight by **reentry population density**.

#### County Priority Tiers

Based on **Annual Reentry Population** (estimated releases per year):

**Tier 1 (Critical)**: 10,000+ annual releases
- Examples: LA County (50K+), Cook County/Chicago (40K+), Harris County/Houston (35K+)
- Weight: 5x in national calculations

**Tier 2 (High)**: 5,000-10,000 annual releases
- Examples: Alameda County (8K), San Diego County (9K), Maricopa County/Phoenix (8K)
- Weight: 3x

**Tier 3 (Medium)**: 1,000-5,000 annual releases
- Examples: Contra Costa County (3K), Sacramento County (4K)
- Weight: 2x

**Tier 4 (Standard)**: 500-1,000 annual releases
- Weight: 1x

**Tier 5 (Low)**: <500 annual releases
- Weight: 0.5x

#### Priority-Weighted National Coverage

**Formula**:
```
Weighted National Coverage % =
  Σ(County Reentry Pop × County Coverage Score × Priority Weight) /
  Σ(All Counties Reentry Pop × Priority Weight)
```

**Why This Matters**:
- Covering LA County (50K releases) contributes more than covering 10 rural counties (500 releases each)
- Donor messaging: "We cover 78% of Tier 1 counties" (high-impact counties)
- Focuses expansion on highest ROI markets

### 1.3 Comparison Metrics (vs. Other Sources)

Track how we compare to other directories (211, government databases).

#### Unique Resources Score

**Metric**: % of our resources NOT found in other sources

**Formula**:
```
Unique Resources % = (Unique Resources Count / Total Resources) × 100
```

**Data Collection**:
- For each resource, flag if found in:
  - `found_in_211`: boolean
  - `found_in_govt_db`: boolean
  - `found_in_other_source`: boolean
- Unique = all flags are `false`

**Example**:
- We have 75 resources in Alameda County
- 60 also in 211, 50 in govt databases, 5 in both
- Unique: 75 - 60 - 50 + 5 = -30 (overlaps) → Actually 15 unique
- Unique %: 15 / 75 = **20%** (we have exclusive resources not found elsewhere)

#### Comprehensiveness vs. 211

**Metric**: Our resource count vs. 211 resource count for same geography

**Formula**:
```
Comprehensiveness Ratio = Our Resources / 211 Resources
```

**Example**:
- 211 Alameda County has 120 reentry-relevant resources
- We have 75 resources
- Ratio: 75 / 120 = **0.625** (62.5% as comprehensive as 211)
- Goal: Achieve 1.0+ (parity or better)

**Display**:
- <0.5: "Emerging coverage"
- 0.5-0.8: "Growing coverage"
- 0.8-1.0: "Comprehensive coverage"
- 1.0-1.5: "Leading coverage"
- 1.5+: "Dominant coverage"

### 1.4 Quality Metrics

Beyond quantity, measure resource quality.

#### Average Completeness Score
**Formula**:
```
Avg Completeness = Σ(Resource Completeness Scores) / Resource Count
```

Target: 85%+ average completeness

#### Average Verification Score
**Formula**:
```
Avg Verification = Σ(Resource Verification Scores) / Resource Count
```

Target: 80%+ average verification

#### Review Coverage
**Metric**: % of resources with at least one user review

**Formula**:
```
Review Coverage % = (Resources with Reviews / Total Resources) × 100
```

Target: 30%+ have reviews

---

## Part 2: Database Schema

### 2.1 New Table: `coverage_metrics`

Stores calculated coverage metrics at all geographic levels.

```sql
CREATE TABLE coverage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Geographic Identifiers
  geography_type TEXT NOT NULL CHECK (geography_type IN ('national', 'state', 'county', 'city')),
  geography_id TEXT NOT NULL, -- e.g., 'US', 'CA', 'CA-Alameda', 'CA-Oakland'
  geography_name TEXT NOT NULL,

  -- Coverage Scores (0-100)
  coverage_score DECIMAL(5,2) NOT NULL DEFAULT 0, -- Overall coverage score
  resource_count_score DECIMAL(5,2) DEFAULT 0,
  category_coverage_score DECIMAL(5,2) DEFAULT 0,
  population_coverage_score DECIMAL(5,2) DEFAULT 0,
  verification_score DECIMAL(5,2) DEFAULT 0,

  -- Raw Counts
  total_resources INTEGER DEFAULT 0,
  verified_resources INTEGER DEFAULT 0, -- verified in last 90 days
  categories_covered INTEGER DEFAULT 0, -- out of 13
  unique_resources INTEGER DEFAULT 0, -- not in other sources

  -- Population Data
  total_population INTEGER, -- general population
  reentry_population INTEGER, -- estimated annual releases

  -- Comparison Data
  resources_in_211 INTEGER DEFAULT 0, -- approx count in 211 directory
  comprehensiveness_ratio DECIMAL(5,3) DEFAULT 0, -- our resources / 211 resources

  -- Priority Data
  priority_tier INTEGER CHECK (priority_tier BETWEEN 1 AND 5), -- 1=highest, 5=lowest
  priority_weight DECIMAL(3,1), -- multiplier for weighted calculations

  -- Quality Metrics
  avg_completeness_score DECIMAL(5,2),
  avg_verification_score DECIMAL(5,2),
  resources_with_reviews INTEGER DEFAULT 0,
  review_coverage_pct DECIMAL(5,2) DEFAULT 0,

  -- Metadata
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  UNIQUE(geography_type, geography_id)
);

CREATE INDEX idx_coverage_metrics_geography ON coverage_metrics(geography_type, geography_id);
CREATE INDEX idx_coverage_metrics_priority ON coverage_metrics(priority_tier, priority_weight);
CREATE INDEX idx_coverage_metrics_score ON coverage_metrics(coverage_score DESC);
```

### 2.2 New Table: `county_data`

Reference data for US counties (for heat map).

```sql
CREATE TABLE county_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Geographic Identifiers
  fips_code TEXT NOT NULL UNIQUE, -- 5-digit FIPS code (e.g., '06001' for Alameda)
  state_fips TEXT NOT NULL, -- 2-digit state FIPS
  county_fips TEXT NOT NULL, -- 3-digit county FIPS within state
  state_code TEXT NOT NULL, -- 'CA'
  state_name TEXT NOT NULL, -- 'California'
  county_name TEXT NOT NULL, -- 'Alameda County'

  -- Population Data
  total_population INTEGER,
  population_year INTEGER, -- census year (e.g., 2020)

  -- Reentry Data (estimated)
  estimated_annual_releases INTEGER, -- our estimate or researched data
  reentry_data_source TEXT, -- where we got the estimate
  reentry_data_year INTEGER,

  -- Priority Classification
  priority_tier INTEGER CHECK (priority_tier BETWEEN 1 AND 5),
  priority_weight DECIMAL(3,1),
  priority_reason TEXT, -- e.g., "Tier 1: 50K+ annual releases"

  -- Geographic Boundaries (for map rendering)
  geometry JSONB, -- GeoJSON polygon of county boundary
  center_lat DECIMAL(10,7),
  center_lng DECIMAL(10,7),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_county_data_fips ON county_data(fips_code);
CREATE INDEX idx_county_data_state ON county_data(state_code);
CREATE INDEX idx_county_data_priority ON county_data(priority_tier);
```

### 2.3 Updated Table: `resources`

Add comparison tracking fields.

```sql
ALTER TABLE resources ADD COLUMN IF NOT EXISTS found_in_211 BOOLEAN DEFAULT false;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS found_in_govt_db BOOLEAN DEFAULT false;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS found_in_other_source BOOLEAN DEFAULT false;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS is_unique BOOLEAN GENERATED ALWAYS AS (
  NOT found_in_211 AND NOT found_in_govt_db AND NOT found_in_other_source
) STORED;
```

### 2.4 Function: Calculate Coverage Metrics

PostgreSQL function to recalculate coverage for a geography.

```sql
CREATE OR REPLACE FUNCTION calculate_coverage_metrics(
  p_geography_type TEXT,
  p_geography_id TEXT
) RETURNS VOID AS $$
DECLARE
  v_resource_count INTEGER;
  v_verified_count INTEGER;
  v_categories_covered INTEGER;
  v_unique_count INTEGER;
  v_total_population INTEGER;
  v_reentry_population INTEGER;
  v_resources_211 INTEGER;
  v_avg_completeness DECIMAL(5,2);
  v_avg_verification DECIMAL(5,2);
  v_resources_with_reviews INTEGER;

  v_resource_count_score DECIMAL(5,2);
  v_category_score DECIMAL(5,2);
  v_population_score DECIMAL(5,2);
  v_verification_score DECIMAL(5,2);
  v_coverage_score DECIMAL(5,2);
BEGIN
  -- Count resources in this geography
  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE last_verified >= NOW() - INTERVAL '90 days'),
         COUNT(DISTINCT primary_category),
         COUNT(*) FILTER (WHERE is_unique = true),
         AVG(completeness_score),
         AVG(verification_score),
         COUNT(*) FILTER (WHERE review_count > 0)
  INTO v_resource_count, v_verified_count, v_categories_covered, v_unique_count,
       v_avg_completeness, v_avg_verification, v_resources_with_reviews
  FROM resources
  WHERE (
    (p_geography_type = 'county' AND county = p_geography_id) OR
    (p_geography_type = 'city' AND city = p_geography_id) OR
    (p_geography_type = 'state' AND state = p_geography_id) OR
    (p_geography_type = 'national')
  )
  AND status = 'active';

  -- Get population data (from county_data or aggregated)
  IF p_geography_type = 'county' THEN
    SELECT total_population, estimated_annual_releases, resources_in_211
    INTO v_total_population, v_reentry_population, v_resources_211
    FROM county_data
    WHERE fips_code = p_geography_id;
  END IF;

  -- Calculate Resource Count Score
  v_resource_count_score := CASE
    WHEN v_resource_count = 0 THEN 0
    WHEN v_resource_count < 10 THEN 20
    WHEN v_resource_count < 20 THEN 40
    WHEN v_resource_count < 30 THEN 60
    WHEN v_resource_count < 50 THEN 80
    ELSE 100
  END;

  -- Calculate Category Coverage Score
  v_category_score := CASE
    WHEN v_categories_covered = 0 THEN 0
    WHEN v_categories_covered <= 2 THEN 15
    WHEN v_categories_covered <= 4 THEN 30
    WHEN v_categories_covered <= 6 THEN 50
    WHEN v_categories_covered <= 9 THEN 75
    ELSE 100
  END;

  -- Calculate Population Coverage Score (resources per capita)
  IF v_total_population > 0 THEN
    v_population_score := CASE
      WHEN v_resource_count::DECIMAL / (v_total_population / 5000.0) >= 1 THEN 100
      WHEN v_resource_count::DECIMAL / (v_total_population / 10000.0) >= 1 THEN 80
      WHEN v_resource_count::DECIMAL / (v_total_population / 20000.0) >= 1 THEN 60
      WHEN v_resource_count::DECIMAL / (v_total_population / 50000.0) >= 1 THEN 40
      ELSE 20
    END;
  ELSE
    v_population_score := 0;
  END IF;

  -- Calculate Verification Score
  IF v_resource_count > 0 THEN
    v_verification_score := CASE
      WHEN (v_verified_count::DECIMAL / v_resource_count * 100) >= 90 THEN 100
      WHEN (v_verified_count::DECIMAL / v_resource_count * 100) >= 75 THEN 80
      WHEN (v_verified_count::DECIMAL / v_resource_count * 100) >= 50 THEN 60
      WHEN (v_verified_count::DECIMAL / v_resource_count * 100) >= 25 THEN 40
      ELSE 20
    END;
  ELSE
    v_verification_score := 0;
  END IF;

  -- Calculate Overall Coverage Score (weighted)
  v_coverage_score := (v_resource_count_score * 0.30) +
                      (v_category_score * 0.30) +
                      (v_population_score * 0.20) +
                      (v_verification_score * 0.20);

  -- Upsert coverage_metrics
  INSERT INTO coverage_metrics (
    geography_type, geography_id, geography_name,
    coverage_score, resource_count_score, category_coverage_score,
    population_coverage_score, verification_score,
    total_resources, verified_resources, categories_covered, unique_resources,
    total_population, reentry_population, resources_in_211,
    comprehensiveness_ratio,
    avg_completeness_score, avg_verification_score, resources_with_reviews,
    review_coverage_pct,
    calculated_at, last_updated
  ) VALUES (
    p_geography_type, p_geography_id, p_geography_id,
    v_coverage_score, v_resource_count_score, v_category_score,
    v_population_score, v_verification_score,
    v_resource_count, v_verified_count, v_categories_covered, v_unique_count,
    v_total_population, v_reentry_population, v_resources_211,
    CASE WHEN v_resources_211 > 0 THEN v_resource_count::DECIMAL / v_resources_211 ELSE 0 END,
    v_avg_completeness, v_avg_verification, v_resources_with_reviews,
    CASE WHEN v_resource_count > 0 THEN (v_resources_with_reviews::DECIMAL / v_resource_count * 100) ELSE 0 END,
    NOW(), NOW()
  )
  ON CONFLICT (geography_type, geography_id)
  DO UPDATE SET
    coverage_score = EXCLUDED.coverage_score,
    resource_count_score = EXCLUDED.resource_count_score,
    category_coverage_score = EXCLUDED.category_coverage_score,
    population_coverage_score = EXCLUDED.population_coverage_score,
    verification_score = EXCLUDED.verification_score,
    total_resources = EXCLUDED.total_resources,
    verified_resources = EXCLUDED.verified_resources,
    categories_covered = EXCLUDED.categories_covered,
    unique_resources = EXCLUDED.unique_resources,
    comprehensiveness_ratio = EXCLUDED.comprehensiveness_ratio,
    avg_completeness_score = EXCLUDED.avg_completeness_score,
    avg_verification_score = EXCLUDED.avg_verification_score,
    resources_with_reviews = EXCLUDED.resources_with_reviews,
    review_coverage_pct = EXCLUDED.review_coverage_pct,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## Part 3: Admin Heat Map UI Design

### 3.1 Tech Stack

**Map Library**: **Leaflet.js**
- ✅ Open source, no API costs
- ✅ Excellent for choropleth (heat) maps
- ✅ Better performance than Google Maps for this use case
- ✅ County-level GeoJSON support
- ✅ Highly customizable

**GeoJSON Data**: US Counties boundaries from **US Census Bureau**
- URL: https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html
- ~3,100 counties/equivalents nationwide
- File: `cb_2021_us_county_500k.json` (~5MB simplified)

**Styling**: Tailwind CSS + Headless UI
**Charts**: Recharts or Chart.js for stat visualizations

### 3.2 Page Layout

**Route**: `/admin/coverage-map`

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Reentry Map - Coverage Dashboard                    Admin │
├─────────────────────────────────────────────────────────────┤
│  📊 National Stats Bar                                      │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ National │ Tier 1   │ Total    │ Counties │ Avg      │  │
│  │ Coverage │ Coverage │ Resources│ Covered  │ Score    │  │
│  │   5.2%   │  23.4%   │  1,247   │  23/3142 │   78.3   │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
├─────────────────────────────────────────────────────────────┤
│  🎚️ Filters & Controls                                     │
│  [View: Coverage Score ▼] [State: All ▼] [Tier: All ▼]     │
│  [🔄 Recalculate All] [📥 Export Data] [📄 Donor Report]   │
├─────────────────────────────────────────────────────────────┤
│  🗺️ Interactive Heat Map                                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │        [US County-Level Heat Map]                    │ │
│  │                                                       │ │
│  │  Legend:                                             │ │
│  │  █ 90-100% Excellent    █ 50-69% Fair               │ │
│  │  █ 70-89%  Good         █ 0-49%  Poor               │ │
│  │  █ No Coverage  ⭐ Priority Tier 1                   │ │
│  └───────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  📈 Details Panel (appears on county click)                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Alameda County, CA           [✕ Close] [🔍 Research] │ │
│  │ ─────────────────────────────────────────────────────│ │
│  │ Coverage Score: 93% (Excellent) ⭐ Priority Tier 2   │ │
│  │ Total Resources: 75  │ Verified: 68 (90%)           │ │
│  │ Categories: 11/13    │ Unique: 15 (20%)             │ │
│  │ Population: 1.7M     │ Reentry: ~8,000/year         │ │
│  │ vs. 211: 75/120 (62.5% - Growing Coverage)          │ │
│  │ ─────────────────────────────────────────────────────│ │
│  │ [View Resources] [Expansion Plan] [Trigger Research] │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Heat Map Color Scheme

**Coverage Score Tiers** (choropleth colors):

| Score Range | Color | Label | Hex |
|-------------|-------|-------|-----|
| 90-100% | Dark Green | Excellent | `#065f46` |
| 70-89% | Green | Good | `#10b981` |
| 50-69% | Yellow | Fair | `#fbbf24` |
| 30-49% | Orange | Poor | `#f59e0b` |
| 0-29% | Red | Minimal | `#dc2626` |
| No coverage | Light Gray | None | `#e5e7eb` |

**Priority Tier Overlay** (icons/borders):
- ⭐ **Tier 1** counties: Gold star icon + thicker border
- 🔷 **Tier 2** counties: Blue dot
- Regular **Tier 3-5**: No special marker

### 3.4 Interactive Features

#### Hover State
**On county mouseover**:
- Highlight county border (yellow stroke)
- Show tooltip:
  ```
  Alameda County, CA
  Coverage: 93% (Excellent)
  Resources: 75 | Tier 2 Priority
  ```

#### Click Action
**On county click**:
- Open details panel (slide from right or bottom on mobile)
- Fetch county-specific metrics from API
- Display:
  - Full stats
  - Resource list preview (top 5 resources)
  - Comparison to 211
  - Action buttons

#### Filter Controls

**View Mode Dropdown**:
- Coverage Score (default)
- Resource Count (absolute numbers)
- Priority Tier (show tier boundaries)
- Comprehensiveness vs. 211
- Verification Status

**State Filter**:
- "All States" (default)
- Individual states (CA, TX, NY, etc.)
- Zooms map to selected state

**Priority Tier Filter**:
- "All Tiers" (default)
- Tier 1 only
- Tier 1-2 only
- Dims other counties

#### Action Buttons

**"Trigger Research" Button**:
- Opens modal: "Dispatch AI Discovery Agent for Alameda County?"
- Options:
  - Categories to prioritize (checkboxes)
  - Depth (quick scan / comprehensive)
  - Comparison sources (211, govt databases)
- Submits job to background queue
- Shows progress notification

**"Donor Report" Button**:
- Generates PDF report with:
  - National coverage stats
  - Tier 1 coverage highlights
  - State-by-state breakdown
  - Growth charts (coverage over time)
  - Donor-friendly language
- Example: "Reentry Map now covers 78% of California's highest-reentry counties, serving an estimated 768,000 individuals annually."

### 3.5 Mobile Responsive Design

**Desktop** (1280px+):
- Full layout as shown above
- Map takes 70% of screen height
- Details panel slides from right (sidebar)

**Tablet** (768-1279px):
- Stats bar becomes 2x3 grid
- Map takes 60% height
- Details panel overlays map (modal)

**Mobile** (< 768px):
- Stats become swipeable cards
- Map full width, takes 50% height
- Details panel full-screen modal
- Zoom controls enlarged for touch

---

## Part 4: Admin Page Implementation

### 4.1 File Structure

```
app/
├── admin/
│   └── coverage-map/
│       ├── page.tsx                    # Main coverage map page
│       ├── loading.tsx                 # Loading skeleton
│       └── components/
│           ├── CoverageMap.tsx         # Leaflet map component
│           ├── StatsBar.tsx            # National stats
│           ├── FilterControls.tsx      # Filters & buttons
│           ├── CountyDetailsPanel.tsx  # Details sidebar/modal
│           └── DonorReportGenerator.tsx # PDF report generator
│
├── api/
│   └── admin/
│       └── coverage/
│           ├── metrics/
│           │   └── route.ts            # GET coverage metrics
│           ├── calculate/
│           │   └── route.ts            # POST recalculate metrics
│           ├── county/
│           │   └── [fips]/
│           │       └── route.ts        # GET county details
│           └── research/
│               └── trigger/
│                   └── route.ts        # POST trigger research agent
│
lib/
├── coverage/
│   ├── calculations.ts                 # Coverage calculation logic
│   ├── metrics.ts                      # Metrics queries
│   └── types.ts                        # TypeScript types
│
public/
└── geodata/
    └── us-counties.json                # US counties GeoJSON (download once)
```

### 4.2 API Endpoints

#### GET `/api/admin/coverage/metrics`

Returns national and state-level coverage summary.

**Response**:
```json
{
  "national": {
    "coverage_score": 5.2,
    "tier1_coverage": 23.4,
    "total_resources": 1247,
    "counties_covered": 23,
    "total_counties": 3142,
    "avg_score": 78.3,
    "reentry_population_covered": 104000,
    "total_reentry_population": 2000000
  },
  "states": [
    {
      "state_code": "CA",
      "state_name": "California",
      "coverage_score": 11.7,
      "total_resources": 628,
      "counties_covered": 8,
      "total_counties": 58,
      "reentry_population_covered": 115000,
      "total_reentry_population": 987000
    },
    // ... other states
  ],
  "tier_summary": {
    "tier1": { "counties": 45, "covered": 12, "coverage_pct": 26.7 },
    "tier2": { "counties": 89, "covered": 8, "coverage_pct": 9.0 },
    "tier3": { "counties": 234, "covered": 3, "coverage_pct": 1.3 },
    "tier4": { "counties": 567, "covered": 0, "coverage_pct": 0 },
    "tier5": { "counties": 2207, "covered": 0, "coverage_pct": 0 }
  }
}
```

#### GET `/api/admin/coverage/county/[fips]`

Returns detailed metrics for specific county.

**URL**: `/api/admin/coverage/county/06001` (Alameda County)

**Response**:
```json
{
  "fips": "06001",
  "county_name": "Alameda County",
  "state_code": "CA",
  "state_name": "California",
  "coverage_score": 93.0,
  "priority_tier": 2,
  "priority_weight": 3.0,
  "metrics": {
    "total_resources": 75,
    "verified_resources": 68,
    "categories_covered": 11,
    "unique_resources": 15,
    "resources_with_reviews": 23
  },
  "scores": {
    "resource_count_score": 100,
    "category_coverage_score": 100,
    "population_coverage_score": 65,
    "verification_score": 100
  },
  "population": {
    "total_population": 1700000,
    "reentry_population": 8000,
    "resources_per_capita": 22667
  },
  "comparison": {
    "resources_in_211": 120,
    "comprehensiveness_ratio": 0.625,
    "comprehensiveness_label": "Growing coverage"
  },
  "quality": {
    "avg_completeness_score": 87.3,
    "avg_verification_score": 85.1,
    "review_coverage_pct": 30.7
  },
  "top_resources": [
    {
      "id": "...",
      "name": "Root & Rebound",
      "category": "legal-aid",
      "rating_average": 4.8,
      "review_count": 12
    },
    // ... top 5 resources
  ],
  "last_updated": "2025-11-08T14:23:00Z"
}
```

#### POST `/api/admin/coverage/calculate`

Triggers recalculation of coverage metrics.

**Request**:
```json
{
  "scope": "all" | "state" | "county",
  "geography_id": "CA" // optional, if scope is state/county
}
```

**Response**:
```json
{
  "status": "processing",
  "job_id": "abc123",
  "estimated_time": 120, // seconds
  "message": "Recalculating coverage for all geographies..."
}
```

#### POST `/api/admin/coverage/research/trigger`

Triggers AI research agent for a county.

**Request**:
```json
{
  "fips": "06001",
  "categories": ["employment", "housing", "legal-aid"],
  "depth": "comprehensive",
  "compare_to": ["211", "govt_db"]
}
```

**Response**:
```json
{
  "status": "queued",
  "job_id": "research-abc123",
  "estimated_time": 300,
  "message": "Research agent queued for Alameda County. You'll be notified when complete."
}
```

### 4.3 React Component: Coverage Map

**File**: `app/admin/coverage-map/components/CoverageMap.tsx`

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { CoverageMetrics, CountyData } from '@/lib/coverage/types'

interface CoverageMapProps {
  counties: CountyData[]
  metrics: Record<string, CoverageMetrics> // keyed by FIPS
  viewMode: 'coverage' | 'resources' | 'priority' | 'comparison'
  onCountyClick: (fips: string) => void
}

export function CoverageMap({ counties, metrics, viewMode, onCountyClick }: CoverageMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const [map, setMap] = useState<L.Map | null>(null)

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      const m = L.map('coverage-map').setView([39.8283, -98.5795], 4) // Center on US

      // Base layer (minimal, grayscale)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap, ©CartoDB',
        maxZoom: 10
      }).addTo(m)

      mapRef.current = m
      setMap(m)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Render county layers
  useEffect(() => {
    if (!map || !counties.length) return

    const getColor = (fips: string) => {
      const metric = metrics[fips]
      if (!metric) return '#e5e7eb' // no coverage

      const score = metric.coverage_score

      if (viewMode === 'coverage') {
        if (score >= 90) return '#065f46'
        if (score >= 70) return '#10b981'
        if (score >= 50) return '#fbbf24'
        if (score >= 30) return '#f59e0b'
        return '#dc2626'
      }

      // Other view modes...
      return '#e5e7eb'
    }

    const style = (feature: any) => ({
      fillColor: getColor(feature.properties.FIPS),
      weight: 1,
      opacity: 1,
      color: '#9ca3af',
      fillOpacity: 0.7
    })

    const highlightStyle = {
      weight: 3,
      color: '#fbbf24',
      fillOpacity: 0.85
    }

    let currentLayer: L.GeoJSON | null = null

    // Load GeoJSON and add to map
    fetch('/geodata/us-counties.json')
      .then(res => res.json())
      .then(geoData => {
        currentLayer = L.geoJSON(geoData, {
          style,
          onEachFeature: (feature, layer) => {
            const fips = feature.properties.FIPS
            const metric = metrics[fips]

            // Hover tooltip
            if (metric) {
              layer.bindTooltip(
                `<strong>${feature.properties.NAME}, ${feature.properties.STATE}</strong><br/>` +
                `Coverage: ${metric.coverage_score.toFixed(1)}% (${getCoverageLabel(metric.coverage_score)})<br/>` +
                `Resources: ${metric.total_resources} | Tier ${metric.priority_tier || 'N/A'}`
              )
            }

            // Mouse events
            layer.on({
              mouseover: (e) => {
                e.target.setStyle(highlightStyle)
              },
              mouseout: (e) => {
                currentLayer?.resetStyle(e.target)
              },
              click: () => {
                onCountyClick(fips)
              }
            })
          }
        }).addTo(map)
      })

    return () => {
      if (currentLayer) {
        map.removeLayer(currentLayer)
      }
    }
  }, [map, counties, metrics, viewMode, onCountyClick])

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden border border-gray-300">
      <div id="coverage-map" className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border">
        <h4 className="font-semibold mb-2">Coverage Score</h4>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-[#065f46]" />
            <span>90-100% Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-[#10b981]" />
            <span>70-89% Good</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-[#fbbf24]" />
            <span>50-69% Fair</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-[#f59e0b]" />
            <span>30-49% Poor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-[#dc2626]" />
            <span>0-29% Minimal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-[#e5e7eb]" />
            <span>No Coverage</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t">
            <span className="text-xl">⭐</span>
            <span>Priority Tier 1</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function getCoverageLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Fair'
  if (score >= 30) return 'Poor'
  return 'Minimal'
}
```

### 4.4 Donor Report Generator

**File**: `app/admin/coverage-map/components/DonorReportGenerator.tsx`

Generates PDF report with donor-friendly language.

**Example Output**:

```
REENTRY MAP - COVERAGE REPORT
Generated: November 8, 2025

EXECUTIVE SUMMARY
─────────────────────────────────────────────────────
Reentry Map is now serving 5.2% of the returning citizen
population nationwide, with comprehensive coverage of 23.4%
of the highest-priority counties.

NATIONAL IMPACT
─────────────────────────────────────────────────────
Total Resources: 1,247 verified organizations
Counties Covered: 23 of 3,142 (0.7%)
Individuals Served: ~104,000 annually
Tier 1 Counties (Highest Need): 12 of 45 covered (26.7%)

CALIFORNIA LEADERSHIP
─────────────────────────────────────────────────────
We're covering 11.7% of California's reentry population:
  • 628 verified resources across 8 counties
  • 115,000 individuals served annually (out of 987K total)
  • 78% of CA's highest-reentry counties covered

Top Counties:
  ✓ Alameda County: 93% coverage (75 resources) - Excellent
  ✓ San Francisco: 89% coverage (62 resources) - Good
  ✓ Contra Costa: 81% coverage (48 resources) - Good

QUALITY METRICS
─────────────────────────────────────────────────────
Average Resource Completeness: 87.3%
Average Verification Score: 85.1%
Resources with Community Reviews: 30.7%

EXPANSION ROADMAP
─────────────────────────────────────────────────────
Q1 2026: Los Angeles County (50,000 individuals annually)
Q1 2026: San Diego County (9,000 individuals annually)
Q2 2026: Sacramento County (4,000 individuals annually)

By end of 2026, we project 25% of California's reentry
population will have access to comprehensive resources.

COMPETITIVE POSITION
─────────────────────────────────────────────────────
vs. 211 Directories: 62.5% as comprehensive (growing)
Unique Resources: 20% of our resources not found elsewhere
Mobile-First: 95% of users access via mobile devices

CALL TO ACTION
─────────────────────────────────────────────────────
Your support helps us expand to the next tier of high-need
markets. Every $10,000 funds comprehensive research for one
major metropolitan county, serving 5,000-50,000 returning
citizens annually.

Next milestone: $50,000 → Launch Los Angeles County
```

---

## Part 5: Implementation Plan

### 5.1 Phase 1: Database & Calculations (Week 1)

**Tasks**:
1. Create `coverage_metrics` table
2. Create `county_data` table
3. Load county reference data (FIPS codes, populations, boundaries)
4. Implement `calculate_coverage_metrics()` function
5. Write migration for `resources` table comparison fields
6. Seed initial county priority tiers (based on expansion strategy doc)

**Deliverables**:
- Migration files
- Seeded county data (3,142 counties with FIPS, boundaries, populations)
- Working calculation function

### 5.2 Phase 2: API Endpoints (Week 1-2)

**Tasks**:
1. Build `/api/admin/coverage/metrics` endpoint
2. Build `/api/admin/coverage/county/[fips]` endpoint
3. Build `/api/admin/coverage/calculate` endpoint (background job)
4. Build `/api/admin/coverage/research/trigger` endpoint
5. Add admin authentication/authorization middleware

**Deliverables**:
- 4 working API endpoints
- OpenAPI/Swagger docs
- Postman collection for testing

### 5.3 Phase 3: Heat Map UI (Week 2-3)

**Tasks**:
1. Download & host US counties GeoJSON file
2. Build `CoverageMap` Leaflet component
3. Build `StatsBar` component
4. Build `FilterControls` component
5. Build `CountyDetailsPanel` component
6. Implement mobile responsive layout

**Deliverables**:
- Working admin coverage map page
- Interactive county-level visualization
- Filter and view mode controls

### 5.4 Phase 4: Automation & Reporting (Week 3-4)

**Tasks**:
1. Build donor report PDF generator
2. Implement scheduled coverage recalculation (daily cron)
3. Add research trigger functionality (connect to AI agent queue)
4. Build export functionality (CSV, JSON)
5. Add historical tracking (coverage over time charts)

**Deliverables**:
- PDF donor report generation
- Automated daily metrics updates
- Export tools

### 5.5 Phase 5: Data Population & Calibration (Week 4-5)

**Tasks**:
1. Research and populate county reentry population estimates
2. Classify all counties into priority tiers
3. Backfill `found_in_211` flags for existing resources
4. Calibrate scoring thresholds based on actual data
5. Generate baseline national coverage report

**Deliverables**:
- All 3,142 counties classified and scored
- Existing resources analyzed for uniqueness
- Baseline metrics established

---

## Part 6: Success Metrics for Coverage System

### 6.1 System Health Metrics

**Data Freshness**:
- Target: Coverage metrics recalculated daily
- Alert if: Last calculation >48 hours old

**Calculation Performance**:
- Target: Full national recalculation <5 minutes
- Alert if: >10 minutes

**Map Performance**:
- Target: Map renders <2 seconds
- Target: County click response <500ms
- Alert if: >5 seconds render or >2s response

### 6.2 Coverage Growth Metrics

**National Coverage Growth**:
- Current: ~5%
- 3 months: 15%
- 6 months: 30%
- 12 months: 50%

**Tier 1 Coverage**:
- Current: ~26%
- 6 months: 60%
- 12 months: 85%

**State Diversity**:
- Current: 1 state (CA)
- 6 months: 5 states (CA, TX, FL, NY, IL)
- 12 months: 10 states

### 6.3 Quality Metrics

**Average County Coverage Score**:
- Target: Covered counties average 80%+
- Alert if: New county launches with <50% score

**Verification Rate**:
- Target: 85%+ resources verified in last 90 days
- Alert if: Falls below 75%

**Uniqueness**:
- Target: 15%+ unique resources not in other sources
- Goal: Position as "more comprehensive than 211"

---

## Part 7: Donor Communication Templates

### 7.1 Monthly Update Email

```
Subject: Reentry Map Impact Update - November 2025

Dear [Donor Name],

Thanks to your support, Reentry Map reached a major milestone
this month:

🎯 COVERAGE HIGHLIGHTS
• 5.2% of nationwide returning citizens now have access
• 1,247 verified resources across 23 counties
• 26.7% of highest-priority counties covered

📈 CALIFORNIA PROGRESS
We're now covering 11.7% of California's reentry population:
• Alameda County: 93% coverage (Excellent)
• San Francisco: 89% coverage (Good)
• 8 counties total, serving 115,000 individuals annually

🚀 NEXT MILESTONE
With your continued support, we're launching Los Angeles
County in Q1 2026 - reaching 50,000 additional returning
citizens in the nation's second-largest city.

View full coverage map: [Link to public stats page]

With gratitude,
[Your Name]
```

### 7.2 Grant Application Statistics

**Sample Grant Narrative**:

> "Reentry Map has achieved comprehensive coverage (90%+) in 3
> of California's highest-priority reentry counties, serving an
> estimated 23,000 individuals annually. Our platform now hosts
> 628 verified resources across 8 CA counties, with an average
> coverage score of 87.3%.
>
> Notably, 20% of our resources are unique - not found in 211
> directories or government databases - demonstrating our value
> as a specialized reentry-focused directory. With this grant,
> we will expand to Los Angeles County, which releases 50,000
> individuals annually, increasing our California coverage from
> 11.7% to 28.4%."

**Stats to Include**:
- Coverage percentage (national, state, tier 1)
- Total resources
- Counties covered
- Individuals served annually (sum of county reentry populations)
- Unique resources percentage
- Quality scores (completeness, verification)
- Growth trajectory (% increase month-over-month)

---

## Conclusion

This Coverage Tracking System provides:

✅ **Real-time visibility** into expansion progress
✅ **Data-driven prioritization** (see where we need to expand)
✅ **Donor-ready metrics** (communicate impact clearly)
✅ **Quality assurance** (track verification, uniqueness)
✅ **Operational efficiency** (trigger research agents, export reports)

**Next Steps**:
1. Review and approve this design
2. Implement Phase 1 (database & calculations)
3. Build admin heat map UI
4. Populate county reference data
5. Generate first donor report

This becomes our "North Star" for expansion - always knowing where we are, where we need to go, and how to communicate our impact.

---

**Document Maintenance**:
- **Review**: After each major expansion phase
- **Update**: Coverage thresholds, priority tiers as we learn
- **Owner**: Product + Data teams
