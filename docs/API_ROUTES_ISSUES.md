# API Routes Issues & Recommendations

## Critical Issues Found

### 1. PUT /api/admin/resources/[id] Bypasses Verification

**Severity**: HIGH

**Issue**: The PUT endpoint allows updating any resource field without verification tracking:

```typescript
// PUT updates resource directly, no verification_source or verification_notes required
const { error } = await supabase.from('resources').update(updateData).eq('id', id)

// No tracking of:
// - What changed
// - Who made the change
// - When it was verified
// - What source was used to verify
```

**Contrast with PATCH**: The PATCH /api/admin/resources/[id]/update endpoint REQUIRES:

```typescript
if (!verification_source) {
  // Error: verification_source is required
}
if (!verification_notes) {
  // Error: verification_notes is required
}
```

**Risk**: Admins can make untracked changes to live resources. If a resource data becomes inaccurate, there's no audit trail.

**Recommendation**:

- Option A: Remove PUT endpoint entirely
- Option B: Make PUT require the same verification_source + verification_notes as PATCH
- Option C: Make PUT clear that it bypasses verification (update docs/error message)

---

### 2. POST /api/admin/verify-resource Has Unclear Purpose

**Severity**: MEDIUM

**Issue**: This endpoint exists but its use case is not documented:

```typescript
// Takes resource_id + suggestion data
// Runs Verification Agent
// Updates resource
// But unclear what the expected workflow is

// Not called from any UI shown
// Not integrated with GET /api/verification/next
// Seems separate from periodic verification cadence
```

**Questions**:

- Is this for manual ad-hoc verification of existing resources?
- Should this be called periodically or on-demand?
- How does it differ from periodic re-verification?
- Why does it take a "suggestion" parameter if resource_id already exists?

**Current Flow**:

```
POST /api/admin/verify-resource (triggered manually?)
  ↓
Verify Agent runs
  ↓
verification_logs created
  ↓
Resources updated with verification results
  ↓
But: verification_status NOT changed, human_review_required NOT updated
```

**Recommendation**:

- Document the intended use case clearly
- Add to VERIFICATION_PROTOCOL.md
- Or consolidate with batch periodic re-verification system
- Consider if this should update verification_status and next_verification_at

---

### 3. research_tasks vs expansion_priorities Mismatch

**Severity**: MEDIUM

**Issue**: Two separate task management systems that aren't clearly related:

**expansion_priorities** (used by GET /api/research/next):

```sql
- id, city, state
- target_resource_count
- current_resource_count
- priority_score
- priority_categories[]
```

**research_tasks** (used by POST /api/research/submit-candidate):

```sql
- id, county, state, category
- target_count
- resources_found
- status: in_progress, completed
```

**Problem**:

1. Different field names for same concept (target_resource_count vs target_count)
2. expansion_priorities is city-level, research_tasks is county/category-level
3. GET /api/research/next queries expansion_priorities
4. POST /api/research/submit-candidate validates against research_tasks
5. Are these supposed to be synced? How?

**Potential Data Inconsistency**:

```
GET /api/research/next returns:
  task_id: "expansion_priority_123"
  city: "Oakland"
  remaining: 10

But POST /api/research/submit-candidate validates:
  research_task_id from research_tasks table
  (completely different system)

These might not be synced!
```

**Recommendation**:

- Option A: Merge into single task management system
- Option B: Document clearly which is source of truth
- Option C: Add view that joins both systems
- Add validation to ensure consistency

---

### 4. Verification Decision Vocabulary Mismatch

**Severity**: LOW-MEDIUM

**Issue**: Three different terms for similar concepts across tables:

**verification_logs.decision**:

- 'auto_approve'
- 'flag_for_human'
- 'auto_reject'

**resources.verification_status**:

- 'pending'
- 'verified'
- 'flagged'
- 'rejected'

**resource_suggestions.status**:

- 'pending'
- 'approved'
- 'rejected'
- 'needs_attention'

**Mapping is Implicit**:

```
verification_logs.decision='auto_approve'
  → resources.verification_status='verified'?
  → resource_suggestions.status='approved'?

verification_logs.decision='flag_for_human'
  → resources.verification_status='flagged'?
  → resource_suggestions.status='pending'?

verification_logs.decision='auto_reject'
  → resources.verification_status='rejected'?
  → resource_suggestions.status='rejected'?
  → resource_suggestions.status='needs_attention'?
```

**The mapping isn't clear in code. If you need to query "all flagged resources needing review", which status field do you check?**

**Recommendation**:
Create utility functions for translation:

```typescript
function verificationDecisionToResourceStatus(decision: VerificationDecision): VerificationStatus {
  const map = {
    auto_approve: 'verified',
    flag_for_human: 'flagged',
    auto_reject: 'rejected',
  }
  return map[decision]
}

function verificationDecisionToSuggestionStatus(
  decision: VerificationDecision,
  isAutoReview: boolean
): SuggestionStatus {
  // Slightly different mapping depending on auto vs human review
}
```

---

### 5. suggest-batch Auto-Verification May Be Unexpected

**Severity**: LOW (if intentional)

**Issue**: POST /api/resources/suggest-batch automatically:

1. Creates resource_suggestions
2. Runs Verification Agent
3. May auto-create resources (87% pass rate)
4. Returns detailed per-resource verification results

**This is powerful but might surprise users**:

```typescript
// Send 100 resources
POST /api/resources/suggest-batch
  body: {
    resources: [...]
  }

// Response:
{
  auto_approved: 87,      // These are now published!
  flagged_for_human: 8,   // These need manual review
  auto_rejected: 5        // These won't be considered
}
```

**Questions**:

- Is 87% auto-approval rate deliberate?
- What confidence threshold triggers auto-approval?
- Can this be configured/disabled?
- What if the confidence logic is wrong and spams get published?

**Observation**: This is the ONLY endpoint that auto-publishes resources. All other paths require human approval.

**Recommendation**:

- Document the confidence thresholds
- Document the decision logic
- Consider making auto-approval optional (parameter in request)
- Consider logging which checks are used for auto-approval decisions

---

## Medium Issues

### 6. Multiple Auth Patterns Inconsistently Applied

**Issue**: Some endpoints accept both session + API key, others only one:

**Session only** (browser/Claude Web):

- GET /api/admin/resources
- POST /api/admin/resources
- PUT /api/admin/resources/[id]
- DELETE /api/admin/resources/[id]
- GET /api/admin/flagged-resources

**API key only** (Claude Code, scripts):

- GET /api/research/next
- POST /api/research/submit-candidate
- GET /api/verification/next (expects API key, but also checks session)

**Both** (session OR API key):

- POST /api/admin/flagged-resources/[id]/approve
- POST /api/admin/flagged-resources/[id]/approve-with-corrections
- POST /api/admin/flagged-resources/[id]/reject
- PATCH /api/admin/resources/[id]/update

**Impact**: Inconsistent user experience. Some flows can be done from Claude Code, others can't.

**Recommendation**:

- Document which endpoints support which auth methods
- Consider standardizing admin endpoints to support both auth methods
- Consider adding comments to code explaining auth choice

---

### 7. Geocoding Happens in Approval Endpoints

**Issue**: Google Maps geocoding is called during approval:

```typescript
// POST /api/admin/flagged-resources/[id]/approve
if (!latitude || !longitude) {
  // Call Google Maps Geocoding API
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?...`
  const geocodeResponse = await fetch(geocodeUrl)
}
```

**Problems**:

1. Approval endpoint depends on Google Maps availability
2. If geocoding fails, approval fails (error handling needed)
3. Geocoding should happen during suggestion verification, not approval
4. No validation that coordinates are reasonable

**Better approach**:

- Geocode during Verification Agent step
- Store coordinates in suggestion
- Approval just uses existing coordinates

---

## Low Priority Issues

### 8. Async Screenshot Capture Not Awaited

```typescript
// POST /api/admin/resources
captureWebsiteScreenshot(data.website, data.id)
  .then(async (screenshotResult) => {
    // Non-blocking, but...
  })
  .catch((err) => {
    console.error(...)
    // But what if this fails? No retry logic
  })
```

**Issue**: Screenshot capture is fire-and-forget. If it fails, no feedback to user.

**Recommendation**: Log failures clearly, consider adding retry logic or manual trigger.

---

### 9. Verification Source Validation is Loose

In approve-with-corrections:

```typescript
const hasVerificationSource =
  correction_notes.toLowerCase().includes('verified via') ||
  correction_notes.toLowerCase().includes('http') ||
  correction_notes.toLowerCase().includes('webfetch') ||
  // ...
```

This regex-based validation is fragile. User could include "https://example" by accident.

**Better approach**:

- Structured field for verification_source_url
- Separate field for verification_method
- Validation before accept

---

## Summary Table: Issues by Severity

| Issue                                        | Severity   | Component                                                  | Recommendation                        |
| -------------------------------------------- | ---------- | ---------------------------------------------------------- | ------------------------------------- |
| PUT bypasses verification                    | HIGH       | /api/admin/resources/[id]                                  | Require verification fields or remove |
| verify-resource purpose unclear              | MEDIUM     | /api/admin/verify-resource                                 | Document use case                     |
| research_tasks/expansion_priorities mismatch | MEDIUM     | /api/research/\*                                           | Unify task management                 |
| Verification vocab mismatch                  | MEDIUM     | Database schema                                            | Create mapping utilities              |
| suggest-batch auto-approval undocumented     | LOW-MEDIUM | /api/resources/suggest-batch                               | Document thresholds                   |
| Auth patterns inconsistent                   | MEDIUM     | All endpoints                                              | Document/standardize                  |
| Geocoding in approval endpoints              | MEDIUM     | /api/admin/flagged-resources/_/approve_                    | Move to verification step             |
| Screenshot capture not awaited               | LOW        | /api/admin/resources                                       | Add retry logic                       |
| Verification source validation loose         | LOW        | /api/admin/flagged-resources/[id]/approve-with-corrections | Structured validation                 |

---

## Action Items

### Immediate (Before PR/Merge)

1. Document verify-resource endpoint purpose or remove it
2. Document suggest-batch auto-approval thresholds
3. Clarify research_tasks vs expansion_priorities relationship

### Short-term (Next Sprint)

1. Fix PUT endpoint to require verification fields OR remove it
2. Create verification decision mapping utilities
3. Standardize auth patterns across admin endpoints
4. Add geocoding validation (bounds checking)

### Medium-term (Refactoring)

1. Merge research_tasks and expansion_priorities into unified system
2. Move geocoding from approval endpoints to verification step
3. Add structured verification_source fields to all verification/approval endpoints
4. Add retry logic for async screenshot capture
