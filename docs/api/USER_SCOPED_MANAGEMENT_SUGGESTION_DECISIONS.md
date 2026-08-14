# User-scoped management suggestion decisions

## Purpose

Operations publishes a management or strategic holding recommendation once for a ticker. Every user may then apply or discard that recommendation independently. One user's decision must never change the recommendation or another user's decision.

## Global recommendation source

Operations creates recommendations with:

- `POST /manual-input/management-holdings?ticker={ticker}`
- `showInOwnership: false`
- `showAsSuggestion: true`
- `autoApply: false`
- `status: pending`

These records are ticker-wide source data. The user portal must not update their `status` when a user applies or discards a recommendation. Operations may still delete or supersede a source recommendation globally.

## User-scoped decision storage

The frontend reads and replaces the authenticated user's data through:

- `GET /manual-input/internal-float-inputs-user?ticker={ticker}`
- `PUT /manual-input/internal-float-inputs-user?ticker={ticker}`

The authenticated token determines the user. No user ID query parameter should be accepted from the browser.

The deployed API rejects the previously proposed top-level
`managementSuggestionDecisions` field. The current contract accepts
`managementStrategicHoldings`, `privateFriendlyHolders`, and `auditLog`, so the
frontend stores decision markers as structured messages inside the existing
user-scoped `auditLog` array:

```json
{
  "managementStrategicHoldings": { "records": [] },
  "privateFriendlyHolders": { "shares": 0, "ratio": 0 },
  "auditLog": [
    {
      "id": "management-suggestion-decision-...",
      "action": "updated",
      "section": "managementStrategicHoldings",
      "recordId": "operations-suggestion-id",
      "message": "Management suggestion decision: {\"id\":\"management-suggestion-decision-...\",\"suggestionId\":\"operations-suggestion-id\",\"suggestionVersion\":\"2026-08-07T10:15:00.000Z\",\"decision\":\"applied\",\"decidedAt\":\"2026-08-07T10:20:00.000Z\"}",
      "createdAt": "2026-08-07T10:20:00.000Z"
    }
  ]
}
```

`decision` is either `applied` or `discarded`. `suggestionVersion` is the source record's `updatedAt`, falling back to `createdAt` or its effective date. If Operations edits a recommendation, the changed version makes it reviewable again.

Non-decision audit entries are preserved unchanged. Decision entries are
identified only by the `Management suggestion decision: ` message prefix; the
frontend does not reinterpret ordinary audit records.

## Apply and discard behavior

- Apply sends the updated `managementStrategicHoldings.records` and the updated
  `auditLog` in the same user-scoped PUT.
- Discard sends the unchanged `managementStrategicHoldings.records` and an
  updated `auditLog`.
- The PUT response must echo the persisted `auditLog` and all persisted holding
  records.
- The frontend reconstructs decisions from the echoed audit entries. A missing
  echoed decision is treated as a failed save and the suggestion remains
  visible.
- A later PUT that changes another user-input section must preserve existing decisions.

For full atomicity, the backend should commit the holding and decision together or reject both.

## Acceptance checks

1. Publish one suggestion for a ticker.
2. User A applies it. User A no longer sees it, and the holding appears only in User A's Internal Float data.
3. User B still sees the same suggestion and has no new holding.
4. User B discards it. User B no longer sees it, without changing User A.
5. The original `/manual-input/management-holdings` record remains unchanged throughout.
6. Editing the source recommendation creates a new `suggestionVersion`, so both users can review the revision.

## Current backend dependency

No new top-level field is required. This workflow depends on the documented
`internal-float-inputs-user` behavior continuing to accept, persist, and echo
the existing `auditLog` array.
