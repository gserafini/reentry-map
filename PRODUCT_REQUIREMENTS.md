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

#### 2.4.2 User Profile (Basic - MVP)

**User Story**: As a user, I want to manage my profile so I can personalize my experience.

**Requirements (MVP)**:

- Display name (currently single field, will split to first/last)
- Phone number (read-only)
- Optional avatar (Gravatar/future upload)
- View favorites count
- View reviews count
- Delete account option

**Acceptance Criteria**:

- [ ] Profile displays correctly
- [ ] Name can be updated
- [ ] Counts accurate
- [ ] Changes save successfully

#### 2.4.3 Enhanced User Profile System (Phase 2 - See Section 2.10)

**User Story**: As a user, I want a profile that understands my role and needs so I get relevant content and features.

**See Section 2.10 for comprehensive profile requirements including**:

- Role-based profiles (Returning Citizen, Coach, Volunteer, Leader, General Public)
- Progressive onboarding wizard
- Personalized dashboards
- Privacy controls

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

### 2.10 Enhanced User Profile & Role System (Phase 2 Feature)

**Reference**: See ADR-013 for complete technical specification

This section documents the comprehensive user profile system planned for Phase 2, which will transform the platform from a simple resource directory into a community platform serving multiple user types.

#### 2.10.1 Overview & User Roles

**Vision**: Build profiles that understand who users are and personalize their experience accordingly.

**User Roles**:

1. **Returning Citizen** - Primary users navigating reentry
2. **Reentry Coach** - Professionals supporting returning citizens
3. **Angel Team Volunteer** - Community volunteers
4. **Angel Team Leader** - Volunteer coordinators
5. **General Public** - Family, advocates, interested community
6. **Admin** - Platform administrators (existing)

**Key Features**:

- Role-based profile fields (show relevant fields only)
- Progressive onboarding wizard (6 steps, < 10 minutes)
- Personalized dashboards (different for each role)
- Privacy controls (default private, user-controlled)
- Profile completeness tracking

#### 2.10.2 Baseline Profile Fields (All Users)

**User Story**: As any user, I want basic profile fields that apply to everyone.

**Requirements**:

**Core Identity** (required):

- First name (separate from last name)
- Last name
- Email (verified)
- Phone (optional, verified if provided)
- Avatar (Gravatar + optional upload)

**Account Settings**:

- User type/role (selected during onboarding)
- Secondary roles (optional, e.g., "Returning Citizen" + "Volunteer")
- Preferred language (English, Spanish future)
- Timezone (auto-detect, editable)
- Notification preferences (email, SMS, push)

**Privacy**:

- Profile visibility (public/community/private, default private)
- Show on leaderboard (opt-in)
- Data sharing consent for research (opt-in)
- Email verified status
- Phone verified status

**Location** (optional but recommended):

- City, State, Zip code
- Show location publicly (opt-in, default no)

**System Tracking** (automatic):

- Onboarding completion status
- Current onboarding step (resume capability)
- Profile completeness percentage (0-100%)
- Last active timestamp

**Acceptance Criteria**:

- [ ] First/last name stored separately
- [ ] Email verification required before full access
- [ ] Profile completeness auto-calculated
- [ ] Location used for distance calculations
- [ ] Privacy defaults to most restrictive

#### 2.10.3 Returning Citizen Profile (Extended Fields)

**User Story**: As a returning citizen, I want my profile to help me find relevant resources and track my reentry journey without feeling stigmatized.

**Journey Context** (all optional, private by default):

- Reentry date (privacy-sensitive, encrypted)
- Support timeline (pre-release | first 90 days | established | long-term)
- Primary needs (max 5: employment, housing, healthcare, etc.)
- Immediate needs (urgent: ID, food, shelter)
- Personal goals (free-text, 500 chars)
- Goal categories (structured for tracking)

**Support Network**:

- Has case manager (yes/no)
- Case manager: name, email, phone (if yes)
- Emergency contact: name, phone, relationship

**Practical Information**:

- Has valid ID (yes/no), type if yes
- Has reliable transportation (yes/no), method
- Has smartphone (yes/no)
- Internet access (home | mobile | public library | limited)
- Accessibility needs (array: wheelchair, vision, hearing, etc.)
- Special accommodations (free-text)

**Privacy & Dignity**:

- All fields optional
- No required sensitive information
- Clear "why we ask" for every field
- No stigmatizing language
- User controls what's shared

**Acceptance Criteria**:

- [ ] All fields optional
- [ ] Reentry date encrypted in database
- [ ] Primary needs limited to 5
- [ ] Clear help text for every field
- [ ] No jargon or complex language
- [ ] Default visibility: private

#### 2.10.4 Reentry Coach Profile (Extended Fields)

**User Story**: As a reentry coach, I want a profile that helps returning citizens find me and understand how I can help them.

**Professional Information** (required for public profile):

- Organization name, type (government | nonprofit | private | faith-based)
- Job title
- Years of experience in reentry work
- Credentials/certifications (array)
- Specializations (employment, housing, etc.)

**Availability & Capacity**:

- Current caseload size
- Accepting new clients (yes/no toggle)
- Maximum caseload capacity
- Weekly availability (JSONB schedule)
- Preferred contact method (email | phone | text | in-person)
- Response time expectation (text, e.g., "within 24 hours")

**Service Areas**:

- Service categories (required, multi-select)
- Geographic area served (text)
- Languages spoken (array)
- Offers virtual services (yes/no)

**Public Profile** (visible to returning citizens):

- Professional bio (500 char max)
- Success stories count (auto-tracked)
- Verified coach badge (admin-approved)

**Acceptance Criteria**:

- [ ] Organization info required for activation
- [ ] Bio visible on public coach directory
- [ ] Availability clearly shown to returning citizens
- [ ] Can toggle "accepting clients" easily
- [ ] Admin verification process for badge
- [ ] Service categories match resource taxonomy

#### 2.10.5 Angel Team Volunteer Profile (Extended Fields)

**User Story**: As a volunteer, I want to track my contributions, find opportunities matching my skills, and feel recognized for my work.

**Volunteer Information**:

- Volunteer since (date)
- Volunteer status (active | inactive | on-hold)
- Hours per month availability
- Volunteer interests (multi-select)
- Skills to share (professional/personal, array)

**Verification & Onboarding**:

- Background check status (pending | cleared | expired | failed)
- Background check date
- Onboarding completed date
- Orientation attended (yes/no)
- Agreements signed (JSONB: waivers, confidentiality)

**Engagement Tracking**:

- Volunteer activities (types of work done)
- Total lifetime hours logged (auto-tracked)
- Projects participated (array)
- Preferred schedule (JSONB, weekly availability)

**Recognition**:

- Volunteer level (bronze | silver | gold | platinum, auto-assigned by hours)
- Badges earned (array, achievement system)
- Recognition notes (admin-visible only)

**Acceptance Criteria**:

- [ ] Background check required before "active" status
- [ ] Hours logged automatically via timesheet
- [ ] Volunteer level auto-upgrades (Bronze: 0-25h, Silver: 26-100h, Gold: 101-500h, Platinum: 500h+)
- [ ] Badges awarded automatically for milestones
- [ ] Volunteer opportunities matched to interests
- [ ] Recognition visible on profile

#### 2.10.6 Angel Team Leader Profile (Extended Fields)

**User Story**: As a team leader, I need additional tools to manage volunteers and coordinate projects beyond my own volunteer work.

**Inherits all Volunteer Profile fields, plus**:

**Leadership Information**:

- Team name (text)
- Team size (number of volunteers managed)
- Leadership since (date)
- Leadership training completed (yes/no)

**Responsibilities**:

- Areas of responsibility (array: outreach, training, events, etc.)
- Projects managed (array)
- Budget responsibility (yes/no)
- Can approve new volunteers (yes/no, permission)

**Communication**:

- Team meeting schedule (text, e.g., "First Monday 6pm")
- Preferred communication tools (array: Slack, email, phone)
- Office hours for team members (JSONB)

**Acceptance Criteria**:

- [ ] Can view all team members in dashboard
- [ ] Can approve volunteer onboarding (if permission granted)
- [ ] Team dashboard shows aggregate stats
- [ ] Can assign projects to volunteers
- [ ] Team communication preferences visible
- [ ] Projects tracked with status

#### 2.10.7 General Public Profile (Extended Fields)

**User Story**: As a member of the general public, I want to explore resources and learn how I can help without needing an extensive profile.

**Interest & Engagement**:

- How did you hear about us (text, referral tracking)
- Interest areas (multi-select)
- Want to volunteer (yes/no)
- Want to donate (yes/no)
- Want newsletter updates (yes/no)
- Profession (optional text)
- Can provide resources/connections (yes/no)

**Relationship to Reentry**:

- Relationship type (family member | friend | advocate | researcher | curious | other)
- Motivation (free-text: "why are you here?")

**Acceptance Criteria**:

- [ ] Minimal required fields
- [ ] Can convert to volunteer profile later
- [ ] Interest areas personalize dashboard
- [ ] Newsletter subscription integrated with email system
- [ ] Relationship type helps analytics

#### 2.10.8 Progressive Onboarding Wizard

**User Story**: As a new user, I want a simple signup process that doesn't overwhelm me but collects enough info to personalize my experience.

**Design Principles**:

- Fast initial signup (< 1 minute)
- Progressive disclosure (collect more later)
- Clear progress indication
- Mobile-first, touch-friendly
- Simple language (8th grade level)
- Skip optional steps
- Save progress (resume later)

**Flow**:

**Step 1: Minimal Signup** (< 1 minute)

- First name (required)
- Last name (required)
- Email (required)
- Password (required) OR Phone number for OTP
- Terms of service acceptance (checkbox)
- **Output**: Unverified account created
- **Next**: Verification

**Step 2: Verification** (< 2 minutes)

- Email: verification link sent, user clicks
- Phone: 6-digit OTP sent, user enters code
- Resend option (60 second cooldown)
- **Output**: Verified account
- **Next**: Role selection

**Step 3: Role Selection** (< 30 seconds)
**Prompt**: "Welcome! To personalize your experience, let us know who you are:"

- [ ] **Returning Citizen** - "I'm navigating reentry and looking for resources"
- [ ] **Reentry Coach** - "I'm a professional supporting returning citizens"
- [ ] **Angel Team Volunteer** - "I volunteer to help the reentry community"
- [ ] **Angel Team Leader** - "I coordinate volunteers and projects"
- [ ] **General Public** - "I'm here to learn, support, or find information"

_Each option has a friendly icon and 1-sentence description_

**Output**: User type set, wizard branches to role-specific questions
**Next**: Essential profile

**Step 4: Essential Profile** (< 3 minutes)
_Questions vary by role, but always include_:

- **Location**: "Where are you located?" (City, Zip)
  - _Why we ask: "Help us show you nearby resources"_
- **Primary needs/interests** (checkboxes, max 5)
  - Returning Citizens: "What are you looking for help with?"
  - Coaches: "What areas do you specialize in?"
  - Volunteers: "What are you interested in helping with?"
- **Notification preferences**: "How should we contact you?"
  - Email notifications (yes/no)
  - SMS updates (yes/no, requires phone)
- **Privacy**: "Who can see your profile?"
  - Private (recommended, default)
  - Community (coaches/volunteers)
  - Public (everyone)

**Progress indicator**: "Step 3 of 5" with visual progress bar

**Output**: Essential profile complete
**Next**: Extended profile (optional)

**Step 5: Extended Profile** (< 5 minutes, optional)
_Role-specific deep-dive, all fields optional_

**Returning Citizens**:

- "Tell us more so we can help you better" (supportive tone)
- Support timeline (when did you return?)
- Do you have a case manager?
- Transportation access?
- Internet access?
- Emergency contact?

**Coaches**:

- Organization details
- Credentials & specializations
- Current availability
- Professional bio (for public profile)

**Volunteers**:

- Skills and interests
- Hours available per month
- Background check upload
- Preferred volunteer activities

**Prominent "Skip for now" button** - emphasize they can complete this later

**Output**: Extended profile complete (or skipped)
**Next**: Completion

**Step 6: Completion & Dashboard** (< 1 minute)

- **Success message**: "Welcome to Reentry Map, [First Name]! 🎉"
- Profile completion badge/celebration animation
- Quick dashboard tour (3-4 screens with highlights)
- **Role-specific call-to-action**:
  - Returning Citizens: "Find resources near you →"
  - Coaches: "Explore the resource directory →"
  - Volunteers: "See volunteer opportunities →"
- **Output**: Redirect to personalized dashboard

**Requirements**:

- Total onboarding: 5-10 minutes maximum
- Save progress at each step (can resume later)
- Skip button on optional steps
- Clear "why we ask" for sensitive questions
- No required sensitive information
- Mobile-responsive (works on any screen size)
- Accessible (keyboard nav, screen readers, high contrast)
- Fast loading (each step < 1 second)

**Acceptance Criteria**:

- [ ] Signup completes in < 1 minute
- [ ] Email verification required before dashboard access
- [ ] Role selection has 5 clear, distinct options
- [ ] Questions branch correctly based on role
- [ ] Progress bar accurate at each step
- [ ] Can skip optional questions without penalty
- [ ] Can resume onboarding later from any step
- [ ] Mobile-responsive and touch-friendly
- [ ] WCAG 2.1 AA accessible
- [ ] Works on slow connections (3G)
- [ ] No jargon or confusing language
- [ ] "Why we ask" clear for every field

#### 2.10.9 Personalized Dashboards

**User Story**: As a user with a specific role, I want a dashboard that shows me relevant content, quick actions, and important information for my needs.

**Design Principles**:

- Role-specific (different for each user type)
- Widget-based (modular, configurable future)
- Real-time data
- Quick actions prominent
- Mobile-first responsive
- Fast loading (< 2 seconds)

##### Returning Citizen Dashboard

**Hero Section**:

- Greeting: "Welcome back, [First Name]!"
- Profile completeness bar (if < 100%)
- Quick actions (large buttons):
  - Search Resources
  - My Favorites
  - Get Help

**Main Widgets**:

1. **Recommended Resources** (based on primary_needs)
   - Shows 3-5 resources matching their needs
   - "Why we're showing this" explanation
   - Quick view: name, category, distance, rating

2. **Resources Near You** (based on location)
   - Map view with nearby resources
   - List view toggle
   - Filter by category

3. **Your Next Steps** (based on goals)
   - Actionable todo items
   - Milestone tracking
   - Encouraging messages

4. **Recent Activity**
   - Your recent favorites
   - Your recent reviews
   - Resources you viewed

5. **Support Contacts** (if has_case_manager)
   - Quick access to case manager
   - Emergency contact
   - Help line numbers

**Acceptance Criteria**:

- [ ] Recommendations based on profile needs
- [ ] Near you uses actual location
- [ ] Next steps personalized to goals
- [ ] Recent activity accurate
- [ ] Support contacts easily accessible
- [ ] All widgets load < 2 seconds
- [ ] Empty states for new users
- [ ] Mobile-responsive

##### Reentry Coach Dashboard

**Hero Section**:

- Greeting: "Welcome, [First Name]!"
- Quick stats: caseload, new reviews, pending suggestions
- Quick actions:
  - Find Resources
  - Suggest Resource
  - View Updates

**Main Widgets**:

1. **Recently Updated Resources** (in specializations)
   - Resources in coach's areas of expertise
   - What changed (address, hours, etc.)
   - Review and verify option

2. **Resources by Category** (service areas)
   - Browse by categories coach supports
   - Completeness indicators
   - Add/suggest button

3. **Community Activity**
   - New reviews on resources
   - New suggestions pending
   - User questions (future)

4. **Your Contributions**
   - Resources you suggested
   - Reviews you wrote
   - Impact metrics

5. **Helpful Resources** (most reviewed)
   - Top-rated resources in area
   - Most viewed this week
   - Trending up

**Acceptance Criteria**:

- [ ] Updates filtered by specializations
- [ ] Categories match service areas
- [ ] Activity real-time
- [ ] Contributions tracked accurately
- [ ] Helpful resources algorithm sound

##### Volunteer Dashboard

**Hero Section**:

- Greeting: "Welcome, [First Name]!"
- Impact summary: total hours, current level, next badge
- Quick actions:
  - Log Hours
  - View Opportunities
  - Team Updates

**Main Widgets**:

1. **Volunteer Opportunities** (matching interests)
   - Open opportunities
   - Match percentage
   - Time commitment
   - Apply/express interest

2. **Your Impact Stats**
   - Total hours logged
   - Current volunteer level
   - Badges earned
   - Hours this month

3. **Team Updates** (from team leader)
   - Team announcements
   - Upcoming team meetings
   - Team stats

4. **Training Resources**
   - Required training
   - Optional learning
   - Certification tracking

5. **Upcoming Events**
   - Volunteer events
   - Community events
   - Calendar integration

**Acceptance Criteria**:

- [ ] Opportunities match volunteer interests
- [ ] Impact stats accurate and real-time
- [ ] Team updates from actual team leader
- [ ] Training completion tracked
- [ ] Events synced with calendar

##### General Public Dashboard

**Hero Section**:

- Greeting: "Welcome, [First Name]!"
- Prompt to complete profile or explore
- Quick actions:
  - Explore Resources
  - Learn More
  - Get Involved

**Main Widgets**:

1. **Browse Resources** (directory overview)
   - Categories overview
   - Total resources count
   - Search bar
   - Featured resources

2. **How to Help**
   - Become a volunteer
   - Donate
   - Advocate
   - Share with others

3. **Success Stories**
   - Community impact
   - Testimonials
   - Statistics

4. **Recent Updates**
   - New resources added
   - Platform updates
   - Blog posts (future)

**Acceptance Criteria**:

- [ ] Directory browse functional
- [ ] Volunteer signup clear
- [ ] Success stories inspiring
- [ ] Updates relevant and timely

#### 2.10.10 Profile Page Design

**User Story**: As a user, I want to view and edit my profile information in a clear, organized way that doesn't overwhelm me.

**Layout Structure**:

**Header Section**:

- Avatar (large, 200x200px, click to edit)
- First + Last name (editable inline)
- User type badge(s) (e.g., "Returning Citizen" + "Volunteer")
- Profile completeness progress bar (if < 100%, with "Complete your profile" link)
- Primary "Edit Profile" button

**Tabbed Layout**:

**Tab 1: Basic Information** (all users)

- **Contact**:
  - Email (verified badge if verified, "Verify" link if not)
  - Phone (optional, verified badge)
  - Preferred contact method
- **Location**:
  - City, State, Zip
  - Show publicly (toggle)
- **Preferences**:
  - Language
  - Timezone (auto-detected, editable)
- **Security**:
  - Change password
  - Two-factor authentication (future)

**Tab 2: Role Information** (varies by role)

- Role-specific fields organized into collapsible sections
- Icons for each section (visual clarity)
- Help text for complex fields
- "Why we ask" tooltips (? icon)
- Max 3-5 fields per section (progressive disclosure)

**Tab 3: Privacy & Notifications**

- **Privacy**:
  - Profile visibility (radio: public/community/private)
  - Show on leaderboard (toggle)
  - Data sharing for research (toggle)
- **Notifications**:
  - Email notifications (checkboxes by type)
  - SMS notifications (requires verified phone)
  - Push notifications (browser permission)
- **Data Rights**:
  - Export my data
  - Delete my account (confirmation required)

**Tab 4: Activity & Stats** (optional)

- Favorites count (clickable → favorites page)
- Reviews written (clickable → my reviews)
- Resources suggested (clickable → my suggestions)
- Volunteer hours (if applicable)
- Achievements/badges (grid display)

**Design Principles**:

**Simplicity**:

- Max 3-5 fields per section
- Plain language ("Where do you live?" not "Residential Address")
- Icons for visual hierarchy
- Inline help text (not modals)

**Progressive Disclosure**:

- Essential fields first
- "Show more" for advanced options
- Collapsible sections (closed by default)
- "Why we ask" as tooltips, not blocking

**Visual Hierarchy**:

- Required fields: red asterisk
- Optional fields: lighter gray text
- Section headers: bold with icons
- White space between groups

**Accessibility**:

- High contrast (4.5:1 minimum)
- Touch targets 44px minimum
- Keyboard navigation (tab order logical)
- Screen reader labels
- Error messages clear and actionable

**Mobile-First**:

- Single column layout
- Thumb-friendly button placement
- Minimal scrolling per section
- Sticky save button (always visible)
- Swipeable tabs

**Requirements**:

- Auto-save on field blur (with loading indicator)
- Manual "Save" button for batch changes
- Validation on submit
- Success/error toast notifications
- Unsaved changes warning
- Fast rendering (< 1 second)

**Acceptance Criteria**:

- [ ] All profile fields editable
- [ ] Changes save successfully with feedback
- [ ] Validation clear and helpful
- [ ] Tabs work on mobile (swipe + tap)
- [ ] Profile completeness updates live
- [ ] Help tooltips don't block UI
- [ ] Keyboard navigable (no mouse required)
- [ ] Screen reader announces changes
- [ ] Works on slow connections
- [ ] Graceful degradation without JS
- [ ] No data loss on browser back button

#### 2.10.11 Privacy, Security & Compliance

**Requirements**:

**Data Minimization**:

- Most fields optional
- Clear justification for every field ("why we ask")
- Don't collect unnecessary data
- Purge unused data regularly

**Privacy Controls**:

- **Profile visibility**:
  - Private (default): only user sees full profile
  - Community: coaches/volunteers see basic info
  - Public: anyone can see (opt-in only)
- **Granular field visibility** (future):
  - Control visibility per field
  - E.g., show location to coaches but hide from public
- **Opt-out options**:
  - Leaderboards (default opt-out)
  - Analytics/research (default opt-out)
  - Directory listings (coaches/volunteers can opt out)

**Sensitive Data Handling**:

- **Reentry dates**: encrypted at rest, never logged
- **Case manager info**: private, never shared
- **Emergency contacts**: private, never shared
- **Background checks**: status only, file upload secure
- **Health/accessibility**: private, optional, never required

**Access Control**:

- Row Level Security (RLS) on all profile tables
- Users can only view/edit their own profiles
- Admins require explicit permission for sensitive fields
- Coaches cannot see returning citizen profiles without consent (future)
- Audit logging for all profile changes

**Data Rights (GDPR Compliance)**:

- **Right to access**: Export all data (JSON format)
- **Right to rectification**: Edit any field
- **Right to erasure**: Delete account with full data purge
- **Right to portability**: Download profile data
- **Right to object**: Opt out of analytics/research

**Security**:

- All data encrypted at rest
- All connections HTTPS only
- Password requirements enforced
- Session timeouts
- No sensitive data in URLs or logs
- Rate limiting on profile updates

**Compliance**:

- Privacy policy linked prominently
- Terms of service acceptance required
- Clear consent for data sharing
- Age verification (18+ required)
- Mandatory reporting exceptions documented

**Acceptance Criteria**:

- [ ] Privacy policy clear and accessible
- [ ] Default settings most restrictive
- [ ] Users can export all their data (JSON)
- [ ] Delete account purges all personal data within 30 days
- [ ] Reentry dates never appear in logs or error messages
- [ ] RLS policies prevent unauthorized access
- [ ] Audit trail for all profile changes
- [ ] GDPR-compliant data handling
- [ ] Age verification at signup
- [ ] Clear consent flows

---

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

#### 9.1.1 Recently Viewed Resources (Browse History)

**User Story**: As a user, I want to see resources I've recently viewed so I can easily return to them.

**Requirements**:

- Track resource views automatically
- Display chronological list of recently viewed resources
- Show relative timestamps ("2 hours ago", "Yesterday")
- Optional date grouping (Today, Yesterday, This Week, Older)
- Limit to last 50 viewed resources (FIFO)
- "Clear History" button with confirmation
- Access from navigation or user menu
- Empty state when no history exists

**Implementation Options**:

- **Option A (MVP)**: localStorage-based (client-side, no sync)
- **Option B (Future)**: Database-backed (syncs across devices)

**Acceptance Criteria**:

- [ ] Views tracked on resource detail page
- [ ] History list displays with timestamps
- [ ] Click resource to view detail page
- [ ] Clear history removes all entries
- [ ] Mobile-friendly layout
- [ ] Works for anonymous users
- [ ] Privacy-friendly (clear message about tracking)

**Reference**: See ADR-012 and Phase 6.4 in Implementation Checklist

#### 9.1.2 Other Phase 2 Features

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
