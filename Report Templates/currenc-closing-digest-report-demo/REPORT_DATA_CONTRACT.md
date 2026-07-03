# Report Data Contract

The active report template reads one replaceable JSON file:

```text
report-data.json
```

## Legal disclaimer fields

The renderer expects these fields:

```json
{
  "legalDisclaimers": {
    "footer": "Short disclaimer rendered on every report page.",
    "full": "Full legal disclaimer rendered on the final report page."
  }
}
```

In the live portal renderer, these values are injected from
`lib/legal/disclaimers.ts`. Backend implementations must preserve this injection and
must not replace approved legal copy with generated or model-written text.

Backend should generate this file daily after market close. The template does not call APIs and does not calculate business logic. It only renders values already prepared by backend.

## Required Top-Level Shape

```json
{
  "reportVersion": "post-market-daily-close-v1",
  "company": "Currenc Group Inc.",
  "ticker": "CURR",
  "reportDate": "Jun 11, 2026",
  "generatedAt": "Jun 18, 2026, 12:05 PM GMT+8",
  "status": "Moderate Closing Risk",
  "kpis": [],
  "topDailyAlerts": [],
  "charts": [],
  "managementWatchItems": [],
  "social": {},
  "secFilings": [],
  "tomorrowWatchlist": [],
  "llmSections": {}
}
```

## `kpis`

Six KPI cards are expected.

```json
{
  "label": "Borrow Fee",
  "value": "31.20%",
  "delta": "-0.20 pts(-0.64%)"
}
```

Recommended KPI order:

1. Market Pressure
2. Borrow Fee
3. Shortable Shares
4. Utilization
5. Days to Cover
6. SI / Float

Backend should pre-format `value` and `delta` as display strings.

## `topDailyAlerts`

Show top 3 alerts only.

```json
{
  "id": "borrow_utilization_close",
  "text": "Borrow fee closed at 31.20% while utilization was 76.49%."
}
```

Trigger logic is defined in `DAILY_REPORT_RULES.md`.

## `charts`

The template expects six charts.

```json
{
  "id": "borrowFee",
  "title": "Borrow Fee Trend",
  "subtitle": "Daily borrow cost",
  "color": "#d84b42",
  "unit": "percent",
  "dates": ["2026-06-09", "2026-06-10", "2026-06-11"],
  "values": [31.5, 31.4, 31.2]
}
```

Supported `unit` values:

- `money`
- `percent`
- `shares`
- `volume`
- `days`
- `number`

Expected chart order:

1. Price Trend
2. Borrow Fee Trend
3. Shortable Shares Trend
4. Trade Volume Trend
5. Utilization Trend
6. Days to Cover Trend

Backend should provide enough daily history for the chart. Recommended:

```text
Minimum: 30 trading days
Preferred: 90 trading days
Maximum shown by template: latest 90 data points
```

## `managementWatchItems`

Show top 4 watch items only.

```json
{
  "id": "availability_watch",
  "text": "Any decline in available shares to borrow"
}
```

Trigger logic is defined in `DAILY_REPORT_RULES.md`.

## `social`

```json
{
  "redditCount": 357,
  "xCount": 2580,
  "total": 2937,
  "redditCountDisplay": "357",
  "xCountDisplay": "2,580",
  "totalDisplay": "2,937"
}
```

Display fields are used directly by the template.

## `secFilings`

Show latest 3 filings only.

```json
{
  "date": "23 May 2025",
  "formType": "LETTER",
  "title": "LETTER"
}
```

Rules:

- Sort by latest date descending.
- Include only `Date`, `Form`, and short `Title`.
- Do not include long excerpts in the PDF.
- Full filing history belongs in the portal page.

## `tomorrowWatchlist`

Show top 4 items only.

```json
{
  "id": "borrow_fee_watch",
  "text": "Watch borrow fee moving above 36.20%."
}
```

Threshold formulas are defined in `DAILY_REPORT_RULES.md`.

## `llmSections`

Sections requiring LLM generation should keep `status: "pending"` until the LLM pipeline is implemented.

```json
{
  "executiveSummary": {
    "status": "pending",
    "placeholder": "Daily close summary placeholder..."
  },
  "borrowShortInterpretation": {
    "status": "pending",
    "placeholder": "Placeholder interpretation..."
  },
  "narrativeSummary": {
    "status": "pending",
    "placeholder": "Placeholder narrative summary..."
  },
  "managementActionQueue": {
    "status": "pending",
    "placeholder": "Placeholder action queue..."
  }
}
```

When backend LLM is ready, replace placeholders with final text and set:

```json
{
  "status": "ready",
  "text": "Final generated analysis..."
}
```

The current `render.js` displays placeholder text. Backend can extend it to prefer `text` when `status` is `ready`.

## Source Disclosure

Do not include vendor/provider names in `report-data.json` fields that render in the PDF.

Allowed wording:

- daily market data
- borrow market data
- short interest data
- filing data
- social feed data

Not allowed in rendered user-facing fields:

- third-party provider names
- internal API endpoint names
- private S3 paths
- access keys or internal identifiers
