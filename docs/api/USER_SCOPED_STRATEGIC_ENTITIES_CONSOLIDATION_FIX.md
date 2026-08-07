# User-Scoped Strategic Entities Consolidation Fix

## Executive Summary

The Ownership page must show Strategic Entities from the logged-in user's
Internal Float records. These records are private to the authenticated user and
must never fall back to ticker-wide or another user's data.

The current input record can be saved successfully while the consolidated
`internal-float-current-user` snapshot continues to report zero. This causes the
Strategic Entities detail list to show holdings while the Ownership Structure
donut shows `0`.

The backend must update the consolidation pipeline so it:

1. Resolves the authenticated Cognito `sub` when consolidation is requested.
2. Passes that user identifier to the asynchronous consolidator.
3. Reads the matching user-scoped Internal Float input file.
4. Writes the matching user-scoped current snapshot.
5. Never substitutes the ticker-level snapshot for this API category.

## Required Privacy Rule

For the same ticker, each user must have an independent Strategic Entities
dataset.

| Login | Input scope | Consolidated scope | Ownership page result |
|---|---|---|---|
| User A | User A holdings | User A snapshot | User A holdings only |
| User B | User B holdings | User B snapshot | User B holdings only |
| User with no records | Empty user scope | Empty user snapshot | Zero / empty state |

No user may receive another user's Strategic Entities records or totals.

## Relevant APIs

### User input

```http
GET /manual-input/internal-float-inputs-user?ticker=CURR
PUT /manual-input/internal-float-inputs-user?ticker=CURR
Authorization: <Cognito ID token>
```

This category stores the authenticated user's editable Management / Strategic
holdings.

### Consolidation trigger

```http
POST /manual-input/consolidate?ticker=CURR
Authorization: <Cognito ID token>
Content-Type: application/json

{
  "ticker": "CURR"
}
```

### User current snapshot

```http
GET /market-data/current?ticker=CURR&category=internal-float-current-user
Authorization: <Cognito ID token>
```

This is the only consolidated Strategic Entities source used by the Ownership
donut.

## Required Storage Resolution

### Input object

The consolidator must read:

```text
manual-input/internal-float-inputs-user/{ticker}/{user_sub}/internal-float-inputs-user.json
```

Example:

```text
manual-input/internal-float-inputs-user/CURR/abc-user-sub/internal-float-inputs-user.json
```

### Consolidated output object

The consolidator must write:

```text
current/{ticker}/{user_sub}/internal-float-current-user.json
```

Example:

```text
current/CURR/abc-user-sub/internal-float-current-user.json
```

### Prohibited fallback

For `category=internal-float-current-user`, do not fall back to:

```text
current/{ticker}/internal-float-current-ticker.json
```

If the user-specific object does not exist, return an empty user-scoped
response or `404 Not Found`. Returning the ticker-level object is not allowed.

## Consolidation Trigger Requirements

The API handling `POST /manual-input/consolidate` must extract the authenticated
Cognito `sub` from the validated ID token and pass it to the asynchronous
consolidator.

Recommended invocation payload:

```json
{
  "source": "user-inputs-update",
  "ticker": "CURR",
  "userSub": "abc-user-sub",
  "inputType": "internal-float-inputs-user",
  "forceRebuild": true,
  "requestedAt": "2026-08-07T10:00:00Z"
}
```

The consolidator must not attempt to infer the user from a ticker. A ticker can
have multiple authorized users.

The consolidation request may continue to return immediately, but its response
should identify the accepted scope:

```json
{
  "message": "Consolidation pipeline triggered successfully",
  "ticker": "CURR",
  "scope": "user",
  "userSub": "abc-user-sub",
  "inputType": "internal-float-inputs-user"
}
```

Do not expose `userSub` in user-facing portal text. It is useful in authenticated
API responses, logs, and development diagnostics.

## Input Schema

Example user input:

```json
{
  "ticker": "CURR",
  "managementStrategicHoldings": {
    "records": [
      {
        "id": "holding-001",
        "holderName": "Regal Planet Ltd",
        "category": "Strategic Investor",
        "shares": 59771223,
        "includeInDeduction": true,
        "notes": ""
      }
    ]
  },
  "privateFriendlyHolders": {
    "shares": 0,
    "ratio": 0
  }
}
```

Records should preserve server-managed audit metadata where available:

```text
createdBy
createdAt
updatedBy
updatedAt
deletedAt
```

## Consolidated Output Schema

Expected output:

```json
{
  "schemaVersion": 1,
  "ticker": "CURR",
  "scope": "user",
  "generatedForSub": "abc-user-sub",
  "generatedAt": "2026-08-07T10:02:00Z",
  "managementStrategicHoldings": {
    "shares": 59771223,
    "records": [
      {
        "id": "holding-001",
        "holderName": "Regal Planet Ltd",
        "category": "Strategic Investor",
        "shares": 59771223,
        "includeInDeduction": true,
        "notes": ""
      }
    ]
  }
}
```

`scope` and `generatedForSub` are recommended so clients and diagnostics can
verify that the response is user-specific. They must be generated by the
backend and must not be accepted from client input.

## Strategic Entities Calculation

Use only active records from the authenticated user's input file.

```text
active_records = managementStrategicHoldings.records
  where deletedAt is null or absent
  and includeInDeduction is not false

managementStrategicHoldings.shares = sum(active_records[].shares)

strategicEntitiesPercent =
  issuedShare > 0
    ? managementStrategicHoldings.shares / issuedShare * 100
    : 0
```

Requirements:

- Cast share values to finite non-negative numbers.
- Preserve valid record identifiers and record details.
- Do not include deleted records.
- Do not include records with `includeInDeduction=false` in the aggregate.
- Do not merge another user's records.
- Do not merge ticker-level Internal Float holdings into the user aggregate.

## Ownership Page Calculation

The frontend uses these sources:

| Value | API source |
|---|---|
| Issued Share | `ownership-current.issuedShare` |
| Institutional Shares | `ownership-current.institutionalSharesLong` |
| Strategic Entities | `internal-float-current-user.managementStrategicHoldings.shares` |
| Public Float | Calculated from the three values above |

Formula:

```text
publicFloatShares = max(
  0,
  issuedShare - institutionalSharesLong - userStrategicEntitiesShares
)
```

The frontend must not use `ownership-current.strategicEntities` as a fallback
for a missing user-specific total.

## Relationship to `showInOwnership`

`showInOwnership` belongs to the ticker-level Operations category:

```text
/manual-input/management-holdings
```

It controls whether an Operations record is included in the ticker-wide
`ownership-current.strategicEntities` output.

It does not control whether a user-saved Internal Float holding is included in
that user's `internal-float-current-user` snapshot. User records use
`includeInDeduction` for the user-specific aggregate.

Do not require `showInOwnership` on `internal-float-inputs-user` records unless
the API contract is deliberately redesigned. Adding it only to the frontend
payload will not fix the missing user snapshot.

## Create, Edit, and Delete Behavior

### Create

After a user saves a new active holding and requests consolidation, the new
record and its shares must appear in the same user's current snapshot.

### Edit

After a user changes a holding and requests consolidation, the current snapshot
must contain the revised record and recalculated aggregate. The previous value
must not remain in the aggregate.

### Delete

After a user deletes a holding and requests consolidation, the record must be
removed or marked with `deletedAt`. Deleted shares must not remain in the
aggregate.

### Batch workflow

Saving, editing, or deleting inputs should not automatically invoke the heavy
consolidation job. The user may make multiple changes and then confirm they are
finished. One consolidation request should rebuild the final user snapshot.

## Error and Empty-State Behavior

### No user input file

Recommended response:

```json
{
  "schemaVersion": 1,
  "ticker": "CURR",
  "scope": "user",
  "generatedForSub": "abc-user-sub",
  "generatedAt": null,
  "managementStrategicHoldings": {
    "shares": 0,
    "records": []
  }
}
```

Alternatively, return `404 Not Found`. Do not return the ticker snapshot.

### Consolidation failure

- Log the ticker, user `sub`, input path, output path, request identifier, and
  failure reason.
- Do not overwrite a valid user snapshot with ticker data.
- Return enough request information from the trigger endpoint for backend logs
  to be correlated.

## Required Backend Tests

### Test 1: User A isolation

1. Save a 1,000-share holding for User A and ticker `CURR`.
2. Run consolidation as User A.
3. Fetch `internal-float-current-user` as User A.
4. Confirm the total is 1,000 and the record is present.

### Test 2: User B isolation

1. Save a 2,000-share holding for User B and ticker `CURR`.
2. Run consolidation as User B.
3. Fetch as User B and confirm the total is 2,000.
4. Fetch as User A and confirm the total remains 1,000.

### Test 3: User with no data

1. Authenticate as User C with access to `CURR` but no Internal Float input.
2. Fetch `internal-float-current-user`.
3. Confirm the result is empty or `404`.
4. Confirm User A, User B, and ticker-level data are not returned.

### Test 4: Edit

1. Change User A's holding from 1,000 to 1,500.
2. Run consolidation as User A.
3. Confirm User A's total becomes 1,500.
4. Confirm User B remains 2,000.

### Test 5: Delete

1. Delete User A's holding.
2. Run consolidation as User A.
3. Confirm User A's total becomes zero and records are empty.
4. Confirm User B remains unchanged.

### Test 6: No ticker fallback

1. Create a ticker-level snapshot containing 99,000 shares.
2. Authenticate as a user with no user snapshot.
3. Fetch `internal-float-current-user`.
4. Confirm 99,000 is never returned.

## Acceptance Criteria

The fix is complete when all of the following are true:

- A saved user holding is present in that user's input API.
- Consolidation receives and logs the authenticated user `sub`.
- Consolidation reads and writes the matching user-scoped paths.
- `managementStrategicHoldings.shares` equals the sum of active user records.
- The user-specific API never returns ticker-level fallback data.
- User A and User B can hold different Strategic Entities totals for the same
  ticker.
- The Ownership donut displays each logged-in user's own total.
- Public Float is recalculated using that same user-specific total.
- Create, edit, and delete produce correct results after one manual
  consolidation request.
- `ownership-current.strategicEntities` and `showInOwnership` remain separate
  ticker-level Operations behavior.

