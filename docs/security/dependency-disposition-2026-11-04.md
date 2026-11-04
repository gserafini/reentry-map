# Dependency disposition — 2026-11-04

Every package entry in the before/final npm audit union is listed below. These are package entries, including inherited advisory chains, rather than independent demonstrated exploits. The before audit flagged 55 entries; the final audit flags 12 Moderate development-tool entries. B004 is the established tracker; its evidence note contains this same itemized disposition. Zero production-only findings remain.

| Package                                    | Before   | Final       | Disposition                      | Installed versions       |
| ------------------------------------------ | -------- | ----------- | -------------------------------- | ------------------------ |
| `@auth/core`                               | critical | not flagged | Removed from dependency graph    | absent                   |
| `@auth/pg-adapter`                         | critical | not flagged | Removed from dependency graph    | absent                   |
| `@babel/core`                              | low      | not flagged | No longer flagged in final audit | 7.29.13                  |
| `@babel/plugin-transform-modules-systemjs` | high     | not flagged | Removed from dependency graph    | absent                   |
| `@ducanh2912/next-pwa`                     | low      | not flagged | Removed from dependency graph    | absent                   |
| `@esbuild-kit/core-utils`                  | moderate | moderate    | B004 remains open                | 3.3.2                    |
| `@esbuild-kit/esm-loader`                  | moderate | moderate    | B004 remains open                | 2.6.5                    |
| `@humanfs/node`                            | moderate | not flagged | No longer flagged in final audit | 0.16.8                   |
| `@rollup/plugin-node-resolve`              | low      | not flagged | Removed from dependency graph    | absent                   |
| `@rollup/plugin-terser`                    | moderate | not flagged | Removed from dependency graph    | absent                   |
| `@typescript-eslint/eslint-plugin`         | moderate | moderate    | B004 remains open                | 8.72.1                   |
| `@typescript-eslint/parser`                | moderate | moderate    | B004 remains open                | 8.72.1                   |
| `@typescript-eslint/type-utils`            | moderate | moderate    | B004 remains open                | 8.72.1                   |
| `@typescript-eslint/typescript-estree`     | moderate | moderate    | B004 remains open                | 8.72.1                   |
| `@typescript-eslint/utils`                 | moderate | moderate    | B004 remains open                | 8.72.1                   |
| `@vitest/coverage-v8`                      | critical | not flagged | No longer flagged in final audit | 4.1.12                   |
| `@vitest/mocker`                           | moderate | not flagged | No longer flagged in final audit | 4.1.12                   |
| `@vitest/ui`                               | critical | not flagged | No longer flagged in final audit | 4.1.12                   |
| `axios`                                    | high     | not flagged | No longer flagged in final audit | 1.21.0                   |
| `baseline-browser-mapping`                 | moderate | not flagged | No longer flagged in final audit | 2.11.35                  |
| `brace-expansion`                          | high     | not flagged | No longer flagged in final audit | 1.1.21, 5.0.12           |
| `browserslist`                             | high     | not flagged | No longer flagged in final audit | 4.29.5                   |
| `concurrently`                             | critical | not flagged | No longer flagged in final audit | 10.0.6                   |
| `deepmerge`                                | low      | not flagged | Removed from dependency graph    | absent                   |
| `drizzle-kit`                              | moderate | moderate    | B004 remains open                | 0.31.9                   |
| `drizzle-orm`                              | high     | not flagged | No longer flagged in final audit | 0.45.4                   |
| `esbuild`                                  | moderate | moderate    | B004 remains open                | 0.18.20, 0.25.12, 0.28.2 |
| `eslint-config-next`                       | moderate | moderate    | B004 remains open                | 16.4.5                   |
| `fast-uri`                                 | high     | not flagged | No longer flagged in final audit | 3.1.9                    |
| `fflate`                                   | moderate | not flagged | No longer flagged in final audit | 0.8.3                    |
| `filelist`                                 | moderate | not flagged | Removed from dependency graph    | absent                   |
| `flatted`                                  | high     | not flagged | No longer flagged in final audit | 3.4.4                    |
| `follow-redirects`                         | moderate | not flagged | No longer flagged in final audit | 1.16.2                   |
| `form-data`                                | high     | not flagged | No longer flagged in final audit | 4.0.6                    |
| `geoip-lite`                               | moderate | not flagged | No longer flagged in final audit | 2.0.3                    |
| `ip-address`                               | high     | not flagged | No longer flagged in final audit | 10.7.6                   |
| `js-yaml`                                  | high     | not flagged | No longer flagged in final audit | 4.3.2                    |
| `lodash`                                   | high     | not flagged | Removed from dependency graph    | absent                   |
| `minimatch`                                | moderate | moderate    | B004 remains open                | 10.2.6, 3.1.5            |
| `picomatch`                                | high     | not flagged | No longer flagged in final audit | 2.3.2, 4.0.7             |
| `postcss-selector-parser`                  | moderate | not flagged | No longer flagged in final audit | 6.1.5                    |
| `qs`                                       | moderate | not flagged | No longer flagged in final audit | 6.17.1                   |
| `serialize-javascript`                     | high     | not flagged | Removed from dependency graph    | absent                   |
| `shell-quote`                              | critical | not flagged | No longer flagged in final audit | 1.12.0                   |
| `source-map-js`                            | high     | not flagged | No longer flagged in final audit | 1.2.2                    |
| `terser-webpack-plugin`                    | moderate | not flagged | Removed from dependency graph    | absent                   |
| `typescript-eslint`                        | moderate | moderate    | B004 remains open                | 8.72.1                   |
| `undici`                                   | high     | not flagged | Removed from dependency graph    | absent                   |
| `vite`                                     | high     | not flagged | No longer flagged in final audit | 7.3.7                    |
| `vitest`                                   | critical | not flagged | No longer flagged in final audit | 4.1.12                   |
| `workbox-build`                            | moderate | not flagged | Removed from dependency graph    | absent                   |
| `workbox-webpack-plugin`                   | low      | not flagged | Removed from dependency graph    | absent                   |
| `ws`                                       | high     | not flagged | No longer flagged in final audit | 7.5.13, 8.22.1           |
| `yaml`                                     | moderate | not flagged | No longer flagged in final audit | 1.10.3, 2.9.1            |
| `zod`                                      | high     | not flagged | No longer flagged in final audit | 4.6.7                    |

A package no longer flagged can remain installed at a compatible patched version. Remaining findings are itemized under the two advisory groups in [the assessment](redteam-2026-11-04.md). Installed dev tooling is retained for builds; no force-fix, parent downgrade, or incompatible major override was used.
