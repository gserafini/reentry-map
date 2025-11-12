# Data Quality Pipeline

Complete documentation of our multi-layered data quality and verification system.

## Overview

The Reentry Map uses a **comprehensive, multi-layered verification system** to ensure data quality across all resource submissions. This system combines automated checks, AI verification, and periodic re-verification to maintain high-quality, accurate data.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA ENTRY POINTS                        │
├─────────────────────────────────────────────────────────────┤
│  1. AI Agent API      (/api/resources/suggest-batch)        │
│  2. User Suggestions  (/suggest-resource)                   │
│  3. Admin Entry       (/admin/resources)                    │
│  4. Import Scripts    (scripts/import-*.mjs) - DEPRECATED   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              VERIFICATION AGENT (Initial)                   │
│                                                              │
│  Level 1: Automated Checks (10s)                           │
│    - URL reachability (with redundancy)                    │
│    - Phone validation                                       │
│    - Address geocoding                                      │
│                                                              │
│  Level 2: AI Verification (30s)                            │
│    - Website content matching                               │
│    - Service description validation                         │
│                                                              │
│  Level 3: Cross-referencing (60s)                          │
│    - 211 database lookup                                    │
│    - Google Maps verification                               │
│    - Conflict detection                                     │
│                                                              │
│  Decision:                                                  │
│    ✅ Auto-approve (87%) → Create resource                 │
│    ⚠️  Flag for human (8%) → Pending review               │
│    ❌ Auto-reject (5%) → Mark as rejected                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   ACTIVE RESOURCES                          │
│                                                              │
│  verification_status: 'verified'                           │
│  next_verification_at: [auto-calculated]                   │
│  verification_confidence: 0.0-1.0                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         PERIODIC RE-VERIFICATION (Weekly Cron)              │
│                                                              │
│  Runs on resources where:                                   │
│    next_verification_at <= NOW()                           │
│                                                              │
│  Checks:                                                    │
│    - URL still reachable (redundant verification)          │
│    - Phone still valid (TODO)                              │
│    - Address still geocodable (TODO)                       │
│                                                              │
│  Actions:                                                   │
│    ✅ Pass → Update last_verified_at, schedule next       │
│    ⚠️  Fail → Flag as 'flagged', needs human review       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              FLAGGED RESOURCES QUEUE                        │
│                                                              │
│  Admin dashboard shows:                                     │
│    - Resources with human_review_required = true           │
│    - Verification failures and reasons                      │
│    - Suggested corrections from AI                          │
│                                                              │
│  Admin actions:                                             │
│    - Approve (mark as verified)                            │
│    - Approve with corrections                               │
│    - Reject (mark as inactive)                             │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Resources Table

```sql
-- Verification fields
verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'flagged', 'rejected'))
verification_confidence DECIMAL(3,2) CHECK (0 <= verification_confidence <= 1)
last_verified_at TIMESTAMPTZ
next_verification_at TIMESTAMPTZ  -- Auto-calculated based on field-level cadence
human_review_required BOOLEAN DEFAULT false
verification_history JSONB DEFAULT '[]'::jsonb
provenance JSONB  -- Who discovered, how, when
```

### Verification Logs Table

Tracks every verification attempt with full audit trail:

```sql
CREATE TABLE verification_logs (
  id UUID PRIMARY KEY,
  resource_id UUID REFERENCES resources(id),
  suggestion_id UUID REFERENCES resource_suggestions(id),

  -- What kind of verification
  verification_type TEXT CHECK (verification_type IN ('initial', 'periodic', 'triggered')),
  agent_version TEXT NOT NULL,

  -- Results
  overall_score DECIMAL(3,2),
  checks_performed JSONB,  -- All checks and their results
  conflicts_found JSONB,   -- Conflicts with external sources
  changes_detected JSONB,  -- Changes from last verification

  -- Decision
  decision TEXT CHECK (decision IN ('auto_approve', 'flag_for_human', 'auto_reject')),
  decision_reason TEXT,
  auto_approved BOOLEAN,
  human_reviewed BOOLEAN,
  human_decision TEXT,

  -- Performance
  duration_ms INTEGER,
  api_calls_made INTEGER,
  estimated_cost_usd DECIMAL(10,4),

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Field-Level Verification Cadence

Different fields have different volatility and verification schedules:

| Field              | Volatility    | Cadence  | Reason                           |
| ------------------ | ------------- | -------- | -------------------------------- |
| `phone`            | Very High     | 30 days  | Numbers change frequently        |
| `hours`            | High          | 30 days  | Hours change seasonally          |
| `website`          | Medium        | 60 days  | URLs can break, content changes  |
| `email`            | Medium        | 60 days  | Contacts change                  |
| `services_offered` | Medium        | 60 days  | Programs come and go             |
| `description`      | Low           | 90 days  | Relatively stable                |
| `eligibility`      | Low           | 90 days  | Requirements change slowly       |
| `address`          | Very Low      | 180 days | Physical locations stable        |
| `city/state/zip`   | Very Low      | 180 days | Rarely change                    |
| `name`             | Extremely Low | 365 days | Organization names rarely change |

**Auto-Calculated**: When a resource is verified, `next_verification_at` is set based on the shortest cadence of fields that were checked.

## URL Verification (Redundant)

To avoid false positives from IP blocks or network issues, URL checks use **redundant verification**:

### Process

1. **Direct Check**: Fetch from our server

   ```typescript
   fetch(url, { method: 'HEAD', timeout: 10s })
   ```

2. **Redundant Check**: Verify via is-it-up.org API

   ```typescript
   fetch(`https://api.is-it-up.org/api/check?url=${url}`)
   ```

3. **Decision**: Pass if **EITHER** check succeeds
   - Avoids false positives from temporary blocks
   - Confirms site is actually down before flagging

### Example Result

```json
{
  "pass": true,
  "checked_at": "2025-01-11T00:30:00Z",
  "latency_ms": 1250,
  "direct_check": {
    "pass": false,
    "error": "Request blocked by firewall"
  },
  "redundant_check": {
    "pass": true,
    "status_code": 200
  }
}
```

In this case, our direct check failed (possibly IP blocked), but redundant check confirmed the site is up. Resource marked as **verified**.

### IP Blocking Detection & Alerting

When direct check fails BUT redundant check passes, this indicates **our IP is specifically blocked** - a critical operational insight.

**Automatic Detection**:

- Script detects IP blocking scenario
- Logs details to `verification_logs.checks_performed.ip_block_details`
- Resource still marked as `verified` (site is working)
- Admin alerted at end of verification run

**Admin Alert Output**:

```
🚨 IP BLOCKS DETECTED: 3
   ADMIN ACTION REQUIRED: These resources are working but our IP is blocked:
   1. https://example.org
      Error: net::ERR_CONNECTION_REFUSED
      Status: Direct N/A, Redundant 200

   Recommended actions:
   - Verify from different IP/network
   - Contact website admin to whitelist verification bot
   - Use VPN or proxy for future checks
   - Monitor for patterns (same hosting provider, security service, etc.)
```

**Analysis Tools**:

```bash
# Check recent IP blocking incidents
npm run verify:check-ip-blocks

# Custom time range (last 7 days)
node scripts/check-ip-blocks.mjs --days=7
```

This generates a detailed report with:

- Resources affected by IP blocking
- Frequency of incidents per resource
- Pattern analysis (error types, domains affected)
- Actionable recommendations

## Usage

### Initial Verification (Automatic)

When resources are submitted via API or user suggestions, the VerificationAgent automatically runs:

```bash
# Happens automatically on submission
POST /api/resources/suggest-batch
```

### Periodic Re-Verification (Weekly Cron)

Run weekly to check resources due for re-verification:

```bash
# Production cron (weekly, Sundays at 2am)
0 2 * * 0 cd /app && npm run verify:periodic >> /var/log/verification.log 2>&1

# Manual test (dry run - no database changes)
npm run verify:periodic:dry-run

# Manual run (up to 50 resources)
npm run verify:periodic

# Custom limit
node scripts/periodic-verification.mjs --limit=100
```

### Admin Review Workflow

1. **View Flagged Resources**
   - Visit `/admin/flagged-resources`
   - See all resources with `human_review_required = true`

2. **Review Details**
   - Click resource to see verification logs
   - View failure reasons (URL unreachable, conflicts, etc.)
   - See suggested corrections from AI

3. **Take Action**
   - **Approve**: Mark as verified, reset next_verification_at
   - **Approve with Corrections**: Update data + verify
   - **Reject**: Mark as inactive, don't show to users

## Verification Agent Details

### Level 1: Automated Checks (10s target)

```typescript
// URL reachability (with redundancy)
const urlCheck = await checkUrlReachable(website)
// ✅ Pass if EITHER direct OR redundant check succeeds

// Phone validation
const phoneCheck = validatePhoneNumber(phone)
// ✅ Pass if matches US phone format (10-11 digits)

// Address geocoding
const geoCheck = await validateAddressGeocoding(address)
// ✅ Pass if Google Geocoding API finds valid coordinates
```

### Level 2: AI Content Verification (30s target)

```typescript
// Fetch website content
const content = await extractWebsiteContent(website)

// Send to Claude Haiku 4.5 for verification
const prompt = `
Verify if website content matches submitted resource data:
- Name: ${name}
- Category: ${category}
- Description: ${description}

Website content:
${content}

Respond with JSON: { pass, confidence, evidence }
`

// Claude API analyzes and returns verification result
```

**Cost**: ~$0.001 per verification (Claude Haiku 4.5)

### Level 3: Cross-Referencing (60s target)

```typescript
// Check 211 database (TODO: implement API)
const check211 = await search211Database(name, address)

// Check Google Maps (TODO: implement Places API)
const checkMaps = await searchGoogleMaps(name, address)

// Detect conflicts
if (check211.data.phone !== submitted.phone) {
  conflicts.push({
    field: 'phone',
    submitted: submitted.phone,
    found: check211.data.phone,
    source: '211 Database',
    confidence: 0.9,
  })
}
```

## Decision Criteria

### Auto-Approve (87% of cases)

- Overall score >= 0.85
- At least 2 cross-references found
- No high-confidence conflicts
- URL reachable
- Phone valid
- Address geocodable

### Flag for Human (8% of cases)

- Overall score 0.5-0.85
- OR high-confidence conflicts detected
- OR missing critical fields (phone/address)
- OR insufficient cross-references (<2)

### Auto-Reject (5% of cases)

- URL not reachable (both direct AND redundant checks fail)
- Overall score < 0.5
- Critical data quality issues

## Monitoring & Alerts

### Metrics to Track

- **Verification rate**: Resources verified per week
- **Flag rate**: % of resources flagged for human review
- **URL failure rate**: % of URLs failing verification
- **Re-verification backlog**: Resources overdue for verification
- **IP block rate**: % of verifications detecting IP blocking
- **IP block trends**: Week-over-week change in IP blocks

### Alerts

Set up alerts for:

- URL failure rate > 15% (investigate external service issues)
- Backlog > 100 resources (need to run verification more frequently)
- Cost > $50/month (AI verification costs excessive)
- **IP blocks detected** (run `npm run verify:check-ip-blocks` weekly)
- **IP block rate increase > 20%** week-over-week (infrastructure issue)

## Cost Analysis

### Per Verification Costs

- Level 1 (Automated): **$0** (free API calls)
- Level 2 (AI): **~$0.001** (Claude Haiku 4.5)
- Level 3 (Cross-ref): **$0** (211 free, Google Maps TODO)

**Total**: ~$0.001 per full verification

### Monthly Estimates

- 200 resources × 1 periodic verification/month = **$0.20/month**
- 50 new submissions/month × 1 initial verification = **$0.05/month**

**Total**: **~$0.25/month** for verification

## Future Enhancements

1. **Phone Verification**
   - Integrate Twilio Lookup API
   - Verify phone numbers are active
   - Detect disconnected numbers

2. **Email Verification**
   - SMTP validation
   - Bounce detection
   - Catch-all detection

3. **Google Maps Integration**
   - Places API for verification
   - Photo extraction
   - Rating/review analysis

4. **211 API Integration**
   - Automated cross-referencing
   - Conflict detection
   - Data enrichment

5. **Machine Learning**
   - Train model on human review decisions
   - Improve auto-approval threshold
   - Detect patterns in data quality issues

6. **Real-time Monitoring**
   - Dashboard for verification metrics
   - Alerts for unusual patterns
   - Cost tracking and optimization

## Related Documentation

- [Autonomous Verification System](./AUTONOMOUS_VERIFICATION_SYSTEM.md)
- [Technical Architecture](../TECHNICAL_ARCHITECTURE.md)
- [Database Schema](../DATABASE.md)
- [API Documentation](./API_DOCUMENTATION.md)

## Cron Setup (Production)

```bash
# Edit crontab
crontab -e

# Add weekly verification (Sundays at 2am)
0 2 * * 0 cd /app && npm run verify:periodic >> /var/log/verification.log 2>&1

# Add daily screenshot capture (Mondays at 3am)
0 3 * * 1 cd /app && npm run screenshot:bulk >> /var/log/screenshots.log 2>&1
```

## Testing

```bash
# Test periodic verification (dry run)
npm run verify:periodic:dry-run

# Test with small batch
node scripts/periodic-verification.mjs --limit=5

# Check verification logs
SELECT * FROM verification_logs ORDER BY created_at DESC LIMIT 10;

# Check flagged resources
SELECT id, name, verification_status, human_review_required
FROM resources
WHERE human_review_required = true;

# Check for IP blocking issues
npm run verify:check-ip-blocks

# Analyze IP blocks over different time ranges
node scripts/check-ip-blocks.mjs --days=7   # Last week
node scripts/check-ip-blocks.mjs --days=30  # Last month

# Query IP blocks in database
SELECT
  r.name,
  r.website,
  vl.created_at,
  vl.checks_performed->'ip_block_details' as block_details
FROM verification_logs vl
JOIN resources r ON r.id = vl.resource_id
WHERE vl.checks_performed->>'ip_block_detected' = 'true'
ORDER BY vl.created_at DESC;
```
