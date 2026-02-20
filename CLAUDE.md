# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

**📦 This project uses [Agent Success Pack](https://github.com/gserafini/agent-success-pack)**

A framework for structured, AI-optimized project management. Key docs:

- **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)** - Phase breakdown
- **[ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md)** - Technical decisions (ADRs)

**At session start**: Query pm.db for priorities and recent context:

```bash
~/.claude/bin/pm next --limit 10              # Get prioritized items
~/.claude/bin/pm session recent --days 3      # Get recent session context
```

**Before any frontend commit/demo**: Run quality checks to ensure zero errors.

---

## Quality Gates (CRITICAL)

**Before presenting any frontend work to the user:**

```bash
npm run quality      # Quick: Lint + TypeCheck + Tests + Build + DevCheck + ConsoleCheck
npm run quality:full # Full: Above + E2E tests
```

**Or use slash command:** `/quality-check`

**Why:** User should rarely see frontend errors. Catch them before commit:

- ✅ 0 ESLint errors
- ✅ 0 TypeScript errors
- ✅ All unit tests pass
- ✅ Build succeeds
- ✅ Dev server compiles successfully
- ✅ **0 Browser console errors** (new! checks / and /resources)
- ✅ E2E tests pass (optional, slower)

**CRITICAL:** Browser console errors were NOT being caught before. Now `npm run quality` includes `console:check` which uses Playwright to capture runtime JavaScript errors. This catches issues like:

- Google Maps API errors
- React runtime errors
- Network failures
- API endpoint errors

**DO NOT** run individual commands like `npx tsc` or `npm run lint`. ALWAYS run the full `npm run quality` suite.

**Workflow:**

1. Make changes
2. Run `npm run quality`
3. Fix any errors
4. Only then commit/demo

**Port Management:**

- **Port 3003**: User's dev server (`npm run dev`) - NEVER kill this!
- **Port 3004**: ALL testing and quality checks
  - Dev compilation check (`npm run dev:check`)
  - E2E tests (`npm run test:e2e`) via `dev:test`
  - Playwright automated tests
  - Screenshot generation

**Important**: All automated testing uses port 3004 to preserve the user's dev server on port 3003. Never run commands that kill port 3003 during quality checks.

---

## Frontend UI Verification (MANDATORY)

**⚠️ CRITICAL: `npm run quality` passing does NOT mean the UI works!**

**📋 READ CHECKLIST FIRST**: [.claude/FRONTEND_VERIFICATION_REQUIRED.md](.claude/FRONTEND_VERIFICATION_REQUIRED.md)

**Before claiming ANY frontend work is "complete", "done", or "production-ready":**

### 1. Run Quality Checks First

```bash
npm run quality  # Must pass with 0 errors
```

### 2. Browse the UI Using Playwright MCP (MANDATORY)

**For ANY frontend work** (new components, page changes, UI updates):

```typescript
// Use the Playwright MCP browser automation tools:
mcp__playwright__browser_navigate({ url: 'http://localhost:3003/your-page' })
mcp__playwright__browser_snapshot() // Get accessibility tree
mcp__playwright__browser_console_messages({ onlyErrors: true }) // Check for errors
mcp__playwright__browser_take_screenshot({ fullPage: true }) // Visual verification
```

**What to verify:**

- ✅ Page loads without crashing
- ✅ All components render correctly
- ✅ No browser console errors (red errors in console)
- ✅ No TypeErrors, ReferenceErrors, or other runtime errors
- ✅ Interactive elements work (buttons, toggles, dropdowns)
- ✅ Real-time updates work (if applicable)
- ✅ No missing data or undefined values displayed

**Example Checklist for Admin Dashboard Work:**

1. Navigate to `/admin` page
2. Take full-page screenshot
3. Check browser console for errors
4. Click on interactive elements (toggles, dropdowns, buttons)
5. Verify collapsible panels expand/collapse
6. Check that all data displays correctly (no "undefined", "NaN", or crashes)
7. Only THEN claim work is complete

### 3. If Errors Found

**DO NOT claim "production-ready" or "complete":**

- ❌ "All quality checks passed!" (if you haven't browsed the UI)
- ❌ "Phase 4 complete!" (if you haven't visually verified)
- ❌ "Ready for production!" (if you haven't tested interactivity)

**INSTEAD:**

- Fix the errors first
- Re-test in browser
- Only then present to user

### Why This Matters

**Past incident (2025-11-11)**: I ran `npm run quality` (passed ✅), marked admin dashboard as "production-ready", but **never browsed it**. User had to explicitly tell me to "USE FUCKING MCP SERVER". When I finally browsed, found critical crash bug (CoverageSnapshot.tsx TypeError). This was embarrassing and frustrated the user.

**Lesson**: Automated tests don't catch runtime errors, missing null checks, API failures, or visual issues. **YOU MUST LOOK AT IT.**

---

## Visual Design Review (Screenshots)

**When doing frontend design work, use screenshots to review responsive design:**

```bash
npm run screenshots              # Capture all viewports
/screenshots                     # Slash command (same as above)
```

**What it captures:**

- Mobile: 375x667 (iPhone SE) + 414x896 (iPhone Pro Max)
- Tablet: 768x1024 (iPad)
- Desktop: 1280x800 + 1920x1080
- Both viewport and full-page screenshots

**Output:** `/tmp/reentry-map-screenshots/` with timestamps

**When to use:**

- After implementing new UI components
- Before committing frontend changes
- During design reviews and PR demos
- When testing responsive layouts

**Best Practice:** Run screenshots before showing work to user to catch visual issues early.

---

## TypeScript Type Safety (CRITICAL)

**IMPORTANT:** Almost nothing in this app should use `unknown` type unless we are dealing with truly unknown data. Always take the time to define proper types instead of taking shortcuts.

**Principles:**

- ❌ **BAD:** `const data = await response.json() as unknown`
- ✅ **GOOD:** `const data = await response.json() as { field1: string, field2: number }`
- ✅ **BETTER:** Define an interface and use it

**When to use `unknown`:**

- Parsing user-provided JSON that could be anything
- Third-party API responses where we don't control the schema
- Temporary debugging (must be fixed before commit)

**Best Practices:**

1. **Define interfaces for all API responses**

   ```typescript
   interface GoogleMapsGeocodingResponse {
     status: 'OK' | 'ZERO_RESULTS' | ...
     results: Array<{ geometry: { location: { lat: number, lng: number } } }>
     error_message?: string
   }
   ```

2. **Use proper type assertions**

   ```typescript
   const geocodeData = (await response.json()) as GoogleMapsGeocodingResponse
   ```

3. **Extend base types when needed**

   ```typescript
   interface ExtendedResource extends BaseResource {
     city?: string | null
     state?: string | null
   }
   ```

4. **Never use double casts unless absolutely necessary**
   - `as unknown as Type` should be rare
   - Document why it's needed with a comment
   - Consider refactoring to avoid it

**Workflow:**

1. See a type error
2. Understand the actual data structure
3. Define a proper interface
4. Use the interface consistently
5. Don't rush - get it right

---

## Browser Console Troubleshooting

**CRITICAL: Always check browser console yourself before asking user to check.**

When working on frontend features (especially maps, API integration, or client components):

```bash
# Standard pages to always check (unauthenticated):
node scripts/check-console.mjs /           # Homepage
node scripts/check-console.mjs /resources  # Resources list

# Protected pages (authenticated - requires test user):
node scripts/check-profile-with-login.mjs  # /profile page

# Check any other path:
node scripts/check-console.mjs /path/to/page
```

**Standard Console Check List:**

- `/` - Homepage with map
- `/resources` - Resource list view
- `/profile` - User profile page (authenticated)

**Troubleshooting Workflow:**

1. **Make code changes**
2. **Check console yourself first** (don't ask user)
3. **Only show work to user after** console is clean
4. **If issues found:**
   - Fix errors and warnings
   - Repeat console check
   - Never present to user with console errors

**Common Issues & Fixes:**

- **`InvalidKeyMapError`**: Environment variable not loaded. Fix: `rm -rf .next && restart dev server`
- **Hydration errors**: Client/server mismatch. Fix: Use `isMounted` state pattern
- **`NEXT_PUBLIC_` vars wrong**: Delete `.next` directory before restarting server
- **Google Maps warnings**: Usually API key or library loading order issues

**When debugging fails:**

1. Kill ALL node processes: `killall -9 node`
2. Delete build cache: `rm -rf .next`
3. Restart dev server fresh
4. Re-check console logs

---

## Project Context

**Reentry Map** is a mobile-first web application helping individuals navigating reentry find resources in their community. The app uses Next.js 16, self-hosted PostgreSQL (Drizzle ORM), NextAuth.js, and AI agents to maintain an accurate, up-to-date directory of services.

- **Owner**: Gabriel Serafini (gserafini@gmail.com)
- **Repository**: github.com/gserafini/reentry-map.git
- **Production**: https://reentrymap.org (self-hosted on dc3-1)
- **Resources**: 224+ active resources across Oakland CA and Boulder CO

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5.7, Tailwind CSS 4.0
- **UI Components**: Material UI v7 (@mui/material, @mui/icons-material) + Lucide React icons
- **Backend**: Next.js API Routes, Self-hosted PostgreSQL 16 (Drizzle ORM), NextAuth.js
- **Maps**: Google Maps JavaScript API (@googlemaps/js-api-loader)
- **AI**: OpenAI SDK (gpt-4o-mini for cost-effectiveness)
- **PWA**: @ducanh2912/next-pwa
- **Forms**: react-hook-form + zod
- **Hosting**: Self-hosted on dc3-1.serafinihosting.com (PM2 + Apache)
- **Testing**: Vitest (unit), Playwright (E2E), @vitest/coverage-v8
- **Code Quality**: Prettier, ESLint, husky, lint-staged, @total-typescript/ts-reset
- **Environment**: @t3-oss/env-nextjs (type-safe env vars)

## Initial Setup

```bash
git clone https://github.com/gserafini/reentry-map.git
cd reentry-map
npm install
cp .env.example .env.local  # Then fill in values
npm run dev
```

Required environment variables (see `.env.example` and `SETUP_GUIDE.md`):

- `DATABASE_URL` - PostgreSQL connection string (SSL required for remote)
- `DIRECT_DATABASE_URL` - Same as DATABASE_URL (for Drizzle)
- `NEXTAUTH_URL` - App URL (e.g., `http://localhost:3003` or `https://reentrymap.org`)
- `NEXTAUTH_SECRET` - NextAuth session encryption key
- `NEXT_PUBLIC_GOOGLE_MAPS_KEY` - Google Maps API key (client)
- `GOOGLE_MAPS_KEY` - Google Maps API key (server)
- `OPENAI_API_KEY` - OpenAI API key for AI agents
- `ADMIN_API_KEY` - Admin API authentication key
- `NEXT_PUBLIC_APP_URL` - Public application URL

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

**users** - Extended profile (managed by NextAuth.js)

- Linked to NextAuth sessions
- Contains is_admin flag, phone, name

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

- Haversine distance function for geospatial queries (`get_resources_near()`)
- Full-text search indexes on name/description
- Database triggers for auto-updating aggregate counts (ratings, reviews)
- Drizzle ORM schema in `lib/db/schema.ts` (source of truth for table definitions)
- Migrations in `lib/db/migrations/` (applied directly to PostgreSQL on dc3-1)

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
├── db/
│   ├── schema.ts                 # Drizzle ORM schema (source of truth)
│   ├── index.ts                  # Database connection (postgres.js)
│   └── migrations/               # SQL migration files
├── api/                          # API helper functions (resources, auth)
├── ai-agents/                    # AI agent implementations
├── hooks/                        # Custom React hooks
├── utils/                        # Utility functions (geocoding, distance, formatting)
└── types/                        # TypeScript type definitions
```

## UI Component Library

**Material UI v7** (`@mui/material`) is the primary UI component library, with **Lucide React** for icons.

### Common Patterns

```typescript
import { Button, Card, CardContent, Chip, Avatar } from '@mui/material'
import { MapPin, Phone, Star } from 'lucide-react'
```

### Accessibility

- Built-in ARIA labels and roles
- Keyboard navigation (Tab, Enter, Arrow keys)
- Screen reader compatible
- Focus indicators and proper contrast ratios

## Development Patterns

### Database Queries (Drizzle ORM)

```typescript
// Using Drizzle ORM for type-safe queries
import { db } from '@/lib/db'
import { resources } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const activeResources = await db
  .select()
  .from(resources)
  .where(eq(resources.status, 'active'))
  .orderBy(resources.name)
```

### Raw SQL (postgres.js)

```typescript
// For complex queries (distance calculations, etc.)
import { getDb } from '@/lib/db'

const sql = getDb()
const results = await sql`
  SELECT *, calculate_distance(${lat}, ${lng}, latitude, longitude) AS distance
  FROM resources
  WHERE status = 'active'
  ORDER BY distance ASC
  LIMIT 20
`
```

### API Routes

```typescript
// app/api/resources/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resources } from '@/lib/db/schema'

export async function GET(request: NextRequest) {
  try {
    const data = await db.select().from(resources)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching resources:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Error Handling

Always handle database errors explicitly:

```typescript
try {
  const data = await db.select().from(resources).where(eq(resources.id, id))
  if (!data.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data[0])
} catch (error) {
  console.error('Database error:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

### Environment Variables

Use `process.env` for environment variables. Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - App URL for NextAuth.js
- `NEXTAUTH_SECRET` - Session encryption key
- `NEXT_PUBLIC_GOOGLE_MAPS_KEY` - Client-side Maps key
- `GOOGLE_MAPS_KEY` - Server-side Maps key
- `OPENAI_API_KEY` - OpenAI API key
- `ADMIN_API_KEY` - Admin API authentication
- `NEXT_PUBLIC_APP_URL` - Public application URL

See `.env.example` and `SETUP_GUIDE.md` for the full list.

## Code Quality Infrastructure

This project has enterprise-grade quality tools configured in Phase 0:

### Pre-commit Hooks

Automated quality checks run before every commit via husky + lint-staged:

- **ESLint** - Lints modified files
- **Prettier** - Formats modified files
- **Type checking** - Validates TypeScript
- **Commitlint** - Enforces conventional commit messages

To bypass hooks (NOT recommended): `git commit --no-verify`

### Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

**Format:** `type(scope): subject`

**Types:**

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code formatting (no logic changes)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding/updating tests
- `build:` - Build system or dependencies
- `ci:` - CI/CD configuration
- `chore:` - Other changes

**Examples:**

```bash
feat: add user authentication with NextAuth.js
fix: resolve map marker clustering issue
docs: update SETUP_GUIDE with database instructions
test: add unit tests for ResourceCard component
```

### Enhanced TypeScript

We use [@total-typescript/ts-reset](https://github.com/total-typescript/ts-reset) for improved type safety:

- Better `.json()` inference
- Improved array methods (`.filter(Boolean)`, `.includes()`)
- Fixed `fetch` response types
- Better `Promise.all()` typing

Import automatically included in all TypeScript files via `reset.d.ts`.

### Code Formatting

**Prettier** enforces consistent formatting:

```bash
npm run format        # Format all files
npm run format:check  # Check if files need formatting
```

Configuration in `.prettierrc` includes:

- Tailwind CSS class sorting via `prettier-plugin-tailwindcss`
- Semi-colons, single quotes, 2-space indentation

### Test Coverage

Target **70%+ coverage** for all production code:

```bash
npm run test:coverage  # Generate coverage report
```

Coverage thresholds enforced in `vitest.config.mts`:

- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

### Bundle Size Monitoring

Monitor and analyze bundle size to maintain performance:

```bash
npm run build:analyze  # Build with bundle analyzer
```

Opens interactive visualization showing:

- Bundle size by route
- Largest dependencies
- Code splitting effectiveness
- Opportunities for optimization

**Best Practices:**

- Run before major PRs
- Keep total bundle < 200KB (gzipped)
- Use dynamic imports for large components
- Check after adding new dependencies

### CI/CD Pipeline

**GitHub Actions** automatically runs on every push and PR:

1. **Lint & Type Check** - ESLint, TypeScript, Prettier
2. **Unit Tests** - Vitest with coverage reporting
3. **E2E Tests** - Playwright across all browsers
4. **Build** - Verifies production build succeeds

All checks must pass before merging to main.

**Required Secrets** (configure in GitHub repo settings):

- `DATABASE_URL`
- `NEXTAUTH_SECRET`

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
- Admin routes protected by NextAuth.js session + `is_admin` check
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

### Testing

**Test Strategy**:

- Unit tests with Vitest for components and utilities
- E2E tests with Playwright for critical user flows
- Target 70%+ code coverage
- Test before commit (pre-commit hooks run tests on changed files)

**Writing Unit Tests**:

```typescript
// __tests__/ResourceCard.test.tsx
import { render, screen } from '@testing-library/react'
import { ResourceCard } from '@/components/resources/ResourceCard'

describe('ResourceCard', () => {
  const mockResource = {
    id: '1',
    name: 'Test Resource',
    category: 'employment',
    address: '123 Main St'
  }

  it('renders resource name', () => {
    render(<ResourceCard resource={mockResource} />)
    expect(screen.getByText('Test Resource')).toBeInTheDocument()
  })

  it('displays category badge', () => {
    render(<ResourceCard resource={mockResource} />)
    expect(screen.getByText('employment')).toBeInTheDocument()
  })
})
```

**Writing E2E Tests**:

```typescript
// e2e/search.spec.ts
import { test, expect } from '@playwright/test'

test('search for resources', async ({ page }) => {
  await page.goto('/')

  // Type in search box
  await page.fill('[placeholder="Search resources..."]', 'housing')

  // Wait for results
  await page.waitForSelector('[data-testid="resource-card"]')

  // Verify results contain search term
  const results = await page.locator('[data-testid="resource-card"]').all()
  expect(results.length).toBeGreaterThan(0)
})
```

**Test Philosophy**:

- E2E tests run **headless by default** for fast feedback
- Only use `npm run test:e2e:ui` when demoing to user
- Test critical paths: auth, search, favorites, reviews, admin flows
- Mock external APIs (Google Maps, OpenAI) in tests
- Use test IDs for stable selectors: `data-testid="resource-card"`

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

# Testing
npm test                     # Run Vitest unit tests (watch mode)
npm run test:run             # Run tests once
npm run test:ui              # Run Vitest with UI
npm run test:coverage        # Generate coverage report
npm run test:e2e             # Run Playwright E2E tests (headless)
npm run test:e2e:ui          # Run E2E tests with Playwright UI
npm run test:e2e:headed      # Run E2E tests in headed mode

# Type checking
npm run type-check           # Run TypeScript checks

# Linting & Formatting
npm run lint                 # Run ESLint
npm run format               # Format all files with Prettier
npm run format:check         # Check if files need formatting

# Building
npm run build                # Production build
npm run build:analyze        # Build with bundle size analysis

# Database - See Database Operations section below
```

**Testing Philosophy:**

- **E2E tests run headless by default** - Use for troubleshooting and CI/CD
- **Only show UI tests when demoing** - Avoid interrupting workflow
- **Test before demo** - Verify everything works before showing to user

---

## Deployment (Self-Hosted on dc3-1)

**This project is NOT on Vercel.** It runs on dc3-1.serafinihosting.com with PM2 + Apache.

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for full details.

### Quick Deploy

```bash
# Push to GitHub, then deploy
git push origin main && \
ssh -p 22022 root@dc3-1.serafinihosting.com \
  'su - reentrymap -c "cd ~/reentry-map-prod && git pull origin main && npm install && npm run build && pm2 restart reentry-map-prod"'
```

### Key Details

- **URL**: https://reentrymap.org
- **Server**: dc3-1.serafinihosting.com, cPanel user `reentrymap`
- **App dir**: `/home/reentrymap/reentry-map-prod`
- **PM2 app**: `reentry-map-prod` on port 3007
- **Database**: PostgreSQL localhost:5432 (same server), database `reentry_map`
- **Logs**: `/home/reentrymap/logs/reentry-map-prod-{out,error}.log`
- **Node**: v20.20.0 (via nvm)

### Database Connections

- **On server** (localhost, no SSL): `postgresql://reentrymap:PASSWORD@localhost:5432/reentry_map`
- **From local dev** (remote, SSL required): `postgresql://reentrymap:PASSWORD@dc3-1.serafinihosting.com:5432/reentry_map`
- **All scripts** in `scripts/` auto-detect localhost vs remote and set SSL accordingly

---

## Database Operations

The database is self-hosted PostgreSQL on dc3-1. Migrations are applied via SSH.

### Schema Management

- **Drizzle schema**: `lib/db/schema.ts` (TypeScript source of truth for table definitions)
- **SQL migrations**: `lib/db/migrations/` (applied directly to PostgreSQL)
- **Canonical docs**: `docs/DATABASE_SCHEMA_CANONICAL.md` (human-readable reference)

### Running Migrations

```bash
# SSH to server and run migration
ssh -p 22022 root@dc3-1.serafinihosting.com \
  'su - reentrymap -c "psql -U reentrymap reentry_map < ~/reentry-map-prod/lib/db/migrations/NNN_migration_name.sql"'
```

**Migration workflow:**

1. Create migration file in `lib/db/migrations/`
2. Update Drizzle schema in `lib/db/schema.ts`
3. Apply migration to production database on dc3-1
4. Update `docs/DATABASE_SCHEMA_CANONICAL.md`
5. Verify with `psql` query

### Querying Production Database

```bash
# From local machine (SSL required)
psql "postgresql://reentrymap:PASSWORD@dc3-1.serafinihosting.com:5432/reentry_map?sslmode=require"

# From server (localhost, no SSL)
ssh -p 22022 root@dc3-1.serafinihosting.com 'su - reentrymap -c "psql -U reentrymap reentry_map"'
```

### Scripts

All scripts in `scripts/` use `DATABASE_URL` from `.env.local` with automatic SSL detection:

```javascript
const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
const sql = postgres(databaseUrl, { ssl: isLocalhost ? false : 'require' })
```

---

## Authentication Flow

NextAuth.js with credentials provider:

1. User enters email and password
2. NextAuth validates credentials against `users` table
3. JWT session created (HTTP-only cookies)
4. Admin routes check `user.is_admin` flag
5. Test credentials: `admin@example.com` / `AdminUser123!` (see `e2e/helpers/auth.ts`)

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

### Scaling & Performance Documentation

**Critical for understanding production infrastructure and scaling strategy:**

- **`docs/README.md`** - ⭐ **START HERE** - Documentation index with navigation guide
- **`docs/SCALING_GUIDE_OVERVIEW.md`** - Strategic roadmap from MVP to nationwide scale
- **`docs/REDIS_SETUP_GUIDE.md`** - 🚨 **Critical for launch** - Redis caching implementation (5-10x speedup)
- **`docs/MIGRATION_GUIDE.md`** - Supabase → Self-hosted PostgreSQL migration guide
- **`docs/PERFORMANCE_OPTIMIZATION_CHECKLIST.md`** - AI-verifiable performance checklist (100+ checks)
- **`docs/COST_ESTIMATION_CALCULATOR.md`** - Cost analysis and ROI at different scales
- **`scripts/verify-performance.sh`** - Automated performance verification (25 tests)

**Key Insights**:

- Single server (dc3-1) can handle **100k resources + 1M users/month** with proper optimization
- **Redis caching is critical for scale** (80-90% DB query reduction, 5-10x speedup)
- Estimated **75,000-100,000 resource pages** at 100% nationwide coverage
- Already self-hosted on dc3-1 (PostgreSQL + Next.js + PM2)
- Next.js + PostgreSQL is the **correct architecture** (validated vs WordPress)

**Before Launch**:

1. Implement Redis caching (follow `docs/REDIS_SETUP_GUIDE.md`)
2. Create database indexes (see scaling guides)
3. Run `./scripts/verify-performance.sh` to verify optimization

## User Profile & Avatars

**Strategy**: Gravatar + initials fallback

```typescript
import { Avatar } from '@mui/material'
import { getAvatarUrl, getUserInitials } from '@/lib/utils/avatar'

<Avatar src={getAvatarUrl(user) || undefined} alt={user.name || 'User'}>
  {getUserInitials(user.name)}
</Avatar>
```

**Priority**:

1. Gravatar (free, zero setup) - based on email MD5 hash
2. Initials fallback - generated from `user.name`

**Where Avatars Appear**: AppBar user menu, review cards, user profile page.

---

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
