# Reentry Map: search-to-contact improvements

September 18, 2026. Requested by Gabriel after the public application UX review. Implementation and release verification tracked in pm.db project reentry_map; session 8018 is the working checkpoint. Final deployed revision and live checks are recorded in the completion session.

## Result

A person can search for a need and place, see local offices alongside services covering that place, and call or save a useful result. Phone results begin with a list; desktop pairs it with a map. Guest saved contacts remain usable without an account or network connection.

The implementation preserves explicit URL scope, keeps filters/counts/maps consistent, and avoids inferring service availability, walk-in access, or human verification from incomplete data.

## Itemized implementation and evidence

- **I030 — Results presentation.** Shared results explorer across search, category and place entry points. Phone list first, accessible filter drawer, optional map; desktop synchronized list and map. Back from a detail restored the exact prior 1,364px scroll position. Phone/tablet/desktop checks found no horizontal overflow.
- **I031 — Everyday needs and recovery.** Dallas “jobs” and “employment” return the same seven resources. “Place to sleep” returns eight housing options. Exact Miles of Freedom and 7More lookups preserve organization relevance. Empty-result recovery retains Dallas while clearing only need/filter constraints.
- **I032 — Contact and fit.** Cards show actual service summaries, contact actions and known eligibility. Miles of Freedom Call appears at y674 on a 390×844 phone; detail contact is at y565 before the map. Saved-list Call is at y705 after removing the full search form from focused tasks.
- **I033 — Guest support list and corrections.** Saved Miles of Freedom and 7More without authentication; downloaded a text list containing phones, coverage, intake and source/check information. Print view excludes navigation. Real network-off navigation retrieved contacts; removal persisted when reconnecting. An anonymous correction returned 201 and pending status, without editing the resource; the exact staging test report was removed afterward.
- **I034 — Measurement.** Consent is off by default and respects browser privacy signals. Browser-observed beacon data recorded results/refinement/contact attempts, exactly one first-contact event through refinements, and neither raw search text nor precise coordinates. A contact click is not evidence of received help.
- **B046 — Consistent category filters and counts.** Lubbock housing returned five matching resources; adding Employment reduced the result to the one matching statewide service. Counts use primary plus secondary categories without double counting. List, map, facets and totals share a query contract.
- **B047 — Honest coverage.** Dallas finds 7More Texas despite its Houston anchor, excludes Hawaii, and labels statewide service without physical distance or directions. County matching uses real geography, with city/viewport regressions including border and antimeridian cases.
- **B048 — One location scope.** Explicit Dallas links override cached Lubbock for form, distances, map and filters. Nationwide links remain nationwide. State selection does not present an unsupported 25-mile radius. Actual Google Places selection completed a Dallas search successfully.
- **B043 — Invalid cached coordinates.** A browser cache containing empty coordinates and an “undefined” label was discarded, leaving a usable blank location field. Single-owner GeoIP handling, manual/GPS races, stale/default responses and blocked storage have focused regression coverage.
- **B049 — Honest trust signals.** Removed unsupported walk-in and blanket verification copy and empty rating claims. Automated checks have dated explanatory labels; unknown hours/intake remain explicitly unknown. All category badge colors pass contrast checks.
- **B050 — Offline recovery.** Offline route returns usable content. Production service worker caches only public offline contact assets, not authenticated pages or APIs. Existing v1 cache upgraded to v2; real offline Call appeared at y631.
- **B051 — Exact-coordinate distance.** Database integration verifies physical resources at identical coordinates return finite distance instead of an acos-domain failure.
- **B052 — Structured-data safety.** JSON-LD escapes script-terminating characters while preserving parsed content. Focused malicious-description regression passes.
- **B053 — City lookup bounds.** City and category metadata use bounded parameterized queries with render caching. Real small-city page /nh/amherst works without requiring a population/resource threshold; city category counts include secondary categories.
- **B054 — Reliable release gate.** Console checker rejects HTTP, navigation, page and unexpected console failures; permits only two exact observed headless Maps raster messages. Shell tests verify missing-build rejection, occupied-port refusal, and cleanup of only its own process group. It serves the compiled production build, with Tailwind generated before Next compilation.
- **B055 — Shared database protection.** The first build spawned 47 independent database pools and logged connection-limit errors despite exit zero. Two static workers generated all 1,456 pages without database errors.
- **B056 — Stable hydration.** MUI AppRouterCacheProvider moves Emotion styles into server-inserted head output. SSR regression failed on inline body styles before the fix, then passed. Compiled /resources returned 20 nationwide cards in about 1.9 seconds with no page errors.
- **B057 — Malformed authentication input.** NextAuth 4.24.13 reproduced four failures for malformed Bearer input and the real admin-auth helper. Version 4.24.15 rejects it safely; valid encrypted tokens still work. Focused auth suites passed 58 tests.
- **B059 — Share previews.** Live old metadata pointed og:url and og:image to localhost. Default metadata origin now uses reentrymap.org, preserving explicit staging overrides. Public production metadata is checked after promotion.
- **B022 — Exact local deployment.** CLI validates clean tree and full committed SHA, then runs install, build and restart together. It supports local operation without copying GitHub credentials; staging fixture refresh is explicitly guarded and public-data-only.

## Verification

The full quality gate passes lint, TypeScript, 962 unit/component/CLI tests, all 1,456 generated pages, and compiled browser checks for /, /resources and /admin. Twelve tests are skipped in the ordinary suite; the opt-in real-database suite was separately run and all eight tests passed.

Playwright checks covered 390×844, 768×1024 and 1440×1000. Axe found no WCAG A/AA violations on the tested results page, open filter dialog and Miles of Freedom detail. There were no application page errors. Headless Google Maps may use its raster renderer; this does not bypass application-error checks.

Additional public journeys checked: Texas state directory, Dallas city and housing pages, small-city browse, category/tag redirects, legacy city/category search redirect, zero-results recovery, exact organization search, map/list selection, Back restoration, save/download/print, offline retrieval/removal, anonymous moderated correction and privacy preference.

## Visual evidence

- [Phone search results](2026-09-18-ux-assets/ux-results-mobile-final.jpg)
- [Desktop list and map](2026-09-18-ux-assets/ux-results-desktop-final.jpg)
- [Tablet results](2026-09-18-ux-assets/ux-results-tablet-final.jpg)
- [Resource contact](2026-09-18-ux-assets/ux-detail-mobile-final.jpg)
- [Saved contacts](2026-09-18-ux-assets/ux-saved-mobile-final.jpg)
- [Real offline contacts](2026-09-18-ux-assets/ux-offline-mobile-final.jpg)
- [Home search](2026-09-18-ux-assets/ux-home-mobile-final.jpg)

## Remaining work

**T002 remains pending:** actual participant usability sessions. [The study plan](../UX_VALIDATION_PLAN.md) contains nine tasks, observation measures, real-device and assistive-technology coverage, and the follow-through process. Browser emulation and automated accessibility checks do not substitute for participants or a full screen-reader study.

Broader dependency remediation remains under B004; this release's MUI/Turf additions introduced no audit findings, and the targeted NextAuth patch removed one. The separate credential-exposure response is tracked privately under B058; no credentials are included in this report and no active credentials were changed during UX work.

See [release procedure](../RELEASE_VERIFICATION.md) for repeatable checks and exact-revision deployment.
