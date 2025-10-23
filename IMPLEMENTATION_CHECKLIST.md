# Implementation Checklist

Detailed, testable checklist for building Reentry Map MVP. Organized by priority and dependencies.

## Legend

- ✅ Complete
- 🚧 In Progress
- ⏳ Blocked
- ❌ Not Started
- 🔄 Needs Review

---

## Phase 0: Foundation & Quality Infrastructure (CURRENT PRIORITY)

**Goal**: Set up enterprise-grade testing, linting, and validation before building features.

**Estimated Time**: 1-2 sessions (2-4 hours)

**Why First**: Establishing quality infrastructure now prevents technical debt and catches bugs early.

### 0.1 Testing Infrastructure

#### 0.1.1 Vitest Setup ✅

- [x] Install Vitest dependencies
  ```bash
  npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths @vitest/ui
  ```
- [x] Create `vitest.config.mts`
- [x] Add test scripts to `package.json` (test, test:ui, test:coverage, test:run)
- [x] Create `__tests__/` directory
- [x] Write example unit test for existing component (**tests**/example.test.tsx)
- [x] Run tests and verify they pass (4/4 tests passing)
- [x] **DEMO**: Show passing test output ✅

#### 0.1.2 Playwright Setup ✅

- [x] Install Playwright
  ```bash
  npm install -D @playwright/test && npx playwright install --with-deps
  ```
- [x] Create `playwright.config.ts` (configured for all major browsers + mobile viewports)
- [x] Create `e2e/` directory
- [x] Write example E2E test for homepage (e2e/homepage.spec.ts - smoke tests)
- [x] Run E2E tests and verify they pass (15/15 tests passing across 5 browsers)
- [x] Add test scripts to package.json (test:e2e, test:e2e:ui, test:e2e:headed)
- [x] **NOTE**: E2E tests run headless by default for troubleshooting

#### 0.1.3 Test Coverage Configuration ✅

- [x] Install coverage tools
  ```bash
  npm install -D @vitest/coverage-v8
  ```
- [x] Configure coverage thresholds (70% for lines/functions/branches/statements in vitest.config.mts)
- [x] Add coverage script to `package.json` (test:coverage)
- [x] Generate initial coverage report (ready to run with `npm run test:coverage`)

**Deliverable**: Working test infrastructure with examples
**Review Point**: Run `npm test` and `npm run test:e2e`

---

### 0.2 Code Quality Tools

#### 0.2.1 Prettier Setup ✅

- [x] Install Prettier
  ```bash
  npm install -D prettier prettier-plugin-tailwindcss
  ```
- [x] Create `.prettierrc` (with Tailwind CSS plugin)
- [x] Create `.prettierignore` (excludes generated files)
- [x] Add format scripts to package.json (format, format:check)
- [x] Format all existing code
  ```bash
  npm run format
  ```
- [x] **VERIFY**: No formatting changes needed ✅

#### 0.2.2 ESLint Configuration ✅

- [x] Install ESLint plugins
  ```bash
  npm install -D eslint-config-prettier eslint-plugin-prettier
  ```
- [x] Update `eslint.config.mjs` (added ignores, Prettier integration, config file rules)
- [x] Fix all linting errors (excluded generated files, relaxed rules for config files)
- [x] **VERIFY**: `npm run lint` passes with 0 errors ✅

#### 0.2.3 Git Hooks ✅

- [x] Install husky and lint-staged
  ```bash
  npm install -D husky lint-staged
  ```
- [x] Initialize husky
  ```bash
  npx husky init
  ```
- [x] Configure pre-commit hook (runs lint-staged with ESLint + Prettier)
- [x] Test hook with sample commit ✅

**Deliverable**: Automated code quality checks
**Review Point**: Make a commit and verify hooks run ✅

---

### 0.3 TypeScript Improvements

#### 0.3.1 ts-reset Setup ✅

- [x] Install ts-reset
  ```bash
  npm install -D @total-typescript/ts-reset
  ```
- [x] Create `reset.d.ts` with all improved type rules
- [x] Import all rules
- [x] Update `tsconfig.json` to include `reset.d.ts` and exclude test files
- [x] **VERIFY**: TypeScript compilation succeeds ✅

#### 0.3.2 Type Safety Audit ✅

- [x] Review `tsconfig.json` for strict settings (already has "strict": true)
- [x] Enable any missing strict flags (all strict flags enabled)
- [x] Fix new type errors if any (excluded test files from build)
- [x] **VERIFY**: `npm run build` succeeds ✅

**Deliverable**: Enhanced TypeScript safety
**Review Point**: Show improved type inference

---

### 0.4 Environment Validation

#### 0.4.1 T3 Env Setup ✅

- [x] Install T3 Env
  ```bash
  npm install @t3-oss/env-nextjs zod
  ```
- [x] Create `lib/env.ts` with validation schema
- [x] Define server environment schema (ready for future server vars)
- [x] Define client environment schema (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
- [x] Configure runtime validation with skipValidation flag
- [x] **VERIFY**: Validation catches missing env vars ✅
- [x] **VERIFY**: Build succeeds with valid env vars ✅

#### 0.4.2 Environment Variables Migration

- [ ] Document all required env vars in `src/env.ts`
- [ ] Update `.env.example` with all variables
- [ ] Replace `process.env` usage with `env` import in existing code
- [ ] **VERIFY**: Build fails with missing env vars (good)
- [ ] **VERIFY**: Build succeeds with all env vars present

#### 0.4.3 Environment Documentation

- [ ] Update `SETUP_GUIDE.md` with env validation info
- [ ] Update `CLAUDE.md` with env usage patterns
- [ ] Document env var purposes in `.env.example`

**Deliverable**: Type-safe, validated environment variables
**Review Point**: Try building without env vars and show error

---

### 0.5 Documentation Updates

#### 0.5.1 Update CLAUDE.md

- [ ] Add testing patterns section
- [ ] Add environment validation usage
- [ ] Add code quality commands
- [ ] Update common commands section

#### 0.5.2 Update Technical Architecture

- [ ] Add testing strategy section
- [ ] Add quality tools section
- [ ] Update tech stack with new tools

#### 0.5.3 Create PROGRESS.md

- [ ] Create initial progress tracking file
- [ ] Document Phase 0 completion
- [ ] Set metrics baseline

**Deliverable**: Up-to-date documentation
**Review Point**: Quick skim of updated docs

---

## Phase 1: UI Library Decision & Setup

**Goal**: Choose and implement UI component library (HeroUI recommended).

**Estimated Time**: 1-2 sessions

**Blocked By**: User decision on ADR-005 (HeroUI vs shadcn/ui)

### 1.1 Decision Making (USER INPUT REQUIRED)

- [ ] Review ADR-005 in ARCHITECTURE_DECISIONS.md
- [ ] **USER DECISION**: HeroUI or shadcn/ui?
- [ ] Document decision rationale
- [ ] Update ADR-005 status to "Accepted"

### 1.2 If HeroUI Chosen

#### 1.2.1 HeroUI Installation

- [ ] Remove existing shadcn/ui components
- [ ] Install HeroUI
  ```bash
  npm install @heroui/react
  ```
- [ ] Configure Tailwind for HeroUI
- [ ] Set up HeroUI provider in root layout
- [ ] **VERIFY**: Dev server runs without errors

#### 1.2.2 HeroUI MCP Server Setup

- [ ] Clone heroui-mcp repository
- [ ] Install and build MCP server
- [ ] Configure Claude Desktop to use MCP
- [ ] Test MCP with component lookup
- [ ] **DEMO**: Show MCP providing component docs

#### 1.2.3 Component Migration

- [ ] Audit current components (login-form, sign-up-form, etc.)
- [ ] Create HeroUI equivalents
  - [ ] Button components
  - [ ] Input components
  - [ ] Form components
  - [ ] Card components
- [ ] Update auth pages to use HeroUI
- [ ] **DEMO**: Show updated auth pages

#### 1.2.4 Testing HeroUI Components

- [ ] Write tests for new components
- [ ] Verify accessibility with screen readers
- [ ] Test keyboard navigation
- [ ] Test mobile responsiveness
- [ ] **DEMO**: Show accessible forms

### 1.3 If shadcn/ui Kept

#### 1.3.1 Complete shadcn/ui Setup

- [ ] Document all required components
- [ ] Install missing components
- [ ] Create component library documentation
- [ ] Add accessibility features manually
- [ ] Write component tests

**Deliverable**: Fully functional UI component system
**Review Point**: Demo auth pages with new UI

---

## Phase 2: Database Setup & Configuration

**Goal**: Set up Supabase database with schema, RLS policies, and seed data.

**Estimated Time**: 1-2 sessions

**Dependencies**: None (can run in parallel with Phase 1)

### 2.1 Supabase Project Setup

- [ ] Verify Supabase project exists
- [ ] Confirm database URL and keys in `.env.local`
- [ ] Test connection from Next.js app
- [ ] **VERIFY**: Can query Supabase from API route

### 2.2 Database Schema

#### 2.2.1 Core Tables

- [ ] Create `resources` table (copy from TECHNICAL_ARCHITECTURE.md)
- [ ] Create `users` table
- [ ] Create `user_favorites` table
- [ ] Create `resource_ratings` table
- [ ] Create `resource_reviews` table
- [ ] Create `review_helpfulness` table
- [ ] Create `resource_suggestions` table
- [ ] Create `resource_updates` table
- [ ] Create `ai_agent_logs` table
- [ ] **VERIFY**: All tables exist in Supabase dashboard

#### 2.2.2 Indexes & Extensions

- [ ] Enable PostGIS extension
- [ ] Create spatial index on resources (ST_MakePoint)
- [ ] Create full-text search index on resources
- [ ] Create category indexes
- [ ] Create foreign key indexes
- [ ] **VERIFY**: Run EXPLAIN on sample queries

#### 2.2.3 Functions & Triggers

- [ ] Create `update_resource_rating()` function
- [ ] Create rating trigger
- [ ] Create `update_resource_review_count()` function
- [ ] Create review count trigger
- [ ] Create `update_review_helpfulness_count()` function
- [ ] Create helpfulness trigger
- [ ] Create `handle_new_user()` function
- [ ] Create auth user trigger
- [ ] **VERIFY**: Triggers fire correctly

### 2.3 Row Level Security

- [ ] Enable RLS on all tables
- [ ] Create RLS policies for `users`
- [ ] Create RLS policies for `resources`
- [ ] Create RLS policies for `user_favorites`
- [ ] Create RLS policies for `resource_ratings`
- [ ] Create RLS policies for `resource_reviews`
- [ ] Create RLS policies for `review_helpfulness`
- [ ] Create RLS policies for `resource_suggestions`
- [ ] Create RLS policies for `resource_updates`
- [ ] **VERIFY**: Test policies with different users

### 2.4 TypeScript Types

- [ ] Generate TypeScript types from Supabase schema
- [ ] Create `lib/types/database.ts`
- [ ] Export types for all tables
- [ ] Create helper types for common queries
- [ ] **VERIFY**: Types work in IDE autocomplete

### 2.5 Seed Data

- [ ] Create seed data script
- [ ] Add 10 sample resources (Oakland area)
- [ ] Add sample users (test accounts)
- [ ] Add sample reviews
- [ ] Run seed script
- [ ] **VERIFY**: Data appears in Supabase dashboard
- [ ] **DEMO**: Show sample resources in app

**Deliverable**: Fully configured database with sample data
**Review Point**: Query database and show results

---

## Phase 3: Core Resource Features (Week 1 Plan)

**Goal**: Users can browse and search resources.

**Estimated Time**: 2-3 sessions

**Dependencies**: Phase 0 (testing), Phase 1 (UI), Phase 2 (database)

### 3.1 Resource Data Layer

#### 3.1.1 Supabase Client Setup

- [ ] Verify `lib/supabase/client.ts` configured
- [ ] Verify `lib/supabase/server.ts` configured
- [ ] Create `lib/api/resources.ts` with query functions
- [ ] Add error handling to all queries
- [ ] Add loading states
- [ ] Write tests for API functions

#### 3.1.2 Resource Type Definitions

- [ ] Create `Resource` interface
- [ ] Create `ResourceFilters` interface
- [ ] Create `SearchParams` interface
- [ ] Export from `lib/types/index.ts`

### 3.2 Resource List Page

#### 3.2.1 Server Component

- [ ] Create `app/resources/page.tsx` (Server Component)
- [ ] Fetch resources from Supabase
- [ ] Handle empty state
- [ ] Handle error state
- [ ] Pass data to client components
- [ ] Add loading.tsx
- [ ] Add error.tsx

#### 3.2.2 ResourceCard Component

- [ ] Create `components/resources/ResourceCard.tsx`
- [ ] Display resource name, category, address
- [ ] Show distance (if available)
- [ ] Show rating
- [ ] Add click to detail page
- [ ] Style with UI library components
- [ ] Write component tests
- [ ] Test accessibility

#### 3.2.3 ResourceList Component

- [ ] Create `components/resources/ResourceList.tsx`
- [ ] Render grid of ResourceCard components
- [ ] Implement loading skeleton
- [ ] Implement empty state
- [ ] Make responsive (mobile-first)
- [ ] Write component tests
- [ ] **DEMO**: Show resource list with sample data

### 3.3 Resource Detail Page

#### 3.3.1 Server Component

- [ ] Create `app/resources/[id]/page.tsx`
- [ ] Fetch single resource by ID
- [ ] Handle not found (404)
- [ ] Pass data to detail component
- [ ] Add loading.tsx
- [ ] Add error.tsx
- [ ] Implement metadata (SEO)

#### 3.3.2 ResourceDetail Component

- [ ] Create `components/resources/ResourceDetail.tsx`
- [ ] Display all resource information
- [ ] Show full address
- [ ] Display hours of operation
- [ ] Show services offered
- [ ] Display eligibility requirements
- [ ] Add "Get Directions" button (opens Google Maps)
- [ ] Add "Call" button (tel: link)
- [ ] Add "Visit Website" button
- [ ] Write component tests
- [ ] Test accessibility
- [ ] **DEMO**: Show resource detail page

### 3.4 Search Functionality

#### 3.4.1 SearchBar Component

- [ ] Create `components/search/SearchBar.tsx`
- [ ] Text input with icon
- [ ] Implement debouncing (300ms)
- [ ] Update URL params on search
- [ ] Clear button
- [ ] Write component tests
- [ ] Test accessibility (keyboard nav)

#### 3.4.2 Search Implementation

- [ ] Add full-text search query to `lib/api/resources.ts`
- [ ] Implement search in resource list page
- [ ] Show search results count
- [ ] Handle no results state
- [ ] Highlight matching text (nice to have)
- [ ] Write integration tests
- [ ] **DEMO**: Search for "housing" and show results

### 3.5 Category Filtering

#### 3.5.1 CategoryFilter Component

- [ ] Create `components/search/CategoryFilter.tsx`
- [ ] List all categories
- [ ] Multi-select checkboxes
- [ ] Show resource count per category
- [ ] Clear all filters button
- [ ] Update URL params on filter change
- [ ] Write component tests
- [ ] Test accessibility

#### 3.5.2 Filter Implementation

- [ ] Add category filter query to `lib/api/resources.ts`
- [ ] Combine with search query
- [ ] Update resource list page
- [ ] Persist filters in URL
- [ ] Test shareable filtered URLs
- [ ] Write integration tests
- [ ] **DEMO**: Filter by "Employment" and show results

### 3.6 Pagination

- [ ] Add pagination to resource query (20 per page)
- [ ] Create Pagination component
- [ ] Show page numbers
- [ ] Previous/Next buttons
- [ ] Update URL params
- [ ] Scroll to top on page change
- [ ] Write tests
- [ ] **DEMO**: Navigate through pages

### 3.7 Sorting

- [ ] Add sort options (name, rating, distance, date added)
- [ ] Create Sort dropdown
- [ ] Update URL params
- [ ] Persist sort preference
- [ ] Write tests
- [ ] **DEMO**: Sort by rating descending

**Deliverable**: Functional resource browsing with search and filters
**Review Point**: Full demo of search, filter, and detail pages

---

## Phase 4: Location Features (Week 2 Plan)

**Goal**: Users can find resources near them with map view.

**Estimated Time**: 2-3 sessions

**Dependencies**: Phase 3 (resource features)

### 4.1 Geolocation

#### 4.1.1 useLocation Hook

- [ ] Create `lib/hooks/useLocation.ts`
- [ ] Request browser geolocation
- [ ] Handle permission denied
- [ ] Handle errors
- [ ] Return lat/lng
- [ ] Write hook tests

#### 4.1.2 Manual Address Entry

- [ ] Create AddressSearch component
- [ ] Google Places Autocomplete integration
- [ ] Geocode selected address
- [ ] Update user location
- [ ] Write component tests

### 4.2 Distance Calculations

#### 4.2.1 Distance Utilities

- [ ] Create `lib/utils/distance.ts`
- [ ] Haversine formula for distance calculation
- [ ] Format distance (miles/km)
- [ ] Write unit tests

#### 4.2.2 Distance Display

- [ ] Update ResourceCard to show distance
- [ ] Update resource queries to calculate distance
- [ ] Add "Near Me" button
- [ ] Sort by distance when location available
- [ ] **DEMO**: Show resources sorted by proximity

### 4.3 Google Maps Integration

#### 4.3.1 Map Setup

- [ ] Install @googlemaps/js-api-loader
- [ ] Create `components/map/ResourceMap.tsx`
- [ ] Load Google Maps API
- [ ] Display map centered on user location
- [ ] Add zoom controls
- [ ] Handle API load errors
- [ ] Write component tests

#### 4.3.2 Markers

- [ ] Create `components/map/MapMarker.tsx`
- [ ] Add markers for all resources
- [ ] Color-code by category
- [ ] Add marker clustering (for 100+ markers)
- [ ] Optimize rendering performance
- [ ] Write tests

#### 4.3.3 Info Windows

- [ ] Create `components/map/MapInfoWindow.tsx`
- [ ] Show resource preview on marker click
- [ ] Display name, category, rating
- [ ] Add "View Details" button
- [ ] Write component tests
- [ ] **DEMO**: Click marker and show info window

### 4.4 Map/List Toggle

- [ ] Add toggle button (map view / list view)
- [ ] Sync state between views
- [ ] Persist preference
- [ ] Mobile-friendly toggle
- [ ] Write tests
- [ ] **DEMO**: Toggle between views

### 4.5 Distance Filter

- [ ] Create distance slider (1-50 miles)
- [ ] Filter resources by distance
- [ ] Update map bounds
- [ ] Show filtered count
- [ ] Write tests
- [ ] **DEMO**: Adjust slider and show filtering

**Deliverable**: Full location-based search with interactive map
**Review Point**: Demo map view with filtering

---

## Phase 5: Authentication (Week 3 Plan)

**Goal**: Users can sign in with phone number and manage profile.

**Estimated Time**: 2-3 sessions

**Dependencies**: Phase 2 (database), Phase 1 (UI)

### 5.1 Phone Authentication

#### 5.1.1 Auth UI Components

- [ ] Update or create PhoneAuth component
- [ ] Phone number input with formatting
- [ ] OTP code input (6 digits)
- [ ] Resend code button (60s cooldown)
- [ ] Loading states
- [ ] Error handling
- [ ] Write component tests
- [ ] Test accessibility

#### 5.1.2 Supabase Auth Integration

- [ ] Configure Supabase Auth for phone/SMS
- [ ] Implement sign-in flow
- [ ] Implement OTP verification
- [ ] Handle auth errors
- [ ] Write integration tests
- [ ] **DEMO**: Sign in with phone number

#### 5.1.3 Session Management

- [ ] Implement session persistence
- [ ] Create useAuth hook
- [ ] Handle token refresh
- [ ] Sign out functionality
- [ ] Write tests

### 5.2 User Profile

#### 5.2.1 Profile Page

- [ ] Create `app/profile/page.tsx`
- [ ] Display user info
- [ ] Edit name
- [ ] View favorites count
- [ ] View reviews count
- [ ] Delete account option
- [ ] Write tests
- [ ] **DEMO**: Show profile page

### 5.3 Protected Routes

- [ ] Create ProtectedRoute wrapper
- [ ] Redirect to login if not authenticated
- [ ] Update navigation based on auth state
- [ ] Show user menu when logged in
- [ ] Write tests

**Deliverable**: Working phone authentication
**Review Point**: Demo sign-in flow

---

## Phase 6: Favorites & Ratings (Week 3 continued)

**Goal**: Users can save favorites and rate resources.

**Estimated Time**: 1-2 sessions

**Dependencies**: Phase 5 (authentication)

### 6.1 Favorites

#### 6.1.1 FavoriteButton Component

- [ ] Create `components/user/FavoriteButton.tsx`
- [ ] Heart icon with active/inactive states
- [ ] Toggle favorite on click
- [ ] Require authentication
- [ ] Show auth modal if not logged in
- [ ] Optimistic updates
- [ ] Write component tests
- [ ] Test accessibility

#### 6.1.2 Favorites Integration

- [ ] Add favorites API to `lib/api/favorites.ts`
- [ ] Add FavoriteButton to ResourceCard
- [ ] Add FavoriteButton to ResourceDetail
- [ ] Implement useFavorites hook
- [ ] Write integration tests

#### 6.1.3 Favorites Page

- [ ] Create `app/favorites/page.tsx`
- [ ] Display user's favorites
- [ ] Show personal notes
- [ ] Remove from favorites
- [ ] Empty state
- [ ] Write tests
- [ ] **DEMO**: Add/remove favorites

### 6.2 Ratings

#### 6.2.1 RatingStars Component

- [ ] Create `components/user/RatingStars.tsx`
- [ ] Interactive star input
- [ ] Display-only star view
- [ ] Hover effects
- [ ] Write component tests
- [ ] Test accessibility

#### 6.2.2 Rating Integration

- [ ] Add ratings API to `lib/api/ratings.ts`
- [ ] Add rating UI to ResourceDetail
- [ ] Prevent multiple ratings per user
- [ ] Update resource rating average
- [ ] Show rating count
- [ ] Write integration tests
- [ ] **DEMO**: Rate a resource

**Deliverable**: Favorites and ratings working
**Review Point**: Demo favorites and rating flow

---

## Phase 7: Reviews (Week 4 Plan)

**Goal**: Users can write and read detailed reviews.

**Estimated Time**: 2 sessions

**Dependencies**: Phase 6 (ratings)

### 7.1 Review System

#### 7.1.1 ReviewForm Component

- [ ] Create `components/user/ReviewForm.tsx`
- [ ] Rating input
- [ ] Review text (500 char max)
- [ ] Pros/cons/tips fields
- [ ] "Was helpful" and "Would recommend" toggles
- [ ] Visited date picker
- [ ] Form validation
- [ ] Write component tests
- [ ] Test accessibility

#### 7.1.2 Review API

- [ ] Add reviews API to `lib/api/reviews.ts`
- [ ] Submit review
- [ ] Update review
- [ ] Prevent duplicate reviews
- [ ] Write integration tests

#### 7.1.3 ReviewsList Component

- [ ] Create `components/user/ReviewsList.tsx`
- [ ] Display all reviews for a resource
- [ ] Show reviewer name, date, rating
- [ ] Show helpful count
- [ ] Sort by helpfulness
- [ ] Pagination
- [ ] Write component tests

### 7.2 Review Helpfulness

#### 7.2.1 Helpfulness Voting

- [ ] Add helpful/not helpful buttons to ReviewCard
- [ ] Implement voting API
- [ ] Prevent multiple votes per review
- [ ] Update counts optimistically
- [ ] Write tests
- [ ] **DEMO**: Vote on review helpfulness

#### 7.2.2 Integration

- [ ] Add reviews to ResourceDetail page
- [ ] Show review count in ResourceCard
- [ ] Write integration tests
- [ ] **DEMO**: Write and view reviews

**Deliverable**: Full review system
**Review Point**: Demo writing and reading reviews

---

## Phase 8: Community Features (Week 4 continued)

**Goal**: Users can suggest resources and report issues.

**Estimated Time**: 1-2 sessions

**Dependencies**: Phase 5 (auth)

### 8.1 Resource Suggestions

#### 8.1.1 Suggestion Form

- [ ] Create `app/suggest-resource/page.tsx`
- [ ] Form with all required fields
- [ ] Validation
- [ ] Submit to suggestions table
- [ ] Confirmation message
- [ ] Write tests

#### 8.1.2 User Suggestions View

- [ ] Create `app/my-suggestions/page.tsx`
- [ ] Show user's suggestions
- [ ] Display status (pending/approved/rejected)
- [ ] Write tests
- [ ] **DEMO**: Submit a suggestion

### 8.2 Report Issues

#### 8.2.1 Report Form

- [ ] Add "Report a Problem" button to ResourceDetail
- [ ] Modal with issue types
- [ ] Description field
- [ ] Submit to resource_updates table
- [ ] Confirmation message
- [ ] Write tests
- [ ] **DEMO**: Report an issue

**Deliverable**: Community contribution features
**Review Point**: Demo suggestion and reporting

---

## Phase 9: Admin Dashboard (Week 4 continued)

**Goal**: Admins can manage resources and review submissions.

**Estimated Time**: 2 sessions

**Dependencies**: Phase 8 (suggestions)

### 9.1 Admin Access

- [ ] Create admin role check utility
- [ ] Create admin route middleware
- [ ] Update navigation for admins
- [ ] Write tests

### 9.2 Admin Dashboard

#### 9.2.1 Dashboard Page

- [ ] Create `app/admin/page.tsx`
- [ ] Display key metrics
- [ ] Total resources
- [ ] Pending suggestions
- [ ] Pending updates
- [ ] Recent activity
- [ ] Write tests

### 9.3 Resource Management

#### 9.3.1 Resource List

- [ ] Create `app/admin/resources/page.tsx`
- [ ] List all resources (paginated, searchable)
- [ ] Add new resource button
- [ ] Edit/delete actions
- [ ] Verification status
- [ ] Write tests

#### 9.3.2 Resource Form

- [ ] Create resource creation form
- [ ] Create resource editing form
- [ ] Validation
- [ ] Submit to database
- [ ] Trigger enrichment on creation
- [ ] Write tests
- [ ] **DEMO**: Add a new resource as admin

### 9.4 Suggestions Review

#### 9.4.1 Suggestions Queue

- [ ] Create `app/admin/suggestions/page.tsx`
- [ ] List pending suggestions
- [ ] View suggestion details
- [ ] Approve/reject actions
- [ ] Mark as duplicate
- [ ] Approval creates resource
- [ ] Write tests
- [ ] **DEMO**: Approve a suggestion

### 9.5 Update Requests Review

#### 9.5.1 Updates Queue

- [ ] Create `app/admin/updates/page.tsx`
- [ ] List pending update requests
- [ ] View current vs proposed values
- [ ] Apply/reject actions
- [ ] Update modifies resource
- [ ] Write tests
- [ ] **DEMO**: Apply an update request

**Deliverable**: Admin dashboard with moderation tools
**Review Point**: Full admin workflow demo

---

## Phase 10: AI Agents (Week 4 continued)

**Goal**: Automated resource enrichment and verification.

**Estimated Time**: 2-3 sessions

**Dependencies**: Phase 9 (admin features)

### 10.1 AI Agent Infrastructure

#### 10.1.1 Base Agent

- [ ] Create `lib/ai-agents/types.ts`
- [ ] Create `lib/ai-agents/agentRunner.ts`
- [ ] OpenAI client setup
- [ ] Error handling
- [ ] Logging to ai_agent_logs table
- [ ] Cost tracking
- [ ] Write tests

### 10.2 Enrichment Agent

#### 10.2.1 Geocoding

- [ ] Implement address geocoding via Google Geocoding API
- [ ] Update lat/lng on resource
- [ ] Handle errors
- [ ] Write tests

#### 10.2.2 Web Scraping

- [ ] Use Cheerio to scrape website
- [ ] Extract description
- [ ] Extract hours
- [ ] Extract services
- [ ] Write tests

#### 10.2.3 Categorization

- [ ] Use GPT-4o-mini to categorize resource
- [ ] Add relevant tags
- [ ] Update resource
- [ ] Write tests

#### 10.2.4 Completeness Score

- [ ] Calculate data completeness (0-100%)
- [ ] Update resource
- [ ] Write tests

#### 10.2.5 Integration

- [ ] Create API route `app/api/agents/enrich/route.ts`
- [ ] Accept resource ID
- [ ] Run enrichment
- [ ] Return results
- [ ] Write integration tests
- [ ] **DEMO**: Enrich a resource

### 10.3 Verification Agent

#### 10.3.1 Phone Verification

- [ ] Check phone number format
- [ ] Optional: Use Twilio Lookup (if budget allows)
- [ ] Update verification status
- [ ] Write tests

#### 10.3.2 Website Verification

- [ ] Check if website is accessible
- [ ] Check SSL certificate
- [ ] Update verification status
- [ ] Write tests

#### 10.3.3 Business Status

- [ ] Query Google Places API for business status
- [ ] Update resource if closed
- [ ] Write tests

#### 10.3.4 Integration

- [ ] Create API route `app/api/agents/verify/route.ts`
- [ ] Run verification checks
- [ ] Update verification score
- [ ] Flag low-scoring resources
- [ ] Write integration tests
- [ ] **DEMO**: Verify a resource

### 10.4 Scheduled Runs (Future)

- [ ] Create Vercel Cron job configuration
- [ ] Weekly enrichment for new resources
- [ ] Quarterly verification for all resources
- [ ] Document in DEPLOYMENT_GUIDE.md

**Deliverable**: Working AI enrichment and verification
**Review Point**: Demo AI agents in action

---

## Phase 11: PWA Setup (Week 5 Plan)

**Goal**: Make app installable as Progressive Web App.

**Estimated Time**: 1 session

**Dependencies**: Phase 3+ (core features)

### 11.1 PWA Configuration

- [ ] Install @ducanh2912/next-pwa
- [ ] Configure in next.config.ts
- [ ] Create manifest.json
- [ ] Generate app icons (192x192, 512x512)
- [ ] Add apple-touch-icon
- [ ] Test service worker
- [ ] Test offline functionality
- [ ] Test installation on iOS and Android
- [ ] **DEMO**: Install app to home screen

**Deliverable**: Installable PWA
**Review Point**: Demo installation flow

---

## Phase 12: Content Population (Week 5)

**Goal**: Add 50+ real Oakland resources.

**Estimated Time**: 2-3 hours (research intensive)

**Dependencies**: All features complete

### 12.1 Resource Research

- [ ] Research Oakland reentry resources
- [ ] Compile list of 50+ resources
- [ ] Verify phone numbers
- [ ] Verify addresses
- [ ] Verify eligibility requirements
- [ ] Distribute across categories

### 12.2 Data Entry

- [ ] Enter resources via admin dashboard
- [ ] Run AI enrichment on each
- [ ] Verify enrichment quality
- [ ] Add photos where possible
- [ ] Review completeness scores

**Deliverable**: 50+ verified resources
**Review Point**: Browse populated resource directory

---

## Phase 13: Testing & QA (Week 5)

**Goal**: Comprehensive testing before launch.

**Estimated Time**: 1-2 sessions

**Dependencies**: All features complete

### 13.1 Automated Testing

- [ ] Run full test suite
- [ ] Achieve 70%+ coverage
- [ ] Run E2E tests
- [ ] Fix failing tests

### 13.2 Manual Testing

#### 13.2.1 Desktop Testing

- [ ] Test in Chrome
- [ ] Test in Safari
- [ ] Test in Firefox
- [ ] Test in Edge

#### 13.2.2 Mobile Testing

- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Test PWA installation
- [ ] Test offline mode

#### 13.2.3 Accessibility Testing

- [ ] Run Lighthouse audit (target >90)
- [ ] Test with keyboard navigation
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Run WAVE accessibility audit
- [ ] Fix accessibility issues

#### 13.2.4 Performance Testing

- [ ] Run Lighthouse performance audit
- [ ] Test on 3G throttling
- [ ] Optimize images
- [ ] Check bundle size
- [ ] Optimize database queries

### 13.3 User Flow Testing

- [ ] First-time user flow
- [ ] Returning user flow
- [ ] Review writing flow
- [ ] Suggestion submission flow
- [ ] Admin approval flow

**Deliverable**: Tested, polished app
**Review Point**: Full walkthrough demo

---

## Phase 14: Launch Preparation (Week 5)

**Goal**: Deploy to production and soft launch.

**Estimated Time**: 1 session

**Dependencies**: Phase 13 (testing complete)

### 14.1 Pre-Launch Checklist

- [ ] All environment variables configured in Vercel
- [ ] Database migrations run on production
- [ ] SSL certificate verified
- [ ] Analytics configured
- [ ] Error tracking enabled (Vercel logs)
- [ ] Backup system tested
- [ ] Rate limiting implemented
- [ ] Admin account created

### 14.2 Deployment

- [ ] Deploy to Vercel production
- [ ] Run smoke tests on production
- [ ] Verify critical flows work
- [ ] Monitor error logs

### 14.3 Soft Launch

- [ ] Share with 5-10 beta users
- [ ] Gather initial feedback
- [ ] Monitor usage
- [ ] Fix urgent issues
- [ ] Document feedback for Phase 2

**Deliverable**: Live production app
**Review Point**: Celebrate! 🎉

---

## Ongoing Maintenance

### Daily Tasks (Post-Launch)

- [ ] Check error logs
- [ ] Monitor user activity
- [ ] Respond to user feedback
- [ ] Fix urgent bugs

### Weekly Tasks

- [ ] Review metrics
- [ ] Analyze user feedback
- [ ] Prioritize improvements
- [ ] Plan next sprint

---

## Current Status

**Phase**: 0 (Foundation & Quality Infrastructure)
**Progress**: 0%
**Next Session Goal**: Complete Phase 0 (testing, linting, environment validation)

---

## Notes

- Each phase has a **Review Point** - stop and demo progress
- Write tests alongside features (TDD preferred)
- Commit frequently (after each completed task)
- Update PROGRESS.md after each session
- Document decisions in ARCHITECTURE_DECISIONS.md
- Ask for user feedback at review points

---

**Remember**: It's better to complete fewer features thoroughly than to rush through many features poorly. Quality over quantity!
