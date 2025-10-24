# Reentry Map - Technical Architecture

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  Next.js 15 App (React 19 + TypeScript + Tailwind CSS)     │
│                   Progressive Web App                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS / WebSocket
                     │
┌────────────────────▼────────────────────────────────────────┐
│                     API Layer (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Route Handlers│  │  AI Agents   │  │  Cron Jobs   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────┬────────────────────┬───────────────────┘
                     │                    │
        ┌────────────┴────────┐          │
        │                     │          │
┌───────▼─────────┐  ┌───────▼─────────┐│
│   Supabase      │  │  External APIs  ││
│  - PostgreSQL   │  │  - Google Maps  ││
│  - Auth         │  │  - OpenAI       ││
│  - Storage      │  │  - Phone Valid  ││
│  - Realtime     │  └─────────────────┘│
└─────────────────┘                      │
```

## Tech Stack (Latest Stable Versions)

### Frontend

- **Framework**: Next.js 16.0.x (App Router, React Server Components)
- **React**: React 19.x (latest stable)
- **Language**: TypeScript 5.7.x
- **Styling**: Tailwind CSS 4.0.x (new CSS-first engine)
- **UI Components**: shadcn/ui (latest) + Lucide React 0.460.x
- **State Management**: React Hooks + Server Components
- **Maps**: @googlemaps/js-api-loader 1.16.x
- **PWA**: @ducanh2912/next-pwa 10.x (Next.js 16 compatible)
- **Forms**: react-hook-form 7.53.x + zod 3.23.x

### Backend

- **Platform**: Next.js 15 Route Handlers (App Router)
- **Database**: Supabase (PostgreSQL 16)
- **ORM/Client**: @supabase/ssr 0.5.x (latest SSR package)
- **Authentication**: Supabase Auth (Phone/SMS OTP)
- **Storage**: Supabase Storage
- **Realtime**: Supabase Realtime

### AI & Automation

- **LLM**: OpenAI SDK 4.68.x
  - Model: gpt-4o-mini (cost-effective, fast)
  - Vision: gpt-4o (for future document scanning)
- **Geocoding**: Google Geocoding API
- **Phone Validation**: AbstractAPI or Twilio Lookup
- **Web Scraping**: cheerio 1.0.x

### Infrastructure

- **Hosting**: Vercel (Next.js 16 optimized)
- **Database**: Supabase Cloud
- **CDN**: Vercel Edge Network
- **Analytics**: Vercel Analytics + Speed Insights
- **Monitoring**: Vercel Logs
- **Cron Jobs**: Vercel Cron (native)

### Development Tools

- **Version Control**: Git + GitHub
- **Package Manager**: npm 10.x or pnpm 9.x (faster)
- **Linting**: ESLint 9.x (flat config) + eslint-config-prettier
- **Formatting**: Prettier 3.3.x + prettier-plugin-tailwindcss
- **Type Checking**: TypeScript 5.7.x (strict mode) + @total-typescript/ts-reset
- **Environment Validation**: @t3-oss/env-nextjs + zod 3.23.x
- **Git Hooks**: husky 9.x + lint-staged

### Testing & Quality

- **Unit Testing**: Vitest 2.x
  - @vitejs/plugin-react for JSX support
  - jsdom for DOM simulation
  - @testing-library/react 16.x for component testing
  - @testing-library/dom for DOM utilities
  - vite-tsconfig-paths for import aliases
- **E2E Testing**: Playwright 1.48.x
  - Configured for Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
  - Headless by default for CI/CD
  - Headed mode available for debugging
- **Coverage**: @vitest/coverage-v8
  - Target: 70%+ coverage for lines, functions, branches, statements
- **Code Quality**:
  - Pre-commit hooks run ESLint + Prettier on staged files
  - TypeScript strict mode with enhanced type safety (ts-reset)
  - Environment variable validation at build time
- **Build Analysis**: @next/bundle-analyzer
  - Interactive bundle size visualization
  - Dependency analysis
- **Commit Standards**: Commitlint
  - Conventional Commits enforced
  - Automated via git hooks

## Testing Strategy

### Unit Testing Approach

**Framework**: Vitest + React Testing Library

**What We Test**:

- Client Components (interactive UI elements)
- Utility functions (formatting, validation, calculations)
- Custom React hooks
- API route handlers (mocked external dependencies)

**What We Don't Test**:

- Server Components (tested via E2E instead)
- Third-party library internals
- Next.js framework behavior

**Test File Structure**:

```
__tests__/
├── components/
│   ├── ThemeSwitcher.test.tsx
│   ├── ResourceCard.test.tsx
│   └── SearchBar.test.tsx
├── lib/
│   ├── utils/formatting.test.ts
│   └── utils/validation.test.ts
└── hooks/
    └── useAuth.test.ts
```

**Coverage Targets**:

- Lines: 70%+
- Functions: 70%+
- Branches: 70%+
- Statements: 70%+

**Best Practices**:

- Mock external dependencies (Supabase, APIs)
- Test user behavior, not implementation
- Use semantic queries (getByRole, getByLabelText)
- Test accessibility (keyboard nav, screen readers)

### E2E Testing Approach

**Framework**: Playwright

**Browser Coverage**:

- Desktop: Chromium, Firefox, WebKit
- Mobile: Chrome (Pixel 5), Safari (iPhone 12)

**What We Test**:

- Critical user flows (auth, search, favorites, reviews)
- Cross-browser compatibility
- Mobile responsiveness
- Server Component rendering
- API integration (with real Supabase test DB)

**Test File Structure**:

```
e2e/
├── homepage.spec.ts          # Landing page smoke tests
├── auth.spec.ts              # Phone auth flow
├── search.spec.ts            # Resource search
├── resource-detail.spec.ts   # View resource details
├── favorites.spec.ts         # Favorite/unfavorite
└── reviews.spec.ts           # Add/view reviews
```

**Execution Modes**:

- `npm run test:e2e` - Headless (CI/CD, fast feedback)
- `npm run test:e2e:ui` - Playwright UI (debugging, demos)
- `npm run test:e2e:headed` - Headed mode (browser visible)

**Best Practices**:

- Use data-testid for stable selectors
- Test against staging environment in CI
- Mock external APIs (Google Maps, OpenAI)
- Clean up test data after runs

### Quality Gates

**Pre-Commit** (automated via husky):

- ESLint on staged files
- Prettier on staged files
- TypeScript type check
- Affected unit tests

**Pre-Push** (manual or CI):

- All unit tests pass
- E2E smoke tests pass
- Build succeeds
- No TypeScript errors

**Pre-Deploy** (CI/CD):

- Full test suite passes
- Coverage meets 70% threshold
- Bundle size within limits
- Lighthouse score > 90

**Quality Commands**:

```bash
npm run quality        # Quick: Lint + Type + Test + Build
npm run quality:full   # Full: Above + E2E tests
```

## Code Quality Workflow

### Development Workflow

1. **Start Work**

   ```bash
   git checkout -b feature/my-feature
   npm run dev
   ```

2. **Make Changes**
   - Write code
   - Write tests (TDD recommended)
   - Run `npm test` (watch mode)

3. **Before Commit**
   - Pre-commit hooks auto-run:
     - ESLint fixes staged files
     - Prettier formats staged files
     - Type check passes
   - Manual: `npm run quality`

4. **Commit**

   ```bash
   git add .
   git commit -m "feat: add resource search"
   # Commitlint validates message format
   ```

5. **Before Demo/PR**
   - Run `npm run quality:full`
   - Fix any failures
   - Verify app works in browser

### Git Commit Standards

**Format**: `type(scope): subject`

**Types**:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Formatting (no logic changes)
- `refactor:` - Code restructuring
- `test:` - Add/update tests
- `chore:` - Tooling, deps, config

**Examples**:

```bash
feat: add phone auth with OTP
fix: resolve map marker clustering bug
docs: update SETUP_GUIDE with database steps
test: add unit tests for ResourceCard
chore: upgrade Next.js to 16.0.1
```

### Continuous Integration

**GitHub Actions** (`.github/workflows/ci.yml`):

**On Push/PR**:

1. Install dependencies
2. Run ESLint
3. Run TypeScript check
4. Run Prettier check
5. Run unit tests with coverage
6. Run E2E tests (headless)
7. Build application
8. Report results to PR

**On Main Branch**:

- Deploy to Vercel (auto)
- Run full E2E suite against staging
- Monitor bundle size
- Update coverage reports

### Environment Validation

**T3 Env** (`lib/env.ts`):

**Build-Time Checks**:

- Required env vars must be present
- Type-safe access to all variables
- Client/server separation enforced
- Invalid values cause build failure

**Usage**:

```typescript
// ❌ NEVER use process.env directly
const url = process.env.NEXT_PUBLIC_SUPABASE_URL

// ✅ ALWAYS use typed env import
import { env } from '@/lib/env'
const url = env.NEXT_PUBLIC_SUPABASE_URL // Type-safe!
```

**Benefits**:

- Catch missing env vars before deployment
- TypeScript autocomplete for env vars
- Prevent server secrets leaking to client
- Clear validation errors with helpful messages

## Database Schema

### Core Tables

#### resources

Primary table for all reentry resources.

```sql
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Information
  name TEXT NOT NULL,
  description TEXT,
  services_offered TEXT[],

  -- Contact
  phone TEXT,
  phone_verified BOOLEAN DEFAULT false,
  phone_last_verified TIMESTAMPTZ,
  email TEXT,
  website TEXT,

  -- Location
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,

  -- Schedule
  hours JSONB,
  timezone TEXT DEFAULT 'America/Los_Angeles',

  -- Categorization
  primary_category TEXT NOT NULL,
  categories TEXT[],
  tags TEXT[],

  -- Eligibility
  eligibility_requirements TEXT,
  accepts_records BOOLEAN DEFAULT true,
  appointment_required BOOLEAN DEFAULT false,

  -- Media
  photos JSONB[],
  logo_url TEXT,

  -- AI Metadata
  ai_discovered BOOLEAN DEFAULT false,
  ai_enriched BOOLEAN DEFAULT false,
  ai_last_verified TIMESTAMPTZ,
  ai_verification_score DOUBLE PRECISION,
  data_completeness_score DOUBLE PRECISION,

  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_date TIMESTAMPTZ,

  -- Community Stats
  rating_average DOUBLE PRECISION DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'active',
  status_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable PostGIS for location queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add spatial index
CREATE INDEX idx_resources_location ON resources
USING GIST (ST_MakePoint(longitude, latitude)::geography);

-- Add search index
CREATE INDEX idx_resources_search ON resources
USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Add category index
CREATE INDEX idx_resources_category ON resources(primary_category);
CREATE INDEX idx_resources_status ON resources(status) WHERE status = 'active';
CREATE INDEX idx_resources_rating ON resources(rating_average DESC);
```

#### users

Extended user profile (Supabase Auth integration).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

#### user_favorites

Users' saved/favorited resources.

```sql
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource_id)
);

CREATE INDEX idx_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_favorites_resource ON user_favorites(resource_id);

-- RLS Policies
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON user_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON user_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON user_favorites FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own favorites"
  ON user_favorites FOR UPDATE
  USING (auth.uid() = user_id);
```

#### resource_ratings

User ratings for resources (1-5 stars).

```sql
CREATE TABLE resource_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource_id)
);

CREATE INDEX idx_ratings_resource ON resource_ratings(resource_id);
CREATE INDEX idx_ratings_user ON resource_ratings(user_id);

-- RLS Policies
ALTER TABLE resource_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view ratings"
  ON resource_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own ratings"
  ON resource_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON resource_ratings FOR UPDATE
  USING (auth.uid() = user_id);
```

#### resource_reviews

Detailed user reviews with text feedback.

```sql
CREATE TABLE resource_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Review content
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  visited_date DATE,
  was_helpful BOOLEAN,
  would_recommend BOOLEAN,
  pros TEXT,
  cons TEXT,
  tips TEXT,

  -- Verification
  verified_visit BOOLEAN DEFAULT false,

  -- Moderation
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  approved BOOLEAN DEFAULT true,
  moderated_by UUID REFERENCES users(id),
  moderated_at TIMESTAMPTZ,

  -- Community engagement
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, resource_id)
);

CREATE INDEX idx_reviews_resource ON resource_reviews(resource_id, created_at DESC);
CREATE INDEX idx_reviews_user ON resource_reviews(user_id);
CREATE INDEX idx_reviews_helpful ON resource_reviews(helpful_count DESC);

-- RLS Policies
ALTER TABLE resource_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view approved reviews"
  ON resource_reviews FOR SELECT
  USING (approved = true);

CREATE POLICY "Users can insert own reviews"
  ON resource_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON resource_reviews FOR UPDATE
  USING (auth.uid() = user_id);
```

#### review_helpfulness

Users vote on review helpfulness.

```sql
CREATE TABLE review_helpfulness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES resource_reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, review_id)
);

CREATE INDEX idx_helpfulness_review ON review_helpfulness(review_id);

-- RLS Policies
ALTER TABLE review_helpfulness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can vote on reviews"
  ON review_helpfulness FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all votes"
  ON review_helpfulness FOR SELECT
  USING (true);
```

#### resource_suggestions

User-submitted resource suggestions.

```sql
CREATE TABLE resource_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Suggested resource details
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  description TEXT,
  category TEXT,

  -- Context
  reason TEXT,
  personal_experience TEXT,

  -- Review workflow
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, duplicate
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- If approved
  created_resource_id UUID REFERENCES resources(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suggestions_status ON resource_suggestions(status);
CREATE INDEX idx_suggestions_user ON resource_suggestions(suggested_by);

-- RLS Policies
ALTER TABLE resource_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suggestions"
  ON resource_suggestions FOR SELECT
  USING (auth.uid() = suggested_by);

CREATE POLICY "Users can create suggestions"
  ON resource_suggestions FOR INSERT
  WITH CHECK (auth.uid() = suggested_by);
```

#### resource_updates

User-reported updates/corrections to resources.

```sql
CREATE TABLE resource_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,

  update_type TEXT NOT NULL, -- hours_changed, closed, moved, phone_changed, etc.
  old_value TEXT,
  new_value TEXT,
  description TEXT,

  status TEXT DEFAULT 'pending', -- pending, applied, rejected
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_updates_resource ON resource_updates(resource_id);
CREATE INDEX idx_updates_status ON resource_updates(status);

-- RLS Policies
ALTER TABLE resource_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit updates"
  ON resource_updates FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view all updates"
  ON resource_updates FOR SELECT
  USING (true);
```

#### ai_agent_logs

Logging for AI agent operations.

```sql
CREATE TABLE ai_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL, -- discovery, enrichment, verification, categorization
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,

  action TEXT NOT NULL,
  input JSONB,
  output JSONB,

  success BOOLEAN,
  error_message TEXT,
  confidence_score DOUBLE PRECISION,

  cost DOUBLE PRECISION, -- API costs in USD
  duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_logs_type ON ai_agent_logs(agent_type, created_at DESC);
CREATE INDEX idx_agent_logs_resource ON ai_agent_logs(resource_id);
```

## Database Functions & Triggers

### Auto-update resource rating average

```sql
CREATE OR REPLACE FUNCTION update_resource_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE resources
  SET
    rating_average = (
      SELECT COALESCE(AVG(rating), 0)::DOUBLE PRECISION
      FROM resource_ratings
      WHERE resource_id = COALESCE(NEW.resource_id, OLD.resource_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM resource_ratings
      WHERE resource_id = COALESCE(NEW.resource_id, OLD.resource_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.resource_id, OLD.resource_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_resource_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON resource_ratings
FOR EACH ROW
EXECUTE FUNCTION update_resource_rating();
```

### Auto-update review count

```sql
CREATE OR REPLACE FUNCTION update_resource_review_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE resources
  SET
    review_count = (
      SELECT COUNT(*)
      FROM resource_reviews
      WHERE resource_id = COALESCE(NEW.resource_id, OLD.resource_id)
        AND approved = true
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.resource_id, OLD.resource_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_resource_review_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON resource_reviews
FOR EACH ROW
EXECUTE FUNCTION update_resource_review_count();
```

### Auto-update review helpfulness count

```sql
CREATE OR REPLACE FUNCTION update_review_helpfulness_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE resource_reviews
  SET
    helpful_count = (
      SELECT COUNT(*)
      FROM review_helpfulness
      WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)
        AND helpful = true
    ),
    not_helpful_count = (
      SELECT COUNT(*)
      FROM review_helpfulness
      WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)
        AND helpful = false
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_review_helpfulness_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON review_helpfulness
FOR EACH ROW
EXECUTE FUNCTION update_review_helpfulness_count();
```

### Auto-create user profile on signup

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, phone)
  VALUES (NEW.id, NEW.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
```

## API Routes Structure

```
app/api/
├── resources/
│   ├── route.ts              # GET (list), POST (create)
│   ├── [id]/
│   │   ├── route.ts          # GET (detail), PATCH (update), DELETE
│   │   ├── favorite/route.ts # POST (toggle favorite)
│   │   ├── rate/route.ts     # POST (add/update rating)
│   │   └── review/route.ts   # POST (add review), GET (list reviews)
│   ├── search/route.ts       # POST (advanced search)
│   └── nearby/route.ts       # GET (location-based search)
├── favorites/route.ts        # GET (user's favorites)
├── reviews/
│   ├── [id]/
│   │   └── helpful/route.ts  # POST (mark review helpful)
│   └── my-reviews/route.ts   # GET (user's reviews)
├── suggestions/
│   ├── route.ts              # GET (list), POST (create)
│   └── [id]/
│       └── route.ts          # PATCH (admin: approve/reject)
├── agents/
│   ├── discover/route.ts     # POST (run discovery agent)
│   ├── enrich/route.ts       # POST (enrich resource)
│   └── verify/route.ts       # POST (verify resources)
├── cron/
│   └── agents/route.ts       # GET (scheduled agent runs)
└── auth/
    └── profile/route.ts      # GET, PATCH (user profile)
```

## File Structure

```
reentry-map/
├── app/
│   ├── layout.tsx                    # Root layout with providers
│   ├── page.tsx                      # Home page (map + search)
│   ├── globals.css                   # Global styles
│   ├── resources/
│   │   ├── page.tsx                  # Resource list view
│   │   └── [id]/
│   │       └── page.tsx              # Resource detail page
│   ├── favorites/
│   │   └── page.tsx                  # User's saved resources
│   ├── suggest-resource/
│   │   └── page.tsx                  # Suggest new resource form
│   ├── my-reviews/
│   │   └── page.tsx                  # User's reviews
│   ├── admin/
│   │   ├── page.tsx                  # Admin dashboard
│   │   ├── resources/
│   │   │   └── page.tsx              # Manage resources
│   │   └── suggestions/
│   │       └── page.tsx              # Review suggestions
│   └── api/                          # API routes (see above)
├── components/
│   ├── ui/                           # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   └── ...
│   ├── resources/
│   │   ├── ResourceCard.tsx          # Resource card component
│   │   ├── ResourceList.tsx          # List of resources
│   │   ├── ResourceMap.tsx           # Map view
│   │   ├── ResourceDetail.tsx        # Detailed resource view
│   │   └── ResourceFilters.tsx       # Category/tag filters
│   ├── search/
│   │   ├── SearchBar.tsx             # Main search input
│   │   └── SearchFilters.tsx         # Advanced filters
│   ├── user/
│   │   ├── FavoriteButton.tsx        # Toggle favorite
│   │   ├── RatingStars.tsx           # Star rating component
│   │   ├── ReviewForm.tsx            # Write review form
│   │   ├── ReviewsList.tsx           # Display reviews
│   │   └── UserProfile.tsx           # User profile display
│   ├── auth/
│   │   ├── AuthModal.tsx             # Sign in/up modal
│   │   ├── PhoneAuth.tsx             # Phone OTP authentication
│   │   └── ProtectedRoute.tsx        # Auth wrapper
│   ├── admin/
│   │   ├── AdminNav.tsx              # Admin navigation
│   │   ├── ResourceForm.tsx          # Add/edit resource
│   │   └── SuggestionReview.tsx      # Review suggestions
│   ├── layout/
│   │   ├── Header.tsx                # Site header
│   │   ├── Footer.tsx                # Site footer
│   │   ├── Navigation.tsx            # Main navigation
│   │   └── MobileNav.tsx             # Mobile menu
│   └── shared/
│       ├── LoadingSpinner.tsx        # Loading indicator
│       ├── ErrorMessage.tsx          # Error display
│       └── EmptyState.tsx            # No results state
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client
│   │   └── middleware.ts             # Auth middleware
│   ├── ai-agents/
│   │   ├── types.ts                  # Agent types
│   │   ├── discoveryAgent.ts         # Find new resources
│   │   ├── enrichmentAgent.ts        # Fill in details
│   │   ├── verificationAgent.ts      # Verify accuracy
│   │   ├── categorizationAgent.ts    # Auto-categorize
│   │   └── agentRunner.ts            # Orchestrate agents
│   ├── api/
│   │   ├── resources.ts              # Resource API calls
│   │   ├── favorites.ts              # Favorites API calls
│   │   ├── reviews.ts                # Reviews API calls
│   │   └── suggestions.ts            # Suggestions API calls
│   ├── hooks/
│   │   ├── useResources.ts           # Fetch resources
│   │   ├── useResource.ts            # Fetch single resource
│   │   ├── useFavorites.ts           # User favorites
│   │   ├── useReviews.ts             # Resource reviews
│   │   ├── useAuth.ts                # Authentication
│   │   └── useLocation.ts            # User geolocation
│   ├── utils/
│   │   ├── geocoding.ts              # Geocoding utilities
│   │   ├── distance.ts               # Distance calculations
│   │   ├── formatting.ts             # Date/phone formatting
│   │   ├── validation.ts             # Input validation
│   │   └── constants.ts              # App constants
│   └── types/
│       ├── database.ts               # Database types
│       ├── api.ts                    # API types
│       └── index.ts                  # Exported types
├── public/
│   ├── manifest.json                 # PWA manifest
│   ├── icons/                        # App icons
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── apple-touch-icon.png
│   └── images/                       # Static images
├── supabase/
│   ├── migrations/
│   │   ├── 20250101000000_initial_schema.sql
│   │   ├── 20250101000001_rls_policies.sql
│   │   ├── 20250101000002_functions_triggers.sql
│   │   └── 20250101000003_seed_data.sql
│   └── config.toml                   # Supabase config
├── .env.local                        # Environment variables
├── .env.example                      # Example env vars
├── .eslintrc.json                    # ESLint config
├── .prettierrc                       # Prettier config
├── next.config.ts                    # Next.js config
├── tailwind.config.ts                # Tailwind config
├── tsconfig.json                     # TypeScript config
├── package.json                      # Dependencies
├── pnpm-lock.yaml                    # Lock file (if using pnpm)
└── README.md                         # Project documentation
```

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaxxx...
GOOGLE_MAPS_KEY=AIzaxxx...

# OpenAI
OPENAI_API_KEY=sk-xxx...

# Optional: Phone Validation
ABSTRACT_API_KEY=xxx...

# Optional: Cron Secret
CRON_SECRET=xxx...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3003
```

## Security Considerations

### Authentication

- Phone-based OTP (SMS) via Supabase Auth
- No passwords to manage
- Session-based authentication
- HTTP-only cookies for tokens

### Row Level Security (RLS)

- All tables have RLS enabled
- Users can only access/modify their own data
- Resources are public (read-only for anonymous)
- Admin actions require is_admin flag

### API Security

- Rate limiting on all endpoints
- Input validation using Zod schemas
- SQL injection prevention (parameterized queries)
- XSS protection (React escapes by default)
- CORS configured for app domain only

### Data Privacy

- Phone numbers hashed
- User data encrypted at rest (Supabase)
- HTTPS enforced (Vercel)
- No PII in logs
- GDPR-compliant data deletion

## Performance Optimizations

### Next.js 16 Features

- React Server Components (reduce client JS)
- Streaming SSR for faster initial load
- Partial Prerendering (PPR) for hybrid pages
- Image Optimization with next/image
- Font Optimization with next/font

### Database

- Proper indexing on frequently queried fields
- PostGIS for efficient geospatial queries
- Connection pooling via Supabase
- Query result caching where appropriate

### Frontend

- Code splitting by route
- Lazy loading for heavy components
- Image lazy loading and responsive images
- PWA caching for offline support
- Debounced search inputs

### API

- Response caching with Cache-Control headers
- Pagination for large result sets
- Selective field fetching (don't over-fetch)
- Background jobs for heavy operations (agents)

## Monitoring & Analytics

### Vercel Analytics

- Core Web Vitals monitoring
- Page view tracking
- User flow analysis

### Error Tracking

- Vercel error logging
- Client-side error boundary
- API error responses logged

### Performance

- Vercel Speed Insights
- Lighthouse CI in deployment
- Bundle size monitoring

### Custom Metrics

- Resource search queries
- User engagement (favorites, reviews)
- AI agent success rates
- API response times
