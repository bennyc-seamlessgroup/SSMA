# Portal Number Formatting

The portal uses `lib/number-format.ts` as the shared source of display rules for
large quantities and currencies. Formatting changes presentation only; API
values are never multiplied, divided, or persisted in a different unit.

## Compact display rules

| Numeric range | Display unit | Example |
| --- | --- | --- |
| `abs(value) >= 1,000,000` | Millions (`M`) | `2,634,644` → `2.63M` |
| `abs(value) >= 1,000` and `< 1,000,000` | Thousands (`K`) | `850,000` → `850.00K` |
| `abs(value) < 1,000` | No suffix | `875` → `875` |

- Compact KPI values use two decimal places by default.
- Currency uses the same thresholds and keeps the currency symbol, for example
  `2,634,644` → `$2.63M`.
- Negative values retain their sign.
- Missing or invalid values display `N/A` unless the caller supplies a different
  fallback.

## Where compact formatting is used

- Summary and KPI cards.
- Donut centers and chart legends.
- Ranked breakdown bars.
- Chart axes and tooltips where the full value would reduce readability.
- Alert values expressed as shares or currency.

Detailed filing, operations, audit, and formula tables retain exact
comma-separated values so users can inspect and reconcile the source data.
