# Expansion Priorities API - Usage Guide

**Purpose:** Admin tool for managing geographic expansion and controlling AI research agents.

**Last Updated:** 2025-11-10

---

## Overview

The Expansion Priorities system provides a structured way to:

1. **Track expansion targets** - Cities/metros to research and launch
2. **Prioritize expansion** - Score-based ranking using data from GEOGRAPHIC_EXPANSION_STRATEGY.md
3. **Control AI agents** - Queue research targets for discovery agents
4. **Monitor progress** - Track resource counts, milestones, and completion
5. **Manage workflow** - Status transitions from identified → researching → launched

---

## Database Schema

### `expansion_priorities` Table

Stores geographic expansion targets with priority scoring and status tracking.

**Key Fields:**

- **Geographic**: `city`, `state`, `county`, `metro_area`, `region`
- **Priority**: `priority_score` (0-1000, auto-calculated), `priority_tier` (tier_1-4)
- **Ranking Factors**: `population`, `state_release_volume`, `data_availability_score`, `geographic_cluster_bonus`, `community_partner_count`
- **Status**: `status` (identified/researching/ready_for_launch/launched/deferred/rejected)
- **Research**: `research_status` (not_started/in_progress/completed/blocked)
- **Goals**: `target_resource_count`, `current_resource_count`
- **Notes**: `strategic_rationale`, `blockers`, `research_notes`, `special_considerations`

### `expansion_milestones` Table

Tracks progress milestones for each expansion location.

**Milestone Types:**

- `research_started` - Research agent assigned
- `research_completed` - Research phase done
- `resources_50_reached` / `resources_100_reached` - Resource count milestones
- `ready_for_review` - Ready for admin review
- `approved_for_launch` - Approved for public launch
- `launched` - Location live and available to users
- `resources_verified` - Resources verified by quality check

---

## API Endpoints

### List Expansion Priorities

```bash
GET /api/admin/expansion-priorities?status=identified&research_status=not_started&sort_field=priority_score&sort_direction=desc
```

**Query Parameters:**

- `status` - Filter by status (comma-separated)
- `research_status` - Filter by research status
- `phase` - Filter by phase (phase_1, phase_2a, etc.)
- `state` - Filter by state code
- `region` - Filter by region
- `min_priority_score` - Minimum priority score
- `search` - Full-text search (city, metro, rationale)
- `sort_field` - Field to sort by (default: priority_score)
- `sort_direction` - Sort direction (asc/desc, default: desc)
- `limit` - Results limit (default: 50)
- `offset` - Pagination offset

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "city": "Los Angeles",
      "state": "CA",
      "metro_area": "Greater Los Angeles",
      "priority_score": 850,
      "priority_tier": "tier_1",
      "status": "identified",
      "research_status": "not_started",
      "phase": "phase_1",
      "population": 13200000,
      "state_release_volume": 987000,
      "progress_percentage": 0,
      "current_resource_count": 0,
      "target_resource_count": 100
      // ... more fields
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

---

### Create Expansion Priority

```bash
POST /api/admin/expansion-priorities
```

**Request Body:**

```json
{
  "city": "Los Angeles",
  "state": "CA",
  "metro_area": "Greater Los Angeles",
  "region": "west",
  "phase": "phase_1",
  "population": 13200000,
  "state_release_volume": 987000,
  "incarceration_rate": 402,
  "data_availability_score": 90,
  "geographic_cluster_bonus": 100,
  "community_partner_count": 8,
  "target_resource_count": 100,
  "strategic_rationale": "Largest metro in CA, highest absolute release volume in the nation",
  "special_considerations": "Bilingual resources critical (Spanish)"
}
```

**Response:** Created expansion priority object

---

### Get Single Expansion Priority

```bash
GET /api/admin/expansion-priorities/{id}
```

**Response:** Expansion priority with `milestones` array included

---

### Update Expansion Priority

```bash
PATCH /api/admin/expansion-priorities/{id}
```

**Request Body** (all fields optional):

```json
{
  "status": "researching",
  "research_status": "in_progress",
  "current_resource_count": 15,
  "research_notes": "Found 211 LA directory with 200+ potential resources",
  "blockers": "Need Spanish-speaking volunteer to verify resources"
}
```

**Auto-calculations:**

- Setting `research_status: "in_progress"` → Sets `research_agent_assigned_at`
- Setting `research_status: "completed"` → Sets `research_agent_completed_at`
- Setting `status: "launched"` → Sets `actual_launch_date` and `launched_by`

---

### Get Next Research Target (For AI Agents)

```bash
GET /api/admin/expansion-priorities/next-target?limit=1
```

Returns highest-priority location ready for research (status=identified, research_status=not_started).

**Response:**

```json
{
  "id": "uuid",
  "city": "Los Angeles",
  "state": "CA",
  "priority_score": 850
  // ... full priority object
}
```

---

### Claim Next Research Target (For AI Agents)

```bash
POST /api/admin/expansion-priorities/next-target
```

**Request Body:**

```json
{
  "status": ["identified"],
  "research_status": ["not_started"],
  "phase": ["phase_1"],
  "limit": 1
}
```

**What it does:**

1. Finds highest-priority target matching filters
2. Updates status to `researching` and research_status to `in_progress`
3. Sets `research_agent_assigned_at` timestamp
4. Creates `research_started` milestone
5. Returns claimed target

**Use this in your research agent workflow to automatically claim the next target.**

---

### Create Milestone

```bash
POST /api/admin/expansion-priorities/{id}/milestones
```

**Request Body:**

```json
{
  "milestone_type": "research_completed",
  "notes": "Discovered 87 resources from 211 LA and county probation directory",
  "metadata": {
    "resources_discovered": 87,
    "data_sources": ["211 LA", "LA County Probation"]
  }
}
```

**Auto-updates:** Some milestone types automatically update the parent expansion priority:

- `research_started` → Sets research_status = in_progress
- `research_completed` → Sets research_status = completed
- `ready_for_review` → Sets status = ready_for_launch
- `launched` → Sets status = launched

---

## Admin UI

### List View

**URL:** `/admin/expansion`

**Features:**

- Table view with priority score, tier, status, research status, progress
- Filters: status, research status, search
- Click row to edit
- "Add Location" button to create new priority

### Detail/Edit View

**URL:** `/admin/expansion/{id}`

**Features:**

- Edit all expansion priority fields
- Auto-calculates priority score when factors change
- Quick milestone buttons (research started, completed, 50 resources, etc.)
- Milestones history timeline
- Progress bar showing resource count progress

---

## Integration with Research Pipeline

### 1. Agent Workflow

Your AI research agent should follow this workflow:

```typescript
// Step 1: Claim next research target
const target = await fetch('/api/admin/expansion-priorities/next-target', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phase: ['phase_1'], // Optional: filter by phase
  }),
})

const expansionId = target.id
const city = target.city
const state = target.state

// Step 2: Run research (discover resources)
const resources = await discoverResources(city, state)

// Step 3: Update progress
await fetch(`/api/admin/expansion-priorities/${expansionId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    current_resource_count: resources.length,
    research_notes: `Discovered ${resources.length} resources from 211 and county directories`,
  }),
})

// Step 4: Mark research complete
await fetch(`/api/admin/expansion-priorities/${expansionId}/milestones`, {
  method: 'POST',
  body: JSON.stringify({
    milestone_type: 'research_completed',
    notes: `Found ${resources.length} resources`,
  }),
})

// Step 5: Check if ready for launch
if (resources.length >= target.target_resource_count) {
  await fetch(`/api/admin/expansion-priorities/${expansionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'ready_for_launch' }),
  })

  await fetch(`/api/admin/expansion-priorities/${expansionId}/milestones`, {
    method: 'POST',
    body: JSON.stringify({ milestone_type: 'ready_for_review' }),
  })
}
```

---

### 2. Populating from GEOGRAPHIC_EXPANSION_STRATEGY.md

Use the strategy document to populate expansion priorities:

```typescript
// Example: Populate California Tier 1 cities
const tier1Cities = [
  {
    city: 'Los Angeles',
    state: 'CA',
    metro_area: 'Greater Los Angeles',
    population: 13200000,
    state_release_volume: 987000,
    incarceration_rate: 402,
    data_availability_score: 90,
    geographic_cluster_bonus: 100, // High: adjacent to existing Bay Area coverage
    community_partner_count: 15,
    target_resource_count: 100,
    strategic_rationale:
      'Largest CA metro, highest absolute release volume, 40k+ currently incarcerated',
    phase: 'phase_1',
  },
  {
    city: 'San Diego',
    state: 'CA',
    population: 3300000,
    state_release_volume: 987000,
    incarceration_rate: 267,
    data_availability_score: 85,
    geographic_cluster_bonus: 80,
    community_partner_count: 8,
    target_resource_count: 75,
    strategic_rationale: '2nd largest CA metro, strong reentry programs, parolee concentration',
    phase: 'phase_1',
  },
  // ... more cities from strategy doc
]

// Bulk create
for (const city of tier1Cities) {
  await fetch('/api/admin/expansion-priorities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(city),
  })
}
```

---

### 3. Priority Score Algorithm

The `priority_score` is auto-calculated from these factors:

**Formula:**

```
priority_score =
  min(300, population / 10000) +          // 0-300 points
  min(250, state_release_volume / 1000) +       // 0-250 points
  (data_availability_score * 2) +               // 0-200 points
  (geographic_cluster_bonus * 1.5) +            // 0-150 points
  min(100, community_partner_count * 10)        // 0-100 points

Max Score: 1000 points
```

**Example Calculation for Los Angeles:**

```
Metro population:       13,200,000 → 300 points (capped)
State release volume:   987,000 → 250 points (capped)
Data availability:      90 → 180 points (90 * 2)
Geographic cluster:     100 → 150 points (100 * 1.5)
Community partners:     15 → 100 points (capped at 10 partners)
------------------------------------------------------------
Total:                  980 points → Tier 1
```

**Tier Assignment:**

- `tier_1`: 800-1000 points (highest priority)
- `tier_2`: 600-799 points
- `tier_3`: 400-599 points
- `tier_4`: 0-399 points (lowest priority)

---

## Example Workflows

### Workflow 1: Admin Adds New Expansion Target

1. Admin navigates to `/admin/expansion`
2. Clicks "Add Location"
3. Fills in city, state, metro area
4. Optionally fills in priority factors (population, release volume, etc.)
5. System auto-calculates priority score
6. Location added with status=`identified`, research_status=`not_started`
7. Location appears in research queue for agents

---

### Workflow 2: AI Agent Researches Location

1. Agent calls `POST /api/admin/expansion-priorities/next-target`
2. System returns highest-priority location and marks as `researching`/`in_progress`
3. Agent scrapes 211 directory, county websites, finds 87 resources
4. Agent adds resources to database via batch API
5. Agent updates expansion priority: `current_resource_count: 87`
6. Agent creates milestone: `research_completed`
7. If count >= target, agent sets status to `ready_for_launch`

---

### Workflow 3: Admin Reviews and Launches

1. Admin filters for `status=ready_for_launch`
2. Admin reviews location, verifies resource quality
3. Admin marks location as `launched` via UI
4. System creates `launched` milestone
5. Location becomes available to public users
6. Admin can track ongoing resource additions

---

## Integration Points

### With Resource Suggestions API

When research agent discovers resources, it should:

```typescript
// Submit resources via batch API
await fetch('/api/resources/suggest-batch', {
  method: 'POST',
  body: JSON.stringify({
    resources: discoveredResources.map((r) => ({
      ...r,
      metadata: {
        expansion_id: expansionPriorityId,
        discovered_by: 'research_agent',
      },
    })),
  }),
})

// Update expansion priority resource count
await fetch(`/api/admin/expansion-priorities/${expansionPriorityId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    current_resource_count: discoveredResources.length,
  }),
})
```

---

### With Coverage Tracking

Expansion priorities should link to coverage areas:

```typescript
// After launching a location
await fetch('/api/admin/coverage/areas', {
  method: 'POST',
  body: JSON.stringify({
    city: expansion.city,
    state: expansion.state,
    coverage_status: 'partial', // or 'full' if target reached
    resource_count: expansion.current_resource_count,
    last_updated: new Date().toISOString(),
  }),
})
```

---

## Monitoring & Reporting

### Dashboard Queries

**Get research pipeline status:**

```sql
SELECT
  research_status,
  COUNT(*) as count,
  SUM(current_resource_count) as total_resources
FROM expansion_priorities
WHERE status IN ('identified', 'researching')
GROUP BY research_status;
```

**Get expansion progress by phase:**

```sql
SELECT
  phase,
  status,
  COUNT(*) as locations,
  AVG(progress_percentage) as avg_progress
FROM expansion_priorities_with_progress
GROUP BY phase, status
ORDER BY phase, status;
```

**Get top priorities not yet researched:**

```sql
SELECT
  city, state, priority_score, strategic_rationale
FROM expansion_priorities
WHERE research_status = 'not_started'
ORDER BY priority_score DESC
LIMIT 10;
```

---

## Best Practices

### For Admins

1. **Populate from strategy doc** - Use GEOGRAPHIC_EXPANSION_STRATEGY.md to add all planned cities
2. **Set accurate factors** - Research metro population, release volumes for accurate scoring
3. **Track blockers** - Use `blockers` field to note why research is stalled
4. **Review regularly** - Check research_status=`completed` weekly, launch when quality verified

### For AI Agents

1. **Use next-target API** - Don't hardcode cities, let prioritization work
2. **Update progress frequently** - Update resource count as you discover resources
3. **Create milestones** - Help admins track what stage you're at
4. **Handle blocked state** - If you can't research (no data sources), set research_status=`blocked` with reason

### For Developers

1. **Use the view** - Query `expansion_priorities_with_progress` for progress percentage
2. **Filter by phase** - Align agent work with current expansion phase
3. **Monitor milestones** - Track velocity (time between milestones) for capacity planning

---

## Troubleshooting

**Q: Priority score not updating after changing factors?**

A: The trigger auto-calculates on INSERT/UPDATE. If editing directly in database, call:

```sql
UPDATE expansion_priorities
SET population = population
WHERE id = 'your-id'; -- Forces trigger to recalculate
```

**Q: Agent claimed target but crashed, how to reset?**

A: Update the expansion priority:

```sql
UPDATE expansion_priorities
SET research_status = 'not_started',
    status = 'identified',
    research_agent_assigned_at = NULL
WHERE id = 'stuck-target-id';
```

**Q: How to defer a location to later phase?**

A: Update status and add note:

```json
PATCH /api/admin/expansion-priorities/{id}
{
  "status": "deferred",
  "blockers": "Deferred to Phase 2B - focus on CA first"
}
```

---

## Next Steps

1. **Run migration** - Execute `20250110000002_expansion_priorities.sql` in Supabase
2. **Populate priorities** - Add cities from GEOGRAPHIC_EXPANSION_STRATEGY.md
3. **Test UI** - Visit `/admin/expansion` and create/edit a test location
4. **Integrate agents** - Update research agents to use `next-target` API
5. **Monitor progress** - Track research velocity and adjust priorities

---

**Last Updated:** 2025-11-10
**Maintained By:** Development Team
