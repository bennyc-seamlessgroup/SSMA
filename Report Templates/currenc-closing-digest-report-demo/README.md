# CURRENC Daily Close Post-Market Report

This folder contains the modular browser-rendered template for the daily post-market executive PDF.

The active structure is:

```text
template.html
styles.css
report-data.json
render.js
```

Backend can replace `report-data.json` every day without touching the report layout.

## Active Files

- `template.html`
  - The HTML shell.
  - Loads `styles.css`, `render.js`, and indirectly `report-data.json`.

- `styles.css`
  - All print/PDF styling.
  - Uses A4 page sizing and fixed page sections for Playwright PDF export.

- `report-data.json`
  - The replaceable daily report data file.
  - Backend should generate this file after market close.
  - Data contract is documented in `REPORT_DATA_CONTRACT.md`.

- `render.js`
  - Browser-side renderer.
  - Fetches `report-data.json` and renders the full report into `template.html`.
  - Does display formatting and SVG chart rendering only.
  - Should not contain business/risk calculations.

- `generate-portal-backed-pdf.js`
  - Playwright exporter.
  - Starts a local static server, opens `template.html`, waits for `window.__REPORT_READY__`, and exports the final A4 PDF.

- `build-report-data.js`
  - Prototype-only helper.
  - Reads the current local portal `import_data` files and writes sample `report-data.json`.
  - Backend does not need to use this script in production if it can generate `report-data.json` directly.

- `currenc-post-market-portal-backed-report-playwright.pdf`
  - Current sample PDF output for visual review.

- `DAILY_REPORT_RULES.md`
  - Deterministic rules for Top Daily Alerts, Management Watch Items, Tomorrow Watchlist, and SEC filing display.

- `REPORT_DATA_CONTRACT.md`
  - Exact JSON contract for `report-data.json`.

- `old-files/`
  - Legacy static demo and old scaffold files.
  - Reference only. Not part of the active report generation pipeline.

## Backend Setup

Install dependencies:

```bash
npm install
npx playwright install chromium
```

For Linux servers, Playwright may also need OS dependencies:

```bash
npx playwright install --with-deps chromium
```

The repo includes Playwright as a dev dependency.

## Local Prototype Generation

For local prototype data only:

```bash
node "Report Templates/currenc-closing-digest-report-demo/build-report-data.js"
```

This writes:

```text
Report Templates/currenc-closing-digest-report-demo/report-data.json
```

Then export the PDF:

```bash
node "Report Templates/currenc-closing-digest-report-demo/generate-portal-backed-pdf.js"
```

Output:

```text
Report Templates/currenc-closing-digest-report-demo/currenc-post-market-portal-backed-report-playwright.pdf
```

## Production Backend Workflow

Recommended daily job:

1. Trigger after market close, for example 7:00 PM ET.
2. Read latest daily market, borrow, short interest, social, and SEC filing data.
3. Calculate all derived values and deterministic alerts in backend.
4. Generate `report-data.json` following `REPORT_DATA_CONTRACT.md`.
5. Serve `template.html`, `styles.css`, `render.js`, and `report-data.json` together.
6. Use Playwright to open `template.html`.
7. Wait until `window.__REPORT_READY__ === true`.
8. Export PDF with:
   - `format: "A4"`
   - `printBackground: true`
   - `preferCSSPageSize: true`
   - zero margins
9. Upload the PDF to report storage.
10. Save report metadata:
   - ticker
   - report date
   - generated time
   - PDF URL
   - source data version/hash

## Responsibility Split

Backend should own:

- all API/data fetching
- all calculations
- all threshold triggers
- all alert ranking
- all LLM-generated sections once LLM is implemented
- final `report-data.json`

Template should own:

- visual layout
- print styling
- chart SVG rendering from supplied arrays
- rendering text supplied by backend

## Daily Report Scope

This is a daily close market report. Keep the PDF focused on:

- daily price movement
- borrow fee
- shortable shares
- trade volume
- utilization
- days to cover
- short interest / float
- social narrative record counts
- latest SEC filings
- tomorrow watchlist

Do not include quarterly ownership sections, manually maintained float inputs, or long-term ownership breakdowns in the core daily report. Those belong in a separate ownership/float report or periodic appendix.

## Source Disclosure Rule

Do not disclose third-party data-provider names in the user-facing report.

Allowed wording:

- daily market data
- short interest data
- borrow market data
- filing data
- social feed data

Provider/source metadata may be stored internally in backend logs or report metadata, but not rendered in the PDF.

## LLM Sections

The following sections currently display `PENDING FOR LLM INTEGRATION`:

- Executive Summary
- Borrow / Short Interpretation
- Narrative Summary
- Management Action Queue

Backend should replace those placeholders only after the LLM summarization pipeline is implemented.

## Important Docs

For backend implementation, read these files together:

```text
README.md
REPORT_DATA_CONTRACT.md
DAILY_REPORT_RULES.md
template.html
styles.css
render.js
report-data.json
```
