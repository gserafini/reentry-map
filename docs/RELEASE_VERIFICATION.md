# Reentry Map release verification

Work as the `reentrymap` Unix user in `/home/reentrymap/reentry-map-staging`. Production is `/home/reentrymap/reentry-map-prod`; both directories are worktrees of the same repository.

## Before the quality run

Wait for every implementation agent to report its files formatted, syntax checked, focused tests passing, and frozen. Run the complete `npm run quality` gate against that stable tree. If a fix changes the tree, rerun its failing case and relevant regressions; finish with the full gate before the frontend commit.

The database search integration suite is opt-in: `RUN_SEARCH_INTEGRATION=1 npm run test:run -- __tests__/lib/search-integration.test.ts`. It uses staging public-resource fixtures. Ordinary unit tests mock the database. Resolve test fixture paths from the current module; never hardcode production as a scratch directory.

Use port 3004 for temporary verification after the console gate exits. Production-mode `next start` is required to verify service-worker installation and true offline navigation. Never use port 3003 or permanent staging port 3009 for temporary tests. The console gate refuses an occupied port and owns a private process group; it must close that group even on failure or interruption. Check the listener using `ss -lntp '( sport = :3004 )'`; an empty lsof result did not reliably prove the port was free in this environment.

The build command generates Tailwind CSS before Next compilation. The console gate then serves that completed production artifact with next start on port 3004; it requires a readable, nonempty .next/BUILD_ID and explains that npm run build is required if it is absent. Do not use a development compiler or CSS watcher in the release gate: cold route compilation timed out despite a working production build, and a watcher can change CSS after the artifact was built. Production-mode checks verify the same execution mode that will be deployed.

The console checker fails on application exceptions, HTTP errors, and unexpected console errors. It treats only the exact documented Google Maps vector-to-raster fallback as a headless graphics limitation. Avoid networkidle as a page-readiness assertion: Google Maps maintains background requests.

Static generation runs with experimental.cpus set to 2. Each worker owns a PostgreSQL pool; using every CPU on this host exhausted database slots and produced incomplete static content despite a zero build exit code. Inspect the build log for database failures, not only its exit status. Do not raise global database limits to accommodate a build.

MUI components must remain inside AppRouterCacheProvider. It sends Emotion styles through Next server insertion instead of interleaving style elements in hydrated page content. The SSR test uses the real ServerInsertedHTMLContext because MUI's CommonJS bridge is not intercepted by an ESM-only next/navigation mock. See [MUI integration guidance](https://mui.com/material-ui/integrations/nextjs/).

## Browser evidence

Use Playwright MCP and JPEG screenshots. Write MCP screenshots beneath the workspace or its `.playwright-mcp/` directory; arbitrary /tmp screenshot paths are denied. Remote downloads are automatically saved under `.playwright-mcp/`; use `saveAs` when an explicit copy is needed rather than the unsupported remote `download.path()`.

Wait for hydration and transition completion before asserting inputs, counting cards, or running axe. A streamed server response can briefly contain both fallback and final markup. Use accessible names from the actual snapshot: the location combobox is named "Location search". URL-backed checkbox updates are asynchronous; click and wait for the resulting URL and result count instead of requiring an immediate checked state. Verify settled field values match the result scope.

Run phone, tablet, desktop, keyboard, and real network-off checks. Inspect console errors and screenshots. Verify search/contact steps, shared URLs, filters, Back navigation, guest saving, download/print, and offline removal. Inspect sendBeacon payloads at the browser API when remote request postData is unavailable; do not interpret a null transport body as missing analytics.

Server pages cannot pass arbitrary function-valued props into Client Components. In particular, passing a Next Link function as the component prop of a MUI component from a Server Component can produce a runtime 500 even when type checking and unit rendering pass. Use a serializable href or a client wrapper, then verify the actual page.

Executable shell test fixtures cannot live in /tmp on this host because that mount is noexec. Use an isolated project test directory and assert exact command resolution before running a PATH-based shell harness.

Human participant sessions remain a separate study: `docs/UX_VALIDATION_PLAN.md` and PM T002.

## Review and commit

Only after evidence exists, commit using `FRONTEND_VERIFIED=1`. Review any lint-staged changes and syntax-check changed code. Include CHANGELOG.md for meaningful behavior changes and a progress report with PM IDs and evidence.

## Exact revision deployment

Use the existing admin CLI deploy command; `--local --revision` requires a clean tree and full committed SHA, then performs npm ci, build, and PM2 restart together. Preview with `--dry-run`. Verify staging before promoting the same commit into production main and running `deploy production --local --revision`.

The service account currently lacks GitHub SSH access. Do not copy credentials or clone its worktree as root. For root-owned transport, create a git bundle as reentrymap, then clone that bundle into a root-owned temporary bare repository and push through the existing root GitHub identity. Recheck remote branch tips before pushing; use ordinary fast-forward pushes only. The staging and main objects already share a repository, so no cross-worktree fetch or filesystem ownership override is required for local promotion.

Record the deployed SHA, live browser checks, PM completion, and any remaining participant-study work. A successful build alone is not deployment evidence.
