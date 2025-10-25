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

| ADR | Title                            | Status      | Priority |
| --- | -------------------------------- | ----------- | -------- |
| 001 | Next.js 16 with App Router       | ✅ Accepted | Critical |
| 002 | Supabase for Backend             | ✅ Accepted | Critical |
| 003 | TypeScript Strict Mode           | ✅ Accepted | High     |
| 004 | Tailwind CSS                     | ✅ Accepted | High     |
| 005 | Material UI v7 Component Library | ✅ Accepted | Critical |
| 006 | Vitest + Playwright Testing      | ✅ Accepted | High     |
| 007 | T3 Env Validation                | ✅ Accepted | Medium   |
| 008 | ESLint + Prettier                | ✅ Accepted | Medium   |
| 009 | OpenAI GPT-4o-mini               | ✅ Accepted | Medium   |
| 010 | Google Maps                      | ✅ Accepted | High     |
| 011 | Avatar Strategy (Gravatar + S3)  | ✅ Accepted | Low      |

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

## Next Decisions Needed

1. **ADR-012**: State Management approach (when needed)
2. **ADR-013**: Form handling library (react-hook-form vs alternatives)
3. **ADR-014**: Image optimization strategy
4. **ADR-015**: Monitoring and observability tools
5. **ADR-016**: CI/CD pipeline configuration

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
