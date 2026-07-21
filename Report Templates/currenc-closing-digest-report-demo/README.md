# CURRENC Daily Market Close Report - Lean V1

This folder contains the active browser-rendered daily-close report. Lean V1 deliberately uses only information currently available through implemented portal APIs.

## Active Files

```text
template.html
styles.css
render.js
report-data.json
generate-portal-backed-pdf.js
REPORT_DATA_CONTRACT.md
```

- `template.html` is the fixed browser shell.
- `styles.css` defines the four-page A4 layout.
- `render.js` formats supplied values and draws charts without business calculations.
- `report-data.json` is a replaceable sample payload.
- `generate-portal-backed-pdf.js` exports the sample with Playwright.
- `REPORT_DATA_CONTRACT.md` defines the lean backend payload.

## Report Structure

1. Cover
2. Key closing signals and current risk classifications
3. Short and lending trends
4. Social sentiment and latest SEC filings

The active report excludes market context, readiness scoring, material-event interpretation, next-session forecasts, rule-generated watchlists, and AI sections until reliable report fields are available.

## Archived Comprehensive Version

The previous seven-page comprehensive v2 report is preserved at:

```text
Report Templates/archive/comprehensive-daily-close-v2/
```

That archive includes its original renderer, styles, payload contract, AI field proposal, rules, and sample data.

## Generate the PDF

```bash
node "Report Templates/currenc-closing-digest-report-demo/generate-portal-backed-pdf.js"
```

Output:

```text
output/pdf/currenc-daily-market-close-report-lean-v1.pdf
```

## Backend Workflow

1. Fetch the dated report snapshot from `GET /market-data/reports`.
2. Add historical series from `GET /market-data/history` when the report snapshot does not already include them.
3. Add social distribution and platform totals from the implemented social-data API.
4. Add latest SEC filing records from the implemented manual-input API.
5. Populate only verified values. Do not substitute zero for missing observations.
6. Validate against `REPORT_DATA_CONTRACT.md`.
7. Store or return the immutable dated payload.
8. Let the browser renderer produce the PDF on demand.

The long-term backend target remains one complete dated payload from `GET /market-data/reports?ticker={ticker}&date={YYYY-MM-DD}` so the frontend does not need to compose multiple APIs during PDF generation.
