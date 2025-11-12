# Database Triggers & Auto-Updates Quick Reference

## All Triggers at a Glance

| Trigger Name                                | Table                | Event                      | Auto-Updates                                                |
| ------------------------------------------- | -------------------- | -------------------------- | ----------------------------------------------------------- |
| `update_users_updated_at`                   | users                | BEFORE UPDATE              | users.updated_at                                            |
| `update_resources_updated_at`               | resources            | BEFORE UPDATE              | resources.updated_at                                        |
| `update_resource_reviews_updated_at`        | resource_reviews     | BEFORE UPDATE              | resource_reviews.updated_at                                 |
| `update_resource_rating_on_insert`          | resource_ratings     | AFTER INSERT               | resources.rating_average, rating_count                      |
| `update_resource_rating_on_update`          | resource_ratings     | AFTER UPDATE               | resources.rating_average, rating_count                      |
| `update_resource_rating_on_delete`          | resource_ratings     | AFTER DELETE               | resources.rating_average, rating_count                      |
| `update_resource_review_count_on_insert`    | resource_reviews     | AFTER INSERT               | resources.review_count                                      |
| `update_resource_review_count_on_update`    | resource_reviews     | AFTER UPDATE               | resources.review_count                                      |
| `update_resource_review_count_on_delete`    | resource_reviews     | AFTER DELETE               | resources.review_count                                      |
| `update_review_helpfulness_count_on_insert` | review_helpfulness   | AFTER INSERT               | resource_reviews.helpful_count, not_helpful_count           |
| `update_review_helpfulness_count_on_update` | review_helpfulness   | AFTER UPDATE               | resource_reviews.helpful_count, not_helpful_count           |
| `update_review_helpfulness_count_on_delete` | review_helpfulness   | AFTER DELETE               | resource_reviews.helpful_count, not_helpful_count           |
| `on_auth_user_created`                      | auth.users           | AFTER INSERT               | users (creates row)                                         |
| `trigger_update_next_verification`          | resources            | BEFORE UPDATE              | resources.next_verification_at                              |
| `update_resource_verification_timestamp`    | resources            | BEFORE UPDATE              | resources.last_verified_at                                  |
| `update_county_metrics_on_resource_change`  | resources            | AFTER INSERT/UPDATE/DELETE | county_coverage.resource_count, coverage_score              |
| `update_research_progress_on_suggestion`    | resource_suggestions | AFTER INSERT/UPDATE        | research_tasks.resources_found, resources_published, status |
| `calculate_priority_score_trigger`          | expansion_priorities | BEFORE INSERT/UPDATE       | expansion_priorities.priority_score                         |
| `create_launch_milestone_trigger`           | expansion_priorities | BEFORE UPDATE              | expansion_milestones (creates record)                       |
| `expansion_priorities_updated_at`           | expansion_priorities | BEFORE UPDATE              | expansion_priorities.updated_at                             |

---

## Key Insights

### Most Critical Auto-Updates

1. **Research Task Auto-Completion** (affects 1000+ line flows)
   - When: Suggestion approved, suggestion.research_task_id is set
   - Trigger: `update_research_task_progress()`
   - Effect: research_tasks.status auto-sets to 'completed' when resources_published >= target_count
   - Cascades: County expansion pipeline depends on this

2. **Verification Next Checks** (affects quality assurance)
   - When: resources.verification_status = 'verified'
   - Trigger: `trigger_update_next_verification()`
   - Effect: resources.next_verification_at = NOW() + 30-365 days (field-level cadence)
   - Why: Schedules re-verification based on data volatility

3. **County Coverage** (affects expansion strategy)
   - When: Any resource added/modified/deleted
   - Trigger: `update_county_metrics_on_resource_change()`
   - Effect: county_coverage.resource_count, coverage_score auto-recalculated
   - Why: Drives expansion_priorities logic

4. **Expansion Scoring** (affects strategic planning)
   - When: Any priority factor changes (population, release volume, etc)
   - Trigger: `calculate_priority_score_trigger()`
   - Effect: expansion_priorities.priority_score = composite score (0-1000)
   - Why: Admins rely on this to decide where to expand next

---

## What Happens When...

### Scenario: User Submits New Resource Suggestion

```
User clicks "Suggest Resource" → INSERT resource_suggestions
  ↓ No triggers fire here
  ↓ Admin approves
  ↓ UPDATE resource_suggestions SET status='approved'
  ↓ Trigger: update_research_task_progress()
    ├─ resources_found++
    └─ IF resources_published >= target: status='completed'
```

### Scenario: Admin Creates Resource from Suggestion

```
Admin clicks "Create Resource" → INSERT resources
  ↓ Trigger: update_county_metrics_on_resource_change()
    ├─ county_coverage.resource_count++
    └─ county_coverage.coverage_score recalc
  ↓ (no automatic verification scheduling yet - happens in code)
```

### Scenario: Verification Agent Verifies Resource

```
Agent code: UPDATE resources SET verification_status='verified'
  ↓ Trigger: trigger_update_next_verification()
    └─ resources.next_verification_at = NOW() + 30 days (default)
  ↓ Trigger: update_resources_updated_at()
    └─ resources.updated_at = NOW()
```

### Scenario: User Rates a Resource

```
User clicks 5-star rating → INSERT resource_ratings
  ↓ Trigger: update_resource_rating_on_insert()
    ├─ resources.rating_average = AVG(all ratings)
    └─ resources.rating_count = COUNT(all ratings)
```

### Scenario: Research Task Reaches Target

```
Admin approves 50th resource suggestion with research_task_id
  ↓ UPDATE resource_suggestions SET status='approved'
  ↓ Trigger: update_research_task_progress()
    └─ Checks: resources_published (50) >= target_count (50)?
       └─ YES! Auto-set status='completed', completed_at=NOW()
```

### Scenario: Expansion Location Launches

```
Admin: UPDATE expansion_priorities SET status='launched'
  ↓ Trigger: create_launch_milestone_trigger()
    ├─ INSERT expansion_milestones (type='launched')
    └─ AUTO SET actual_launch_date = NOW()
  ↓ Trigger: update_expansion_priorities_updated_at()
    └─ expansion_priorities.updated_at = NOW()
```

---

## Where to Find the Trigger Code

| Feature                 | Migration File                             | Functions                                                             |
| ----------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| Basic triggers          | `20250101000002_functions_triggers.sql`    | 6 functions, 17 triggers                                              |
| Verification scheduling | `20250109000000_verification_system.sql`   | `update_next_verification()`, `calculate_next_verification()`         |
| County tracking         | `20250109000004_research_pipeline.sql`     | `update_county_coverage_metrics()`, `update_research_task_progress()` |
| Expansion scoring       | `20250110000002_expansion_priorities.sql`  | `auto_calculate_priority_score()`, `create_launch_milestone()`        |
| Verification timestamps | `20250109000003_verification_tracking.sql` | `update_last_verified_timestamp()`                                    |

---

## Common Questions

**Q: Why does my research_tasks.status not auto-complete?**
A: Research task auto-completes ONLY when:

1. A resource_suggestion has research_task_id set
2. That suggestion.status is updated to 'approved'
3. The count of approved suggestions >= target_count

If you set suggested_by but forgot research_task_id, trigger won't fire.

**Q: When does next_verification_at get set?**
A: Only when verification_status = 'verified' (BEFORE UPDATE trigger). If you manually set verification_status to 'verified' without going through agent code, next_verification_at will still be calculated.

**Q: Are nested triggers possible?**
A: Yes! Example: UPDATE resource_suggestions → trigger → UPDATE county_coverage → trigger. PostgreSQL handles this, but watch for infinite loops.

**Q: Can I disable triggers?**
A: Yes, but NEVER do this in production:

```sql
ALTER TABLE resources DISABLE TRIGGER update_resources_updated_at;
-- do stuff
ALTER TABLE resources ENABLE TRIGGER update_resources_updated_at;
```

**Q: What if I need custom verification cadence?**
A: Current: Hard-coded 30-day default in `calculate_next_verification()`.
To customize: Modify function to check field-specific cadence, or add `field_verification_cadence JSONB` to resources.

---

## Performance Notes

- All triggers use AFTER INSERT/UPDATE/DELETE (except timestamp/next_verification which are BEFORE)
- Indexes are in place for key queries:
  - `idx_resources_verification_status` - WHERE verification_status = ...
  - `idx_resources_next_verification` - WHERE next_verification_at <= NOW()
  - `idx_county_coverage_priority` - ORDER BY priority DESC
  - `idx_expansion_priorities_priority_score` - ORDER BY priority_score DESC

- **Potential bottleneck**: `update_county_coverage_metrics()` runs on EVERY resource INSERT/UPDATE/DELETE
  - Recalculates for potentially multiple counties
  - Consider: Only update if city/state actually changed

- **Potential bottleneck**: `update_research_task_progress()` does full COUNT queries
  - Better: Track counts incrementally or use materialized view

---

## Testing Triggers

### Test Rating Aggregation

```sql
-- Insert resource
INSERT INTO resources (name, address, latitude, longitude, primary_category)
VALUES ('Test Org', '123 Main', 37.8, -122.3, 'employment')
RETURNING id;

-- Add rating
INSERT INTO resource_ratings (resource_id, user_id, rating)
VALUES ('<resource_id>', '<user_id>', 5);

-- Check: resources.rating_average should be 5.0, rating_count should be 1
SELECT rating_average, rating_count FROM resources WHERE id = '<resource_id>';
```

### Test County Coverage

```sql
-- Before:
SELECT resource_count, coverage_score FROM county_coverage WHERE county = 'Alameda';

-- Insert resource in Alameda, CA
INSERT INTO resources (name, address, city, state, latitude, longitude, primary_category)
VALUES ('Another Org', '456 Oak', 'Oakland', 'CA', 37.8, -122.3, 'housing');

-- After: resource_count should increment
SELECT resource_count, coverage_score FROM county_coverage WHERE county = 'Alameda';
```

### Test Research Task Auto-Completion

```sql
-- Get a research task
SELECT id, target_count, resources_published FROM research_tasks WHERE status = 'in_progress' LIMIT 1;

-- Create suggestions for that task (manually or via research agent)
-- Keep creating until resources_published = target_count

-- Check: status should auto-change to 'completed'
SELECT id, status, completed_at FROM research_tasks WHERE id = '<task_id>';
```
