# Cleanup Removal Inventory

**Audit date:** 2026-07-23  
**Purpose:** Identify everything affected by the repository cleanup and distinguish preserved moves from actual removals.

## Recovery Status

All files listed by Git as deleted remain recoverable from repository history. The cleanup has not been committed yet, which also makes restoration straightforward.

Content-hash verification found:

- **228 files preserved byte-for-byte** at reorganized locations.
- **4 active/reference files preserved with intentional edits or regeneration.**
- **59 files intentionally absent** from the current workspace.

## Active Report Status

The lean daily report was not intentionally retired. Its source was renamed and its preview was regenerated:

| Previous path | Current path | Status |
|---|---|---|
| `Report Templates/currenc-closing-digest-report-demo/` | `Report Templates/lean-daily-market-close-report/` | Preserved and renamed |
| `output/pdf/currenc-daily-market-close-report-lean-v1.pdf` | `Report Templates/lean-daily-market-close-report/preview/currenc-daily-market-close-report-lean-v1.pdf` | Regenerated |
| Old comprehensive PDF in the active folder | `Report Templates/archive/comprehensive-daily-close-v2/currenc-post-market-portal-backed-report-playwright.pdf` | Archived |

The live Report Archive renderer remains in `public/report-templates/daily-close/`.

## Preserved and Reorganized

The following groups were moved, not deleted:

| Previous location | Current location | Files |
|---|---|---:|
| Root integration and architecture documents | `docs/api/`, `docs/architecture/`, `docs/data/`, `docs/product/` | 14 |
| Resolved incident and migration reports | `docs/archive/` | 7 |
| `Justin json-file/` | `reference-data/legacy-vendor-json/` | 9 |
| `Sample Data/` | `reference-data/legacy-samples/` | 72 |
| `data-sync-platform-centralized-v2/` | `reference-data/centralized-v2/` | 50 |
| `data_mapping_ref/` | `reference-data/legacy-data-mappings/` | 41 |
| `newest datapoint csv/` | `reference-data/data-point-catalog/` | 2 |
| `export json/` | `reference-data/legacy-json-templates/` | 2 |
| `import-template.zip` | `reference-data/import-templates/` | 1 |
| `sample-reports/` | `Report Templates/archive/sample-reports/` | 13 |
| `Report Templates/old-files/` | `Report Templates/archive/old-files/` | 10 |
| Old sample generator scripts | `Report Templates/archive/sample-report-generators/` | 2 |

`DATA_STRUCTURE.md` is preserved at `docs/architecture/DATA_STRUCTURE.md`; only its references to the old data-folder paths were updated.

## Intentionally Removed Runtime Code

These files had no references from the current application at cleanup time:

### Retired import-data fallback

- `app/api/import-data-public-fallback/route.ts`
- `components/usePublicImportFiles.ts`
- `lib/import-data.ts`
- `lib/public-import-data.ts`

The current portal uses authenticated APIs instead of the previous local/public-S3 fallback chain.

### Unreferenced shared components

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

### Superseded alert implementation

- `lib/alerts/customAlertRules.ts`

The active implementation uses the rule-catalog API module instead.

## Intentionally Removed Local Fallback Data

These files were removed with the legacy `import_data/` folder:

- `import_data/operations/CURR_hotkeys.json`
- `import_data/social/reddit_CURR_mentions.json`
- `import_data/social/stocktwits_CURR_mentions.json`
- `import_data/social/x_CURR_mentions.json`

They were local fallback fixtures, not the current API data source. Copies of related centralized/manual-input examples remain under `reference-data/centralized-v2/`.

## Generated Files Removed

These files are reproducible and are not product source:

### Package/build caches

- `.pnpm-store/v11/index.db`
- `.pnpm-store/v11/index.db-shm`
- `.pnpm-store/v11/index.db-wal`
- Previous `.next/` output
- `.next-build-*` snapshots
- `.next-stale-*` snapshots
- `tsconfig.tsbuildinfo`

`node_modules/` was removed during cleanup and subsequently restored with the package lock.

### PDF visual-QA output

The following generated render sets were removed from `tmp/pdfs/`:

- `archive-download/` - 7 page images
- `archive-fixed/` - 7 page images
- `daily-close-v2/` - 7 page images, one focused page image, and one text extract
- `lean-v1/` - 4 page images
- `lean-v1-revised/` - 5 page images
- `report-page4-layout/` - 1 page image

These were screenshots used while checking PDF layout. The underlying report templates and archived PDFs are retained.

### Other generated or empty items

- Old generated `output/pdf/` report output; the current lean preview has been regenerated inside the active report folder.
- macOS `.DS_Store` metadata where removed.
- Empty local directories that are not tracked by Git.

## Not Removed

The following core areas remain:

- `app/` active user and operations routes
- `components/` currently referenced shared UI
- `lib/` active API, authentication, cache, report, and domain logic
- `public/` logos and live report runtime assets
- `scripts/` active utilities
- `Report Templates/lean-daily-market-close-report/`
- `Report Templates/archive/`
- `docs/`
- `reference-data/`
- `package.json` and `package-lock.json`
- `.env.local`

## Restoration Policy

No additional source or reference file should be permanently removed until:

1. It is listed in this inventory.
2. Its current runtime references have been checked.
3. A typecheck and production build pass.
4. Any historical value is preserved under `docs/archive/`, `reference-data/`, or `Report Templates/archive/`.

Any tracked file in this inventory can be restored from Git history if it is needed later.
