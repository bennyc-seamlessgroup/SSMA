# Codex Change Log and Behavior Memory

This file is the persistent implementation memory for changes made by Codex.
Read it before modifying existing portal behavior, and update it after every
completed change.

## Required Entry Format

```text
## YYYY-MM-DD — Short title
- Area:
- APIs/data:
- User-reported problem:
- Root cause:
- Implemented behavior:
- Must preserve:
- Files changed:
- Verification:
- Remaining dependency:
```

## 2026-07-29 — Saved Daily Inputs API response normalization

- Area: Operations Portal → Market Data → Saved Daily Inputs.
- APIs/data:
  - `GET /manual-input/issued-share?ticker={ticker}`
  - `GET /manual-input/utilization?ticker={ticker}`
  - `GET /manual-input/manual-availability?ticker={ticker}`
  - `GET /manual-input/margins?ticker={ticker}`
  - `GET /manual-input/short-score?ticker={ticker}`
- User-reported problem: Values returned by the five APIs appeared as `N/A`.
- Root cause: The frontend assumed one narrow response shape and did not
  consistently unwrap API response envelopes, arrays, or JSON-string bodies.
- Implemented behavior: Manual-input responses support direct arrays and common
  wrappers including `data`, `result`, `record`, `records`, `item`, `items`, and
  `body`. Records are filtered to the selected ticker.
- Must preserve: Fixing one category must not change how records from the other
  four categories are collected or merged.
- Files changed:
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
- Verification: TypeScript type-check and production build passed.
- Remaining dependency: Live values still depend on the authenticated API
  returning the documented business fields.

## 2026-07-29 — Date-correct Issued Share history

- Area: Operations Portal → Market Data → Saved Daily Inputs and date selection.
- APIs/data:
  - `GET /manual-input/issued-share?ticker={ticker}`
  - `GET /manual-input/issued-share?ticker={ticker}&tradeDate={YYYY-MM-DD}`
  - Fields: `tradeDate`, `issuedShare`
- User-reported problem: MIMI's latest value `7,063,506` appeared on dates before
  its effective date.
- Root cause: The frontend reduced the Issued Share response to one latest value
  and copied that value into every historical row.
- Implemented behavior: For a daily row dated `D`, Issued Share is selected from
  the newest effective record whose `tradeDate` is less than or equal to `D`.
  A later value is never propagated backward. Selecting a date requests the
  date-specific Issued Share endpoint.
- Must preserve:
  - MIMI `7,063,506` applies only from its effective date onward.
  - July 13, 2026 and earlier must use the applicable earlier record.
  - A date-less current snapshot must not be copied into historical rows.
  - Issued Share enriches existing daily rows; it must not create standalone
    table rows that obscure other daily metrics.
- Files changed:
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
- Verification: TypeScript type-check and production build passed.
- Remaining dependency: The API must provide dated records to show historical
  values; an undated current-only record cannot safely populate history.

## 2026-07-29 — Restore Utilization after Issued Share fix

- Area: Operations Portal → Market Data → Saved Daily Inputs.
- APIs/data:
  - `GET /manual-input/utilization?ticker={ticker}`
  - Fields: `tradeDate`, `utilizationPercent`
- User-reported problem: Utilization stopped appearing after Issued Share history
  was corrected.
- Root cause: Issued Share effective dates were incorrectly added as standalone
  table rows. Those rows had no same-day Utilization record and displaced the
  actual utilization-backed rows from the visible page.
- Implemented behavior: Saved Daily Inputs rows continue to be created from the
  four daily input categories—Utilization, Availability, Margins, and Short
  Score. Issued Share is joined onto those rows by effective date but does not
  create extra rows.
- Must preserve:
  - Utilization remains the exact `utilizationPercent` for its `tradeDate`.
  - Issued Share uses effective-date matching without affecting row creation.
  - No category may erase values already merged from another category.
- Files changed:
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
  - `AGENTS.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining dependency: None identified.

## 2026-07-29 — Load the newest social-feed JSON edge

- Area: User Portal → Social Sentiment → Sentiment Timeline & Social Feed.
- APIs/data:
  - `GET /social-data?ticker={ticker}&platform={platform}&page=1&limit=10`
  - `GET /social-data?ticker={ticker}&platform={platform}&page={lastPage}&limit=10`
  - Timestamp fields normalized by `normalizeSocialMention`, primarily
    `datetime` and `timestamp`.
- User-reported problem: All, X, Reddit, and Stocktwits did not initially show
  their 10 most recent records.
- Root cause: A previously implemented first-versus-last JSON edge check was
  removed during a later Market Data change. The replacement always trusted API
  page 1, even when a platform's JSON order placed its newest records at the
  opposite end.
- Implemented behavior:
  - Initial loading reads page 1 and the last page, with 10 records per request.
  - The loader compares timestamps at both JSON edges and displays the newer
    edge, sorted newest-first.
  - If the last page is partial, the preceding page is read only to complete the
    last 10 records.
  - Load More proceeds forward from the first edge or backward from the last
    edge, according to the detected direction.
- Must preserve:
  - Initial feed loading must not read every social record.
  - Platform counts remain sourced from pagination totals and do not change when
    switching platform filters.
  - Records remain deduplicated by platform plus stable key or ID.
  - X continues to query the backend as `Twitter`; LinkedIn keeps its supported
    query-name fallback.
  - Consolidated sentiment timeline and KPI data remain independent from the
    paginated social-feed batch.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining dependency: Correct newest-edge selection requires at least one
  valid timestamp on the first or last API page.

## 2026-07-29 — Reduce social-feed edge comparison to one record

- Area: User Portal → Social Sentiment → Sentiment Timeline & Social Feed.
- APIs/data:
  - First-edge probe: `GET /social-data?...&page=1&limit=1`
  - Last-edge probe: `GET /social-data?...&page={totalItems}&limit=1`
  - Selected feed batch: `GET /social-data?...&page={selectedEdge}&limit=10`
- User-reported problem: Reading 10 records from both JSON edges solely to
  determine ordering transferred more data than necessary.
- Root cause: The direction check reused the same 10-record page size as the
  displayed feed batch.
- Implemented behavior:
  - Read one record from the first edge and one from the last edge.
  - Compare those two normalized timestamps.
  - Fetch a 10-record batch only from the edge determined to be newer.
  - When the newer last page is partial, read its preceding 10-record page only
    as needed to complete the displayed last 10 records.
- Must preserve:
  - The default display remains the 10 most recent records, newest-first.
  - Load More continues in the detected forward or reverse direction.
  - Stable counts, deduplication, platform aliases, and consolidated timeline
    behavior documented in the preceding entry remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining dependency: Pagination must report an accurate `totalItems` value so
  the one-record last-edge probe can address the true final record.

## 2026-07-29 — Emphasize ticker in the backend company indicator

- Area: Operations Portal → floating active-company indicator.
- APIs/data:
  - Existing `GET /market-data/current?ticker={ticker}&category=company-profile-current`
  - Display fields: active ticker and `companyName`
- User-reported problem: The longer company name was visually dominant while the
  shorter ticker was displayed as a small badge.
- Root cause: The original typography assigned the large heading style to the
  company name and the compact badge style to the ticker.
- Implemented behavior:
  - The ticker is the primary line at up to 48px with strong weight.
  - The company name is supporting text underneath at 13px.
  - The layout remains readable within the indicator's default and minimum size.
  - Light and dark themes use separate readable ticker and company-name colors.
- Must preserve:
  - The active ticker and company-name API mapping are unchanged.
  - Dragging, resizing, saved window position/size, ticker switching, and
    accessibility labeling remain unchanged.
- Files changed:
  - `app/operations/OperationsCompanyIndicator.tsx`
  - `app/portal-theme.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: Rendered at the default 340×138 size with a 48px ticker and 13px
  company name; TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining dependency: A missing company profile continues to display the
  existing `Company name unavailable` fallback.
