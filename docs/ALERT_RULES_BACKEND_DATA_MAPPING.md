# Alert Rules — Source API and JSON Path for Each Data Field

API documentation:

- [`GET /market-data/current`](./api/INTEGRATION_V7.md#get-market-datacurrent)
- [`GET /market-data/history`](./api/INTEGRATION_V7.md#get-market-datahistory)
- [`POST /rule-engine/check`](./api/INTEGRATION_V7.md#post-rule-enginecheck)

## Important

The Dashboard Alert Center does not directly load these market-data APIs. It sends each rule to `POST /rule-engine/check`.

The table below identifies the centralized-v2 API and JSON field that the backend should use to populate or evaluate each alert data field.

## Data-Field Mapping

| Alert data field | Source API | Source JSON file | Source field path | Mapping |
|---|---|---|---|---|
| `shortInterestFloatPercent` | `GET /market-data/current?ticker={ticker}&category=market-current` | `current/{ticker}/market-current.json` | `shortInterest.percent` | Direct current value |
| `dailyShortVolumeRatio` | `GET /market-data/history?ticker={ticker}&category=short-volume-history` | `history/{ticker}/short-volume-history.json` | Latest `records[].totalShortVolumeReported` and `records[].totalVolumeReported` | Calculate `totalShortVolumeReported / totalVolumeReported × 100` |
| `shortScore` | `GET /market-data/current?ticker={ticker}&category=market-current` | `current/{ticker}/market-current.json` | `scores.shortScore.value` | Direct current value |
| `borrowFeeRate` | `GET /market-data/current?ticker={ticker}&category=market-current` | `current/{ticker}/market-current.json` | `borrowFee.percent` | Direct current value |
| `utilization` | `GET /market-data/current?ticker={ticker}&category=market-current` | `current/{ticker}/market-current.json` | `utilization.percent` | Direct current value |
| `availableShares` | `GET /market-data/current?ticker={ticker}&category=market-current` | `current/{ticker}/market-current.json` | `availableShares.value` | Direct current value |
| `ftdCount` | `GET /market-data/history?ticker={ticker}&category=ftd-history` | `history/{ticker}/ftd-history.json` | Latest `records[].shares` | Use the newest FTD record |
| `ftdValue` | `GET /market-data/history?ticker={ticker}&category=ftd-history` | `history/{ticker}/ftd-history.json` | Latest `records[].value` | Use the newest FTD record |
| `priceDrawdown` | `GET /market-data/history?ticker={ticker}&category=market-history` | `history/{ticker}/market-history.json` | Latest two valid `records[].price` values | Calculate `(latest price - previous price) / previous price × 100` |
| `volumeSpike` | `GET /market-data/history?ticker={ticker}&category=market-history` | `history/{ticker}/market-history.json` | `records[].tradeVolume` | Calculate latest volume divided by the average of up to 20 previous valid volumes |
| `intradayPriceSpike` | No complete source in the current documented API | Not currently available | Requires an explicit `intradayPriceSpike`, or current-day `open` and `high` fields | Backend field/API addition required |

## Historical Fallback Paths

If the backend evaluates alerts from the latest published `market-history` record instead of `market-current`, use:

| Alert data field | History API field |
|---|---|
| `shortInterestFloatPercent` | Latest `records[].shortInterestPercent` |
| `shortScore` | Latest `records[].shortScore` |
| `borrowFeeRate` | Latest `records[].borrowFeePercent` |
| `utilization` | Latest `records[].utilizationPercent` |
| `availableShares` | Latest `records[].availableShares` |

Endpoint:

```text
GET /market-data/history?ticker={ticker}&category=market-history
```

JSON file:

```text
history/{ticker}/market-history.json
```

## Fields Missing as Direct API Values

These alert fields do not currently exist as direct fields in the documented centralized-v2 API:

| Alert field | Required backend action |
|---|---|
| `dailyShortVolumeRatio` | Calculate it from the latest short-volume history record, or add it as a consolidated field. |
| `priceDrawdown` | Calculate it from the latest two valid market-history prices, or add it as a consolidated field. |
| `volumeSpike` | Confirm that `market-history.records[].tradeVolume` is populated and documented, then calculate the ratio or add a consolidated field. |
| `intradayPriceSpike` | Add an explicit field, or add `open` and `high` values so it can be calculated. |

## Rule-Catalog Field Names

The current rule catalog expects these evaluation fields:

| Alert name | Rule-engine JSON path |
|---|---|
| Short Interest Float % | `*.shortInterestFloatPercent` |
| Daily Short Volume Ratio | `*.dailyShortVolumeRatio` |
| Short Score | `*.shortScore` |
| Borrow Fee Rate | `*.borrowFeeRate` |
| Utilization | `*.utilization` |
| Shortable Shares | `*.availableShares` |
| FTD Count | `*.ftdCount` |
| FTD Value | `*.ftdValue` |
| Price Drawdown | `*.priceDrawdown` |
| Volume Spike | `*.volumeSpike` |
| Intraday Price Spike | `*.intradayPriceSpike` |

Therefore, the backend must either:

1. populate these rule-engine field names from the source API paths above, or
2. change the catalog `jsonPath` and formula to evaluate the centralized-v2 paths directly.

