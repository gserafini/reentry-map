# Resource Submission Schema

## Architecture (CRITICAL)

```
┌─────────────────────────────────────────────────────────────────┐
│                    resources TABLE (database)                    │
│                    ▲                                             │
│                    │ PARENT / CANONICAL                          │
│                    │ Single source of truth                      │
└────────────────────┼─────────────────────────────────────────────┘
                     │
                     │ derives from (TypeScript)
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│              ResourceSubmission (TypeScript type)                │
│                                                                  │
│  = Partial<Omit<ResourceInsert, 'auto_generated_fields'>>        │
│                    + submission-specific fields                  │
└──────────────────────────────────────────────────────────────────┘
```

**Key Principle:** The database schema drives the TypeScript types, NOT the other way around.

## When You Add a Field to Resources Table

**Before (WRONG - manual sync required):**

1. Add field to database
2. Manually update ResourceSubmission type ❌ (easy to forget!)
3. Update API endpoint
4. Update documentation

**After (CORRECT - automatic sync):**

1. Add field to database migration
2. ~~Regenerate types~~: Types are generated from database schema automatically
3. ResourceSubmission **automatically includes the new field** ✅
4. Update API endpoint (TypeScript will show you what changed)
5. Update documentation

## Type Definition

```typescript
import type { ResourceInsert } from './database'

/**
 * ResourceSubmission is DERIVED from Resource database schema
 *
 * = All fields from ResourceInsert
 * - Auto-generated fields (id, timestamps, stats)
 * - System-managed fields (verification scores, slugs)
 * + Submission-specific fields (source, discovery metadata)
 *
 * Most fields are optional (agents may not have all data)
 * Required: name, address, city, state
 */
export type ResourceSubmission = Partial<
  Omit<
    ResourceInsert,
    | 'id'
    | 'created_at'
    | 'updated_at'
    | 'slug'
    | 'rating_average'
    | 'rating_count'
    | 'review_count'
    | 'view_count'
    | 'verified'
    | 'verified_by'
    | 'verified_date'
    | 'phone_verified'
    | 'phone_last_verified'
    | 'ai_discovered'
    | 'ai_enriched'
    | 'ai_last_verified'
    | 'ai_verification_score'
    | 'data_completeness_score'
    | 'status'
    | 'status_reason'
    | 'change_log'
  >
> & {
  // Enforce required fields
  name: string
  address: string
  city: string
  state: string

  // Submission-specific fields (not in resources table)
  source?: string
  source_url?: string
  discovered_via?: string
  discovery_notes?: string
  reason?: string
  personal_experience?: string
  submitter?: string
  notes?: string
}
```

## Field Categories

### Core Fields (→ resources table upon approval)

All these fields from submissions are copied to the `resources` table when approved:

- **Basic**: name, description, services_offered
- **Contact**: phone, email, website
- **Location**: address, city, state, zip, county, latitude, longitude
- **Schedule**: hours, timezone
- **Categories**: primary_category, categories, tags
- **Eligibility**: eligibility_requirements, accepts_records, appointment_required
- **Media**: photos, logo_url
- **Organization**: org_name, location_name, is_parent, parent_resource_id

### Submission Metadata (→ resource_suggestions table only)

These fields stay in `resource_suggestions` for provenance tracking:

- **source**: 'google_search', '211', 'manual', 'import'
- **source_url**: Where information was found
- **discovered_via**: 'websearch', 'webfetch', 'manual'
- **discovery_notes**: Search query, notes
- **reason**: Why submitted
- **personal_experience**: User's experience

### Auto-Generated (not submitted)

These are created automatically by the system:

- **IDs**: id, slug
- **Timestamps**: created_at, updated_at
- **Stats**: rating_average, rating_count, review_count, view_count
- **Verification**: verified, verified_by, verified_date, status
- **AI Metadata**: ai_discovered, ai_enriched, ai_verification_score, etc.

## Validation

### Required Fields (Strictly Enforced)

```typescript
{
  name: string,      // Organization name
  address: string,   // Street address
  city: string,      // City name
  state: string      // 2-letter state code (e.g., 'CA')
}
```

### Recommended Fields (Warnings if Missing)

- **Contact**: At least ONE of: phone, email, or website
- **Description**: What the organization does
- **Category**: primary_category for proper filtering

### Validation Function

```typescript
import { validateMinimalResource } from '@/lib/types/resource-submission'

const result = validateMinimalResource(submission)

if (!result.valid) {
  // Has errors (missing required fields)
  console.error(result.errors)
  console.log('Missing:', result.missing_required)
}

if (result.warnings.length > 0) {
  // Has warnings (missing recommended fields)
  console.warn(result.warnings)
  console.log('Recommended:', result.missing_recommended)
}
```

## Examples

### Minimal Valid Submission

```typescript
const minimal: ResourceSubmission = {
  name: 'Oakland Job Center',
  address: '1212 Broadway',
  city: 'Oakland',
  state: 'CA',
}
```

**Result:** Accepted but may be flagged for human review due to missing contact info.

### Complete Submission (Best Practice)

See `EXAMPLE_COMPLETE_SUBMISSION` in [resource-submission.ts](../lib/types/resource-submission.ts).

Includes all commonly-used fields:

- Full contact information
- Detailed description
- Categories and tags
- Services offered
- Hours of operation
- Eligibility requirements
- Provenance data

**Result:** Highest chance of auto-approval (87% rate).

## API Usage

### POST /api/resources/suggest-batch

```typescript
import type { BatchResourceSubmissionRequest } from '@/lib/types/resource-submission'

const request: BatchResourceSubmissionRequest = {
  resources: [
    {
      name: 'Oakland Job Center',
      address: '1212 Broadway',
      city: 'Oakland',
      state: 'CA',
      phone: '(510) 555-0100',
      website: 'https://oaklandjobs.org',
      description: 'Job training services...',
      primary_category: 'employment',
      services_offered: ['job training', 'resume help'],
      source: 'google_search',
      source_url: 'https://oaklandjobs.org',
    },
  ],
  submitter: 'ai_agent',
  notes: 'Found via Oakland expansion research',
}

const response = await fetch('/api/resources/suggest-batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-api-key': API_KEY, // For agents
  },
  body: JSON.stringify(request),
})
```

### Response Format

```typescript
{
  success: true,
  message: "Processed 5 resources: 4 auto-approved, 1 flagged for review",
  stats: {
    total_received: 5,
    submitted: 5,
    auto_approved: 4,
    flagged_for_human: 1,
    auto_rejected: 0,
    skipped_duplicates: 0,
    errors: 0
  },
  verification_results: [
    {
      name: "Oakland Job Center",
      status: "auto_approved",
      resource_id: "uuid-123",
      suggestion_id: "uuid-456",
      verification_score: 0.92,
      decision_reason: "High-quality submission with complete data"
    }
  ]
}
```

## Maintaining Consistency

### 1. Database is Source of Truth

The `resources` table schema in PostgreSQL is the canonical definition.

```sql
-- Example: Adding a new field
ALTER TABLE resources
  ADD COLUMN required_documents TEXT[];
```

### 2. Update resource_suggestions Schema

Make sure resource_suggestions has matching fields for submissions:

```sql
-- Migration: 20250112000000_expand_resource_suggestions_schema.sql
ALTER TABLE resource_suggestions
  ADD COLUMN IF NOT EXISTS required_documents TEXT[];
```

### 3. TypeScript Types Auto-Update

`ResourceSubmission` automatically includes the new field because it's derived from `ResourceInsert`.

**No manual TypeScript changes needed!** ✅

### 4. Update API Endpoint

The suggest-batch endpoint will now accept the new field:

```typescript
// app/api/resources/suggest-batch/route.ts
const { data: suggestion } = await supabase.from('resource_suggestions').insert({
  // ... existing fields ...
  required_documents: r.required_documents || null, // New field
})
```

### 5. Update Documentation

Update examples in this file and agent prompts to include the new field.

### 6. Update Agent Prompts

Update Command Center prompt to show the new field in the example:

```typescript
// app/admin/command-center/page.tsx
EXPECTED FORMAT:
{
  "resources": [{
    // ... existing fields ...
    "required_documents": ["ID", "proof of address"], // New field
  }]
}
```

## Field Mapping Reference

See `FIELD_MAPPING` in [resource-submission.ts](../lib/types/resource-submission.ts#L313) for complete mapping of which fields go where:

```typescript
import { FIELD_MAPPING, isSubmittableField } from '@/lib/types/resource-submission'

// Check if a field can be submitted
isSubmittableField('name') // true
isSubmittableField('id') // false (auto-generated)

// Get all submittable fields
const submittable = getSubmittableFields()
// ['name', 'address', 'city', ...]
```

## Benefits of This Architecture

### ✅ Automatic Sync

When you add a field to the database, TypeScript types update automatically.

### ✅ Type Safety

TypeScript enforces that submissions only include valid fields.

### ✅ Single Source of Truth

Database schema is the canonical definition - no more manual sync.

### ✅ Clear Separation

System-managed fields (IDs, timestamps, stats) are clearly excluded from submissions.

### ✅ Documentation

Field mapping is self-documenting via TypeScript types.

## Testing

```typescript
import {
  validateMinimalResource,
  EXAMPLE_MINIMAL_SUBMISSION,
  EXAMPLE_COMPLETE_SUBMISSION,
} from '@/lib/types/resource-submission'

describe('Resource Submission', () => {
  it('validates minimal submission', () => {
    const result = validateMinimalResource(EXAMPLE_MINIMAL_SUBMISSION)
    expect(result.valid).toBe(true)
  })

  it('validates complete submission', () => {
    const result = validateMinimalResource(EXAMPLE_COMPLETE_SUBMISSION)
    expect(result.valid).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })
})
```

## Migration Checklist

When adding a new field to resources:

- [ ] Update resources table migration
- [ ] Update resource_suggestions table migration (if submittable)
- [ ] ~~Update ResourceSubmission type~~ (automatic!)
- [ ] Update suggest-batch API endpoint to handle new field
- [ ] Update Command Center agent prompt example
- [ ] Update Research API if field affects instructions
- [ ] Update this documentation with field description
- [ ] Add field to EXAMPLE_COMPLETE_SUBMISSION
- [ ] Write tests for new field validation

## Support

- [Technical Architecture](../TECHNICAL_ARCHITECTURE.md) - Database schema details
- [API Documentation](../API_DOCUMENTATION.md) - Full API specs
- [Types](../lib/types/resource-submission.ts) - TypeScript definitions
- [Migrations](../supabase/migrations/) - Database schema history
