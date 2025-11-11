# Complete API Routes Analysis: Resources, Suggestions & Verification

## Overview

The reentry-map application has a sophisticated multi-stage resource management pipeline with autonomous AI verification, human review workflows, and research task management. This analysis documents all API endpoints and identifies separation of concerns and redundancies.

---

## 1. DATABASE TABLES STRUCTURE

### Core Tables

**resources**

- Main table for published resources
- Fields: name, address, city, state, zip, latitude, longitude, phone, email, website
- Service details: hours, services_offered, eligibility_requirements, languages, accessibility_features
- Verification: verification_status, verification_confidence, human_review_required, last_verified_at, next_verification_at
- Provenance: source, verified_by, verification_source

**resource_suggestions**

- Staging table for new/suggested resources
- Full schema mirror of resources table (city, state, email, hours, services_offered, etc.)
- Fields: status (pending, approved, rejected, needs_attention), suggested_by, admin_notes
- Provenance: reason (original free-text field, now supplemented with new fields)
- Research link: research_task_id, discovered_via, discovery_notes

**verification_logs**

- Audit trail of all verification attempts
- Links: resource_id, suggestion_id
- Results: overall_score (0-1), checks_performed (JSONB), conflicts_found, decision (auto_approve, flag_for_human, auto_reject)
- Human review: human_reviewed, human_reviewer_id, human_decision, human_notes
- Performance: api_calls_made, estimated_cost_usd, duration_ms

**research_tasks**

- Discovery pipeline configuration
- Fields: county, state, category, target_count, resources_found, status (in_progress, completed)
- Tracking progress toward expansion targets

**expansion_priorities**

- High-level targets for resource discovery
- Fields: city, state, target_resource_count, current_resource_count, priority_categories, priority_score

---

## 2. API ROUTES INVENTORY

### TIER 1: PUBLIC RESOURCE SUBMISSION (No Auth Required)

#### POST /api/resources/suggest-batch

**Purpose**: Public API for AI agents to submit multiple resources with autonomous verification

**Authentication**: None (public)

**Input**:

- resources: Array of resource objects (name, address, city, state, phone, email, website, etc.)
- submitter: string (optional, defaults to 'ai_agent')
- notes: string (optional submission context)

**Database Operations**:

1. Check for existing resources (deduplication)
2. Check for existing pending suggestions
3. CREATE resource_suggestions (with full schema)
4. RUN Verification Agent on each suggestion
5. UPDATE resource_suggestions (status = pending/approved/rejected)
6. CREATE resources (if auto-approved)
7. INSERT verification_logs (autonomous verification record)

**Outputs**:

- Per-resource verification results (auto_approved, flagged, rejected, duplicate, error)
- Suggestion IDs and Resource IDs (for auto-approved)
- Detailed decision reasons and verification scores

**Key Feature**: Autonomous quality assurance with 3-tier decisions:

- auto_approve (87%): Creates resource immediately
- flag_for_human (8%): Marks as pending for manual review
- auto_reject (5%): Marks as rejected with reason

**Database Tables Modified**:

- resource_suggestions (INSERT)
- resources (INSERT, if auto-approved)
- verification_logs (INSERT)

---

#### GET /api/resources/check-duplicate

**Purpose**: Fast duplicate detection for discovery agents before submission

**Authentication**: None (public)

**Query Params**:

- name: string
- address: string
- city: string (optional)
- state: string (optional)

**Database Operations**:

- SELECT from resources (case-insensitive search)

**Outputs**:

- isDuplicate: boolean
- matchCount: number
- matches: Array of existing resources

**Database Tables Modified**: None (read-only)

**Note**: Used by discovery agents to avoid duplicate submissions before calling suggest-batch

---

### TIER 2: DISCOVERY PIPELINE (API Key Required)

#### GET /api/research/next

**Purpose**: Get next highest-priority research task for discovery agents

**Authentication**: API key (x-admin-api-key header)

**Database Operations**:

- SELECT from expansion_priorities_with_progress
- ORDER BY priority_score DESC

**Outputs**:

- task_id, city, state, categories
- target_count, current_found, remaining
- suggested_queries for WebSearch
- submit_url (POST /api/research/submit-candidate)

**Database Tables Modified**: None (read-only)

---

#### POST /api/research/submit-candidate

**Purpose**: Submit a single discovered resource candidate during research

**Authentication**: API key

**Input**:

- task_id: string (from GET /api/research/next)
- name, address, city, state, phone, email, website, etc.
- discovered_via: 'websearch' | 'webfetch' | 'manual'
- discovery_notes: string (REQUIRED - documents source)

**Validation**:

- task_id must exist and status must be 'in_progress'
- Name required
- discovery_notes required (must document source: URL or search query)
- Must have at least one of: address, website, phone

**Database Operations**:

1. VERIFY task exists and is in_progress
2. CREATE resource_suggestion
3. UPDATE research_tasks (resources_found counter incremented by trigger)
4. RETURN task progress

**Outputs**:

- suggestion_id
- task_progress (found, target, remaining, task_complete)
- next_action instruction

**Database Tables Modified**:

- resource_suggestions (INSERT)
- research_tasks (updated by trigger)

**Key Pattern**: ONE at a time, not batch. Each submission updates progress and triggers verification if integrated.

---

### TIER 3: VERIFICATION & APPROVAL (API Key or Session Auth)

#### GET /api/verification/next

**Purpose**: Get next resource suggestion for human verification (ONE at a time)

**Authentication**: API key

**Database Operations**:

- SELECT from resource_suggestions (status='pending')
- ORDER BY priority_score DESC
- LIMIT 20 (fetch multiple to calculate priority)
- SELECT verification_logs for each

**Response Priority Logic**:

- Missing email: priority 100
- Missing phone: priority 80
- Missing services: priority 75
- Missing hours: priority 70
- Standard: priority 50

**Outputs**:

- Current data (address, phone, email, services, hours, etc.)
- Priority score and reason
- Instructions for what to verify
- approve_url (POST /api/admin/flagged-resources/{id}/approve-with-corrections)
- reject_url (POST /api/admin/flagged-resources/{id}/reject)

**Database Tables Modified**: None (read-only)

---

#### POST /api/admin/flagged-resources/[id]/approve

**Purpose**: Approve a suggestion and publish as active resource (no corrections)

**Authentication**: API key or session

**Database Operations**:

1. FETCH resource_suggestion by ID
2. GEOCODE address if coordinates missing (Google Maps API)
3. CREATE resource from suggestion data
4. UPDATE resource_suggestions (status='approved', reviewed_by, reviewed_at)
5. UPDATE verification_logs (human_reviewed=true, human_decision='approved')

**Validation**:

- Must have address and coordinates (or geocodable address)
- Suggestion must exist

**Outputs**:

- resource_id (newly created)
- success message

**Database Tables Modified**:

- resources (INSERT)
- resource_suggestions (UPDATE)
- verification_logs (UPDATE)

---

#### POST /api/admin/flagged-resources/[id]/approve-with-corrections

**Purpose**: Approve suggestion with corrections before publishing

**Authentication**: API key or session

**Input**:

- corrections: Object with fields to fix (name, email, phone, address, services_offered, etc.)
- address_type: 'physical' | 'confidential' | 'regional' | 'online' | 'mobile'
- service_area: {type, values} (required for non-physical)
- closure_status: 'temporary' | 'permanent' | null
- correction_notes: string (REQUIRED - must include verification source)

**Validation**:

- correction_notes is required
- correction_notes must include verification source (URL pattern or "Verified via" text)
- Physical resources need valid coordinates
- Confidential/regional/online/mobile need service_area
- Geocoding applied if needed

**Database Operations**:

1. FETCH resource_suggestion
2. MERGE corrections with original data
3. GEOCODE if physical type and missing coordinates
4. CREATE resource with merged data + verification fields
5. UPDATE resource_suggestions
6. UPDATE verification_logs (human_decision='approved_with_corrections')

**Outputs**:

- resource_id
- corrections_applied summary

**Database Tables Modified**:

- resources (INSERT)
- resource_suggestions (UPDATE)
- verification_logs (UPDATE)

---

#### POST /api/admin/flagged-resources/[id]/reject

**Purpose**: Reject or flag a suggestion for further attention

**Authentication**: API key or session

**Input**:

- reason: string (structured rejection reason, REQUIRED)
- notes: string (optional additional context)
- closure_status: 'temporary' | 'permanent' | null

**Rejection Reasons**:

**Permanent** (reject):

- duplicate, wrong_service_type, permanently_closed, does_not_exist, wrong_location, spam, insufficient_info

**Needs Attention** (flag for rework):

- wrong_name, incomplete_address, temporarily_closed, needs_verification, confidential_address, missing_details

**Database Operations**:

1. FETCH resource_suggestion
2. DETERMINE if permanent (reject) or needs_attention (flag)
3. UPDATE resource_suggestions (status, rejection_reason, review_notes)
4. UPDATE verification_logs (human_reviewed=true, human_decision=status)

**Outputs**:

- status ('rejected' | 'needs_attention')
- reason and notes

**Database Tables Modified**:

- resource_suggestions (UPDATE)
- verification_logs (UPDATE)

---

#### GET /api/admin/flagged-resources

**Purpose**: List all pending suggestions for admin review

**Authentication**: Session (Supabase auth, admin only)

**Query Params**:

- status: string (default 'pending')

**Database Operations**:

- SELECT from resource_suggestions (status=?)
- ORDER BY created_at DESC
- For each: SELECT verification_logs (latest)

**Outputs**:

- Array of suggestions with:
  - Basic info (name, address, phone, email, website)
  - Latest verification_log
  - admin_notes

**Database Tables Modified**: None (read-only)

---

### TIER 4: AUTONOMOUS VERIFICATION (Triggered)

#### POST /api/admin/verify-resource

**Purpose**: Run Verification Agent on an existing resource (manual trigger)

**Authentication**: None specified (likely admin-only in practice)

**Input**:

- resource_id: string
- suggestion: ResourceSuggestion object with current data

**Database Operations**:

1. RUN Verification Agent (initialize, run checks)
2. INSERT verification_logs (autonomous verification record)
3. UPDATE resource with verification results
4. UPDATE verification_status, human_review_required, etc.

**Outputs**:

- result object with verification findings
- resource_id
- resource_name

**Database Tables Modified**:

- verification_logs (INSERT)
- resources (UPDATE)

**Note**: This is for manual ad-hoc verification. Autonomous verification happens automatically in suggest-batch pipeline.

---

### TIER 5: RESOURCE MANAGEMENT (Session Auth, Admin Only)

#### GET /api/admin/resources

**Purpose**: List all resources with filtering/pagination

**Authentication**: Session (admin)

**Query Params**:

- page, limit, status, search

**Database Operations**:

- SELECT from resources with filters
- Count total

**Outputs**:

- Array of resources
- Pagination metadata

**Database Tables Modified**: None (read-only)

---

#### POST /api/admin/resources

**Purpose**: Create new resource directly (admin UI only)

**Authentication**: Session (admin)

**Input**: Full resource data (name, address, phone, email, website, hours, services, etc.)

**Database Operations**:

1. DETERMINE county from coordinates or geocoding
2. CREATE resource
3. CAPTURE website screenshot (async, non-blocking)

**Outputs**:

- resource object

**Database Tables Modified**:

- resources (INSERT)

**Special Feature**: Async screenshot capture for website visual verification

---

#### GET /api/admin/resources/[id]

**Purpose**: Get single resource details

**Authentication**: Session (admin)

**Database Operations**:

- SELECT from resources by id

**Database Tables Modified**: None (read-only)

---

#### PUT /api/admin/resources/[id]

**Purpose**: Update resource (full replacement)

**Authentication**: Session (admin)

**Input**: Full resource data

**Database Operations**:

1. UPDATE resource
2. CAPTURE website screenshot (async)

**Database Tables Modified**:

- resources (UPDATE)

---

#### DELETE /api/admin/resources/[id]

**Purpose**: Delete resource

**Authentication**: Session (admin)

**Database Operations**:

- DELETE from resources

**Database Tables Modified**:

- resources (DELETE)

---

#### PATCH /api/admin/resources/[id]/update

**Purpose**: Re-verify and update existing resource (field-level updates with verification)

**Authentication**: API key or session

**Input**:

- updates: Object with fields to update
- verification_source: string (REQUIRED - URL or search query)
- verification_notes: string (REQUIRED - what was verified)

**Validation**:

- verification_source and verification_notes both required
- At least one field must be updated

**Database Operations**:

1. FETCH current resource
2. UPDATE with new fields
3. SET last_verified_at, verified_by, verification_source

**Outputs**:

- updated_fields list
- verification tracking

**Database Tables Modified**:

- resources (UPDATE)

**Note**: This is for updating live resources (not suggestions). Designed for quarterly re-verification sweeps.

---

#### POST /api/admin/resources/[id]/import

**Purpose**: Bulk import resources with intelligent deduplication

**Authentication**: Session (admin) or testing bypass in dev

**Input**:

- resources: Array of resource objects with optional source metadata

**Database Operations**:

1. For each resource:
   - CHECK for duplicates (exact match: skip, similar: update, new: create)
   - AUTO-DETECT parent-child relationships (multi-location organizations)
   - CREATE parent resource if needed
   - CREATE child location with parent_resource_id
2. INSERT change_log entries with provenance

**Deduplication Logic**:

- Exact duplicate → skip
- Similar (name + address match) → update
- New → create
- Multi-location org → auto-create parent + link children

**Outputs**:

- Stats: total, created, updated, skipped, errors
- Details: lists of each category
- multiLocationOrgs: detected parent organizations

**Database Tables Modified**:

- resources (INSERT, UPDATE)

---

### TIER 6: AI AGENT MONITORING

#### GET /api/admin/ai-usage

**Purpose**: View AI agent resource usage and costs

**Database Tables Modified**: None (read-only)

#### GET /api/admin/flagged-resources

**Purpose**: View flagged resources needing attention

(Already documented above - Tier 3)

#### GET /api/admin/verification-queue

**Purpose**: Get resources flagged for verification with full context

**Authentication**: API key or session (admin)

**Query Params**:

- limit: number (default 10)
- status: string (default 'pending')

**Database Operations**:

- SELECT from resource_suggestions (status=?)
- For each: SELECT verification_logs (latest)
- determineChecksNeeded() helper function

**Outputs**:

- Array of suggestions with:
  - Current data
  - Latest verification_log
  - checks_needed array (website, phone, address, services, hours)
  - admin_notes
- Instructions with approve/reject endpoints

**Database Tables Modified**: None (read-only)

---

## 3. DATA FLOW DIAGRAMS

### Discovery to Publication Flow

```
AI Discovery Agent
  ↓
GET /api/research/next
  ↓ (Get task, suggested searches)
  ↓
WebSearch → WebFetch
  ↓
POST /api/research/submit-candidate (ONE at a time)
  ↓
resource_suggestions (INSERT) + research_tasks.resources_found++
  ↓ (trigger)
  ↓
Autonomous Verification (if integrated)
  ↓
  ├─→ auto_approve (87%)
  │     ↓
  │     resources (INSERT)
  │     verification_logs with decision=auto_approve
  │
  ├─→ flag_for_human (8%)
  │     ↓
  │     resource_suggestions status=pending
  │     verification_logs with decision=flag_for_human
  │
  └─→ auto_reject (5%)
        ↓
        resource_suggestions status=rejected
        verification_logs with decision=auto_reject
```

### Human Review Flow

```
GET /api/verification/next (ONE suggestion with priority)
  ↓
Review current_data + verification_log
  ↓
WebFetch/WebSearch to verify
  ↓
Make decision:

A) Approve (no corrections)
   POST /api/admin/flagged-resources/[id]/approve
     ↓
     resources (INSERT)
     resource_suggestions status=approved
     verification_logs human_decision=approved

B) Approve with corrections
   POST /api/admin/flagged-resources/[id]/approve-with-corrections
     ↓
     Merge corrections with original
     Geocode if needed
     resources (INSERT with merged data)
     resource_suggestions status=approved + correction_notes
     verification_logs human_decision=approved_with_corrections

C) Reject/Flag
   POST /api/admin/flagged-resources/[id]/reject
     ↓
     resource_suggestions status=rejected OR needs_attention
     verification_logs human_decision=rejected
```

### Batch Submission Flow

```
AI Agent
  ↓
POST /api/resources/suggest-batch (1-100 resources)
  ↓
For each resource:
  ├─ Check for existing resource (dedup)
  ├─ Check for existing pending suggestion (dedup)
  ├─ resource_suggestions (INSERT)
  └─ Autonomous Verification + Decision
       ├─ auto_approve → resources INSERT + suggestion.status=approved
       ├─ flag_for_human → suggestion.status=pending
       └─ auto_reject → suggestion.status=rejected
  ↓
verification_logs (INSERT) for each
  ↓
RETURN detailed results per resource
```

---

## 4. SEPARATION OF CONCERNS ANALYSIS

### Clean Separation

✅ **Discovery Pipeline** (GET /api/research/next + POST /api/research/submit-candidate)

- Focused solely on finding resources
- Single submissions (not batch)
- No verification logic
- Clear input/output contract

✅ **Verification Queue** (GET /api/verification/next + approval endpoints)

- Focused on human review
- Priority calculation
- Single resource at a time
- Multiple decision paths (approve, approve-with-corrections, reject)

✅ **Autonomous Verification** (/api/admin/verify-resource, batch verification)

- Separate concern for AI verification logic
- Can be triggered independently
- Logs all results
- Not mixed with approval workflows

✅ **Resource Management** (/api/admin/resources CRUD)

- Clean separation from suggestions/verification
- Direct admin operations
- Bypasses review process (appropriate for manual admin creation)

---

## 5. REDUNDANCIES & OVERLAPS IDENTIFIED

### OVERLAP 1: Multiple Paths to Create Resources

**Three different ways to create resources:**

1. **suggest-batch** (POST /api/resources/suggest-batch)
   - Auto-approves via Verification Agent
   - Creates resources directly
   - Used by AI discovery

2. **suggest + approve** (POST /api/research/submit-candidate → approve endpoints)
   - Creates suggestion
   - Separate human approval step
   - Used by discovery + manual review

3. **Direct creation** (POST /api/admin/resources)
   - Bypasses suggestions entirely
   - Admin UI only
   - No verification

**Impact**: Three different code paths to the same end state (resource published)

- suggest-batch is "too smart" - mixes suggestion creation with autonomous verification
- Direct creation feels incomplete - no verification tracking
- Research submit + approve is the most correct - explicit human review

**Recommendation**: Consider if autonomous verification in suggest-batch is necessary. If it's causing confusion, could move verification to separate step.

---

### OVERLAP 2: Verification at Multiple Stages

**Verification happens (or can happen) at:**

1. **Autonomous** (suggest-batch)
   - Automatic via Verification Agent
   - Auto-approve/flag/reject decisions
   - Creates verification_logs

2. **Manual** (human review via GET /api/verification/next)
   - Admin reviews suggestion
   - Verifies claims manually
   - Updates verification_logs

3. **Triggered** (POST /api/admin/verify-resource)
   - Manual trigger on existing resource
   - Re-verification of live resource
   - Updates verification_logs + resource fields

**Impact**: Three different verification code paths

- Autonomous in suggest-batch is separate from manual approval logic
- Both create verification_logs but different decision paths
- Manual endpoint can be called on live resources (re-verification)

**This is actually CORRECT** - these serve different purposes:

- Autonomous: Filter out spam/duplicates quickly
- Manual: Deep human review with corrections
- Triggered: Periodic re-verification of live resources

---

### OVERLAP 3: Correction/Update Endpoints

**Four ways to fix/update resource data:**

1. **suggest-batch** ignores corrections entirely
   - Takes data as-is
   - No correction path during autonomous approval

2. **approve-with-corrections** (POST /api/admin/flagged-resources/[id]/approve-with-corrections)
   - Corrections during human approval
   - Only for suggestions
   - Merges with original data

3. **PATCH /api/admin/resources/[id]/update**
   - Re-verification endpoint
   - Field-level updates
   - For live resources only
   - Requires verification_source + verification_notes

4. **PUT /api/admin/resources/[id]**
   - Full resource replacement
   - Direct admin update
   - No verification tracking

**Impact**: Inconsistent update patterns

- approve-with-corrections: suggestion → resource with corrections
- PATCH update: existing resource with verification tracking
- PUT update: existing resource without verification tracking
- suggest-batch: no correction path at all

**Problem**: If an autonomous-approved resource has data errors, only way to fix is PUT (which doesn't track verification). Should suggest-batch have correction flow?

---

### OVERLAP 4: Admin Authorization

**Three different auth patterns:**

1. **Session-based** (most endpoints)
   - Traditional Supabase auth
   - Browser/Claude Web
   - Check is_admin flag

2. **API key** (research, verification, update endpoints)
   - Header: x-admin-api-key
   - Claude Code, scripts
   - checkAdminAuth() utility

3. **Public** (suggest-batch, check-duplicate)
   - No auth required
   - AI agents can call freely

**Issue**: Some endpoints accept both (e.g., approve, approve-with-corrections)

- Mixed auth logic: session OR api-key
- checkAdminAuth() handles both

This is **NOT necessarily bad** - it's intentional. But worth documenting that some admin endpoints are accessible to both session and API-authenticated users.

---

## 6. UNCLEAR PATTERNS

### Issue 1: verify-resource Endpoint Purpose

**Question**: What's the purpose of POST /api/admin/verify-resource?

- Takes resource_id + suggestion data
- Runs Verification Agent
- Updates resource with results
- But doesn't change verification_status or approval state

**Observation**:

- Autonomous verification in suggest-batch runs the same logic
- This endpoint seems to be for manual ad-hoc verification of existing resources
- But it's not called from any UI or workflow shown
- Unclear if it's meant to be used or if it's leftover from development

**Recommendation**: Document intended use case or consider consolidating with periodic verification cadence.

---

### Issue 2: research_tasks vs expansion_priorities

**Two different task management systems:**

1. **research_tasks**
   - Created per county/category
   - Tracks resources_found vs target_count
   - status: in_progress, completed
   - Used by POST /api/research/submit-candidate

2. **expansion_priorities**
   - Higher-level targets
   - Used by GET /api/research/next
   - Has priority_score calculation
   - Different field names (target_resource_count vs target_count)

**Question**: Are these supposed to be the same thing?

- research_tasks seems more specific (by category within county)
- expansion_priorities seems broader (just city level)
- GET /api/research/next queries expansion_priorities
- POST /api/research/submit-candidate validates against research_tasks

**Potential Issue**: If these aren't synced, could create confusion about what's actually being tracked.

---

### Issue 3: verification_logs.decision vs verification_status

**Two decision tracking systems:**

In verification_logs:

- decision: 'auto_approve', 'flag_for_human', 'auto_reject'

In resources/resource_suggestions:

- verification_status: 'pending', 'verified', 'flagged', 'rejected'

In resource_suggestions:

- status: 'pending', 'approved', 'rejected', 'needs_attention'

**Mapping is unclear:**

- auto_approve → resources.verification_status = 'verified'?
- flag_for_human → resource_suggestions.status = 'pending'?
- auto_reject → status = 'rejected'?

There's no clear normalization layer. Different tables use different vocabulary for similar concepts.

**Recommendation**: Create mapping documentation or utility functions.

---

## 7. RECOMMENDATIONS

### Priority 1: Fix verify-resource Endpoint

Either:

1. Document its exact use case and when it's called
2. Or consolidate with periodic verification cadence function

Currently it's orphaned logic.

---

### Priority 2: Clarify Resource Updates

The four update paths are confusing. Recommend:

1. suggest-batch: No corrections (filter quickly)
2. approve-with-corrections: Corrections during suggestion approval
3. PATCH update: Field updates on live resources WITH verification tracking (required)
4. Remove PUT endpoint or make it clear it bypasses verification

Currently PUT allows updating live resources without any verification tracking, which seems dangerous.

---

### Priority 3: Unify Task Management

Either:

1. Merge research_tasks and expansion_priorities into one system
2. Or clearly document the relationship and when each is used
3. Make sure GET /api/research/next and POST submit-candidate both query the same source of truth

---

### Priority 4: Create Verification Decision Mapping

Document or implement helper function:

```typescript
function mapVerificationDecisionToStatus(
  decision: 'auto_approve' | 'flag_for_human' | 'auto_reject',
  target: 'resource' | 'suggestion'
): VerificationStatus | SuggestionStatus
```

Currently there's ambiguity between:

- verification_logs.decision
- resources.verification_status
- resource_suggestions.status

---

### Priority 5: Document suggest-batch Autonomous Verification

Is this feature intentional? If so, document:

1. What confidence threshold triggers auto-approval (87%)
2. When verification should happen vs human review (percentage targets)
3. If this can be tuned or disabled

If not intentional, consider making it explicit and optional.

---

## 8. SUMMARY TABLE

| Endpoint                                                        | Auth    | Input                   | Creates                                                   | Updates                                 | Use Case                            |
| --------------------------------------------------------------- | ------- | ----------------------- | --------------------------------------------------------- | --------------------------------------- | ----------------------------------- |
| POST /api/resources/suggest-batch                               | Public  | resources array         | resource_suggestions, resources (auto), verification_logs | -                                       | AI discovery with auto-verification |
| GET /api/resources/check-duplicate                              | Public  | name, address           | -                                                         | -                                       | Dedup check before submit           |
| GET /api/research/next                                          | API key | -                       | -                                                         | -                                       | Get next research task              |
| POST /api/research/submit-candidate                             | API key | task_id, resource data  | resource_suggestions                                      | research_tasks                          | Submit discovered resource          |
| GET /api/verification/next                                      | API key | -                       | -                                                         | -                                       | Get resource for manual review      |
| POST /api/admin/flagged-resources/[id]/approve                  | Both    | -                       | resources                                                 | resource_suggestions, verification_logs | Approve without corrections         |
| POST /api/admin/flagged-resources/[id]/approve-with-corrections | Both    | corrections             | resources                                                 | resource_suggestions, verification_logs | Approve with fixes                  |
| POST /api/admin/flagged-resources/[id]/reject                   | Both    | reason                  | -                                                         | resource_suggestions, verification_logs | Reject or flag                      |
| GET /api/admin/flagged-resources                                | Session | status param            | -                                                         | -                                       | List pending suggestions            |
| POST /api/admin/verify-resource                                 | ?       | resource_id, suggestion | verification_logs                                         | resources                               | Manual verification trigger         |
| GET /api/admin/resources                                        | Session | filters                 | -                                                         | -                                       | List resources                      |
| POST /api/admin/resources                                       | Session | resource data           | resources                                                 | -                                       | Create resource directly            |
| GET /api/admin/resources/[id]                                   | Session | id                      | -                                                         | -                                       | Get resource                        |
| PUT /api/admin/resources/[id]                                   | Session | resource data           | -                                                         | resources                               | Update resource                     |
| PATCH /api/admin/resources/[id]/update                          | Both    | updates                 | -                                                         | resources                               | Update with verification            |
| DELETE /api/admin/resources/[id]                                | Session | id                      | -                                                         | resources                               | Delete resource                     |
| POST /api/admin/resources/import                                | Session | resources array         | resources                                                 | resources                               | Bulk import                         |
