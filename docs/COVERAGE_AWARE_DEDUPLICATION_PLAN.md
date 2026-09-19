# Coverage-Aware Deduplication Plan

**Status**: Proposed on 2026-07-02 for `B045`

## Summary

The current import system still assumes that same-name resources should collapse into a parent-child organization model. That assumption is wrong for non-physical service-area resources.

The correct fix is to keep one `resources` row per user-visible coverage record, treat `org_name` as the canonical organization identity, and make duplicate detection coverage-aware for non-physical resources.

This delivers the long-term behavior we want without introducing a brand-new `organizations` table that the rest of the app does not yet use.

## Problem

### Current failure mode

When the admin import pipeline receives multiple non-physical resources with the same organization name but different coverage areas, it:

1. groups them as a multi-location organization
2. auto-creates a synthetic parent row
3. inserts children under that parent
4. pushes operators toward suffixed names like `Reconnect 180 - Reno Service Area`

That behavior is wrong for Reentry Map because the public resource unit is the coverage record itself, not an invisible parent org shell.

### Example

These should both be valid live resources:

- `Reconnect 180` serving Reno
- `Reconnect 180` serving Las Vegas

They are the same organization, but they are not duplicates. They are separate service-area records.

## Goals

- Allow same-name non-physical siblings when their coverage differs.
- Stop auto-creating bogus parent rows during imports.
- Use one shared dedupe model across import and trusted-intake flows.
- Preserve the existing `resources` table as the user-visible storage model.
- Normalize organization identity with existing `org_name` instead of display-name hacks.

## Non-Goals

- No new `organizations` table in this change.
- No public UI for organization-level grouping in this change.
- No attempt to retrofit every historical resource in the database in one sweep.

## Existing Constraints

The current schema already gives us most of what we need:

- `name`: public display name
- `org_name`: canonical organization identity
- `address_type`: physical vs non-physical semantics
- `service_area`: structured coverage metadata
- `parent_resource_id`, `location_name`, `is_parent`: legacy organization-grouping fields

The problem is not missing storage. The problem is that the import and dedupe logic still behaves as if auto-generated parent rows are desirable.

## Proposed Model

### Display model

Each live `resources` row remains a public resource record.

- `name` stays the user-visible label
- `org_name` stores canonical organization identity
- `service_area` stores actual coverage
- `city` / `state` store the approximate anchor locality used for search and mapping

For service-area siblings, the records should usually have:

- the same `name`
- the same `org_name`
- different `city` / `state` anchors and-or different `service_area`

### Duplicate identity rules

#### Physical resources

Keep the current behavior:

- exact-address duplicates are duplicates
- fuzzy same-name-at-same-address can update or merge

#### Non-physical resources

A non-physical resource is a duplicate only when all of these match:

- canonical organization identity
- `address_type`
- anchor `city`
- anchor `state`
- normalized `service_area`

If the organization matches but the coverage differs, the new row is a valid sibling, not a duplicate.

## Canonical Organization Identity

For this phase, canonical organization identity is:

- `org_name` when provided
- otherwise trimmed `name`

This deliberately avoids an aggressive name-rewriting system. We do not need to guess hidden parents to solve `B045`; we need consistent identity plus coverage-aware comparison.

## Normalized Coverage Key

For non-physical dedupe, build a normalized coverage key from:

- canonical organization identity
- normalized `address_type`
- normalized `city`
- normalized `state`
- normalized `service_area.type`
- normalized `service_area.values`

Normalization rules:

- lowercase and trim strings
- sort `service_area.values`
- coerce legacy `{ name: "X", type: "county" }` payloads into `{ type, values: [name] }`

This means these are duplicates:

- `Reconnect 180` + `regional` + `Reno` + `NV` + `city:[Reno]`
- same exact record again

And these are not duplicates:

- `Reconnect 180` + `regional` + `Reno` + `NV` + `city:[Reno]`
- `Reconnect 180` + `regional` + `Las Vegas` + `NV` + `city:[Las Vegas]`

## Route-Level Changes

### 1. `app/api/admin/resources/import/route.ts`

- Remove `detectParentChildRelationships()` from the import path.
- Remove auto-parent creation and auto-child insertion.
- Use shared dedupe logic for both physical and non-physical rows.
- Insert valid same-name coverage siblings as standalone live resources.
- Set `orgName` on inserted rows to the canonical organization identity.

### 2. `app/api/research/submit-candidate/route.ts`

- Stop using its custom non-physical `name + city + state + address_type` duplicate check.
- Use the shared dedupe helper instead so `service_area` participates.

### 3. `app/api/resources/check-duplicate/route.ts`

- Accept `address_type` and optional `service_area`.
- Use the shared dedupe helper so external or internal tools get the same answer as imports.

### 4. Suggestion intake

Where suggestion routes suppress duplicates against live resources or pending suggestions, compare non-physical resources with the same coverage-aware signature instead of raw `name + city + state + address_type`.

This is not the root cause of the Reconnect 180 import bug, but it is part of applying the fix systematically.

## What Happens to Parent Rows

For this fix:

- no new synthetic parent rows are created
- `is_parent=true` rows created by this buggy behavior are treated as legacy data, not an active pattern

We keep the columns for backward compatibility, but we stop creating new records that rely on them.

## Data Migration

### Immediate cleanup

After the code fix ships:

- rename workaround rows like `Reconnect 180 - Reno Service Area` back to `Reconnect 180`
- keep them distinct via coverage metadata, not title suffixes

### Optional follow-up cleanup

Later, run a one-time audit for any legacy `auto_created_parent` rows and decide whether to:

- delete empty synthetic parents
- normalize their child rows into standalone coverage records

That audit is separate from this bugfix because it may require human judgment for older imported organizations.

## Review Notes

### Why not a new `organizations` table now?

Because the app currently renders and routes directly from `resources`. A new organization layer would add storage and UI complexity without solving the immediate bug better than the existing schema can.

### Why keep `org_name`?

Because it gives us a stable organization identity without forcing duplicate display names to carry the coverage distinction.

### Why include both anchor locality and `service_area` in the dedupe key?

Because the anchor locality affects search and map behavior, while `service_area` expresses true coverage. We need both to avoid false duplicates and false splits.

### Why remove auto-parent creation entirely?

Because the synthetic parent is not a real resource users can act on. It pollutes the database and breaks imports without adding user value.

## Implementation Plan

1. Add shared canonical-identity and non-physical coverage-key helpers.
2. Update dedupe utilities to branch by `address_type`.
3. Remove parent-child auto-creation from admin import.
4. Move trusted research intake onto the shared dedupe helper.
5. Update duplicate-check tooling to use the same logic.
6. Add regression tests for same-name non-physical siblings.
7. Clean up the existing `Reconnect 180` workaround rows after deploy.

## Test Plan

- Unit: shared dedupe helper treats same-name different-coverage non-physical resources as siblings, not duplicates.
- API: admin import can create two same-name regional resources with different cities/service areas and does not create a parent row.
- API: trusted research intake still blocks true duplicates but allows same-name different-coverage siblings.
- Verification: import preview and live import paths report correct created/skipped counts.
- Live data: rename the current Reconnect 180 workaround rows back to canonical names and verify both live URLs.

## Success Criteria

- Importing same-name non-physical siblings no longer requires display-name suffixes.
- No synthetic parent resource is created.
- Duplicate checks agree across admin import, trusted intake, and duplicate-check tooling.
- Existing Reconnect 180 Nevada rows can be normalized back to the canonical organization name.
