# Reentry Map - Database Documentation

This document describes the database schema, migrations, and setup for the Reentry Map application.

## Database Technology

- **Platform**: Supabase (PostgreSQL 16)
- **Extensions**: PostGIS (geospatial), uuid-ossp (UUIDs)
- **Security**: Row Level Security (RLS) enabled on all tables
- **Automation**: Database triggers for aggregate counts and timestamps

## Running Migrations

Migrations are executed manually in the Supabase SQL Editor (automated migrations coming later).

### Migration Order

Run these SQL files in the Supabase SQL Editor **in order**:

1. **`20250101000000_initial_schema.sql`** - Creates all tables and indexes
2. **`20250101000001_rls_policies.sql`** - Sets up Row Level Security policies
3. **`20250101000002_functions_triggers.sql`** - Creates database functions and triggers
4. **`20250101000003_seed_data.sql`** - Inserts 10 sample Oakland resources

### How to Run

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New query**
4. Copy the contents of the first migration file
5. Click **Run**
6. Repeat for each migration file in order

## Database Schema

### Core Tables

#### users

Extended user profile linked to Supabase Auth.

- `id` (UUID, PK) - Links to auth.users
- `name` (TEXT) - User's display name
- `phone` (TEXT) - Phone number
- `avatar_url` (TEXT) - Profile picture URL
- `is_admin` (BOOLEAN) - Admin flag for access control
- Created automatically when user signs up via trigger

#### resources

Primary table for all reentry resources.

- `id` (UUID, PK)
- `name` (TEXT) - Resource name (required)
- `description` (TEXT) - Detailed description
- `services_offered` (TEXT[]) - Array of services
- Contact: `phone`, `email`, `website`
- Location: `address`, `latitude`, `longitude` (PostGIS indexed)
- `primary_category` (TEXT) - Main category
- `categories` (TEXT[]) - All applicable categories
- `tags` (TEXT[]) - Searchable tags
- `hours` (JSONB) - Operating hours
- `eligibility_requirements` (TEXT)
- `documents_required` (TEXT[])
- `languages_spoken` (TEXT[])
- `accessibility_features` (TEXT[])
- Stats: `rating_average`, `rating_count`, `review_count` (auto-updated)
- AI fields: `ai_enriched`, `verification_score`, `completeness_score`
- `status` ('draft' | 'active' | 'inactive' | 'flagged')

**Indexes**:

- Full-text search on name and description
- Spatial index on latitude/longitude
- Status, category, tags for filtering

#### user_favorites

User-saved resources with optional notes.

- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `resource_id` (UUID, FK → resources)
- `notes` (TEXT) - Personal notes
- Unique constraint: one favorite per user per resource

#### resource_ratings

1-5 star ratings (one per user per resource).

- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `resource_id` (UUID, FK → resources)
- `rating` (INTEGER, 1-5)
- Unique constraint: one rating per user per resource
- **Trigger**: Auto-updates resource rating_average and rating_count

#### resource_reviews

Detailed reviews with text, pros/cons, tips.

- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `resource_id` (UUID, FK → resources)
- `rating` (INTEGER, 1-5)
- `review_text`, `pros`, `cons`, `tips` (TEXT)
- `visited_date` (DATE)
- `was_helpful`, `would_recommend` (BOOLEAN)
- `is_approved` (BOOLEAN) - Admin moderation
- `helpful_count`, `not_helpful_count` (INTEGER, auto-updated)
- **Trigger**: Auto-updates resource review_count

#### review_helpfulness

Users vote on whether reviews were helpful.

- `id` (UUID, PK)
- `review_id` (UUID, FK → resource_reviews)
- `user_id` (UUID, FK → users)
- `is_helpful` (BOOLEAN)
- Unique constraint: one vote per user per review
- **Trigger**: Auto-updates review helpful/not_helpful counts

#### resource_suggestions

User-submitted resource suggestions for admin approval.

- `id` (UUID, PK)
- `name`, `description`, `address`, `phone`, `website`, `category`
- `submitted_by` (UUID, FK → users)
- `status` ('pending' | 'approved' | 'rejected' | 'duplicate')
- `admin_notes` (TEXT)

#### resource_updates

User-reported corrections/issues with existing resources.

- `id` (UUID, PK)
- `resource_id` (UUID, FK → resources)
- `reported_by` (UUID, FK → users)
- `issue_type`, `description`, `suggested_fix`
- `status` ('pending' | 'resolved' | 'dismissed')
- `admin_notes` (TEXT)

#### ai_agent_logs

Tracks all AI agent operations (discovery, enrichment, verification).

- `id` (UUID, PK)
- `agent_type`, `operation`
- `resource_id` (UUID, FK → resources, nullable)
- `input_data`, `output_data` (JSONB)
- `success` (BOOLEAN)
- `error_message` (TEXT)
- `cost_usd`, `execution_time_ms` (NUMERIC)

## Row Level Security (RLS)

All tables have RLS enabled. Key policies:

### Public Read Policies

- **resources**: Anyone can view active resources
- **resource_ratings**: Anyone can view ratings
- **resource_reviews**: Anyone can view approved reviews
- **review_helpfulness**: Anyone can view votes

### User-Specific Policies

- Users can only view/edit their own: favorites, ratings, reviews, suggestions, update reports
- Users can only vote on reviews once
- Users can only rate resources once

### Admin Policies

- Admins can create/update/delete resources
- Admins can approve/reject reviews
- Admins can view all suggestions and update reports
- Admins can view AI agent logs

## Database Functions

### calculate_distance(lat1, lon1, lat2, lon2)

Calculates distance in miles between two points using Haversine formula.

```sql
SELECT calculate_distance(37.8044, -122.2712, 37.7829, -122.2345);
-- Returns: 1.53 (miles)
```

### get_resources_near(user_lat, user_lng, radius_miles)

Returns resources within specified radius, sorted by distance.

```sql
SELECT * FROM get_resources_near(37.8044, -122.2712, 10);
-- Returns resources within 10 miles
```

## Database Triggers

### Auto-Update Timestamps

All tables with `updated_at` columns automatically update on modification.

### Auto-Aggregate Counts

- **resource_ratings** → Updates `resources.rating_average` and `rating_count`
- **resource_reviews** → Updates `resources.review_count`
- **review_helpfulness** → Updates `resource_reviews.helpful_count` and `not_helpful_count`

### Auto-Create User Profile

When a new user signs up via Supabase Auth, a profile is automatically created in the `users` table.

## Seed Data

The seed migration includes 10 sample Oakland-area resources across all categories:

- Oakland Job Center (Employment)
- Bay Area Community Services (Housing)
- Oakland Food Bank (Food)
- Alameda County Health Services (Healthcare)
- East Bay Community Law Center (Legal Aid)
- Oakland ID Services (ID Documents)
- New Beginnings Clothing Closet (Clothing)
- AC Transit Discount Pass Program (Transportation)
- Oakland Hope Center (Faith-Based)
- Oakland Adult Education (Education)

All have realistic addresses, coordinates, hours, and contact information for testing.

## TypeScript Types

All database types are defined in `lib/types/database.ts` with full TypeScript support:

```typescript
import type { Resource, User, ResourceReview } from '@/lib/types/database'

// Fully typed Supabase queries
const { data: resources } = await supabase.from('resources').select('*').eq('status', 'active')
// resources is typed as Resource[]
```

## Performance Optimizations

- **Spatial Index**: Fast location-based queries with PostGIS
- **Full-Text Search**: GIN indexes on resource name and description
- **Composite Indexes**: On frequently filtered columns (status, category, tags)
- **Unique Constraints**: Prevent duplicate favorites, ratings, review votes
- **Triggers**: Keep aggregate counts in sync without application logic

## Future Enhancements

- [ ] Automated migration system (vs manual SQL Editor)
- [ ] Database backups and restore procedures
- [ ] Monitoring and alerting for slow queries
- [ ] Read replicas for better performance
- [ ] Partitioning for large tables (reviews, logs)
- [ ] Archive old AI agent logs (retention policy)

## Troubleshooting

### Migration Errors

- Ensure migrations run in order (001, 002, 003, etc.)
- Check that PostGIS extension is enabled
- Verify auth.users table exists (created by Supabase)

### RLS Issues

- Remember to authenticate when testing locally
- Use service role key for admin operations
- Check policies match your use case

### Performance Issues

- Verify indexes are created
- Use `EXPLAIN ANALYZE` for slow queries
- Consider pagination for large result sets

## Support

For database issues, check:

1. Supabase dashboard logs
2. PostgreSQL error messages in SQL Editor
3. RLS policy configurations
4. Index usage with EXPLAIN

For schema changes, create a new migration file with the next number in sequence.
