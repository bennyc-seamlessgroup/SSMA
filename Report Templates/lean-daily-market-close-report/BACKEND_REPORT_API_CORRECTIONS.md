# Lean Daily Market Close Report - Backend Contract Corrections

## 1. Purpose

This document is a self-contained correction specification for the backend
implementation described in `report-data-contract-implementation.md`.

It supersedes any incomplete or ambiguous report-field guidance previously
provided. A backend developer should be able to implement the complete dated
report response using this document without inspecting the frontend code.

Target endpoint:

```http
GET /market-data/reports?ticker={ticker}&date={YYYY-MM-DD}
Authorization: <Cognito ID token>
```

The endpoint must return the complete shared payload for the four-page Lean
Daily Market Close Report. The frontend must not call separate market,
history, sentiment, or filing APIs after this contract is deployed. AI
analysis is intentionally fetched from the separate authenticated dated
`GET /market-data/ai-report` endpoint and overlaid in the browser.

The report source template is:

```text
Report Templates/lean-daily-market-close-report/
```

The shared dated payload is stored at:

```text
reports/{ticker}/{date}/{ticker}_report_data.json
```

## 2. Required Corrections Summary

| Area | Current backend behavior | Required correction |
|---|---|---|
| Company | Defaults missing names to CURRENC Group Inc. | Never use a company-specific fallback for another ticker |
| Dates | Uses display strings only | Return ISO machine values and display values |
| Trading snapshot | Empty object with no mapping | Return Open, High, Low, Close, and Trade Volume |
| KPI comparison | Compares only with strict T-1 | Compare each metric with its previous non-null observation |
| KPI audit fields | Returns display strings only | Return raw values and both observation dates |
| Short Score | `ranges` may be empty | Return all four score ranges and preserve float precision |
| AI analysis | May be embedded in the shared report | Omit or ignore it; the frontend overlays the separate authenticated AI response |
| Trend charts | Common seven-date window with null slots | Use the latest seven valid observations independently per chart |
| Sentiment distribution | Center displays score and Bullish/Bearish | Center displays total mentions and the label `Mentions` |
| Sentiment detail | Omits counts, prior score, and window boundaries | Return all counts, prior score, and ISO window boundaries |
| SEC filings | Returns date, form, and title only | Add IDs, ISO date, accession number, and URL |
| Legal footer | May be empty | Return the required disclaimer text |
| Provenance | Not returned | Return source path, generated time, and selected date metadata |
| Archive | Regeneration behavior is undefined | Keep dated snapshots immutable unless explicitly regenerated |

## 3. Authoritative Source Files

All source paths are relative to the centralized V2 data bucket.

| Content | Source file | API category | Fields used |
|---|---|---|---|
| Company | `current/{ticker}/company-profile-current.json` | `company-profile-current` | `companyName`, `stockCode`, `ticker` |
| Market snapshot, KPIs, and four charts | `history/{ticker}/market-history.json` | `market-history` | See Section 6 |
| Short Volume Trend | `history/{ticker}/short-volume-history.json` | `short-volume-history` | `date`, `totalShortVolumeReported` |
| Fails-to-Deliver Trend | `history/{ticker}/ftd-history.json` | `ftd-history` | `tradeDate`, `shares` |
| Current 1D sentiment | `current/{ticker}/sentiment-current.json` | `sentiment-current` | 1D overview, distribution, and platform breakdown |
| Historical sentiment rebuild | `history/{ticker}/sentiment-events.json` | `sentiment-events` | Timestamp, platform, and sentiment |
| SEC filings | `manual-input/sec-filings/{ticker}/sec-filings.json` | `GET /manual-input/sec-filings` | Filing fields in Section 11 |
| User AI analysis | `ai-report/{ticker}/{date}/{user_sub}/ai-report-user.json` | Separate `GET /market-data/ai-report` request | `short_interest_current_interpretation` |
| Ticker AI fallback | `ai-report/{ticker}/{date}/ai-report-ticker.json` | Same separate endpoint fallback | `short_interest_current_interpretation` |
| Final report | `reports/{ticker}/{date}/{ticker}_report_data.json` | Detailed reports endpoint | Complete shared payload |

Generation must read these files directly or use equivalent internal backend
objects loaded from these exact files. Names such as `hist_market` are internal
variables, not authoritative source documentation.

## 4. Date and Snapshot Rules

### 4.1 Report date

- The query `date` is required in detailed mode and uses `YYYY-MM-DD`.
- It is the report trading date.
- The main market row must exactly match this date.
- Never substitute another date when the requested report does not exist.
- No source record dated after the report date may be included.

### 4.2 Dated report immutability

Once generated, the shared report payload is a frozen dated snapshot. Reading
an old report must not recalculate it from the latest sentiment or filing data.

An authorized regeneration job may overwrite the same dated file. It must also
update `generatedAt`, `generatedAtDisplay`, and `_meta.sources`.

### 4.3 Required date fields

```json
{
  "reportDateIso": "2026-08-03",
  "reportDate": "Aug 3, 2026",
  "generatedAt": "2026-08-03T23:05:00Z",
  "generatedAtDisplay": "Aug 3, 2026, 7:05 PM ET"
}
```

ISO fields are authoritative. Display fields are provided for the current PDF
renderer.

## 5. Company and Top-Level Metadata

Required top-level fields:

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
  "generatedAtDisplay": "Aug 3, 2026, 7:05 PM ET",
  "status": "High Short Interest Pressure"
}
```

Company rules:

1. Use `companyName` from `company-profile-current.json`.
2. Validate that the source ticker matches the requested ticker.
3. Do not default to `CURRENC Group Inc.`.
4. If the company name is missing, return `Company name unavailable` and add
   `company-profile-current` to `_meta.dataCompleteness.missingOptionalSections`.

`status` uses the consolidated Short Interest Score level:

```text
{level} Short Interest Pressure
```

Do not derive this report status from an undocumented lending-score formula.

## 6. Trading Snapshot - Complete Required Mapping

This section was under-specified previously. It is required and must not be an
empty object.

Source:

```text
history/{ticker}/market-history.json
```

Select the record whose `tradeDate` or `date` exactly matches
`reportDateIso`.

| Output | Preferred source | Accepted legacy source | Display rule |
|---|---|---|---|
| `open` | `open` | `price.open` | `$`, 2 to 4 decimals |
| `high` | `high` | `price.high` | `$`, 2 to 4 decimals |
| `low` | `low` | `price.low` | `$`, 2 to 4 decimals |
| `close` | `close` | `price.close` | `$`, 2 to 4 decimals |
| `tradeVolume` | `tradeVolume` | None | Whole number with separators |

Required output:

```json
{
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
  }
}
```

Missing values remain `null` in raw fields and display as `N/A`. Never replace
missing OHLC or volume with zero.

## 7. Snapshot KPIs - Complete Contract

Return exactly these eight KPI objects in this order:

1. `shortInterestPercent` - Short Interest %
2. `borrowFeePercent` - Borrow Fee
3. `initialMargin` - Initial Margin
4. `maintenanceMargin` - Maintenance Margin
5. `availableShares` - Shortable Shares
6. `utilizationPercent` - Utilization
7. `averageDurationDays` - Average Duration
8. `daysToCover` - Days to Cover

All values come from `history/{ticker}/market-history.json`. Do not merge
manual-input files into the report at request time; those values have already
been consolidated into market history.

### 7.1 Previous-observation selection

For each metric independently:

1. Current value is the value on the exact report-date row.
2. Search earlier rows in descending date order.
3. Select the first earlier row where this metric is non-null and valid.
4. Do not require all metrics to use the same previous date.
5. Do not convert a missing value to zero.

For Average Duration, values less than or equal to zero are invalid and must be
treated as missing.

### 7.2 Formulas

```text
numericChange = currentValue - previousValue
percentChange = numericChange / abs(previousValue) * 100
```

When either value is null, or when `previousValue` is zero:

```text
percentChange = null
changePercent = "--"
```

### 7.3 Comparison label

```text
If previousObservationDate is the immediately previous market trading date:
  comparisonLabel = "vs previous trading day"
Otherwise:
  comparisonLabel = "vs MMM D, YYYY"
```

### 7.4 Required KPI shape

```json
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
```

### 7.5 Tone rules

An increase is negative pressure for Short Interest %, Borrow Fee, Initial
Margin, Maintenance Margin, Utilization, Average Duration, Days to Cover, and
Short Score. An increase in Shortable Shares is positive. A decrease reverses
those tones. Missing or unchanged comparisons use an empty tone.

## 8. Short Interest Score and Separate AI Analysis

Use `shortScore` from the report-date market-history row. Preserve its float
value and display up to two decimals. Missing Short Score is `null`, never `0`.

Required score ranges:

| Range | Level | Description |
|---|---|---|
| `0-39` | Low | Pressure is relatively contained. |
| `40-64` | Moderate | Pressure is developing. |
| `65-79` | High | Elevated squeeze sensitivity. |
| `80-100` | Extreme | Severe pressure warrants review. |

Return all four rows and mark exactly one `active: true` when a valid score is
available.

Required shape:

```json
{
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
    "aiAnalysis": null,
    "aiSourceScope": "none"
  }
}
```

The shared report response does not own AI analysis. During PDF generation,
the frontend separately calls the authenticated dated AI endpoint and uses
this response order:

1. `ai-report/{ticker}/{date}/{user_sub}/ai-report-user.json`
2. `ai-report/{ticker}/{date}/ai-report-ticker.json`
3. Standard unavailable message with `aiSourceScope: "none"`

Any AI text embedded in the shared report file is ignored by the frontend.
User-specific AI must never be written into the shared or public report file.

## 9. Six Seven-Observation Charts

Return all six chart keys:

| Key | Source | Date field | Value field | Unit |
|---|---|---|---|---|
| `shortVolumeChart` | `history/{ticker}/short-volume-history.json` | `date` | `totalShortVolumeReported` | `shares` |
| `borrowFeeChart` | `history/{ticker}/market-history.json` | `tradeDate` or `date` | `borrowFeePercent` | `percent` |
| `shortableSharesChart` | `history/{ticker}/market-history.json` | `tradeDate` or `date` | `availableShares` | `shares` |
| `ftdChart` | `history/{ticker}/ftd-history.json` | `tradeDate` | `shares` | `shares` |
| `utilizationChart` | `history/{ticker}/market-history.json` | `tradeDate` or `date` | `utilizationPercent` | `percent` |
| `daysToCoverChart` | `history/{ticker}/market-history.json` | `tradeDate` or `date` | `daysToCover` | `days` |

For each chart independently:

1. Exclude records after the report date.
2. Exclude records with null, non-numeric, or invalid values.
3. Retain legitimate zero values.
4. Sort valid rows by date descending.
5. Take the latest seven valid observations.
6. Sort those seven rows ascending for output.
7. Do not add weekend/calendar dates that are absent from the source.
8. Do not forward-fill, interpolate, or use null dates to consume one of the
   seven observations.

Required chart shape:

```json
{
  "id": "borrowFee",
  "title": "Borrow Fee Trend",
  "subtitle": "Latest seven available trading days",
  "color": "#cf3e4f",
  "unit": "percent",
  "minValid": 0,
  "dates": ["2026-07-24", "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31", "2026-08-03"],
  "values": [31.2, 30.5, 30.1, 29.8, 29.5, 29.3, 29.15],
  "latestDisplay": "29.15%"
}
```

`dates.length` must equal `values.length`. Fewer than seven values are allowed
when the source has fewer than seven valid observations.

## 10. Sentiment - Complete 1D Contract

The report sentiment section represents one report-date 24-hour window.

Primary source while generating the current report:

```text
current/{ticker}/sentiment-current.json
```

Historical rebuild source:

```text
history/{ticker}/sentiment-events.json
```

Freeze the result into the dated report. An archived report must never read the
latest current sentiment file.

### 10.1 Score and labels

```text
Positive = 100
Neutral = 50
Negative = 0
overallScore = sum(event scores) / totalMentions
```

Use a consolidated source score when provided. Do not recalculate it using a
different method.

```text
score >= 60: Bullish
score <= 40: Bearish
otherwise: Neutral
null: No data
```

### 10.2 Distribution

```text
bullishPercent = bullishCount / totalMentions * 100
neutralPercent = neutralCount / totalMentions * 100
bearishPercent = bearishCount / totalMentions * 100
```

The donut center must display the number of mentions, not the sentiment score.

Correct distribution output:

```json
{
  "scoreDisplay": "104",
  "mentionsDisplay": "104",
  "label": "Mentions",
  "bullishCount": 34,
  "neutralCount": 65,
  "bearishCount": 5,
  "bullishPercent": 32.69,
  "neutralPercent": 62.5,
  "bearishPercent": 4.81
}
```

### 10.3 Platform breakdown

Always return rows in this order:

1. Reddit
2. X
3. Facebook
4. LinkedIn
5. Stocktwits

Each row contains:

```json
{
  "name": "X",
  "mentions": 48,
  "mentionsDisplay": "48",
  "sharePercent": 46.15,
  "sentimentScore": 70,
  "sentimentLabel": "Bullish"
}
```

When a platform has no records, return zero mentions and `No data`; do not omit
the row. Platform mention counts must sum to total mentions.

### 10.4 Complete sentiment shape

```json
{
  "sentiment": {
    "window": "1D",
    "windowStart": "2026-08-03T00:00:00-04:00",
    "windowEnd": "2026-08-04T00:00:00-04:00",
    "mentions": 104,
    "mentionsDisplay": "104",
    "overall": {
      "score": 63.94,
      "scoreDisplay": "63.94",
      "label": "Bullish",
      "previousScore": 73,
      "numericChange": -9.06,
      "changeDisplay": "-9.06",
      "deltaTone": "negative"
    },
    "distribution": {},
    "platforms": []
  }
}
```

Use the application's established report-market timezone when calculating the
window. Store ISO offsets so the boundary is auditable across daylight-saving
time changes.

## 11. SEC Filings - Complete Contract

Source:

```text
manual-input/sec-filings/{ticker}/sec-filings.json
```

Rules:

1. Include only filings with `filingDate <= reportDateIso`.
2. Deduplicate by `accessionNumber`; use `id` only when accession is missing.
3. Sort newest first by `filingDate`.
4. Return at most five records.
5. Do not merge with `sec-filings-history.json` unless the backend first
   guarantees canonical deduplication.

Required row:

```json
{
  "id": "sec-example",
  "filingDate": "2026-08-03",
  "date": "Aug 3, 2026",
  "formType": "6-K",
  "title": "Report of foreign issuer",
  "accessionNumber": "0000000000-26-000001",
  "filingsUrl": "https://www.sec.gov/..."
}
```

`title` uses `formDescription`, then an existing title, then `formType` as the
last fallback.

## 12. Legal Disclaimer

Return a non-empty footer:

```json
{
  "legalDisclaimers": {
    "footer": "For informational purposes only. Not investment advice. Market data may be delayed or incomplete."
  }
}
```

## 13. Source Provenance and Completeness

Return backend-only audit information in `_meta`. It is not printed in the PDF.

```json
{
  "_meta": {
    "sources": [
      {
        "id": "market-history",
        "category": "market-history",
        "path": "history/CURR/market-history.json",
        "generatedAt": "2026-08-03T22:30:00Z",
        "selectedRecordDate": "2026-08-03",
        "status": "used"
      }
    ],
    "dataCompleteness": {
      "requiredSourcesPresent": true,
      "missingOptionalSections": []
    }
  }
}
```

Allowed source statuses are `used`, `missing_optional`, and `invalid`.

Never include credentials, signed URLs, Cognito subjects, or private bucket
configuration in `_meta`.

## 14. Storage and Access Rules

The centralized bucket is the authoritative report store.

If the same payload is written to a public website bucket, the backend team
must explicitly confirm that the complete report is intended to be public.
Never write user-specific AI content to a public or shared report object.

The report index remains:

```text
reports/{ticker}/report-index-current.json
```

Index rules:

- Include only dates where the full dated report file was written successfully.
- Sort newest report date first.
- Do not create fake Pre-Market or Midday report records.
- Preserve existing pagination in list mode.

## 15. Required Generation Sequence

1. Validate ticker and report date.
2. Load company profile.
3. Load market history and require an exact report-date row.
4. Build the trading snapshot.
5. Build eight KPI values and independent previous-value comparisons.
6. Build Short Interest Score ranges without AI text.
7. Build six latest-seven-valid-observation charts.
8. Freeze the report-date 1D sentiment result.
9. Select and deduplicate the latest five eligible SEC filings.
10. Add legal text and source provenance.
11. Validate all reconciliation rules.
12. Write the dated report atomically.
13. Update the report index only after the dated file succeeds.
14. The frontend separately requests and overlays dated AI analysis when the
    user opens or downloads the report.

## 16. Validation and Reconciliation Rules

Reject or flag the generated payload when any of these invariants fail:

1. `ticker` does not match every ticker-scoped source.
2. The exact report-date market row is missing.
3. `tradingSnapshot.asOfDateIso` differs from `reportDateIso`.
4. `snapshotKpis` does not contain exactly eight ordered keys.
5. A KPI contains a future observation date.
6. A chart contains more than seven values.
7. A chart has unequal `dates` and `values` lengths.
8. A chart includes a record after the report date.
9. A missing numeric value was converted to zero.
10. Sentiment platform mentions do not sum to total mentions.
11. Sentiment percentages do not total approximately 100 after rounding.
12. One of the five required sentiment platform rows is missing.
13. A SEC filing is dated after the report date.
14. Duplicate SEC accession numbers remain.
15. User-specific AI is present in the shared dated file.

## 17. Example Complete Response Skeleton

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
  "generatedAtDisplay": "Aug 3, 2026, 7:05 PM ET",
  "status": "High Short Interest Pressure",
  "legalDisclaimers": { "footer": "For informational purposes only. Not investment advice. Market data may be delayed or incomplete." },
  "tradingSnapshot": {
    "asOfDateIso": "2026-08-03",
    "asOfDate": "Aug 3, 2026",
    "open": 3.435,
    "high": 3.435,
    "low": 3.15,
    "close": 3.23,
    "tradeVolume": 137544,
    "items": []
  },
  "snapshotKpis": [],
  "shortInterestScore": {},
  "shortLending": {
    "posture": "High Short Interest Pressure",
    "shortVolumeChart": {},
    "borrowFeeChart": {},
    "shortableSharesChart": {},
    "ftdChart": {},
    "utilizationChart": {},
    "daysToCoverChart": {}
  },
  "sentiment": {},
  "secFilings": [],
  "_meta": {
    "sources": [],
    "dataCompleteness": {
      "requiredSourcesPresent": true,
      "missingOptionalSections": []
    }
  }
}
```

The detailed field definitions in Sections 6 through 13 are mandatory; empty
objects and arrays in this skeleton only indicate where the fully populated
objects belong.

## 18. Backend Delivery Checklist

Before frontend integration, provide:

1. One real authenticated response for a report date with complete data.
2. One real response with one or more optional datasets missing.
3. One non-CURR ticker response proving company isolation.
4. The matching stored shared report object for the first response.
5. The report-index response containing that date.
6. Confirmation whether the website-bucket report object is intentionally
   public.
7. Test results for every invariant in Section 16.

Frontend integration must not begin until the real response satisfies these
requirements. A document describing intended behavior is not sufficient;
field-level response validation is required.
