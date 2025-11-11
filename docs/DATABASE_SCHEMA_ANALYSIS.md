# Reentry Map Database Schema Analysis: Verification & Suggestion Flow

## Executive Summary

The database implements a sophisticated verification and suggestion pipeline with **extensive automation through triggers and stored procedures**. The system tracks data provenance, manages research tasks, and implements autonomous AI verification with multi-agent coordination.

---

## 1. Database Triggers & Auto-Updating Mechanisms

### 1.1 Timestamp Management Triggers

**File**: `20250101000002_functions_triggers.sql`

```sql
update_updated_at_column()
├── Trigger: update_users_updated_at (BEFORE UPDATE on users)
├── Trigger: update_resources_updated_at (BEFORE UPDATE on resources)
└── Trigger: update_resource_reviews_updated_at (BEFORE UPDATE on resource_reviews)
```

**What it does**: Automatically sets `updated_at = NOW()` on any UPDATE operation. Runs BEFORE the update completes.

---

### 1.2 Resource Rating Aggregation (Auto-Calculated Stats)

**Triggers**: 3 triggers (insert, update, delete)

```sql
update_resource_rating() → AFTER INSERT|UPDATE|DELETE ON resource_ratings
├── Recalculates: resources.rating_average (AVG of all ratings)
└── Recalculates: resources.rating_count (COUNT of all ratings)
```

**Auto-updates these fields on resources table:**

- `rating_average` - Average of all 1-5 star ratings
- `rating_count` - Total number of ratings

**When**: Whenever a rating is added, changed, or deleted

---

### 1.3 Review Count Aggregation

**Triggers**: 3 triggers (insert, update, delete)

```sql
update_resource_review_count() → AFTER INSERT|UPDATE|DELETE ON resource_reviews
├── WHERE approved = true (only counts approved reviews)
└── Updates: resources.review_count
```

**Auto-updates**: `resources.review_count` (only approved reviews count)

**When**: Whenever a review is created, updated, or deleted

---

### 1.4 Review Helpfulness Voting Aggregation

**Triggers**: 3 triggers (insert, update, delete)

```sql
update_review_helpfulness_count() → AFTER INSERT|UPDATE|DELETE ON review_helpfulness
├── Counts: helpful = true → resource_reviews.helpful_count
└── Counts: helpful = false → resource_reviews.not_helpful_count
```

**Auto-updates on resource_reviews:**

- `helpful_count` - Number of "helpful" votes
- `not_helpful_count` - Number of "not helpful" votes

**When**: Whenever someone votes on review helpfulness

---

### 1.5 Verification Status & Next Verification Date

**Triggers**: 2 triggers

```sql
update_next_verification() → BEFORE UPDATE ON resources (verification_status field)
├── Function: calculate_next_verification(resource_data)
└── Sets: next_verification_at = NOW() + 30 days (by default)
```

**Auto-updates on resources:**

- `last_verified_at` - When was this verified (manual in code)
- `next_verification_at` - When should it be re-verified

**When**: Whenever `verification_status` is updated to 'verified'

**Field-level cadence** (defined in function, refined by Verification Agent):

- Phone: 30 days (most volatile)
- Website: 60 days
- Hours: 60 days
- Email: 90 days
- Address: 180 days
- Name: 365 days

---

### 1.6 Verification Timestamp Auto-Update

**File**: `20250109000003_verification_tracking.sql`

```sql
update_last_verified_timestamp() → BEFORE UPDATE ON resources
├── Triggers when: address, phone, email, website, hours, or services_offered change
└── Auto-sets: last_verified_at = NOW()
```

**When**: Whenever critical resource data is modified

---

### 1.7 User Profile Auto-Creation on Auth Signup

**Trigger**: On auth.users INSERT (from Supabase Auth)

```sql
handle_new_user() → AFTER INSERT ON auth.users
├── Automatically creates: public.users row
├── Sets: phone from auth.users.phone
└── Links: via users.id = auth.users.id
```

**When**: User completes phone OTP signup

---

### 1.8 County Coverage Metrics Auto-Update

**File**: `20250109000004_research_pipeline.sql`

```sql
update_county_coverage_metrics() → AFTER INSERT|UPDATE|DELETE ON resources
├── Updates: county_coverage.resource_count
│   └── COUNT(*) WHERE city = county AND state = state AND status = 'active'
├── Updates: county_coverage.coverage_score
│   └── (resource_count / target_resource_count) * 100
└── Updates: county_coverage.updated_at
```

**When**: Any resource is added, modified, or deleted

**Important**: Uses `city` field to match against `county` in county_coverage table

---

### 1.9 Research Task Progress Auto-Update

**Triggers**: 2 behaviors from 1 function

```sql
update_research_task_progress() → AFTER INSERT|UPDATE ON resource_suggestions
├── If research_task_id is set:
│   ├── Updates: research_tasks.resources_found
│   │   └── COUNT(*) WHERE research_task_id = this
│   ├── Updates: research_tasks.resources_published
│   │   └── COUNT(*) WHERE research_task_id = this AND status = 'approved'
│   └── AUTO-COMPLETE: If resources_published >= target_count
│       └── Sets: status = 'completed', completed_at = NOW()
└── Updates: research_tasks.updated_at
```

**When**: A suggestion is created or its status changes

**Auto-completion logic**:

- Task auto-completes when published resource count reaches target
- Marks `completed_at = NOW()`

---

### 1.10 Expansion Priority Score Auto-Calculation

**File**: `20250110000002_expansion_priorities.sql`

```sql
auto_calculate_priority_score() → BEFORE INSERT|UPDATE ON expansion_priorities
├── Calls: calculate_expansion_priority_score()
│   ├── Metro population: 0-300 points
│   ├── State release volume: 0-250 points
│   ├── Data availability: 0-200 points
│   ├── Geographic clustering: 0-150 points
│   └── Community partners: 0-100 points (10 pts each, max 10)
└── Sets: priority_score (0-1000 composite)
```

**When**: Any input factor changes (metro_population, state_release_volume, etc.)

**Score breakdown** (total max 1000 points):

```
metro_population / 10000 = max 300 pts
state_release_volume / 1000 = max 250 pts
data_availability_score * 2 = max 200 pts
geographic_cluster_bonus * 1.5 = max 150 pts
community_partner_count * 10 = max 100 pts
```

---

### 1.11 Expansion Launch Milestone Auto-Creation

```sql
create_launch_milestone() → BEFORE UPDATE ON expansion_priorities
├── Triggers when: status changes to 'launched'
├── Creates: expansion_milestones record (type='launched')
├── Auto-sets: actual_launch_date = NOW() (if not set)
└── Sets: milestone_date = actual_launch_date
```

**When**: Admin marks a location as 'launched'

---

### 1.12 Expansion Updated Timestamp

```sql
update_expansion_priorities_updated_at() → BEFORE UPDATE on expansion_priorities
└── Auto-sets: updated_at = NOW()
```

---

## 2. Auto-Updating Fields Summary Table

| Field                     | Table                | Updated By | Trigger                                | When                           |
| ------------------------- | -------------------- | ---------- | -------------------------------------- | ------------------------------ |
| `rating_average`          | resources            | trigger    | update_resource_rating                 | Any rating change              |
| `rating_count`            | resources            | trigger    | update_resource_rating                 | Any rating change              |
| `review_count`            | resources            | trigger    | update_resource_review_count           | Any approved review change     |
| `helpful_count`           | resource_reviews     | trigger    | update_review_helpfulness_count        | Helpfulness vote               |
| `not_helpful_count`       | resource_reviews     | trigger    | update_review_helpfulness_count        | Helpfulness vote               |
| `updated_at`              | resources            | trigger    | update_resources_updated_at            | Any field update               |
| `last_verified_at`        | resources            | trigger    | update_last_verified_timestamp         | Key field change               |
| `next_verification_at`    | resources            | trigger    | update_next_verification               | verification_status='verified' |
| `resource_count`          | county_coverage      | trigger    | update_county_coverage_metrics         | Resource add/update/delete     |
| `coverage_score`          | county_coverage      | trigger    | update_county_coverage_metrics         | Resource add/update/delete     |
| `resources_found`         | research_tasks       | trigger    | update_research_task_progress          | Suggestion created             |
| `resources_published`     | research_tasks       | trigger    | update_research_task_progress          | Suggestion approved            |
| `status` (to 'completed') | research_tasks       | trigger    | update_research_task_progress          | Target reached                 |
| `priority_score`          | expansion_priorities | trigger    | auto_calculate_priority_score          | Factor change                  |
| `updated_at`              | expansion_priorities | trigger    | update_expansion_priorities_updated_at | Any field update               |

---

## 3. Complete Flow: Suggestion → Resource → Verification

### 3.1 Step-by-Step Flow

```
STEP 1: USER SUBMITS SUGGESTION
┌─────────────────────────────────────────────────────┐
│ User fills suggest-resource form or API call       │
│ - name, address, phone, website, category, etc.    │
│ - All fields copied to expanded resource_suggestions│
│ - discovered_via: 'manual', 'websearch', 'import'  │
│ - research_task_id: linked if from research queue  │
│                                                     │
│ INSERT into resource_suggestions                   │
│ - status: 'pending' (default)                      │
│ - created_at: NOW()                                │
│                                                     │
│ TRIGGER: update_research_task_progress()           │
│ - resources_found ++ (if research_task_id set)     │
└─────────────────────────────────────────────────────┘
                    ↓
STEP 2: ADMIN REVIEWS & APPROVES
┌─────────────────────────────────────────────────────┐
│ Admin dashboard shows pending suggestions          │
│ Admin clicks "Approve" or "Reject"                 │
│                                                     │
│ UPDATE resource_suggestions                        │
│ - status: 'approved' (or 'rejected'/'duplicate')   │
│ - reviewed_by: admin_user_id                       │
│ - reviewed_at: NOW()                               │
│ - review_notes: "Looks good" or rejection reason   │
│                                                     │
│ TRIGGER: update_research_task_progress()           │
│ - resources_published ++                           │
│ - Check: IF published >= target THEN status='completed'
└─────────────────────────────────────────────────────┘
                    ↓ (if approved)
STEP 3: CREATE RESOURCE FROM SUGGESTION
┌─────────────────────────────────────────────────────┐
│ Admin clicks "Create Resource" button              │
│ OR system auto-creates (future automation)         │
│                                                     │
│ INSERT into resources                              │
│ - Copy all fields from suggestion                  │
│ - name, address, phone, email, website, hours, etc│
│ - status: 'active' (default)                       │
│ - ai_discovered: false (user-submitted)            │
│ - verification_status: 'pending'                   │
│ - created_at: NOW()                                │
│                                                     │
│ UPDATE resource_suggestions                        │
│ - created_resource_id: <resource_id>               │
│                                                     │
│ TRIGGER: update_county_coverage_metrics()          │
│ - county_coverage.resource_count ++                │
│ - county_coverage.coverage_score recalc            │
│ - county_coverage.updated_at = NOW()               │
└─────────────────────────────────────────────────────┘
                    ↓
STEP 4: INITIAL VERIFICATION (AI Agent)
┌─────────────────────────────────────────────────────┐
│ Verification Agent runs (autonomous)               │
│ - Verification type: 'initial'                     │
│ - Agent performs adversarial checks                │
│ - Checks: phone exists, website works, address real│
│ - Detects: conflicts, changes, data quality       │
│                                                     │
│ INSERT into verification_logs                      │
│ - resource_id: <resource_id>                       │
│ - verification_type: 'initial'                     │
│ - checks_performed: {phone: pass, website: pass}   │
│ - overall_score: 0.92 (example)                    │
│ - decision: 'auto_approve'|'flag_for_human'|etc    │
│ - auto_approved: true/false                        │
│                                                     │
│ UPDATE resources (auto by trigger if decision logic)
│ - verification_status: 'verified' (or 'flagged')   │
│ - verification_confidence: 0.92                    │
│ - ai_last_verified: NOW()                          │
│ - human_review_required: true/false                │
│ - provenance: {...verification history...}        │
│                                                     │
│ TRIGGER: update_next_verification()                │
│ - next_verification_at = NOW() + 30 days           │
│ - last_verified_at = NOW() (via code)              │
└─────────────────────────────────────────────────────┘
                    ↓
STEP 5: HUMAN REVIEW (if flagged)
┌─────────────────────────────────────────────────────┐
│ IF human_review_required = true:                   │
│ - Admin sees resource in flagged dashboard         │
│ - Reviews verification_logs details                │
│ - Clicks "Approve", "Reject", "Needs more work"   │
│                                                     │
│ UPDATE verification_logs                           │
│ - human_reviewed: true                             │
│ - human_reviewer_id: admin_id                      │
│ - human_decision: 'approved'/'rejected'/etc        │
│ - human_notes: "Phone doesn't answer, check later" │
│                                                     │
│ UPDATE resources (based on decision)               │
│ - verification_status: 'verified' or 'rejected'    │
│ - human_review_required: false                     │
└─────────────────────────────────────────────────────┘
                    ↓
STEP 6: PERIODIC RE-VERIFICATION
┌─────────────────────────────────────────────────────┐
│ Verification Agent checks: NOW() >= next_verification_at
│ - Verification type: 'periodic'                    │
│ - Checks most volatile fields: phone, website      │
│ - Compares against verification_history            │
│                                                     │
│ INSERT into verification_logs                      │
│ - resource_id: <resource_id>                       │
│ - verification_type: 'periodic'                    │
│ - changes_detected: [{field: 'phone', old: '...'}] │
│                                                     │
│ UPDATE resources                                   │
│ - verification_status: stays 'verified' or → flagged
│ - verification_history: append new check results   │
│ - next_verification_at: NOW() + 30 days (recalc)   │
│                                                     │
│ TRIGGER: update_next_verification()                │
│ - next_verification_at = NOW() + 30 days           │
│ - last_verified_at = NOW()                         │
└─────────────────────────────────────────────────────┘
                    ↓
STEP 7: CHANGES DETECTED → FLAGGING
┌─────────────────────────────────────────────────────┐
│ IF verification agent detects changes:             │
│ - Phone number changed                             │
│ - Website redirects or down                        │
│ - Address no longer valid                          │
│ - Business hours changed significantly             │
│                                                     │
│ INSERT into verification_logs                      │
│ - changes_detected: [{field: 'phone', ...}]        │
│ - decision: 'flag_for_human'                       │
│                                                     │
│ UPDATE resources                                   │
│ - verification_status: 'flagged'                   │
│ - human_review_required: true                      │
│ - UpdatedCause: field changes detected             │
│                                                     │
│ ADMIN NOTIFIED: Resource marked for review         │
│ - Can see what changed in verification_logs        │
│ - Can update fields or reject changes              │
└─────────────────────────────────────────────────────┘
```

---

## 4. Tables Involved in Suggestion → Resource → Verification Flow

### 4.1 `resource_suggestions` Table

**Purpose**: Store user-submitted resource ideas pending admin review

**Key Fields**:

```sql
id                    UUID PRIMARY KEY
suggested_by          UUID → users.id
created_resource_id   UUID → resources.id (set after approval)
research_task_id      UUID → research_tasks.id (if from research queue)

-- Expanded to match resources table (in 20250109000000)
name, address, city, state, zip, phone, email, website
description, services_offered[], categories[], tags[]
hours, eligibility_requirements, required_documents, fees, languages, etc.

-- Tracking
status                TEXT ('pending'|'approved'|'rejected'|'duplicate')
discovered_via        TEXT ('manual'|'websearch'|'webfetch'|'import')
discovery_notes       TEXT (search query, URL found at, etc.)
reviewed_by           UUID → users.id
reviewed_at           TIMESTAMPTZ
review_notes          TEXT
admin_notes           TEXT

created_at            TIMESTAMPTZ
```

**Indexes**:

- `idx_suggestions_status` - for admin dashboard
- `idx_suggestions_user` - user's own suggestions
- `idx_resource_suggestions_research_task` - suggestions from research

---

### 4.2 `resources` Table

**Verification-Related Fields**:

```sql
-- Verification Status (20250109000000)
verification_status           TEXT ('pending'|'verified'|'flagged'|'rejected')
verification_confidence       DECIMAL(0-1) (how confident in verification)
human_review_required         BOOLEAN (needs admin eyes)
verification_history          JSONB (array of all verification events)
last_verified_at              TIMESTAMPTZ (auto-updated by trigger)
next_verification_at          TIMESTAMPTZ (auto-calculated by trigger)
provenance                    JSONB (complete discovery/verification history)

-- Legacy verification fields
verified                      BOOLEAN (old, may be deprecated)
verified_by                   UUID → users.id
verified_date                 TIMESTAMPTZ

-- Tracking source
ai_discovered                 BOOLEAN (found by AI agent vs user)
ai_enriched                   BOOLEAN (filled in missing data)
ai_last_verified              TIMESTAMPTZ
ai_verification_score         DOUBLE (0-1)
data_completeness_score       DOUBLE (0-1)

-- Status
status                        TEXT ('active'|'inactive'|'pending'|'closed')

-- Auto-updated aggregate stats
rating_average                DOUBLE (auto from ratings)
rating_count                  INTEGER (auto from ratings)
review_count                  INTEGER (auto from approved reviews)
view_count                    INTEGER (manual tracking in code)

created_at, updated_at        TIMESTAMPTZ (auto-updated by trigger)
```

**Indexes for verification**:

- `idx_resources_verification_status` - query by status
- `idx_resources_next_verification` - find resources due for re-verification
- `idx_resources_human_review` - admin dashboard

---

### 4.3 `verification_logs` Table

**Purpose**: Complete audit trail of every verification attempt

**Key Fields**:

```sql
id                        UUID PRIMARY KEY
resource_id               UUID → resources.id
suggestion_id             UUID → resource_suggestions.id (initial verification)

-- What was verified
verification_type         TEXT ('initial'|'periodic'|'triggered')
agent_version             TEXT (version of verification agent)

-- Results
overall_score             DECIMAL(0-1) (confidence 0-100%)
checks_performed          JSONB ({
  "phone_valid": true,
  "website_accessible": true,
  "address_real": false,
  ...
})
conflicts_found           JSONB (array of conflicts from adversarial checks)
changes_detected          JSONB (array of fields that changed since last check)

-- Decision
decision                  TEXT ('auto_approve'|'flag_for_human'|'auto_reject')
decision_reason           TEXT (why this decision)
auto_approved             BOOLEAN

-- Human review
human_reviewed            BOOLEAN
human_reviewer_id         UUID → users.id
human_decision            TEXT ('approved'|'rejected'|'needs_work')
human_notes               TEXT

-- Performance
started_at                TIMESTAMPTZ
completed_at              TIMESTAMPTZ
duration_ms               INTEGER
api_calls_made            INTEGER
estimated_cost_usd        DECIMAL(10,4)

created_at, updated_at    TIMESTAMPTZ
```

**Indexes**:

- `idx_verification_logs_resource` - all verifications for a resource
- `idx_verification_logs_decision` - query by decision type
- `idx_verification_logs_human_review` - find flagged items
- `idx_verification_logs_created` - chronological view

---

### 4.4 `county_coverage` Table

**Purpose**: Track how many resources in each county (auto-updated by trigger)

**Auto-Updated Fields**:

```sql
resource_count            INTEGER (auto from trigger)
coverage_score            DECIMAL (auto: resource_count/target * 100)
updated_at                TIMESTAMPTZ (auto-updated)
```

**Trigger**: `update_county_coverage_metrics()`

- Runs AFTER any INSERT/UPDATE/DELETE on resources
- Counts active resources matching city/state
- Recalculates coverage_score
- Updates updated_at

---

### 4.5 `research_tasks` Table

**Purpose**: Queue of discovery research work for agents to pick up

**Auto-Updated Fields**:

```sql
resources_found           INTEGER (auto from trigger)
resources_published       INTEGER (auto: count approved suggestions)
status                    TEXT (auto-sets to 'completed' when target hit)
completed_at              TIMESTAMPTZ (auto-set)
updated_at                TIMESTAMPTZ (implicit)
```

**Trigger**: `update_research_task_progress()`

- Runs AFTER INSERT or UPDATE on resource_suggestions
- If suggestion.research_task_id is set:
  - Count all suggestions (resources_found)
  - Count approved suggestions (resources_published)
  - If resources_published >= target_count:
    - Auto-set status = 'completed'
    - Auto-set completed_at = NOW()

---

### 4.6 `expansion_priorities` Table

**Purpose**: Geographic expansion strategy (admin-only)

**Auto-Updated Fields**:

```sql
priority_score            INTEGER (auto-calculated, 0-1000)
updated_at                TIMESTAMPTZ (auto on any update)
actual_launch_date        TIMESTAMPTZ (auto-set on status='launched')
```

**Triggers**:

1. `auto_calculate_priority_score()` - Before INSERT/UPDATE
   - Recalculates composite score from input factors
2. `create_launch_milestone()` - Before UPDATE
   - Creates expansion_milestones record when status='launched'
3. `update_expansion_priorities_updated_at()` - Before UPDATE
   - Updates updated_at timestamp

---

### 4.7 `expansion_milestones` Table

**Purpose**: Track progress milestones for locations

**Auto-Created Records**:

- When expansion_priorities.status changes to 'launched'
- Trigger creates milestone_type='launched' record
- Sets milestone_date to actual_launch_date (or NOW())

---

## 5. Data Completeness & Verification Quality Views

### 5.1 `resources_needing_verification` View

**Purpose**: Find resources that need verification/re-verification

**Columns**:

```sql
id, name, address, city, state, email, website, last_verified_at,
verification_source, created_at,
days_since_verification,
verification_priority (0-100 score)
```

**Priority Scoring** (higher = more urgent):

- 100: Missing email
- 90: No verification source documented
- 80: Old verification (6+ months)
- 70: No contact info (no phone AND no email)
- 50: Standard re-verification

**Order**: By verification_priority DESC, then last_verified_at ASC

---

### 5.2 `verification_quality_metrics` View

**Aggregates**:

```sql
total_resources                    COUNT(*)
resources_with_email               COUNT(email)
resources_with_source              COUNT(verification_source)
recently_verified                  COUNT(last_verified_at > 3 months)
email_coverage_percent             (with_email / total) * 100
source_documented_percent          (with_source / total) * 100
recent_verification_percent        (recent / total) * 100
```

**Only for**: status = 'active' resources

---

### 5.3 `expansion_priorities_with_progress` View

**Adds calculated fields**:

```sql
progress_percentage       (current_resource_count / target * 100)
milestone_count           COUNT(milestones)
last_milestone_date       MAX(milestone.date)
```

---

## 6. Gaps in Automation & Missing Pieces

### 6.1 What IS Automated

✅ **Aggregate Stats**

- Rating average/count auto-calculated on rating change
- Review count auto-calculated on review change
- Helpfulness votes auto-counted

✅ **Verification Scheduling**

- next_verification_at auto-calculated when verification_status='verified'
- last_verified_at auto-updated on key field changes

✅ **County Coverage Tracking**

- resource_count auto-calculated when resources change
- coverage_score auto-calculated

✅ **Research Task Progress**

- resources_found auto-counted
- resources_published auto-counted
- status auto-set to 'completed' when target reached

✅ **Expansion Scoring**

- priority_score auto-calculated from factors
- Launch milestones auto-created

✅ **Timestamps**

- updated_at auto-set on any update
- User profile auto-created on signup

---

### 6.2 What is NOT Automated (Gaps)

❌ **Suggestion → Resource Conversion**

- **Gap**: When suggestion is approved, resource is NOT automatically created
- **Requires**: Manual admin action (click "Create Resource" button)
- **Future**: Could be automated with trigger or API

❌ **Verification Log Creation**

- **Gap**: verification_logs are inserted by APPLICATION code, not database triggers
- **Why**: Requires complex multi-step AI agent logic, API calls
- **Requires**: Verification Agent code to INSERT records

❌ **Flagged Resources Dashboard**

- **Gap**: No automatic notification when resource is flagged
- **Requires**: Application code to check human_review_required=true
- **Notification**: Should email admin when flagged

❌ **Provenance Tracking**

- **Gap**: provenance JSONB field exists but not auto-populated
- **Requires**: Application code to serialize discovery/verification history
- **Structure**: Should track who, when, how for each change

❌ **Verification Status → Flagged Transition**

- **Gap**: No automatic trigger to set verification_status='flagged'
- **Currently**: Requires manual admin update OR verification agent code
- **Should**: Auto-trigger when changes_detected is non-empty

❌ **County Assignment for Non-Addressed Resources**

- **Migration**: 20250109000002_support_non_addressed_resources.sql
- **Gap**: Resources without full addresses can't be matched to county
- **Field**: likely `county` or geocoding-based county lookup

❌ **Research Task Auto-Assignment**

- **Gap**: Tasks remain in 'pending' until agent claims them
- **No**: Automatic task distribution to agents
- **Requires**: Agent picks next_research_task view record

---

## 7. Verification Status State Machine

```
┌─────────────────────────────────────────────────────────┐
│ PENDING (initial state after resource creation)         │
│ - Resource just created, awaits first verification      │
│ - next_verification_at: not yet set                     │
│ - human_review_required: not yet determined             │
└──────────────┬──────────────────────────────────────────┘
               │ (Verification Agent runs)
               ↓
        ┌──────────────────────┐
        │ Decision point:      │
        │ - Checks pass?       │
        │ - Confident?         │
        └─┬────────────────────┘
          │
    ┌─────┴─────────────────────────┐
    │                               │
    ↓ (high confidence)             ↓ (issues found)
┌─────────────────────┐      ┌──────────────────────┐
│ VERIFIED            │      │ FLAGGED              │
│ - Checks pass       │      │ - Issues detected    │
│ - Score >= 0.85     │      │ - Changes found      │
│ - next_verification │      │ - Low confidence     │
│   = NOW() + cadence │      │ - Awaits human input │
│ - Auto-approved: Y  │      │ - human_review_req:T │
└────────┬────────────┘      └──────────┬───────────┘
         │                             │
         │ (periodic checks)          │ (admin reviews)
         │ every 30-180 days         │
         ↓                            ↓
    ┌─────────────────┐         ┌──────────────────┐
    │ VERIFIED (loop) │         │ REJECTED         │
    │ - Re-verified   │         │ - Doesn't meet    │
    │ - If changes:   │         │   standards       │
    │   status=FLAGGED         │ - Needs more work │
    └─────────────────┘         └──────────────────┘
                                  (or back to VERIFIED)
```

---

## 8. Key Flows Requiring Application Code

### 8.1 Verification Agent Flow

```
discover_resources()
  → verification_agent.verify_resource(resource_id)
    → run_checks (phone, website, address, hours)
    → compare_with_history (detect changes)
    → INSERT verification_logs (with results)
    → IF auto_approve → UPDATE resources SET verification_status='verified'
    → IF flag_for_human → UPDATE resources SET verification_status='flagged', human_review_required=true
    → TRIGGER update_next_verification() auto-runs
```

### 8.2 Suggestion Approval → Resource Creation

```
admin_dashboard.approve_suggestion(suggestion_id)
  → INSERT resources (copy all fields from suggestion)
  → UPDATE resource_suggestions SET created_resource_id=<new_id>
  → TRIGGER update_county_coverage_metrics() auto-runs
  → TRIGGER update_research_task_progress() auto-runs
```

### 8.3 Periodic Re-Verification Job

```
scheduler.run_periodic_verification()
  → SELECT * FROM resources WHERE next_verification_at <= NOW()
  → FOR EACH resource:
    → verification_agent.verify_resource(resource_id, type='periodic')
    → (inserts to verification_logs)
    → (may flag if changes detected)
```

---

## 9. Row Level Security (RLS) Policies

**File**: `20250101000001_rls_policies.sql`

### 9.1 Public Access

```sql
-- Resources visible to everyone (status='active')
CREATE POLICY "Resources are viewable by everyone"
  ON resources FOR SELECT
  USING (status = 'active');

-- Ratings visible to everyone
CREATE POLICY "Ratings are viewable by everyone"
  ON resource_ratings FOR SELECT
  USING (true);

-- Approved reviews visible to everyone
CREATE POLICY "Approved reviews are viewable by everyone"
  ON resource_reviews FOR SELECT
  USING (approved = true OR auth.uid() = user_id);
```

### 9.2 Admin-Only Access

```sql
-- resource_suggestions: only admins view all
CREATE POLICY "Admins can view all suggestions"
  ON resource_suggestions FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- verification_logs: admins only
CREATE POLICY "Admins can view all verification logs"
  ON verification_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- expansion_priorities: admins only
CREATE POLICY "Admins can view expansion priorities"
  ON expansion_priorities FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));

-- AI usage logs: admins only
CREATE POLICY "Admins can view all AI usage logs"
  ON ai_usage_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true));
```

### 9.3 User-Own Data

```sql
-- Users see own profile, favorites, reviews, ratings
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view their own favorites"
  ON user_favorites FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 10. AI Agent Logging & Cost Tracking

### 10.1 `ai_agent_logs` Table (Legacy)

```sql
id, agent_type (discovery|enrichment|verification), resource_id,
action, input, output, success, error_message, confidence_score,
cost (USD), duration_ms, created_at
```

### 10.2 `ai_usage_logs` Table (New - 20250109000001)

**Purpose**: Detailed cost tracking with token accounting

```sql
id, operation_type (verification|enrichment|discovery),
resource_id, suggestion_id,
provider (anthropic|openai), model,
input_tokens, output_tokens, total_tokens (GENERATED),
input_cost_usd, output_cost_usd, total_cost_usd (GENERATED),
duration_ms, operation_context (JSONB), created_at
```

**Indexes**:

- `idx_ai_usage_operation_type` - query by operation type
- `idx_ai_usage_provider` - by provider (Anthropic vs OpenAI)
- `idx_ai_usage_created_at` - chronological
- `idx_ai_usage_resource` - all operations on a resource
- `idx_ai_usage_suggestion` - all operations on a suggestion

### 10.3 `ai_usage_summary` View

```sql
Grouped by: date, operation_type, provider, model
Shows: api_calls, total_input_tokens, total_output_tokens,
       total_tokens, total_cost_usd
```

### 10.4 `ai_budget_status` View

```sql
Grouped by: month
Shows: month_total_usd, total_api_calls,
       anthropic_cost_usd, openai_cost_usd
```

**RLS**: Admins only

---

## 11. Research Pipeline Integration

### 11.1 `research_tasks` Table

**Workflow**:

```
1. Admin/system creates task
   - county, state, category, target_count
   - search_instructions, search_queries
   - status: 'pending'

2. Discovery agent picks up
   - UPDATE status = 'in_progress'
   - assigned_to = agent_id
   - assigned_at = NOW()

3. Agent finds resources
   - INSERT resource_suggestions with research_task_id
   - TRIGGER auto-updates resources_found, resources_published

4. When target reached
   - TRIGGER auto-sets status = 'completed'
   - Auto-sets completed_at = NOW()
```

### 11.2 `agent_sessions` Table

**Tracks**:

```sql
agent_type (research|verification), agent_id,
started_at, last_activity_at, ended_at,
tasks_completed, resources_processed,
approvals, rejections,
current_task_id, verification_failures,
average_processing_time
```

**Purpose**: Monitor agent productivity and detect issues

### 11.3 Views for Agent Coordination

**`next_research_task`**

- Shows highest-priority pending task
- Includes current county coverage
- Agent queries to get next work

**`county_expansion_priorities`**

- Shows counties by need vs coverage
- Active research tasks per county
- Remaining targets

**`agent_performance`**

- Approval rate, resources processed
- Avg processing time per resource
- Used for agent evaluation

---

## 12. Summary: What Happens Automatically

| Action                         | Automatic Trigger                      | Updates                                                        |
| ------------------------------ | -------------------------------------- | -------------------------------------------------------------- |
| User rates resource            | Trigger on resource_ratings INSERT     | resources.rating_average, rating_count                         |
| User writes review             | Trigger on resource_reviews INSERT     | resources.review_count                                         |
| User votes helpful             | Trigger on review_helpfulness INSERT   | resource_reviews.helpful_count, not_helpful_count              |
| Any resource field updated     | Trigger on resources UPDATE            | resources.updated_at, last_verified_at                         |
| Resource verified successfully | Application code + trigger             | resources.verification_status='verified', next_verification_at |
| Resource created               | Trigger on resources INSERT            | county_coverage.resource_count, coverage_score                 |
| Suggestion created             | Trigger on resource_suggestions INSERT | research_tasks.resources_found                                 |
| Suggestion approved            | Trigger on resource_suggestions UPDATE | research_tasks.resources_published, status                     |
| Task target reached            | Trigger on resource_suggestions UPDATE | research_tasks.status='completed'                              |
| Expansion location launched    | Trigger on expansion_priorities UPDATE | expansion_milestones record created                            |
| Expansion factors change       | Trigger on expansion_priorities UPDATE | expansion_priorities.priority_score                            |

---

## 13. Recommendations for Missing Automation

1. **Auto-Create Resources from Approved Suggestions**
   - Add trigger: AFTER UPDATE on resource_suggestions WHERE status='approved'
   - Creates resource automatically
   - Sets created_resource_id
   - Reduces admin manual work

2. **Auto-Flag on Changes Detected**
   - Trigger on verification_logs INSERT
   - If changes_detected is non-empty
   - Set resources.verification_status='flagged', human_review_required=true

3. **Provenance Auto-Update**
   - Add trigger to maintain complete discovery/verification history
   - Each update appends to provenance JSONB
   - Includes: who, when, what changed, why

4. **Notification System**
   - When verification_logs.decision='flag_for_human'
   - Email admin with details
   - Link to admin dashboard

5. **County Assignment Function**
   - See: 20250110000000_county_assignment_function.sql
   - Use address to auto-assign county
   - Call on resource INSERT if not specified
