# Resource Deduplication & Parent-Child System

**Status**: Legacy reference. Coverage-aware non-physical deduplication is now tracked in [COVERAGE_AWARE_DEDUPLICATION_PLAN.md](./COVERAGE_AWARE_DEDUPLICATION_PLAN.md).

> Important: synthetic parent-row auto-creation is no longer the intended direction for service-area resources. Same-name non-physical siblings should remain standalone live resources when their coverage differs.

---

## Overview

A comprehensive system to handle:

1. **Multi-location organizations** (parent-child relationships)
2. **Duplicate detection** (address-based + fuzzy matching)
3. **Provenance tracking** (audit log for all changes)
4. **Auto-merge suggestions** for data cleanup

---

## 🎯 Problem Statement

**Real Example**: Bay Area Community Services (BACS)

- Has **multiple locations** across Oakland offering different services
- Data imports create **apparent duplicates**:
  - "Bay Area Community Services" - 2111 International Blvd (housing)
  - "Bay Area Community Services (BACS)" - 1340 Arnold Dr (mental-health)

**User Impact**: Confusing! Is this one org or two?

**Org Impact**: Their services scattered across map, hard to find all locations

---

## ✅ What We Built

### 1. Database Schema (`20250108000000_parent_child_resources.sql`)

**New Fields**:

- `parent_resource_id` → UUID reference to parent org
- `org_name` → Normalized org name ("Bay Area Community Services")
- `location_name` → Specific location ("Oakland Housing Office")
- `is_parent` → Boolean flag (auto-managed by triggers)
- `change_log` → JSONB audit log (admin-only)

**Example Relationship**:

```
BACS (parent, is_parent=true, org_name="Bay Area Community Services")
  ├─ BACS Oakland Housing (child, parent_resource_id→BACS, location_name="Housing Program")
  └─ BACS Oakland Mental Health (child, parent_resource_id→BACS, location_name="Mental Health Services")
```

**Auto-Features**:

- ✅ `org_name` auto-extracted from `name` (removes location suffixes)
- ✅ `is_parent` auto-updated when children added/removed
- ✅ Constraints prevent nested hierarchies (parent can't have parent)
- ✅ Children must have address (prevent abstract parents)

### 2. Provenance / Audit Logging

**Every change automatically logged**:

```json
{
  "timestamp": "2025-01-08T10:30:00Z",
  "action": "created",
  "source": "admin_import",
  "user_id": "uuid-here",
  "user_email": "admin@example.com",
  "initial_data": {
    "name": "Resource Name",
    "address": "123 Main St",
    "city": "Oakland",
    "state": "CA"
  }
}
```

**Update tracking**:

```json
{
  "timestamp": "2025-01-08T11:15:00Z",
  "action": "updated",
  "user_id": "uuid-here",
  "user_email": "admin@example.com",
  "changed_fields": ["phone", "website"],
  "previous_values": {
    "phone": "(510) 555-1234"
  }
}
```

**Visibility**: Admin-only (excluded from public SELECT queries)

### 3. Deduplication System (`lib/utils/deduplication.ts`)

**Three-tier detection**:

#### Tier 1: Exact Address Match

```typescript
// Same street + city + state = DUPLICATE
checkForDuplicate({
  name: 'BACS - Oakland Office',
  address: '2111 International Blvd',
  city: 'Oakland',
  state: 'CA',
})
// → Returns existing resource if found
```

#### Tier 2: Fuzzy Matching

```typescript
// Uses PostgreSQL pg_trgm for similarity
// Catches typos, formatting differences
"Bay Area Community Services"
  ≈ "Bay Area Community Srvcs" (similarity: 0.85)
  ≈ "BACS" (similarity: 0.45)
```

#### Tier 3: Suggested Actions

- **`skip`**: Exact duplicate (same name + address)
- **`update`**: Very similar (update existing with new data)
- **`create_child`**: Same org, different location
- **`merge`**: Needs human review

**Batch Processing**:

```typescript
await batchCheckForDuplicates(resources)
// → Returns Map<index, DeduplicationResult>
// Processes in parallel for performance
```

### 4. Auto-Detect Parent-Child Relationships

```typescript
detectParentChildRelationships(resources)
// → Groups resources by org name
// → Returns multi-location orgs

// Example output:
{
  "Bay Area Community Services": [
    { name: "BACS - Oakland Housing", address: "2111 International" },
    { name: "BACS - Mental Health", address: "1340 Arnold Dr" }
  ]
}
```

### 5. Database Indexes

**Performance optimizations**:

- GIN indexes for fuzzy text matching (pg_trgm)
- B-tree indexes for parent-child queries
- Composite index for address lookups

---

## 🚧 Next Steps

### Phase A: Import Integration

**Update import routes** to use deduplication:

```typescript
// app/api/admin/resources/import/route.ts
import { checkForDuplicate } from '@/lib/utils/deduplication'

for (const resource of resources) {
  const check = await checkForDuplicate(resource)

  if (check.isDuplicate && check.suggestedAction === 'skip') {
    console.log(`Skipping duplicate: ${resource.name}`)
    continue
  }

  if (check.suggestedAction === 'update') {
    // Update existing resource
    await supabase.from('resources').update(resource).eq('id', check.existingResource.id)
  } else {
    // Insert new resource
    await supabase.from('resources').insert(resource)
  }
}
```

### Phase B: Admin UI

**1. Duplicate Detection Tool** (`/admin/duplicates`)

- Show all potential duplicates with similarity scores
- Side-by-side comparison view
- One-click merge/link/ignore actions

**2. Parent-Child Manager** (`/admin/resources/[id]/relationships`)

- Add Edit Resource button showing child locations
- Link existing resources as children
- Promote child to standalone
- Bulk operations for multi-location orgs

**3. Provenance Viewer** (`/admin/resources/[id]/history`)

- Timeline of all changes
- Who made changes (user email + timestamp)
- What changed (diff view)
- Source tracking (import vs manual vs AI)

### Phase C: AI Enhancement

**Web search verification**:

```typescript
// For each resource, search for official website
// Verify phone number, address, hours
// Auto-update with latest info
// Flag discrepancies for admin review
```

---

## 📊 Testing the System

### Test Case 1: Import Same JSON Twice

```bash
# First import: 42 resources created
npm run import-oakland

# Second import: 0 resources created (all skipped as duplicates)
npm run import-oakland
```

### Test Case 2: Similar Names, Same Address

```json
[
  { "name": "BACS - Oakland Housing", "address": "2111 International Blvd" },
  { "name": "Bay Area Community Services", "address": "2111 International Blvd" }
]
```

**Expected**: Second resource flagged as duplicate, suggested action: `update`

### Test Case 3: Same Org, Different Locations

```json
[
  { "name": "BACS - Oakland Office", "address": "2111 International Blvd" },
  { "name": "BACS - Mental Health", "address": "1340 Arnold Dr" }
]
```

**Expected**: Auto-create parent-child relationship

---

## 🔒 Security & Privacy

**Change Log**:

- ✅ Admin-only visibility (enforced at application level)
- ✅ Tracks user actions for accountability
- ✅ Immutable (append-only, no deletions)
- ✅ JSONB format for flexible querying

**RLS Policies**:

- Public: SELECT (exclude change_log)
- Admin: SELECT \* (includes change_log)

---

## 📝 Migration Instructions

**1. Apply migration**:

```bash
# Option A: Via Supabase Dashboard
# SQL Editor → Run migration file

# Option B: Via Supabase CLI (if using)
supabase db push
```

**2. Verify migration**:

```sql
-- Check new columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'resources'
AND column_name IN ('parent_resource_id', 'org_name', 'location_name', 'is_parent', 'change_log');

-- Check indexes created
SELECT indexname FROM pg_indexes
WHERE tablename = 'resources'
AND indexname LIKE 'idx_resources_%';

-- Check functions created
SELECT proname FROM pg_proc
WHERE proname IN ('log_resource_changes', 'find_similar_resources', 'find_potential_duplicates');
```

**3. Update TypeScript types** (already done):

```typescript
// lib/types/database.ts includes new fields
```

---

## 🎯 Success Metrics

After full implementation:

- ✅ Import same JSON 100x → Only 42 resources (no duplicates)
- ✅ Multi-location orgs properly grouped
- ✅ Clear provenance for all data
- ✅ Admin tools for managing relationships
- ✅ Orgs happy with how they're presented
- ✅ Users find all locations easily

---

## 📚 Related Files

**Migration**:

- `supabase/migrations/20250108000000_parent_child_resources.sql`

**Utils**:

- `lib/utils/deduplication.ts`

**Types**:

- `lib/types/database.ts` (updated with new fields)

**To Update**:

- `app/api/admin/resources/import/route.ts` (add dedup logic)
- `app/admin/resources/[id]/page.tsx` (show children)
- `app/admin/duplicates/page.tsx` (new page)
- `components/resources/ResourceDetail.tsx` (show related locations)
