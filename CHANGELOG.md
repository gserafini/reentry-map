# Changelog

## 2026-06-11

- Statewide and other non-physical detail pages now describe service area explicitly in the header (for example `Statewide resource` / `Serves all of Texas`) and no longer show a misleading `Get Directions` button for approximate anchor locations.
- Approximate resource maps no longer use an exact-address pin treatment. Non-physical city-anchored resources now render with an approximate-area cue and explicit "not a street address" labeling on the detail-page map.
- City-anchored non-physical resource detail maps now open at a broader city-level zoom instead of an address-level zoom, so approximate centroids do not visually imply an exact street location.
- Regional and other non-physical resources with a real city/state anchor now geocode to an approximate city centroid during admin intake/approval instead of keeping `null` coordinates. This lets city-level service-area resources behave like map/search results without pretending to have a street address.
- Fixed a client-side Google Maps crash on resource detail pages for coordinate-less resources (for example regional/service-area listings like Blessed Abode Homes). Those pages now show an informational fallback instead of trying to place a `null` map pin.
- Added Blessed Abode Homes as a Lubbock-area Texas housing resource for returning community members, using a regional city-level entry because the public site exposes only a city-level office location rather than a safe street address for the homes.

## 2026-06-10

- Deepened the remaining lighter-coverage CEO partner cities: Sacramento (30 to 71), Buffalo (34 to 63), Cleveland (33 to 62), San Jose (25 to 62), Fresno (24 to 56), and New York City (32 to 44). All real Google Places-sourced.
- Fixed city/place browse maps to frame the place being viewed instead of the visitor's saved location. Previously a visitor with a cached location elsewhere (e.g. viewing /ca/san-diego from the Bay Area) saw the map centered on themselves rather than the city. City, category-in-city, and tag-in-city pages now always fit the map to their resources, while search-near-me pages still center on the visitor. Added a unit-tested `fitToResources` framing rule.
- Stopped resource cards and map popups from ever displaying "NaN miles away" — distance is now hidden when it can't be computed from finite coordinates. (Root cause, `useLocation` persisting an empty coordinates object, logged as B043 for a follow-up.)
- Filled coverage for CEO (Center for Employment Opportunities) partner cities that had zero or near-zero resources: Cincinnati OH (0 to 43), Tulsa OK (0 to 38), Rochester NY (0 to 39), Pontiac MI (0 to 30), San Rafael CA (0 to 27), Fairfield CA (0 to 29), Albany NY (1 to 37), and Harrisburg PA (12 to 41) — all real Google Places-sourced across all 13 service categories. With these, every one of CEO's 31 partner-city offices now has resource coverage on the map.
- Renamed the resource "Verified" badge to "AI Verified" and made it tappable: tapping it opens a plain-language popover explaining that the resource was checked automatically against the organization's website and public listings, and that AI verification complements but does not replace human review. Mobile-first (a tap-to-open popover rather than a hover tooltip).
- Fixed the component test suite, which was failing on the production server with "React.act is not a function" — the ambient `NODE_ENV=production` was leaking into Vitest and loading React's production build. Vitest now forces `NODE_ENV=test`, unblocking all component tests.
- Added `scripts/enrich-drain.sh`, which runs AI-enrichment in back-to-back chunks until the never-enriched backlog is cleared (one run at a time; defers to the cron), for faster catch-up after large resource imports.

## 2026-06-09

- Completed the per-state breadth pass with the final three states: New York City for New York (47 to 73 — NYC had only 13 resources vs Buffalo's 34), Madison for Wisconsin (48 to 81), and Raleigh for North Carolina (49 to 83). With this, every U.S. state and DC now has 50+ active resources and all 13 service categories covered — no state remains on the thin-coverage list. Net effect of tonight's campaign: ~30 states expanded, directory grew from ~4,290 to ~5,300 active resources, all sourced from verified Google Places listings.
- Added a sixth round of second-city breadth expansions: Gulfport for Mississippi (36 to 67), Nashua for New Hampshire (36 to 59), Bismarck for North Dakota (36 to 67), Lexington for Kentucky (43 to 73), and Reno for Nevada (46 to 73).
- Added a fifth round of second-city breadth expansions: Idaho Falls for Idaho (35 to 62), Rutland for Vermont (35 to 63), Dover for Delaware (35 to 60), Bangor for Maine (35 to 64), and Casper for Wyoming (35 to 66).
- Added a fourth round of second-city breadth expansions: Hilo for Hawaii (34 to 65), Lincoln for Nebraska (34 to 67), Cedar Rapids for Iowa (35 to 63), Rapid City for South Dakota (35 to 62), and Missoula for Montana (35 to 65).
- Added a third round of second-city breadth expansions for single-metro states: Huntington for West Virginia (33 to 57), Fairbanks for Alaska (33 to 65), Topeka for Kansas (34 to 62), Fayetteville for Arkansas (34 to 64), and Camden for New Jersey (34 to 65). All real Google Places-sourced across all 13 categories.
- Continued evening out per-state coverage with real Google Places-sourced second-city expansions for states whose resources were concentrated in a single metro: Washington DC (31 to 56), Montgomery added for Alabama (state 32 to 61), Norfolk for Virginia (33 to 60), Santa Fe for New Mexico (33 to 63), Warwick for Rhode Island (33 to 57), and Ogden for Utah (34 to 62). Each new city covers all 13 service categories; every record is a verified Google Places listing.
- Expanded Connecticut from 29 to 133 active resources. CT was the thinnest state in the directory with nearly every record concentrated in Hartford. Added real reentry resources across New Haven, Bridgeport, Stamford, and Waterbury — CT's other major cities, all previously at zero coverage — giving the state full coverage of all 13 service categories. Every record is sourced from a verified Google Places listing (real name, address, phone, website; no fabricated data), via a new reusable `places-scan` pipeline (gplaces search → details → phone-dedup → import).
- Hardened AI enrichment against hallucination: added a source-grounding guard so the local LLM can only write an email or hours value that literally appears in the fetched website text. Previously it could fill in plausible-but-wrong `info@<domain>` emails or approximate/invent hours (e.g. wrote a clinic's hours an hour later than reality plus a day that doesn't exist). Added unit tests covering the real failure cases and a re-validation pass to clean values written before the guard.
- Fixed the admin CLI `resource update` so it correctly writes array fields (categories, services_offered, languages) and JSON/number fields, instead of storing them as raw strings; added unit tests and `--help` examples.
- Ran a data-quality sweep: inactivated 60 exact-duplicate active records (e.g. a triple-imported Columbus, OH set and duplicate Berkeley/Oakland/Las Vegas entries), and re-categorized 27 records that were mis-filed as `general-support` but are actually food banks, legal aid, transit agencies, community health centers, public libraries, or vital-records offices.

- Added a major Columbia catch-up batch for South Carolina (its overdue second- and third-wave combined), deepening Columbia from 13 to 32 active resources and clearing every remaining thin category.
- Added a Louisville thin-category enrichment batch for Kentucky, clearing the city's 6 remaining thin lanes (mental-health, legal-aid, transportation, id-documents, education, faith-based) and deepening Louisville from 36 to 43 active resources.
- Added a third-wave Charleston enrichment batch for South Carolina, deepening Charleston from 25 to 37 active resources and clearing every remaining thin category.
- Added a third-wave Wilmington enrichment batch for Delaware, deepening Wilmington from 25 to 32 active resources and clearing every remaining thin category.
- Added a third-wave Manchester enrichment batch for New Hampshire, deepening Manchester from 26 to 37 active resources and clearing every remaining thin category.
- Added a third-wave Boise enrichment batch for Idaho, deepening Boise from 25 to 35 active resources and clearing every remaining thin category.
- Added a third-wave Fargo enrichment batch for North Dakota, deepening Fargo from 25 to 36 active resources and clearing every remaining thin category.
- Added a third-wave Sioux Falls enrichment batch for South Dakota, deepening Sioux Falls from 25 to 35 active resources and clearing every remaining thin category.
- Added a third-wave Cheyenne enrichment batch for Wyoming, deepening Cheyenne from 25 to 35 active resources and clearing every remaining thin category.
- Added a third-wave Billings enrichment batch for Montana, deepening Billings from 25 to 35 active resources and clearing every remaining thin category.
- Added a third-wave Burlington enrichment batch for Vermont, deepening Burlington from 25 to 35 active resources and clearing every remaining thin category.
- Added a third-wave Portland enrichment batch for Maine, deepening Portland from 25 to 35 active resources and clearing every remaining thin category.
- Added a third-wave Charleston enrichment batch for West Virginia, deepening Charleston from 25 to 33 active resources and clearing every remaining thin category.
- Added a third-wave Jackson enrichment batch for Mississippi, deepening Jackson from 25 to 36 active resources and clearing every remaining thin category.
- Added a third-wave Little Rock enrichment batch for Arkansas, deepening Little Rock from 23 to 32 active resources and clearing every remaining thin category.
- Added a third-wave Des Moines enrichment batch for Iowa, deepening Des Moines from 25 to 35 active resources and clearing every remaining thin category.
- Added a third-wave Wichita enrichment batch for Kansas, deepening Wichita from 25 to 35 active resources and clearing every remaining thin category.
- Added a third-wave Omaha enrichment batch for Nebraska, deepening Omaha from 25 to 35 active resources and clearing every remaining thin category.
- Added a third-wave Buffalo enrichment batch for New York, deepening Buffalo from 25 to 34 active resources and clearing every remaining thin category.
- Added a third-wave Newark enrichment batch for New Jersey, deepening the state's seeded metro from 25 to 34 active resources and clearing every remaining thin category.
- Added a third-wave Cleveland enrichment batch for Ohio, deepening Cleveland from 25 to 33 active resources and clearing every remaining thin category.
- Added a third-wave Anchorage enrichment batch for Alaska, deepening the state's seeded metro from 25 to 33 active resources and clearing every remaining thin category.
- Added a third-wave Washington enrichment batch for the District of Columbia, deepening the district from 25 to 31 active resources and clearing every remaining thin category.
- Added a third-wave Providence enrichment batch for Rhode Island, deepening the state's single seeded metro from 25 to 33 active resources and clearing every remaining thin category.
- Added a third-wave Honolulu enrichment batch for Hawaii, deepening the metro from 25 to 35 active resources and clearing every remaining thin category.
- Added a third-wave Salt Lake City enrichment batch for Utah, deepening the metro from 25 to 34 active resources and clearing every remaining thin category.
- Added a third-wave Albuquerque enrichment batch for New Mexico, deepening the metro from 25 to 33 active resources and lifting all thin lanes except the single remaining `legal-aid` and `transportation` entries.
- Added a third-wave Richmond enrichment batch for Virginia, deepening the metro from 24 to 32 active resources and clearing the remaining thin lanes in food, clothing, healthcare, mental-health, legal, transit, identity-document, and faith-based coverage.
- Added a third-wave Birmingham enrichment batch for Alabama, deepening the metro from 24 to 32 active resources and clearing the remaining thin lanes in food, clothing, recovery, legal, transit, identity-document, education, and faith-based coverage.
- Added a third-wave Hartford enrichment batch for Connecticut, deepening the metro from 20 to 28 active resources and lifting all thin service lanes except the single remaining `transportation` and `id-documents` entries.
- Added a second-wave Cheyenne enrichment batch for Wyoming, deepening the state's seeded metro from a thin 13-resource launch city to a broader 25-resource foothold with stronger housing, food, clothing, healthcare, mental-health, recovery, legal, transit, identity-document, education, employment, and faith-based coverage.
- Added a second-wave Burlington enrichment batch for Vermont, deepening the state's seeded metro from a thin 13-resource launch city to a broader 25-resource foothold with stronger housing, food, clothing, healthcare, mental-health, recovery, legal, transit, identity-document, education, employment, and faith-based coverage.
- Added a second-wave Billings enrichment batch for Montana, deepening the state's seeded metro from a thin 13-resource launch city to a broader 25-resource foothold with stronger housing, food, clothing, healthcare, mental-health, recovery, legal, transit, identity-document, education, and employment coverage.
- Added a second-wave Fargo enrichment batch for North Dakota, deepening the state's seeded metro from a thin 13-resource launch city to a broader 25-resource foothold with stronger housing, food, clothing, healthcare, mental-health, recovery, legal, transit, identity-document, education, and employment coverage.
- Added a second-wave Sioux Falls enrichment batch for South Dakota, deepening the state's seeded metro from a thin 13-resource launch city to a broader 25-resource foothold with stronger housing, food, clothing, healthcare, mental-health, recovery, legal, transit, identity-document, education, and aftercare coverage.
- Added a second-wave Charleston enrichment batch for West Virginia, deepening the state's seeded metro from a thin 13-resource launch city to a broader 25-resource foothold with stronger housing, food, healthcare, recovery, legal, transit, identity-document, education, and faith-based coverage.
- Added a second-wave Wilmington enrichment batch for Delaware, deepening the state's seeded metro from a thin 9-resource launch city to a broader 25-resource foothold, closing the remaining `id-documents` and `education` gaps, and fixing a stale city-only Salvation Army record so all Wilmington resources geocode cleanly.
- Added a second-wave Washington enrichment batch for the District of Columbia, deepening the district from a thin 12-resource launch city to a broader 25-resource foothold with stronger food, housing, employment, legal, transit, literacy, and general-support coverage.
- Added a second-wave Newark enrichment batch for New Jersey, deepening the state's seeded metro from a thin 13-resource launch city to a broader 25-resource foothold with stronger food, housing, health, behavioral-health, legal, transit, identity-document, and faith-based coverage.
- Added a second-wave Anchorage enrichment batch for Alaska, deepening the state's seeded metro from a thin 13-resource launch city to a broader 25-resource foothold with stronger food, housing, employment, health, recovery, legal, transit, and identity-document coverage.
- Added a second-wave Portland enrichment batch for Maine, deepening the state's seeded metro from a thin 13-resource launch city to a broader 25-resource foothold with stronger housing, health, recovery, legal, transit, education, and general-support coverage.
- Added a second-wave Manchester enrichment batch for New Hampshire, deepening the state's seeded metro from a thin 13-resource launch city to a broader 26-resource foothold with stronger housing, health, recovery, legal, transit, education, and general-support coverage.
- Added a second-wave Jackson enrichment batch for Mississippi, deepening the state's seeded metro from a thin 13-resource launch city to a broader 25-resource foothold with stronger housing, health, recovery, legal, transit, education, and general-support coverage.
- Added a second-wave Wichita enrichment batch for Kansas, deepening the state's seeded metro from a thin 13-resource launch city to a broader 25-resource foothold with stronger housing, health, recovery, legal, transit, education, and general-support coverage.
- Added a second-wave Charleston enrichment batch for South Carolina, deepening the city's live coverage from a thin 13-resource scaffold to a broader 25-resource metro foothold with stronger housing, health, recovery, legal, education, and general-support coverage.
- Added a second-wave Des Moines enrichment batch for Iowa, deepening the state's seeded metro from a thin 13-resource launch city to a broader 25-resource foothold with stronger housing, health, legal, transit, education, and general-support coverage.
- Added a second-wave Boise enrichment batch for Idaho, closing Boise's last missing category gap and deepening the city from a thin 12-resource first-pass foothold to a broader 25-resource metro set with stronger housing, recovery, legal, transportation, and employment coverage.

## 2026-06-08

- Added a second-wave Albuquerque enrichment batch for New Mexico, deepening the state's seeded metro from a thin 13-resource scaffold to a broader 25-resource foothold with stronger housing, health, recovery, legal, transit, and general-support coverage.
- Added a second-wave Omaha enrichment batch for Nebraska, deepening the state's seeded metro from a thin 13-resource launch city to a broader 25-resource foothold with stronger housing, health, legal, transit, education, and general-support coverage.
- Added a second-wave Fresno enrichment batch for California, deepening the Central Valley from a thin 13-resource scaffold to a broader 25-resource metro foothold with stronger housing, health, recovery, legal, transit, and general-support coverage.
- Added a second-wave Buffalo enrichment batch for New York, deepening the state's upstate coverage from a thin 13-resource scaffold to a broader 25-resource metro foothold with stronger housing, health, legal, transit, education, and general-support coverage.
- Added a second-wave Honolulu enrichment batch for Hawaii, deepening the state's seeded metro from a thin 13-resource launch city to a broader 25-resource foothold with stronger housing, health, legal, transit, education, and general-support coverage.
- Added a second-wave Salt Lake City enrichment batch for Utah, deepening the state's seeded metro from a thin 13-resource launch city to a broader 25-resource foothold with stronger housing, health, legal, transit, recovery, and general-support coverage.
- Added a second-wave Cleveland enrichment batch for Ohio, deepening the state's live coverage from a thin 13-resource scaffold to a broader 25-resource metro foothold with stronger housing, recovery, legal, transit, education, and general-support coverage.
- Added a second-wave San Jose enrichment batch for California, deepening Silicon Valley from a thin 13-resource scaffold to a broader 25-resource metro foothold with stronger housing, health, recovery, legal, transit, and general-support coverage.
- Added a second-wave Birmingham enrichment batch for Alabama, deepening the state's seeded metro from a thin 13-resource launch city to a broader 24-resource foothold with stronger housing, health, legal, transit, literacy, and general-support coverage.
- Added a second-wave Richmond enrichment batch for Virginia, deepening the state's live coverage from a thin initial footprint to a broader 24-resource Richmond metro foothold with stronger housing, treatment, employment, education, and general-support coverage.
- Added a second-wave Providence enrichment batch for Rhode Island, deepening the state's single seeded metro from a thin 13-resource launch city to a broader 25-resource foothold with stronger housing, healthcare, legal, clothing, mental health, and transit coverage.
- Added a second-wave Orlando enrichment batch for Florida, deepening one of the largest remaining seeded metros from a thin 13-resource launch city to a broader 24-resource foothold with stronger housing, legal, mental health, employment, and general-support coverage.
- Added a second-wave Little Rock enrichment batch for Arkansas, deepening the state beyond its initial first-pass footprint, closing the remaining `transportation` and `education` gaps in Little Rock, and raising the city to a broader 23-resource metro foothold.
- Added a second-wave Hartford enrichment batch for Connecticut, raising Hartford from a thin first-pass city to a broader 20-resource metro foothold and closing the remaining `id-documents` gap.
- Added a second-wave Austin scaffold for Texas, expanding the state beyond Dallas, Houston, San Antonio, Beaumont, Denton, Amarillo, and Lubbock coverage and establishing a full 13-category baseline in one of the largest remaining seeded metros.
- Added a second-wave Charleston scaffold for South Carolina, expanding the state beyond the initial Columbia launch and covering another major seeded metro with a full 13-category baseline.
- Added a second-wave Fresno scaffold for California, extending metro coverage in the Central Valley and closing another major seeded population gap with a full 13-category baseline.
- Added a second-wave San Jose scaffold for California, filling one of the biggest remaining seeded metro gaps in an otherwise deep state and establishing a full 13-category baseline in Silicon Valley.
- Added a second-wave Cleveland scaffold for Ohio, expanding the state beyond the initial Columbus launch and covering another major release-area metro with a full 13-category baseline.
- Added a second-wave Buffalo scaffold for New York, expanding the state beyond the initial New York City launch and covering another major release-area metro with a full 13-category baseline.
- Added New York to live coverage with an initial New York City scaffold spanning all 13 major categories. This clears the final blank state and brings Reentry Map to full 50-state coverage plus DC for the first time.
- Added Alaska to live coverage with an initial Anchorage scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives Alaska a usable first-pass statewide foothold for later depth work.
- Added Wyoming to live coverage with an initial Cheyenne scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives Wyoming a usable first-pass statewide foothold for later depth work.
- Added Vermont to live coverage with an initial Burlington scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives Vermont a usable first-pass statewide foothold for later depth work.
- Added West Virginia to live coverage with an initial Charleston scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives West Virginia a usable first-pass statewide foothold for later depth work.
- Added New Jersey to live coverage with an initial Newark scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives New Jersey a usable first-pass statewide foothold for later depth work.
- Added South Dakota to live coverage with an initial Sioux Falls scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives South Dakota a usable first-pass statewide foothold for later depth work.
- Added Montana to live coverage with an initial Billings scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives Montana a usable first-pass statewide foothold for later depth work.
- Added North Dakota to live coverage with an initial Fargo scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives North Dakota a usable first-pass statewide foothold for later depth work.
- Added New Mexico to live coverage with an initial Albuquerque scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives New Mexico a usable first-pass statewide foothold for later depth work.
- Added Utah to live coverage with an initial Salt Lake City scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives Utah a usable first-pass statewide foothold for later depth work.
- Added Nebraska to live coverage with an initial Omaha scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives Nebraska a usable first-pass statewide foothold for later depth work.
- Added Mississippi to live coverage with an initial Jackson scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives Mississippi a usable first-pass statewide foothold for later depth work.
- Added Rhode Island to live coverage with an initial Providence scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives Rhode Island a usable first-pass statewide foothold for later depth work.
- Added New Hampshire to live coverage with an initial Manchester scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives New Hampshire a usable first-pass statewide foothold for later depth work.
- Added Maine to live coverage with an initial Portland scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives Maine a usable first-pass statewide foothold for later depth work.
- Added South Carolina to live coverage with an initial Columbia scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives South Carolina a usable first-pass statewide foothold for later depth work.
- Added Kansas to live coverage with an initial Wichita scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives Kansas a usable first-pass statewide foothold for later depth work.
- Added Iowa to live coverage with an initial Des Moines scaffold spanning all 13 major categories. This reduces the fully blank-state list again and gives Iowa a usable first-pass statewide foothold for later depth work.
- Fixed the admin city-coverage helper so category breadth checks now count secondary entries from `resources.categories[]` instead of only `primary_category`. Oregon expansion work was exposing false gaps in places that were already complete, and the helper now reflects the true 13-category coverage picture.

## 2026-06-04

- Fixed `/resources` so the map no longer silently drops newer resources once the global result set exceeds 100. The list remains capped for performance, but the map now receives the full filtered dataset and the page explicitly tells users when the map is showing more matches than the list.
- Fixed state-level location searches like `Washington, USA`. The app no longer treats a whole-state search as a 25-mile radius around the state's geographic center, so `/resources` and `/search` now behave like statewide searches instead of showing empty maps from centroid filtering.
- Fixed `/resources` map viewport sharing. Panning or zooming the map now updates the URL with the visible bounds and refreshes the resource results to match, so shared links reopen the same map area instead of losing the user's map context.
- Fixed flagged-resource approval tooling so successful human approvals no longer report failure just because verification log audit updates break. Added the missing `verification_logs` human-review columns in the database and made approve/reject flows resilient if that secondary audit write ever fails again.

## 2026-04-20

- Tightened physical-address validation across suggestion intake, trusted research intake, admin imports, and approval flows. City-only values like `San Diego, CA` no longer pass as physical street addresses, preventing vague location data from being auto-approved and geocoded to city centroids.
- Surfaced weak physical addresses in operational content work. Verification queue prioritization and status reporting now flag physical resources whose stored address is only city/state-level, so they get caught during verification runs without penalizing legitimate non-physical resources.

## 2026-04-14

- Fixed batch enrichment queue burn-down. The worker now records per-resource enrichment attempts in `provenance.enrichment`, prioritizes never-attempted resources first, and applies a 30-day retry cooldown so repeated runs stop hammering the same no-write resources.
- Added a `stats status` admin CLI view for quick operational checks. It reports verified, pending, stale, due-for-verification, AI-enriched, needs-enrichment, remaining 500-resource enrichment batches, missing email/hours, missing website, and ungeocoded counts in one command.
- Fixed the `/resources` category filter route. Selecting a single category from the sidebar on `/resources` now stays on `/resources?categories=...` instead of navigating to the nonexistent `/resources/category/...` path that produced a 404.
- Fixed `/resources` distance-aware filtering. The server query now honors `lat`, `lng`, and `distance` URL params and defaults to nearest-first sorting when a location filter is present, so the list view matches the distance-filtered map instead of falling back to alphabetical results.
- Fixed additive category filtering on `/resources`. Multi-select category filters now match any selected category against both `primary_category` and `categories[]`, so combined filters like San Diego + multiple categories no longer collapse to zero results just because many resources only had `primary_category` populated.

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
