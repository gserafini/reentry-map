# Architecture Decision Records (ADR)

This document tracks significant architectural and technical decisions made during the development of Reentry Map.

## Format

Each decision follows this template:

```markdown
## ADR-XXX: Decision Title

**Date**: YYYY-MM-DD
**Status**: Accepted | Proposed | Deprecated | Superseded
**Deciders**: [Who made the decision]
**Tags**: [relevant tags]

### Context

What is the issue/situation we're addressing?

### Decision

What did we decide to do?

### Rationale

Why did we make this decision?

### Consequences

What are the implications (positive and negative)?

### Alternatives Considered

What other options did we evaluate?
```

---

## ADR-001: Use Next.js 16 with App Router

**Date**: 2025-10-23
**Status**: Accepted
**Deciders**: Gabriel Serafini, Claude Code
**Tags**: framework, react, ssr

### Context

Need to select a modern React framework for building a progressive web app with server-side rendering, authentication, and database integration.

### Decision

Use Next.js 16 with the App Router (not Pages Router).

### Rationale

- Latest stable version with React 19 support
- Excellent server components for reduced client JS
- Built-in API routes for backend logic
- Optimal Vercel deployment integration
- Strong Supabase integration patterns
- Progressive Web App support
- Streaming SSR for better performance
- Active community and extensive documentation

### Consequences

**Positive**:

- Modern React features (Server Components, Streaming)
- Excellent performance out of the box
- Strong typing with TypeScript
- Great developer experience

**Negative**:

- App Router is still evolving (some patterns not fully stabilized)
- Learning curve for Server Components paradigm
- Some third-party libraries may not be compatible yet

### Alternatives Considered

- **Remix**: Excellent routing but less mature ecosystem
- **Create React App**: Too basic, lacks SSR
- **Vite + React**: More configuration needed, no SSR built-in

---

## ADR-002: Use Supabase for Backend Services

**Date**: 2025-10-23
**Status**: Accepted
**Deciders**: Gabriel Serafini
**Tags**: database, auth, backend

### Context

Need a backend solution for PostgreSQL database, authentication, and real-time subscriptions.

### Decision

Use Supabase as the backend-as-a-service platform.

### Rationale

- PostgreSQL 16 with PostGIS for geospatial queries
- Built-in authentication with phone/SMS OTP
- Row Level Security for data protection
- Realtime subscriptions for live updates
- Storage for images/documents
- Edge Functions for serverless compute
- Excellent Next.js integration via @supabase/ssr
- Generous free tier for development

### Consequences

**Positive**:

- Fast development with managed infrastructure
- Built-in security features
- Scalable to production
- Cost-effective for MVP

**Negative**:

- Vendor lock-in (mitigated by using standard PostgreSQL)
- Some advanced PostgreSQL features limited
- Performance depends on Supabase SLA

### Alternatives Considered

- **Firebase**: Good but less SQL-focused, weaker for complex queries
- **AWS RDS + Cognito**: More complex setup, higher cost
- **Self-hosted PostgreSQL**: More control but significantly more operational overhead

---

## ADR-003: TypeScript in Strict Mode

**Date**: 2025-10-23
**Status**: Accepted
**Deciders**: Gabriel Serafini, Claude Code
**Tags**: typescript, type-safety

### Context

Need to decide on TypeScript configuration and strictness level.

### Decision

Use TypeScript in strict mode with additional type safety via ts-reset.

### Rationale

- Catch errors at compile time vs runtime
- Better IDE autocomplete and refactoring
- Self-documenting code with types
- Easier onboarding for new developers
- Industry best practice for production apps

### Consequences

**Positive**:

- Fewer runtime errors
- Better code maintainability
- Improved developer experience
- Easier to refactor

**Negative**:

- Initial development slightly slower
- Some third-party libraries have poor types
- Learning curve for less experienced developers

### Alternatives Considered

- **JavaScript**: Faster initially but more bugs in production
- **TypeScript non-strict**: Middle ground but loses key benefits

---

## ADR-004: Tailwind CSS for Styling

**Date**: 2025-10-23
**Status**: Accepted
**Deciders**: Gabriel Serafini
**Tags**: css, styling, ui

### Context

Need a styling solution that enables rapid development, mobile-first design, and consistent UI.

### Decision

Use Tailwind CSS 4.0 as the primary styling framework.

### Rationale

- Utility-first approach for rapid development
- Mobile-first by default
- Excellent dark mode support
- Minimal bundle size (only used classes included)
- Strong component library ecosystem
- Great documentation and community
- JIT compiler for development speed

### Consequences

**Positive**:

- Fast UI development
- Consistent design system
- Small production bundle
- No CSS naming conflicts
- Easy to customize

**Negative**:

- HTML can be verbose with many classes
- Learning curve for developers unfamiliar with utility CSS
- Some design decisions constrained by default theme

### Alternatives Considered

- **CSS Modules**: More traditional but slower development
- **Styled Components**: Runtime overhead, not optimal for SSR
- **Vanilla CSS**: Too much boilerplate, hard to maintain

---

## ADR-005: Component Library Selection (Revised)

**Date**: 2025-10-24 (Updated from 2025-10-23)
**Status**: ✅ Accepted - Material UI v7 (Latest)
**Previous Decision**: HeroUI (Superseded 2025-10-24)
**Deciders**: Gabriel Serafini, Claude Code
**Tags**: ui, components, accessibility

### Context

Need to choose a component library that provides excellent accessibility, React 19 compatibility, and comprehensive components. Initially chose HeroUI, but discovered React 19 incompatibility issues (v2.8.5 built for React 18).

### Decision

**Use Material UI (MUI) v7** (latest version) as the primary component library for the application.

### Revision History

- **2025-10-23**: Initially chose HeroUI for accessibility and Tailwind integration
- **2025-10-24**: Switched to Material UI due to React 19 compatibility and maturity

### Options

#### Option A: Continue with shadcn/ui

**Pros**:

- Already partially implemented in project
- Copy-paste approach gives full control
- Radix UI primitives are excellent
- Flexible customization
- No additional dependencies

**Cons**:

- Need to implement each component manually
- More development time
- No MCP server support for AI assistance
- Accessibility features need manual implementation
- Less comprehensive out of the box

#### Option B: HeroUI (Initially Chosen, Then Superseded)

**Pros**:

- Full component library ready to use
- Built-in accessibility (WAI-ARIA compliant)
- Zero runtime styles (Tailwind-based)
- MCP server available for AI-assisted development
- Better default aesthetics
- Keyboard navigation built-in
- Multiple themes available
- Specifically designed for Next.js App Router

**Cons**:

- **React 19 incompatibility** (v2.8.5 built for React 18) 🚫
- Build errors with createContext
- Alpha v3 not production-ready
- Smaller community than MUI
- Less comprehensive documentation

#### Option C: Material UI (MUI) v7 ✅ CHOSEN

**Pros**:

- **Full React 19 support** (officially compatible)
- Industry standard since 2014, battle-tested
- 90+ comprehensive components
- Excellent TypeScript support
- WAI-ARIA accessibility built-in
- Works with both Server and Client Components
- Massive community and ecosystem
- Extensive documentation and examples
- Theming system with emotion/styled-components
- Mobile-first responsive design
- Can be styled with Tailwind via tss-react

**Cons**:

- Slightly larger bundle than HeroUI
- Uses CSS-in-JS (emotion) not pure Tailwind
- Need to configure theme provider

### Rationale

**Material UI v6 was chosen** for the following reasons:

1. **React 19 Compatibility**: Official support, no build errors
2. **Production Ready**: Mature, stable, used by thousands of companies
3. **Accessibility First**: WAI-ARIA compliance critical for reentry population
4. **Comprehensive**: 90+ components vs HeroUI's ~50
5. **TypeScript**: Built TypeScript-first for type safety
6. **Server Components**: Works seamlessly with Next.js 15+ SSR
7. **Community**: Massive ecosystem, instant solutions to problems
8. **Longevity**: Proven track record, not going anywhere

### Migration Path

1. Document current shadcn/ui components in use
2. Install HeroUI and MCP server
3. Replace components one-by-one with HeroUI equivalents
4. Test accessibility with screen readers
5. Update documentation

### Consequences

**Positive**:

- React 19 compatibility eliminates build errors
- Production-ready, battle-tested component library
- Comprehensive 90+ components accelerate development
- Built-in accessibility (WAI-ARIA compliant) - critical for reentry population
- Excellent TypeScript support and type safety
- Works with both Server and Client Components
- Massive community support and ecosystem
- Dark mode support out of the box

**Negative**:

- Slightly larger bundle than HeroUI (~80KB gzipped)
- CSS-in-JS approach (emotion) vs pure Tailwind
- Need to configure theme provider
- Learning MUI component API

### Alternatives Considered

- **HeroUI**: Good accessibility but React 19 incompatibility (v2.8.5 for React 18)
- **shadcn/ui**: Too manual, slow development
- **Chakra UI**: Good but runtime styles are a performance concern
- **Headless UI**: Too low-level, need to build everything
- **Ant Design**: Not Tailwind-based, heavier bundle

### Implementation Plan

1. Uninstall HeroUI and clean up configuration
2. Install Material UI v7 with required dependencies (@mui/material, @emotion/react, @emotion/styled)
3. Configure MUI theme with dark mode support
4. Set up ThemeProvider in app layout
5. Migrate auth components to Material UI
6. Test accessibility with screen readers
7. Update all documentation with MUI patterns

---

## ADR-006: Testing Strategy with Vitest and Playwright

**Date**: 2025-10-23
**Status**: Proposed
**Deciders**: Gabriel Serafini, Claude Code (inspired by Next.js Enterprise Boilerplate)
**Tags**: testing, quality, ci-cd

### Context

Need a comprehensive testing strategy to ensure code quality, catch bugs early, and enable confident refactoring.

### Decision

Implement multi-layer testing approach:

1. **Unit Tests**: Vitest + React Testing Library
2. **Integration Tests**: Vitest for API routes and data flows
3. **E2E Tests**: Playwright for critical user paths
4. **Component Tests**: Storybook (future)

### Rationale

- **Vitest**: Fast, ESM-first, excellent DX, better than Jest for Next.js
- **Playwright**: Modern, reliable E2E testing across browsers
- **React Testing Library**: Best practices for testing React components
- **Multi-layer**: Catch different types of bugs at appropriate levels

### Consequences

**Positive**:

- Catch bugs before production
- Enable confident refactoring
- Documentation via tests
- Better code quality
- CI/CD ready

**Negative**:

- Initial setup time
- Need to maintain tests alongside code
- Slower initial development

### Implementation Plan

1. Set up Vitest configuration
2. Create example unit tests
3. Set up Playwright configuration
4. Create example E2E tests
5. Add CI/CD integration (GitHub Actions)
6. Establish coverage targets (70%+ goal)

### Alternatives Considered

- **Jest**: Slower, more configuration needed
- **Cypress**: Good but Playwright has better parallelization
- **No tests**: Not viable for production app

---

## ADR-007: Environment Validation with T3 Env

**Date**: 2025-10-23
**Status**: Proposed
**Deciders**: Gabriel Serafini, Claude Code (inspired by Next.js Enterprise Boilerplate)
**Tags**: configuration, security, dx

### Context

Environment variables are critical for app functionality (API keys, database URLs, etc.). Need to ensure they're properly configured and validated.

### Decision

Use @t3-oss/env-nextjs for type-safe environment variable validation.

### Rationale

- Build-time validation prevents deployment with missing env vars
- Type safety for all environment variables
- Clear error messages when variables are missing/invalid
- Prevents accidental exposure of server secrets to client
- Excellent developer experience
- Zod schema validation

### Consequences

**Positive**:

- Catch configuration errors early
- Type-safe access to env vars
- Better security
- Clear documentation of required variables

**Negative**:

- Additional setup
- Build fails if env vars missing (good thing, but can be surprising)

### Implementation Plan

1. Install @t3-oss/env-nextjs and zod
2. Create src/env.ts with schemas
3. Update next.config.mjs to import env validation
4. Update tsconfig.json for proper module resolution
5. Replace process.env usage with env import
6. Update .env.example with all required variables

### Alternatives Considered

- **Manual validation**: Error-prone, no type safety
- **dotenv**: No validation, just loading
- **Custom solution**: Reinventing the wheel

---

## ADR-008: ESLint and Prettier for Code Quality

**Date**: 2025-10-23
**Status**: Proposed
**Deciders**: Gabriel Serafini, Claude Code (inspired by Next.js Enterprise Boilerplate)
**Tags**: code-quality, dx, formatting

### Context

Need consistent code formatting and quality checks across the project and team.

### Decision

Use ESLint 9 with Next.js config + Prettier for formatting.

### Rationale

- ESLint catches potential bugs and enforces patterns
- Prettier ensures consistent formatting
- Prevents bikeshedding on style
- Better code review focus on logic not style
- IDE integration for instant feedback
- Pre-commit hooks enforce standards

### Consequences

**Positive**:

- Consistent code style
- Catch bugs before runtime
- Better code reviews
- Professional codebase

**Negative**:

- Initial configuration time
- May conflict with developer preferences
- Build can fail on linting errors

### Implementation Plan

1. Configure ESLint 9 with Next.js config
2. Add Prettier with eslint-config-prettier
3. Create .prettierrc with team standards
4. Add VS Code settings for format-on-save
5. Add husky + lint-staged for pre-commit hooks
6. Document exceptions and when to use eslint-disable

### Alternatives Considered

- **No linting**: Not viable for production code
- **TSLint**: Deprecated
- **Prettier only**: Doesn't catch logic errors

---

## ADR-009: OpenAI GPT-4o-mini for AI Agents

**Date**: 2025-10-23
**Status**: Accepted
**Deciders**: Gabriel Serafini
**Tags**: ai, cost-optimization, automation

### Context

Need AI capabilities for resource discovery, enrichment, and verification while managing costs.

### Decision

Use OpenAI's GPT-4o-mini model for AI agent operations.

### Rationale

- Cost-effective (~15x cheaper than GPT-4)
- Sufficient capability for structured tasks
- Fast response times
- Good JSON mode for structured outputs
- Reliable for automated workflows
- Can upgrade to GPT-4 for specific complex tasks if needed

### Consequences

**Positive**:

- Manageable API costs for frequent automation
- Fast responses for near-real-time enrichment
- Good enough for most resource processing tasks

**Negative**:

- May miss some nuances vs GPT-4
- Need to monitor quality and adjust if needed

### Future Considerations

- Use GPT-4 Vision for document scanning (Phase 2)
- Consider GPT-4 for complex categorization if needed
- Monitor OpenAI pricing and model improvements

### Alternatives Considered

- **GPT-4**: More capable but cost-prohibitive for frequent automation
- **Claude**: Good but less mature API
- **Open-source models**: More complex deployment, less reliable

---

## ADR-010: Google Maps for Location Services

**Date**: 2025-10-23
**Status**: Accepted
**Deciders**: Gabriel Serafini
**Tags**: maps, geolocation, ux

### Context

Need robust mapping and geocoding capabilities for location-based resource search.

### Decision

Use Google Maps JavaScript API with @googlemaps/js-api-loader.

### Rationale

- Most comprehensive POI data
- Reliable geocoding and reverse geocoding
- Excellent mobile support
- Familiar UI for users
- Good clustering libraries
- Street View integration available
- Business hours and photos via Places API

### Consequences

**Positive**:

- Best-in-class mapping experience
- Rich data about businesses
- Familiar to users
- Well-documented

**Negative**:

- API costs can scale with usage
- Requires API key management
- Vendor lock-in

### Cost Mitigation

- Implement client-side caching
- Use static maps for non-interactive views
- Monitor usage and set budget alerts
- Consider lazy loading maps

### Alternatives Considered

- **Mapbox**: Good alternative, slightly cheaper, but less POI data
- **OpenStreetMap/Leaflet**: Free but requires more work and less POI data
- **Apple Maps**: Limited to Apple ecosystem

---

## Decision Status Summary

| ADR | Title                                    | Status      | Priority |
| --- | ---------------------------------------- | ----------- | -------- |
| 001 | Next.js 16 with App Router               | ✅ Accepted | Critical |
| 002 | Supabase for Backend                     | ✅ Accepted | Critical |
| 003 | TypeScript Strict Mode                   | ✅ Accepted | High     |
| 004 | Tailwind CSS                             | ✅ Accepted | High     |
| 005 | Material UI v7 Component Library         | ✅ Accepted | Critical |
| 006 | Vitest + Playwright Testing              | ✅ Accepted | High     |
| 007 | T3 Env Validation                        | ✅ Accepted | Medium   |
| 008 | ESLint + Prettier                        | ✅ Accepted | Medium   |
| 009 | OpenAI GPT-4o-mini                       | ✅ Accepted | Medium   |
| 010 | Google Maps                              | ✅ Accepted | High     |
| 011 | Avatar Strategy (Gravatar + S3)          | ✅ Accepted | Low      |
| 012 | Recently Viewed Resources (localStorage) | 📋 Proposed | Low      |
| 013 | User Profile & Role-Based System         | 📋 Proposed | High     |

---

## ADR-011: Avatar Strategy with Gravatar and Supabase Storage

**Date**: 2025-10-24
**Status**: Accepted
**Deciders**: Gabriel Serafini, Claude Code
**Tags**: user-profile, images, storage, ux

### Context

Users need a way to display profile pictures for personalization and identity in reviews and user interactions. The `users` table already has an `avatar_url` field. We need a strategy that balances user experience, implementation simplicity, and cost.

### Decision

Implement a **hybrid avatar strategy**:

1. **Default to Gravatar**: Use Gravatar as the fallback based on user's email or phone hash
2. **In-house uploads via Supabase Storage**: Allow users to upload custom avatars
3. **Fallback hierarchy**: Custom upload → Gravatar → Initials-based placeholder

### Rationale

**Why Gravatar as Default:**

- Zero implementation for basic functionality
- No storage costs for users who don't upload
- Many users already have Gravatar profiles
- Automatic updates when users update their Gravatar
- Reduces initial friction (no required upload)

**Why In-house Storage:**

- Not all users have or want Gravatar
- Full control over image processing and storage
- Better privacy (no external tracking)
- Ability to moderate uploaded images
- Offline-capable PWA support

**Why Initials Fallback:**

- Always shows something meaningful
- Accessible and recognizable
- No external dependencies required

### Implementation Details

#### Avatar Display Priority

```typescript
function getAvatarUrl(user: User): string {
  // 1. Custom uploaded avatar (if exists)
  if (user.avatar_url && user.avatar_url.startsWith('https://')) {
    return user.avatar_url
  }

  // 2. Gravatar (using email or phone hash)
  if (user.email) {
    const hash = md5(user.email.toLowerCase().trim())
    return `https://www.gravatar.com/avatar/${hash}?d=404&s=200`
  }

  // 3. Fallback to initials or default icon
  return null // Component will show initials
}
```

#### Storage Structure

**Supabase Storage Bucket**: `avatars`

- Path pattern: `{user_id}/avatar.{ext}`
- Max file size: 2MB
- Allowed formats: JPG, PNG, WebP
- Image processing: Resize to 200x200px, optimize quality

#### Upload Flow

1. User selects image in profile settings
2. Client-side validation (size, format)
3. Upload to Supabase Storage with RLS policies
4. Generate thumbnail (200x200px)
5. Update `users.avatar_url` with storage URL
6. Optimistic UI update

### Consequences

**Positive**:

- Immediate solution with zero development (Gravatar)
- Future-proof with upload capability
- Cost-effective (Gravatar free, Supabase Storage cheap)
- Better user experience (choice)
- Privacy-friendly (optional external service)
- Works offline (PWA caches uploaded avatars)

**Negative**:

- Need to implement upload UI
- Image moderation may be needed
- Storage costs for custom uploads
- Need to handle image processing

### Security Considerations

**RLS Policies**:

```sql
-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Anyone can view avatars (public)
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Content Moderation**:

- Consider automated content moderation (future)
- Admin flag to disable inappropriate avatars
- Fallback to Gravatar/initials if avatar flagged

### Display Locations

Avatars appear in:

1. **AppBar** (top-right when signed in)
2. **Review cards** (next to reviewer name)
3. **User profile page** (large version)
4. **Favorites list** (optional, in future)

### Component Usage

```typescript
import { Avatar } from '@mui/material'

<Avatar
  src={getAvatarUrl(user)}
  alt={user.name || 'User'}
>
  {/* Fallback to initials */}
  {user.name?.[0]?.toUpperCase() || 'U'}
</Avatar>
```

### Cost Estimate

- Gravatar: **Free**
- Supabase Storage: ~$0.021/GB/month
- Estimated: 1000 users × 50KB avg = 50MB = **$0.001/month**
- Negligible cost for MVP

### Alternatives Considered

**Option A: Gravatar Only**

- Pro: Zero implementation, zero cost
- Con: Many users won't have Gravatar, can't customize

**Option B: Supabase Storage Only**

- Pro: Full control, better privacy
- Con: Forced upload friction, higher costs

**Option C: Third-party Avatar Service (e.g., Cloudinary)**

- Pro: Advanced image processing
- Con: Additional vendor, higher cost, overkill for MVP

### Implementation Timeline

**Phase 5.2** (Authentication & User Profile - Week 3):

- Display Gravatar avatars automatically ✅ Quick win
- Add initials fallback to Material UI Avatar component

**Phase 6.3** (Future Enhancement - After MVP):

- Add avatar upload to profile page
- Implement image processing
- Add RLS policies for avatar storage
- Add moderation tools for admins

### Future Enhancements

- **AI-generated avatars**: Offer generated avatars as an option
- **Avatar frames/badges**: Reward active contributors
- **Social login avatars**: Pull from Google/Facebook if OAuth added
- **Avatar history**: Allow users to revert to previous avatars

---

## ADR-012: Recently Viewed Resources Implementation

**Date**: 2025-10-24
**Status**: Proposed
**Deciders**: Gabriel Serafini, Claude Code
**Tags**: user-experience, storage, features, post-mvp

### Context

Users need a way to easily revisit resources they've previously viewed, similar to a browser history. This is a common UX pattern that helps users quickly return to resources they found helpful without having to search again. The feature should work for both authenticated and anonymous users.

### Decision

**Hybrid Approach (Recommended)**:

Start with **localStorage** (Option B) for MVP, migrate to **database-backed** (Option A) post-launch if needed based on user feedback.

### Rationale

**Why Start with localStorage**:

- Zero database changes required
- Instant implementation (1 session)
- No cost impact
- Works offline (PWA benefit)
- Privacy-friendly (data stays on device)
- Good enough for MVP validation

**Why Consider Database Later**:

- Syncs across devices for authenticated users
- More persistent (survives cache clearing)
- Better analytics on user behavior
- Can implement privacy controls server-side
- Enables features like "Continue where you left off"

### Implementation Details

#### Option A: Database-Backed Solution

**Database Schema**:

```sql
CREATE TABLE recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT,  -- For anonymous users (browser fingerprint)
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource_id)  -- Only track latest view per resource
);

CREATE INDEX idx_recently_viewed_user ON recently_viewed(user_id, viewed_at DESC);
CREATE INDEX idx_recently_viewed_session ON recently_viewed(session_id, viewed_at DESC);
CREATE INDEX idx_recently_viewed_resource ON recently_viewed(resource_id);

-- RLS Policies
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history"
  ON recently_viewed FOR SELECT
  USING (auth.uid() = user_id OR session_id = current_setting('app.session_id', true));

CREATE POLICY "Users can add to own history"
  ON recently_viewed FOR INSERT
  WITH CHECK (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can delete own history"
  ON recently_viewed FOR DELETE
  USING (auth.uid() = user_id OR session_id = current_setting('app.session_id', true));
```

**API Functions** (`lib/api/history.ts`):

```typescript
// Track a view (upsert to update timestamp)
async function trackResourceView(
  resourceId: string,
  userId?: string,
  sessionId?: string
): Promise<void>

// Get recent views (limit 50)
async function getRecentlyViewed(
  userId?: string,
  sessionId?: string,
  limit: number = 50
): Promise<ResourceWithTimestamp[]>

// Clear history
async function clearHistory(userId?: string, sessionId?: string): Promise<void>

// Auto-cleanup (run via cron)
async function cleanupOldViews(olderThanDays: number = 90): Promise<void>
```

**Pros**:

- Syncs across devices
- Works for authenticated and anonymous users
- Persistent (not cleared with browser cache)
- Better privacy controls
- Can analyze user behavior patterns

**Cons**:

- Database schema changes required
- Additional queries on every page view
- Storage costs (negligible: 1000 users × 50 views = 50k rows)
- More complex implementation

#### Option B: localStorage Solution (Recommended for MVP)

**Utility Functions** (`lib/utils/viewHistory.ts`):

```typescript
interface ViewedResource {
  id: string
  name: string
  category: string
  viewedAt: string // ISO timestamp
}

const MAX_HISTORY_ITEMS = 50
const STORAGE_KEY = 'reentry-map-history'

// Add to history (max 50 items, FIFO)
export function addToHistory(resource: ViewedResource): void {
  try {
    const history = getHistory()
    // Remove if already exists
    const filtered = history.filter((r) => r.id !== resource.id)
    // Add to front
    const updated = [resource, ...filtered].slice(0, MAX_HISTORY_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    // Handle localStorage full or unavailable
    console.warn('Unable to save to history:', error)
  }
}

// Get history
export function getHistory(): ViewedResource[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    return []
  }
}

// Clear history
export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// Group by date
export function groupHistoryByDate(history: ViewedResource[]) {
  // Returns { today: [], yesterday: [], thisWeek: [], older: [] }
}
```

**Usage in Resource Detail Page**:

```typescript
// app/resources/[id]/page.tsx
'use client'
import { useEffect } from 'react'
import { addToHistory } from '@/lib/utils/viewHistory'

export default function ResourceDetailPage({ resource }) {
  useEffect(() => {
    addToHistory({
      id: resource.id,
      name: resource.name,
      category: resource.primary_category,
      viewedAt: new Date().toISOString(),
    })
  }, [resource.id])

  return <ResourceDetail resource={resource} />
}
```

**Pros**:

- Zero database changes
- Instant implementation
- Works offline
- No cost impact
- Privacy-friendly (data on device)

**Cons**:

- Doesn't sync across devices
- Cleared with browser data
- Anonymous only (doesn't persist after sign-in)
- Can't analyze user behavior server-side

### Consequences

**Positive**:

- Quick win for user experience
- Helps users find previously viewed resources
- Common UX pattern users expect
- Low implementation cost
- Privacy-friendly approach

**Negative**:

- localStorage version doesn't sync across devices
- Needs migration path if moving to database later
- Additional page load tracking overhead (minimal)

### Alternatives Considered

**Option C: Session Storage Only**

- Pro: More temporary (clears on browser close)
- Con: Too short-lived to be useful

**Option D: Cookies**

- Pro: Sent with every request
- Con: Limited size (4KB), not ideal for this use case

**Option E: IndexedDB**

- Pro: More storage than localStorage
- Con: Overkill for this feature, more complex API

### Migration Path

If we later need database-backed history:

1. Implement database schema and APIs
2. Add feature flag for database vs localStorage
3. For authenticated users, migrate localStorage history to database on sign-in
4. Keep localStorage as fallback for anonymous users
5. Gradually sunset localStorage version

### Implementation Timeline

**Phase 6.4** (Post-MVP Enhancement):

- Start with localStorage (Option B) - 1 session
- Evaluate user feedback and usage
- Migrate to database (Option A) only if needed

### Display Locations

"Recently Viewed" accessible from:

1. User menu / navigation (for authenticated users)
2. Bottom of resource detail page (optional)
3. Empty search results page ("Or try recently viewed")

### Privacy Considerations

- Clear history button prominent
- Respect "Do Not Track" browser setting (optional)
- Privacy mode option to disable tracking (future)
- Incognito/private browsing: tracking disabled

---

---

## ADR-013: User Profile Strategy with Role-Based System

**Date**: 2025-10-24
**Status**: Proposed
**Deciders**: Gabriel Serafini, Claude Code
**Tags**: user-profile, onboarding, roles, user-experience

### Context

The current user profile is minimal (name, phone, avatar). To better serve the reentry community, we need a comprehensive profile system that:

1. Supports multiple user types with different needs and workflows
2. Collects relevant information without overwhelming users
3. Respects privacy and dignity (especially for returning citizens)
4. Enables personalized dashboards and resource matching
5. Maintains simplicity for low-tech literacy users

### Decision

Implement a **role-based user profile system** with:

1. **Universal baseline fields** for all users
2. **Role selection** during onboarding ("Are you a...")
3. **Role-specific extended fields** that show/hide based on user type
4. **Progressive onboarding wizard** with completion tracking
5. **Personalized dashboards** based on user role

### User Roles

#### Primary Roles

1. **Returning Citizen** - Individuals navigating reentry (primary users)
2. **Reentry Coach** - Professionals supporting returning citizens
3. **Angel Team Volunteer** - Community volunteers helping with resources
4. **Angel Team Leader** - Volunteers coordinating other volunteers
5. **General Public** - Interested community members, family, advocates
6. **Admin** - Platform administrators (existing role)

### Profile Structure

#### Baseline Profile Fields (All Users)

**Core Identity**:

- `id` (UUID) - Primary key, links to auth.users
- `first_name` (TEXT, required) - First name
- `last_name` (TEXT, required) - Last name
- `email` (TEXT, required) - Email address (unique, verified)
- `phone` (TEXT, optional) - Phone number (verified if provided)
- `avatar_url` (TEXT, optional) - Profile picture

**Account Settings**:

- `user_type` (ENUM, required) - Primary role (from list above)
- `secondary_roles` (TEXT[], optional) - Additional roles user identifies with
- `preferred_language` (TEXT, default 'en') - UI language preference
- `timezone` (TEXT, default 'America/Los_Angeles') - User timezone
- `notification_preferences` (JSONB) - Email/SMS/push preferences

**Privacy & Security**:

- `profile_visibility` (ENUM, default 'private') - 'public' | 'community' | 'private'
- `show_on_leaderboard` (BOOLEAN, default false) - For gamification features
- `data_sharing_consent` (BOOLEAN, default false) - For research/analytics
- `email_verified` (BOOLEAN, default false) - Email verification status
- `phone_verified` (BOOLEAN, default false) - Phone verification status

**Location (Optional but Recommended)**:

- `city` (TEXT, optional) - City for better resource matching
- `state` (TEXT, optional) - State
- `zip_code` (TEXT, optional) - Zip code for distance calculations
- `show_location_publicly` (BOOLEAN, default false) - Display location to others

**System Fields**:

- `onboarding_completed` (BOOLEAN, default false) - Wizard completion status
- `onboarding_step` (INTEGER, default 0) - Current step in wizard
- `profile_completeness` (INTEGER, default 0) - Percentage complete (0-100)
- `last_active_at` (TIMESTAMPTZ) - Last activity timestamp
- `created_at` (TIMESTAMPTZ) - Account creation
- `updated_at` (TIMESTAMPTZ) - Last profile update

#### Role-Specific Extended Fields

##### 1. Returning Citizen Profile

**Journey Context**:

- `reentry_date` (DATE, optional, private) - Release date (privacy-sensitive)
- `months_since_reentry` (INTEGER, computed) - Calculated from reentry_date
- `support_timeline` (ENUM, optional) - 'pre-release' | 'first-90-days' | 'established' | 'long-term'

**Needs & Goals**:

- `primary_needs` (TEXT[], optional) - Categories they're focused on (max 5)
- `immediate_needs` (TEXT[], optional) - Urgent needs (housing, ID, etc.)
- `personal_goals` (TEXT, optional) - Free-text goals
- `goal_categories` (TEXT[], optional) - Structured goal tracking

**Support Network**:

- `has_case_manager` (BOOLEAN, default false) - Has assigned case manager
- `case_manager_name` (TEXT, optional) - Case manager's name
- `case_manager_email` (TEXT, optional) - Case manager contact
- `case_manager_phone` (TEXT, optional) - Case manager phone
- `emergency_contact_name` (TEXT, optional) - Emergency contact
- `emergency_contact_phone` (TEXT, optional) - Emergency phone
- `emergency_contact_relationship` (TEXT, optional) - Relationship to user

**Practical Information**:

- `has_valid_id` (BOOLEAN, optional) - Has government ID
- `id_type` (TEXT, optional) - Type of ID (license, state ID, etc.)
- `has_reliable_transportation` (BOOLEAN, optional) - Access to transportation
- `transportation_method` (TEXT, optional) - Primary transportation method
- `has_smartphone` (BOOLEAN, optional) - Has smartphone for app access
- `internet_access` (ENUM, optional) - 'home' | 'mobile' | 'public-library' | 'limited'
- `accessibility_needs` (TEXT[], optional) - Physical/cognitive accessibility needs
- `special_accommodations` (TEXT, optional) - Special needs description

**Privacy Note**: All returning citizen fields optional and private by default. Users control what they share.

##### 2. Reentry Coach Profile

**Professional Information**:

- `organization_name` (TEXT, required) - Employer/organization
- `organization_type` (ENUM, required) - 'government' | 'nonprofit' | 'private' | 'faith-based'
- `job_title` (TEXT, required) - Current title
- `years_experience` (INTEGER, optional) - Years in reentry work
- `credentials` (TEXT[], optional) - Certifications, licenses
- `specializations` (TEXT[], optional) - Areas of expertise

**Availability & Capacity**:

- `caseload_size` (INTEGER, optional) - Current number of clients
- `accepting_new_clients` (BOOLEAN, default false) - Available for new clients
- `max_caseload` (INTEGER, optional) - Maximum capacity
- `availability_hours` (JSONB, optional) - Weekly availability schedule
- `preferred_contact_method` (ENUM, required) - 'email' | 'phone' | 'text' | 'in-person'
- `response_time_expectation` (TEXT, optional) - Expected response time

**Service Areas**:

- `service_categories` (TEXT[], required) - Categories they support (employment, housing, etc.)
- `geographic_area` (TEXT, optional) - Area they serve
- `languages_spoken` (TEXT[], optional) - Languages for service delivery
- `virtual_services` (BOOLEAN, default false) - Offers remote services

**Public Profile** (visible to returning citizens):

- `bio` (TEXT, optional) - Professional bio (500 chars max)
- `success_stories_count` (INTEGER, default 0) - Number of success stories shared
- `verified_coach` (BOOLEAN, default false) - Admin-verified status

##### 3. Angel Team Volunteer Profile

**Volunteer Information**:

- `volunteer_since` (DATE, required) - Start date
- `volunteer_status` (ENUM, required) - 'active' | 'inactive' | 'on-hold'
- `hours_per_month` (INTEGER, optional) - Typical availability
- `volunteer_interests` (TEXT[], required) - Areas of interest
- `skills_to_share` (TEXT[], optional) - Professional/personal skills

**Verification**:

- `background_check_status` (ENUM, required) - 'pending' | 'cleared' | 'expired' | 'failed'
- `background_check_date` (DATE, optional) - Date of last check
- `onboarding_completed_date` (DATE, optional) - Training completion
- `orientation_attended` (BOOLEAN, default false) - Attended orientation
- `agreements_signed` (JSONB, optional) - Liability waivers, confidentiality

**Engagement**:

- `volunteer_activities` (TEXT[], optional) - Types of volunteer work
- `total_volunteer_hours` (INTEGER, default 0) - Lifetime hours logged
- `projects_participated` (TEXT[], optional) - Special projects
- `preferred_schedule` (JSONB, optional) - Weekly availability

**Recognition**:

- `volunteer_level` (ENUM, default 'bronze') - 'bronze' | 'silver' | 'gold' | 'platinum'
- `badges_earned` (TEXT[], optional) - Achievement badges
- `recognition_notes` (TEXT, optional) - Admin notes for recognition

##### 4. Angel Team Leader Profile

Inherits all Volunteer Profile fields, plus:

**Leadership Information**:

- `team_name` (TEXT, required) - Name of team they lead
- `team_size` (INTEGER, optional) - Number of volunteers managed
- `leadership_since` (DATE, required) - Start date as leader
- `leadership_training_completed` (BOOLEAN, default false) - Leadership training status

**Responsibilities**:

- `areas_of_responsibility` (TEXT[], required) - What they oversee
- `projects_managed` (TEXT[], optional) - Current projects
- `budget_responsibility` (BOOLEAN, default false) - Manages team budget
- `can_approve_volunteers` (BOOLEAN, default false) - Can onboard new volunteers

**Communication**:

- `team_meeting_schedule` (TEXT, optional) - Regular meeting schedule
- `preferred_communication_tools` (TEXT[], optional) - Slack, email, etc.
- `office_hours` (JSONB, optional) - Availability for team members

##### 5. General Public Profile

**Interest & Engagement**:

- `how_did_you_hear` (TEXT, optional) - Referral source
- `interest_areas` (TEXT[], optional) - What brought them here
- `wants_to_volunteer` (BOOLEAN, default false) - Interest in volunteering
- `wants_to_donate` (BOOLEAN, default false) - Interest in donations
- `wants_updates` (BOOLEAN, default false) - Newsletter subscription
- `profession` (TEXT, optional) - Professional background
- `can_provide_resources` (BOOLEAN, default false) - Can help with resources/connections

**Relationship to Reentry**:

- `relationship_type` (ENUM, optional) - 'family-member' | 'friend' | 'advocate' | 'researcher' | 'curious' | 'other'
- `motivation` (TEXT, optional) - Why they're interested (free-text)

### Onboarding Flow

#### Step 1: Minimal Signup (< 1 minute)

- First name (required)
- Last name (required)
- Email (required)
- Password (required) OR Phone number for OTP
- Terms acceptance checkbox

**Output**: Account created (unverified)

#### Step 2: Verification (< 2 minutes)

- Email verification link sent
- OR Phone OTP code sent
- User clicks link or enters code
- Account marked as verified

**Output**: Verified account

#### Step 3: Role Selection (< 30 seconds)

**Prompt**: "Welcome! To personalize your experience, let us know who you are:"

- [ ] **Returning Citizen** - "I'm navigating reentry and looking for resources"
- [ ] **Reentry Coach** - "I'm a professional supporting returning citizens"
- [ ] **Angel Team Volunteer** - "I volunteer to help the reentry community"
- [ ] **Angel Team Leader** - "I coordinate volunteers and projects"
- [ ] **General Public** - "I'm here to learn, support, or find information"

**Output**: User type set, wizard branches to role-specific questions

#### Step 4: Essential Profile Info (< 3 minutes)

**Questions vary by role**, focusing on:

- Location (city, zip) - "Help us show you nearby resources"
- Primary needs/interests (checkboxes)
- Notification preferences (email/SMS)
- Privacy settings (profile visibility)

**Progress indicator**: "2 of 4 steps complete"

#### Step 5: Extended Profile (Optional, < 5 minutes)

**Returning Citizens**:

- "Tell us more so we can help you better" (all optional)
- Primary needs (employment, housing, etc.)
- Support timeline (pre-release, first 90 days, etc.)
- Transportation access
- Case manager info

**Coaches**:

- Organization details
- Specializations
- Availability preferences
- Bio for public profile

**Volunteers**:

- Skills and interests
- Availability (hours per month)
- Background check upload
- Preferred activities

**"Skip for now"** button prominent - can complete later

#### Step 6: Completion & Dashboard (< 1 minute)

- **Success message**: "Welcome to Reentry Map, [First Name]!"
- Profile completion badge/celebration
- Quick tour of dashboard (3-4 screenshots with highlights)
- **Call to action** based on role:
  - Returning Citizens: "Find resources near you"
  - Coaches: "Explore the resource directory"
  - Volunteers: "See volunteer opportunities"

**Output**: Redirect to personalized dashboard

### Profile Page Design

#### Layout Structure

**Header Section**:

- Avatar (large, editable)
- Name (first + last, editable inline)
- User type badge(s) (e.g., "Returning Citizen" + "Volunteer")
- Profile completeness progress bar (if < 100%)
- "Edit Profile" button

**Tabbed Sections** (role-dependent):

**Tab 1: Basic Information** (all users)

- Contact details (email, phone)
- Location (city, state, zip)
- Language & timezone
- Password change

**Tab 2: Role Information** (varies by role)

- Role-specific fields organized into logical groups
- Collapsible sections with icons
- Help text for complex fields
- "Why we ask" tooltips

**Tab 3: Privacy & Notifications**

- Profile visibility settings
- Data sharing consent
- Email preferences
- SMS preferences
- Push notification settings

**Tab 4: Activity & Stats** (optional)

- Favorites count
- Reviews written
- Resources suggested
- Volunteer hours (if applicable)
- Achievements/badges

#### Design Principles

**Simplicity**:

- Maximum 3-5 fields per section
- Plain language labels ("Where do you live?" vs "Residential Address")
- Icons for visual clarity
- Inline help text, not modals

**Progressive Disclosure**:

- Show essential fields first
- "Show more" buttons for advanced options
- Collapsible sections (closed by default)
- "Why we ask this" explanations

**Visual Hierarchy**:

- Required fields marked clearly (red asterisk)
- Optional fields in lighter text
- Section headers with icons
- White space between groups

**Accessibility**:

- High contrast
- Large touch targets (44px minimum)
- Keyboard navigation
- Screen reader friendly
- Error messages clear and actionable

**Mobile-First**:

- Single column layout
- Thumb-friendly buttons
- Minimal scrolling per section
- Save button always visible (sticky)

### Personalized Dashboards

Each role gets a customized dashboard home page:

#### Returning Citizen Dashboard

**Hero Section**:

- "Welcome back, [First Name]"
- Quick actions: Search Resources | My Favorites | Get Help

**Main Widgets**:

- **Recommended Resources** (based on primary_needs)
- **Resources Near You** (based on location)
- **Your Next Steps** (based on goals)
- **Recent Activity** (your favorites, reviews)
- **Support Contacts** (case manager quick access)

#### Reentry Coach Dashboard

**Hero Section**:

- "Welcome, [First Name]"
- Quick actions: Find Resources | Suggest Resource | View Updates

**Main Widgets**:

- **Recently Updated Resources** (in your specializations)
- **Resources by Category** (your service areas)
- **Community Activity** (new reviews, suggestions)
- **Your Contributions** (resources suggested, reviews written)
- **Helpful Resources** (most reviewed in your area)

#### Volunteer Dashboard

**Hero Section**:

- "Welcome, [First Name]"
- Quick actions: Log Hours | View Opportunities | Team Updates

**Main Widgets**:

- **Volunteer Opportunities** (matching your interests)
- **Your Impact Stats** (hours, projects, recognition)
- **Team Updates** (from your Angel Team Leader)
- **Training Resources**
- **Upcoming Events**

#### General Public Dashboard

**Hero Section**:

- "Welcome, [First Name]"
- Quick actions: Explore Resources | Learn More | Get Involved

**Main Widgets**:

- **Browse Resources** (directory overview)
- **How to Help** (volunteer, donate, advocate)
- **Success Stories** (community impact)
- **Recent Updates** (new resources, platform updates)

### Database Schema Changes

**Expand users table**:

```sql
ALTER TABLE users
-- Baseline fields
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN email TEXT UNIQUE,
ADD COLUMN user_type TEXT NOT NULL DEFAULT 'general-public',
ADD COLUMN secondary_roles TEXT[],
ADD COLUMN preferred_language TEXT DEFAULT 'en',
ADD COLUMN timezone TEXT DEFAULT 'America/Los_Angeles',
ADD COLUMN notification_preferences JSONB,
ADD COLUMN profile_visibility TEXT DEFAULT 'private',
ADD COLUMN show_on_leaderboard BOOLEAN DEFAULT false,
ADD COLUMN data_sharing_consent BOOLEAN DEFAULT false,
ADD COLUMN email_verified BOOLEAN DEFAULT false,
ADD COLUMN phone_verified BOOLEAN DEFAULT false,

-- Location (optional)
ADD COLUMN city TEXT,
ADD COLUMN state TEXT,
ADD COLUMN zip_code TEXT,
ADD COLUMN show_location_publicly BOOLEAN DEFAULT false,

-- System fields
ADD COLUMN onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN onboarding_step INTEGER DEFAULT 0,
ADD COLUMN profile_completeness INTEGER DEFAULT 0,
ADD COLUMN last_active_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_city ON users(city) WHERE city IS NOT NULL;
CREATE INDEX idx_users_onboarding ON users(onboarding_completed);

-- Migrate existing data
UPDATE users SET first_name = split_part(name, ' ', 1);
UPDATE users SET last_name = split_part(name, ' ', 2);
UPDATE users SET email = COALESCE(email, phone || '@temp.placeholder');
```

**Create role-specific extended tables**:

```sql
-- Returning Citizens
CREATE TABLE returning_citizen_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reentry_date DATE,
  support_timeline TEXT,
  primary_needs TEXT[],
  immediate_needs TEXT[],
  personal_goals TEXT,
  goal_categories TEXT[],
  has_case_manager BOOLEAN DEFAULT false,
  case_manager_name TEXT,
  case_manager_email TEXT,
  case_manager_phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  has_valid_id BOOLEAN,
  id_type TEXT,
  has_reliable_transportation BOOLEAN,
  transportation_method TEXT,
  has_smartphone BOOLEAN,
  internet_access TEXT,
  accessibility_needs TEXT[],
  special_accommodations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reentry Coaches
CREATE TABLE reentry_coach_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  organization_type TEXT NOT NULL,
  job_title TEXT NOT NULL,
  years_experience INTEGER,
  credentials TEXT[],
  specializations TEXT[],
  caseload_size INTEGER,
  accepting_new_clients BOOLEAN DEFAULT false,
  max_caseload INTEGER,
  availability_hours JSONB,
  preferred_contact_method TEXT NOT NULL,
  response_time_expectation TEXT,
  service_categories TEXT[] NOT NULL,
  geographic_area TEXT,
  languages_spoken TEXT[],
  virtual_services BOOLEAN DEFAULT false,
  bio TEXT,
  success_stories_count INTEGER DEFAULT 0,
  verified_coach BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Angel Team Volunteers
CREATE TABLE volunteer_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  volunteer_since DATE NOT NULL,
  volunteer_status TEXT NOT NULL DEFAULT 'active',
  hours_per_month INTEGER,
  volunteer_interests TEXT[] NOT NULL,
  skills_to_share TEXT[],
  background_check_status TEXT NOT NULL DEFAULT 'pending',
  background_check_date DATE,
  onboarding_completed_date DATE,
  orientation_attended BOOLEAN DEFAULT false,
  agreements_signed JSONB,
  volunteer_activities TEXT[],
  total_volunteer_hours INTEGER DEFAULT 0,
  projects_participated TEXT[],
  preferred_schedule JSONB,
  volunteer_level TEXT DEFAULT 'bronze',
  badges_earned TEXT[],
  recognition_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Angel Team Leaders (extends volunteer)
CREATE TABLE team_leader_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  team_size INTEGER,
  leadership_since DATE NOT NULL,
  leadership_training_completed BOOLEAN DEFAULT false,
  areas_of_responsibility TEXT[] NOT NULL,
  projects_managed TEXT[],
  budget_responsibility BOOLEAN DEFAULT false,
  can_approve_volunteers BOOLEAN DEFAULT false,
  team_meeting_schedule TEXT,
  preferred_communication_tools TEXT[],
  office_hours JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- General Public
CREATE TABLE general_public_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  how_did_you_hear TEXT,
  interest_areas TEXT[],
  wants_to_volunteer BOOLEAN DEFAULT false,
  wants_to_donate BOOLEAN DEFAULT false,
  wants_updates BOOLEAN DEFAULT false,
  profession TEXT,
  can_provide_resources BOOLEAN DEFAULT false,
  relationship_type TEXT,
  motivation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies (users can only view/edit their own extended profiles)
ALTER TABLE returning_citizen_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reentry_coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_leader_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_public_profiles ENABLE ROW LEVEL SECURITY;

-- Create identical policies for all extended profile tables
-- (example for returning_citizen_profiles, repeat for others)
CREATE POLICY "Users can view own profile"
  ON returning_citizen_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON returning_citizen_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON returning_citizen_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Consequences

**Positive**:

- **Better personalization**: Match users to relevant resources and features
- **Community building**: Connect coaches, volunteers, and returning citizens
- **Improved outcomes**: Track goals, needs, and progress
- **Dignity preserved**: Optional fields, privacy controls, no stigmatizing language
- **Flexibility**: Users can have multiple roles (e.g., returning citizen + volunteer)
- **Progressive enhancement**: Minimal signup, grow profile over time

**Negative**:

- **Increased complexity**: More fields to maintain, test, and support
- **Privacy concerns**: Need robust security and clear data policies
- **Development time**: Significant work for onboarding wizard and role system
- **User confusion risk**: Must be extremely clear and simple
- **Data quality**: Optional fields may remain incomplete

### Migration Path

**Phase 0 (Current)**:

- Minimal profile (name, phone, avatar)
- Single user type (default)

**Phase 1 (Baseline Profile)**:

- Add first_name/last_name separation
- Add email verification
- Add basic location fields
- Add notification preferences

**Phase 2 (Role System)**:

- Add user_type and role selection
- Create extended profile tables
- Build onboarding wizard
- Launch for one role (Returning Citizens)

**Phase 3 (Multi-Role Support)**:

- Enable all user roles
- Build role-specific dashboards
- Add role-switching capability

**Phase 4 (Advanced Features)**:

- Goal tracking for returning citizens
- Coach-client connections
- Volunteer opportunity matching
- Community features

### Implementation Priority

**P0 (MVP Must-Have)**:

- First/last name separation
- Email + email verification
- Basic location (city, state, zip)
- Privacy settings
- Profile completeness calculation

**P1 (Early Enhancement)**:

- User type/role selection
- Returning citizen extended profile
- Onboarding wizard (basic version)
- Personalized dashboard (returning citizens only)

**P2 (Post-Launch)**:

- All five role types supported
- Full onboarding wizard with branching
- Role-specific dashboards
- Coach and volunteer profiles

**P3 (Future)**:

- Multi-role support (users with multiple roles)
- Advanced matching algorithms
- Community features (coach-client, mentor-mentee)
- Goal tracking and progress analytics

### Security & Privacy Considerations

**Data Minimization**:

- Only ask for what's needed
- Make most fields optional
- Clear "why we ask" explanations

**Privacy Controls**:

- Default to private profiles
- Granular visibility settings
- Ability to hide sensitive fields
- Export and delete options (GDPR)

**Sensitive Data Handling**:

- Reentry dates stored encrypted
- Case manager info only for user
- Emergency contacts private
- Background check status not public

**Access Control**:

- RLS policies on all profile tables
- Users only see their own data
- Admins require explicit permissions
- Audit logging for sensitive fields

---

## Next Decisions Needed

1. **ADR-014**: State Management approach (when needed)
2. **ADR-015**: Form handling library (react-hook-form vs alternatives)
3. **ADR-016**: Image optimization strategy
4. **ADR-017**: Monitoring and observability tools
5. **ADR-018**: CI/CD pipeline configuration

---

## How to Add a New ADR

1. Copy the template at the top
2. Assign the next ADR number
3. Fill in all sections thoughtfully
4. Discuss with team if applicable
5. Update the summary table
6. Commit to git with message: `docs: add ADR-XXX for [decision]`

---

## References

- [ADR GitHub Organization](https://adr.github.io/)
- [Documenting Architecture Decisions by Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [Next.js Enterprise Boilerplate](https://vercel.com/templates/saas/nextjs-enterprise-boilerplate)
