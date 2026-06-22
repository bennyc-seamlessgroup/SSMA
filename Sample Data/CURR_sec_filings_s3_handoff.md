# CURR SEC Filings S3 Handoff

This file explains how the backend team should publish SEC filing records for the portal.

## Target S3 Location

Bucket:

```text
data-sync-platform-website-data
```

Object key:

```text
news_filings/CURR_sec_filings.json
```

The portal now reads this file for the user-facing SEC Filings page and the backend Operations Portal SEC filing form.

## Current Local Source

Local development file:

```text
import_data/news_filings/CURR_sec_filings.json
```

Upload this file to S3 using the same relative path:

```text
s3://data-sync-platform-website-data/news_filings/CURR_sec_filings.json
```

## Accepted JSON Shapes

The portal currently supports both formats below.

### Preferred Operations Format

Use this format for backend portal manual-entry data:

```json
{
  "source": "operations_manual_input",
  "schemaVersion": 1,
  "updatedAt": "2026-06-22T07:54:37.056Z",
  "s3Key": "news_filings/CURR_sec_filings.json",
  "records": [
    {
      "id": "78f861b18c9e0f0e",
      "ticker": "CURR",
      "companyName": "CURRENC Group Inc.",
      "formType": "4",
      "formDescription": "Statement of changes in beneficial ownership of securities",
      "filingDate": "2026-06-04",
      "reportingDate": "2026-06-02",
      "act": "",
      "filmNumber": "",
      "fileNumber": "",
      "accessionNumber": "0001493152-26-027303",
      "filingsUrl": "https://www.sec.gov/Archives/edgar/...",
      "notes": "",
      "createdAt": "2026-06-22T07:54:37.056Z",
      "createdBy": "operations"
    }
  ],
  "log": []
}
```

### Legacy Import Envelope Format

The portal can also read this format:

```json
{
  "ticker": "CURR",
  "importedAt": "2026-06-22T07:54:37.056Z",
  "recordCount": 90,
  "data": [
    {
      "title": "Statement of changes in beneficial ownership of securities",
      "formType": "4",
      "url": "https://www.sec.gov/Archives/edgar/...",
      "excerpt": "Statement of changes in beneficial ownership of securities",
      "publishDate": "2026-06-04",
      "publishAt": "2026-06-04T00:00:00Z",
      "sourcePlatform": "SEC EDGAR"
    }
  ]
}
```

## Recommended Backend Rules

- Treat `news_filings/CURR_sec_filings.json` as the source of truth for the portal SEC Filings page.
- Do not write to the old filename `news_filings/sec_filings.json`.
- Do not write to `news_filings/sec_filings_manual.json`.
- Preserve all current filing records unless the operation is an intentional full replacement.
- Deduplicate by `accessionNumber` when importing from CSV or SEC source data.
- Sort records by `filingDate DESC`, then `formType ASC`.
- Use atomic upload behavior where possible:
  - Generate and validate JSON.
  - Upload to a temporary key if needed.
  - Copy/rename into `news_filings/CURR_sec_filings.json`.

## Required Fields for Operations Format

| Field | Required | Notes |
| --- | --- | --- |
| `ticker` | yes | Use `CURR`. |
| `companyName` | yes | Use `CURRENC Group Inc.` unless company config changes. |
| `formType` | yes | Example: `4`, `6-K`, `424B3`, `10-K`. |
| `formDescription` | yes | Human-readable form description. |
| `filingDate` | yes | `YYYY-MM-DD`. |
| `reportingDate` | no | `YYYY-MM-DD` when available. |
| `act` | no | Example: `33`, `34`. |
| `filmNumber` | no | SEC film number. |
| `fileNumber` | no | SEC file number. |
| `accessionNumber` | yes | Used for dedupe. |
| `filingsUrl` | yes | SEC filing index URL. |
| `notes` | no | Internal note. |
| `createdAt` | yes | ISO timestamp. |
| `createdBy` | yes | Backend job or operations user. |

## Portal Behavior

The portal reads this file through server-side code only. AWS credentials are not exposed to the client.

When the S3 object changes, the portal update watcher checks:

```text
news_filings/CURR_sec_filings.json
```

If the file content changes, the user portal can show the red update dot next to `SEC Filings`.

## Validation Checklist

Before uploading:

- JSON parses successfully.
- Top-level shape is either `{ records: [...] }` or `{ data: [...] }`.
- Record count is greater than zero.
- Every displayed row has `formType`, filing description/title, filing date, accession number, and URL.
- No duplicate `accessionNumber` values unless there is a documented reason.
- S3 object key is exactly `news_filings/CURR_sec_filings.json`.
