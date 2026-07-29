# Issued Share Historical Import Fix

## Problem

The issued-share CSV is historical and contains one effective value per `tradeDate`.
The current backend treats `issued-share` as a single-record category and writes:

```text
manual-input/issued-share/{ticker}/issued-share.json
```

This discards every CSV date and retains only the latest value. Consolidation then
applies that latest value to earlier market-history records. This produces incorrect
historical issued-share values in the portal.

Example from the MIMI import:

| Trade date | Expected issued share |
|---|---:|
| 2026-07-28 | 7,063,506 |
| 2026-07-14 | 7,063,506 |
| 2026-07-13 | 2,753,129 |
| 2026-07-10 | 2,753,129 |
| 2025-01-15 | 2,301,250 |

The current consolidated output incorrectly shows `7,063,506` for all these dates.

## Required Storage Contract

Change `issued-share` from **Single-Record** to **Date-Specific**.

Store each effective-date record at:

```text
manual-input/issued-share/{ticker}/{tradeDate}/issued-share.json
```

Payload:

```json
{
  "ticker": "MIMI",
  "tradeDate": "2026-07-13",
  "issuedShare": 2753129,
  "createdAt": "ISO-8601 timestamp",
  "createdBy": "operator email",
  "updatedAt": "ISO-8601 timestamp",
  "updatedBy": "operator email"
}
```

## CSV Import Rules

`POST /manual-input/import?ticker={ticker}&category=issued-share` must:

1. Require the columns `tradeDate,issuedShare`.
2. Parse formatted numbers such as `"7,063,506"` as integers.
3. Validate `tradeDate` as `YYYY-MM-DD`.
4. Group rows by `tradeDate`.
5. Write one date-partitioned file per unique trade date.
6. Replace only dates present in the uploaded CSV.
7. Preserve issued-share files for dates not present in the CSV.
8. If a CSV contains duplicate dates, apply a deterministic rule. Recommended:
   reject conflicting duplicate values; otherwise store one copy.
9. Return every generated date-partitioned path in `generatedFiles`.

## Read API Rules

Support:

```http
GET /manual-input/issued-share?ticker=MIMI&tradeDate=2026-07-13
```

The response must return the exact record for that date. It must not substitute the
latest issued-share value.

An optional list endpoint or date range parameters are recommended for operations:

```http
GET /manual-input/issued-share?ticker=MIMI&startDate=2025-01-15&endDate=2026-07-28
```

## Consolidation Rules

For each market-history date `D`, determine issued share using the most recent
effective issued-share record whose date is less than or equal to `D`:

```text
issuedShare(D) =
  issuedShare from MAX(effective tradeDate)
  WHERE effective tradeDate <= D
```

Never propagate a later issued-share value backward into earlier dates.

Example:

```text
2026-07-14 through 2026-07-28 -> 7,063,506
2026-07-13 and earlier until the prior change -> 2,753,129
2025-01-15 and applicable dates after it -> 2,301,250
```

The current snapshot may use the latest effective record, but historical records
must retain their date-correct values.

## Rebuild Requirement

After historical import, consolidation must rebuild from the earliest imported
`tradeDate`. The current consolidation API documentation says the backend ignores
the client's `rebuild_from_date` and chooses a recent cutoff. That behavior prevents
historical corrections and must be changed for this import.

Recommended behavior:

```json
{
  "ticker": "MIMI",
  "input_type": "issued-share",
  "force_rebuild": true,
  "rebuild_from_date": "2025-01-15"
}
```

The response should report the exact accepted rebuild date.

## Outputs That Must Be Regenerated

At minimum:

- `history/{ticker}/market-history.json`
- `current/{ticker}/market-current.json`
- `current/{ticker}/ownership-current.json`
- Any short-interest, internal-float, or report output that contains issued share
  or a calculation using issued share

## Acceptance Tests

After importing the supplied MIMI CSV and completing consolidation:

1. `market-history` on `2026-07-14` has `issuedShare = 7063506`.
2. `market-history` on `2026-07-13` has `issuedShare = 2753129`.
3. `market-history` on `2026-07-10` has `issuedShare = 2753129`.
4. `market-history` on `2025-01-15` has `issuedShare = 2301250`.
5. `ownership-current.issuedShare = 7063506`.
6. No date before `2026-07-14` is backfilled with `7063506` unless that value was
   explicitly effective on that date.
7. The import response generates one canonical file per unique CSV trade date,
   rather than one single current file.
