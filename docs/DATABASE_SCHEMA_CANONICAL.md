# Reentry Map - Canonical Database Schema

**Last Updated**: 2026-02-20
**Source of Truth**: This document reflects the ACTUAL current database schema as of the last update date.

> ⚠️ **IMPORTANT**: When making database schema changes:
>
> 1. Update the migration files in `lib/db/migrations/`
> 2. Apply the migration to the production database on dc3-1
> 3. Update THIS document to reflect the changes
> 4. Update any relevant TypeScript types in `/lib/types/`
> 5. Update the Drizzle schema in `lib/db/schema.ts`

---

## resources Table (76 columns)

Primary table for all reentry resources and services.

### Basic Information

| Column             | Type   | Nullable | Default             | Description                |
| ------------------ | ------ | -------- | ------------------- | -------------------------- |
| `id`               | uuid   | NO       | `gen_random_uuid()` | Primary key                |
| `name`             | text   | NO       | -                   | Resource name (required)   |
| `description`      | text   | YES      | -                   | Detailed description       |
| `services_offered` | text[] | YES      | -                   | Array of services provided |

### Contact Information

| Column                | Type        | Nullable | Default | Description                  |
| --------------------- | ----------- | -------- | ------- | ---------------------------- |
| `phone`               | text        | YES      | -       | Contact phone number         |
| `phone_verified`      | boolean     | YES      | `false` | Whether phone was verified   |
| `phone_last_verified` | timestamptz | YES      | -       | Last phone verification date |
| `email`               | text        | YES      | -       | Contact email                |
| `website`             | text        | YES      | -       | Website URL                  |

### Location

| Column              | Type   | Nullable | Default      | Description                                           |
| ------------------- | ------ | -------- | ------------ | ----------------------------------------------------- |
| `address`           | text   | NO       | -            | Street address (required)                             |
| `city`              | text   | YES      | -            | City name                                             |
| `state`             | text   | YES      | -            | State abbreviation (e.g., "CA")                       |
| `zip`               | text   | YES      | -            | ZIP code                                              |
| `latitude`          | float8 | YES      | -            | Latitude coordinate                                   |
| `longitude`         | float8 | YES      | -            | Longitude coordinate                                  |
| `county`            | text   | YES      | -            | County name                                           |
| `county_fips`       | text   | YES      | -            | FIPS county code                                      |
| `neighborhood`      | text   | YES      | -            | Neighborhood name                                     |
| `formatted_address` | text   | YES      | -            | Google Maps formatted address                         |
| `google_place_id`   | text   | YES      | -            | Google Maps Place ID                                  |
| `location_type`     | text   | YES      | -            | Type of location (e.g., "ROOFTOP")                    |
| `address_type`      | text   | YES      | `'physical'` | 'physical', 'mailing', 'virtual', 'service_area'      |
| `service_area`      | jsonb  | YES      | -            | Service area boundaries (for non-addressed resources) |

### Schedule & Hours

| Column     | Type  | Nullable | Default                 | Description                                                        |
| ---------- | ----- | -------- | ----------------------- | ------------------------------------------------------------------ |
| `hours`    | jsonb | YES      | -                       | Operating hours: `{"monday": {"open": "09:00", "close": "17:00"}}` |
| `timezone` | text  | YES      | `'America/Los_Angeles'` | IANA timezone identifier                                           |

### Categorization

| Column             | Type   | Nullable | Default | Description                                     |
| ------------------ | ------ | -------- | ------- | ----------------------------------------------- |
| `primary_category` | text   | NO       | -       | Main category (employment, housing, food, etc.) |
| `categories`       | text[] | YES      | -       | All applicable categories                       |
| `tags`             | text[] | YES      | -       | Searchable tags                                 |

### Eligibility & Requirements

| Column                     | Type    | Nullable | Default | Description                                         |
| -------------------------- | ------- | -------- | ------- | --------------------------------------------------- |
| `eligibility_requirements` | text    | YES      | -       | Who can access this resource                        |
| `accepts_records`          | boolean | YES      | `true`  | Whether they accept people with criminal records    |
| `appointment_required`     | boolean | YES      | `false` | Whether appointment is required                     |
| `required_documents`       | text[]  | YES      | -       | Documents needed (e.g., ["ID", "Proof of address"]) |
| `fees`                     | text    | YES      | -       | Cost information or "Free"                          |

### Accessibility & Languages

| Column                   | Type   | Nullable | Default | Description                                                                 |
| ------------------------ | ------ | -------- | ------- | --------------------------------------------------------------------------- |
| `languages`              | text[] | YES      | -       | Languages spoken by staff (e.g., ["English", "Spanish"])                    |
| `accessibility_features` | text[] | YES      | -       | Accessibility features (e.g., ["Wheelchair accessible", "ASL interpreter"]) |

### Media

| Column                   | Type        | Nullable | Default | Description                                                  |
| ------------------------ | ----------- | -------- | ------- | ------------------------------------------------------------ |
| `photos`                 | jsonb[]     | YES      | -       | Array of photo objects: `[{"url": "...", "caption": "..."}]` |
| `logo_url`               | text        | YES      | -       | Organization logo URL                                        |
| `screenshot_url`         | text        | YES      | -       | Website screenshot URL                                       |
| `screenshot_captured_at` | timestamptz | YES      | -       | When screenshot was captured                                 |

### AI Metadata

| Column                    | Type        | Nullable | Default | Description                          |
| ------------------------- | ----------- | -------- | ------- | ------------------------------------ |
| `ai_discovered`           | boolean     | YES      | `false` | Whether discovered by AI agent       |
| `ai_enriched`             | boolean     | YES      | `false` | Whether enriched by AI agent         |
| `ai_last_verified`        | timestamptz | YES      | -       | Last AI verification timestamp       |
| `ai_verification_score`   | float8      | YES      | -       | AI confidence score (0-1)            |
| `data_completeness_score` | float8      | YES      | -       | Percentage of fields populated (0-1) |

### Verification (Autonomous AI System)

| Column                    | Type        | Nullable | Default     | Description                                           |
| ------------------------- | ----------- | -------- | ----------- | ----------------------------------------------------- |
| `verification_status`     | text        | YES      | `'pending'` | 'pending', 'verified', 'flagged', 'rejected'          |
| `verification_confidence` | numeric     | YES      | -           | Confidence score (0-1) from last verification         |
| `verification_history`    | jsonb       | YES      | `'[]'`      | Array of verification events with timestamps          |
| `last_verified_at`        | timestamptz | YES      | -           | Most recent verification timestamp                    |
| `next_verification_at`    | timestamptz | YES      | -           | When resource should be re-verified (auto-calculated) |
| `verification_source`     | text        | YES      | -           | Source of verification (e.g., "ai_agent", "human")    |
| `human_review_required`   | boolean     | YES      | `false`     | Whether resource needs human review                   |
| `provenance`              | jsonb       | YES      | -           | Complete provenance data: who discovered, how, when   |

### Manual Verification (Legacy)

| Column          | Type        | Nullable | Default | Description                          |
| --------------- | ----------- | -------- | ------- | ------------------------------------ |
| `verified`      | boolean     | YES      | `false` | Legacy manual verification flag      |
| `verified_by`   | uuid        | YES      | -       | User ID who verified (FK → users.id) |
| `verified_date` | timestamptz | YES      | -       | Legacy verification date             |

### Community Stats (Auto-Updated by Triggers)

| Column           | Type   | Nullable | Default | Description                                  |
| ---------------- | ------ | -------- | ------- | -------------------------------------------- |
| `rating_average` | float8 | YES      | `0`     | Average rating (1-5 stars) - auto-calculated |
| `rating_count`   | int4   | YES      | `0`     | Total number of ratings - auto-calculated    |
| `review_count`   | int4   | YES      | `0`     | Total approved reviews - auto-calculated     |
| `view_count`     | int4   | YES      | `0`     | Page view count                              |

### Status & Moderation

| Column             | Type | Nullable | Default    | Description                               |
| ------------------ | ---- | -------- | ---------- | ----------------------------------------- |
| `status`           | text | YES      | `'active'` | 'active', 'inactive', 'pending', 'closed' |
| `status_reason`    | text | YES      | -          | Reason for status change                  |
| `closure_status`   | text | YES      | -          | Details if resource is closed             |
| `correction_notes` | text | YES      | -          | Admin notes about corrections             |

### Parent-Child Relationships

| Column               | Type    | Nullable | Default | Description                                  |
| -------------------- | ------- | -------- | ------- | -------------------------------------------- |
| `parent_resource_id` | uuid    | YES      | -       | Parent resource ID (FK → resources.id)       |
| `org_name`           | text    | YES      | -       | Organization name (for parent orgs)          |
| `location_name`      | text    | YES      | -       | Specific location name (for child locations) |
| `is_parent`          | boolean | YES      | `false` | Whether this is a parent organization        |
| `change_log`         | jsonb   | YES      | `'[]'`  | Audit trail of changes                       |

### Data Provenance & External IDs

| Column             | Type    | Nullable | Default | Description                                             |
| ------------------ | ------- | -------- | ------- | ------------------------------------------------------- |
| `source`           | text    | YES      | -       | Data source (e.g., "211", "govt_db", "user_submission") |
| `is_unique`        | boolean | YES      | `false` | Whether resource is unique to our platform              |
| `also_in_211`      | boolean | YES      | `false` | Whether also exists in 211 database                     |
| `also_in_govt_db`  | boolean | YES      | `false` | Whether also exists in government database              |
| `external_211_id`  | text    | YES      | -       | 211 database external ID                                |
| `external_govt_id` | text    | YES      | -       | Government database external ID                         |

### Timestamps

| Column       | Type        | Nullable | Default | Description                                     |
| ------------ | ----------- | -------- | ------- | ----------------------------------------------- |
| `created_at` | timestamptz | YES      | `now()` | Record creation timestamp                       |
| `updated_at` | timestamptz | YES      | `now()` | Last update timestamp (auto-updated by trigger) |

### SEO

| Column | Type | Nullable | Default | Description               |
| ------ | ---- | -------- | ------- | ------------------------- |
| `slug` | text | YES      | -       | URL-friendly slug for SEO |

---

## Database Indexes

### Spatial Index (PostGIS)

- `idx_resources_location` - GIST index on lat/lng for efficient distance queries

### Full-Text Search

- `idx_resources_search` - GIN index on name + description

### Filtering Indexes

- `idx_resources_primary_category` - B-tree on primary_category
- `idx_resources_categories` - GIN on categories array
- `idx_resources_tags` - GIN on tags array
- `idx_resources_status` - B-tree on status (WHERE status = 'active')

### Verification Indexes

- `idx_resources_verification_status` - B-tree on verification_status
- `idx_resources_next_verification` - B-tree on next_verification_at (WHERE verification_status = 'verified')
- `idx_resources_human_review` - B-tree on human_review_required (WHERE human_review_required = true)

### Sorting Indexes

- `idx_resources_rating` - B-tree on rating_average DESC (WHERE status = 'active')

---

## Database Triggers

Triggers that auto-update fields on the `resources` table:

### 1. update_resources_updated_at

- **Event**: BEFORE UPDATE
- **Action**: Sets `updated_at = NOW()`

### 2. update_resource_rating

- **Event**: AFTER INSERT|UPDATE|DELETE on `resource_ratings`
- **Action**: Recalculates `rating_average` and `rating_count`

### 3. update_resource_review_count

- **Event**: AFTER INSERT|UPDATE|DELETE on `resource_reviews`
- **Action**: Recalculates `review_count` (approved reviews only)

### 4. update_next_verification

- **Event**: BEFORE UPDATE on `resources` (when verification_status changes to 'verified')
- **Action**: Sets `next_verification_at` based on field-level cadence (30-365 days)

### 5. update_county_coverage_metrics

- **Event**: AFTER INSERT|UPDATE|DELETE on `resources`
- **Action**: Updates `county_coverage` table stats

---

## Field-Level Verification Cadence

Different fields have different re-verification schedules:

| Field     | Cadence  | Reason                              |
| --------- | -------- | ----------------------------------- |
| `phone`   | 30 days  | Most volatile, frequently changes   |
| `website` | 60 days  | Moderately volatile, domains expire |
| `hours`   | 60 days  | Changes seasonally or with staffing |
| `email`   | 90 days  | Relatively stable                   |
| `address` | 180 days | Rarely changes                      |
| `name`    | 365 days | Very stable                         |

---

## Related Tables

### resource_suggestions

User-submitted suggestions that feed into the `resources` table after verification.

**Key columns**:

- All fields from `resources` table (subset)
- `suggested_by` (uuid) - User who suggested
- `status` ('pending', 'approved', 'rejected')
- `created_resource_id` (uuid) - Link to created resource

### verification_logs

Tracks all AI verification attempts with detailed results.

**Key columns**:

- `resource_id`, `suggestion_id`
- `verification_type` ('initial', 'periodic', 'triggered')
- `overall_score`, `checks_performed` (jsonb)
- `decision` ('auto_approve', 'flag_for_human', 'auto_reject')
- `estimated_cost_usd`

---

## TypeScript Types

When updating this schema, also update:

- `/lib/types/database.ts` - Supabase generated types
- `/lib/types/resource.ts` - Resource interface definitions
- `/lib/types/suggestion.ts` - Suggestion interface definitions

---

## Migration History

| Date       | Migration                                               | Changes                                                                                                                                            |
| ---------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2024-10-24 | `20250101000000_initial_schema.sql`                     | Initial resources table (41 columns)                                                                                                               |
| 2024-11-08 | `20251108104349_add_missing_resource_columns.sql`       | Added county, languages, accessibility_features, source                                                                                            |
| 2024-11-08 | `20251108112026_parent_child_resources.sql`             | Added parent-child relationship fields                                                                                                             |
| 2024-11-09 | `20250109000000_verification_system.sql`                | Added verification tracking fields                                                                                                                 |
| 2024-11-09 | `20250109000002_support_non_addressed_resources.sql`    | Added address_type, service_area, closure_status                                                                                                   |
| 2024-11-10 | `20251110203158_geocoding_metadata.sql`                 | Added geocoding quality fields                                                                                                                     |
| 2024-11-10 | `20251110211500_website_screenshots_columns.sql`        | Added screenshot_url, screenshot_captured_at                                                                                                       |
| 2025-11-12 | `20251112082913_add_missing_resource_columns.sql`       | Added fees, required_documents; changed accessibility_features to TEXT[]                                                                           |
| 2026-01-12 | `20250112000000_expand_resource_suggestions_schema.sql` | Expanded resource_suggestions with 16+ columns for full resource data                                                                              |
| 2026-02-04 | `001-003_create_*.sql` (Drizzle)                        | Self-hosted PostgreSQL migration: core tables, functions, triggers                                                                                 |
| 2026-02-20 | `004_create_missing_tables.sql` (Drizzle)               | Added 7 tables: review_helpfulness, verification_events, expansion_priorities, expansion_milestones, county_data, coverage_metrics, research_tasks |

---

## Constraints

### Check Constraints

- `status IN ('active', 'inactive', 'pending', 'closed')`
- `verification_status IN ('pending', 'verified', 'flagged', 'rejected')`
- `verification_confidence >= 0 AND verification_confidence <= 1`
- `address_type IN ('physical', 'mailing', 'virtual', 'service_area')`

### Foreign Key Constraints

- `verified_by` → `users(id)` ON DELETE SET NULL
- `parent_resource_id` → `resources(id)` ON DELETE CASCADE

### Unique Constraints

- `id` - Primary key (unique)

---

## Row Level Security (RLS)

RLS is enabled on the `resources` table:

### Public Read

- Anyone can view resources with `status = 'active'`

### Admin Write

- Only admins (`users.is_admin = true`) can INSERT, UPDATE, DELETE

---

## Notes

### Recently Added Fields (2025-01-12)

- `fees` (text) - Cost information for services
- `required_documents` (text[]) - Documents needed to access service
- `accessibility_features` - **Changed from TEXT to TEXT[]** to support multiple features

These fields were added to align the `resources` table with `resource_suggestions` table, enabling automatic resource creation from verified suggestions.
