# Date-Specific CSV Import Generates No Files

## Summary

`POST /manual-input/import` reports that utilization rows were imported, but returns no generated files. The subsequent GET cannot retrieve any imported record.

This is a backend import/write failure. The frontend cannot display imported utilization data until dated JSON files are generated and exposed through `GET /manual-input/utilization`.

## Observed Result

Import target:

```text
ticker=MIMI
category=utilization
```

Portal response summary:

```text
156 input rows
156 records imported
0 skipped
0 errors
0 files generated
```

The follow-up GET fails and no utilization record is displayed.

## Expected Result

Utilization is a date-specific category. Every unique CSV `tradeDate` must generate or replace one object:

```text
manual-input/utilization/{ticker}/{tradeDate}/utilization.json
```

For example:

```text
manual-input/utilization/MIMI/2026-07-17/utilization.json
```

The response must list every generated file:

```json
{
  "message": "Import completed successfully",
  "category": "utilization",
  "ticker": "MIMI",
  "recordsCount": 156,
  "inputRows": 156,
  "importedRows": 156,
  "skippedRows": 0,
  "errors": [],
  "generatedFiles": [
    "manual-input/utilization/MIMI/2026-07-17/utilization.json"
  ]
}
```

If the CSV contains 156 unique dates, `generatedFiles` must contain 156 paths. If several rows share a date, the file count should equal the number of unique dates after grouping.

## Required Backend Checks

1. Confirm `utilization` resolves to the date-specific writer.
2. Confirm the CSV `tradeDate` header is normalized and parsed.
3. Confirm rows are grouped by normalized ISO trade date.
4. Confirm the writer is invoked for every date group.
5. Confirm the resolved object key uses `utilization.json`.
6. Confirm S3 write errors are not swallowed.
7. Confirm `importedRows` is not incremented before a successful write.
8. Confirm `generatedFiles` is populated from successful writes.
9. Return a non-2xx response when zero files are written from a non-empty valid CSV.

## GET Verification

After import, this request must return the saved record:

```http
GET /manual-input/utilization?ticker=MIMI&tradeDate=2026-07-17
```

The history request must also include it:

```http
GET /manual-input/utilization?ticker=MIMI
```

## Required Error Behavior

The API must not report a successful import when `importedRows > 0` and `generatedFiles` is empty.

Recommended failure response:

```json
{
  "message": "Import failed: no utilization files were generated",
  "category": "utilization",
  "ticker": "MIMI",
  "inputRows": 156,
  "importedRows": 0,
  "skippedRows": 156,
  "generatedFiles": [],
  "errors": [
    {
      "code": "NO_OUTPUT_FILES",
      "message": "No dated utilization objects were written"
    }
  ]
}
```

## Regression Scope

Test all date-specific categories because they use the same storage pattern:

- `utilization`
- `margins`
- `short-score`
- `manual-availability`

Expected pattern:

```text
manual-input/{category}/{ticker}/{tradeDate}/{category}.json
```

## Acceptance Criteria

- [ ] A valid utilization CSV creates one file per unique trade date.
- [ ] `generatedFiles` contains all canonical paths.
- [ ] `importedRows` only counts rows included in successful writes.
- [ ] Exact-date GET returns the imported record immediately after the write completes.
- [ ] History GET includes all imported dates.
- [ ] Repeat import replaces only dates included in the CSV.
- [ ] Dates absent from the CSV remain unchanged.
- [ ] A zero-file write returns a failure response.
- [ ] Margins, short score, and manual availability pass the same tests.

