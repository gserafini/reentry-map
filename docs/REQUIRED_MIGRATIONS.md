# Required Database Migrations

This document lists all database migrations that must be run for the application to function correctly.

## Migration Order

Run these migrations in the Supabase SQL Editor in **exact order**:

### 1. Initial Schema (REQUIRED)

**File:** `supabase/migrations/20250101000000_initial_schema.sql`

Creates core tables:

- `users` (extends auth.users)
- `resources`
- `resource_suggestions`
- `resource_updates`
- `resource_ratings`
- `resource_reviews`
- `user_favorites`
- `ai_agent_logs`

### 2. RLS Policies (REQUIRED)

**File:** `supabase/migrations/20250101000001_rls_policies.sql`

Enables Row Level Security and creates policies for all tables.

### 3. Functions & Triggers (REQUIRED)

**File:** `supabase/migrations/20250101000002_functions_triggers.sql`

Creates:

- Auto-create user profile trigger
- Rating aggregation triggers
- Review count triggers

### 4. Public Suggestions (REQUIRED)

**File:** `supabase/migrations/20250108000000_allow_public_suggestions.sql`

Allows anonymous users to submit resource suggestions.

### 5. Verification System (CRITICAL - Required for Research/Verification Agents)

**File:** `supabase/migrations/20250109000000_verification_system.sql`

**CRITICAL:** This migration expands `resource_suggestions` table with fields needed by the research and verification agents:

Adds to `resource_suggestions`:

- `city` TEXT
- `state` TEXT
- `zip` TEXT
- `latitude` DECIMAL(10, 8)
- `longitude` DECIMAL(11, 8)
- `email` TEXT
- `hours` JSONB
- `services_offered` TEXT[]
- `eligibility_requirements` TEXT
- `required_documents` TEXT[]
- `fees` TEXT
- `languages` TEXT[]
- `accessibility_features` TEXT[]
- `primary_category` TEXT
- `categories` TEXT[]
- `tags` TEXT[]
- `admin_notes` TEXT

Also creates `verification_logs` table.

**Without this migration:**

- Research agent submit-candidate API will fail
- Verification agent will fail with "column does not exist" errors
- Admin flagged resources page will not work

### 6. AI Usage Tracking (Optional)

**File:** `supabase/migrations/20250109000001_ai_usage_tracking.sql`

Creates `ai_usage_logs` table for tracking AI API costs.

### 7. Non-Addressed Resources Support (Optional)

**File:** `supabase/migrations/20250109000002_support_non_addressed_resources.sql`

Adds support for resources without physical addresses (online services, mobile services).

Adds to `resources` and `resource_suggestions`:

- `address_type` (physical, confidential, regional, online, mobile)
- `service_area` JSONB
- Rejection tracking fields

### 8. Research Pipeline (Required for Research Agents)

**File:** `supabase/migrations/20250109000004_research_pipeline.sql`

Creates `research_tasks` table for autonomous research agent workflow.

Adds to `resource_suggestions`:

- `task_id` UUID (links to research task)
- `discovered_via` TEXT
- `discovery_notes` TEXT

### 9. Expansion Priorities System (Required for Expansion Features)

**Files:**

- `supabase/migrations/20250110000000_expansion_priorities.sql`
- `supabase/migrations/20250110000001_expansion_milestones.sql`
- `supabase/migrations/20250110000002_expansion_priority_view.sql`
- `supabase/migrations/20250110000003_expansion_seeding.sql`

Creates expansion priorities system for geographic expansion tracking.

### 10. Rename Population Field (Required if using Expansion)

**File:** `supabase/migrations/20250110000004_rename_metro_population_to_population.sql`

Renames `expansion_priorities.metro_population` → `population` for API consistency.

## Verification Checklist

After running migrations, verify:

```sql
-- Check resource_suggestions has new fields
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'resource_suggestions'
AND column_name IN ('city', 'state', 'email', 'hours', 'services_offered');

-- Should return 5 rows

-- Check verification_logs table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'verification_logs'
);

-- Should return true

-- Check expansion system exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'expansion_priorities'
);

-- Should return true (if using expansion features)
```

## Running Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard
2. Select your project
3. Go to SQL Editor
4. Create a new query
5. Copy/paste migration file contents
6. Run query
7. Verify success (no errors)

### Option 2: Supabase CLI

```bash
# NOT RECOMMENDED - migrations are not in standard format yet
# Use dashboard for now
```

### Option 3: MCP Supabase Tool (If Available)

```typescript
// Use the apply_migration MCP tool
// This is used by Claude Code
```

## Common Issues

### "column does not exist" errors in research/verification APIs

**Cause:** Migration `20250109000000_verification_system.sql` not run

**Fix:** Run the verification system migration

### "relation does not exist: expansion_priorities"

**Cause:** Expansion migrations not run

**Fix:** Run migrations `20250110000000` through `20250110000004`

### TypeScript errors about missing fields

**Cause:** Database types not regenerated after migrations

**Fix:**

1. Run all migrations first
2. Regenerate TypeScript types (if using Supabase CLI)
3. Or add type assertions in code (current approach)

## Type Generation (Optional)

If using Supabase CLI, regenerate types after running migrations:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/types/supabase.ts
```

Then import in `lib/types/database.ts`:

```typescript
import type { Database } from './supabase'

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type ResourceSuggestion = Tables<'resource_suggestions'>
// ... etc
```
