# Changelog

## 2026-04-09

- Added a trusted research intake flow for internal agents. The new `/admin/research-intake` page and `/api/research/submit-candidate` route publish trusted submissions directly to live resources with `verification_status=pending`, while still preserving async verification afterward.
- Updated the research target response and command-center prompts so trusted agents work one resource at a time against live task context instead of the old approval-first suggestion flow.
- Seeded Lubbock, Texas with an initial official-source resource set covering all 13 major categories, then added a second enrichment wave to deepen employment, food, clothing, transportation, and education coverage.
