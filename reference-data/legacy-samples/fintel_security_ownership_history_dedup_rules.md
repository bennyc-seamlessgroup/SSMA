# Fintel Security Ownership History Dedup Rules

This file defines how the backend should build:

```text
fintel_security_ownership_premium_CURR_consolidated_4_web.json
```

The portal uses this JSON for the Institutional Ownership page's historical buy / sell ownership records table.

## Goal

Keep a full historical record of institutional ownership rows, but do not append duplicate rows every time the Fintel pull returns the same recent records again.

Fintel may return the previous 5-6 days of records on each daily pull. The backend must compare newly pulled rows against the existing consolidated JSON before appending.

## Output Shape

Keep the output as a raw JSON array of normalized Fintel rows:

```json
[
  {
    "securityName": "CURRENC GROUP INC",
    "securityClass": "CL A ORD SHS",
    "putCall": null,
    "cusipSedol": "G47862100",
    "formType": "13F-HR",
    "formTypeShort": "13F",
    "name": "Two Sigma Investments, Lp",
    "fileDate": "2026-05-15",
    "effectiveDate": "2026-03-31",
    "shares": 59536,
    "value": 155984,
    "sharesChange": 0,
    "sharesPercentChange": 0,
    "ownershipPercent": 0.0530236912,
    "url": "https://fintel.io/i/two-sigma-investments-llc"
  }
]
```

Do not wrap this file in `{ "data": [...] }` unless the frontend is changed.

## Daily Pull Rule

For each backend run:

1. Pull the latest Fintel security ownership premium records.
2. Normalize each row into the same field names used by the sample JSON.
3. Load the existing consolidated history JSON from S3.
4. Build a dedupe key for every existing row.
5. Build a dedupe key for every newly pulled row.
6. Append only rows whose dedupe key does not already exist.
7. If a row has the same identity but corrected field values, update the existing row instead of appending a duplicate.
8. Sort the final array by `fileDate DESC`, then `effectiveDate DESC`, then `name ASC`.
9. Write the full deduped array back to S3.

## Canonical Dedupe Key

Preferred key when `pageDataId` and `lineNbr` are available:

```text
security_id | holder_id | form_type | file_date | effective_date | page_data_id | line_nbr
```

Fallback key when `pageDataId` / `lineNbr` are missing:

```text
security_id | holder_id | form_type | file_date | effective_date | put_call | option_flag | shares | value | shares_change
```

Recommended field mapping:

| Key Part | Source Field | Normalization |
| --- | --- | --- |
| `security_id` | `bestIdentifier`, fallback `cusipSedol`, fallback `isin`, fallback `securityName` | Trim, uppercase. |
| `holder_id` | `slug`, fallback `lei`, fallback `name` | Trim, lowercase. |
| `form_type` | `formType`, fallback `formTypeShort` | Trim, uppercase. |
| `file_date` | `fileDate` | Normalize to `YYYY-MM-DD`. |
| `effective_date` | `effectiveDate` | Normalize to `YYYY-MM-DD`. |
| `page_data_id` | `pageDataId` | Trim string. |
| `line_nbr` | `lineNbr` | Trim string. |
| `put_call` | `putCall` | Lowercase; use empty string for null. |
| `option_flag` | `option` | Lowercase string; use empty string for null. |
| `shares` | `shares` | Number normalized, no commas. |
| `value` | `value` | Number normalized, no commas. |
| `shares_change` | `sharesChange` | Number normalized, no commas. |

## Why These Fields

The same Fintel daily pull can return identical recent rows repeatedly. The identity should represent the actual ownership filing row, not the day the backend pulled it.

Do not use the backend import timestamp as part of the dedupe key.

Do not use array index as part of the dedupe key.

Do not use only holder name, because the same institution can have multiple filings across different dates.

## Corrected Row / Upsert Rule

Sometimes the same filing row may later be returned with corrected values.

If the preferred identity key matches an existing row but one or more display fields changed, update the existing row rather than appending a second row.

Fields that may be updated:

```text
shares
value
sharesChange
percentChange
prevShares
prevValue
percentValueChange
ownershipPercent
ownershipPercentChange
sharesPercentChange
valuePercentChange
sharePrice
costBasis
allocation
allocationChange
allocationPercentChange
url
```

Recommended metadata fields if the backend wants internal traceability:

```text
firstSeenAt
lastSeenAt
lastUpdatedAt
dedupeKey
```

These metadata fields are optional. If included, the frontend will ignore unknown fields.

## Option / Call Records

For the historical table file, preserve raw Fintel security ownership rows unless the product team decides to hide option rows in the UI.

However, the backend-derived institutional ownership overview file must exclude `owners_option = call` / call-option rows from ownership calculations because those are not actual share ownership. That rule is documented separately in:

```text
institutional_ownership_backend_derived_fields.md
```

## Pseudocode

```text
existing_rows = load_json_from_s3("fintel_security_ownership_premium_CURR_consolidated_4_web.json")
new_rows = pull_latest_fintel_security_ownership_rows()

existing_by_key = {}

for row in existing_rows:
  key = build_dedupe_key(row)
  existing_by_key[key] = row

for row in new_rows:
  normalized = normalize_fintel_row(row)
  key = build_dedupe_key(normalized)

  if key does not exist in existing_by_key:
    normalized.firstSeenAt = now
    normalized.lastSeenAt = now
    normalized.dedupeKey = key
    existing_by_key[key] = normalized
  else:
    existing = existing_by_key[key]
    merged = merge_corrected_fields(existing, normalized)
    merged.lastSeenAt = now
    if corrected fields changed:
      merged.lastUpdatedAt = now
    existing_by_key[key] = merged

final_rows = values(existing_by_key)
sort final_rows by fileDate DESC, effectiveDate DESC, name ASC
write_json_to_s3(final_rows)
```

## Validation Checks

Before writing the file:

- Confirm total rows do not increase when the latest Fintel pull contains only records already present in history.
- Confirm total rows increase only by genuinely new filing rows.
- Confirm each output row has `name`, `fileDate`, `effectiveDate`, `formType`, and `shares`.
- Confirm duplicate count by dedupe key is zero.
- Confirm rows with the same holder but different `fileDate` or `effectiveDate` are preserved as separate historical records.
- Confirm rows with `shares = 0` are preserved, because they can represent exited / closed positions in the history table.

## Example

Existing history contains:

```text
Two Sigma | 13F-HR | fileDate 2026-05-15 | effectiveDate 2026-03-31 | shares 59536
```

Tomorrow's Fintel pull includes the same row again.

Expected result:

```text
Do not append a new row.
Keep one Two Sigma row for that filing.
Update lastSeenAt only, if metadata is used.
```

If tomorrow's Fintel pull includes:

```text
New Holder | 13F-HR | fileDate 2026-06-20 | effectiveDate 2026-06-15 | shares 100000
```

Expected result:

```text
Append this row to the consolidated history.
```
