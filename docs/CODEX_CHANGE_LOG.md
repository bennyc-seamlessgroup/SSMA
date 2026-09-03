# Codex Change Log and Behavior Memory

This file is the persistent implementation memory for changes made by Codex.
Read it before modifying existing portal behavior, and update it after every
completed change.

## 2026-09-03 - Scope Chart Exchange and History export categories

- Area:
  - Operations Portal -> Data Export.
- API/data:
  - Existing `GET /export/csv?dataset=chartexchange&ticker={ticker}`.
  - Existing `GET /export/csv?dataset=history&ticker={ticker}&category={category}`.
  - Optional category requests, including
    `category=exchange-volume-history`.
- Reported problem and root cause:
  - Chart Exchange reused the page-wide category autocomplete list, so its
    suggestions included Manual Input and KWatch categories that do not belong
    to the selected dataset.
  - `exchange-volume-history` was also missing from that shared list.
  - History defaulted to `market-history` in the same autocomplete control, so
    the browser could filter away the rest of the valid history set even after
    `exchange-volume-history` was added as a suggestion.
- Intended behavior and invariants:
  - When Chart Exchange is selected, show a dedicated dropdown containing only
    all Chart Exchange data, market history, short-volume history,
    fails-to-deliver history, and exchange-volume history.
  - Selecting `Exchange volume history` sends the exact API category value
    `exchange-volume-history`.
  - History uses a dedicated dropdown containing all eight categories defined
    by the Market History contract: market, short volume, FTD, exchange volume,
    ownership, ownership summary, SEC filings, and sentiment events. It also
    provides an all-history-categories option while retaining `market-history`
    as the default selection.
  - The all-categories option leaves `category` out of the request because the
    CSV Export contract defines it as optional for Chart Exchange.
  - Preserve the ticker, date filters, authenticated download, endpoint debug
    row, and the existing KWatch-specific category dropdown.
- Files changed:
  - `app/operations/data-export/DataExportClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Source checks confirmed the Chart Exchange dropdown contains no Manual
    Input or social categories and includes `exchange-volume-history`.
  - Source checks confirmed the History dropdown contains every valid history
    category documented by `GET /market-data/history`, including
    `exchange-volume-history`.
  - `npm run typecheck` passed.
  - Production build passed, including all 29 generated static pages.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - The integration contract documents `exchange-volume-history` as an export
    category but does not publish a complete per-dataset category matrix. The
    frontend now exposes the Chart Exchange categories currently used by the
    portal; additional categories should be added when the backend documents
    them.

## 2026-09-03 - Translate the dynamic Short Score risk summary

- Area:
  - User Portal -> Short Interest -> Short Interest Score.
- API/data:
  - No API or request change. The summary remains derived in the frontend from
    the existing Short Score value.
- Reported problem and root cause:
  - In Chinese mode, the risk badge and interpretation bands were translated,
    but the sentence beneath the score remained English.
  - That sentence is assembled at runtime from the computed risk level and one
    of four score-dependent message bodies. The earlier translation audit
    covered the static band descriptions but omitted the completed dynamic
    summary strings.
- Intended behavior and invariants:
  - Translate every summary the score helper can produce in both Traditional
    and Simplified Chinese, including the distinct High summary used at the
    exact score-80 boundary and the Extreme summary used above 80.
  - Preserve the existing unbounded Short Score calculation, thresholds,
    displayed value, comparison, range labels, and English wording.
- Files changed:
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Focused checks exercised all five possible completed summary strings in
    English, Traditional Chinese, and Simplified Chinese.
  - English remained unchanged; neither Chinese mode returned English text.
  - `npm run typecheck` passed.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - None. This summary is frontend-derived display text.

## 2026-09-02 - Support multilingual and legacy AI-report payloads

- Area:
  - User Portal -> Short Interest -> AI Analysis.
  - User Portal -> Lending Pressure -> AI Analysis.
  - User Portal -> Report Archive -> report viewer and generated daily PDF.
- API/data:
  - Existing `GET /market-data/ai-report?ticker={ticker}&date={date}`.
  - Existing dated `GET /market-data/reports?ticker={ticker}&date={date}`.
  - AI fields `short_interest_current_interpretation` and
    `lending_pressure_analysis` now accept either the historical plain
    Markdown string or a valid JSON language map carried in a fenced `json`
    string. Supported keys are `en`, `zh_tc`, and `zh_sc`; direct language-map
    objects and the equivalent `zh-Hant` / `zh-Hans` keys are also tolerated.
- Reported problem and root cause:
  - The portal treated every AI analysis value as final display text. The new
    backend structure serializes all three languages inside the field, so the
    raw JSON fence would otherwise be shown to users and written into PDFs.
  - The archive PDF renderer was English-only and did not receive the current
    portal language.
- Intended behavior and invariants:
  - Parse a value as multilingual only when it contains valid JSON with at
    least one supported language key. Ordinary prose and malformed JSON remain
    legacy text and are displayed unchanged.
  - English selects `en`, Traditional Chinese selects `zh_tc`, and Simplified
    Chinese selects `zh_sc`. A missing requested translation falls back to
    English, then another available language, rather than showing raw JSON.
  - Changing portal language updates the live Short Interest and Lending
    Pressure AI analysis without changing the API date or market-data logic.
  - Opening or downloading an archived report builds its data using the
    current portal language. Chinese report PDFs localize report chrome,
    headings, KPI labels, dates, comparisons, sentiment labels, score bands,
    disclaimers, and the selected AI summary.
  - API-returned proper names, ticker symbols, company names, form codes, and
    arbitrary filing descriptions remain source data and are not machine
    translated.
  - Preserve the existing archived-report date validation, seven-day sentiment
    rules, carried-forward market values, and authenticated API behavior.
  - Preserve the unbounded Short Score behavior: the daily report continues to
    show the raw score without `/100`, and its bands remain `65-80 High` and
    `>80 Extreme`.
- Files changed:
  - `lib/ai-report-localization.ts`
  - `lib/ai-report-api.ts`
  - `app/monitor/[ticker]/short-interest/ShortInterestBrowserPage.tsx`
  - `app/monitor/[ticker]/lending-pressure/LendingPressureBrowserPage.tsx`
  - `app/monitor/[ticker]/reports/ReportArchiveCenter.tsx`
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `public/report-templates/daily-close/template.html`
  - `public/report-templates/daily-close/render.js`
  - `public/report-templates/daily-close/report-i18n.js`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/report-i18n.js`
  - `docs/INTEGRATION (7).md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Both supplied `ai-report.json` and `new-ai-report.json` passed focused
    selection checks. Legacy text was identical in all portal languages; the
    new payload selected distinct English, Traditional Chinese, and Simplified
    Chinese summaries, including when the fenced JSON was embedded in a wider
    string.
  - TypeScript type-check and JavaScript syntax checks passed.
  - Production build passed, including all 29 generated static pages.
  - Traditional and Simplified Chinese A4 QA PDFs each rendered as four pages.
    Visual inspection confirmed localized labels and dates, the correct Chinese
    AI summary, intact charts/layout, and no `/100` score label.
  - PDF metadata and text checks confirmed four A4 pages and the expected
    Traditional Chinese report title and AI content.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - The backend must populate the requested `zh_tc` and `zh_sc` values for a
    true translated AI summary. If one is absent, the documented language
    fallback applies.
  - Arbitrary API-returned filing descriptions remain in their source language
    unless the backend supplies translated filing data in a future contract.

## 2026-09-02 - Align live AI analysis with Market Current date

- Area: User Portal -> Short Interest and Lending Pressure.
- API/data:
  - Existing `GET /market-data/current?ticker={ticker}&category=market-current`.
  - Existing `GET /market-data/ai-report?ticker={ticker}&date={date}`.
- Reported problem and root cause:
  - The live-page AI report date was selected from the latest complete
    `market-history` publication, so the displayed Market Current snapshot and
    AI analysis could refer to different dates.
- Intended behavior and invariants:
  - Use the `snapshotDate` returned by the same Market Current response as the
    AI report's `date` query on both live pages.
  - Do not fall back to a market-history date. If Market Current has no valid
    `snapshotDate`, omit `date` and let the AI report API calculate its target
    date according to the documented contract.
  - Keep dated report/PDF generation unchanged; it continues to request AI
    analysis for the explicitly selected archived report date.
  - Keep per-field carried-forward source dates unchanged. The AI report aligns
    to the overall Market Current snapshot date, not an individual metric's
    `otherDateData` date.
- Files changed:
  - `lib/market-data-publication.ts`
  - `app/monitor/[ticker]/short-interest/ShortInterestBrowserPage.tsx`
  - `app/monitor/[ticker]/lending-pressure/LendingPressureBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Focused helper checks confirmed ISO timestamps are normalized to their
    `YYYY-MM-DD` snapshot date and a missing date is omitted.
  - Source checks confirmed both live AI requests and their Development Data
    endpoint labels use Market Current `snapshotDate`.
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - The backend must provide an AI report for the Market Current snapshot date;
    otherwise that live AI section will correctly show unavailable rather than
    silently substituting an older history date.

## 2026-09-02 - Complete user-portal Chinese interface translations

- Area: User Portal -> all pages, including Dashboard, Ownership, Internal
  Float, Short Interest, Lending Pressure, Social Sentiment, Exchange Volume,
  SEC Filings, Reports, alerts, account, settings, and supporting modules.
- API/data:
  - No API contract or request change. Existing current, history, reports,
    social, ownership, SEC filing, and user-input responses remain unchanged.
  - API-returned company names, holder names, filing descriptions, social
    posts, source values, and Development Data payload rows remain untranslated.
- Reported problem and root cause:
  - Newer interface sections had been added after the shared Chinese catalogue,
    so their English headings, descriptions, buttons, empty/error states, table
    helpers, and accessibility labels had no matching translation.
  - Runtime-composed strings such as `As of 08/31/26` and
    `0.00% vs 08/28/26` could not be handled by exact phrase matching.
- Intended behavior and invariants:
  - Translate all audited user-interface text consistently in Traditional and
    Simplified Chinese, including the complete Lending Pressure risk card.
  - Translate variable date, comparison, output-count, loading, and post-filter
    phrases through bounded patterns without changing their values.
  - Preserve English mode, API data, proper names, platform names, ticker
    symbols, endpoint labels, example contact values, and existing language
    persistence behavior.
- Files changed:
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Source audit across every `app/monitor/[ticker]` TSX page left only
    intentional non-translated endpoint strings, example contact values,
    abbreviations, and icon glyphs.
  - Representative Traditional and Simplified Chinese checks passed for the
    Lending Pressure card, runtime dates/comparisons, Dashboard, Social
    Sentiment, Reports, and accessibility labels.
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - None. Future frontend copy must be added to the shared catalogue (or a
    bounded runtime pattern) when it is introduced.

## 2026-08-31 - Prevent Traditional Custody hydration mismatch from browser extensions

- Area: Operations Portal -> Ownership Data -> Traditional Custody Breakdown.
- API/data:
  - No API change. The section remains a hardcoded, display-only sample pending
    backend implementation.
- Reported problem and root cause:
  - React reported a hydration mismatch on every sample broker and share field.
  - A browser extension inserted `data-sharkid` attributes into the disabled
    HTML inputs before hydration, so the browser DOM no longer matched the
    server-rendered markup.
- Intended behavior and invariants:
  - Render sample custody names and shares as static read-only values rather
    than disabled form inputs, because users cannot edit or submit them.
  - Preserve the existing table layout, sample values, pending-implementation
    message, disabled actions, and absence of backend connectivity.
  - Avoid hiding genuine application hydration issues globally with
    `suppressHydrationWarning`.
- Files changed:
  - `app/operations/ownership/TraditionalCustodyOperationsClient.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - Traditional Custody remains a UI preview until its backend storage and
    publishing API is implemented.

## 2026-08-28 - Restore all supported KWatch export categories

- Area: Operations Portal -> Data Export.
- API/data:
  - Existing `GET /export/csv?dataset=kwatch&ticker={ticker}&category={category}`.
  - Supported KWatch CSV categories documented by the API are `reddit`,
    `twitter`, and `stocktwits`.
- Reported problem and root cause:
  - Selecting KWatch prefilled the shared autocomplete field with `reddit`.
    Native datalist filtering then hid the non-matching Twitter and Stocktwits
    suggestions, making the UI appear to support Reddit only.
- Intended behavior and invariants:
  - KWatch uses an explicit category dropdown containing Reddit, Twitter, and
    Stocktwits, so every backend-supported platform is immediately visible.
  - Requests continue to send the exact lowercase API category values.
  - Facebook, LinkedIn, and YouTube are not offered because the CSV Export API
    contract does not define KWatch export templates for them, even though the
    separate Social Data read API can return those platforms.
  - Export endpoint construction, date filters, authorization, CSV ordering,
    download behavior, and Development Data remain unchanged.
- Files changed:
  - `app/operations/data-export/DataExportClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - `git diff --check` passed.
  - Source audit confirmed the KWatch dropdown exposes exactly Reddit,
    Twitter, and Stocktwits while preserving lowercase API values.
- Remaining backend dependency / limitation:
  - Additional KWatch platforms should be added only after the backend extends
    `GET /export/csv` and documents their export templates.

## 2026-08-27 - Fit Short Interest Score typography inside its ring

- Area: User Portal -> Reports -> Daily Market Close Report -> Short Interest
  Score, in both the HTML preview and downloaded PDF.
- API/data:
  - Existing normalized `shortInterestScore.scoreDisplay`; no API or value
    calculation change.
- Reported problem and root cause:
  - A decimal score such as `80.75` nearly filled the inner circle, forcing the
    adjacent `/ 100` text to wrap and appear misaligned.
- Intended behavior and invariants:
  - Keep the full score precision supplied by the report data.
  - Center the score on one line and place `/ 100` on a smaller second line.
  - Prevent either line from wrapping, in both screen and print layouts.
  - Preserve the ring dimensions, risk color, and all score calculations.
- Files changed:
  - `public/report-templates/daily-close/styles.css`
  - `public/report-templates/daily-close/template.html`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - The report fixture rendered `80.75` and `/ 100` as two centered, non-
    wrapping lines within the 82px inner circle.
  - `npm run typecheck` passed.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - None; this is a report-template typography correction.

## 2026-08-27 - Use API dates in the grey sentiment observation row

- Area: User Portal -> Reports -> Daily Market Close Report -> Market
  Perception observation-period row, in both HTML and PDF.
- API/data:
  - Existing ordered `windowStart` and `windowEnd` from the exact dated
    `GET /market-data/reports?ticker={ticker}&date={date}` response.
- Reported problem and root cause:
  - The grey row still showed `Previous 7 Days`. The previous change targeted
    the separate page-header badge, while the observation row fell back to its
    generic label whenever the boundary candidate failed an additional
    frontend 7D-span test.
- Intended behavior and invariants:
  - Use any ordered API `windowStart`–`windowEnd` pair from the dated report for
    both the grey observation row and the page-header badge.
  - Prefer a structurally recognized 7D candidate when more than one ordered
    API window exists, but do not discard the API dates solely because of the
    frontend span check.
  - Preserve independent sentiment subsection mapping and never substitute
    current/live sentiment data.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `public/report-templates/daily-close/template.html`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `Report Templates/lean-daily-market-close-report/REPORT_DATA_CONTRACT.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - A dated fixture with ordered API boundaries that deliberately fail the
    legacy frontend 7D-span check still normalized and rendered those exact
    dates in the grey observation row.
  - `npm run typecheck` passed.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - If the dated response genuinely provides no ordered `windowStart` and
    `windowEnd`, the report keeps its generic period fallback rather than
    inventing dates.

## 2026-08-27 - Show sentiment dates in the report header badge

- Area: User Portal -> Reports -> Daily Market Close Report -> Market
  Perception header, in both the HTML preview and downloaded PDF.
- API/data:
  - Existing `windowStart` and `windowEnd` selected from the exact dated
    `GET /market-data/reports?ticker={ticker}&date={date}` response.
- Reported problem and root cause:
  - The page-header badge still displayed the generic `Previous 7 Days` label
    even though the report already showed the authoritative API date range in
    the observation-period row.
- Intended behavior and invariants:
  - Display the formatted start-date–end-date range in the page-header badge.
  - Use the existing generic period label only when the dated response does not
    provide both boundaries.
  - Preserve the rebuilt subsection-level sentiment rendering and use no live
    sentiment fallback.
- Files changed:
  - `public/report-templates/daily-close/render.js`
  - `public/report-templates/daily-close/template.html`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `Report Templates/lean-daily-market-close-report/REPORT_DATA_CONTRACT.md`
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Runtime renderer fixture confirmed the header contains
    `Aug 20, 2026 – Aug 26, 2026` and no longer contains `Previous 7 Days`.
  - `npm run typecheck` passed.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - The badge falls back to the generic period label when either API boundary
    is unavailable.

## 2026-08-27 - Rebuild report sentiment page without the all-or-nothing gate

- Area: User Portal -> Reports -> Daily Market Close Report -> Market
  Perception, for both the HTML preview and downloaded PDF.
- API/data:
  - Existing exact dated
    `GET /market-data/reports?ticker={ticker}&date={date}` response only.
- Reported problem and root cause:
  - Reports still replaced the complete sentiment layout with a large
    unavailable panel even when the dated response contained report-owned
    sentiment values.
  - The mapper required one candidate object to contain a valid 7D boundary,
    overall score, distribution, and platforms. The backend may place the
    boundary metadata and those three subsections in separate sentiment-owned
    objects within the same dated response, so the valid values were discarded
    before the layout rendered.
  - The report template then used one page-level `sentiment.available` flag,
    which hid every sentiment card when any candidate-selection prerequisite
    failed.
- Intended behavior and invariants:
  - Select the authoritative 7D window, populated overall aggregate,
    distribution, and platform breakdown independently from the same dated
    report payload.
  - Do not require each data subsection to repeat `windowStart` and `windowEnd`.
  - Always render the observation row, overall card, distribution card,
    platform card, and SEC filings. A missing sentiment subsection displays
    only its own compact unavailable state; it never replaces the full page.
  - Continue to use no current/live sentiment fallback and no frontend-created
    sentiment values.
  - Bump the report template cache version so both the HTML viewer and PDF load
    the rebuilt renderer immediately.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `public/report-templates/daily-close/render.js`
  - `public/report-templates/daily-close/template.html`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `Report Templates/lean-daily-market-close-report/REPORT_DATA_CONTRACT.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - A split-object dated fixture normalized Aug 20–26, score `61.54`, 13
    mentions, distribution `6 / 5 / 2`, X `9`, and Reddit `4`, with all four
    independent selections available.
  - The runtime renderer showed the period, score, mentions, platform card,
    and filings without `sentiment-report-unavailable`.
  - A no-data fixture still rendered all three sentiment cards with localized
    unavailable messages and retained the filings section.
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - Each displayed number and boundary must still exist somewhere in the exact
    dated report response. Missing archived values are not reconstructed from
    live APIs.

## 2026-08-27 - Recognize the actual dated-report sentiment schema robustly

- Area: User Portal -> Reports -> Daily Market Close Report -> Market
  Perception and Development Data diagnostics.
- API/data:
  - Confirmed report-opening path:
    `GET /market-data/reports?ticker=CURR&date=2026-08-26` for the Aug 26 CURR
    report.
- Reported problem and root cause:
  - The report still showed sentiment unavailable after removing report-date
    equality because the remaining candidate recognizer depended on exact
    camel-case keys and, for inferred windows, an additional frontend date-span
    calculation.
  - The dated backend object is already authoritative and may serialize the
    established fields with different casing or separators. Rejecting an
    explicitly labelled 7D object at this stage prevented its populated values
    from reaching the renderer.
- Intended behavior and invariants:
  - The Aug 26 archive record constructs exactly the dated endpoint above,
    invalidates that request path before loading, and adds the endpoint to the
    normalized sentiment provenance.
  - Recognize equivalent field forms case-insensitively and separator-
    insensitively, including `windowStart` / `WindowStart` / `window_start`,
    their end equivalents, display mention counts, Overall, Distribution, and
    platform containers.
  - An explicitly declared `7D` object with ordered start/end boundaries is
    usable without a second frontend span calculation. Boundary-derived
    objects without an explicit label must still form a valid 7D interval.
  - Continue to use only the selected dated report response; no current/live
    sentiment fallback is introduced.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `Report Templates/lean-daily-market-close-report/REPORT_DATA_CONTRACT.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - A focused mixed-case Aug 26 response (`Window`, `WindowStart`, `WindowEnd`,
    `MentionsDisplay`, `Overall`, `Distribution`, and `PlatformBreakdown`)
    normalized as available with score `61.54`, 13 mentions, distribution
    `6 / 5 / 2`, X `9`, and Reddit `4`.
  - The local report rendered Aug 20–26 and all three sentiment cards from the
    normalized result rather than the unavailable block.
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - The configured demo Cognito account was not available, so the authenticated
    production payload itself could not be printed in this run. The request
    path and response-to-render flow were verified statically and through the
    schema regression above.

## 2026-08-27 - Unblock valid dated 7D sentiment windows in all reports

- Area: User Portal -> Reports -> Daily Market Close Report -> Market
  Perception and Development Data -> Sentiment Mapping.
- API/data:
  - Existing dated
    `GET /market-data/reports?ticker={ticker}&date={date}` response only.
- Reported problem and root cause:
  - Every report rendered the full-page archived-window mismatch block even
    though its dated response now contained the correct `windowStart`,
    `windowEnd`, and sentiment values.
  - Candidate selection still applied the older requirement that `windowEnd`
    must equal the report index date (or its next-day-exclusive boundary). The
    dated endpoint already establishes which frozen report owns the sentiment
    object, so this second equality check incorrectly rejected valid backend
    windows before any cards could render.
- Intended behavior and invariants:
  - Accept an explicit sentiment candidate when its source boundaries form a
    structurally valid 7D window (six date intervals for inclusive boundaries
    or seven for a next-day-exclusive end).
  - Treat `windowStart` and `windowEnd` from the dated response as authoritative
    even when `windowEnd` is not the report index date.
  - Continue selecting only from the exact dated report response; do not call
    or substitute live/current sentiment data.
  - Keep populated-candidate ranking and independent Overall, Distribution,
    and Platform selection so the strongest valid report-owned fields render.
  - Development diagnostics now label a candidate `Usable for report` instead
    of incorrectly presenting report-date equality as the eligibility rule.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `app/monitor/[ticker]/reports/ReportArchiveDevTables.tsx`
  - `Report Templates/lean-daily-market-close-report/REPORT_DATA_CONTRACT.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - A focused regression used report date Aug 21 with a valid Aug 20–26 7D
    sentiment object. It normalized as available with score `61.54`, 13
    mentions, distribution `6 / 5 / 2`, X `9`, and Reddit `4` instead of the
    mismatch block.
  - The local HTML report rendered the full sentiment cards and the API period
    `Aug 20, 2026 – Aug 26, 2026` for that formerly rejected window.
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - A candidate with missing boundaries or boundaries that do not span a valid
    7D period remains unavailable. Missing sentiment subsections are not
    reconstructed from live APIs.

## 2026-08-27 - Use each dated report's authoritative 7D sentiment window

- Area: User Portal -> Reports -> Daily Market Close Report -> Market
  Perception, in both the HTML viewer and downloaded PDF.
- API/data:
  - Existing dated
    `GET /market-data/reports?ticker={ticker}&date={date}` response only.
  - No `sentiment-current`, sentiment-history, or social-feed fallback.
- Reported problem and root cause:
  - The backend now returns the correct `windowStart` and `windowEnd` for each
    dated report, but the frontend normalizer still replaced those boundaries
    with a locally calculated start and the selected report date.
  - The report renderer separately preferred `reportDateIso` over the supplied
    `sentiment.windowEnd`, so even a normalized API end boundary could not be
    authoritative in the displayed observation period.
  - Some valid report-owned display/count aliases such as `mentionsDisplay`,
    `recordCount`, `contributionPercent`, and `overall.scoreDisplay` were not
    accepted by every normalization and candidate-ranking path.
- Intended behavior and invariants:
  - For every selected report date, select a matching explicit 7D sentiment
    object only from that exact dated response.
  - Preserve and display its `windowStart` and `windowEnd`; do not recalculate
    or overwrite a valid API period.
  - Fill Overall Sentiment, total mentions, previous-window change,
    Distribution, and Platform Breakdown from the corresponding dated
    sentiment fields. Preserve supplied display values and labels where
    present, while retaining the established aliases for equivalent report
    shapes.
  - HTML preview and downloaded PDF continue to use the same normalized data
    and report template. Stale/future windows and live/current sentiment remain
    excluded from historical reports.
  - A report-date request still invalidates its authenticated response cache so
    a regenerated backend archive is read on the next view or download.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `public/report-templates/daily-close/render.js`
  - `public/report-templates/daily-close/template.html`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `Report Templates/lean-daily-market-close-report/REPORT_DATA_CONTRACT.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Focused normalization with an Aug 15–21 dated response produced score
    `61.54`, 13 mentions, distribution `6 / 5 / 2`, X `9`, and Reddit `4`,
    while preserving the source ISO start/end values.
  - The local HTML report rendered `Aug 15, 2026 – Aug 21, 2026`, 13 mentions,
    `46% / 38% / 15%`, X `9`, and Reddit `4` from that normalized fixture.
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - A dated report can display only the sentiment subsections and platform rows
    actually present in that report's frozen API object. The frontend does not
    reconstruct missing archived values from live data.

## 2026-08-27 - Collapse repeated Alert Center notifications by rule

- Area: User Portal -> Dashboard -> Alert Center, notification inbox, and live
  WebSocket toasts.
- APIs/data:
  - Existing `GET /alerts?ticker={ticker}&limit=100` history response.
  - Existing WebSocket `alert` messages.
  - Existing `GET /rule-catalog/user-settings` current rule evaluation.
- Reported problem and root cause:
  - The backend can create the same alert repeatedly while its condition stays
    true. The frontend fingerprint included `createDatetime`, so every repeat
    was treated as a new alert and displayed simultaneously.
  - History normalization discarded `ruleId` and `catalogId`, and the Dashboard
    deduplicated persisted versus currently evaluated alerts using display text
    only. Formula names such as `availableShares.value` therefore did not
    reliably match the catalog label `Shortable Shares`.
- Intended behavior and invariants:
  - For the active portal day, ticker, and rule, retain only the newest alert
    across API history, local browser storage, cross-tab storage sync, and live
    WebSocket messages.
  - A repeated live message silently refreshes the existing row's timestamp,
    value, and severity; it does not add another toast or unread count.
  - The first alert for a rule still creates a row, toast, and unread count.
    Different rules remain independently visible, and the existing daily reset
    and backend alert history remain unchanged.
  - Preserve `alertId`, `ruleId`, and `catalogId` when supplied. Match current
    rule evaluations by stable ID first, then by a normalized metric alias when
    the WebSocket contract does not supply IDs.
  - A history response arriving after a live message must not overwrite that
    newer in-session message.
- Files changed:
  - `components/AlertNotificationProvider.tsx`
  - `app/monitor/[ticker]/dashboard/CustomAlertCenter.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - The local Dashboard route compiled successfully. The isolated in-app
    browser reached the secure-session gate, but did not have a signed-in user
    session with which to trigger a real WebSocket alert.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - The frontend stops repeated in-portal rows and toasts, but the backend will
    continue writing duplicate history records and may continue sending email
    alerts until it implements a cooldown or condition re-arm policy.
  - The current WebSocket contract omits stable rule IDs, so live-to-history
    matching falls back to the normalized formula until the backend includes
    `ruleId` or `catalogId` in push messages.

## 2026-08-27 - Remove duplicate broad market API calls from Dashboard

- Area: User Portal -> Dashboard, shared ticker data-status provider, top bar,
  and sidebar status.
- APIs/data:
  - Retained `GET /market-data/current?ticker={ticker}&category=market-current`.
  - Retained `GET /market-data/history?ticker={ticker}&category=market-history`.
  - Retained `GET /manual-input/sec-filings?ticker={ticker}` and
    `GET /market-data/current?ticker={ticker}&category=company-profile-current`.
  - Removed Dashboard-route calls to the broad no-category
    `GET /market-data/current?ticker={ticker}` and
    `GET /market-data/history?ticker={ticker}` responses.
- Reported problem and root cause:
  - Dashboard correctly loaded the two category-specific market datasets, but
    the app-shell `TickerDataStatusProvider` independently requested the broad
    combined current and history responses to populate top-bar/sidebar status.
  - Because category and no-category URLs have different cache keys, request
    deduplication could not merge them, so the same market files were downloaded
    twice as part of differently shaped responses.
- Intended behavior and invariants:
  - On the Dashboard route, the shared status provider uses exactly the same
    category-specific market-current and market-history paths as
    `DashboardBrowserPage`.
  - Both consumers use the authenticated in-flight/response cache, collapsing
    simultaneous identical paths into one network request on initial load.
  - Dashboard status continues to derive its market-close date and version
    from market-current, market-history, and the SEC filing response.
  - CompanySwitcher and status share the category-specific company-profile
    request; the ticker/company-name validation remains intact.
  - Scheduled status polling explicitly refreshes these category paths, while
    non-Dashboard routes retain their existing status-loading behavior.
- Files changed:
  - `components/TickerDataStatusProvider.tsx`
  - `lib/current-data-sources.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Static request-path inspection confirmed the Dashboard-only branch contains
    category-specific current/history URLs and no broad current/history URL.
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - Browser-network inspection in a live authenticated account remains the
    final end-to-end confirmation; the isolated test browser was unavailable
    in this run.

## 2026-08-26 - Discover nested dated 7D sentiment windows by boundary

- Area: User Portal -> Reports -> Daily Market Close Report and Development
  Data -> Sentiment Mapping.
- API/data:
  - Existing dated
    `GET /market-data/reports?ticker={ticker}&date={date}` response only.
- Reported problem and root cause:
  - The backend team advised that report JSON may already contain different 7D
    windows. Candidate discovery recognized explicit `window: "7D"`,
    `periods.7D` / `periods.1W`, or complete aggregate-shaped objects, but a
    historical window inside an array or date map could be missed when the
    child supplied only `windowStart` / `windowEnd` plus its data.
  - Repository search found no checked-in Aug 2026 production report JSON; the
    only local report fixtures are older sample snapshots. The report contract
    still defines each `date=` response as the raw dated report file.
- Intended behavior and invariants:
  - Recursively discover sentiment-owned objects with valid start/end
    boundaries, including objects nested in arrays, date maps, and supported
    JSON-encoded wrappers.
  - Infer 7D for both inclusive seven-calendar-day boundaries (six date
    intervals) and next-day-exclusive boundaries (seven date intervals), even
    when the child omits a `window` label.
  - Select only a candidate ending on the requested report date; stale or
    future windows remain visible in diagnostics as `Not selected`.
  - Existing explicit `window: "7D"`, `periods.7D`, frozen-report, and no-live-
    fallback behavior remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - A focused Aug 21 response contained two unlabeled nested windows: Aug
    20–26 and Aug 15–21. Diagnostics found both, selected Aug 15–21 for all
    three subsections, and left Aug 20–26 unselected.
  - Normalized output contained 12 mentions, score `58`, distribution
    `5 / 6 / 1`, X `8`, and Reddit `4` for Aug 15–21.
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - If refreshed diagnostics still show only `$.sentiment` Aug 20–26, the Aug
    15–21 window is not present anywhere in the dated Aug 21 API response and
    the backend must correct or regenerate that archived file.

## 2026-08-26 - Reject sentiment windows from the wrong report date

- Area: User Portal -> Reports -> Daily Market Close Report and Development
  Data -> Sentiment Mapping.
- API/data:
  - Existing dated
    `GET /market-data/reports?ticker={ticker}&date={date}` response only.
- Reported problem and root cause:
  - Selecting the Aug 21 report correctly requested `date=2026-08-21`, but its
    archived `$.sentiment` object returned `windowStart=2026-08-20` and
    `windowEnd=2026-08-26`.
  - The diagnostic correctly marked `Matches report date = No`, but candidate
    selection still fell back to the first non-matching object when there were
    no matching candidates. It therefore incorrectly labelled that stale or
    future snapshot as selected for all report subsections.
- Intended behavior and invariants:
  - Overall, Distribution, and Platform Breakdown can select only explicit 7D
    candidates whose window ends on the selected report date (including the
    already supported next-day exclusive boundary).
  - If every candidate has `Matches report date = No`, none is selected and
    the report displays a specific archived-window mismatch message.
  - The report's canonical inclusive display range remains anchored to the
    selected date; Aug 21 displays Aug 15–21 and never Aug 20–26.
  - The frontend does not fabricate the missing Aug 15–21 values or substitute
    current sentiment into a frozen historical report.
  - Changing the inspected report date in Dev Mode invalidates the matching
    dated-response cache before loading, so the mapping reflects the latest
    archived API payload.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `app/monitor/[ticker]/reports/ReportArchiveDevTables.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - A focused Aug 21 regression supplied the observed Aug 20–26 sentiment
    candidate. Diagnostics returned `Not selected` / `Matches report date =
    No`; normalized output returned `available=false`, Aug 15–21, and the
    archived-window mismatch message.
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - To show real sentiment values for Aug 21, the backend must regenerate
    `reports/CURR/2026-08-21/CURR_report_data.json` with the matching frozen 7D
    snapshot. The frontend cannot derive those historical values from the
    future Aug 20–26 aggregate.

## 2026-08-26 - Expose the dated report sentiment candidate mapping

- Area: User Portal -> Reports -> Development Data -> Sentiment Mapping.
- API/data:
  - Existing dated
    `GET /market-data/reports?ticker={ticker}&date={date}` response only.
  - No additional API request or live sentiment fallback.
- Reported problem and root cause:
  - The Aug 25 report correctly displayed the canonical Aug 19–25 observation
    period, but the rendered Overall, Distribution, and Platform values still
    remained `N/A` / zero.
  - A focused regression using the documented direct `sentiment` object maps
    13 mentions, score `61.54`, distribution `6 / 5 / 2`, and the platform
    counts correctly. This proves the renderer and documented-shape normalizer
    work, but does not prove that the authenticated dated response used by the
    portal contains that object at the expected path.
  - The authenticated production response is not available in the workspace,
    so further schema guesses would risk selecting the wrong frozen report
    data.
- Intended behavior and invariants:
  - When Dev Mode is enabled, Reports exposes a `Sentiment Mapping` tab for the
    selected dated response.
  - Every discovered seven-day candidate shows its exact source path, date
    window, mentions, score, distribution, platform totals, report-date match,
    and whether it was selected for Overall, Distribution, or Platforms.
  - The diagnostic contains only aggregate structure and values; it does not
    expose social post content or introduce a user-visible report fallback.
  - Existing frozen-report, canonical Aug 19–25 range, and shared HTML/PDF data
    path remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `app/monitor/[ticker]/reports/ReportArchiveDevTables.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Focused documented-shape regression selected `$.sentiment` for all three
    subsections and normalized 13 mentions, score `61.54`, distribution
    `6 / 5 / 2`, X `9`, and Reddit `4` for Aug 19–25.
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - The actual candidate path and values in the signed-in Aug 25 dated response
    must be read from the new diagnostic before changing the frozen report
    mapping again.

## 2026-08-26 - Map populated dated sentiment into all report subsections

- Area: User Portal -> Reports -> Daily Market Close Report -> Market
  Perception.
- API/data:
  - Existing dated
    `GET /market-data/reports?ticker={ticker}&date={date}` response only.
  - No `sentiment-current`, social-feed, or sentiment-history request.
- Reported problem and root cause:
  - After correcting the Aug 19–25 label, Overall Sentiment still showed `N/A`
    and Distribution/Platform Breakdown still showed zeros.
  - One selected candidate previously supplied every subsection. Dated report
    payloads can place the populated aggregate, distribution, and platform rows
    in separate sentiment-owned objects or JSON-encoded report wrappers, while
    an older directly recognized object remains zero-valued.
  - Preserving the correct label therefore did not guarantee that each report
    card read its best populated dated source.
- Intended behavior and invariants:
  - Overall Sentiment selects the strongest explicit, report-date-matched 7D
    aggregate and maps its mentions, score, previous score, change, and label.
  - Sentiment Distribution independently selects the strongest populated dated
    distribution and maps positive/bullish, neutral, and negative/bearish
    counts and percentages.
  - Platform Breakdown independently selects the strongest populated dated
    platform array and maps mentions, share, score, and label into the five
    established platform rows.
  - Candidate discovery recognizes sentiment objects by shape as well as key
    name, traverses nested report wrappers, and parses JSON-encoded report-owned
    objects with a bounded size/depth.
  - All three sources must still be explicit 7D objects ending on the selected
    report date. No current/live data is mixed into an archive.
  - The canonical Aug 19–25 display boundary remains unchanged.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `Report Templates/lean-daily-market-close-report/REPORT_DATA_CONTRACT.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - A focused normalization check supplied a zero-valued direct object, a
    JSON-encoded populated aggregate, a nested populated distribution, and a
    separate nested platform object for Aug 25.
  - Normalized output was Aug 19–25, 13 mentions, score `61.54`, change
    `+11.54`, distribution counts `6 / 5 / 2`, X mentions `9`, and Reddit
    mentions `4`.
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - The displayed values remain limited to populated fields actually contained
    in the dated Aug 25 report response.

## 2026-08-26 - Canonicalize the report's inclusive 7D sentiment label

- Area: User Portal -> Reports -> Daily Market Close Report -> Market
  Perception -> Sentiment Observation Period.
- API/data:
  - Existing dated
    `GET /market-data/reports?ticker={ticker}&date={date}` report date and
    sentiment snapshot.
  - No additional API or live-data fallback.
- Reported problem and root cause:
  - Both the HTML report and downloaded PDF displayed `Aug 20, 2026 – Aug 25,
    2026` while labeling the range as Previous 7 Days. That inclusive range is
    only six calendar dates.
  - The label forwarded the selected legacy sentiment candidate's incorrect
    `windowStart`, allowing candidate-selection problems to produce an invalid
    7D presentation even though the immutable report date was known.
- Intended behavior and invariants:
  - The displayed 7D range is inclusive and anchored to the report date.
  - Its end is the report date and its start is exactly six calendar days
    earlier; report date Aug 25 therefore always displays Aug 19–25.
  - HTML viewing and PDF download continue using the same normalized report
    object, so the corrected label is identical in both outputs.
  - This label correction does not source or fabricate sentiment values and
    does not reintroduce `sentiment-current`.
  - Candidate selection and placement of Overall, Distribution, and Platform
    values remain separate from this display-boundary correction.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `Report Templates/lean-daily-market-close-report/REPORT_DATA_CONTRACT.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - A focused normalizer check supplied the incorrect Aug 20–25 upstream range
    for report date Aug 25 and received normalized boundaries
    `2026-08-19` / `2026-08-25`.
  - A focused renderer check produced exactly
    `Aug 19, 2026 – Aug 25, 2026`.
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - This guarantees the correct displayed 7D boundary. Sentiment values still
    depend on the populated dated report candidate and are addressed
    independently.

## 2026-08-26 - Prefer populated dated report sentiment over empty legacy data

- Area: User Portal -> Reports -> Daily Market Close Report -> Market
  Perception.
- API/data:
  - Existing dated
    `GET /market-data/reports?ticker={ticker}&date={date}` sentiment candidates.
  - The separate dated AI report remains unchanged.
  - No live `sentiment-current`, social-feed, or sentiment-history fallback was
    added.
- Reported problem and root cause:
  - The Aug 25 report rendered `N/A` for Overall Sentiment and zero values for
    every breakdown even though the dated report contained a populated 7D
    sentiment object.
  - The dated report can expose sentiment inside a report-owned wrapper not
    covered by the four fixed paths (`sentiment`, `sentimentSnapshot`, and their
    direct `data` equivalents). The screenshot proves the populated object has
    an Aug 19 start, while the rendered Aug 20 start came from a different empty
    object that the fixed-path collector did recognize.
  - A sentiment object can also carry the populated 7D aggregate on its root
    while retaining an older empty `periods.7D`. Fixed-path and nested-only
    collection could therefore discard a populated object before candidate
    ranking ran.
  - Candidate ranking used the maximum of direct aggregate mentions and nested
    timeline mentions, but rendering correctly preserved an explicitly
    supplied direct `mentions: 0`. An empty Aug 20–25 aggregate could therefore
    receive a high timeline-based rank and then render as zero, ahead of the
    populated Aug 19–25 aggregate.
  - The selected empty object was structurally valid, so the renderer displayed
    `N/A` and zeros instead of the whole-section unavailable state.
- Intended behavior and invariants:
  - Among explicit dated 7D candidates, a report-date-matched populated object
    outranks an empty legacy object. Mention count and score determine the
    populated preference after date matching.
  - A sentiment root aggregate and its nested `periods.7D` / `periods.1W`
    aggregate are both retained as candidates when both exist.
  - Candidate discovery follows sentiment-keyed containers inside the dated
    report, including nested report wrappers, while retaining the explicit 7D
    and report-date-match requirements.
  - Candidate ranking prefers a populated direct aggregate. Timeline totals are
    considered only when the candidate does not supply a direct aggregate
    mention count; they cannot override an explicit zero during ranking.
  - Overall Sentiment, Sentiment Distribution, and Platform Breakdown have
    independent availability. A missing platform subsection cannot suppress a
    valid dated overall score or distribution.
  - A missing subsection displays its own unavailable message; the whole
    sentiment unavailable state is used only when no dated sentiment
    subsection is usable.
  - The frozen-report rule remains intact: every displayed market-sentiment
    value still comes from the selected dated report payload.
  - The report developer panel no longer requests or labels
    `sentiment-current` as a fallback source; its API map now matches actual
    report generation.
  - Legitimate zero-mention dated snapshots remain valid and continue to show
    `N/A` / zero distributions rather than fabricated sentiment.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `app/monitor/[ticker]/reports/ReportArchiveDevTables.tsx`
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `public/report-templates/daily-close/render.js`
  - `public/report-templates/daily-close/styles.css`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `Report Templates/lean-daily-market-close-report/REPORT_DATA_CONTRACT.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - Both report renderer files passed JavaScript syntax checks.
  - Editable and public renderer/style mirrors match.
  - A focused normalization regression check placed the populated Aug 19–25
    sentiment object inside a nested report wrapper and supplied a separately
    recognized empty Aug 20–25 object whose nested timeline claimed 200
    mentions. The populated direct aggregate still won and produced 13
    mentions, score `61.54`, distribution counts `6 / 5 / 2`, X mentions `9`,
    and Reddit mentions `4`.
  - A focused renderer check confirmed Overall and Distribution remain visible
    while only an absent Platform Breakdown shows its subsection-level
    unavailable message.
  - A report-layout mapping check confirmed score `61.54` and 13 mentions enter
    Overall Sentiment; distribution counts `6 / 5 / 2` render as
    `46% / 38% / 15%`; and X `9` / Reddit `4` enter Platform Breakdown. The
    Aug 19 timestamp renders as `Aug 19, 2026`, not Aug 20.
  - `git diff --check` passed.
- Remaining backend dependency / limitation:
  - A subsection can display only fields present in the dated report response.
    Missing platform data remains unavailable rather than being sourced from a
    current or historical endpoint.

## 2026-08-26 - Freeze report sentiment to the dated report snapshot

- Area: User Portal -> Reports -> Daily Market Close Report -> Market
  Perception.
- APIs/data:
  - Authoritative sentiment source remains the dated
    `GET /market-data/reports?ticker={ticker}&date={date}` payload.
  - Removed the report-generation request to
    `GET /market-data/current?ticker={ticker}&category=sentiment-current`.
  - The separate dated `GET /market-data/ai-report?ticker={ticker}&date={date}`
    request remains unchanged because its response can be user-specific.
- Reported problem and root cause:
  - The current four-page report layout uses only the seven-day sentiment
    aggregate; it does not render daily sentiment bars or points.
  - Report generation nevertheless requested live `sentiment-current` and
    allowed its matching 7D period to compete with the archived report
    snapshot. This could make a regenerated historical report change after
    consolidation data changed and violated the existing frozen-report
    invariant.
- Intended behavior and invariants:
  - Report sentiment is read only from the selected dated report payload,
    including supported nested `sentimentSnapshot` and `periods.7D` / `1W`
    shapes. No live sentiment fallback is allowed.
  - A usable snapshot must be explicitly seven-day, have valid window dates
    ending on the requested report date (or the supported next-day exclusive
    boundary), total mentions, an overall score, all three distribution
    buckets, and numeric mention totals for Reddit, X, Facebook, LinkedIn, and
    Stocktwits.
  - Zero mentions is preserved as a valid aggregate value and is not replaced
    by timeline-derived totals.
  - An incomplete legacy snapshot displays `Sentiment data unavailable for
    this report.` while the SEC filing section and the rest of the report keep
    rendering.
  - Historical report data remains immutable; older incomplete report files
    must be regenerated or migrated by the backend rather than supplemented
    from current frontend APIs.
  - The previously accepted dated ticker/date validation, separate user-aware
    AI interpretation, margin normalization, short-score ranges, and report
    layout remain intact.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `public/report-templates/daily-close/render.js`
  - `public/report-templates/daily-close/styles.css`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `Report Templates/lean-daily-market-close-report/REPORT_DATA_CONTRACT.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - Both editable and public report renderer/style mirrors match.
  - Both report renderer files passed JavaScript syntax checks.
  - A focused renderer check confirmed that incomplete sentiment shows the
    unavailable message without a gauge, while complete sentiment renders the
    gauge normally.
  - `git diff --check` passed.
  - Source audit confirmed `buildDailyReportData` requests only the dated
    consolidated report and the separate dated AI report; it no longer
    requests `sentiment-current`.
- Remaining backend dependency / limitation:
  - Archived reports without a complete frozen seven-day sentiment aggregate
    show the explicit unavailable state until the backend regenerates or
    migrates those dated report files.

## 2026-08-26 - Show backend total short-volume percentage

- Area: User Portal -> Short Interest -> Short Volume & Fails-to-Deliver ->
  Short Volume table.
- API/data:
  - Existing `GET /market-data/history?ticker={ticker}&category=short-volume-history`.
  - New backend record field `totalShortVolumePercentage`.
- Reported problem and root cause:
  - The backend added the total short-volume percentage, but the frontend row
    mapping and table columns did not consume or display it.
- Intended behavior and invariants:
  - `Total Short Volume %` appears immediately to the right of
    `Total Short Volume`.
  - The value comes directly from `totalShortVolumePercentage`, is formatted
    to two decimal places with a percent sign, and is not recalculated by the
    frontend or transformed by the table's display-mode selector.
  - A missing backend field displays as unavailable rather than zero.
  - Existing column order, API loading, sorting, date filtering, pagination,
    Fails-to-Deliver table behavior, and other short-volume fields remain
    unchanged.
- Files changed:
  - `app/monitor/[ticker]/short-interest/ShortInterestBrowserPage.tsx`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - `git diff --check` passed.
  - Source audit confirmed the new column follows `Total Short Volume`, maps
    only `totalShortVolumePercentage`, and uses percent formatting without a
    frontend percentage calculation.
- Remaining backend dependency / limitation:
  - Older short-volume history records that do not provide
    `totalShortVolumePercentage` remain unavailable in this new column.

## 2026-08-26 - Remove Dry Run access from Company Management

- Area: Operations Portal -> Company Management -> Initialize History.
- API/data:
  - Existing `POST /tickers/historical-init`.
  - Historical initialization now always sends `dry_run: false` explicitly.
- Reported problem and root cause:
  - The Historical Data panel exposed the backend's optional Dry Run mode to
    operations users. The checkbox defaulted to enabled, so merely hiding the
    control would have continued submitting validation-only requests.
- Intended behavior and invariants:
  - The Dry Run checkbox, explanation, validation-only status, and
    `Run Validation` action are removed from Company Management.
  - The historical action is always labeled `Start Historical Init`, requires
    the existing confirmation, and always performs a live asynchronous run
    with `dry_run: false`.
  - The summary explicitly states `Writes enabled`.
  - `Run Consolidation` remains beside `Start Historical Init`; the two
    operations retain mutual busy-state protection and separate messages.
  - Ticker, date-range, vendor, 180-day, and future-date validation remain
    unchanged.
- Files changed:
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - `npm run typecheck` passed.
  - `npm run build` passed, including all 29 generated static pages.
  - `git diff --check` passed.
  - Source audit confirmed that the Dry Run control, validation-only action,
    status, styles, and translations were removed; the request now explicitly
    sends `dry_run: false`.
  - No live historical-init or consolidation request was submitted during
    verification.
- Remaining backend dependency / limitation:
  - The backend endpoint still supports `dry_run: true`; this change removes
    access from the portal UI only. Direct API callers remain governed by
    backend authorization and can bypass frontend restrictions.

## 2026-08-26 - Add manual consolidation to Company Management

- Area: Operations Portal -> Company Management -> Initialize History.
- APIs/data:
  - Existing `POST /manual-input/consolidate?ticker={ticker}`.
  - Verification reads:
    - `GET /market-data/current?ticker={ticker}&category=market-current`.
    - `GET /market-data/history?ticker={ticker}&category=market-history`.
  - Existing `POST /tickers/historical-init` validation and initialization
    workflow remains unchanged.
- Reported problem and root cause:
  - Company Management could validate or initialize historical vendor data but
    had no nearby way to run the manual consolidation step. Operators had to
    leave the page and use Data Import or Market Data for the same ticker.
- Intended behavior and invariants:
  - `Run Consolidation` appears directly beside `Run Validation` /
    `Start Historical Init` in the Historical Data panel.
  - Consolidation always uses the normalized ticker displayed in that panel;
    an invalid or empty ticker is rejected before an API request is sent.
  - The request body and query string both carry the same ticker.
  - After the backend accepts the asynchronous request, the page uses the
    shared Data Import verification workflow: it captures the current/history
    baseline, checks every 10 seconds for up to five minutes, and reports
    confirmed change, unchanged-but-available output, or unavailable output.
  - Historical initialization and consolidation cannot be started on top of
    each other, but their messages and Development Data payloads remain
    separate.
  - The exact consolidation request, response, baseline, and verification
    checks appear in Development Data.
- Files changed:
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
  - Production build passed, including all 29 statically generated pages.
  - Production build passed, including all 29 statically generated pages.
  - Source inspection confirmed the consolidation button is the adjacent
    sibling of the validation/initialization button inside a wrapping action
    row, with mutual busy-state disabling and separate status messages.
  - No live consolidation request was submitted during verification.
- Remaining backend dependency / limitation:
  - The consolidation endpoint returns acceptance rather than a job ID or
    completion status. As on Data Import, unchanged output after five minutes
    can mean the output was already current; the frontend cannot prove which
    specific asynchronous run completed without backend status support.

## 2026-08-26 - Apply demo restrictions to every account with the DEMO role

- Area: Shared authentication and authorization across the User Portal and
  Operations Portal.
- APIs/data:
  - Authenticated `GET /profile`, specifically the normalized `role` field.
  - All non-GET/HEAD requests made through `authenticatedFetch`.
  - Existing ticker access fields remain unchanged.
- Reported problem and root cause:
  - The backend creates uninvited accounts with `role: "DEMO"`, but the shared
    frontend demo detector recognized only the configured public-demo email.
  - Ticker access already treated the DEMO role as CURR-only, while other
    restrictions—including read-only profile and alert controls, fictional
    holdings, Operations Portal denial, and the central mutation guard—could
    be missed by another account carrying the same role.
- Intended behavior and invariants:
  - A profile is treated as a demo account when its normalized role is exactly
    `DEMO` or when it is the configured public-demo email.
  - Every DEMO-role account is restricted to CURR, cannot enable Development
    Mode, cannot enter the Operations Portal, sees profile and alert settings
    as read-only, and receives the existing demo holdings presentation.
  - Before any POST, PUT, PATCH, or DELETE request is sent through the shared
    authenticated client, the frontend verifies the cached/authenticated
    profile. DEMO accounts receive the existing read-only error and no
    mutation request is transmitted.
  - If the profile role cannot be verified, mutations fail closed with a
    refresh instruction rather than being sent with unknown permissions.
  - The configured public demo account remains recognized immediately by its
    token email, preserving the existing `/demo` behavior.
  - USER, ADMIN, and OPERATOR read access, ticker access, and mutation behavior
    remain unchanged after their profile is verified.
- Files changed:
  - `lib/public-demo.ts`
  - `lib/auth-client.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
  - Source-level authorization audit confirmed all current User Portal API
    mutations use `authenticatedFetch`, so they pass through the shared
    role-aware demo guard. The only remaining direct POST requests are Cognito
    authentication/token flows and the server-side demo-login route.
  - Existing consumers of `isPublicDemoProfile` were verified for CURR route
    enforcement, Operations Portal denial, Development Mode denial, read-only
    alert/profile controls, and demo Internal Float/Ownership presentation.
- Remaining backend dependency / limitation:
  - These are frontend safeguards, not a security boundary. The backend must
    also reject unauthorized DEMO-role mutations because a direct API caller
    can bypass browser code.

## 2026-08-26 - Assign additional tickers while locking each user's primary ticker

- Area: Operations Portal -> Team Access.
- APIs/data:
  - Existing `GET /tickers/invite` remains the source for invitation history
    and registered-user profile details (`registered_user.ticker` and
    `registered_user.tickers`).
  - `GET /tickers?status=ACTIVE&includeDeleted=false&limit=100` supplies active
    managed-ticker suggestions.
  - Existing `POST /tickers/invite` remains the new-account workflow.
  - New `POST /tickers/assign` is used only with `action: "add"` or
    `action: "remove"` for existing registered users.
- Reported problem and root cause:
  - `POST /tickers/invite` correctly returns `409 User already exists` when an
    operator tries to grant a new company to an existing account, so the Team
    Access page had no supported way to give the account an additional ticker.
  - The assignment API also supports `remove` and `replace`, but the agreed
    portal policy requires every user to retain their dedicated primary
    `ticker` and the same symbol in `tickers`.
- Intended behavior and invariants:
  - New accounts continue through `Invite New User`; registered accounts use a
    separate `Manage Existing User` tab.
  - The user's primary `registered_user.ticker` is displayed as
    `Primary · Locked`, has no remove control, and is guarded again before any
    removal request is sent.
  - Only ticker symbols beyond the primary ticker are removable. Removal is
    exposed only when the page can identify the registered profile and its
    primary ticker from `GET /tickers/invite`.
  - Operators may add any active managed ticker that is not already assigned.
  - The add-ticker input uses the generic `Ticker symbol` placeholder and does
    not imply a particular company.
  - The portal never exposes or sends the API's `replace` action.
  - A removal requires an inline confirmation. Assignment attempts and exact
    request/response payloads appear in Development Data.
  - If an operator modifies their own access, the authenticated profile cache
    is refreshed so the company switcher can receive the updated ticker list.
  - Existing invitation filtering, pagination, operator-only page access, and
    new-user invitation behavior remain intact.
- Files changed:
  - `app/operations/user-access/UserAccessOperationsClient.tsx`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Verified the Manage Existing User add-ticker field no longer contains a
    company-specific placeholder.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
  - Local browser inspection confirmed both workflow tabs, the primary-lock
    policy, no page-level horizontal overflow at a 1024 x 768 iPad viewport,
    and correct responsive form bounds. The isolated browser was not
    authenticated, so live assignment mutation was not submitted.
- Remaining backend dependency / limitation:
  - Primary-ticker protection is intentionally frontend-only. A direct caller
    of `POST /tickers/assign` can still request `remove` or `replace`; the
    backend does not enforce this portal policy.
  - `GET /tickers/invite` is an invitation-backed list rather than a dedicated
    full-user directory. Adding access can target another registered email,
    but safe removal is available only for accounts whose registered profile
    (including the primary ticker) is returned by that endpoint.

## 2026-08-25 - Explain Off Exchange volume in the latest venue legend

- Area: User Portal -> Exchange Volume -> Latest Exchange Volume.
- APIs/data:
  - Existing `GET /market-data/current?ticker={ticker}&category=market-current`
    exchange-volume data only.
  - No API request, response, mapping, or calculation changes.
- Reported problem and root cause:
  - `Off Exchange` appeared as a venue category without explaining that it
    represents trading away from public exchanges, which could be mistaken for
    unreported or necessarily short-sale activity.
  - The initial icon rendered, but its tooltip did not appear. The legend's
    direct-child `span` rule also matched the tooltip component and applied
    `overflow: hidden`, clipping the bubble to the icon's 15px box.
- Intended behavior and invariants:
  - An information icon appears directly beside the `Off Exchange` legend
    label in Latest Exchange Volume.
  - Legend truncation applies only to the venue-label text and never to the
    tooltip container, so the bubble remains visible outside the icon bounds.
  - Hovering, focusing, or tapping the icon explains alternative trading
    systems/dark pools, broker-dealer internalization, FINRA reporting, and
    that the category does not by itself indicate short selling or unusual
    activity.
  - The explanation is available in English, Traditional Chinese, and
    Simplified Chinese.
  - Venue ordering, colors, values, percentages, chart interactions, API data,
    and historical-volume presentation remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/exchange-volume/ExchangeVolumeBrowserPage.tsx`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
  - Authenticated visual verification was blocked by the isolated browser
    session redirecting to sign-in; component structure and responsive legend
    styles were inspected directly.
- Remaining backend dependency / limitation:
  - None. This is a frontend-only explanatory UI change.

## 2026-08-20 - Show complete SEC filing audit metadata in Development Data

- Area: User Portal -> SEC Filings -> Development Data table.
- API/data:
  - `GET /manual-input/sec-filings?ticker={ticker}`.
  - No request, response, or backend behavior changes.
- Reported problem and root cause:
  - The API supplies `updatedAt` and `updatedBy`, but the frontend's manually
    defined record type and preferred-column list ended at `createdAt` and
    `createdBy`, so update audit metadata was omitted from the table.
- Intended behavior and invariants:
  - Audit columns appear in the order `Created At`, `Created By`, `Updated At`,
    and `Updated By`.
  - Values are displayed directly from the API response; missing update audit
    fields show `N/A` and are not inferred from creation metadata.
  - The normal SEC Filings list, API request, sorting behavior, and all filing
    data remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/event-calendar/EventCalendarBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser inspection confirmed all four audit headers are rendered and the
    final two cells contain the API's `updatedAt` and `updatedBy` values.
  - TypeScript type-check and whitespace validation passed.
- Remaining backend dependency / limitation:
  - Older records that do not contain update audit metadata will display
    `N/A` until the backend supplies those fields.

## 2026-08-19 - Stabilize the portal top bar and score ring on iPad Safari

- Area: User Portal -> shared top bar and Short Interest score card.
- API/data:
  - No API, payload, calculation, or data-display changes.
- Reported problem and root cause:
  - On iPad Safari, the company switcher's unsized inline chevron SVG could
    retain its intrinsic SVG dimensions inside the grid. It rendered as a
    large filled triangle and stretched the company control and top-bar row.
  - The Short Interest score ring specified its width but relied on WebKit to
    derive its height from `aspect-ratio` inside nested grids. When the two
    dimensions diverged, the 50% border radius produced an oval.
- Intended behavior and invariants:
  - The company switcher and top-bar row retain compact 36px and 38px heights,
    respectively, and the chevron is always a 16x16 unfilled stroked icon.
  - The Short Interest score ring is explicitly square at 112x112, with the
    existing 96x96 narrow-screen size preserved.
  - Tablet and phone layouts must not develop horizontal page overflow.
  - Company switching, navigation, score values, ranges, colors, API requests,
    and all other portal behavior remain unchanged.
- Files changed:
  - `app/portal-theme.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser checks at 1024x768 confirmed a 90px top bar, 38px top row, 36px
    company selector, 16x16 outlined chevron, and 112x112 score ring.
  - Browser checks at 768x1024 confirmed the same compact top bar and square
    ring with no horizontal page overflow.
  - Browser checks at 390x844 confirmed the compact company control, hidden
    company name, 16x16 chevron, and preserved 96x96 score ring without page
    overflow.
  - TypeScript type-check and whitespace validation passed.
- Remaining backend dependency / limitation:
  - None. This is a frontend-only Safari sizing fix.

## 2026-08-19 - Clarify existing-record choices in the Internal Float suggestion dialog

- Area: User Portal -> Internal Float -> Suggested Changes -> Add/Deduct from
  holding dialog.
- API/data:
  - No API or payload changes.
  - Existing suggestion application through `GET/PUT
    /manual-input/internal-float-inputs-user?ticker={ticker}` remains unchanged.
- Reported problem and root cause:
  - The `Add as new record` control aligned with only the holder-name row rather
    than the full suggestion summary, and the existing holding rows did not
    explain that selecting one changes that record's current balance.
- Intended behavior and invariants:
  - Suggestion details and the new-record action use a two-column summary, with
    the action vertically centered against the complete blue summary box.
  - A concise heading and action-specific sentence above the holdings list
    explains that selecting a row adds shares to or deducts shares from that
    existing record.
  - Positive suggestions retain `Add as new record`; deduction suggestions
    continue to require an existing target.
  - Existing save, audit, loading, and error behavior remains unchanged.
- Files changed:
  - `app/monitor/[ticker]/internal-float/InternalFloatClient.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation passed.
  - Automated browser verification was blocked by the active Cognito login
    redirect; the component structure and responsive CSS were inspected
    directly.
- Remaining backend dependency / limitation:
  - None. This is a frontend guidance and alignment change only.

## 2026-08-19 - Separate Internal Float tablet fields from record actions

- Area: User Portal -> Internal Float -> Management / Strategic Holdings,
  Tokenized Shares, and Collateralized Shares edit dialogs.
- API/data:
  - No API or payload changes.
  - Existing user- and ticker-scoped Internal Float GET/PUT behavior remains
    unchanged.
- Reported problem and root cause:
  - The first labelled-card treatment made records visible, but input fields
    and action buttons still shared equal-width grid cells. This gave every
    control the same visual importance and made adjacent records hard to scan.
- Intended behavior and invariants:
  - Each record uses a familiar portal record-card pattern with a numbered
    header, one clearly grouped field row, and a separate compact action row.
  - Holder/chain receives the most field width; category/provider and shares
    receive smaller purpose-sized columns.
  - Float Impact, Notes, and Delete are compact actions aligned left, center,
    and right instead of looking like additional input fields.
  - Tokenized and collateralized records use the same hierarchy with only
    their relevant fields and actions.
  - The earlier viewport-safe modal, no-horizontal-overflow, sticky Save/Cancel,
    field labels, input borders, and per-record note behavior must remain.
  - Desktop layout, data values, calculations, API requests, and mutations are
    unchanged.
- Files changed:
  - `app/portal-theme.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser inspection confirmed the Management / Strategic Holdings editor at
    1124x811 and 768x1024 uses distinct numbered cards, a three-column field
    row, and compact separated actions without horizontal overflow.
  - The Tokenized Shares editor was checked at 768x1024 and retained the same
    hierarchy with its chain, shares, provider, impact, and delete controls.
  - TypeScript type-check, production build, and whitespace validation passed.
- Remaining backend dependency / limitation:
  - None. This is a frontend presentation change only.

## 2026-08-19 - Move the Internal Float new-record action into the suggestion summary

- Area: User Portal -> Internal Float -> Suggested Changes -> Add to holding
  dialog.
- API/data:
  - No API or payload changes.
  - The existing `GET/PUT
    /manual-input/internal-float-inputs-user?ticker={ticker}` workflow and
    management-holdings suggestion handling remain unchanged.
- Reported problem and root cause:
  - `Add New Record` appeared as the final row in the existing-holdings target
    list, so the create action looked like another selectable holding and was
    easy to miss.
- Intended behavior and invariants:
  - The suggested entity summary displays a compact `Add as new record` button
    beside the entity name for positive-share suggestions.
  - The target list contains existing Management / Strategic holdings only.
  - Selecting the new-record button continues to invoke the same suggestion
    apply path and preserves saving, audit, and error handling behavior.
  - Deduction suggestions continue to require an existing target and do not
    offer creation of a new holding.
- Files changed:
  - `app/monitor/[ticker]/internal-float/InternalFloatClient.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation passed.
  - The dialog was checked to confirm the create action appears in the blue
    summary area and no longer appears as a holdings-list row.
- Remaining backend dependency / limitation:
  - None. This is a frontend interaction and presentation change only.

## 2026-08-19 - Redesign Internal Float tablet editors as labelled cards

- Area: User Portal -> Internal Float -> Management / Strategic Holdings,
  Tokenized Shares, and Collateralized Shares edit dialogs.
- API/data:
  - No API or payload changes.
  - Existing `GET/PUT
    /manual-input/internal-float-inputs-user?ticker={ticker}` and ticker-scoped
    Internal Float requests remain unchanged.
- Reported problem and root cause:
  - The earlier iPad overflow fix prevented clipping, but the responsive layout
    still looked like a desktop table split into two columns. Its six headings
    were detached from the corresponding controls, making each holding record
    difficult to scan and understand.
- Intended behavior and invariants:
  - At tablet widths, each record is presented as a distinct edit card.
  - Holder/chain, category/provider, and shares display their own labels and
    visually identifiable input fields.
  - Float Impact, Notes, and Delete are named actions in consistent positions.
  - Expanded notes stay attached to their record, and tokenized/collateralized
    editors use the same card treatment.
  - The earlier no-clipping, no-horizontal-overflow, viewport-safe modal, and
    sticky Save/Cancel behavior must remain intact.
  - Desktop table layout, saved values, calculations, API calls, and mutation
    behavior remain unchanged.
- Files changed:
  - `app/portal-theme.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser inspection confirmed the labelled-card layout at 1124x811 and
    768x1024 with no document or editor horizontal overflow.
  - The Management / Strategic Holdings and Tokenized Shares editors were both
    visually checked; controls, action labels, and sticky Save/Cancel buttons
    remained visible and correctly grouped.
  - TypeScript type-check, production build, and whitespace validation passed.
- Remaining backend dependency / limitation:
  - None. This is a frontend presentation change only.

## 2026-08-19 - Make user and operations portals safe at iPad sizes

- Area:
  - User Portal -> all routes at 768px portrait and 1024px landscape.
  - Internal Float -> Management / Strategic Holdings, Tokenized Shares, and
    Collateralized Shares edit dialogs.
  - Report Archive -> report viewer dialog.
  - Operations Portal -> navigation, dense page controls, save confirmation,
    and floating company indicator.
- API/data:
  - No API or data contract changes.
  - Internal Float continues to use `GET/PUT
    /manual-input/internal-float-inputs-user?ticker={ticker}` with the same
    user-scoped fields and save behavior.
- Reported problem and root cause:
  - The Internal Float editor appeared cut off on iPad because its editable
    grid retained a 900px minimum width after the page had switched to a
    tablet layout.
  - The shared modal backdrop also sat below the collapsed portal sidebar, so
    the left side of a full-width tablet dialog could be visually covered.
  - Several shared controls only switched to a compact layout below 720px,
    missing the common 768px iPad portrait width.
- Intended behavior and invariants:
  - Dialogs remain inside the visible viewport, scroll vertically when needed,
    and render above the portal sidebar in portrait and landscape.
  - Internal Float editable rows use responsive columns, retain visible field
    labels, and do not require horizontal scrolling at iPad widths.
  - User-portal headers and dense option rows wrap or scroll within their own
    containers without causing page-wide overflow.
  - The Operations Portal uses a compact top navigation at tablet portrait
    width; confirmation dialogs and the floating company indicator are bounded
    to the viewport.
  - Desktop layouts, API calls, calculations, saving, demo behavior, and all
    data values remain unchanged.
- Files changed:
  - `app/portal-theme.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Browser inspection confirmed the Internal Float editor is fully visible at
    768x1024 and 1024x768, is above the sidebar, and has no internal horizontal
    overflow.
  - All 14 user-portal routes were audited at both iPad viewport sizes; every
    route retained a document width equal to the viewport width. The hidden
    settings navigation slider remains intentionally clipped inside its own
    navigation rail.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - None. This is a frontend responsive-layout change only.

## 2026-08-19 - Fill Exchange Volume ranking columns vertically

- Area: User Portal -> Exchange Volume -> Latest Exchange Volume.
- API/data:
  - `GET /market-data/current?ticker={ticker}&category=market-current`
  - Field: `exchangeVolume`.
- Reported problem and root cause:
  - The latest venue ranking was sorted correctly by volume, but the two-column
    CSS grid placed records row by row: highest at top-left, second-highest at
    top-right, third-highest on the next left row, and so on.
- Intended behavior and invariants:
  - Venues remain sorted from highest to lowest volume.
  - The highest-ranked half fills the left column from top to bottom; the
    remaining venues continue from the top of the right column.
  - On narrow screens, the columns stack in the same descending order.
  - Pie slices, colors, labels, raw API values, hover behavior, and calculations
    remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/exchange-volume/ExchangeVolumeBrowserPage.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
  - Browser inspection confirmed the left column contains the highest values
    in descending order and the right column continues from the left column's
    final rank.
- Remaining backend dependency / limitation:
  - None. This is a frontend ordering change only.

## 2026-08-18 - Remove the Short Score 100-point ceiling

- Area:
  - User Portal -> Short Interest -> Short Interest Score.
  - Operations Portal -> Market Data -> Daily Market Inputs.
  - User Portal -> Alert Rules -> Short Score thresholds.
  - Daily report -> Short Interest Score.
- API/data:
  - `GET /market-data/current?ticker={ticker}&category=market-current`
  - `GET /market-data/history?ticker={ticker}&category=market-history`
  - `GET/PUT /manual-input/short-score?ticker={ticker}&tradeDate={date}`
  - `GET /rule-catalog` and `GET/POST /rule-catalog/user-settings`
  - Dated daily report payload field `shortInterestScore.score`.
- Reported problem and root cause:
  - Short Score can exceed 100, but several frontend surfaces still described
    it as a 100-point scale, capped operator input and alert thresholds at 100,
    and labelled Extreme as `80-100`.
  - These limits came from the superseded 0-to-100 frontend assumption. The
    current Manual Input V2 contract defines `shortScore` as a numeric value
    without an upper bound.
- Intended behavior and invariants:
  - Short Score displays its raw value without `/100` on the Short Interest
    page and in the daily report.
  - Risk bands are `0-39 Low`, `40-64 Moderate`, `65-80 High`, and `>80
    Extreme`; therefore 80 remains High and values greater than 80 are Extreme.
  - Operations can enter any non-negative Short Score, including values above
    100, with up to two decimal places.
  - Short Score alert thresholds use the unit label `score` and are no longer
    capped at 100; negative thresholds continue to normalize to zero.
  - The daily report frontend normalizes backend-provided score bands and the
    level to the same rules, so archived API wording cannot restore the old
    ceiling.
  - Other percentage, sentiment, lending-pressure, and explicitly normalized
    100-point metrics remain unchanged.
- Replaces:
  - Earlier change-log requirements that constrained Short Score to 0 through
    100 are superseded by this user-confirmed unbounded score contract.
- Files changed:
  - `app/monitor/[ticker]/short-interest/ShortInterestBrowserPage.tsx`
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
  - `app/monitor/[ticker]/settings/alerts/CustomAlertSettingsClient.tsx`
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/report-data.json`
  - `Report Templates/lean-daily-market-close-report/BACKEND_REPORT_API_REQUIREMENTS.md`
  - `Report Templates/lean-daily-market-close-report/REPORT_DATA_CONTRACT.md`
  - `Report Templates/lean-daily-market-close-report/BACKEND_REPORT_API_CORRECTIONS.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Report JSON fixture parsing and renderer checks passed; the four expected
    ranges were present and `/100` was absent.
  - Focused source scan found no remaining old Short Score cap, input maximum,
    `65-79`, or `80-100` text in the affected frontend/report surfaces.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - The report API should adopt the new `65-80` and `>80` range labels, though
    the frontend now normalizes older payloads for display.

## 2026-08-18 - Standardize daily comparison wording across market pages

- Area: User Portal -> Dashboard, Short Interest, and Lending Pressure metric
  comparisons.
- API/data:
  - `GET /market-data/current?ticker={ticker}&category=market-current`
  - `GET /market-data/history?ticker={ticker}&category=market-history`
- Reported problem and root cause:
  - Dashboard used `vs previous day`, while Short Interest and Lending Pressure
    used `vs yesterday` for the same preceding-day comparison.
  - The two pages each carried their own older label text instead of matching
    the Dashboard terminology.
- Intended behavior and invariants:
  - Short Interest and Lending Pressure now use `vs previous day`, matching the
    Dashboard.
  - The wording is translated in Traditional and Simplified Chinese.
  - Comparison calculations are unchanged: each metric still uses its own
    preceding valid observation; when that observation is older than the
    immediately preceding calendar day, the UI continues to show its explicit
    date rather than incorrectly calling it the previous day.
  - Metric as-of dates, values, API sources, and missing-data handling remain
    unchanged.
- Files changed:
  - `app/monitor/[ticker]/short-interest/ShortInterestBrowserPage.tsx`
  - `app/monitor/[ticker]/lending-pressure/LendingPressureBrowserPage.tsx`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
  - Focused source scan confirmed Dashboard, Short Interest, and Lending
    Pressure all use `vs previous day` for immediately preceding-day baselines.
- Remaining backend dependency / limitation: None identified.

## 2026-08-14 - Save Internal Float suggestion decisions through supported auditLog

- Area: User Portal -> Internal Float -> Suggested Changes and Management /
  Strategic Holdings.
- API/data:
  - `GET/PUT /manual-input/internal-float-inputs-user?ticker={ticker}`
  - Allowed user-input fields: `managementStrategicHoldings`,
    `privateFriendlyHolders`, and `auditLog`.
  - Ticker-wide suggestion source remains
    `GET /manual-input/management-holdings?ticker={ticker}`.
- Reported problem and root cause:
  - Applying a suggested change failed with HTTP 400 because the frontend sent
    the proposed `managementSuggestionDecisions` top-level field.
  - That field was never added to the deployed API contract; the backend
    correctly rejected it as unrecognized.
- Intended behavior and invariants:
  - User-scoped PUT requests no longer send `managementSuggestionDecisions`.
  - Apply saves the changed `managementStrategicHoldings.records` and a
    per-user decision marker inside the supported `auditLog` array in the same
    request. Discard saves the unchanged holdings and its decision marker.
  - Decision markers use only the documented audit-entry properties and carry
    the source suggestion ID, version, decision, and timestamp in a recognized
    structured message. Existing non-decision audit entries are preserved.
  - The frontend reconstructs decisions from the echoed audit log and removes
    a suggestion only after the server confirms the matching user-specific
    marker. Revised source versions remain reviewable.
  - Legacy `managementSuggestionDecisions` values are still readable if a
    future or older response supplies them, but the unsupported field is never
    written.
  - Previously accepted behavior remains intact: normal holding add/edit/delete
    sends only supported fields; decisions never update the global
    management-holdings status or affect another user; the demo remains
    session-only; the Ownership consolidation prompt still follows an applied
    holding change.
- Files changed:
  - `lib/internal-float-types.ts`
  - `lib/internal-float-suggestion-decisions.ts`
  - `app/monitor/[ticker]/internal-float/InternalFloatRoleView.tsx`
  - `app/monitor/[ticker]/internal-float/InternalFloatClient.tsx`
  - `lib/portal-page-translations.ts`
  - `docs/api/USER_SCOPED_MANAGEMENT_SUGGESTION_DECISIONS.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Focused decision encode/decode checks confirmed that applied/discarded
    markers round-trip through `auditLog`, replace the matching source/version
    decision, and preserve unrelated audit entries.
  - All seven focused Ownership tests passed.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - Confirmation depends on the current API continuing to persist and echo the
    allowed `auditLog` array. No new backend field or endpoint is required.

## 2026-08-14 - Use compact raw-share labels in ownership charts

- Area: User Portal -> Ownership -> filing table -> ownership-history popup
  chart.
- API/data:
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&effectiveDate={YYYY-MM-DD}`
- Reported problem and root cause:
  - Ownership chart hover details and the share axis used a fixed `x1000` unit,
    making small holdings appear as fractions and requiring users to mentally
    convert every value.
  - The chart divided API share values by 1,000 before plotting and formatting.
- Intended behavior and invariants:
  - Filing points retain their raw API share quantities for chart scaling and
    display.
  - The shared `formatCompactQuantity` formatter is used for hover values and
    Y-axis ticks: values below 1,000 remain exact, thousands use `K`, and
    millions use `M`.
  - The Y-axis title, tooltip label, and legend no longer claim a fixed
    `x1000` unit.
  - Exact-zero markers, minimum-height rendering for tiny positive holdings,
    filing dates, price history, and tooltip interactions remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/institutional/OwnershipHistoryChart.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - All seven focused Ownership helper tests passed.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - None. This is a frontend unit and formatting correction over existing raw
    share values.

## 2026-08-14 - Keep tiny positive ownership filings visible

- Area: User Portal -> Ownership -> filing table -> ownership-history popup
  chart.
- APIs/data:
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&effectiveDate={YYYY-MM-DD}`
  - `GET /market-data/history?ticker={ticker}&category=market-history`
- Reported problem and root cause:
  - Citigroup appeared to have missing filing markers around September 2025 and
    March 2026 even after explicit zero positions received baseline markers.
  - Those quarters contain tiny positive share values rather than exact zero.
    After conversion to the chart's `Shares Held (x1000)` unit, their natural
    SVG bar height was below one display pixel and therefore looked absent.
- Intended behavior and invariants:
  - Every positive filing point receives a minimum four-pixel visual bar when
    its proportional height would otherwise be smaller.
  - The bar remains anchored to the zero baseline and its tooltip continues to
    show the exact API value; the minimum height is visual only and does not
    alter chart data, tick values, or scale calculations.
  - Explicit zero positions retain the short horizontal zero marker introduced
    by the preceding fix.
  - Normal-sized positive bars, price history, dates, and filing-source filters
    remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/institutional/OwnershipHistoryChart.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - All seven focused Ownership helper tests passed.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - The filing series must contain the quarter's record; the frontend does not
    fabricate missing quarterly filings.

## 2026-08-14 - Repair Put / Call Ratio tooltip layout

- Area: User Portal -> Ownership -> Institutional Activity Summary -> Reported
  Institutional Options Exposure.
- API/data:
  - `GET /market-data/current?ticker={ticker}&category=ownership-summary-current`
- Reported problem and root cause:
  - The Put / Call Ratio label and information tooltip broke the final table
    row's layout.
  - A broad `.institutional-options-ratio span` selector applied sentiment-chip
    borders, padding, colors, and sizing to every nested span, including the
    label wrapper, information icon, and tooltip bubble.
  - After the selector correction, the centered ratio tooltip still extended
    left into the neighboring Source Breakdown column.
- Intended behavior and invariants:
  - Only the actual Bullish/Bearish sentiment label uses chip styling.
  - The Put / Call Ratio label and information icon retain the shared tooltip
    layout and accessible hover/focus behavior.
  - The ratio tooltip opens rightward from its icon and remains inside the
    Options Exposure column.
  - Ratio value, sentiment text, API mappings, and calculations are unchanged.
- Files changed:
  - `app/monitor/[ticker]/institutional/InstitutionalActivitySummary.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser inspection confirmed a normal-height ratio row, a 15px information
    icon, a separate sentiment chip, and a standard tooltip panel.
  - Browser geometry inspection confirmed the tooltip starts inside the
    Options Exposure card and no longer crosses into the left detail card.
  - TypeScript type-check passed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - None. This is a frontend selector-scope correction only.

## 2026-08-14 - Show closed ownership positions on popup charts

- Area: User Portal -> Ownership -> filing table -> ownership-history popup
  chart.
- APIs/data:
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&effectiveDate={YYYY-MM-DD}`
  - `GET /market-data/history?ticker={ticker}&category=market-history`
- Reported problem and root cause:
  - A quarterly filing that closed a holder's position at zero shares appeared
    to be missing from the popup chart.
  - The zero filing point was present in the series, but its SVG bar had a
    calculated height of zero and was therefore invisible.
- Intended behavior and invariants:
  - A zero-share quarterly filing renders as a short horizontal marker just
    above the zero baseline at its actual effective date.
  - The zero marker has a practical hover target and retains the existing
    filing tooltip, which reports exactly `0` shares held.
  - Positive filing bars, closing-price history, axes, scale calculations,
    filing dates, and source filtering remain unchanged.
  - No zero values are fabricated; the marker is rendered only when the API
    filing value is explicitly numeric zero.
- Files changed:
  - `app/monitor/[ticker]/institutional/OwnershipHistoryChart.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - All seven focused Ownership helper tests passed.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - The effective-date filing series must include the explicit zero-share
    record for the closed quarter.

## 2026-08-14 - Keep Ownership summary tooltips clear of the sidebar

- Area: User Portal -> Ownership -> Institutional Activity Summary.
- API/data:
  - `GET /market-data/current?ticker={ticker}&category=ownership-summary-current`
- Reported problem and root cause:
  - Information bubbles in the summary's left column were centered over icons
    close to the page edge, causing the left side of each bubble to extend
    underneath the portal sidebar.
  - The Net value changed label included `($1000)` even though that unit should
    not be part of the visible metric name.
- Intended behavior and invariants:
  - Tooltips in the first summary-card and detail-table columns open rightward
    from their icons and remain within the main content area.
  - Tooltips in other columns retain their existing centered placement.
  - The label reads `Net value changed`; its value, formatter, API source, and
    description remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/institutional/InstitutionalActivitySummary.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
  - Browser inspection confirmed that the first-column tooltip opens within
    the main content area and no longer overlaps the sidebar.
  - Browser inspection confirmed the visible label is `Net value changed`.
- Remaining backend dependency / limitation:
  - None. This is a frontend presentation change only.

## 2026-08-14 - Reorder Short Volume table totals

- Area: User Portal -> Short Interest -> Short Volume table.
- API/data:
  - `GET /market-data/history?ticker={ticker}&category=short-volume-history`
- Reported problem and root cause:
  - The user requested the Total Volume and Total Short Volume columns to trade
    places in the visible table.
  - The shared column definition previously placed Total Short Volume before
    Total Volume.
- Intended behavior and invariants:
  - The table now displays Date, Total Volume, then Total Short Volume before
    the existing venue-level columns.
  - Header and row values continue to use the same keyed column definition, so
    each value remains aligned with its correct label in every display mode.
  - API loading, field mappings, percentages, date filtering, sorting,
    pagination, and Development Data remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/short-interest/ShortInterestBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - None. This is a frontend presentation-order change only.

## 2026-08-14 - Add Ownership explanation tooltips from supplied wording CSV

- Area: User Portal -> Ownership -> quarterly Institution tables and
  Institutional Activity Summary.
- APIs/data:
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&effectiveDate={YYYY-MM-DD}`
  - `GET /market-data/current?ticker={ticker}&category=ownership-summary-current`
  - Wording reference: `Portal add suggest wording - Sheet1.csv`.
- Reported problem and root cause:
  - The listed ownership columns, activity-summary sections, and sub-metrics did
    not explain their business meaning in the UI.
  - The page already had an accessible information-tooltip pattern, but it was
    only used for two summary-detail headings and not for the requested items.
- Intended behavior and invariants:
  - All 24 non-empty descriptions supplied in the CSV are available through an
    information icon: Shares %, Value Change %, Ownership Flow, New / Exited,
    Concentration, their listed sub-metrics, Put / Call Ratio, and the Hedged
    and Directional holder tags.
  - Icons use the existing keyboard-focusable `InfoTooltip` component, so the
    descriptions are available by hover, focus, and accessible label.
  - Quarterly-table header tooltips open below their icons and the last-column
    tooltip is right-aligned to avoid clipping inside the horizontal table.
  - Hedged and Directional descriptions appear only when the corresponding API
    tag is present; unknown tags are displayed unchanged without an invented
    definition.
  - The supplied wording is translated for Traditional and Simplified Chinese
    through the existing portal language system.
  - Ownership values, calculations, API requests, data mappings, quarterly
    grouping, and existing fallback behavior remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/institutional/InstitutionalActivitySummary.tsx`
  - `app/monitor/[ticker]/institutional/OwnershipTable.tsx`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - The supplied CSV was imported with the bundled spreadsheet runtime; all 24
    populated wording rows were found in both the intended UI components and
    the translation catalog.
  - TypeScript type-check passed.
  - All seven focused Ownership tests passed.
  - Production build passed, including all 29 statically generated pages.
  - Browser navigation reached the local portal, but the isolated browser
    session redirected to Cognito sign-in before authenticated Ownership UI
    inspection could be completed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - None. This is an explanatory frontend-only change over the existing API
    data and does not modify any ownership logic or payload.

## 2026-08-14 - Restore Ownership largest-holder summary value

- Area: User Portal -> Ownership -> Institutional Activity Summary -> Reported
  Institutional Options Exposure.
- API/data:
  - `GET /market-data/current?ticker={ticker}&category=ownership-summary-current`
  - Primary field: `summary.oeLargetHolder`.
- Reported problem and root cause:
  - Largest Holder displayed `--` even though the ownership summary response had
    a value.
  - The live response uses the field spelling `oeLargetHolder`, while the
    frontend only looked for `oeLargestHolder` and older aliases.
- Intended behavior and invariants:
  - Largest Holder reads `summary.oeLargetHolder` first and displays its value.
  - `summary.oeLargestHolder` and the existing legacy/nested aliases remain
    supported for backward compatibility.
  - A dash is still shown only when none of the supported fields has a value;
    the other ownership summary metrics are unchanged.
- Files changed:
  - `app/monitor/[ticker]/institutional/InstitutionalActivitySummary.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - The backend field currently contains the spelling `Larget`. The frontend
    deliberately supports both `oeLargetHolder` and `oeLargestHolder` so a
    future backend spelling correction will not cause another regression.

## 2026-08-13 - Confirm Market Data API destinations before saving

- Area: Operations Portal -> Market Data -> Daily Market Inputs.
- APIs/data:
  - `PUT /manual-input/issued-share?ticker={ticker}&tradeDate={date}` when an
    issued-share value is present.
  - `PUT /manual-input/utilization?ticker={ticker}&tradeDate={date}`.
  - `PUT /manual-input/manual-availability?ticker={ticker}&tradeDate={date}`.
  - `PUT /manual-input/margins?ticker={ticker}&tradeDate={date}`.
  - `PUT /manual-input/short-score?ticker={ticker}&tradeDate={date}`.
- Reported problem and root cause:
  - An operations save intended for MIMI appeared in both MIMI and CURR, so the
    team needed a temporary, explicit checkpoint showing the exact ticker and
    endpoints before any write begins.
  - The previous Save Data action executed the requests immediately and did not
    expose the resolved request destinations for human verification.
- Intended behavior and invariants:
  - Save Data now prepares a frozen save plan and opens a confirmation dialog;
    it does not call an API before confirmation.
  - The dialog shows the active workspace ticker, API ticker, trade date,
    request count, exact HTTP method and endpoint, and JSON payload for every
    request that will be made.
  - Confirm and save executes the same captured endpoint and payload objects
    displayed in the dialog, preventing the diagnostic display from drifting
    from the actual network requests.
  - If the workspace ticker, component ticker, or captured API ticker differ,
    the save is blocked and the operator must reload the correct workspace.
  - Cancel and Escape close the dialog without writing. Existing storage,
    validation, saved-row updates, and manual consolidation behavior remain
    unchanged.
  - Date-specific Manual Input updates remain `PUT`, as documented; the UI does
    not incorrectly label them as `POST`.
- Files changed:
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including all 29 statically generated pages.
  - The existing localhost development process was found serving a stale client
    bundle and returning HTTP 500 after `.next` was replaced by the production
    build. It was restarted cleanly on port 3000, and the Market Data route was
    verified to return HTTP 200 with the confirmation code in the compiled
    application.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - This checkpoint proves what the browser is about to send, but it cannot
    prevent or detect an API Lambda writing the same request into an additional
    ticker path. Backend request logs and resolved S3 keys are still required to
    diagnose any confirmed cross-ticker duplication after submission.

## 2026-08-13 - Distinguish recent ownership activity from quarterly history

- Area: User Portal -> Ownership -> Recent Institutional Activity and Quarterly
  Filing History.
- APIs/data:
  - `GET /market-data/current?ticker={ticker}&category=ownership-current`
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&effectiveDate={all-available-dates}`
- Reported problem and root cause:
  - The current-filing and completed-quarter sections used nearly identical
    headings and table presentation, making two datasets with different timing
    and meaning appear interchangeable.
- Intended behavior and invariants:
  - Latest Filings is renamed Recent Institutional Activity and uses a restrained
    blue activity accent and activity icon.
  - The historical area is explicitly introduced as Quarterly Filing History
    with a calendar/archive icon and neutral styling.
  - Supporting copy states the timing distinction before either table is read.
  - Existing data, tabs, row highlighting, search, pagination, and chart actions
    remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/institutional/LatestInstitutionalFilings.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalTabs.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
  - Browser inspection confirmed the Recent Institutional Activity and
    Quarterly Filing History headings, the nine supported recent-activity
    columns, and the blue-accented recent-activity container.
- Remaining backend dependency / limitation:
  - None; this is a presentation-only distinction using the existing datasets.

## 2026-08-13 - Simplify the Latest Filings table schema

- Area: User Portal -> Ownership -> Latest Filings.
- API/data:
  - `GET /market-data/current?ticker={ticker}&category=ownership-current`
  - `institutionBreakdown` from the current ownership snapshot.
- Reported problem and root cause:
  - Latest Filings displayed Reported Value and Value Change % even though the
    current-filings API does not supply either value.
  - Its percentage column reused the quarterly `Shares %` label even though the
    current snapshot reports each holder's share of total institutional shares.
- Intended behavior and invariants:
  - Latest Filings has nine columns and omits unsupported Reported Value and
    Value Change % fields rather than displaying meaningless `N/A` cells.
  - Its percentage column is named `% of Institutional Shares`.
  - Completed-quarter filing tables remain unchanged, including their Shares %,
    Reported Value, and Value Change % columns.
  - Search, pagination, row-status highlighting, and ownership chart actions
    remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/institutional/OwnershipTable.tsx`
  - `app/monitor/[ticker]/institutional/LatestInstitutionalFilings.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - The current snapshot remains limited to the fields returned by
    `ownership-current.institutionBreakdown`.

## 2026-08-13 - Restore real ownership history charts for filing rows

- Area: User Portal -> Ownership -> Latest Filings and quarterly Institutions.
- APIs/data:
  - `GET /market-data/current?ticker={ticker}&category=ownership-current`
    supplies current filing rows.
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&effectiveDate={all-available-dates}`
    supplies each holder's reported share snapshots across filing periods.
  - `GET /market-data/history?ticker={ticker}&category=market-history`
    supplies the market closing-price series.
- Reported problem and root cause:
  - The previous filing-row chart action disappeared when the ownership tables
    moved to the manual filing schema.
  - Its retained chart implementation generated holder bars and price points
    from a name-based seed instead of API data, so restoring that code directly
    would have presented fictional history as real information.
- Intended behavior and invariants:
  - Both Latest Filings and completed-quarter Institutions show the same compact
    SVG chart action after the Investor column, and both tables retain identical
    11-column alignment.
  - Clicking the action opens one shared modal. Bars show only real disclosed
    holder share snapshots, grouped by effective date; the line shows real
    closing-price history from `market-history`.
  - Put and Call records are excluded from the reported-share series. No seeded,
    inferred, or local fallback chart values are generated.
  - The chart explains that filing bars are periodic disclosures rather than
    daily ownership changes, supports pointer tooltips and Escape dismissal,
    and has matching light/dark presentation.
  - Development Data exposes the newly consumed Market History API in its own
    tab so the price source can be inspected independently.
- Files changed:
  - `app/monitor/[ticker]/institutional/OwnershipHistoryChart.tsx`
  - `app/monitor/[ticker]/institutional/OwnershipTable.tsx`
  - `app/monitor/[ticker]/institutional/LatestInstitutionalFilings.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalTabs.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalDevTables.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
  - Browser verification confirmed 40 visible filing-row chart actions for the
    available demo dataset and identical headers in Latest and quarterly tables.
  - Opening a chart produced six disclosed filing bars and a real market-history
    line; the old synthetic generator is no longer present.
- Remaining backend dependency / limitation:
  - Ownership bars can only appear on reported effective dates because the
    backend provides periodic filing snapshots, not daily holder balances.
  - Closing-price coverage depends on the available `market-history` records;
    the popup shows an explicit empty state if neither real series is available.

## 2026-08-13 - Add explicit positive signs to ownership percentages

- Area: User Portal -> Ownership -> Latest Filings and quarterly Institutions.
- APIs/data:
  - `GET /market-data/current?ticker={ticker}&category=ownership-current`
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&effectiveDate={date}`
- Reported problem and root cause:
  - Positive Shares % and Value Change % values did not include a leading `+`,
    while negative values already included `-`, making direction less immediate
    to scan.
- Intended behavior and invariants:
  - Positive Shares % and Value Change % values display a leading `+` in both
    the Latest Filings and completed-quarter tables.
  - Negative values retain their existing `-`; zero remains `0%`; missing or
    invalid values remain `N/A`.
  - The rule is implemented through the shared number-format library so signed
    percentage rendering remains consistent.
- Files changed:
  - `lib/number-format.ts`
  - `app/monitor/[ticker]/institutional/OwnershipTable.tsx`
  - `app/monitor/[ticker]/institutional/LatestInstitutionalFilings.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - Latest Filings still displays Value Change % as `N/A` because that field is
    not currently supplied by `ownership-current.institutionBreakdown`.

## 2026-08-13 - Align Latest Filings with quarterly filing columns

- Area: User Portal -> Ownership -> Latest Filings.
- APIs/data:
  - `GET /market-data/current?ticker={ticker}&category=ownership-current`
  - `institutionBreakdown` from the current ownership snapshot.
- Reported problem and root cause:
  - Latest Filings used a separate nine-column layout that did not match the
    completed-quarter Institutions table displayed below it.
  - Maintaining two independently defined table headers allowed their column
    labels, order, alignment, and minimum widths to drift.
- Intended behavior and invariants:
  - Latest Filings uses the same ten-column manual filing schema as the
    quarterly table: File Date, Effective Date, Source, Investor, Type, Avg
    Price Est., Shares, Shares %, Reported Value, and Value Change %.
  - Both sections reuse the same table-header component and base table width so
    subsequent column-label changes remain synchronized.
  - Fields absent from `ownership-current.institutionBreakdown`, including
    Reported Value and Value Change %, display `N/A`; the frontend does not
    invent or derive unsupported filing values.
  - Newest-first ordering, search, pagination, status row colors, and exclusion
    of Put/Call records remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/institutional/OwnershipTable.tsx`
  - `app/monitor/[ticker]/institutional/LatestInstitutionalFilings.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
  - Browser inspection confirmed both rendered tables expose the same ten
    headers in the same order.
- Remaining backend dependency / limitation:
  - `ownership-current.institutionBreakdown` does not currently expose Reported
    Value or Value Change %, so those aligned columns remain `N/A` until the
    backend adds those values.

## 2026-08-12 — Label fictional demo sections at their point of use

- Area: Authenticated demo → Internal Float and Ownership.
- APIs/data:
  - Live `GET /market-data/current?category=internal-float-current-user` and
    `GET /market-data/current?category=ownership-current` remain unchanged.
  - Fictional `demoInternalFloatUserInputs.privateHoldings` continues to supply
    demo Management / Strategic Holdings and Ownership Strategic Entities.
- Reported problem and root cause:
  - A long page-level “Interactive demonstration” banner was detached from the
    fictional data it described and incorrectly suggested that every value on
    Internal Float was fictional, even though shared issuer data remains live.
  - Ownership had no local indicator identifying its fictional Strategic
    Entities row.
- Intended behavior and invariants:
  - Remove the page-wide demo explanation from Internal Float.
  - In demo mode only, show a compact `DEMO DATA` tag directly beside the
    Management / Strategic Holdings heading and beside the Strategic Entities
    ownership legend row.
  - Do not tag live shared issuer data, and do not show either tag to normal
    authenticated users.
  - The tags support light mode, dark mode, Traditional Chinese, and Simplified
    Chinese without changing any API request or data calculation.
- Files changed:
  - `app/monitor/[ticker]/internal-float/InternalFloatClient.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalOverview.tsx`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - End-to-end `/demo` browser verification confirmed the old heading and long
    explanation are absent from Internal Float.
  - Internal Float rendered exactly one tag beside Management / Strategic
    Holdings; Ownership rendered exactly one tag in the Strategic Entities row.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - None. This is a demo-only presentation change; API payloads and persistence
    behavior are untouched.

## 2026-08-12 — Isolate demo Internal Float suggestions from live holdings

- Area: Authenticated demo → Internal Float → Suggested Changes.
- APIs/data:
  - Live `GET /market-data/current?category=internal-float-current-user`.
  - Live `GET /manual-input/management-holdings?ticker=CURR`.
  - Fictional `demoInsiderSuggestions` from `lib/internal-float-demo.ts`.
- Reported problem and root cause:
  - Demo Internal Float correctly replaced user-managed holdings with fictional
    data, but the Suggested Changes component still merged consolidated live
    suggestions and operations-managed holdings from the real CURR APIs.
  - As a result, the read-only demo exposed real holder names and proposed
    share changes in an otherwise fictional, user-specific section.
- Intended behavior and invariants:
  - When `demoMode` is active, Suggested Changes receives only the checked-in
    fictional suggestion records and never receives the live consolidated or
    management-holdings suggestion arrays.
  - Normal authenticated users continue using the original live suggestion
    merge, status filtering, and ID deduplication behavior.
  - Demo suggestion Apply and Discard actions remain browser-session-only and
    never call mutation APIs.
  - Live shared issuer data elsewhere on Internal Float remains unchanged.
- Files changed:
  - `app/monitor/[ticker]/internal-float/InternalFloatRoleView.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - End-to-end `/demo` browser verification loaded Internal Float and confirmed
    exactly two suggestion cards: `Fictional Executive One` and
    `Sample Director Holdings`.
  - The suggestion list contained no additional live records.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - None. This is a presentation isolation rule for the authenticated demo;
    live API payloads and normal-user behavior are unchanged.

## 2026-08-12 — Keep demo Ownership available without a user-input file

- Area: Authenticated demo → Ownership.
- APIs/data:
  - `GET /manual-input/internal-float-inputs-user?ticker=CURR`.
  - `GET /market-data/current?category=ownership-current`.
  - `GET /market-data/current?category=internal-float-current-user`.
  - Fictional `demoInternalFloatUserInputs.privateHoldings` presentation data.
- Reported problem and root cause:
  - The newly created native demo account has no user-scoped
    `internal-float-inputs-user` record, so the optional manual-input API
    correctly returns `404 Record not found and no template available`.
  - Ownership loaded this optional request inside one `Promise.all`; its 404
    rejected the complete page load before the existing demo holdings fallback
    could be selected, producing `Ownership data unavailable` even though all
    shared ownership sources were healthy.
- Intended behavior and invariants:
  - A 404 from the optional user-input request is normalized to an empty input
    object and does not make Ownership unavailable.
  - Once the authenticated profile is recognized as the configured demo, the
    page continues to use its fictional user-specific strategic holdings while
    shared CURR ownership, history, filings, and consolidated data remain live.
  - Non-404 failures from this request still surface as page errors; the fix
    does not conceal authentication, authorization, network, or server faults.
  - Normal users with no personal holdings file also receive an empty holdings
    state instead of losing the complete Ownership page.
- Files changed:
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - An end-to-end browser run completed automatic `/demo` authentication,
    reproduced the user-input 404, and loaded `/monitor/CURR/institutional`
    without the unavailable state.
  - The rendered Ownership page displayed the live Aug 11, 2026 CURR data and
    the fictional demo strategic-entity total of 22.00M.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - None for page availability. The user-scoped input file can remain absent
    because demo holdings are intentionally fictional and browser-managed.

## 2026-08-12 — Restore one-click login for the native Cognito demo account

- Area: Public `/demo` entry and server-side Cognito authentication.
- APIs/data:
  - Portal `POST /api/demo-login`.
  - Cognito `InitiateAuth` with `USER_PASSWORD_AUTH`.
  - Authenticated API Gateway `GET /profile`.
- Reported problem and root cause:
  - Google-federated login required public visitors to possess or select the
    shared Google account, so it could not provide a usable public demo.
  - A native Cognito account has now been created for
    `demo.curr@gmail.com`, allowing the portal to authenticate it without
    exposing credentials or involving Google account selection.
- Intended behavior and invariants:
  - Opening `/demo` calls a same-origin server route that supplies the fixed
    demo email and the server-only `DEMO_ACCOUNT_PASSWORD` to Cognito.
  - The browser never renders, receives, or submits the password. On success it
    receives Cognito session tokens, verifies that `GET /profile` resolves to
    the configured demo email, and opens the CURR dashboard.
  - The route rejects cross-origin starts, disables caching, and returns clear
    controlled messages for missing configuration, missing/unconfirmed users,
    password reset requirements, invalid passwords, and unsupported challenges.
  - Normal Cognito/Google `/login` behavior remains unchanged.
  - Existing demo identification, CURR scoping, UI read-only controls, and
    frontend mutation blocking remain intact.
- Files changed:
  - `.env.example`
  - `app/api/demo-login/route.ts`
  - `app/demo/DemoLauncher.tsx`
  - `lib/auth-client.ts`
  - `lib/public-demo.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Live Cognito authentication returned HTTP 200, no challenge, and complete
    access, ID, and refresh tokens without logging any credential or token.
  - The returned ID token successfully called `GET /profile`, which resolved to
    `demo.curr@gmail.com`, role `DEMO`, and ticker access `["CURR"]`.
  - TypeScript type-check passed.
  - Production build passed, including all 29 statically generated pages and
    the restored dynamic `/api/demo-login` route.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - Production must define `DEMO_ACCOUNT_PASSWORD` and optionally
    `DEMO_COGNITO_CLIENT_ID`; the selected no-secret app client must permit
    `ALLOW_USER_PASSWORD_AUTH` and refresh-token authentication.
  - Frontend mutation blocking is not a security boundary because the browser
    receives valid Cognito tokens. The backend must deny mutations for this
    account's immutable Cognito `sub` before public launch.

## 2026-08-12 — Route the Gmail demo account through Google sign-in

- Area: Public `/demo`, Cognito OAuth startup, and callback identity validation.
- APIs/data:
  - Cognito `/oauth2/authorize` Authorization Code + PKCE flow with
    `identity_provider=Google`.
  - Authenticated `GET /profile` email used to validate the selected account.
- Reported problem and root cause:
  - `/demo` displayed `Unable to open the live demo` after the account changed
    to `demo.curr@gmail.com`.
  - A direct Cognito diagnostic returned `UserNotFoundException`: this address
    is a Google-federated identity in the configured user pool, not a native
    Cognito username/password user, so `USER_PASSWORD_AUTH` cannot sign it in.
- Intended behavior and invariants:
  - `/demo` now starts the same secure PKCE flow used by the portal but routes
    directly to Google and requests the configured demo account.
  - Google controls account selection and authentication. The portal never
    stores, prefills, submits, or exposes a Google password; Google may show an
    account chooser because Cognito cannot guarantee forwarding an email hint
    to the Google provider.
  - The callback requires the resulting profile email to match
    `demo.curr@gmail.com` when sign-in originated from `/demo`. Selecting a
    different Google account does not open the demo workspace.
  - Normal `/login`, normal authenticated accounts, and the existing frontend
    demo/read-only behavior remain unchanged.
  - The obsolete server-side password login route and its example environment
    settings are removed.
- Files changed:
  - `.env.example`
  - `app/api/demo-login/route.ts` (removed)
  - `app/demo/DemoLauncher.tsx`
  - `lib/auth-client.ts`
  - `lib/public-demo.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Confirmed the previous route reached Cognito and reproduced HTTP 400
    `UserNotFoundException` without exposing the configured password.
  - TypeScript type-check passed after removing the stale generated route cache.
  - Production build passed, including all 29 statically generated pages; the
    obsolete `/api/demo-login` route is absent from the route manifest.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - The Cognito app client must retain Google as an enabled identity provider
    and the deployed callback URL must remain registered.
  - Google authentication is interactive; a public visitor who is not already
    authorized to use `demo.curr@gmail.com` cannot be silently signed in as it.
  - Backend mutation denial must still target this account's immutable Cognito
    `sub` before treating the authenticated demo as a public read-only account.

## 2026-08-12 — Replace the retired demo account email

- Area: Public `/demo` automatic login and all frontend demo/read-only guards.
- APIs/data:
  - `POST /api/demo-login` (portal server route).
  - Cognito `InitiateAuth` with `USER_PASSWORD_AUTH`.
  - Authenticated `GET /profile` email used to identify the demo experience.
- Reported problem and root cause:
  - The previous demo Cognito identity was retired and replaced by the working
    `demo.curr@gmail.com` account.
  - The login route and frontend guards both contained the retired address, so
    changing only Cognito would allow login but would not activate all demo-only
    read-only and CURR-scoping behavior.
- Intended behavior and invariants:
  - `/demo` authenticates `demo.curr@gmail.com` automatically with the existing
    server-only password flow; no email or password field is exposed.
  - The same shared email constant identifies the demo profile throughout the
    frontend, keeping automatic login, demo labeling, CURR scoping, disabled
    mutations, and operations access denial aligned.
  - Normal `/login` behavior and normal authenticated accounts are unchanged.
  - The retired demo email no longer appears in runtime source or current
    configuration documentation.
- Files changed:
  - `app/api/demo-login/route.ts`
  - `lib/public-demo.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Repository search confirmed the retired address is absent and the new
    address has one runtime source of truth.
  - TypeScript type-check passed.
  - Production build passed after clearing a stale generated `.next` cache,
    including all 29 statically generated pages.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - Deployment must set `DEMO_ACCOUNT_PASSWORD` to the permanent Cognito
    password for `demo.curr@gmail.com` and retain the compatible demo app client.
  - Backend mutation denial must target the immutable Cognito `sub` belonging
    to the replacement account before the demo is made public.

## 2026-08-12 — Move `/demo` to the authenticated demo account

- Area: Public `/demo` entry, all CURR user-portal pages, Internal Float,
  Ownership, Report Archive, Alert Rules, User Profile, Development Mode, and
  Operations Portal access.
- APIs/data:
  - Normal authenticated `GET /profile`, Market Data, Manual Input, Social
    Data, Reports, Rule Catalog, Alerts, and Tickers requests documented in
    `docs/INTEGRATION (7).md`.
  - Demo-account identity: `demo.curr@gmail.com`.
- Reported problem and root cause:
  - The public demo used a frontend-only session and intercepted API requests
    with `publicDemoFetch`, so most pages showed bundled June 2026 fixtures,
    synthetic social records, and a sample report instead of the shared CURR
    data visible to authenticated users.
  - Internal Float and Ownership require a narrower exception: their shared
    issuer data should stay live while user-managed holdings remain fictional.
- Intended behavior and invariants:
  - `/demo` now calls the server-only `POST /api/demo-login` route, which uses
    Cognito `USER_PASSWORD_AUTH` to create the demo session automatically. The
    hosted Cognito page, Google button, email field, and password field are not
    shown.
  - The demo password is read only from `DEMO_ACCOUNT_PASSWORD` on the server;
    it is not stored in source code, a `NEXT_PUBLIC_*` variable, page HTML, or
    the browser request. The optional `DEMO_COGNITO_CLIENT_ID` selects a
    dedicated no-secret Cognito client and otherwise falls back to the portal
    client ID.
  - After authentication, the demo account uses the same read APIs and shared
    CURR market, ownership, lending, short-interest, sentiment, exchange,
    filing, company, alert-catalog, and report data as other authorized CURR
    users. The legacy bundled demo adapter is no longer called by the shared
    authenticated data client.
  - The exact normalized profile/JWT email identifies the demo experience;
    creating a new application role is not required.
  - Demo Ownership and Internal Float retain the fictional user holdings from
    `demoInternalFloatUserInputs`. Issued shares, institutional ownership,
    ticker-level token/collateral inputs, operations suggestions, and other
    shared values continue to come from live APIs. Demo Internal Float changes
    remain browser-session-only.
  - The report archive no longer invents a previous-day report and instead
    reads the authenticated report index and report payloads.
  - The demo account is restricted to CURR in the frontend, cannot enable
    Development Mode, receives an Operations Portal access-denied view, and
    cannot issue mutations through `authenticatedFetch`. Alert settings and
    profile controls also render read-only.
  - Normal authenticated accounts retain their existing API, editing, ticker,
    reporting, Development Mode, and Operations Portal behavior.
- Files changed:
  - `.env.example`
  - `app/api/demo-login/route.ts`
  - `app/demo/DemoLauncher.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `app/monitor/[ticker]/internal-float/InternalFloatRoleView.tsx`
  - `app/monitor/[ticker]/reports/ReportArchiveBrowserPage.tsx`
  - `app/monitor/[ticker]/settings/alerts/CustomAlertSettingsClient.tsx`
  - `app/monitor/[ticker]/user-profile/UserProfileClient.tsx`
  - `app/operations/OperationsShell.tsx`
  - `components/AuthGuard.tsx`
  - `components/DevModeToggle.tsx`
  - `components/PublicDemoWelcome.tsx`
  - `components/UserMenu.tsx`
  - `lib/auth-client.ts`
  - `lib/public-demo.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
  - Local API verification confirmed the server route uses no-store response
    headers and returns a controlled configuration error when its private
    password is absent; the `/demo` page renders that error without opening
    hosted Cognito or exposing credential fields.
- Remaining backend dependency / limitation:
  - The Cognito/profile record for `demo.curr@gmail.com` must exist and
    have CURR in its authorized `tickers` list.
  - Deployment must set server-only `DEMO_ACCOUNT_PASSWORD` and, when a
    separate client is used, `DEMO_COGNITO_CLIENT_ID`. That Cognito app client
    must enable `ALLOW_USER_PASSWORD_AUTH`, issue refresh tokens, and have no
    client secret. A successful end-to-end demo login cannot be verified until
    these values and Cognito settings exist in the deployment environment.
  - Frontend mutation blocking prevents portal UI writes but is not a security
    boundary. The backend/API authorizer must deny POST, PUT, PATCH, and DELETE
    requests for this account, preferably by its immutable Cognito `sub`,
    before public credentials are distributed.

## 2026-08-11 - Add current-snapshot Latest Filings to Ownership

- Area: User Portal -> Ownership.
- APIs/data:
  - `GET /market-data/current?ticker={ticker}&category=ownership-current`
  - `institutionBreakdown` from `current/{ticker}/ownership-current.json`
- Reported problem and root cause:
  - The existing Institutions table is organized by completed reporting
    quarter and therefore does not provide a focused view of filings arriving
    in the latest daily ownership snapshot.
  - The current snapshot already supplies file date, effective date, form,
    holder, current and previous shares, estimated average price,
    institutional-share percentage, and `positionStatus`, but these fields were
    only used for overview bars.
- Intended behavior and invariants:
  - A separate Latest Filings section appears immediately below Institutional
    Activity Summary and above the completed-quarter Institutions/Insiders
    tables.
  - It reads only `ownership-current.institutionBreakdown`; it does not merge
    manual quarterly history or local fallback data.
  - Rows are ordered by file date and effective date newest first, support
    search, and paginate at 10 records per page.
  - `positionStatus` remains a presentation input rather than a visible column:
    new positions are light green, closed positions are light red, and held
    positions use the normal row style in light and dark themes.
  - Put and Call records are excluded from this ordinary-share filing table
    because they are represented in Reported Institutional Options Exposure
    and must not be presented as actual share purchases or sales.
  - The existing completed-quarter table remains unchanged.
  - Development mode includes a separate Latest Filings tab containing the raw
    `institutionBreakdown` records from the same API response.
- Files changed:
  - `app/monitor/[ticker]/institutional/LatestInstitutionalFilings.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalDevTables.tsx`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Next.js production build passed.
  - Whitespace validation passed.
  - The supplied `ownership-current.json` was validated as 19 source records,
    producing 18 ordinary filing rows after excluding one Call exposure; four
    rows are new and five are closed.
  - Public demo browser inspection confirmed a 10-row first page, two-page
    pagination, and table overflow contained within its horizontal scroll area.
- Remaining backend dependency / limitation:
  - The current category is a snapshot rather than a full daily archive. The
    frontend can show only the filing records retained in
    `ownership-current.institutionBreakdown`; completed-quarter history remains
    sourced separately.

## 2026-08-11 — Align demo Ownership strategic entities with Internal Float

- Area: Public `/demo` workspace → Ownership and Internal Float.
- APIs/data:
  - Demo equivalents of `GET /market-data/current?category=ownership-current`
    and `GET /market-data/current?category=internal-float-current-user`.
  - Demo equivalent of `GET /manual-input/internal-float-inputs-user`.
- Reported problem and root cause:
  - Ownership showed `Wong Man San` as its strategic entity while Internal
    Float showed the fictional Internal Float demo holdings.
  - The public demo adapter still returned the older checked-in CURR fixture
    for Ownership's user-scoped Internal Float requests, so the two demo pages
    used different strategic-holdings sources.
- Intended behavior and invariants:
  - Demo Ownership and demo Internal Float use the same fictional private
    holdings from `demoInternalFloatUserInputs`.
  - Their strategic total and public/real-float derived values are recalculated
    from those same records, preventing the names and totals from drifting.
  - `Wong Man San` is removed from the public demo presentation only. Live
    authenticated Ownership and Internal Float API behavior is unchanged.
- Files changed:
  - `lib/public-demo-api.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Demo response construction was verified to use the four Internal Float
    fictional holdings and their 22,000,000-share total.
- Remaining backend dependency / limitation:
  - None. This correction applies only to bundled public demonstration data.

## 2026-08-11 — Restore data across the explicit public demo workspace

- Area: Public `/demo` workspace → Dashboard, Ownership, Internal Float, Short
  Interest, Lending Pressure, Social Sentiment, Exchange Volume, SEC Filings,
  Report Archive, Alert Rules, Company Management, and User Profile.
- APIs/data:
  - Demo equivalents of the existing authenticated Market Data, Manual Input,
    Social Data, AI Report, Reports, Rule Catalog, Alerts, Tickers, and Profile
    GET requests.
  - Bundled CURR demonstration fixtures under `reference-data/centralized-v2`
    plus the checked-in daily report sample.
- Reported problem and root cause:
  - Visiting the deployed `/demo` route opened the portal shell, but every page
    that used `authenticatedFetch` failed with `Not authenticated` and showed
    no data.
  - The demo launcher intentionally clears authentication and starts an
    explicit session-only demo flag. `AuthGuard` recognized that flag, but the
    shared data client still required an ID token. Only a few pages retained
    individual demo exceptions after the portal migrated to authenticated APIs.
- Intended behavior and invariants:
  - Only the explicit session created by `/demo` uses the bundled CURR demo
    adapter. Normal signed-in accounts continue to use API Gateway responses
    and never fall back to demonstration JSON.
  - The adapter mirrors the existing endpoint shapes from one shared boundary,
    including combined current/history responses, category requests,
    partitioned ownership history, date-filtered and paginated social records,
    report rendering data, alert definitions, company status, and profile data.
  - Social demonstration records use recent post dates so the default seven-day
    feed range is populated and its platform/date filters continue to work.
  - The demonstration workspace is read-only. Non-GET requests receive a clear
    sign-in message and cannot mutate backend or bundled fixture data.
  - Missing data is never converted to authenticated production data, and the
    production API contract and authorization behavior are unchanged.
- Files changed:
  - `lib/public-demo-api.ts`
  - `lib/auth-client.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Local browser verification entered through `/demo` and confirmed populated
    content on all workspace and settings routes listed above.
  - No tested route showed `Not authenticated`, `data unavailable`, or `unable
    to load`; the browser console contained no errors.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - None for the public demo. The demo intentionally uses bundled sample data;
    authenticated portal users remain dependent on their authorized APIs.

## 2026-08-11 — Restrict Development Mode to operator and admin accounts

- Area: User Portal and Operations Portal → sidebar Development Mode control
  and development-only surfaces.
- APIs/data:
  - `GET /profile` authenticated profile field `role`.
- Reported problem and root cause:
  - The User Portal rendered Development Mode for every authenticated account
    and restored its state directly from browser storage without checking the
    account role.
  - The Operations Portal hid the control from regular users, but its wrapper
    role check did not clear a previously stored enabled state.
- Intended behavior and invariants:
  - Only exact normalized `OPERATOR` and `ADMIN` roles may see or toggle
    Development Mode. `USER`, `DEMO`, missing roles, and failed profile
    requests remain unauthorized.
  - Development Mode is forced off before the authenticated profile resolves.
  - For every unauthorized account, the saved Development Mode preference is
    removed and the document state remains off, so development-only content
    and the Backend Portal shortcut stay hidden.
  - An authorized operator or administrator retains the existing saved on/off
    preference and can continue using Development Mode in both portals.
  - Existing API requests, production page data, and role permissions outside
    Development Mode are unchanged.
- Files changed:
  - `components/DevModeToggle.tsx`
  - `app/operations/OperationsShell.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - None. The authenticated `/profile` role remains the authority for this UI
    capability.

## 2026-08-11 — Use backend position status for 13F row highlights

- Area: User Portal → Ownership → Institutions / 13F records.
- API/data:
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&action=available-dates`
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&effectiveDate={YYYY-MM-DD}`
  - Optional row field prepared for future backend output: `positionStatus`.
- Reported problem and root cause:
  - The requested backend position status was not mapped by the frontend.
    Authenticated inspection of all effective-date partitions subsequently
    confirmed that the current 80-record CURR response does not yet include
    `positionStatus` on any row.
- Intended behavior and invariants:
  - `positionStatus` is an internal presentation signal only and is not shown
    as a separate table column or badge.
  - A backend status representing a new purchase/opened position gives the row
    a light-green highlight; a closing/closed/exited position gives it a
    light-red highlight.
  - When `positionStatus` is present, it is authoritative. Neutral or unknown
    explicit statuses are not recolored by the legacy inference logic.
  - Older records without `positionStatus` retain the previous inferred row
    highlighting, preserving compatibility with historical partitions.
  - Quarter grouping, newest-first sorting, search, pagination, and both light
    and dark theme behavior remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `app/monitor/[ticker]/institutional/OwnershipTable.tsx`
  - `lib/types.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
  - Authenticated live-data inspection loaded all 80 CURR records across every
    available effective-date partition and found no `positionStatus` field.
  - The current table retains its original columns and inferred highlights.
- Remaining backend dependency / limitation:
  - The current integration document and live API responses do not yet include
    `positionStatus`. The frontend accepts it as a hidden row-color signal once
    effective-date partition responses begin supplying it.

## 2026-08-10 — Download legacy-dated archived reports safely

- Area: User Portal → Report Archive → View PDF and Download.
- API/data:
  - `GET /market-data/reports?ticker={ticker}&date={YYYY-MM-DD}`
- Reported problem and root cause:
  - Downloading the July 31 report failed with “The report API returned an
    unknown date instead of 2026-07-31.”
  - The archive entry supplied `2026-07-31`, but the frontend validated only
    the current lean payload field `reportDateIso`. Older report payloads may
    expose the same ISO report date as top-level `asOfDate`, as documented by
    the existing reports API, or as `tradingSnapshot.asOfDateIso`.
- Intended behavior and invariants:
  - Current report payloads continue to prefer top-level `reportDateIso`.
  - When that field is absent, the downloader accepts only a strict
    `YYYY-MM-DD` value from `tradingSnapshot.asOfDateIso` or legacy
    top-level `asOfDate`.
  - The resolved response date must still exactly equal the selected archive
    date. Wrong-date payloads remain blocked.
  - The validated date is normalized back to `reportDateIso` for the PDF
    renderer; ticker validation, immutable dated-report loading, and the
    separate dated AI overlay remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - Legacy reports still need to contain the remaining fields required by the
    current PDF template; this change only reconciles the documented date-field
    variants.

## 2026-08-07 — Standardize full API banners in every Development Data table

- Area: User and Operations portals → all Development Data sections.
- APIs/data:
  - Presentation-only coverage of the existing Market Data, Manual Input,
    Social Data, Rule Catalog, ticker-management, import/export, and Operations
    API requests already used by each page.
- Reported problem and root cause:
  - Some Development Data sections showed the exact active endpoint and source
    beneath their tabs, while the custom Dashboard and Ownership tab systems
    showed only tables. The SEC Filings development section was also a direct
    table without the shared tab metadata treatment.
  - Several user-portal tabs used shortened endpoint labels that omitted the
    active ticker even though the request itself was ticker-specific.
- Intended behavior and invariants:
  - Every Development Data table now displays one consistent banner directly
    beneath the tabs with the active tab's full method/path, source, and state.
  - Switching tabs changes the banner to that tab's API. The endpoint remains
    visible in the tab subtitle as well.
  - Ticker-scoped Dashboard, Ownership, SEC Filings, Internal Float, Exchange
    Volume, Lending Pressure, Short Interest, Sentiment, and Alert Rules
    endpoints include the current ticker and category/query parameters.
  - API Gateway is identified consistently for direct API responses. Frontend
    compositions remain explicitly labeled as such.
  - Payload parsing, API requests, calculations, tables, pagination, and all
    production data behavior are unchanged.
- Files changed:
  - `components/ImportDataTabs.tsx`
  - `components/ApiDevelopmentTabs.tsx`
  - `app/monitor/[ticker]/dashboard/DashboardDevTables.tsx`
  - `app/monitor/[ticker]/dashboard/DashboardBrowserPage.tsx`
  - `app/monitor/[ticker]/event-calendar/EventCalendarBrowserPage.tsx`
  - `app/monitor/[ticker]/exchange-volume/ExchangeVolumeBrowserPage.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalDevTables.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `app/monitor/[ticker]/internal-float/InternalFloatRoleView.tsx`
  - `app/monitor/[ticker]/lending-pressure/LendingPressureBrowserPage.tsx`
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `app/monitor/[ticker]/settings/alerts/CustomAlertSettingsClient.tsx`
  - `app/monitor/[ticker]/short-interest/ShortInterestBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including static generation for all 29 pages.
  - Whitespace validation passed.
  - Browser verification on the Operations Ownership page found exactly one
    active-source banner showing the full ticker-specific endpoint, `API
    Gateway`, and request state. Authenticated user-portal tables could not be
    inspected in that browser session because it redirected to sign-in.
- Remaining backend dependency / limitation:
  - None. This change displays the already-used request definitions and does
    not require a backend contract change.

## 2026-08-07 — Simplify visible institution filing columns

- Area: User Portal → Ownership → Institutions quarterly tables.
- API/data:
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&effectiveDate={YYYY-MM-DD}`
- Reported problem and root cause:
  - Missing ownership types were rendered as `N/A`, adding visual noise.
  - Portfolio Allocation was present in the imported schema but was not wanted
    in the user-facing quarterly filing table.
- Intended behavior and invariants:
  - Missing or `N/A` Type values render as blank cells.
  - Portfolio Allocation is removed from the visible Institutions table and
    from its search surface.
  - The raw `portAlloc` API field remains available in Development Data; no API
    data is changed or discarded.
  - Quarterly grouping, newest-first ordering, two-quarters-per-page
    pagination, and the remaining visible columns stay unchanged.
- Files changed:
  - `app/monitor/[ticker]/institutional/OwnershipTable.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - All seven focused ownership helper tests passed.
  - Production build passed after clearing the stale generated Next.js cache,
    including all 29 statically generated pages.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - None for this presentation-only change.

## 2026-08-07 — Group SEC institution filings into quarterly tables

- Area: User Portal → Ownership → Institutions table.
- APIs/data:
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&action=available-dates`
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&effectiveDate={YYYY-MM-DD}`
- Reported problem and root cause:
  - SEC institution filings were displayed as one continuous row-paginated
    table even though the source records represent quarterly reporting periods.
  - Column sort controls could also break the intended quarter chronology once
    records were divided into reporting-period sections.
- Intended behavior and invariants:
  - Institution records are grouped by the quarter of `effectiveDate`, with
    `fileDate` used only when an effective date is unavailable.
  - Quarter sections are ordered newest first and exactly two quarters are
    shown per page; rows inside each section are ordered by filing date newest
    first.
  - Each quarter has its own header and table surface with a visible gap between
    adjacent quarters.
  - Column titles are static labels without sorting controls.
  - Search continues to cover the complete loaded dataset and then displays
    matching records in the same quarter-grouped structure.
  - Institutions continue to use Manual Security Ownership exclusively, all
    effective-date partitions remain loaded, and Insiders remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/institutional/OwnershipTable.tsx`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - All seven focused ownership helper tests passed.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - Accurate quarter grouping depends on the API continuing to provide valid
    `effectiveDate` values (or `fileDate` where an effective date is absent).

## 2026-08-07 — Load complete Institutions history across effective dates

- Area: User Portal → Ownership → Institutions table.
- APIs/data:
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&action=available-dates`
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&effectiveDate={YYYY-MM-DD}`
- Reported problem and root cause:
  - The Institutions table showed only 15 records with the `31 Mar 2026`
    effective date even though the imported history contains roughly 80
    records.
  - The frontend resolved the available-date index but fetched only its newest
    partition instead of loading the complete imported history.
- Intended behavior and invariants:
  - Ownership loads every effective-date partition listed by the Manual
    Security Ownership API and combines them into one paginated history table.
  - Historical rows remain distinct across effective dates and are sorted by
    effective date, then filing date, newest first.
  - A failed partition does not discard successfully loaded partitions; the
    Development Data status reports a partial-load warning.
  - `Option Type` is retained in the raw API data but is removed from the
    visible Institutions table.
  - Institutions continue to use Manual Security Ownership exclusively, with
    no ownership-history fallback. Insiders remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `app/monitor/[ticker]/institutional/OwnershipTable.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including static generation for all 29 pages.
  - Whitespace validation passed.
  - All seven focused ownership helper tests passed.
- Remaining backend dependency / limitation:
  - Complete history requires the available-date metadata to list every stored
    effective-date partition.

## 2026-08-07 — Make Manual Security Ownership the exclusive Institutions source

- Area: User Portal → Ownership → Institutions table.
- APIs/data:
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&action=available-dates`
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&effectiveDate={YYYY-MM-DD}`
  - `GET /market-data/history?category=ownership-history` (Insiders only)
- Reported problem and root cause:
  - The first Manual Security Ownership integration still substituted
    ownership-history institution records when the newest manual partition was
    empty or unavailable.
  - That fallback obscured whether the imported Manual Input dataset was
    actually present and retained the older institution source implicitly.
- Intended behavior and invariants:
  - The Institutions table reads only the newest Manual Security Ownership
    partition and never substitutes ownership-history institution rows.
  - If the Manual Input endpoint fails or has no records, the Institutions tab
    stays empty and displays the specific API reason or an explicit no-imported-
    records message.
  - The Manual Input table schema remains active even when empty. Its frontend
    columns explicitly include `Type` and `Avg Price Est.` along with the other
    imported CSV fields.
  - The Ownership Development Data panel no longer presents a separate
    Security Ownership History institution table.
  - Insiders temporarily continue to read activist/major-holder records from
    ownership-history until an alternative source is approved.
  - Ownership Current KPIs, Institution Holdings Breakdown, Strategic
    Entities, and all raw Manual Input fields remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalDevTables.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalTabs.tsx`
  - `app/monitor/[ticker]/institutional/OwnershipTable.tsx`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation passed.
  - All seven focused ownership helper tests passed.
  - The production build passed, including all 29 statically generated pages.
- Remaining backend dependency / limitation:
  - Insiders still depend on ownership-history by explicit temporary decision.
  - Older Manual Security Ownership partitions are not yet selectable from the
    user-facing Ownership page.

## 2026-08-07 — Stop zeroing Strategic Entities during snapshot refresh

- Area: User Portal → Ownership → Ownership Structure and Strategic Entities.
- APIs/data:
  - `GET /market-data/current?ticker={ticker}&category=internal-float-current-user`
  - `GET /manual-input/internal-float-inputs-user?ticker={ticker}`
- Reported problem and root cause:
  - The Strategic Entities detail panel correctly showed the current user's
    holding records, but the Ownership Structure donut showed zero.
  - A frontend equality gate accepted the consolidated total only when it
    exactly matched the separately fetched raw input total. During normal
    consolidation or cache delay, any mismatch was converted to zero even when
    the consolidated endpoint contained a valid value.
- Intended behavior and invariants:
  - The donut and calculated Public Float use the consolidated
    `internal-float-current-user` snapshot directly.
  - The page never substitutes `ownership-current.strategicEntities` or raw
    manual-input holdings into the donut calculation.
  - Raw user holdings continue to populate the Strategic Entities detail panel
    and to detect whether the consolidated snapshot needs polling.
  - A temporary mismatch remains visible in Development Data and triggers the
    existing refresh polling; it does not synthesize a zero value.
  - User isolation continues to depend on the authenticated current-user API
    contract and must not fall back to a ticker-wide snapshot.
- Files changed:
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalDevTables.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - `internal-float-current-user` must return the requesting user's snapshot.
    The current response has no explicit scope metadata, so the frontend cannot
    independently detect an incorrect ticker-wide backend fallback.

## 2026-08-07 — Display imported Manual Security Ownership records

- Area: User Portal → Ownership → Institutions and Development Data.
- APIs/data:
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&action=available-dates`
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&effectiveDate={YYYY-MM-DD}`
  - `GET /market-data/history?category=ownership-history`
- Reported problem and root cause:
  - Operations can import the complete Manual Security Ownership CSV, including
    filing and effective dates, but the user-facing Institutions table read
    only the consolidated ownership-history dataset.
  - The imported records are date-partitioned and therefore require resolving
    the latest available effective date before reading the corresponding raw
    records.
- Intended behavior and invariants:
  - Ownership resolves the latest available Manual Security Ownership effective
    date and reads that partition directly from the authenticated Manual Input
    API with cache disabled.
  - When imported rows are present, they become the Institutions table's
    primary source. CSV fields are mapped without frontend-derived replacement
    values: `investor` to Investor, `source` to Source, `avgPriceEst` to Average
    Price Est., `sharesPct` to Shares %, `reportedValue` to Reported Value, and
    the remaining template fields to their matching columns.
  - The source endpoint includes the selected effective date, and Development
    Data exposes all 12 raw CSV-contract columns plus any API error.
  - If no imported partition is available, the existing ownership-history
    institution rows remain as a compatibility fallback rather than leaving
    the page empty.
  - Insiders continue to use ownership-history because the Manual Security
    Ownership contract is institutional and provides no reliable insider or
    activist classification field.
  - Ownership Current KPIs, ownership structure, user-scoped Strategic
    Entities, and the previously accepted zero/Put/Call filtering of the
    Institution Holdings Breakdown remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalDevTables.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalTabs.tsx`
  - `app/monitor/[ticker]/institutional/OwnershipTable.tsx`
  - `lib/current-data-sources.ts`
  - `lib/portal-page-translations.ts`
  - `lib/types.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation passed.
  - All seven focused ownership helper tests passed.
  - The production build passed, including all 29 statically generated pages.
  - The local Ownership route compiled, returned HTTP 200, and produced no
    page-level console errors. The public demo session remained unauthenticated
    for centralized APIs, so populated Manual Input rows could not be visually
    inspected in that browser session.
- Remaining backend dependency / limitation:
  - The API exposes records in effective-date partitions. This first Ownership
    view intentionally displays the newest imported partition; browsing older
    imported partitions would require a future reporting-date selector.

## 2026-08-07 — Remove the Internal Float Activity Log

- Area: User Portal → Internal Float.
- API/data:
  - `GET /market-data/current?category=internal-float-current-user`
  - `GET/PUT /manual-input/internal-float-inputs-user?ticker={ticker}`
  - `GET/PUT /manual-input/internal-float-inputs-ticker?ticker={ticker}`
- Reported problem and root cause:
  - The page presented an Activity Log as permanent audit history even though
    its UI also generated browser-only demo/session entries and there is no
    approved audit-log product contract for this page.
  - This could imply durable history where none was guaranteed.
- Intended behavior and invariants:
  - Internal Float no longer renders, builds, merges, or stores activity-log
    entries in frontend state.
  - API `auditLog` fields, if present, are ignored by this page.
  - Management/Strategic, tokenized, collateralized, suggestion-decision, and
    consolidation behavior remains unchanged.
- Files changed:
  - `app/monitor/[ticker]/internal-float/InternalFloatClient.tsx`
  - `app/monitor/[ticker]/internal-float/InternalFloatRoleView.tsx`
  - `app/monitor/[ticker]/internal-float/InternalFloatPageTour.tsx`
  - `app/globals.css`
  - `app/portal-theme.css`
  - `lib/internal-float-types.ts`
  - `lib/internal-float-audit.ts` (removed)
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation performed.
- Remaining backend dependency / limitation:
  - A future audit feature should be reintroduced only with a documented,
    durable, user-attributed backend audit API.

## 2026-08-07 — Restore ordinary Internal Float holding saves on the current API

- Area: User Portal → Internal Float → Management / Strategic Holdings.
- API/data:
  - `PUT /manual-input/internal-float-inputs-user?ticker={ticker}`
- Reported problem and root cause:
  - Deleting a holding produced a `400 Validation Error` because every user
    holding PUT included the proposed `managementSuggestionDecisions` field.
  - The current API contract accepts only `privateFriendlyHolders`, `auditLog`,
    and `managementStrategicHoldings`; support for per-user suggestion decisions
    has not been deployed yet.
- Intended behavior and invariants:
  - Ordinary add, edit, and delete holding saves send only fields accepted by
    the current API when the user has no saved suggestion decisions.
  - The proposed decision envelope is included only when there is an actual
    Apply/Discard decision to persist. Those actions continue to fail visibly
    until backend support is deployed; they never fall back to changing global
    management-holdings status.
  - Existing user-scoped holdings, consolidation prompts, and all ticker-level
    tokenized/collateralized save behavior remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/internal-float/InternalFloatClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - All seven ownership helper tests passed.
  - Production build passed, including static generation for all 29 pages.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - Per-user Apply/Discard still requires backend support for
    `managementSuggestionDecisions`; ordinary holding CRUD does not.

## 2026-08-07 — Filter non-long records from Institution Holdings Breakdown

- Area: User Portal → Ownership → Institution Holdings Breakdown.
- API/data:
  - `GET /market-data/current?category=ownership-current`
  - `institutionBreakdown`
- Reported problem and root cause:
  - The visual breakdown included records with no held shares and option
    records whose `type` was Put or Call, even though this panel represents
    active institutional long holdings.
  - The frontend mapped every `institutionBreakdown` record directly into the
    ranked bars without applying the panel's display rules.
- Intended behavior and invariants:
  - The Institution Holdings Breakdown hides rows whose numeric `shares` value
    is zero or missing and rows whose `type` identifies a Put or Call record.
  - Type matching is case-insensitive and also covers descriptive values such
    as `Put option`, `Call option`, and `Put/Call`.
  - The API payload is not modified. Development Data continues to show the raw
    `institutionBreakdown`, including records hidden from this user-facing
    visualization.
  - The detailed Institutions and Insiders filing tables remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - The Ownership route compiled successfully and returned HTTP 200 in the
    local development server after the change.
  - Whitespace validation passed.
  - Browser verification reached the local Ownership route without page-level
    console errors, but the centralized APIs returned `Not authenticated` in
    the public demo session, so live record-level visual verification was not
    available there.
  - Full TypeScript and production-build verification are currently blocked by
    unrelated in-progress errors in
    `app/operations/ownership/ManagementHoldingsOperationsClient.tsx` (missing
    types/props for its records-panel work).
- Remaining backend dependency / limitation:
  - None; this is a presentation-only filter over existing API fields.

## 2026-08-07 — Clarify Team Access invitation errors and API capabilities

- Area: Operations Portal → Team Access.
- APIs/data:
  - `POST /tickers/invite`
  - `GET /tickers/invite`
- Reported problem and root cause:
  - A `409 Conflict: User already exists in the system` message appeared to
    apply to every email entered.
  - The form retained the previous submission or loading error while the email
    and ticker were edited, so a fresh value looked rejected before another
    request had been made.
  - The documented invitation request accepts only `email` and `ticker`; it
    exposes neither a role field nor a delete operation.
- Implemented behavior and invariants:
  - Editing the email or ticker immediately clears stale feedback. A subsequent
    failure identifies the exact submitted email and retains the backend's full
    status and reason.
  - Development Data now records the exact POST request, response or error, and
    the known role/delete capability flags separately from the invitation list.
  - The form displays `USER (API default)` as a disabled role value and states
    that role selection and invitation deletion are not supported by the
    current `/tickers/invite` contract.
  - No undocumented `role` property is sent and no guessed DELETE request is
    exposed. `DELETE /profile` remains self-service profile deletion and is not
    treated as an operator invitation-delete API.
  - The panel status badge now reports `error` instead of continuing to say
    `operator` when a request fails.
- Files changed:
  - `app/operations/user-access/UserAccessOperationsClient.tsx`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation passed.
  - Browser verification confirmed the API-default role field, capability note,
    responsive form layout, and immediate removal of stale feedback when a new
    email is entered. The page produced no console errors.
- Remaining backend dependency / limitation:
  - If a newly generated email still receives `409` after submission, the
    Cognito/user duplicate check in `POST /tickers/invite` must be corrected by
    the backend.
  - Selectable roles require a documented role field and allowed-role rules on
    POST. Invitation removal requires a dedicated operator-authorized DELETE
    endpoint and defined behavior for pending versus registered users.

## 2026-08-07 - Document the user-scoped Strategic Entities backend fix

- Area: Backend handoff -> Internal Float and Ownership consolidation.
- APIs/data:
  - `GET/PUT /manual-input/internal-float-inputs-user`
  - `POST /manual-input/consolidate`
  - `GET /market-data/current?category=internal-float-current-user`
- Reported problem and root cause:
  - User holdings can be saved while their consolidated Strategic Entities
    total remains zero. The existing trigger contract does not document passing
    the authenticated user `sub` to the asynchronous consolidator, and the
    current snapshot resolver permits a ticker-level fallback.
- Intended behavior and invariants:
  - Added a complete backend specification for user-scoped input/output paths,
    authenticated trigger context, aggregate formulas, no-fallback behavior,
    create/edit/delete handling, privacy tests, and acceptance criteria.
  - Clarified that Operations `showInOwnership` is separate from user-specific
    `includeInDeduction` and does not fix the user donut.
- Files changed:
  - `docs/api/USER_SCOPED_STRATEGIC_ENTITIES_CONSOLIDATION_FIX.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Markdown structure and whitespace validation passed.
- Remaining backend dependency / limitation:
  - The backend team must implement and deploy the specified user-aware
    consolidation and remove the ticker fallback.

## 2026-08-07 - Enforce user-specific Strategic Entities without frontend fallback

- Area: User Portal -> Ownership -> Ownership Structure and Strategic Entities.
- APIs/data:
  - `GET /manual-input/internal-float-inputs-user?ticker={ticker}`
  - `GET /market-data/current?ticker={ticker}&category=internal-float-current-user`
  - `GET /market-data/current?ticker={ticker}&category=ownership-current`
- Reported problem and root cause:
  - Strategic holdings are private to each authenticated user, but the
    Ownership page could fall back to ticker-wide
    `ownership-current.strategicEntities` when the user snapshot was absent.
  - Its detail list also merged ticker-wide Operations records with the
    authenticated user's saved Internal Float records.
  - The backend `internal-float-current-user` resolver can itself return
    `internal-float-current-ticker`, without response metadata identifying that
    fallback.
- Intended behavior and invariants:
  - The Ownership Strategic Entities detail list uses only the authenticated
    user's `internal-float-inputs-user` records.
  - The donut accepts `internal-float-current-user` only when its consolidated
    total matches that user's active saved holding total.
  - A missing or mismatched user snapshot displays zero Strategic Entities;
    ticker-wide `ownership-current.strategicEntities` is never substituted.
  - Issued shares and institutional ownership remain ticker-wide inputs.
  - The development panel exposes the expected user input total and whether the
    consolidated snapshot was accepted as user-scoped.
- Files changed:
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalDevTables.tsx`
  - `lib/current-data-sources.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation passed.
- Remaining backend dependency / limitation:
  - The backend must remove the ticker fallback from
    `internal-float-current-user` or return explicit resolved-scope metadata.
  - Operations records need a target user/workspace before they can safely be
    applied to a private user's holdings.

## 2026-08-07 — Centre the clipping-safe PDF sentiment meter at `0px`

- Area: User Portal → Report Archive → generated PDF → 7-Day Overall
  Sentiment card.
- API/data:
  - Presentation-only adjustment. The dated report API, sentiment values,
    marker calculation, label, comparison, and mention count are unchanged.
- Reported problem and root cause:
  - The `-16px` and `-18px` positions looked almost identical because their
    two-pixel difference becomes approximately one visible pixel after A4 and
    screenshot scaling.
  - The canvas-native renderer already removed the SVG clipping that originally
    motivated manual left compensation, so retaining any offset kept the
    complete meter visibly left of the card's true center.
- Implemented behavior and invariants:
  - Removed the horizontal transform entirely, giving the meter a true `0px`
    offset with automatic horizontal margins.
  - Preserved the high-resolution canvas rendering, rounded endpoints, gauge
    scale, and API-driven score and marker.
  - PDF assets were advanced to
    `2026-08-07-sentiment-7d-v13` so cached `v12` positioning is not reused.
- Files changed:
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `public/report-templates/daily-close/template.html`
  - `public/report-templates/daily-close/styles.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser measurement confirmed the card midpoint and canvas midpoint are
    both `459.421875px`, an exact `0px` difference.
  - Browser preview confirmed the complete meter remains visible with two
    rounded endpoints and is visually aligned with the card content.
  - TypeScript, renderer syntax, source/public synchronization, and whitespace
    checks passed.
- Remaining backend dependency / limitation:
  - None; this is a PDF presentation-only adjustment.

## 2026-08-07 - Separate raw Ownership API data from the frontend view model

- Area: User Portal -> Ownership -> Development Data.
- APIs/data:
  - `GET /market-data/current?ticker={ticker}&category=ownership-current`
  - `GET /market-data/current?ticker={ticker}&category=internal-float-current-user`
  - Frontend ownership view model composed from both current snapshots.
- Reported problem and root cause:
  - The development tab labelled as the `ownership-current` endpoint displayed
    frontend-composed snake-case fields such as `strategic_entities_shares`.
    Those fields could therefore show zero even though they were not the raw
    camel-case `ownership-current.strategicEntities` response, making it
    impossible to identify which consolidation output remained stale.
- Intended behavior and invariants:
  - `Ownership Current (Raw)` now displays the recursively flattened, unmodified
    `ownership-current` API response, including `strategicEntities.shares`.
  - `Consolidated Strategic Total` continues to display
    `internal-float-current-user.managementStrategicHoldings` independently.
  - `Ownership View Model` explicitly identifies the final frontend composition
    and no longer claims to be a single raw API response.
  - User-specific Internal Float holdings remain separate from ticker-level
    operations holdings; no editable manual-input value is substituted for a
    missing consolidated total.
- Files changed:
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalDevTables.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation passed.
- Remaining backend dependency / limitation:
  - The consolidation API is asynchronous and does not identify which output
    files were rebuilt. If either raw current snapshot remains unchanged after
    a successful trigger, the corresponding backend consolidation path must be
    corrected.

## 2026-08-07 — Fine-tune the unclipped PDF sentiment meter to `-16px`

- Area: User Portal → Report Archive → generated PDF → 7-Day Overall
  Sentiment card.
- API/data:
  - Presentation-only adjustment. The dated report API and every sentiment
    value, label, comparison, and marker calculation are unchanged.
- Reported problem and root cause:
  - The accepted canvas-based gauge no longer clipped, but its `-18px` visual
    compensation still appeared slightly too far left in the downloaded PDF.
- Implemented behavior and invariants:
  - Reduced only the gauge's horizontal compensation from `-18px` to `-16px`.
  - Preserved the canvas-native rendering that prevents the previous SVG crop;
    no meter geometry or data behavior was replaced.
  - PDF assets were advanced to
    `2026-08-07-sentiment-7d-v12` so cached `v11` positioning is not reused.
- Files changed:
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `public/report-templates/daily-close/template.html`
  - `public/report-templates/daily-close/styles.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser measurement confirmed the canvas midpoint is exactly `16px` left
    of the card midpoint (`443.421875px` versus `459.421875px`).
  - Browser preview confirmed the full canvas gauge remains visible with two
    rounded endpoints.
  - TypeScript, renderer syntax, source/public synchronization, and whitespace
    checks passed.
- Remaining backend dependency / limitation:
  - None; this is a PDF presentation-only adjustment.

## 2026-08-06 — Remove PDF gauge clipping with a canvas-native meter

- Area: User Portal → Report Archive → generated PDF → 7-Day Overall
  Sentiment card.
- API/data:
  - Presentation-only correction. The dated report API, seven-day sentiment
    mapping, score, marker position, label, comparison, and mention count are
    unchanged.
- Reported problem and root cause:
  - The `-20px` position still appeared slightly too far left, and the green
    endpoint remained cut into a flat or angled edge despite the source SVG
    showing a complete rounded cap.
  - A full-page test using the production `html2canvas` scale and viewport
    reproduced the issue. The converter creates an internal clipping boundary
    while reconstructing the inline gradient SVG. Expanding the SVG viewport,
    setting overflow, and adding endpoint circles did not remove that internal
    crop.
- Implemented behavior and invariants:
  - Reduced the visual compensation from `-20px` to `-18px`.
  - Replaced only the Overall Sentiment inline SVG with a high-resolution HTML
    canvas drawn before `__REPORT_READY__` is set. `html2canvas` now copies an
    already-complete bitmap instead of reconstructing and clipping SVG paths.
  - The canvas preserves the accepted red/yellow/green scale, rounded ends,
    API-driven marker, score, and sentiment label.
  - The distribution donut and every API/data normalization path remain
    unchanged.
  - PDF template assets were advanced to
    `2026-08-06-sentiment-7d-v11` so prior SVG output is not reused from cache.
- Files changed:
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `public/report-templates/daily-close/template.html`
  - `public/report-templates/daily-close/render.js`
  - `public/report-templates/daily-close/styles.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser measurement confirmed the canvas midpoint is exactly `18px` left
    of the card midpoint (`441.421875px` versus `459.421875px`).
  - A temporary full-page raster test used the same `html2canvas` settings as
    production (`scale: 1.35`, `1240 × 1754`) and confirmed both endpoints are
    completely rounded with no frame or clipping edge. The test fixture was
    removed after verification.
  - TypeScript, renderer syntax, source/public synchronization, temporary-file,
    and whitespace checks passed.
- Remaining backend dependency / limitation:
  - None; this correction is confined to PDF presentation.

## 2026-08-06 - Normalize the consolidated Strategic Entities snapshot

- Area: User Portal -> Ownership -> Ownership Structure.
- APIs/data:
  - `GET /market-data/current?ticker={ticker}&category=internal-float-current-user`
  - `GET /manual-input/internal-float-inputs-user?ticker={ticker}` remains the
    immediate detail-list source and is not used as the donut total.
- Reported problem and root cause:
  - The Strategic Entities detail panel showed a 59.77M saved holding while the
    donut still displayed zero.
  - The donut was already requesting the consolidated user float snapshot, but
    it accepted only a raw top-level response and trusted only
    `managementStrategicHoldings.shares`. A wrapped response, omitted aggregate,
    or stale zero aggregate therefore fell through to the older ownership total
    even when the consolidated snapshot contained active holding records.
  - Missing numeric values could also be coerced to zero during comparison.
- Intended behavior and invariants:
  - Normalize raw, `data`, and category-key response envelopes for
    `internal-float-current-user`.
  - Use the explicit consolidated aggregate when it agrees with the active
    consolidated records. If the aggregate is missing or inconsistent, sum
    active `managementStrategicHoldings.records` from that same consolidated
    snapshot.
  - Deleted records and records excluded from deduction do not contribute.
  - Never substitute the editable manual-input detail list into the donut total.
  - Polling still checks the uncached consolidated endpoint and stops when its
    effective total matches the saved holdings total or after three minutes.
- Files changed:
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation passed.
- Remaining backend dependency / limitation:
  - If the consolidated endpoint contains neither a valid aggregate nor active
    records after consolidation, the frontend cannot manufacture a Strategic
    Entities total; the backend snapshot must be corrected.

## 2026-08-06 — Fine-tune the PDF gauge position and guarantee both endpoints

- Area: User Portal → Report Archive → generated PDF → 7-Day Overall
  Sentiment card.
- API/data:
  - Presentation-only correction. The report API, seven-day sentiment mapping,
    score, label, comparison, and mention count are unchanged.
- Reported problem and root cause:
  - The accepted `-24px` compensation still appeared slightly too far left in
    the downloaded PDF.
  - The green endpoint appeared cut or missing because the PDF rasterization
    path flattened the gradient arc's right `stroke-linecap`, even though the
    SVG requested a rounded cap. The red endpoint happened to remain rounded,
    producing an asymmetric meter.
- Implemented behavior and invariants:
  - Reduced the gauge compensation from `-24px` to `-20px`.
  - Added explicit 8-unit red and green endpoint circles on top of the
    semicircle path. Both ends are therefore complete and symmetric without
    depending on gradient-path cap rasterization.
  - Marker position and all report values remain API-driven and unchanged.
  - PDF template assets were advanced to
    `2026-08-06-sentiment-7d-v9` so cached `v8` geometry is not reused.
- Files changed:
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `public/report-templates/daily-close/template.html`
  - `public/report-templates/daily-close/render.js`
  - `public/report-templates/daily-close/styles.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser measurement confirmed the gauge midpoint is exactly `20px` left
    of the card midpoint (`439.421875px` versus `459.421875px`).
  - Browser inspection confirmed the SVG contains explicit red and green
    endpoint circles and the visual preview shows both ends fully rounded.
  - Both renderer syntax checks, source/public renderer and stylesheet
    synchronization, and whitespace validation passed.
  - The full TypeScript check is currently blocked by an unrelated existing
    `InstitutionalBrowserPage.tsx:108` union-indexing error for
    `internal-float-current-user`; that concurrent Ownership/Internal Float
    logic was not modified by this PDF-only change.
- Remaining backend dependency / limitation:
  - None; this change affects PDF presentation only.

## 2026-08-06 — Set the PDF sentiment gauge to the requested midpoint offset

- Area: User Portal → Report Archive → generated PDF → 7-Day Overall
  Sentiment card.
- API/data:
  - Presentation-only correction. Report retrieval, seven-day sentiment
    mapping, scores, mention counts, and comparisons are unchanged.
- Reported problem and root cause:
  - A geometric `0px` offset still appeared too far right after the SVG was
    rasterized into the downloaded PDF, while the earlier `-48px` compensation
    appeared too far left.
- Implemented behavior and invariants:
  - The gauge keeps automatic horizontal centering as its base position and
    applies the user-requested `translateX(-24px)` visual compensation.
  - This is the exact midpoint between the rejected `0px` and `-48px`
    positions. The score moves with the arc, while the comparison and mention
    text retain their existing card alignment.
  - The complete SVG remains inside the Overall Sentiment card, and the
    adjacent Sentiment Distribution layout is unchanged.
  - PDF template assets were advanced to
    `2026-08-06-sentiment-7d-v8` so cached `v7` positioning is not reused.
- Files changed:
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `public/report-templates/daily-close/template.html`
  - `public/report-templates/daily-close/styles.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser measurement confirmed the gauge midpoint is exactly `24px` left
    of the card midpoint (`435.421875px` versus `459.421875px`).
  - Browser preview confirmed the full gauge remains visible within its card.
  - TypeScript, renderer syntax, source/public synchronization, and whitespace
    checks passed.
- Remaining backend dependency / limitation:
  - None; this change affects PDF presentation only.

## 2026-08-06 — Restore true centre alignment for the PDF sentiment gauge

- Area: User Portal → Report Archive → generated PDF → 7-Day Overall
  Sentiment card.
- API/data:
  - Presentation-only correction. The report API, seven-day sentiment mapping,
    scores, mention counts, and comparisons are unchanged.
- Reported problem and root cause:
  - The previous fixed `-48px` compensation overcorrected the meter and moved
    the whole SVG too far left.
  - That compensation was based on the apparent position in a cropped PDF
    screenshot rather than the gauge and card's actual layout coordinates.
- Implemented behavior and invariants:
  - Removed the manual horizontal offset completely.
  - The gauge SVG is a block with automatic horizontal margins, so its midpoint
    is calculated from and aligned to the Overall Sentiment card's real width.
  - The score, comparison, and mention text remain centred, and no API or
    sentiment-calculation behavior was changed.
  - PDF template assets were advanced to
    `2026-08-06-sentiment-7d-v7` to prevent the offset stylesheet from being
    reused from cache.
- Files changed:
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `public/report-templates/daily-close/template.html`
  - `public/report-templates/daily-close/styles.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser measurement confirmed the card midpoint and gauge midpoint are both
    `459.421875px`, a `0px` alignment difference.
  - Browser preview confirmed the complete gauge is centred and remains inside
    its card without affecting the adjacent distribution card.
  - TypeScript, renderer syntax, source/public synchronization, and whitespace
    checks passed.
- Remaining backend dependency / limitation:
  - None for this positioning correction.

## 2026-08-06 — Offset the rasterized PDF sentiment meter to the left

- Area: User Portal → Report Archive → generated PDF → 7-Day Overall
  Sentiment card.
- API/data:
  - Presentation-only correction. Sentiment API selection, seven-day records,
    scores, and comparisons are unchanged.
- Reported problem and root cause:
  - The continuous gauge arc was no longer geometrically clipped, but the
    downloaded PDF still placed the complete meter visibly to the right of the
    card's centred comparison and mention text.
  - The displacement appears during the SVG-to-canvas PDF rasterization rather
    than in the raw template geometry.
- Implemented behavior and invariants:
  - The gauge SVG now uses a 48 px left offset inside the Overall Sentiment
    card to compensate for the rasterized position.
  - The comparison and mention text remain centred in the card, and no other
    Market Perception layout is shifted.
  - PDF template assets were advanced to
    `2026-08-06-sentiment-7d-v6` so the prior gauge position is not cached.
- Files changed:
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `public/report-templates/daily-close/template.html`
  - `public/report-templates/daily-close/styles.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser template preview confirmed the meter moves left while remaining
    fully inside the card and the report remains four pages without overflow.
  - TypeScript, renderer syntax, source/public synchronization, and whitespace
    checks passed.
- Remaining backend dependency / limitation:
  - None for this positioning correction.

## 2026-08-06 — Prevent PDF sentiment graphics from clipping or crowding

- Area: User Portal → Report Archive → generated PDF → Market Perception.
- API/data:
  - Presentation-only correction. Existing dated report and date-matched 7D
    sentiment fallback behavior are unchanged.
- Reported problem and root cause:
  - The gauge's green right edge still looked cut in downloaded PDFs because it
    remained a separate SVG path segment whose endpoint was flattened during
    rasterization.
  - Sentiment Distribution used a fixed 132 px CSS-gradient ring, 42 px gap,
    and 150 px minimum legend width. Together they consumed the card's full
    content width and left virtually no right padding.
  - CSS `conic-gradient` rendering was also inconsistent in the downloaded PDF,
    allowing the distribution ring to disappear while its centre label
    remained.
- Implemented behavior and invariants:
  - The sentiment gauge is now one continuous semicircle path using a
    left-to-right red/yellow/green SVG gradient and rounded end caps. The marker
    remains on the same API-driven score position.
  - Sentiment Distribution now uses a fixed SVG donut instead of a CSS conic
    gradient, retaining the backend percentages and centre mention count.
  - The distribution ring, gap, and legend widths were reduced, and the card
    has explicit right padding and overflow containment.
  - PDF template assets were advanced to
    `2026-08-06-sentiment-7d-v5` so the previous geometry is not cached.
  - No sentiment values, API selection, comparison, or archive-date rules were
    changed.
- Files changed:
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `public/report-templates/daily-close/template.html`
  - `public/report-templates/daily-close/render.js`
  - `public/report-templates/daily-close/styles.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser PDF preview confirmed both gauge ends are fully visible, the SVG
    distribution donut renders, and the legend has 31 px measured clearance
    from the card's right edge.
  - The gauge remains inside its card and the report remains four pages without
    overflow.
  - TypeScript, renderer syntax, source/public synchronization, and whitespace
    checks passed.
- Remaining backend dependency / limitation:
  - None for this layout correction.

## 2026-08-06 — Add date-matched 7D sentiment fallback and contain the PDF gauge

- Area: User Portal → Report Archive → generated PDF → Market Perception.
- API/data:
  - Primary dated report:
    `GET /market-data/reports?ticker={ticker}&date={YYYY-MM-DD}`.
  - Temporary consolidated fallback:
    `GET /market-data/current?ticker={ticker}&category=sentiment-current` →
    `periods.7D` or `periods.1W`.
- Reported problem and root cause:
  - The refreshed PDF still contained no sentiment records. Its displayed
    observation range was `Aug 5, 2026 – Aug 5, 2026`, proving that the dated
    report response still exposed the old empty one-day snapshot rather than a
    populated seven-day period.
  - The gauge's right endpoint appeared cut because the arc used nearly the
    full SVG width and a flat path cap; PDF rasterization made the green edge
    look clipped.
- Implemented behavior and invariants:
  - The dated report remains the preferred source. If its 7D candidate is
    empty, PDF generation also reads consolidated `sentiment-current` and may
    select its populated 7D/1W period only when that period ends on the exact
    requested report date. Both inclusive ends and next-midnight exclusive ends
    are supported.
  - A current period that does not match the report date is rejected. Older
    archive PDFs therefore never receive today's sentiment.
  - Cache invalidation covers the dated report, dated AI report, and current
    sentiment request before each PDF generation.
  - The gauge arc radius and stroke were reduced, additional horizontal margin
    was reserved, and rounded path caps were added. Both arc ends now remain
    fully inside the SVG during PDF rasterization.
  - Renderer assets were advanced to version
    `2026-08-06-sentiment-7d-v4` to prevent reuse of the clipped meter.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/REPORT_DATA_CONTRACT.md`
  - `public/report-templates/daily-close/template.html`
  - `public/report-templates/daily-close/render.js`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser preview confirmed both rounded gauge ends are fully visible and the
    score marker remains on the correct side of the scale.
  - The report remains four pages without overflow.
  - TypeScript, renderer syntax, source/public synchronization, and whitespace
    checks passed.
- Remaining backend dependency / limitation:
  - The dated report endpoint is still returning an empty one-day sentiment
    snapshot for the reported Aug 5 PDF. Backend should populate and freeze its
    own seven-day sentiment block so the date-matched current fallback can be
    removed.

## 2026-08-06 — Read populated 7D sentiment records in archive PDFs

- Area: User Portal → Report Archive → generated PDF → Market Perception.
- API/data:
  - Dated report only:
    `GET /market-data/reports?ticker={ticker}&date={YYYY-MM-DD}`.
  - Accepted seven-day locations during the backend transition include
    `sentiment`, `sentimentSnapshot`, their nested `data` equivalents,
    `periods.7D`, and `periods.1W`.
- Reported problem and root cause:
  - The PDF displayed the new `7D` labels but still showed `0 mentions` and a
    default neutral `50.0` score.
  - The prior correction changed the scope metadata but still expected the old
    flattened PDF-ready `sentiment` shape. It did not read the consolidated
    seven-day period object or its `timeline` / `records` buckets.
  - The semicircle still looked misplaced because the long needle and score
    occupied competing vertical positions. Its scale colours were also
    reversed relative to the score direction: higher bullish values pointed
    toward the red side.
- Implemented behavior and invariants:
  - The dated-report normalizer selects a populated explicit `7D`/`1W`
    candidate before an empty legacy block.
  - It maps aggregate totals, overall and previous scores, distribution,
    platform breakdown, start/end dates, and either `timeline` or `records`.
    When only dated buckets are supplied, it reconciles mention totals,
    weighted scores, distribution counts, and platform totals from those
    backend-produced buckets.
  - The five required platform rows remain Reddit, X, Facebook, LinkedIn, and
    Stocktwits. Platform aliases such as Twitter and `linked_in` are normalized.
  - A zero-record result now renders `N/A / No data` with no gauge marker; it no
    longer presents a synthetic neutral 50 score.
  - The gauge now runs Bearish/red → Neutral/yellow → Bullish/green and uses a
    position marker on the arc. The score remains centered inside the gauge,
    with no needle/text collision.
  - No live `sentiment-current`, raw `/social-data`, or sentiment-events request
    is made when opening an archive. All values remain anchored to the dated
    report payload.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `Report Templates/lean-daily-market-close-report/REPORT_DATA_CONTRACT.md`
  - `public/report-templates/daily-close/template.html`
  - `public/report-templates/daily-close/render.js`
  - `public/report-templates/daily-close/styles.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser preview confirmed the score is centered, the marker sits on the
    correct bullish side for a score of 67, and the report remains four pages
    without overflow.
  - TypeScript, renderer syntax, source/public template synchronization, and
    whitespace validation passed.
- Remaining backend dependency / limitation:
  - If a newly downloaded PDF still has zero mentions after this mapping, the
    authenticated dated report response itself contains no populated seven-day
    aggregate or buckets. In that case the backend must expose the exact dated
    `sentimentSnapshot` payload for inspection; the frontend intentionally does
    not substitute current/live records into an archived report.

## 2026-08-06 — Force refreshed archive PDFs onto the accepted 7D sentiment scope

- Area: User Portal → Report Archive → View PDF / Download → Market Perception
  page.
- API/data:
  - Dated report:
    `GET /market-data/reports?ticker={ticker}&date={YYYY-MM-DD}`.
  - Dated user-aware AI overlay:
    `GET /market-data/ai-report?ticker={ticker}&date={YYYY-MM-DD}`.
- Reported problem and root cause:
  - A newly downloaded PDF still displayed `1D`, `Overall Sentiment`, and
    `vs previous 1D` after the backend sentiment values changed to a previous
    seven-day scope.
  - The dated response can still carry the retired `sentiment.window = "1D"`
    metadata, so the adaptive renderer selected its legacy label branch.
  - Report and AI reads also used the portal's shared 15-minute GET cache, and
    the public PDF renderer assets had stable unversioned URLs. A regenerated
    dated report or newly deployed renderer could therefore remain stale for a
    subsequent download.
  - The semicircle needle passed directly through the score and classification
    text because both were positioned inside the needle path.
- Implemented behavior and invariants:
  - The archive PDF normalization now sets the dated report sentiment scope to
    `7D`, superseding the earlier temporary behavior that preserved an explicit
    legacy `1D` label. Backend score, counts, distribution, platform rows, and
    comparison values are otherwise unchanged.
  - Every View PDF or Download action invalidates the exact dated report and AI
    cache entries before fetching. Other portal API caching remains unchanged.
  - The iframe template, renderer script, and separately inlined stylesheet use
    a shared version identifier so browsers cannot reuse the prior PDF assets.
  - The gauge retains the same API score and needle calculation, but displays
    the score and sentiment label beneath the pivot instead of underneath the
    needle.
  - No raw social-data request, frontend sentiment aggregation, or additional
    backend endpoint was introduced.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `public/report-templates/daily-close/template.html`
  - `public/report-templates/daily-close/render.js`
  - `public/report-templates/daily-close/styles.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser preview confirmed `Previous 7 Days`, `7-Day Overall Sentiment`,
    `7D`, and `vs previous 7 days` in the served archive template.
  - Visual inspection confirmed the needle no longer overlaps the score or
    sentiment label.
  - The Market Perception page remains within its fixed PDF page height and the
    report remains four pages.
  - TypeScript, renderer syntax, template synchronization, and whitespace
    checks passed.
  - Production compilation and type validation passed. Final page-data
    collection was interrupted by unrelated concurrent `.next` output missing
    the legal and login route modules; no report route or report code failed.
- Remaining backend dependency / limitation:
  - The backend should still replace the retired `window: "1D"` metadata with
    `window: "7D"` and document the seven-day fields. Until then, the archive
    PDF applies the confirmed seven-day scope at its normalization boundary.

## 2026-08-06 — Add Exchange Volume pie details and volume ordering

- Area: User Portal → Exchange Volume → Latest Exchange Volume.
- API/data:
  - Current venue values remain sourced from
    `GET /market-data/current?ticker={ticker}&category=market-current` →
    `exchangeVolume`.
- Reported problem and root cause:
  - The pie was a single CSS background, so its visual slices could not expose
    venue-specific hover details.
  - The adjacent venue list retained API object order and used a fixed-height
    scroll area instead of prioritizing the largest returned volumes.
- Implemented behavior and invariants:
  - The pie now renders one focusable SVG slice per positive API venue value.
    Hovering or keyboard-focusing a slice shows its venue name, exact volume,
    and percentage only when that percentage was supplied by the API.
  - Other slices dim while one slice is inspected, without changing any data.
  - The venue legend is sorted from highest to lowest returned volume and uses
    the same colour order as the pie.
  - The card grows to fit the complete venue legend; it has no internal legend
    scrollbar.
  - Sorting and slice-angle geometry are presentation-only. The frontend does
    not expose a calculated market share, total, ranking metric, or replacement
    value.
- Files changed:
  - `app/monitor/[ticker]/exchange-volume/ExchangeVolumeBrowserPage.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check, whitespace validation, and a clean production build
    passed.
  - The Exchange Volume route rendered without browser console errors.
  - The local demo APIs require authenticated market-data access, so live-slice
    hover could not be exercised against API values in that session; the SVG
    interaction and ordering logic are type-checked and production-compiled.
- Remaining backend dependency / limitation:
  - None. Tooltip content uses only fields already returned in
    `market-current.exchangeVolume`.

## 2026-08-06 — Present report sentiment as a previous-seven-day snapshot

- Area: User Portal → Report Archive → generated Daily Report PDF → Market
  Perception page.
- API/data:
  - Existing dated report payload:
    `GET /market-data/reports?ticker={ticker}&date={YYYY-MM-DD}`.
  - The backend team verbally confirmed that the payload's `sentiment` block
    now represents the previous seven days. `docs/INTEGRATION (7).md` has not
    yet been updated with that expanded contract.
- Reported problem and root cause:
  - The PDF renderer hard-coded `1D`, `1D Window`, and `vs previous 1D`, so a
    new seven-day backend result would be displayed with incorrect period
    labels even though the values pass through from the dated report unchanged.
- Implemented behavior and invariants:
  - A `7D` sentiment payload now renders as `Previous 7 Days`, `7-Day Overall
    Sentiment`, and `vs previous 7 days`.
  - When `windowStart` and `reportDateIso` are present, the PDF displays the
    exact sentiment observation period. It falls back to the period label when
    those optional dates are missing.
  - Legacy archived payloads explicitly marked `1D` retain one-day labels.
  - The PDF does not recalculate sentiment, read raw social feeds, or make an
    additional sentiment request. Overall score, comparison, mention totals,
    distribution, and platform breakdown remain authoritative backend values
    frozen in the dated report.
  - The source template, browser-served template, sample payload, and internal
    report contract are kept synchronized.
- Files changed:
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `Report Templates/lean-daily-market-close-report/report-data.json`
  - `Report Templates/lean-daily-market-close-report/REPORT_DATA_CONTRACT.md`
  - `Report Templates/lean-daily-market-close-report/BACKEND_REPORT_API_REQUIREMENTS.md`
  - `Report Templates/lean-daily-market-close-report/BACKEND_REPORT_API_CORRECTIONS.md`
  - `Report Templates/lean-daily-market-close-report/README.md`
  - `public/report-templates/daily-close/render.js`
  - `public/report-templates/daily-close/styles.css`
  - `public/report-templates/daily-close/report-data.json`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser preview confirmed four pages, no Market Perception page overflow,
    and the rendered period `Jun 6, 2026 – Jun 12, 2026` with seven-day labels.
  - Both renderer files passed JavaScript syntax checks; both sample payloads
    parsed successfully; source and public template copies match; whitespace
    validation passed.
  - Repository-wide TypeScript verification is currently blocked by an
    unrelated concurrent error in
    `app/operations/ownership/ManagementHoldingsOperationsClient.tsx:366`.
- Remaining backend dependency / limitation:
  - The backend should add the complete seven-day sentiment response shape to
    `docs/INTEGRATION (7).md`, including `window`, `windowStart`, `windowEnd`,
    and confirmation that `previousScore` represents the immediately preceding
    seven-day window.

## 2026-08-06 — Prioritize latest Exchange Volume and unify history views

- Area: User Portal → Exchange Volume.
- APIs/data:
  - Latest venue values remain sourced from
    `GET /market-data/current?ticker={ticker}&category=market-current` →
    `exchangeVolume`.
  - Both historical views use
    `GET /market-data/history?ticker={ticker}&category=exchange-volume-history`.
- Reported problem and root cause:
  - The latest venue data appeared below the historical sections even though it
    is the most time-sensitive information.
  - The current venue list used progress bars rather than a proportional
    overview, and the always-visible history table duplicated the line chart.
  - Users had to toggle many chart series one at a time, while the CSV action
    occupied the control position needed for switching history views.
- Implemented behavior and invariants:
  - Latest Exchange Volume now appears immediately after the overview and uses
    a compact pie chart with a raw-volume legend.
  - Pie-slice angles are display geometry derived from the API volume values;
    the page does not expose a calculated market share, total, ranking, or
    replacement value. Any percentage label is still shown only when supplied
    by the API.
  - History defaults to the line chart. Icon buttons switch between the chart
    and one table in the same section, so the table is not rendered by default.
  - The selected 1M/3M/6M/1Y/All period controls both historical views.
  - Show all and Hide all controls update the line-chart series in one action.
    Every returned exchange remains enabled by default, and individual venue
    toggles and the date hover tooltip remain intact.
  - The CSV action and its export request were intentionally removed from this
    page, superseding the earlier Exchange Volume CSV-button behavior.
- Files changed:
  - `app/monitor/[ticker]/exchange-volume/ExchangeVolumeBrowserPage.tsx`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check, whitespace validation, and production build passed.
  - Browser verification confirmed the latest section precedes history, the
    line view is selected by default, and the icon switch renders only the
    selected chart or table state.
  - The local demo APIs require authenticated market-data access, so the browser
    check exercised empty states and controls rather than live pie/table data.
- Remaining backend dependency / limitation:
  - None for the layout and view controls. Visible values still depend on the
    two existing Market Data API responses.

## 2026-08-06 — Keep Report Archive blue-button labels white

- Area: User Portal → Report Archive → View PDF and archive pagination.
- API/data:
  - No API or data behavior changed. The archive continues to use
    `GET /market-data/reports?ticker={ticker}` and the existing dated report
    request when View PDF is selected.
- Reported problem and root cause:
  - The dark-blue View PDF and selected pagination buttons could inherit the
    portal's generic dark form-control text color because they are native
    buttons rendered outside the shared `.button` component.
- Implemented behavior and invariants:
  - The latest-report View PDF button and active archive page number now share
    an explicit report primary-button class.
  - That class fixes the blue surface and white label color after the generic
    portal control rules, in both light and dark mode.
  - Report loading, PDF generation, download, pagination, filtering, and API
    behavior remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/reports/ReportArchiveCenter.tsx`
  - `app/portal-theme.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser-computed styles confirmed `rgb(255, 255, 255)` text on
    `rgb(37, 99, 235)` for View PDF in light and dark mode.
  - The active pagination button uses the same primary class.
  - TypeScript type-check, whitespace validation, and production build passed.
- Remaining backend dependency / limitation:
  - None; this is a frontend-only contrast correction.

## 2026-08-06 — Redesign Report Archive around daily, weekly, and monthly cadence

- Area: User Portal → Report Archive.
- APIs/data:
  - Existing daily archive index and report payload:
    `GET /market-data/reports?ticker={ticker}` and
    `GET /market-data/reports?ticker={ticker}&date={YYYY-MM-DD}`.
  - No weekly or monthly API is connected yet.
- User-reported problem:
  - The Report Archive still presented three report windows per trading day
    even though the product will provide one Daily Report plus future Weekly
    and Monthly Reports.
- Root cause:
  - The page information architecture was organized around the retired 8:00
    AM, 11:50 AM, and 7:00 PM timeline rather than reporting cadence.
- Implemented behavior:
  - Replaced the three-report timeline with accessible Daily Reports, Weekly
    Reports, and Monthly Reports tabs.
  - Daily Reports is the default and only available tab. It presents one
    prominent latest Daily Market Close Report and a simplified archive with
    one report per completed trading day, date filtering, pagination, View PDF,
    and Download.
  - Removed Pre-Market, Midday, Post-Market, report-window filtering, multi-icon
    daily rows, View All, and Download All from the active archive experience.
  - Weekly and Monthly tabs are selectable preview states marked Coming Soon.
    Each explains the planned cadence and intended coverage without exposing
    non-functional actions or sample reports.
  - Added responsive light/dark styling and English, Traditional Chinese, and
    Simplified Chinese coverage for the redesigned archive.
- Must preserve:
  - Daily report index loading, report-date payload composition, browser PDF
    generation, preview, download, errors, and existing archive pagination
    remain functional.
  - The frontend does not invent weekly or monthly records and makes no weekly
    or monthly API request.
  - Existing backend `7PM` archive records remain the internal representation
    of the single Daily Report until the backend contract renames that type;
    the retired name is no longer shown to users.
  - Report data, PDF template, report contents, and legal notices are unchanged.
- Files changed:
  - `app/monitor/[ticker]/reports/ReportArchiveCenter.tsx`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation passed.
  - Browser verification confirmed the Daily archive, Weekly and Monthly
    Coming Soon panels, tab semantics, and a 390px mobile layout with no
    horizontal overflow.
  - Production build passed.
- Remaining backend dependency / limitation:
  - Weekly and Monthly tabs remain presentation-only until their archive index,
    report payload, cadence dates, and PDF-generation contracts are supplied.

## 2026-08-06 — Standardize compact quantity and currency formatting

- Areas:
  - User Portal → Dashboard cards, charts, and Alert Center.
  - User Portal → Ownership overview, ownership charts, and holder breakdowns.
  - User Portal → Short Interest and Lending Pressure KPI cards/charts.
  - User Portal → Internal Float summaries and charts.
- API/data:
  - Display-only change across the existing API values. No API payload is
    transformed or persisted by this formatter.
  - `ownership-current.institutionalValue` is now rendered as the numeric value
    returned by the API instead of receiving a hard-coded `K` suffix.
- Reported problem and root cause:
  - Pages contained several independent compact-number implementations with
    different precision and threshold behavior.
  - Ownership always appended `K` to Institutional Value, so an updated backend
    value such as `2,634,644` appeared as `$2,634,644K`.
- Intended behavior and invariants:
  - Values at or above `1,000,000` display in millions (`M`).
  - Values from `1,000` through `999,999.99` display in thousands (`K`).
  - Values below `1,000` retain their base unit.
  - Compact KPI values use two decimal places by default; currency follows the
    same thresholds and retains its currency symbol.
  - Detailed filing, operations, audit, and calculation tables retain exact
    comma-separated values for reconciliation.
  - Formatting is presentation-only and must not alter source values or API
    units.
- Files changed:
  - `lib/number-format.ts`
  - `app/monitor/[ticker]/dashboard/DashboardKpis.tsx`
  - `app/monitor/[ticker]/dashboard/DashboardChart.tsx`
  - `app/monitor/[ticker]/dashboard/CustomAlertCenter.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalOverview.tsx`
  - `app/monitor/[ticker]/internal-float/InternalFloatClient.tsx`
  - `app/monitor/[ticker]/short-interest/ShortInterestBrowserPage.tsx`
  - `app/monitor/[ticker]/lending-pressure/LendingPressureBrowserPage.tsx`
  - `lib/portal-page-translations.ts`
  - `docs/PORTAL_NUMBER_FORMATTING.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation passed.
- Remaining backend dependency / limitation:
  - The API must return currency values in their intended base display unit.
    The frontend no longer applies an undocumented fixed multiplier or suffix.

## 2026-08-06 — Correct Social Sentiment gauge needle geometry

- Area: User Portal → Social Sentiment → Overall Sentiment.
- API/data:
  - `GET /market-data/current?ticker={ticker}&category=sentiment-current`.
  - Existing count-based composite score for the selected timeframe.
- Reported problem and root cause:
  - The gauge needle did not begin at the semicircle centre and a bullish score
    such as 69 pointed left.
  - The needle element extended downward from a pivot near its top, while the
    rotation calculation assumed an upward-pointing needle. The element geometry
    and score-to-angle mapping therefore disagreed.
- Intended behavior and invariants:
  - The pivot sits at the exact centre of the 150px semicircle.
  - Score 0 points left, 50 points straight up, and 100 points right. Values are
    clamped to 0–100 before their angle is calculated; 69 points upper-right.
  - The displayed score and all sentiment calculations remain unchanged. This
    correction affects only the visual needle geometry.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation passed.
  - Browser-checked the rendered gauge: score 0 begins at the centre and points
    left, the centre hub remains fixed, and the page reports no console errors.
  - The production bundle compiled, but the full build is currently blocked by
    an unrelated duplicate `Report` translation key in
    `lib/portal-page-translations.ts`; that separate user change was preserved.
- Remaining backend dependency / limitation:
  - None; the issue was entirely in frontend rendering.

## 2026-08-05 — Compact and toggle Exchange Volume chart series

- Area: User Portal → Exchange Volume → Volume by Exchange.
- API/data:
  - `GET /market-data/history?ticker={ticker}&category=exchange-volume-history`.
  - `GET /export/csv?dataset=history&ticker={ticker}&category=exchange-volume-history`.
- Reported problem and root cause:
  - Every backend exchange series was drawn simultaneously, making the chart
    visually dense and difficult to read.
  - SVG strokes and text scaled with the chart on wide screens, so the 2.25px
    series lines and bold 11px axis labels appeared substantially larger than
    the dashboard chart system.
  - More-specific portal button styling could override the CSV button label
    colour, producing insufficient contrast on its dark-blue background.
  - Regression: the first implementation synchronized enabled venues in an
    effect whose exchange-key array dependency was recreated on every render.
    Returning another state array from that effect caused a maximum-update-depth
    loop when history data was present.
  - The chart initially lacked the Dashboard chart's date-hover interaction,
    so users could not inspect the exact venue volumes behind a plotted date.
- Intended behavior and invariants:
  - The legend is an interactive series selector consistent with Dashboard.
    Every returned exchange is enabled by default and can be toggled
    independently.
  - Toggle state records only exchanges the user disabled. It is derived without
    an effect, so loading or changing history data cannot create a render loop.
    Selecting another ticker resets all exchanges to visible.
  - Selecting exchanges changes only which API series are drawn. It does not
    rank, aggregate, synthesize, or otherwise calculate exchange-volume data.
  - Series and grid strokes remain visually thin at different viewport widths,
    and axis typography follows the compact dashboard scale.
  - An enabled Download CSV action always uses white text on blue. Its disabled
    state uses a light neutral background with readable dark-grey text.
  - Hovering the chart resolves the nearest returned trade date and shows a
    vertical guide, venue markers, and a compact tooltip containing that
    record's exact API volumes for all enabled exchanges. Missing values are
    omitted and are never converted to zero.
- Files changed:
  - `app/monitor/[ticker]/exchange-volume/ExchangeVolumeBrowserPage.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check, clean production build, and whitespace validation
    passed.
  - Browser regression check confirmed the Exchange Volume route loads without
    console errors or a maximum-update-depth loop after the hover interaction
    was added.
- Remaining backend dependency / limitation:
  - None for the toggle behavior; it uses only venue fields returned by the
    history API.

## 2026-08-04 — Use backend `otherDateData` across current market metrics

- Areas:
  - User Portal → Dashboard → Market Overview.
  - User Portal → Short Interest → Short Interest Score and Key Short Metrics.
  - User Portal → Lending Pressure → Lending Market Snapshot.
  - User Portal → Exchange Volume → Latest Exchange Volume.
- APIs/data:
  - Current values, comparison fields, and per-field source dates:
    `GET /market-data/current?ticker={ticker}&category=market-current`.
  - Prior observations and chart series:
    `GET /market-data/history?ticker={ticker}&category=market-history`.
  - Exchange venue history remains:
    `GET /market-data/history?ticker={ticker}&category=exchange-volume-history`.
- Reported problem and root cause:
  - The backend supports `market-current.otherDateData` for carried-forward
    values across short interest, borrow fee, availability, utilization, days
    to cover, margins, scores, short volume, FTD, and exchange volume.
  - The portal only consumed that metadata for Utilization and Average
    Duration. Other cards continued choosing the latest populated history row
    and calculating their current values or dates independently.
- Intended behavior and invariants:
  - `market-current` is authoritative for every current KPI value.
  - A matching `otherDateData[{field, date}]` entry is authoritative for that
    field's displayed source date. Otherwise the field uses `snapshotDate`.
  - Backend `numChange` and `percentChange` values are preferred when present.
    The frontend calculates a comparison only when the backend omits it.
  - Each field resolves independently; one carried-forward field cannot change
    another field's source date.
  - Consolidated Market History remains the source for prior observations and
    chart series. `otherDateData` must not synthesize or replace a history
    dataset.
  - Exchange Volume surfaces the backend source date for the latest
    `exchangeVolume` object while retaining its dedicated history API.
  - Dashboard no longer requests manual utilization or margins APIs to infer
    current source dates. This explicitly supersedes the earlier manual-input
    provenance workaround documented below.
- Files changed:
  - `lib/market-data-publication.ts`
  - `app/monitor/[ticker]/dashboard/DashboardBrowserPage.tsx`
  - `app/monitor/[ticker]/dashboard/DashboardClient.tsx`
  - `app/monitor/[ticker]/dashboard/DashboardDevTables.tsx`
  - `app/monitor/[ticker]/dashboard/DashboardKpis.tsx`
  - `app/monitor/[ticker]/short-interest/ShortInterestBrowserPage.tsx`
  - `app/monitor/[ticker]/lending-pressure/LendingPressureBrowserPage.tsx`
  - `app/monitor/[ticker]/exchange-volume/ExchangeVolumeBrowserPage.tsx`
  - `docs/INTEGRATION (7).md`
  - `docs/data/data_dictionary.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and a clean production build passed after the shared
    helper and page integrations.
- Remaining backend dependency / limitation:
  - The backend must include an exact documented field path in
    `otherDateData` whenever the returned value predates `snapshotDate`.
  - Margin objects currently do not expose per-metric change fields in the
    data dictionary, so their changes continue to use the prior valid history
    observation until the API supplies authoritative changes.

## 2026-08-04 — Add API-only Exchange Volume portal page

- Area: User Portal → Exchange Volume (`/monitor/{ticker}/exchange-volume`).
- APIs/data:
  - Current OHLC values, backend-supplied change fields, and the current
    exchange-volume object:
    `GET /market-data/current?ticker={ticker}&category=market-current`.
  - Daily venue history:
    `GET /market-data/history?ticker={ticker}&category=exchange-volume-history`.
  - Raw history download:
    `GET /export/csv?dataset=history&ticker={ticker}&category=exchange-volume-history`.
- Reported requirement and root cause:
  - The backend added exchange-volume history and current exchange-volume data,
    but the user portal did not have a page that exposed either dataset.
  - The API integration document registers the new history category but does
    not yet specify the record-level history schema or the exact shape of
    `market-current.exchangeVolume`.
  - Follow-up: Development Data confirmed that the history endpoint returned
    315 records in a flat schema. Venue fields use the `ex*` prefix, alongside
    the non-venue fields `totalVolume` and `offExchangeSharePercent`. The first
    draft's generic parser did not formally map this contract and could fail to
    produce the intended venue-only chart series.
- Implemented behavior and invariants:
  - Added Exchange Volume to the primary workspace navigation and page-status
    tracking, with a portal-themed responsive page in light and dark modes.
    As a specialist detail page, its navigation item sits immediately below
    Social Sentiment rather than near the top of the primary workflow.
  - The page loads only the two authenticated Market Data API responses. It
    contains no local JSON, sample data, S3 fallback, AI interpretation, or
    derived market metrics.
  - Open, High, Low, and Close use the backend values together with the supplied
    `*ChangeValue` and `*ChangePerc` fields; the frontend does not reconstruct
    missing change values.
  - The history chart plots raw daily venue values and only filters existing
    API records by the selected period. It does not aggregate dates, calculate
    market share, rank venues, group venues into Other, or fill missing data.
  - Historical chart and table mapping now recognizes the backend's
    case-preserved flat venue fields by their `ex*` prefix, including acronym
    casing such as `GSM`, `NYSE`, and `EDGX`.
    `totalVolume` and `offExchangeSharePercent` remain visible in the table but
    are not misclassified as exchange-volume chart series.
  - History row extraction now accepts the API's records array through direct,
    `data`, category, or nested history wrappers. The user-facing history table
    is placed directly below the history chart instead of below the long
    current-venue list.
  - Exchange Volume now follows the portal's compact card rhythm: section and
    card padding, typography, control height, inter-card spacing, current-venue
    rows, and the history chart height are aligned with the established pages.
  - The history table uses explicit human-readable exchange labels, preserves
    acronyms such as GSM/NYSE/EDGX, prevents header wrapping, and allocates
    wide columns inside a horizontal scroll area rather than squeezing labels.
  - The latest venue view displays `market-current.exchangeVolume` values
    directly. API-provided percentages are labelled as API-supplied; no
    percentage is calculated in the browser.
  - The history table keeps absent values unavailable rather than replacing
    them with zero. CSV download uses the backend export endpoint.
  - Current and history failures are independent and display the complete API
    failure reason. Both raw payloads remain available in Development Data.
  - Navigation, headings, controls, empty states, and explanatory content have
    English, Traditional Chinese, and Simplified Chinese coverage.
- Files changed:
  - `app/monitor/[ticker]/exchange-volume/page.tsx`
  - `app/monitor/[ticker]/exchange-volume/loading.tsx`
  - `app/monitor/[ticker]/exchange-volume/ExchangeVolumeBrowserPage.tsx`
  - `app/globals.css`
  - `components/ImportDataTable.tsx`
  - `components/Sidebar.tsx`
  - `components/DesignBTopbar.tsx`
  - `components/TickerDataStatusProvider.tsx`
  - `lib/current-data-sources.ts`
  - `lib/legal/disclaimers.ts`
  - `lib/portal-i18n.ts`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check, production build, and whitespace validation passed.
  - Confirmed the new dynamic route is included in the production build.
  - Browser-checked navigation, error/empty states, responsive layout, light
    mode, dark mode, and Traditional Chinese labels in the local portal.
- Remaining backend dependency / limitation:
  - A real authenticated sample payload is still required to verify every
    possible venue-object shape and field label. The integration document
    should add record-level examples for both `market-current.exchangeVolume`
    and `exchange-volume-history`.

## 2026-08-04 — Render archived PDFs from the consolidated report API

- Area: User Portal → Report Archive → View PDF and Download.
- APIs/data:
  - Shared dated report:
    `GET /market-data/reports?ticker={ticker}&date={YYYY-MM-DD}`.
  - Authenticated dated AI overlay:
    `GET /market-data/ai-report?ticker={ticker}&date={YYYY-MM-DD}`.
- Reported problem and root cause:
  - The archive index already came from the reports API, but opening a PDF
    still rebuilt the report in the browser by calling market current/history,
    short-volume, FTD, sentiment, SEC filing, and AI endpoints separately.
  - The PDF launcher also replaced the dated response's display date and
    generated timestamp with synthetic archive values.
  - Backend margin raw values use decimal ratios (`1.5` means `150%`), while
    their supplied display strings currently show `1.50%`.
- Implemented behavior:
  - Opening or downloading a report now fetches the single dated consolidated
    report payload and separately fetches only the dated AI analysis.
  - Embedded report AI text is ignored. The renderer overlays
    `short_interest_current_interpretation` from the authenticated AI endpoint,
    or displays the standard unavailable message if that call fails.
  - Initial and Maintenance Margin decimal ratios are normalized to percentage
    points exactly once for report display and comparison values.
  - The API's `reportDate`, `generatedAtDisplay`, and KPI comparison labels are
    retained in the PDF rather than overwritten by archive placeholders.
  - The FTD chart title is normalized to the accepted
    `Fails-to-Deliver Trend` label.
- Must preserve:
  - Report Archive list pagination and report availability continue to use the
    reports index endpoint.
  - The accepted four-page PDF template and browser-side PDF generation remain
    unchanged.
  - No market, history, sentiment, or filing endpoint may be called while
    generating a consolidated archived report.
  - AI remains user-aware and separate from the shared dated report file.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `public/report-templates/daily-close/render.js`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/REPORT_DATA_CONTRACT.md`
  - `Report Templates/lean-daily-market-close-report/BACKEND_REPORT_API_CORRECTIONS.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check, production build, and whitespace validation passed.
  - The runtime template rendered four pages with `150.00%` Initial Margin,
    `140.00%` Maintenance Margin, API comparison labels, and the supplied
    display timestamp.
- Remaining backend dependency / limitation:
  - Margin normalization remains in the frontend while the report API returns
    decimal-ratio raw values with incorrect percentage display strings.

## 2026-08-04 — Preserve manual metric source dates on Dashboard

- Area: User Portal → Dashboard → Market Overview, specifically Utilization
  and Average Duration.
- APIs/data:
  - Values and explicit per-field dates:
    `GET /market-data/current?ticker={ticker}&category=market-current`
  - Consolidated comparisons and chart history:
    `GET /market-data/history?ticker={ticker}&category=market-history`
  - Exact manual-input provenance:
    `GET /manual-input/utilization?ticker={ticker}` and
    `GET /manual-input/margins?ticker={ticker}`
- User-reported problem:
  - CURR had no Aug 3 utilization or average-duration input, but Dashboard
    labelled the carried-forward 69.52% and 6.40d values as Aug 3.
- Root cause:
  - Aug 3 consolidation produced a `market-current` snapshot dated Aug 3 while
    retaining the latest available manual values from Jul 31.
  - When `otherDateData` did not contain the exact paths
    `utilization.percent` or `margins.averageDurationDays`,
    `marketCurrentMetricObservation` fell back to the overall snapshot date.
    Dashboard then inserted the old value as an Aug 3 observation.
- Implemented behavior:
  - An explicit matching date in `market-current.otherDateData` remains
    authoritative.
  - When that explicit date is absent, Dashboard matches the consolidated
    current value against the ticker's exact manual-input history and uses the
    newest matching input date on or before the snapshot date.
  - For the reported case, Utilization and Average Duration retain their
    published values but display Jul 31 as their source date; the missing Aug 3
    inputs are not fabricated.
  - Manual utilization and margins responses are visible as separate Dashboard
    Development Data tabs, and the Market Overview source tags identify their
    date-provenance role.
  - A manual-input read failure does not prevent Dashboard from loading; it
    retains the existing snapshot-date fallback when provenance cannot be
    resolved.
- Must preserve:
  - Manual-input records are used only to resolve the source date of the
    already-published `market-current` value. Unsaved or unconsolidated manual
    values must not replace published Dashboard values.
  - Values from a future manual-input date must never be matched to an earlier
    snapshot.
  - Each Dashboard metric continues to select its latest valid observation
    independently, and comparison labels continue using the actual prior
    observation date.
  - Consolidated Market History remains the source for comparisons and trend
    charts; no history record is rewritten by the frontend.
- Files changed:
  - `app/monitor/[ticker]/dashboard/DashboardBrowserPage.tsx`
  - `app/monitor/[ticker]/dashboard/DashboardDevTables.tsx`
  - `app/monitor/[ticker]/dashboard/DashboardKpis.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, production build,
  and focused source-date behavior checks passed.
- Remaining dependency:
  - The preferred backend contract is still to populate
    `market-current.otherDateData` with exact per-field dates. If a current
    value has no explicit date and no matching readable manual-input record,
    the frontend cannot prove an older source date and retains `snapshotDate`.

## 2026-08-04 - Correct and complete the lean report backend contract

- Area: Report Archive and Lean Daily Market Close Report backend handoff.
- APIs/data:
  - `GET /market-data/reports?ticker={ticker}&date={YYYY-MM-DD}`
  - Company profile, market history, short-volume history, FTD history,
    sentiment current/events, SEC filings, and AI-report source files.
- Reported problem: The backend implementation response covered the main report
  sections but omitted or ambiguously defined several fields needed by the
  current PDF, including the complete Trading Snapshot mapping.
- Root cause: The earlier handoff did not make every renderer field, source
  path, comparison rule, and reconciliation invariant equally explicit.
- Intended behavior and invariants:
  - The corrective specification is self-contained and supersedes ambiguous
    portions of the earlier handoff.
  - It defines canonical raw and display fields for Open, High, Low, Close, and
    Trade Volume.
  - KPI comparisons use the previous valid observation independently per
    metric and preserve both observation dates.
  - Short Score ranges, six latest-seven-valid-observation charts, complete 1D
    sentiment, five platform rows, filing details, legal text, provenance, and
    immutable archive behavior are all explicitly defined.
  - Missing data stays null and company names never fall back to a different
    ticker's identity.
- Files changed:
  - `Report Templates/lean-daily-market-close-report/BACKEND_REPORT_API_CORRECTIONS.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Cross-checked field requirements against the current report renderer and
    browser report composition.
  - Cross-checked API categories and source paths against
    `docs/INTEGRATION (7).md`.
  - Markdown structure, source mappings, examples, and validation rules were
    reviewed; whitespace validation passed.
- Remaining dependency: Backend must provide real authenticated sample
  responses and pass the documented reconciliation checks before the frontend
  switches to the consolidated reports endpoint.

## 2026-08-04 — Expand lean report trends and platform coverage

- Area: Report Archive → browser-generated lean Daily Market Close Report,
  pages 3 and 4.
- APIs/data:
  - Existing `GET /market-data/history?ticker={ticker}&category=market-history`.
  - Added report composition reads from
    `GET /market-data/history?ticker={ticker}&category=short-volume-history`
    and `GET /market-data/history?ticker={ticker}&category=ftd-history`.
  - Existing 1D `sentiment-current` platform breakdown.
- Reported problem and root cause:
  - The trends page had only four charts and did not include Short Volume or
    Fails-to-Deliver.
  - A fixed 240px minimum height left unnecessary blank space under charts.
  - Platform Breakdown omitted Facebook and LinkedIn when their 1D records
    were absent.
- Implemented behavior:
  - Short and Lending Movement now renders six charts in a compact 2-by-3 grid:
    Short Volume, Borrow Fee, Shortable Shares, Fails-to-Deliver, Utilization,
    and Days to Cover.
  - Every chart is filtered to the report date and contains at most the latest
    seven valid daily observations.
  - Short Volume uses `totalShortVolumeReported`; Fails-to-Deliver uses
    `tradeDate` and `shares`.
  - Chart cards no longer enforce extra minimum height and wrap tightly around
    their SVG charts.
  - Platform Breakdown always includes Reddit, X, Facebook, LinkedIn, and
    Stocktwits. Missing platforms display zero mentions, zero contribution,
    and `No data` rather than disappearing.
- Must preserve:
  - Archived reports must not include history after their report date.
  - Sentiment remains restricted to the report's 1D window.
  - The report remains four A4 pages and all other sections retain their
    accepted layout.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `Report Templates/lean-daily-market-close-report/report-data.json`
  - `Report Templates/lean-daily-market-close-report/REPORT_DATA_CONTRACT.md`
  - `Report Templates/lean-daily-market-close-report/preview/currenc-daily-market-close-report-lean-v1.pdf`
  - `public/report-templates/daily-close/render.js`
  - `public/report-templates/daily-close/styles.css`
  - `public/report-templates/daily-close/report-data.json`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check, JSON parsing, template synchronization, and
    whitespace validation passed.
  - The regenerated report remains four A4 pages.
  - Pages 3 and 4 were rendered to PNG and visually checked for clipping,
    alignment, spacing, chart density, and five-platform coverage.
- Remaining backend dependency / limitation: The report still composes these
  datasets from separate APIs until the requested consolidated report API
  contract is defined in Step 2.

## 2026-08-04 — Add daily trading snapshot to the lean close report

- Area: Report Archive → browser-generated lean Daily Market Close Report.
- APIs/data:
  - Existing `GET /market-data/history?ticker={ticker}&category=market-history`.
  - Existing report-date market fields: `open`, `high`, `low`, `close`, and
    `tradeVolume`; nested `price.open`, `price.high`, `price.low`, and
    `price.close` are also accepted.
- Reported problem and root cause: The lean report presented short and lending
  closing signals without the day's core trading-range and volume context.
- Implemented behavior:
  - Page 2 now begins with a compact five-column Open / High / Low / Close /
    Trade Volume strip above the eight closing-signal cards.
  - The strip uses the same eligible report-date market record selected for the
    rest of the report, so an archived report does not display current values.
  - The strip displays its actual as-of date, preserves up to four decimal
    places for prices, rounds volume to whole shares, and uses `N/A` for missing
    data.
  - The editable source template, public runtime template, and sample preview
    data remain synchronized.
- Must preserve:
  - The existing eight KPI cards, Short Interest Score, AI Analysis, seven-day
    charts, sentiment, and SEC filing sections remain unchanged.
  - Report Archive continues to generate the PDF in the browser.
- Files changed:
  - `app/monitor/[ticker]/reports/daily-report-data.ts`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `Report Templates/lean-daily-market-close-report/report-data.json`
  - `Report Templates/lean-daily-market-close-report/preview/currenc-daily-market-close-report-lean-v1.pdf`
  - `public/report-templates/daily-close/render.js`
  - `public/report-templates/daily-close/styles.css`
  - `public/report-templates/daily-close/report-data.json`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation passed.
  - The generated PDF remains four A4 pages.
  - Page 2 was rendered to PNG and visually checked for alignment, clipping,
    spacing, and preservation of the existing content.
- Remaining backend dependency / limitation: Step 1 still composes report data
  from the existing portal APIs. The requested consolidated
  `GET /market-data/reports?ticker={ticker}&date={YYYY-MM-DD}` contract update is
  intentionally deferred to Step 2 after layout approval.

## 2026-08-04 — Make Report Archive reflect the latest trading day

- Area: User Portal → Report Archive timeline and History Archive.
- API: Existing `GET /market-data/reports` index; no contract change.
- Reported problem and root cause:
  - The top panel was labelled Today's Reports and searched only the current
    calendar date, even though the available product is a market-close report
    for the latest completed trading day.
  - Pre-Market and Midday placeholders looked too similar to real report
    windows, and Post-Market could incorrectly appear Pending despite the
    latest indexed report being available.
- Implemented behavior:
  - The top panel is now Latest Trading Day Report and uses the newest report
    date returned by the API.
  - The latest Post-Market report is active with View PDF and Download actions;
    it is no longer tied to whether its date equals today's calendar date.
  - Pre-Market and Midday are visibly muted, use dashed nodes, and are labelled
    Coming Soon.
  - History Archive rows now label each window by name and status. Pre-Market
    and Midday are muted Coming Soon placeholders while Post-Market shows its
    available time and remains interactive.
  - Unavailable report-type filter choices are disabled and labelled Coming
    Soon.
- Must preserve:
  - History remains grouped by report date and paginated by 10 trading days.
  - Post-Market PDF generation and download continue to use the existing
    browser-rendered lean report.
- Files changed:
  - `app/monitor/[ticker]/reports/ReportArchiveCenter.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and local browser
  inspection passed for the latest-report timeline and archive row.

## 2026-08-04 — Load Report Archive dates from the authenticated reports API

- Area: User Portal → Report Archive.
- API: `GET /market-data/reports?ticker={ticker}&limit=100&page={page}`.
- Reported problem and root cause:
  - Available reports were not appearing from backend data.
  - The archive page never called the report-index API. It constructed a single
    synthetic report for the previous calendar day, so real backend report
    dates could not reach either Today's Reports or History Archive.
- Implemented behavior:
  - Signed-in workspaces now load the authenticated paginated report index and
    convert every returned date into the existing Post-Market report entry.
  - All available index pages are loaded, duplicate dates are removed, and the
    archive remains ordered newest first.
  - The report-specific loading placeholder remains visible until the report
    index resolves.
  - API failures are shown on the page instead of silently presenting a fake or
    empty production archive.
  - The previous-day showcase report is retained only for the explicit public
    demo session. It is no longer used as normal-user fallback data.
- Must preserve:
  - View PDF and Download continue to render the lean daily-close PDF in the
    browser from the portal's current authenticated data sources.
  - Pre-Market and Midday remain marked Coming Soon; current backend report
    dates are represented as Post-Market reports.
  - The existing date/type filters and 10-day History Archive pagination remain
    unchanged.
- Files changed:
  - `app/monitor/[ticker]/reports/ReportArchiveBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation passed.
  - Local browser verification confirmed the report loading state resolves and
    the demo-only Post-Market report appears in History Archive without errors.
- Remaining backend dependency / limitation:
  - A signed-in user's production archive reflects only dates returned by
    `GET /market-data/reports`. If that index returns no dates, the production
    archive correctly remains empty.

## 2026-08-03 — Standardize pending states for save and import buttons

- Areas:
  - User Portal → User Profile, Alert Rules, and Internal Float edit forms.
  - Operations Portal → Market Data, SEC Filings, Ownership Data,
    Notification Routing, Data Import, Social Data Upload, and Company
    Management save/create forms.
- APIs/data: Existing write and import APIs are unchanged.
- Reported problem: Save and import actions could be clicked repeatedly while
  their network request was still in flight, and pending feedback differed
  between pages.
- Implemented behavior:
  - Every active save/import button is disabled immediately by its existing
    request state, visually dimmed, and given a loading spinner.
  - Buttons retain their contextual `Saving`, `Importing`, `Uploading`,
    `Processing`, or `Creating` text while pending.
  - The spinner and disabled state are released only when the owning request
    state resolves to success or error.
  - Added `aria-busy` so assistive technology receives the same pending state.
- Must preserve:
  - Existing validation-based disabled states remain unchanged and do not show
    a spinner unless a request is actually running.
  - API payloads, success/error handling, consolidation controls, and unrelated
    delete/download/refresh actions remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/user-profile/UserProfileClient.tsx`
  - `app/monitor/[ticker]/settings/alerts/CustomAlertSettingsClient.tsx`
  - `app/monitor/[ticker]/internal-float/InternalFloatClient.tsx`
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
  - `app/operations/sec-filings/SecFilingsOperationsClient.tsx`
  - `app/operations/ownership/ManagementHoldingsOperationsClient.tsx`
  - `app/operations/hotkeys/HotkeyOperationsClient.tsx`
  - `app/operations/data-import/ManualDataImportClient.tsx`
  - `app/operations/narrative-social/NarrativeSocialUploadClient.tsx`
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check and whitespace validation.

## 2026-08-03 — Sort merged Social Feed records by posting time

- Area: User Portal → Social Sentiment → Sentiment Timeline & Social Feed.
- API/data: Date-partitioned records from
  `GET /social-data?ticker={ticker}&date={TRADING-DAY}&sort=datetime&order=desc`.
- Reported problem and root cause:
  - When several trading-day responses were merged, posts dated August 1 could
    appear below posts dated July 30 or July 31 while the control displayed
    Newest.
  - The Newest comparator returned equality for every pair and therefore kept
    the API-response merge order instead of comparing posting timestamps.
- Implemented behavior:
  - Newest now sorts every visible feed card by normalized posting timestamp in
    descending order across all selected trading-day partitions and platforms.
  - Oldest, followers, likes, and engagement sorting remain unchanged.
- Regression behavior that must remain intact:
  - A post's backend-assigned `tradeDate` remains authoritative and continues
    to be displayed separately from its posting timestamp.
  - No post is moved to another trading-day partition, and API records are not
    rewritten or reclassified.
  - The selected portal timezone affects timestamp presentation only; ordering
    uses the underlying absolute timestamp.
- Files changed:
  - `app/monitor/[ticker]/sentiment/MentionFeedCards.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining backend dependency / limitation: Records without a parseable
  posting timestamp normalize to zero and therefore appear at the end in
  Newest order.

## 2026-08-03 — Add operator ticker lifecycle management

- Area: Operations Portal → Administration → Company Management.
- APIs:
  - `POST /tickers`
  - `GET /tickers`
  - `GET /tickers/{ticker}`
  - `PUT /tickers/{ticker}`
  - `DELETE /tickers/{ticker}`
  - `POST /tickers/historical-init`
- Reported problem and root cause:
  - The backend exposes the complete managed-ticker lifecycle, but the
    operations portal had no page or navigation entry for these APIs.
  - Operators therefore could not create, find, inspect, update, retire, or
    initialize history for ticker workspaces from the portal.
- Implemented behavior:
  - Added an operator-only Company Management page and Administration
    navigation item.
  - Operators can create Active or Inactive tickers with company name and
    effective date; search and filter the server-side registry; include
    soft-deleted records; choose 10, 25, or 50 results per page; and move
    through opaque `nextToken` pages.
  - Each record can be loaded through the detail API, edited, activated or
    deactivated, opened in the existing operations workspace, or soft deleted
    after confirmation. A deleted record can be submitted as Active or
    Inactive as a restore attempt.
  - Historical initialization supports a ticker, inclusive date range, the
    `chartexchange`, `massive`, and `fintel` vendor choices, and dry-run or live
    execution. Frontend validation enforces a non-future end date, at least one
    vendor, and the documented 180-calendar-day maximum.
  - Live historical initialization requires confirmation. An HTTP 202 response
    is described as accepted asynchronous work, not completed work.
  - Development Data exposes the latest list, detail, mutation, and historical
    initialization request/response payloads without changing their API data.
  - English, Traditional Chinese, and Simplified Chinese presentation remains
    supported through the existing portal language system.
- Behavior invariants:
  - Ticker CRUD remains restricted to authenticated `OPERATOR` users.
  - Delete remains a backend soft delete; the frontend does not remove data
    locally or claim a hard deletion.
  - The documented 200 fallback from `GET /tickers/{ticker}` for an unknown
    ticker is shown as unregistered and is not treated as a complete record.
  - Search, status, deleted-record inclusion, result limit, and pagination are
    passed to `GET /tickers`; the frontend does not reconstruct a master list.
  - The current operations workspace ticker changes only when the operator
    explicitly chooses Open Workspace.
- Files changed:
  - `app/operations/tickers/page.tsx`
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `app/operations/OperationsShell.tsx`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check, whitespace validation, and production build passed.
  - Browser verification confirmed the new Administration navigation item,
    operator page layout, create form, historical-init controls, managed ticker
    filters/table/pagination, and Development Data sections without submitting
    an API mutation.
- Remaining backend dependency / limitation:
  - Historical initialization has no documented job-status endpoint. The page
    can report acceptance or an API error, but cannot independently confirm
    eventual completion.
  - Restoring a soft-deleted ticker uses `PUT /tickers/{ticker}` with Active or
    Inactive status. If the backend disallows updates to Deleted records, its
    exact error is surfaced and a dedicated restore contract will be required.

## 2026-08-03 — Read per-bucket sentiment distribution from Sentiment Current

- Area: User Portal → Social Sentiment → Timeline tooltip.
- API/data:
  `GET /market-data/current?ticker={ticker}&category=sentiment-current`.
- Reported problem and root cause:
  - Backend Timeline rows provide Bullish/Neutral/Bearish counts under the
    nested `distribution.positiveCount`, `distribution.neutralCount`, and
    `distribution.negativeCount` fields.
  - The portal only checked direct fields on each Timeline row. It therefore
    treated the authoritative per-bucket distribution as missing and displayed
    a fallback classification aggregated from `sentiment-events`.
- Implemented behavior:
  - Each selected Timeline bucket and platform now reads its nested
    `distribution` counts from `sentiment-current`.
  - Nested distribution fields take priority. Direct `positiveCount`,
    `neutralCount`, and `negativeCount` fields remain supported for backwards
    compatibility.
  - A Timeline breakdown is considered complete only when all three counts are
    present. `sentiment-events` remains the fallback only when the complete
    authoritative breakdown is absent.
- Regression behavior that must remain intact:
  - Timeline mention volume and sentiment score continue to come from the same
    `sentiment-current` Timeline rows.
  - Platform and trading-day selection continue to select the matching backend
    rows before their distributions are summed.
  - Trading-day feed behavior and raw `/social-data` feed-card sentiments are
    unchanged.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `docs/architecture/DATA_STRUCTURE.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining backend dependency / limitation: A backend Timeline row must return
  all three distribution counts for the portal to treat that row as the
  authoritative breakdown.

## 2026-08-03 — Align Social Sentiment feeds to backend trading days

- Area: User Portal → Social Sentiment → Sentiment Timeline & Social Feed.
- APIs/data:
  - Trading-day Timeline values:
    `GET /market-data/current?ticker={ticker}&category=sentiment-current`.
  - Trading-day event classifications:
    `GET /market-data/history?ticker={ticker}&category=sentiment-events`.
  - Trading-day feed partitions:
    `GET /social-data?ticker={ticker}&date={TRADING-DAY}&sort=datetime&order=desc`.
- Reported problem and clarified root cause:
  - Timeline mentions are assigned to a U.S. trading day, not grouped by the
    social post's visible calendar date.
  - Pre-market posts remain assigned to the preceding trading day, while
    weekend and market-holiday posts remain assigned to the most recent
    trading day.
  - The frontend treated the `/social-data` partition as a posting-date query,
    fetched adjacent calendar dates, and then discarded records whose displayed
    timestamp did not fall inside the selected calendar range. This could hide
    valid posts assigned to the selected Timeline bar.
- Implemented behavior:
  - The backend `/social-data?date=...` partition is authoritative. Every
    date-scoped record is stamped with the requested `tradeDate`; the portal no
    longer recomputes or filters that assignment using the display timezone.
  - The section title, information tooltip, chart accessibility label, chart
    tooltip, selected-filter notices, date controls, loading/empty text, feed
    count, and pagination language now identify the selected trading day or
    trading-day range.
  - Feed cards display both their assigned trading day and original posting
    timestamp. Newest/oldest sorting remains based on posting time.
  - Weekend and U.S. market-holiday filter boundaries are rejected with a
    specific explanation.
  - The default feed window is the latest five trading days. “See earlier
    trading days” extends it by five preceding sessions; it remains hidden while
    a Timeline bucket is selected.
  - Daily and longer event-derived Bullish/Neutral/Bearish counts use an
    available backend `tradeDate`; hourly buckets continue using source
    timestamps within the selected trading day.
  - Development Data lists `tradeDate` separately from `postedAt`.
  - The business rules are recorded in
    `docs/SOCIAL_SENTIMENT_TRADING_DAY_RULES.md`.
- Trading-day rules:
  - `America/New_York` and the U.S. market calendar are authoritative.
  - A new trading day begins at 9:30:00 a.m.; exactly 9:30 belongs to the new
    trading day.
  - After-hours, overnight, weekend, holiday, and early-close-period posts stay
    with the most recent trading day until the next session opens.
  - Late arrivals use the original posting time rather than ingestion time.
- Regression behavior that must remain intact:
  - Timeline bar heights and scores remain authoritative `sentiment-current`
    values; raw feed records do not resize or rescore them.
  - Sentiment-event breakdowns remain fallback values only when the Timeline
    does not supply its own breakdown.
  - Platform or trading-day changes issue fresh `/social-data` requests.
  - The request-id guard and loading overlay prevent stale feed cards from being
    mistaken for the newly selected trading day.
  - Deduplication, exact API failure reasons, platform filtering, posting-time
    sorting, and configured-timezone display remain intact.
  - This entry explicitly replaces the August 3 “Keep Social Feed cards inside
    the visible date range” posting-date filter and its adjacent-date lookup;
    those behaviors must not be restored for trading-day feed partitions.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `app/monitor/[ticker]/sentiment/MentionFeedCards.tsx`
  - `app/monitor/[ticker]/sentiment/SentimentTimeline.tsx`
  - `app/globals.css`
  - `lib/social-data-api.ts`
  - `lib/sentiment-buckets.ts`
  - `lib/us-market-calendar.ts`
  - `lib/portal-page-translations.ts`
  - `docs/INTEGRATION (7).md`
  - `docs/SOCIAL_SENTIMENT_TRADING_DAY_RULES.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation passed.
  - Focused New York-time boundary checks passed for 9:29:59 / 9:30:00,
    summer and winter offsets, weekends, Monday pre-market, a U.S. market
    holiday, and previous-trading-day shifting.
  - Production build passed.
- Remaining backend dependency / limitation:
  - Unscoped latest-feed fallback obtains the trading day from an explicit
    backend field or the S3 partition in the record key. Records lacking both
    cannot be assigned safely by the frontend.
  - Raw source retention may still make feed-card availability lower than a
    consolidated Timeline total; the portal does not move posts across trading
    days to force totals to match.

## 2026-08-03 — Cover stale Social Feed cards while a new range loads

- Area: User Portal → Social Sentiment → Sentiment Timeline & Social Feed.
- API/data: No API contract or data-source change.
- Reported problem: After selecting a Timeline bar, the previous date's feed
  cards remained visible for several seconds while the new `/social-data`
  requests were running, making the interface appear unresponsive or already
  updated.
- Implemented behavior:
  - The feed-card region is marked `aria-busy` and immediately covered by a
    translucent loading layer while a platform, bar, or calendar range request
    is active.
  - The layer displays an animated spinner, `Loading social feeds…`, and a
    short explanation that the selected range is being updated.
  - Existing cards remain mounted underneath to avoid layout collapse, but are
    visually covered and cannot be mistaken for the newly selected range.
  - The overlay supports the portal's light and dark themes and disables its
    rotation when the user prefers reduced motion.
- Regression behavior that must remain intact:
  - The request-id guard still prevents an older request from replacing a
    newer selection.
  - Existing loading, empty, partial-failure, date, and platform behavior is
    unchanged after the request completes.
  - Timeline values remain independent from raw feed availability.
- Files changed:
  - `app/monitor/[ticker]/sentiment/MentionFeedCards.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build. The local browser reached the authentication gate, so the signed-in
  visual transition was not available for automated inspection.

## 2026-08-03 — Keep Social Feed cards inside the visible date range

- Area: User Portal → Social Sentiment → Sentiment Timeline & Social Feed.
- API/data:
  `GET /social-data?ticker={ticker}&date={YYYY-MM-DD}&sort=datetime&order=desc`.
- Reported regression: Selecting the Jul 14 Timeline bucket displayed feed
  cards whose visible timestamps were Jul 15 in the configured portal
  timezone.
- Root cause:
  - The documented `date` filter may match a record by its post date, S3 target
    bucket date, or calculated target date.
  - The preceding Timeline alignment change trusted every date-scoped response
    record for daily and longer buckets. A Jul 14 API request could therefore
    legitimately return a record whose actual timestamp displays as Jul 15.
- Implemented behavior:
  - Feed loading requests two adjacent calendar dates on each side of the
    visible range so records stored under a nearby target/calculated date can
    still be discovered.
  - Returned records are deduplicated and then filtered by their actual
    timestamp converted into the portal's configured timezone.
  - Only records whose displayed date falls within the visible From/To range
    are rendered and counted.
  - Latest-platform fallback dates are also calculated in the configured
    portal timezone.
- Regression behavior that must remain intact:
  - Backend Timeline `bucketStart` remains the canonical selected boundary.
  - Platform/date selections continue to issue fresh `/social-data` requests.
  - Daily API failures remain visible with their exact queried date and error.
  - Timeline bars, scores, and consolidated platform totals are not changed by
    raw feed availability.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, focused timezone
  date-boundary checks, and production build.
- Remaining backend dependency / limitation:
  - The adjacent-date search covers the observed target-date drift without a
    range endpoint. A record stored more than two calendar days away from its
    actual timestamp may still require backend date normalization.
  - Matching the visible date does not recreate raw posts absent from
    `/social-data`, so card totals can still be lower than consolidated
    Timeline mentions.

## 2026-07-31 — Align Social Feed requests to backend Timeline buckets

- Area: User Portal → Social Sentiment → Sentiment Timeline & Social Feed.
- APIs/data:
  - Bucket boundaries:
    `GET /market-data/current?ticker={ticker}&category=sentiment-current`.
  - Feed cards:
    `GET /social-data?ticker={ticker}&date={YYYY-MM-DD}&sort=datetime&order=desc`.
- Reported problem:
  - A selected daily Timeline bar could show consolidated mentions while the
    feed section displayed no posts.
  - The frontend generated local-time bucket boundaries instead of retaining
    the backend Timeline row's canonical `bucketStart`.
  - After the already date-scoped `/social-data` response arrived, the
    frontend applied a second strict timestamp filter. That could discard a
    record which the documented API correctly matched by post date, S3 target
    bucket date, or calculated target date.
- Implemented behavior:
  - When backend Timeline rows are available, visible chart buckets are aligned
    to their actual `bucketStart` values before event aggregation, selection,
    and feed requests.
  - Clicking a backend-aligned daily or longer bucket requests the exact
    inclusive calendar dates represented by that bucket.
  - Daily and longer selections trust the date-scoped `/social-data` response
    and no longer apply the conflicting second timestamp filter.
  - Sub-day buckets still apply the exact start/end timestamp filter because
    `/social-data` supports dates but not hours.
  - Existing generated buckets remain the fallback when no backend Timeline is
    available.
- Regression behavior that must remain intact:
  - `1M` remains daily, `1W` remains daily, `1D` remains hourly, and `1Y`
    remains monthly.
  - Timeline bar heights and sentiment scores remain authoritative backend
    values; raw feeds do not resize or rescore them.
  - Platform filters and every bucket/date selection continue to issue fresh
    `/social-data` requests.
  - Partial daily API failures remain visible with their specific reasons.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `lib/sentiment-buckets.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, focused bucket
  alignment checks, and production build.
- Remaining backend dependency / limitation:
  - This removes frontend date-boundary and double-filter mismatches. It cannot
    recreate a raw social record that is absent from `/social-data`, so a
    historical consolidated bar can still exceed available raw cards if the
    source archive itself is incomplete.
  - Monthly selections still require one API request per calendar day because
    `/social-data` has no native range query.

## 2026-07-31 — Hide timeline classified-event coverage text

- Area: User Portal → Social Sentiment → Sentiment Timeline tooltips.
- API/data: No data-source or calculation change.
- Requested change: Remove the visible
  `Classified events: X / Y mentions` coverage line.
- Implemented behavior:
  - Tooltips continue to show the authoritative bar mention total and score.
  - Bullish, Neutral, and Bearish continue to show the available
    event-derived counts.
  - The classified-event coverage ratio is no longer displayed.
- Must preserve:
  - Timeline bars and scores remain sourced from `sentiment-current`.
  - Sentiment breakdown counts continue to use `sentiment-events` when the
    backend timeline does not provide its own breakdown.
  - No `Unavailable` label is restored.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentTimeline.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build.

## 2026-07-31 — Display partial timeline event classifications

- Area: User Portal → Social Sentiment → Sentiment Timeline tooltips.
- APIs/data:
  - Authoritative bar total and score:
    `GET /market-data/current?ticker={ticker}&category=sentiment-current`.
  - Bullish, Neutral, and Bearish classification counts:
    `GET /market-data/history?ticker={ticker}&category=sentiment-events`.
- Requested replacement: Do not hide event-derived sentiment counts when their
  total differs from the consolidated timeline bar. Replace the immediately
  preceding strict-reconciliation `Unavailable` behavior with a transparent
  partial-coverage display.
- Implemented behavior:
  - Bullish, Neutral, and Bearish always display the available event-derived
    counts when the backend timeline does not supply its own breakdown.
  - When the classified-event total differs from the authoritative bar total,
    the tooltip adds `Classified events: X / Y mentions`.
  - When the two totals match, the extra coverage line is omitted.
  - Backend-provided per-bucket sentiment counts remain authoritative when
    present.
- Regression behavior that must remain intact:
  - Timeline bar height and sentiment score remain sourced from
    `sentiment-current`; events do not resize or rescore the bars.
  - Events remain clipped to the backend period and indexed once by visible
    bucket and selected platform.
  - Raw `/social-data` feed records do not affect timeline calculations.
  - `1W` continues to resolve backend `7D`, and `1M` continues to resolve
    backend `30D`.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `app/monitor/[ticker]/sentiment/SentimentTimeline.tsx`
  - `lib/sentiment-buckets.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation.
  - Focused classified-event aggregation and bucket-boundary check.
  - Production build passed.
- Remaining backend dependency / limitation:
  - The coverage line can remain below 100% until every backend timeline row
    supplies matching `positiveCount`, `neutralCount`, and `negativeCount`
    fields or the event history is fully aligned with the consolidated data.

## 2026-07-31 — Reconcile timeline sentiment breakdowns with event records

- Area: User Portal → Social Sentiment → Sentiment Timeline tooltips.
- APIs/data:
  - Authoritative timeline bars and scores:
    `GET /market-data/current?ticker={ticker}&category=sentiment-current`.
  - Tooltip sentiment breakdown fallback:
    `GET /market-data/history?ticker={ticker}&category=sentiment-events`.
- Reported problem: The 1Y timeline tooltip always displayed zero Bullish,
  Neutral, and Bearish counts even when its bars contained mentions.
- Root causes:
  - The live `1Y` backend timeline supplies `bucketStart`, `platform`,
    `mentions`, and `sentimentScore`, but no per-bucket sentiment counts.
  - Because the backend timeline existed, the frontend never used
    `sentiment-events` for those three tooltip fields.
  - UI ranges `1W` and `1M` did not match the backend's `7D` and `30D` period
    keys, so those ranges silently used the event fallback instead of their
    available backend timelines.
- Implemented behavior:
  - `1W` now resolves `7D`, and `1M` resolves `30D`; exact backend keys remain
    supported.
  - Backend timeline mention volume and sentiment score remain authoritative.
  - The already-loaded sentiment events are clipped to the backend period's
    exact start/end, indexed into the visible buckets in one pass, and used
    only for missing Bullish, Neutral, and Bearish tooltip counts.
  - Event counts are displayed only when a bucket's event total exactly
    matches its authoritative backend mention total. Otherwise each sentiment
    breakdown field displays `Unavailable` instead of a misleading zero.
  - If a backend timeline supplies its own per-bucket sentiment counts, those
    remain authoritative and no event-derived replacement is applied.
- Regression behavior that must remain intact:
  - Raw `/social-data` feed records never affect the timeline, KPI,
    distribution, or platform totals.
  - Backend timeline bars and sentiment scores are not recalculated from
    events.
  - Platform and date filtering continue to trigger the feed API behavior
    documented in the adjacent Social Sentiment entries.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `app/monitor/[ticker]/sentiment/SentimentTimeline.tsx`
  - `lib/sentiment-buckets.ts`
  - `lib/social-data-api.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation.
  - Focused aggregation check confirmed boundary assignment, per-tone counts,
    and average score calculation.
  - Production build passed.
- Remaining backend dependency / limitation:
  - A mismatched bucket intentionally shows `Unavailable`. Supplying
    `positiveCount`, `neutralCount`, and `negativeCount` in every backend
    timeline row would remove the need for event reconciliation.

## 2026-07-31 — Correct sentiment gauge direction and Short Interest score fit

- Areas:
  - User Portal → Social Sentiment → Overall Sentiment.
  - User Portal → Short Interest → Short Interest Score.
- API/data: No API contract change; this is presentation-only.
- Reported problems:
  - The Overall Sentiment gauge placed bullish green on the left and bearish
    red on the right.
  - A two-decimal Short Interest score could touch or overlap its circular
    gauge.
- Implemented behavior:
  - The sentiment arc now runs from bearish red on the left, through neutral
    yellow, to bullish green on the right.
  - The gauge needle direction now follows the same low-to-high mapping.
  - The Short Interest score and `/ 100` label are vertically centered and
    independently sized inside the ring, including for `100.00` and compact
    viewports.
- Must preserve: Sentiment and Short Interest values, labels, ranges, and API
  sources remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check and whitespace validation.

## 2026-07-31 — Fetch Social Sentiment feeds for every active platform and date filter

- Area: User Portal → Social Sentiment → Sentiment Timeline & Social Feed.
- APIs/data:
  - Feed cards:
    `GET /social-data?ticker={ticker}&platform={platform}&date={YYYY-MM-DD}&sort=datetime&order=desc`.
  - Timeline and platform totals remain:
    `GET /market-data/current?ticker={ticker}&category=sentiment-current` and
    `GET /market-data/history?ticker={ticker}&category=sentiment-events`.
- Reported problems:
  - Selecting Reddit could show a nonzero consolidated platform count but no
    feed cards.
  - Clicking a timeline bar filtered only the already-loaded default seven-day
    feed, so older chart buckets appeared empty.
- Root cause:
  - Platform selection was a local array filter and did not issue a
    platform-scoped `/social-data` request.
  - Timeline bucket selection changed only `selectedBucketId`; it did not
    change the feed API date range or fetch the bucket's calendar dates.
- Implemented behavior:
  - Changing the platform reruns the daily feed requests with the selected
    platform query. `All` omits the platform query.
  - Clicking a timeline bucket converts its inclusive calendar span into the
    feed From/To range and requests every date in that span.
  - Platform and timeline filters can remain active together.
  - Clearing a timeline bucket restores the prior calendar feed range and
    refetches it.
  - Daily requests use `Promise.allSettled`; successful dates remain visible
    when another date fails, and the failed date plus API reason is displayed.
- Regression behavior that must remain intact:
  - Consolidated timeframe counts and timeline bars continue to come only from
    `sentiment-current` and `sentiment-events`.
  - Raw `/social-data` feed records do not change consolidated KPI, platform
    count, distribution, or timeline values.
  - Date-scoped feed requests continue to omit `limit` and `page`, retain API
    `sort=datetime&order=desc`, and deduplicate by platform plus stable record
    identity.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining backend dependency / limitation:
  - The API supports one `date` per request rather than a native date range, so
    a monthly timeline bucket requires one request for every calendar day.
  - The 1Y consolidated timeline currently supplies mention volume and
    sentiment score but not per-bucket positive, neutral, and negative counts.
    Because that timeline exists, the frontend does not use the
    sentiment-event fallback for those tooltip fields; correcting that separate
    issue requires either backend bucket counts or an explicit frontend
    per-bucket event calculation.

## 2026-07-31 — Show the latest available feed period for inactive platforms

- Area: User Portal → Social Sentiment → Sentiment Timeline & Social Feed.
- APIs/data:
  - Default feed range:
    `GET /social-data?ticker={ticker}&platform={platform}&date={YYYY-MM-DD}&sort=datetime&order=desc`.
  - Latest-record probe:
    `GET /social-data?ticker={ticker}&platform={platform}&page=1&limit=100&sort=datetime&order=desc`.
- Reported problem: A platform could have a nonzero count in the selected
  consolidated timeframe but no posts in the default last-seven-days feed
  range, making the selected platform appear to have no feed data.
- Root cause: Consolidated platform counts follow the selected sentiment
  timeframe, while feed cards intentionally use a separate seven-day calendar
  range. The UI did not recover when those two valid ranges did not overlap.
- Implemented behavior:
  - When a selected platform has no posts in the untouched default feed range,
    the page probes that platform's latest records, finds the newest timestamp
    within the allowed one-year feed window, and loads the seven-day period
    ending on that date.
  - The visible From/To fields update to the effective fallback range and a
    notice explains the original empty range and the substituted period.
  - The frontend sorts the probe response itself before choosing the newest
    date because the live API does not consistently return its first record in
    descending timestamp order.
  - Manually selected calendar dates and timeline-bar date ranges remain exact;
    an empty explicit selection is never silently moved to another period.
- Regression behavior that must remain intact:
  - Every platform or date change still issues fresh `/social-data` requests.
  - Feed cards remain separate from consolidated KPI, platform-count,
    distribution, and timeline data.
  - Date-scoped requests still omit `limit` and `page`; the pagination
    parameters are used only by the latest-record probe.
  - Partial daily-request failures remain visible with their specific API
    reason.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check, whitespace validation, and production build.
  - Authenticated browser check with CURR → 1Y → Stocktwits: the empty
    2026-07-25 through 2026-07-31 default range moved to 2026-07-17 through
    2026-07-23, displayed the explanatory notice, and loaded the Jul 23 post.
- Remaining backend dependency / limitation:
  - `/social-data` has no native date-range query, so the fallback uses one
    latest-record probe plus one request per day in the displayed seven-day
    period.
  - The latest-record probe inspects up to 100 returned records. A backend
    endpoint that returns an authoritative latest available date would remove
    that frontend safeguard.

## 2026-07-31 — Remove misplaced CURR ownership records from MIMI

- Area: Operations Portal → Ownership Data → Management Holdings API records.
- API/data:
  `GET` and `DELETE /manual-input/management-holdings?ticker=MIMI&id={id}`.
- Reported problem: Three CURR holder records continued to appear in MIMI's
  raw management-holdings response even though they were not entered as MIMI
  holdings.
- Confirmed root cause:
  - The frontend requested `ticker=MIMI` correctly and rendered the uncached
    response without merging CURR records.
  - The three records were physically present in MIMI's ticker-scoped backend
    record array. Their audit timestamps show that they were created under MIMI
    on July 17, 2026, consistent with a historical company-selection mismatch
    during data entry rather than a current frontend display merge.
- Corrective action:
  - Deleted only `Nga Man Wong` (`ops-strat-42503f7b`),
    `Yafangzhou Huang` (`ops-strat-b7806595`), and
    `Man San Wong` (`ops-strat-8fd08bad`) from MIMI.
  - Preserved all six genuine MIMI management-holdings records.
- Must preserve:
  - Management-holdings data remains strictly ticker-scoped.
  - The normal Suggested Changes tab continues to show pending suggestions
    only; applied and discarded audit records are not reclassified as active
    suggestions.
  - No CURR records or consolidated ownership snapshots were modified.
- Files changed: `docs/CODEX_CHANGE_LOG.md` only. A temporary local UI exposure
  used to access completed records was fully reverted.
- Verification:
  - Uncached MIMI API response decreased from nine records to six.
  - All three deleted names and IDs are absent from the refreshed raw response.
  - The five pending MIMI suggestions remain present.
  - The Operations company indicator was restored to its prior size and
    position after the cleanup.
- Remaining dependency: Manual-input deletion does not automatically run
  consolidation. If a previously applied record was copied into a separate
  consolidated or user-scoped holding, that downstream record must be reviewed
  independently rather than inferred from this source-record cleanup.

## 2026-07-31 — Simplify Dashboard daily market snapshot

- Area: User Portal → Dashboard, between Market Overview and Alert Center.
- API/data:
  `GET /market-data/current?ticker={ticker}&category=market-current`.
- Requested change: Remove the `Daily Market` and `Trading Snapshot` headings
  so the compact OHLC and Trade Volume strip remains visually simple.
- Implemented behavior:
  - Removed both visible title lines and the dedicated title column.
  - Open, High, Low, Close, and Trade Volume now use the full section width.
  - The small source-date metadata remains available without adding another
    visible section heading.
  - Updated the dashboard loading placeholder to match the title-free layout.
- Must preserve: Current Market remains the sole source; missing values remain
  `N/A`; no Market History fallback or cross-date merge is allowed.
- Files changed:
  - `app/monitor/[ticker]/dashboard/DailyMarketSnapshot.tsx`
  - `components/PortalPageLoading.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check and whitespace validation.

## 2026-07-31 — Add Dashboard daily trading snapshot and simplify FTD table

- Areas:
  - User Portal → Dashboard, between Market Overview and Alert Center.
  - User Portal → Short Interest → Fails-to-Deliver table.
- API/data:
  `GET /market-data/current?ticker={ticker}&category=market-current`.
- Requested changes:
  - Remove Trade Volume from the Fails-to-Deliver table.
  - Add a compact dashboard section for Open, High, Low, Close, and Trade
    Volume.
- Implemented behavior:
  - The FTD table no longer defines, maps, or renders a Trade Volume column.
  - Dashboard Trading Snapshot reads `price.open`, `price.high`, `price.low`,
    `price.close`, and `tradeVolume` from the same Market Current snapshot.
  - Missing fields display `N/A`; no Market History or cross-date fallback is
    applied.
  - The section displays its exact source date and a development-mode API
    source tag.
  - The dashboard loading placeholder now includes a corresponding five-metric
    strip to reduce layout shift.
- Source decision: Market Current now provides the complete same-date OHLC and
  Trade Volume snapshot, so the section uses that API directly.
- Must preserve:
  - Do not merge Market History Trade Volume into FTD records.
  - Do not combine OHLC values from different dates or fall back to Market
    History.
  - Existing dashboard KPI, Alert Center, and chart behavior remains unchanged.
- Files changed:
  - `app/monitor/[ticker]/short-interest/ShortInterestBrowserPage.tsx`
  - `app/monitor/[ticker]/dashboard/DailyMarketSnapshot.tsx`
  - `app/monitor/[ticker]/dashboard/DashboardBrowserPage.tsx`
  - `app/monitor/[ticker]/dashboard/DashboardClient.tsx`
  - `components/PortalPageLoading.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build.

## 2026-07-31 — Align Publication Readiness with independent dashboard metrics

- Area: Operations Portal → Market Data → Publication Readiness only.
- API/data: `GET /market-data/history?ticker={ticker}&category=market-history`
  plus the currently displayed Manual Input form/list state.
- Reported problem: Publication Readiness used an all-or-nothing complete-date
  rule even though dashboard cards now display each metric's latest available
  non-null observation independently.
- Implemented behavior:
  - Publication Readiness now presents the same seven dashboard metrics:
    Borrow Fee, Initial Margin, Maintenance Margin, Shortable Shares,
    Utilization, Average Duration, and Days to Cover.
  - Each metric first uses the selected date's value and otherwise uses its own
    latest available value on or before that date.
  - Every populated metric displays its individual source date. A missing
    metric does not hold back available metrics.
  - The status is `Available` only when all seven metrics have an available
    value; otherwise it is `Partial`.
  - Removed the obsolete `Frontend currently displays` / `No complete date
    available` indicator and complete-date explanatory text.
  - Removed CSS used only by the retired indicator and optional-row treatment.
- Must preserve:
  - This change is limited to the Operations Portal Publication Readiness
    section.
  - Dashboard, consolidation, save, delete, and Manual Input behavior remain
    unchanged.
  - Values must not be carried forward from a future date.
- Files changed:
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
  - `app/globals.css`
  - `app/portal-theme.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build.

## 2026-07-31 — Preview saved Market Data before editing

- Area: Operations Portal → Market Data → Daily Market Inputs.
- APIs/data: The merged list responses from `issued-share`, `utilization`,
  `manual-availability`, `margins`, and `short-score`.
- Reported problem: Selecting a date that existed in Saved Daily Inputs showed
  disabled but empty fields until the operator clicked `Edit Record`.
- Implemented behavior:
  - Selecting an existing date immediately displays that date's saved Manual
    Input values in disabled fields.
  - `Edit Record` unlocks the same displayed values; it does not fetch or
    substitute another record.
  - `Cancel Edit` restores the saved values in read-only mode.
  - Dates absent from Saved Daily Inputs remain blank.
- Must preserve: Display and edit values use the same ticker-and-date row from
  the merged Manual Input list state; no exact-date, latest-value, consolidated,
  or cross-ticker fallback is permitted.
- Files changed:
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check and whitespace validation.

## 2026-07-31 — Keep deleted or new Market Data dates blank

- Area: Operations Portal → Market Data → Daily Market Inputs and Saved Daily
  Inputs.
- APIs/data:
  - `GET /manual-input/issued-share?ticker={ticker}`
  - `GET /manual-input/utilization?ticker={ticker}`
  - `GET /manual-input/manual-availability?ticker={ticker}`
  - `GET /manual-input/margins?ticker={ticker}`
  - `GET /manual-input/short-score?ticker={ticker}`
  - Corresponding `PUT` and `DELETE` requests retain both `ticker` and
    `tradeDate`.
- Reported problem: July 30 had been deleted and no longer appeared in Saved
  Daily Inputs, but selecting July 30 and clicking `Edit Record` repopulated the
  form with old values.
- Root cause: Date selection and edit prefilling made a second set of exact-date
  GET requests. A response without a trustworthy `tradeDate` was treated as if
  it belonged to the selected date, so stale values recreated a deleted row in
  frontend state.
- Implemented behavior:
  - The five merged Manual Input list responses are now the sole authority for
    whether a saved date exists.
  - Selecting a date absent from the merged list always opens a blank form and
    never makes an exact-date prefill request.
  - `Edit Record` is shown only for a row present in Saved Daily Inputs and
    prefills only that list row.
  - After successful writes, the submitted values are inserted into the local
    list state. After successful category deletes, the row is removed from local
    list state. Neither action performs an ambiguous exact-date readback.
- Must preserve:
  - Deleted and never-saved dates remain blank until the operator saves data.
  - No consolidated, cross-date, latest-value, or date-less API response may
    create or prefill a Manual Input record.
  - Saved Daily Inputs and edit prefilling use the same merged Manual Input list
    source.
- Files changed:
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build.

## 2026-07-31 — Separate Market Data storage from manual consolidation

- Area: Operations Portal → Market Data → Daily Market Inputs, Publication
  Readiness, and Saved Daily Inputs.
- APIs/data:
  - Saved-input histories:
    - `GET /manual-input/issued-share?ticker={ticker}`
    - `GET /manual-input/utilization?ticker={ticker}`
    - `GET /manual-input/manual-availability?ticker={ticker}`
    - `GET /manual-input/margins?ticker={ticker}`
    - `GET /manual-input/short-score?ticker={ticker}`
  - Manual publication trigger:
    `POST /manual-input/consolidate?ticker={ticker}`.
  - Consolidated publication/readiness source:
    `GET /market-data/history?ticker={ticker}&category=market-history`.
- User-requested changes:
  - Fix #01: Saved Daily Inputs must be built from Manual Input histories, not
    consolidated Market History dates.
  - Split `Save Inputs & Publish` into `Save Data` and `Run Consolidation`.
  - Delete must remove Manual Input records without automatically running
    consolidation.
- Implemented behavior:
  - The five Manual Input history lists are merged by `tradeDate` into the Saved
    Daily Inputs table. A date appears only when at least one manual business
    value exists.
  - Consolidated Market History is no longer used as the saved-input date index.
    It remains available only for publication readiness, prior optional values,
    and the currently published frontend date.
  - `Save Data` writes Manual Input records and immediately inserts or updates
    the submitted date in the table. It does not trigger consolidation.
  - `Delete` removes the selected date from all five Manual Input categories,
    treats an already-absent category as harmless, and removes the row
    immediately. It does not trigger consolidation.
  - `Run Consolidation` is a separate explicit action. It retains the existing
    accepted-trigger and consolidated-output verification behavior.
  - Messages direct operators to run consolidation after completing a batch of
    additions and deletions.
- Must preserve:
  - Form and table values come only from Manual Input APIs.
  - No consolidated, local, cross-date, or cross-ticker fallback may populate
    manual input values.
  - Ticker and trade date remain part of write/delete requests and frontend
    record keys.
  - Saving and deleting must remain useful without waiting for the asynchronous
    consolidation pipeline.
- Supersedes:
  - The 2026-07-31 delete behavior below that automatically triggered
    consolidation.
  - The previous Market History date-index workaround for Saved Daily Inputs.
- Files changed:
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build passed.
- Remaining backend dependency: Manual Input history APIs return complete lists
  without documented server-side pagination. The frontend paginates the merged
  result after retrieval.

## 2026-07-31 — Verify Market Data deletion and hide empty manual dates

- Area: Operations Portal → Market Data → Saved Daily Inputs.
- APIs/data:
  - `DELETE /manual-input/{category}?ticker={ticker}&tradeDate={date}` for
    `issued-share`, `utilization`, `manual-availability`, `margins`, and
    `short-score`.
  - Exact-date `GET` requests to the same five categories.
  - Consolidated date index:
    `GET /market-data/history?ticker={ticker}&category=market-history`.
- Reported problem: After deleting a daily input and waiting for consolidation,
  the date still appeared in Saved Daily Inputs.
- Root cause: The table used consolidated Market History as its row index.
  Consolidation can retain a market-history date even after all exact manual
  records for that date have been removed, so the date was presented as if it
  were still a saved manual input.
- Implemented behavior:
  - After all five delete requests succeed, the page immediately reads all five
    exact-date manual-input endpoints and verifies that no business values
    remain.
  - A verified-empty date is removed from Saved Daily Inputs immediately, before
    the longer consolidation-output check completes.
  - Dates whose lazy exact-date responses are known to be empty are excluded
    from the saved-input table even if consolidated Market History retains the
    date.
  - If any exact-date endpoint still returns a value, or verification fails for
    a reason other than a normal not-found response, the page reports that the
    backend deletion is incomplete and does not falsely claim success.
  - Saving new values removes any local deleted-date suppression for that
    ticker and date.
- Must preserve:
  - Consolidated Market History remains the available date index and publication
    source, but never becomes the source of manual form values.
  - Form values and table cells continue to come only from the five exact-date
    Manual Input V2 endpoints.
  - Ticker and trade date remain part of every cache identity and API request.
  - The existing consolidation trigger and output-verification flow remains in
    place after manual deletion is independently verified.
- Files changed:
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check and whitespace validation passed.
- Remaining backend dependency: Consolidated Market History may legitimately
  retain the trade date after manual values are deleted. The frontend now
  distinguishes that historical date from an actual saved manual record.
- Superseded behavior: Automatic consolidation after deletion was explicitly
  removed later on 2026-07-31. See “Separate Market Data storage from manual
  consolidation” above.

## 2026-07-31 — Prevent cross-ticker Market Data edit prefills

- Area: Operations Portal → Market Data → Daily Market Inputs and Saved Daily
  Inputs.
- APIs/data:
  - `GET /market-data/history?ticker={ticker}&category=market-history`
  - Exact-date `GET /manual-input/{category}?ticker={ticker}&tradeDate={date}`
    for `issued-share`, `utilization`, `manual-availability`, `margins`, and
    `short-score`.
- Reported problem: The MIMI workspace said that a daily input record already
  existed and Edit Record could show CURR-like values even though no MIMI
  manual inputs had been entered for the selected date.
- Root causes:
  - The frontend manual-input cache and in-flight request registry were keyed
    only by trade date, so they did not encode company identity.
  - A consolidated Market History date was treated as proof that a manual-input
    record existed, even when all five exact-date manual-input responses were
    empty.
  - The active ticker was committed only after the initial API batch completed,
    leaving a window in which an older ticker request could update current
    state.
- Implemented behavior:
  - Manual-input cache and request identities now use `ticker + tradeDate`.
  - The selected ticker is committed and prior rows/cache are cleared before a
    new ticker's requests begin.
  - Each ticker load has a generation guard; responses from an older ticker or
    older load are discarded.
  - Market History remains only the date index. A date is considered editable
    as an existing record only when an exact-date manual-input response contains
    at least one business value.
  - Edit Record continues to prefill only the five exact-date APIs for the
    active ticker and selected date.
- Must preserve:
  - No local, cross-date, or cross-ticker fallback values.
  - Market History must not become the source of form values.
  - A backend exact-date response that explicitly declares another ticker is
    rejected by the existing response filter.
- Files changed:
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check and whitespace validation passed.
- Remaining backend dependency: The documented exact-date Manual Input response
  examples omit `ticker` and `tradeDate`. If the API returns another company's
  business values while omitting those identifiers, the frontend cannot prove
  that mismatch. Returning both fields in every exact-date response is
  recommended for end-to-end validation.

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

## 2026-08-04 - Define the complete backend contract for the lean daily close report

- Area: Report Archive and Lean Daily Market Close Report backend handoff.
- APIs/data:
  - `GET /market-data/reports?ticker={ticker}&limit={limit}&page={page}`
  - `GET /market-data/reports?ticker={ticker}&date={YYYY-MM-DD}`
  - Current and history categories used to generate the dated report snapshot.
- Reported problem: The existing dated reports API does not return the complete
  collection of market, short-lending, sentiment, filing, and AI data required
  by the current lean PDF layout.
- Root cause: The browser currently composes the report from several APIs and
  source files, while the backend report object is an incomplete summary rather
  than a report-ready immutable snapshot.
- Intended behavior and invariants:
  - Preserve the existing paginated report-index behavior when `date` is absent.
  - Return one complete report-ready payload when `date` is present.
  - Store shared dated snapshots at
    `reports/{ticker}/{date}/{ticker}_report_data.json`.
  - Freeze report-date market, 1D sentiment, and filing data so archived reports
    do not change when current source files are updated.
  - Use the previous valid observation independently for each KPI comparison.
  - Return six aligned seven-observation chart series without forward-filling.
  - Preserve user-specific AI lookup without writing one user's analysis into
    the shared ticker report file.
  - Keep null values as null and never manufacture zero or placeholder data.
- Files changed:
  - `Report Templates/lean-daily-market-close-report/BACKEND_REPORT_API_REQUIREMENTS.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Checked the documented source paths and categories against
    `docs/INTEGRATION (7).md`.
  - Checked the contract against the current report composition in
    `app/monitor/[ticker]/reports/daily-report-data.ts`.
  - Markdown structure, source tables, response schema, formulas, and acceptance
    criteria were reviewed; whitespace validation passed.
- Remaining dependency: The backend must implement and deploy the detailed
  report contract before the frontend can remove its multi-API composition path.

## 2026-08-06 - Synchronize Strategic Entities and batch ownership consolidation

- Area: User Portal → Ownership and Internal Float; Operations Portal →
  Ownership Data.
- APIs/data:
  - `GET /market-data/current?ticker={ticker}&category=ownership-current`
  - `GET /manual-input/internal-float-inputs-user?ticker={ticker}`
  - `GET /manual-input/management-holdings?ticker={ticker}`
  - `POST /manual-input/consolidate?ticker={ticker}`
- User-reported problem: The Ownership page's Strategic Entities panel was
  empty even though holdings were present in Internal Float. Automatically
  consolidating after every newly entered holder would also create unnecessary
  processing when several holders are entered together.
- Root cause: Ownership used the operations suggestion ledger as its detailed
  Strategic Entities source, while Internal Float displayed a merged current
  holdings list built from user-saved holdings and directly applied operations
  records. The two pages therefore did not share the same detail-building rule.
- Intended behavior and invariants:
  - Ownership uses the same merged holdings rule as Internal Float for the
    detailed Strategic Entities list.
  - User-saved holdings remain authoritative when an operations record has the
    same normalized holder name, preventing a directly applied record from
    being counted twice.
  - The ownership donut and Public Float continue to use consolidated
    `ownership-current` totals when supplied. The immediate detail list must not
    imply that consolidation has already completed.
  - After any Management / Strategic holding addition, edit, or removal is
    successfully saved, users and operators choose either
    `Continue Managing Holdings` or `Finish & Update Ownership`.
  - Individual saves do not trigger consolidation. Finishing the batch triggers
    one consolidation request and explains that the Ownership page should
    reflect the update within about two minutes.
  - Editing and removing holdings use the same batch-finish workflow. Tokenized
    and collateralized holdings retain their existing behavior.
- Files changed:
  - `lib/internal-float-holdings.ts`
  - `app/monitor/[ticker]/internal-float/InternalFloatRoleView.tsx`
  - `app/monitor/[ticker]/internal-float/InternalFloatClient.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalOverview.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalDevTables.tsx`
  - `app/operations/ownership/ManagementHoldingsOperationsClient.tsx`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check and whitespace validation passed. The
  production build was also run after the final changes.
- Remaining dependency: Consolidation is asynchronous and has no completion
  status endpoint. The two-minute message is therefore an expectation rather
  than a live backend progress indicator.

## 2026-08-06 - Read consolidated Strategic Entities from the user float snapshot

- Area: User Portal → Ownership → Ownership Structure.
- APIs/data:
  - `GET /market-data/current?ticker={ticker}&category=ownership-current`
  - `GET /market-data/current?ticker={ticker}&category=internal-float-current-user`
  - `GET /manual-input/internal-float-inputs-user?ticker={ticker}`
  - `GET /manual-input/management-holdings?ticker={ticker}`
- User-reported problem: The Strategic Entities detail panel showed a newly
  saved holding, but the ownership donut still displayed zero after waiting for
  consolidation.
- Root cause: The donut read `ownership-current.strategicEntities`, which is a
  ticker-level total generated from operations records marked
  `showInOwnership`. User-entered Internal Float holdings are consolidated into
  the user-specific `internal-float-current-user.managementStrategicHoldings`
  snapshot, so even a successful consolidation could not update the donut's
  previous source. A stale pre-consolidation response could also remain in the
  shared GET cache for up to 15 minutes.
- Intended behavior and invariants:
  - The Ownership donut uses the consolidated user-specific
    `managementStrategicHoldings.shares` total for Strategic Entities.
  - Public Float is derived from consolidated issued shares, institutional
    shares, and the user-specific Strategic Entities total. Tokenized and
    collateralized deductions remain private to Internal Float and are not
    deducted from Ownership Public Float.
  - The detail panel continues to show saved holding records immediately.
  - While the saved detail total and consolidated total disagree, Ownership
    refreshes the user float snapshot every 15 seconds for at most three
    minutes, then stops. Normal page loading retains the existing cache.
  - Development Data exposes the raw user float snapshot so the consolidated
    total and generation timestamp can be inspected directly.
- Files changed:
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalOverview.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalDevTables.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification: TypeScript type-check, whitespace validation, and production
  build were run after implementation.
- Remaining dependency: The backend provides no consolidation job-status API;
  completion is inferred when the consolidated strategic total matches the
  saved holdings total.

## 2026-08-06 - Add effective-dated manual security ownership imports

- Area: Operations Portal -> Data Import and Data Export.
- APIs/data:
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&action=available-dates`
  - `GET /manual-input/manual-security-ownership?ticker={ticker}&effectiveDate={YYYY-MM-DD}`
  - `POST /manual-input/import?ticker={ticker}&category=manual-security-ownership`
  - `GET /export/csv?dataset=manual-input&ticker={ticker}&category=manual-security-ownership`
  - `POST /manual-input/consolidate?ticker={ticker}`
- Reported problem and root cause:
  - The backend added the `manual-security-ownership` Manual Input V2 category
    and supplied a new template set, but the Operations Portal category lists,
    template generator, import verification, preview lookup, and export helper
    still represented the older contract.
  - This category partitions records by `effectiveDate`, not `tradeDate`, so it
    cannot safely reuse the existing daily-input path validation.
- Intended behavior and invariants:
  - Operators can select Manual security ownership, download the exact
    12-column template, upload a CSV, and inspect the newest available dated
    API payload.
  - Imports without an `effectiveDate` are blocked before submission.
  - Import verification requires one
    `manual-input/manual-security-ownership/{ticker}/{effectiveDate}/manual-security-ownership.json`
    output for every effective date in the CSV. Extra backend-generated CSV or
    available-date metadata files are allowed.
  - The page uses the available-dates action to resolve the latest raw payload
    when no just-imported date is available.
  - Manual consolidation remains a separate action. Its rebuild cutoff uses
    the earliest imported effective date and checks both ownership current and
    ownership history outputs.
  - Data Export offers the same category for edit-and-reimport compatibility.
  - The supplied manual template archive and the combined import-template
    archive now contain the same updated manual-input files.
- Files changed:
  - `app/operations/data-import/ManualDataImportClient.tsx`
  - `app/operations/data-export/DataExportClient.tsx`
  - `manual-input-template.zip`
  - `reference-data/import-templates/import-template.zip`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check and whitespace validation passed.
  - Both tracked archives were inspected and contain
    `manual-input-template/manual-security-ownership.csv` with the contract
    columns.
- Remaining backend dependency / limitation:
  - Consolidation remains asynchronous and has no job-status endpoint. The
    frontend can verify a subsequent ownership output change but cannot inspect
    the backend job itself.

## 2026-08-07 - Group Social Sentiment by actual post date

- Area: User Portal → Social Sentiment → Sentiment Timeline & Social Feed.
- APIs/data:
  - `GET /social-data?ticker={ticker}&date={YYYY-MM-DD}&sort=datetime&order=desc`
  - `GET /social-data?ticker={ticker}&platform={platform}&page=1&limit=100&sort=datetime&order=desc`
  - `GET /market-data/current?ticker={ticker}&category=sentiment-current`
  - `GET /market-data/history?ticker={ticker}&category=sentiment-events`
- User-reported problem and root cause:
  - The portal grouped and filtered social records by an assigned U.S. trading
    day. The teams decided that social sentiment must instead use each feed's
    actual posting date.
  - The frontend stored a separate `tradeDate`, rejected weekend and holiday
    filter dates, remapped posts into trading-day buckets, and could fall back
    to the date embedded in the S3 directory even when the source `datetime`
    represented a different calendar date.
- Intended behavior and invariants:
  - A record's canonical `postDate` comes from an explicit backend actual-date
    field when present, otherwise from its normalized source `datetime` in UTC.
    It never comes from `tradeDate`, `targetDate`, `calculatedTargetDate`,
    `bucketStart`, or an S3 folder date.
  - Timeline fallback buckets, date filters, and Development Data all use
    actual post date. Weekend and market-holiday dates are valid and remain
    separate calendar dates.
  - Feed cards show only the full posting timestamp in the timezone selected in
    Settings. They do not show a separate UTC post-date badge, which would be
    redundant and can display a different calendar day near midnight UTC.
  - The default feed range is seven calendar dates inclusive, ending on today
    in the timezone selected in Settings. Switching platforms retains that
    range instead of silently jumping to an older platform-specific fallback
    period. `See previous 7 days` extends the range by seven earlier dates.
  - The selected portal timezone continues to control the visible post time
    only; changing it does not move a feed to a different date container.
  - `sentiment-current` remains authoritative for Timeline totals and platform
    button counts in the selected 1D/1W/1M/6M/1Y range. `sentiment-events`
    remains a fallback for missing bucket breakdowns, and raw `/social-data`
    rows do not resize consolidated totals.
  - Newest sorting, request-race protection, deduplication, platform
    normalization, and existing paging behavior remain intact. `Oldest` is
    removed because the loaded range is not the complete archive; engagement,
    follower, and like sorts apply only to the currently loaded range.
  - A date-scoped `/social-data` response is authoritative. The frontend no
    longer rejects returned rows by deriving a second UTC calendar date, which
    previously hid valid records when the source/API date and UTC date crossed
    midnight.
- Files changed:
  - `app/monitor/[ticker]/sentiment/SentimentBrowserPage.tsx`
  - `app/monitor/[ticker]/sentiment/MentionFeedCards.tsx`
  - `app/monitor/[ticker]/sentiment/SentimentTimeline.tsx`
  - `lib/social-data-api.ts`
  - `lib/sentiment-buckets.ts`
  - `lib/portal-page-translations.ts`
  - `docs/SOCIAL_SENTIMENT_POST_DATE_RULES.md`
  - `docs/SOCIAL_SENTIMENT_TRADING_DAY_RULES.md` (removed)
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including static generation for all 29 pages.
  - Whitespace validation passed.
  - Browser inspection reached the local portal but the session required a new
    sign-in, so authenticated live-data visual verification was not available
    in that browser session.
- Remaining backend dependency / limitation:
  - `docs/INTEGRATION (7).md` still documents `GET /social-data?date=` as
    matching post date, S3 target-bucket date, or calculated target date. The
    frontend now trusts the backend date-scoped result; the contract should be
    updated to describe the backend team's current actual-post-date behavior
    and return an explicit canonical post-date field alongside `datetime`.

## 2026-08-07 - Separate global holding suggestions from per-user decisions

- Area: Operations Portal → Ownership Data; User Portal → Internal Float and
  Ownership.
- APIs/data:
  - `GET/POST/DELETE /manual-input/management-holdings?ticker={ticker}`
  - `GET/PUT /manual-input/internal-float-inputs-user?ticker={ticker}`
  - proposed user field `managementSuggestionDecisions.records`
- Reported problem and root cause:
  - Operations records could be published directly to Ownership, automatically
    merged into every user's Management / Strategic Holdings, or presented as
    suggestions.
  - Applying or discarding a suggestion sent a PUT to the ticker-wide
    management-holdings record, so the first user's decision changed the global
    status for every user.
- Intended behavior and invariants:
  - Operations now publishes management holding records only as ticker-wide
    Suggested Changes with `showInOwnership=false`,
    `showAsSuggestion=true`, and `autoApply=false`.
  - The Operations page no longer exposes destination switches, user workspace
    holdings, direct Ownership publication, direct Internal Float application,
    destination-copy actions, or the Ownership consolidation prompt.
  - Operations suggestions are never automatically merged into a user's
    holdings. Ownership and Internal Float continue to derive strategic
    holdings exclusively from authenticated user-scoped input.
  - Apply writes the changed holding and an `applied` decision through the
    user-scoped input endpoint. Discard writes only that user's `discarded`
    decision. Neither action updates the global suggestion record.
  - Decisions are keyed by source ID and version, so a revised Operations
    recommendation can be reviewed again.
  - The UI removes a suggestion only after the user-input API echoes the saved
    decision. A backend that silently drops the field produces a visible error
    instead of a false success.
  - Existing holding edits preserve the user's decision array. Existing
    consolidation prompts after a user's holding change remain intact.
- Files changed:
  - `app/operations/ownership/ManagementHoldingsOperationsClient.tsx`
  - `app/globals.css`
  - `app/portal-theme.css`
  - `app/monitor/[ticker]/internal-float/InternalFloatClient.tsx`
  - `app/monitor/[ticker]/internal-float/InternalFloatRoleView.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `lib/internal-float-types.ts`
  - `lib/internal-float-holdings.ts`
  - `lib/operations/ownership-entry.js`
  - `lib/operations/ownership-entry.test.mjs`
  - `lib/portal-page-translations.ts`
  - `docs/api/USER_SCOPED_MANAGEMENT_SUGGESTION_DECISIONS.md`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Ownership helper tests passed, including the new suggestion-only holder
    history case.
  - Production build passed, including static generation for all 29 pages.
  - Whitespace validation passed.
  - Browser inspection of the local Operations Ownership page confirmed the
    fixed Suggested Change publication note and single records table are
    present, while the destination switches and direct-apply tabs are absent.
    The browser session was not authenticated, so live API persistence could
    not be exercised there.
- Remaining backend dependency / limitation:
  - `docs/INTEGRATION (7).md` does not yet document or guarantee persistence of
    `managementSuggestionDecisions`. The live Apply/Discard action will remain
    visible and report a clear error until the user-input API stores and echoes
    that field. Atomic persistence of the holding and decision should be
    implemented server-side.

## 2026-08-10 - Fast in-app HTML report viewer

- Area: User Portal -> Report Archive.
- APIs/data:
  - `GET /market-data/reports?ticker={ticker}&date={YYYY-MM-DD}`
  - existing daily report data composition and AI report API remain unchanged.
- Reported problem and root cause:
  - `View PDF` generated the entire PDF before opening a new browser tab. The
    report therefore appeared unresponsive while client-side PDF generation
    and font/image processing completed.
- Intended behavior and invariants:
  - `View Report` opens an in-app viewer immediately and shows a loading state
    while the selected report data is fetched.
  - The viewer renders the existing daily-close report template as responsive
    HTML. It keeps the report's content, visual hierarchy, and light document
    styling while adapting page dimensions, grids, tables, and cover content
    for desktop and mobile screens.
  - A `Download PDF` action is always available in the viewer toolbar. PDF
    generation starts only when that action is selected.
  - The viewer's PDF download reuses the exact report-data snapshot already
    displayed. A separate archive View or Download action still fetches fresh
    API data, preserving the accepted no-stale-report behavior.
  - The A4 print/PDF rules and generated PDF filename remain unchanged.
  - Report Archive action labels are `View Report` and `Download PDF`; pending
    report states remain non-interactive.
- Files changed:
  - `app/monitor/[ticker]/reports/ReportArchiveCenter.tsx`
  - `app/monitor/[ticker]/reports/ReportHtmlViewer.tsx`
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `public/report-templates/daily-close/render.js`
  - `public/report-templates/daily-close/styles.css`
  - `public/report-templates/daily-close/template.html`
  - `Report Templates/lean-daily-market-close-report/render.js`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including static generation for all 29 pages.
  - Whitespace validation passed.
  - Browser inspection confirmed the archive uses the new action labels, the
    viewer opens immediately, the top PDF action is present, and the report
    template renders without horizontal overflow at desktop and 390px mobile
    widths.
  - The browser console contained no warnings or errors during these checks.
- Remaining backend dependency / limitation:
  - Initial HTML content still depends on the report-data APIs responding. PDF
    generation remains client-side and can take several seconds, but it is now
    isolated to the explicit download workflow instead of blocking report
    viewing.

## 2026-08-10 - Improve HTML report reading size

- Area: User Portal -> Report Archive -> in-app report viewer.
- APIs/data: no API or report-data contract changes.
- Reported problem and root cause:
  - The first responsive report viewer retained the compact type scale required
    by the A4 PDF, making supporting labels, analysis, tables, and chart text
    unnecessarily small on screen.
- Intended behavior and invariants:
  - HTML report mode uses a larger, proportional screen-reading type scale for
    headings, metrics, deltas, chart labels, analysis, sentiment details,
    tables, and footnotes.
  - A4 PDF typography and page layout remain unchanged.
  - Desktop and mobile HTML layouts remain responsive without horizontal page
    overflow.
- Files changed:
  - `app/monitor/[ticker]/reports/client-report-pdf.ts`
  - `public/report-templates/daily-close/styles.css`
  - `public/report-templates/daily-close/template.html`
  - `Report Templates/lean-daily-market-close-report/styles.css`
  - `Report Templates/lean-daily-market-close-report/template.html`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - Browser inspection confirmed the larger hierarchy on the cover and report
    content pages at desktop width and at a 390px mobile width.
  - Browser console contained no warnings or errors.
  - Public and source report styles remain identical.
- Remaining backend dependency / limitation: none.

## 2026-08-11 - Add Institutional Activity Summary to Ownership

- Area: User Portal -> Ownership.
- APIs/data:
  - `GET /market-data/current?ticker={ticker}&category=ownership-summary-current`
- Reported problem and root cause:
  - The backend exposed the institutional activity summary dataset, but the
    Ownership page did not fetch or present it.
  - The first presentation pass assumed the business fields always lived at
    `response.summary`; API wrapper variants therefore rendered all metrics as
    `N/A` even when `ownership-summary-current` contained valid values.
  - The live development response can also expose summary metrics as flattened
    field paths or field/value records. The summary date remained visible from
    root metadata while those metric representations were not resolved.
  - The deployed schema uses semantic camel-case names such as
    `summary.buyer`, `summary.seller`, `summary.unchangedOwner`, and
    `summary.netSharesChanged`; these are not normalized spellings of the
    earlier `IO_Summary_*` keys and therefore require explicit aliases.
  - Options exposure uses a separate live camel-case family:
    `summary.oeShares`, `summary.oeSharesIndex`, `summary.oeCount`,
    `summary.oeValue`, `summary.oeLargestHolder`,
    `summary.oeLargestHolderTag`, `summary.oeHolderPutCallRatio`, and
    `summary.oeHolderPutCallRatioSentiment`.
  - The extractor also excluded `_field_provenance` paths, despite the live
    contract allowing business values inside provenance wrappers; this left
    every card empty when the direct summary representation was absent.
  - Filing Freshness was derived from a separate filing dataset even though it
    is not supplied by the requested summary JSON and was not wanted.
- Intended behavior and invariants:
  - Institutional Activity Summary appears immediately below Ownership
    Structure and Institution Holdings Breakdown.
  - The summary shows ownership flow, new and exited positions,
    concentration, source composition, and reported options exposure.
  - Filing Freshness is not rendered or inferred.
  - The frontend resolves each `IO_Summary_*` field independently across the
    complete documented response or API envelope, including nested objects,
    arrays, JSON-encoded `body` values, flattened paths such as
    `summary.IO_Summary_Buy.value`, and `{ field, value }` records.
    Field-provenance wrappers using `value`, `currentValue`, `rawValue`, or
    `amount` are unwrapped without introducing fallback data. Direct summary
    values take priority, with provenance values used only when the same field
    is not present directly in this API response.
  - Live camel-case fields are the primary UI mappings. The supplied
    `IO_Summary_*` sample keys remain accepted as backward-compatible aliases.
  - Reported-value fields retain the API's `$1000` unit and are divided by
    1,000 for display, matching the ownership filing presentation.
  - Options Exposure maps the backend's aggregate fields directly:
    `IO_Summary_OE_count`, `IO_Summary_OE_shares`,
    `IO_Summary_OE_shares_index`, `IO_Summary_OE_value`,
    `IO_Summary_OE_largest_holder`, `IO_Summary_OE_largest_holder_tag`,
    `IO_Summary_OE_holder_Put_Call_Ratio`, and
    `IO_Summary_OE_holder_Put_Call_Ratio_Sentiment`.
  - These eight options-exposure fields are read directly from the API's
    `summary` object before any normalized alias lookup, preventing semantic
    camel-case mappings from obscuring the backend's retained `IO_Summary_OE_*`
    field names.
  - Missing values render explicitly instead of using local fallback data.
  - A missing summary response does not prevent the existing Ownership page,
    strategic entities, or filing tables from loading.
  - The existing `positionStatus` row highlighting remains intact and the
    Position Status column remains hidden.
  - Development mode exposes the raw summary response in a separate API tab.
- Files changed:
  - `app/monitor/[ticker]/institutional/InstitutionalActivitySummary.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalBrowserPage.tsx`
  - `app/monitor/[ticker]/institutional/InstitutionalDevTables.tsx`
  - `components/TickerDataStatusProvider.tsx`
  - `lib/current-data-sources.ts`
  - `lib/portal-page-translations.ts`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including all 29 statically generated pages.
  - Whitespace validation passed.
  - The supplied `ownership-summary-current.json` was checked against every
    visible summary and options-exposure field mapping.
  - Authenticated visual inspection could not be completed because the
    isolated browser session redirected to sign-in.
- Remaining backend dependency / limitation:
  - Schema version 1 supplies one aggregate options-exposure set, which is
    displayed under Calls; Puts remain zero unless future put-specific fields
    are returned.

## 2026-08-20 - Stabilize Operations Market Data loading across session refresh

- Area: Operations Portal -> Market Data, plus shared authenticated API access.
- APIs/data:
  - `GET /market-data/history?ticker={ticker}&category=market-history`
  - `GET /manual-input/issued-share?ticker={ticker}`
  - `GET /manual-input/utilization?ticker={ticker}`
  - `GET /manual-input/manual-availability?ticker={ticker}`
  - `GET /manual-input/margins?ticker={ticker}`
  - `GET /manual-input/short-score?ticker={ticker}`
  - Cognito OAuth refresh-token exchange.
- Reported problem and root cause:
  - Market Data could intermittently show zero saved dates and no records until
    the operator logged out and back in.
  - The page requests six large history datasets together. When the ID token
    expired, those requests could independently start concurrent Cognito token
    refreshes. A transient API failure was then converted into a null payload,
    and the initial loader treated the null payload as a successful empty
    dataset.
  - The page also cleared the last valid rows before replacement responses had
    arrived, so a temporary request failure looked identical to a legitimate
    empty account.
- Intended behavior and invariants:
  - Authenticated requests refresh an ID token shortly before expiry rather
    than waiting for the first failed API request.
  - All simultaneous authenticated requests share one in-flight Cognito refresh
    operation. A `401` is retried once with the newest available ID token.
  - Transient network, rate-limit, timeout, and `5xx` Market Data reads are
    retried once.
  - A failed initial load or manual Refresh preserves the last valid rows for
    the same ticker and displays an explicit retry message. Development Data
    retains the exact endpoint-level error instead of presenting the failure as
    a valid zero-record response.
  - Switching companies never retains rows from the previous ticker.
  - A successful empty API response still renders as a genuine empty dataset.
  - Save, edit, delete, ticker routing, and consolidation behavior are unchanged.
- Files changed:
  - `lib/auth-client.ts`
  - `app/operations/market-data/MarketDataOperationsClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including all 29 statically generated pages.
  - Local Market Data route rendered on the restarted development server with
    no browser console errors. The isolated verification tab had no operator
    session, so live authenticated history responses were not modified or
    exercised.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - The documented manual-input list endpoints do not provide pagination or a
    date-range parameter, so the frontend still has to request each category's
    complete history. Backend pagination or a combined Market Data history
    endpoint would further reduce payload size and peak loading time.

## 2026-08-25 - Expose Report Archive API composition in Development Data

- Area: User Portal -> Report Archive -> Development Data.
- APIs/data:
  - `GET /market-data/reports?ticker={ticker}&limit=100&page=1`
  - `GET /market-data/reports?ticker={ticker}&date={YYYY-MM-DD}`
  - `GET /market-data/ai-report?ticker={ticker}&date={YYYY-MM-DD}`
  - `GET /market-data/current?ticker={ticker}&category=sentiment-current`
- Reported problem and root cause:
  - Report Archive did not expose a Development Data section, making it hard
    to distinguish the primary dated report response from the separate AI
    Analysis request and the date-gated sentiment fallback.
  - The dated report API supplies most report content, but the current frontend
    report composition is not a single-request flow.
- Intended behavior and invariants:
  - Dev Mode displays an API map and separate, uncombined response tabs for the
    archive index, selected dated report, AI Analysis, and sentiment fallback.
  - Developers can select any available report date and inspect the exact raw
    response fields returned for that date.
  - The panel loads report-detail APIs only while Dev Mode is enabled, avoiding
    extra report requests for normal users.
  - Existing View Report, Download PDF, report pagination, and report data
    normalization behavior remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/reports/ReportArchiveDevTables.tsx`
  - `app/monitor/[ticker]/reports/ReportArchiveBrowserPage.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including all 29 statically generated pages.
- Remaining backend dependency / limitation:
  - Historical sentiment still requires the dated report API to persist a
    complete seven-day sentiment block. The live `sentiment-current` fallback
    is intentionally accepted only when its period end matches the selected
    report date.

## 2026-08-25 - Simplify Report Archive copy and hierarchy

- Area: User Portal -> Report Archive.
- API: Existing report index and dated report APIs; no contract change.
- Reported problem and root cause:
  - Repeated cadence descriptions, report explanations, and market-close labels
    made the archive slower to scan without adding useful decision context.
  - Weekly and monthly placeholders repeated the same problem with descriptive
    preview cards.
- Intended behavior and invariants:
  - Keep report frequency names, useful dates, availability, report titles,
    pagination, and report actions.
  - Remove cadence subtitles, repeated daily-report explanations, repeated
    market-close labels, and verbose coming-soon previews.
  - Reduce cadence-tab and coming-soon placeholder height to match the simpler
    content hierarchy.
  - Report availability, View Report, Download PDF, archive filtering, and the
    Development Data panel remain unchanged.
- Files changed:
  - `app/monitor/[ticker]/reports/ReportArchiveCenter.tsx`
  - `app/globals.css`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Confirmed the removed copy no longer exists in the Report Archive source or
    styles.
- Remaining backend dependency / limitation:
  - Report dates and availability remain determined by the report index API.

## 2026-08-26 - Add historical initialization availability status

- Area: Operations Portal -> Company Management -> Initialize History.
- APIs/data:
  - `GET /tickers/historical-init/status?ticker={ticker}`
  - Existing `POST /tickers/historical-init`
- Reported problem and root cause:
  - Historical initialization ran asynchronously, but the operations screen
    did not inspect the backend lock status before allowing another request.
  - The previous static `live run` label did not indicate whether a ticker was
    available or already being initialized.
- Intended behavior and invariants:
  - Selecting or entering a valid ticker checks its historical initialization
    status without caching the response.
  - `AVAILABLE` is presented as `Ready to initialize`; it is not described as
    successful completion because the endpoint only reports lock availability.
  - `IN_PROGRESS` shows the returned lock age, disables the start button, and
    refreshes every 15 seconds while the browser tab is visible.
  - A successful initialization request immediately enters the running state
    and confirms it against the status endpoint. A failed or conflicting POST
    also refreshes status so an existing backend lock is reflected in the UI.
  - Operators can manually refresh status, and Development Data exposes the
    raw GET response separately from the initialization POST response.
  - Ticker registry editing, initialization date/vendor validation, workspace
    navigation, and consolidation behavior remain unchanged.
- Files changed:
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Production build passed, including all 29 statically generated pages.
- Remaining backend dependency / limitation:
  - The endpoint reports only an active lock younger than 15 minutes. An
    `AVAILABLE` response can mean no run, a finished run, or a stale lock; it
    does not expose worker completion or failure details.

## 2026-08-26 - Separate history initialization and consolidation feedback

- Area: Operations Portal -> Company Management -> Initialize History.
- APIs/data:
  - `POST /tickers/historical-init`
  - `GET /tickers/historical-init/status?ticker={ticker}`
  - Existing `POST /manual-input/consolidate?ticker={ticker}`
- Reported problem and root cause:
  - Starting historical initialization displayed both its accepted message and
    an old consolidation result, incorrectly implying that initialization had
    also run consolidation.
  - Both workflows retained and rendered their previous feedback independently.
- Intended behavior and invariants:
  - Starting historical initialization clears stale consolidation feedback.
  - Starting consolidation clears stale historical-request feedback, so only
    the operation currently being performed is described below the controls.
  - Consolidation cannot be started while the historical initialization status
    is `IN_PROGRESS`.
  - Historical initialization and consolidation remain separate API actions;
    initialization does not trigger consolidation automatically.
- Files changed:
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - The historical status API still reports lock availability rather than
    worker completion, so consolidation becomes available when the lock is no
    longer active rather than from an explicit successful-completion state.

## 2026-08-26 - Add consolidation pipeline availability status

- Area: Operations Portal -> Company Management -> Initialize History.
- APIs/data:
  - `GET /manual-input/consolidate/status?ticker={ticker}`
  - Existing `POST /manual-input/consolidate?ticker={ticker}`
  - Existing `GET /tickers/historical-init/status?ticker={ticker}`
- Reported problem and root cause:
  - Consolidation feedback previously inferred completion by comparing market
    payloads for up to five minutes after the POST request.
  - That inference was slow and ambiguous when a valid consolidation produced
    no visible payload change, and it could leave operators with stale status
    messages after switching tickers.
- Intended behavior and invariants:
  - Selecting a valid ticker loads historical-initialization and consolidation
    status as separate, uncached API requests.
  - The page displays distinct History and Consolidation status badges so the
    two asynchronous workflows cannot be mistaken for each other.
  - An active consolidation is polled every 15 seconds while the browser tab is
    visible, and duplicate or conflicting pipeline actions are disabled.
  - A consolidation POST is followed by the status endpoint instead of waiting
    five minutes for inferred market-payload changes.
  - Changing ticker clears prior request messages and status payloads before
    checking the newly selected company.
  - Development Data exposes the raw consolidation status response separately
    from the consolidation request response.
  - Ticker registry editing and historical initialization inputs remain
    unchanged.
- Files changed:
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
  - Production build passed, including all 29 statically generated pages.
- Remaining backend dependency / limitation:
  - `AVAILABLE` means that no active consolidation lock exists. It does not
    confirm that the worker succeeded or that every consolidated output changed;
    affected portal data must still be refreshed to confirm the resulting data.

## 2026-08-26 - Require historical initialization before consolidation

- Area: Operations Portal -> Company Management -> Initialize History.
- APIs/data:
  - `POST /tickers/historical-init`
  - `POST /manual-input/consolidate?ticker={ticker}`
  - Existing historical-initialization and consolidation status APIs.
- Reported problem and root cause:
  - The Run Consolidation control became available from pipeline lock status
    alone, even when the operator had not started historical initialization for
    the selected ticker during the current workflow.
- Intended behavior and invariants:
  - Run Consolidation is disabled and visually dimmed until a historical
    initialization request is accepted for the currently selected ticker.
  - The prerequisite is reset when the operator switches to another ticker.
  - Consolidation remains disabled while historical initialization or another
    consolidation is active.
  - The consolidation action independently enforces the same prerequisite so
    stale or programmatic UI actions cannot bypass it.
  - Ticker registry management, date/vendor validation, and pipeline status
    polling remain unchanged.
- Files changed:
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - The prerequisite is tracked for the current browser session because the
    status API reports only lock availability, not whether a ticker has ever
    completed historical initialization.

## 2026-08-26 - Clarify consolidation status feedback

- Area: Operations Portal -> Company Management -> Initialize History.
- APIs/data:
  - `POST /manual-input/consolidate?ticker={ticker}`
  - `GET /manual-input/consolidate/status?ticker={ticker}`
- Reported problem and root cause:
  - The consolidation message still emphasized request acceptance and could be
    mistaken for either confirmed completion or a consolidation failure when
    only the follow-up status request was unavailable.
- Intended behavior and invariants:
  - `IN_PROGRESS` states that consolidation is running and that status updates
    automatically.
  - `AVAILABLE` states that consolidation is no longer running and asks the
    operator to refresh affected portal data to confirm the latest values.
  - A failed status request explicitly says the consolidation request was
    accepted but its current status could not be checked, and directs the
    operator to Refresh Status.
  - Request failures continue to display the original API error.
- Files changed:
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - `AVAILABLE` remains a lock-availability result rather than a verified worker
    success response.

## 2026-08-26 - Expose historical initialization status-check errors

- Area: Operations Portal -> Company Management -> Initialize History.
- APIs/data:
  - `POST /tickers/historical-init`
  - `GET /tickers/historical-init/status?ticker={ticker}`
- Reported problem and root cause:
  - History remained labelled `Unavailable` after an initialization request,
    but the generic badge did not explain that the GET status request had
    failed or expose its backend error.
- Intended behavior and invariants:
  - History continues to recognize only the documented `IN_PROGRESS` and
    `AVAILABLE` backend states.
  - A status-request failure is described separately from initialization
    acceptance or failure and includes the captured API error when available.
  - Accepted initialization displays running and no-longer-running feedback
    based on the status endpoint, with automatic polling unchanged.
  - Operators are directed to Refresh Status when the check is unavailable.
- Files changed:
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - The status endpoint reports lock availability only and cannot confirm the
    historical worker's success or failure.

## 2026-08-26 - Preserve accepted historical run during status-check failures

- Area: Operations Portal -> Company Management -> Initialize History.
- APIs/data:
  - `POST /tickers/historical-init`
  - `GET /tickers/historical-init/status?ticker={ticker}`
- Reported problem and root cause:
  - Immediately after a successful initialization POST, the frontend set the
    optimistic state to `IN_PROGRESS` and then performed a status GET.
  - When that GET failed, it replaced the accepted running state with
    `Unavailable` and stopped the 15-second polling loop.
- Intended behavior and invariants:
  - A successfully accepted initialization remains visibly running when a
    subsequent status check temporarily fails.
  - The page displays the status-check error as a warning and continues retrying
    every 15 seconds while the tab is visible.
  - A later successful status response clears the warning and updates the lock
    state normally.
  - Initial status checks for runs not started in the current workflow can still
    show `Unavailable` when the endpoint fails.
  - Manual Refresh Status preserves an accepted active run instead of stopping
    its polling after a transient error.
- Files changed:
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - If the status endpoint remains unavailable, the frontend cannot determine
    when the accepted backend job stops; it continues showing the accepted run
    with an explicit status-check warning.

## 2026-08-26 - Automate both pipeline status checks

- Area: Operations Portal -> Company Management -> Initialize History.
- APIs/data:
  - `GET /tickers/historical-init/status?ticker={ticker}`
  - `GET /manual-input/consolidate/status?ticker={ticker}`
  - Existing historical initialization and consolidation POST actions.
- Reported problem and root cause:
  - A manual Refresh Status button duplicated the automatic 15-second polling
    behavior and consolidation did not preserve an accepted run when its first
    follow-up status request failed.
- Intended behavior and invariants:
  - Remove the manual Refresh Status control.
  - History and consolidation both retry status every 15 seconds while active,
    and also retry automatically from an unavailable status.
  - A temporary status-check failure after an accepted POST preserves the
    optimistic running state, displays the API error, and keeps polling.
  - A later successful status response clears the warning and updates the
    displayed pipeline state.
  - Run Consolidation remains disabled while its lock status is unavailable so
    an operator cannot accidentally submit a duplicate job.
  - Historical initialization remains available after an initial status-check
    failure because the backend POST remains the authoritative request guard.
- Files changed:
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - Neither status endpoint reports final worker success or failure; both expose
    only whether the corresponding lock is active.

## 2026-08-26 - Keep idle pipeline status failures non-intrusive

- Area: Operations Portal -> Company Management -> Initialize History.
- APIs/data:
  - `GET /tickers/historical-init/status?ticker={ticker}`
  - `GET /manual-input/consolidate/status?ticker={ticker}`
- Reported problem and root cause:
  - Entering a ticker triggered the automatic background status requests, and a
    backend `403` response immediately rendered its full authorization text as a
    large form error even though the operator had not submitted any action.
- Intended behavior and invariants:
  - Background status failures before an operator action remain visible as
    neutral availability labels and in Development Data, without injecting a
    detailed error paragraph into the form.
  - Status badges become error-styled and detailed feedback appears only after
    an initialization or consolidation action makes the failure actionable.
  - Automatic 15-second retries remain unchanged.
- Files changed:
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - The captured `403` says the authorization header is being interpreted as an
    AWS Signature Version 4 header. The backend status routes must accept the
    documented Cognito ID token for status checks to succeed.

## 2026-08-26 - Stop indefinite optimistic pipeline running states

- Area: Operations Portal -> Company Management -> Initialize History.
- APIs/data:
  - `POST /tickers/historical-init`
  - `GET /tickers/historical-init/status?ticker={ticker}`
  - `POST /manual-input/consolidate?ticker={ticker}`
  - `GET /manual-input/consolidate/status?ticker={ticker}`
- Reported problem and root cause:
  - An accepted initialization request was kept in the optimistic `Running`
    state when every follow-up status request failed, so the interface could
    appear to run forever without confirmation from the backend.
- Intended behavior and invariants:
  - An accepted POST shows `Running` only until the first status response.
  - A failed status request changes the corresponding badge to `Unavailable`
    and explains that the request was accepted but its current state cannot be
    confirmed.
  - The page continues retrying an unavailable status every 15 seconds while
    visible, and a later successful response restores `Running` or `Ready`.
  - While an accepted history job has an unknown status, both duplicate
    initialization and consolidation are disabled.
  - Consolidation follows the same unavailable-and-retry behavior.
- Files changed:
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - The frontend cannot determine whether an asynchronous job completed until
    its documented status GET becomes reachable and returns `IN_PROGRESS` or
    `AVAILABLE`.

## 2026-08-27 - Show history status for every managed company

- Area: Operations Portal -> Company Management -> Initialize History.
- APIs/data:
  - `GET /tickers?includeDeleted=false&limit=100` across all result pages.
  - `GET /tickers/historical-init/status?ticker={ticker}` for each managed
    company.
  - Existing selected-company initialization and consolidation APIs remain
    unchanged.
- Reported problem and root cause:
  - The initialization panel only showed the selected company's history status,
    so operators could not see that another managed company's history job was
    still running or unavailable.
- Intended behavior and invariants:
  - Load every non-deleted managed company and show its history status in one
    compact board.
  - Prioritize running and unavailable companies before ready companies, with
    summary counts and a manual refresh command.
  - Refresh the board every 15 seconds while at least one company is running.
  - Isolate per-company request failures so one unavailable status never hides
    the remaining companies.
  - Refresh the board after company creation, editing, deletion, and historical
    initialization.
  - Preserve the selected-company initialization form, validation, status
    handling, and consolidation controls.
  - `Ready` continues to mean that no historical initialization lock is active;
    it does not prove that historical data is complete.
- Files changed:
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `app/globals.css`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - The API has no bulk history-status route, so the frontend must make one
    status request per managed ticker after listing the companies.
  - The status contract exposes only `IN_PROGRESS` or `AVAILABLE`, not a
    historical completeness result.

## 2026-08-27 - Limit the company history board to non-ready companies

- Area: Operations Portal -> Company Management -> Initialize History.
- APIs/data:
  - Existing all-company `GET /tickers` and per-company
    `GET /tickers/historical-init/status?ticker={ticker}` requests are unchanged.
- Reported problem and root cause:
  - Rendering ready companies as individual rows would make the history board
    increasingly long as more companies are added.
- Intended behavior and invariants:
  - Show rows only for companies whose status is running, unavailable, or not
    yet checked.
  - Keep ready companies represented in the compact summary count.
  - Show a clear all-ready message when no company requires attention.
  - Preserve all-company checking, polling, manual refresh, and the selected
    company's initialization and consolidation workflow.
- Files changed:
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - The frontend still needs one status request per managed ticker because the
    API does not expose a bulk status endpoint.

## 2026-08-27 - Enable consolidation when all company histories are ready

- Area: Operations Portal -> Company Management -> Initialize History.
- APIs/data:
  - `GET /tickers/historical-init/status?ticker={ticker}` for all managed
    companies.
  - `POST /manual-input/consolidate?ticker={ticker}`.
  - `GET /manual-input/consolidate/status?ticker={ticker}`.
- Reported problem and root cause:
  - Run Consolidation remained disabled unless historical initialization had
    been started for the selected ticker during the current browser session,
    even when every managed company already reported a ready history status.
- Intended behavior and invariants:
  - An all-ready company history board permits consolidation for a valid
    selected ticker without requiring a redundant initialization submission in
    the current session.
  - A selected ticker initialized during the current session can still proceed
    once its initialization is no longer running.
  - Active initialization, active consolidation, invalid ticker input, and an
    unavailable consolidation lock status continue to disable the command.
- Files changed:
  - `app/operations/tickers/TickerManagementOperationsClient.tsx`
  - `lib/portal-page-translations.ts`
  - `docs/CODEX_CHANGE_LOG.md`
- Verification:
  - TypeScript type-check passed.
  - Whitespace validation passed.
- Remaining backend dependency / limitation:
  - `AVAILABLE` confirms only that no active history lock exists; the backend
    does not expose a separate historical completeness result.
