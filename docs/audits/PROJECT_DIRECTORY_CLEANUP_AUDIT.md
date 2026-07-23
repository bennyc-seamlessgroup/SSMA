# Project Directory Cleanup Audit

**Project:** Currenc Intelligence portal  
**Audit date:** 2026-07-23  
**Scope:** Repository folders, generated artifacts, active routes, runtime dependencies, reference data, report assets, and likely legacy files  
**Important:** This is an assessment only. No files or folders were removed.

> **Cleanup status:** The approved safe-removal and reorganization work was executed after this audit. Historical paths below describe the repository at audit time. Current contracts now live under `docs/`, retained non-runtime datasets under `reference-data/`, and report references under `Report Templates/archive/`.

## Executive Summary

The application source is concentrated in `app/`, `components/`, `lib/`, and `public/`. These folders are active and should be retained.

The largest cleanup opportunity is not old application code. It is generated build output:

- `.next` and the many `.next-build-*` / `.next-stale-*` snapshots occupy about **6.0 GB**.
- `node_modules` occupies about **338 MB**.
- Together with generated PDF QA files, the regenerable footprint is about **6.4 GB**.

There are also several source-controlled folders that are not used at runtime:

- `tmp/` contains PDF render screenshots.
- `output/` contains a generated PDF.
- `sample-reports/` contains old sample PDFs and rendered previews.
- `Report Templates/old-files/` is explicitly legacy.
- `data_mapping_ref/`, `export json/`, `Justin json-file/`, and much of `Sample Data/` are reference material from earlier JSON-based implementations.
- `import_data/` and its public fallback API are no longer consumed by a page. The portal now reads authenticated APIs.
- Several reusable components have no references and are strong deletion candidates.
- Several direct-access development pages remain in `app/` even though they were removed from navigation.

The recommended cleanup is phased:

1. Remove generated caches and build snapshots.
2. Remove tracked render output and obvious unused components.
3. Archive superseded samples, mappings, and incident documents outside the active source tree.
4. Remove legacy routes only after confirming old bookmarks and demos no longer need them.

## Safety Legend

| Classification | Meaning |
|---|---|
| **Keep** | Active runtime source, required configuration, or current product asset. |
| **Keep / reorganize** | Not runtime-critical, but still useful as a contract, reference, or team handoff. |
| **Archive first** | Not used by the application; move to external/archive storage before deleting. |
| **Safe to remove** | Generated, empty, duplicated, or verified to have no runtime references. |
| **Review before removal** | Appears legacy, but removal can break direct URLs, bookmarks, or team workflows. |

## Top-Level Directory Audit

| Directory | Purpose | Runtime use | Assessment | Recommendation |
|---|---|---:|---|---|
| `.git/` | Git history and repository metadata. | Required for Git | **Keep** | Never remove as part of project cleanup. |
| `.next/` | Current Next.js compiled output and cache. | Generated only | **Safe to remove** | Delete when the dev server is stopped. Next.js recreates it. |
| `.next-build-*` | Manually retained build snapshots from prior feature verification. | None | **Safe to remove** | Remove all. They are ignored by Git and consume several GB. |
| `.next-stale-*` | Old/stale build snapshots retained during debugging. | None | **Safe to remove** | Remove all. They are not read by Next.js. |
| `.pnpm-store/` | Local pnpm metadata database. The project currently uses `package-lock.json`/npm. | None | **Safe to remove** | Untrack and remove; add `.pnpm-store/` to `.gitignore`. |
| `node_modules/` | Installed npm packages. | Required locally, regenerable | **Safe to remove / reinstall** | Remove only when reclaiming space or resetting dependencies; restore with `npm install`. |
| `app/` | Next.js pages, layouts, API routes, and page-specific clients. | Core | **Keep** | Retain active routes; review legacy route groups separately below. |
| `components/` | Shared UI, navigation, authentication, status, and development-table components. | Core | **Keep**, with unused candidates | Remove only the verified unreferenced components listed below. |
| `lib/` | Authentication, API clients, data normalization, caches, report logic, and domain helpers. | Core | **Keep** | Retain; simplify the obsolete import-data subsystem in a later code cleanup. |
| `public/` | Logos, backgrounds, social icons, and browser-loaded report templates. | Core | **Keep** | The daily-close report files are loaded directly by Report Archive. |
| `scripts/` | Report sample generation and rule-catalog seeding utilities. | Build/operations only | **Keep / review** | Keep rule seeding; archive old sample-report generators if those samples are removed. |
| `Report Templates/` | Source/reference report templates and archived report generations. | Partly | **Keep / reorganize** | Keep the current lean report source; archive or remove explicitly old subfolders. |
| `sample-reports/` | Generated sample PDFs and rendered previews. | None | **Archive first** | Remove from active repo after preserving any approved visual references. |
| `tmp/` | PDF rendering screenshots and text extracts used for visual QA. | None | **Safe to remove** | Remove tracked artifacts and add `tmp/` to `.gitignore`. |
| `output/` | Generated report PDF output. | None | **Safe to remove** | Generated by the report script; add `output/` to `.gitignore`. |
| `Sample Data/` | Historical vendor examples, old consolidated JSON, and backend mapping notes. | None | **Keep / reorganize** | Move useful contracts to a clearly named `reference-data/` archive; remove superseded files after team review. |
| `data-sync-platform-centralized-v2/` | A local snapshot of raw vendor, current, history, report, and manual-input structures used for gap validation. | None | **Keep / reorganize** | Useful backend contract fixture. Keep while migration validation is ongoing, then archive outside the frontend repo. |
| `Justin json-file/` | Earlier vendor/raw JSON examples. | None | **Archive first** | Likely superseded by `data-sync-platform-centralized-v2/`; confirm with backend, then remove. |
| `newest datapoint csv/` | Current data-point inventory and centralized field mapping. | None | **Keep** | Treat as a source-of-truth product/backend reference until moved to formal documentation. |
| `data_mapping_ref/` | Earlier page-by-page CSV mapping references, including many removed routes and JSON paths. | None | **Archive first** | Superseded in part by the newest data-point CSV and API migration docs. Archive after team confirmation. |
| `export json/` | Old short-interest and lending-pressure production JSON templates. | None | **Archive first** | The portal now uses APIs. Remove after backend confirms these templates are no longer used. |
| `import_data/` | Old local JSON fallback files for social data and hotkeys. | No current page consumer | **Review before removal** | The consuming hook is unused and social/hotkeys now use APIs. Remove together with the obsolete fallback route after one final production check. |
| `docs/` | Product, backend, API, incident, and implementation documentation. | None | **Keep / reorganize** | Keep current specifications; move resolved incidents and old plans into `docs/archive/`. |
| `data/` | Empty directory; formerly intended for local database data. | None | **Safe to remove** | Remove the empty directory. |

## Top-Level Files

| File | Purpose | Assessment | Recommendation |
|---|---|---|---|
| `package.json`, `package-lock.json` | npm dependencies and scripts. | **Keep** | Required. |
| `next.config.mjs`, `next-env.d.ts`, `tsconfig.json` | Next.js and TypeScript configuration. | **Keep** | Required. |
| `tsconfig.tsbuildinfo` | TypeScript incremental build cache. | **Safe to remove** | It is ignored and regenerates automatically. |
| `.env.example` | Environment-variable documentation. | **Keep** | Keep updated and free of secrets. |
| `.env.local` | Local credentials and runtime configuration. | **Keep locally** | Do not commit or delete unless credentials are reconfigured elsewhere. |
| `.DS_Store` | macOS folder metadata. | **Safe to remove** | Remove all occurrences; already ignored. |
| `README.md` | Project setup and architecture introduction. | **Keep, but stale** | Rewrite to reflect the authenticated API-first architecture instead of the old local/S3 JSON model. |
| `INTEGRATION (7).md` | Current backend integration reference. | **Keep** | Rename to a stable versioned path such as `docs/integration/API_INTEGRATION_V7.md`. |
| `DATA_STRUCTURE.md` | Backend data architecture specification. | **Keep** | Current reference. |
| `data_dictionary.md` | Current/history dataset dictionary. | **Keep** | Current reference. |
| `CENTRALIZED_V2_GAP_REPORT.md` | Generated centralized-data gap audit. | **Keep / archive** | Move to `docs/archive/data-audits/` when no longer current. |
| `CENTRALIZED_V2_VALUE_CROSSCHECK_REPORT.md` | Generated value cross-check audit. | **Keep / archive** | Move beside the gap audit. |
| `S3_BROWSER_DATA_ACCESS.md` | Previous browser-to-public-S3 approach. | **Archive first** | The portal is now authenticated API-first; retain only as migration history. |
| `import-template.zip` | Downloadable-style CSV template bundle with macOS metadata. | Not referenced | **Review before removal** | Current Data Import generates templates in the browser, so this zip appears obsolete. Confirm no operations staff distribute it manually, then remove. |

## Application Route Audit

### Active User Portal Routes

These routes are linked from the current sidebar or settings submenu and should be retained:

| Route folder | Product area |
|---|---|
| `app/monitor/[ticker]/dashboard/` | Dashboard |
| `app/monitor/[ticker]/institutional/` | Ownership |
| `app/monitor/[ticker]/internal-float/` | Internal Float |
| `app/monitor/[ticker]/short-interest/` | Short Interest |
| `app/monitor/[ticker]/lending-pressure/` | Lending Pressure |
| `app/monitor/[ticker]/sentiment/` | Social Sentiment |
| `app/monitor/[ticker]/event-calendar/` | SEC Filings |
| `app/monitor/[ticker]/reports/` | Report Archive |
| `app/monitor/[ticker]/settings/` | General settings |
| `app/monitor/[ticker]/user-profile/` | User Profile |
| `app/monitor/[ticker]/companies/` | Company Management |
| `app/monitor/[ticker]/alert-rules/` | Alert Rules |
| `app/monitor/[ticker]/email-settings/` | Delivery Settings |
| `app/monitor/[ticker]/daily/[date]/` | Daily report/detail route |

Also retain authentication, public demo, legal, and marketing routes:

- `app/page.tsx`
- `app/login/`
- `app/logout/`
- `app/signup/`
- `app/callback/`
- `app/demo/`
- `app/legal/`

### Active Operations Portal Routes

These routes are present in the current operations sidebar:

| Route folder | Operations area |
|---|---|
| `app/operations/market-data/` | Market Data |
| `app/operations/sec-filings/` | SEC Filings |
| `app/operations/ownership/` | Ownership Data |
| `app/operations/data-import/` | Data Import |
| `app/operations/narrative-social/` | Social Data Upload |
| `app/operations/hotkeys/` | Notification Routing |
| `app/operations/user-access/` | Team Access |

`app/operations/page.tsx` and `app/operations/dashboard/page.tsx` are redirect/compatibility routes to Market Data. They have little maintenance cost and can remain unless old URLs are being formally retired.

### Compatibility Routes

| Route | Current behavior | Recommendation |
|---|---|---|
| `dashboard-v2/` | Redirects to `dashboard/`. | Keep temporarily for old bookmarks; remove in a breaking-route cleanup. |
| `internal-float-v2/` | Redirects to `internal-float/`. | Keep temporarily. Note that its `dtc-upload/` child duplicates the current route structure. |
| `source-map/` | Redirects to `import-data/`. | Remove with the old import-data development page if retired. |

### Direct-Access Legacy or Development Routes

The following pages are not in the current main/settings navigation. Most contain placeholders, static demonstrations, or old development content:

- `api-connectors/`
- `billing/`
- `import-data/`
- `market-defense/`
- `notifications/`
- `options/`
- `peer-comparison/`
- `policy/`
- `premium-intelligence/`
- `price-scenario/`
- `role-permissions/`
- `squeeze-readiness/`
- `settings/alerts/`

**Assessment:** **Review before removal.** They are still valid direct URLs and some are named in `DesignBTopbar.tsx`. Removing them is safe from the current sidebar, but may break bookmarks, demonstrations, or legal/product review links. If the product decision is that these modules are retired, delete their route folders and their now-unused CSS in the same change.

### Legacy `app/portal/` Routes

| Folder | Assessment |
|---|---|
| `app/portal/page.tsx` | Old redirect/login path. Keep only if external links still point to `/portal`. |
| `app/portal/companies/page.tsx` | Old redirect/login path. |
| `app/portal/billing/page.tsx` | Legacy AccountShell-based billing page; current monitor route is separate and neither is in active settings. Strong removal candidate. |
| `app/portal/integrations/` | Empty. Safe to remove. |

### Empty Route Directories

There are numerous empty folders under `app/api/` and `app/monitor/[ticker]/`, including old report, dashboard, manual-float, news, insider, smart-money, and email API structures. Empty directories are not deployed and are generally not tracked by Git.

**Recommendation:** Remove them locally for clarity. They have no application effect.

## Component Audit

The following shared components have no references in `app/`, `components/`, `lib/`, or `scripts/`:

- `components/DataTable.tsx`
- `components/EmptyState.tsx`
- `components/ExecutiveCharts.tsx`
- `components/LoadingState.tsx`
- `components/MetricCard.tsx`
- `components/NarrativeTags.tsx`
- `components/PendingApiBadge.tsx`
- `components/PriceChart.tsx`
- `components/ReportCard.tsx`
- `components/ReportSection.tsx`
- `components/RiskDashboard.tsx`
- `components/SettingsBackLink.tsx`
- `components/TickerSearch.tsx`
- `components/VolumeChart.tsx`
- `components/usePublicImportFiles.ts`

**Classification:** **Safe to remove**, subject to a final typecheck after deletion.

These appear to be remnants of earlier dashboard, report, narrative, and loading designs. `ReportSection` is also the name of a type in `lib/types.ts`, but that type does not use the component file.

## Old Import-Data Subsystem

Current portal pages load authenticated APIs. The old local/S3 import-data chain is now isolated:

1. `components/usePublicImportFiles.ts` has no consumers.
2. `app/api/import-data-public-fallback/route.ts` is only used by that unused hook.
3. `lib/import-data.ts` is only imported by that fallback route.
4. `import_data/social/*.json` and `import_data/operations/CURR_hotkeys.json` have no direct runtime references.
5. `lib/page-data-sources.ts` deliberately returns an empty mapping and states that portal datasets use authenticated APIs.

`lib/public-import-data.ts` is still imported by `TickerDataStatusProvider`, but only its API-only no-op status helper is used. Its public-S3 URL/read/head functions are currently unused.

**Recommended cleanup unit:**

- Remove `components/usePublicImportFiles.ts`.
- Remove `app/api/import-data-public-fallback/`.
- Remove `lib/import-data.ts`.
- Remove `import_data/`.
- Simplify `lib/public-import-data.ts` to retain only the status type/helper still required, or fold that helper into `TickerDataStatusProvider`.
- Remove old import-data environment variables and README instructions after verifying production does not rely on the fallback route.

**Safety:** High, but execute as one tested change because the files form a single legacy subsystem.

## Report and PDF Folder Audit

### Keep

`public/report-templates/daily-close/` is runtime-active:

- `client-report-pdf.ts` loads `template.html` and `styles.css`.
- Report Archive references `report-data.json`.

`Report Templates/lean-daily-market-close-report/` is the maintainable report source and backend handoff package. It is not runtime-imported, but it documents and generates the current lean report.

### Archive or Remove

| Path | Reason |
|---|---|
| `Report Templates/archive/comprehensive-daily-close-v2/` | Explicitly archived comprehensive report. Move outside the active repo if Git history is sufficient. |
| `Report Templates/old-files/` | Explicitly obsolete and references old, missing import-data sources. |
| `sample-reports/` | Generated showcase PDFs/previews; not used by the portal. |
| `tmp/pdfs/` | Rendered QA screenshots and text extraction; fully disposable after review. |
| `output/pdf/` | Generated report output; reproducible from the report script. |

After cleanup, ignore `tmp/` and `output/` so generated QA artifacts are not recommitted.

## Data and Documentation Audit

### Current Contracts to Keep

- `INTEGRATION (7).md`
- `DATA_STRUCTURE.md`
- `data_dictionary.md`
- `newest datapoint csv/`
- `docs/LEAN_DAILY_REPORT_API_SPECIFICATION.md`
- `docs/PORTAL_BACKEND_CALCULATED_FORMULAS.md`
- `docs/RULE_CATALOG_SEEDING.md`

These should eventually be organized under versioned `docs/architecture/`, `docs/api/`, and `docs/data/` folders.

### Historical/Incident Documents to Archive

The following are useful records but do not belong at the same level as current specifications:

- `docs/AI_REPORT_API_AUTH_FIX.md`
- `docs/DATE_SPECIFIC_CSV_IMPORT_BACKEND_ISSUE.md`
- `docs/SEC_FILINGS_CSV_IMPORT_BACKEND_ISSUE.md`
- `docs/OWNERSHIP_ENTRY_COMPATIBILITY.md`
- `docs/API_SPEED_AND_PAYLOAD_REPORT.md`
- `CENTRALIZED_V2_GAP_REPORT.md`
- `CENTRALIZED_V2_VALUE_CROSSCHECK_REPORT.md`
- `S3_BROWSER_DATA_ACCESS.md`

Move them to `docs/archive/incidents/` or `docs/archive/audits/`. Do not delete until the backend migration is stable.

### Likely Superseded Data References

These folders are not imported by the frontend:

- `Justin json-file/`
- `export json/`
- `data_mapping_ref/`
- much of `Sample Data/`

They should not remain mixed with active application source indefinitely. The safest approach is:

1. Copy them to an external project archive or backend documentation repository.
2. Retain only a small, anonymized fixture set needed for frontend tests.
3. Remove old vendor/raw data from the frontend repository.

## High-Confidence Cleanup Candidates

These can be removed first with minimal risk:

1. All `.next-build-*` directories.
2. All `.next-stale-*` directories.
3. `.next/` when no local server is running.
4. `tsconfig.tsbuildinfo`.
5. All `.DS_Store` files.
6. Empty directories under `app/` and `data/`.
7. `.pnpm-store/` and its three tracked database files.
8. `tmp/` tracked PDF render artifacts.
9. `output/pdf/currenc-daily-market-close-report-lean-v1.pdf`.
10. The 15 unreferenced components listed above.

Expected immediate recovery is approximately **6 GB** from Next.js snapshots alone, or about **6.4 GB** including reinstallable dependencies and generated report artifacts.

## Items Requiring Confirmation

Do not remove these until the stated question is resolved:

| Item | Confirmation needed |
|---|---|
| `import-template.zip` | Does operations still distribute this exact zip outside the portal? |
| `Report Templates/archive/` | Is Git history enough, or does the team want an in-repo visual archive? |
| `sample-reports/` | Are these still used in demos, presentations, or QA comparisons? |
| `Sample Data/` | Which raw vendor fixtures are still used by backend developers? |
| `data-sync-platform-centralized-v2/` | Is backend migration validation complete? |
| `data_mapping_ref/` | Has the newest data-point CSV fully replaced the old per-page mappings? |
| Development routes | Are direct links/bookmarks still used by internal staff? |
| `app/portal/*` | Are any external login or billing links still pointing to `/portal`? |
| Old import-data subsystem | Has production fully moved social data and hotkeys to authenticated APIs? |

## Recommended Cleanup Sequence

### Phase 1: Generated Artifacts

- Remove `.next`, `.next-build-*`, `.next-stale-*`.
- Remove `tsconfig.tsbuildinfo`, `.DS_Store`, `.pnpm-store`, `tmp/`, and `output/`.
- Add `.pnpm-store/`, `tmp/`, and `output/` to `.gitignore`.
- Rebuild and typecheck.

### Phase 2: Verified Dead Source

- Remove the unreferenced shared components.
- Remove empty route directories.
- Typecheck and run key portal routes.

### Phase 3: Old Import-Data Architecture

- Remove the unused fallback hook, route, local reader, and `import_data/`.
- Simplify public import-status helpers.
- Remove obsolete import-data environment documentation.
- Test user portal, operations portal, social sentiment, notification routing, and update indicators.

### Phase 4: Legacy Routes

- Confirm internal bookmarks.
- Remove retired development routes and their page-specific CSS.
- Remove `/portal` legacy pages if no external URLs use them.
- Retain redirects for one release if desired, then remove them.

### Phase 5: Reference and Documentation Consolidation

- Move current contracts into structured `docs/` subfolders.
- Move incident reports and audits to `docs/archive/`.
- Externalize old vendor samples and generated report previews.
- Keep only small fixtures that support tests or documented examples.
- Rewrite `README.md` for the current API-first architecture.

## Final Recommendation

Start with Phase 1 and Phase 2. They offer the largest clarity and disk-space improvement without changing product behavior.

Treat the reference-data and legacy-route cleanup as a separate reviewed change. Those folders are not needed by the running application, but some may still be organizational dependencies for the backend team, operations staff, demos, or historical comparison.
