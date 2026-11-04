# Reentry Map API method policy (B083)

The live application implements 15 PUT/PATCH/DELETE handlers, but CRS 911100's default method policy rejects their intended requests before Next.js. The local compiled profile PATCH succeeds while the public authenticated request is rejected by 911100. This fragment changes only the matching transaction's allowed-method collection inside Reentry Map's vhosts. CRS 911100 continues to execute; all other CRS and Imunify rules, including 77350476, remain enabled. Authentication and authorization stay in the application.

## Scope

- PATCH: `/api/profile`, `/api/reviews`, `/api/admin/users`, `/api/admin/expansion-priorities/UUID`, `/api/admin/resources/UUID/update`.
- DELETE: `/api/reviews`, `/api/reviews/helpfulness`, `/api/favorites`, `/api/ratings`, `/api/admin/users`, `/api/admin/expansion-priorities/UUID`, `/api/admin/resources/UUID`.
- PUT: `/api/suggestions/UUID/status`, `/api/updates/UUID/status`, `/api/admin/resources/UUID`.

UUIDs use the application's canonical 8-4-4-4-12 hex form. Query strings are permitted; alternate path encodings, path suffixes, trailing slashes, case changes, other methods, other API paths, and other vhosts receive no exception. Future handler changes require reviewing the fragment and updating the fixture's inventory.

IDs 999090–999092 were checked before assignment against Apache configuration/vendor/userdata files and canonical rule fragments on both hosts: 1,175 files on dc3-1 and 1,177 on dc2-5; no collisions. Recheck before applying if either configuration has changed. These IDs are vhost-local definitions, intentionally included once in each of four distinct vhost contexts. Never include the fragment globally or twice within one vhost.

## Native qualification

Run as root on dc3-1. The fixture follows the existing native ModSecurity fixture pattern in `~/.claude/scripts/modsec-rules/README.md` and loads `mod_unique_id` before ModSecurity. It starts its own loopback Apache and synthetic Node backend, uses the actual vendor 911100 rules and libinjection rule 942100, configtests before starting, and terminates only its own child process. It does not load live Apache configuration, real applications, credentials, databases, or shared audit/collection files.

```bash
set -o pipefail
node ops/apache/test-api-method-policy.mjs ops/apache/reentrymap-api-methods.conf /absolute/private/red-receipt.json --without-fragment 2>&1 | node ~/.claude/scripts/redact-secrets/cli.js
# The baseline command must fail: intended application verbs are rejected.
node ops/apache/test-api-method-policy.mjs ops/apache/reentrymap-api-methods.conf /absolute/private/green-receipt.json 2>&1 | node ~/.claude/scripts/redact-secrets/cli.js
# The candidate must pass every check.
```

Four separate target vhost contexts represent production/staging std/SSL includes; baseline and unrelated contexts have no exception. Fixture listeners use HTTP because this test qualifies ModSecurity context/method behavior. Actual public HTTPS/SNI/cookie/application acceptance is a separate required rollout check. The fixture checks all 15 handlers with/without queries in all four target contexts, forbidden verb/path variants, baseline and unrelated-vhost denials, ordinary methods, SQLi denials on permitted verbs, and backend execution counts. Negative requests never reach a real application or trigger production LFD.

Qualified result: native configtest **Syntax OK**; candidate **244/244 checks passed**. The baseline without the fragment failed precisely the **120 required method/query checks**, each with HTTP 403 and zero backend calls; the other 124 controls passed. The unchanged native rules 911100 and 942100 both produced positive denial evidence. Both complete receipts are retained in the private security-sweep cache as `api-method-policy-red.json` and `api-method-policy-green.json`.

## Exact deployment placement

Install the reviewed root-owned 0644 fragment as `reentrymap-api-methods.conf` at exactly these already-included locations:

```text
/etc/apache2/conf.d/userdata/std/2_4/reentrymap/reentrymap.org/reentrymap-api-methods.conf
/etc/apache2/conf.d/userdata/ssl/2_4/reentrymap/reentrymap.org/reentrymap-api-methods.conf
/etc/apache2/conf.d/userdata/std/2_4/reentrymap/staging.reentrymap.org/reentrymap-api-methods.conf
/etc/apache2/conf.d/userdata/ssl/2_4/reentrymap/staging.reentrymap.org/reentrymap-api-methods.conf
```

The production vhost also includes `reentrymap.com` userdata directories. Do **not** copy the file there: both directories enter the same production vhost and would duplicate the rules. The existing `.org` vhosts cover their configured aliases. Vhost binding provides scope; no caller-controlled Host selector is used. Existing wildcard includes were verified in all four vhosts, so this installation does not require regenerating the entire cPanel Apache configuration or changing global/shared ModSecurity files.

## Reviewed apply and rollback sequence

This repository change does not install or reload anything. The parent operator performs the separately reviewed rollout:

Apply the two staging includes first and pass the authenticated staging acceptance checks. Promote the repaired application code before applying the two production includes. In particular, do not enable production mutation methods while the older administrator authorization implementation is still running. Each phase has its own beforeimage/absence receipt and graceful reload.

1. Recheck unique IDs on both hosts and exact four vhost/include bindings. Confirm current native Apache health, active MPM, expected source hash, and successful current configtest. Preserve full diagnostics privately and pipe displayed Apache configuration/log output through `~/.claude/scripts/redact-secrets/cli.js`.
2. Create a root-owned mode-0700 evidence/backup directory outside all served roots. Read each exact destination completely if it exists; save its beforeimage, mode/owner, and SHA-256 there. For an absent destination, save an explicit absence marker. Record a SHA-256 of the unchanged generated `httpd.conf` and preserve the reviewed candidate hash. Back up all four destinations before changing any.
3. Install identical reviewed bytes, root:root mode 0644, at only those four paths. Verify each destination hash and unchanged unrelated files. Run native `apachectl configtest`, retain the exit and diagnostics, and require `Syntax OK`. If configtest fails, restore all four beforeimages/absences immediately; configtest the restored state. Do not reload a failed candidate.
4. With health and native configtest passing, use **`apachectl graceful` only**, bounded by the established operator workflow. Retain its exit/status. This allows existing workers/connections to finish. Do not use restart, stop/start, killall, or a fallback full restart. Run concurrent ordinary-frontdoor availability checks through the window and require no interrupted requests. A healthy old process after a failed graceful does not establish that the new configuration loaded.
5. Verify both HTTPS frontdoors with correct TLS SNI and Host. Run the approved synthetic authenticated profile fixture through the real staging frontdoor, require PATCH 200 and matching subsequent GET/UI state, and retain cookie material privately. Use only owned synthetic records for any PUT/DELETE acceptance. Require existing unauthenticated/admin authorization behavior, normal pages/assets, and clean fresh browser consoles. Keep malicious/forbidden-method and SQLi positive controls in the isolated fixture rather than sending WAF violations to production. Inspect safely projected fresh rule IDs for the accepted requests. Rule 77350476 is intentionally unchanged; a no-cookie WAF denial is not proof that authenticated application handling remains broken.
6. Roll back on failed application acceptance or any availability regression: restore each exact beforeimage, or remove only the newly installed exact file whose absence was recorded. Do not remove pre-existing directories or other includes. Require configtest, then the same graceful-only workflow and frontdoor/browser checks. Retain candidate, before/after hashes, receipts, and the reason for rollback.

No application role, credential, shared WAF policy, database schema, or request-method workaround is changed by this repair.
