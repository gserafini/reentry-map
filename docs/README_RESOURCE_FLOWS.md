# Resource Flows Documentation

Complete end-to-end analysis of all resource submission and verification flows in the reentry-map application.

## Quick Links

- **[RESOURCE_FLOWS_ANALYSIS.md](./RESOURCE_FLOWS_ANALYSIS.md)** - Detailed 946-line comprehensive analysis
- **[RESOURCE_FLOWS_QUICK_REFERENCE.md](./RESOURCE_FLOWS_QUICK_REFERENCE.md)** - 1-page quick overview
- **[RESOURCE_FLOWS_CODE_MAP.md](./RESOURCE_FLOWS_CODE_MAP.md)** - Code file references and signatures

## Summary

This documentation traces the complete lifecycle of resources in the system through 4 distinct flows:

### Flow 1: AI Agent Batch Submission ✅ (Fully Implemented)

Autonomous verification of batch resource submissions from AI agents with 87% auto-approval rate.

- **File**: `/app/api/resources/suggest-batch/route.ts`
- **Status**: Production-ready

### Flow 2: User Suggestion ⚠️ (Critical Gap)

User-submitted resource suggestions via `/suggest-resource` page.

- **Status**: Form works, but verification is missing (all suggestions require manual review)
- **Impact**: No user feedback, inefficient, missed auto-approval opportunities

### Flow 3: Periodic Verification ⚠️ (Incomplete)

Weekly cron-based re-verification of existing resources.

- **File**: `/scripts/periodic-verification.mjs`
- **Status**: URL checks implemented, phone/geocoding checks TODO
- **Issue**: Code duplication with VerificationAgent, no field-level cadence

### Flow 4: Admin Approval/Rejection ✅ (UI Complete, Missing Integration)

Admin interface for reviewing and approving/rejecting flagged resources.

- **Status**: Core functionality works but missing webhooks, notifications, bulk operations

## Critical Issues

### 🔴 Blocking (Priority 1)

1. **User suggestions not auto-verified** (4-6 hours to fix)
   - Missing call to VerificationAgent in `/lib/api/suggestions.ts`
   - All user submissions skip verification

2. **No notification system** (1-2 weeks)
   - Missing email, Slack, in-app notifications
   - Users don't know suggestion status

3. **No search/map sync** (3-5 days)
   - New resources don't update search index or map

### 🟡 High Priority (2-3 weeks)

- Periodic verification incomplete (phone & geocoding checks)
- No bulk operations for admin
- "Approve with corrections" not wired to UI

### 🟠 Medium Priority (next sprint)

- Field-level verification cadence not implemented
- Error escalation missing
- Cross-reference APIs incomplete

## Database Tables

4 tables involved in these flows:

| Table                  | Created By   | Purpose                                    | Rows    |
| ---------------------- | ------------ | ------------------------------------------ | ------- |
| `resource_suggestions` | Flow 1 & 2   | Stores submitted resources awaiting review | Growing |
| `resources`            | Flow 1 & 4   | Active resources in directory              | Growing |
| `verification_logs`    | Flow 1, 3, 4 | Verification audit trail                   | Growing |
| `ai_usage_logs`        | Flow 1       | Cost tracking for Claude API               | Growing |

## Implementation Timeline

**WEEK 1-2**: Critical Blocking

- Auto-verify user suggestions (4-6 hours)
- Basic email notifications (3-4 days)

**WEEK 3-4**: High Priority

- Complete periodic verification
- Search/map synchronization
- Field-level cadence

**WEEK 5+**: Medium Priority

- Bulk operations
- Admin dashboard
- Enhanced monitoring

## Key Statistics

- **Total Code Analyzed**: ~2,500 lines
- **Fully Implemented**: 2 flows
- **Partially Implemented**: 2 flows
- **Critical Gaps**: 3
- **High-Priority Issues**: 3
- **Medium-Priority Issues**: 3

## Files to Read First

1. Start with: **RESOURCE_FLOWS_QUICK_REFERENCE.md** (5 min read)
2. Then read: **RESOURCE_FLOWS_ANALYSIS.md** (30 min read)
3. For code details: **RESOURCE_FLOWS_CODE_MAP.md** (reference)

## Related Documentation

These analysis documents complement existing docs:

- `AUTONOMOUS_VERIFICATION_SYSTEM.md` - System design and verification logic
- `TECHNICAL_ARCHITECTURE.md` - Database schema and system architecture
- `PRODUCT_REQUIREMENTS.md` - Feature specifications

## Next Actions

1. **Review** this analysis (start with quick reference)
2. **Prioritize** fixes based on severity (blocking → high → medium)
3. **Implement** user suggestion auto-verification first (unblocks everything else)
4. **Test** each flow using curl examples in the analysis docs

## Questions?

See the detailed analysis docs for:

- Complete code walkthroughs
- API request/response examples
- Database schema details
- Testing strategies
- Implementation recommendations

---

**Analysis Date**: November 10, 2025
**Project**: reentry-map (Oakland resource directory)
**Analyst**: Claude Code
