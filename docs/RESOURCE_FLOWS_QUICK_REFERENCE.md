# Resource Flows - Quick Summary

## The 4 Flows at a Glance

### Flow 1: AI Agent Batch Submission ✅ (87% auto-approved)

```
POST /api/resources/suggest-batch
│
├─ Verify with VerificationAgent (Level 1, 2, 3 checks)
├─ Score >= 0.85 + 2+ cross-refs → AUTO APPROVE → Create resource
├─ Score < 0.5 or no URL → AUTO REJECT
└─ Everything else → FLAG FOR HUMAN → Admin reviews
```

**Status:** Fully implemented
**Database:** `resource_suggestions` + `resources` + `verification_logs`

---

### Flow 2: User Suggestion (CRITICAL GAP)

```
GET /suggest-resource → Fill form → Submit
│
├─ Insert into resource_suggestions (status: "pending")
├─ suggested_by: user.id (tracks submitter)
│
⚠️  MISSING: Auto-verification doesn't happen!
├─ Should call VerificationAgent (same as Flow 1)
├─ Should auto-create resource if passes
└─ Should notify user of result

Currently: ALL user suggestions go to manual review (no auto-approval)
Impact: 13 days wait time, no user feedback, duplicates of auto-approvable resources
```

**Status:** 50% implemented (form + submission, missing verification)

---

### Flow 3: Periodic Verification

```
Cron job (weekly) → node periodic-verification.mjs
│
├─ Check websites with Playwright (renders like browser)
├─ Score passed/total checks
├─ Update verification_status + next_verification_at
├─ If failed > 0 → FLAG FOR HUMAN
│
⚠️  GAPS:
├─ Only URL checks implemented (phone/geocoding are TODO)
├─ Different code from Flow 1 (code duplication)
├─ No field-level cadence (phone 30d, address 180d, etc.)
├─ No admin notification when resources flagged
└─ No escalation for critical failures
```

**Status:** 40% implemented (URL checks, missing phone/geocoding)

---

### Flow 4: Admin Approval/Rejection ✅

```
GET /admin/flagged-resources → View pending → Approve/Reject
│
├─ Approve:
│  ├─ POST /api/admin/flagged-resources/[id]/approve
│  ├─ Create resource from suggestion
│  ├─ Geocode if missing coordinates
│  └─ Mark suggestion "approved"
│
├─ Reject:
│  ├─ POST /api/admin/flagged-resources/[id]/reject
│  ├─ Structured reasons (duplicate, wrong_service, etc.)
│  └─ Mark suggestion "rejected"
│
⚠️  GAPS:
├─ No notification on approval (resource goes live silently)
├─ No bulk operations (1 at a time)
├─ No user notification on rejection
├─ "Approve with corrections" UI missing
└─ No admin alert when new items flagged for review
```

**Status:** 70% implemented (core flow works, missing notifications/bulk)

---

## Critical Gaps by Severity

### 🔴 CRITICAL (Blocking)

1. **User suggestions not auto-verified**
   - File: `app/suggest-resource/page.tsx` → `/lib/api/suggestions.ts`
   - Missing: Call to VerificationAgent
   - Impact: No feedback loop, inefficient, duplicates

2. **No notification system**
   - Missing: Email, Slack, in-app notifications
   - Impact: Silent failures, admins miss items, users don't know status

3. **No search/map sync**
   - Missing: Webhook on resource creation
   - Impact: Map doesn't update, search index stale

### 🟡 HIGH (2-3 weeks)

1. **Periodic verification incomplete**
   - Missing: Phone checks, geocoding validation
   - Missing: Field-level cadence (different schedules per field)
   - Missing: VerificationAgent reuse

2. **No bulk operations**
   - Can only approve/reject 1 at a time
   - No batch approval UI

3. **"Approve with corrections" unused**
   - Route exists: `flagged-resources/[id]/approve-with-corrections/route.ts`
   - UI not implemented

### 🟠 MEDIUM (Next sprint)

1. **Field-level verification cadence not implemented**
   - Phone: 30 days
   - Website: 60 days
   - Address: 180 days
   - Currently: All or nothing

2. **Error escalation missing**
   - No admin alerts on AI failures
   - No dashboard showing verification health

3. **Cross-reference incomplete**
   - 211 API integration partial
   - Google Places partial
   - No Yelp/social media

---

## Data Flow Snapshot

```
┌─────────────────────┐
│ Batch API / Form    │
└──────────┬──────────┘
           │
      ┌────▼─────────┐
      │ Verification │
      │   Agent      │
      └──────┬───────┘
             │
     ┌───────┴───────────┐
     │                   │
┌────▼────┐    ┌─────────▼────────┐
│ AUTO    │    │ FLAG FOR HUMAN   │
│APPROVE  │    │   (Admin UI)     │
│ (87%)   │    └─────────┬────────┘
└────┬────┘              │
     │          ┌────────┼────────┐
     │          │                 │
     │    ┌─────▼──┐        ┌─────▼──┐
     │    │APPROVE │        │REJECT  │
     │    └─────┬──┘        └────────┘
     │          │
     └────┬─────┘
          │
    ┌─────▼────────────┐
    │ Resource Created │
    │ (active=true)    │
    └──────────────────┘
```

---

## Files to Understand Each Flow

### Flow 1: AI Batch

- API: `/app/api/resources/suggest-batch/route.ts` (300 lines)
- Agent: `/lib/ai-agents/verification-agent.ts` (688 lines)
- Utilities: `/lib/utils/verification.ts`

### Flow 2: User Suggestion

- Form: `/app/suggest-resource/page.tsx` (455 lines)
- API: `/lib/api/suggestions.ts` (120 lines)
- Missing: Call to VerificationAgent after submit

### Flow 3: Periodic Verification

- Script: `/scripts/periodic-verification.mjs` (321 lines)
- Missing: Integration with VerificationAgent
- Issues: Limited checks, no field-level cadence

### Flow 4: Admin Approval

- UI: `/app/admin/flagged-resources/page.tsx` (441 lines)
- Approve API: `/app/api/admin/flagged-resources/[id]/approve/route.ts` (163 lines)
- Reject API: `/app/api/admin/flagged-resources/[id]/reject/route.ts` (132 lines)
- Corrections API: `/app/api/admin/flagged-resources/[id]/approve-with-corrections/route.ts` (unused)

---

## Quick Stats

| Metric                   | Count | Status                                                                    |
| ------------------------ | ----- | ------------------------------------------------------------------------- |
| Flows Documented         | 4     | Complete                                                                  |
| Fully Implemented        | 2     | ✅ (Batch, Admin UI)                                                      |
| Partially Implemented    | 2     | ⚠️ (User Suggestion, Periodic)                                            |
| Critical Gaps            | 3     | 🔴 (notifications, sync, auto-verify)                                     |
| Integration Points       | 6     | ⚠️ (5 missing)                                                            |
| Database Tables Involved | 4     | `resource_suggestions`, `resources`, `verification_logs`, `ai_usage_logs` |

---

## Next Steps

1. **Review full analysis:** `/docs/RESOURCE_FLOWS_ANALYSIS.md`
2. **Prioritize fixes:** See Priority 1/2/3 section
3. **Start with:** Auto-verification for user suggestions (blocks everything else)
4. **Then:** Implement notification system (enables feedback loops)
5. **Then:** Search/map sync (enables full product functionality)
