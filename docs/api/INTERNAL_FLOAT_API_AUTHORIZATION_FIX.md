# Internal Float API Authorization Fix

## Executive Summary

The portal cannot load the authenticated Internal Float page because the newly added Internal Float API categories return an AWS S3 authorization error.

Observed failing request:

```http
GET /manual-input/internal-float-inputs-ticker?ticker=CURR
Authorization: <Cognito ID token>
```

Observed response:

```text
403 Forbidden
Authorization header requires 'Credential' parameter.
Authorization header requires 'Signature' parameter.
Authorization header requires 'SignedHeaders' parameter.
Authorization header requires existence of either a 'X-Amz-Date' or a 'Date' header.
```

This is not a normal Cognito authorization denial. It indicates that an AWS service, most likely S3, is receiving the Cognito `Authorization` value as though it were an AWS Signature Version 4 authorization header.

The frontend request follows the existing API contract and uses the same Cognito ID token mechanism as the working portal endpoints. The correction is required in the API Gateway/Lambda/S3 request flow.

## Affected Endpoints

Verify and correct all three new Internal Float paths:

| Endpoint | Scope | Expected source |
|---|---|---|
| `GET /manual-input/internal-float-inputs-ticker?ticker={ticker}` | Shared ticker scope | `manual-input/internal-float-inputs-ticker/{ticker}/internal-float-inputs-ticker.json` |
| `GET /manual-input/internal-float-inputs-user?ticker={ticker}` | Authenticated user scope | `manual-input/internal-float-inputs-user/{ticker}/{sub}/internal-float-inputs-user.json` |
| `GET /market-data/current?ticker={ticker}&category=internal-float-current-user` | Resolved user snapshot | `current/{ticker}/{sub}/internal-float-current-user.json`, with documented fallback to `current/{ticker}/internal-float-current-ticker.json` |

The corresponding `PUT` and `DELETE` Manual Input V2 operations should be checked as part of the same fix:

```text
PUT /manual-input/internal-float-inputs-ticker
DELETE /manual-input/internal-float-inputs-ticker
PUT /manual-input/internal-float-inputs-user
DELETE /manual-input/internal-float-inputs-user
```

## Expected Authentication Flow

The correct request flow is:

1. The browser sends the Cognito ID token in the API request:

   ```http
   Authorization: <Cognito ID token>
   ```

2. API Gateway validates that token using the configured Cognito User Pools Authorizer.

3. API Gateway passes the validated claims to Lambda, including:

   ```text
   requestContext.authorizer.claims.sub
   requestContext.authorizer.claims.email
   requestContext.authorizer.claims.role
   ```

   The exact property path may differ between API Gateway REST API and HTTP API payload versions. The implementation must use the path matching the deployed gateway.

4. Lambda validates ticker access using the authenticated profile and role.

5. Lambda reads or writes S3 using the AWS SDK and the Lambda execution role:

   ```python
   s3.get_object(Bucket=bucket_name, Key=object_key)
   ```

6. Lambda returns the parsed JSON response through API Gateway.

The browser Cognito token must terminate at API Gateway/Lambda authentication. It must not be reused as S3 request authorization.

## Likely Root Cause

Inspect the new category handlers for one of these patterns:

### Incoming authorization forwarded to S3

Incorrect:

```python
requests.get(
    s3_object_url,
    headers={"Authorization": incoming_authorization_header},
)
```

S3 interprets this value as an AWS Signature Version 4 header and returns the exact error currently shown by the portal.

### Generic HTTP fetch used instead of the AWS SDK

Incorrect:

```python
requests.get(f"https://{bucket}.s3.amazonaws.com/{key}", headers=request_headers)
```

Private S3 objects should be read through the AWS SDK using the Lambda execution role. Do not proxy browser authorization headers to S3.

### New categories bypassing the existing Manual Input handler

Confirm that:

```text
internal-float-inputs-ticker
internal-float-inputs-user
```

are routed through the same authenticated Manual Input V2 Lambda implementation as other working categories such as:

```text
utilization
margins
manual-availability
short-score
```

The new categories should not resolve to an S3 HTTP integration, static S3 route, or unsigned object URL.

### User snapshot category using the wrong integration

Confirm that:

```text
category=internal-float-current-user
```

is handled inside the market-data Lambda category resolver. It should not be interpreted as a raw S3 path supplied by the client.

## Required Backend Behavior

### Ticker-level input

Request:

```http
GET /manual-input/internal-float-inputs-ticker?ticker=CURR
Authorization: <valid ID token>
```

Expected response:

```json
{
  "tokenizedShares": {
    "records": []
  },
  "collateralizedShares": {
    "records": []
  },
  "auditLog": []
}
```

This file is shared at the ticker level and should not depend on the requesting user's `sub` when constructing the S3 key.

### User-level input

Request:

```http
GET /manual-input/internal-float-inputs-user?ticker=CURR
Authorization: <valid ID token>
```

Expected response:

```json
{
  "managementStrategicHoldings": {
    "records": []
  },
  "privateFriendlyHolders": {
    "shares": 0,
    "ratio": 0
  },
  "auditLog": []
}
```

The S3 key must use the authenticated Cognito `sub` claim. The client must not be allowed to submit an arbitrary user ID or `sub`.

### Resolved current snapshot

Request:

```http
GET /market-data/current?ticker=CURR&category=internal-float-current-user
Authorization: <valid ID token>
```

Resolution order:

1. `current/CURR/{authenticated_sub}/internal-float-current-user.json`
2. `current/CURR/internal-float-current-ticker.json`

Return the first existing object as parsed JSON.

The fallback is a backend storage-resolution rule, not a frontend data fallback.

## Missing Object Behavior

Do not return the raw S3 authorization error to the portal.

Recommended behavior:

| Condition | HTTP status | Response |
|---|---:|---|
| Specific object is missing and no documented fallback exists | `404` | `{ "message": "Internal Float data was not found." }` |
| User does not have ticker access | `403` | `{ "message": "You are not authorized to access this ticker." }` |
| Cognito token is missing or invalid | `401` | `{ "message": "Unauthorized." }` |
| Lambda execution role cannot access S3 | `500` | Generic server error; log the detailed AWS error server-side |
| Valid empty manual-input dataset | `200` | Valid object containing empty `records` arrays |

Do not expose:

- S3 bucket names in user-facing errors.
- S3 object keys containing Cognito `sub` values.
- Cognito tokens.
- AWS request signatures.
- Raw AWS SDK stack traces.

## IAM Requirements

The Lambda execution role needs the minimum required permissions for the relevant prefixes.

Example policy scope:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::<centralized-bucket>/manual-input/internal-float-inputs-ticker/*",
        "arn:aws:s3:::<centralized-bucket>/manual-input/internal-float-inputs-user/*",
        "arn:aws:s3:::<centralized-bucket>/current/*/internal-float-current-ticker.json",
        "arn:aws:s3:::<centralized-bucket>/current/*/*/internal-float-current-user.json"
      ]
    }
  ]
}
```

Adjust the bucket name and current-snapshot paths to match the deployed storage layout. Do not grant public S3 access to resolve this issue.

## Write-Scope Requirements

The frontend now writes each editable section to its correct scope:

| Portal section | Endpoint | Payload fields |
|---|---|---|
| Management / Strategic Holdings | `PUT /manual-input/internal-float-inputs-user?ticker={ticker}` | `managementStrategicHoldings`, preserved `privateFriendlyHolders` |
| Tokenized Shares | `PUT /manual-input/internal-float-inputs-ticker?ticker={ticker}` | `tokenizedShares`, preserved `collateralizedShares` |
| Collateralized Shares | `PUT /manual-input/internal-float-inputs-ticker?ticker={ticker}` | `collateralizedShares`, preserved `tokenizedShares` |

The API must reject fields that belong to the other scope rather than silently writing them to the wrong file.

Recommended validation:

- Ticker endpoint allows only `tokenizedShares` and `collateralizedShares`.
- User endpoint allows only `managementStrategicHoldings` and `privateFriendlyHolders`.
- Server-managed metadata and `auditLog` cannot be supplied or overwritten directly by the client.
- Record identifiers must be unique within each section.
- Share values must be finite, non-negative numbers.

## Audit Log Requirements

Each split input file may maintain its own audit log.

For every successful write, record:

```json
{
  "id": "audit-generated-id",
  "action": "created",
  "section": "tokenizedShares",
  "recordId": "token-rec-001",
  "message": "500,000 shares added to Ethereum / Securitize.",
  "createdBy": "user@example.com",
  "createdAt": "2026-07-28T00:00:00Z"
}
```

Requirements:

- Derive `createdBy` from authenticated claims, not request payload.
- Generate timestamps server-side in UTC.
- Preserve prior audit entries.
- Do not allow the client to clear the audit log.
- Return the current scope's audit log in successful `GET` and `PUT` responses.

The frontend merges the ticker and user audit logs into one chronological activity view.

## Acceptance Tests

### 1. Authenticated ticker-level read

```bash
curl \
  -H "Authorization: ${ID_TOKEN}" \
  "${API_URL}/manual-input/internal-float-inputs-ticker?ticker=CURR"
```

Expected: `200`, parsed JSON, and no AWS authorization text.

### 2. Authenticated user-level read

```bash
curl \
  -H "Authorization: ${ID_TOKEN}" \
  "${API_URL}/manual-input/internal-float-inputs-user?ticker=CURR"
```

Expected: `200`, data resolved using the token's `sub`.

### 3. User isolation

Run the user-level read with two different valid users assigned to the same ticker.

Expected:

- Both users can read the ticker.
- Each user receives only their own user-level input file.
- Neither request can choose or override the other user's `sub`.

### 4. Ticker sharing

Run the ticker-level read with two different valid users assigned to the same ticker.

Expected: both receive the same ticker-level tokenized and collateralized inputs.

### 5. User snapshot fallback

Test a user without a user-specific current snapshot:

```bash
curl \
  -H "Authorization: ${ID_TOKEN}" \
  "${API_URL}/market-data/current?ticker=CURR&category=internal-float-current-user"
```

Expected: `200` with `internal-float-current-ticker.json` content.

### 6. User snapshot priority

Create a user-specific snapshot and repeat the request.

Expected: the user-specific snapshot is returned instead of the ticker fallback.

### 7. Unauthorized ticker

Request a ticker absent from the user's profile.

Expected: `403` with a portal-safe authorization message.

### 8. Missing object

Request an authorized ticker with no relevant object.

Expected: documented `404` or valid empty object behavior, not an S3 Signature Version 4 error.

### 9. Split writes

Write management holdings through the user endpoint, then verify:

- User input changed.
- Ticker input did not change.

Write tokenized shares through the ticker endpoint, then verify:

- Ticker input changed.
- User input did not change.

### 10. No credential leakage

Review API Gateway, Lambda, and CloudWatch logs.

Expected:

- Cognito tokens are not logged.
- S3 requests are made with Lambda IAM credentials.
- User-facing responses do not contain raw AWS authorization errors.

## Completion Criteria

The issue is resolved when:

- All three affected `GET` requests return the documented JSON response for an authorized user.
- Split `PUT` requests persist to the correct user or ticker scope.
- Unauthorized users receive portal-safe `401` or `403` responses.
- Missing files receive the documented empty or `404` response.
- No Cognito `Authorization` header is forwarded to S3.
- The Internal Float portal loads without showing `Internal Float data unavailable`.

