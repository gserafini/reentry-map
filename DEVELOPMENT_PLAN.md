# Reentry Map - Development Plan

This document provides a week-by-week plan for building the Phase 1 MVP.

## Overview

- **Total Duration**: 5 weeks
- **Development Environment**: Local with Supabase cloud database
- **Deployment**: Vercel (staging and production)
- **Version Control**: GitHub with feature branches

## Week 1: Foundation & Core Infrastructure

### Goals
- Complete project setup
- Build core resource display
- Implement basic search
- Deploy to staging

### Day 1: Project Setup (Monday)
**Tasks**:
- [ ] Create Supabase project
- [ ] Set up database schema
- [ ] Seed initial data (10 resources)
- [ ] Create Next.js project from template
- [ ] Configure environment variables
- [ ] Set up GitHub repository
- [ ] Initialize git and first commit

**Deliverable**: Project runs locally with database connected

### Day 2: Core UI Components (Tuesday)
**Tasks**:
- [ ] Install shadcn/ui components
- [ ] Create layout components (Header, Footer, Navigation)
- [ ] Build ResourceCard component
- [ ] Build ResourceList component
- [ ] Add Tailwind styling
- [ ] Make responsive for mobile

**Deliverable**: Resource list displays with cards

### Day 3: Resource Detail & Navigation (Wednesday)
**Tasks**:
- [ ] Create resource detail page (`/resources/[id]`)
- [ ] Display all resource information
- [ ] Add "Get Directions" button
- [ ] Add "Call" button
- [ ] Add "Visit Website" button
- [ ] Implement breadcrumb navigation

**Deliverable**: Can navigate to and view any resource

### Day 4: Search & Filtering (Thursday)
**Tasks**:
- [ ] Build SearchBar component
- [ ] Implement text search (Supabase full-text search)
- [ ] Add debouncing (300ms)
- [ ] Build CategoryFilter component
- [ ] Implement multi-select category filtering
- [ ] Add filter chips/tags
- [ ] Add "Clear filters" button

**Deliverable**: Search and filtering works smoothly

### Day 5: Testing & Deployment (Friday)
**Tasks**:
- [ ] Manual testing of all features
- [ ] Fix critical bugs
- [ ] Add loading states
- [ ] Add error states
- [ ] Deploy to Vercel staging
- [ ] Verify staging works
- [ ] Document Week 1 progress

**Deliverable**: Stable staging environment with core features

## Week 2: Location Features & Map View

### Goals
- Add geolocation
- Implement map view
- Add distance-based search
- Enhance resource discovery

### Day 6: Geolocation (Monday)
**Tasks**:
- [ ] Create useLocation hook
- [ ] Request user location permission
- [ ] Handle permission denied gracefully
- [ ] Calculate distance from user to resources
- [ ] Display distance on resource cards
- [ ] Sort by distance when location available
- [ ] Add manual location entry option

**Deliverable**: Distance-based sorting works

### Day 7: Google Maps Integration (Tuesday)
**Tasks**:
- [ ] Set up Google Maps JavaScript API
- [ ] Create ResourceMap component
- [ ] Display map with resource markers
- [ ] Color-code markers by category
- [ ] Add marker clustering
- [ ] Center map on user location
- [ ] Add zoom controls

**Deliverable**: Map displays all resources with markers

### Day 8: Map Interactivity (Wednesday)
**Tasks**:
- [ ] Implement marker click to show resource preview
- [ ] Create map info window component
- [ ] Add "View Details" button in info window
- [ ] Sync map view with search/filters
- [ ] Add toggle between list and map view
- [ ] Add full-screen map option
- [ ] Optimize map performance

**Deliverable**: Interactive map fully functional

### Day 9: Location Search & Filters (Thursday)
**Tasks**:
- [ ] Add "Near Me" button
- [ ] Implement distance filter slider (1-50 miles)
- [ ] Add manual address search
- [ ] Geocode manual addresses
- [ ] Update results based on distance filter
- [ ] Show resource count for current filters
- [ ] Add URL parameters for shareable filtered views

**Deliverable**: Advanced location filtering works

### Day 10: Polish & Testing (Friday)
**Tasks**:
- [ ] Add loading states for map
- [ ] Handle location errors gracefully
- [ ] Mobile map UX improvements
- [ ] Test on iOS and Android
- [ ] Performance testing (100+ markers)
- [ ] Fix bugs
- [ ] Deploy to staging
- [ ] Document Week 2 progress

**Deliverable**: Location features stable and performant

## Week 3: User Authentication & Favorites

### Goals
- Implement phone-based authentication
- Build user profiles
- Add favorites functionality
- Start rating system

### Day 11: Authentication Setup (Monday)
**Tasks**:
- [ ] Configure Supabase Auth (phone/SMS)
- [ ] Create AuthModal component
- [ ] Build PhoneAuth component (phone number entry)
- [ ] Implement OTP code entry
- [ ] Add code resend functionality
- [ ] Handle auth errors clearly
- [ ] Create useAuth hook

**Deliverable**: Users can sign in with phone

### Day 12: User Session & Profile (Tuesday)
**Tasks**:
- [ ] Implement session persistence
- [ ] Create UserProfile component
- [ ] Add profile page
- [ ] Allow name update
- [ ] Add sign out functionality
- [ ] Create protected route wrapper
- [ ] Update navigation to show auth state

**Deliverable**: User sessions work correctly

### Day 13: Favorites System (Wednesday)
**Tasks**:
- [ ] Create FavoriteButton component
- [ ] Implement toggle favorite functionality
- [ ] Add favorites to resource cards
- [ ] Add favorites to detail page
- [ ] Require auth for favorites
- [ ] Show visual feedback when favorited
- [ ] Create favorites page

**Deliverable**: Users can save and view favorites

### Day 14: Ratings System (Thursday)
**Tasks**:
- [ ] Create RatingStars component
- [ ] Implement rating submission
- [ ] Update resource average rating
- [ ] Display ratings on resource cards
- [ ] Display ratings on detail page
- [ ] Show rating count
- [ ] Add "Rate this resource" button
- [ ] Prevent multiple ratings per user

**Deliverable**: Rating system fully functional

### Day 15: Testing & Polish (Friday)
**Tasks**:
- [ ] Test auth flow thoroughly
- [ ] Test favorites across devices
- [ ] Test rating calculations
- [ ] Add loading states
- [ ] Handle edge cases
- [ ] Mobile UX testing
- [ ] Deploy to staging
- [ ] Document Week 3 progress

**Deliverable**: Auth, favorites, ratings stable

## Week 4: Reviews, Suggestions & AI Agents

### Goals
- Build review system
- Add community suggestions
- Implement AI enrichment
- Set up admin dashboard

### Day 16: Review System (Monday)
**Tasks**:
- [ ] Create ReviewForm component
- [ ] Implement review submission
- [ ] Add review validation
- [ ] Create ReviewsList component
- [ ] Display reviews on resource detail
- [ ] Sort reviews by helpfulness
- [ ] Add character limits
- [ ] Prevent duplicate reviews per user

**Deliverable**: Users can write and view reviews

### Day 17: Review Helpfulness (Tuesday)
**Tasks**:
- [ ] Add "Helpful" / "Not Helpful" buttons
- [ ] Implement vote recording
- [ ] Update helpfulness counts
- [ ] Sort reviews by votes
- [ ] Show vote counts on reviews
- [ ] Prevent multiple votes per review
- [ ] Add visual feedback for voting

**Deliverable**: Review helpfulness system works

### Day 18: Community Suggestions (Wednesday)
**Tasks**:
- [ ] Create suggestion form page
- [ ] Implement suggestion submission
- [ ] Validate suggestion data
- [ ] Create suggestions queue
- [ ] Add "Report a Problem" feature
- [ ] Create resource update requests
- [ ] Add confirmation messages

**Deliverable**: Users can suggest resources and report issues

### Day 19: AI Agent Implementation (Thursday)
**Tasks**:
- [ ] Create AI agent base classes
- [ ] Implement enrichment agent
  - Geocoding
  - Website scraping
  - Categorization
  - Photo collection
- [ ] Implement verification agent
  - Phone verification
  - Website status check
- [ ] Create agent runner
- [ ] Add API endpoints for agents
- [ ] Test agents on sample data

**Deliverable**: AI agents can enrich resources

### Day 20: Admin Dashboard (Friday)
**Tasks**:
- [ ] Create admin layout
- [ ] Build admin dashboard with metrics
- [ ] Create resource management page
- [ ] Create suggestions review page
- [ ] Create update requests review page
- [ ] Add approve/reject actions
- [ ] Trigger enrichment on approval
- [ ] Test admin workflows
- [ ] Deploy to staging
- [ ] Document Week 4 progress

**Deliverable**: Admin can manage content

## Week 5: Polish, Testing & Launch

### Goals
- Add PWA functionality
- Complete testing
- Add real content
- Soft launch

### Day 21: PWA Setup (Monday)
**Tasks**:
- [ ] Configure next-pwa
- [ ] Create manifest.json
- [ ] Generate app icons (192x192, 512x512)
- [ ] Add service worker
- [ ] Test PWA installation
- [ ] Test offline functionality
- [ ] Add "Add to Home Screen" prompt

**Deliverable**: App installable as PWA

### Day 22: Content Population (Tuesday)
**Tasks**:
- [ ] Research Oakland reentry resources
- [ ] Add 50+ verified resources
- [ ] Balance across categories
- [ ] Verify all phone numbers
- [ ] Add resource photos where possible
- [ ] Write clear descriptions
- [ ] Set eligibility requirements
- [ ] Run enrichment on all resources

**Deliverable**: 50+ high-quality resources in database

### Day 23: Comprehensive Testing (Wednesday)
**Tasks**:
- [ ] Test all user flows manually
- [ ] Test on multiple devices
  - iPhone (Safari)
  - Android (Chrome)
  - Desktop (Chrome, Safari, Firefox)
- [ ] Test with slow network (3G)
- [ ] Test with location disabled
- [ ] Test authentication edge cases
- [ ] Test admin workflows
- [ ] Run Lighthouse audits (target >90)
- [ ] Run accessibility audits (WAVE, axe)
- [ ] Create bug list

**Deliverable**: Comprehensive bug list

### Day 24: Bug Fixes & Polish (Thursday)
**Tasks**:
- [ ] Fix critical bugs
- [ ] Fix high-priority bugs
- [ ] Improve error messages
- [ ] Add helpful empty states
- [ ] Polish mobile UX
- [ ] Improve loading states
- [ ] Add micro-interactions
- [ ] Optimize images
- [ ] Review all copy for clarity

**Deliverable**: All critical and high-priority bugs fixed

### Day 25: Launch Preparation & Soft Launch (Friday)
**Tasks**:
- [ ] Final testing pass
- [ ] Set up production environment variables
- [ ] Deploy to production
- [ ] Verify production works
- [ ] Set up monitoring and alerts
- [ ] Create launch announcement
- [ ] Share with 5-10 beta users
- [ ] Monitor for issues
- [ ] Gather initial feedback
- [ ] Celebrate! 🎉

**Deliverable**: App live in production

## Post-Launch Week 1

### Goals
- Monitor usage and errors
- Gather user feedback
- Fix urgent issues
- Plan Phase 2

### Daily Tasks
- [ ] Check error logs
- [ ] Monitor user activity
- [ ] Respond to user feedback
- [ ] Fix urgent bugs
- [ ] Update documentation

### Week 1 Review
- [ ] Analyze usage metrics
- [ ] Review user feedback
- [ ] Identify pain points
- [ ] Prioritize improvements
- [ ] Plan Phase 2 features

## Development Best Practices

### Git Workflow
```bash
# Feature branch workflow
git checkout main
git pull origin main
git checkout -b feature/resource-map
# ... make changes ...
git add .
git commit -m "feat: add interactive resource map"
git push origin feature/resource-map
# Create PR on GitHub
# Merge after review
```

### Commit Message Format
```
feat: add new feature
fix: fix bug
docs: update documentation
style: formatting changes
refactor: code restructuring
test: add tests
chore: maintenance tasks
```

### Code Review Checklist
- [ ] Code follows project style guide
- [ ] No console.logs left in production code
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Mobile responsive
- [ ] Accessible (keyboard nav, screen readers)
- [ ] Performance optimized
- [ ] Security reviewed (no exposed secrets)

### Testing Checklist (Per Feature)
- [ ] Feature works as expected
- [ ] Edge cases handled
- [ ] Error cases handled
- [ ] Mobile tested
- [ ] Accessibility checked
- [ ] Performance acceptable
- [ ] No breaking changes to existing features

## Deployment Process

### Staging Deployment
```bash
# Push to staging branch
git checkout staging
git merge main
git push origin staging
# Vercel auto-deploys staging branch
```

### Production Deployment
```bash
# Create release
git checkout main
git tag -a v0.1.0 -m "Phase 1 MVP Launch"
git push origin v0.1.0
# Deploy to production via Vercel
```

### Rollback Procedure
```bash
# If production has critical bug
# Vercel dashboard > Deployments > Previous deployment > Promote to Production
# Or revert commit and redeploy
git revert <commit-hash>
git push origin main
```

## Daily Standup Format

Answer these three questions:
1. **What did I accomplish yesterday?**
2. **What will I work on today?**
3. **Are there any blockers?**

## Weekly Review Format

Every Friday:
1. **What did we ship this week?**
2. **What went well?**
3. **What could be improved?**
4. **What are next week's priorities?**
5. **Any risks or concerns?**

## Communication Plan

### For Claude Code
- All work tracked in GitHub Issues
- Feature requirements in issue descriptions
- Technical details in comments
- Progress updated daily
- Questions asked in issue comments

### For Stakeholders
- Weekly progress email
- Demo every Friday
- Feedback incorporated into backlog
- Blockers escalated immediately

## Risk Management

### Technical Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Supabase downtime | Low | High | Cache data locally, show cached results |
| Google Maps API limits exceeded | Medium | Medium | Monitor usage, implement rate limiting |
| OpenAI API costs too high | Medium | Low | Use GPT-4o-mini, limit agent runs |
| Performance issues with many resources | Medium | Medium | Implement pagination, optimize queries |
| Auth SMS delivery failures | Medium | High | Clear error messages, backup auth method |

### Content Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Insufficient initial resources | Low | High | Manual research and data entry |
| Inaccurate resource information | Medium | High | Verification process, user reports |
| Spam reviews | Low | Medium | Moderation queue, flag system |
| No user adoption | Medium | High | Partner with reentry orgs, direct outreach |

### Timeline Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Feature takes longer than expected | High | Medium | Prioritize ruthlessly, cut scope if needed |
| Unexpected bugs delay launch | Medium | Medium | Buffer time in Week 5, thorough testing |
| External API issues | Low | High | Have backup plans, graceful degradation |

## Success Metrics (Revisit Weekly)

### Week 1
- [ ] All core infrastructure works
- [ ] Resources display correctly
- [ ] Search functions properly

### Week 2
- [ ] Map view fully functional
- [ ] Location features work
- [ ] Performance acceptable

### Week 3
- [ ] Authentication works
- [ ] Users can save favorites
- [ ] Rating system operational

### Week 4
- [ ] Reviews working
- [ ] AI agents functional
- [ ] Admin dashboard complete

### Week 5
- [ ] 50+ resources added
- [ ] All bugs fixed
- [ ] PWA installable
- [ ] Soft launch complete

## Resources & References

### Documentation
- Next.js 15: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Tailwind CSS: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com
- Google Maps API: https://developers.google.com/maps/documentation

### Design Resources
- Figma (if designing): https://figma.com
- Lucide Icons: https://lucide.dev
- Coolors (color palettes): https://coolors.co

### Testing Tools
- Lighthouse: Built into Chrome DevTools
- WAVE: https://wave.webaim.org
- axe DevTools: Browser extension
- PageSpeed Insights: https://pagespeed.web.dev

### AI/Development
- OpenAI Playground: https://platform.openai.com/playground
- Claude Code: For implementation assistance
- GitHub Copilot: For code suggestions (optional)