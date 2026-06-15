# Dashboard V2 Backend Derived Fields

This document describes the backend fields for:

```text
Sample Data/dashboard_v2_CURR_consolidated_4_web.json
```

A full 365-day schema sample is also provided at:

```text
Sample Data/dashboard_v2_CURR_consolidated_4_web_365_sample.json
```

That sample is intended for chart/schema testing. It uses the latest ORTEX rows where available and synthetic historical backfill for older dates. Replace synthetic rows with real production data before deployment.

This version was generated from:

```text
/Users/bennycheung/Downloads/ortex_CURR_consolidated (2).json
```

## Important Source Limitation

The provided ORTEX source contains:

- closing price
- trade volume
- borrow fee
- short availability shares
- short availability percent
- days to cover
- short interest
- short score

The provided ORTEX source does **not** contain these Dashboard V2 fields:

- `margin`
- chart event markers

Those fields are included in the output as `null` and listed under:

```text
data.missingFromSource
```

Important mapping update:

- Dashboard V2 `utilization` should be populated from ORTEX `shortAvailabilityPct`.
- Dashboard V2 `daysToCover` should be populated from ORTEX Days to Cover.
- Only `margin` and chart event markers remain missing from the current ORTEX source.

## Target Output Shape

```json
{
  "ticker": "CURR",
  "asOfDate": "2026-06-05",
  "sourcePlatform": "Ortex",
  "recordType": "dashboardV2ConsolidatedWeb",
  "category": "dashboard_v2",
  "status": "ready_with_missing_fields",
  "data": {
    "current": {},
    "trends": [],
    "events": [],
    "missingFromSource": [],
    "derived": {
      "dashboardV2": {
        "defaultPeriod": "1Y",
        "periods": ["1D", "5D", "1M", "3M", "1Y", "YTD"],
        "cards": {},
        "chart": {}
      }
    }
  }
}
```

## 1. Daily Trend Rows

JSON path:

```text
data.trends[]
```

## Production History Requirement

For the Dashboard V2 `1Y` chart, the backend should provide **at least the previous 365 days of daily trend rows** in:

```text
data.trends[]
```

Minimum production expectation:

```text
data.trends.length >= 365
```

Each row should represent one trading day or one calendar day with the latest available market data. The frontend can render shorter samples, but a short file will not support the intended `1Y` Trend Overview chart or meaningful `1Y` KPI comparison.

The current sample JSON generated from `ortex_CURR_consolidated (2).json` has only 7 dates because the provided source file only contains 7 dates. That is acceptable for schema review only. It is **not enough** for production Dashboard V2 charting.

Required row shape:

```json
{
  "date": "2026-06-05",
  "price": 3.18,
  "feeRate": 31.31,
  "tradeVolume": 160949,
  "shortableShares": 2433471,
  "daysToCover": 5.3431,
  "utilization": 67.59,
  "margin": null,
  "sourceRecords": {}
}
```

## Source Mapping From ORTEX

| Dashboard V2 field | ORTEX source path | Status |
|---|---|---|
| `date` | `[].date` | Available |
| `price` | `[].records.closing_prices.close` | Available |
| `tradeVolume` | `[].records.closing_prices.volume` | Available |
| `feeRate` | `[].records.ctb_all.costToBorrowAll` | Available |
| `shortableShares` | `[].records.availability.shortAvailabilityShares` | Available |
| `utilization` | `[].records.availability.shortAvailabilityPct` | Available. This is labeled `Utilization` in Dashboard V2, but sourced from ORTEX Short Availability %. |
| `daysToCover` | `[].records.days_to_cover.daysToCover` or `[].records.daysToCover.daysToCover` depending on source normalization | Available. This is displayed as `Days to Cover` in Dashboard V2. |
| `margin` | N/A | Missing from source |
| `events` | N/A | Missing from source |

Additional ORTEX source records are preserved under:

```text
data.trends[].sourceRecords
```

These include:

```text
availability
closingPrices
borrowFeeAll
borrowFeeNew
daysToCover
shortInterest
shortScore
```

## 2. Current Values

JSON path:

```text
data.current
```

Formula:

```text
latestRow = latest(data.trends[] by date)
```

Output mapping:

| JSON path | Formula |
|---|---|
| `data.current.date` | `latestRow.date` |
| `data.current.price` | `latestRow.price` |
| `data.current.borrowFee` | `latestRow.feeRate` |
| `data.current.availableShares` | `latestRow.shortableShares` |
| `data.current.tradeVolume` | `latestRow.tradeVolume` |
| `data.current.margin` | `latestRow.margin`, currently `null` |
| `data.current.daysToCover` | `latestRow.daysToCover`, populated from ORTEX Days to Cover |
| `data.current.utilization` | `latestRow.utilization`, populated from ORTEX Short Availability % |

## 3. KPI Compare Periods

JSON path:

```text
data.derived.dashboardV2.cards
```

Supported selector periods:

```text
1D, 5D, 1M, 3M, 1Y, YTD
```

Each period should contain:

```json
{
  "period": "5D",
  "latestDate": "2026-06-05",
  "comparisonDate": "2026-05-30",
  "cards": {
    "borrowFee": {},
    "margin": {},
    "availableShares": {},
    "utilization": {},
    "daysToCover": {}
  }
}
```

## Common KPI Shape

```json
{
  "label": "Borrow Fee",
  "value": 31.31,
  "valueDisplay": "31.31%",
  "previousValue": 30.93,
  "previousDate": "2026-05-30",
  "change": 0.38,
  "changeDisplay": "+0.38 pts",
  "changePercent": 1.23,
  "changePercentDisplay": "+1.23%",
  "deltaDisplay": "+0.38 pts(+1.23%)",
  "tone": "up",
  "sourceStatus": "available"
}
```

If a field is missing from the ORTEX source, use:

```json
{
  "value": null,
  "valueDisplay": "N/A",
  "previousValue": null,
  "change": null,
  "changeDisplay": "N/A",
  "changePercent": null,
  "changePercentDisplay": "N/A",
  "deltaDisplay": "N/A",
  "tone": "neutral",
  "sourceStatus": "missing_from_ortex_source"
}
```

## KPI Formulas

General:

```text
current = latest value
comparison = value on or before target date
change = current - comparison
changePercent = comparison === 0 ? null : change / comparison * 100
tone = change > 0 ? "up" : change < 0 ? "down" : "neutral"
```

Target dates:

```text
1D  = latestDate - 1 calendar day
5D  = latestDate - 5 calendar days
1M  = latestDate - 1 calendar month
3M  = latestDate - 3 calendar months
1Y  = latestDate - 1 calendar year
YTD = first available row on or after Jan 1 of latestDate year
```

When the source has limited history, use the earliest available row as the comparison row.

## KPI Source Fields

| Output card | Source field | Status | Display |
|---|---|---|---|
| `borrowFee` | `data.trends[].feeRate` | Available | `31.31%`, change in `pts` |
| `availableShares` | `data.trends[].shortableShares` | Available | `2,433,471`, change in `shares` |
| `margin` | `data.trends[].margin` | Missing | `N/A` until backend supplies |
| `utilization` | `data.trends[].utilization` from ORTEX `shortAvailabilityPct` | Available | `67.59%`, change in `pts` |
| `daysToCover` | `data.trends[].daysToCover` from ORTEX Days to Cover | Available | `5.34d`, change in `days` |

## 4. Chart Data

JSON path:

```text
data.trends[]
```

The Trend Overview chart can use:

| Chart series | Source field | Status |
|---|---|---|
| Price | `price` | Available |
| Borrow Fee | `feeRate` | Available |
| Trade Volume | `tradeVolume` | Available |
| Shortable Shares | `shortableShares` | Available |
| Days to Cover | `daysToCover` from ORTEX Days to Cover | Available |
| Utilization | `utilization` from ORTEX Short Availability % | Available |

For the `1Y` chart selector, `data.trends[]` should include at least 365 previous days of rows ending at `data.current.date`. If the backend has trading-day-only data, provide all available trading days over the prior year. Do not provide only the latest few rows unless the file is clearly marked as a sample.

Chart metadata lives at:

```text
data.derived.dashboardV2.chart
```

Expected shape:

```json
{
  "defaultFocusedMetric": "price",
  "enabledMetrics": [
    "price",
    "feeRate",
    "tradeVolume",
    "shortableShares",
    "daysToCover",
    "utilization"
  ],
  "bottomMetrics": ["tradeVolume", "shortableShares"],
  "missingMetrics": ["margin"],
  "ranges": {
    "1D": { "period": "1D", "data": [] },
    "5D": { "period": "5D", "data": [] },
    "1M": { "period": "1M", "data": [] },
    "3M": { "period": "3M", "data": [] },
    "1Y": { "period": "1Y", "data": [] },
    "YTD": { "period": "YTD", "data": [] }
  }
}
```

`ranges.*.data[]` contains the dates included in that period. Prefer naming this field `dates` in a future schema revision if it only contains date strings; full chart values should remain in `data.trends[]`.

## 5. Event Markers

JSON path:

```text
data.events[]
```

The provided ORTEX source has no events, so this array is empty.

Future event shape:

```json
{
  "id": "event-2026-06-05",
  "date": "2026-06-05",
  "type": "News",
  "title": "Company update",
  "summary": "Short summary shown on hover.",
  "source": "Company News"
}
```

## Backend Notes

- Do not invent values for `margin` or events from this ORTEX file.
- Populate `utilization` from ORTEX short availability percent: `records.availability.shortAvailabilityPct`.
- Populate `daysToCover` from ORTEX days to cover: `records.days_to_cover.daysToCover` or normalized `records.daysToCover.daysToCover`.
- If another provider later supplies a different utilization-style metric, decide whether to add a new field name instead of silently changing this Dashboard V2 definition.
- If another provider supplies missing values, merge them into `data.trends[]` by `date`.
- Production should include at least 365 previous days of `data.trends[]` rows to support the `1Y` chart and `1Y` comparison period.
- Keep raw chart values numeric.
- Keep display strings only in derived fields ending with `Display`.
- The current sample has only 7 dates, so `1M`, `3M`, `1Y`, and `YTD` comparisons use the earliest available ORTEX row.
