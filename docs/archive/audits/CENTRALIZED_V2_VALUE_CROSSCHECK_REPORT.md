# Centralized V2 Value Cross-Check Report

Review date: 2026-07-14  
Reviewed folder:

```text
data-sync-platform-centralized-v2/
```

Rule source:

```text
newest datapoint csv/Portal Data Point - Master Table (1).csv
```

## Executive Summary

I re-checked the latest `data-sync-platform-centralized-v2/` package against the raw Chart Exchange files, raw Fintel files, manual-input JSON files, and the formulas/rules from the latest datapoint CSV.

The latest update fixes the prior manual-input comparison issue. Prior-day values now exist for manual availability, margins, utilization, and short score, so the generated day-over-day change values now reconcile cleanly.

Current status:

| Area | Status |
|---|---|
| Borrow fee | Pass |
| Short interest | Pass |
| Days to cover | Pass |
| Shortable shares / available shares | Pass |
| Utilization | Pass |
| Margins and average duration | Pass |
| Short score | Pass |
| Short volume history | Pass |
| FTD history | Pass |
| Fintel institutional ownership | Pass |
| Ownership public float | Pass |
| Internal float real tradable float | Pass |
| SEC filing history watermark | Pass |
| Current stock price | Missing/null |
| Social sentiment outputs | Missing |
| AI analysis output | Missing |
| Report sentiment snapshot | Null |

## Files Checked

### Raw Vendor Inputs

| Source | Dates | Status |
|---|---|---|
| Chart Exchange borrow fee | 2026-06-11, 2026-06-12 | Present |
| Chart Exchange short interest daily | 2026-06-11, 2026-06-12 | Present |
| Chart Exchange short volume | 2026-06-11, 2026-06-12 | Present |
| Chart Exchange failure to deliver | 2026-06-11, 2026-06-12 | Present |
| Fintel security ownership | 2026-06-11, 2026-06-12 | Present |
| Fintel activist filings | 2026-06-11, 2026-06-12 | Present |

### Manual Inputs

| Domain | Status |
|---|---|
| Issued share | Present |
| Profile | Present |
| Hotkeys | Present |
| Institutional owner security name | Present |
| SEC filings | Present |
| Management holdings | Present |
| Internal float inputs | Present |
| Manual availability, 2026-06-11 and 2026-06-12 | Present |
| Margins, 2026-06-11 and 2026-06-12 | Present |
| Utilization, 2026-06-11 and 2026-06-12 | Present |
| Short score, 2026-06-11 and 2026-06-12 | Present |
| Stocktwits sentiment manual input | Missing |

### Generated Outputs

| Output | Status |
|---|---|
| `current/CURR/company-profile-current.json` | Present |
| `current/CURR/market-current.json` | Present, but price is null |
| `current/CURR/ownership-current.json` | Present |
| `current/CURR/internal-float-current.json` | Present |
| `history/CURR/market-history.json` | Present |
| `history/CURR/short-volume-history.json` | Present |
| `history/CURR/ftd-history.json` | Present |
| `history/CURR/ownership-history.json` | Present |
| `history/CURR/sec-filings-history.json` | Present |
| `reports/CURR/2026-06-12/CURR_report_data.json` | Present, but price and sentiment are null |
| `reports/CURR/report-index-current.json` | Present |
| `current/CURR/sentiment-current.json` | Missing |
| `history/CURR/sentiment-events.json` | Missing |
| `current/CURR/ai-analysis-current.json` | Missing |

## Market Data Cross-Check

### Current Price

Expected source from datapoint sheet:

```text
Current Stock Price = Vendor
```

Generated output:

```json
"price": {
  "value": null,
  "asOf": "2026-06-12T20:00:00Z",
  "source": "Chart Exchange"
}
```

Report output:

```json
"marketSnapshot": {
  "price": null
}
```

Status: Open.

Recommendation:

- Add a real price source to centralized v2, or
- keep `price.value: null` but return structured missing-data metadata instead of implying Chart Exchange supplied a null value.

Suggested structure:

```json
"price": {
  "value": null,
  "asOf": null,
  "source": null,
  "status": "missing",
  "reason": "No current stock price source file included in centralized v2 sample."
}
```

### Borrow Fee

CSV rule:

```text
Borrow Fee % = latest daily record from chartexchange_borrow_fee_ib fee
Borrow Fee Num Change = borrow_fee_percent(T) - borrow_fee_percent(T-1)
Borrow Fee % Change = ((T - T-1) / T-1) * 100
Risk Factor:
  IF borrow_fee_percent < 25 THEN Low
  ELSE IF borrow_fee_percent < 50 THEN Moderate
  ELSE IF borrow_fee_percent <= 75 THEN High
  ELSE Extreme
```

Raw values:

| Date | Latest Raw Fee |
|---|---:|
| 2026-06-11 | 29.155 |
| 2026-06-12 | 29.153 |

Generated output:

```json
"borrowFee": {
  "percent": 29.153,
  "numChange": -0.002,
  "percentChange": -0.01,
  "riskFactor": "Moderate"
}
```

Status: Pass.

### Shortable Shares / Available Shares

CSV rule:

```text
available_shares_chart_exchange = latest daily record from chartexchange_borrow_fee_ib available
available_shares_ibkr = manual input
available_shares_futu = manual input
available_shares = MAX(chartExchange, ibkr, futu)
available_shares_num_change = available_shares(T) - available_shares(T-1)
available_shares_percent_change = ((T - T-1) / T-1) * 100
available_shares_risk_factor = borrow_fee_risk_factor
```

Raw/manual/history values:

| Date | Chart Exchange | IBKR | FUTU | Output Available Shares |
|---|---:|---:|---:|---:|
| 2026-06-11 | 900,000 | 3,000,000 | 1,800,000 | 3,000,000 |
| 2026-06-12 | 850,000 | 2,500,000 | 1,500,000 | 2,500,000 |

Generated output:

```json
"availableShares": {
  "chartExchange": 850000,
  "ibkr": 2500000,
  "futu": 1500000,
  "value": 2500000,
  "numChange": -500000,
  "percentChange": -16.67,
  "riskFactor": "Moderate"
}
```

Math:

```text
2,500,000 - 3,000,000 = -500,000
-500,000 / 3,000,000 * 100 = -16.67%
```

Status: Pass.

### Short Interest / Days to Cover

CSV rules:

```text
Short Interest = short_position
Short Interest % = short_interest
Days to Cover = days_to_cover
Change = current period - prior period
% Change = ((current - prior) / prior) * 100
```

Raw values:

| Date | Short Interest | SI % | Days to Cover |
|---|---:|---:|---:|
| 2026-06-11 | 906,502 | 8.58 | 2.84 |
| 2026-06-12 | 906,502 | 8.58 | 2.84 |

Generated current:

```json
"shortInterest": {
  "shares": 906502,
  "percent": 8.58,
  "numChange": 0,
  "percentChange": 0,
  "riskFactor": "High"
},
"daysToCover": {
  "value": 2.84,
  "numChange": 0,
  "percentChange": 0,
  "riskFactor": "Moderate"
}
```

Status: Pass.

### Utilization

Manual/history values:

| Date | Utilization |
|---|---:|
| 2026-06-11 | 92.5 |
| 2026-06-12 | 85.5 |

Generated output:

```json
"utilization": {
  "percent": 85.5,
  "numChange": -7,
  "percentChange": -7.57,
  "riskFactor": "Moderate"
}
```

Math:

```text
85.5 - 92.5 = -7
-7 / 92.5 * 100 = -7.57%
```

Status: Pass.

### Margin / Average Duration

Manual/history values:

| Date | Initial Margin IBKR | Initial Margin FUTU | Initial Margin | Maintenance IBKR | Maintenance FUTU | Maintenance | Avg Duration |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2026-06-11 | 0.55 | 0.65 | 0.65 | 0.43 | 0.48 | 0.48 | 15.2 |
| 2026-06-12 | 0.50 | 0.60 | 0.60 | 0.40 | 0.45 | 0.45 | 12.4 |

Generated output:

```json
"margins": {
  "initialMarginIbkr": 0.5,
  "initialMarginFutu": 0.6,
  "initialMargin": 0.6,
  "maintenanceMarginIbkr": 0.4,
  "maintenanceMarginFutu": 0.45,
  "maintenanceMargin": 0.45,
  "averageDurationDays": 12.4
}
```

Status: Pass.

### Short Score

Manual/history values:

| Date | Short Score |
|---|---:|
| 2026-06-11 | 90 |
| 2026-06-12 | 78 |

CSV threshold:

```text
<=25 Low
<=50 Moderate
<=75 High
>75 Extreme
```

Generated output:

```json
"shortScore": {
  "value": 78,
  "numChange": -12,
  "percentChange": -13.33,
  "riskFactor": "Extreme"
}
```

Math:

```text
78 - 90 = -12
-12 / 90 * 100 = -13.33%
```

Status: Pass.

## Short Volume History

Raw Chart Exchange values:

| Date | Total Volume `rt` | Short Volume `st` | Long Volume `lt` |
|---|---:|---:|---:|
| 2026-06-11 | 41,569 | 14,881 | 26,688 |
| 2026-06-12 | 104,700 | 59,149 | 45,551 |

Expected:

```text
shortVolumeHistory.date = raw date
shortVolumeHistory.totalVolumeReported = rt
shortVolumeHistory.totalShortVolumeReported = st
shortVolumeHistory.totalLongVolumeReported = lt
exchange columns = matching raw exchange columns
```

Status: Pass.

## FTD History

Raw Chart Exchange values:

| Raw Date | Fails | Change | Price | Settlement Date `t` | Closing Deadline `t_35` | Notional |
|---|---:|---:|---:|---|---|---:|
| 2026-06-11 | 145 | -7,984 | 2.93 | 2026-06-10 | 2026-07-15 | 424.85 |
| 2026-06-12 | 648 | 503 | 3.08 | 2026-06-11 | 2026-07-16 | 1,995.84 |

Generated output:

```json
{
  "records": [
    {
      "settlementDate": "2026-06-10",
      "tradeDate": "2026-06-11",
      "closingDeadline": "2026-07-15",
      "shares": 145,
      "price": 2.93,
      "value": 424.85,
      "change": -7984
    },
    {
      "settlementDate": "2026-06-11",
      "tradeDate": "2026-06-12",
      "closingDeadline": "2026-07-16",
      "shares": 648,
      "price": 3.08,
      "value": 1995.84,
      "change": 503
    }
  ]
}
```

Status: Pass.

## Fintel Ownership Cross-Check

CSV rule:

```text
institutional_owners = count active Fintel security ownership rows where shares > 0
ignore option/call rows
institutional_shares_long = sum active Fintel security ownership shares
institutional_ownership_percent = institutional_shares_long / issuedShare * 100
institutional_value_thousands_usd = sum raw reported values / 1000
```

Raw Fintel security ownership, after filtering:

| Metric | Value |
|---|---:|
| Raw rows | 19 |
| Active non-call rows with shares > 0 | 13 |
| Active shares sum | 1,035,668 |
| Active raw value sum | 2,692,454 |
| Active value in thousands | 2,692.454 |

Generated output:

```json
{
  "institutionalOwners": 13,
  "institutionalSharesLong": 1035668,
  "institutionalHoldingPercent": 0.92,
  "institutionalValue": 2692.454
}
```

Status: Pass.

## Ownership Public Float Cross-Check

Formula:

```text
publicFloat = issuedShare - institutionalSharesLong - strategicEntities
publicFloat = 112,280,000 - 1,035,668 - 7,979,127 = 103,265,205
```

Generated output:

```json
"publicFloat": {
  "shares": 103265205,
  "percent": 91.97
}
```

Status: Pass.

## Internal Float Cross-Check

Formula:

```text
realTradableFloat = issuedShare
  - institutionalSharesLong
  - managementStrategicHoldings
  - tokenizedShares
  - collateralizedShares
```

Expected:

```text
112,280,000 - 1,035,668 - 3,795,837 - 500,000 - 1,000,000 = 105,948,495
```

Generated output:

```json
"realTradableFloat": {
  "shares": 105948495,
  "percentOfIssuedShare": 94.36
}
```

Status: Pass.

## SEC Filing History

Generated file:

```text
data-sync-platform-centralized-v2/history/CURR/sec-filings-history.json
```

The file now includes source watermark metadata:

```json
"sourceWatermarks": {
  "operationsSecFilings": "2026-06-12T23:59:00Z"
}
```

Status: Pass.

## Report Data

Generated file:

```text
reports/CURR/2026-06-12/CURR_report_data.json
```

Market snapshot:

| Field | Expected Source | Status |
|---|---|---|
| Price | `market-current.json.price.value` | Structurally present, but value is null |
| Short Interest Shares | `market-current.json.shortInterest.shares` | Pass |
| SI % | `market-current.json.shortInterest.percent` | Pass |
| Borrow Fee % | `market-current.json.borrowFee.percent` | Pass |
| Available Shares | `market-current.json.availableShares.value` | Pass |
| Utilization % | `market-current.json.utilization.percent` | Pass |
| Days to Cover | `market-current.json.daysToCover.value` | Pass |
| Short Score | `market-current.json.shortScore.value` | Pass |

Ownership snapshot:

| Field | Expected Source | Status |
|---|---|---|
| Issued Share | `ownership-current.json.issuedShare` | Pass |
| Institutional Owners | `ownership-current.json.institutionalOwners` | Pass |
| Institutional Shares | `ownership-current.json.institutionalSharesLong` | Pass |
| Strategic Shares | `ownership-current.json.strategicEntities.shares` | Pass |
| Public Float Shares | `ownership-current.json.publicFloat.shares` | Pass |

Remaining issue:

```json
"sentimentSnapshot": null
```

## Social Sentiment

Expected outputs:

```text
current/CURR/sentiment-current.json
history/CURR/sentiment-events.json
manual-input/stocktwits-sentiment/CURR/YYYY-MM-DD/stocktwits-sentiment.json
```

Status:

- Missing. Cannot validate sentiment overview, platform breakdown, sentiment timeline, feed counts, or report sentiment snapshot.

## AI Analysis

Expected output:

```text
current/CURR/ai-analysis-current.json
```

Status:

- Missing. Cannot validate Short Interest AI Analysis, Lending Pressure AI Analysis, or report narrative sections.

## Priority Fix List

1. Add or clarify current stock price source/value.
2. Add centralized sentiment outputs:
   - `current/CURR/sentiment-current.json`
   - `history/CURR/sentiment-events.json`
   - `manual-input/stocktwits-sentiment/CURR/YYYY-MM-DD/stocktwits-sentiment.json`
3. Add `current/CURR/ai-analysis-current.json`.
4. Populate report `sentimentSnapshot` from centralized sentiment data or a structured empty state.

## Final Recommendation

This centralized v2 package now reconciles well for market, ownership, internal float, short-volume, FTD, and SEC filing history. The earlier manual-input comparison problem is fixed. Backend should next resolve the current-price source and add the missing sentiment and AI domains.
