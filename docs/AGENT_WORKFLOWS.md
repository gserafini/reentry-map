# Agent Workflows

**Version:** 1.0
**Last Updated:** 2025-01-09
**Purpose:** Standardized API workflows for research and verification agents

---

## Overview

ReentryMap uses a **two-phase agentic pipeline** for content discovery and quality control:

1. **Research Agents** - Discover new resources via WebSearch/WebFetch
2. **Verification Agents** - Verify and publish discovered resources

All agents (Claude Code terminal, Claude Web, custom agents with API keys) use the **same standardized APIs** for consistency and quality control.

---

## Authentication

All API endpoints require admin authentication:

**Header:**

```
x-admin-api-key: your-admin-api-key
```

Get your API key from: `.env.local` → `ADMIN_API_KEY`

---

## Phase 1: Research Agent Workflow

**Mission:** Discover new community resources in target counties

### Step 1: Get Research Task

**Endpoint:** `GET /api/research/next`

**Returns:**

```json
{
  "task_id": "uuid",
  "county": "Contra Costa",
  "state": "CA",
  "category": null,
  "target_count": 20,
  "current_found": 0,
  "remaining": 20,
  "instructions": "Find community resources in Contra Costa County...",
  "suggested_queries": [
    "\"Contra Costa County\" reentry services",
    "\"Contra Costa County\" food pantry"
  ],
  "submit_url": "/api/research/submit-candidate",
  "priority": 90
}
```

### Step 2: Research Resources

Use **WebSearch** with suggested queries:

```typescript
// Example search
WebSearch({
  query: 'Contra Costa County food pantry',
})

// Review results, identify candidate organizations
```

For each candidate found:

- Note organization name
- Note website URL (if available)
- Note any contact info visible in search results

### Step 3: Extract Details

Use **WebFetch** on organization website:

```typescript
WebFetch({
  url: 'https://organization-website.org',
  prompt: 'Extract: organization name, address, phone, EMAIL, hours, services, eligibility',
})
```

### Step 4: Submit Candidate (ONE at a time!)

**Endpoint:** `POST /api/research/submit-candidate`

**Body:**

```json
{
  "task_id": "uuid-from-step-1",
  "name": "Organization Name",
  "address": "123 Main St",
  "city": "Richmond",
  "state": "CA",
  "zip": "94801",
  "phone": "(510) 555-1234",
  "email": "info@org.org",
  "website": "https://org.org",
  "description": "Brief description",
  "category": "food",
  "services_offered": ["Food pantry", "Hot meals", "Food delivery"],
  "hours": {
    "monday": "9:00 AM - 5:00 PM",
    "wednesday": "9:00 AM - 5:00 PM"
  },
  "eligibility_requirements": "Open to all community members",
  "discovered_via": "webfetch",
  "discovery_notes": "Found via WebSearch: Contra Costa food pantries. Verified via website https://org.org. Extracted contact info, hours, and services."
}
```

**CRITICAL:**

- `discovery_notes` is REQUIRED
- Must document search query OR website URL
- Submit ONE candidate at a time
- No batching allowed

**Response:**

```json
{
  "success": true,
  "suggestion_id": "uuid",
  "task_progress": {
    "found": 1,
    "target": 20,
    "remaining": 19,
    "task_complete": false
  },
  "next_action": "Continue researching. Find 19 more resources..."
}
```

### Step 5: Repeat Until Task Complete

When `task_complete: true`:

- Go back to Step 1
- Get next research task
- Repeat process

---

## Phase 2: Verification Agent Workflow

**Mission:** Verify discovered resources and publish them

### Step 1: Get Resource to Verify

**Endpoint:** `GET /api/verification/next`

**Returns:**

```json
{
  "suggestion_id": "uuid",
  "name": "Organization Name",
  "current_data": {
    "address": "123 Main St",
    "city": "Richmond",
    "state": "CA",
    "zip": "94801",
    "phone": "(510) 555-1234",
    "email": null,
    "website": "https://org.org",
    "hours": null,
    "services_offered": ["Food pantry"]
  },
  "discovery_info": {
    "found_via": "webfetch",
    "discovery_notes": "Found via WebSearch...",
    "research_task": "Contra Costa County, CA - All categories"
  },
  "priority": {
    "score": 100,
    "reason": "Missing email address (highest priority)"
  },
  "instructions": "Verify this resource using WebFetch or WebSearch...",
  "approve_url": "/api/admin/flagged-resources/uuid/approve-with-corrections",
  "reject_url": "/api/admin/flagged-resources/uuid/reject",
  "queue_status": {
    "total_pending": 15,
    "position": 1
  }
}
```

### Step 2: Verify Resource

**If website available:**

```typescript
WebFetch({
  url: 'https://org.org',
  prompt: 'Extract: address, phone, EMAIL (priority!), hours, services, eligibility',
})
```

**If no website:**

```typescript
WebSearch({
  query: 'Organization Name Richmond CA contact',
})

// Look for:
// - 211 directory listings
// - Google Business Profile
// - Government directories
// - News articles with contact info
```

### Step 3: Extract Missing Data

**Priority fields:**

1. **Email address** (highest priority if missing)
2. Phone number
3. Hours of operation
4. Services offered (specific, not generic)
5. Eligibility requirements

### Step 4: Approve with Corrections

**Endpoint:** `POST /api/admin/flagged-resources/{id}/approve-with-corrections`

**Body:**

```json
{
  "corrections": {
    "email": "info@org.org",
    "phone": "(510) 555-1234",
    "hours": {
      "monday": "9:00 AM - 5:00 PM",
      "wednesday": "9:00 AM - 5:00 PM",
      "friday": "9:00 AM - 5:00 PM"
    },
    "services_offered": ["Emergency food pantry", "Hot meal program", "Food delivery for seniors"],
    "eligibility_requirements": "Open to all Contra Costa County residents. No ID required."
  },
  "address_type": "physical",
  "correction_notes": "Verified via website (https://org.org). Updated email (info@org.org), phone (510-555-1234), and hours (M/W/F 9-5). Added detailed services list. Confirmed open to all county residents."
}
```

**CRITICAL Validation:**

- `correction_notes` is REQUIRED
- Must include verification source (URL or search query)
- Must include "Verified via" OR website URL
- System will reject if source not documented

**Response:**

```json
{
  "success": true,
  "resource_id": "uuid",
  "message": "Resource approved with corrections and published",
  "corrections_applied": "Verified via website..."
}
```

### Step 5: Repeat

Go back to Step 1 - get next resource to verify

---

## Alternative: Reject Resource

If resource cannot be verified OR has major issues:

**Endpoint:** `POST /api/admin/flagged-resources/{id}/reject`

**Body:**

```json
{
  "reason": "permanently_closed",
  "notes": "Verified via WebSearch - organization website shows 'Permanently Closed'. Multiple sources confirm closure in 2023.",
  "closure_status": "permanent"
}
```

**Rejection Reasons:**

**Permanent (remove from queue):**

- `duplicate` - Already in database
- `wrong_service_type` - Not reentry-related
- `permanently_closed` - Organization closed
- `does_not_exist` - Cannot verify existence
- `wrong_location` - Outside service area
- `spam` - Invalid submission
- `insufficient_info` - Cannot find enough data

**Needs Attention (flag for human review):**

- `wrong_name` - Name incorrect but fixable
- `incomplete_address` - Missing address components
- `temporarily_closed` - Temporary closure
- `needs_verification` - Uncertain, needs human check
- `confidential_address` - Shelter with confidential location
- `missing_details` - Some data but incomplete

---

## Quality Gates

### Research Agent

**Submission Requirements:**

- ✅ Name (required)
- ✅ At least ONE of: address, website, phone
- ✅ `discovery_notes` with search query OR website URL
- ✅ ONE submission at a time (no batching)

**System Rejects If:**

- ❌ Missing `task_id`
- ❌ Missing `name`
- ❌ Missing `discovery_notes`
- ❌ No contact info (address, website, phone all missing)

### Verification Agent

**Approval Requirements:**

- ✅ `correction_notes` with verification source
- ✅ Source must be: website URL OR search query
- ✅ At least ONE field updated
- ✅ Email attempted (found OR documented as unavailable)

**System Rejects If:**

- ❌ Missing `correction_notes`
- ❌ No verification source in notes
- ❌ Generic notes without source URL
- ❌ Shortcuts like "looks good" without verification

---

## Example: Complete Research Flow

```bash
# Step 1: Get task
curl -H "x-admin-api-key: your-key" \
  http://localhost:3003/api/research/next

# Response: Research 20 resources in Contra Costa County

# Step 2: WebSearch
WebSearch("Contra Costa County food pantry")

# Step 3: For each found, WebFetch website
WebFetch("https://org.org", "Extract contact, hours, services")

# Step 4: Submit candidate
curl -X POST -H "x-admin-api-key: your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "uuid",
    "name": "Food Bank of Contra Costa",
    "website": "https://foodbankccs.org",
    "email": "info@foodbankccs.org",
    "discovery_notes": "Found via WebSearch. Verified via website https://foodbankccs.org"
  }' \
  http://localhost:3003/api/research/submit-candidate

# Step 5: Repeat 19 more times (ONE at a time!)
```

---

## Example: Complete Verification Flow

```bash
# Step 1: Get resource to verify
curl -H "x-admin-api-key: your-key" \
  http://localhost:3003/api/verification/next

# Response: Verify "Food Bank of Contra Costa" (missing email)

# Step 2: WebFetch website
WebFetch("https://foodbankccs.org", "Extract email, phone, hours")

# Step 3: Approve with corrections
curl -X POST -H "x-admin-api-key: your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "corrections": {
      "email": "info@foodbankccs.org",
      "phone": "(925) 676-7543",
      "hours": {"monday": "9-5", "wednesday": "9-5"}
    },
    "correction_notes": "Verified via website (https://foodbankccs.org). Updated email, phone, hours."
  }' \
  http://localhost:3003/api/admin/flagged-resources/uuid/approve-with-corrections

# Step 4: Repeat
```

---

## Agent Instructions Template

**For Research Agents:**

```
You are helping to discover resources for ReentryMap.org.

1. GET /api/research/next to receive your research task
2. Use WebSearch with suggested queries to find organizations
3. For each organization found:
   - WebFetch their website to extract details
   - POST to /api/research/submit-candidate (ONE at a time!)
   - Include discovery_notes documenting the source
4. Repeat until task complete
5. Get next task and continue

IMPORTANT: No batching. Submit candidates one at a time.
```

**For Verification Agents:**

```
You are helping to verify resources for ReentryMap.org.

1. GET /api/verification/next to receive ONE resource to verify
2. WebFetch the website OR WebSearch for current information
3. Extract: email (PRIORITY!), phone, hours, services, eligibility
4. POST to /api/admin/flagged-resources/{id}/approve-with-corrections
   - Include corrections object with updated fields
   - Include correction_notes with verification source (URL required!)
5. Get next resource and repeat

IMPORTANT:
- Must document verification source (website URL or search query)
- ONE resource at a time
- No shortcuts - always verify externally
```

---

## Monitoring & Metrics

### Research Progress

```bash
# Check county coverage status
curl -H "x-admin-api-key: your-key" \
  http://localhost:3003/api/research/status
```

### Verification Queue

```bash
# Check verification queue size
curl -H "x-admin-api-key: your-key" \
  http://localhost:3003/api/verification/status
```

### Agent Performance

Track via `agent_sessions` table:

- Tasks completed
- Resources processed
- Approval/rejection rates
- Average processing time

---

## Troubleshooting

**"No research tasks available"**
→ All counties have good coverage. Check admin dashboard for expansion priorities.

**"No resources pending verification"**
→ All submitted resources verified. Start research to discover more.

**"Validation failed: correction_notes must include verification source"**
→ Add website URL or search query to correction_notes. Example: "Verified via website (https://org.org)"

**"Invalid task_id"**
→ Task was completed or cancelled. Call GET /api/research/next for new task.

---

## Best Practices

1. **Always verify externally** - Never assume data is correct without checking
2. **Document your sources** - Include URLs in discovery_notes and correction_notes
3. **One at a time** - No batching, no bulk processing
4. **Prioritize email** - Email addresses are highest priority for contact
5. **Specific services** - "Emergency food pantry" not "Community services"
6. **Real hours** - Extract actual hours, not "Call for hours"
7. **Check for relocations** - Organizations move, verify current address

---

## See Also

- [VERIFICATION_PROTOCOL.md](VERIFICATION_PROTOCOL.md) - Detailed verification guidelines
- [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) - Database schema
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Complete API reference

---

**Questions?** See docs or ask in #dev channel
