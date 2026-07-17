# CURRENC Daily Market Close Report

This folder contains the active browser-rendered template for the management daily-close PDF.

## Active Files

```text
template.html
styles.css
render.js
report-data.json
generate-portal-backed-pdf.js
REPORT_DATA_CONTRACT.md
DAILY_REPORT_RULES.md
report-ai-data-points.csv
```

- `template.html` is the fixed HTML shell.
- `styles.css` defines A4 print layout and all report styling.
- `render.js` renders supplied values and SVG charts. It does not own business calculations.
- `report-data.json` is a replaceable sample payload following the v2 contract.
- `generate-portal-backed-pdf.js` exports the report with Playwright.
- `REPORT_DATA_CONTRACT.md` defines the complete backend payload.
- `DAILY_REPORT_RULES.md` defines deterministic alerts and watch thresholds.
- `report-ai-data-points.csv` lists the proposed AI outputs to add to the central data inventory.

## Report Structure

1. Cover and reporting scope
2. Executive close snapshot
3. Market performance and liquidity
4. Short interest and lending pressure
5. Social sentiment, filings, and material events
6. Next-session outlook and management priorities
7. Legal disclaimer

The report intentionally excludes routine quarterly ownership detail, private internal-float inputs, and long-form raw tables. Those remain in the portal. A material ownership or float event may appear only when a same-day change is detected.

## Local PDF Generation

Install browser support once:

```bash
npm install
npx playwright install chromium
```

On Linux servers:

```bash
npx playwright install --with-deps chromium
```

Generate the sample PDF:

```bash
node "Report Templates/currenc-closing-digest-report-demo/generate-portal-backed-pdf.js"
```

Output:

```text
Report Templates/currenc-closing-digest-report-demo/currenc-post-market-portal-backed-report-playwright.pdf
```

## Production Workflow

1. Trigger after the agreed market-data cutoff.
2. Read exact-date market, short, lending, social, filing, event, and approved manual-input records.
3. Apply backend calculations and deterministic alert rules.
4. Evaluate report data coverage. Keep missing fields explicit.
5. Generate all available rule-based sections.
6. Generate AI sections when the AI pipeline is enabled; otherwise keep `status: "pending"`.
7. Validate the payload against `REPORT_DATA_CONTRACT.md`.
8. Serve the four runtime files together: `template.html`, `styles.css`, `render.js`, and the generated `report-data.json`.
9. Open `template.html` with Playwright and wait for `window.__REPORT_READY__ === true`.
10. Export A4 PDF using `printBackground: true` and `preferCSSPageSize: true`.
11. Save the PDF or render it on demand from the immutable report-data snapshot.
12. Store ticker, report date, payload version/hash, generated time, model/prompt versions, and approval state.

## Responsibility Split

Backend owns:

- API and database reads
- current/prior-period selection
- calculations and score labels
- report readiness
- deterministic alert triggers and ranking
- AI prompts and generated output
- legal disclaimer injection
- final immutable report payload

Template owns:

- A4 page layout
- typography and visual hierarchy
- supplied-value formatting
- SVG chart rendering
- explicit pending and missing-data states

## Data and AI Rules

- Do not disclose vendor names in user-facing content.
- Do not use zero as a fallback for a missing observation.
- Do not silently carry forward stale values.
- AI analysis must distinguish verified events from speculation.
- AI analysis must cite supplied report evidence and state material uncertainty.
- AI analysis must not create unsupported price targets, trading instructions, or legal conclusions.
- Approved legal copy must come from the portal legal disclaimer module, never from an AI model.

Read these files together before backend implementation:

```text
README.md
REPORT_DATA_CONTRACT.md
DAILY_REPORT_RULES.md
report-ai-data-points.csv
template.html
styles.css
render.js
report-data.json
```
