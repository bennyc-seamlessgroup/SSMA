# Lending Pressure Backend Derived Fields

This document lists derived fields the backend should populate for the Lending Pressure page consolidated handoff file:

```text
Sample Data/lending_pressure_CURR_consolidated_4_web.json
```

Recommended production import path:

```text
import_data/lending_pressure_CURR_consolidated_4_web.json
```

The derived output should live under:

```text
data.derived.lendingPressurePage
```

The current ORTEX consolidated source includes availability and borrow fee records. It does **not** include on-loan records, so `onLoan.sharesOnLoan` is included in the JSON as a backend-fillable field.

## General Rules

- Sort `data.daily[]` by `date` ascending.
- `latest(...)` means the row with the newest `date`.
- `previous(...)` means the row immediately before the latest row.
- `change = current - previous`.
- `changePercent = previous === 0 ? 0 : change / previous * 100`.
- `signed(value)` means prefix `+` for positive values, `-` for negative values, and no sign for zero.
- `deltaDisplay = changeDisplay + "(" + changePercentDisplay + ")"`.
- Use `null` for unavailable numeric values rather than omitting keys.

## Source Field Map

```text
Shares Available:
data.daily[].availability.shortAvailabilityShares

Utilization:
data.daily[].availability.shortAvailabilityPct

Borrow Fee:
data.daily[].borrowFeeAll.costToBorrowAll

New Borrow Fee:
data.daily[].borrowFeeNew.costToBorrowNew

On Loan:
data.daily[].onLoan.sharesOnLoan
```

Note: `data.daily[].onLoan.sharesOnLoan` is not available in the current ORTEX consolidated source. Backend should populate it when an on-loan feed is available.

## Common Card Output Shape

Each KPI card should use this shape unless noted otherwise:

```json
{
  "value": 0,
  "valueDisplay": "0",
  "change": 0,
  "changeDisplay": "0",
  "changePercent": 0,
  "changePercentDisplay": "0%",
  "deltaDisplay": "0(0%)",
  "previousValue": 0,
  "deltaCurrentValue": 0,
  "pressureLabel": "Low Pressure"
}
```

## 1. Lending Pressure Summary

JSON path:

```text
data.derived.lendingPressurePage.summary
```

Required keys:

```text
pressureScore
pressureScoreDisplay
level
health
formula
```

Formula:

```text
pressureScore = round(
  availabilityPressure * 0.25 +
  utilizationPressure * 0.30 +
  borrowFeePressure * 0.30 +
  borrowDemandScore * 0.15
)
```

Level formula:

```text
if pressureScore >= 81:
  level = "Extreme"
else if pressureScore >= 61:
  level = "High"
else if pressureScore >= 31:
  level = "Moderate"
else:
  level = "Low"
```

Health formula:

```text
if pressureScore >= 81:
  health = "Critical"
else if pressureScore >= 61:
  health = "Constrained"
else if pressureScore >= 31:
  health = "Tightening"
else:
  health = "Healthy"
```

Display formatting:

```text
pressureScoreDisplay = pressureScore + " / 100"
```

## 2. Pressure Components

JSON path:

```text
data.derived.lendingPressurePage.components
```

Required keys:

```text
availabilityPressure
utilizationPressure
borrowFeePressure
onLoanPressure
borrowDemandScore
borrowDemand
formulas
```

Availability pressure:

```text
sharesAvailable = latest(data.daily[].availability.shortAvailabilityShares)

if sharesAvailable <= 100000:
  availabilityPressure = 100
else if sharesAvailable <= 500000:
  availabilityPressure = 78
else if sharesAvailable <= 1500000:
  availabilityPressure = 48
else:
  availabilityPressure = 12
```

Utilization pressure:

```text
utilizationPressure = min(100, max(0, latest(data.daily[].availability.shortAvailabilityPct)))
```

Borrow fee pressure:

```text
borrowFeePressure = min(100, max(0, latest(data.daily[].borrowFeeAll.costToBorrowAll)))
```

On-loan pressure:

```text
sharesOnLoan = latest(data.daily[].onLoan.sharesOnLoan)

if sharesOnLoan >= 1000000:
  onLoanPressure = 100
else if sharesOnLoan >= 650000:
  onLoanPressure = 62
else if sharesOnLoan >= 400000:
  onLoanPressure = 38
else:
  onLoanPressure = 12
```

Borrow demand score:

```text
borrowDemandScore = round(
  utilizationPressure * 0.42 +
  borrowFeePressure * 0.35 +
  availabilityPressure * 0.18 +
  (sharesOnLoan > 0 ? 5 : 0)
)
```

Borrow demand label:

```text
if borrowDemandScore >= 81:
  borrowDemand = "Extreme"
else if borrowDemandScore >= 61:
  borrowDemand = "High"
else if borrowDemandScore >= 31:
  borrowDemand = "Moderate"
else:
  borrowDemand = "Low"
```

## 3. Shares Available Card

JSON path:

```text
data.derived.lendingPressurePage.cards.sharesAvailable
```

Source fields:

```text
data.daily[].availability.shortAvailabilityShares
```

Formula:

```text
current = latest(data.daily[].availability.shortAvailabilityShares)
previous = previous(data.daily[].availability.shortAvailabilityShares)
change = current - previous
changePercent = change / previous * 100
```

Display formatting:

```text
valueDisplay = current formatted with comma separators
changeDisplay = signed(change) + " shares"
changePercentDisplay = signed(changePercent rounded to 2 decimals) + "%"
deltaDisplay = changeDisplay + "(" + changePercentDisplay + ")"
pressureLabel = pressureLabel(availabilityPressure)
```

## 4. Utilization Card

JSON path:

```text
data.derived.lendingPressurePage.cards.utilization
```

Source fields:

```text
data.daily[].availability.shortAvailabilityPct
```

Formula:

```text
current = latest(data.daily[].availability.shortAvailabilityPct)
previous = previous(data.daily[].availability.shortAvailabilityPct)
change = current - previous
changePercent = change / previous * 100
```

Display formatting:

```text
valueDisplay = current rounded to 1 decimal + "%"
changeDisplay = signed(change rounded to 2 decimals) + " pts"
changePercentDisplay = signed(changePercent rounded to 2 decimals) + "%"
deltaDisplay = changeDisplay + "(" + changePercentDisplay + ")"
pressureLabel = pressureLabel(utilizationPressure)
```

## 5. Borrow Fee Card

JSON path:

```text
data.derived.lendingPressurePage.cards.borrowFee
```

Source fields:

```text
data.daily[].borrowFeeAll.costToBorrowAll
```

Formula:

```text
current = latest(data.daily[].borrowFeeAll.costToBorrowAll)
previous = previous(data.daily[].borrowFeeAll.costToBorrowAll)
change = current - previous
changePercent = change / previous * 100
```

Display formatting:

```text
valueDisplay = current rounded to 2 decimals + "%"
changeDisplay = signed(change rounded to 2 decimals) + " pts"
changePercentDisplay = signed(changePercent rounded to 2 decimals) + "%"
deltaDisplay = changeDisplay + "(" + changePercentDisplay + ")"
pressureLabel = pressureLabel(borrowFeePressure)
```

## 6. On Loan Card

JSON path:

```text
data.derived.lendingPressurePage.cards.onLoan
```

Source fields:

```text
data.daily[].onLoan.sharesOnLoan
```

Formula:

```text
current = latest(data.daily[].onLoan.sharesOnLoan)
previous = previous(data.daily[].onLoan.sharesOnLoan)
change = current - previous
changePercent = change / previous * 100
```

Display formatting:

```text
valueDisplay = current formatted with comma separators
changeDisplay = signed(change) + " shares"
changePercentDisplay = signed(changePercent rounded to 2 decimals) + "%"
deltaDisplay = changeDisplay + "(" + changePercentDisplay + ")"
pressureLabel = pressureLabel(onLoanPressure)
```

If on-loan data is unavailable:

```json
{
  "value": null,
  "valueDisplay": "N/A",
  "change": null,
  "changeDisplay": "No prior update",
  "changePercent": null,
  "changePercentDisplay": "N/A",
  "deltaDisplay": "No prior update",
  "previousValue": null,
  "deltaCurrentValue": null,
  "pressureLabel": "Low Pressure",
  "sourceStatus": "missing_from_ortex_consolidated_source"
}
```

## 7. Pressure Label Helper

```text
if componentPressure >= 81:
  pressureLabel = "Extreme Pressure"
else if componentPressure >= 61:
  pressureLabel = "High Pressure"
else if componentPressure >= 31:
  pressureLabel = "Moderate Pressure"
else:
  pressureLabel = "Low Pressure"
```

## Minimal Complete Example

```json
{
  "data": {
    "derived": {
      "lendingPressurePage": {
        "summary": {},
        "components": {},
        "cards": {
          "sharesAvailable": {},
          "utilization": {},
          "borrowFee": {},
          "onLoan": {}
        }
      }
    }
  }
}
```
