# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

**Reentry Map** is a mobile-first web application helping individuals navigating reentry find resources in their community. The app uses Next.js 15, Supabase, and AI agents to maintain an accurate, up-to-date directory of services.

- **Owner**: Gabriel Serafini (gserafini@gmail.com)
- **Repository**: github.com/gserafini/reentry-map.git
- **Timeline**: 5-week MVP development plan
- **Target**: Oakland area initially, 50+ verified resources

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5.7, Tailwind CSS 4.0
- **UI Components**: shadcn/ui + Lucide React
- **Backend**: Next.js API Routes, Supabase (PostgreSQL 16, Auth, Storage, Realtime)
- **Maps**: Google Maps JavaScript API (@googlemaps/js-api-loader)
- **AI**: OpenAI SDK (gpt-4o-mini for cost-effectiveness)
- **PWA**: @ducanh2912/next-pwa
- **Forms**: react-hook-form + zod
- **Hosting**: Vercel with Supabase Cloud

## Initial Setup

This project has not been initialized yet. When starting development:

```bash
# Initialize Next.js project with Supabase template
npx create-next-app@latest reentry-map --example with-supabase --typescript --tailwind --app
cd reentry-map

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (secret)
- `NEXT_PUBLIC_GOOGLE_MAPS_KEY` - Google Maps API key
- `GOOGLE_MAPS_KEY` - Server-side Google Maps key
- `OPENAI_API_KEY` - OpenAI API key
- `NEXT_PUBLIC_APP_URL` - Application URL

## Database Architecture

### Core Tables

**resources** - Primary resource directory table with:
- Basic info (name, description, services)
- Contact (phone, email, website)
- Location (address, lat/lng with PostGIS indexing)
- Schedule (hours as JSONB)
- Categorization (primary_category, categories[], tags[])
- AI metadata (ai_enriched, verification_score, completeness_score)
- Community stats (rating_average, rating_count, review_count)

**users** - Extended profile (integrates with auth.users)
- References Supabase Auth
- Contains is_admin flag

**user_favorites** - User-saved resources with optional notes

**resource_ratings** - 1-5 star ratings (one per user per resource)

**resource_reviews** - Detailed reviews with:
- Rating, text, pros/cons, tips
- Helpfulness voting
- Moderation fields

**resource_suggestions** - User-submitted resource suggestions for admin review

**resource_updates** - User-reported corrections/issues

**ai_agent_logs** - Tracks all AI agent operations

### Key Features
- PostGIS for efficient geospatial queries
- Full-text search indexes on name/description
- Row Level Security (RLS) enabled on all tables
- Database triggers for auto-updating aggregate counts
- Auto-create user profile on auth signup

## Project Structure

```
app/
├── page.tsx                      # Home with map + search
├── resources/
│   ├── page.tsx                  # Resource list view
│   └── [id]/page.tsx             # Resource detail
├── favorites/page.tsx            # User's saved resources
├── suggest-resource/page.tsx     # Suggest new resource
├── my-reviews/page.tsx           # User's reviews
├── admin/                        # Admin dashboard & management
└── api/                          # API routes for resources, reviews, agents

components/
├── ui/                           # shadcn/ui components
├── resources/                    # ResourceCard, ResourceList, ResourceMap, ResourceDetail
├── search/                       # SearchBar, SearchFilters
├── user/                         # FavoriteButton, RatingStars, ReviewForm
├── auth/                         # AuthModal, PhoneAuth
└── admin/                        # Admin components

lib/
├── supabase/
│   ├── client.ts                 # Browser Supabase client
│   └── server.ts                 # Server Supabase client
├── ai-agents/                    # AI agent implementations
├── hooks/                        # Custom React hooks
├── utils/                        # Utility functions (geocoding, distance, formatting)
└── types/                        # TypeScript type definitions
```

## Development Patterns

### Server Components (Default)

```typescript
// app/resources/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function ResourcesPage() {
  const supabase = createClient();
  const { data: resources } = await supabase
    .from('resources')
    .select('*')
    .eq('status', 'active')
    .order('name');

  return <ResourceList resources={resources || []} />;
}
```

### Client Components (When Needed)

```typescript
'use client';

import { createClient } from '@/lib/supabase/client';

export function ResourceList() {
  const [resources, setResources] = useState([]);
  const supabase = createClient();

  // Component logic...
}
```

### API Routes

```typescript
// app/api/resources/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('resources')
      .select('*');

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Error Handling

Always handle Supabase errors explicitly:

```typescript
const { data, error } = await supabase
  .from('resources')
  .select('*');

if (error) {
  console.error('Error fetching resources:', error);
  throw new Error('Failed to fetch resources');
}
```

## Key Implementation Guidelines

### TypeScript
- Use explicit types for all functions and components
- Create proper interfaces in `lib/types/`
- Use const for immutable values
- Prefer async/await over promises

### Components
- Use function components with TypeScript
- Server Components by default, 'use client' only when needed for interactivity
- Props interfaces defined for all components
- Implement loading.tsx and error.tsx for each route

### Styling
- Mobile-first responsive design
- Tailwind CSS utility classes
- shadcn/ui components for consistency
- Touch targets > 44x44px for accessibility

### Security
- Never expose secrets in client components
- API keys only in API routes or server components
- Row Level Security policies on all Supabase tables
- Input validation with Zod schemas
- Rate limiting on API endpoints

### Performance
- Server Components to reduce client JS
- Image optimization with next/image
- Debounced search inputs (300ms)
- Pagination for large result sets (20 per page)
- PostGIS spatial indexes for location queries
- Marker clustering for map with 100+ resources

### Accessibility
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Color contrast > 4.5:1
- Focus indicators visible
- Alt text on all images

## AI Agent System

Three primary agents:

1. **Discovery Agent** - Finds new resources from 211 directories, government sites, Google searches
2. **Enrichment Agent** - Fills missing data via geocoding, website scraping, Google Maps photos
3. **Verification Agent** - Quarterly checks on phone numbers, websites, business status

All agent actions logged to `ai_agent_logs` table with success/failure, cost tracking.

## Common Commands

```bash
# Development
npm run dev                  # Start dev server

# Type checking
npm run type-check          # Run TypeScript checks

# Linting
npm run lint                # Run ESLint

# Building
npm run build               # Production build

# Database
# Run migrations in Supabase SQL Editor in order:
# 1. supabase/migrations/20250101000000_initial_schema.sql
# 2. supabase/migrations/20250101000001_rls_policies.sql
# 3. supabase/migrations/20250101000002_functions_triggers.sql
# 4. supabase/migrations/20250101000003_seed_data.sql
```

## Authentication Flow

Phone-based OTP via Supabase Auth:
1. User enters phone number (US format)
2. SMS OTP sent (6-digit code, 10-minute expiry)
3. User enters code
4. Auto-create user profile on first sign-in
5. Session persists via HTTP-only cookies

## Testing Requirements

Before each commit:
- Feature works on Chrome desktop and mobile
- Loading and error states display correctly
- No console errors
- TypeScript compiles without errors
- Responsive design works (375px to 1920px)

Performance targets:
- Lighthouse Performance > 90
- First Contentful Paint < 1.8s
- Largest Contentful Paint < 2.5s

## Development Plan (5 Weeks)

**Week 1**: Foundation - database schema, resource display, search, filtering, staging deployment

**Week 2**: Location - geolocation, Google Maps integration, distance-based search, map markers with clustering

**Week 3**: Auth & Favorites - phone auth, user profiles, favorites system, ratings

**Week 4**: Community - reviews, review helpfulness voting, suggestions, resource update reports, AI agents, admin dashboard

**Week 5**: Launch - PWA setup, content population (50+ resources), testing, bug fixes, soft launch

## Important Documentation Files

When working on this project, refer to:
- `TECHNICAL_ARCHITECTURE.md` - Complete database schema, file structure, environment variables
- `PRODUCT_REQUIREMENTS.md` - Feature requirements, acceptance criteria, user flows
- `DEVELOPMENT_PLAN.md` - Week-by-week implementation plan
- `SETUP_GUIDE.md` - Step-by-step environment setup
- `TESTING_STRATEGY.md` - Testing procedures
- `DEPLOYMENT_GUIDE.md` - Deployment procedures
- `API_DOCUMENTATION.md` - API endpoint specifications

## Core Principles

1. **Mobile-First**: Design for mobile, enhance for desktop
2. **Simplicity**: Clear language (4th grade reading level), minimal clicks
3. **Dignity & Respect**: Never stigmatizing language, neutral helpful tone
4. **Server Components**: Default to Server Components, minimize client JS
5. **Error Handling**: Always handle errors gracefully with user-friendly messages
6. **Accessibility**: Keyboard navigation, screen readers, proper contrast
7. **Performance**: Fast loading on slow connections, optimize for 3G

## Category System

Primary categories for resources:
- Employment
- Housing
- Food
- Clothing
- Healthcare
- Mental Health
- Substance Abuse Treatment
- Legal Aid
- Transportation
- ID Documents
- Education
- Faith-Based
- General Support

Resources can have multiple categories but one primary_category for filtering.
