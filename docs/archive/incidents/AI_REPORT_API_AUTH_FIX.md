# AI Report API Authorization Fix

## Purpose

Fix `GET /market-data/ai-report?ticker={ticker}` so the portal can retrieve the daily AI report without passing the user's Cognito authorization token to Amazon S3.

## Observed Failure

The portal calls:

```http
GET /market-data/ai-report?ticker=CURR
Authorization: <Cognito ID token>
```

The API currently returns a payload similar to:

```json
{
  "requestError": "Authorization header requires 'Credential' parameter..."
}
```

This is an Amazon S3/AWS Signature Version 4 validation error. It occurs before S3 reads the report object, so it does not indicate that the JSON content is invalid.

## Root Cause

The incoming `Authorization` header belongs to the portal user and contains a Cognito ID token. It is intended only for API Gateway/Cognito authorization.

The backend appears to be forwarding that header, or a derived value, when requesting the S3 object. S3 interprets any `Authorization` header as an AWS Signature Version 4 credential. A Cognito token is not a valid S3 request signature, so S3 rejects the request.

The two authorization layers must remain separate:

1. **Portal to API Gateway:** Cognito ID token authorizes the user and ticker access.
2. **Lambda to S3:** Lambda execution-role credentials authorize `GetObject` through the AWS SDK.

## Required Request Flow

```text
Browser
  -> API Gateway with Cognito ID token
  -> Cognito authorizer validates the user
  -> Lambda checks ticker access
  -> Lambda calculates the consolidation date
  -> Lambda uses its execution role to call S3 GetObject
  -> Lambda parses and returns the report JSON
```

Do not forward the browser's `Authorization` header to S3.

## Required Backend Changes

### 1. Keep Cognito authorization at the API boundary

API Gateway should validate the Cognito ID token. Lambda should read the validated user claims from the API Gateway request context.

Use those claims to enforce the existing access rules:

- `USER`: ticker must exist in the user's authorized ticker list.
- `OPERATOR` and `ADMIN`: unrestricted ticker access, according to the existing role policy.

Do not reuse the Cognito token as an S3 credential.

### 2. Read the report with the AWS SDK

Use the Lambda execution role and the AWS SDK S3 client to retrieve:

```text
ai-report/{TICKER}/{calculated_date}/ai-report.json
```

Conceptual Node.js implementation:

```ts
const command = new GetObjectCommand({
  Bucket: process.env.CENTRALIZED_DATA_BUCKET,
  Key: `ai-report/${ticker}/${calculatedDate}/ai-report.json`,
});

const result = await s3Client.send(command);
const reportText = await result.Body.transformToString();
const report = JSON.parse(reportText);
```

Do not manually set an `Authorization` header. The AWS SDK signs the S3 request using the Lambda execution role automatically.

### 3. Correct the Lambda IAM policy

The Lambda execution role needs permission equivalent to:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::<centralized-data-bucket>/ai-report/*"
    }
  ]
}
```

Replace `<centralized-data-bucket>` with the actual bucket configured for `data-sync-platform-centralized-v2`.

If the object uses a customer-managed KMS key, also grant the Lambda role `kms:Decrypt` for that key.

### 4. Do not forward authorization when using a public S3 URL

The AWS SDK approach is preferred. If the implementation intentionally fetches a public S3 URL instead, the request must not include the incoming Cognito `Authorization` header:

```ts
await fetch(publicObjectUrl, {
  method: 'GET',
  headers: {
    Accept: 'application/json'
  }
});
```

Do not use a public URL if the report contains private or ticker-restricted information. The execution-role approach preserves access control and is recommended.

## Expected Successful Response

The endpoint should return the raw report object documented in `INTEGRATION (7).md`:

```json
{
  "created_at_utc": "2026-07-20T10:51:41Z",
  "lending_pressure_analysis": "AI-generated lending analysis...",
  "short_interest_current_interpretation": "AI-generated short-interest interpretation..."
}
```

Required response headers:

```http
Content-Type: application/json
Cache-Control: no-store
```

## Error Response Requirements

Do not return HTTP `200` with a `requestError` field. Return the appropriate HTTP status and a stable, non-sensitive message.

| Condition | Status | Suggested response |
|---|---:|---|
| Missing ticker | `400` | `{ "message": "ticker is required" }` |
| Invalid or expired user token | `401` | `{ "message": "Unauthorized" }` |
| User cannot access ticker | `403` | `{ "message": "Ticker access denied" }` |
| Report object does not exist | `404` | `{ "message": "AI report not found for the current consolidation date" }` |
| S3 permission/configuration failure | `500` | `{ "message": "Unable to retrieve AI report" }` |
| Invalid report JSON | `500` | `{ "message": "AI report is invalid" }` |

Log the detailed AWS error server-side with a request ID, bucket, key, and error code. Do not expose AWS signatures, credentials, internal stack traces, or raw S3 authorization errors to the browser.

## Validation Checklist

- [ ] A valid `USER` can retrieve an AI report for an authorized ticker.
- [ ] A valid `USER` receives `403` for an unauthorized ticker.
- [ ] An `OPERATOR` or `ADMIN` can retrieve reports according to the role policy.
- [ ] A missing `ticker` returns `400`.
- [ ] A missing report object returns `404`.
- [ ] The Lambda execution role can read `ai-report/*` from the configured bucket.
- [ ] The Cognito `Authorization` header is never sent to S3.
- [ ] A successful response contains `created_at_utc`, `lending_pressure_analysis`, and `short_interest_current_interpretation`.
- [ ] AWS errors are logged server-side but are not exposed in the API response.
- [ ] The endpoint returns a non-`200` status when report retrieval fails.

## Frontend Contract

The portal already calls the endpoint with the current ticker and Cognito ID token. No frontend signing or AWS credentials are required.

The frontend consumes:

| Portal page | API field |
|---|---|
| Short Interest | `short_interest_current_interpretation` |
| Lending Pressure | `lending_pressure_analysis` |

When the endpoint returns a proper non-`200` error, the portal keeps the market-data page available and shows that AI analysis is unavailable for the current consolidation date.

## Recommended Owner

This fix belongs to the API/Lambda implementation and its IAM configuration. It is not a report-content or frontend-data-mapping change.
