# Lean Daily Market Close Report - Backend API Requirements

## 1. Purpose

This document defines the backend data contract required by the production
Lean Daily Market Close Report.

The target endpoint is:

```http
GET /market-data/reports?ticker=CURR&date=YYYY-MM-DD
Authorization: <Cognito ID token>
```

The endpoint must return one complete, report-ready payload. The frontend must
not need to call separate market, sentiment, filing, short-volume, FTD, or AI
APIs to render or download the report.

The current report template is located at:

```text
Report Templates/lean-daily-market-close-report/
```

The browser runtime copy is located at:

```text
public/report-templates/daily-close/
```

The current frontend composition logic, which this endpoint will replace, is:

```text
app/monitor/[ticker]/reports/daily-report-data.ts
```

## 2. Required Endpoint Behavior

### 2.1 Report index mode - preserve existing behavior

When `date` is omitted, keep the existing paginated report index:

```http
GET /market-data/reports?ticker=CURR&limit=100&page=1
```

Only dates with a successfully generated report file should appear in the
index. Pre-Market and Midday reports are not currently produced and must not be
added to this API response as fake records.

### 2.2 Detailed report mode - replace the current incomplete payload

When `date` is supplied, return the complete Lean V1 response specified in this
document:

```http
GET /market-data/reports?ticker=CURR&date=2026-08-03
```

The current example response documented in `docs/INTEGRATION (7).md` is not
sufficient. In particular, the current `marketSnapshot`, `ownershipSnapshot`,
`sentimentSnapshot`, and `riskSummary` example does not contain the complete
set of fields required by the PDF.

### 2.3 Report storage path

Store the shared dated report payload at:

```text
reports/{ticker}/{YYYY-MM-DD}/{ticker}_report_data.json
```

Example:

```text
reports/CURR/2026-08-03/CURR_report_data.json
```

The stored file must be a dated snapshot. It must not be rebuilt from current
files every time an old report is requested.

## 3. Authoritative Source Files

All paths below are relative to the centralized V2 S3 bucket unless stated
otherwise.

| Report content | API/category | Authoritative file path | Required source fields |
|---|---|---|---|
| Company identity | `GET /market-data/current?category=company-profile-current` | `current/{ticker}/company-profile-current.json` | `companyName`, `stockCode` or `ticker` |
| Daily market row, KPI values, KPI comparisons, OHLC, volume, and four market-history charts | `GET /market-data/history?category=market-history` | `history/{ticker}/market-history.json` | See Section 6 |
| Short Volume Trend | `GET /market-data/history?category=short-volume-history` | `history/{ticker}/short-volume-history.json` | `date`, `totalShortVolumeReported` |
| Fails-to-Deliver Trend | `GET /market-data/history?category=ftd-history` | `history/{ticker}/ftd-history.json` | `tradeDate`, `shares` |
| Previous-seven-day sentiment snapshot | `GET /market-data/current?category=sentiment-current` | `current/{ticker}/sentiment-current.json` | 7D total, score, previous-seven-day score, distribution, and platform breakdown |
| Historical sentiment rebuild support | `GET /market-data/history?category=sentiment-events` | `history/{ticker}/sentiment-events.json` | Event date/time, platform, and sentiment classification/score |
| Latest SEC filings as of report date | `GET /manual-input/sec-filings` | `manual-input/sec-filings/{ticker}/sec-filings.json` | `filingDate`, `formType`, `formDescription`, `accessionNumber`, `filingsUrl` |
| User-specific AI analysis | `GET /market-data/ai-report?ticker={ticker}&date={date}` | `ai-report/{ticker}/{date}/{user_sub}/ai-report-user.json` | `short_interest_current_interpretation` |
| Ticker-level AI fallback | Same AI endpoint fallback | `ai-report/{ticker}/{date}/ai-report-ticker.json` | `short_interest_current_interpretation` |
| Final shared report snapshot | Detailed reports API | `reports/{ticker}/{date}/{ticker}_report_data.json` | Complete payload from Section 9 |

### Important source rules

1. Do not merge manual-input market values into the report at request time.
   Issued shares, utilization, margins, shortable shares, Average Duration, and
   Short Score have already been consolidated into `market-history.json`.
2. Do not merge `sec-filings-history.json` and the manual SEC filing file. That
   can duplicate filings. Use `manual-input/sec-filings/{ticker}/sec-filings.json`
   as the report-generation source until the backend formally replaces it with
   one deduplicated canonical filing source.
3. `sentiment-current.json` is valid only when generating the report for its
   matching date. After generation, persist the seven-day result in the dated report
   file. Do not read the latest `sentiment-current.json` when opening an older
   report.
4. For historical report rebuilding, calculate the report-date seven-day sentiment
   window from `sentiment-events.json` if the matching dated sentiment snapshot
   is not already stored.
5. All source rows must have a date less than or equal to the requested report
   date. Never include future records in an archived report.

## 4. Date Selection and Immutability Rules

### 4.1 Requested report date

- `date` must use `YYYY-MM-DD`.
- It represents the report trading date, not the request date.
- The report index must contain only generated trading-date reports.
- A missing dated report returns `404`; do not silently substitute another
  date in detailed-report mode.

### 4.2 Market row

The primary market row is the `market-history` record whose `tradeDate` or
`date` exactly equals the report date.

If the generation pipeline is allowed to run before an exact market row exists,
it must fail the report generation rather than publish a report labelled with
the wrong date.

### 4.3 Previous observation

For each KPI, select the most recent earlier record with a non-null value for
that same field. Store the previous observation date in the output. This may be
the previous trading day or an earlier available date.

### 4.4 Immutability

Once generated, a dated report remains unchanged unless an authorized operator
explicitly requests regeneration for that ticker and date. Regeneration may
overwrite the same report file but must update `generatedAt` and source
provenance.

## 5. Normalization Rules

### 5.1 Null handling

- Missing values are `null` in raw numeric fields.
- Never convert missing data to `0`.
- Display fields use `N/A` when the raw value is null.
- Empty chart series use empty `dates` and `values` arrays.

### 5.2 Percentage values

The report output uses percentage points:

```text
29.15 means 29.15%
150.00 means 150.00%
```

If a source explicitly marks a value as a decimal ratio with
`valueFormat = decimal_ratio` and `displayFormat = percent`, multiply it by
100 exactly once. Do not infer scaling from the numeric size alone.

### 5.3 Numeric displays

- Prices: minimum 2 and maximum 4 decimal places with `$`.
- Percentages: maximum 2 decimal places with `%`.
- Days: maximum 2 decimal places with `d`.
- Share changes: whole shares with thousands separators.
- Trade volume: whole shares with thousands separators.
- Large chart values: compact `K`, `M`, or `B` display is allowed only in
  display fields; raw arrays remain numeric.

## 6. Market-History Field Mapping

Source file:

```text
history/{ticker}/market-history.json
```

| Report field | Source field | Notes |
|---|---|---|
| Open | `open` or `price.open` | Report-date row |
| High | `high` or `price.high` | Report-date row |
| Low | `low` or `price.low` | Report-date row |
| Close | `close` or `price.close` | Report-date row |
| Trade Volume | `tradeVolume` | Report-date row |
| Short Interest % | `shortInterestPercent` | Percentage points |
| Borrow Fee | `borrowFeePercent` | Percentage points |
| Initial Margin | `initialMargin` | Consolidated value selected by backend pipeline |
| Maintenance Margin | `maintenanceMargin` | Consolidated value selected by backend pipeline |
| Shortable Shares | `availableShares` | Consolidated total selected by backend pipeline |
| Utilization | `utilizationPercent` | Percentage points; optional for publication readiness but valid in report when present |
| Average Duration | `averageDurationDays` | Values less than or equal to zero are invalid/missing |
| Days to Cover | `daysToCover` | Days |
| Short Interest Score | `shortScore` | Float, 0 to 100, preserve 2 decimals |
| Borrow Fee Trend | `borrowFeePercent` | Latest 7 valid dated values on or before report date |
| Shortable Shares Trend | `availableShares` | Latest 7 valid dated values on or before report date |
| Utilization Trend | `utilizationPercent` | Latest 7 valid dated values on or before report date |
| Days to Cover Trend | `daysToCover` | Latest 7 valid dated values on or before report date |

## 7. KPI Comparison Formulas

For every KPI:

```text
numericChange = currentValue - previousValue
percentChange = numericChange / abs(previousValue) * 100
```

If `previousValue` is null or zero:

```text
percentChange = null
changePercent = "--"
```

### Units for `changeValue`

| KPI type | `changeValue` format |
|---|---|
| Percentage metric | Signed percentage-point change, for example `-2.05 pts` |
| Shares | Signed whole shares, for example `+8,000 shares` |
| Days | Signed day change, for example `-1.97d` |
| Score | Signed score change, for example `+2.00` |

### Tone rules

| KPI | Increase | Decrease |
|---|---|---|
| Short Interest %, Borrow Fee, Initial Margin, Maintenance Margin, Utilization, Average Duration, Days to Cover, Short Score | `negative` | `positive` |
| Shortable Shares | `positive` | `negative` |
| No change or no comparison | empty string | empty string |

The response must also include:

- `observationDate`
- `previousObservationDate`
- `comparisonLabel`

Recommended comparison label logic:

```text
If previousObservationDate is the prior market trading date: "vs previous trading day"
Otherwise: "vs MMM D, YYYY"
```

## 8. Chart Construction Rules

Every chart must contain exactly the latest seven valid daily observations on
or before the report date, or fewer when fewer valid observations exist.

Rules:

1. Filter out rows after the report date.
2. Filter out null values; retain legitimate zero values.
3. Sort ascending by date for chart rendering.
4. Take the last seven valid observations.
5. `dates[index]` and `values[index]` must refer to the same record.
6. Do not forward-fill or interpolate missing values.

| Chart key | Source path | Date field | Value field | Unit |
|---|---|---|---|---|
| `shortVolumeChart` | `history/{ticker}/short-volume-history.json` | `date` | `totalShortVolumeReported` | `shares` |
| `borrowFeeChart` | `history/{ticker}/market-history.json` | `tradeDate` or `date` | `borrowFeePercent` | `percent` |
| `shortableSharesChart` | `history/{ticker}/market-history.json` | `tradeDate` or `date` | `availableShares` | `shares` |
| `ftdChart` | `history/{ticker}/ftd-history.json` | `tradeDate` | `shares` | `shares` |
| `utilizationChart` | `history/{ticker}/market-history.json` | `tradeDate` or `date` | `utilizationPercent` | `percent` |
| `daysToCoverChart` | `history/{ticker}/market-history.json` | `tradeDate` or `date` | `daysToCover` | `days` |

## 9. Required Detailed Response Contract

The detailed response must follow this structure. Fields ending in `Display`
are formatted for the current renderer; raw numeric values remain available for
future frontend formatting.

```json
{
  "schemaVersion": 2,
  "reportVersion": "post-market-daily-close-lean-v1",
  "sampleMode": false,
  "ticker": "CURR",
  "company": "CURRENC Group Inc.",
  "reportDateIso": "2026-08-03",
  "reportDate": "Aug 3, 2026",
  "generatedAt": "2026-08-03T23:05:00Z",
  "status": "High Short Interest Pressure",
  "legalDisclaimers": {
    "footer": "For informational purposes only. Not investment advice. Market data may be delayed or incomplete."
  },
  "tradingSnapshot": {
    "asOfDateIso": "2026-08-03",
    "asOfDate": "Aug 3, 2026",
    "open": 3.435,
    "high": 3.435,
    "low": 3.15,
    "close": 3.23,
    "tradeVolume": 137544,
    "items": [
      { "key": "open", "label": "Open", "value": "$3.435" },
      { "key": "high", "label": "High", "value": "$3.435" },
      { "key": "low", "label": "Low", "value": "$3.15" },
      { "key": "close", "label": "Close", "value": "$3.23" },
      { "key": "tradeVolume", "label": "Trade Volume", "value": "137,544" }
    ]
  },
  "snapshotKpis": [
    {
      "key": "borrowFeePercent",
      "label": "Borrow Fee",
      "rawValue": 29.15,
      "value": "29.15%",
      "observationDate": "2026-08-03",
      "previousRawValue": 31.2,
      "previousObservationDate": "2026-07-31",
      "numericChange": -2.05,
      "percentChange": -6.57,
      "changeValue": "-2.05 pts",
      "changePercent": "-6.57%",
      "comparisonLabel": "vs previous trading day",
      "tone": "positive"
    }
  ],
  "shortInterestScore": {
    "score": 78.25,
    "scoreDisplay": "78.25",
    "level": "High",
    "tone": "high",
    "color": "#cf3e4f",
    "changeDisplay": "+2.00 (+2.62%)",
    "deltaTone": "negative",
    "summary": "Elevated short-side conditions may increase squeeze sensitivity.",
    "ranges": [
      { "range": "0-39", "level": "Low", "description": "Pressure is relatively contained.", "active": false },
      { "range": "40-64", "level": "Moderate", "description": "Pressure is developing.", "active": false },
      { "range": "65-79", "level": "High", "description": "Elevated squeeze sensitivity.", "active": true },
      { "range": "80-100", "level": "Extreme", "description": "Severe pressure warrants review.", "active": false }
    ],
    "aiAnalysis": "**Current Interpretation**\n\nDaily AI interpretation text.",
    "aiSourceScope": "user"
  },
  "shortLending": {
    "posture": "High Short Interest Pressure",
    "shortVolumeChart": {
      "id": "shortVolume",
      "title": "Short Volume Trend",
      "subtitle": "Latest seven available trading days",
      "color": "#1769e8",
      "unit": "shares",
      "minValid": 0,
      "dates": ["2026-07-24", "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31", "2026-08-03"],
      "values": [27100, 31500, 28900, 34000, 30100, 41000, 59500],
      "latestDisplay": "59.5K"
    },
    "borrowFeeChart": {},
    "shortableSharesChart": {},
    "ftdChart": {},
    "utilizationChart": {},
    "daysToCoverChart": {}
  },
  "sentiment": {
    "window": "7D",
    "windowStart": "2026-07-28T00:00:00Z",
    "windowEnd": "2026-08-04T00:00:00Z",
    "mentions": 104,
    "mentionsDisplay": "104",
    "overall": {
      "score": 63.94,
      "scoreDisplay": "63.94",
      "label": "Bullish",
      "previousScore": 73,
      "changeDisplay": "-9.06",
      "deltaTone": "negative"
    },
    "distribution": {
      "scoreDisplay": "104",
      "label": "Mentions",
      "bullishCount": 34,
      "neutralCount": 65,
      "bearishCount": 5,
      "bullishPercent": 32.69,
      "neutralPercent": 62.5,
      "bearishPercent": 4.81
    },
    "platforms": [
      { "name": "Reddit", "mentions": 20, "mentionsDisplay": "20", "sharePercent": 19.23, "sentimentScore": 52, "sentimentLabel": "Neutral" },
      { "name": "X", "mentions": 48, "mentionsDisplay": "48", "sharePercent": 46.15, "sentimentScore": 70, "sentimentLabel": "Bullish" },
      { "name": "Facebook", "mentions": 0, "mentionsDisplay": "0", "sharePercent": 0, "sentimentScore": null, "sentimentLabel": "No data" },
      { "name": "LinkedIn", "mentions": 0, "mentionsDisplay": "0", "sharePercent": 0, "sentimentScore": null, "sentimentLabel": "No data" },
      { "name": "Stocktwits", "mentions": 36, "mentionsDisplay": "36", "sharePercent": 34.62, "sentimentScore": 54, "sentimentLabel": "Neutral" }
    ]
  },
  "secFilings": [
    {
      "id": "sec-example",
      "filingDate": "2026-08-03",
      "date": "Aug 3, 2026",
      "formType": "6-K",
      "title": "Report of foreign issuer",
      "accessionNumber": "0000000000-26-000001",
      "filingsUrl": "https://www.sec.gov/..."
    }
  ],
  "_meta": {
    "sources": [],
    "dataCompleteness": {
      "requiredSourcesPresent": true,
      "missingOptionalSections": []
    }
  }
}
```

## 10. Short Interest Score Rules

Use the consolidated `shortScore` value without recalculating it in the report
API.

| Score | Level | Tone | Deterministic summary |
|---|---|---|---|
| 0 to less than 40 | Low | `low` | Current short-side pressure is relatively contained. |
| 40 to less than 65 | Moderate | `moderate` | Short-side pressure is developing and should be monitored. |
| 65 to less than 80 | High | `high` | Elevated short-side conditions may increase squeeze sensitivity. |
| 80 to 100 | Extreme | `extreme` | Severe short-side pressure warrants close review. |

`aiAnalysis` must contain the complete
`short_interest_current_interpretation` value. Do not split, summarize, or
rewrite it in the report API.

### AI lookup behavior

Because the endpoint is authenticated, apply the existing AI lookup order:

1. `ai-report/{ticker}/{date}/{user_sub}/ai-report-user.json`
2. `ai-report/{ticker}/{date}/ai-report-ticker.json`
3. If neither exists, return `aiAnalysis` as the standard unavailable message
   and `aiSourceScope` as `none`.

The shared report file may contain the ticker-level fallback. The API Lambda may
overlay the user-specific AI text at request time. Do not store one user's AI
text in the shared ticker report file.

## 11. Sentiment Rules

The report uses the previous seven-day window ending on the report date.

### Score

The output score scale is 0 to 100:

```text
Positive post = 100
Neutral post = 50
Negative post = 0
overallScore = sum(postScores) / totalMentions
```

If the consolidated sentiment file already supplies the score, use that value
and do not recalculate it differently.

### Labels

```text
score >= 60: Bullish
score <= 40: Bearish
otherwise: Neutral
null: No data
```

### Distribution

```text
bullishPercent = bullishCount / totalMentions * 100
neutralPercent = neutralCount / totalMentions * 100
bearishPercent = bearishCount / totalMentions * 100
```

### Platform breakdown

Always return these five rows in this order:

1. Reddit
2. X
3. Facebook
4. LinkedIn
5. Stocktwits

For every platform:

```text
sharePercent = platformMentions / totalMentions * 100
```

When a platform has no records, return:

```json
{
  "mentions": 0,
  "mentionsDisplay": "0",
  "sharePercent": 0,
  "sentimentScore": null,
  "sentimentLabel": "No data"
}
```

The sum of platform mention counts must reconcile to `sentiment.mentions`.

## 12. SEC Filing Rules

Source:

```text
manual-input/sec-filings/{ticker}/sec-filings.json
```

Rules:

1. Include only records where `filingDate <= reportDate`.
2. Deduplicate by `accessionNumber` when present; otherwise deduplicate by
   `id`.
3. Sort newest first by `filingDate`.
4. Return at most five records.
5. Do not merge a second filing dataset into this list unless the backend first
   guarantees canonical deduplication.

## 13. Source Provenance

Return source information in `_meta.sources` so developers can audit the report
without exposing source details in the user-facing PDF.

Recommended shape:

```json
{
  "id": "market-history",
  "category": "market-history",
  "path": "history/CURR/market-history.json",
  "generatedAt": "2026-08-03T22:30:00Z",
  "selectedRecordDate": "2026-08-03",
  "status": "used"
}
```

Allowed statuses:

- `used`
- `missing_optional`
- `invalid`

Do not include credentials, signed URLs, Cognito subjects, or private bucket
details in this metadata.

## 14. Generation Pipeline

Recommended sequence after daily consolidation:

1. Determine the completed market trading date.
2. Validate that an exact market-history row exists for that date.
3. Load all source files from Section 3.
4. Normalize numeric values and dates.
5. Build KPI comparisons.
6. Build all six seven-observation chart series.
7. Freeze the matching previous-seven-day sentiment snapshot.
8. Select and deduplicate SEC filings as of the report date.
9. Add the ticker-level AI fallback if available.
10. Validate the response contract and reconciliation rules.
11. Write `reports/{ticker}/{date}/{ticker}_report_data.json` atomically.
12. Add the date to the report index only after the file write succeeds.

The API may then overlay user-specific AI text when serving the authenticated
detailed request.

## 15. Required and Optional Data

### Required to publish

- Valid ticker
- Company profile or an explicit company-name-unavailable value
- Exact report-date market-history row
- Valid report date
- Structurally valid output JSON

### Optional sections that must not block publication

- Short Volume chart
- Fails-to-Deliver chart
- Sentiment
- SEC filings
- AI analysis

Missing optional data must produce empty arrays or `N/A` values, not fake data
and not a failed report.

## 16. Error Responses

| Status | Condition |
|---|---|
| `400` | Missing ticker, invalid date, or pagination parameters used with detailed mode |
| `401` | Missing or invalid Cognito token |
| `403` | User cannot access ticker |
| `404` | Requested dated report file does not exist |
| `422` | Report generation attempted without an exact report-date market row |
| `500` | Unexpected source read, validation, or serialization failure |

Error responses should include a stable code:

```json
{
  "error": "Report not found",
  "code": "REPORT_NOT_FOUND",
  "ticker": "CURR",
  "date": "2026-08-03"
}
```

## 17. Acceptance Criteria

Backend implementation is complete only when all of the following pass:

1. List mode remains paginated and returns only generated report dates.
2. Detailed mode returns the complete contract from Section 9 in one request.
3. No output record uses data dated after the requested report date.
4. KPI changes use the previous valid observation for that metric.
5. All six chart keys exist and contain no more than seven valid observations.
6. Short Volume uses `totalShortVolumeReported`.
7. FTD uses `tradeDate` and `shares`.
8. Missing observations remain null or empty and never become zero.
9. Sentiment is frozen to the report's previous-seven-day window.
10. Reddit, X, Facebook, LinkedIn, and Stocktwits are always present.
11. Platform mention counts reconcile to total mentions.
12. SEC filings are dated on or before the report date and are deduplicated.
13. AI lookup follows user-specific then ticker-level fallback.
14. The shared report file never contains another user's AI data.
15. Source paths and generated timestamps are available in `_meta.sources`.
16. Repeated reads of an archived report return the same shared report values.

## 18. Frontend Migration After Backend Completion

After this contract is deployed, the frontend can replace its current multiple
report data calls with:

```http
GET /market-data/reports?ticker={ticker}&date={YYYY-MM-DD}
```

The report archive index call remains unchanged. The PDF renderer can consume
the detailed response directly. The existing browser-side report composition
should then be removed to prevent two competing calculation paths.
