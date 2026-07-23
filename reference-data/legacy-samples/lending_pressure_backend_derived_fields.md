# Lending Pressure Consolidated JSON Backend Guide

Target file:

```text
lending_pressure_CURR_consolidated_4_web.json
```

Local portal copy:

```text
import_data/lending_pressure_CURR_consolidated_4_web.json
```

The lending-pressure page now intentionally excludes On Loan because the current source data does not provide reliable on-loan records. The page should be driven only by shares available, utilization, and borrow fee until an institutional lending feed is available.

## Required Root Shape

```json
{
  "ticker": "CURR",
  "asOfDate": "2026-04-29",
  "importedAt": "2026-06-05T00:00:00.000Z",
  "sourcePlatform": "Ortex + Internal Lending Model",
  "recordType": "lendingPressureConsolidatedWeb",
  "category": "short",
  "status": "ready",
  "data": {
    "current": {},
    "daily": [],
    "derived": {
      "lendingPressurePage": {
        "summary": {},
        "cards": {}
      }
    }
  }
}
```

## Current Values

| JSON path | Type | UI use | Formula / source |
|---|---:|---|---|
| `data.current.date` | string | Latest data date | Latest available market-data date |
| `data.current.shortAvailabilityShares` | number | Shares Available KPI | Latest `availability.shortAvailabilityShares` |
| `data.current.shortAvailabilityPct` | number | Utilization KPI | Latest `availability.shortAvailabilityPct` |
| `data.current.costToBorrowAll` | number | Borrow Fee KPI | Latest `borrowFeeAll.costToBorrowAll` |

## Daily Trend Data

Each row in `data.daily[]` should contain one trading day.

```json
{
  "date": "2026-04-29",
  "availability": {
    "shortAvailabilityShares": 2511276,
    "shortAvailabilityPct": 73.57
  },
  "borrowFeeAll": {
    "costToBorrowAll": 30.78
  }
}
```

| JSON path | UI use |
|---|---|
| `data.daily[].date` | X-axis labels |
| `data.daily[].availability.shortAvailabilityShares` | Shares Available Trend |
| `data.daily[].availability.shortAvailabilityPct` | Utilization Trend |
| `data.daily[].borrowFeeAll.costToBorrowAll` | Borrow Fee Trend |

## Derived Summary

Use backend-derived fields so the frontend does not need to calculate business metrics.

| JSON path | UI display | Formula |
|---|---|---|
| `data.derived.lendingPressurePage.summary.pressureScore` | Lending Pressure Score | `round(availabilityPressure * 0.25 + utilizationPressure * 0.30 + borrowFeePressure * 0.30 + borrowDemandScore * 0.15)` |
| `data.derived.lendingPressurePage.summary.pressureScoreDisplay` | Score display | `{pressureScore} / 100` |
| `data.derived.lendingPressurePage.summary.level` | Pressure label | `Extreme >= 81`, `High >= 61`, `Moderate >= 31`, else `Low` |
| `data.derived.lendingPressurePage.summary.components.availabilityPressure` | Component score | `100 if sharesAvailable <= 100000; 78 if <= 500000; 48 if <= 1500000; otherwise 12` |
| `data.derived.lendingPressurePage.summary.components.utilizationPressure` | Component score | `clamp(shortAvailabilityPct, 0, 100)` |
| `data.derived.lendingPressurePage.summary.components.borrowFeePressure` | Component score | `clamp(costToBorrowAll, 0, 100)` |
| `data.derived.lendingPressurePage.summary.components.borrowDemandScore` | Internal borrow-demand proxy | `round(utilizationPressure * 0.45 + borrowFeePressure * 0.35 + availabilityPressure * 0.20)` |
| `data.derived.lendingPressurePage.summary.components.borrowDemand` | Demand label | `Extreme >= 81`, `High >= 61`, `Moderate >= 31`, else `Low` |

## KPI Cards

The page currently renders three KPI cards.

```text
data.derived.lendingPressurePage.cards.sharesAvailable
data.derived.lendingPressurePage.cards.utilization
data.derived.lendingPressurePage.cards.borrowFee
```

Each card should follow this shape:

```json
{
  "label": "Shares Available",
  "value": 2511276,
  "valueDisplay": "2,511,276",
  "change": -36700,
  "changeDisplay": "-36,700 shares",
  "changePercent": -1.44,
  "changePercentDisplay": "-1.44%",
  "deltaDisplay": "-36,700 shares(-1.44%)",
  "previousValue": 2547976,
  "deltaCurrentValue": 2511276,
  "pressureLabel": "Low Pressure",
  "formula": "value = latest daily value; change = current - previous; changePercent = change / previous * 100"
}
```

## Card Formulas

Shares Available:

```text
current = latest(data.daily[].availability.shortAvailabilityShares)
previous = previous(data.daily[].availability.shortAvailabilityShares)
change = current - previous
changePercent = change / previous * 100
```

Utilization:

```text
current = latest(data.daily[].availability.shortAvailabilityPct)
previous = previous(data.daily[].availability.shortAvailabilityPct)
change = current - previous
changePercent = change / previous * 100
```

Borrow Fee:

```text
current = latest(data.daily[].borrowFeeAll.costToBorrowAll)
previous = previous(data.daily[].borrowFeeAll.costToBorrowAll)
change = current - previous
changePercent = change / previous * 100
```

## Changeable Commentary

These optional fields can be supplied in the consolidated JSON. If omitted, the page falls back to `content/page_content.json`.

```text
data.pressureNarrative
data.positiveContributors[]
data.negativeContributors[]
data.aiLendingAnalysis
```

## Explicitly Excluded For Now

Do not include these fields until a reliable provider feed is available:

```text
data.current.sharesOnLoan
data.daily[].onLoan
data.derived.lendingPressurePage.cards.onLoan
data.derived.lendingPressurePage.summary.components.onLoanPressure
```

When on-loan data becomes available later, add it back as a separate schema revision instead of silently changing this file shape.
