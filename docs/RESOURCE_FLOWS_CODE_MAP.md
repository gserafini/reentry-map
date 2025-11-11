# Resource Flows - Code Map

A complete reference to every file involved in the 4 resource submission/verification flows.

---

## FLOW 1: AI Agent Batch Submission

### Core API Route

```
/app/api/resources/suggest-batch/route.ts (300 lines)
├─ Accepts: POST with 1-100 resources
├─ Returns: Stats + per-resource verification results
├─ Key functions:
│  ├─ Duplicate detection
│  ├─ Suggestion creation
│  ├─ VerificationAgent.verify()
│  ├─ Auto-approve/reject/flag logic
│  └─ Logging to verification_logs + ai_usage_logs
└─ Database tables: resource_suggestions, resources, verification_logs, ai_usage_logs
```

### Verification Agent

```
/lib/ai-agents/verification-agent.ts (688 lines)
├─ Class: VerificationAgent
├─ Methods:
│  ├─ verify(suggestion, type) → VerificationResult
│  ├─ verifyWebsiteContentWithAI(suggestion, content)
│  ├─ makeDecision(score, conflicts, checks)
│  ├─ autoApprove(suggestion) → resource_id
│  ├─ flagForHuman(suggestion, reason)
│  ├─ autoReject(suggestion, reason)
│  ├─ logVerification(suggestion_id, resource_id, type, result)
│  ├─ updateResourceWithVerificationResults(resource_id, result)
│  └─ logAIUsage(operation_type, input_tokens, output_tokens, cost)
├─ Verification levels:
│  ├─ Level 1: URL, phone, address checks (10s)
│  ├─ Level 2: AI website content matching (30s)
│  └─ Level 3: Cross-reference 211 + Google Maps (60s)
└─ Decision thresholds:
   ├─ Auto-approve: score >= 0.85 + 2+ cross-refs + no conflicts
   ├─ Flag for human: 0.5-0.85 score or conflicts
   └─ Auto-reject: score < 0.5 or no reachable URL
```

### Verification Utilities

```
/lib/utils/verification.ts
├─ Functions:
│  ├─ checkUrlReachable(url) → { pass, status_code, latency_ms }
│  ├─ validatePhoneNumber(phone) → { pass, formatted }
│  ├─ validateAddressGeocoding(address, city, state, zip)
│  ├─ extractWebsiteContent(url) → content
│  ├─ search211Database(name, address)
│  ├─ searchGoogleMaps(name, address)
│  ├─ detectConflicts(submitted, found, source) → conflicts[]
│  ├─ calculateVerificationScore(checks) → 0.0-1.0
│  ├─ autoFixUrl(name, url, city, state)
│  └─ enrichAddress(address, city, state, zip)
└─ Scoring weights:
   ├─ URL reachable: 25%
   ├─ Phone valid: 20%
   ├─ Address geocodable: 20%
   ├─ Website content match: 20%
   └─ Cross-referenced: 15%
```

### Types & Interfaces

```
/lib/types/database.ts
├─ ResourceSuggestion (extended type with city, state, email, hours, etc.)
├─ VerificationResult
│  ├─ overall_score: number
│  ├─ checks: VerificationChecks
│  ├─ conflicts: FieldConflict[]
│  ├─ decision: 'auto_approve' | 'flag_for_human' | 'auto_reject'
│  └─ decision_reason: string
└─ VerificationChecks
   ├─ url_reachable: { pass, status_code, latency_ms, error }
   ├─ phone_valid: { pass, formatted }
   ├─ address_geocodable: { pass, lat, lng }
   ├─ website_content_matches: { pass, confidence, evidence }
   ├─ cross_referenced: { pass, sources[] }
   └─ conflict_detection: { pass, conflicts[] }
```

### Database Tables

```
resource_suggestions
├─ Populated by suggest-batch route
├─ Fields: name, description, address, city, state, zip, phone, email, website
├─ Categories: primary_category, categories[], tags[]
├─ Extra: hours, services_offered, eligibility_requirements, languages
├─ Status: pending → approved | rejected
└─ Tracking: suggested_by=null (public API)

resources
├─ Created only on auto-approval or admin approval
├─ Copies all fields from suggestion
├─ Status: active | inactive | archived
├─ Verification: verification_status, verification_confidence, ai_verification_score
├─ Tracking: source='ai_verified' | 'admin_approved'
└─ Timestamps: ai_last_verified, last_verified_at, next_verification_at

verification_logs
├─ Inserted after each verification
├─ Links: suggestion_id + resource_id (if created)
├─ Verification: type='initial', overall_score, checks_performed, conflicts_found
├─ Decision: decision='auto_approve'|'flag_for_human'|'auto_reject', reason
├─ Human review: human_reviewed, human_reviewer_id, human_decision
└─ Timing: duration_ms, api_calls_made, estimated_cost_usd

ai_usage_logs
├─ Inserted for each Claude Haiku API call
├─ Operation: operation_type='verification', model='claude-haiku-4-20250514'
├─ Tokens: input_tokens, output_tokens
├─ Cost: input_cost_usd, output_cost_usd
└─ Context: operation_context={ agent_version: "verification-agent-v1.0.0" }
```

### Response Format

```json
{
  "success": true,
  "message": "Processed 1 resources: 1 auto-approved, 0 flagged for review, 0 rejected",
  "stats": {
    "total_received": 1,
    "submitted": 1,
    "auto_approved": 1,
    "flagged_for_human": 0,
    "auto_rejected": 0,
    "skipped_duplicates": 0,
    "errors": 0
  },
  "verification_results": [
    {
      "name": "Resource Name",
      "status": "auto_approved",
      "resource_id": "uuid",
      "suggestion_id": "uuid",
      "verification_score": 0.92,
      "decision_reason": "High confidence (92%) with 2 cross-references and no conflicts"
    }
  ],
  "next_steps": "1 resource auto-approved and published. 0 resources flagged for human review."
}
```

---

## FLOW 2: User Suggestion

### Frontend Form

```
/app/suggest-resource/page.tsx (455 lines)
├─ State: name, description, category, address, phone, email, website, hours, notes
├─ Geocoding: address → { latitude, longitude }
├─ Keyboard shortcuts:
│  ├─ Ctrl+S: Submit
│  ├─ Ctrl+Shift+S: Submit & Add Another
│  └─ Ctrl+G: Geocode address
├─ Validation: name required, category required
├─ On submit:
│  ├─ Build ResourceSuggestionInsert object
│  ├─ Call submitSuggestion(suggestion)
│  └─ On success: Redirect to /my-suggestions or clear form
└─ UI: Material UI (TextField, Select, Button, Alert)
```

### API Client

```
/lib/api/suggestions.ts (120 lines)
├─ submitSuggestion(suggestion) → insert resource_suggestions
├─ getUserSuggestions(userId) → user's suggestions
├─ getPendingSuggestions() → admin endpoint [unused]
├─ updateSuggestionStatus(id, status, notes) → admin endpoint [unused]
└─ getSuggestion(id) → fetch one suggestion

CRITICAL: Does NOT call VerificationAgent!
Should:
  1. Create suggestion (current)
  2. Call VerificationAgent.verify() (MISSING)
  3. If auto-approved: call VerificationAgent.autoApprove()
  4. If flagged: set admin_notes with reason
  5. Notify user with submitSuggestion response
```

### Database Tables

```
resource_suggestions
├─ Only table used (suggested_by = user.id)
├─ Status: "pending" (stays here until admin approval)
├─ No verification_logs created (MISSING)
├─ No resources created until admin reviews
└─ Missing link to created resource (parent_resource_id)
```

### Missing Integration

```
❌ VerificationAgent not called
❌ verification_logs not created
❌ No auto-approval
❌ No user notification
❌ No feedback on submission status
❌ No RLS policy for user's own suggestions
❌ No parent_resource_id when approved
```

---

## FLOW 3: Periodic Verification

### Main Script

```
/scripts/periodic-verification.mjs (321 lines)
├─ Usage: node periodic-verification.mjs [--limit=50] [--dry-run]
├─ Env: Loads from .env.local
├─ Supabase: Uses service role key
├─ Main steps:
│  ├─ Fetch resources due for re-verification
│  │  ├─ WHERE status='active'
│  │  ├─ AND next_verification_at <= NOW() OR NULL
│  │  └─ ORDER BY next_verification_at ASC
│  │
│  ├─ For each resource, call verifyResource(resource)
│  │  └─ checkUrlWithRedundancy(website)
│  │     ├─ Use Playwright to render page
│  │     ├─ Wait until domcontentloaded
│  │     ├─ Capture status code + latency
│  │     └─ Detect 403 (strong bot protection)
│  │
│  ├─ Calculate score: passed / total
│  │
│  ├─ Make decision:
│  │  ├─ If failed > 0: status = "flagged"
│  │  ├─ Else: status = "verified"
│  │  └─ Set next_verification_at (7d if flagged, 60d if verified)
│  │
│  └─ Update database + log + alert
│
├─ Output: Console summary + alerts
└─ Schedule: cron: 0 2 * * 0 (Sunday 2am)
```

### Check Functions

```
checkUrlWithRedundancy(url)
├─ Uses Playwright (headless browser)
├─ Renders page like real browser (bypasses bot detection)
├─ Returns:
│  ├─ pass: boolean (status 200-399)
│  ├─ status_code: HTTP status
│  ├─ latency_ms: response time
│  └─ error: failure reason
├─ TODO: phone validation (currently missing)
└─ TODO: geocoding validation (currently missing)

verifyResource(resource)
├─ Returns: { resource_id, checks, score, newStatus, failureReasons, ipBlockDetected }
├─ Checks performed:
│  └─ url_reachable (ONLY ONE IMPLEMENTED!)
├─ Missing checks:
│  ├─ phone_valid
│  ├─ address_geocodable
│  ├─ website_content_matches (AI)
│  └─ cross_referenced
└─ Score calculation: passed / total_checks
```

### Database Updates

```
resources
├─ verification_status: "verified" | "flagged"
├─ verification_confidence: score (0.0-1.0)
├─ last_verified_at: NOW()
├─ next_verification_at: NOW() + 7d (flagged) | 60d (verified)
└─ human_review_required: boolean

verification_logs
├─ resource_id: resource.id
├─ suggestion_id: null (no suggestion)
├─ verification_type: "periodic"
├─ overall_score: score
├─ checks_performed: { url_reachable: {...}, ip_block_detected: bool }
├─ decision: "auto_approve" (if verified) | "flag_for_human" (if flagged)
├─ decision_reason: string
└─ created_at: NOW()
```

### Critical Issues

```
❌ Only URL reachability implemented
   ├─ Phone validation: TODO
   └─ Geocoding validation: TODO

❌ Code duplication from VerificationAgent
   ├─ Different checks
   ├─ Different scoring
   ├─ Different decision logic
   └─ Should reuse VerificationAgent class

❌ No field-level cadence
   ├─ All fields verified together
   ├─ Should verify phone every 30 days
   ├─ Should verify address every 180 days
   └─ Currently: all-or-nothing

❌ No notification system
   ├─ Flagged resources not highlighted
   ├─ No email to admins
   ├─ No Slack alerts
   └─ No webhook triggers

❌ No escalation
   ├─ Multiple failures → silent
   ├─ IP blocks detected → logged only
   ├─ Removed from directory → no alert
   └─ No admin dashboard showing health
```

---

## FLOW 4: Admin Approval/Rejection

### UI Page

```
/app/admin/flagged-resources/page.tsx (441 lines)
├─ Auth: Checks isAdmin status
├─ State: resources[], statusFilter='pending', selectedResource
├─ Fetch: GET /api/admin/flagged-resources?status={filter}
├─ Actions:
│  ├─ handleApprove(resource)
│  │  └─ POST /api/admin/flagged-resources/{id}/approve
│  ├─ handleReject(resource)
│  │  └─ POST /api/admin/flagged-resources/{id}/reject { reason, notes }
│  └─ openDetails(resource) → Dialog with full info
├─ Table columns:
│  ├─ Name
│  ├─ Location
│  ├─ Contact
│  ├─ Verification Score (from verification_logs)
│  ├─ Flag Reason (from verification_logs.decision_reason)
│  ├─ Submitted Date
│  └─ Actions (View, Approve, Reject)
├─ Dialog shows:
│  ├─ Address
│  ├─ Verification Score + decision reason
│  ├─ Conflicts detected
│  ├─ Full verification checks (accordion)
│  └─ Buttons: Approve & Publish, Reject
└─ UI: Material UI (Table, Dialog, Chip, Stack)
```

### Approve API

```
/app/api/admin/flagged-resources/[id]/approve/route.ts (163 lines)
├─ Auth: checkAdminAuth() → session or x-admin-api-key
├─ Fetch suggestion from resource_suggestions
├─ Geocode if missing coordinates
│  ├─ Build full address: address, city, state, zip
│  ├─ Call Google Maps Geocoding API
│  └─ Fail if geocode fails (400 error)
├─ Create resource
│  ├─ Copy all fields from suggestion
│  ├─ Set status='active', verified=true
│  ├─ Set source='admin_approved', verification_status='verified'
│  └─ Return resource.id
├─ Update resource_suggestions
│  ├─ status: "approved"
│  ├─ reviewed_by: user.id
│  ├─ reviewed_at: NOW()
│  └─ review_notes: (if API key)
├─ Update verification_logs
│  ├─ human_reviewed: true
│  ├─ human_reviewer_id: user.id
│  └─ human_decision: "approved"
└─ Return: { success: true, resource_id: "..." }
```

### Reject API

```
/app/api/admin/flagged-resources/[id]/reject/route.ts (132 lines)
├─ Auth: checkAdminAuth()
├─ Body: { reason, notes?, closure_status? }
├─ Validate reason:
│  ├─ Permanent: duplicate, wrong_service_type, permanently_closed,
│  │             does_not_exist, wrong_location, spam, insufficient_info
│  └─ Needs attention: wrong_name, incomplete_address, temporarily_closed,
│                      needs_verification, confidential_address, missing_details
├─ Determine status:
│  ├─ If permanent: status = "rejected"
│  └─ Else: status = "needs_attention"
├─ Update resource_suggestions
│  ├─ status: "rejected" | "needs_attention"
│  ├─ rejection_reason: reason
│  ├─ closure_status: closure_status
│  ├─ correction_notes: notes
│  ├─ reviewed_by, reviewed_at
│  └─ review_notes: structured message
├─ Update verification_logs
│  ├─ human_reviewed: true
│  ├─ human_reviewer_id: user.id
│  └─ human_decision: status
└─ Return: { success: true, status: "...", reason: "..." }
```

### Approve With Corrections (Unused)

```
/app/api/admin/flagged-resources/[id]/approve-with-corrections/route.ts
├─ Route exists but NOT USED BY UI
├─ Allows admins to:
│  ├─ Approve suggestion
│  ├─ But correct specific fields before creation
│  └─ Example: "Yes, but fix phone to (510) 123-4567"
├─ Body: { corrections: { field: value, ... } }
└─ Missing UI: No way to invoke from /admin/flagged-resources page
```

### Flagged Resources API

```
/app/api/admin/flagged-resources/route.ts
├─ GET ?status={pending|approved|rejected}
├─ Returns: resource_suggestions[] + latest verification_logs
├─ Fetches:
│  ├─ resource_suggestions matching status
│  └─ For each, fetch latest verification_logs
├─ Response: { data: [...] }
└─ Auth: User must be admin (is_admin=true)
```

### Database Tables

```
resource_suggestions
├─ Updated on approve:
│  ├─ status: "approved"
│  ├─ reviewed_by: user.id
│  ├─ reviewed_at: NOW()
│  └─ review_notes: optional message
└─ Updated on reject:
   ├─ status: "rejected" | "needs_attention"
   ├─ rejection_reason: structured reason
   ├─ closure_status: temporary | permanent
   ├─ correction_notes: notes
   ├─ reviewed_by, reviewed_at
   └─ review_notes: structured message

resources (on approve only)
├─ New row created
├─ All fields from suggestion
├─ status: "active"
├─ verified: true
├─ source: "admin_approved"
└─ verification_status: "verified"

verification_logs
├─ Updated on approve or reject:
│  ├─ human_reviewed: true
│  ├─ human_reviewer_id: user.id
│  └─ human_decision: "approved" | "rejected" | "needs_attention"
└─ No update if resource goes live
```

### Missing Features

```
❌ No webhook on approval
   ├─ Map doesn't get notified
   ├─ Search index doesn't update
   └─ Realtime subscribers don't know

❌ No bulk operations
   ├─ Can only approve/reject 1 at a time
   ├─ 100 pending items = 100 API calls
   └─ No batch approval UI

❌ No user notification
   ├─ User doesn't know they were approved
   ├─ User doesn't know they were rejected
   └─ No feedback loop

❌ "Approve with corrections" not in UI
   ├─ Route exists but hidden
   ├─ No UI to select corrections
   └─ Admins can't suggest edits

❌ No admin notification
   ├─ Admins must manually visit /admin/flagged-resources
   ├─ No email when new items flagged
   ├─ No Slack alert
   └─ No badge on menu
```

---

## Supporting Files

### Geocoding Utility

```
/lib/utils/geocoding.ts
├─ geocodeAddress(address) → { latitude, longitude } | null
├─ Uses: OpenStreetMap Nominatim (free, open source)
├─ Called from: /suggest-resource form (Ctrl+G button)
└─ Returns coordinates for address input
```

### Admin Utils

```
/lib/utils/admin.ts
├─ checkCurrentUserIsAdmin() → boolean
├─ Used by: /admin pages to gate access
└─ Checks: users.is_admin = true
```

### Admin Auth

```
/lib/utils/admin-auth.ts
├─ checkAdminAuth(request) → { isAuthorized, userId, authMethod, getClient() }
├─ Supports:
│  ├─ Session-based (from browser auth)
│  └─ API key (x-admin-api-key header)
├─ getClient() returns:
│  ├─ Service role client (if API key)
│  └─ Regular client (if session)
└─ Used by: Approval/rejection APIs
```

### Environment Variables

```
/lib/env.ts
├─ Type-safe environment variables
├─ Required:
│  ├─ NEXT_PUBLIC_SUPABASE_URL
│  ├─ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
│  ├─ SUPABASE_SERVICE_ROLE_KEY
│  ├─ ANTHROPIC_API_KEY
│  └─ GOOGLE_MAPS_KEY
└─ Optional:
   ├─ NEXT_PUBLIC_GOOGLE_MAPS_KEY
   └─ NEXT_PUBLIC_APP_URL
```

### Types

```
/lib/types/database.ts
├─ ResourceSuggestion
├─ VerificationResult
├─ VerificationChecks
├─ FieldConflict
└─ Other Supabase types

/lib/types/google-maps.ts
├─ GoogleMapsGeocodingResponse
└─ Geocoding API types
```

---

## Database Migrations

### Verification System

```
20250109000000_verification_system.sql
├─ Creates: verification_logs table
├─ Alters: resource_suggestions (adds many fields)
├─ Alters: resources (adds verification columns)
└─ RLS policies for all tables

20250109000001_ai_usage_tracking.sql
├─ Creates: ai_usage_logs table
└─ Tracks: Claude API usage + costs

20250109000003_verification_tracking.sql
├─ Additional verification tracking
└─ [Details in migration file]
```

### Suggestions Extension

```
20250108000000_allow_public_suggestions.sql
├─ Allows public API to insert suggestions
└─ Sets up RLS for resource_suggestions

20250112000000_expand_resource_suggestions_schema.sql
├─ Expands resource_suggestions with:
│  ├─ city, state, zip
│  ├─ email, hours, services_offered
│  ├─ eligibility_requirements, languages
│  └─ Other fields needed for full verification
```

---

## Summary: Files by Flow

### Flow 1: Batch Submission (Core)

- `/app/api/resources/suggest-batch/route.ts`
- `/lib/ai-agents/verification-agent.ts`
- `/lib/utils/verification.ts`
- Migrations: 20250109000000, 20250109000001

### Flow 2: User Suggestion (Incomplete)

- `/app/suggest-resource/page.tsx`
- `/lib/api/suggestions.ts`
- `/lib/utils/geocoding.ts`
- **Missing:** Integration with VerificationAgent

### Flow 3: Periodic Verification (Incomplete)

- `/scripts/periodic-verification.mjs`
- **Missing:** Phone/geocoding checks, field-level cadence, VerificationAgent reuse

### Flow 4: Admin Approval (Complete UI, Missing Integration)

- `/app/admin/flagged-resources/page.tsx`
- `/app/api/admin/flagged-resources/route.ts`
- `/app/api/admin/flagged-resources/[id]/approve/route.ts`
- `/app/api/admin/flagged-resources/[id]/reject/route.ts`
- `/app/api/admin/flagged-resources/[id]/approve-with-corrections/route.ts` (unused)
- **Missing:** Notifications, webhooks, bulk operations
