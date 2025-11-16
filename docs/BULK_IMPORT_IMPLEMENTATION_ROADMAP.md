# Bulk Import Implementation Roadmap

**Date:** 2025-11-16
**Status:** Ready to Execute
**Goal:** Import 2,700-3,700 California resources from 3 government data sources
**Timeline:** 3 weeks (70-88 hours)

---

## Table of Contents

1. [Overview](#overview)
2. [Infrastructure Preparation](#infrastructure-preparation)
3. [Phase 1: CareerOneStop](#phase-1-careeronestop)
4. [Phase 2: SAMHSA](#phase-2-samhsa)
5. [Phase 3: HUD Exchange](#phase-3-hud-exchange)
6. [Testing & Validation](#testing--validation)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Overview

### Three-Phase Approach

```
Week 1: Infrastructure + CareerOneStop (350 resources)
   ↓
Week 2: SAMHSA Treatment Locator (1,750 resources)
   ↓
Week 3: HUD Exchange Housing (1,270 resources)
   ↓
Total: 2,700-3,700 California resources
```

### Success Criteria

- ✅ All imports complete with 80%+ auto-approval
- ✅ <500 records requiring manual review total
- ✅ Total cost <$130
- ✅ Infrastructure proven for nationwide scale
- ✅ Map shows 2,700+ resources across employment, treatment, housing

---

## Infrastructure Preparation

**Timeline:** Days 1-2 (10-12 hours)
**Prerequisites:** Current system review
**Goal:** Build essential infrastructure before first import

### Task 1: Database Schema Extensions

**File:** `supabase/migrations/YYYYMMDD_bulk_import_tracking.sql`

**Create:**

```sql
-- Track bulk import jobs
CREATE TABLE data_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL, -- 'careeronestop', 'samhsa', 'hud_exchange'
  source_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')),
  total_records INTEGER,
  processed_records INTEGER DEFAULT 0,
  successful_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  flagged_records INTEGER DEFAULT 0,
  rejected_records INTEGER DEFAULT 0,
  checkpoint_data JSONB, -- Resume state if interrupted
  error_log JSONB[], -- Array of errors
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB -- Filters, config, etc.
);

-- Track individual record processing
CREATE TABLE data_import_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES data_import_jobs(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL, -- External ID from source
  raw_data JSONB NOT NULL, -- Original record
  normalized_data JSONB, -- After field mapping
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'verified', 'approved', 'flagged', 'rejected', 'error')),
  resource_id UUID REFERENCES resources(id), -- If created
  suggestion_id UUID REFERENCES resource_suggestions(id), -- If flagged
  error_message TEXT,
  verification_score NUMERIC(3,2),
  verification_level TEXT CHECK (verification_level IN ('L1', 'L2', 'L3')),
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_import_jobs_status ON data_import_jobs(status, created_at DESC);
CREATE INDEX idx_import_jobs_source ON data_import_jobs(source_name, created_at DESC);
CREATE INDEX idx_import_records_job ON data_import_records(job_id, status);
CREATE INDEX idx_import_records_source ON data_import_records(job_id, source_id);

-- RLS policies
ALTER TABLE data_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_import_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage import jobs" ON data_import_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage import records" ON data_import_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );
```

**Execute:**
```bash
# Use Supabase MCP to execute migration
mcp__supabase__execute_sql --project_id scvshbntarpyjvdexpmp --query "$(cat supabase/migrations/YYYYMMDD_bulk_import_tracking.sql)"
```

**Verify:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'data_import%';
```

**Estimated Time:** 2 hours

---

### Task 2: Field Mapping Configuration

**File:** `lib/data-sources/field-mappings.json`

**Create:**

```json
{
  "careeronestop": {
    "fieldMapping": {
      "ID": "source_id",
      "Name": "name",
      "Address1": "address",
      "Address2": "address_line_2",
      "City": "city",
      "State": "state",
      "Zip": "zip",
      "Phone": "phone",
      "Fax": "fax",
      "Email": "email",
      "Website": "website",
      "OpenHour": "hours_raw",
      "Latitude": "latitude",
      "Longitude": "longitude",
      "LastUpdated": "last_verified"
    },
    "categoryMapping": {
      "*": "employment"
    },
    "servicesMapping": {
      "Youth Services": "youth employment programs",
      "Business Services": "business development",
      "Worker Services": "job training and placement"
    },
    "verificationLevel": "L1",
    "hoursFormat": "structured"
  },
  "samhsa": {
    "fieldMapping": {
      "name1": "name",
      "street1": "address",
      "city": "city",
      "state": "state",
      "zip": "zip",
      "phone": "phone",
      "website": "website",
      "services": "services_raw"
    },
    "categoryMapping": {
      "SA": "substance-abuse-treatment",
      "MH": "mental-health",
      "DUAL": "mental-health",
      "MAT": "substance-abuse-treatment"
    },
    "verificationLevel": "L1",
    "requiresGeocoding": true
  },
  "hud_exchange": {
    "fieldMapping": {
      "OrganizationID": "source_id",
      "OrganizationName": "name",
      "Address1": "address",
      "City": "city",
      "State": "state",
      "ZIP": "zip",
      "Phone": "phone",
      "Website": "website",
      "ProgramType": "program_type_raw"
    },
    "categoryMapping": {
      "Emergency Shelter": "housing",
      "Transitional Housing": "housing",
      "Permanent Supportive Housing": "housing",
      "Rapid Re-Housing": "housing",
      "Safe Haven": "housing",
      "Street Outreach": "general-support"
    },
    "verificationLevel": "L1",
    "requiresGeocoding": true
  }
}
```

**File:** `lib/data-sources/field-mapper.ts`

**Create:**

```typescript
import mappings from './field-mappings.json'

export interface FieldMapping {
  fieldMapping: Record<string, string>
  categoryMapping: Record<string, string>
  servicesMapping?: Record<string, string>
  verificationLevel: 'L1' | 'L2' | 'L3'
  hoursFormat?: 'structured' | 'raw'
  requiresGeocoding?: boolean
}

export interface NormalizedResource {
  name: string
  address: string
  city: string
  state: string
  zip?: string
  phone?: string
  email?: string
  website?: string
  description?: string
  services_offered?: string[]
  primary_category: string
  categories?: string[]
  hours?: Record<string, string>
  latitude?: number
  longitude?: number
  source: {
    id: string
    name: string
    url?: string
    fetched_at: string
  }
}

export class FieldMapper {
  private mapping: FieldMapping

  constructor(sourceName: string) {
    const sourceMapping = mappings[sourceName as keyof typeof mappings]
    if (!sourceMapping) {
      throw new Error(`No mapping found for source: ${sourceName}`)
    }
    this.mapping = sourceMapping
  }

  /**
   * Normalize raw source data to our standard resource format
   */
  normalize(raw: Record<string, any>, sourceName: string): NormalizedResource {
    const normalized: Partial<NormalizedResource> = {}

    // Map fields
    for (const [sourceField, targetField] of Object.entries(this.mapping.fieldMapping)) {
      const value = raw[sourceField]
      if (value !== undefined && value !== null && value !== '') {
        normalized[targetField as keyof NormalizedResource] = value
      }
    }

    // Map category
    const rawCategory = raw.type || raw.ProgramType || raw.category || '*'
    normalized.primary_category = this.mapping.categoryMapping[rawCategory] || this.mapping.categoryMapping['*']

    // Build source metadata
    normalized.source = {
      id: raw[Object.keys(this.mapping.fieldMapping)[0]] || raw.id || crypto.randomUUID(),
      name: sourceName,
      fetched_at: new Date().toISOString(),
    }

    return normalized as NormalizedResource
  }

  /**
   * Get verification level for this source
   */
  getVerificationLevel(): 'L1' | 'L2' | 'L3' {
    return this.mapping.verificationLevel
  }

  /**
   * Check if this source requires geocoding
   */
  requiresGeocoding(): boolean {
    return this.mapping.requiresGeocoding || false
  }
}
```

**Estimated Time:** 2-3 hours

---

### Task 3: Geocoding Utility

**File:** `lib/utils/geocoding.ts`

**Create:**

```typescript
import { env } from '@/lib/env'

export interface GeocodedAddress {
  latitude: number
  longitude: number
  formatted_address: string
  place_id: string
  location_type: string
  county?: string
  county_fips?: string
  neighborhood?: string
}

export interface GeocodeResult {
  success: boolean
  data?: GeocodedAddress
  error?: string
}

/**
 * Geocode a single address using Google Maps Geocoding API
 */
export async function geocodeAddress(address: string, city: string, state: string, zip?: string): Promise<GeocodeResult> {
  try {
    // Build full address
    const fullAddress = [address, city, state, zip].filter(Boolean).join(', ')

    // Call Google Maps Geocoding API
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.set('address', fullAddress)
    url.searchParams.set('key', env.GOOGLE_MAPS_KEY)

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK') {
      return {
        success: false,
        error: `Geocoding failed: ${data.status}`,
      }
    }

    const result = data.results[0]

    // Extract county and other metadata
    const countyComponent = result.address_components.find((c: any) =>
      c.types.includes('administrative_area_level_2')
    )
    const neighborhoodComponent = result.address_components.find((c: any) =>
      c.types.includes('neighborhood')
    )

    return {
      success: true,
      data: {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        location_type: result.geometry.location_type,
        county: countyComponent?.long_name,
        neighborhood: neighborhoodComponent?.long_name,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Batch geocode multiple addresses with rate limiting
 */
export async function batchGeocode(
  addresses: Array<{ address: string; city: string; state: string; zip?: string }>,
  delayMs = 100 // Delay between requests to respect rate limits
): Promise<GeocodeResult[]> {
  const results: GeocodeResult[] = []

  for (const addr of addresses) {
    const result = await geocodeAddress(addr.address, addr.city, addr.state, addr.zip)
    results.push(result)

    // Delay to respect rate limits (10 requests/second = 100ms delay)
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return results
}

/**
 * Calculate geocoding cost estimate
 */
export function estimateGeocodingCost(count: number): number {
  const costPerGeocode = 0.005 // $0.005 per geocode
  return count * costPerGeocode
}
```

**Test:**

```typescript
// Test geocoding utility
const result = await geocodeAddress('123 Main St', 'Oakland', 'CA', '94612')
console.log(result)
```

**Estimated Time:** 2-3 hours

---

### Task 4: Data Import Orchestrator

**File:** `lib/data-sources/import-orchestrator.ts`

**Create:**

```typescript
import { createClient } from '@/lib/supabase/server'
import { FieldMapper, NormalizedResource } from './field-mapper'
import { geocodeAddress } from '@/lib/utils/geocoding'

export interface ImportJobConfig {
  sourceName: string
  sourceUrl?: string
  filters?: {
    state?: string
    city?: string
    category?: string
  }
  verificationLevel?: 'L1' | 'L2' | 'L3'
  batchSize?: number
}

export interface ImportProgress {
  total: number
  processed: number
  successful: number
  failed: number
  flagged: number
  rejected: number
}

export class ImportOrchestrator {
  private jobId: string | null = null
  private mapper: FieldMapper
  private supabase = createClient()
  private batchSize: number

  constructor(private config: ImportJobConfig) {
    this.mapper = new FieldMapper(config.sourceName)
    this.batchSize = config.batchSize || 50
  }

  /**
   * Create import job in database
   */
  async createJob(totalRecords: number): Promise<string> {
    const { data, error } = await this.supabase
      .from('data_import_jobs')
      .insert({
        source_name: this.config.sourceName,
        source_url: this.config.sourceUrl,
        status: 'pending',
        total_records: totalRecords,
        metadata: {
          filters: this.config.filters,
          verification_level: this.config.verificationLevel,
        },
      })
      .select('id')
      .single()

    if (error) throw error
    this.jobId = data.id
    return data.id
  }

  /**
   * Update job status
   */
  async updateJobStatus(status: 'running' | 'paused' | 'completed' | 'failed'): Promise<void> {
    if (!this.jobId) throw new Error('Job not created')

    await this.supabase
      .from('data_import_jobs')
      .update({
        status,
        ...(status === 'completed' || status === 'failed' ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq('id', this.jobId)
  }

  /**
   * Update job progress
   */
  async updateProgress(progress: Partial<ImportProgress>): Promise<void> {
    if (!this.jobId) throw new Error('Job not created')

    await this.supabase
      .from('data_import_jobs')
      .update({
        processed_records: progress.processed,
        successful_records: progress.successful,
        failed_records: progress.failed,
        flagged_records: progress.flagged,
        rejected_records: progress.rejected,
      })
      .eq('id', this.jobId)
  }

  /**
   * Process a batch of raw records
   */
  async processBatch(rawRecords: Record<string, any>[]): Promise<void> {
    if (!this.jobId) throw new Error('Job not created')

    const normalized: NormalizedResource[] = []

    // Normalize all records
    for (const raw of rawRecords) {
      try {
        let normalizedRecord = this.mapper.normalize(raw, this.config.sourceName)

        // Geocode if needed
        if (this.mapper.requiresGeocoding() && !normalizedRecord.latitude) {
          const geocodeResult = await geocodeAddress(
            normalizedRecord.address,
            normalizedRecord.city,
            normalizedRecord.state,
            normalizedRecord.zip
          )

          if (geocodeResult.success && geocodeResult.data) {
            normalizedRecord.latitude = geocodeResult.data.latitude
            normalizedRecord.longitude = geocodeResult.data.longitude
          }
        }

        normalized.push(normalizedRecord)

        // Store in data_import_records
        await this.supabase.from('data_import_records').insert({
          job_id: this.jobId,
          source_id: normalizedRecord.source.id,
          raw_data: raw,
          normalized_data: normalizedRecord,
          status: 'pending',
        })
      } catch (error) {
        console.error('Error normalizing record:', error)
        // Store error in job error_log
      }
    }

    // Submit to batch suggestion API
    const response = await fetch('/api/resources/suggest-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resources: normalized,
        submitter: `Bulk Import: ${this.config.sourceName}`,
        verification_level: this.config.verificationLevel || this.mapper.getVerificationLevel(),
      }),
    })

    const result = await response.json()

    // Update records with results
    // (Implementation depends on suggest-batch response format)
  }

  /**
   * Run import for all records
   */
  async run(records: Record<string, any>[]): Promise<void> {
    // Create job
    await this.createJob(records.length)
    await this.updateJobStatus('running')

    try {
      // Process in batches
      for (let i = 0; i < records.length; i += this.batchSize) {
        const batch = records.slice(i, i + this.batchSize)
        await this.processBatch(batch)

        // Update progress
        await this.updateProgress({
          processed: Math.min(i + this.batchSize, records.length),
        })
      }

      await this.updateJobStatus('completed')
    } catch (error) {
      await this.updateJobStatus('failed')
      throw error
    }
  }
}
```

**Estimated Time:** 4-5 hours

---

### Task 5: Testing Infrastructure

**Test Script:** `scripts/test-import-infrastructure.ts`

```typescript
import { ImportOrchestrator } from '@/lib/data-sources/import-orchestrator'

// Test with 10 sample CareerOneStop records
const testRecords = [
  {
    ID: 'TEST001',
    Name: 'Test Workforce Center',
    Address1: '123 Main St',
    City: 'Oakland',
    State: 'CA',
    Zip: '94612',
    Phone: '(510) 555-1234',
    Email: 'test@example.com',
    Website: 'https://example.com',
    Latitude: 37.8044,
    Longitude: -122.2712,
  },
  // ... 9 more test records
]

const orchestrator = new ImportOrchestrator({
  sourceName: 'careeronestop',
  filters: { state: 'CA' },
  verificationLevel: 'L1',
})

await orchestrator.run(testRecords)
console.log('Test import completed!')
```

**Run:**
```bash
npx tsx scripts/test-import-infrastructure.ts
```

**Verify:**
```sql
SELECT * FROM data_import_jobs ORDER BY created_at DESC LIMIT 1;
SELECT * FROM data_import_records WHERE job_id = 'xxx';
```

**Estimated Time:** 1-2 hours

---

## Phase 1: CareerOneStop

**Timeline:** Days 3-5 (16-20 hours)
**Goal:** Import 200-350 California workforce centers
**Expected Cost:** $17.50
**Expected Auto-Approval:** 95%+

### Step 1: Register for API Access

**Action:**
1. Visit https://www.careeronestop.org/Developers/WebAPI/registration.aspx
2. Fill out registration form:
   - Organization: Reentry Map
   - Email: gserafini@gmail.com
   - Use Case: "Resource directory for individuals navigating reentry"
3. Wait for approval email (usually 1-2 business days)
4. Save User ID and Authorization Token to environment variables

**Add to `.env.local`:**
```env
CAREERONESTOP_USER_ID=your_user_id_here
CAREERONESTOP_API_KEY=your_auth_token_here
```

**Time:** 5 minutes (+ waiting for approval)

---

### Step 2: Download Bulk Data

**While waiting for API approval, download CSV:**

1. Visit https://www.careeronestop.org/Developers/Data/comprehensive-and-affiliate-american-job-centers.aspx
2. Download "American Job Centers List" (Excel or CSV format)
3. Save to `data-imports/raw/careeronestop-ajc-2024.csv`

**Alternative (if download blocked):**
```bash
# Use curl with browser user agent
curl -H "User-Agent: Mozilla/5.0" \
  "https://www.careeronestop.org/Developers/Data/ajc-list.csv" \
  -o data-imports/raw/careeronestop-ajc-2024.csv
```

**Time:** 15 minutes

---

### Step 3: Parse and Filter Data

**Script:** `scripts/import-careeronestop.ts`

```typescript
import fs from 'fs'
import { parse } from 'csv-parse/sync'
import { ImportOrchestrator } from '@/lib/data-sources/import-orchestrator'

// Read CSV file
const csvContent = fs.readFileSync('data-imports/raw/careeronestop-ajc-2024.csv', 'utf-8')

// Parse CSV
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
})

// Filter for California only
const californiaRecords = records.filter((r: any) => r.State === 'CA')

console.log(`Found ${californiaRecords.length} California records`)

// Run import
const orchestrator = new ImportOrchestrator({
  sourceName: 'careeronestop',
  sourceUrl: 'https://www.careeronestop.org/Developers/Data/comprehensive-and-affiliate-american-job-centers.aspx',
  filters: { state: 'CA' },
  verificationLevel: 'L1',
  batchSize: 50,
})

await orchestrator.run(californiaRecords)

console.log('Import completed!')
```

**Run:**
```bash
npx tsx scripts/import-careeronestop.ts
```

**Time:** 2-3 hours (including script creation)

---

### Step 4: Verify Import

**Check database:**

```sql
-- Check job status
SELECT * FROM data_import_jobs
WHERE source_name = 'careeronestop'
ORDER BY created_at DESC LIMIT 1;

-- Check import records
SELECT status, COUNT(*)
FROM data_import_records
WHERE job_id = 'xxx'
GROUP BY status;

-- Check created resources
SELECT COUNT(*) FROM resources
WHERE source = 'careeronestop';

-- Check suggestions queue
SELECT status, COUNT(*)
FROM resource_suggestions
WHERE source = 'careeronestop'
GROUP BY status;
```

**Check on map:**
1. Visit http://localhost:3003/
2. Zoom to Oakland/Bay Area
3. Verify workforce centers appear as map markers
4. Click markers to verify data quality

**Time:** 1 hour

---

### Step 5: Review Flagged Records

**Query flagged records:**

```sql
SELECT * FROM resource_suggestions
WHERE source = 'careeronestop'
AND status = 'pending'
ORDER BY verification_score DESC;
```

**Manual review:**
1. Visit `/admin/verification-queue`
2. Review flagged records (expected: 10-20 records)
3. Approve or reject each
4. Document common issues for future improvements

**Time:** 1-2 hours

---

### Step 6: Fetch ReEntry Programs via API

**Script:** `scripts/import-careeronestop-reentry.ts`

```typescript
import { env } from '@/lib/env'
import { ImportOrchestrator } from '@/lib/data-sources/import-orchestrator'

// Fetch from API
const response = await fetch(
  `https://api.careeronestop.org/v1/reentryprogramfinder/${env.CAREERONESTOP_USER_ID}/GetAll`,
  {
    headers: {
      Authorization: `Bearer ${env.CAREERONESTOP_API_KEY}`,
    },
  }
)

const data = await response.json()

// Filter for California
const californiaPrograms = data.programs.filter((p: any) => p.State === 'CA')

console.log(`Found ${californiaPrograms.length} California reentry programs`)

// Import
const orchestrator = new ImportOrchestrator({
  sourceName: 'careeronestop_reentry',
  sourceUrl: 'https://api.careeronestop.org/v1/reentryprogramfinder',
  filters: { state: 'CA' },
  verificationLevel: 'L1',
})

await orchestrator.run(californiaPrograms)
```

**Run:**
```bash
npx tsx scripts/import-careeronestop-reentry.ts
```

**Time:** 2-3 hours

---

### Phase 1 Success Metrics

**Expected Results:**
- ✅ 200-350 resources imported
- ✅ 95%+ auto-approval rate (190-333 approved, 10-20 flagged)
- ✅ <2 hours total processing time
- ✅ All resources visible on map
- ✅ Cost: ~$17.50

**Deliverables:**
- [ ] CareerOneStop data imported
- [ ] Import infrastructure validated
- [ ] Deduplication working
- [ ] Verification agent handling batch imports
- [ ] Documentation of issues/improvements

---

## Phase 2: SAMHSA

**Timeline:** Week 2 (20-24 hours)
**Goal:** Import 1,500-2,000 California treatment facilities
**Expected Cost:** $61.25 ($52.50 verification + $8.75 geocoding)
**Expected Auto-Approval:** 85-90%

### Step 1: Download SAMHSA Data

**Download Excel file:**

1. Visit https://www.samhsa.gov/data/report/2024-national-directory-drug-and-alcohol-use-treatment
2. Download "2024 National Directory" Excel file
3. Save to `data-imports/raw/samhsa-2024-directory.xlsx`

**Alternative (Mental Health):**
- Visit https://www.samhsa.gov/data/report/2024-national-directory-mental-health-treatment-facilit
- Download mental health directory
- Combine with substance abuse directory

**Time:** 15-30 minutes

---

### Step 2: Convert Excel to CSV

**Script:** `scripts/convert-samhsa-excel.ts`

```typescript
import * as XLSX from 'xlsx'
import fs from 'fs'

// Read Excel file
const workbook = XLSX.readFile('data-imports/raw/samhsa-2024-directory.xlsx')

// Get first sheet
const sheetName = workbook.SheetNames[0]
const worksheet = workbook.Sheets[sheetName]

// Convert to JSON
const jsonData = XLSX.utils.sheet_to_json(worksheet)

// Filter for California
const californiaData = jsonData.filter((row: any) => row.State === 'CA' || row.state === 'CA')

console.log(`Found ${californiaData.length} California facilities`)

// Save as JSON
fs.writeFileSync('data-imports/processed/samhsa-california-2024.json', JSON.stringify(californiaData, null, 2))

console.log('Conversion complete!')
```

**Install dependency:**
```bash
npm install xlsx
```

**Run:**
```bash
npx tsx scripts/convert-samhsa-excel.ts
```

**Time:** 1 hour

---

### Step 3: Batch Geocode Addresses

**Script:** `scripts/geocode-samhsa.ts`

```typescript
import fs from 'fs'
import { batchGeocode, estimateGeocodingCost } from '@/lib/utils/geocoding'

// Load data
const data = JSON.parse(fs.readFileSync('data-imports/processed/samhsa-california-2024.json', 'utf-8'))

console.log(`Geocoding ${data.length} facilities...`)
console.log(`Estimated cost: $${estimateGeocodingCost(data.length)}`)

// Prepare addresses
const addresses = data.map((facility: any) => ({
  address: facility.street1 || facility.street,
  city: facility.city,
  state: facility.state,
  zip: facility.zip,
}))

// Batch geocode (10 requests/second = 100ms delay)
const results = await batchGeocode(addresses, 100)

// Merge results back into data
for (let i = 0; i < data.length; i++) {
  if (results[i].success && results[i].data) {
    data[i].latitude = results[i].data.latitude
    data[i].longitude = results[i].data.longitude
    data[i].formatted_address = results[i].data.formatted_address
    data[i].place_id = results[i].data.place_id
  } else {
    console.error(`Failed to geocode facility ${i}: ${results[i].error}`)
  }
}

// Save geocoded data
fs.writeFileSync('data-imports/processed/samhsa-california-geocoded-2024.json', JSON.stringify(data, null, 2))

// Report stats
const successCount = results.filter((r) => r.success).length
console.log(`Successfully geocoded: ${successCount} / ${data.length} (${((successCount / data.length) * 100).toFixed(1)}%)`)
console.log(`Actual cost: $${(successCount * 0.005).toFixed(2)}`)
```

**Run:**
```bash
npx tsx scripts/geocode-samhsa.ts
```

**Time:** 1-2 days (1,750 addresses × 100ms delay = 3 hours runtime)

**Note:** Can run overnight or in background

---

### Step 4: Import to Database

**Script:** `scripts/import-samhsa.ts`

```typescript
import fs from 'fs'
import { ImportOrchestrator } from '@/lib/data-sources/import-orchestrator'

// Load geocoded data
const data = JSON.parse(fs.readFileSync('data-imports/processed/samhsa-california-geocoded-2024.json', 'utf-8'))

console.log(`Importing ${data.length} SAMHSA facilities...`)

// Run import
const orchestrator = new ImportOrchestrator({
  sourceName: 'samhsa',
  sourceUrl: 'https://www.samhsa.gov/data/report/2024-national-directory-drug-and-alcohol-use-treatment',
  filters: { state: 'CA' },
  verificationLevel: 'L1', // Government data = minimal verification
  batchSize: 100, // Can batch larger since already geocoded
})

await orchestrator.run(data)

console.log('Import completed!')
```

**Run:**
```bash
npx tsx scripts/import-samhsa.ts
```

**Time:** 4-6 hours (processing 1,750 records through verification)

---

### Step 5: Verify and Review

**Check results:**

```sql
-- Job status
SELECT * FROM data_import_jobs WHERE source_name = 'samhsa' ORDER BY created_at DESC LIMIT 1;

-- Distribution by status
SELECT status, COUNT(*) FROM data_import_records WHERE job_id = 'xxx' GROUP BY status;

-- Created resources
SELECT COUNT(*) FROM resources WHERE source = 'samhsa';

-- Flagged for review
SELECT COUNT(*) FROM resource_suggestions WHERE source = 'samhsa' AND status = 'pending';
```

**Manual review:**
- Review flagged records (~150-300 expected)
- Check geocoding accuracy (spot-check 20-30 random records on map)
- Verify category mapping is correct
- Document issues

**Time:** 2-3 hours

---

### Phase 2 Success Metrics

**Expected Results:**
- ✅ 1,500-2,000 facilities imported
- ✅ 85-90% auto-approval rate
- ✅ 95%+ geocoding accuracy
- ✅ <200 records for manual review
- ✅ Cost: ~$61.25

---

## Phase 3: HUD Exchange

**Timeline:** Week 3 (24-32 hours)
**Goal:** Import 1,000-1,270 California housing resources
**Expected Cost:** $50.80
**Expected Auto-Approval:** 80-85%

### Step 1: Install Required Tools

**Install pyesridump:**

```bash
pip install pyesridump
```

**Verify installation:**
```bash
pyesridump --version
```

**Time:** 30 minutes

---

### Step 2: Download HUD Data

**Download CSV files (manual via browser):**

1. **Housing Inventory Count:**
   - Visit https://www.huduser.gov/portal/sites/default/files/xls/2024-HIC-Counts-by-State.csv
   - Download CSV
   - Save to `data-imports/raw/hud-hic-2024.csv`

2. **Point-in-Time Counts:**
   - Visit https://www.huduser.gov/portal/sites/default/files/xls/2007-2024-PIT-Counts-by-CoC.xlsb
   - Download Excel
   - Save to `data-imports/raw/hud-pit-2024.xlsb`

**Download ArcGIS data (using pyesridump):**

```bash
# Public Housing Developments
esri2geojson \
  "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Public_Housing_Developments/FeatureServer/0" \
  data-imports/raw/hud-public-housing.geojson \
  --where "STATE='CA'"
```

**Time:** 2-3 hours (ArcGIS download is slow)

---

### Step 3: Parse and Combine Datasets

**Script:** `scripts/parse-hud-data.ts`

```typescript
import fs from 'fs'
import { parse } from 'csv-parse/sync'
import * as XLSX from 'xlsx'

// Parse HIC CSV
const hicCsv = fs.readFileSync('data-imports/raw/hud-hic-2024.csv', 'utf-8')
const hicData = parse(hicCsv, { columns: true, skip_empty_lines: true })
const californiaHIC = hicData.filter((r: any) => r.State === 'CA')

// Parse GeoJSON
const geoJson = JSON.parse(fs.readFileSync('data-imports/raw/hud-public-housing.geojson', 'utf-8'))
const publicHousing = geoJson.features.map((f: any) => ({
  ...f.properties,
  latitude: f.geometry.coordinates[1],
  longitude: f.geometry.coordinates[0],
}))

// Combine datasets
const combined = [
  ...californiaHIC.map((r: any) => ({ ...r, dataset: 'HIC' })),
  ...publicHousing.map((r: any) => ({ ...r, dataset: 'PublicHousing' })),
]

console.log(`Combined ${combined.length} HUD records (${californiaHIC.length} HIC + ${publicHousing.length} Public Housing)`)

// Save
fs.writeFileSync('data-imports/processed/hud-california-combined.json', JSON.stringify(combined, null, 2))
```

**Run:**
```bash
npx tsx scripts/parse-hud-data.ts
```

**Time:** 1 day (complex parsing + combining multiple datasets)

---

### Step 4: Geocode Missing Coordinates

**Script:** `scripts/geocode-hud.ts`

```typescript
import fs from 'fs'
import { batchGeocode } from '@/lib/utils/geocoding'

// Load combined data
const data = JSON.parse(fs.readFileSync('data-imports/processed/hud-california-combined.json', 'utf-8'))

// Find records missing coordinates
const needsGeocoding = data.filter((r: any) => !r.latitude || !r.longitude)

console.log(`Geocoding ${needsGeocoding.length} records...`)

// Batch geocode
const addresses = needsGeocoding.map((r: any) => ({
  address: r.Address1 || r.street,
  city: r.City || r.city,
  state: r.State || r.state,
  zip: r.ZIP || r.zip,
}))

const results = await batchGeocode(addresses, 100)

// Merge results
let geocodedCount = 0
for (let i = 0; i < needsGeocoding.length; i++) {
  if (results[i].success && results[i].data) {
    needsGeocoding[i].latitude = results[i].data.latitude
    needsGeocoding[i].longitude = results[i].data.longitude
    geocodedCount++
  }
}

console.log(`Successfully geocoded: ${geocodedCount} / ${needsGeocoding.length}`)

// Save
fs.writeFileSync('data-imports/processed/hud-california-geocoded.json', JSON.stringify(data, null, 2))
```

**Run:**
```bash
npx tsx scripts/geocode-hud.ts
```

**Time:** 1 day (depends on how many records need geocoding)

---

### Step 5: Import to Database

**Script:** `scripts/import-hud.ts`

```typescript
import fs from 'fs'
import { ImportOrchestrator } from '@/lib/data-sources/import-orchestrator'

// Load geocoded data
const data = JSON.parse(fs.readFileSync('data-imports/processed/hud-california-geocoded.json', 'utf-8'))

console.log(`Importing ${data.length} HUD resources...`)

// Run import
const orchestrator = new ImportOrchestrator({
  sourceName: 'hud_exchange',
  sourceUrl: 'https://www.hudexchange.info/',
  filters: { state: 'CA' },
  verificationLevel: 'L1',
  batchSize: 100,
})

await orchestrator.run(data)

console.log('Import completed!')
```

**Run:**
```bash
npx tsx scripts/import-hud.ts
```

**Time:** 4-6 hours

---

### Step 6: Verify and Review

**Check results:**

```sql
-- Job status
SELECT * FROM data_import_jobs WHERE source_name = 'hud_exchange' ORDER BY created_at DESC LIMIT 1;

-- Status distribution
SELECT status, COUNT(*) FROM data_import_records WHERE job_id = 'xxx' GROUP BY status;

-- Created resources
SELECT COUNT(*) FROM resources WHERE source = 'hud_exchange';

-- Flagged
SELECT COUNT(*) FROM resource_suggestions WHERE source = 'hud_exchange' AND status = 'pending';
```

**Manual review:**
- Review flagged records (~190-250 expected)
- Verify category mapping (emergency shelter, transitional housing, etc.)
- Check for duplicates across HIC and Public Housing datasets
- Spot-check geocoding accuracy

**Time:** 2-3 hours

---

### Phase 3 Success Metrics

**Expected Results:**
- ✅ 1,000-1,270 housing resources imported
- ✅ 80-85% auto-approval rate
- ✅ <250 records for manual review
- ✅ All datasets merged successfully
- ✅ Cost: ~$50.80

---

## Testing & Validation

### Quality Assurance Checklist

**For Each Data Source:**

- [ ] **Data Accuracy**
  - [ ] Addresses match actual locations on map
  - [ ] Phone numbers formatted correctly
  - [ ] Websites accessible (spot-check 20)
  - [ ] Categories mapped correctly

- [ ] **Geocoding Accuracy**
  - [ ] Markers appear in correct cities
  - [ ] No markers in ocean/wrong state
  - [ ] Lat/lng precision reasonable (4-6 decimals)

- [ ] **Deduplication Working**
  - [ ] No obvious duplicates on map
  - [ ] Parent-child relationships detected
  - [ ] Similar names handled correctly

- [ ] **Verification Quality**
  - [ ] Auto-approval rate within expected range
  - [ ] Flagged records have valid reasons
  - [ ] No false positives (good data rejected)

- [ ] **User Experience**
  - [ ] Resources display correctly in list view
  - [ ] Resource detail pages load
  - [ ] Map markers clickable
  - [ ] Search finds imported resources

### Performance Testing

**Load Test:**
```bash
# Check query performance with 3,000+ resources
EXPLAIN ANALYZE SELECT * FROM resources
WHERE location IS NOT NULL
AND status = 'active'
ORDER BY name
LIMIT 100;

# Check map query performance
EXPLAIN ANALYZE SELECT * FROM resources
WHERE location IS NOT NULL
AND ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(-122.2712, 37.8044), 4326)::geography,
  5000 -- 5km radius
);
```

**Expected:** <100ms for list queries, <200ms for map queries

### Data Quality Report

**Generate report:**

```sql
-- Overall stats
SELECT
  source,
  COUNT(*) as total,
  COUNT(phone) as has_phone,
  COUNT(email) as has_email,
  COUNT(website) as has_website,
  AVG(completeness_score) as avg_completeness
FROM resources
WHERE source IN ('careeronestop', 'samhsa', 'hud_exchange')
GROUP BY source;

-- Geocoding accuracy
SELECT
  source,
  COUNT(*) as total,
  COUNT(latitude) as geocoded,
  ROUND(COUNT(latitude)::numeric / COUNT(*)::numeric * 100, 1) as geocoding_rate
FROM resources
GROUP BY source;
```

---

## Monitoring & Maintenance

### Quarterly Updates

**Schedule:** Every 3 months

**Process:**
1. Check for updated datasets on source websites
2. Download new data
3. Run import scripts with latest data
4. Compare with existing resources
5. Update changed records
6. Add new records
7. Mark closed/moved resources

**Automation:**
```bash
# Cron job (runs quarterly)
0 0 1 */3 * cd /path/to/reentry-map && npm run import:update-all
```

### Cost Tracking

**Monitor costs:**

```sql
-- AI verification costs by source
SELECT
  source,
  COUNT(*) as records_verified,
  SUM(estimated_cost_usd) as total_cost,
  AVG(estimated_cost_usd) as avg_cost_per_record
FROM ai_usage_tracking
WHERE operation_type = 'verification'
GROUP BY source;

-- Geocoding costs (estimate)
SELECT COUNT(*) * 0.005 as estimated_geocoding_cost
FROM data_import_records
WHERE normalized_data->>'latitude' IS NOT NULL;
```

### Data Quality Monitoring

**Track quality metrics:**

```sql
-- Auto-approval rates by source
SELECT
  source,
  COUNT(*) as total_submitted,
  COUNT(*) FILTER (WHERE status = 'approved') as auto_approved,
  ROUND(COUNT(*) FILTER (WHERE status = 'approved')::numeric / COUNT(*)::numeric * 100, 1) as approval_rate
FROM resource_suggestions
GROUP BY source;

-- Common verification issues
SELECT
  decision_reason,
  COUNT(*) as occurrences
FROM verification_logs
WHERE decision = 'flag_for_review'
GROUP BY decision_reason
ORDER BY occurrences DESC
LIMIT 10;
```

---

## Appendix: Troubleshooting

### Common Issues

**Issue:** Geocoding failing for some addresses
- **Cause:** Invalid/incomplete addresses
- **Solution:** Manually review failed geocodes, add city/state if missing

**Issue:** Auto-approval rate lower than expected
- **Cause:** Missing required fields (phone, website)
- **Solution:** AI enrichment for missing fields, or lower verification threshold

**Issue:** Duplicate resources created
- **Cause:** Deduplication not detecting similar addresses
- **Solution:** Tune fuzzy matching threshold, manual cleanup of duplicates

**Issue:** Import script running out of memory
- **Cause:** Processing too many records at once
- **Solution:** Reduce batch size, process in smaller chunks

**Issue:** API rate limiting
- **Cause:** Too many requests to Google Maps or source APIs
- **Solution:** Increase delay between requests, implement exponential backoff

---

## Summary

**Total Timeline:** 3 weeks (70-88 hours)

**Total Cost:** ~$130

**Total Resources:** 2,700-3,700 California resources

**Expected Outcome:**
- ✅ Comprehensive coverage of employment, treatment, and housing resources
- ✅ Infrastructure proven for nationwide scale
- ✅ 80-95% auto-approval rates across sources
- ✅ <500 total records requiring manual review
- ✅ Map populated with high-quality, verified resources

**Next Steps:**
1. Review and approve this plan
2. Start infrastructure preparation (Days 1-2)
3. Execute Phase 1: CareerOneStop (Days 3-5)
4. Continue to Phase 2 and 3 based on results

---

**Status:** Ready to execute. Awaiting approval to proceed.
