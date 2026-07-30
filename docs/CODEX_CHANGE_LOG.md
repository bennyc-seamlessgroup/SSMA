# Codex Change Log and Behavior Memory

This file is the persistent implementation memory for changes made by Codex.
Read it before modifying existing portal behavior, and update it after every
completed change.

## 2026-07-30 — Add consolidation verification to Data Import and Market Data

- Areas:
  - Operations Portal → Social Data Upload.
  - Operations Portal → Data Import.
  - Operations Portal → Market Data.
- APIs/data:
  - Existing trigger: `POST /manual-input/consolidate?ticker={ticker}`.
  - Data Import verification uses the consolidated current/history category
    associated with the selected import category.
  - Market Data verification uses
    `GET /market-data/current?category=market-current` and
    `GET /market-data/history?category=market-history`.
- User-requested changes:
  - Remove the duplicate status message directly below the Social Data
    `Run consolidation` button.
  - Add Social Data's wait-and-check behavior to Data Import and Market Data
    without changing their existing working import/save/consolidation logic.
- Implemented behavior:
  - Social Data retains the single page-level success/error message and no
    longer repeats it beneath the button.
  - Data Import captures the relevant consolidated output before its existing
    trigger, then polls every ten seconds for up to five minutes.
  - Market Data performs the same verification after its existing
    save-and-trigger and delete-and-trigger flows.
  - Progress messages show elapsed waiting time.
  - A changed consolidated payload produces a confirmed-success message.
  - If all expected outputs are available but unchanged after five minutes,
    the message explains that output may already be current and avoids claiming
    independent job completion.
  - Missing expected outputs produce an error message.
  - Verification summaries are included in the existing development-data
    diagnostics.
- Must preserve:
  - Existing CSV import validation, generated-path checks, raw follow-up GET,
    request payloads, and explicit Data Import consolidation button.
  - Existing Market Data field validation, manual-input saves, deletion flow,
    publication readiness, and consolidation trigger.
  - No accepted trigger response is treated as proof of asynchronous
    completion.
- Files changed:
  - `lib/consolidation-verification.ts`
  - `app/operations/narrative-social/NarrativeSocialUploadClient.tsx`
  - `app/operations/data-import/ManualDataImportClient.tsx`
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build.
- Remaining dependency: The backend still has no documented consolidation job
  completion endpoint, so an idempotent successful run cannot be distinguished
  conclusively from an accepted job that later fails without changing output.

## 2026-07-30 — Make social consolidation confirmation platform-neutral

- Area: Operations Portal → Narrative & Social Upload → Run consolidation.
- APIs/data:
  - Trigger: `POST /manual-input/consolidate?ticker={ticker}`.
  - Verification:
    `GET /market-data/current?category=sentiment-current` and
    `GET /market-data/history?category=sentiment-events`.
- Reported problem: The general consolidation confirmation described the
  current MIMI LinkedIn incident, including the LinkedIn count, even though the
  control consolidates all social platforms and must work for every ticker.
- Root cause: Success and unchanged-output handling used a LinkedIn-specific
  count as its deciding condition and included that incident-specific result in
  the user message.
- Implemented behavior:
  - Changed-output success now reports only that consolidation output was
    confirmed for the selected ticker.
  - Unchanged-output handling checks that both consolidated sentiment outputs
    are available, without inspecting any platform-specific count.
  - The five-minute unchanged-output message now states generically that the
    current output may already be current and that the API has no completion
    status for the specific run.
  - The error state is reserved for cases where one or both expected
    consolidated outputs are unavailable after the verification window.
- Must preserve:
  - Five-minute uncached verification.
  - Consolidated-data-only portal values.
  - No claim that an accepted trigger independently proves asynchronous job
    completion.
- Files changed:
  - `app/operations/narrative-social/NarrativeSocialUploadClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build.
- Remaining dependency: A backend consolidation job-status endpoint would
  allow the UI to distinguish an idempotent successful run from an accepted job
  that later failed.

## 2026-07-30 — Extend social consolidation verification to five minutes

- Area: Operations Portal → Narrative & Social Upload → Run consolidation.
- APIs/data:
  - Trigger: `POST /manual-input/consolidate?ticker={ticker}` with a
    ticker-only request body.
  - Verification:
    `GET /market-data/current?category=sentiment-current` and
    `GET /market-data/history?category=sentiment-events`.
- Reported problem: Backend reported successful direct API consolidation, but
  the Operations Portal still reported no consolidated output change after its
  two-minute verification window.
- Clarifications:
  - The frontend does not send `input_type: "issued-share"`.
  - Backend clarified that older documentation showing that field was an
    example, not the actual request contract.
  - An accepted asynchronous trigger response is not a completion signal.
- Implemented behavior:
  - Poll fresh consolidated sentiment output every ten seconds for up to five
    minutes.
  - Continue confirming completion immediately when either consolidated payload
    changes.
  - If the payload remains identical but consolidated 1Y LinkedIn is already
    nonzero, report that the data is already current while clearly stating that
    this particular run cannot be independently confirmed.
  - If both payloads remain identical and LinkedIn remains zero after five
    minutes, identify the exact MIMI output categories the backend must verify.
- Must preserve:
  - Consolidated-only platform counts and timeline.
  - Uncached verification requests.
  - No claim of job completion based only on the trigger's HTTP 200 response.
- Files changed:
  - `app/operations/narrative-social/NarrativeSocialUploadClient.tsx`
  - `docs/INTEGRATION (7).md`
  - `docs/api/SOCIAL_DATA_MANUAL_CONSOLIDATION_HANDOFF.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build.
- Remaining dependency: The API still has no documented consolidation job
  status endpoint. Backend tests must verify the published `sentiment-current`
  and `sentiment-events` outputs, not only the accepted trigger response.

## 2026-07-30 — Confirm MIMI social consolidation remains a backend no-op

- Area: Operations Portal → Narrative & Social Upload → Run consolidation.
- APIs/data:
  - Trigger: `POST /manual-input/consolidate?ticker=MIMI`.
  - Verification:
    `GET /market-data/current?ticker=MIMI&category=sentiment-current` and
    `GET /market-data/history?ticker=MIMI&category=sentiment-events`.
- Reported problem: After the backend `LinkedIn`/`linkedIn` capitalization issue
  was identified, Operations retriggered consolidation. The trigger was
  accepted, but neither consolidated response changed within two minutes.
- Confirmed diagnosis:
  - The verifier uses uncached GET requests and the POST clears the frontend
    response cache, so this is not a stale frontend response.
  - Frontend platform normalization is case-insensitive and treats `LinkedIn`,
    `linkedIn`, and `Linkedin` as the same platform.
  - The backend trigger still produced no observable consolidated sentiment
    output.
- Backend checks required:
  - Confirm the capitalization fix is deployed in the Lambda/environment
    invoked by the endpoint.
  - Confirm the hardcoded `input_type: "issued-share"` invocation runs social
    consolidation.
  - Confirm the backend-calculated recent `rebuild_from_date` includes the raw
    LinkedIn record's effective date.
- Must preserve:
  - Do not substitute raw `/social-data` records for consolidated sentiment.
  - Do not describe an accepted asynchronous trigger as completed
    consolidation without changed output or a backend completion status.
- Files changed:
  - `docs/api/SOCIAL_DATA_MANUAL_CONSOLIDATION_HANDOFF.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: Reviewed the uncached authenticated-fetch implementation, the
  consolidation polling flow, frontend case normalization, and the current
  integration contract.
- Remaining dependency: Backend must expose a working social rebuild through
  the manual consolidation action and preferably provide job completion/error
  status.

## 2026-07-30 — Document MIMI LinkedIn manual-consolidation gap

- Area: Backend handoff for Operations Portal → Narrative & Social Upload and
  User Portal → Social Sentiment.
- APIs/data:
  - Raw source: `GET /social-data?ticker=MIMI&platform=LinkedIn`.
  - Trigger: `POST /manual-input/consolidate?ticker=MIMI`.
  - Outputs: `GET /market-data/current?category=sentiment-current` and
    `GET /market-data/history?category=sentiment-events`.
- Reported problem: MIMI has one automatically collected LinkedIn source
  record, but both consolidated sentiment outputs remain unchanged and report
  LinkedIn as zero after Operations manually triggers consolidation.
- Root cause status: Backend investigation required. The documented trigger
  hardcodes `input_type: "issued-share"` and does not document whether the
  invoked job rebuilds social sentiment.
- Documented intended behavior:
  - Automatic LinkedIn collection writes the raw record without a CSV upload.
  - Operations manually triggers consolidation.
  - That manual action must include all raw MIMI social platforms and rebuild
    both consolidated sentiment outputs.
- Must preserve:
  - No new LinkedIn CSV is required.
  - Raw `/social-data` records must not substitute for consolidated platform
    counts or timeline data in the user portal.
- Files changed:
  - `docs/api/SOCIAL_DATA_MANUAL_CONSOLIDATION_HANDOFF.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: Cross-checked the handoff against the social-data,
  social-import progress, market-data current/history, and manual consolidation
  contracts in `docs/INTEGRATION (7).md`.
- Remaining dependency: Backend must confirm or implement the social
  consolidation path and provide a completion/error status mechanism if one is
  available.

## 2026-07-30 — Verify social consolidation output after triggering

- Area: Operations Portal → Narrative & Social Upload → Run consolidation.
- APIs/data:
  - Trigger: `POST /manual-input/consolidate?ticker={ticker}`.
  - Verification:
    `GET /market-data/current?ticker={ticker}&category=sentiment-current` and
    `GET /market-data/history?ticker={ticker}&category=sentiment-events`.
- User-reported problem: After clicking Run consolidation and waiting two
  minutes, LinkedIn remained zero and the portal did not indicate whether
  consolidation had actually completed.
- Root cause:
  - The documented consolidation endpoint is asynchronous and has no job
    status endpoint.
  - The operations page treated the trigger's immediate 200 response as its
    final success state without checking consolidated output.
  - A user who opened Social Sentiment before backend completion could also
    retain cached consolidated responses until the normal status poll detected
    a version change.
- Implemented behavior:
  - Capture the uncached consolidated sentiment snapshot before triggering.
  - After the trigger is accepted, poll both consolidated sentiment APIs every
    five seconds for up to two minutes.
  - Show elapsed waiting time while verification is running.
  - When output changes, report whether consolidated 1Y LinkedIn is now
    nonzero.
  - If output changes but LinkedIn remains zero, report that the backend
    consolidator omitted the source record.
  - If neither consolidated payload changes within two minutes, report that
    completion was not confirmed rather than claiming success.
  - On confirmation, invalidate current/history response caches and dispatch
    the portal data-update event.
- Must preserve:
  - Platform counts and timelines remain consolidated-data-only.
  - A successful trigger response alone is not described as completed
    consolidation.
  - Raw `/social-data` records never substitute for consolidated output.
  - Existing social import-job polling remains independent.
- Files changed:
  - `app/operations/narrative-social/NarrativeSocialUploadClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining dependency: There is no backend consolidation status API. If the
  trigger is accepted but consolidated output does not change, the frontend
  can diagnose the result but cannot repair the consolidator Lambda.

## 2026-07-30 — Revert LinkedIn catalog fallback; consolidated data only

- Area: User Portal → Social Sentiment → platform buttons and timeline.
- APIs/data:
  - Counts and timeline use only
    `GET /market-data/current?ticker={ticker}&category=sentiment-current` and
    `GET /market-data/history?ticker={ticker}&category=sentiment-events`.
  - `GET /social-data?date={YYYY-MM-DD}` remains limited to feed-card display.
- User correction: A source LinkedIn post must not appear in platform counts or
  timeline analysis until the data has been imported and consolidated.
- Reverted behavior:
  - Removed platform catalog count probes using
    `GET /social-data?platform={platform}&page=1&limit=1`.
  - Removed `/social-data` records from the 1Y timeline fallback.
  - Removed reconciliation that increased All to the sum of source catalog
    fallbacks.
- Intended behavior:
  - If consolidated data reports LinkedIn as zero, the platform button and
    timeline remain zero even when an unconsolidated source post exists.
  - After import and consolidation update `sentiment-current` or
    `sentiment-events`, LinkedIn appears through the normal consolidated path.
- Must preserve:
  - Source feed cards remain controlled by the daily feed calendar.
  - Source feed availability never changes consolidated KPI, platform, or
    timeline values.
  - The preceding “Restore missing LinkedIn social catalog fallback” entry is
    explicitly superseded and must not be reintroduced.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining dependency: The backend consolidation must include the LinkedIn
  record before the consolidated UI will show it.

## 2026-07-30 — Restore missing LinkedIn social catalog fallback

- Area: User Portal → Social Sentiment → platform buttons and timeline.
- APIs/data:
  - Primary timeframe counts remain from
    `GET /market-data/current?ticker={ticker}&category=sentiment-current` and
    `GET /market-data/history?ticker={ticker}&category=sentiment-events`.
  - Fallback catalog count and latest record use
    `GET /social-data?ticker={ticker}&platform={platform}&page=1&limit=1`.
- User-reported problem: LinkedIn displayed zero even though `/social-data`
  reported one LinkedIn post.
- Root cause: After platform counts were moved to consolidated timeframe data,
  the earlier social catalog fallback was removed. CURR's consolidated
  sentiment payload omitted LinkedIn while the source social catalog retained
  one record.
- Implemented behavior:
  - Consolidated nonzero platform counts remain authoritative.
  - For the 1Y view only, a platform whose consolidated and event counts are
    both zero may fall back to its `/social-data` pagination total when the
    latest catalog record falls inside the selected one-year window.
  - The latest catalog records supplement the 1Y event fallback, allowing the
    missing LinkedIn platform timeline to render.
  - The All badge is at least the sum of the displayed platform badges.
- Must preserve:
  - X, Reddit, Stocktwits, and other nonzero timeframe counts must not be
    replaced by larger all-catalog totals.
  - Shorter 1D/1W/1M/6M counts remain strictly tied to their consolidated or
    event windows.
  - Feed cards remain controlled by the separate daily calendar range.
  - LinkedIn retains its `LinkedIn`/`Linkedin` query-name fallback.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining dependency: The backend should ultimately include LinkedIn in
  consolidated sentiment periods so the catalog fallback is unnecessary.

## 2026-07-30 — Clarify Lending Market Snapshot comparison dates

- Area: User Portal → Lending Pressure → Lending Market Snapshot.
- APIs/data: `GET /market-data/history?ticker={ticker}&category=market-history`
- User-reported problem: Snapshot cards always displayed an explicit prior
  date, even when that baseline was simply yesterday.
- Root cause: The shared Lending Market Snapshot metric formatter did not
  distinguish the preceding calendar day from an older latest-available
  observation.
- Implemented behavior:
  - Utilization, Borrow Fee, Shortable Shares, and Average Duration display
    `vs yesterday` when their comparison observation is exactly one calendar
    day earlier.
  - If the prior valid observation is older, the metric displays its actual
    date.
- Must preserve:
  - Each metric continues to use its own latest two valid observations.
  - Missing dates are not zero-filled and do not create false changes.
- Files changed:
  - `app/monitor/[ticker]/lending-pressure/LendingPressureBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check and whitespace validation passed.
- Remaining dependency: None identified.

## 2026-07-30 — Label social-feed times with the selected timezone

- Area: User Portal → Social Sentiment → feed cards and Development Data.
- APIs/data:
  - Social post `datetime` or normalized timestamp from `GET /social-data`.
  - Selected portal timezone from General Settings.
- User-reported problem: Feed timestamps appeared to remain in US time and did
  not make clear whether the portal timezone preference had been applied.
- Root cause: Feed timestamps were converted with the selected portal timezone
  but displayed only month, day, and clock time, without a timezone marker.
- Implemented behavior:
  - Feed timestamps continue to convert from the API instant into the selected
    portal timezone.
  - Each timestamp now includes the selected zone's timestamp-specific short
    name, such as `GMT+8`, `EDT`, or `UTC`.
  - Changing the General Settings timezone immediately reformats the feed
    timestamps.
- Must preserve:
  - The underlying API timestamp remains unchanged.
  - Valid API timezone offsets and `Z` timestamps are respected before display
    conversion.
  - Feed ordering continues to use the normalized absolute timestamp.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, production
  build, and timezone conversion checks for Hong Kong, New York, and UTC
  passed.
- Remaining dependency: API timestamps without `Z` or an explicit UTC offset
  are inherently ambiguous; the documented `/social-data` contract provides
  UTC `datetime` values.

## 2026-07-30 — Show selected timezone beside sentiment Last Update

- Area: User Portal → Social Sentiment → top-bar Last Update.
- APIs/data:
  - Existing Social Sentiment `updatedAt` status assembled from
    `GET /market-data/current?category=sentiment-current`,
    `GET /market-data/history?category=sentiment-events`, and the latest
    `GET /social-data` record.
  - Selected portal timezone from General Settings.
- User-reported problem: The Last Update timestamp was converted into the
  selected timezone, but the page did not identify which timezone was being
  displayed.
- Root cause: The shared top bar formatted the timestamp with the timezone
  preference but rendered only the resulting date and time.
- Implemented behavior:
  - Social Sentiment appends the exact selected IANA timezone and the
    timestamp-specific short timezone name, for example
    `Asia/Hong Kong (GMT+8)`.
  - The short name is calculated at the update timestamp, so zones with
    daylight-saving time show the correct seasonal abbreviation.
  - Other pages retain their existing status formats.
- Must preserve:
  - Changing the timezone in General Settings immediately updates both the
    displayed time and timezone suffix.
  - The underlying API timestamp is not changed.
  - Data-as-of and latest-filing pages do not gain this Last Update suffix.
- Files changed:
  - `components/DesignBTopbar.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, production
  build, and timezone label checks for Hong Kong, New York, and UTC passed.
- Remaining dependency: None identified.

## 2026-07-30 — Plot sentiment timeline bars as feed volume

- Area: User Portal → Social Sentiment → Sentiment Timeline & Social Feed.
- APIs/data:
  - Bucket `mentions` and `sentimentScore` from the selected period in
    `GET /market-data/current?ticker={ticker}&category=sentiment-current`.
- User-reported problem: Selecting Stocktwits showed `Stocktwits (70)`, while
  a timeline bar appeared to exceed 70 and its tooltip displayed 91.
- Root cause:
  - The visible bars used `sentimentScore` on a fixed 0–100 axis, while the
    platform button displayed feed count. The two different measurements were
    presented without making that distinction clear.
  - Tooltip rows without a color marker still used a three-column grid
    reserved for the highlighted row, causing their labels and values to
    overlap.
- Implemented behavior:
  - Bar height now represents the bucket's mention count.
  - The vertical axis dynamically scales to the highest bucket mention count
    using integer ticks.
  - The highlighted tooltip row displays the same mention count represented by
    the bar.
  - Sentiment score remains available as a separately labeled tooltip value.
  - Tooltip metric rows use a two-column label/value layout and no longer
    overlap.
- Must preserve:
  - Non-overlapping bucket mention counts cannot individually exceed the
    selected platform's timeframe total.
  - Sentiment score remains a 0–100 analytical metric but is not used as bar
    height.
  - Timeline platform and timeframe filtering remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentTimeline.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining dependency: Correct volume bars require backend bucket `mentions`
  values to be non-cumulative and aligned with the selected timeframe.

## 2026-07-30 — Prevent duplicate sentiment timeline totals

- Area: User Portal → Social Sentiment → Sentiment Timeline & Social Feed.
- APIs/data:
  - Timeline and total counts from the selected period in
    `GET /market-data/current?ticker={ticker}&category=sentiment-current`.
- User-reported problem: CURR displayed `All (172)`, but the mention counts
  across the timeline bars added up to more than 172.
- Root cause:
  - For All, the chart aggregated every backend timeline row even when the
    payload contained both an overall row and per-platform rows for the same
    bucket.
  - Generic platform normalization treated unrecognized labels such as `All`
    as Reddit, which could also contaminate the Reddit series.
- Implemented behavior:
  - Backend timeline platform labels are classified explicitly.
  - When overall timeline rows are present, the All series uses only those
    rows.
  - When overall rows are absent, the All series is calculated by summing the
    recognized per-platform rows.
  - Individual platform series exclude overall and unknown rows.
  - A platform without matching backend timeline rows falls back to
    sentiment-event aggregation.
- Must preserve:
  - Platform button counts and timeline bars follow the same selected
    1D/1W/1M/6M/1Y period.
  - Feed calendar dates remain independent from timeline aggregation.
  - No synthetic scaling or zero-filled mentions are introduced.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining dependency: The backend overall timeline rows must represent
  non-overlapping bucket counts rather than cumulative counts.

## 2026-07-30 — Separate sentiment timeframe counts from feed dates

- Area: User Portal → Social Sentiment → Sentiment Timeline & Social Feed.
- APIs/data:
  - Platform button counts use the selected period from
    `GET /market-data/current?ticker={ticker}&category=sentiment-current`.
  - Feed cards continue using
    `GET /social-data?ticker={ticker}&date={YYYY-MM-DD}&sort=datetime&order=desc`.
- User-reported problem:
  - Platform button counts incorrectly followed the feed calendar range
    instead of the top-right 1D/1W/1M/6M/1Y selector.
  - Calendar changes required an Apply button.
  - There was no way to extend the initially loaded daily feed range.
- Root cause:
  - The platform buttons reused totals calculated from the daily social-feed
    API responses.
  - Date inputs were implemented as draft values requiring explicit
    submission, and pagination had been removed without a daily replacement.
- Implemented behavior:
  - All and per-platform button counts use the active consolidated sentiment
    timeframe, falling back to the matching sentiment-event window.
  - From and To calendar selections take effect immediately.
  - Both calendars are restricted to today through one year ago.
  - A See more button extends the From date by seven earlier calendar days,
    stopping at the one-year boundary.
- Must preserve:
  - The calendar date range controls feed cards, not the platform count
    timeframe.
  - The sentiment selector continues filtering already-loaded feed cards.
  - Daily feed requests omit `limit` and `page`.
  - Consolidated timeline and KPI data remain independent from daily feed
    retrieval.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `app/monitor/[ticker]/sentiment/MentionFeedCards.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining dependency: Accurate platform counts require the consolidated
  sentiment response to provide per-platform counts for each supported
  timeframe, or sufficient sentiment-event rows for the frontend fallback.

## 2026-07-30 — Clarify Short Interest daily baselines and table alignment

- Area: User Portal → Short Interest → Key Short Metrics and Market Data
  Tables.
- APIs/data:
  - `GET /market-data/history?ticker={ticker}&category=market-history`
  - `GET /market-data/history?ticker={ticker}&category=short-volume-history`
  - `GET /market-data/history?ticker={ticker}&category=ftd-history`
- User-reported problem:
  - Borrow Fee and Utilization always displayed an explicit comparison date,
    even when that date was simply yesterday.
  - Short Volume and Fails-to-Deliver table headings and values used mixed
    alignment.
- Root cause:
  - Comparison labels formatted every baseline as a date without testing
    whether it was the preceding calendar day.
  - Base table CSS left-aligned all cells and selectively overrode numeric
    cells only.
- Implemented behavior:
  - Borrow Fee and Utilization display `vs yesterday` when their baseline is
    exactly one calendar day before the current observation.
  - When the nearest earlier observation is older, its actual date is shown.
  - Short Volume and Fails-to-Deliver column headings and data cells are
    consistently right-aligned.
- Must preserve:
  - Comparisons continue to use the latest valid earlier observation rather
    than zero-filling missing dates.
  - Both tables remain newest-first, date-range filterable, and paginated.
- Files changed:
  - `app/monitor/[ticker]/short-interest/ShortInterestBrowserPage.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check and whitespace validation passed.
- Remaining dependency: None identified.

## 2026-07-30 — Decimal Short Score and fixed dashboard daily comparisons

- Area:
  - Operations Portal → Market Data → Daily Market Inputs and Saved Daily
    Inputs.
  - User Portal → Dashboard → Market Overview.
  - User Portal → Short Interest and generated daily report.
- APIs/data:
  - `GET/POST/PUT /manual-input/short-score?ticker={ticker}&tradeDate={date}`
  - `GET /market-data/history?ticker={ticker}&category=market-history`
- User-reported problem:
  - The backend now accepts Short Score as a floating-point value, while the
    portal still required and displayed an integer.
  - Dashboard overview cards exposed a multi-period selector and mixed
    API-provided changes with locally selected comparison periods.
- Root cause:
  - Short Score validation, input stepping, and display formatting were based
    on the previous integer API contract.
  - Dashboard KPI state retained the earlier configurable comparison design.
- Implemented behavior:
  - Short Score accepts values from 0 through 100 with up to two decimal
    places, is rounded to two decimals before submission, and is displayed with
    exactly two decimals in the form, preview, Saved Daily Inputs, Short
    Interest score card, and daily report.
  - The Dashboard Market Overview timeframe selector is removed.
  - Each overview KPI uses its latest valid observation and compares it with
    the valid observation on the preceding calendar day.
  - If that preceding day has no valid value for the metric, the closest
    earlier valid observation is used and its actual date is displayed.
  - The independent timeframe selectors on all dashboard trend charts remain
    unchanged.
- Replaces:
  - The earlier Short Score integer-only requirement is superseded by the
    user-confirmed backend floating-point contract.
  - The configurable Dashboard Market Overview comparison period is
    intentionally replaced by a fixed daily comparison.
- Must preserve:
  - A missing prior observation must display no baseline rather than inventing
    a zero value.
  - Sparse metrics continue to select their latest valid values independently.
  - Dashboard trend charts retain their own timeframe state and controls.
- Files changed:
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
  - `app/monitor/[ticker]/dashboard/DashboardKpis.tsx`
  - `app/monitor/[ticker]/dashboard/DashboardClient.tsx`
  - `app/monitor/[ticker]/dashboard/DashboardBrowserPage.tsx`
  - `app/monitor/[ticker]/short-interest/ShortInterestBrowserPage.tsx`
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check and whitespace validation passed.
- Remaining dependency: The checked-in `docs/INTEGRATION (7).md` still
  describes `shortScore` as an integer and should be refreshed from the latest
  backend contract.

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

## 2026-07-30 — Load social feeds by selected calendar dates

- Area: User Portal → Social Sentiment → Sentiment Timeline & Social Feed.
- APIs/data:
  - `GET /social-data?ticker={ticker}&date={YYYY-MM-DD}&sort=datetime&order=desc`
  - Under the updated contract, `date` causes the API to ignore `limit` and
    `page` and return all records matching that calendar day.
- User-reported problem: The feed still loaded fixed 10-record pages even
  though the updated API now supports complete daily feed retrieval. The feed
  controls also lacked a date range selector.
- Root cause: The frontend implemented the preceding pagination contract and
  had not yet adopted the new `date` query parameter.
- Implemented behavior:
  - The default feed range is today plus the preceding six calendar days.
  - From and To date selectors appear before the sentiment selector, with an
    Apply action.
  - Each selected calendar day is requested separately using `date`; neither
    `limit` nor `page` is sent for daily requests.
  - Daily responses are merged newest-day first and duplicate records are
    removed using the existing stable identity.
  - Platform tabs filter the loaded daily records locally, and their counts
    represent the complete selected date range.
  - Search Posts and Load More were removed.
- Replaces:
  - The 2026-07-30 fixed 10-record pagination behavior is intentionally
    superseded by the new daily API contract.
- Must preserve:
  - The API controls chronological order within each daily response through
    `sort=datetime&order=desc`.
  - X records continue to normalize to the X platform label.
  - Consolidated sentiment timeline and KPI data remain independent from the
    selected daily social-feed range.
  - Record deduplication remains platform plus stable key or ID.
- Files changed:
  - `lib/social-data-api.ts`
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `app/monitor/[ticker]/sentiment/MentionFeedCards.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining dependency: The API exposes a single-day `date` parameter rather
  than native `startDate` and `endDate` parameters, so a multi-day UI range
  requires one API request per calendar day.

## 2026-07-30 — Delegate social-feed sequence and page size to the API

- Area: User Portal → Social Sentiment → Sentiment Timeline & Social Feed.
- APIs/data:
  - `GET /social-data?ticker={ticker}&platform={platform}&page=1&limit=10&sort=datetime&order=desc`
  - Subsequent pages use the same `limit`, `sort`, and `order` and follow the
    response pagination fields `page` and `hasNextPage`.
- User-reported problem: The X feed showed a July 29 record first but an old
  February 9 record second instead of the next-most-recent post.
- Root cause: The frontend still used the earlier first-edge/last-edge probing
  workaround. When it selected the last edge, it could merge two end pages and
  sort only that incomplete subset; this did not match the backend's newly
  supported chronological pagination contract.
- Implemented behavior:
  - Initial feed requests page 1 with `limit=10`, `sort=datetime`, and
    `order=desc`.
  - The API response order is preserved for the default Newest view.
  - Load More requests the next API page and uses `hasNextPage` to decide
    whether another page is available.
  - The All feed preserves the cross-platform order returned by the API rather
    than regrouping records by platform.
  - Frontend edge probing, reverse paging, partial-page merging, and feed
    buffering were removed.
- Must preserve:
  - Exactly 10 records are requested per visible feed page.
  - Platform counts remain sourced from pagination totals and do not change
    when switching filters.
  - Records remain deduplicated by platform plus stable key or ID.
  - X continues to query the backend as `Twitter`; LinkedIn retains its
    supported query-name fallback.
  - Consolidated sentiment timeline and KPI data remain independent from the
    paginated social-feed batch.
- Files changed:
  - `lib/social-data-api.ts`
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `app/monitor/[ticker]/sentiment/MentionFeedCards.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining dependency: Correct feed order now depends on `GET /social-data`
  honoring `sort=datetime&order=desc` as documented. A live authenticated API
  response was not available in this task session.

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

## 2026-07-29 — Exact-date, lazy-loaded Market Data inputs

- Area: Operations Portal → Market Data → Daily Market Inputs and Saved Daily
  Inputs.
- This entry supersedes the earlier 2026-07-29 Issued Share and Utilization
  entries that described unfiltered category reads or effective-date
  propagation.
- Exact-date read APIs:
  - `GET /manual-input/issued-share?ticker={ticker}&tradeDate={YYYY-MM-DD}`
  - `GET /manual-input/utilization?ticker={ticker}&tradeDate={YYYY-MM-DD}`
  - `GET /manual-input/manual-availability?ticker={ticker}&tradeDate={YYYY-MM-DD}`
  - `GET /manual-input/margins?ticker={ticker}&tradeDate={YYYY-MM-DD}`
  - `GET /manual-input/short-score?ticker={ticker}&tradeDate={YYYY-MM-DD}`
- Field ownership:
  - Issued Share comes only from `issued-share`.
  - Utilization comes only from `utilization`.
  - IBKR and Futu Shortable Shares come only from `manual-availability`.
  - IBKR/Futu Initial Margin, Maintenance Margin, and Average Duration come
    only from `margins`.
  - Short Score comes only from `short-score`.
- Implemented behavior:
  - The selected input date loads all five exact-date endpoints.
  - The Saved Daily Inputs table uses consolidated
    `GET /market-data/history?ticker={ticker}&category=market-history` only as
    its available-date index and publication-readiness context.
  - Only the ten dates visible on the current table page load their five
    exact-date manual-input records.
  - Changing table pages lazily loads the newly visible dates.
  - Missing exact-date values display `N/A`; values are never inherited,
    backfilled, or copied from another date.
  - The form and table do not use consolidated Market History as the source of
    displayed manual-input values.
  - Unfiltered manual-input reads without `tradeDate` were removed from this
    page.
  - Save and delete requests for all date-specific categories include the
    selected `tradeDate`.
- Performance:
  - Startup no longer downloads the full history of five manual-input
    categories.
  - The unused Market Current request was removed from this operations page.
  - Market History remains a single full response because its documented API
    currently provides no pagination parameters.
- Files changed:
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and local route
  response passed.
- Must preserve:
  - Never restore `/manual-input/{category}?ticker={ticker}` unfiltered reads
    for the five daily input categories on this page.
  - Never use effective-date propagation for Issued Share in the operations
    input form or Saved Daily Inputs table.
  - If backend pagination is later added to Market History, replace the full
    date-index response with server-side paging without changing the exact-date
    manual-input source rules.

## 2026-07-30 — Blank Market Data entry form and consistent numeric precision

- Area: Operations Portal → Market Data → Daily Market Inputs, Preview, and
  Saved Daily Inputs.
- API contract checked:
  - `short-score` defines `shortScore` as an integer.
  - All daily values continue to use the exact-date `/manual-input/{category}`
    endpoints documented in the preceding entry.
- Implemented behavior:
  - Initial page load and ordinary trade-date selection leave every business
    input blank.
  - Existing exact-date values are not inserted into input controls merely by
    viewing a date.
  - Clicking `Edit Record` explicitly loads the selected date's exact saved
    values into the form.
  - Cancelling edit returns the form to a blank, non-editing state.
  - Cached exact-date values continue to support publication readiness and
    existing-record detection even while the form is blank.
  - A date with unconsolidated exact manual data is still recognized as an
    existing record, preventing an accidental blind overwrite.
  - Short Score accepts only an integer from 0 through 100, matching the API
    contract. Save is blocked with a clear message for decimals or out-of-range
    values.
  - Saved Daily Inputs displays float values with two decimal places:
    Utilization, all margin percentages, and Average Duration.
  - Integer fields remain integer-formatted: Issued Share, IBKR/Futu Shortable
    Shares, and Short Score.
- Must preserve:
  - Do not restore automatic input prefill on page load or ordinary date
    selection.
  - Do not convert Short Score to a floating-point field unless the backend API
    contract is changed first.
  - Editing an existing record must still populate exact-date values after the
    operator explicitly clicks Edit Record.
- Files changed:
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check and whitespace validation passed.
- Remaining dependency: None identified.

## 2026-07-29 — Center and scale the backend company indicator

- Area: Operations Portal → floating active-company indicator.
- APIs/data: No API or data-mapping changes.
- User-reported problem: The ticker and company name were left-aligned, and
  enlarging the floating window did not enlarge its typography.
- Root cause: Font sizes were fixed and based on the browser viewport rather
  than the resizable indicator's own dimensions.
- Implemented behavior:
  - Ticker and company name are horizontally centered.
  - The indicator is a CSS size container.
  - Both font sizes scale from the indicator's width and height, so enlarging
    the window makes both labels more prominent.
  - Minimum and maximum font sizes prevent unreadable or excessive typography.
- Must preserve:
  - The ticker remains visually dominant over the company name.
  - Dragging, resizing, saved layout, switching, API mapping, theme colors, and
    accessibility behavior remain unchanged.
- Files changed:
  - `app/portal-theme.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - At 240×118: ticker 37.12px, company name 12px.
  - At 580×318: ticker 92.48px, company name 24.565px.
  - Both labels rendered center-aligned.
  - TypeScript type-check, whitespace validation, and production build passed.
- Remaining dependency: Container-relative font scaling requires browser support
  for CSS container query units, available in the portal's supported modern
  browsers.

## 2026-07-30 — Add consolidation after Social Data Upload

- Area: Operations Portal → Social Data Upload.
- APIs/data:
  - Existing upload: `POST /social-data?ticker={ticker}`
  - Existing progress polling: `GET /social-data/progress?jobId={jobId}`
  - Added action: `POST /manual-input/consolidate?ticker={ticker}`
- User-reported problem: Social CSV uploads completed their background import
  jobs but the page provided no way to trigger downstream consolidation.
- Root cause: The Social Data Upload client implemented upload and progress
  polling only; unlike Data Import, it never called the documented manual
  consolidation endpoint.
- Implemented behavior:
  - A `Run consolidation` button is displayed beside Upload.
  - It remains disabled until every queued social import job completes
    successfully.
  - Failed, active, newly selected, or newly queued imports cannot be
    consolidated.
  - Successful consolidation displays the asynchronous-processing notice.
  - The consolidation request and response are included as a separate
    Development Data row.
- Must preserve:
  - Social uploads remain asynchronous and continue polling their job IDs.
  - Consolidation is never triggered before background upload processing
    completes.
  - Uploading a new batch clears readiness from the previous batch.
  - Platform-specific replacement behavior and existing social-data APIs remain
    unchanged.
- Files changed:
  - `app/operations/narrative-social/NarrativeSocialUploadClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - The local Social Data Upload page renders the new button disabled before a
    successful import.
  - TypeScript type-check, whitespace validation, and production build passed.
- Remaining dependency: `/manual-input/consolidate` returns immediately and the
  backend provides no completion-status API for the consolidation pipeline.

## 2026-07-30 — Make Social Data consolidation visibly responsive

- Area: Operations Portal → Social Data Upload → Run consolidation.
- APIs/data:
  - `POST /manual-input/consolidate?ticker={ticker}`
- User-reported problem: Clicking `Run consolidation` appeared to produce no
  response.
- Root cause: The click handler cleared the existing message and displayed no
  in-progress message while awaiting the API. It also had no request timeout, so
  a stalled request could leave the page apparently idle indefinitely.
- Implemented behavior:
  - Clicking the button immediately displays
    `Sending the consolidation request...`.
  - The button immediately changes to `Consolidating...` and is disabled.
  - Development Data records the request with `requesting`, `triggered`,
    `timed out`, or `error` state information.
  - Requests that do not respond within 30 seconds are cancelled and show an
    explicit retry message.
  - Guard conditions now show a reason instead of silently returning.
  - The visible message is an ARIA live status region.
- Must preserve:
  - Consolidation remains available only after successful social import jobs.
  - The same documented consolidation endpoint and ticker are used.
  - A timeout is not reported as a successful consolidation trigger.
- Files changed:
  - `app/operations/narrative-social/NarrativeSocialUploadClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining dependency: The backend still provides no consolidation completion
  endpoint after acknowledging the asynchronous trigger.

## 2026-07-30 — Preserve Social consolidation readiness after refresh

- Area: Operations Portal → Social Data Upload → Run consolidation.
- APIs/data:
  - Active-job check: `GET /social-data/progress?ticker={ticker}`
  - Consolidation: `POST /manual-input/consolidate?ticker={ticker}`
- User-reported problem: The consolidation control still appeared to do nothing
  when clicked.
- Root cause: Consolidation readiness existed only in React memory and defaulted
  to false. Refreshing or reopening the page lost the completed-upload flag and
  rendered a native disabled button. Native disabled buttons cannot invoke the
  handler, so no feedback could be displayed.
- Implemented behavior:
  - Readiness defaults to available after a refresh, subject to the active-job
    API check.
  - While active jobs are being checked, the control displays
    `Checking imports...` with explanatory status text.
  - While imports are active, it displays `Waiting for imports...`.
  - When no job is active, it displays an enabled `Run consolidation` button
    and `Ready to consolidate {ticker}`.
  - A permanent inline live-status message beside the button shows requesting,
    success, timeout, import failure, or API error state.
  - Selecting or starting a new upload still blocks consolidation until that
    batch completes successfully.
- Must preserve:
  - Consolidation cannot run while an import job is active.
  - A failed or unfinished new upload cannot be consolidated.
  - Refreshing the page must not permanently disable the manual consolidation
    action merely because the prior completion flag was held in memory.
- Files changed:
  - `app/operations/narrative-social/NarrativeSocialUploadClient.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Local page first rendered `Checking imports...` with a visible status.
  - After the active-job check, it rendered enabled `Run consolidation` with
    `Ready to consolidate CURR`.
  - TypeScript type-check, whitespace validation, and production build passed.
- Remaining dependency: The progress endpoint lists active jobs only, so after
  a refresh the frontend can prevent consolidation during active work but cannot
  independently recover the outcome of an older failed job.
