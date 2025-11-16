# Bulk Import Infrastructure Report

**Date:** 2025-11-15
**Purpose:** Comprehensive documentation of all existing bulk import methods, utilities, and infrastructure in reentry-map
**Scope:** Complete audit of data entry points, processing pipelines, verification systems, and batch utilities

---

## Executive Summary

The reentry-map application has a **comprehensive, multi-layered bulk import infrastructure** that supports:

- **Direct admin imports** via API (`/api/admin/resources/import`)
- **File-based batch imports** from `data-imports/` directory
- **Public batch API** for AI agents (`/api/resources/suggest-batch`)
- **Autonomous verification pipeline** with multi-level checks
- **Intelligent deduplication** with fuzzy matching and parent-child detection
- **Batch utility scripts** for screenshots, geocoding, and re-verification
- **Comprehensive verification queue** system with human review capabilities
- **Provenance tracking** for all imports with detailed audit trails

---

## Part 1: Data Entry Points & Bulk APIs

### 1.1 Direct Resource Import API

**Location:** `/app/api/admin/resources/import/route.ts`

**Method:** `POST /api/admin/resources/import`

**Purpose:** Direct bulk import of resources with intelligent deduplication and parent-child detection

**Authentication:**

- Requires admin user or special `x-testing-bypass` header in development
- Checks `is_admin` flag on user profile

**Data Format (JSON):**

```json
{
  "resources": [
    {
      "name": "String (required)",
      "address": "String (required)",
      "city": "String",
      "state": "String",
      "zip": "String",
      "latitude": "Number (optional)",
      "longitude": "Number (optional)",
      "phone": "String",
      "email": "String",
      "website": "String",
      "description": "String",
      "primary_category": "String",
      "categories": ["Array of strings"],
      "tags": ["Array of strings"],
      "services_offered": ["Array or comma-separated"],
      "hours": "Object or String",
      "eligibility_requirements": "String",
      "required_documents": ["Array"],
      "fees": "String",
      "languages": ["Array"],
      "accessibility_features": ["Array"],
      "status": "String (default: 'active')",
      "verified": "Boolean",
      "ai_enriched": "Boolean",
      "completeness_score": "Number",
      "verification_score": "Number",
      "source": "String (for provenance)",
      "org_name": "String (for multi-location orgs)"
    }
  ]
}
```

**Processing Pipeline:**

1. **Authentication & Validation**
   - Checks user is authenticated (unless testing bypass)
   - Validates admin status
   - Validates resources is non-empty array

2. **Provenance Tracking**
   - Extracts source information (discoverer, method, date, URL)
   - Creates initial `change_log` entry with provenance metadata
   - Records who submitted and how

3. **Deduplication**
   - Runs `checkForDuplicate()` for each resource
   - Strategies:
     - Exact address match (most reliable) - case-insensitive
     - Fuzzy name matching (0.8+ similarity threshold)
     - Returns: skip, update, or create decision

4. **Parent-Child Detection**
   - Auto-detects multi-location organizations
   - Groups resources by normalized organization name
   - Creates parent resource if not exists
   - Creates child resources with parent_resource_id reference

5. **Resource Creation**
   - Standard: Inserts as standalone resource
   - Multi-location: Creates parent, then child locations
   - Updates: Modifies existing similar resources

**Return Data:**

```json
{
  "success": true,
  "stats": {
    "total": 100,
    "created": 85,
    "updated": 10,
    "skipped": 5,
    "errors": 0
  }
}
```

---

### 1.2 File-Based Batch Import API

**Location:** `/app/api/admin/import-files/route.ts`

**Methods:**

- `GET /api/admin/import-files` - List pending import files
- `POST /api/admin/import-files` - Process all files

**Purpose:** Scan `data-imports/` directory for JSON files and process as suggestions

**File Directory:** `./data-imports/`

**Processing:**

1. File discovery from `data-imports/` directory
2. JSON validation
3. Posts to `/api/resources/suggest-batch`
4. File archiving to `data-imports/archived/` with timestamp
5. Result aggregation

**Result Stats:** submitted, auto_approved, flagged, rejected, skipped_duplicates

---

### 1.3 Public Batch Suggestion API (for AI Agents)

**Location:** `/app/api/resources/suggest-batch/route.ts`

**Method:** `POST /api/resources/suggest-batch`

**Purpose:** Public API for AI agents to submit resource suggestions in bulk with autonomous verification

**Authentication:** None required (public API)

**Key Constraints:**

- Maximum 100 resources per batch
- Required fields: name, address, city, state

**Processing Pipeline:**

1. **Duplicate Prevention** - Checks against existing resources and pending suggestions
2. **Suggestion Creation** - Creates resource_suggestions entry with full data
3. **Autonomous Verification** - Multi-level checks if enabled:
   - Level 1 (10s): URL, phone, address checks
   - Level 2 (30s): AI content verification
   - Level 3 (60s): Cross-referencing with 211 DB, Google Maps
4. **Decision Actions**
   - Auto-approve (87%): Creates resource immediately
   - Flag for human (8%): Keeps as pending
   - Auto-reject (5%): Marks as rejected

**Return Data Includes:**

- Per-resource verification results
- Decision reasoning and scores
- Next steps and admin instructions

---

### 1.4 Fast Duplicate Check Endpoint

**Location:** `/app/api/resources/check-duplicate/route.ts`

**Method:** `GET /api/resources/check-duplicate?name=...&address=...&city=...&state=...`

**Purpose:** Quick duplicate lookup (public, no auth)

**Returns:** isDuplicate flag, match count, and matching resources

---

## Part 2: Verification & Quality Assurance

### 2.1 Verification Agent

**Location:** `/lib/ai-agents/verification-agent.ts`

**Verification Levels:**

- **Level 1 (10s):** URL reachability, phone validation, address geocoding
- **Level 2 (30s):** Website content matching, service validation
- **Level 3 (60s):** 211 database, Google Maps, conflict detection

**Features:**

- Redundant URL checking (direct + is-it-up.org service)
- Auto-fix broken URLs using AI
- Conflict detection
- Cost tracking

**Decision Thresholds:**

- Auto-approve: score >= 0.85 & no critical failures
- Auto-reject: score < 0.50 OR critical failures
- Flag for human: score 0.50-0.85 OR conflicts

---

### 2.2 Verification Queue System

**Location:** `/app/api/admin/verification-queue/route.ts`

**Purpose:** Get pending resources requiring human review

**Returns:** Queue of flagged suggestions with:

- Verification logs and scores
- Checks needed
- Admin notes
- Instructions for reviewers

---

### 2.3 Manual Verification Processing

**Location:** `/app/api/admin/verification/process-queue/route.ts`

**Method:** `POST /api/admin/verification/process-queue`

**Purpose:** Batch process pending suggestions through verification agent

**Features:**

- Batch processing (1-50 at a time)
- Real-time event emissions
- AI cost tracking
- Automated decision making

---

## Part 3: Deduplication System

### 3.1 Deduplication Utilities

**Location:** `/lib/utils/deduplication.ts`

**Key Functions:**

#### `checkForDuplicate(resource)`

- Exact address match detection
- Fuzzy name matching via PostgreSQL pg_trgm
- Returns: isDuplicate, similarity score, suggested action

#### `batchCheckForDuplicates(resources)`

- Parallel processing of multiple resources
- Returns: Map of index → deduplication result

#### `detectParentChildRelationships(resources)`

- Extracts organization names
- Groups by normalized org name
- Returns: Map of org_name → [locations]
- Patterns: Removes "- Oakland Office", "(SF Location)", etc.

---

## Part 4: File-Based Import Script

**Location:** `/scripts/import-resource-files.mjs`

**Usage:**

```bash
npm run import:resources
# or
node scripts/import-resource-files.mjs
```

**Functionality:**

1. Scans `data-imports/` directory
2. Parses JSON files
3. POSTs to `/api/resources/suggest-batch`
4. Archives files with timestamp
5. Reports summary

---

## Part 5: Batch Processing Utilities

### 5.1 Bulk Screenshot Capture

**Location:** `/scripts/bulk-capture-screenshots.mjs`

**Usage:**

```bash
node scripts/bulk-capture-screenshots.mjs        # Skip existing
node scripts/bulk-capture-screenshots.mjs --force # Recapture all
```

### 5.2 Re-Geocode All Resources

**Location:** `/scripts/re-geocode-all-resources.mjs`

**Updates:** County, state, city, zip, neighborhood, place_id, location_type, formatted_address, county_fips

### 5.3 Force Re-Verification

**Location:** `/scripts/force-reverify-all.mjs`

**Purpose:** Trigger immediate re-verification for all active resources with websites

---

## Part 6: Database Schema for Imports

### 6.1 Resource Suggestions Table

**Purpose:** Temporary storage for submitted resources awaiting approval

**Key Fields:**

- Basic info: name, address, city, state, zip, phone, email, website
- Location: latitude, longitude
- Services: hours, services_offered, eligibility_requirements, etc.
- Organization: org_name, location_name (for multi-location)
- Provenance: source, source_url, discovered_via, discovery_notes
- Review: status (pending/approved/rejected), admin_notes, reviewed_by

### 6.2 Verification Logs Table

**Purpose:** Track all verification attempts with full audit trail

**Key Fields:**

- suggestion_id, resource_id
- verification_type (initial/periodic/triggered)
- overall_score, checks_performed, conflicts_found
- decision, decision_reason
- input_tokens, output_tokens, estimated_cost_usd

### 6.3 Verification Events Table (Real-Time)

**Purpose:** Real-time event stream for verification progress

**Event Types:** started, progress, cost, completed, failed

### 6.4 AI Usage Tracking

**Purpose:** Cost and token tracking for all AI operations

**Tracked:** operation_type, model_used, input_tokens, output_tokens, estimated_cost_usd, metadata

---

## Part 7: Data Formats & Validation

### Standard JSON Import Format

```json
{
  "resources": [
    {
      "name": "Oakland Food Bank",
      "address": "123 Main St",
      "city": "Oakland",
      "state": "CA",
      "zip": "94612",
      "latitude": 37.8044,
      "longitude": -122.2712,
      "phone": "(510) 555-1234",
      "email": "info@example.org",
      "website": "https://www.example.org",
      "description": "Community food bank",
      "primary_category": "food",
      "categories": ["food", "general_support"],
      "hours": { "monday": "9am-5pm", ... }
    }
  ],
  "submitter": "discovery_agent",
  "notes": "Imported from 211"
}
```

### Required Fields

- name, address, city, state

### Field Aliases

- services_offered / services
- eligibility_requirements / eligibility_criteria
- accessibility_features / accessibility
- zip / zip_code

---

## Part 8: Current Workflows

### Typical Import Workflow

1. **Source Data** - Export from 211, scrape websites, or compile from sheets
2. **Prepare File** - Format as JSON, add metadata
3. **Upload File** - Place in `data-imports/` directory
4. **Auto-Processing** - Batch API processes, verification runs
5. **Auto-Approval** - 87% auto-approved, 8% flagged, 5% rejected
6. **Human Review** - Admins review flagged resources

### Deduplication Strategy

- **Before Importing:** Run duplicate check on sample data
- **During Import:** System auto-detects and handles duplicates
- **After Import:** Review summary, verify parent-child relationships

### Data Quality Tips

**For High Auto-Approval (85%+):**

- Include complete contact info
- Provide detailed description
- Include structured hours
- Categorize accurately
- Include eligibility requirements
- Provide accurate addresses

---

## Part 9: Rate Limiting & Performance

### Current Limits

| Endpoint                       | Limit                 | Notes                    |
| ------------------------------ | --------------------- | ------------------------ |
| `/api/resources/suggest-batch` | 100 resources/request | Enforced                 |
| `/api/admin/resources/import`  | No hard limit         | Suggest 50-100           |
| `/api/admin/import-files`      | Processes all files   | Each: 100-resource limit |
| Screenshot capture             | 1 resource at a time  | Real-time feedback       |

### Recommended Batch Sizes

- Small test: 1-10 resources
- Regular import: 20-50 resources
- Large bulk: 75-100 resources (max)

### Cost Considerations

**AI Verification Costs:**

- Level 1: < $0.001
- Level 2: $0.01-0.03
- Level 3: $0.01-0.05
- Typical total: $0.02-0.05 per resource

---

## Part 10: Error Handling & Recovery

### Common Errors & Solutions

| Error                                       | Cause                | Solution                       |
| ------------------------------------------- | -------------------- | ------------------------------ |
| "Invalid format: missing 'resources' array" | JSON structure wrong | Ensure top-level resources key |
| "Maximum 100 resources per batch"           | Too many resources   | Split into multiple files      |
| "Missing required fields"                   | Incomplete data      | Add name, address, city, state |
| "URL unreachable"                           | Website down/blocked | Verify URL is correct          |
| "Phone invalid"                             | Bad format           | Use standard format            |

### Rollback Procedures

1. Check archived files
2. Check suggestion status in database
3. Check created resources
4. Manual fixes: Delete bad suggestions or mark resources inactive

---

## Part 11: Integration with Discovery & Enrichment Agents

### AI Agent Workflow

**Discovery Agent:**

1. Searches sources (211 directories, Google, etc.)
2. Extracts resource details
3. POSTs to `/api/resources/suggest-batch`

**Enrichment Agent:**

1. Finds resources missing data
2. Fills in missing fields
3. Updates via suggestion API

**Verification Agent:**

1. Verifies submitted resources
2. Auto-approves high-confidence
3. Flags conflicts for human review

---

## Part 12: Summary & Quick Reference

### When to Use Each Method

| Method                           | Use Case            | Batch Size     | Real-Time? |
| -------------------------------- | ------------------- | -------------- | ---------- |
| `/api/admin/resources/import`    | Admin direct upload | Any            | No         |
| `/api/admin/import-files`        | File-based batch    | Multiple files | No         |
| `/api/resources/suggest-batch`   | AI agents + public  | 1-100          | No         |
| `/api/resources/check-duplicate` | Duplicate detection | 1 per call     | Yes        |
| Scripts (CLI)                    | Bulk operations     | See script     | Varies     |

### Data Entry Points Summary

```
┌─────────────────────────────────────────────────────┐
│           BULK IMPORT METHODS                       │
├─────────────────────────────────────────────────────┤
│ 1. Direct Admin API                                 │
│    POST /api/admin/resources/import                 │
│                                                      │
│ 2. File-Based Batch                                 │
│    POST /api/admin/import-files                     │
│    Scans: ./data-imports/*.json                     │
│                                                      │
│ 3. Public Batch API (for AI agents)                 │
│    POST /api/resources/suggest-batch                │
│                                                      │
│ 4. Individual Suggestions                           │
│    User-submitted via /suggest-resource             │
│                                                      │
│ 5. CLI Scripts                                      │
│    scripts/import-resource-files.mjs                │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│         VERIFICATION & QUALITY ASSURANCE            │
├─────────────────────────────────────────────────────┤
│ • Deduplication                                      │
│ • Autonomous Verification (L1-L3)                   │
│ • Decision Logic (auto-approve/flag/reject)         │
│ • Human Review Queue                                │
│ • Audit Trail & Provenance                          │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│            ACTIVE RESOURCES                         │
│    Published to /resources directory                │
└─────────────────────────────────────────────────────┘
```

---

## Related Documentation

- **AGENT_WORKFLOWS.md** - AI agent API workflows
- **CONTENT_DISCOVERY_STRATEGY.md** - Discovery sources and strategies
- **DATA_QUALITY_PIPELINE.md** - Verification and quality system
- **DEDUPLICATION_SYSTEM.md** - Deduplication algorithm details
- **RESOURCE_SUBMISSION_SCHEMA.md** - Field definitions and types
- **AUTONOMOUS_VERIFICATION_SYSTEM.md** - Verification agent details

---

## Conclusion

The reentry-map application has a **comprehensive, production-ready bulk import infrastructure** that:

1. Supports multiple entry points (Admin API, file-based, public API)
2. Implements intelligent deduplication (exact + fuzzy matching)
3. Includes autonomous verification (multi-level checks)
4. Tracks full provenance (complete audit trail)
5. Provides human oversight (verification queue)
6. Enables batch operations (screenshots, geocoding, re-verification)
7. Monitors costs (complete AI usage tracking)
8. Maintains data quality (87% auto-approval rate)

This infrastructure is ready for scaling to hundreds of thousands of resources while maintaining data quality and operational cost efficiency.
