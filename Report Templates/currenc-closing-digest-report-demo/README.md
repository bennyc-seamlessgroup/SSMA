# CURRENC Daily Market Close Report - Lean V1

This folder contains the active browser-rendered daily-close report. Lean V1 deliberately uses only information currently available through implemented portal APIs.

When a signed-in user opens or downloads a report, the portal composes a fresh payload from the authenticated market, sentiment, SEC filing, and AI-report APIs. `report-data.json` remains a standalone sample and backend contract fixture; it is not used as live portal fallback data.

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
2. Eight daily closing KPIs, Short Interest Score, and AI Analysis
3. Seven-day short and lending trends
4. One-day social sentiment overview and latest SEC filings

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

1. Fetch the dated market snapshot from `GET /market-data/current?category=market-current` and its prior daily record from `GET /market-data/history?category=market-history`.
2. Calculate the eight KPI comparisons against the immediately preceding trading-day record.
3. Read Short Interest Score from consolidated market data and AI Analysis from `GET /market-data/ai-report` using `short_interest_current_interpretation`.
4. Build each report chart from the latest seven valid daily observations returned by `GET /market-data/history?category=market-history`.
5. Add the one-day sentiment overview from `GET /market-data/current?category=sentiment-current` and `GET /social-data`.
6. Add latest SEC filing records from `GET /manual-input/sec-filings`.
7. Populate only verified values. Do not substitute zero for missing observations.
8. Validate against `REPORT_DATA_CONTRACT.md`.
9. Store or return the immutable dated payload.
10. Let the browser renderer produce the PDF on demand.

The long-term backend target remains one complete dated payload from `GET /market-data/reports?ticker={ticker}&date={YYYY-MM-DD}` so the frontend does not need to compose multiple APIs during PDF generation.
