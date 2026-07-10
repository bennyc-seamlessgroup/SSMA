# Backend Calculated Formula Reference

Source reference: `Portal Data Point - Master Table.csv`

This file lists every row marked `C: Backend Calculate` in the master data-point CSV. It is intended for backend implementation planning. Formulas marked `?` need business confirmation.

## General Formula Conventions

Unless otherwise stated:

```text
changeValue = currentValue - comparisonValue
changePercent = comparisonValue == 0 ? null : (changeValue / comparisonValue) * 100
ratioPercent = numerator / denominator * 100
```

For card comparisons:

- Daily market cards usually compare against previous trading day.
- Timeframe cards may compare against selected period such as 1D, 5D, 1M, 3M, 1Y, or YTD.
- If no prior comparison value exists, return `null` and let frontend display `--` or `No baseline`.

## Formula Table

| # | Backend Calculated Data Point | Data Type | Suggested Inputs | Formula / Rule | Notes |
|---:|---|---|---|---|---|
| 7 | Institutional Shares Long - ratio | percentage | `institutionalSharesLong`, `sharesOutstanding` | `institutionalSharesLong / sharesOutstanding * 100` | Exclude `owners__putCall = Call` from institutional shares. |
| 9 | Average Portfolio Allocation | percentage | active Fintel ownership rows | `mean(owners__allocation) * 100` if raw allocation is decimal | Exclude closed positions and call-option rows. Confirm whether Fintel returns decimal or percent. |
| 10 | Ownership Structure | list | `sharesOutstanding`, `institutionalSharesLong`, internal float inputs, real tradable float | Build grouped list: institutions, internal float, real tradable float | Current page no longer uses insiders as a separate chart category. |
| 13 | Insiders Ownership Ratio | percentage | `insidersOwnership`, `sharesOutstanding` | `insidersOwnership / sharesOutstanding * 100` | If insiders are converted into management/strategic suggestions, this may become informational only. |
| 15 | Institutions Ownership Ratio | percentage | `institutionsOwnership`, `sharesOutstanding` | `institutionsOwnership / sharesOutstanding * 100` | Same denominator as institutional shares long ratio. |
| 16 | Public Float - traditional | number | `sharesOutstanding`, `institutionsOwnership`, `internalFloat` | `sharesOutstanding - institutionsOwnership - internalFloat` | Name may be revised; confirm whether institutions should be deducted here. |
| 17 | Public Float - private / strategic | number | management/strategic holdings records | `sum(managementStrategicHoldings.shares)` | This is now “Management / Strategic”. |
| 19 | Public Float Ratio | percentage | public/market float, `sharesOutstanding` | `publicFloat / sharesOutstanding * 100` | Confirm exact numerator name after final float terminology. |
| 23 | Short Score - pts+- | number | current short score, prior short score | `currentShortScore - priorShortScore` | Unit: points. |
| 24 | Short Score - change | percentage | current short score, prior short score | `changeValue / priorShortScore * 100` | If score is 0-100, percent change may be less useful than point change. |
| 25 | Short Score Type | string | short score | Threshold label: `Low`, `Moderate`, `High`, `Extreme` | Exact thresholds need confirmation. |
| 27 | Short Interest - numbers+- | number | current short interest, prior short interest | `currentShortInterest - priorShortInterest` | Unit: shares. |
| 28 | Short Interest - change | percentage | current short interest, prior short interest | `changeValue / priorShortInterest * 100` |  |
| 31 | Short Interest Trend | list | short interest history | Map latest N historical records to `{date, shortInterestShares}` | Use recent 7 records for short-interest page chart unless page requests another range. |
| 33 | SI % Float - numbers+- | number | current SI % float, prior SI % float | `currentSiPercentFloat - priorSiPercentFloat` | Unit: percentage points. |
| 34 | SI % Float - change | percentage | current SI % float, prior SI % float | `changeValue / priorSiPercentFloat * 100` |  |
| 36 | Borrow Fee - pts+- | number | current borrow fee %, prior borrow fee % | `currentBorrowFeePercent - priorBorrowFeePercent` | Unit: percentage points. |
| 37 | Borrow Fee - change | percentage | current borrow fee %, prior borrow fee % | `changeValue / priorBorrowFeePercent * 100` |  |
| 38 | Borrow Fee - history | list | Chart Exchange borrow-fee rows | Group by date, select latest timestamp per date, output daily series | Source field: `fee`. |
| 39 | Borrow Fee Trend | list | borrow fee history | Map recent records to `{date, borrowFeePercent}` | Use same daily-grouped series as history. |
| 40 | Borrow Fee: Score Type | string | borrow fee % | Threshold label: `Low`, `Moderate`, `High`, `Extreme` | Exact thresholds need confirmation. |
| 43 | Days to Cover - change | percentage | current days to cover, prior days to cover | `changeValue / priorDaysToCover * 100` | Also return `changeValue` in days if UI needs it. |
| 46 | Available Shares - number+- | number | current shortable shares, prior shortable shares | `currentShortableShares - priorShortableShares` | Rename display to Shortable Shares. |
| 47 | Available Shares - change | percentage | current shortable shares, prior shortable shares | `changeValue / priorShortableShares * 100` |  |
| 48 | Available Shares (or Shortable Shares) - history | list | Chart Exchange borrow-fee rows, broker/manual rows if used | Group by date, select latest timestamp per date, output daily available shares | Source field: `available`. |
| 49 | Available Shares Trend | list | shortable shares history | Map recent records to `{date, shortableShares}` | Display title should be Shortable Shares Trend. |
| 50 | Available Shares: Score Type | string | shortable shares, short interest, utilization | ? | Need business thresholds for pressure level. |
| 52 | Utilization - pts+- | number | current utilization %, prior utilization % | `currentUtilizationPercent - priorUtilizationPercent` | Unit: percentage points. |
| 53 | Utilization - change | percentage | current utilization %, prior utilization % | `changeValue / priorUtilizationPercent * 100` |  |
| 54 | Utilization - history | list | short interest history, shortable shares history | `shortPosition / (shortPosition + lastAvailableSharesOfDay) * 100` per date | CSV-defined historical utilization rule. |
| 55 | Utilization Trend | list | utilization history | Map daily utilization records to `{date, utilizationPercent}` |  |
| 56 | Utilization: Score Type | string | utilization % | Threshold label based on utilization pressure | Exact thresholds need confirmation. |
| 57 | Lending Pressure Score | number | shortable shares, utilization, borrow fee, average duration / days to cover | Weighted score ? | Need final weighting. Current historical prototype used score labels but weighting should be confirmed. |
| 58 | Lending Pressure Score Type | string | lending pressure score | Threshold label: `Low`, `Moderate`, `High`, `Extreme` | Exact thresholds need confirmation. |
| 62 | Public Float (or Float Reduction or Real Tradable Float) | number | `sharesOutstanding`, `institutionsOwnership`, `internalFloat` | `sharesOutstanding - institutionsOwnership - internalFloat` | Current business rule for real tradable float. Confirm final label. |
| 63 | Public Float (or Float Reduction or Real Tradable Float) - ratio | percentage | real tradable float, shares outstanding | `realTradableFloat / sharesOutstanding * 100` | Confirm denominator. |
| 64 | Float Reduction | percentage | internal float, market float/share base | `internalFloat / marketFloat * 100` | CSV says `internal float / marketing float`; confirm whether “market float” means shares outstanding or market tradable float. |
| 66 | Private Friendly Holders - ratio | percentage | private/strategic shares, shares outstanding or market float | `privateFriendlyHolders / denominator * 100` | Denominator needs confirmation. |
| 68 | Tokenized Shares - ratio | percentage | tokenized shares, shares outstanding or market float | `tokenizedShares / denominator * 100` | Denominator needs confirmation. |
| 69 | Real Tradable Float | number | `sharesOutstanding`, `institutionsOwnership`, `internalFloat` | `sharesOutstanding - institutionsOwnership - internalFloat` | Internal float = management/strategic + tokenized + collateralized. |
| 70 | Real Tradable Float - ratio | percentage | real tradable float, shares outstanding | `realTradableFloat / sharesOutstanding * 100` | Confirm denominator. |
| 75 | Founder / Management Group | percentage | founder/management shares, shares outstanding or internal float total | `founderManagementShares / denominator * 100` | Denominator needs confirmation. |
| 80 | Strategic Long-term holders | percentage | strategic long-term holder shares, shares outstanding or internal float total | `strategicLongTermShares / denominator * 100` | Denominator needs confirmation. |
| 84 | Sentiment Score | string | positive, neutral, negative social records | `average(positive=100, neutral=50, negative=0)` | Data type should likely be number plus label, not string. |
| 85 | Sentiment Discussion Volume | list | social records by period | Count records by time bucket | Return chart-ready series. |
| 86 | Sentiment Positive Post | list | social records | Filter records where sentiment is positive/bullish |  |
| 87 | Sentiment Positive ratio | percentage | positive count, total count | `positiveCount / totalCount * 100` |  |
| 88 | Sentiment Negative Post | list | social records | Filter records where sentiment is negative/bearish |  |
| 89 | Sentiment Negative ratio | percentage | negative count, total count | `negativeCount / totalCount * 100` |  |
| 90 | Sentiment Neutral Post | list | social records | Filter records where sentiment is neutral |  |
| 91 | Sentiment Neutral ratio | percentage | neutral count, total count | `neutralCount / totalCount * 100` |  |
| 92 | Sentiment Platform Breakdown | list | social records grouped by platform | For each platform: count, sentiment score, contribution percent | `contributionPercent = platformCount / totalCount * 100`. |
| 93 | Sentiment Top Platform | string | sentiment platform breakdown | Platform with largest record count in selected period | Tie-breaker needs confirmation. |
| 94 | Sentiment Trend | list | social records by date/platform | Bucket records by selected timeframe and platform, calculate sentiment score per bucket | No empty platform gaps if platform has no records. |
| 102 | Base Case | number | price, float, squeeze assumptions | ? | Price scenario model not currently finalized. |
| 103 | Moderate Squeeze | number | price, float, squeeze assumptions | ? | Price scenario model not currently finalized. |
| 104 | High Squeeze | number | price, float, squeeze assumptions | ? | Price scenario model not currently finalized. |
| 105 | Extreme Squeeze | number | price, float, squeeze assumptions | ? | Price scenario model not currently finalized. |
| 106 | Number of Reports | number | report archive index | Count all available reports | Include pre-market, midday, and post-market if available. |
| 107 | Number of Daily Report Windows | number | report archive index | Count available report windows for selected/latest date | Max expected windows: 3. |
| 108 | Report Latest Date | date | report archive index | Latest date with at least one available report |  |
| 109 | Report History | list | report archive files/index | Group report files by date and report window | Return display-ready rows for archive page. |

## Unresolved Formula Items

The following need business confirmation before backend implementation:

- Short Score thresholds and exact score calculation if not manually supplied.
- Borrow Fee score type thresholds.
- Shortable Shares score type thresholds.
- Utilization score type thresholds.
- Lending Pressure Score weighting.
- Lending Pressure Score Type thresholds.
- Denominator for private/strategic/tokenized/internal float ratios.
- Price scenario formulas: Base Case, Moderate Squeeze, High Squeeze, Extreme Squeeze.

