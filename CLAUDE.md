# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

**📦 This project uses [Agent Success Pack](https://github.com/gserafini/agent-success-pack)**

A framework for structured, AI-optimized project management. Key docs:

- **[PROGRESS.md](PROGRESS.md)** - Current status & session notes
- **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)** - Phase breakdown
- **[ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md)** - Technical decisions (ADRs)

**At session start**: Read PROGRESS.md to understand current state.

**Before any frontend commit/demo**: Run quality checks to ensure zero errors.

---

## Quality Gates (CRITICAL)

**Before presenting any frontend work to the user:**

```bash
npm run quality      # Quick: Lint + TypeCheck + Tests + Build + DevCheck
npm run quality:full # Full: Above + E2E tests
```

**Or use slash command:** `/quality-check`

**Why:** User should rarely see frontend errors. Catch them before commit:

- ✅ 0 ESLint errors
- ✅ 0 TypeScript errors
- ✅ All unit tests pass
- ✅ Build succeeds
- ✅ Dev server compiles successfully
- ✅ E2E tests pass (optional, slower)

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

## Browser Console Troubleshooting

**CRITICAL: Always check browser console yourself before asking user to check.**

When working on frontend features (especially maps, API integration, or client components):

```bash
# Check console for specific page
node scripts/check-console.mjs /resources

# Check homepage
node scripts/check-console.mjs /

# Check any path
node scripts/check-console.mjs /path/to/page
```

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

**Reentry Map** is a mobile-first web application helping individuals navigating reentry find resources in their community. The app uses Next.js 16, Supabase, and AI agents to maintain an accurate, up-to-date directory of services.

- **Owner**: Gabriel Serafini (gserafini@gmail.com)
- **Repository**: github.com/gserafini/reentry-map.git
- **Timeline**: 5-week MVP development plan
- **Target**: Oakland area initially, 50+ verified resources

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5.7, Tailwind CSS 4.0
- **UI Components**: Material UI v7 (@mui/material, @mui/icons-material) + Lucide React icons
- **Backend**: Next.js API Routes, Supabase (PostgreSQL 16, Auth, Storage, Realtime)
- **Maps**: Google Maps JavaScript API (@googlemaps/js-api-loader)
- **AI**: OpenAI SDK (gpt-4o-mini for cost-effectiveness)
- **PWA**: @ducanh2912/next-pwa
- **Forms**: react-hook-form + zod
- **Hosting**: Vercel with Supabase Cloud
- **Testing**: Vitest (unit), Playwright (E2E), @vitest/coverage-v8
- **Code Quality**: Prettier, ESLint, husky, lint-staged, @total-typescript/ts-reset
- **Environment**: @t3-oss/env-nextjs (type-safe env vars)

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

## HeroUI Component Library

**HeroUI** (formerly NextUI) is our primary UI component library, chosen for its:

- Built-in WCAG accessibility (critical for reentry population)
- Zero runtime styles (Tailwind-based for performance)
- Mobile-first design with proper touch targets
- Comprehensive component set

### Basic Usage

```typescript
'use client' // Most HeroUI components require client

import { Button, Card, CardHeader, CardBody, Badge } from '@heroui/react'

export function ResourceCard({ resource }) {
  return (
    <Card>
      <CardHeader>
        <h3>{resource.name}</h3>
        <Badge color="primary">{resource.category}</Badge>
      </CardHeader>
      <CardBody>
        <p>{resource.description}</p>
        <Button color="primary" variant="flat">
          View Details
        </Button>
      </CardBody>
    </Card>
  )
}
```

### Common Components

- **Button**: `<Button color="primary" variant="solid">Text</Button>`
- **Card**: `<Card>`, `<CardHeader>`, `<CardBody>`, `<CardFooter>`
- **Badge**: `<Badge color="success">Status</Badge>`
- **Avatar**: `<Avatar src="/path" name="User" />`
- **Input**: `<Input label="Name" placeholder="Enter name" />`
- **Modal**: `<Modal>`, `<ModalContent>`, `<ModalHeader>`, etc.

### Colors & Variants

**Colors**: `default`, `primary`, `secondary`, `success`, `warning`, `danger`

**Variants**: `solid`, `bordered`, `light`, `flat`, `faded`, `shadow`, `ghost`

### Accessibility Features

- Built-in ARIA labels and roles
- Keyboard navigation (Tab, Enter, Arrow keys)
- Screen reader compatible
- Focus indicators
- Proper contrast ratios

### Theme Integration

HeroUI works with `next-themes` for dark mode:

- Components auto-adapt to theme
- Use `className="dark:..."` for custom dark mode styles
- Provider setup in `app/providers.tsx`

**Example Test Page**: Visit `/heroui-test` to see components in action

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
'use client'

import { createClient } from '@/lib/supabase/client'

export function ResourceList() {
  const [resources, setResources] = useState([])
  const supabase = createClient()

  // Component logic...
}
```

### API Routes

```typescript
// app/api/resources/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from('resources').select('*')

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Error Handling

Always handle Supabase errors explicitly:

```typescript
const { data, error } = await supabase.from('resources').select('*')

if (error) {
  console.error('Error fetching resources:', error)
  throw new Error('Failed to fetch resources')
}
```

### Environment Variables

Always use type-safe environment variables via `@/lib/env`:

```typescript
// ❌ DON'T use process.env directly
const url = process.env.NEXT_PUBLIC_SUPABASE_URL

// ✅ DO use the env import
import { env } from '@/lib/env'
const url = env.NEXT_PUBLIC_SUPABASE_URL // Type-safe, validated
```

**Benefits**:

- Build fails immediately if required vars are missing
- TypeScript autocomplete for all environment variables
- Prevents exposing server secrets to client
- Clear validation errors with helpful messages

**Available Environment Variables**:

- `env.NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (required)
- `env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key (required)
- `env.SUPABASE_SERVICE_ROLE_KEY` - Server-only admin key (optional)
- `env.OPENAI_API_KEY` - OpenAI API key for AI agents (optional)
- `env.GOOGLE_MAPS_KEY` - Server-side Google Maps key (optional)
- `env.NEXT_PUBLIC_GOOGLE_MAPS_KEY` - Client-side Maps key (optional)
- `env.NEXT_PUBLIC_APP_URL` - Application URL for redirects (optional)

**Adding New Environment Variables**:

1. Add to schema in `lib/env.ts` (server or client section)
2. Add to runtimeEnv mapping
3. Add to `.env.example` with documentation
4. Update `SETUP_GUIDE.md` if it's required

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
feat: add user authentication with Supabase
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

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

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

# Database
# Run migrations in Supabase SQL Editor in order:
# 1. supabase/migrations/20250101000000_initial_schema.sql
# 2. supabase/migrations/20250101000001_rls_policies.sql
# 3. supabase/migrations/20250101000002_functions_triggers.sql
# 4. supabase/migrations/20250101000003_seed_data.sql
```

**Testing Philosophy:**

- **E2E tests run headless by default** - Use for troubleshooting and CI/CD
- **Only show UI tests when demoing** - Avoid interrupting workflow
- **Test before demo** - Verify everything works before showing to user

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

## User Profile & Avatars

**Strategy**: Hybrid approach with Gravatar + Supabase Storage (see ADR-011)

### Avatar Display

```typescript
import { Avatar } from '@mui/material'
import { getAvatarUrl, getUserInitials } from '@/lib/utils/avatar'

<Avatar src={getAvatarUrl(user) || undefined} alt={user.name || 'User'}>
  {getUserInitials(user.name)}
</Avatar>
```

**Priority**:

1. Custom uploaded avatar (Supabase Storage) - if `user.avatar_url` exists
2. Gravatar (free, zero setup) - based on email MD5 hash
3. Initials fallback - generated from `user.name`

**Where Avatars Appear**:

- AppBar (user menu, top-right when signed in)
- Review cards (next to reviewer name)
- User profile page (large 200x200px version)

**Avatar Uploads**: Post-MVP feature (Phase 6.3) - users can upload custom 2MB max JPG/PNG/WebP

See [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md#user-profile-features) for complete implementation details.

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
