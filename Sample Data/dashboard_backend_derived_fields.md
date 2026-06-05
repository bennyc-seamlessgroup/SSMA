# Dashboard Consolidated JSON Backend Guide

Target file: `dashboard_CURR_consolidated_4_web.json`

The portal now reads this single dashboard file from `import_data` or S3. The backend should keep the top-level metadata and the `data` object shape stable.

## Required Root Shape

```json
{
  "ticker": "CURR",
  "asOfDate": "2026-05-26",
  "importedAt": "2026-06-05T00:00:00.000Z",
  "sourcePlatform": "Internal Consolidated Dashboard Dataset",
  "recordType": "dashboardConsolidatedWeb",
  "category": "dashboard",
  "status": "ready",
  "data": {
    "dashboard": {},
    "pageContent": {},
    "files": {},
    "derived": {
      "dashboardPage": {}
    }
  }
}
```

## `data.dashboard`

This replaces the old frontend `buildImportDashboard()` helper.

| JSON path | UI use | Formula / source |
|---|---|---|
| `data.dashboard.company.ticker` | Dashboard links and ticker references | From company profile ticker |
| `data.dashboard.company.companyName` | Page title | From company profile company name |
| `data.dashboard.company.exchange` | Company context | From company profile exchange |
| `data.dashboard.company.marketCap` | Company context | Format `company/capital_structure.json.data.marketCap` |
| `data.dashboard.company.freeFloat` | Company context | Format `company/capital_structure.json.data.freeFloat` |
| `data.dashboard.company.sharesOutstanding` | Company context | Format `company/capital_structure.json.data.sharesOutstanding` |
| `data.dashboard.scores.healthScore` | Legacy dashboard KPI fallback | `round(price/technical_summary.json.data.latestScore.total)`; fallback `64` |
| `data.dashboard.scores.marketSentimentScore` | Sentiment fallback | `round(price/technical_summary.json.data.latestScore.momentum)`; fallback `68` |
| `data.dashboard.scores.ownershipTrend` | Ownership trend fallback | `Accumulation` if increased ownership rows >= decreased rows, else `Distribution` |
| `data.dashboard.scores.shortSqueezeRisk` | Public squeeze score fallback | `round(latest(short/short_score.json.data).score)` |
| `data.dashboard.metrics.borrowFee` | Borrow fee fallback display | Format percent from `short/borrow_fee.json.data.current.costToBorrowAll` |
| `data.dashboard.metrics.sharesAvailable` | Shares available fallback display | Format latest `short/shares_available.json.data[].shortAvailabilityShares` |
| `data.dashboard.metrics.shortInterestPercentFloat` | SI float fallback display | Format percent from `short/short_interest.json.data.current.shortInterestPcFreeFloat` |
| `data.dashboard.metrics.daysToCover` | Days to cover fallback display | Format `short/short_interest.json.data.daysToCover` or current row value if available |
| `data.dashboard.metrics.putCallRatio` | Options fallback display | Latest `options/put_call_ratio.json.data.openInterestRatio[].putCallRatio`, or volume ratio fallback |
| `data.dashboard.metrics.gammaExposure` | Options fallback display | Count of `options/gamma_exposure.json.data[]` records |

## `data.files`

This map preserves original source envelopes. Keys must match the old `import_data` relative paths exactly.

Required keys:

```text
company/profile.json
company/capital_structure.json
short/short_interest.json
short/borrow_fee.json
short/shares_available.json
short/utilization.json
short/on_loan.json
short/short_score.json
ownership/top_holders.json
ownership/ownership_changes.json
ownership/activist_filings.json
ownership/ownership_trend.json
insider/insider_transactions.json
insider/net_insider_activity.json
options/options_summary.json
options/put_call_ratio.json
options/open_interest.json
options/gamma_exposure.json
options/expiration_wall.json
alerts/alerts.json
news_filings/news.json
news_filings/sec_filings.json
sentiment/social_mentions.json
internal_float/float_adjustments.json
reports/dashboard_metrics.json
price/technical_summary.json
```

Each value should be the full JSON envelope previously stored at that path, including `ticker`, `asOfDate`, `sourcePlatform`, `recordType`, `status`, and `data`.

## `data.derived.dashboardPage`

These values remove the most important frontend calculations from the executive dashboard.

| JSON path | UI display | Formula |
|---|---|---|
| `data.derived.dashboardPage.commandCenter.overallRiskStatus` | Overall Risk Status | Label from `overallRiskScore`: `CRITICAL >= 90`, `HIGH RISK >= 78`, `ELEVATED >= 62`, `WATCH >= 40`, else `SAFE` |
| `data.derived.dashboardPage.commandCenter.overallRiskScore` | Overall score | `round(marketPressureScore * 0.35 + internalAdjustedSqueezeScore * 0.25 + internalFloatImpactScore * 0.15 + narrativeScore * 0.10 + smartMoneyScore * 0.15)` |
| `data.derived.dashboardPage.scoreGrid.internalAdjustedSqueezeScore` | Internal Adjusted Squeeze Score | Management-adjusted score from internal float model |
| `data.derived.dashboardPage.scoreGrid.publicScore` | Public Score | Latest public short squeeze score |
| `data.derived.dashboardPage.scoreGrid.riskAmplification` | Risk Amplification | `internalAdjustedSqueezeScore - publicScore` |
| `data.derived.dashboardPage.scoreGrid.riskAmplificationDisplay` | Risk Amplification display | Add `+` prefix when value is positive |
| `data.derived.dashboardPage.scoreGrid.marketRanking` | Market Ranking | Rank in monitored market universe |
| `data.derived.dashboardPage.scoreGrid.marketRankingDisplay` | Market Ranking display | `#` + `marketRanking` |
| `data.derived.dashboardPage.scoreGrid.percentile` | Percentile | `round(marketRanking / marketUniverse * 100)`, minimum `1` |
| `data.derived.dashboardPage.scoreGrid.percentileDisplay` | Percentile display | `Top {percentile}%` |
| `data.derived.dashboardPage.marketPressure.marketPressureScore` | Market Pressure Intelligence gauge | `round(readinessScore * 0.35 + lendingPressureScore * 0.35 + min(shortInterestPercent * 4, 100) * 0.20 + borrowFeePressure * 0.10)` |
| `data.derived.dashboardPage.marketPressure.shortInterestPercentDisplay` | SI Float supporting text | Format `shortInterestPercent` with 1 decimal |
| `data.derived.dashboardPage.marketPressure.borrowFeePercentDisplay` | Borrow Fee supporting text | Format `borrowFeePercent` with 1-2 decimals |
| `data.derived.dashboardPage.marketPressure.readinessScore` | Squeeze Readiness card | Current readiness score from squeeze readiness model |
| `data.derived.dashboardPage.internalFloat.officialFloatDisplay` | Official Float card | Format official float |
| `data.derived.dashboardPage.internalFloat.adjustedFloatDisplay` | Adjusted Float card | Format adjusted tradable float |
| `data.derived.dashboardPage.internalFloat.lendableFloatDisplay` | Lendable Float card | Format estimated lendable float |
| `data.derived.dashboardPage.internalFloat.tokenizedLockedSharesDisplay` | Tokenized / Locked card | Format tokenized or locked shares |
| `data.derived.dashboardPage.internalFloat.internalFloatImpactScore` | Internal Float Impact Score | Usually `round(floatReductionPercent * 2.5)`, capped `0-100` |
| `data.derived.dashboardPage.smartMoney.smartMoneyScore` | Smart Money Score | Weighted ownership, insider, and options score |
| `data.derived.dashboardPage.narrative.narrativeScore` | Narrative Score | Average sentiment score or model score |
| `data.derived.dashboardPage.narrative.mentionCount` | Mention count | Count of imported social mentions |

## `data.pageContent`

This contains changeable editorial text used on the dashboard. Keep fixed section titles in the frontend; keep changing narrative, action, and AI copy here.

Important keys:

```text
data.pageContent.pageDescription
data.pageContent.commandCenter.riskNarrative
data.pageContent.commandCenter.managementActions[]
data.pageContent.sections.alertCenterDescription
data.pageContent.sections.marketPressureDescription
data.pageContent.sections.marketPressureNarrative
data.pageContent.sections.internalFloatDescription
data.pageContent.sections.smartMoneyDescription
data.pageContent.sections.marketNarrativeDescription
data.pageContent.sections.forwardLookingDescription
data.pageContent.sections.aiIntelligenceDescription
data.pageContent.marketNarrative.bullishNarratives[]
data.pageContent.marketNarrative.bearishNarratives[]
data.pageContent.aiIntelligence[].title
data.pageContent.aiIntelligence[].body
```

## Backend Notes

- Upload this file to S3 with key `dashboard_CURR_consolidated_4_web.json` or `import_data/dashboard_CURR_consolidated_4_web.json`.
- Keep all numbers numeric when possible. Display strings should only be used for fields ending in `Display`.
- If a source section is unavailable, keep the key and provide an empty `data` object or array so the frontend can render fallback values.
