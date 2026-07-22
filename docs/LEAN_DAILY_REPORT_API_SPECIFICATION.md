# Lean Daily Market Close Report API Specification

## 1. Purpose

This document defines the backend contract for the first production-ready version of the Currenc Intelligence daily market close report.

The report is intentionally lean. It contains only data that is currently available from implemented APIs, plus the existing short-interest AI analysis. It excludes speculative, incomplete, or future-only sections.

The backend must produce one immutable report-data snapshot for each ticker, market date, report type, and revision. The frontend will use that snapshot to render the PDF on demand from the Report Archive page.

## 2. Executive Recommendation

Use the existing `/market-data/reports` API family for both current and historical reports, with two distinct response modes:

1. **Archive/index mode** returns paginated report metadata only.
2. **Dated report mode** returns one complete report payload.

The historical archive **should be included in the report API**, but the archive response must not contain every full report body. Returning metadata separately keeps the archive fast and lets the frontend fetch report data only when a user selects View PDF or Download.

Historical reports must be frozen snapshots. Do not recalculate an old report every time it is opened, because corrected or newly imported source data would silently change a previously issued report.

## 3. Required API Surface

### 3.1 List Report Archive

```http
GET /market-data/reports?ticker=CURR&type=post-market&page=1&limit=20&startDate=2026-07-01&endDate=2026-07-31
Authorization: <id_token>
```

All parameters except `ticker` are optional.

| Parameter | Type | Description |
|---|---:|---|
| `ticker` | string | Required uppercase-normalized ticker. |
| `type` | string | Report window. Lean V1 supports `post-market`. |
| `page` | integer | Default `1`. |
| `limit` | integer | Default `20`; maximum `100`. |
| `startDate` | date | Optional inclusive report-date filter. |
| `endDate` | date | Optional inclusive report-date filter. |

Example response:

```json
{
  "ticker": "CURR",
  "generatedAt": "2026-07-22T11:05:00Z",
  "reports": [
    {
      "reportId": "CURR:2026-07-21:post-market:r2",
      "reportDate": "2026-07-21",
      "reportType": "post-market",
      "reportTime": "19:00",
      "reportVersion": "post-market-daily-close-lean-v1",
      "revision": 2,
      "status": "ready",
      "generatedAt": "2026-07-21T23:05:00Z",
      "updatedAt": "2026-07-22T02:10:00Z",
      "dataRevision": "sha256:...",
      "availableFormats": ["pdf"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Allowed statuses:

- `pending`: report generation has not completed.
- `ready`: report data is available for rendering.
- `failed`: report generation failed validation.
- `superseded`: an older revision retained for audit purposes.

### 3.2 Fetch One Dated Report

```http
GET /market-data/reports?ticker=CURR&date=2026-07-21&type=post-market
Authorization: <id_token>
```

Optional `revision` may retrieve an older retained revision:

```http
GET /market-data/reports?ticker=CURR&date=2026-07-21&type=post-market&revision=1
```

Without `revision`, return the latest `ready` revision.

### 3.3 Generate or Update a Report

```http
PUT /market-data/reports
Authorization: <id_token>
Content-Type: application/json
```

Request:

```json
{
  "ticker": "CURR",
  "reportDate": "2026-07-21",
  "reportType": "post-market",
  "force": false,
  "reason": "Daily market close generation"
}
```

Rules:

- The request must not accept report metric values from the client.
- The backend must assemble all values from authoritative source files/APIs.
- `PUT` is an idempotent upsert for the ticker/date/type combination.
- Calculate a deterministic source fingerprint from source keys, generated timestamps, and relevant content checksums.
- If the fingerprint is unchanged and `force=false`, return the existing revision.
- If source data changed, create the next revision and mark the prior revision `superseded`.
- `force=true` may rebuild the report, but should still avoid a duplicate revision when the generated payload is byte-equivalent.
- Only `OPERATOR` and `ADMIN` roles may call this endpoint.

Example response:

```json
{
  "reportId": "CURR:2026-07-21:post-market:r2",
  "ticker": "CURR",
  "reportDate": "2026-07-21",
  "reportType": "post-market",
  "revision": 2,
  "status": "ready",
  "changed": true,
  "generatedAt": "2026-07-22T02:10:00Z",
  "reportKey": "reports/CURR/2026-07-21/post-market/v2/report-data.json"
}
```

An optional `POST /market-data/reports` may be implemented for create-only semantics, but it is not required if `PUT` supports idempotent creation and revision updates.

## 4. Access Control

- `USER` and `DEMO` may read only tickers included in their profile access list.
- `OPERATOR` and `ADMIN` may read all tickers.
- Only `OPERATOR` and `ADMIN` may generate or update reports.
- The public marketing demo must use a separate demo payload and must not expose production report data.
- Every update must record actor identity, request time, source fingerprint, and reason.

## 5. Storage Layout

Recommended object layout:

```text
reports/{ticker}/index.json
reports/{ticker}/{reportDate}/{reportType}/v{revision}/report-data.json
```

Example:

```text
reports/CURR/index.json
reports/CURR/2026-07-21/post-market/v2/report-data.json
```

Do not store a pre-generated PDF as the source of truth. The portal currently renders the PDF on demand. Store the validated JSON snapshot and archive metadata. A rendered PDF may be cached later as a performance optimization, but it must be traceable to `reportId`, `revision`, and `dataRevision`.

The existing legacy path may be read during migration:

```text
reports/{ticker}/{date}/{ticker}_report_data.json
```

New writes should use the versioned path.

## 6. Complete Lean Report Response

The dated endpoint must return this renderer-ready structure:

```json
{
  "schemaVersion": 2,
  "reportVersion": "post-market-daily-close-lean-v1",
  "reportId": "CURR:2026-07-21:post-market:r2",
  "revision": 2,
  "sampleMode": false,
  "ticker": "CURR",
  "company": "CURRENC Group Inc.",
  "reportDate": "Jul 21, 2026",
  "reportDateIso": "2026-07-21",
  "reportType": "post-market",
  "generatedAt": "Jul 21, 2026, 7:05 PM ET",
  "generatedAtUtc": "2026-07-21T23:05:00Z",
  "status": "High Short Interest Pressure",
  "dataRevision": "sha256:...",
  "sourceWatermarks": {},
  "legalDisclaimers": {
    "footer": "For informational purposes only. Not investment advice. Market data may be delayed or incomplete."
  },
  "snapshotKpis": [],
  "shortInterestScore": {},
  "shortLending": {},
  "sentiment": {},
  "secFilings": []
}
```

The formatted fields preserve compatibility with the current report renderer. Raw numeric values should also be returned where indicated so future renderers do not need to parse display strings.

## 7. Source Files and API Mapping

| Report data | Source API | Centralized JSON/object | Source field(s) |
|---|---|---|---|
| Company name | `GET /market-data/current?ticker={ticker}&category=company-profile-current` | `current/{ticker}/company-profile-current.json` | `companyName` |
| Current and prior market metrics | `GET /market-data/history?ticker={ticker}&category=market-history` | `history/{ticker}/market-history.json` | `records[]` |
| Short-interest AI analysis | `GET /market-data/ai-report?ticker={ticker}` | `ai-report/{ticker}/{reportDate}/ai-report.json` | `short_interest_current_interpretation` |
| 1D sentiment snapshot | `GET /market-data/current?ticker={ticker}&category=sentiment-current` | `current/{ticker}/sentiment-current.json` | `periods.1D` or equivalent documented 1D object |
| SEC filings | `GET /manual-input/sec-filings?ticker={ticker}` | `manual-input/sec-filings/{ticker}/sec-filings.json` | `records[]` |
| Existing report output | `GET /market-data/reports?ticker={ticker}&date={date}` | Legacy: `reports/{ticker}/{date}/{ticker}_report_data.json` | Entire report object |
| Existing archive index | `GET /market-data/reports?ticker={ticker}` | Legacy: `reports/{ticker}/report-index-current.json` | `records[]` |
| New lean report output | Same dated report endpoint | `reports/{ticker}/{date}/post-market/v{revision}/report-data.json` | Entire lean report object |

The backend may read the JSON objects directly during consolidation rather than making HTTP calls to its own APIs. The API names above define ownership and externally observable behavior.

## 8. KPI Specification

Return exactly these eight cards in this order:

| KPI | Market history field | Display | Change unit | Risk direction for color |
|---|---|---|---|---|
| Short Interest % | `shortInterestPercent` | percent | percentage points and percent | Increase is negative/risk-increasing |
| Borrow Fee | `borrowFeePercent` | percent | percentage points and percent | Increase is negative/risk-increasing |
| Initial Margin | `initialMargin` | percent | percentage points and percent | Increase is negative/risk-increasing |
| Maintenance Margin | `maintenanceMargin` | percent | percentage points and percent | Increase is negative/risk-increasing |
| Shortable Shares | `availableShares` | compact shares | shares and percent | Decrease is negative/risk-increasing |
| Utilization | `utilizationPercent` | percent | percentage points and percent | Increase is negative/risk-increasing |
| Average Duration | `averageDurationDays` | days | days and percent | Increase is negative/risk-increasing |
| Days to Cover | `daysToCover` | days | days and percent | Increase is negative/risk-increasing |

Each KPI object:

```json
{
  "key": "borrowFeePercent",
  "label": "Borrow Fee",
  "value": "29.15%",
  "changeValue": "-2.05 pts",
  "changePercent": "-6.57%",
  "tone": "positive",
  "comparisonDate": "2026-07-20",
  "raw": {
    "value": 29.15,
    "changeValue": -2.05,
    "changePercent": -6.57
  }
}
```

Calculation rules:

```text
changeValue = currentValue - previousValue
changePercent = changeValue / ABS(previousValue) * 100
```

- Current means the latest valid value on the report date.
- Previous means the immediately preceding trading-day record with a valid value for that metric.
- If current is missing, display `N/A` and both changes as `--`.
- If previous is missing, display the current value and both changes as `--`.
- If previous is zero, return `changePercent=null` and display `--`.
- Never convert a missing value to zero.
- Margin fields may use `valueFormat=decimal_ratio` and `displayFormat=percent`; multiply those raw ratios by 100 exactly once.

## 9. Short Interest Score and AI Analysis

Source fields:

- Score: `market-history.records[].shortScore`
- AI analysis: `ai-report.short_interest_current_interpretation`

Response:

```json
{
  "score": 78,
  "scoreDisplay": "78",
  "level": "High",
  "tone": "high",
  "color": "#cf3e4f",
  "changeDisplay": "+2 (+2.63%)",
  "deltaTone": "negative",
  "summary": "Elevated short-side conditions may increase squeeze sensitivity.",
  "ranges": [
    { "range": "0-39", "level": "Low", "description": "Pressure is relatively contained.", "active": false },
    { "range": "40-64", "level": "Moderate", "description": "Pressure is developing.", "active": false },
    { "range": "65-79", "level": "High", "description": "Elevated squeeze sensitivity.", "active": true },
    { "range": "80-100", "level": "Extreme", "description": "Severe pressure warrants review.", "active": false }
  ],
  "aiAnalysis": "**Current Interpretation**\n\nDaily AI interpretation text."
}
```

Rules:

- `0-39`: Low
- `40-64`: Moderate
- `65-79`: High
- `80-100`: Extreme
- Preserve Markdown from the AI response.
- Do not split, summarize, or generate watch points from the AI paragraph.
- The AI report date must match the report date. Do not silently attach the latest AI report to an older historical report.
- If same-date AI content is unavailable, return the defined unavailable message and record the missing source in `sourceWatermarks`/validation warnings.

## 10. Seven-Day Trend Charts

Return four independent charts:

| Chart | Field | Unit | Color |
|---|---|---|---|
| Borrow Fee Trend | `borrowFeePercent` | `percent` | `#cf3e4f` |
| Shortable Shares Trend | `availableShares` | `shares` | `#e19713` |
| Utilization Trend | `utilizationPercent` | `percent` | `#15936f` |
| Days to Cover Trend | `daysToCover` | `days` | `#6757d8` |

Each chart uses the latest seven valid observations at or before `reportDate`, evaluated independently per metric.

```json
{
  "id": "borrowFee",
  "title": "Borrow Fee Trend",
  "subtitle": "Latest seven available trading days",
  "color": "#cf3e4f",
  "unit": "percent",
  "minValid": 0,
  "maxValid": 500,
  "dates": ["2026-07-13", "2026-07-14"],
  "values": [31.2, 29.15],
  "latestDisplay": "29.15%"
}
```

Rules:

- Sort chronologically ascending for chart display.
- `dates[index]` and `values[index]` must refer to the same record.
- Do not insert zero for a missing observation.
- The seven dates may differ between charts when individual metrics have missing days.

## 11. One-Day Social Sentiment

The report always uses the completed 1D window anchored to the report cutoff, not the current time when the user opens an old report.

```json
{
  "window": "1D",
  "windowStartUtc": "2026-07-20T23:00:00Z",
  "windowEndUtc": "2026-07-21T23:00:00Z",
  "mentions": 104,
  "mentionsDisplay": "104",
  "overall": {
    "score": 64,
    "scoreDisplay": "64",
    "label": "Bullish",
    "changeDisplay": "+5",
    "deltaTone": "positive"
  },
  "distribution": {
    "scoreDisplay": "104",
    "label": "Mentions",
    "bullishPercent": 33,
    "neutralPercent": 62,
    "bearishPercent": 5
  },
  "platforms": [
    {
      "name": "X",
      "mentions": 48,
      "mentionsDisplay": "48",
      "sharePercent": 46.15,
      "sentimentLabel": "Bullish"
    }
  ]
}
```

Rules:

- `score >= 60`: Bullish
- `score <= 40`: Bearish
- Otherwise: Neutral
- `distributionPercent = sentimentCount / totalMentions * 100`
- `platformSharePercent = platformMentions / totalMentions * 100`
- Distribution percentages should reconcile to approximately 100 after rounding.
- Platform mention counts should reconcile to total mentions, with a documented `Other` group if unsupported platforms exist.
- When there are no mentions, return zeros for counts and percentages, but use `No data` rather than Neutral as the overall label.

## 12. Latest SEC Filings

Return at most five filings with `filingDate <= reportDate`, newest first.

```json
{
  "date": "21 Jul 2026",
  "dateIso": "2026-07-21",
  "formType": "6-K",
  "title": "Report of foreign issuer",
  "filingsUrl": "https://www.sec.gov/..."
}
```

Source mapping:

- `date` / `dateIso`: `filingDate`
- `formType`: `formType`
- `title`: `formDescription`
- `filingsUrl`: `filingsUrl`

The current renderer only requires date, form type, and title. Including the URL is recommended for future clickable reports.

## 13. Source Watermarks and Auditability

Every dated report must record exactly which inputs produced it:

```json
{
  "sourceWatermarks": {
    "companyProfile": {
      "key": "current/CURR/company-profile-current.json",
      "generatedAt": "2026-07-21T22:59:00Z",
      "checksum": "sha256:..."
    },
    "marketHistory": {
      "key": "history/CURR/market-history.json",
      "generatedAt": "2026-07-21T23:00:00Z",
      "checksum": "sha256:..."
    },
    "sentimentCurrent": {
      "key": "current/CURR/sentiment-current.json",
      "generatedAt": "2026-07-21T23:01:00Z",
      "checksum": "sha256:..."
    },
    "secFilings": {
      "key": "manual-input/sec-filings/CURR/sec-filings.json",
      "generatedAt": "2026-07-21T18:00:00Z",
      "checksum": "sha256:..."
    },
    "aiReport": {
      "key": "ai-report/CURR/2026-07-21/ai-report.json",
      "generatedAt": "2026-07-21T23:04:00Z",
      "checksum": "sha256:..."
    }
  }
}
```

`dataRevision` should be the hash of a stable serialization of these source fingerprints plus the report contract version.

## 14. Generation Workflow

1. Normalize and authorize the ticker.
2. Resolve the requested market date.
3. Load the company profile.
4. Load market history and select records at or before the report date.
5. Select current and comparison values independently for every KPI.
6. Build the latest seven valid values for every chart.
7. Load the sentiment 1D snapshot anchored to the report cutoff.
8. Load SEC filings and select the latest five eligible records.
9. Load the same-date AI report.
10. Validate reconciliation, missing-value handling, date alignment, and score ranges.
11. Calculate the source fingerprint and compare it with the latest report revision.
12. If changed, write a new immutable report JSON revision.
13. Update the report index atomically after the report object is successfully written.
14. Invalidate the report archive/page-data cache for the ticker.

## 15. Validation Rules

Generation must fail with `status=failed` for structural errors such as:

- Invalid ticker or report date.
- Missing company profile/ticker identity.
- No eligible market-history record on or before the report date.
- Malformed date/value arrays.
- Non-finite numeric values.
- A report payload that does not conform to the expected schema.

Generation may succeed with warnings for optional missing data:

- Missing AI analysis.
- No social mentions.
- No SEC filings.
- Individual KPI or chart fields unavailable.

Return warnings in metadata:

```json
{
  "warnings": [
    {
      "code": "AI_ANALYSIS_UNAVAILABLE",
      "source": "aiReport",
      "message": "No AI analysis matched the report date."
    }
  ]
}
```

Never manufacture placeholder numbers in a production report.

## 16. Error Responses

| Status | When used |
|---:|---|
| `400` | Missing/invalid ticker, date, report type, page, or limit. |
| `401` | Missing or invalid identity token. |
| `403` | User lacks ticker access or mutation role. |
| `404` | Requested report/revision or source identity does not exist. |
| `409` | Concurrent revision conflict or report is already generating. |
| `422` | Source data exists but fails report validation. |
| `500` | Unexpected generation/storage failure. |

Example validation error:

```json
{
  "error": "REPORT_VALIDATION_FAILED",
  "ticker": "CURR",
  "reportDate": "2026-07-21",
  "details": ["No eligible market-history record was found."],
  "requestId": "..."
}
```

## 17. Caching and Performance

- Cache archive index responses for 5 minutes.
- Cache immutable dated report revisions for at least 24 hours using an ETag based on `dataRevision`.
- A specific revision may use `Cache-Control: private, max-age=86400, immutable`.
- The latest revision response may use `Cache-Control: private, max-age=600, stale-while-revalidate=300`.
- Invalidate ticker report/archive cache after a successful report update.
- Gzip or Brotli JSON responses.
- Keep the archive response metadata-only and paginated.
- Do not fetch every historical report to render the archive list.

## 18. Migration From the Existing Report API

The current dated API returns a thinner object containing `companyProfile`, `marketSnapshot`, `ownershipSnapshot`, `sentimentSnapshot`, and `riskSummary`. That object is not sufficient for the current lean PDF.

Migration steps:

1. Preserve the current `GET /market-data/reports` route and authorization rules.
2. Change new generated report objects to `schemaVersion=2` and the complete lean response in this document.
3. Continue reading legacy `schemaVersion=1` reports during a transition period.
4. Do not rewrite old report files in place. Convert them only if an operator explicitly rebuilds that date.
5. Return the schema/report version in archive metadata so the frontend can identify legacy reports.
6. Once the frontend no longer depends on dynamic multi-API composition, replace `buildDailyReportData()` with one dated report API request.

## 19. Historical Archive Decision

The Report Archive must use the report API because it needs a reliable list of available report dates and revisions. However:

- The archive endpoint returns metadata only.
- The complete payload is fetched only for View PDF or Download.
- A report date is shown as available only when its latest revision is `ready`.
- Pending/failed reports may be visible only to operators in development/admin views.
- Historical payloads remain immutable and auditable.
- PDF rendering remains on demand in the frontend for Lean V1.

This separation gives the portal a responsive archive without losing historical accuracy.

## 20. Acceptance Criteria

The backend change is complete when:

- A permitted user can list paginated report dates for an authorized ticker.
- A permitted user can retrieve one complete lean report by ticker and date.
- An operator can generate/update a report through idempotent `PUT`.
- Repeating `PUT` without source changes does not create a duplicate revision.
- Source changes create a traceable new revision.
- All eight KPI cards contain correct prior-trading-day comparisons.
- All four charts contain the latest seven valid observations.
- Short Interest Score and same-date AI analysis match the Short Interest portal data.
- Sentiment is fixed to the report's 1D window.
- SEC filings are newest first and limited to five.
- Missing values remain `N/A`/`null`, never zero-filled.
- Archive list responses do not include full report payloads.
- The frontend can render and download the PDF using only the dated report response.

