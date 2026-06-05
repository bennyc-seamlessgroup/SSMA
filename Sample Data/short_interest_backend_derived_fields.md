# Short Interest Backend Derived Fields

This document lists derived fields the backend should populate in:

```text
import_data/short/ortex_consolidated.json
```

The derived output should live under:

```text
data.derived.shortInterestPage.cards
```

The frontend currently reads the primary KPI values from `data.current`, but the change text should be provided by these derived fields so the UI does not need to calculate deltas.

## General Rules

- Sort `data.daily[]` by `date` ascending.
- `latest(...)` means the row with the newest `date`.
- `previous(...)` means the row immediately before the latest row.
- `change = current - previous`.
- `changePercent = previous === 0 ? 0 : change / previous * 100`.
- `signed(value)` means prefix `+` for positive values, `-` for negative values, and no sign for zero.
- `deltaDisplay = changeDisplay + "(" + changePercentDisplay + ")"`.
- Use `null` for unavailable numeric values rather than omitting keys.

## Common Output Shape

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
  "deltaCurrentValue": 0
}
```

## 1. Short Interest

JSON path:

```text
data.derived.shortInterestPage.cards.shortInterest
```

Source fields:

```text
data.daily[].shortInterest.shortInterestShares
```

Formula:

```text
current = latest(data.daily[].shortInterest.shortInterestShares)
previous = previous(data.daily[].shortInterest.shortInterestShares)
change = current - previous
changePercent = change / previous * 100
```

Display formatting:

```text
valueDisplay = current formatted with comma separators
changeDisplay = signed(change) + " shares"
changePercentDisplay = signed(changePercent rounded to 2 decimals) + "%"
deltaDisplay = changeDisplay + "(" + changePercentDisplay + ")"
```

Example:

```json
{
  "value": 931718,
  "valueDisplay": "931,718",
  "change": 12,
  "changeDisplay": "+12 shares",
  "changePercent": 0.0013,
  "changePercentDisplay": "+0.00%",
  "deltaDisplay": "+12 shares(+0.00%)",
  "previousValue": 931706,
  "deltaCurrentValue": 931718
}
```

## 2. SI % Float

JSON path:

```text
data.derived.shortInterestPage.cards.shortInterestPercentFloat
```

Source fields:

```text
data.daily[].shortInterest.shortInterestPcFreeFloat
```

Formula:

```text
current = latest(data.daily[].shortInterest.shortInterestPcFreeFloat)
previous = previous(data.daily[].shortInterest.shortInterestPcFreeFloat)
change = current - previous
changePercent = change / previous * 100
```

Display formatting:

```text
valueDisplay = current rounded to 2 decimals + "%"
changeDisplay = signed(change rounded to 2 decimals) + " pts"
changePercentDisplay = signed(changePercent rounded to 2 decimals) + "%"
deltaDisplay = changeDisplay + "(" + changePercentDisplay + ")"
```

## 3. Days To Cover

JSON path:

```text
data.derived.shortInterestPage.cards.daysToCover
```

Source fields:

```text
data.daily[].daysToCover.daysToCover
```

Formula:

```text
current = latest(data.daily[].daysToCover.daysToCover)
previous = previous(data.daily[].daysToCover.daysToCover)
change = current - previous
changePercent = change / previous * 100
```

Display formatting:

```text
valueDisplay = current rounded to 2 decimals
changeDisplay = signed(change rounded to 2 decimals)
changePercentDisplay = signed(changePercent rounded to 2 decimals) + "%"
deltaDisplay = changeDisplay + "(" + changePercentDisplay + ")"
```

## 4. Borrow Fee

JSON path:

```text
data.derived.shortInterestPage.cards.borrowFee
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
```

## 5. Shares Available

JSON path:

```text
data.derived.shortInterestPage.cards.sharesAvailable
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
```

## 6. Utilization

JSON path:

```text
data.derived.shortInterestPage.cards.utilization
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
valueDisplay = current rounded to 2 decimals + "%"
changeDisplay = signed(change rounded to 2 decimals) + " pts"
changePercentDisplay = signed(changePercent rounded to 2 decimals) + "%"
deltaDisplay = changeDisplay + "(" + changePercentDisplay + ")"
```

## 7. Short Score

JSON path:

```text
data.derived.shortInterestPage.cards.shortScore
```

Source fields:

```text
data.daily[].shortScore.score
```

Formula:

```text
currentRaw = latest(data.daily[].shortScore.score)
previous = previous(data.daily[].shortScore.score)
current = round(currentRaw)
change = current - previous
changePercent = change / previous * 100
```

Display formatting:

```text
valueDisplay = current + " / 100"
changeDisplay = signed(change rounded to 1 decimal)
changePercentDisplay = signed(changePercent rounded to 2 decimals) + "%"
deltaDisplay = changeDisplay + "(" + changePercentDisplay + ")"
```

## 8. Short Score Level

JSON path:

```text
data.derived.shortInterestPage.cards.shortScoreLevel
```

Source fields:

```text
data.derived.shortInterestPage.cards.shortScore.value
```

Formula:

```text
score = data.derived.shortInterestPage.cards.shortScore.value

if score >= 80:
  level = "Extreme"
else if score >= 65:
  level = "High"
else if score >= 40:
  level = "Moderate"
else:
  level = "Low"
```

Expected output:

```json
{
  "value": "High",
  "valueDisplay": "High"
}
```

## Minimal Complete Example

```json
{
  "data": {
    "derived": {
      "shortInterestPage": {
        "cards": {
          "shortInterest": {},
          "shortInterestPercentFloat": {},
          "daysToCover": {},
          "borrowFee": {},
          "sharesAvailable": {},
          "utilization": {},
          "shortScore": {},
          "shortScoreLevel": {}
        }
      }
    }
  }
}
```
