# System Integration Plan

**Date**: 2025-01-11
**Goal**: Transform loose ends into a cohesive, professional, real-time admin system

## Executive Summary

**Current State**: Command Center has realtime updates, but 17 other admin pages require manual refresh. User suggestions skip verification. Critical automation gaps in database.

**Target State**: All admin pages update in real-time. Complete verification pipeline. Seamless integration from suggestion → approval → live resource → periodic re-verification.

**Timeline**: 3-5 days for Phase 1 (critical), 1-2 weeks for Phase 2 (complete)

---

## Phase 1: Real-time Admin Updates (Day 1-2) 🔴 CRITICAL

### Priority 1A: Core Admin Pages (6 hours)

**1. Admin Dashboard** (`/app/admin/page.tsx`)

- **Subscribe to**: `resources`, `resource_suggestions`, `resource_updates`
- **Updates**: 6 metric cards in real-time
- **Template**: Use Command Center as reference
- **Effort**: 2 hours

**2. Flagged Resources** (`/app/admin/flagged-resources/page.tsx`)

- **Subscribe to**: `resources` (where `human_review_required = true`)
- **Updates**: New flagged resources appear immediately
- **Critical for**: Verification pipeline visibility
- **Effort**: 2 hours

**3. Resource Suggestions** (`/app/admin/suggestions/page.tsx`)

- **Subscribe to**: `resource_suggestions`
- **Updates**: New community submissions appear immediately
- **Critical for**: Admin workflow
- **Effort**: 2 hours

### Priority 1B: Command Center Enhancement (2 hours)

**Add Missing Subscription**:

- Currently subscribes to: `resource_suggestions`, `agent_sessions`, `expansion_priorities`
- **Missing**: `resources` table (for verification status changes)
- **Impact**: Verification panel shows "All verified!" even when verification is running
- **Fix**: Add resources table subscription filtered by `verification_status = 'flagged'`

**Total Phase 1 Time**: 8 hours (1 day)

---

## Phase 2: Verification Pipeline Integration (Day 3-4) 🔴 CRITICAL

### Priority 2A: Auto-Verify User Suggestions (4 hours)

**Current Gap**: `/app/api/resources/suggestions/route.ts` stores suggestion but never verifies it

**Fix**:

```typescript
// In POST /api/resources/suggestions/route.ts
import { VerificationAgent } from '@/lib/ai-agents/verification-agent'

// After storing suggestion:
const verificationResult = await VerificationAgent.verify({
  name: suggestion.name,
  website: suggestion.website,
  phone: suggestion.phone,
  address: suggestion.address,
  // ... other fields
})

// Auto-approve if score >= 0.85
if (verificationResult.score >= 0.85 && !verificationResult.conflicts) {
  // Convert to resource immediately
  await createResourceFromSuggestion(suggestion.id)
} else {
  // Flag for human review
  await supabase
    .from('resource_suggestions')
    .update({
      status: 'pending',
      verification_notes: verificationResult.reason,
    })
    .eq('id', suggestion.id)
}
```

**Files Modified**:

- `/app/api/resources/suggestions/route.ts` (add auto-verification)
- `/lib/ai-agents/verification-agent.ts` (ensure standalone verify function)

**Testing**:

- Submit test suggestion via `/suggest-resource`
- Verify auto-approval works for high-quality submissions
- Verify flagging works for low-quality submissions

### Priority 2B: Database Trigger for Auto-Approval (2 hours)

**Current Gap**: Admin must manually click "Approve" button

**Fix**: Create trigger to auto-convert approved suggestions to resources

```sql
-- supabase/migrations/20250111000000_auto_approve_suggestions.sql

CREATE OR REPLACE FUNCTION auto_approve_suggestion()
RETURNS TRIGGER AS $$
BEGIN
  -- When suggestion status changes to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Insert into resources table
    INSERT INTO resources (
      name, description, address, city, state, zip,
      phone, email, website, category, services_offered,
      eligibility_requirements, hours,
      latitude, longitude,
      verification_status, verification_confidence,
      provenance, created_at
    ) VALUES (
      NEW.name, NEW.description, NEW.address, NEW.city, NEW.state, NEW.zip,
      NEW.phone, NEW.email, NEW.website, NEW.category, NEW.services_offered,
      NEW.eligibility_requirements, NEW.hours,
      NEW.latitude, NEW.longitude,
      'verified', NEW.verification_score,
      jsonb_build_object(
        'source', 'user_suggestion',
        'suggestion_id', NEW.id,
        'submitted_by', NEW.submitted_by,
        'submitted_at', NEW.created_at,
        'approved_by', auth.uid(),
        'approved_at', NOW()
      ),
      NOW()
    );

    -- Mark suggestion as completed
    NEW.status := 'completed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_approve_suggestion_trigger
  BEFORE UPDATE ON resource_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_suggestion();
```

**Testing**:

- Approve a suggestion via admin UI
- Verify resource auto-created
- Verify suggestion marked 'completed'
- Check provenance field populated

**Total Phase 2 Time**: 6 hours

---

## Phase 3: Periodic Verification Completion (Day 5) 🟡 HIGH

### Priority 3A: Add Phone Validation (2 hours)

**Current Gap**: `periodic-verification.mjs` only checks URLs

**Fix**:

```javascript
// In verifyResource() function
if (resource.phone) {
  checks.phone_valid = await validatePhoneNumber(resource.phone)
  if (checks.phone_valid.pass) {
    passed++
  } else {
    failed++
  }
}

// Add phone validation function
async function validatePhoneNumber(phone) {
  // Strip formatting
  const digits = phone.replace(/\D/g, '')

  // US numbers: 10-11 digits
  if (digits.length < 10 || digits.length > 11) {
    return { pass: false, error: 'Invalid phone format' }
  }

  // TODO: Optional Twilio Lookup API for live validation
  return { pass: true, checked_at: new Date().toISOString() }
}
```

### Priority 3B: Add Geocoding Check (2 hours)

**Current Gap**: Address geocoding not re-verified

**Fix**:

```javascript
// In verifyResource() function
if (resource.address && resource.city && resource.state) {
  checks.geocoding = await validateGeocoding(
    `${resource.address}, ${resource.city}, ${resource.state} ${resource.zip}`
  )
  if (checks.geocoding.pass) {
    passed++
  } else {
    failed++
  }
}

// Add geocoding validation
async function validateGeocoding(fullAddress) {
  try {
    const result = await geocodeAddress(fullAddress)

    if (result.latitude && result.longitude) {
      return {
        pass: true,
        latitude: result.latitude,
        longitude: result.longitude,
        checked_at: new Date().toISOString(),
      }
    }

    return { pass: false, error: 'Address not found' }
  } catch (error) {
    return { pass: false, error: error.message }
  }
}
```

**Total Phase 3 Time**: 4 hours

---

## Phase 4: Additional Admin Pages (Week 2) 🟠 MEDIUM

### Pages Needing Realtime (in priority order):

1. **Resource Updates** (`/app/admin/updates/page.tsx`) - User feedback (2h)
2. **Resources List** (`/app/admin/resources/page.tsx`) - Main list (2h)
3. **Expansion Priorities** (`/app/admin/expansion/page.tsx`) - Coverage map (2h)
4. **User Management** (`/app/admin/users/page.tsx`) - User list (1h)
5. **AI Agent Logs** (`/app/admin/ai-usage/page.tsx`) - Agent activity (1h)

**Pattern to Follow** (same for all):

```typescript
useEffect(() => {
  const channel = supabase
    .channel('table_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'table_name',
      },
      (payload) => {
        // Handle INSERT, UPDATE, DELETE
        if (payload.eventType === 'INSERT') {
          setData((prev) => [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setData((prev) => prev.map((item) => (item.id === payload.new.id ? payload.new : item)))
        } else if (payload.eventType === 'DELETE') {
          setData((prev) => prev.filter((item) => item.id !== payload.old.id))
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

**Total Phase 4 Time**: 8 hours

---

## Phase 5: API Cleanup & Consolidation (Week 2-3) 🟢 LOW

### Issues to Fix:

1. **PUT /api/admin/resources/[id] bypasses verification**
   - Add verification step
   - Or remove endpoint (use PATCH instead)

2. **POST /api/admin/verify-resource unclear purpose**
   - Document use case or remove

3. **Inconsistent auth patterns**
   - Standardize: session auth for web, API key for agents

4. **Geocoding in approval flow**
   - Move to verification step (already done in suggest-batch)

**Total Phase 5 Time**: 4 hours

---

## Testing Strategy

### Automated Tests (Add to CI)

```typescript
// tests/integration/realtime.test.ts
describe('Admin Realtime Updates', () => {
  it('should update dashboard when resource created', async () => {
    // Create resource via API
    // Verify dashboard updates within 1 second
  })

  it('should show flagged resource immediately', async () => {
    // Run verification that flags a resource
    // Verify appears in flagged resources page
  })

  it('should update command center on suggestion', async () => {
    // Submit suggestion
    // Verify command center updates
  })
})
```

### Manual Testing Checklist

- [ ] Open Admin Dashboard in one tab, submit resource in another → Dashboard updates
- [ ] Open Flagged Resources, run verification script → New flags appear
- [ ] Open Command Center, submit batch via API → Submissions panel updates
- [ ] Approve suggestion in admin → Resource appears in search immediately
- [ ] User submits suggestion → Admin sees it without refresh

---

## Rollout Plan

### Day 1 (8 hours)

- ✅ Add realtime to Admin Dashboard
- ✅ Add realtime to Flagged Resources
- ✅ Add realtime to Resource Suggestions
- ✅ Fix Command Center resources subscription

### Day 2 (6 hours)

- ✅ Add auto-verification to user suggestions
- ✅ Create database trigger for auto-approval
- ✅ Test suggestion → resource flow end-to-end

### Day 3 (4 hours)

- ✅ Add phone validation to periodic verification
- ✅ Add geocoding check to periodic verification
- ✅ Test complete verification pipeline

### Week 2 (8 hours)

- ✅ Add realtime to remaining admin pages
- ✅ Clean up redundant APIs
- ✅ Write integration tests

---

## Success Metrics

**Before**:

- 1/18 admin pages have realtime updates (6%)
- User suggestions: 0% auto-verified
- Verification: URLs only (33% complete)
- Admin workflow: Manual refresh required

**After**:

- 18/18 admin pages have realtime updates (100%)
- User suggestions: 85%+ auto-verified
- Verification: URLs + Phone + Geocoding (100% complete)
- Admin workflow: Zero manual refreshes needed

---

## Files to Modify

### Phase 1 (Realtime)

- `/app/admin/page.tsx` - Dashboard
- `/app/admin/flagged-resources/page.tsx` - Flagged resources
- `/app/admin/suggestions/page.tsx` - Suggestions
- `/app/admin/command-center/page.tsx` - Add resources subscription

### Phase 2 (Verification)

- `/app/api/resources/suggestions/route.ts` - Add auto-verify
- `/lib/ai-agents/verification-agent.ts` - Standalone verify function
- `/supabase/migrations/20250111000000_auto_approve_suggestions.sql` - Trigger

### Phase 3 (Periodic Verification)

- `/scripts/periodic-verification.mjs` - Add phone + geocoding
- `/lib/utils/validation.ts` - Phone validation function
- `/lib/utils/geocoding.ts` - Geocoding validation

### Phase 4 (Remaining Pages)

- `/app/admin/updates/page.tsx`
- `/app/admin/resources/page.tsx`
- `/app/admin/expansion/page.tsx`
- `/app/admin/users/page.tsx`
- `/app/admin/ai-usage/page.tsx`

---

## Risk Mitigation

**Supabase Realtime Limits**:

- Free tier: 500 concurrent connections, 100 msg/sec
- Current usage: ~20 connections max (all admin users)
- **Risk**: LOW ✅

**Database Trigger Performance**:

- Triggers add <10ms per operation
- Only fire on status changes (not every UPDATE)
- **Risk**: LOW ✅

**Auto-Verification Costs**:

- OpenAI API: ~$0.001 per verification
- Estimated: 50 suggestions/month = $0.05/month
- **Risk**: NONE ✅

**Breaking Changes**:

- All changes are additive (subscriptions, new triggers)
- No existing functionality removed
- **Risk**: VERY LOW ✅

---

## Next Steps

1. **Review this plan** - Ensure alignment with vision
2. **Start Phase 1** - Real-time updates (highest impact, lowest risk)
3. **Deploy incrementally** - One phase at a time
4. **Monitor metrics** - Track success criteria
5. **Iterate** - Adjust based on admin feedback

**Ready to start implementing?** I recommend beginning with Phase 1 (real-time admin updates) as it has the highest user impact and can be completed in one focused session.
