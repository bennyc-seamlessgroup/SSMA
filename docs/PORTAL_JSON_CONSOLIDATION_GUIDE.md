# Portal JSON Consolidation Guide

This document replaces the earlier idea of rebuilding the whole portal around a complete API set. The current goal is narrower: keep the JSON-based integration, but reorganize the files so backend, operations, and frontend have a stable, efficient contract.

Source reference: `Portal Data Point - Master Table.csv`

## Goal

The portal currently reads many separate JSON files. That worked for prototype speed, but it creates duplication, unclear ownership, and repeated frontend joins/calculations.

Backend should consolidate the data into a small ticker-scoped JSON family:

```text
companies/{ticker}/chart_exchange_market_data.json
companies/{ticker}/fintel_ownership_data.json
companies/{ticker}/manual_user_inputs.json
companies/{ticker}/derived_portal_metrics.json
companies/{ticker}/ai_analysis.json
companies/{ticker}/report_archive_index.json
```

For legacy compatibility during migration, the same files may also be copied to flat names:

```text
{ticker}_chart_exchange_market_data.json
{ticker}_fintel_ownership_data.json
{ticker}_manual_user_inputs.json
{ticker}_derived_portal_metrics.json
{ticker}_ai_analysis.json
{ticker}_report_archive_index.json
```

The folder-based structure is preferred for future multi-ticker support.

## Source Categories

The CSV rows fall into these practical groups:

| Source Type | CSV Count | Backend Handling |
|---|---:|---|
| Chart Exchange vendor data | 31 | Normalize into `chart_exchange_market_data.json` |
| Fintel vendor data | 8 | Normalize into `fintel_ownership_data.json` |
| Manual / operations input | 27 | Store in `manual_user_inputs.json` |
| Backend calculated | 62 | Store in `derived_portal_metrics.json` |
| AI / rule engine | 25 | Store in `ai_analysis.json` |
| Backend static config | 3 | Store in `manual_user_inputs.json` or company config section |
| Blank / deprecated | 3 | Do not include unless reactivated |

The user-facing portal should prefer `derived_portal_metrics.json` for KPI cards, charts, scores, ratios, and display-ready values. Raw source JSONs should remain available for development tables and audit/debug screens.

## Shared JSON Envelope

Every consolidated JSON should use the same top-level envelope:

```json
{
  "schemaVersion": "1.0",
  "ticker": "CURR",
  "companyName": "CURRENC Group Inc.",
  "asOfDate": "2026-06-24",
  "updatedAt": "2026-06-25T08:00:00+08:00",
  "source": "chart_exchange",
  "timezone": "Asia/Hong_Kong",
  "data": {}
}
```

Rules:

- `ticker` must match the monitored company.
- `asOfDate` is the market/reporting date represented by the data.
- `updatedAt` is when backend generated the JSON.
- Use ISO timestamps.
- Use numbers as numbers, not formatted strings.
- Formatting such as `2.63M`, `30.97%`, and `+4.7d` should be derived from numeric values by either backend display fields or frontend formatters.
- All daily time-based values should be generated in a consistent timezone, currently `Asia/Hong_Kong`, unless the user preference overrides display only.

## 1. Chart Exchange Market Data JSON

File:

```text
companies/{ticker}/chart_exchange_market_data.json
```

Purpose:

Vendor-normalized market, short interest, borrow, volume, price, FTD, and dashboard trend data from Chart Exchange.

Recommended structure:

```json
{
  "schemaVersion": "1.0",
  "ticker": "CURR",
  "companyName": "CURRENC Group Inc.",
  "asOfDate": "2026-06-24",
  "updatedAt": "2026-06-25T12:00:00+08:00",
  "source": "chart_exchange",
  "data": {
    "latest": {
      "price": 1.82,
      "tradeVolume": 186000,
      "shortInterest": 940721,
      "shortInterestPercentFloat": 2.88,
      "borrowFeePercent": 30.97,
      "shortableShares": 2630000,
      "utilizationPercent": 76.4,
      "daysToCover": 4.8
    },
    "history": {
      "price": [],
      "tradeVolume": [],
      "shortInterest": [],
      "shortInterestPercentFloat": [],
      "borrowFeePercent": [],
      "shortableShares": [],
      "utilizationPercent": [],
      "daysToCover": [],
      "shortVolume": [],
      "failsToDeliver": []
    },
    "raw": {
      "exchangeVolume": [],
      "shortInterestDaily": [],
      "borrowFeeIb": [],
      "shortVolume": [],
      "failsToDeliver": []
    }
  }
}
```

Mapped CSV data points:

| Data Points | Source / Rule |
|---|---|
| Trade Volume history | Chart Exchange exchange-volume |
| Current Stock Price / Stock Price | Chart Exchange delayed price; CSV notes Tier 3 for live price |
| Short Interest | `data_stocks_short_interest_daily.short_position` |
| SI % Float | Short interest divided by float/shares base |
| Days to Cover | Chart Exchange short-interest daily `Days toCover2` |
| Borrow Fee | Chart Exchange borrow-fee IB `fee`; group by date and keep latest timestamp |
| Shortable Shares / Available Shares | Chart Exchange borrow-fee IB `available`; group by date and keep latest timestamp |
| Utilization | Backend-calculated from short position and latest available shares unless vendor value exists |
| Short Volume fields | Chart Exchange short-volume endpoint |
| FTD fields | Chart Exchange FTD dataset |

Source API / remark mapping from CSV:

| Dataset | API / Source Remark | Backend Normalization Rule |
|---|---|---|
| Trade Volume history | `get/data/stocks/exchange-volume/` | Store as `history.tradeVolume`; keep date, volume, and source timestamp where available |
| Short Interest / SI % Float / Days to Cover | `https://chartexchange.com/api/v1/data/stocks/short-interest-daily/?symbol=US%3A{ticker}&ordering=-date&format=csv&api_key=` | Normalize `short_position` to `shortInterest`; normalize `Days toCover2` to `daysToCover`; FINRA-style short-interest data may update bi-weekly even if checked daily |
| Borrow Fee | `https://chartexchange.com/api/v1/data/stocks/borrow-fee/ib/?symbol=US%3A{ticker}&format=csv&api_key=` | Group by date and select latest timestamp of the day; use `fee` as `borrowFeePercent` |
| Shortable Shares / Available Shares | Same borrow-fee IB endpoint above | Group by date and select latest timestamp of the day; use `available` as `shortableShares` |
| Short Volume | `https://chartexchange.com/api/v1/data/stocks/short-volume/?symbol=US%3A{ticker}&mode=V&ordering=-date&format=csv&api_key=` | Normalize all CSV short-volume fields into `history.shortVolume`; preserve venue-level fields |
| Fails-to-Deliver | CSV lists FTD fields with Chart Exchange as source, period from 2004 onward | Normalize settlement date, fails-to-deliver, price, trade date, T+35C closing deadline, notional, and FTD change |
| Current Stock Price | Chart Exchange delayed price; CSV says delayed 30 minutes and Tier 3 needed for live price | Store latest delayed price in `latest.price` and price series in `history.price` |

Short-volume fields from CSV:

```text
SV-Date
SV-Total Volume Reported
SV-Total Short Volume Reported
SV-Total Long Volume Reported
SV-Off Exchange Non-Exempt
SV-Off Exchange Exempt
SV-Nasdaq BX
SV-Nasdaq PHLX
SV-NYSE
SV-NYSE Arca
SV-NYSE National
SV-NYSE American
SV-CHX
SV-Cboe EDGX
SV-Cboe BZX
SV-Cboe EDGA
SV-Cboe BYX
```

FTD fields from CSV:

```text
Settlement Date (T+B)
Fails-to-Deliver
Price
Trade Date (T)
Closing Deadline (T+35C)
$ Notional
FTD Change
```

Update frequency:

- Daily next day around `08:00-12:00 HKT`, depending on dataset availability.
- Social/high-frequency feeds should not be placed here.

## 2. Fintel Ownership Data JSON

File:

```text
companies/{ticker}/fintel_ownership_data.json
```

Purpose:

Vendor-normalized institutional ownership, beneficial owner, insider, and ownership history records from Fintel.

Recommended structure:

```json
{
  "schemaVersion": "1.0",
  "ticker": "CURR",
  "companyName": "CURRENC Group Inc.",
  "asOfDate": "2026-06-24",
  "updatedAt": "2026-06-25T08:00:00+08:00",
  "source": "fintel",
  "data": {
    "summary": {
      "institutionalOwners": 0,
      "institutionalSharesLong": 0,
      "institutionalValueThousandsUsd": 0,
      "averagePortfolioAllocationPercent": 0
    },
    "securityOwnershipRecords": [],
    "activistFilingsRecords": [],
    "institutionBreakdown": [],
    "insiderBreakdown": [],
    "raw": {
      "securityOwnership": [],
      "beneficialOwnership": []
    }
  }
}
```

Mapped CSV data points:

| Data Points | Source / Rule |
|---|---|
| Institutional Owners | Count active unique `owners__securityName` rows where shares > 0 |
| Institutional Shares Long | Sum `owners__shares` for active rows |
| Institutional Value | Sum `owners__value`; display may divide by 1,000 |
| Average Portfolio Allocation | Mean of active `owners__allocation` values |
| Security Ownership Records | Fintel security ownership endpoint |
| Activist Filings Records | Fintel beneficial ownership endpoint |
| Insiders Ownership History | Fintel `/bo` endpoint |

Source API / remark mapping from CSV:

| Dataset | API / Source Remark | Backend Normalization Rule |
|---|---|---|
| Security Ownership / institutional records | `https://api.fintel.io/data/v/0.0/so/{country}/{symbol}` | Store raw records in `raw.securityOwnership`; normalize rows into `securityOwnershipRecords` |
| Institutional Owners | Same `/so/{country}/{symbol}` endpoint | Count unique active `owners__securityName`; exclude call-option rows |
| Institutional Shares Long | Same `/so/{country}/{symbol}` endpoint | Sum `owners__shares`; exclude rows where `owners__putCall = Call` |
| Institutional Value | Same `/so/{country}/{symbol}` endpoint | Sum `owners__value`; exclude rows where `owners__putCall = Call`; display may divide by 1,000 |
| Average Portfolio Allocation | Same `/so/{country}/{symbol}` endpoint | Mean of active `owners__allocation`; exclude call-option rows |
| Institutions Ownership | Same `/so/{country}/{symbol}` endpoint | Same source as institutional shares long; use as institutional ownership numerator |
| Insiders Ownership History | `https://api.fintel.io/data/v/0.0/so/{country}/{symbol}/bo` | Store raw records in `raw.beneficialOwnership`; normalize into insider/activist history records |
| Activist Filings Records | Same `/bo` endpoint | Normalize beneficial-owner/activist records separately from institutional security ownership records |

Required exclusion rule:

```text
Ignore records where owners__putCall = Call.
```

Rationale:

Call-option records are not actual share ownership and should not be included in ownership totals or holder breakdowns.

## 3. Manual User Inputs JSON

File:

```text
companies/{ticker}/manual_user_inputs.json
```

Purpose:

All operations/user-entered values that are not reliably available from a vendor feed.

Recommended structure:

```json
{
  "schemaVersion": "1.0",
  "ticker": "CURR",
  "companyName": "CURRENC Group Inc.",
  "asOfDate": "2026-06-24",
  "updatedAt": "2026-06-25T11:00:00+08:00",
  "source": "manual_input",
  "data": {
    "companyConfig": {
      "companyName": "CURRENC Group Inc.",
      "stockCode": "CURR",
      "sharesOutstanding": 112280000
    },
    "brokerInputs": {
      "daily": [
        {
          "date": "2026-06-24",
          "initialMarginPercent": 150,
          "maintenanceMarginPercent": 100,
          "averageDurationDays": 4.8,
          "sourceBroker": "IBKR"
        }
      ]
    },
    "internalFloatInputs": {
      "managementStrategicHoldings": [],
      "tokenizedShares": [],
      "collateralizedShares": [],
      "discardedSuggestions": [],
      "activityLog": []
    },
    "socialManualInputs": {
      "stocktwits": []
    },
    "secFilingsManualInputs": []
  }
}
```

Mapped CSV data points:

| Data Points | Handling |
|---|---|
| Shares Outstanding | Manual unless Chart Exchange Tier 2 or another trusted API is available |
| Short Score | Manual only if backend calculation is not available |
| Available Shares from Futu / broker sources | Manual/broker input if not available from Chart Exchange |
| Utilization if manually overridden | Manual input, otherwise backend calculate |
| Initial Margin / Maintenance Margin | Manual daily broker input |
| Average Duration (D) | Manual daily broker input |
| Insiders Ownership | Manual/internal input if not sourced from Fintel |
| Private / strategic holders | Manual internal float input |
| Tokenized shares and providers | Manual internal float input |
| SEC Filings | Manual operations input until automated SEC integration exists |
| Stocktwits Feed | Manual operations upload until automated source exists |

Source/API remark mapping from CSV:

| Dataset | Source Remark | Backend Handling |
|---|---|---|
| Shares Outstanding | Based on SEC record, Chart Exchange portal, or Chart Exchange Tier 2 plan | Store in `companyConfig.sharesOutstanding`; include `sourceNote` so backend knows whether it came from manual SEC review or vendor |
| Short Score | Manual input or backend calculation | Prefer backend calculation in `derived_portal_metrics.json`; keep manual override here only if required |
| Available Shares from Futu | CSV lists Futu as user-input source | Store broker-specific available-share rows if operations inputs them; do not merge blindly with Chart Exchange IBKR values |
| Utilization | Manual input or backend calculation | Prefer derived calculation from official short position and latest available shares; store manual override only when explicitly entered |
| Initial Margin | IBKR and FUTU manual inputs | Store daily broker rows under `brokerInputs.daily`; allow multiple broker sources per date |
| Maintenance Margin | IBKR and FUTU manual inputs | Store daily broker rows under `brokerInputs.daily`; frontend can show aggregate/latest selected value |
| Average Duration (D) | IBKR manual input | Store as `averageDurationDays` by date and broker/source |
| Stocktwits Feed | Input by internal staff using Stocktwits live JSON | Store raw uploaded/entered Stocktwits records under `socialManualInputs.stocktwits` |
| SEC Filings | Input by internal staff after checking SEC portal | Store normalized filing rows under `secFilingsManualInputs` until automated SEC ingestion exists |

Important:

- Keep activity logs append-only.
- Do not store per-user internal float values if the workspace/ticker should be shared across users.
- Store `createdBy`, `updatedBy`, `createdAt`, and `updatedAt` for editable records.

## 4. Derived Portal Metrics JSON

File:

```text
companies/{ticker}/derived_portal_metrics.json
```

Purpose:

Frontend-ready values. Backend owns these calculations so the portal does not repeat business logic.

Recommended structure:

```json
{
  "schemaVersion": "1.0",
  "ticker": "CURR",
  "companyName": "CURRENC Group Inc.",
  "asOfDate": "2026-06-24",
  "updatedAt": "2026-06-25T12:10:00+08:00",
  "source": "backend_calculated",
  "data": {
    "dashboard": {
      "kpis": {},
      "trendOverview": [],
      "events": []
    },
    "shortInterest": {
      "score": {},
      "snapshotCards": [],
      "trendCharts": {}
    },
    "lendingPressure": {
      "score": {},
      "snapshotCards": [],
      "trendCharts": {}
    },
    "ownership": {
      "summaryCards": [],
      "ownershipStructure": [],
      "institutionBreakdown": [],
      "insiderBreakdown": [],
      "publicFloatBreakdown": []
    },
    "internalFloat": {
      "sharesOutstanding": 0,
      "marketTradableFloat": 0,
      "internalFloat": 0,
      "realTradableFloat": 0,
      "floatReductionPercent": 0,
      "breakdowns": {}
    },
    "socialSentiment": {
      "overview": {},
      "platformBreakdown": [],
      "sentimentDistribution": {},
      "timeline": []
    },
    "reports": {
      "numberOfReports": 0,
      "numberOfDailyReportWindows": 0,
      "latestDate": null,
      "history": []
    }
  }
}
```

Mapped CSV data points:

| Data Points | Handling |
|---|---|
| All `numbers+-`, `pts+-`, and `% change` fields | Calculate from current vs comparison period |
| Score types | Calculate from score thresholds |
| Ownership Structure | Calculate from shares outstanding, institutional shares, internal float, and manual inputs |
| Public Float / Real Tradable Float | Calculate consistently across Ownership and Internal Float |
| Lending Pressure Score | Calculate from lending snapshot metrics |
| Short Interest Trend / Borrow Fee Trend / Shortable Shares Trend | Produce chart-ready series |
| Sentiment Score / Ratios / Platform Breakdown / Trend | Calculate from social feed records |
| Report counts/history | Calculate from report archive files |

Calculation rule examples:

```text
changeValue = currentValue - previousValue
changePercent = previousValue == 0 ? null : (changeValue / previousValue) * 100

institutionalOwnershipPercent = institutionalSharesLong / sharesOutstanding * 100

marketTradableFloat = sharesOutstanding - institutionalSharesLong
internalFloat = managementStrategicHoldings + tokenizedShares + collateralizedShares
realTradableFloat = sharesOutstanding - institutionalSharesLong - internalFloat
floatReductionPercent = internalFloat / sharesOutstanding * 100

sentimentScore:
positive = 100
neutral = 50
negative = 0
score = average(recordScores)
```

The backend should preserve both numeric values and display hints:

```json
{
  "value": 30.97,
  "unit": "percent",
  "changeValue": -56.77,
  "changeUnit": "pts",
  "changePercent": -64.7,
  "comparisonLabel": "vs yesterday",
  "status": "high"
}
```

This lets the frontend render consistent cards without recalculating business logic.

Derived field source dependencies from CSV remarks:

| Derived Area | Inputs | Rule / Remark |
|---|---|---|
| Short interest changes | Chart Exchange short-interest daily | Compare latest value with selected prior period; output number and percent changes |
| Borrow fee changes | Chart Exchange borrow-fee IB latest daily row | Compare latest daily fee against prior comparison period; output points and percent changes |
| Shortable shares changes | Chart Exchange borrow-fee IB latest daily row and/or manual broker inputs | Compare latest available shares against prior comparison period |
| Utilization | Official short position plus last available shares of day | `Utilization (%) = Official Short Position / (Official Short Position + Last Available of the Day) * 100` |
| Float reduction | Internal float and market float/share base | CSV remark: `internal float / market float`; if using shares outstanding as base, document the chosen denominator |
| Sentiment score | Social feed positive/neutral/negative counts | Positive = 100, neutral = 50, negative = 0, average over selected period |
| Ownership structure | Fintel ownership plus manual internal float inputs | Exclude call-option records; combine with shares outstanding and internal float records |

## 5. AI Analysis JSON

File:

```text
companies/{ticker}/ai_analysis.json
```

Purpose:

AI and rule-engine narrative content. Keep this separate from numeric data so text can be regenerated without changing market data files.

Recommended structure:

```json
{
  "schemaVersion": "1.0",
  "ticker": "CURR",
  "companyName": "CURRENC Group Inc.",
  "asOfDate": "2026-06-24",
  "updatedAt": "2026-06-25T12:30:00+08:00",
  "source": "ai_rule_engine",
  "data": {
    "shortInterest": {
      "aiAnalysis": "",
      "managementWatchItems": []
    },
    "lendingPressure": {
      "aiAnalysis": "",
      "positiveContributors": [],
      "negativeContributors": []
    },
    "reports": {
      "executiveSummary": "",
      "companyOverview": "",
      "sharePriceAnalysis": "",
      "shortSellingAnalysis": "",
      "institutionalOwnershipAnalysis": "",
      "insiderActivity": "",
      "ftdAnalysis": "",
      "valuationAssessment": "",
      "tokenizationStrategy": "",
      "riskFactors": "",
      "conclusionRecommendations": ""
    }
  }
}
```

Mapped CSV data points:

- Short Interest Current Interpretation
- Short Interest Management Watch Items
- Lending Pressure positive/negative contributors
- Lending Pressure AI Lending Analysis
- Report sections 1 through 11

Source/API remark mapping from CSV:

| Content Area | CSV Remark | Backend Handling |
|---|---|---|
| Short Interest Current Interpretation | AI Engine | Generate text from current short metrics and trends; store final display paragraph/string |
| Short Interest Management Watch Items | Rule Engine | Generate deterministic watch items from thresholds; store array of concise items |
| Lending Pressure Positive Contributors | Rule Engine | Generate from lending pressure input drivers |
| Lending Pressure Negative Contributors | Rule Engine | Generate from lending pressure input drivers |
| Lending Pressure AI Lending Analysis | AI Engine | Generate final paragraph/string for the Lending Pressure AI Analysis section |
| Daily report sections | AI Engine / Rule Engine | Store report text blocks separately from page-level AI analysis |

Until AI is fully integrated, placeholder text should be explicitly marked:

```text
PENDING FOR LLM integration
```

## 6. Report Archive Index JSON

File:

```text
companies/{ticker}/report_archive_index.json
```

Purpose:

Report Archive page metadata. This file should not contain full report content.

Recommended structure:

```json
{
  "schemaVersion": "1.0",
  "ticker": "CURR",
  "companyName": "CURRENC Group Inc.",
  "updatedAt": "2026-06-25T19:15:00+08:00",
  "source": "report_pipeline",
  "data": {
    "latestReport": {
      "date": "2026-06-24",
      "window": "post_market",
      "time": "19:00"
    },
    "history": [
      {
        "date": "2026-06-24",
        "reports": {
          "pre_market": {
            "available": true,
            "time": "08:00",
            "dataPath": "report_data/2026-06-24/CURR_pre_market_report_data.json"
          },
          "midday": {
            "available": true,
            "time": "11:50",
            "dataPath": "report_data/2026-06-24/CURR_midday_report_data.json"
          },
          "post_market": {
            "available": true,
            "time": "19:00",
            "dataPath": "report_data/2026-06-24/CURR_report_data.json"
          }
        }
      }
    ]
  }
}
```

Mapped CSV data points:

- Number of Reports
- Number of Daily Report Windows
- Report Latest Date
- Report History

## Social Data Handling

The CSV includes Reddit, X, Facebook, LinkedIn, and Stocktwits feeds. Operationally:

- KWatch-managed feeds should remain under social-data prefixes and be consolidated into `derived_portal_metrics.json` for overview/timeline values.
- Stocktwits remains operations/manual input until automated.
- The raw social feed can remain as append-only source files because frequency can be high.

Source/API remark mapping from CSV:

| Platform | Source Remark | Update Frequency | Backend Handling |
|---|---|---|---|
| Reddit | KWatch alert and API webhook to S3 | High frequency, 1 second to 1 minute | Store raw webhook records under a hotkey-specific `social-data/` prefix; aggregate into derived sentiment metrics |
| X | KWatch alert and API webhook to S3 | Low frequency, 10 minutes to 1 hour | Same as Reddit; platform should be assigned by hotkey mapping |
| Facebook | KWatch alert and API webhook to S3 | Low frequency, 10 minutes to 1 hour | Same as Reddit; platform should be assigned by hotkey mapping |
| LinkedIn | KWatch alert and API webhook to S3 | Medium frequency, 1 minute to 10 minutes | Same as Reddit; platform should be assigned by hotkey mapping |
| Stocktwits | Input by internal staff using Stocktwits live JSON | Daily next day 11:00 HKT | Store in `manual_user_inputs.json` under `socialManualInputs.stocktwits` |

Recommended raw location:

```text
social-data/{hotkey-or-platform-prefix}/YYYY-MM-DD.json
```

Recommended derived consolidation:

```json
{
  "socialSentiment": {
    "overview": {
      "score": 80,
      "label": "Bullish",
      "changeValue": 30,
      "comparisonLabel": "vs previous 6M",
      "recordCount": 75
    },
    "platformBreakdown": [
      { "platform": "X", "recordCount": 29, "score": 88, "label": "Bullish", "contributionPercent": 39 },
      { "platform": "Reddit", "recordCount": 10, "score": 53, "label": "Neutral", "contributionPercent": 13 },
      { "platform": "Stocktwits", "recordCount": 36, "score": 81, "label": "Bullish", "contributionPercent": 48 }
    ],
    "timeline": []
  }
}
```

## Page-to-JSON Usage

| Portal Page | Primary JSONs |
|---|---|
| Dashboard | `chart_exchange_market_data.json`, `manual_user_inputs.json`, `derived_portal_metrics.json` |
| Ownership | `fintel_ownership_data.json`, `manual_user_inputs.json`, `derived_portal_metrics.json` |
| Short Interest | `chart_exchange_market_data.json`, `derived_portal_metrics.json`, `ai_analysis.json` |
| Lending Pressure | `chart_exchange_market_data.json`, `manual_user_inputs.json`, `derived_portal_metrics.json`, `ai_analysis.json` |
| Internal Float | `manual_user_inputs.json`, `fintel_ownership_data.json`, `derived_portal_metrics.json` |
| Social Sentiment | social raw prefixes, `manual_user_inputs.json`, `derived_portal_metrics.json` |
| SEC Filings | `manual_user_inputs.json` until automated |
| Report Archive | `report_archive_index.json` |

## Backend Generation Order

Recommended daily order:

1. Pull Chart Exchange data.
2. Pull Fintel data.
3. Load current manual input JSON.
4. Normalize vendor data into source JSONs.
5. Calculate derived portal metrics.
6. Run rule engine and AI engine.
7. Generate report archive index.
8. Upload JSON files atomically to S3.

Atomic upload rule:

- Generate to a temp object or local temp file.
- Validate JSON.
- Upload final object only after validation passes.
- Do not expose half-written JSON to the portal.

## Versioning and Update Detection

Every file should include:

```json
{
  "schemaVersion": "1.0",
  "updatedAt": "2026-06-25T12:00:00+08:00",
  "contentVersion": "sha256-or-etag"
}
```

The portal update detector should compare content version or object ETag, not only last modified time. If a file is re-uploaded with identical content, the portal should not show the red update dot.

## Migration Plan

Phase 1:

- Backend generates the consolidated JSONs in parallel with existing files.
- Frontend keeps current JSON readers.
- Development data tables show both old and consolidated JSONs for comparison.

Phase 2:

- Move Dashboard, Short Interest, Lending Pressure, Ownership, Internal Float, and Social Sentiment pages to read `derived_portal_metrics.json` plus raw source files only where tables need them.

Phase 3:

- Remove old page-specific JSON files after verification.
- Keep only ticker-scoped consolidated JSONs.

Phase 4:

- Optionally replace JSON reads with APIs later, using the same schema sections as response payloads.

## Fields Not Recommended

The following should not be carried forward unless the business reactivates them:

- On Loan Share
- Loan Value
- Blank/deprecated rows in the CSV
- Duplicate page-specific versions of the same metric

## Backend Ownership Summary

Backend should own:

- Vendor ingestion
- Source normalization
- De-duplication
- Exclusion rules
- Change calculations
- Score calculations
- Chart-ready series
- Social aggregation
- AI/rule-engine output packaging
- JSON versioning

Frontend should own:

- Layout
- Formatting
- User interactions
- Timezone display conversion
- Dev-mode JSON table rendering

Frontend should not own:

- Business calculations
- Source reconciliation
- Vendor-specific parsing
- Duplicate removal
- Ownership or float math rules
