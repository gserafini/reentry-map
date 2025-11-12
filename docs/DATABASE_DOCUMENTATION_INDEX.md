# Reentry Map Database Documentation Index

Complete analysis of the database schema, triggers, verification flow, and automation gaps.

---

## Quick Links

**Start here if you...**

- **Want a quick overview**: Read [DATABASE_TRIGGERS_QUICK_REFERENCE.md](DATABASE_TRIGGERS_QUICK_REFERENCE.md) (10 min)
- **Need to understand the full flow**: Read [DATABASE_SCHEMA_ANALYSIS.md](DATABASE_SCHEMA_ANALYSIS.md) (30 min)
- **Are fixing automation gaps**: Read [DATABASE_AUTOMATION_GAPS.md](DATABASE_AUTOMATION_GAPS.md) (20 min)
- **Are implementing a new feature**: Consult all three documents

---

## Document Descriptions

### 1. DATABASE_TRIGGERS_QUICK_REFERENCE.md (227 lines)

**What**: Quick reference table of all 19 database triggers and what they auto-update

**Contains**:

- Complete trigger list with table, event type, and auto-updated fields
- 4 critical auto-updates explained with flow diagrams
- 6 real-world scenarios (what happens when...)
- Performance notes and bottleneck warnings
- SQL test scripts to verify triggers work

**Best for**: Quick lookups, understanding trigger names, testing triggers

**Key table**: "All Triggers at a Glance" - 19 rows of trigger metadata

---

### 2. DATABASE_SCHEMA_ANALYSIS.md (1,028 lines)

**What**: Complete documentation of database schema, verification flow, RLS policies, and tables

**Contains**:

- 12 database triggers with detailed explanations (section 1)
- Auto-updating fields summary table (section 2)
- Complete 7-step suggestion → verification flow diagram (section 3)
- Detailed table schemas for all key tables (section 4):
  - resource_suggestions
  - resources (verification fields)
  - verification_logs
  - county_coverage
  - research_tasks
  - expansion_priorities
  - expansion_milestones
- Data completeness views (section 5)
- Gaps in automation (section 6)
- Verification status state machine (section 7)
- Key flows requiring application code (section 8)
- Row Level Security policies (section 9)
- AI agent logging & cost tracking (section 10)
- Research pipeline integration (section 11)
- Complete summary table (section 12)

**Best for**: In-depth understanding, reference documentation, implementing features

**Key diagram**: 7-step complete flow from suggestion to verification (section 3.1)

---

### 3. DATABASE_AUTOMATION_GAPS.md (419 lines)

**What**: Analysis of 6 gaps where automation is missing, with solutions

**Contains**:

- Gap 1: Suggestion → Resource Auto-Conversion (CRITICAL)
  - Problem: Manual admin work required
  - Solution: Database trigger + SQL code
- Gap 2: Verification Log Insertion (By design)
  - Requires application code + AI agent
- Gap 3: Auto-Flag on Changes (CRITICAL)
  - Problem: Flagged resources not auto-set
  - Solution: New trigger with SQL code
- Gap 4: Auto-Update Provenance (MEDIUM)
  - Problem: Audit trail not maintained
  - Solution: Function + trigger
- Gap 5: Auto-Notify on Flag (MEDIUM)
  - Problem: Admins don't know resource flagged
  - Solution: Notification trigger
- Gap 6: County Assignment (MEDIUM)
  - Problem: Non-addressed resources not tracked
  - Solution: County mapping function
- Gap 7: Task Auto-Assignment (By design)
  - Intentionally manual for flexibility
- Implementation priority: Phase 1, 2, 3 recommendations
- Testing code for each gap

**Best for**: Planning feature work, fixing critical gaps, understanding design decisions

**Key section**: "Summary: High-Impact Gaps" - priority table

---

## Database Trigger Overview

### Total Count

- **19 triggers** across 8 database functions
- **100% of auto-updates documented** with exact trigger names

### By Category

**Aggregate Statistics** (9 triggers)

- Rating average/count (3 triggers)
- Review count (3 triggers)
- Helpfulness voting (3 triggers)

**Verification Scheduling** (2 triggers)

- Next verification date calculation
- Last verified timestamp

**Research Pipeline** (2 triggers)

- Research task progress tracking
- County coverage metrics

**Expansion Strategy** (3 triggers)

- Priority score calculation
- Launch milestone creation
- Updated timestamp

**User Management** (1 trigger)

- Auto-create user profile on signup

**Timestamps** (2 triggers)

- General updated_at for users/resources/reviews

---

## Key Tables & Their Auto-Updates

| Table                    | Auto-Updated Fields                                                                            | Trigger    |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ---------- |
| **resources**            | rating_average, rating_count, review_count, updated_at, last_verified_at, next_verification_at | 7 triggers |
| **resource_reviews**     | helpful_count, not_helpful_count, updated_at                                                   | 3 triggers |
| **county_coverage**      | resource_count, coverage_score                                                                 | 1 trigger  |
| **research_tasks**       | resources_found, resources_published, status                                                   | 1 trigger  |
| **expansion_priorities** | priority_score, updated_at, actual_launch_date                                                 | 3 triggers |
| **expansion_milestones** | (auto-created records)                                                                         | 1 trigger  |
| **users**                | (auto-created on signup)                                                                       | 1 trigger  |

---

## Critical Flows

### Suggestion → Resource → Verification (7 Steps)

Step 1: User submits suggestion
Step 2: Admin reviews and approves
Step 3: Resource created from suggestion
Step 4: AI verification runs (initial)
Step 5: Human review (if flagged)
Step 6: Periodic re-verification (30-180 days)
Step 7: Changes detected → Flagging

**Timeline**: 5-7 seconds for steps 1-3 (database), hours for AI verification

**Documentation**: DATABASE_SCHEMA_ANALYSIS.md section 3

---

## RLS Security

All tables have Row Level Security (RLS) enabled:

- **Public**: resources (status='active'), ratings, approved reviews
- **User-owned**: favorites, reviews, ratings (users see their own)
- **Admin-only**: suggestions, verification_logs, expansion_priorities, AI logs

**Full documentation**: DATABASE_SCHEMA_ANALYSIS.md section 9

---

## AI Cost Tracking

Two tables track AI operations:

1. **ai_agent_logs** (legacy) - agent type, action, cost, duration
2. **ai_usage_logs** (new) - token tracking, cost per provider, monthly budgets

**Views**:

- ai_usage_summary - daily rollup by operation/provider
- ai_budget_status - monthly costs by provider

**Documentation**: DATABASE_SCHEMA_ANALYSIS.md section 10

---

## Performance Considerations

### Well-Indexed

- Verification status queries: `idx_resources_verification_status`
- Re-verification scheduling: `idx_resources_next_verification`
- Priority sorting: `idx_expansion_priorities_priority_score`

### Potential Bottlenecks

1. **update_county_coverage_metrics()** - runs on EVERY resource change
   - Recalculates for all matching counties
   - Consider: Only update if city/state changed

2. **update_research_task_progress()** - full COUNT queries
   - Better: Incremental counter or materialized view
   - Current: Works fine for MVP scale

**Documentation**: DATABASE_TRIGGERS_QUICK_REFERENCE.md "Performance Notes"

---

## Missing Critical Triggers (Gaps)

### Phase 1 (Implement First)

1. **auto_create_resource_from_suggestion()** - Research pipeline won't complete without this
2. **auto_flag_resource_on_changes()** - Flagged resources can be missed
3. **Fix update_next_verification()** - Should skip 'flagged' status

### Phase 2 (Important)

4. **append_to_provenance()** - Audit trail missing
5. **notify_admin_on_flag()** - Admin notification

### Phase 3 (Nice-to-Have)

6. **auto_assign_county()** - County metrics incomplete

**Full details & SQL code**: DATABASE_AUTOMATION_GAPS.md

---

## How to Use These Docs

### For New Developers

1. Read DATABASE_TRIGGERS_QUICK_REFERENCE.md (understand the automation)
2. Read DATABASE_SCHEMA_ANALYSIS.md section 3 (understand the flow)
3. Read DATABASE_SCHEMA_ANALYSIS.md section 4 (understand the tables)

### For Feature Implementation

1. Find your feature in DATABASE_SCHEMA_ANALYSIS.md
2. Check for gaps in DATABASE_AUTOMATION_GAPS.md
3. Use DATABASE_TRIGGERS_QUICK_REFERENCE.md for quick lookups

### For Bug Fixing

1. Check if it's in the gaps list (DATABASE_AUTOMATION_GAPS.md)
2. Verify trigger exists (DATABASE_TRIGGERS_QUICK_REFERENCE.md)
3. Check the trigger logic in migration files (DATABASE_SCHEMA_ANALYSIS.md)

### For Admin/Product

1. Read DATABASE_SCHEMA_ANALYSIS.md section 3 (the 7-step flow)
2. Check DATABASE_AUTOMATION_GAPS.md "Summary: High-Impact Gaps"
3. Use the state machine diagram (DATABASE_SCHEMA_ANALYSIS.md section 7)

---

## Important Migrations

All database code is in `/supabase/migrations/`:

| Migration                                | Content                                           |
| ---------------------------------------- | ------------------------------------------------- |
| 20250101000000_initial_schema.sql        | Core tables, indexes                              |
| 20250101000001_rls_policies.sql          | RLS policies                                      |
| 20250101000002_functions_triggers.sql    | Aggregate stat triggers (6 functions, 9 triggers) |
| 20250109000000_verification_system.sql   | Verification tables & scheduling                  |
| 20250109000001_ai_usage_tracking.sql     | AI cost tracking                                  |
| 20250109000003_verification_tracking.sql | Verification quality fields                       |
| 20250109000004_research_pipeline.sql     | Research tasks, county coverage                   |
| 20250110000002_expansion_priorities.sql  | Expansion strategy tracking                       |

---

## Key SQL Queries

### Find Resources Due for Re-Verification

```sql
SELECT * FROM resources
WHERE verification_status = 'verified'
  AND next_verification_at <= NOW()
ORDER BY next_verification_at ASC;
```

### Find Flagged Resources Awaiting Human Review

```sql
SELECT * FROM resources
WHERE human_review_required = true
ORDER BY updated_at DESC;
```

### Track Research Task Progress

```sql
SELECT
  id, county, target_count, resources_published, status,
  ROUND(100.0 * resources_published / NULLIF(target_count, 0)) as pct_complete
FROM research_tasks
WHERE status IN ('pending', 'in_progress')
ORDER BY priority DESC;
```

### Check Expansion Priorities

```sql
SELECT city, state, priority_score, priority_tier, current_resource_count, status
FROM expansion_priorities
WHERE status IN ('identified', 'researching', 'ready_for_launch')
ORDER BY priority_score DESC;
```

### View AI Cost Summary

```sql
SELECT
  DATE_TRUNC('day', created_at) as date,
  operation_type,
  provider,
  COUNT(*) as api_calls,
  SUM(total_cost_usd) as daily_cost
FROM ai_usage_logs
GROUP BY DATE_TRUNC('day', created_at), operation_type, provider
ORDER BY date DESC;
```

---

## Summary Statistics

| Metric                           | Count |
| -------------------------------- | ----- |
| Total database triggers          | 19    |
| Total functions                  | 13    |
| Total tables                     | 18    |
| Tables with RLS                  | 18    |
| Auto-updated fields              | 14    |
| Verification gap triggers needed | 3     |
| Critical gaps to fix             | 2     |
| Migrations with triggers         | 5     |

---

## Questions?

- **"What triggers exist?"** → DATABASE_TRIGGERS_QUICK_REFERENCE.md
- **"How does X work?"** → DATABASE_SCHEMA_ANALYSIS.md
- **"Why isn't X auto-updating?"** → DATABASE_AUTOMATION_GAPS.md
- **"Where's the SQL for Y?"** → Find in /supabase/migrations/
