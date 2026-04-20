# Changelog

## 2026-04-14

- Fixed batch enrichment queue burn-down. The worker now records per-resource enrichment attempts in `provenance.enrichment`, prioritizes never-attempted resources first, and applies a 30-day retry cooldown so repeated runs stop hammering the same no-write resources.
- Added a `stats status` admin CLI view for quick operational checks. It reports verified, pending, stale, due-for-verification, AI-enriched, needs-enrichment, remaining 500-resource enrichment batches, missing email/hours, missing website, and ungeocoded counts in one command.
- Fixed the `/resources` category filter route. Selecting a single category from the sidebar on `/resources` now stays on `/resources?categories=...` instead of navigating to the nonexistent `/resources/category/...` path that produced a 404.
- Fixed `/resources` distance-aware filtering. The server query now honors `lat`, `lng`, and `distance` URL params and defaults to nearest-first sorting when a location filter is present, so the list view matches the distance-filtered map instead of falling back to alphabetical results.

## 2026-04-13

- Made batch enrichment outcome reporting explicit. Batch summaries and `ai_agent_logs.output` now break no-write results into `already_current`, `unreachable`, and `no_data` instead of folding them under the misleading `skipped` label.
- Fixed the batch enrichment Mac fallback to use the known Patchright install under `~/.claude/scripts/social/node_modules/patchright` instead of a bare `require('patchright')`, restoring the residential-IP reachability tier for future batches.
- Added a durable unreachable-site recheck workflow. The admin CLI can now rerun `UNREACHABLE` batch-log entries through the Mac residential-IP path and write internal CSV/TXT reports without dumping raw artifacts into chat by default.

## 2026-04-10

- Fixed the admin AI discovery and enrichment routes to log against the actual `ai_agent_logs` schema. The agents no longer reference nonexistent `status` and `resources_*` columns, restoring live route execution and making agent retesting possible again.

## 2026-04-09

- Added a trusted research intake flow for internal agents. The new `/admin/research-intake` page and `/api/research/submit-candidate` route publish trusted submissions directly to live resources with `verification_status=pending`, while still preserving async verification afterward.
- Updated the research target response and command-center prompts so trusted agents work one resource at a time against live task context instead of the old approval-first suggestion flow.
- Seeded Lubbock, Texas with an initial official-source resource set covering all 13 major categories, then added a second enrichment wave to deepen employment, food, clothing, transportation, and education coverage.
