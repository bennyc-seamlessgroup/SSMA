# Codex Change Log and Behavior Memory

This file is the persistent implementation memory for changes made by Codex.
Read it before modifying existing portal behavior, and update it after every
completed change.

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
