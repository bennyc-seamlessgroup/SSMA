# Historical CSV Import Consolidation Fix

## Purpose

This document describes a backend issue where a CSV import succeeds and writes all raw manual-input files, but the corresponding consolidated market-history data does not update for the full imported date range.

The confirmed example is:

- Ticker: `MIMI`
- Import category: `manual-availability`
- Portal label: Broker shortable shares
- Imported rows: `162`
- Generated raw files: `162`
- Imported range includes historical dates substantially earlier than the consolidation cutoff

This is a backend consolidation issue, not a CSV upload or frontend parsing issue.

## Current Workflow

The Operations Portal performs these requests:

1. Upload the CSV:

   ```http
   POST /manual-input/import?ticker=MIMI&category=manual-availability
   Content-Type: multipart/form-data
   Authorization: <id_token>
   ```

2. Verify the raw manual-input records:

   ```http
   GET /manual-input/manual-availability?ticker=MIMI
   Authorization: <id_token>
   ```

3. Trigger consolidation:

   ```http
   POST /manual-input/consolidate?ticker=MIMI
   Content-Type: application/json
   Authorization: <id_token>

   {
     "ticker": "MIMI"
   }
   ```

4. User-facing pages read consolidated records from:

   ```http
   GET /market-data/history?ticker=MIMI&category=market-history
   GET /market-data/current?ticker=MIMI&category=market-current
   ```

## Confirmed Behavior

`POST /manual-input/import` correctly:

- Parses the CSV.
- Reports all rows as imported.
- Reports no skipped rows or validation errors.
- Writes one date-partitioned file per imported trade date.
- Returns the expected generated paths, for example:

  ```text
  manual-input/manual-availability/MIMI/2026-07-24/manual-availability.json
  manual-input/manual-availability/MIMI/2026-07-23/manual-availability.json
  manual-input/manual-availability/MIMI/2026-07-22/manual-availability.json
  ```

However, `POST /manual-input/consolidate` currently calculates its own recent `rebuild_from_date`. It ignores an imported CSV's complete date range.

The current integration contract also states that client-provided values such as `rebuild_from_date` are ignored.

As a result:

- Recent dates at or after the backend cutoff may be rebuilt.
- Imported dates before the cutoff remain only in raw manual-input storage.
- `market-history` continues to contain old values for those historical dates.
- The frontend correctly reads consolidated history but cannot display the newly imported historical values.
- A successful consolidation-trigger response only means the asynchronous job was accepted. It does not mean consolidation completed successfully.

## Root Cause

The consolidation date range is disconnected from the date range written by the CSV import.

`force_rebuild: true` does not solve the issue if the rebuild still starts at a recent backend-calculated date.

The consolidator must rebuild every date changed by the import, not only the normal daily consolidation range.

## Required Backend Fix

### Minimum Required Change

Update `POST /manual-input/consolidate` to accept and honor:

```json
{
  "ticker": "MIMI",
  "rebuild_from_date": "2025-05-01",
  "rebuild_to_date": "2026-07-24",
  "force_rebuild": true
}
```

Rules:

1. Validate dates as `YYYY-MM-DD`.
2. Require `rebuild_from_date <= rebuild_to_date`.
3. Use the supplied range when the caller has `OPERATOR` or `ADMIN` access.
4. Continue using the existing automatic recent-date calculation when no range is supplied.
5. Rebuild all affected consolidated records inclusively.
6. Do not silently replace the supplied date range with the normal daily cutoff.
7. Keep the operation idempotent. Repeating the same rebuild must produce the same consolidated output.

### Recommended Import Response Change

Update `POST /manual-input/import` to return the imported date range:

```json
{
  "message": "Import completed successfully",
  "category": "manual-availability",
  "ticker": "MIMI",
  "inputRows": 162,
  "importedRows": 162,
  "skippedRows": 0,
  "errors": [],
  "importedDateRange": {
    "startDate": "2025-05-01",
    "endDate": "2026-07-24",
    "dateCount": 162
  },
  "generatedFiles": []
}
```

The frontend can then pass `importedDateRange.startDate` and `importedDateRange.endDate` to the consolidation endpoint without recalculating them from file paths.

### Preferred Long-Term Design

Return an `importJobId` from the import endpoint:

```json
{
  "importJobId": "import-mimi-20260727-001",
  "ticker": "MIMI",
  "category": "manual-availability",
  "importedDateRange": {
    "startDate": "2025-05-01",
    "endDate": "2026-07-24"
  }
}
```

Then allow:

```http
POST /manual-input/consolidate
```

```json
{
  "ticker": "MIMI",
  "importJobId": "import-mimi-20260727-001"
}
```

The backend should derive the exact affected dates and categories from the import job. This avoids trusting the frontend to describe what was imported.

## Asynchronous Job Status

The consolidation endpoint currently returns before processing finishes. The response should make this explicit and return a job identifier:

```json
{
  "message": "Consolidation queued",
  "status": "queued",
  "jobId": "consolidation-mimi-20260727-001",
  "ticker": "MIMI",
  "rebuild_from_date": "2025-05-01",
  "rebuild_to_date": "2026-07-24"
}
```

Recommended status endpoint:

```http
GET /manual-input/consolidate/status?jobId=consolidation-mimi-20260727-001
```

Recommended completed response:

```json
{
  "jobId": "consolidation-mimi-20260727-001",
  "status": "completed",
  "ticker": "MIMI",
  "recordsProcessed": 162,
  "recordsUpdated": 162,
  "recordsFailed": 0,
  "generatedAt": "2026-07-27T12:15:00Z"
}
```

Supported statuses should be:

- `queued`
- `running`
- `completed`
- `completed_with_errors`
- `failed`

## Consolidation Rules for Manual Availability

For each affected trade date:

1. Read:

   ```text
   manual-input/manual-availability/{ticker}/{tradeDate}/manual-availability.json
   ```

2. Read the vendor records required for the same trade date.
3. Produce the consolidated date record in `market-history`.
4. Preserve source-specific fields:

   - `availableSharesIbkr`
   - `availableSharesFutu`
   - `availableSharesChartExchange`

5. Calculate the backend-owned consolidated field:

   - `availableShares`

6. Do not calculate or select the consolidated value in the frontend.
7. Apply the documented backend selection rule consistently for imports and normal daily consolidation.
8. Add field provenance identifying the source and source date.

## Cache and Publication Requirements

After successful consolidation:

1. Update `generatedAt` for the affected consolidated output.
2. Ensure these endpoints return the rebuilt values:

   ```http
   GET /market-data/history?ticker=MIMI&category=market-history
   GET /market-data/current?ticker=MIMI&category=market-current
   ```

3. Invalidate any backend or CDN cache associated with the ticker and affected categories.
4. Do not publish `market-current` from a partially complete date unless the existing publication-readiness rules are satisfied.
5. Historical records should still update even when an imported date is not eligible to become the current published date.

## Error Handling

The backend must not return a generic success when:

- Some requested dates were not rebuilt.
- Raw files were imported but consolidation did not process them.
- A source file could not be read.
- A consolidated record failed validation.

Use a partial-result response where appropriate:

```json
{
  "status": "completed_with_errors",
  "recordsProcessed": 162,
  "recordsUpdated": 160,
  "recordsFailed": 2,
  "errors": [
    {
      "tradeDate": "2025-08-14",
      "reason": "Required vendor source was unavailable"
    }
  ]
}
```

## Acceptance Tests

### Test 1: Full Historical Import

1. Import 162 `manual-availability` rows for `MIMI`.
2. Include dates older than the normal daily consolidation cutoff.
3. Trigger consolidation using the full imported date range.
4. Confirm all 162 affected dates are processed.
5. Confirm old and recent values appear correctly in `market-history`.

Expected result: no imported date is skipped because it predates the normal daily cutoff.

### Test 2: Single Historical Date Replacement

1. Import one changed historical date.
2. Trigger consolidation for that date.
3. Confirm only that date is rebuilt.
4. Confirm unrelated historical records remain unchanged.

### Test 3: Current Publication Independence

1. Rebuild an old historical date.
2. Confirm the historical record changes.
3. Confirm `market-current` remains on the latest publication-ready date.

### Test 4: Idempotency

1. Run the same consolidation range twice.
2. Confirm no duplicate records are produced.
3. Confirm calculated values remain identical.

### Test 5: Cache Invalidation

1. Read `market-history` before import.
2. Import changed values and complete consolidation.
3. Read `market-history` again without waiting for cache expiry.
4. Confirm the response contains the new values and a newer `generatedAt`.

### Test 6: Asynchronous Failure Visibility

1. Force one date to fail.
2. Confirm the job status reports `completed_with_errors` or `failed`.
3. Confirm the endpoint does not report the entire rebuild as completed successfully.

## Frontend Status

The Operations Portal has been updated so that:

- Raw import success is not treated as consolidated-history success.
- The consolidation response's `rebuild_from_date` is shown.
- The portal warns when imported dates fall before the backend rebuild cutoff.
- The portal explains that the consolidation response is asynchronous.

No frontend change can rebuild dates that the backend consolidator does not process.

## Definition of Done

The issue is resolved when:

1. A historical CSV import can rebuild its complete affected date range.
2. Consolidated history reflects every successfully imported row.
3. The API reports queued, running, completed, and failed states accurately.
4. The frontend can verify completion without relying on an arbitrary wait time.
5. `market-history` updates immediately after successful completion and cache invalidation.
6. Daily consolidation behavior remains backward compatible when no explicit import range is supplied.
