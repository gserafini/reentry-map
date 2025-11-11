# Database Automation Gaps & Recommendations

## Overview

The database has **19 triggers with strong automation** for aggregate stats, verification scheduling, and expansion tracking. However, there are **6 significant gaps** where manual code or additional triggers are needed.

---

## Gap 1: Suggestion → Resource Auto-Conversion

### Current Behavior

```
resource_suggestions.status = 'approved'
  ↓ (NO TRIGGER)
  ↓ Requires manual admin action
  ↓ Admin clicks "Create Resource" button in UI
  ↓ Code calls: INSERT INTO resources (...)
  ↓ THEN UPDATE resource_suggestions SET created_resource_id = <id>
```

### Problem

- **Extra work**: Admins must manually create each resource from suggestion
- **Consistency**: No guarantee all approved suggestions become resources
- **Cascade failure**: If admin forgets, research task won't auto-complete

### Solution 1: Database Trigger (Recommended)

```sql
CREATE OR REPLACE FUNCTION auto_create_resource_from_suggestion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Create resource from suggestion
    INSERT INTO resources (
      name, address, city, state, zip, phone, email, website,
      description, services_offered, categories, tags,
      hours, eligibility_requirements,
      primary_category, status,
      ai_discovered, created_at
    ) VALUES (
      NEW.name, NEW.address, NEW.city, NEW.state, NEW.zip, NEW.phone, NEW.email, NEW.website,
      NEW.description, NEW.services_offered, NEW.categories, NEW.tags,
      NEW.hours, NEW.eligibility_requirements,
      NEW.primary_category, 'active',
      false, NOW()
    )
    -- Link back to suggestion
    RETURNING id INTO NEW.created_resource_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_resource_on_suggestion_approval
  BEFORE UPDATE ON resource_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_resource_from_suggestion();
```

### Solution 2: Application Code

Keep as is, but add validation in admin dashboard:

```typescript
// Flag resources with approved suggestions but no created_resource_id
SELECT * FROM resource_suggestions
WHERE status = 'approved' AND created_resource_id IS NULL
```

---

## Gap 2: Verification Log Insertion

### Current Behavior

```
Verification Agent (application code)
  ↓ Runs complex multi-step verification
  ↓ Makes API calls (phone validation, website checks, geocoding)
  ↓ Manually INSERT INTO verification_logs (...)
  ↓ Manually UPDATE resources SET verification_status = 'verified'
  ↓ Trigger: trigger_update_next_verification() auto-fires
```

### Problem

- **Can't be automated**: Requires multi-step agent logic and external API calls
- **No database trigger**: Too complex for SQL
- **Trust boundary**: Must happen in application, not database

### What IS Automated

✅ Once verification_logs is inserted, the rest cascades:

- `verification_status` updated by agent code
- `next_verification_at` auto-calculated by trigger
- `last_verified_at` auto-updated if fields changed

### Solution: Ensure Agent Code Exists

The Verification Agent MUST:

1. Run checks (phone, website, address, hours)
2. INSERT verification_logs with results
3. Based on decision, UPDATE resources
4. Triggers handle the rest

---

## Gap 3: Auto-Flag on Changes Detected

### Current Behavior

```
Verification Agent detects changes
  ↓ INSERT verification_logs (changes_detected = [{phone: '...old...', '...new...'}])
  ↓ NO TRIGGER to flag resource
  ↓ Agent code must manually: UPDATE resources SET verification_status='flagged'
  ↓ Trigger: trigger_update_next_verification() still fires (unwanted)
```

### Problem

- **Manual update required**: Agent code must explicitly flag resource
- **Logic duplication**: Decision logic in code + database
- **Missed edge cases**: Agent might forget to flag

### Solution: Add Trigger

```sql
CREATE OR REPLACE FUNCTION auto_flag_resource_on_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- If verification detected changes, flag the resource
  IF NEW.changes_detected IS NOT NULL
     AND (NEW.changes_detected::text != '[]' OR NEW.changes_detected::jsonb @> '[]'::jsonb = false) THEN
    UPDATE resources
    SET verification_status = 'flagged',
        human_review_required = true,
        updated_at = NOW()
    WHERE id = NEW.resource_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_flag_on_verification_changes
  AFTER INSERT ON verification_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_flag_resource_on_changes();
```

---

## Gap 4: Auto-Update Provenance

### Current Behavior

```
Resources.provenance = NULL initially
  ↓ Verification Agent should UPDATE it
  ↓ No trigger to enforce/maintain it
  ↓ Field exists but is dead code
```

### Problem

- **Not auto-populated**: Requires manual application code
- **No audit trail**: Can't see discovery/verification history
- **No validation**: Could contain invalid data

### Solution: Add Function + Trigger

```sql
CREATE OR REPLACE FUNCTION append_to_provenance()
RETURNS TRIGGER AS $$
BEGIN
  -- Append to provenance array when verification happens
  IF TG_TABLE_NAME = 'verification_logs' THEN
    UPDATE resources
    SET provenance = COALESCE(provenance, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'event', 'verification',
      'verification_log_id', NEW.id,
      'timestamp', NEW.created_at,
      'decision', NEW.decision,
      'score', NEW.overall_score
    ))
    WHERE id = NEW.resource_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER append_verification_to_provenance
  AFTER INSERT ON verification_logs
  FOR EACH ROW
  EXECUTE FUNCTION append_to_provenance();
```

---

## Gap 5: Auto-Notify on Flagged Resources

### Current Behavior

```
Admin updates resource: verification_status = 'flagged'
  ↓ Trigger: trigger_update_next_verification() fires (wrong!)
  ↓ Next verification date gets recalculated (should be null/ignored)
  ↓ NO notification to admin
  ↓ Admin must manually check dashboard
```

### Problem

- **No notification system**: Admins don't know resource is flagged
- **Wrong trigger fires**: next_verification logic runs on 'flagged' status
- **Reactive not proactive**: Admin must remember to check

### Solution 1: Modify Verification Trigger

```sql
-- In trigger_update_next_verification, add condition:
CREATE OR REPLACE FUNCTION update_next_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate next_verification_at if VERIFIED (not flagged/rejected)
  IF NEW.verification_status = 'verified' THEN
    NEW.next_verification_at := calculate_next_verification(row_to_json(NEW)::jsonb);
  ELSIF NEW.verification_status = 'flagged' THEN
    NEW.next_verification_at := NULL; -- Don't schedule re-verification
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Solution 2: Add Notification Trigger

```sql
CREATE OR REPLACE FUNCTION notify_admin_on_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status = 'flagged' AND
     (OLD.verification_status IS NULL OR OLD.verification_status != 'flagged') THEN
    -- Create notification record (if notification table exists)
    -- Or send email/webhook
    RAISE NOTICE 'Resource % flagged for review', NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_flagged_resource
  AFTER UPDATE OF verification_status ON resources
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_flag();
```

---

## Gap 6: County Assignment for Non-Addressed Resources

### Current Behavior

```
Migration: 20250109000002_support_non_addressed_resources.sql exists
  ↓ Purpose: Support resources without full addresses
  ↓ Problem: County matching requires address
  ↓ If no address, county_coverage.resource_count doesn't increment
```

### Problem

- **Incomplete tracking**: Resources without addresses don't contribute to county metrics
- **Expansion planning fails**: County coverage scores are inaccurate
- **No fallback**: No trigger to assign county manually or via geocoding

### Solution: Add County Assignment Function

```sql
-- Check if migration 20250110000000_county_assignment_function.sql exists
-- If yes: Use it
-- If no: Create this function

CREATE OR REPLACE FUNCTION assign_county_from_address(
  p_address TEXT,
  p_city TEXT,
  p_state TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_county TEXT;
BEGIN
  -- Simple approach: Use city to county mapping
  -- Better approach: Use geocoding service

  SELECT county INTO v_county
  FROM (VALUES
    ('Oakland', 'CA', 'Alameda'),
    ('Berkeley', 'CA', 'Alameda'),
    ('San Francisco', 'CA', 'San Francisco'),
    ('San Jose', 'CA', 'Santa Clara'),
    -- Add more city→county mappings
  ) AS city_county_map(city, state, county)
  WHERE city_county_map.city = p_city AND city_county_map.state = p_state;

  RETURN v_county;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add trigger to auto-assign county if not provided
CREATE OR REPLACE FUNCTION auto_assign_county()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.city IS NOT NULL AND NEW.state IS NOT NULL THEN
    -- Try to assign county from city/state
    SELECT COALESCE(
      NEW.county,
      assign_county_from_address(NEW.address, NEW.city, NEW.state)
    ) INTO NEW.county;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_assign_county_on_insert
  BEFORE INSERT ON resources
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_county();
```

---

## Gap 7: Research Task Auto-Assignment

### Current Behavior

```
research_tasks.status = 'pending'
  ↓ NO TRIGGER to assign task
  ↓ Agent must query: SELECT * FROM next_research_task LIMIT 1
  ↓ Agent manually claims: UPDATE research_tasks SET assigned_to = 'agent_id'
  ↓ NO validation that task was claimed
```

### Problem

- **Duplicate work**: Multiple agents could pick same task
- **Tasks stuck**: Task stays 'pending' if agent crashes
- **No load balancing**: No automatic distribution to available agents

### Current Design

This is **intentionally manual** for:

- **Flexibility**: Agent chooses which task to work on
- **Simple monitoring**: Admin can see which tasks are pending
- **Race condition handling**: Application layer handles conflicts

### Solution (if needed): Task Claim Locking

```sql
-- Add claim_token field to prevent race conditions
ALTER TABLE research_tasks
  ADD COLUMN claim_token TEXT,
  ADD COLUMN claimed_at TIMESTAMPTZ;

-- Atomic claim operation
UPDATE research_tasks
SET claim_token = gen_random_uuid()::text,
    claimed_at = NOW(),
    assigned_to = 'agent_id',
    status = 'in_progress'
WHERE id = (SELECT id FROM next_research_task LIMIT 1)
  AND claim_token IS NULL
RETURNING id, claim_token;
```

---

## Summary: High-Impact Gaps

| Gap                               | Impact                              | Effort | Priority |
| --------------------------------- | ----------------------------------- | ------ | -------- |
| Suggestion → Resource Auto-Create | Research pipeline stalls            | Low    | HIGH     |
| Auto-Flag on Changes              | Flagged resources miss human review | Low    | HIGH     |
| Update Provenance                 | Lose verification audit trail       | Medium | MEDIUM   |
| Notify on Flag                    | Admins miss flagged resources       | Medium | MEDIUM   |
| County Assignment                 | Expansion metrics incorrect         | Low    | MEDIUM   |
| Task Auto-Assignment              | ~~Task distribution~~ By design     | N/A    | LOW      |

---

## Implementation Priority

### Phase 1 (Critical - Do First)

1. Add trigger: `auto_create_resource_from_suggestion()`
2. Add trigger: `auto_flag_resource_on_changes()`
3. Fix trigger: Modify `update_next_verification()` to skip 'flagged' status

### Phase 2 (Important)

4. Add function + trigger: `append_to_provenance()`
5. Add trigger: `notify_admin_on_flag()` (or webhook)

### Phase 3 (Nice-to-Have)

6. Add county assignment logic via migration 20250110000000

---

## Testing the Gaps

```bash
# Test Gap 1: Does approved suggestion auto-create resource?
psql -c "
  UPDATE resource_suggestions SET status='approved' WHERE id='<test_id>';
  SELECT created_resource_id FROM resource_suggestions WHERE id='<test_id>';
"
# Expected: created_resource_id should be populated
# Actual: Will be NULL until trigger is added

# Test Gap 3: Does resource auto-flag on changes?
psql -c "
  INSERT INTO verification_logs (resource_id, changes_detected, decision)
  VALUES ('<resource_id>', '[{\"field\": \"phone\", \"old\": \"510-1234567\"}]', 'flag_for_human');
  SELECT verification_status FROM resources WHERE id='<resource_id>';
"
# Expected: verification_status = 'flagged'
# Actual: Might be 'verified' if agent didn't explicitly set it

# Test Gap 4: Is provenance updated?
psql -c "
  INSERT INTO verification_logs (resource_id, overall_score, decision, created_at)
  VALUES ('<resource_id>', 0.95, 'auto_approve', NOW());
  SELECT provenance FROM resources WHERE id='<resource_id>';
"
# Expected: provenance contains verification event
# Actual: provenance will be NULL
```
