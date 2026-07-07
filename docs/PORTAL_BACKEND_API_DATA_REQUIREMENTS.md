# Portal Backend API Data Requirements

Last updated: 2026-07-07

Source spreadsheet:

```text
/Users/bennycheung/Downloads/Portal Data Point - Master Table.csv
```

This document converts the portal data-point master table into backend/API requirements. It is intended for the backend team to use as the authoritative implementation brief when replacing JSON/S3 reads and local user-input JSON writes with API-backed database services.

## Goal

The portal should stop depending on page-specific JSON files as the long-term source of truth. The backend should provide API endpoints and database tables that cover:

- Vendor-ingested market, ownership, lending, short-sale, sentiment, SEC, and FTD data.
- User-entered operational data such as internal float assumptions, Stocktwits feed uploads, SEC filings, margin inputs, and company configuration.
- Backend-calculated values such as ratios, deltas, score labels, trends, breakdowns, and summary cards.
- AI/rule-engine outputs such as short-interest interpretation, lending analysis, report sections, and watch items.

The frontend should be able to request all portal page data through APIs by `ticker`, date range, and optional workspace/company context.

## Source Categories

| Code | Meaning | Backend responsibility |
|---|---|---|
| `A: Vendor` | Data from external vendors such as Chart Exchange, Fintel, KWatch, SEC, IBKR/FUTU. | Ingest, normalize, dedupe, store vendor raw records, and publish normalized API responses. |
| `B: User Input` | Data entered by operations team or authorized users. | Provide authenticated CRUD APIs, audit logs, validation, and workspace/company scoping. |
| `C: Backend Calculate` | Derived metrics calculated from vendor/user-input data. | Calculate server-side. Frontend should not recompute production values except display formatting. |
| `D: AI Engine / Rule Engine` | AI-generated or rules-generated narrative and report text. | Store generated output with version, prompt/model/rule metadata, and source data references. |
| `E: Backend` | Static/configuration backend-owned data. | Store in backend company/config tables. |

## Master Row Counts

| Source | Count |
|---|---:|
| Vendor | 41 |
| User Input | 27 |
| Backend Calculate | 62 |
| AI / Rule Engine | 25 |
| Backend Static | 3 |
| Unclassified / needs confirmation | 3 |

## Backend Build Instructions For LLM/API Team

Use this document as the product data contract, not as a UI styling brief. The backend team should create database tables, ingestion jobs, calculation services, and authenticated APIs that satisfy every row in the Complete Data Point Catalog.

Required implementation outputs:

- A database schema covering every vendor, user-input, backend-calculated, and AI/rule-engine data point.
- Read APIs for every user-facing portal page so the frontend no longer depends on S3 JSON files.
- Write APIs for every operations/backend-portal input flow.
- Scheduled ingestion workers for vendor data according to the CSV update frequency.
- Calculation workers/services for all derived rows marked Backend Calculate.
- AI/rule-engine jobs for rows marked AI / Rule Engine, with generated content stored and versioned.
- Source-version and audit metadata for every response so the frontend can show page-specific last update times and update indicators.

Do not expose vendor names, raw vendor API URLs, or internal calculation details in end-user UI responses unless the frontend explicitly requests a development/admin view.

## Global API Design Principles

1. All endpoints should be scoped by `ticker`.
2. User-input endpoints should also be scoped by `workspaceId` or company access context, not by individual user ID unless the data is truly private.
3. Return normalized values and display-ready derived fields together where practical.
4. Include `asOfDate`, `updatedAt`, `sourceUpdatedAt`, and `sourceVersions` for all data returned to the frontend.
5. Preserve raw vendor payloads in backend storage for audit/debug, but expose clean normalized contracts to the portal.
6. For time-series endpoints, support `startDate`, `endDate`, and `period` query params.
7. For daily charts, retain at least 365 calendar/trading days so 1Y views and comparisons work.
8. Store all numeric values as numbers, not formatted strings. The frontend can format currency, percent, and compact shares.
9. Store all dates in ISO format. Store timestamps in UTC and let frontend display them in the user-selected timezone.
10. Backend should provide frontend-ready deltas for all card values:
    - `value`
    - `previousValue`
    - `change`
    - `changePercent`
    - `comparisonDate`
    - `comparisonLabel`
    - `trendDirection`

## Recommended API Surface

### Company

```http
GET /companies
GET /companies/{ticker}
PUT /companies/{ticker}
```

Supports:

- Company Name
- Stock Code
- shares outstanding / issued shares
- company-level static settings
- user/company access mapping

### Dashboard / Market Data

```http
GET /market-data/{ticker}/dashboard
GET /market-data/{ticker}/trends?period=1Y
POST /market-data
POST /market-data/batch
```

Supports:

- Price
- Trade volume history
- Borrow fee
- Shortable shares
- Utilization
- Days to cover
- Initial margin
- Maintenance margin
- Average duration
- Chart event markers
- KPI compare periods

The backend should eventually replace current Dashboard V2 JSON and manual margin JSON.

### Ownership / Institutional Ownership

```http
GET /ownership/{ticker}/overview
GET /ownership/{ticker}/institutions
GET /ownership/{ticker}/insiders
GET /ownership/{ticker}/records?type=institutions|insiders
POST /ownership/{ticker}/records
PUT /ownership/{ticker}/records/{id}
DELETE /ownership/{ticker}/records/{id}
```

Supports:

- Institutional owners
- Institutional shares long
- Institutional value
- Average portfolio allocation
- Security ownership records
- Activist filings records
- Insider ownership history
- Ownership structure chart

Important ingestion rule:

```text
Exclude Fintel records where owners__putCall = Call.
```

Those records represent options exposure rather than actual share ownership and should not be counted in institutional/ownership holdings totals.

### Internal Float

```http
GET /internal-float/{ticker}
PUT /internal-float/{ticker}
POST /internal-float/{ticker}/holdings
PUT /internal-float/{ticker}/holdings/{id}
DELETE /internal-float/{ticker}/holdings/{id}
POST /internal-float/{ticker}/tokenized
POST /internal-float/{ticker}/collateralized
GET /internal-float/{ticker}/activity-log
POST /internal-float/{ticker}/dtc-upload-intent
```

Supports:

- Management / strategic holdings
- Tokenized shares and providers
- Collateralized shares and DeFi protocols
- Real tradable float calculation
- Activity log
- DTC report upload request flow

Core production formula:

```text
realTradableFloat = sharesOutstanding - institutionsOwnership - managementStrategicHoldings - tokenizedShares - collateralizedShares
```

If insiders are detected from vendor data, the portal should suggest adding those holders to Management / Strategic Holdings. The chart should not display a separate insiders segment once the product has moved to the user-confirmed internal-float model.

### Short Interest

```http
GET /short-interest/{ticker}/overview
GET /short-interest/{ticker}/trends?period=1Y
GET /short-interest/{ticker}/analysis
```

Supports:

- Short score
- Short interest
- SI % float
- Borrow fee
- Days to cover
- Shortable shares
- Utilization
- Trends
- AI analysis
- Management watch items

All score labels and deltas should be backend-calculated.

### Lending Pressure

```http
GET /lending-pressure/{ticker}/overview
GET /lending-pressure/{ticker}/trends?period=1Y
GET /lending-pressure/{ticker}/analysis
```

Supports:

- Lending pressure score
- Borrow fee
- Utilization
- Shortable shares
- Average duration
- Positive/negative contributors
- AI lending analysis

Do not expose removed fields such as on-loan shares and loan value unless the backend later obtains reliable source data for them.

### Social Sentiment

```http
GET /social-sentiment/{ticker}/overview?period=1D|1W|1M|6M|1Y
GET /social-sentiment/{ticker}/feed?platform=all|x|reddit|facebook|linkedin|stocktwits
GET /social-sentiment/{ticker}/timeline?period=1D|1W|1M|6M|1Y
POST /social-sentiment/{ticker}/stocktwits-upload
```

Supports:

- Reddit Feed
- X Feed
- Facebook Feed
- Linkedin Feed
- Stocktwits Feed
- Sentiment score
- Discussion volume
- Positive / neutral / negative counts
- Platform breakdown
- Top platform
- Sentiment trend

Current product behavior:

- Reddit, X, Facebook, and Linkedin should be routed through KWatch hotkey/platform mapping.
- Operations can assign multiple hotkeys to the same platform.
- Twitter should map to platform `X`.
- YouTube can remain unassigned for now.
- Stocktwits remains a manual upload flow until automated.

Sentiment calculation should be count-based:

```text
positive = 100
neutral = 50
negative = 0
averageSentiment = average(record scores)
```

### Notification Hotkeys

```http
GET /hotkeys?ticker={ticker}
POST /hotkeys
DELETE /hotkeys/{ticker}/{kwatchHotkey}
```

Required schema:

```json
{
  "ticker": "CURR",
  "kwatchHotkey": "Reddit_CURR",
  "platform": "Reddit",
  "createUser": "operator@example.com",
  "createDatetime": "2026-07-07T00:00:00Z"
}
```

Allowed platform values for now:

```text
Reddit, X, Facebook, Linkedin
```

### SEC Filings

```http
GET /sec-filings?ticker={ticker}
PUT /sec-filings
DELETE /sec-filings/{id}
```

Supports:

- SEC filing list
- Form type
- Form description
- Filing date
- Reporting date
- Act
- Film numbers
- File number
- Accession number
- Filing URL

### Reports

```http
GET /reports/{ticker}/archive
GET /reports/{ticker}/{reportDate}/{reportType}/data
POST /reports/{ticker}/{reportDate}/{reportType}/generate
```

Supports:

- Number of reports
- Number of daily report windows
- Latest report date
- Report history
- Pre-market / midday / post-market report data
- AI-generated report sections

### Short Volume / FTD

```http
GET /short-volume/{ticker}?startDate={date}&endDate={date}
GET /ftd/{ticker}?startDate={date}&endDate={date}
```

Supports:

- Short volume by venue
- Total reported volume
- Total short / long volume
- FTD settlement date
- Fails-to-deliver
- Trade date
- Closing deadline
- Notional
- FTD change

## Recommended Database Domains

The backend can implement these as relational tables, DynamoDB entities, or another store, but the logical domains should remain separate.

| Domain | Suggested tables/entities |
|---|---|
| Company | `companies`, `company_access`, `company_settings` |
| Market daily | `market_daily`, `market_intraday`, `dashboard_kpi_snapshots` |
| Margin input | `broker_margin_inputs`, `broker_average_duration_inputs` |
| Ownership | `institutional_ownership_records`, `insider_ownership_records`, `ownership_daily_snapshots` |
| Internal float | `internal_float_snapshots`, `internal_float_holdings`, `tokenized_share_records`, `collateralized_share_records`, `internal_float_activity_log` |
| Short interest | `short_interest_daily`, `borrow_fee_daily`, `short_score_snapshots` |
| Lending pressure | `lending_pressure_snapshots`, `lending_pressure_trends`, `lending_analysis_outputs` |
| Social sentiment | `social_mentions`, `social_sentiment_snapshots`, `hotkey_platform_map` |
| SEC filings | `sec_filings` |
| Reports | `report_runs`, `report_data`, `report_ai_sections` |
| FTD / short volume | `short_volume_daily`, `ftd_daily` |
| Audit | `user_actions`, `data_ingestion_runs`, `source_versions` |

## Update Cadence Requirements

| Cadence | Applies to |
|---|---|
| Sign off | Company name and stock code setup. |
| Daily - Next day 0800 HKT | Trade volume, Fintel ownership ingest, current/delayed price. |
| Daily - Next day 1100 HKT | Shares outstanding/user-input fields, Stocktwits upload, SEC manual input, broker margin inputs. |
| Daily - Next day 1200 HKT | Chart Exchange short interest, borrow fee, days to cover, short volume, FTD. |
| High frequency 1 second to 1 minute | Reddit KWatch webhook feed. |
| Medium frequency 1 minute to 10 minutes | Linkedin KWatch webhook feed. |
| Low frequency 10 minutes to 1 hour | X and Facebook KWatch webhook feeds. |

## API Period / History Requirements

The CSV `API Period` column indicates how much history the vendor/user-input source can provide. Backend ingestion should retain at least the available vendor history unless storage/cost decisions require a smaller product window.

| API period | Applies to |
|---|---|
| `-` | Static backend setup fields: Company Name, Stock Code. |
| `(2019-)` | Trade Volume history from Chart Exchange. |
| `(2018-)` | Chart Exchange / FINRA short interest fields: Short Interest, SI % Float, Days to Cover. |
| `(2016-)` | Chart Exchange Borrow Fee ratio. |
| `(2017-)` | Chart Exchange short-volume fields: SV-Date, SV-Total Volume Reported, SV-Total Short Volume Reported, SV-Total Long Volume Reported, venue-level short-volume fields. |
| `(2004-)` | FTD fields: Settlement Date, Fails-to-Deliver, Price, Trade Date, Closing Deadline, Notional, FTD Change. |
| `Delay 30 mins` | Current stock price / stock price. |
| `Contract Start date` | Shares outstanding, Fintel ownership records, short score, available shares, utilization, KWatch social feeds, Stocktwits input, SEC filings, margin inputs, average duration. |
| blank | Backend-calculated fields, AI/rule-engine outputs, or user-input fields without a vendor historical window. |

Minimum frontend product windows:

| Feature | Minimum backend history |
|---|---|
| Dashboard 1Y trend chart | 365 daily rows. |
| Dashboard KPI comparisons | Enough history for 1D, 5D, 1M, 3M, 1Y, and YTD. |
| Short interest trends | At least the latest 365 calendar days where available; FINRA short interest may update bi-weekly. |
| Lending pressure trends | At least 365 daily rows where source data exists. |
| Social sentiment timeline | At least 1Y of platform records or aggregates. |
| Report archive | All generated report dates; initially support daily windows. |
| FTD/short volume research | Preserve full vendor period where possible because long lookback is useful for research. |

## Calculation Rules

### Ownership

```text
institutionalOwners = count(unique active owner rows where owners__shares > 0 and owners__putCall != "Call")
institutionalSharesLong = sum(owners__shares where owners__putCall != "Call")
institutionalOwnershipPercent = institutionalSharesLong / sharesOutstanding * 100
institutionalValueThousandsUsd = sum(owners__value where owners__putCall != "Call") / 1000
averagePortfolioAllocationPercent = average(owners__allocation) * 100
```

### Internal Float

```text
managementStrategicHoldings = sum(management/strategic holder shares)
tokenizedShares = sum(tokenized share records)
collateralizedShares = sum(collateralized share records)
realTradableFloat = sharesOutstanding - institutionsOwnership - managementStrategicHoldings - tokenizedShares - collateralizedShares
floatReductionPercent = (managementStrategicHoldings + tokenizedShares + collateralizedShares) / sharesOutstanding * 100
```

### Short Interest Cards

For every card, backend should return:

```text
currentValue
previousValue
change = currentValue - previousValue
changePercent = change / previousValue * 100
comparisonLabel = "vs yesterday" or period label
scoreType = Low | Moderate | High | Extreme, according to configured thresholds
```

### Lending Pressure

The backend should calculate lending pressure score from the supported inputs only:

- shortable shares
- utilization
- borrow fee
- average duration

Do not calculate from on-loan shares or loan value unless new source data is added.

### Sentiment

```text
positiveRecordScore = 100
neutralRecordScore = 50
negativeRecordScore = 0
platformSentiment = average(record scores for platform and selected period)
overallSentiment = average(record scores across all platforms and selected period)
```

### Report Archive

Daily report windows:

```text
Pre-Market Brief = 08:00
Midday Flow Report = 11:50
Post-Market Digest = 19:00
```

The backend should return availability by date and report type; frontend renders PDF on demand.

## Complete Data Point Catalog

This catalog preserves every row from the provided master CSV. `Backend requirement` is a concise implementation note based on the source and remarks.

| # | Data point | Type | Source | Vendor | API period | Update frequency | Backend/API requirement |
|---:|---|---|---|---|---|---|---|
| 1 | Company Name | string | Backend Static |  | - | Sign off | Store in company profile/config. |
| 2 | Stock Code | string | Backend Static |  | - | Sign off | Store in company profile/config. |
| 3 | Trade Volume - history | list | Vendor | Chart Exchange | (2019-) | Daily - Next day 0800 HKT | Ingest Chart Exchange `get/data/stocks/exchange-volume/` history. |
| 4 | Issued Share (Shares Outstanding) | number | User Input |  | Contract Start date | Daily - Next day 1100 HKT | Store as company daily/share-capital input; source may be SEC record, ChartExchange portal, or ChartExchange Tier 2. |
| 5 | Institutional Owners | number | Vendor | Fintel | Contract Start date | Daily - Next day 0800 HKT | Fintel `/data/v/0.0/so/{country}/{symbol}`. Count/sum unique `owners__securityName`; exclude `owners__putCall = Call`. |
| 6 | Institutional Shares Long | number | Vendor | Fintel | Contract Start date | Daily - Next day 0800 HKT | Fintel `/data/v/0.0/so/{country}/{symbol}`. Sum `owners__shares`; exclude `owners__putCall = Call`. |
| 7 | Institutional Shares Long - ratio | percentage | Backend Calculate |  |  |  | Calculate `institutionalSharesLong / sharesOutstanding * 100`. |
| 8 | Institutional Value | number | Vendor | Fintel | Contract Start date | Daily - Next day 0800 HKT | Fintel `/data/v/0.0/so/{country}/{symbol}`. Sum `owners__value`; exclude `owners__putCall = Call`. |
| 9 | Average Portfolio Allocation | percentage | Backend Calculate |  |  |  | Calculate mean active owner allocation. |
| 10 | Ownership Structure | list | Backend Calculate |  |  |  | Return chart-ready ownership structure segments. |
| 11 | Insiders Ownership | number | User Input |  |  |  | Store user-confirmed insider/management ownership input. |
| 12 | Insiders Ownership History | number | Vendor | Fintel | Contract Start date | Daily - Next day 0800 HKT | Fintel `/data/v/0.0/so/{country}/{symbol}/bo`. |
| 13 | Insiders Ownership Ratio | percentage | Backend Calculate |  |  |  | Calculate `insidersOwnership / sharesOutstanding * 100`. |
| 14 | Institutions Ownership | number | Vendor | Fintel | Contract Start date | Daily - Next day 0800 HKT | Fintel `/data/v/0.0/so/{country}/{symbol}`. Sum `owners__shares`; exclude `owners__putCall = Call`. |
| 15 | Institutions Ownership Ratio | percentage | Backend Calculate |  |  |  | Calculate `institutionsOwnership / sharesOutstanding * 100`. |
| 16 | Public Float - tranditional | number | Backend Calculate |  |  |  | Calculate traditional public float from shares outstanding less ownership/internal deductions. |
| 17 | Public Float - private / strategic | number | Backend Calculate |  |  |  | Calculate private/strategic share component from internal float records. |
| 18 | Public Float - tokenized | number | User Input |  |  |  | Store tokenized share inputs by chain/provider. |
| 19 | Public Float Ratio | percentage | Backend Calculate |  |  |  | Calculate segment / shares outstanding. |
| 20 | Security Ownership Records | list | Vendor | Fintel | Contract Start date | Daily - Next day 0800 HKT | Store normalized Fintel security ownership records; exclude `owners__putCall = Call` from holdings totals. |
| 21 | Activist Filings Records | list | Vendor | Fintel | Contract Start date | Daily - Next day 0800 HKT | Store normalized Fintel `/bo` activist/insider records. |
| 22 | Short Score | number | User Input | Fintel | Contract Start date | Daily - Next day 1100 HKT | Manual input or backend calculation. Store score and source method. |
| 23 | Short Score - pts+- | number | Backend Calculate |  |  |  | Calculate point change versus comparison period. |
| 24 | Short Score - change | percentage | Backend Calculate |  |  |  | Calculate percent change versus comparison period. |
| 25 | Short Score Type | string | Backend Calculate |  |  |  | Return score label/risk type based on configured thresholds. |
| 26 | Short Interest | number | Vendor | Chart Exchange | (2018-) | Daily - Next day 1200 HKT | Chart Exchange short interest daily `short_position`. |
| 27 | Short Interest - numbers+- | number | Backend Calculate |  |  |  | Calculate absolute share change. |
| 28 | Short Interest - change | percentage | Backend Calculate |  |  |  | Calculate percent change. |
| 29 | Short Interest - Current Interpretation | string | AI / Rule Engine |  |  |  | AI Engine output. Store generated paragraph and generation metadata. |
| 30 | Short Interest - Management Watch Items | string | AI / Rule Engine |  |  |  | Rule Engine output. Store rule-triggered watch items. |
| 31 | Short Interest Trend | list | Backend Calculate |  |  |  | Return recent short-interest trend rows. |
| 32 | SI % Float | percentage | Vendor | Chart Exchange | (2018-) | Daily - Next day 1200 HKT | Chart Exchange short-interest daily. `SI % Float = Short Position / Float`. FINRA updates every two weeks. Days to cover is Short Position / Average Daily Trading Volume. |
| 33 | SI % Float - numbers+- | number | Backend Calculate |  |  |  | Calculate absolute point/ratio change. |
| 34 | SI % Float - change | percentage | Backend Calculate |  |  |  | Calculate percent change. |
| 35 | Borrow Fee - ratio | percentage | Vendor | Chart Exchange | (2016-) | Daily - Next day 1200 HKT | Chart Exchange IB borrow fee endpoint. Group by date and select latest timestamp/last record of day. |
| 36 | Borrow Fee - pts+- | number | Backend Calculate |  |  |  | Calculate point change. |
| 37 | Borrow Fee - change | percentage | Backend Calculate |  |  |  | Calculate percent change. |
| 38 | Borrow Fee - history | list | Backend Calculate |  |  |  | Return date-series history from normalized borrow fee records. |
| 39 | Borrow Fee Trend | list | Backend Calculate |  |  |  | Return chart-ready borrow fee trend. |
| 40 | Borrow Fee: Score Type | string | Backend Calculate |  |  |  | Return score/risk type label from thresholds. |
| 41 | Days to Cover - new | number | Vendor | Chart Exchange | (2018-) | Daily - Next day 1200 HKT | Chart Exchange short-interest daily `Days toCover2`. FINRA updates every two weeks. |
| 42 | Days to Cover - history | list | Backend Static |  |  |  | Store and return days-to-cover history. |
| 43 | Days to Cover - change | percentage | Backend Calculate |  |  |  | Calculate period change. |
| 44 | Available Shares | number | User Input | Chart Exchange | Contract Start date | Daily - Next day 1100 HKT | Store/ingest Chart Exchange IB borrow fee `Available`; group by date and select latest timestamp. |
| 45 | Available Shares | number | User Input | Futu | Contract Start date | Daily - Next day 1100 HKT | Store FUTU available share input. |
| 46 | Available Shares - number+- | number | Backend Calculate |  |  |  | Calculate absolute change. |
| 47 | Available Shares - change | percentage | Backend Calculate |  |  |  | Calculate percent change. |
| 48 | Available Shares (or Shortable Shares) - history | list | Backend Calculate |  |  |  | Return shortable-share history. |
| 49 | Available Shares Trend | list | Backend Calculate |  |  |  | Return chart-ready shortable-share trend. |
| 50 | Available Shares: Score Type | string | Backend Calculate |  |  |  | Return score/risk type label from thresholds. |
| 51 | Utilization - ratio | percentage | User Input | IBKR | Contract Start date | Daily - Next day 1100 HKT | Manual or backend calculation. Historical formula: `Official Short Position / (Official Short Position + Last Available of Day) * 100`. |
| 52 | Utilization - pts+- | number | Backend Calculate |  |  |  | Calculate point change. |
| 53 | Utilization - change | percentage | Backend Calculate |  |  |  | Calculate percent change. |
| 54 | Utilization - history | list | Backend Calculate |  |  |  | Return utilization history. |
| 55 | Utilization Trend | list | Backend Calculate |  |  |  | Return chart-ready utilization trend. |
| 56 | Utilization: Score Type | string | Backend Calculate |  |  |  | Return score/risk type label from thresholds. |
| 57 | Lending Pressure Score | number | Backend Calculate |  |  |  | Calculate lending pressure score from supported lending inputs. |
| 58 | Lending Pressure Score Type | string | Backend Calculate |  |  |  | Return lending score label. |
| 59 | Lending Pressure - Analyze Impact on Short Squeeze Risk - Positive Contributors | string | AI / Rule Engine |  |  |  | Rule Engine output. |
| 60 | Lending Pressure - Analyze Impact on Short Squeeze Risk - Negative Contributors | string | AI / Rule Engine |  |  |  | Rule Engine output. |
| 61 | Lending Pressure - AI Lending Analysis | string | AI / Rule Engine |  |  |  | AI Engine output. |
| 62 | Public Float (or Float Reduction or Real Tradable Float) | number | Backend Calculate |  |  |  | Calculate real tradable float / float reduction view. |
| 63 | Public Float (or Float Reduction or Real Tradable Float) - ratio | percentage | Backend Calculate |  |  |  | Calculate ratio to shares outstanding. |
| 64 | Float Reduction | percentage | Backend Calculate |  |  |  | `internal float / market float`. |
| 65 | Private Friendly Holders | number | User Input |  |  |  | Store management/strategic/private friendly holder share inputs. |
| 66 | Private Friendly Holders - ratio | percentage | Backend Calculate |  |  |  | Calculate ratio to shares outstanding. |
| 67 | Tokenized Shares | number | User Input |  |  |  | Store tokenized share totals. |
| 68 | Tokenized Shares - ratio | percentage | Backend Calculate |  |  |  | Calculate tokenized shares / shares outstanding. |
| 69 | Real Tradable Float | number | Backend Calculate |  |  |  | Calculate using internal float formula. |
| 70 | Real Tradable Float - ratio | percentage | Backend Calculate |  |  |  | Calculate real tradable float / shares outstanding. |
| 71 | Founder / Management Group - Holder | string | User Input |  |  |  | Store holder name. |
| 72 | Founder / Management Group - Category | string | User Input |  |  |  | Store holder category. |
| 73 | Founder / Management Group - Shares | number | User Input |  |  |  | Store holder shares. |
| 74 | Founder / Management Group - Notes | string | User Input |  |  |  | Store holder notes. |
| 75 | Founder / Management Group | percentage | Backend Calculate |  |  |  | Calculate group percentage. |
| 76 | Strategic Long-term Holders - Holder | string | User Input |  |  |  | Store holder name. |
| 77 | Strategic Long-term Holders - Gategory | string | User Input |  |  |  | Store category. |
| 78 | Strategic Long-term Holders - Shares | number | User Input |  |  |  | Store holder shares. |
| 79 | Strategic Long-term holders - Notes | string | User Input |  |  |  | Store notes. |
| 80 | Strategic Long-term holders | percentage | Backend Calculate |  |  |  | Calculate group percentage. |
| 81 | Tokenized Shares & Providers - Chain | string | User Input |  |  |  | Store tokenized chain. |
| 82 | Tokenized Shares & Providers - Share | number | User Input |  |  |  | Store tokenized share amount. |
| 83 | Tokenized Shares & Providers - Tokenization Provider | string | User Input |  |  |  | Store tokenization provider. |
| 84 | Sentiment Score | string | Backend Calculate |  |  |  | Calculate count-based sentiment score/label. |
| 85 | Sentiment Discussion Volume | list | Backend Calculate |  |  |  | Return volume by period/platform. |
| 86 | Sentiment Positive Post | list | Backend Calculate |  |  |  | Return positive post count/list. |
| 87 | Sentiment Positive ratio | percentage | Backend Calculate |  |  |  | Calculate positive / total. |
| 88 | Sentiment Negative Post | list | Backend Calculate |  |  |  | Return negative post count/list. |
| 89 | Sentiment Negative ratio | percentage | Backend Calculate |  |  |  | Calculate negative / total. |
| 90 | Sentiment Neutral Post | list | Backend Calculate |  |  |  | Return neutral post count/list. |
| 91 | Sentiment Neutral ratio | percentage | Backend Calculate |  |  |  | Calculate neutral / total. |
| 92 | Sentiment Platform Breakdown | list | Backend Calculate |  |  |  | Return platform breakdown. |
| 93 | Sentiment Top Platform | string | Backend Calculate |  |  |  | Return platform with largest selected-period volume. |
| 94 | Sentiment Trend | list | Backend Calculate |  |  |  | Return chart-ready sentiment trend by platform. |
| 95 | Reddit Feed | list | Vendor | Kwatch | Contract Start date | High Frequency (1 second to 1 minute) | KWatch alert/API webhook to backend/S3. |
| 96 | X Feed | list | Vendor | Kwatch | Contract Start date | Low Frequency (10 minutes to 1 hour) | KWatch alert/API webhook to backend/S3. |
| 97 | Facebook Feed | list | Vendor | Kwatch | Contract Start date | Low Frequency (10 minutes to 1 hour) | KWatch alert/API webhook to backend/S3. |
| 98 | Linkin Feed | list | Vendor | Kwatch | Contract Start date | Medium Frequency (1 minute to 10 minutes) | KWatch alert/API webhook to backend/S3. |
| 99 | Stocktwits Feed | list | User Input | Stockrtwits | Contract Start date | Daily - Next day 1100 HKT | Internal staff input/upload until automated. |
| 100 | SEC Filings | list | User Input | SEC | Contract Start date | Daily - Next day 1100 HKT | Internal staff input from SEC portal. |
| 101 | Current Stock Price (or Stock Price) | number | Vendor | Chart Exchange | Delay 30 mins | Daily - Next day 0800 HKT | Delayed 30 minutes; Tier 3 for live price. |
| 102 | Base Case | number | Backend Calculate |  |  |  | Calculate price scenario base case. |
| 103 | Moderate Squeeze | number | Backend Calculate |  |  |  | Calculate moderate squeeze scenario. |
| 104 | High Squeeze | number | Backend Calculate |  |  |  | Calculate high squeeze scenario. |
| 105 | Extreme Squeeze | number | Backend Calculate |  |  |  | Calculate extreme squeeze scenario. |
| 106 | Number of Reports | number | Backend Calculate |  |  |  | Calculate count of available reports. |
| 107 | Number of Daily Report Windows | number | Backend Calculate |  |  |  | Calculate report windows available per date. |
| 108 | Report Latest Date | date | Backend Calculate |  |  |  | Return latest available report date. |
| 109 | Report History | list | Backend Calculate |  |  |  | Return archive list grouped by date/report type. |
| 110 | 1. Executive Summary | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 111 | 2. Company Overview | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 112 | 3. Share Price Analysis | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 113 | 4. Short Selling Data & Analysis | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 114 | 4.1 Core Short Metrics | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 115 | 4.2 Key Short Sellers: Two Sigma & Citadel | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 116 | 5. Institutional Ownership Analysis | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 117 | 5.1 Insider Activity | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 118 | 6. Financial Performance | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 119 | 7. Fails-to-Deliver (FTD) Analysis | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 120 | 8. Valuation & Fair Value Assessment | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 121 | 8.1 Valuation Methodology | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 122 | 9. Tokenization Strategy Analysis | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 123 | 9.1 How Tokenization Neutralizes Short Sellers | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 124 | 9.2 CURRENC Capital Precedent | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 125 | 10. Risk Factors | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 126 | 10.1 Short-Selling Risks | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 127 | 10.2 Business Risks | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 128 | 10.3 Mitigating Factors | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 129 | 11. Conclusion & Recommendations | report | AI / Rule Engine |  |  |  | AI/rule-generated report section. |
| 130 | SV-Date | date | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 131 | SV-Total Volume Reported | number | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 132 | SV-Total Short Volume Reported | number | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 133 | SV-Total Long Volume Reported | number | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 134 | SV-Off Exchang Non-Exempt | number | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 135 | SV-Off Exchange Exempt | number | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 136 | SV-Nasdaq BX | number | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 137 | SV-Nasdaq PHLX | number | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 138 | SV-NYSE | number | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 139 | SV-NYSE Arca | number | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 140 | SV-NYSE National | number | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 141 | SV-NYSE American | number | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 142 | SV-CHX | number | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 143 | SV-Cboe EDGX | number | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 144 | SV-Cboe BZX | number | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 145 | SV-Cboe EDGA | number | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 146 | SV-Cboe BYX | number | Vendor | Chart Exchange | (2017-) | Daily - Next day 1200 HKT (TBC) | Chart Exchange short-volume endpoint. |
| 147 | Settlement Date (T+B) | date | Vendor | Chart Exchange | (2004-) | Daily - Next day 1200 HKT (TBC) | Store FTD settlement date. |
| 148 | Fails-to-Deliver | number | Vendor | Chart Exchange | (2004-) | Daily - Next day 1200 HKT (TBC) | Store FTD shares. |
| 149 | Price | number | Vendor | Chart Exchange | (2004-) | Daily - Next day 1200 HKT (TBC) | Store FTD/reference price. |
| 150 | Trade Date (T) | date | Vendor | Chart Exchange | (2004-) | Daily - Next day 1200 HKT (TBC) | Store FTD trade date. |
| 151 | Closing Deadline (T+35C) | date | Vendor | Chart Exchange | (2004-) | Daily - Next day 1200 HKT (TBC) | Calculate/store close-out deadline. |
| 152 | $ Notional | number | Vendor | Chart Exchange | (2004-) | Daily - Next day 1200 HKT (TBC) | Calculate/store notional value. |
| 153 | FTD Change | number | Vendor | Chart Exchange | (2004-) | Daily - Next day 1200 HKT (TBC) | Calculate change from prior FTD record. |
| 154 | Initial Margin | number | User Input | IBKR | Contract Start date | Daily - Next day 1100 HKT | Store broker margin input. |
| 155 | Initial Margin | number | User Input | FUTU | Contract Start date | Daily - Next day 1100 HKT | Store broker margin input. |
| 156 | Maintenance Margin | number | User Input | IBKR | Contract Start date | Daily - Next day 1100 HKT | Store broker margin input. |
| 157 | Maintenance Margin | number | User Input | FUTU | Contract Start date | Daily - Next day 1100 HKT | Store broker margin input. |
| 158 | Average Duration (D) | number | User Input | IBKR | Contract Start date | Daily - Next day 1100 HKT | Store broker average duration input. |
| 159 | On Load Share |  | Needs confirmation |  |  |  | Unclassified in CSV. Product currently removed on-loan shares from Lending Pressure because no reliable source exists. |
| 160 | Load Value |  | Needs confirmation |  |  |  | Unclassified in CSV. Product currently removed loan value from Lending Pressure because no reliable source exists. |
| 161 | Lending Pressure Score |  | Needs confirmation |  |  |  | Duplicate/unclassified row. Use row 57 as the active calculated lending pressure score. |
## Implementation Phases

### Phase 1: Read APIs replacing portal JSON

- Company/profile
- Dashboard V2 market data
- Short interest
- Lending pressure
- Ownership
- Internal float
- Social sentiment
- SEC filings
- Report archive

### Phase 2: Write APIs replacing operations/local JSON

- SEC filing entry/delete
- Stocktwits social upload
- Dashboard margin inputs
- Internal float user inputs/activity log
- Notification hotkeys
- Market-data batch upload

### Phase 3: Backend calculations

- All deltas and percent changes
- All score labels
- Ownership/float breakdowns
- Social sentiment aggregates
- Dashboard comparison periods
- Report archive availability

### Phase 4: AI/rule engine integration

- Short-interest AI analysis
- Lending AI analysis
- Rule-based watch items
- Daily report sections
- Alert center trigger evaluation

## Open Items For Backend Confirmation

1. Confirm whether shares outstanding should remain user input or be pulled from Chart Exchange/SEC where available.
2. Confirm Chart Exchange plan/API availability for live price versus delayed price.
3. Confirm whether `Available Shares` from Chart Exchange/IBKR and FUTU should be merged, averaged, or displayed as separate broker feeds.
4. Confirm whether utilization should be calculated from short position and available shares or supplied directly by a vendor.
5. Confirm exact data source for Initial Margin, Maintenance Margin, and Average Duration beyond current operations input.
6. Confirm whether `On Load Share` and `Load Value` are typos for `On Loan Share` and `Loan Value`; product currently excludes them.
7. Confirm KWatch webhook payload shape for Reddit, X, Facebook, and Linkedin.
8. Confirm final workspace-level sharing model for internal float data.
