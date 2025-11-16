# Bulk Import Enhancement Plan for Nationwide Data Sources

**Date:** 2025-11-15
**Status:** Planning Phase
**Goal:** Enable efficient, automated imports from 15+ national APIs and 50+ state/metro open data portals

---

## Executive Summary

We're planning to scale from manual resource entry to automated nationwide data imports from government open data sources. Our current infrastructure is **solid for thousands of resources** but needs enhancements for **tens of thousands to hundreds of thousands** of resources.

**Current Capability:** 100 resources/batch, 87% auto-approval, $0.02-0.05/resource verification
**Target Capability:** 10,000+ resources/day from multiple APIs with parallel processing
**Estimated Implementation:** 30-42 hours across 4 phases

---

## Data Sources Overview

### National APIs (15 Primary Sources)

1. **HUD Exchange** - Homeless Assistance & Continuum of Care
   - Coverage: National
   - Category: Housing (emergency, transitional, permanent supportive)
   - Format: CSV/Shapefile/API
   - License: Public Domain
   - **Priority: HIGHEST** (housing critical for reentry)

2. **SAMHSA Treatment Locator** - findtreatment.gov
   - Coverage: National
   - Category: Substance abuse & mental health treatment
   - Format: JSON API (free registration required)
   - License: Public Domain
   - **Priority: HIGH** (treatment critical for reentry)

3. **DOL CareerOneStop** - api.careeronestop.org
   - Coverage: National
   - Category: Workforce centers, apprenticeships, job training
   - Format: JSON API
   - License: CC BY 4.0
   - **Priority: HIGH** (employment critical for reentry)

4. **Legal Services Corporation (LSC)**
   - Coverage: National
   - Category: Free legal aid offices
   - Format: CSV/JSON
   - License: Public Domain
   - **Priority: MEDIUM**

5. **USDA Food and Nutrition Service**
   - Coverage: National
   - Category: Food banks, pantries, SNAP, WIC
   - Format: CSV/API
   - License: Public Domain
   - **Priority: MEDIUM**

6. **211.org Data API** - United Way
   - Coverage: National
   - Category: Comprehensive human services directory
   - Format: JSON API (license required for full data)
   - License: CC BY
   - **Priority: HIGH** (most comprehensive single source)
   - **Note:** Requires contacting 211 for API access

7. **HUD Affordable Housing Dataset**
   - Coverage: National
   - Category: Federally-assisted multifamily & public housing
   - Format: CSV/API
   - License: Public Domain

8. **IRS Exempt Organizations Business Master File (BMF)**
   - Coverage: National
   - Category: All nonprofits (filterable for reentry services)
   - Format: CSV/TXT
   - License: Public Domain
   - **Note:** Raw nonprofit data, requires filtering/enrichment

9. **Transitland Feeds Registry**
   - Coverage: National
   - Category: Public transit systems (GTFS feeds)
   - Format: JSON API
   - License: CC BY 4.0
   - **Priority: LOW** (supporting resource, not primary)

10. **Data.gov** - Federal aggregator
    - Coverage: National
    - Category: Multi-category (federal, state, local datasets)
    - Format: CSV/API
    - License: Public Domain

11. **National Reentry Resource Center (NRRC)**
    - Coverage: National
    - Category: Reentry programs, grant recipients
    - Format: HTML/CSV
    - License: CC BY

12. **OpenReferral HSDS** - Schema & sample datasets
    - Coverage: Global/US
    - Category: Data standard for service directories
    - Format: JSON/CSV
    - License: CC BY 4.0
    - **Note:** Framework for interoperability

### State & Metro Portals (50+ Sources)

13. **State Open Data Portals** - All 50 states
    - Examples: data.ca.gov, data.ny.gov, data.illinois.gov
    - Coverage: State-specific
    - Category: Varies (social services, housing, reentry programs)
    - Format: API/CSV/JSON (mostly Socrata or CKAN platforms)
    - License: Varies (mostly CC BY or Public Domain)

14. **Major Metro Portals**
    - NYC: data.nyc.gov
    - Chicago: data.cityofchicago.org
    - DC: opendata.dc.gov
    - LA: data.lacity.org
    - San Francisco: datasf.org
    - Coverage: City-specific
    - Format: Socrata API (consistent across cities)

15. **OpenStreetMap (OSM)**
    - Coverage: Global
    - Category: Geographic data, POIs (churches, shelters)
    - Format: OSM/GeoJSON/API
    - License: ODbL v1.0
    - **Priority: LOW** (supplementary, not primary data source)

---

## Current Infrastructure Assessment

### ✅ What We Have (Strong Foundation)

**1. Batch Import API** - `/api/resources/suggest-batch`

- Accepts up to 100 resources per batch
- JSON format with flexible field aliases
- **87% auto-approval rate** (industry-leading)
- Processing time: ~2 minutes per resource (worst case)
- Cost: $0.02-0.05 per resource with full verification

**2. Autonomous Verification Pipeline** - `lib/ai-agents/verification-agent.ts`

- **Level 1 (10s)**: URL reachability, phone validation, address geocoding
- **Level 2 (30s)**: Website content matching, service description validation
- **Level 3 (60s)**: 211 database lookup, Google Maps verification, conflict detection
- Decision thresholds:
  - Auto-approve: 87% (score ≥85% & all checks pass)
  - Flag for review: 8% (score 50-85% OR conflicts detected)
  - Auto-reject: 5% (score <50% OR critical failures)

**3. Smart Deduplication** - `lib/utils/deduplication.ts`

- Exact address matching (case-insensitive)
- Fuzzy name matching (PostgreSQL trigram similarity ≥0.8)
- Parent-child organization detection
- Parallel batch processing

**4. Database Schema**

- `resource_suggestions` - Pending submissions
- `verification_logs` - Full audit trail
- `verification_events` - Real-time event stream
- `ai_usage_tracking` - Cost and token tracking

**5. Admin Tools**

- `/api/admin/resources/import` - Direct admin import (no verification)
- `/api/admin/import-files` - File-based batch import
- `/api/admin/verification-queue` - Review flagged resources
- CLI script: `scripts/import-resource-files.mjs`

**6. Data Formats Supported**

- JSON with standard schema
- Field aliases (services_offered/services, zip/zip_code, etc.)
- Flexible hours format (JSONB)
- Multiple categories per resource

### 🚨 Critical Gaps for Nationwide Scale

**1. No API Integration Layer**

- Cannot pull data directly from HUD, SAMHSA, DOL, etc.
- Requires manual download → conversion → upload workflow
- No automated fetching or sync capability

**2. No Field Mapping/Normalization**

- Each API has different field names (OrganizationName vs. name vs. facility_name)
- No mapping between source categories and our categories
- No standardized normalization pipeline

**3. No Progress Tracking**

- Cannot monitor long-running imports (e.g., 10,000 resources taking 6+ hours)
- No visibility into success/failure rates during import
- No way to estimate completion time

**4. Sequential Processing Only**

- Processes 1 resource at a time
- Level 1 verification (10s/resource) × 10,000 resources = 28 hours
- Could parallelize to reduce to 3 hours with 10 workers

**5. No Category Mapping**

- HUD categories (Emergency Shelter, Transitional Housing) ≠ our categories (housing)
- SAMHSA service codes (SA, MH, DUAL) need mapping
- DOL program types need mapping
- No configuration system for cross-source category mapping

**6. No Checkpoint/Resume**

- If import fails at resource 5,000/10,000, must restart from beginning
- Manual cleanup required for partial imports
- No transactional safety for large batches

**7. No Rate Limit Handling**

- Government APIs have rate limits (typically 60-120 requests/minute)
- No throttling or backoff logic
- Will get blocked on large imports

**8. No Multi-Source Coordination**

- Cannot orchestrate imports from multiple APIs
- No deduplication across different sources
- No "import from HUD + SAMHSA + DOL for California" workflow

---

## Enhancement Plan (4 Phases)

### Phase 1: Foundation (6-8 hours) - CRITICAL BEFORE IMPORTS

Build infrastructure to support large-scale imports safely.

#### 1.1 Database Schema Extensions

**New Tables:**

```sql
-- Track import jobs across sessions
CREATE TABLE data_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL, -- 'HUD CoC', 'SAMHSA', 'DOL CareerOneStop'
  source_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
  total_records INTEGER,
  processed_records INTEGER DEFAULT 0,
  successful_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  flagged_records INTEGER DEFAULT 0,
  rejected_records INTEGER DEFAULT 0,
  checkpoint_data JSONB, -- Resume from here if interrupted
  error_log JSONB[], -- Array of {record_id, error, timestamp}
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB -- API params, filters, config
);

-- Track individual record processing
CREATE TABLE data_import_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES data_import_jobs(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL, -- External ID from source API
  raw_data JSONB NOT NULL, -- Original API response
  normalized_data JSONB, -- After field mapping
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'verified', 'approved', 'flagged', 'rejected', 'error')),
  resource_id UUID REFERENCES resources(id), -- If created/matched
  suggestion_id UUID REFERENCES resource_suggestions(id), -- If flagged for review
  error_message TEXT,
  verification_score NUMERIC(3,2), -- 0.00 to 1.00
  verification_level TEXT CHECK (verification_level IN ('L1', 'L2', 'L3')),
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_import_jobs_status ON data_import_jobs(status, created_at DESC);
CREATE INDEX idx_import_jobs_created_by ON data_import_jobs(created_by, created_at DESC);
CREATE INDEX idx_import_records_job ON data_import_records(job_id, status);
CREATE INDEX idx_import_records_source ON data_import_records(job_id, source_id);

-- RLS policies
ALTER TABLE data_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_import_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all import jobs" ON data_import_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage import jobs" ON data_import_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Same for data_import_records
CREATE POLICY "Admins can view import records" ON data_import_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );
```

#### 1.2 Progress Tracking API

**New Endpoints:**

```typescript
// GET /api/admin/import-jobs
// List all import jobs with stats
// Query params: ?status=running&source=HUD&page=1&limit=20

// POST /api/admin/import-jobs
// Create new import job
// Body: { source_name, source_url, filters, verification_level }

// GET /api/admin/import-jobs/:id
// Get detailed job status
// Returns: job details + aggregate stats + recent errors

// POST /api/admin/import-jobs/:id/pause
// Pause running import
// Saves checkpoint for resume

// POST /api/admin/import-jobs/:id/resume
// Resume from checkpoint
// Continues from last processed record

// POST /api/admin/import-jobs/:id/cancel
// Cancel and cleanup
// Marks job as failed, keeps records for audit

// GET /api/admin/import-jobs/:id/progress (Server-Sent Events)
// Real-time progress stream
// Events: {processed, successful, failed, flagged, eta_seconds}

// GET /api/admin/import-jobs/:id/records
// Paginated list of records for this job
// Query params: ?status=error&page=1&limit=50
```

#### 1.3 Rate Limiter Utility

```typescript
// lib/utils/rate-limiter.ts
export class RateLimiter {
  private tokens: Map<string, number> = new Map()
  private lastRefill: Map<string, number> = new Map()

  constructor(
    private maxTokens: number, // e.g., 60
    private refillRate: number // e.g., 1 per second
  ) {}

  async throttle(key: string): Promise<void> {
    // Token bucket algorithm
    // Blocks until token available
    // Returns immediately if tokens available
  }

  getRemaining(key: string): number {
    // Check how many tokens left
  }

  reset(key: string): void {
    // Reset for new time window
  }
}

// Usage:
const hudLimiter = new RateLimiter(60, 1) // 60 requests/minute
await hudLimiter.throttle('hud-api')
```

**Alternative:** Use Upstash Redis for distributed rate limiting across multiple workers.

#### 1.4 Error Recovery & Checkpointing

```typescript
// lib/data-sources/checkpoint-manager.ts
export class CheckpointManager {
  async saveCheckpoint(jobId: string, data: CheckpointData): Promise<void>
  async loadCheckpoint(jobId: string): Promise<CheckpointData | null>
  async clearCheckpoint(jobId: string): Promise<void>
}

interface CheckpointData {
  last_processed_index: number
  last_source_id: string
  processed_count: number
  batch_queue: NormalizedResource[] // Unsent resources
  timestamp: string
}
```

---

### Phase 2: Data Source Adapters (8-12 hours)

Build adapters to fetch, normalize, and map data from each API.

#### 2.1 Base Adapter Interface

```typescript
// lib/data-sources/base-adapter.ts
export interface DataSourceAdapter {
  /** Unique identifier for this adapter */
  name: string

  /** Human-readable display name */
  displayName: string

  /** Rate limit (requests per minute) */
  rateLimit: number

  /**
   * Fetch resources from this data source
   * Yields resources one at a time (generator for memory efficiency)
   * @param params - Filtering params (state, city, category, etc.)
   */
  fetch(params: FetchParams): AsyncGenerator<unknown>

  /**
   * Normalize raw API response to our standard format
   * @param raw - Raw API response object
   * @returns Normalized resource ready for import
   */
  normalize(raw: unknown): NormalizedResource

  /**
   * Map source category to our category system
   * @param sourceCategory - Category from source API
   * @returns Our primary_category value
   */
  mapCategory(sourceCategory: string): string

  /**
   * Determine verification level for this source
   * Government data = L1, scraped data = L3
   */
  getVerificationLevel(): 'L1' | 'L2' | 'L3'
}

export interface FetchParams {
  state?: string
  city?: string
  zipCode?: string
  category?: string
  limit?: number
  offset?: number
}

export interface NormalizedResource {
  // Required fields
  name: string
  address: string
  city: string
  state: string

  // Optional fields
  zip?: string
  phone?: string
  email?: string
  website?: string
  description?: string
  services_offered?: string[]
  primary_category: string
  categories?: string[]
  hours?: Record<string, string>
  eligibility_criteria?: string
  accessibility_features?: string[]

  // Provenance tracking
  source: {
    id: string // External ID from source
    name: string // 'HUD Exchange'
    url: string // Link to original record
    fetched_at: string // ISO timestamp
    raw_data?: unknown // Optional: store raw for debugging
  }
}
```

#### 2.2 Priority Adapters (Build in Order)

**A. HUD Exchange Adapter** (HIGHEST PRIORITY)

```typescript
// lib/data-sources/adapters/hud-exchange.ts
export class HUDExchangeAdapter implements DataSourceAdapter {
  name = 'hud_exchange'
  displayName = 'HUD Exchange - Continuum of Care'
  rateLimit = 60 // Requests per minute

  private apiUrl =
    'https://www.hudexchange.info/resource/reportmanagement/published/CoC_PopSub_NatlTerrDC_2023.xlsx'

  async *fetch(params: FetchParams): AsyncGenerator<HUDRecord> {
    // Download Excel file
    // Parse with xlsx library
    // Filter by params.state, params.city
    // Yield each row
  }

  normalize(raw: unknown): NormalizedResource {
    const record = raw as HUDRecord

    return {
      name: record.OrganizationName,
      address: record.Address1,
      city: record.City,
      state: record.State,
      zip: record.ZIP,
      phone: this.formatPhone(record.Phone),
      website: this.cleanUrl(record.Website),
      description: this.buildDescription(record),
      primary_category: this.mapCategory(record.ProgramType),
      services_offered: [
        record.ProgramType,
        record.TargetPopulation,
        record.BedInventory ? `${record.BedInventory} beds` : null,
      ].filter(Boolean),
      source: {
        id: record.OrganizationID,
        name: 'HUD Exchange',
        url: `https://www.hudexchange.info/programs/coc/coc-viewer/${record.OrganizationID}`,
        fetched_at: new Date().toISOString(),
      },
    }
  }

  mapCategory(hudType: string): string {
    const mapping: Record<string, string> = {
      'Emergency Shelter': 'housing',
      'Transitional Housing': 'housing',
      'Permanent Supportive Housing': 'housing',
      'Rapid Re-Housing': 'housing',
      'Homelessness Prevention': 'housing',
      'Safe Haven': 'housing',
      'Street Outreach': 'general-support',
    }
    return mapping[hudType] || 'housing'
  }

  getVerificationLevel(): 'L1' {
    return 'L1' // Government data = high trust, minimal verification
  }

  private buildDescription(record: HUDRecord): string {
    // Combine multiple fields into readable description
  }

  private formatPhone(phone: string): string {
    // Standardize phone format
  }

  private cleanUrl(url: string): string {
    // Validate and clean URL
  }
}

interface HUDRecord {
  OrganizationID: string
  OrganizationName: string
  Address1: string
  City: string
  State: string
  ZIP: string
  Phone: string
  Website: string
  ProgramType: string
  TargetPopulation: string
  BedInventory: number
  // ... other HUD fields
}
```

**B. SAMHSA Treatment Locator** (HIGH PRIORITY)

```typescript
// lib/data-sources/adapters/samhsa.ts
export class SAMHSAAdapter implements DataSourceAdapter {
  name = 'samhsa'
  displayName = 'SAMHSA Treatment Locator'
  rateLimit = 60

  private apiUrl = 'https://findtreatment.gov/api/v1/facilities'
  private apiKey = process.env.SAMHSA_API_KEY // Free registration

  async *fetch(params: FetchParams): AsyncGenerator<SAMHSARecord> {
    let page = 1
    let hasMore = true

    while (hasMore) {
      const url = new URL(this.apiUrl)
      if (params.state) url.searchParams.set('state', params.state)
      if (params.city) url.searchParams.set('city', params.city)
      url.searchParams.set('page', page.toString())
      url.searchParams.set('per_page', '100')

      const response = await fetch(url, {
        headers: { 'X-API-Key': this.apiKey },
      })

      const data = await response.json()

      for (const facility of data.facilities) {
        yield facility
      }

      hasMore = data.facilities.length === 100
      page++
    }
  }

  normalize(raw: unknown): NormalizedResource {
    const facility = raw as SAMHSARecord

    return {
      name: facility.name,
      address: facility.street,
      city: facility.city,
      state: facility.state,
      zip: facility.zip,
      phone: facility.phone,
      website: facility.website,
      description: this.buildDescription(facility),
      primary_category: this.mapCategory(facility.type),
      services_offered: facility.services.map((s) => s.name),
      source: {
        id: facility.id,
        name: 'SAMHSA',
        url: `https://findtreatment.gov/locator/facility/${facility.id}`,
        fetched_at: new Date().toISOString(),
      },
    }
  }

  mapCategory(type: string): string {
    const mapping: Record<string, string> = {
      SA: 'substance-abuse-treatment',
      MH: 'mental-health',
      DUAL: 'mental-health', // Dual diagnosis
      MAT: 'substance-abuse-treatment', // Medication-assisted treatment
    }
    return mapping[type] || 'healthcare'
  }

  getVerificationLevel(): 'L1' {
    return 'L1' // Government data
  }
}

interface SAMHSARecord {
  id: string
  name: string
  street: string
  city: string
  state: string
  zip: string
  phone: string
  website: string
  type: string
  services: Array<{ name: string; code: string }>
}
```

**C. DOL CareerOneStop** (HIGH PRIORITY)

```typescript
// lib/data-sources/adapters/dol-careeronestop.ts
export class DOLCareerOneStopAdapter implements DataSourceAdapter {
  name = 'dol_careeronestop'
  displayName = 'DOL CareerOneStop'
  rateLimit = 60

  private apiUrl = 'https://api.careeronestop.org/v1/ajcfinder'
  private userId = process.env.DOL_API_USER_ID
  private apiKey = process.env.DOL_API_KEY

  // Similar structure to SAMHSA adapter
  // Fetches American Job Centers, training programs

  mapCategory(programType: string): string {
    const mapping: Record<string, string> = {
      'American Job Center': 'employment',
      Apprenticeship: 'employment',
      'Training Program': 'education',
      'Workforce Development': 'employment',
      'Career Counseling': 'employment',
    }
    return mapping[programType] || 'employment'
  }
}
```

**D. Legal Services Corporation** (MEDIUM PRIORITY)

```typescript
// lib/data-sources/adapters/lsc.ts
export class LSCAdapter implements DataSourceAdapter {
  name = 'lsc'
  displayName = 'Legal Services Corporation'
  rateLimit = 60

  // Fetches free legal aid offices

  mapCategory(): string {
    return 'legal-aid' // All LSC records are legal aid
  }
}
```

**E. USDA Food Locator** (MEDIUM PRIORITY)

```typescript
// lib/data-sources/adapters/usda-food.ts
export class USDAFoodAdapter implements DataSourceAdapter {
  name = 'usda_food'
  displayName = 'USDA Food Locator'
  rateLimit = 60

  // Fetches food banks, pantries, SNAP retailers

  mapCategory(programType: string): string {
    const mapping: Record<string, string> = {
      'Food Bank': 'food',
      'Food Pantry': 'food',
      'SNAP Retailer': 'food',
      'WIC Clinic': 'food',
      'TEFAP Site': 'food',
    }
    return mapping[programType] || 'food'
  }
}
```

#### 2.3 Category Mapping Configuration

```typescript
// lib/data-sources/category-mappings.json
{
  "hud_exchange": {
    "Emergency Shelter": "housing",
    "Transitional Housing": "housing",
    "Permanent Supportive Housing": "housing",
    "Rapid Re-Housing": "housing",
    "Safe Haven": "housing",
    "Street Outreach": "general-support"
  },
  "samhsa": {
    "SA": "substance-abuse-treatment",
    "MH": "mental-health",
    "DUAL": "mental-health",
    "MAT": "substance-abuse-treatment"
  },
  "dol_careeronestop": {
    "American Job Center": "employment",
    "Apprenticeship": "employment",
    "Training Program": "education",
    "Career Counseling": "employment"
  },
  "lsc": {
    "*": "legal-aid"
  },
  "usda_food": {
    "Food Bank": "food",
    "Food Pantry": "food",
    "SNAP Retailer": "food",
    "WIC Clinic": "food"
  }
}
```

#### 2.4 Adapter Registry

```typescript
// lib/data-sources/adapter-registry.ts
import { HUDExchangeAdapter } from './adapters/hud-exchange'
import { SAMHSAAdapter } from './adapters/samhsa'
import { DOLCareerOneStopAdapter } from './adapters/dol-careeronestop'
import { LSCAdapter } from './adapters/lsc'
import { USDAFoodAdapter } from './adapters/usda-food'

export const adapterRegistry: Record<string, DataSourceAdapter> = {
  hud_exchange: new HUDExchangeAdapter(),
  samhsa: new SAMHSAAdapter(),
  dol_careeronestop: new DOLCareerOneStopAdapter(),
  lsc: new LSCAdapter(),
  usda_food: new USDAFoodAdapter(),
}

export function getAdapter(name: string): DataSourceAdapter {
  const adapter = adapterRegistry[name]
  if (!adapter) {
    throw new Error(`Unknown adapter: ${name}`)
  }
  return adapter
}

export function listAdapters(): Array<{ name: string; displayName: string }> {
  return Object.values(adapterRegistry).map((a) => ({
    name: a.name,
    displayName: a.displayName,
  }))
}
```

---

### Phase 3: Import Orchestrator (10-14 hours)

Coordinates large-scale imports with parallelization, checkpointing, and error recovery.

#### 3.1 Import Orchestrator

```typescript
// lib/data-sources/import-orchestrator.ts
export class ImportOrchestrator {
  private job: DataImportJob
  private adapter: DataSourceAdapter
  private rateLimiter: RateLimiter
  private checkpointManager: CheckpointManager
  private batch: NormalizedResource[] = []
  private batchSize = 50 // Submit 50 resources at a time

  constructor(jobId: string, adapterName: string) {
    this.adapter = getAdapter(adapterName)
    this.rateLimiter = new RateLimiter(this.adapter.rateLimit, 60)
    this.checkpointManager = new CheckpointManager()
  }

  async run(params: FetchParams): Promise<ImportResult> {
    this.job = await this.loadOrCreateJob()

    try {
      await this.updateJobStatus('running')

      // Load checkpoint if resuming
      const checkpoint = await this.checkpointManager.loadCheckpoint(this.job.id)
      let skipCount = checkpoint?.last_processed_index || 0

      // Fetch from data source (async generator for memory efficiency)
      let index = 0
      for await (const rawRecord of this.adapter.fetch(params)) {
        // Skip already-processed records if resuming
        if (index < skipCount) {
          index++
          continue
        }

        // Check if we should pause
        if (await this.shouldPause()) {
          await this.saveCheckpoint(index)
          return { status: 'paused', processed: index }
        }

        // Rate limit before processing
        await this.rateLimiter.throttle(this.adapter.name)

        try {
          // Normalize
          const normalized = this.adapter.normalize(rawRecord)

          // Store raw + normalized record
          await this.storeRecord(rawRecord, normalized)

          // Add to batch
          this.batch.push(normalized)

          // Submit batch when full
          if (this.batch.length >= this.batchSize) {
            await this.submitBatch()
          }

          // Update progress (every 10 records)
          if (index % 10 === 0) {
            await this.updateProgress(index)
          }
        } catch (error) {
          await this.handleRecordError(rawRecord, error)
        }

        index++
      }

      // Submit remaining batch
      if (this.batch.length > 0) {
        await this.submitBatch()
      }

      await this.updateJobStatus('completed')
      return { status: 'completed', processed: index }
    } catch (error) {
      await this.handleJobError(error)
      throw error
    }
  }

  private async submitBatch(): Promise<void> {
    const resources = [...this.batch]
    this.batch = []

    try {
      // POST to /api/resources/suggest-batch
      const response = await fetch('/api/resources/suggest-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resources,
          submitter: `Data Import: ${this.adapter.displayName}`,
          verification_level: this.adapter.getVerificationLevel(),
        }),
      })

      const result = await response.json()

      // Update data_import_records with results
      await this.updateRecordsWithResults(resources, result)
    } catch (error) {
      // Re-add to batch for retry
      this.batch.push(...resources)
      throw error
    }
  }

  private async saveCheckpoint(index: number): Promise<void> {
    await this.checkpointManager.saveCheckpoint(this.job.id, {
      last_processed_index: index,
      batch_queue: this.batch,
      timestamp: new Date().toISOString(),
    })
  }

  private async shouldPause(): Promise<boolean> {
    // Check if job status changed to 'paused'
    const job = await supabase
      .from('data_import_jobs')
      .select('status')
      .eq('id', this.job.id)
      .single()

    return job.data?.status === 'paused'
  }

  private async updateProgress(processed: number): Promise<void> {
    await supabase
      .from('data_import_jobs')
      .update({
        processed_records: processed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.job.id)
  }

  // ... error handling methods
}
```

#### 3.2 Parallel Processing

```typescript
// lib/data-sources/parallel-orchestrator.ts
import PQueue from 'p-queue'

export class ParallelImportOrchestrator {
  private queue: PQueue

  constructor(concurrency = 5) {
    this.queue = new PQueue({ concurrency })
  }

  async runParallel(jobId: string, adapterName: string, params: FetchParams): Promise<void> {
    const adapter = getAdapter(adapterName)
    const batches = this.createBatches(adapter.fetch(params), 100)

    for await (const batch of batches) {
      this.queue.add(() => this.processBatch(jobId, batch))
    }

    await this.queue.onIdle()
  }

  private async *createBatches<T>(generator: AsyncGenerator<T>, size: number): AsyncGenerator<T[]> {
    let batch: T[] = []

    for await (const item of generator) {
      batch.push(item)
      if (batch.length >= size) {
        yield batch
        batch = []
      }
    }

    if (batch.length > 0) {
      yield batch
    }
  }
}
```

#### 3.3 API Endpoints

```typescript
// app/api/admin/import-jobs/route.ts
export async function POST(request: Request) {
  const { source_name, filters, verification_level } = await request.json()

  // Validate adapter exists
  const adapter = getAdapter(source_name)

  // Create job
  const { data: job } = await supabase
    .from('data_import_jobs')
    .insert({
      source_name,
      source_url: adapter.apiUrl,
      status: 'pending',
      metadata: { filters, verification_level },
    })
    .select()
    .single()

  // Start background processing
  startImportJob(job.id, source_name, filters)

  return NextResponse.json(job)
}

// app/api/admin/import-jobs/[id]/progress/route.ts
export async function GET(request: Request, { params }: { params: { id: string } }) {
  // Server-Sent Events stream
  const stream = new ReadableStream({
    async start(controller) {
      const channel = supabase
        .channel(`import-job-${params.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'data_import_jobs',
            filter: `id=eq.${params.id}`,
          },
          (payload) => {
            const data = `data: ${JSON.stringify(payload.new)}\n\n`
            controller.enqueue(new TextEncoder().encode(data))
          }
        )
        .subscribe()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

---

### Phase 4: Admin UI (6-8 hours)

Build dashboard for managing imports with real-time progress.

#### 4.1 Import Dashboard Page

```typescript
// app/admin/data-imports/page.tsx
export default function DataImportsPage() {
  const [jobs, setJobs] = useState<DataImportJob[]>([])
  const [selectedJob, setSelectedJob] = useState<string | null>(null)

  return (
    <Container>
      <PageHeader
        title="Data Imports"
        description="Import resources from national APIs and state portals"
      />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <CreateImportDialog />
        </Grid>

        <Grid item xs={12}>
          <ImportJobList
            jobs={jobs}
            onSelect={setSelectedJob}
          />
        </Grid>

        {selectedJob && (
          <Grid item xs={12}>
            <ImportJobDetails jobId={selectedJob} />
          </Grid>
        )}
      </Grid>
    </Container>
  )
}
```

#### 4.2 Create Import Dialog

```typescript
// components/admin/CreateImportDialog.tsx
export function CreateImportDialog() {
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState('')
  const [state, setState] = useState('')
  const [city, setCity] = useState('')

  const adapters = [
    { value: 'hud_exchange', label: 'HUD Exchange (Housing)' },
    { value: 'samhsa', label: 'SAMHSA (Treatment)' },
    { value: 'dol_careeronestop', label: 'DOL CareerOneStop (Employment)' },
    { value: 'lsc', label: 'Legal Services Corp (Legal Aid)' },
    { value: 'usda_food', label: 'USDA Food Locator (Food Banks)' }
  ]

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>Create Import Job</DialogTitle>
      <DialogContent>
        <Select
          label="Data Source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          {adapters.map(a => (
            <MenuItem key={a.value} value={a.value}>
              {a.label}
            </MenuItem>
          ))}
        </Select>

        <TextField
          label="Filter by State (optional)"
          placeholder="CA"
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase())}
        />

        <TextField
          label="Filter by City (optional)"
          placeholder="Oakland"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button onClick={startImport} variant="contained">
          Start Import
        </Button>
      </DialogActions>
    </Dialog>
  )
}
```

#### 4.3 Real-time Progress Component

```typescript
// components/admin/ImportJobProgress.tsx
export function ImportJobProgress({ jobId }: { jobId: string }) {
  const [progress, setProgress] = useState<ProgressData | null>(null)

  useEffect(() => {
    // Server-Sent Events for real-time updates
    const eventSource = new EventSource(`/api/admin/import-jobs/${jobId}/progress`)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setProgress(data)
    }

    return () => eventSource.close()
  }, [jobId])

  if (!progress) return <CircularProgress />

  const percentage = progress.total_records
    ? (progress.processed_records / progress.total_records) * 100
    : 0

  return (
    <Box>
      <LinearProgress variant="determinate" value={percentage} />

      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Chip
          label={`${progress.processed_records} / ${progress.total_records}`}
          color="primary"
        />
        <Chip
          label={`${progress.successful_records} approved`}
          color="success"
        />
        <Chip
          label={`${progress.flagged_records} flagged`}
          color="warning"
        />
        <Chip
          label={`${progress.rejected_records} rejected`}
          color="error"
        />
      </Stack>

      {progress.eta_seconds && (
        <Typography variant="caption" sx={{ mt: 1 }}>
          ETA: {formatDuration(progress.eta_seconds)}
        </Typography>
      )}
    </Box>
  )
}
```

---

## Cost & Performance Estimates

### For 10,000 Resources Import

| Phase                 | Time                | Notes                                        |
| --------------------- | ------------------- | -------------------------------------------- |
| **API Fetching**      | 2-4 hours           | Rate limited by source APIs (60-120 req/min) |
| **Normalization**     | Instant             | In-memory processing                         |
| **Deduplication**     | 10-20 minutes       | Database queries, can optimize with caching  |
| **Verification (L1)** | 28 hours sequential | Can parallelize to 3 hours with 10 workers   |
| **Verification Cost** | $200-500            | Full L1-L3 verification                      |
| **Total Time**        | 6-8 hours           | With parallelization                         |

### Optimization: Trust-Based Verification

```typescript
const verificationLevels: Record<string, 'L1' | 'L2' | 'L3'> = {
  hud_exchange: 'L1', // Government = high trust
  samhsa: 'L1',
  dol_careeronestop: 'L1',
  lsc: 'L1',
  usda_food: 'L1',
  scraped_website: 'L3', // Low trust = full verification
  user_submitted: 'L3',
}
```

**Impact:** Reduces verification cost by 60-80% for government sources.

### Expected Auto-Approval Rates by Source

| Source            | Expected Auto-Approval |
| ----------------- | ---------------------- | ------------------------------------ |
| HUD Exchange      | 95%+                   | Government data, high quality        |
| SAMHSA            | 90%+                   | Government data, some missing fields |
| DOL CareerOneStop | 90%+                   | Government data                      |
| LSC               | 85%+                   | Nonprofit data, some outdated        |
| USDA Food         | 80%+                   | Mixed quality                        |
| Web scraped       | 60-70%                 | Variable quality                     |
| User submitted    | 40-60%                 | Requires manual review               |

---

## Implementation Priority

### Week 1: Foundation (MUST DO BEFORE IMPORTS)

**Goals:** Build infrastructure to support safe, large-scale imports

- [ ] Create database schema (import_jobs, import_records tables)
- [ ] Implement progress tracking API endpoints
- [ ] Build rate limiter utility
- [ ] Create base adapter interface
- [ ] Set up checkpoint/resume system
- [ ] Write unit tests for core utilities

**Deliverable:** Can create import jobs, track progress, handle interruptions

### Week 2: First Adapters (START WITH HIGH-VALUE SOURCES)

**Goals:** Build adapters for highest-priority data sources

- [ ] HUD Exchange adapter (housing - critical for reentry)
- [ ] SAMHSA adapter (treatment - critical for reentry)
- [ ] Category mapping configuration
- [ ] Adapter registry system
- [ ] Basic import orchestrator (single-threaded)
- [ ] Integration tests with real APIs

**Deliverable:** Can import from HUD and SAMHSA

### Week 3: Testing & Refinement

**Goals:** Validate with real data, optimize performance

- [ ] Test HUD import (California only, ~500 records)
- [ ] Test SAMHSA import (California only, ~300 records)
- [ ] Measure auto-approval rates
- [ ] Check for false positives/negatives
- [ ] Optimize deduplication performance
- [ ] Add more adapters (DOL, LSC, USDA)
- [ ] Implement parallel processing

**Deliverable:** Validated system with 3-5 adapters, 1,000+ test records

### Week 4: Admin UI & Production

**Goals:** Production-ready system with monitoring

- [ ] Admin dashboard for managing imports
- [ ] Real-time progress monitoring (SSE)
- [ ] Error handling UI
- [ ] Job pause/resume/cancel controls
- [ ] Import history and analytics
- [ ] Documentation and runbooks
- [ ] Production deployment

**Deliverable:** Full admin UI, ready for nationwide rollout

---

## Quick Wins (Can Do Immediately)

### 1. Test Current Batch API (30 minutes)

Manually test the existing batch API with sample HUD data:

```bash
# Download HUD data
curl -O 'https://www.hudexchange.info/resource/reportmanagement/published/CoC_PopSub_NatlTerrDC_2023.xlsx'

# Convert to JSON (use any Excel→JSON converter)
# POST to /api/resources/suggest-batch

curl -X POST 'http://localhost:3000/api/resources/suggest-batch' \
  -H 'Content-Type: application/json' \
  -d @hud_sample.json
```

**Validates:** Current infrastructure can handle government data

### 2. Set Up Data Sources Directory (15 minutes)

```bash
mkdir -p lib/data-sources/adapters
mkdir -p lib/data-sources/mappings
touch lib/data-sources/base-adapter.ts
touch lib/data-sources/adapter-registry.ts
touch lib/data-sources/import-orchestrator.ts
touch lib/data-sources/category-mappings.json
```

**Prepares:** Code structure for adapters

### 3. Register for API Keys (30 minutes)

- [ ] SAMHSA API: https://findtreatment.gov/developer
- [ ] DOL CareerOneStop: https://www.careeronestop.org/WebAPI/WebAPI.aspx
- [ ] 211.org: Contact via website for data access
- [ ] Data.gov API: https://api.data.gov/signup/

**Prepares:** API access for development

---

## Recommended Approach

### Start with California-Only Pilot

**Why California:**

- Large state with high reentry population
- Good test of scale (~1,000+ resources per source)
- Validates architecture before nationwide rollout
- Limits verification costs during testing ($20-50 vs $200-500)
- Easier to manually review results for quality

**Pilot Plan:**

1. Build Phase 1 foundation
2. Build HUD + SAMHSA adapters
3. Import California data only (~1,500 total resources)
4. Manually review 10% random sample
5. Measure auto-approval rate, false positive rate
6. Refine verification thresholds if needed
7. Then scale to nationwide

**Success Criteria:**

- ✅ 85%+ auto-approval rate
- ✅ <5% false positive rate (bad data getting approved)
- ✅ <10% false negative rate (good data getting rejected)
- ✅ Processing time <4 hours for 1,500 resources
- ✅ Cost <$75 for verification

---

## Next Steps

**Option 1: Start Implementation (Recommended)**

- Begin with Phase 1 (database schema + APIs)
- Then build HUD Exchange adapter
- Test with California data

**Option 2: Detailed Specification**

- Create comprehensive spec document for review
- Include API contracts, database schemas, test plans
- Review before implementation

**Option 3: Proof of Concept**

- Build minimal HUD adapter only
- Manual end-to-end test with 50 records
- Validate approach before full implementation

---

## Questions to Answer Before Starting

1. **Which approach do you prefer?**
   - Pilot with California only? (Recommended)
   - Start with nationwide immediately?

2. **Which data sources are highest priority?**
   - HUD (housing)?
   - SAMHSA (treatment)?
   - DOL (employment)?
   - All three?

3. **What's your timeline?**
   - Need this in 1-2 weeks? (Focus on 1-2 adapters)
   - Have 3-4 weeks? (Full system with 5+ adapters)

4. **Verification level preference?**
   - L1 only for government sources? (Faster, cheaper, 95% accurate)
   - Full L1-L3 for all sources? (Slower, expensive, 99% accurate)

5. **Manual review capacity?**
   - Can you review 50-100 flagged resources per import?
   - Or prefer higher auto-approval threshold (more false positives)?

---

**Status:** Ready to start implementation pending your direction.

**Recommendation:** Start with Phase 1 + HUD adapter + California pilot for validation before nationwide rollout.
