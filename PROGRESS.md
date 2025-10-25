# Reentry Map - Development Progress

**Last Updated**: 2025-10-24
**Current Phase**: Phase 3 Complete - Core Resources Fully Implemented
**Overall Progress**: 45% (Phase 0: 100%, Phase 1: 100%, Phase 2: 100%, Phase 3: 100%)

---

## Quick Status

| Phase                      | Status      | Progress | ETA                               |
| -------------------------- | ----------- | -------- | --------------------------------- |
| Phase 0: Foundation        | ✅ Complete | 100%     | Completed Session 1               |
| Phase 0.5: Enterprise      | ✅ Complete | 100%     | Completed Session 1               |
| Phase 1: UI Library        | ✅ Complete | 100%     | Material UI v7 migrated Session 3 |
| Phase 2: Database          | ✅ Complete | 100%     | Completed Session 2               |
| Phase 3: Core Resources    | ✅ Complete | 100%     | Completed Session 4               |
| Phase 4: Location Features | ❌ Pending  | 0%       | Week 2                            |
| Phase 5-14                 | ❌ Pending  | 0%       | Weeks 3-5                         |

---

## Current Session Progress (2025-10-24 - Session 4)

### ✅ App Layout & Homepage COMPLETE

**Successfully created professional Material UI homepage with navigation!**

1. **Navigation Components** ✅
   - ✅ Created [components/layout/AppBar.tsx](components/layout/AppBar.tsx) - Desktop/tablet top navigation
     - Logo placeholder ("RM") ready for actual logo
     - Desktop nav links (Resources, Favorites, Suggest)
     - Mobile search icon
     - Theme switcher integration
     - Auth button (Sign in/Sign up or user menu)
   - ✅ Created [components/layout/BottomNav.tsx](components/layout/BottomNav.tsx) - Mobile bottom navigation
     - 4 tabs: Home, Search, Favorites, Account
     - Auto-updates based on current route
     - Fixed positioning with proper z-index
     - Hidden on desktop (md+)
   - ✅ Updated [app/layout.tsx](app/layout.tsx) - Integrated both navigation components
     - Proper spacing for mobile bottom nav
     - SEO metadata enhanced

2. **Homepage Implementation** ✅
   - ✅ Completely rebuilt [app/page.tsx](app/page.tsx) with Material UI v7
     - **Hero Section**: Blue gradient with search bar and resource count
     - **Categories Section**: 8 category cards with icons (Employment, Housing, Food, Healthcare, Clothing, Legal Aid, Transportation, Education)
     - **Featured Resources**: Top 6 rated resources with cards
     - **Call-to-Action**: Suggest a Resource section
     - Server-side data fetching for performance
     - Responsive design (mobile-first)

3. **Material UI Grid v7 Migration** ✅
   - ✅ Updated Grid API from v5 to v7
     - Changed `<Grid item xs={6}>` → `<Grid size={{ xs: 6 }}>`
     - Removed deprecated `item` prop
     - Used responsive `size` object syntax
   - ✅ All TypeScript errors resolved

4. **Server/Client Component Architecture** ✅
   - ✅ Fixed server component importing issues
     - AppBar: Client component (uses Next.js Link with MUI)
     - AuthButton: Server component (uses Supabase cookies)
     - Layout: Server component (passes AuthButton as prop to AppBar)
   - ✅ Proper component boundaries maintained

5. **Quality Checks** ✅
   - ✅ ESLint: 0 errors (1 warning on commitlint.config.js - expected)
   - ✅ TypeScript: 0 errors
   - ✅ Tests: 6/6 passing
   - ✅ Build: Successful (routes correctly marked as dynamic)

**Files Created/Modified**:

- [components/layout/AppBar.tsx](components/layout/AppBar.tsx:1-108) - New file
- [components/layout/BottomNav.tsx](components/layout/BottomNav.tsx:1-70) - New file
- [app/layout.tsx](app/layout.tsx:1-67) - Enhanced with navigation
- [app/page.tsx](app/page.tsx:1-251) - Complete rewrite
- [lib/api/resources.ts](lib/api/resources.ts:1-189) - Fixed TypeScript types
- [components/auth-button.tsx](components/auth-button.tsx:14-33) - Fixed Link usage

### ✅ Screenshot System for Responsive Design Review

**Created reusable screenshot system for visual design verification!**

1. **Screenshot Script** ✅
   - ✅ Created [scripts/screenshot.sh](scripts/screenshot.sh) - Automated multi-viewport capture
   - ✅ Captures 5 viewport sizes: mobile (2), tablet, desktop (2)
   - ✅ Both viewport and full-page screenshots
   - ✅ Timestamped output to `/tmp/reentry-map-screenshots/`

2. **npm Script** ✅
   - ✅ Added `npm run screenshots` command
   - ✅ Can pass custom URL: `npm run screenshots http://localhost:3003/route`

3. **Slash Command** ✅
   - ✅ Created [.claude/commands/screenshots.md](.claude/commands/screenshots.md)
   - ✅ Claude can now invoke `/screenshots` for visual review

4. **Documentation** ✅
   - ✅ Updated [CLAUDE.md](CLAUDE.md:55-81) with screenshots section
   - ✅ Updated [.gitignore](.gitignore:31-33) to exclude screenshot directories
   - ✅ Fixed Material UI v7 reference in Tech Stack

**Usage**:

```bash
npm run screenshots              # Capture homepage
/screenshots                     # Slash command
```

**Verified on Homepage**: All responsive breakpoints working perfectly - zero issues found!

### ✅ Phase 3 Core Resources Implementation COMPLETE

**Successfully implemented all core resource browsing features!**

#### 3.1 Resource Type Definitions ✅

- ✅ Created [lib/types/database.ts](lib/types/database.ts) with complete TypeScript types
- ✅ ResourceSort, ResourceFilters, CategoryCount types defined

#### 3.2 Resource List Components ✅

- ✅ Created [components/resources/ResourceList.tsx](components/resources/ResourceList.tsx)
- ✅ Created [components/resources/ResourceCard.tsx](components/resources/ResourceCard.tsx)
- ✅ Grid layout with Material UI

#### 3.3 Resource Detail Page ✅

- ✅ Implemented [app/resources/[id]/page.tsx](app/resources/[id]/page.tsx)
- ✅ Full resource details with Material UI
- ✅ Server-side data fetching
- ✅ SEO metadata generation

#### 3.4 Category Pages ✅

- ✅ Created [app/resources/category/[category]/page.tsx](app/resources/category/[category]/page.tsx)
- ✅ Dynamic category routing
- ✅ Category filtering with pagination
- ✅ SEO-optimized metadata

#### 3.5 Search & Filter Pages ✅

- ✅ Created [app/search/page.tsx](app/search/page.tsx) - Main search page
- ✅ Created [app/search/[slug]/page.tsx](app/search/[slug]/page.tsx) - Hyperlocal SEO pages
- ✅ Created [components/search/CategoryFilter.tsx](components/search/CategoryFilter.tsx)
- ✅ URL pattern: `/search/{category}-in-{city}-{state}/`
- ✅ SEO utilities: [lib/utils/seo-routes.ts](lib/utils/seo-routes.ts)

#### 3.6 Pagination ✅

- ✅ Created [components/search/Pagination.tsx](components/search/Pagination.tsx)
- ✅ Material UI pagination with page size info
- ✅ URL param integration
- ✅ Comprehensive tests: [**tests**/components/search/Pagination.test.tsx](__tests__/components/search/Pagination.test.tsx)

#### 3.7 Sorting ✅

- ✅ Created [components/search/SortDropdown.tsx](components/search/SortDropdown.tsx)
- ✅ Created [lib/utils/sort.ts](lib/utils/sort.ts) - Server-compatible utilities
- ✅ 7 sort options (name, rating, date, distance)
- ✅ localStorage preference persistence
- ✅ URL param integration
- ✅ Comprehensive tests: [**tests**/components/search/SortDropdown.test.tsx](__tests__/components/search/SortDropdown.test.tsx)

#### 3.8 Quality Enhancement - Dev Compilation Check ✅

**Enhanced quality gates to catch dev server compilation failures!**

1. **Client/Server Boundary Fix** ✅
   - ✅ Discovered dev server failing while production build passed
   - ✅ Root cause: `parseSortParam` in client component imported by server components
   - ✅ Created [lib/utils/sort.ts](lib/utils/sort.ts) - Server-compatible utility file
   - ✅ Moved `parseSortParam` and `SORT_OPTIONS` from client component
   - ✅ Updated 3 server components: [app/search/page.tsx](app/search/page.tsx), [app/search/[slug]/page.tsx](app/search/[slug]/page.tsx), [app/resources/category/[category]/page.tsx](app/resources/category/[category]/page.tsx)
   - ✅ Updated test file: [**tests**/components/search/SortDropdown.test.tsx](__tests__/components/search/SortDropdown.test.tsx)

2. **Dev Server Compilation Check** ✅
   - ✅ Created [scripts/check-dev-compile.sh](scripts/check-dev-compile.sh)
   - ✅ Runs dev server on port 3004 (avoids interfering with user's dev server)
   - ✅ Waits up to 25 seconds for compilation
   - ✅ Detects success ("✓ Ready") or failures ("Error:", "⨯")
   - ✅ Proper cleanup with trap on exit
   - ✅ macOS compatible (no `timeout` command dependency)

3. **Quality Pipeline Integration** ✅
   - ✅ Added `npm run dev:check` script to [package.json](package.json)
   - ✅ Integrated into `npm run quality` pipeline
   - ✅ Quality checks now include: lint + type-check + tests + build + **dev:check**

**Why This Matters**: Production builds can sometimes succeed while dev server fails due to client/server boundary issues. The new dev check catches these issues before commit.

**Test Results**: All quality checks passing (60/60 tests)

**Next Steps**:

- Replace "RM" logo placeholder with actual logo (user mentioned having one)
- Begin Phase 4: Location Features (geolocation, maps)

---

## Previous Session Progress (2025-10-24 - Session 3)

### ✅ Phase 1 COMPLETE - Material UI v7 Migration

**Successfully migrated from HeroUI to Material UI v7!**

1. **Decision to Switch UI Libraries** 🔄
   - ✅ Discovered HeroUI v2.8.5 incompatible with React 19
   - ✅ HeroUI v3 is alpha only (not production ready)
   - ✅ User decided to switch to Material UI v7
   - ✅ Updated ADR-005 with complete rationale

2. **Material UI v7 Installation** ✅
   - ✅ Uninstalled HeroUI (@heroui/react, framer-motion)
   - ✅ Installed Material UI v7 (@mui/material, @emotion/react, @emotion/styled, @mui/icons-material)
   - ✅ Cleaned up Tailwind config (removed HeroUI plugin)
   - ✅ Created MUI theme with light/dark mode support
   - ✅ Integrated with next-themes for theme switching

3. **Complete Component Migration** ✅
   - ✅ login-form.tsx: TextField, Button, Card, Alert
   - ✅ sign-up-form.tsx: TextField, Button, Card, Alert
   - ✅ auth-button.tsx: Box, Button, Typography (Server Component compatible!)
   - ✅ logout-button.tsx: Button with onClick
   - ✅ ResourceCard.tsx: Card, Rating, Chip, Button, Link
   - ✅ SearchBar.tsx: TextField, Button, Box
   - ✅ Removed HeroUI test files (HeroUIExample.tsx, heroui-test page)

4. **Key Advantages of Material UI** 📝
   - Works in both Client AND Server Components
   - React 19 fully compatible
   - Built-in Rating component for star ratings
   - Standard HTML props (onChange, onClick)
   - Comprehensive component library (90+ components)
   - Production-ready with massive community support
   - Full TypeScript support with autocomplete
   - WAI-ARIA accessibility built-in

5. **Quality Checks** ✅
   - ✅ ESLint: 0 errors, 1 pre-existing warning
   - ✅ TypeScript: Compiled successfully
   - ✅ Tests: 6/6 passing
   - ✅ Build: Production build successful
   - ✅ All files formatted with Prettier

**Next Steps**: Start Phase 3 (Core Resources - Resource Display & Search)

---

## Earlier Session 3 Work (2025-10-24 - Session 3 Initial)

### 🔄 Phase 1 - Initial HeroUI Migration Attempt

**Attempted HeroUI migration, discovered React 19 incompatibility**

1. **HeroUI Documentation Setup** ✅
   - ✅ Downloaded complete HeroUI v2 docs locally (74 pages, 31MB via wget)
   - ✅ Saved to www.heroui.com/ (added to .gitignore, .prettierignore, eslint ignore)
   - ✅ Configured HeroUI MCP server in Claude Desktop
   - ✅ Local docs provide accurate v2 reference (MCP has v3 alpha)

2. **Initial Component Migration** ✅
   - ✅ Migrated login-form.tsx to HeroUI (Button, Input, Card, Link)
   - ✅ Migrated sign-up-form.tsx to HeroUI (Button, Input, Card, Link)
   - ✅ Migrated logout-button.tsx to HeroUI (Button)
   - ✅ Kept auth-button.tsx using shadcn (Server Component limitation)

3. **Issue Discovered** ⚠️
   - ❌ HeroUI v2.8.5 incompatible with React 19 (build error: `createContext is not a function`)
   - ❌ HeroUI v3 is alpha only, not production ready
   - ✅ User correctly identified issue was pre-existing

4. **Decision** 🎯
   - User decided to switch to Material UI v7 instead
   - Proceeded with Material UI migration (see current session above)

**Key Learnings**: Always verify UI library compatibility with framework versions before migration

---

## Previous Session (2025-10-24 - Session 2)

### ✅ Phase 2 COMPLETE - Database Setup

**All database infrastructure completed and verified!**

1. **Database Schema** ✅
   - ✅ Created 9 tables (users, resources, favorites, ratings, reviews, etc.)
   - ✅ Enabled PostGIS extension for geospatial queries
   - ✅ Created spatial indexes for location-based search
   - ✅ Created full-text search indexes
   - ✅ Created category and tag indexes

2. **Row Level Security** ✅
   - ✅ RLS enabled on all tables
   - ✅ 40+ security policies implemented
   - ✅ Admin-only access for sensitive operations
   - ✅ User-scoped access for personal data

3. **Database Functions & Triggers** ✅
   - ✅ Auto-update timestamps on all tables
   - ✅ Auto-calculate resource rating averages
   - ✅ Auto-update review counts
   - ✅ Auto-create user profiles on signup
   - ✅ Haversine distance calculation function
   - ✅ Get resources within radius function

4. **Seed Data** ✅
   - ✅ 10 Oakland-area resources loaded
   - ✅ Categories: Employment, Housing, Food, Healthcare, Legal, Education, etc.
   - ✅ All with real addresses and coordinates

5. **TypeScript Types** ✅
   - ✅ Generated types from database schema
   - ✅ Saved to [lib/types/database.ts](lib/types/database.ts)
   - ✅ Full type safety for all queries

6. **Security & Performance Audits** ✅
   - ✅ Ran Supabase security advisors
   - ✅ Ran performance advisors
   - ✅ All critical issues resolved
   - ✅ Minor warnings documented for future optimization

**Next Steps**: Ready to start Phase 3 (Core Resource Features)

---

## Previous Session (2025-10-23)

### ✅ Phase 0 COMPLETE

**All foundation & quality infrastructure tasks completed!**

1. **Documentation Infrastructure** ✅
   - ✅ Created SESSION_MANAGEMENT.md (token conservation strategies)
   - ✅ Created ARCHITECTURE_DECISIONS.md (ADR tracking)
   - ✅ Created IMPLEMENTATION_CHECKLIST.md (14-phase plan)
   - ✅ Committed all documentation

2. **Testing Infrastructure** ✅
   - ✅ Vitest: Installed, configured, 4/4 tests passing
   - ✅ Playwright: Installed, configured, 15/15 E2E tests passing across 5 browsers
   - ✅ Coverage: @vitest/coverage-v8 configured with 70% thresholds

3. **Code Quality Tools** ✅
   - ✅ Prettier: Installed with Tailwind plugin, formatting all files
   - ✅ ESLint: Configured with Prettier integration, 0 errors
   - ✅ Git Hooks: husky + lint-staged running on pre-commit

4. **TypeScript Improvements** ✅
   - ✅ ts-reset: Installed for enhanced type safety
   - ✅ Strict mode: All strict flags enabled

5. **Environment Validation** ✅
   - ✅ T3 Env: Installed and configured with Zod schemas
   - ✅ Migration: All code uses typed `env` import
   - ✅ Documentation: SETUP_GUIDE.md, CLAUDE.md updated

6. **Documentation Updates** ✅
   - ✅ Updated CLAUDE.md with Code Quality Infrastructure section
   - ✅ Updated TECHNICAL_ARCHITECTURE.md (already current)
   - ✅ Updated PROGRESS.md (this file)

7. **Phase 0.5: Enterprise Enhancements** ✅
   - ✅ ADR-005: User confirmed HeroUI choice
   - ✅ Bundle Analyzer: Installed and configured (@next/bundle-analyzer)
   - ✅ Commitlint: Conventional commits enforced
   - ✅ GitHub Actions: Full CI/CD pipeline created
   - ✅ Documentation: Updated CLAUDE.md with Phase 0.5 tools

### Next Steps ⏭️

**Ready for Phase 1**: HeroUI Implementation (decision made!)
**Alternative**: Phase 2 - Database Setup (can proceed in parallel)

---

## Phase 0: Foundation & Quality Infrastructure ✅ COMPLETE

**Goal**: Enterprise-grade testing, linting, and validation infrastructure

**Progress**: 100% complete (all tasks done)

### Checklist

#### 0.1 Testing Infrastructure ✅

- [x] 0.1.1 Vitest Setup
  - [x] Install Vitest dependencies
  - [x] Create vitest.config.mts
  - [x] Add test scripts to package.json
  - [x] Create **tests**/ directory
  - [x] Write example unit test
  - [x] Run tests and verify they pass ✅ 4/4 passing
- [x] 0.1.2 Playwright Setup
  - [x] Installed and configured for 5 browsers
  - [x] 15/15 tests passing
  - [x] Headless by default
- [x] 0.1.3 Test Coverage Configuration
  - [x] @vitest/coverage-v8 installed
  - [x] 70% thresholds configured

#### 0.2 Code Quality Tools ✅

- [x] 0.2.1 Prettier Setup
  - [x] Installed with Tailwind plugin
  - [x] All files formatted
- [x] 0.2.2 ESLint Configuration
  - [x] Prettier integration
  - [x] 0 errors
- [x] 0.2.3 Git Hooks (husky + lint-staged)
  - [x] Pre-commit hook configured
  - [x] Tested and working

#### 0.3 TypeScript Improvements ✅

- [x] 0.3.1 ts-reset Setup
  - [x] Installed and configured
- [x] 0.3.2 Type Safety Audit
  - [x] All strict flags enabled
  - [x] Build succeeds

#### 0.4 Environment Validation ✅

- [x] 0.4.1 T3 Env Setup
  - [x] Installed and schema created
  - [x] Build-time validation working
- [x] 0.4.2 Environment Variables Migration
  - [x] All code uses typed `env` import
  - [x] .env.example complete
- [x] 0.4.3 Environment Documentation
  - [x] SETUP_GUIDE.md updated
  - [x] CLAUDE.md updated

#### 0.5 Documentation Updates ✅

- [x] 0.5.1 Created core planning docs
- [x] 0.5.2 Update CLAUDE.md with testing patterns
- [x] 0.5.3 Update Technical Architecture

---

## Metrics

### Code Quality

- **Test Files**: 2 (1 unit, 1 E2E)
- **Unit Tests Written**: 4
- **Unit Tests Passing**: 4 ✅
- **E2E Tests Written**: 15 (across 5 browsers)
- **E2E Tests Passing**: 15 ✅
- **Test Coverage**: 70%+ target configured
- **ESLint Errors**: 0 ✅
- **Prettier Issues**: 0 ✅
- **TypeScript Errors**: 0 ✅ (build succeeds)

### Project Stats

- **Total Files**: ~50+ (mostly documentation)
- **Lines of Code**: ~200 (actual code)
- **Documentation Files**: 15+
- **Configuration Files**: 5+

### Git Activity

- **Total Commits**: 17
- **Commits This Session**: 7
- **Files Changed This Session**: 15+

---

## Blockers & Issues

### Current Blockers

1. **ADR-005: UI Library Decision** (⏳ Blocked)
   - Need user decision: HeroUI vs shadcn/ui
   - Affects Phase 1 timeline
   - Recommendation documented in ARCHITECTURE_DECISIONS.md
   - **Action Required**: User to review ADR-005 and decide

### Resolved Issues

- ✅ Fixed Vitest setup JSX handling (used React.createElement)
- ✅ Fixed test with multiple "Supabase" elements (used getAllByText)

---

## Key Decisions Made

See ARCHITECTURE_DECISIONS.md for full details:

1. **ADR-001**: Next.js 16 with App Router ✅
2. **ADR-002**: Supabase for Backend ✅
3. **ADR-003**: TypeScript Strict Mode ✅
4. **ADR-004**: Tailwind CSS ✅
5. **ADR-005**: UI Library (HeroUI vs shadcn) ⏳ PENDING
6. **ADR-006**: Vitest + Playwright Testing ✅
7. **ADR-007**: T3 Env Validation 📝 Proposed
8. **ADR-008**: ESLint + Prettier 📝 Proposed
9. **ADR-009**: OpenAI GPT-4o-mini ✅
10. **ADR-010**: Google Maps ✅

---

## Next Session Goals

### High Priority

1. **Complete Phase 0**: Finish testing, linting, and env validation
2. **Get UI Decision**: Review ADR-005 with user
3. **Database Setup**: Create Supabase schema and RLS policies

### Medium Priority

1. **Create PROGRESS template**: Establish progress tracking pattern
2. **Update Documentation**: Ensure all docs reflect current state
3. **First Feature**: Start Phase 3 (Resource List) if time allows

---

## Weekly Goals

### Week 1: Foundation & Core Features (Current)

- [x] Documentation infrastructure ✅
- [x] Testing infrastructure (Phase 0) ✅
- [x] Code quality tools (Phase 0) ✅
- [ ] UI Library decision and setup (Phase 1) - BLOCKED on user
- [ ] Database schema and setup (Phase 2)
- [ ] Basic resource list and detail pages (Phase 3)
- [ ] Search and filtering (Phase 3)
- **Target**: Browsable resource directory by end of week

### Week 2: Location & Maps

- [ ] Geolocation and distance calculations
- [ ] Google Maps integration
- [ ] Interactive map with markers
- [ ] Map/list toggle
- **Target**: Location-based search with map view

### Weeks 3-5

- See IMPLEMENTATION_CHECKLIST.md for detailed breakdown

---

## Session Notes

### 2025-10-23 Session 1

**Duration**: ~90 minutes
**Token Usage**: ~55k/200k (27% used)

**Accomplishments**:

- ✅ **COMPLETED PHASE 0** - Foundation & Quality Infrastructure
- Created comprehensive planning documentation
- Set up complete testing infrastructure (Vitest + Playwright)
- Configured code quality tools (Prettier + ESLint + git hooks)
- Enhanced TypeScript with ts-reset
- Implemented type-safe environment validation with T3 Env
- Updated all documentation

**Learnings**:

- Task agent research is valuable for preserving context
- Creating checkpoint documents (like this one) aids session handoffs
- TodoWrite is essential for tracking across sessions
- Phase 0 quality infrastructure provides solid foundation for development

**Next Time**:

- Get user decision on UI library (ADR-005: HeroUI vs shadcn/ui)
- Start Phase 2: Database setup
- Consider starting Phase 3: Core Resource features if time allows

---

## Demo Ready Features

**Phase 0 Infrastructure** (ready to demo):

- ✅ Unit tests: `npm test` (4/4 passing)
- ✅ E2E tests: `npm run test:e2e` (15/15 passing across 5 browsers)
- ✅ Code formatting: `npm run format`
- ✅ Linting: `npm run lint` (0 errors)
- ✅ Pre-commit hooks: Automatic quality checks on commit
- ✅ Environment validation: Type-safe env vars with build-time validation

**Next Demo Milestone**: After Phase 3 complete, demo:

- Browse resources
- Search and filter
- View resource details

---

## Notes & Reminders

### For Future Sessions

1. Always check this file first to understand current state
2. Update metrics after significant changes
3. Mark todos complete immediately when done
4. Commit frequently (every 15-30 minutes)
5. Ask for user review at demo milestones

### Important Files to Keep Updated

- ✅ PROGRESS.md (this file)
- ✅ TodoWrite state
- ⏳ ARCHITECTURE_DECISIONS.md (as decisions are made)
- ⏳ IMPLEMENTATION_CHECKLIST.md (check off tasks)

### Token Management

- Current: ~100k used / 200k available
- Task agents used: 1 (for research)
- Strategy: Use Task agents for research, keep main thread focused

---

## References

- [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) - Detailed task breakdown
- [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) - Key decisions and rationale
- [SESSION_MANAGEMENT.md](SESSION_MANAGEMENT.md) - Best practices for efficient sessions
- [CLAUDE.md](CLAUDE.md) - Quick reference for AI assistants
- [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) - System architecture

---

**Remember**: Quality over quantity. It's better to complete Phase 0 thoroughly than rush through multiple phases poorly.
