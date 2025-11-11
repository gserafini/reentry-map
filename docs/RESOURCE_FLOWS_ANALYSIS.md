# Resource Flows End-to-End Analysis

## Executive Summary

The reentry-map project has **4 primary resource submission/verification flows**. Three are partially or fully implemented with critical integration gaps. The flows involve autonomous verification, human review, periodic checks, and real-time notifications.

**Critical Finding:** The systems have **database schema** and **verification logic** in place, but are missing **real-time notification infrastructure**, **proper error handling in success cases**, and **human review feedback loops**.

---

## FLOW 1: AI Agent Batch Submission (`/api/resources/suggest-batch`)

### Happy Path (87% of submissions)

```
AI Agent (Claude Web/Code)
  ↓
POST /api/resources/suggest-batch
  ├─ Body: 1-100 resources with full data
  ├─ submitter: "ai_agent" | "claude_web"
  └─ notes: Optional context
  ↓
Service 1: Duplicate Detection
  ├─ Check resources table for name+address match
  ├─ Check resource_suggestions (pending) for duplicates
  └─ Skip if found (counted as skipped_duplicates)
  ↓
Service 2: Create Suggestion
  ├─ Insert into resource_suggestions table
  ├─ Full provenance: suggested_by=null (public API)
  ├─ Status: "pending"
  └─ All fields populated: city, state, email, services, etc.
  ↓
Service 3: Autonomous Verification (VerificationAgent)
  ├─ Level 1: URL/Phone/Geocoding checks (10s)
  ├─ Level 2: AI Website Content Match (30s)
  ├─ Level 3: Cross-Reference (211, Google Maps)
  └─ Score: 0.0-1.0
  ↓
Service 4: Decision Making
  ├─ Score >= 0.85 + 2+ cross-refs + no conflicts
  │   └─ Decision: AUTO_APPROVE
  ├─ Score < 0.5 or unreachable website
  │   └─ Decision: AUTO_REJECT
  └─ Everything else
      └─ Decision: FLAG_FOR_HUMAN
  ↓
Service 5: Execute Decision
  ├─ AUTO_APPROVE: Create resource + mark suggestion approved
  ├─ AUTO_REJECT: Mark suggestion rejected with reason
  └─ FLAG_FOR_HUMAN: Keep pending + add admin_notes
  ↓
Service 6: Logging
  ├─ Insert verification_logs entry
  ├─ Insert ai_usage_logs entry (cost tracking)
  └─ Update resource (verification_status, confidence)
  ↓
Response to Agent
  └─ Stats: submitted, auto_approved, flagged, auto_rejected, errors
```

### Database Updates

```
resource_suggestions:
  - id, name, address, city, state, zip
  - phone, email, website
  - description, primary_category, categories, tags
  - hours, services_offered, eligibility_requirements, languages
  - status: "pending" → "approved" or "rejected"
  - admin_notes: null (or verification reason if flagged)
  - created_at: NOW()

resources: (only if auto_approved)
  - All fields from suggestion
  - status: "active"
  - verified: true
  - source: "ai_verified"
  - verification_status: "verified"
  - ai_verification_score: (0.0-1.0)
  - ai_last_verified: NOW()

verification_logs:
  - suggestion_id: suggestion.id
  - resource_id: resource.id (if auto_approved, else null)
  - verification_type: "initial"
  - overall_score: (0.0-1.0)
  - checks_performed: { url_reachable, phone_valid, address_geocodable, ... }
  - conflicts_found: [{ field, submitted, found, source }, ...]
  - decision: "auto_approve" | "flag_for_human" | "auto_reject"
  - decision_reason: string
  - auto_approved: boolean
  - created_at: NOW()

ai_usage_logs:
  - operation_type: "verification"
  - resource_id: (if created)
  - suggestion_id: suggestion.id
  - provider: "anthropic"
  - model: "claude-haiku-4-20250514"
  - input_tokens, output_tokens
  - input_cost_usd, output_cost_usd
  - operation_context: { agent_version: "..." }
```

### Integration Points

```
✅ Implemented: Core verification logic
✅ Implemented: Decision making
✅ Implemented: Database inserts
✅ Implemented: Cost tracking

⚠️  ISSUE 1: No real-time notification when resource auto-approved
   - Admins don't know new resources went live
   - Agents don't get feedback confirming success

⚠️  ISSUE 2: No webhook/event system for downstream consumers
   - Map indexing doesn't get triggered
   - Search index doesn't update automatically
   - Realtime subscribers don't get notified

⚠️  ISSUE 3: Partial error handling
   - Verification errors caught but not escalated
   - Failed AI calls still flag for human (correct)
   - But no alert to admins about failed AI operations
```

---

## FLOW 2: User Suggestion (`/suggest-resource` → `/api/resources/suggest-batch` internally)

### Happy Path

```
Authenticated User
  ↓
GET /suggest-resource
  ├─ Form: name*, category*, address (optional fields)
  ├─ Keyboard shortcuts: Ctrl+S, Ctrl+Shift+S, Ctrl+G
  └─ Geocode button calls /lib/utils/geocoding.ts
  ↓
POST /suggest-resource (form submission)
  ├─ Call submitSuggestion(suggestion)
  └─ suggestion: {
       suggested_by: user.id,
       name, description, category,
       address, phone, website, email,
       latitude, longitude,
       reason: notes
     }
  ↓
API: /lib/api/suggestions.ts → submitSuggestion()
  ├─ Insert into resource_suggestions
  ├─ Status: "pending"
  ├─ suggested_by: user.id (tracks human submitter)
  └─ created_at: NOW()
  ↓
Response to User
  └─ Success: Redirect to /my-suggestions
     OR "Submit & Add Another"
```

### Key Differences from Flow 1

- **suggested_by:** user.id (tracks human, not null)
- **No autonomous verification:** Stays "pending" awaiting human review
- **No auto-approval:** ALL user suggestions require admin review
- **No verification_logs created:** They're not verified at submission time

### MISSING: Auto-Verification for User Suggestions

```
⚠️  CRITICAL: User suggestions NOT verified automatically

Current behavior:
  User submits → resource_suggestions table
  → Admins review manually in /admin/flagged-resources

Missing workflow:
  User submits → resource_suggestions table
  → VerificationAgent.verify() [same as Flow 1]
  → If auto-approved, create resource + notify user
  → If flagged, notify user "under review"
  → If auto-rejected, notify user with reason

Impact:
  - 13 days to review ALL user suggestions (inefficient)
  - Users don't know if their suggestion succeeded
  - No feedback loop to improve submissions
  - Duplicates of auto-approvable resources

This is a key **integration gap** that should be fixed.
```

### Database Updates (Current)

```
resource_suggestions:
  - suggested_by: user.id (not null)
  - name, description, category, address
  - phone, website, email, latitude, longitude
  - reason: user_notes
  - status: "pending" (stays here until admin reviews)
  - created_at: NOW()

No verification_logs created yet.
No resources created until admin approves.
```

### Missing Integration Points

```
❌ VerificationAgent not called
❌ No verification_logs created
❌ No user notification on submission
❌ No user notification on approval/rejection
❌ No feedback loop (e.g., "suggest again if different")
❌ No RLS policy to show user only their suggestions
```

---

## FLOW 3: Periodic Verification (`scripts/periodic-verification.mjs`)

### Architecture

```
Cron Job (Weekly)
  ↓
node periodic-verification.mjs [--limit=50] [--dry-run]
  ↓
Service 1: Fetch Resources Due for Re-Verification
  ├─ Query: WHERE status='active'
  │   AND (next_verification_at IS NULL
  │        OR next_verification_at <= NOW())
  ├─ Order by: next_verification_at ASC (oldest first)
  └─ Limit: 50 (default, configurable)
  ↓
Service 2: Verify Each Resource
  ├─ Check 1: Website URL reachability
  │   ├─ Use Playwright to render like browser
  │   ├─ Handles bot detection & redirects
  │   └─ Returns: pass, status_code, latency_ms
  │
  ├─ Check 2: [TODO] Phone validation
  ├─ Check 3: [TODO] Geocoding re-validation
  │
  └─ Score: passed / total_checks
  ↓
Service 3: Decision
  ├─ If failed > 0: newStatus = "flagged"
  ├─ If score >= 0.8: newStatus = "verified"
  └─ needsHumanReview: true if failed > 0
  ↓
Service 4: Update Database (unless dry-run)
  ├─ Update resources table
  ├─ Set: verification_status, verification_confidence
  ├─ Set: last_verified_at = NOW()
  ├─ Set: next_verification_at = NOW() + (7 days if flagged, 60 if verified)
  ├─ Set: human_review_required = needsHumanReview
  │
  ├─ Insert verification_logs
  │   ├─ verification_type: "periodic"
  │   ├─ agent_version: "periodic-verification-v1.0.0"
  │   ├─ checks_performed: { url_reachable, ... }
  │   ├─ decision: "auto_approve" | "flag_for_human"
  │   └─ decision_reason: "All checks passed" | "URL check failed: ..."
  │
  └─ Create IP block alert if 403 detected
      (even with Playwright, means strong bot protection)
  ↓
Console Output
  ├─ Summary: X verified, Y flagged, Z errors
  ├─ Duration: Xs
  └─ If IP blocks: "🚨 STRONG BOT PROTECTION DETECTED"
```

### Database Updates

```
resources:
  ├─ verification_status: "verified" | "flagged"
  ├─ verification_confidence: 0.0-1.0 (score)
  ├─ last_verified_at: NOW()
  ├─ next_verification_at: NOW() + 7d (if flagged) | 60d (if verified)
  └─ human_review_required: boolean

verification_logs:
  ├─ resource_id: resource.id
  ├─ suggestion_id: null (no suggestion associated)
  ├─ verification_type: "periodic"
  ├─ overall_score: score
  ├─ checks_performed: {
  │   url_reachable: { pass, status_code, latency_ms, error }
  │ }
  ├─ decision: "auto_approve" | "flag_for_human"
  ├─ decision_reason: string
  └─ created_at: NOW()
```

### Integration Issues

```
⚠️  ISSUE 1: Limited check coverage
   - Only URL reachability implemented
   - TODO comments for phone & geocoding
   - Impact: Misses service shutdowns, phone disconnects

⚠️  ISSUE 2: No VerificationAgent reuse
   - Duplicates logic from Flow 1
   - Doesn't cross-reference (211, Google Maps)
   - Doesn't check for updated info
   - Different scoring algorithm

⚠️  ISSUE 3: No notification system
   - Flagged resources not highlighted to admins
   - No email/Slack alert when resource flagged
   - No webhook trigger for dependent systems

⚠️  ISSUE 4: Field-level cadence not implemented
   - All fields verified on same schedule
   - Should verify phone every 30 days
   - Should verify address every 180+ days
   - Currently: All or nothing approach

⚠️  ISSUE 5: No escalation for critical failures
   - Multiple verification failures? Silent.
   - Resource removed from main directory? Not mentioned.
   - IP block detected but silently logged? Admin action needed.
```

### Running the Script

```bash
# Dry run to see what would be verified
node scripts/periodic-verification.mjs --dry-run

# Verify first 50 resources
node scripts/periodic-verification.mjs --limit=50

# Schedule with cron (weekly, Sunday 2am)
0 2 * * 0 /usr/bin/node /app/scripts/periodic-verification.mjs

# Output goes to /var/log/verification.log
```

---

## FLOW 4: Admin Approval/Rejection (`/admin/flagged-resources`)

### Happy Path: Approve Flagged Resource

```
Admin User
  ↓
GET /admin/flagged-resources?status=pending
  ├─ Fetch resource_suggestions with status="pending"
  ├─ For each, fetch latest verification_logs
  └─ Display table with:
       name, location, phone, verification_score
       flag_reason, submitted_date, actions
  ↓
Admin clicks View Details (opens dialog)
  ├─ Shows: Address, verification score
  ├─ Shows: Flag reason (from verification_logs.decision_reason)
  ├─ Shows: Conflicts detected (from verification_logs.conflicts_found)
  ├─ Shows: Full verification checks (accordion)
  └─ Buttons: Close, Reject, Approve & Publish
  ↓
Admin clicks "Approve & Publish"
  ↓
POST /api/admin/flagged-resources/[id]/approve
  ├─ Check admin auth (session or x-admin-api-key header)
  │
  ├─ Fetch resource_suggestions by id
  │
  ├─ Geocode if lat/lng missing
  │   ├─ Build full address: address, city, state, zip
  │   ├─ Call Google Maps Geocoding API
  │   └─ If fails: Return 400 error (cannot approve)
  │
  ├─ Create resource from suggestion
  │   ├─ Copy all fields: name, description, address, phone, etc.
  │   ├─ Set: status="active", verified=true
  │   ├─ Set: source="admin_approved"
  │   ├─ Set: verification_status="verified"
  │   └─ Return: resource.id
  │
  ├─ Update resource_suggestions
  │   ├─ status: "approved"
  │   ├─ reviewed_by: user.id (or null if API key)
  │   ├─ reviewed_at: NOW()
  │   └─ review_notes: "Approved via API key" (if API key used)
  │
  ├─ Update verification_logs
  │   ├─ human_reviewed: true
  │   ├─ human_reviewer_id: user.id
  │   └─ human_decision: "approved"
  │
  └─ Return: { success: true, resource_id: "..." }
  ↓
Response to Admin
  ├─ Success alert
  ├─ Remove from table
  └─ Resource now live in directory
```

### Rejection Path: Reject Flagged Resource

```
Admin clicks "Reject" (or "Reject" button in dialog)
  ↓
POST /api/admin/flagged-resources/[id]/reject
  ├─ Body: {
  │   reason: "duplicate" | "wrong_service_type" | ...
  │   notes?: "Additional context"
  │   closure_status?: "temporary" | "permanent" | null
  │ }
  │
  ├─ Check if reason is valid:
  │   ├─ Permanent: duplicate, wrong_service_type, permanently_closed,
  │   │             does_not_exist, wrong_location, spam, insufficient_info
  │   │
  │   └─ Needs attention: wrong_name, incomplete_address,
  │                       temporarily_closed, needs_verification,
  │                       confidential_address, missing_details
  │
  ├─ Determine status:
  │   ├─ If permanent reason: status = "rejected"
  │   └─ Otherwise: status = "needs_attention"
  │
  ├─ Update resource_suggestions
  │   ├─ status: "rejected" | "needs_attention"
  │   ├─ rejection_reason: reason
  │   ├─ closure_status: (if provided)
  │   ├─ correction_notes: notes
  │   ├─ reviewed_by: user.id
  │   ├─ reviewed_at: NOW()
  │   └─ review_notes: "Rejected by admin\nReason: {reason}\nNotes: {notes}"
  │
  ├─ Update verification_logs
  │   ├─ human_reviewed: true
  │   ├─ human_reviewer_id: user.id
  │   └─ human_decision: "rejected" | "needs_attention"
  │
  └─ Return: { success: true, status: "...", reason: "..." }
  ↓
Response to Admin
  ├─ Success alert
  ├─ Remove from table
  └─ Suggestion archived with reason
```

### Database Updates

```
Approval:
  resource_suggestions:
    ├─ status: "approved"
    ├─ reviewed_by: user.id
    ├─ reviewed_at: NOW()
    └─ review_notes: (optional)

  resources: (new row)
    ├─ All fields from suggestion
    ├─ status: "active"
    ├─ verified: true
    ├─ source: "admin_approved"
    └─ verification_status: "verified"

  verification_logs:
    ├─ human_reviewed: true
    ├─ human_reviewer_id: user.id
    └─ human_decision: "approved"

Rejection:
  resource_suggestions:
    ├─ status: "rejected" | "needs_attention"
    ├─ rejection_reason: reason
    ├─ closure_status: (if provided)
    ├─ correction_notes: notes
    ├─ reviewed_by: user.id
    ├─ reviewed_at: NOW()
    └─ review_notes: (structured message)

  verification_logs:
    ├─ human_reviewed: true
    ├─ human_reviewer_id: user.id
    └─ human_decision: "rejected" | "needs_attention"
```

### Integration Points

```
✅ Implemented: Approve flow (creates resource)
✅ Implemented: Reject flow (marks suggestion rejected)
✅ Implemented: Verification log updates
✅ Implemented: Admin auth check
✅ Implemented: Geocoding for missing coordinates

⚠️  ISSUE 1: No webhook/notification on approval
   - Map indexing not triggered
   - Search index not updated
   - Realtime subscribers don't know
   - Email not sent to submitter

⚠️  ISSUE 2: No bulk operations
   - Can only approve/reject one at a time
   - For 100 pending suggestions, need 100 requests
   - No batch approval UI

⚠️  ISSUE 3: Limited rejection reason feedback
   - User submitter doesn't know they were rejected
   - No way to let them resubmit with corrections
   - Feedback loop is broken

⚠️  ISSUE 4: Missing "approve with corrections" flow
   - File exists: approve-with-corrections/route.ts
   - But UI doesn't use it
   - Allows: "Yes, but fix field X to value Y"

⚠️  ISSUE 5: No admin notification of new flagged items
   - Admins must manually visit /admin/flagged-resources
   - No email alert when resource flagged for review
   - No Slack notification
```

---

## Critical Integration Gaps Summary

### Gap 1: No Real-Time Notification System

```
Missing:
  ├─ Webhook system for resource creation/update
  ├─ Email notifications to:
  │   ├─ Admins when resource flagged
  │   ├─ User when suggestion approved/rejected
  │   └─ User when verification score drops below threshold
  ├─ Slack integration for ops team
  ├─ In-app notifications (Supabase Realtime)
  └─ Activity feed for admins

Impact:
  - No async feedback loops
  - Silent failures (AI errors not escalated)
  - Users don't know if suggestions succeeded
  - Admins miss actionable items
```

### Gap 2: Auto-Verification for User Suggestions

```
Current:
  User submits → stays "pending" forever

Should be:
  User submits → Auto-verify → Auto-approve OR Flag

Missing:
  ├─ Call VerificationAgent for user suggestions
  ├─ Create verification_logs entry
  ├─ Auto-create resource if passes verification
  ├─ Notify user of result
  └─ Keep suggestion-to-resource link (parent_resource_id)
```

### Gap 3: Field-Level Verification Cadence

```
Missing:
  ├─ Phone next check: 30 days
  ├─ Hours next check: 30 days
  ├─ Website next check: 60 days
  ├─ Email next check: 60 days
  ├─ Services next check: 60 days
  ├─ Description next check: 90 days
  ├─ Address next check: 180 days
  └─ Name next check: 365 days

Current:
  ├─ All-or-nothing verification
  ├─ All fields re-verified together
  └─ No granular control
```

### Gap 4: Search Index & Map Synchronization

```
Missing:
  ├─ Trigger search index update when resource created
  ├─ Trigger Elasticsearch/Meilisearch refresh
  ├─ Notify Google Maps that location changed
  ├─ Update map clustering when resource added
  └─ Invalidate resource cache after approval
```

### Gap 5: Error Escalation

```
Missing:
  ├─ Alert to admins when AI verification fails
  ├─ Alert when geocoding fails
  ├─ Alert when Google Maps API quota exceeded
  ├─ Track failed verification attempts
  └─ Dashboard showing verification health
```

### Gap 6: Missing Verification Features

```
Implemented:
  ✅ URL reachability
  ✅ Phone format validation
  ✅ Address geocoding
  ✅ Website content matching (AI)
  ✅ Cross-reference to 211 (partial)
  ✅ Cross-reference to Google Maps (partial)

Not Implemented:
  ❌ Conflict detection scoring
  ❌ IP block detection handling
  ❌ Redirect following for websites
  ❌ Status code interpretation (301, 302, etc.)
  ❌ Phone number format correction
  ❌ Address typo correction
  ❌ Category matching validation
  ❌ Hours format validation
  ❌ Service description coherence check
```

---

## Data Flow Diagram

```
┌─────────────────────┐
│   User / AI Agent   │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
┌────▼────┐  ┌──▼─────────────┐
│/suggest-│  │/api/resources/  │
│resource │  │suggest-batch    │
└────┬────┘  └──┬──────────────┘
     │          │
     └────┬─────┘
          │
    ┌─────▼──────────────────────┐
    │ resource_suggestions table  │
    │ (status: pending)           │
    └─────┬──────────────────────┘
          │
    ┌─────▼───────────────────┐
    │ VerificationAgent.verify │
    │ (Level 1, 2, 3 checks)  │
    └─────┬───────────────────┘
          │
    ┌─────┴─────┬──────────┐
    │           │          │
┌───▼────┐  ┌───▼───┐  ┌──▼──────┐
│ AUTO   │  │FLAG   │  │ AUTO    │
│APPROVE │  │FOR    │  │REJECT   │
│(87%)   │  │HUMAN  │  │(5%)     │
│        │  │(8%)   │  │         │
└───┬────┘  └───┬───┘  └──┬──────┘
    │          │         │
    │    ┌─────▼────────┐ │
    │    │ verification │ │
    │    │_logs table   │ │
    │    │ (decision)   │ │
    │    └─────┬────────┘ │
    │          │         │
┌───▼──┐  ┌───▼──┐  ┌────▼─────┐
│Create│  │ Admin Review  │  │Mark    │
│      │  │ UI: /admin/  │  │Rejected│
│Resource│  │flagged-     │  │        │
│      │  │resources    │  │        │
└───┬──┘  │            │  └────┬───┘
    │    └───┬──────┬──┘       │
    │        │      │         │
    │    ┌───▼──┐ ┌─▼──┐      │
    │    │Approve│Reject     │
    │    └─┬────┘ └────┬─────┘
    │      │           │
    │  ┌───▼─────┐     │
    │  │Update   │     │
    │  │resource │     │
    │  │verified │     │
    │  └────┬────┘     │
    │       │          │
    └───┬───┴────┬─────┘
        │        │
    ┌───▼────────▼────┐
    │ Periodic        │
    │ Verification    │
    │ (weekly cron)   │
    └────┬────────────┘
         │
    ┌────▼──────────┐
    │ Check URLs    │
    │ Flag if fails │
    │ Update scores │
    └────────────────┘
```

---

## Recommendations by Priority

### Priority 1 (Critical - Blocking)

1. **Implement auto-verification for user suggestions**
   - Call VerificationAgent for all user submissions
   - Create verification_logs
   - Auto-approve if passes checks
   - Notify user of status

2. **Add notification system**
   - Email on resource approval
   - Email on resource rejection
   - Slack alerts for admins
   - In-app notifications via Realtime

3. **Implement search/map synchronization**
   - Trigger on resource creation
   - Invalidate caches
   - Update full-text search index

### Priority 2 (High - 2-3 weeks)

1. **Fix periodic verification**
   - Implement phone/geocoding checks
   - Use VerificationAgent instead of duplicate code
   - Add field-level cadence
   - Create admin alerts

2. **Add bulk operations**
   - Bulk approve endpoint
   - Bulk reject endpoint
   - Batch import UI

3. **Implement "approve with corrections"**
   - Use existing route but add UI
   - Allow admins to edit before approving

### Priority 3 (Medium - next sprint)

1. **Enhanced cross-referencing**
   - Implement actual 211 API calls
   - Implement Google Places API
   - Add Yelp/social media checks

2. **Error escalation**
   - Admin dashboard for failed verifications
   - Metrics tracking (auto-approval rate, etc.)
   - Cost breakdown

3. **Field-level cadence**
   - Implement progressive re-verification
   - Different schedules per field type
   - Track which fields are stale

---

## Testing Strategy

### Flow 1: Batch Submission

```bash
# Test auto-approval
curl -X POST http://localhost:3000/api/resources/suggest-batch \
  -H "Content-Type: application/json" \
  -d '{
    "resources": [
      {
        "name": "Test Resource",
        "address": "123 Main St",
        "city": "Oakland",
        "state": "CA",
        "phone": "(510) 555-1234",
        "website": "https://www.example.org",
        "primary_category": "employment"
      }
    ]
  }'

# Should return:
# - auto_approved: 1
# - resource_id in verification_results
# - verification_logs entry created
# - resource in database with status="active"
```

### Flow 2: User Suggestion

```bash
# 1. Create user account
# 2. Navigate to /suggest-resource
# 3. Fill form, submit
# 4. Check resource_suggestions table
#    - status should be "pending" (current bug)
#    - OR auto-verified if fixed
# 5. Check admin/flagged-resources page
# 6. Approve/reject and verify updates
```

### Flow 3: Periodic Verification

```bash
# Dry run
node scripts/periodic-verification.mjs --dry-run --limit=5

# Verify output includes:
# - Resources checked count
# - Verification results
# - No database updates (dry-run)

# Real run
node scripts/periodic-verification.mjs --limit=5

# Verify:
# - resources.next_verification_at updated
# - verification_logs entries created
# - Flagged resources have verification_status="flagged"
```

### Flow 4: Admin Approval

```bash
# 1. Get flagged resources
curl http://localhost:3000/api/admin/flagged-resources?status=pending

# 2. Approve one
curl -X POST http://localhost:3000/api/admin/flagged-resources/{id}/approve

# 3. Verify:
#    - resource created with status="active"
#    - resource_suggestions.status="approved"
#    - verification_logs.human_reviewed=true
#    - resource appears in /resources list

# 4. Reject one
curl -X POST http://localhost:3000/api/admin/flagged-resources/{id}/reject \
  -H "Content-Type: application/json" \
  -d '{"reason": "duplicate", "notes": "Already exists"}'

# 5. Verify:
#    - resource_suggestions.status="rejected"
#    - verification_logs.human_decision="rejected"
#    - No resource created
```

---

## Database Schema Reference

### resource_suggestions

```sql
id UUID PRIMARY KEY
suggested_by UUID REFERENCES users(id) -- null if public API
name TEXT NOT NULL
description TEXT
address TEXT
city TEXT
state TEXT
zip TEXT
phone TEXT
email TEXT
website TEXT
latitude DECIMAL(10,8)
longitude DECIMAL(11,8)
primary_category TEXT
categories TEXT[]
tags TEXT[]
category TEXT
hours JSONB
services_offered TEXT[]
eligibility_requirements TEXT
required_documents TEXT[]
fees TEXT
languages TEXT[]
accessibility_features TEXT[]
status TEXT -- 'pending', 'approved', 'rejected', 'needs_attention'
admin_notes TEXT
review_notes TEXT
rejection_reason TEXT -- structured reason
closure_status TEXT -- 'temporary', 'permanent'
correction_notes TEXT
reviewed_by UUID REFERENCES users(id)
reviewed_at TIMESTAMPTZ
reason TEXT -- human-readable notes from submitter
created_at TIMESTAMPTZ DEFAULT NOW()
```

### resources

```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
description TEXT
address TEXT
city TEXT
state TEXT
zip TEXT
phone TEXT
email TEXT
website TEXT
latitude DECIMAL(10,8)
longitude DECIMAL(11,8)
primary_category TEXT
categories TEXT[]
tags TEXT[]
hours JSONB
services_offered TEXT[]
eligibility_requirements TEXT
languages TEXT[]
accessibility_features TEXT[]
status TEXT -- 'active', 'inactive', 'archived'
verified BOOLEAN
source TEXT -- 'ai_verified', 'admin_approved', 'user_submitted'
verification_status TEXT -- 'pending', 'verified', 'flagged'
verification_confidence DECIMAL(3,2)
ai_verification_score DECIMAL(3,2)
ai_last_verified TIMESTAMPTZ
last_verified_at TIMESTAMPTZ
next_verification_at TIMESTAMPTZ
human_review_required BOOLEAN
change_log JSONB[]
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

### verification_logs

```sql
id UUID PRIMARY KEY
resource_id UUID REFERENCES resources(id)
suggestion_id UUID REFERENCES resource_suggestions(id)
verification_type TEXT -- 'initial', 'periodic', 'triggered'
agent_version TEXT
overall_score DECIMAL(3,2)
checks_performed JSONB
conflicts_found JSONB[]
changes_detected JSONB[]
decision TEXT -- 'auto_approve', 'flag_for_human', 'auto_reject'
decision_reason TEXT
auto_approved BOOLEAN DEFAULT false
human_reviewed BOOLEAN DEFAULT false
human_reviewer_id UUID REFERENCES users(id)
human_decision TEXT
duration_ms INTEGER
api_calls_made INTEGER
estimated_cost_usd DECIMAL(10,4)
created_at TIMESTAMPTZ DEFAULT NOW()
```

### ai_usage_logs

```sql
id UUID PRIMARY KEY
operation_type TEXT
resource_id UUID REFERENCES resources(id)
suggestion_id UUID REFERENCES resource_suggestions(id)
provider TEXT -- 'anthropic', 'openai'
model TEXT
input_tokens INTEGER
output_tokens INTEGER
input_cost_usd DECIMAL(10,6)
output_cost_usd DECIMAL(10,6)
duration_ms INTEGER
operation_context JSONB
created_at TIMESTAMPTZ DEFAULT NOW()
```
