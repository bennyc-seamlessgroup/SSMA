# Institutional Ownership Backend Derived Fields

This file defines the backend-calculated fields required by the Institutional Ownership page.

The frontend should not calculate these values. It should only display the values provided in:

`institutional_ownership_CURR_consolidated_4_web.json`

## Source Inputs

| Input | Source | Notes |
| --- | --- | --- |
| `owners[]` | `fintel_security_ownership_premium_CURR_consolidated_4_web.json` | Institutional ownership rows. |
| `activist_filings[]` | `fintel_activist_filings_premium_CURR_consolidated_4_web.json` | Treated as insider / activist ownership for this page. |
| `shares_outstanding` | ORTEX shares outstanding API | Current total shares outstanding, normalized from `https://api.ortex.com/api/v1/stock/us/curr/shares_outstanding` using the range `today - 1` / yesterday. |
| `public_float_shares` | Static company config, SEC filings, or market data provider API | Public float used in the ownership structure chart. |
| `internal_float_inputs` | Internal Float V2 manual input / future database | Used to build the public float breakdown: traditional, private / strategic, tokenized, and collateralized. |

### ORTEX Shares Outstanding Input

The backend should fetch shares outstanding from:

```text
https://api.ortex.com/api/v1/stock/us/curr/shares_outstanding
```

Date/range rule:

```text
range = today - 1 calendar day
```

Use the latest available ORTEX row for yesterday. Normalize that value into:

```text
data.overview.shares_outstanding
```

If the API has no row for yesterday because of a market holiday, weekend, or provider delay, use the latest available row on or before yesterday and preserve the effective date in source metadata.

Recommended metadata output:

```text
data.source_metadata.shares_outstanding.provider = "ORTEX"
data.source_metadata.shares_outstanding.endpoint = "https://api.ortex.com/api/v1/stock/us/curr/shares_outstanding"
data.source_metadata.shares_outstanding.requestedRange = "today - 1 calendar day (yesterday)"
data.source_metadata.shares_outstanding.effectiveDate = ORTEX row date actually used
data.source_metadata.shares_outstanding.value = data.overview.shares_outstanding
```

## Required JSON Fields

### `data.overview`

| JSON Field Name | Type | Formula / Logic |
| --- | --- | --- |
| `institutional_owners` | number | Count unique active institutional owner rows where `owners[].shares > 0`. Formula: `Count(Row) if shares > 0`. |
| `insider_owners` | number | Count unique active activist / insider rows where `activist_filings[].shares > 0`. |
| `shares_outstanding` | number | Current shares outstanding from ORTEX shares outstanding API. Use the latest available row on or before yesterday. |
| `public_float_shares` | number | Passed as a company configuration variable, SEC-derived value, or market data provider value. |
| `institutional_shares_long` | number | Sum active institutional shares. Formula: `SUM(owners[].shares) where shares > 0`. |
| `insider_shares_long` | number | Sum active activist / insider shares. Formula: `SUM(activist_filings[].shares) where shares > 0`. |
| `institutional_ownership_percent` | number | Institutional shares divided by shares outstanding. Formula: `(institutional_shares_long / shares_outstanding) * 100`. |
| `insider_ownership_percent` | number | Insider / activist shares divided by shares outstanding. Formula: `(insider_shares_long / shares_outstanding) * 100`. |
| `public_float_percent` | number | Public float divided by shares outstanding. Formula: `(public_float_shares / shares_outstanding) * 100`. |
| `institutional_value_thousands_usd` | number | Sum reported institutional filing value and divide by 1,000. Formula: `SUM(owners[].value where shares > 0) / 1000`. |
| `average_portfolio_allocation_percent` | number | Mean active institutional allocation converted to percent. Formula: `MEAN(owners[].allocation where shares > 0) * 100`. |
| `ownership_structure_total_shares` | number | Total shown in the donut chart. Formula: `insider_shares_long + institutional_shares_long + public_float_shares`. |

### `data.ownership_structure[]`

Used by the donut chart above the two institutional tables.

| JSON Field Name | Type | Formula / Logic |
| --- | --- | --- |
| `key` | string | Stable key. Expected values: `insiders`, `institutions`, `public_float`. |
| `label` | string | Display label. Expected values: `Insiders`, `Institutions`, `Public Float`. |
| `shares` | number | Shares for that category. |
| `percent` | number | Percent of `ownership_structure_total_shares`. Formula: `(shares / ownership_structure_total_shares) * 100`. |
| `color` | string | Hex color used by the chart. |

### `data.institution_bars[]`

Used by the institution holdings bar chart.

Group active institutional rows by institution name, then sum shares for each institution.

| JSON Field Name | Type | Formula / Logic |
| --- | --- | --- |
| `name` | string | Institution name from `owners[].name`. |
| `shares` | number | Sum shares for that institution. Formula: `SUM(owners[].shares) grouped by owners[].name where shares > 0`. |
| `value` | number | Sum reported value for that institution. Formula: `SUM(owners[].value) grouped by owners[].name where shares > 0`. |
| `latestFileDate` | string | Latest `owners[].fileDate` for that institution. |
| `latestEffectiveDate` | string | Latest `owners[].effectiveDate` for that institution. |
| `formType` | string | Latest or representative form type for that institution. Prefer `formTypeShort`, fallback to `formType`. |
| `ownershipPercentOfInstitutional` | number | Institution shares as percent of all institutional shares. Formula: `(institution_shares / institutional_shares_long) * 100`. |
| `ownershipPercentOfSharesOutstanding` | number | Institution shares as percent of shares outstanding. Formula: `(institution_shares / shares_outstanding) * 100`. |

### `data.insider_bars[]`

Used when the user selects `Insiders` from the ownership structure chart.

Group active activist / insider rows by holder name, then sum shares for each holder.

| JSON Field Name | Type | Formula / Logic |
| --- | --- | --- |
| `name` | string | Insider / activist holder name from `activist_filings[].name`. |
| `shares` | number | Sum shares for that insider / activist holder. Formula: `SUM(activist_filings[].shares) grouped by activist_filings[].name where shares > 0`. |
| `latestFileDate` | string | Latest `activist_filings[].fileDate` for that holder. |
| `latestEffectiveDate` | string | Latest `activist_filings[].effectiveDate` for that holder. |
| `formType` | string | Latest or representative filing form type. |
| `ownershipPercentOfInsiders` | number | Holder shares as percent of total insider / activist shares. Formula: `(holder_shares / insider_shares_long) * 100`. |
| `ownershipPercentOfSharesOutstanding` | number | Holder shares as percent of shares outstanding. Formula: `(holder_shares / shares_outstanding) * 100`. |

### `data.public_float_breakdown[]`

Used when the user selects `Public Float` from the ownership structure chart.

This should match the public float breakdown logic used by the Internal Float V2 page.

| JSON Field Name | Type | Formula / Logic |
| --- | --- | --- |
| `key` | string | Stable key. Expected values: `traditional`, `private_strategic`, `tokenized`, `collateralized`. |
| `label` | string | Display label. Expected values: `Traditional`, `Private / Strategic`, `Tokenized`, `Collateralized`. |
| `shares` | number | Shares in the category. |
| `percent` | number | Category shares divided by public float. Formula: `(shares / public_float_shares) * 100`. |
| `color` | string | Hex color used by the chart. |
| `source` | string | Data source note, for example `Internal Float V2 user inputs`. |

Public float category formulas:

| Category | Formula |
| --- | --- |
| `private_strategic` | `SUM(internal_float_inputs.privateHoldings[].shares where includeInDeduction = true)` |
| `tokenized` | `SUM(internal_float_inputs.tokenChains[].shares)` |
| `collateralized` | `SUM(internal_float_inputs.collateralChains[].shares)` |
| `traditional` | `MAX(0, public_float_shares - private_strategic - tokenized - collateralized)` |

## Important Notes

- Exclude fully closed positions from active owner counts and share sums by filtering `shares > 0`.
- The Institutional Ownership page treats activist filings as the insider / activist ownership category.
- The ownership structure legend is interactive. Clicking `Insiders`, `Institutions`, or `Public Float` changes the right-side breakdown panel.
- `Public Float` should use the same underlying assumptions as Internal Float V2 so both pages stay synchronized.
- The frontend expects backend-derived values in this consolidated file and should not recompute the business metrics.
- The current sample file still uses `shares_outstanding = 58,030,000` as a placeholder value from the portal's existing assumptions. Production should replace it with the ORTEX API result.
- The current sample file uses `public_float_shares = 32,664,808` from the portal's existing company float assumptions until a production public-float source is selected.
