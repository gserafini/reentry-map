# Command Center

**Real-time monitoring dashboard for research, verification, and expansion activities**

---

## Overview

The Command Center ([/admin/command-center](http://localhost:3003/admin/command-center)) provides real-time visibility into:

- **County Coverage** - Progress toward coverage targets
- **Expansion Planning** - Next priority county to research
- **Submitted Resources** - Live feed of incoming suggestions
- **Verification Queue** - Active verification activities
- **Agent Activity** - Research and verification agent sessions

All data updates **automatically in real-time** without page reloads using Supabase Realtime subscriptions.

---

## Features

### 📊 Current Coverage

Shows top 5 counties by priority with:

- Resource count vs. target
- Coverage percentage (progress bar)
- Status badge (not_started, initial_coverage, good_coverage, excellent_coverage)

**Auto-updates** when resources are added/approved.

### 🚀 Next Expansion

Highlights the **highest priority county** needing coverage:

- Target resource count
- Current count
- Priority score (1-100)

**Auto-updates** when coverage status changes.

### 🤖 Active Agents

Live view of running agent sessions:

- Agent type (research / verification)
- Resources processed
- Approvals / rejections
- Agent ID

**Auto-updates** when agents start/stop or process resources.

### ⏳ Submitted Resources

Real-time feed of pending resource suggestions:

- Resource name, city, state
- Category
- Submission time
- Quick view/edit actions

**Auto-updates** when:

- New suggestions submitted via API
- Suggestions approved/rejected
- Status changes

### ✅ Verification Queue

Live verification activity log:

- Resource being verified
- Agent performing verification
- Status: verifying → completed/rejected
- Completion timestamp

**Auto-updates** when:

- Agent starts verification
- Verification completes
- Agent sessions update

---

## Real-time Updates

### How it Works

The page uses **Supabase Realtime** to subscribe to database changes:

```typescript
// Subscribe to resource_suggestions
supabase
  .channel('resource_suggestions_changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'resource_suggestions',
    },
    (payload) => {
      // Update UI automatically
    }
  )
  .subscribe()
```

### Tables with Realtime Enabled

- `resource_suggestions` - New submissions
- `agent_sessions` - Agent activity
- `county_coverage` - Coverage metrics

### Migration to Self-Hosted Postgres

**Question:** "Will this work if we migrate to self-hosted Postgres?"

**Answer:** Requires changes:

**Option 1: Self-hosted Supabase** (recommended)

- Full Supabase stack including Realtime server
- No code changes needed
- Deploy via Docker: https://supabase.com/docs/guides/self-hosting

**Option 2: Native Postgres LISTEN/NOTIFY**

- Replace Supabase Realtime with custom WebSocket server
- Use Postgres `NOTIFY` on table triggers
- Example abstraction layer:

```typescript
// lib/realtime/index.ts
export interface RealtimeClient {
  subscribe(table: string, callback: (event: any) => void): () => void
}

// lib/realtime/supabase.ts
export class SupabaseRealtimeClient implements RealtimeClient {
  subscribe(table, callback) {
    const channel = supabase.channel(`${table}_changes`)
    channel.on('postgres_changes', { table }, callback).subscribe()
    return () => supabase.removeChannel(channel)
  }
}

// lib/realtime/postgres.ts
export class PostgresRealtimeClient implements RealtimeClient {
  subscribe(table, callback) {
    // WebSocket connection to custom LISTEN/NOTIFY server
    const ws = new WebSocket('ws://your-server/realtime')
    ws.send(JSON.stringify({ action: 'subscribe', table }))
    ws.onmessage = (msg) => callback(JSON.parse(msg.data))
    return () => ws.close()
  }
}
```

**Option 3: Polling Fallback** (simplest)

- Replace subscriptions with `setInterval(() => fetchData(), 3000)`
- No external dependencies
- Higher latency, more server load

---

## API Integration

The Command Center monitors data from these API endpoints:

### Research API

- `GET /api/research/next` - Creates research tasks from county priorities
- `POST /api/research/submit-candidate` - Adds to submitted resources list

### Verification API

- `GET /api/verification/next` - Pulls from submitted resources
- `POST /api/admin/flagged-resources/{id}/approve-with-corrections` - Completes verification

### Agent Sessions API

Would need to be created for full agent tracking:

- `POST /api/agents/session/start` - Register agent session
- `PATCH /api/agents/session/{id}` - Update progress
- `POST /api/agents/session/{id}/end` - Close session

---

## Usage Examples

### For Human Managers

1. **Monitor expansion progress** - See which counties need more resources
2. **Oversee agent activity** - Watch agents working in real-time
3. **Quality control** - Review incoming submissions before verification
4. **Prioritize work** - Identify bottlenecks (e.g., 100 pending, 0 verifying)

### For AI Manager Agents

An AI agent could:

```python
# Monitor command center data via API
coverage = requests.get(f'{base_url}/api/admin/coverage')
pending = requests.get(f'{base_url}/api/admin/suggestions?status=pending')

# Make decisions
if coverage['next_county']['resource_count'] < 10:
    # Kick off research agent for that county
    requests.post(f'{base_url}/api/research/start', json={
        'county': coverage['next_county']['county'],
        'state': coverage['next_county']['state']
    })

if pending['count'] > 50:
    # Spin up more verification agents
    for i in range(3):
        spawn_verification_agent()
```

### For Developers

The Command Center provides visibility during development:

```bash
# Terminal 1: Run dev server
npm run dev

# Terminal 2: Submit test resource
curl -X POST -H "x-admin-api-key: YOUR_KEY" \
  http://localhost:3003/api/research/submit-candidate \
  -d '{"task_id": "...", "name": "Test Org", ...}'

# Terminal 3: Watch command center in browser
# → See submission appear immediately in "Submitted Resources"
```

---

## Data Flow

```
Research Agent
    ↓
GET /api/research/next → Returns task for "Alameda County"
    ↓
WebSearch + WebFetch → Find organizations
    ↓
POST /api/research/submit-candidate (one at a time)
    ↓
[Command Center: New row in "Submitted Resources" 🔴 LIVE]
    ↓
Verification Agent
    ↓
GET /api/verification/next → Returns submitted resource
    ↓
[Command Center: Agent appears in "Active Agents" 🔴 LIVE]
    ↓
WebFetch website → Extract email, phone, hours
    ↓
POST /api/admin/flagged-resources/{id}/approve-with-corrections
    ↓
[Command Center: Resource removed from "Submitted", coverage updated 🔴 LIVE]
```

---

## Access

**URL:** [http://localhost:3003/admin/command-center](http://localhost:3003/admin/command-center)

**Requirements:**

- Must be signed in
- Must have `is_admin = true` in users table

**Navigation:**

- From Admin Dashboard → "Command Center" button
- Direct link in admin nav bar

---

## Future Enhancements

### Phase 1 (Current)

- ✅ Real-time county coverage
- ✅ Real-time submitted resources
- ✅ Active agent sessions
- ✅ Auto-refresh without reload

### Phase 2 (Planned)

- [ ] Verification activity log with completion times
- [ ] Agent performance charts (resources/hour, success rate)
- [ ] Manual controls to kick off research/verification
- [ ] Integration with Expansion API (replace hardcoded priorities)

### Phase 3 (Future)

- [ ] Historical trend charts (coverage growth over time)
- [ ] Alert system (e.g., "No verification activity for 1 hour")
- [ ] Agent assignment management (assign county to specific agent)
- [ ] Research task creation UI (create custom research tasks)

---

## Troubleshooting

**"Command Center shows no data"**
→ Run database migration first:

```sql
-- Verify tables exist
SELECT * FROM county_coverage LIMIT 1;
SELECT * FROM research_tasks LIMIT 1;
SELECT * FROM agent_sessions LIMIT 1;
```

**"Real-time updates not working"**
→ Check Realtime is enabled on tables:

```sql
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

Should show: `resource_suggestions`, `agent_sessions`, `county_coverage`

**"No pending suggestions showing"**
→ Submit test resource via API:

```bash
curl -X POST -H "x-admin-api-key: YOUR_KEY" \
  http://localhost:3003/api/research/submit-candidate \
  -d '{"task_id": "...", "name": "Test", ...}'
```

---

## Related Documentation

- [AGENT_WORKFLOWS.md](AGENT_WORKFLOWS.md) - API workflows for agents
- [VERIFICATION_PROTOCOL.md](VERIFICATION_PROTOCOL.md) - Quality standards
- [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) - Database schema
