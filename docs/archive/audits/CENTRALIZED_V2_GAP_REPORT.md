# Centralized V2 Data Gap Report

Review date: 2026-07-14  
Reviewed folder:

```text
data-sync-platform-centralized-v2/
```

Reference inputs:

- `DATA_STRUCTURE.md`
- `newest datapoint csv/Portal Data Point - Master Table (1).csv`
- Current portal modules and manual-input workflow

## Executive Summary

The latest `data-sync-platform-centralized-v2/` update closes several prior data-quality gaps. The package now includes prior-day manual inputs for key fields, which makes comparison values much more meaningful.

Newly fixed in this update:

1. Manual-input files are reorganized into a cleaner structure:
   - ticker-level files for stable records such as profile, hotkeys, issued share, management holdings, internal float inputs, and SEC filings
   - dated files for daily market inputs such as manual availability, margins, utilization, and short score
2. Prior-day manual inputs now exist for:
   - manual availability
   - margins
   - utilization
   - short score
3. Available-shares change is now comparable:
   - `3,000,000` on 2026-06-11
   - `2,500,000` on 2026-06-12
   - change: `-500,000`, `-16.67%`
4. Utilization change is now comparable:
   - `92.5%` on 2026-06-11
   - `85.5%` on 2026-06-12
   - change: `-7 pts`, `-7.57%`
5. Short score change is now comparable:
   - `90` on 2026-06-11
   - `78` on 2026-06-12
   - change: `-12`, `-13.33%`
6. SEC filings history now includes `sourceWatermarks`.

Remaining major gaps:

1. Current stock price is still missing/null.
2. Social Sentiment current snapshot is still missing.
3. Social Sentiment historical event feed is still missing.
4. AI analysis current snapshot is still missing.
5. Stocktwits manual sentiment input is still missing.
6. Report data still has `sentimentSnapshot: null`.

## Current Folder Inventory

| Domain | Status | Notes |
|---|---|---|
| `chartexchange/` | Present | Raw vendor files for `2026-06-11` and `2026-06-12`. |
| `fintel/` | Present | Raw vendor files for `2026-06-11` and `2026-06-12`. |
| `current/CURR/` | Present | Company, market, ownership, and internal-float snapshots exist. Sentiment and AI snapshots do not. |
| `history/CURR/` | Present | Market, short volume, FTD, ownership, and SEC filings history exist. Sentiment events do not. |
| `manual-input/` | Present | Most manual/operation input domains exist. Stocktwits sentiment input is missing. |
| `reports/CURR/` | Present | Daily report JSON file and report index exist. Report sentiment snapshot is null. |

## Manual Input Structure Review

The manual-input layout is now stronger because stable records are separated from daily records.

### Stable Manual Inputs

| Domain | File | Status |
|---|---|---|
| Institutional owner security name | `manual-input/institutional-owner/CURR/security-name.json` | Present |
| Hotkeys | `manual-input/hotkeys/CURR/hotkeys.json` | Present |
| Issued Share | `manual-input/issued-share/CURR/issued-share.json` | Present |
| Management Holdings | `manual-input/management-holdings/CURR/management-holdings.json` | Present |
| Internal Float Inputs | `manual-input/internal-float-inputs/CURR/internal-float-inputs.json` | Present |
| Company Profile | `manual-input/profile/CURR/profile.json` | Present |
| SEC Filings | `manual-input/sec-filings/CURR/sec-filings.json` | Present |

### Daily Manual Inputs

| Domain | Dates | Status |
|---|---|---|
| Manual Availability | 2026-06-11, 2026-06-12 | Present |
| Margins | 2026-06-11, 2026-06-12 | Present |
| Utilization | 2026-06-11, 2026-06-12 | Present |
| Short Score | 2026-06-11, 2026-06-12 | Present |

This is the right direction because daily inputs can produce clean period-over-period changes, while stable inputs do not need unnecessary date folders.

## Reconciled Outputs

### Market Current

File:

```text
data-sync-platform-centralized-v2/current/CURR/market-current.json
```

Key values reconcile:

| Field | Output | Status |
|---|---:|---|
| Short Interest Shares | 906,502 | Pass |
| SI % | 8.58 | Pass |
| Borrow Fee % | 29.153 | Pass |
| Shortable Shares | 2,500,000 | Pass |
| Shortable Shares Change | -500,000 / -16.67% | Pass |
| Utilization % | 85.5 | Pass |
| Utilization Change | -7 pts / -7.57% | Pass |
| Days to Cover | 2.84 | Pass |
| Initial Margin | 0.6 | Pass |
| Maintenance Margin | 0.45 | Pass |
| Average Duration Days | 12.4 | Pass |
| Short Score | 78 | Pass |
| Short Score Change | -12 / -13.33% | Pass |

Still open:

| Field | Output | Status |
|---|---:|---|
| Price | null | Missing source/value |

### Market History

File:

```text
data-sync-platform-centralized-v2/history/CURR/market-history.json
```

Manual market-history fields are now populated for both sample dates:

| Trade Date | Shortable Shares | Utilization | Short Score | Initial Margin | Maintenance Margin | Avg Duration |
|---|---:|---:|---:|---:|---:|---:|
| 2026-06-11 | 3,000,000 | 92.5 | 90 | 0.65 | 0.48 | 15.2 |
| 2026-06-12 | 2,500,000 | 85.5 | 78 | 0.60 | 0.45 | 12.4 |

Status: Pass.

### FTD History

File:

```text
data-sync-platform-centralized-v2/history/CURR/ftd-history.json
```

Raw FTD values:

| Raw Date | Fails | Change | Price | Settlement Date `t` | Closing Deadline `t_35` | Notional |
|---|---:|---:|---:|---|---|---:|
| 2026-06-11 | 145 | -7,984 | 2.93 | 2026-06-10 | 2026-07-15 | 424.85 |
| 2026-06-12 | 648 | 503 | 3.08 | 2026-06-11 | 2026-07-16 | 1,995.84 |

Generated values:

| Trade Date | Settlement Date | Closing Deadline | Shares | Price | Value | Change |
|---|---|---|---:|---:|---:|---:|
| 2026-06-11 | 2026-06-10 | 2026-07-15 | 145 | 2.93 | 424.85 | -7,984 |
| 2026-06-12 | 2026-06-11 | 2026-07-16 | 648 | 3.08 | 1,995.84 | 503 |

Status: Pass.

### Ownership Current

File:

```text
data-sync-platform-centralized-v2/current/CURR/ownership-current.json
```

Key values reconcile:

| Field | Value |
|---|---:|
| Issued Share | 112,280,000 |
| Institutional Owners | 13 |
| Institutional Shares Long | 1,035,668 |
| Institutional Holding % | 0.92% |
| Institutional Value | 2,692.454 |
| Strategic Entities | 7,979,127 |
| Public Float | 103,265,205 |

Public float formula:

```text
publicFloat = issuedShare - institutionalSharesLong - strategicEntities
103,265,205 = 112,280,000 - 1,035,668 - 7,979,127
```

Status: Pass.

### Internal Float Current

File:

```text
data-sync-platform-centralized-v2/current/CURR/internal-float-current.json
```

Real tradable float formula reconciles:

```text
realTradableFloat = issuedShare
  - institutionalSharesLong
  - managementStrategicHoldings
  - tokenizedShares
  - collateralizedShares

105,948,495 = 112,280,000 - 1,035,668 - 3,795,837 - 500,000 - 1,000,000
```

Status: Pass.

## Current Issues

### Issue 1: Current Stock Price Is Null

Files:

```text
data-sync-platform-centralized-v2/current/CURR/market-current.json
data-sync-platform-centralized-v2/reports/CURR/2026-06-12/CURR_report_data.json
```

Current values:

```json
"price": {
  "value": null,
  "asOf": "2026-06-12T20:00:00Z",
  "source": "Chart Exchange"
}
```

and:

```json
"marketSnapshot": {
  "price": null
}
```

Portal impact:

- Dashboard Trend Overview and report market snapshot cannot show current price from centralized v2.
- If price is intentionally not available from the current vendor files, backend should either:
  - add a proper price source,
  - keep `price.value: null` but change provenance/source text so it does not imply the value was pulled from Chart Exchange,
  - or add a structured missing-data reason.

Recommended structured pattern:

```json
"price": {
  "value": null,
  "asOf": null,
  "source": null,
  "status": "missing",
  "reason": "No current stock price source file included in centralized v2 sample."
}
```

## Remaining Critical Gaps

### Gap 1: Missing Social Sentiment Current Snapshot

Expected file:

```text
data-sync-platform-centralized-v2/current/CURR/sentiment-current.json
```

Current status:

- Missing.

Portal impact:

- Social Sentiment overview cannot be fully powered by centralized v2.
- Overall sentiment, platform breakdown, sentiment distribution, and timeframe comparison are unavailable from this folder.
- Report data cannot include a sentiment summary.

Recommended output:

```json
{
  "schemaVersion": 1,
  "ticker": "CURR",
  "generatedAt": "2026-06-12T23:59:00Z",
  "periods": {
    "1D": {
      "start": "2026-06-12T00:00:00Z",
      "end": "2026-06-12T23:59:59Z",
      "totalMentions": 0,
      "overallSentimentScore": null,
      "overallSentimentLabel": "No data",
      "previousPeriodChange": {
        "label": "previous 1D",
        "scoreChange": null
      },
      "distribution": {
        "positiveCount": 0,
        "neutralCount": 0,
        "negativeCount": 0,
        "positivePercent": 0,
        "neutralPercent": 0,
        "negativePercent": 0
      },
      "platformBreakdown": [],
      "timeline": []
    }
  }
}
```

Generate this file even when there is no sentiment data. Missing file and empty data are different states.

### Gap 2: Missing Social Sentiment Event History

Expected file:

```text
data-sync-platform-centralized-v2/history/CURR/sentiment-events.json
```

Current status:

- Missing.

Portal impact:

- Social Sentiment feed cannot be built from centralized v2.
- Timeline bars cannot be calculated from centralized v2.
- Platform tabs/counts cannot be generated for X, Reddit, Facebook, LinkedIn, and Stocktwits.

Recommended output:

```json
{
  "schemaVersion": 1,
  "ticker": "CURR",
  "generatedAt": "2026-06-12T23:59:00Z",
  "records": []
}
```

Each record should use a stable ID/hash and normalized platform name:

- `X`
- `Reddit`
- `Facebook`
- `LinkedIn`
- `Stocktwits`

### Gap 3: Missing AI Analysis Current Snapshot

Expected file:

```text
data-sync-platform-centralized-v2/current/CURR/ai-analysis-current.json
```

Current status:

- Missing.

Portal impact:

- Short Interest AI Analysis has no centralized source.
- Lending Pressure AI Analysis has no centralized source.
- Daily report AI/rule-engine text is not separated from numeric data.

Recommended output:

```json
{
  "schemaVersion": 1,
  "ticker": "CURR",
  "generatedAt": "2026-06-12T23:59:00Z",
  "shortInterest": {
    "analysis": "PENDING FOR LLM integration"
  },
  "lendingPressure": {
    "analysis": "PENDING FOR LLM integration",
    "positiveContributors": [],
    "negativeContributors": []
  },
  "dailyReport": {
    "executiveSummary": "PENDING FOR LLM integration",
    "companyOverview": "PENDING FOR LLM integration",
    "sharePriceAnalysis": "PENDING FOR LLM integration",
    "shortSellingDataAnalysis": "PENDING FOR LLM integration"
  }
}
```

### Gap 4: Missing Stocktwits Manual Sentiment Input

Expected file:

```text
data-sync-platform-centralized-v2/manual-input/stocktwits-sentiment/CURR/YYYY-MM-DD/stocktwits-sentiment.json
```

Current status:

- Missing.

Portal impact:

- Stocktwits is currently the manual-upload social platform in the portal.
- Without this file, centralized v2 cannot reproduce the current Social Sentiment page.

Recommended output:

```json
{
  "schemaVersion": 1,
  "ticker": "CURR",
  "tradeDate": "2026-06-12",
  "generatedAt": "2026-06-12T23:59:00Z",
  "records": []
}
```

### Gap 5: Report Data Sentiment Snapshot Is Null

File:

```text
data-sync-platform-centralized-v2/reports/CURR/2026-06-12/CURR_report_data.json
```

Current value:

```json
"sentimentSnapshot": null
```

Portal impact:

- Report Archive can show the report file, but the report generator cannot produce a complete social/narrative section from centralized v2.

Recommended fix:

- Populate from `current/CURR/sentiment-current.json`.
- If sentiment is not available yet, use a structured empty state rather than `null`.

## Final Priority List

1. Add or clarify current stock price source/value.
2. Add `current/CURR/sentiment-current.json`.
3. Add `history/CURR/sentiment-events.json`.
4. Add `current/CURR/ai-analysis-current.json`.
5. Add `manual-input/stocktwits-sentiment/CURR/YYYY-MM-DD/stocktwits-sentiment.json`.
6. Replace report `sentimentSnapshot: null` with structured sentiment data or a structured empty state.
