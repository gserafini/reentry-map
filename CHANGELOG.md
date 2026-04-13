# Changelog

## 2026-04-13

- Made batch enrichment outcome reporting explicit. Batch summaries and `ai_agent_logs.output` now break no-write results into `already_current`, `unreachable`, and `no_data` instead of folding them under the misleading `skipped` label.
- Fixed the batch enrichment Mac fallback to use the known Patchright install under `~/.claude/scripts/social/node_modules/patchright` instead of a bare `require('patchright')`, restoring the residential-IP reachability tier for future batches.

## 2026-04-10

- Fixed the admin AI discovery and enrichment routes to log against the actual `ai_agent_logs` schema. The agents no longer reference nonexistent `status` and `resources_*` columns, restoring live route execution and making agent retesting possible again.

## 2026-04-09

- Added a trusted research intake flow for internal agents. The new `/admin/research-intake` page and `/api/research/submit-candidate` route publish trusted submissions directly to live resources with `verification_status=pending`, while still preserving async verification afterward.
- Updated the research target response and command-center prompts so trusted agents work one resource at a time against live task context instead of the old approval-first suggestion flow.
- Seeded Lubbock, Texas with an initial official-source resource set covering all 13 major categories, then added a second enrichment wave to deepen employment, food, clothing, transportation, and education coverage.
