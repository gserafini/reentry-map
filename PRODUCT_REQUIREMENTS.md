# Reentry Map - Product Requirements Document (PRD)

## 1. Product Overview

### 1.1 Product Vision
Reentry Map is a mobile-first web application that helps individuals navigating reentry 
find accurate, up-to-date resources in their community. It combines community knowledge 
with AI-powered automation to maintain a comprehensive, reliable directory of services.

### 1.2 Target Users
- **Primary**: Individuals recently released from incarceration
- **Secondary**: Parole/probation officers, reentry coaches, social workers
- **Tertiary**: Family members and support networks

### 1.3 Key Problems Solved
1. Resource information is scattered and outdated
2. Hard to find resources that accept people with criminal records
3. No way to know if a resource will actually help
4. Difficult to search by location when you don't know the area
5. No community feedback on resource quality

### 1.4 Success Criteria
- **Adoption**: 50+ active users in first month
- **Content**: 100+ verified resources in Oakland area
- **Engagement**: 20+ user reviews submitted
- **Accuracy**: 90%+ resource information verified as correct
- **Satisfaction**: 4+ star average user rating

## 2. Core Features (Phase 1 MVP)

### 2.1 Resource Directory

#### 2.1.1 Browse Resources
**User Story**: As a user, I want to browse all available resources so I can see what's available.

**Requirements**:
- Display resources as cards with key information
- Show resource name, category, address, phone
- Display rating (if available)
- Show distance from user (if location enabled)
- Paginate results (20 per page)
- Sort by: distance, rating, name, recently added

**Acceptance Criteria**:
- [ ] Resources display in grid/list view
- [ ] Each card shows required fields
- [ ] Distance calculated correctly
- [ ] Pagination works smoothly
- [ ] Sorting persists on page refresh

#### 2.1.2 Resource Detail View
**User Story**: As a user, I want to see complete information about a resource so I can decide if it's right for me.

**Requirements**:
- Full resource description
- Complete contact information (phone, email, website)
- Full address with map
- Hours of operation (formatted clearly)
- Eligibility requirements
- Services offered (list)
- Photos (if available)
- Average rating and review count
- Reviews from other users
- "Get Directions" button (opens Google Maps)
- "Call" button (tel: link)
- "Visit Website" button

**Acceptance Criteria**:
- [ ] All information displays correctly
- [ ] Map shows correct location
- [ ] Hours display in readable format
- [ ] Phone/directions/website buttons work
- [ ] Reviews load and display
- [ ] Page is responsive on mobile

### 2.2 Search & Filtering

#### 2.2.1 Text Search
**User Story**: As a user, I want to search for resources by keyword so I can quickly find what I need.

**Requirements**:
- Search bar prominent on home page
- Search across: name, description, services, tags
- Real-time search (debounced by 300ms)
- Show search results count
- Highlight matching text in results
- Clear search button
- Recent searches saved (local storage)

**Acceptance Criteria**:
- [ ] Search returns relevant results
- [ ] Results update as user types
- [ ] Matching text highlighted
- [ ] Fast response time (<500ms)
- [ ] Recent searches accessible

#### 2.2.2 Category Filtering
**User Story**: As a user, I want to filter resources by category so I can focus on what I'm looking for.

**Requirements**:
- Categories:
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
- Multi-select filtering
- Category counts (e.g., "Employment (23)")
- Clear all filters button
- Filters persist in URL parameters

**Acceptance Criteria**:
- [ ] All categories listed
- [ ] Multiple categories can be selected
- [ ] Counts update correctly
- [ ] URL updates with filters
- [ ] Shareable filtered URLs work

#### 2.2.3 Location-Based Search
**User Story**: As a user, I want to find resources near me so I can access them easily.

**Requirements**:
- "Near Me" button requests location permission
- Show resources within 25 miles by default
- Display distance for each resource
- Sort by distance (default when using location)
- Manual address entry option
- Distance filter slider (1-50 miles)
- Map view toggle

**Acceptance Criteria**:
- [ ] Location permission requested appropriately
- [ ] Distance calculated accurately
- [ ] Resources sorted by proximity
- [ ] Manual address search works
- [ ] Distance filter updates results
- [ ] Works without location permission

### 2.3 Map View

#### 2.3.1 Interactive Map
**User Story**: As a user, I want to see resources on a map so I can visualize where they are.

**Requirements**:
- Google Maps integration
- Markers for each resource (color-coded by category)
- Marker clusters for dense areas
- Click marker to see resource preview
- "View Details" button in preview popup
- Toggle between list and map view
- Map centers on user location (if available)
- Zoom controls
- Full-screen map option

**Acceptance Criteria**:
- [ ] Map loads and displays correctly
- [ ] Markers appear for all resources
- [ ] Marker clicks show correct resource
- [ ] Clustering works for nearby resources
- [ ] Map is responsive on mobile
- [ ] Performance is good (100+ markers)

### 2.4 User Authentication

#### 2.4.1 Phone-Based Sign Up/In
**User Story**: As a user, I want to sign in with my phone number so I can save favorites and leave reviews.

**Requirements**:
- Phone number entry (US format)
- SMS OTP code sent to phone
- 6-digit code entry
- Code expires after 10 minutes
- Resend code option (60 second cooldown)
- Auto-create user profile on first sign-in
- Remember user (session persists)
- Sign out option

**Acceptance Criteria**:
- [ ] Phone number validation works
- [ ] SMS code sends successfully
- [ ] Code verification works
- [ ] User profile created automatically
- [ ] Session persists across page loads
- [ ] Sign out clears session
- [ ] Error messages clear and helpful

#### 2.4.2 User Profile
**User Story**: As a user, I want to manage my profile so I can personalize my experience.

**Requirements**:
- Optional display name
- Phone number (read-only)
- Optional avatar (future)
- View favorites count
- View reviews count
- Delete account option

**Acceptance Criteria**:
- [ ] Profile displays correctly
- [ ] Name can be updated
- [ ] Counts accurate
- [ ] Changes save successfully

### 2.5 Favorites

#### 2.5.1 Save Favorites
**User Story**: As a user, I want to save resources as favorites so I can easily find them later.

**Requirements**:
- Heart/star icon on resource cards
- Toggle favorite on/off
- Requires authentication
- Prompt to sign in if not authenticated
- Visual feedback when favorited
- Add optional personal note to favorite

**Acceptance Criteria**:
- [ ] Favorite button visible on all resource views
- [ ] Toggle works instantly
- [ ] Auth required and enforced
- [ ] Visual state updates immediately
- [ ] Notes can be added/edited

#### 2.5.2 View Favorites
**User Story**: As a user, I want to view all my saved favorites so I can quickly access important resources.

**Requirements**:
- Dedicated favorites page
- Display as resource cards
- Show personal notes
- Remove from favorites option
- Empty state if no favorites
- Sort by: recently added, name, distance

**Acceptance Criteria**:
- [ ] Favorites page accessible from navigation
- [ ] All favorites display correctly
- [ ] Notes visible on cards
- [ ] Remove function works
- [ ] Empty state helpful and encouraging

### 2.6 Ratings & Reviews

#### 2.6.1 Rate Resources
**User Story**: As a user, I want to rate resources so others know which ones are helpful.

**Requirements**:
- 1-5 star rating
- Quick rating (stars only, no text required)
- One rating per user per resource
- Can update rating
- Requires authentication
- Rating updates resource average instantly

**Acceptance Criteria**:
- [ ] Star rating UI intuitive
- [ ] Rating submits successfully
- [ ] One rating per user enforced
- [ ] Can change rating
- [ ] Average updates on resource detail
- [ ] Auth required

#### 2.6.2 Write Reviews
**User Story**: As a user, I want to write detailed reviews so I can help others make informed decisions.

**Requirements**:
- Review includes:
  - 1-5 star rating
  - Review text (optional, 500 char max)
  - "Was this helpful?" (yes/no)
  - "Would you recommend?" (yes/no)
  - Pros (optional)
  - Cons (optional)
  - Tips for others (optional)
  - Date visited (optional)
- One review per user per resource
- Can edit own review
- Cannot delete (can mark as outdated)
- Requires authentication

**Acceptance Criteria**:
- [ ] Review form accessible from resource detail
- [ ] All fields work correctly
- [ ] Character limits enforced
- [ ] One review per user enforced
- [ ] Can edit own review
- [ ] Review displays on resource detail

#### 2.6.3 Review Helpfulness
**User Story**: As a user, I want to mark reviews as helpful so the best reviews appear first.

**Requirements**:
- "Helpful" / "Not Helpful" buttons on each review
- One vote per user per review
- Can change vote
- Reviews sorted by helpfulness
- Helpfulness count visible
- Requires authentication

**Acceptance Criteria**:
- [ ] Vote buttons visible on reviews
- [ ] One vote per user enforced
- [ ] Vote updates count immediately
- [ ] Sorting reflects helpfulness
- [ ] Auth required to vote

### 2.7 Community Contributions

#### 2.7.1 Suggest New Resource
**User Story**: As a user, I want to suggest resources that are missing so others can benefit.

**Requirements**:
- Suggestion form with fields:
  - Resource name (required)
  - Address (required)
  - Phone (optional)
  - Website (optional)
  - Description (required)
  - Category (required, dropdown)
  - Why suggesting (optional)
  - Personal experience (optional)
- Submit to admin queue
- Confirmation message after submission
- Can view own suggestions and status
- Requires authentication

**Acceptance Criteria**:
- [ ] Form accessible from navigation
- [ ] All required fields validated
- [ ] Submission creates pending suggestion
- [ ] Confirmation shown to user
- [ ] User can view submission status
- [ ] Auth required

#### 2.7.2 Report Issues
**User Story**: As a user, I want to report incorrect information so the directory stays accurate.

**Requirements**:
- "Report a Problem" button on resource detail
- Issue types:
  - Phone number wrong
  - Address wrong
  - Hours changed
  - Permanently closed
  - Other (with description)
- Submit to admin queue
- Confirmation message
- Requires authentication

**Acceptance Criteria**:
- [ ] Report button visible on resource detail
- [ ] Issue types cover common problems
- [ ] Other option allows custom description
- [ ] Submission creates update request
- [ ] Confirmation shown to user
- [ ] Auth required

### 2.8 AI Automation (Background)

#### 2.8.1 Resource Discovery
**User Story**: As an admin, I want AI to find new resources automatically so the directory stays comprehensive.

**Requirements**:
- Weekly automated search for:
  - 211 directory listings
  - Government websites
  - Google search results for reentry services
  - Nonprofit databases
- Deduplicate against existing resources
- Create pending suggestions for review
- Log all discoveries

**Acceptance Criteria**:
- [ ] Agent runs on schedule (weekly)
- [ ] Discovers new potential resources
- [ ] No duplicates created
- [ ] Suggestions appear in admin queue
- [ ] All runs logged

#### 2.8.2 Resource Enrichment
**User Story**: As an admin, I want AI to fill in missing information so resources are complete.

**Requirements**:
- Runs when new resource added
- Enrichment actions:
  - Geocode address to lat/lng
  - Scrape website for description/hours/services
  - Get photos from Google Maps
  - Get hours from Google Business
  - Categorize based on description
  - Add relevant tags
- Calculate completeness score
- Log all enrichments

**Acceptance Criteria**:
- [ ] Runs automatically on resource creation
- [ ] Fills in missing fields when possible
- [ ] Geocoding accurate
- [ ] Photos downloaded correctly
- [ ] Completeness score calculated
- [ ] All runs logged

#### 2.8.3 Resource Verification
**User Story**: As an admin, I want AI to verify resource information periodically so it stays accurate.

**Requirements**:
- Runs quarterly on all resources
- Verification checks:
  - Phone number still works
  - Website still accessible
  - Business still open (Google status)
  - Hours match current Google data
- Update verification score
- Flag resources with low scores
- Log all verifications

**Acceptance Criteria**:
- [ ] Runs on schedule (quarterly)
- [ ] All checks performed
- [ ] Verification score updated
- [ ] Low-scoring resources flagged
- [ ] All runs logged

### 2.9 Admin Features

#### 2.9.1 Admin Dashboard
**User Story**: As an admin, I want to see key metrics so I can monitor the platform's health.

**Requirements**:
- Metrics display:
  - Total resources
  - Active resources
  - Pending suggestions
  - Pending update requests
  - Total users
  - Reviews this week
  - Resources added this week
- Quick actions:
  - Add new resource
  - Review suggestions
  - Review update requests
- Recent activity feed

**Acceptance Criteria**:
- [ ] Dashboard accessible to admins only
- [ ] All metrics accurate
- [ ] Quick actions work
- [ ] Activity feed shows recent changes

#### 2.9.2 Manage Resources
**User Story**: As an admin, I want to add and edit resources so I can maintain quality.

**Requirements**:
- List all resources (paginated, searchable)
- Add new resource form
- Edit resource form
- Delete resource (soft delete)
- Mark as verified
- Change status (active/inactive/pending)
- View AI agent logs for resource
- Manually trigger enrichment

**Acceptance Criteria**:
- [ ] Resource list displays correctly
- [ ] Add form creates resource
- [ ] Edit form updates resource
- [ ] Delete marks as inactive
- [ ] Verification status updates
- [ ] Agent logs accessible
- [ ] Manual enrichment works

#### 2.9.3 Review Suggestions
**User Story**: As an admin, I want to review user suggestions so I can add valuable resources.

**Requirements**:
- List pending suggestions
- View suggestion details
- Approve suggestion (creates resource)
- Reject suggestion (with optional reason)
- Mark as duplicate (link to existing resource)
- Approval triggers auto-enrichment

**Acceptance Criteria**:
- [ ] Suggestions list displays pending items
- [ ] Approve creates resource correctly
- [ ] Reject updates status
- [ ] Duplicate detection works
- [ ] Enrichment triggered on approval

#### 2.9.4 Review Update Requests
**User Story**: As an admin, I want to review reported issues so I can keep information accurate.

**Requirements**:
- List pending update requests
- View request details and current values
- Apply update (modifies resource)
- Reject update (with optional reason)
- Bulk actions for common updates

**Acceptance Criteria**:
- [ ] Update requests list displays pending items
- [ ] Apply updates resource correctly
- [ ] Reject updates status
- [ ] Bulk actions work efficiently

## 3. Non-Functional Requirements

### 3.1 Performance
- Page load time: < 3 seconds on 3G
- Search results: < 500ms
- Map rendering: < 2 seconds for 100 markers
- API response time: < 200ms (p95)
- Smooth animations (60fps)

### 3.2 Accessibility
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatible
- Color contrast ratios > 4.5:1
- Focus indicators visible
- Touch targets > 44x44px

### 3.3 Browser Support
- Chrome 90+ (primary)
- Safari 14+ (iOS primary)
- Firefox 88+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

### 3.4 Mobile Experience
- Mobile-first design
- Touch-friendly interfaces
- Installable as PWA
- Works offline (cached resources)
- Fast on slow connections

### 3.5 Security
- HTTPS only
- Secure authentication (SMS OTP)
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting on APIs
- Row-level security (RLS)

### 3.6 Reliability
- 99.9% uptime target
- Graceful error handling
- Data backup daily
- No data loss on errors
- Session persistence

### 3.7 Scalability
- Support 1,000 concurrent users
- Handle 10,000+ resources
- Database query optimization
- Image optimization and CDN
- Horizontal scaling capability

## 4. User Flows

### 4.1 First-Time User Flow
1. Land on home page
2. See map with resources
3. Grant location permission (optional)
4. Browse or search resources
5. Click resource to view details
6. Click "Get Directions" or "Call"
7. Return to browse more

### 4.2 Returning User - Find Resource Flow
1. Open app (PWA icon or URL)
2. Search for specific need (e.g., "food")
3. Apply category filter
4. Toggle to map view
5. Click marker to see resource
6. View details and hours
7. Save as favorite (auth prompt if needed)
8. Get directions

### 4.3 User Contribution Flow
1. Find resource in directory
2. Notice information is wrong
3. Click "Report a Problem"
4. Sign in with phone (if not already)
5. Select issue type
6. Submit report
7. See confirmation message

### 4.4 Review Writing Flow
1. Use a resource
2. Return to app
3. Navigate to resource detail
4. Click "Write a Review"
5. Sign in with phone (if not already)
6. Rate with stars
7. Write review text and tips
8. Submit review
9. See review appear on resource page

### 4.5 Admin Approval Flow
1. Log in to admin dashboard
2. See "5 Pending Suggestions" notification
3. Click to review suggestions
4. View first suggestion details
5. Verify information looks legitimate
6. Click "Approve & Enrich"
7. AI enrichment runs automatically
8. Resource appears in directory
9. Move to next suggestion

## 5. Design Principles

### 5.1 Simplicity
- Clear, simple language (8th grade reading level)
- Minimal clicks to accomplish tasks
- Progressive disclosure of complexity
- No jargon or technical terms

### 5.2 Dignity & Respect
- Never stigmatizing language
- Neutral, helpful tone
- No assumptions about user situation
- Privacy-first approach

### 5.3 Mobile-First
- Thumb-friendly touch targets
- Fast loading on slow connections
- Works without app store download
- Installable to home screen

### 5.4 Trustworthy
- Show verification status clearly
- Display community ratings/reviews
- Transparent about data sources
- Contact information prominent

### 5.5 Community-Driven
- Easy to contribute
- User input valued and acted upon
- Reviews and ratings prominent
- Social proof visible

## 6. Content Requirements

### 6.1 Initial Content
- Minimum 50 verified resources in Oakland area
- At least 5 resources in each major category
- Complete information (all required fields)
- At least one photo per resource (where possible)

### 6.2 Resource Quality Standards
- Phone number verified (called and confirmed)
- Address geocoded accurately
- Hours of operation current
- Eligibility clearly stated
- Description clear and helpful
- Accepts people with records confirmed

### 6.3 Categories Distribution
Target distribution for initial launch:
- Employment: 10 resources
- Housing: 8 resources
- Food: 10 resources
- Substance Abuse: 6 resources
- Healthcare: 6 resources
- Legal Aid: 5 resources
- Transportation: 3 resources
- Education: 4 resources
- Clothing: 3 resources
- Other categories: 5 resources combined

## 7. Launch Requirements

### 7.1 Technical Checklist
- [ ] All core features implemented and tested
- [ ] Database migrations run successfully
- [ ] Environment variables configured
- [ ] SSL certificate active
- [ ] PWA manifest configured
- [ ] Error tracking enabled
- [ ] Analytics configured
- [ ] Backup system tested
- [ ] Rate limiting implemented
- [ ] Admin account created

### 7.2 Content Checklist
- [ ] 50+ resources added and verified
- [ ] All resources have complete information
- [ ] Categories balanced
- [ ] Photos added where possible
- [ ] Test reviews added (clearly marked)

### 7.3 Testing Checklist
- [ ] All user flows tested manually
- [ ] Mobile devices tested (iOS and Android)
- [ ] Authentication tested
- [ ] Search and filtering tested
- [ ] Map functionality tested
- [ ] PWA installation tested
- [ ] Performance tested (Lighthouse > 90)
- [ ] Accessibility tested (WAVE, axe)

### 7.4 Documentation Checklist
- [ ] User guide written
- [ ] Admin guide written
- [ ] FAQ created
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Contact information published

## 8. Metrics & Analytics

### 8.1 User Metrics
- Daily/Monthly Active Users (DAU/MAU)
- New user signups
- User retention (7-day, 30-day)
- Session duration
- Pages per session

### 8.2 Engagement Metrics
- Resources viewed
- Searches performed
- Favorites added
- Reviews written
- Resources suggested
- Map interactions

### 8.3 Content Metrics
- Total resources
- Resources per category
- Resources with reviews
- Average rating per resource
- Resource completeness score
- Verification status distribution

### 8.4 Business Metrics
- User satisfaction (NPS)
- Resource accuracy rate
- Time to add new resource
- AI agent success rate
- Support tickets received

## 9. Future Enhancements (Post-MVP)

### 9.1 Phase 2 Features
- Document scanning (release papers)
- Calendar reminders for appointments
- Transportation routing (multi-stop)
- Offline-first functionality
- Push notifications
- Spanish language support

### 9.2 Phase 3 Features
- Coach messaging
- Check-in tracking
- Goal setting
- Peer connections
- Job matching
- Housing waitlist management

### 9.3 Phase 4 Features
- Native mobile apps (iOS/Android)
- Voice search
- SMS interface
- Integration with case management systems
- Outcomes tracking
- Grant reporting automation