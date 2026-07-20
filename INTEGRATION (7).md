# SSMA Portal — Frontend Integration Guide

> **Audience**: AI coding assistants and developers integrating a frontend website (no backend) with the SSMA Portal authentication service.
>
> **Last Updated**: 2026-07-14

---

## Table of Contents

- [Service Overview](#service-overview)
- [Architecture](#architecture)
- [Environment Variables](#environment-variables)
- [Authentication Flow (OAuth 2.0 + PKCE)](#authentication-flow-oauth-20--pkce)
  - [Step 1: Initiate Login](#step-1-initiate-login)
  - [Step 2: Handle OAuth Callback](#step-2-handle-oauth-callback)
  - [Step 3: Store Tokens and Establish Session](#step-3-store-tokens-and-establish-session)
  - [Step 4: Silent Token Refresh](#step-4-silent-token-refresh)
  - [Step 5: Logout](#step-5-logout)
- [API Reference](#api-reference)
  - [GET /secured](#get-secured)
  - [GET /profile](#get-profile)
  - [PUT /profile](#put-profile)
  - [PATCH /profile](#patch-profile)
  - [DELETE /profile](#delete-profile)
  - [POST /tickers/invite](#post-tickersinvite)
  - [GET /tickers/invite](#get-tickersinvite)
  - [GET /tickers/{ticker}](#get-tickersticker)
  - [GET /user-inputs](#get-user-inputs)
  - [PUT /user-inputs/private-holdings](#put-user-inputsprivate-holdings)
  - [PUT /user-inputs/token-chains](#put-user-inputstoken-chains)
  - [PUT /user-inputs/collateral-chains](#put-user-inputscollateral-chains)
  - [GET /sec-filings](#get-sec-filings)
  - [PUT /sec-filings](#put-sec-filings)
  - [DELETE /sec-filings](#delete-sec-filings)
  - [GET /market-data](#get-market-data)
  - [POST /market-data](#post-market-data)
  - [POST /market-data/batch](#post-market-data-batch)
  - [GET /market-data/current](#get-market-datacurrent)
  - [GET /market-data/history](#get-market-datahistory)
  - [GET /market-data/reports](#get-market-datareports)
  - [GET /social-data](#get-social-data)
  - [POST /social-data](#post-social-data)
  - [Manual Input V2 APIs](#manual-input-v2-apis)
    - [GET /manual-input/{category}](#get-manual-inputcategory)
    - [POST /manual-input/{category}](#post-manual-inputcategory)
    - [PUT /manual-input/{category}](#put-manual-inputcategory)
    - [DELETE /manual-input/{category}](#delete-manual-inputcategory)
    - [POST/PUT /manual-input/consolidate](#postput-manual-inputconsolidate)
    - [POST /manual-input/import](#post-manual-inputimport)
  - [GET /hotkeys](#get-hotkeys)
  - [POST /hotkeys](#post-hotkeys)
  - [DELETE /hotkeys/{ticker}/{kwatchHotkey}](#delete-hotkeystickerkwatchhotkey)
  - [Rule Engine APIs](#rule-engine-apis)
    - [GET /rules](#get-rules)
    - [POST /rules](#post-rules)
    - [DELETE /rules/{ruleId}](#delete-rulesruleid)
    - [POST /rule-engine/check](#post-rule-enginecheck)
    - [POST /rule-engine/extract-paths](#post-rule-engineextract-paths)
  - [Predefined Rule Catalog APIs](#predefined-rule-catalog-apis)
    - [GET /rule-catalog](#get-rule-catalog)
    - [POST /rule-catalog](#post-rule-catalog)
    - [GET/PUT/DELETE /rule-catalog/{catalogId}](#getputdelete-rule-catalogcatalogid)
    - [GET /rule-catalog/user-settings](#get-rule-cataloguser-settings)
    - [POST /rule-catalog/user-settings](#post-rule-cataloguser-settings)
- [Making Authenticated API Calls](#making-authenticated-api-calls)
- [CORS Configuration](#cors-configuration)
- [User Profile Data Model](#user-profile-data-model)
- [User Inputs Data Model](#user-inputs-data-model)
- [SEC Filings Data Model](#sec-filings-data-model)
- [Notification Hotkey Map Data Model](#notification-hotkey-map-data-model)
- [Error Handling](#error-handling)
- [JWT Token Structure](#jwt-token-structure)
- [PKCE Implementation](#pkce-implementation)
- [Onboarding Checklist for New Frontends](#onboarding-checklist-for-new-frontends)
- [Working Code Examples](#working-code-examples)

---

## Service Overview

The SSMA Portal backend is a **serverless authentication service** built on:

| Component               | Technology                         |
|-------------------------|------------------------------------|
| Identity Provider       | AWS Cognito User Pool              |
| OAuth Providers         | Google (Apple planned)             |
| Token Format            | JWT (stateless, no server sessions)|
| API Layer               | AWS API Gateway (REST, Regional)   |
| Profile Storage         | AWS DynamoDB                       |
| Backend Runtime         | AWS Lambda (Python 3.11)           |
| Infrastructure          | Terraform                          |

The service provides:
1. **OAuth 2.0 login** via Cognito Hosted UI (Google federation + email/password sign-up)
2. **JWT-based API authorization** — no sessions, no cookies on the backend
3. **User profile CRUD** — read, update, and delete user profiles in DynamoDB
4. **User inputs API** — read and write per-user data sections (privateHoldings, tokenChains, collateralChains) stored in S3, triggering downstream consolidation on every update

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         YOUR FRONTEND (Browser)                        │
│                                                                         │
│  1. Redirect user ──►  Cognito Hosted UI  ──► User authenticates        │
│  2. Receive callback with ?code=...&state=...                           │
│  3. Exchange code ──►  Cognito /oauth2/token  ──► Receive JWTs          │
│  4. Call API ──► API Gateway (/secured, /profile) with Authorization    │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
            ┌──────────────────────────────────────────┐
            │          AWS API Gateway (REST)           │
            │  Cognito Authorizer validates JWT tokens  │
            ├──────────────┬───────────────────────────┤
            │  GET /secured│   GET/PUT/PATCH/DELETE     │
            │   (MOCK)     │       /profile             │
            │              │    (Lambda Proxy)           │
            └──────┬───────┴──────────┬────────────────┘
                   │                  │
                   ▼                  ▼
            Static Response    ┌─────────────────┐
                               │ profile_handler  │
                               │   Lambda (Py)    │
                               └────────┬─────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │    DynamoDB      │
                               │  user_profiles   │
                               └─────────────────┘
```

---

## Environment Variables

Your frontend needs these four environment variables. Replace placeholders with actual values obtained from the team or Terraform outputs.

```bash
# 1. Cognito Hosted UI domain (NO https:// prefix, NO trailing slash)
#    Example: ssma-portal-auth-dev.auth.us-east-1.amazoncognito.com
NEXT_PUBLIC_COGNITO_DOMAIN=<cognito-domain>

# 2. Cognito User Pool App Client ID
#    Example: 7v80f2o20a4p8n2b2clv1...
NEXT_PUBLIC_COGNITO_CLIENT_ID=<client-id>

# 3. OAuth callback URL registered in Cognito (must match EXACTLY)
#    Local dev: http://localhost:3000/callback
#    Production: https://your-domain.com/callback
NEXT_PUBLIC_REDIRECT_URI=<callback-url>

# 4. API Gateway base URL (NO trailing slash)
#    Example: https://abcdef1234.execute-api.us-east-1.amazonaws.com/dev
NEXT_PUBLIC_API_GATEWAY_URL=<api-gateway-url>
```

> **IMPORTANT**: The `NEXT_PUBLIC_REDIRECT_URI` value must be **identical** to one of the registered `callback_urls` in the Cognito User Pool Client configuration. A mismatch will cause the OAuth flow to fail with a `redirect_mismatch` error. Contact the backend team to register your URL.

### How to Obtain Values

```bash
# Run from the ssma-portal repository root:
terraform -chdir=terraform/envs/dev output cognito_hosted_ui_domain
terraform -chdir=terraform/envs/dev output cognito_client_id
terraform -chdir=terraform/envs/dev output api_gateway_url
```

---

## Authentication Flow (OAuth 2.0 + PKCE)

This service uses the **Authorization Code flow with PKCE** (Proof Key for Code Exchange). PKCE is mandatory because the Cognito client is configured as a **public client** (`generate_secret = false`).

### Step 1: Initiate Login

Generate a PKCE code verifier and challenge, store them, then redirect the user to the Cognito Hosted UI.

```javascript
// 1. Generate PKCE values
const codeVerifier = generateCodeVerifier();   // Random 32-byte base64url string
const codeChallenge = await generateCodeChallenge(codeVerifier); // SHA-256 hash of verifier

// 2. Generate anti-CSRF state
const state = Math.random().toString(36).substring(2, 15);

// 3. Store in sessionStorage (needed in callback)
sessionStorage.setItem('oauth_state', state);
sessionStorage.setItem('oauth_code_verifier', codeVerifier);

// 4. Redirect to Cognito Hosted UI
const authUrl = `https://${COGNITO_DOMAIN}/oauth2/authorize?` + new URLSearchParams({
  client_id: CLIENT_ID,
  response_type: 'code',
  scope: 'openid email profile aws.cognito.signin.user.admin',
  redirect_uri: REDIRECT_URI,
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  state: state,
}).toString();

window.location.href = authUrl;
```

**Required OAuth Scopes:**

| Scope | Purpose |
|-------|---------|
| `openid` | Required for OIDC — returns `id_token` |
| `email` | Includes `email` and `email_verified` claims in the token |
| `profile` | Includes user profile attributes (name, etc.) |
| `aws.cognito.signin.user.admin` | Allows reading/updating Cognito user attributes via AWS SDK |

### Step 2: Handle OAuth Callback

After the user authenticates, Cognito redirects to your `REDIRECT_URI` with `?code=...&state=...` query parameters. Your callback page must:

```javascript
// 1. Extract query parameters
const code = new URLSearchParams(window.location.search).get('code');
const state = new URLSearchParams(window.location.search).get('state');

// 2. Validate CSRF state
const storedState = sessionStorage.getItem('oauth_state');
if (state !== storedState) {
  throw new Error('CSRF state mismatch — possible attack');
}

// 3. Retrieve stored PKCE verifier
const codeVerifier = sessionStorage.getItem('oauth_code_verifier');

// 4. Exchange authorization code for tokens
const response = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    code: code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  }),
});

const data = await response.json();
// data contains: { access_token, id_token, refresh_token, expires_in, token_type }

// 5. Clean up OAuth session values
sessionStorage.removeItem('oauth_state');
sessionStorage.removeItem('oauth_code_verifier');
```

**Token Exchange Response Schema:**

```json
{
  "access_token": "eyJraWQiOiJ...",
  "id_token": "eyJraWQiOiJ...",
  "refresh_token": "eyJjdHkiOiJ...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### Step 3: Store Tokens and Establish Session

Store the three tokens for later use:

```javascript
// Store in sessionStorage (cleared when tab closes — more secure)
sessionStorage.setItem('access_token', data.access_token);
sessionStorage.setItem('id_token', data.id_token);
sessionStorage.setItem('refresh_token', data.refresh_token);

// Decode id_token to get user info (see JWT section below)
const user = decodeJWT(data.id_token);
// user.sub   → unique user ID
// user.email → user email address
```

> **Why `sessionStorage` over `localStorage`?** Tokens are cleared when the browser tab closes, reducing the window of exposure if the device is shared. You may choose `localStorage` if persistent sessions are required, but understand the trade-off.

### Step 4: Silent Token Refresh

Access tokens expire after **1 hour** (3600 seconds). Use the `refresh_token` to obtain new tokens without user interaction:

```javascript
async function refreshTokens(refreshToken) {
  const response = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    // Refresh token is expired/revoked — force re-login
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  // data contains: { access_token, id_token, expires_in, token_type }
  // NOTE: refresh_token may NOT be included — reuse the existing one

  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token || refreshToken,
  };
}
```

**Recommended Refresh Strategy:**
- Set a `setInterval` (e.g., every 30 seconds) to check the `exp` claim in the decoded token.
- Trigger refresh when the token expires in **less than 5 minutes** (300 seconds).
- On refresh failure, clear session and redirect to login.

```javascript
setInterval(() => {
  const user = decodeJWT(sessionStorage.getItem('id_token'));
  if (!user) return;
  
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = user.exp - now;
  
  if (timeUntilExpiry < 300) {
    refreshTokens(sessionStorage.getItem('refresh_token'))
      .then(newTokens => { /* update sessionStorage */ })
      .catch(() => { /* logout and redirect */ });
  }
}, 30000);
```

### Step 5: Logout

Logout requires two actions: clearing local state AND invalidating the Cognito session.

```javascript
function logout() {
  // 1. Clear local session
  sessionStorage.clear();

  // 2. Redirect to Cognito logout endpoint
  const logoutUrl = `https://${COGNITO_DOMAIN}/logout?` + new URLSearchParams({
    client_id: CLIENT_ID,
    logout_uri: window.location.origin + '/logout',  // Must be registered in Cognito
  }).toString();

  window.location.href = logoutUrl;
}
```

> **IMPORTANT**: The `logout_uri` parameter must be registered in the Cognito User Pool Client's `logout_urls` list. Contact the backend team to add your domain.

---

## API Reference

**Base URL**: `${NEXT_PUBLIC_API_GATEWAY_URL}` (e.g., `https://abcdef1234.execute-api.us-east-1.amazonaws.com/dev`)

All endpoints (except `OPTIONS`) require the `Authorization` header with a valid Cognito **ID Token**.

### GET /secured

A test endpoint to verify that authentication is working. Returns a static success message.

```
GET /secured
Authorization: <id_token>
```

**Response** `200 OK`:
```json
{
  "message": "Success! You have accessed the secured endpoint."
}
```

---

### GET /profile

Fetch the authenticated user's profile. The user is identified by the `sub` claim in the JWT.

```
GET /profile
Authorization: <id_token>
```

**Response** `200 OK` (profile exists):
```json
{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "user@example.com",
  "status": "CONFIRMED",
  "created_at": "2026-06-12T10:30:00+00:00",
  "name": "Jane Doe",
  "bio": "Software engineer",
  "phone_number": "+1234567890",
  "nickname": "jdoe",
  "ticker": "AAPL",
  "tickers": ["AAPL", "MSFT"],
  "role": "USER"
}
```

**Response** `200 OK` (no profile yet — user has not been synced):
```json
{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "user@example.com",
  "status": "UNCONFIRMED",
  "ticker": "NONE",
  "tickers": [],
  "role": "USER"
}
```

---

### PUT /profile

Update (or create) user profile fields. Only the specified fields are updated; others remain unchanged. The `sub`, `email`, `status`, `created_at`, `ticker`, and `tickers` fields are managed automatically or restricted.

```
PUT /profile
Authorization: <id_token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "bio": "Full-stack developer",
  "phone_number": "+1234567890",
  "nickname": "jdoe"
}
```

**Updatable Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name |
| `bio` | string | Short biography |
| `phone_number` | string | Phone number (any format) |
| `nickname` | string | User nickname |

> [!WARNING]
> The profile's `ticker` (primary/legacy ticker) and `tickers` (associated tickers list) fields cannot be modified via this API. They are initialized during user registration based on pending invitations and can only be updated by a system operator directly in the DynamoDB console.

**Response** `200 OK`:
Returns the full updated profile object (same shape as GET /profile).

---

### PATCH /profile

Identical behavior to PUT — partial update of profile fields. You can send any subset of updatable fields.

```
PATCH /profile
Authorization: <id_token>
Content-Type: application/json

{
  "nickname": "new_nickname"
}
```

---

### DELETE /profile

Delete the authenticated user's profile from DynamoDB.

```
DELETE /profile
Authorization: <id_token>
```

**Response** `200 OK`:
```json
{
  "message": "Profile deleted successfully"
}
```

---

### POST /tickers/invite

Invite a new user to a stock ticker. If the user already exists in the Cognito User Pool, returns `409 Conflict`. Otherwise, creates a pending invitation and registers the stock ticker if it does not exist.

```
POST /tickers/invite
Authorization: <id_token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "ticker": "AAPL"
}
```

**Response** `200 OK`:
```json
{
  "email": "newuser@example.com",
  "ticker": "AAPL"
}
```

**Response** `409 Conflict` (user already exists):
```json
{
  "message": "User already exists in the system."
}
```

---

### GET /tickers/invite

Collect a list of all user invites. This endpoint is restricted to users with the `OPERATOR` role. Each entry in the returned list contains the invitation details, a boolean status flag `registered` (indicating if they have registered an account), and the registered user profile details if they are registered.

```
GET /tickers/invite
Authorization: <id_token>
```

**Response** `200 OK`:
```json
[
  {
    "email": "registered@example.com",
    "ticker": "AAPL",
    "created_at": "2026-07-01T12:00:00Z",
    "registered": true,
    "registered_user": {
      "sub": "sub-reg-456",
      "email": "registered@example.com",
      "role": "USER",
      "status": "CONFIRMED",
      "created_at": "2026-07-02T08:00:00Z",
      "ticker": "AAPL",
      "tickers": ["AAPL"]
    }
  },
  {
    "email": "unregistered@example.com",
    "ticker": "MSFT",
    "created_at": "2026-07-02T10:00:00Z",
    "registered": false,
    "registered_user": null
  }
]
```

**Response** `403 Forbidden` (User is not an operator):
```json
{
  "message": "Access Denied: Only operators can access this resource."
}
```

**Response** `401 Unauthorized` (Missing or invalid authorization):
```json
{
  "message": "Unauthorized: Missing sub claim"
}
```

---

### GET /tickers/{ticker}

Query the status and activation date of a stock ticker.

```
GET /tickers/{ticker}
Authorization: <id_token>
```

**Response** `200 OK` (ticker exists):
```json
{
  "ticker": "AAPL",
  "status": "ACTIVE",
  "effectiveDate": "2026-06-30"
}
```

**Response** `200 OK` (ticker does not exist / fallback):
```json
{
  "ticker": "GOOG",
  "status": "INACTIVE",
  "effectiveDate": null
}
```

---

### GET /user-inputs

Fetch the user inputs for the authenticated user (identified by the `sub` claim in the JWT). 

The S3 file loaded is determined dynamically by the user's stock ticker association. By default, it resolves to the user's primary `ticker` profile field (e.g. `AAPL_v2_user_inputs.json` or `MSFT_v2_user_inputs.json`).

```
GET /user-inputs
GET /user-inputs?ticker=<ticker>
Authorization: <id_token>
```

**Query Parameters:**
- `ticker` (optional): Retrieve inputs for a specific stock ticker. Must be one of the tickers associated with the user's profile `tickers` list. If omitted, defaults to the user's primary `ticker`.

**Response** `200 OK`:
```json
{
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "ticker": "AAPL",
  "privateHoldings": [
    {
      "id": "founder-management",
      "holderName": "Founder / management group",
      "category": "Founder",
      "shares": 5000000,
      "includeInDeduction": true,
      "notes": "Internal management assumption."
    }
  ],
  "custodyRows": [
    { "id": "bny", "name": "Bank of NY Mellon", "shares": 5000000 }
  ],
  "tokenChains": [
    { "id": "eth", "chain": "ETH", "shares": 1800000, "provider": "Securitize" }
  ],
  "collateralChains": [
    { "id": "eth-c", "chain": "ETH", "shares": 900000, "protocol": "Aave" }
  ]
}
```

**Response** `403 Forbidden` (ticker requested is not associated with the user profile):
```json
{
  "message": "Access Denied: Ticker [GOOG] is not associated with this user profile."
}
```

**Response** `400 Bad Request` (user profile is not associated with any ticker):
```json
{
  "message": "User profile is not associated with a stock ticker."
}
```

---

### PUT /user-inputs/private-holdings

Replace the entire `privateHoldings` array for the authenticated user. After saving to S3, the consolidator Lambda is triggered asynchronously to recalculate institutional ownership data.

```
PUT /user-inputs/private-holdings
PUT /user-inputs/private-holdings?ticker=<ticker>
Authorization: <id_token>
Content-Type: application/json

[
  {
    "id": "founder-management",
    "holderName": "Founder / management group",
    "category": "Founder",
    "shares": 5000000,
    "includeInDeduction": true,
    "notes": "Internal management assumption."
  }
]
```

**Response** `200 OK`: Returns the full updated user entry (same shape as GET /user-inputs).

> **Note**: This is a **full replace** — the entire array is overwritten with the provided payload. Send all items you want to keep.

---

### PUT /user-inputs/token-chains

Replace the entire `tokenChains` array for the authenticated user. Triggers consolidator Lambda asynchronously after S3 write.

```
PUT /user-inputs/token-chains
PUT /user-inputs/token-chains?ticker=<ticker>
Authorization: <id_token>
Content-Type: application/json

[
  { "id": "eth", "chain": "ETH", "shares": 1800000, "provider": "Securitize" },
  { "id": "sol", "chain": "SOL", "shares": 1000000, "provider": "xStocks" },
  { "id": "bnb", "chain": "BNB", "shares": 600000,  "provider": "Ondo" }
]
```

**Response** `200 OK`: Returns the full updated user entry.

---

### PUT /user-inputs/collateral-chains

Replace the entire `collateralChains` array for the authenticated user. Triggers consolidator Lambda asynchronously after S3 write.

```
PUT /user-inputs/collateral-chains
PUT /user-inputs/collateral-chains?ticker=<ticker>
Authorization: <id_token>
Content-Type: application/json

[
  { "id": "eth-c", "chain": "ETH", "shares": 900000, "protocol": "Aave" },
  { "id": "sol-c", "chain": "SOL", "shares": 500000, "protocol": "Kamino" },
  { "id": "bnb-c", "chain": "BNB", "shares": 200000, "protocol": "Euler" }
]
```

**Response** `200 OK`: Returns the full updated user entry.

---

### GET /sec-filings

Retrieve the current SEC filings list. **Note: This endpoint is restricted to users with the OPERATOR role only.** The S3 file resolved is determined dynamically by the user's stock ticker association, defaulting to the user's primary `ticker` profile field (e.g. `news_filings/AAPL_sec_filings.json`).

```
GET /sec-filings
GET /sec-filings?ticker=<ticker>
Authorization: <id_token>
```

**Query Parameters:**
- `ticker` (optional): Retrieve filings for a specific stock ticker. Must be one of the tickers associated with the user's profile `tickers` list. If omitted, defaults to the user's primary `ticker`.

**Response** `200 OK`: Returns the SEC filings JSON envelope (either containing `records` or `data`).

---

### PUT /sec-filings

Upsert one or more SEC filing records. **Note: This endpoint is restricted to users with the OPERATOR role only.** Validates required fields, deduplicates by `accessionNumber` (or `filingsUrl` fallback), sorts by `filingDate` DESC, then `formType` ASC, and saves the updated JSON to S3 in the Preferred Operations format.

```
PUT /sec-filings
PUT /sec-filings?ticker=<ticker>
Authorization: <id_token>
Content-Type: application/json

[
  {
    "formType": "4",
    "formDescription": "Statement of changes in beneficial ownership of securities",
    "filingDate": "2026-06-05",
    "accessionNumber": "0001493152-26-027304",
    "filingsUrl": "https://www.sec.gov/Archives/edgar/...",
    "notes": "Added via operations manual entry",
    "createdBy": "operations-user"
  }
]
```

**Response** `200 OK`: Returns the full updated operations envelope containing the `records` list.

---

### DELETE /sec-filings

Delete an SEC filing record from S3 by its `id` or `accessionNumber`. **Note: This endpoint is restricted to users with the OPERATOR role only.**

```
DELETE /sec-filings?id=<record_id>
DELETE /sec-filings?id=<record_id>&ticker=<ticker>
Authorization: <id_token>

OR

DELETE /sec-filings?accessionNumber=<accession_number>
DELETE /sec-filings?accessionNumber=<accession_number>&ticker=<ticker>
Authorization: <id_token>
```

**Alternative Request Body Format**:
```json
{
  "id": "78f861b18c9e0f0e"
}
```

**Response** `200 OK`: Returns the full updated operations envelope.
**Response** `404 Not Found`: If no record matches the given ID or Accession Number.

### GET /market-data

Collect and retrieve manual market data records stored in S3 for a given stock ticker.

```
GET /market-data
GET /market-data?ticker=AAPL
Authorization: <id_token>
```

**Parameters**:
- `ticker` (Optional / Query Parameter): The stock ticker to retrieve market data for.
  - If not provided, it falls back to the user's profile ticker. If no profile ticker is associated with the user, returns a `400 Bad Request`.
  - Only accessible to users with the `OPERATOR` role. Standard users (`USER` role) will receive a `403 Forbidden` response.

**Response** `200 OK`:
Returns a JSON object containing an array of market data records matching the specified ticker, sorted by `tradeDate` descending.

```json
{
  "records": [
    {
      "tradeDate": "2026-07-02",
      "ticker": "AAPL",
      "shortAvailabilityPct": "0.15",
      "shortAvailabilityShares": "1500",
      "costToBorrowNew": "2.5",
      "daysToCover": "1.2",
      "shortInterestShares": "12000",
      "shortInterestPcFreeFloat": "5.5",
      "score": "80",
      "tanRequestData": "some-req-data"
    }
  ]
}
```

**Response** `400 Bad Request`: If the `ticker` parameter is missing and cannot be resolved from the user profile.
**Response** `403 Forbidden`: If the user does not have the `OPERATOR` role.

### POST /market-data

Ingest a single market data record.

```
POST /market-data
Authorization: <id_token>
Content-Type: application/json

{
  "tradeDate": "2026-07-02",
  "ticker": "AAPL",
  "shortAvailabilityPct": "0.15",
  "shortAvailabilityShares": "1500",
  "costToBorrowNew": "2.5",
  "daysToCover": "1.2",
  "shortInterestShares": "12000",
  "shortInterestPcFreeFloat": "5.5",
  "score": "80",
  "tanRequestData": "some-request-data"
}
```

**Ticker Validation**:
- Standard accounts (`role = USER`) are restricted to uploading data only for tickers actively associated with their user profile list. If unauthorized, returns `403 Forbidden`.
- Accounts with role `OPERATOR` can submit data for any ticker, bypassing profile restrictions.

**Response** `200 OK`:
```json
{
  "message": "Market data saved successfully",
  "record": {
    "tradeDate": "2026-07-02",
    "ticker": "AAPL",
    "shortAvailabilityPct": "0.15",
    "shortAvailabilityShares": "1500",
    "costToBorrowNew": "2.5",
    "daysToCover": "1.2",
    "shortInterestShares": "12000",
    "shortInterestPcFreeFloat": "5.5",
    "score": "80",
    "tanRequestData": "some-request-data"
  }
}
```

---

### POST /market-data/batch

Upload a batch of market data records using a CSV file.

```
POST /market-data/batch
POST /market-data/batch?ticker=AAPL
Authorization: <id_token>
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```

**Parameters**:
- `ticker` (optional query or form parameter): If provided, overrides/specifies the ticker suffix for the archived history file name.
- `file` (multipart CSV file): The batch file payload.

**CSV Format Rules**:
- Must contain exactly the headers in this order (case-insensitive):
  `tradeDate`, `ticker`, `shortAvailabilityPct`, `shortAvailabilityShares`, `costToBorrowNew`, `daysToCover`, `shortInterestShares`, `shortInterestPcFreeFloat`, `score`, `tanRequestData`
- The `tradeDate` must match the ISO format `YYYY-MM-DD` exactly.

**Validation & All-or-Nothing Rule**:
- If any row fails validation (e.g. format error, or unauthorized ticker for a `USER`), the entire batch is rejected, no files are written to market-data S3 paths, and the original CSV along with a detailed error log are archived to `manual-data/upload-history` for auditing.

**S3 File Outputs (Success)**:
- Split files grouped by date and ticker: `manual-data/market-data/{tradeDate}/{ticker}-market-data.csv`
- Original payload archived to S3: `manual-data/upload-history/{userId}-{ticker}-market-data-{datetime}.csv`
- Detailed execution log archived to S3: `manual-data/upload-history/{userId}-{ticker}-market-data-{datetime}.log`

**Response** `200 OK`:
```json
{
  "message": "Batch upload processed successfully",
  "totalRows": 2,
  "filesCreated": [
    "manual-data/market-data/2026-07-02/AAPL-market-data.csv"
  ]
}
```
**Response** `403 Forbidden`: Returned if the CSV contains unauthorized tickers for standard users.
**Response** `400 Bad Request`: Returned if validation fails (e.g., column count mismatch, invalid date format, empty fields).

### GET /market-data/current

Retrieve current snapshot data for a given stock ticker from the centralized v2 data platform (`data-sync-platform-centralized-v2` S3 bucket, `current/` prefix).

```
GET /market-data/current?ticker=CURR
GET /market-data/current?ticker=CURR&category=market-current
Authorization: <id_token>
```

**Access Control**:
- Standard users (`USER` role) may only query tickers present in their user profile's `tickers` list. Requests for unauthorized tickers return `403 Forbidden`.
- Operators and Admins (`OPERATOR` / `ADMIN` role) have unrestricted access to all tickers.

**Parameters**:
- `ticker` (**Required** / Query Parameter): The stock ticker symbol (case-insensitive, e.g. `CURR`).
- `category` (Optional / Query Parameter): The specific snapshot category to retrieve. If omitted, all categories are returned in a combined response.

**Valid Categories**:
| Category | S3 File | Description |
|---|---|---|
| `company-profile-current` | `current/{ticker}/company-profile-current.json` | Company metadata, name, stock code |
| `internal-float-current` | `current/{ticker}/internal-float-current.json` | Share structure and tradable float breakdown |
| `market-current` | `current/{ticker}/market-current.json` | Latest market data snapshot |
| `ownership-current` | `current/{ticker}/ownership-current.json` | Institutional ownership current snapshot |
| `sentiment-current` | `current/{ticker}/sentiment-current.json` | Social sentiment analysis snapshot |

**Response** `200 OK` — Single category (e.g. `?category=market-current`):
Returns the raw JSON content of the S3 file for that category.

```json
{
  "schemaVersion": 1,
  "ticker": "CURR",
  "generatedAt": "2026-06-12T23:59:00Z",
  ...
}
```

**Response** `200 OK` — All categories (no `category` param):
Returns a combined object with all category names as keys. Missing files are returned as `null`.

```json
{
  "company-profile-current": { "schemaVersion": 1, "ticker": "CURR", ... },
  "internal-float-current": { "schemaVersion": 1, "ticker": "CURR", ... },
  "market-current": null,
  "ownership-current": { "schemaVersion": 1, "ticker": "CURR", ... },
  "sentiment-current": { "schemaVersion": 1, "ticker": "CURR", ... }
}
```

**Response** `400 Bad Request`: If `ticker` is missing or `category` is not a valid category name.
**Response** `403 Forbidden`: If the user's role is `USER` and the requested ticker is not in their profile's allowed tickers list.
**Response** `404 Not Found`: If a specific `category` was requested but the corresponding S3 file does not exist.

---

### GET /market-data/history

Retrieve historical time-series data for a given stock ticker from the centralized v2 data platform (`data-sync-platform-centralized-v2` S3 bucket, `history/` prefix).

```
GET /market-data/history?ticker=CURR
GET /market-data/history?ticker=CURR&category=market-history
Authorization: <id_token>
```

**Access Control**:
- Standard users (`USER` role) may only query tickers present in their user profile's `tickers` list. Requests for unauthorized tickers return `403 Forbidden`.
- Operators and Admins (`OPERATOR` / `ADMIN` role) have unrestricted access to all tickers.

**Parameters**:
- `ticker` (**Required** / Query Parameter): The stock ticker symbol (case-insensitive, e.g. `CURR`).
- `category` (Optional / Query Parameter): The specific history dataset to retrieve. If omitted, all history categories are returned in a combined response.

**Valid Categories**:
| Category | S3 File | Description |
|---|---|---|
| `ftd-history` | `history/{ticker}/ftd-history.json` | Failure-to-deliver historical records |
| `market-history` | `history/{ticker}/market-history.json` | Historical market data (price, volume, short interest) |
| `ownership-history` | `history/{ticker}/ownership-history.json` | Historical institutional ownership changes |
| `sec-filings-history` | `history/{ticker}/sec-filings-history.json` | Historical SEC filing records |
| `short-volume-history` | `history/{ticker}/short-volume-history.json` | Historical short volume by exchange |
| `sentiment-events` | `history/{ticker}/sentiment-events.json` | Historical social sentiment event logs |

**Response** `200 OK` — Single category (e.g. `?category=market-history`):
Returns the raw JSON content of the S3 file for that history category.

```json
{
  "schemaVersion": 1,
  "ticker": "CURR",
  "generatedAt": "2026-06-12T23:59:00Z",
  "records": [
    {
      "date": "2026-06-11",
      ...
    }
  ]
}
```

**Response** `200 OK` — All categories (no `category` param):
Returns a combined object with all history category names as keys. Missing files are returned as `null`.

```json
{
  "ftd-history": { "schemaVersion": 1, "ticker": "CURR", "records": [...] },
  "market-history": { "schemaVersion": 1, "ticker": "CURR", "records": [...] },
  "ownership-history": null,
  "sec-filings-history": { "schemaVersion": 1, "ticker": "CURR", "records": [...] },
  "short-volume-history": { "schemaVersion": 1, "ticker": "CURR", "records": [...] },
  "sentiment-events": { "schemaVersion": 1, "ticker": "CURR", "records": [...] }
}
```

**Response** `400 Bad Request`: If `ticker` is missing or `category` is not a valid category name.
**Response** `403 Forbidden`: If the user's role is `USER` and the requested ticker is not in their profile's allowed tickers list.
**Response** `404 Not Found`: If a specific `category` was requested but the corresponding S3 file does not exist.

---

### GET /market-data/reports

Retrieve consolidated report indexes (with pagination) or fetch specific daily report data for a stock ticker from the centralized v2 data platform (`data-sync-platform-centralized-v2` S3 bucket, `reports/` prefix).

```
GET /market-data/reports?ticker=CURR
GET /market-data/reports?ticker=CURR&limit=10&page=2
GET /market-data/reports?ticker=CURR&date=2026-07-18
Authorization: <id_token>
```

**Access Control**:
- Standard users (`USER` role) may only query tickers present in their user profile's `tickers` list. Requests for unauthorized tickers return `403 Forbidden`.
- Operators and Admins (`OPERATOR` / `ADMIN` role) have unrestricted access to all tickers.

**Parameters**:
- `ticker` (**Required** / Query Parameter): The stock ticker symbol (case-insensitive, e.g. `CURR`).
- `date` (Optional / Query Parameter): Retrieve the full report data for a specific date in `YYYY-MM-DD` format.
- `limit` (Optional / Query Parameter): The maximum number of records to return in the paginated report index list (default is `20`, maximum is `100`). Only applicable when `date` is omitted.
- `page` (Optional / Query Parameter): The page index of records to return (default is `1`). Only applicable when `date` is omitted.

**Response** `200 OK` — Fetch specific report (when `date` is specified):
Returns the raw JSON content of the S3 file at `reports/{ticker}/{date}/{ticker}_report_data.json`.

```json
{
  "ticker": "CURR",
  "asOfDate": "2026-07-18",
  "companyProfile": {
    "companyName": "CURRENC Group Inc.",
    "stockCode": "CURR"
  },
  "marketSnapshot": {
    "price": 10.45,
    "shortInterest": 1250000
  },
  "ownershipSnapshot": {
    "institutionalShares": 850000,
    "strategicShares": 120000,
    "publicFloatShares": 2030000
  },
  "sentimentSnapshot": {
    "overallSentimentScore": 0.45
  },
  "riskSummary": {
    "shortInterestRisk": "medium",
    "borrowFeeRisk": "low"
  }
}
```

**Response** `200 OK` — List available reports (when `date` is omitted):
Returns the paginated list of available dates.

```json
{
  "dates": [
    "2026-07-18"
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "ticker": "CURR",
  "generatedAt": "2026-07-20T06:29:20Z"
}
```

**Response** `400 Bad Request`: If `ticker` is missing or if `date` is formatted incorrectly.
**Response** `403 Forbidden`: If the user is unauthorized to view reports for the specified ticker.
**Response** `404 Not Found`: If the report for the requested date or the report index does not exist in S3.

---

### GET /social-data

Retrieve social media posts and sentiment data from the centralized v2 data platform (`data-sync-platform-centralized-v2` S3 bucket, `kwatch/` prefix). This API supports listing all posts (with platform filtering and page-based pagination) and retrieving individual posts by S3 key.

```
GET /social-data?ticker=CURR&limit=20&page=1
GET /social-data?ticker=CURR&platform=Reddit&limit=10&page=2
GET /social-data?key=kwatch/CURR/Reddit/2026-06-26/Reddit_CURR_2026-06-29T11_00_12Z.json
Authorization: <id_token>
```

**Access Control**:
- Standard users (`USER` role) may only query tickers present in their user profile's `tickers` list. Requests for unauthorized tickers (whether via `ticker` or parsed from `key`) return `403 Forbidden`.
- Operators and Admins (`OPERATOR` / `ADMIN` role) have unrestricted access.

**Parameters**:
- `key` (Optional / Query Parameter): The exact S3 key of a target social media record. If provided, the API retrieves that single post and ignores all other parameters.
- `ticker` (**Required for listing** / Query Parameter): The stock ticker symbol (e.g. `CURR`). Ignored if `key` is specified.
- `platform` (Optional / Query Parameter): Filter posts by platform (e.g., `Reddit`, `Twitter`, `Stocktwits`, `Facebook`, `LinkedIn`, `Youtube`).
- `limit` (Optional / Query Parameter): Number of records per page (default `20`, max `100`).
- `page` (Optional / Query Parameter): Page number for pagination (default `1`).

**Response** `200 OK` — Single Record (when `key` is provided):
Returns the complete JSON content of the requested social post, with the S3 `key` injected.
```json
{
  "platform": "Reddit",
  "query": "Keywords: CURR...",
  "datetime": "2026-06-29T11:00:12Z",
  "link": "https://www.reddit.com/r/RobinHood/comments/1uip9vr/daily_discussion_thread_june_29th_2026/ouha764/",
  "author": "Robot_of_Sherwood",
  "content": "Today is Monday, the 29th of June...",
  "sentiment": "neutral",
  "key": "kwatch/CURR/Reddit/2026-06-26/Reddit_CURR_2026-06-29T11_00_12Z.json"
}
```

**Response** `200 OK` — Paged Listing (when `key` is omitted):
Returns a paginated list of social posts sorted in descending chronological order (newest first) along with pagination metadata.
```json
{
  "records": [
    {
      "platform": "Reddit",
      "query": "Keywords: CURR...",
      "datetime": "2026-06-29T11:00:12Z",
      "link": "https://www.reddit.com/r/RobinHood/comments/1uip9vr/daily_discussion_thread_june_29th_2026/ouha764/",
      "author": "Robot_of_Sherwood",
      "content": "Today is Monday...",
      "sentiment": "neutral",
      "key": "kwatch/CURR/Reddit/2026-06-26/Reddit_CURR_2026-06-29T11_00_12Z.json"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 83,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

**Response** `400 Bad Request`: If `ticker` is missing for listing, or if the `key` query parameter is malformed, or if `page` / `limit` parameters are invalid.
**Response** `403 Forbidden`: If the user's role is `USER` and the requested ticker (or the ticker parsed from `key`) is not in their profile's allowed tickers list.
**Response** `404 Not Found`: If a target record `key` is specified but the S3 file does not exist.

---

### POST /social-data

Upload a CSV file containing social sentiment posts (Stocktwits, Reddit, or Twitter). The API parses the CSV, dynamically detects the platform from the CSV content, deletes all existing JSON records under the corresponding S3 prefix `kwatch/{ticker}/{platform}/`, converts each row to an individual JSON record, and uploads them in parallel.

```
POST /social-data?ticker=CURR
Authorization: <id_token>
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="reddit.csv"
Content-Type: text/csv

<CSV File Bytes>
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

**Access Control**:
- Only operators and admins (`OPERATOR` / `ADMIN` role) can upload files for any ticker.
- Standard users (`USER` role) can only upload files for tickers in their allowed profile list. Otherwise, returns `403 Forbidden`.

**Parameters**:
- `ticker` (**Required** / Query Parameter or Form Field): The stock ticker symbol (e.g. `CURR`).
- `file` (**Required** / Form Field): The multipart CSV file containing the social sentiment data.

**CSV Format Requirements**:
- **Stocktwits**: Must contain `messages__id` and `datetime`.
- **Reddit / Twitter**: Must contain `platform` (with value `Reddit` or `Twitter`) and `datetime`.

**Target S3 Location**:
- Stocktwits: Saved as `kwatch/{ticker}/Stocktwits/{date}/{messages__id}.json`.
- Reddit / Twitter: Saved as `kwatch/{ticker}/{platform}/{date}/{platform}_{ticker}_{sanitized_datetime}.json` (where colons in datetime are replaced with underscores).
- The `{date}` folder is calculated dynamically based on the row's `datetime` value:
  - Before 4:00 AM UTC: `ref_date = datetime - 1 day`
  - At/After 4:00 AM UTC: `ref_date = datetime`
  - If `ref_date` is a Monday: `date = ref_date - 3 days` (Friday)
  - If `ref_date` is a Sunday: `date = ref_date - 3 days` (Thursday)
  - If `ref_date` is a Saturday: `date = ref_date - 2 days` (Thursday)
  - Otherwise: `date = ref_date - 1 day`

**Existing Data Handling**:
- **Deletion by Prefix**: Before uploading the new CSV rows, the API retrieves all existing objects in S3 matching the prefix `kwatch/{ticker}/{platform}/` (e.g., `kwatch/CURR/Reddit/`) using a paginator (`list_objects_v2`).
- **Batch Deletion**: These retrieved keys are deleted in chunks of up to 1000 keys using `delete_objects`.
- **Platform Separation**: Deletion only affects the specific platform being imported. For example, importing Reddit data will delete and replace existing Reddit files under `kwatch/{ticker}/Reddit/`, but will leave existing Twitter or Stocktwits data untouched.
- **Transactional Failure Safety**: If the S3 deletion step fails, the API immediately halts, returns `500 Internal Server Error`, and does not proceed to upload the new records.

**Response** `200 OK`:
```json
{
  "message": "Successfully uploaded all records to S3.",
  "uploadedCount": 150
}
```

**Response** `400 Bad Request`: If `ticker` is missing, the CSV file is missing, or the CSV structure is invalid.
**Response** `403 Forbidden`: If the user is unauthorized for the ticker.
**Response** `500 Internal Server Error`: If S3 delete or upload fails.

---

## Manual Input V2 APIs

The Manual Input V2 API provides a unified RESTful interface to read and write operations-level configuration and financial inputs. Rather than acting as a simple file store, the API Gateway Gateway and Lambda function abstract the S3 JSON file layouts into clean, resource-oriented endpoint structures.

### Categories and Models

The API manages **11 categories**, grouped into two types:

| Category | Type | Date-Specific? | Description / Business Fields |
|----------|------|----------------|-------------------------------|
| `utilization` | Single-Record | Yes | `utilizationPercent` (float/int) |
| `margins` | Single-Record | Yes | `initialMarginIbkr` (float), `initialMarginFutu` (float), `maintenanceMarginIbkr` (float), `maintenanceMarginFutu` (float), `averageDurationDays` (float), `valueFormat` (string), `displayFormat` (string) |
| `short-score` | Single-Record | Yes | `shortScore` (int) |
| `manual-availability` | Single-Record | Yes | `availableSharesIbkr` (int), `availableSharesFutu` (int) |
| `internal-float-inputs` | Single-Record | No | Holds arrays and settings: `managementStrategicHoldings`, `tokenizedShares`, `collateralizedShares`, `privateFriendlyHolders` |
| `issued-share` | Single-Record | No | `issuedShare` (int) |
| `profile` | Single-Record | No | `companyName` (string), `stockCode` (string) |
| `hotkeys` | Record-Array | No | Items inside `records`: `id` (string), `kwatchHotkey` (string), `platform` (string) |
| `institutional-owner` | Record-Array | No | Items inside `records`: `id` (string), `institutionalOwnerSecurityName` (string) |
| `management-holdings` | Record-Array | No | Items inside `records`: `id` (string), `holderName` (string), `shares` (int), `percentOfShares` (float), etc. |
| `sec-filings` | Record-Array | No | Items inside `records`: `id` (string), `companyName` (string), `formType` (string), `filingDate` (string), etc. |

### Data Structures & Payload Examples

#### 1. `utilization`
* **HTTP Methods:** `GET`, `PUT`, `DELETE`
* **Input Payload (PUT):**
  ```json
  {
    "utilizationPercent": 85.5
  }
  ```
* **Output Payload (GET / PUT):**
  ```json
  {
    "utilizationPercent": 85.5,
    "createdBy": "justin.lai@tng.asia",
    "createdAt": "2026-07-14T08:31:33Z",
    "updatedBy": "justin.lai@tng.asia",
    "updatedAt": "2026-07-14T08:45:40Z",
    "generatedAt": "2026-07-14T08:45:40Z"
  }
  ```

#### 2. `margins`
* **HTTP Methods:** `GET`, `PUT`, `DELETE`
* **Input Payload (PUT):**
  ```json
  {
    "initialMarginIbkr": 0.5,
    "initialMarginFutu": 0.6,
    "maintenanceMarginIbkr": 0.4,
    "maintenanceMarginFutu": 0.45,
    "averageDurationDays": 12.4,
    "valueFormat": "decimal_ratio",
    "displayFormat": "percent"
  }
  ```
* **Output Payload (GET / PUT):**
  ```json
  {
    "initialMarginIbkr": 0.5,
    "initialMarginFutu": 0.6,
    "maintenanceMarginIbkr": 0.4,
    "maintenanceMarginFutu": 0.45,
    "averageDurationDays": 12.4,
    "valueFormat": "decimal_ratio",
    "displayFormat": "percent",
    "createdBy": "justin.lai@tng.asia",
    "createdAt": "2026-07-14T08:31:33Z",
    "updatedBy": "justin.lai@tng.asia",
    "updatedAt": "2026-07-14T08:45:40Z",
    "generatedAt": "2026-07-14T08:45:40Z"
  }
  ```

#### 3. `short-score`
* **HTTP Methods:** `GET`, `PUT`, `DELETE`
* **Input Payload (PUT):**
  ```json
  {
    "shortScore": 90
  }
  ```
* **Output Payload (GET / PUT):**
  ```json
  {
    "shortScore": 90,
    "createdBy": "justin.lai@tng.asia",
    "createdAt": "2026-07-14T08:31:33Z",
    "updatedBy": "justin.lai@tng.asia",
    "updatedAt": "2026-07-14T08:45:40Z",
    "generatedAt": "2026-07-14T08:45:40Z"
  }
  ```

#### 4. `manual-availability`
* **HTTP Methods:** `GET`, `PUT`, `DELETE`
* **Input Payload (PUT):**
  ```json
  {
    "availableSharesIbkr": 2500000,
    "availableSharesFutu": 1500000
  }
  ```
* **Output Payload (GET / PUT):**
  ```json
  {
    "availableSharesIbkr": 2500000,
    "availableSharesFutu": 1500000,
    "createdBy": "justin.lai@tng.asia",
    "createdAt": "2026-07-14T08:31:33Z",
    "updatedBy": "justin.lai@tng.asia",
    "updatedAt": "2026-07-14T08:45:40Z",
    "generatedAt": "2026-07-14T08:45:40Z"
  }
  ```

#### 5. `internal-float-inputs`
* **HTTP Methods:** `GET`, `PUT`, `DELETE`
* **Input Payload (PUT):**
  ```json
  {
    "managementStrategicHoldings": {
      "records": [
        {
          "id": "private-holder-001",
          "holderName": "Wong Man San",
          "category": "Strategic Investor",
          "shares": 3795837,
          "includeInDeduction": true,
          "notes": "Major deduction",
          "deletedAt": null
        }
      ]
    },
    "tokenizedShares": {
      "records": [
        {
          "id": "token-rec-001",
          "chain": "Ethereum",
          "provider": "Securitize",
          "shares": 500000,
          "deletedAt": null
        }
      ]
    },
    "collateralizedShares": {
      "records": [
        {
          "id": "col-rec-001",
          "chain": "Ethereum",
          "protocol": "Aave V3",
          "shares": 1000000,
          "deletedAt": null
        }
      ]
    },
    "privateFriendlyHolders": {
      "shares": 50000000,
      "ratio": 44.53
    }
  }
  ```
* **Output Payload (GET / PUT):** Includes S3 `auditLog` array inside the returned object if present.
  ```json
  {
    "managementStrategicHoldings": { "records": [...] },
    "tokenizedShares": { "records": [...] },
    "collateralizedShares": { "records": [...] },
    "privateFriendlyHolders": { "shares": 50000000, "ratio": 44.53 },
    "auditLog": [
      {
        "id": "audit-001",
        "action": "created",
        "section": "tokenizedShares",
        "recordId": "token-rec-001",
        "message": "500,000 shares added to Ethereum / Securitize.",
        "createdBy": "user@example.com",
        "createdAt": "2026-06-12T23:59:00Z"
      }
    ]
  }
  ```

#### 6. `issued-share`
* **HTTP Methods:** `GET`, `PUT`, `DELETE`
* **Input Payload (PUT):**
  ```json
  {
    "issuedShare": 112280000
  }
  ```
* **Output Payload (GET / PUT):** Same as input.

#### 7. `profile`
* **HTTP Methods:** `GET`, `PUT`, `DELETE`
* **Input Payload (PUT):**
  ```json
  {
    "companyName": "CURRENC Group Inc.",
    "stockCode": "CURR"
  }
  ```
* **Output Payload (GET / PUT):** Same as input.

#### 8. `hotkeys`
* **HTTP Methods:** `GET`, `POST`, `PUT`, `DELETE`
* **Input Payload (POST - Create):**
  ```json
  {
    "kwatchHotkey": "Reddit_Currenc_Group",
    "platform": "Reddit"
  }
  ```
* **Input Payload (PUT - Update):**
  ```json
  {
    "id": "hotkey-001",
    "kwatchHotkey": "Reddit_Currenc_Group_v2",
    "platform": "Reddit"
  }
  ```
* **Output Payload (GET Item / POST / PUT):**
  ```json
  {
    "id": "hotkey-001",
    "kwatchHotkey": "Reddit_Currenc_Group",
    "platform": "Reddit",
    "createdBy": "operations",
    "createdAt": "2026-06-12T23:59:00Z",
    "updatedBy": "operations",
    "updatedAt": "2026-06-12T23:59:00Z"
  }
  ```

#### 9. `institutional-owner`
* **HTTP Methods:** `GET`, `POST`, `PUT`, `DELETE`
* **Input Payload (POST - Create):**
  ```json
  {
    "institutionalOwnerSecurityName": "CURRENC GROUP INC"
  }
  ```
* **Input Payload (PUT - Update):**
  ```json
  {
    "id": "io-sec-name-001",
    "institutionalOwnerSecurityName": "CURRENC GROUP INC"
  }
  ```
* **Output Payload (GET Item / POST / PUT):**
  ```json
  {
    "id": "io-sec-name-001",
    "institutionalOwnerSecurityName": "CURRENC GROUP INC",
    "createdBy": "operations",
    "createdAt": "2026-06-12T23:59:00Z",
    "updatedBy": "operations",
    "updatedAt": "2026-06-12T23:59:00Z"
  }
  ```

#### 10. `management-holdings`
* **HTTP Methods:** `GET`, `POST`, `PUT`, `DELETE`
* **Input Payload (POST - Create):**
  ```json
  {
    "holderName": "Huang Yafangzhou",
    "category": "Strategic Investor",
    "action": "add",
    "shares": 3477818,
    "percentOfShares": 3.1,
    "fileDate": "2025-07-25",
    "effectiveDate": "2025-07-25",
    "form": "13G/A",
    "showInOwnership": true,
    "showAsSuggestion": true,
    "autoApply": false,
    "status": "pending",
    "source": "operations-input",
    "notes": ""
  }
  ```
* **Input Payload (PUT - Update):** Same as POST + `id`.
* **Output Payload (GET Item / POST / PUT):** Same as input + audit fields (`id`, `createdBy`, `createdAt`, `updatedBy`, `updatedAt`).

#### 11. `sec-filings`
* **HTTP Methods:** `GET`, `POST`, `PUT`, `DELETE`
* **Input Payload (POST - Create):**
  ```json
  {
    "companyName": "CURRENC Group Inc.",
    "formType": "10-Q",
    "formDescription": "Quarterly Report",
    "filingDate": "2025-11-14",
    "reportingDate": "2025-09-30",
    "act": "",
    "filmNumber": "",
    "fileNumber": "",
    "accessionNumber": "0001213900-25-001234",
    "filingsUrl": "https://www.sec.gov/Archives/edgar/data/1234567/000121390025001234/form10q.htm",
    "notes": ""
  }
  ```
* **Input Payload (PUT - Update):** Same as POST + `id`.
* **Output Payload (GET Item / POST / PUT):** Same as input + audit fields (`id`, `createdBy`, `createdAt`, `updatedBy`, `updatedAt`).

### Access Control & Rules
* **Cognito Authorization:** All requests (except OPTIONS preflights) must carry the `Authorization` header with a valid Cognito ID Token.
* **Ticker Permissions:** For standard `USER`s, they can only access tickers associated with their profile. Any request for an unauthorized ticker returns `403 Access Denied`. Users with the `OPERATOR` or `ADMIN` roles can access any ticker.
* **DELETE Method Restriction:** The `DELETE` method is strictly restricted to `OPERATOR` and `ADMIN` roles. Standard `USER`s requesting `DELETE` receive `403 Access Denied`.
* **Automatic Metadata:** S3 file envelopes, audit attributes (`createdBy`, `createdAt`, `updatedBy`, `updatedAt`, `generatedAt`), and `_field_provenance` are generated and managed by the backend. Client-provided audit parameters are ignored.
* **Downstream Triggers:** Creating, updating, or deleting manual inputs does NOT automatically trigger downstream consolidation. Consolidation must be triggered manually using the `/manual-input/consolidate` API endpoint.

---

### GET /manual-input/{category}

Retrieve configuration parameters or records.

```
GET /manual-input/{category}?ticker=CURR
GET /manual-input/{category}?ticker=CURR&tradeDate=2026-06-12
GET /manual-input/{category}?ticker=CURR&id=hotkey-001
Authorization: <id_token>
```

**Parameters:**
* `ticker` (optional): Target ticker. Defaults to the user's primary associated ticker if omitted.
* `tradeDate` (optional, only for date-specific categories): The target trade date (e.g. `2026-06-12`).
  * *If omitted for date-specific categories:* Returns a list of all historical daily configurations sorted descending by date.
* `id` (optional, only for record-array categories): Retrieve a single record in the array by its ID.
  * *If omitted for record-array categories:* Returns the entire array of records.

**Response** `200 OK` (Single-Record Category - with `tradeDate` provided):
Returns the business fields object (envelope stripped) along with audit details.
```json
{
  "utilizationPercent": 85.5,
  "createdBy": "justin.lai@tng.asia",
  "createdAt": "2026-07-14T08:31:33Z",
  "updatedBy": "justin.lai@tng.asia",
  "updatedAt": "2026-07-14T08:45:40Z",
  "generatedAt": "2026-07-14T08:45:40Z"
}
```

**Response** `200 OK` (Date-Specific Category - Omitted `tradeDate` list):
Returns a list of all historical daily configurations with their date folders injected into the `tradeDate` field, sorted descending by date.
```json
[
  {
    "tradeDate": "2026-06-12",
    "utilizationPercent": 85.5,
    "createdBy": "justin.lai@tng.asia",
    "createdAt": "2026-07-14T08:31:33Z",
    "updatedBy": "justin.lai@tng.asia",
    "updatedAt": "2026-07-14T08:45:40Z",
    "generatedAt": "2026-07-14T08:45:40Z"
  },
  {
    "tradeDate": "2026-06-11",
    "utilizationPercent": 92.5,
    "createdBy": "justin.lai@tng.asia",
    "createdAt": "2026-07-14T08:31:33Z",
    "updatedBy": "justin.lai@tng.asia",
    "updatedAt": "2026-07-14T08:45:40Z",
    "generatedAt": "2026-07-14T08:45:40Z"
  }
]
```

**Response** `200 OK` (Record-Array Category, all items):
Returns the list of items.
```json
[
  {
    "id": "hotkey-001",
    "kwatchHotkey": "Reddit_Currenc_Group",
    "platform": "Reddit",
    "createdBy": "operations",
    "createdAt": "2026-06-12T23:59:00Z"
  }
]
```

---

### POST /manual-input/{category}

Create or append records. Only supported for **Record-Array** categories.

```
POST /manual-input/{category}?ticker=CURR
Authorization: <id_token>
Content-Type: application/json

{
  "kwatchHotkey": "Reddit_Currenc_Group",
  "platform": "Reddit"
}
```

**Rules:**
* Validates that all required fields for creation are provided.
* Discards any client-provided `id` value and always auto-generates a unique backend ID (`hotkey-xxxxxx`).
* Populates server-side audit logs and saves to S3.

**Response** `200 OK`:
Returns the newly created record with its generated `id` and metadata.
```json
{
  "id": "hotkey-1e08ff71",
  "kwatchHotkey": "Reddit_Currenc_Group",
  "platform": "Reddit",
  "createdBy": "justin.lai@tng.asia",
  "createdAt": "2026-07-14T08:28:25Z",
  "updatedBy": "justin.lai@tng.asia",
  "updatedAt": "2026-07-14T08:28:25Z"
}
```

---

### PUT /manual-input/{category}

Update a configuration or a specific array record.

```
PUT /manual-input/{category}?ticker=CURR&tradeDate=2026-06-12 (Single-Record)
PUT /manual-input/{category}?ticker=CURR&id=hotkey-001 (Record-Array)
Authorization: <id_token>
Content-Type: application/json

{
  "utilizationPercent": 75.4
}
```

**Rules:**
* For **Single-Record** categories: Merges the business fields into the file (generating S3 files based on local templates if they do not exist yet on S3). Returns the updated business fields.
* For **Record-Array** categories: Updates the item matching the query param `id` (or body `id`). If the ID is not found, returns `404 Not Found`.

**Response** `200 OK` (Single-Record Category):
```json
{
  "utilizationPercent": 75.4
}
```

---

### DELETE /manual-input/{category}

Delete a configuration or a specific array record. Restricted to `OPERATOR` and `ADMIN` roles.

```
DELETE /manual-input/{category}?ticker=CURR&tradeDate=2026-06-12 (Single-Record)
DELETE /manual-input/{category}?ticker=CURR&id=hotkey-001 (Record-Array)
Authorization: <id_token>
```

**Response** `200 OK`:
```json
{
  "message": "Record deleted successfully"
}
```

---

### POST/PUT /manual-input/consolidate

Trigger the consolidation pipeline manually for a target stock ticker.

```
POST /manual-input/consolidate
POST /manual-input/consolidate?ticker=SPY
Authorization: <id_token>
Content-Type: application/json

{
  "ticker": "SPY"
}
```

**Parameters:**
* `ticker` (optional query parameter or JSON body parameter): Target stock ticker. Defaults to the user's primary associated ticker if omitted.

**Rules:**
* This API ignores optional client parameters like `input_type`, `rebuild_from_date`, and `force_rebuild` from client input, hardcoding them on the backend.
* It invokes the consolidator Lambda asynchronously with:
  * `"input_type": "issued-share"`
  * `"force_rebuild": true`
  * `"rebuild_from_date"`: Calculated dynamically based on the current UTC time:
    * Before 4:00 AM UTC: `ref_date = today_utc - 1 day`
    * At/After 4:00 AM UTC: `ref_date = today_utc`
    * If `ref_date` falls on a Monday: `rebuild_from_date = ref_date - 3 days` (Friday)
    * If `ref_date` falls on a Sunday: `rebuild_from_date = ref_date - 3 days` (Thursday)
    * If `ref_date` falls on a Saturday: `rebuild_from_date = ref_date - 2 days` (Thursday)
    * Otherwise: `rebuild_from_date = ref_date - 1 day`
* The API returns immediately without waiting for the consolidation to complete.

**Response** `200 OK`:
```json
{
  "message": "Consolidation pipeline triggered successfully",
  "ticker": "SPY",
  "detail": {
    "source": "user-inputs-update",
    "ticker": "SPY",
    "input_type": "issued-share",
    "rebuild_from_date": "2026-07-15",
    "force_rebuild": true
  }
}
```

---

### POST /manual-input/import

Upload a CSV file containing operations data to import a clean set of manual input records. The API parses the CSV, validates it, translates header columns, casts types, removes formatting commas in numbers, and writes fresh JSON file(s) back to S3. It completely overwrites any existing data for the imported category and ticker.

```
POST /manual-input/import?ticker=CURR&category=utilization
Authorization: <id_token>
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="utilization.csv"
Content-Type: text/csv

<CSV File Bytes>
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

**Access Control**:
* Restricted to Operators/Admins (`OPERATOR` / `ADMIN` role) only.
* Standard users (`USER` role) are unauthorized and will receive a `403 Forbidden` response.

**Parameters**:
* `ticker` (**Required** / Query Parameter or Form Field): The stock ticker symbol (e.g. `CURR`).
* `category` (Optional / Query Parameter or Form Field): Target category. Must be one of: `utilization`, `issued-share`, `manual-availability`, `margins`, `sec-filings`, `institutional-owner`, `short-score`, `internal-float-inputs`, `management-holdings`, `profile`. If omitted, the category is inferred automatically from the uploaded filename (e.g. `utilization.csv` -> `utilization`, `internal-float-input.csv` -> `internal-float-inputs`, `profile.csv` -> `profile`).
* `file` (**Required** / Form Field): The multipart CSV file containing the data.

**Existing Data Handling**:
- **Date-Specific Categories** (`utilization`, `margins`, `short-score`, `manual-availability`):
  - These categories store data in date-partitioned JSON files: `manual-input/{category}/{ticker}/{date}/{category}.json`.
  - During import, the CSV is grouped by the `tradeDate` of each row.
  - For each unique date present in the CSV, the API writes/overwrites the corresponding date-specific file in S3.
  - **Important**: Any existing S3 data/files for dates *not* present in the uploaded CSV will remain intact. Only files for dates that exist in the CSV are replaced.
- **Single-Record Categories** (`issued-share`, `profile`):
  - These categories store all data in a single JSON file: `manual-input/{category}/{ticker}/{category}.json`.
  - The API completely overwrites this file with the top-sorted record from the CSV. All prior existing information in that file is deleted.
- **Internal Float Inputs Category** (`internal-float-inputs`):
  - This category stores complex nested structures in a single JSON file: `manual-input/internal-float-inputs/{ticker}/internal-float-inputs.json`.
  - The API completely replaces the file. Existing holdings, tokenized shares, and collateralized shares records are cleared, and a fresh file with a newly auto-generated `auditLog` list is written.
- **Record-Array Categories** (`sec-filings`, `institutional-owner`, `management-holdings`, `hotkeys`):
  - These categories store multiple records under a `"records"` array in a single JSON file (e.g. `manual-input/sec-filings/{ticker}/sec-filings.json`).
  - The API completely replaces this JSON file. All existing items under the `"records"` array are discarded and replaced by the rows parsed from the CSV.

**Downstream Triggers**:
* **Manual Consolidation Required**: The consolidator Lambda is *not* triggered automatically by the CSV import to prevent redundant runs during batch operations. The consolidator pipeline must be triggered manually after imports complete.

**Response** `200 OK`:
```json
{
  "message": "Import completed successfully",
  "category": "utilization",
  "ticker": "CURR",
  "recordsCount": 386,
  "generatedFiles": [
    "manual-input/utilization/CURR/2026-07-17/utilization.json"
  ],
  "inputRows": 386,
  "importedRows": 386,
  "skippedRows": 0,
  "errors": []
}
```

**Response** `400 Bad Request`: If category is invalid, CSV is empty/malformed, or headers cannot be normalized.
**Response** `403 Forbidden`: Ticker access restriction.

---

### GET /hotkeys

Retrieve all notification hotkey mappings, or query for mappings associated with a specific ticker.

```
GET /hotkeys
GET /hotkeys?ticker=AAPL
Authorization: <id_token>
```

**Parameters**:
- `ticker` (optional query parameter): Filter mappings by a specific stock ticker.

**Permissions**:
- Any authenticated user (`USER`, `OPERATOR`, `DEMO`) is authorized to perform this operation.

**Response** `200 OK`:
```json
[
  {
    "ticker": "AAPL",
    "kwatchHotkey": "alt+a",
    "createUser": "operator@example.com",
    "createDatetime": "2026-07-02T12:00:00.000Z"
  },
  {
    "ticker": "MSFT",
    "kwatchHotkey": "shift+m",
    "createUser": "operator@example.com",
    "createDatetime": "2026-07-02T12:05:00.000Z"
  }
]
```

---

### POST /hotkeys

Create or update a notification hotkey mapping for a stock ticker.

```
POST /hotkeys
Authorization: <id_token>
Content-Type: application/json

{
  "ticker": "AAPL",
  "kwatchHotkey": "alt+a"
}
```

**Parameters**:
- `ticker` (string, required): Ticker symbol in UPPERCASE.
- `kwatchHotkey` (string, required): The keyboard hotkey binding representation.

**Permissions**:
- Restricted to users with the `OPERATOR` role. Rejects other roles with `403 Forbidden`.

**Response** `200 OK`:
```json
{
  "ticker": "AAPL",
  "kwatchHotkey": "alt+a",
  "createUser": "operator@example.com",
  "createDatetime": "2026-07-02T12:00:00.000Z"
}
```
**Response** `403 Forbidden`: Role check failed.
**Response** `400 Bad Request`: Request body format invalid or missing parameters.

---

### DELETE /hotkeys/{ticker}/{kwatchHotkey}

Delete a specific hotkey mapping for a stock ticker.

```
DELETE /hotkeys/AAPL/alt+a
Authorization: <id_token>
```

**Parameters**:
- `ticker` (string, required path parameter): Ticker symbol.
- `kwatchHotkey` (string, required path parameter): The mapped hotkey.

**Permissions**:
- Restricted to users with the `OPERATOR` role. Rejects other roles with `403 Forbidden`.

**Response** `200 OK`:
```json
{
  "message": "Hotkey mapping successfully deleted."
}
```
**Response** `403 Forbidden`: Role check failed.
**Response** `400 Bad Request`: Missing path parameters.

---

## Rule Engine APIs

Manage custom valuation rule formulas and execute checks.

### GET /rules

Retrieve custom user-configured rules. Can filter rules by stock ticker.

```
GET /rules?ticker=AAPL
Authorization: <id_token>
```

**Parameters**:
- `ticker` (string, optional query parameter): Ticker symbol to filter user rules by (case-insensitive).

**Response** `200 OK`:
```json
[
  {
    "userId": "user-123",
    "ruleId": "rule-456",
    "ticker": "AAPL",
    "status": "ACTIVE",
    "formula": "*.shortInterestFloat > 25",
    "targetFile": "s3://data-sync-platform-website-data/AAPL_v2_user_inputs.json",
    "description": "Short interest above 25%",
    "createUser": "user@example.com",
    "createDatetime": "2026-07-09T06:39:50Z",
    "lastModifiedDatetime": "2026-07-09T06:39:50Z"
  }
]
```

---

### POST /rules

Create or update a custom rule configuration.

```
POST /rules
Authorization: <id_token>
Content-Type: application/json

{
  "ruleId": "rule-456",
  "ticker": "AAPL",
  "formula": "*.shortInterestFloat > 25",
  "targetFile": "s3://data-sync-platform-website-data/AAPL_v2_user_inputs.json",
  "status": "ACTIVE",
  "description": "Short interest above 25%"
}
```

**Request Body**:
- `ruleId` (string, required): Unique identifier for the rule.
- `ticker` (string, required): Ticker symbol.
- `formula` (string, required): Valid Python expression for valuation check (supports jsonpath variables, numbers, operators).
- `targetFile` (string, required): S3 path to evaluate against.
- `status` (string, optional): Rule status (`ACTIVE` or `INACTIVE`). Defaults to `ACTIVE`.
- `description` (string, optional): Brief description of the rule purpose.

**Response** `200 OK`: Returns the saved rule item.

---

### DELETE /rules/{ruleId}

Delete a custom rule.

```
DELETE /rules/rule-456
Authorization: <id_token>
```

**Response** `200 OK`:
```json
{
  "message": "Rule rule-456 successfully deleted."
}
```

---

### POST /rule-engine/check

Evaluate a formula check against an ad-hoc or stored rule S3 target file. Used by the sandbox playground.

```
POST /rule-engine/check
Authorization: <id_token>
Content-Type: application/json

{
  "formula": "*.shortInterestFloat > 25",
  "s3_path": "s3://data-sync-platform-website-data/AAPL_v2_user_inputs.json"
}
```

**Request Body**:
- `formula` (string, required): Rule expression.
- `s3_path` (string, required): S3 file URL containing target JSON.
- `ruleId` (string, optional): Stored rule ID (if evaluating a saved rule).

**Response** `200 OK`:
```json
{
  "result": true,
  "pass": true
}
```

---

### POST /rule-engine/extract-paths

Analyze an S3 target JSON file and extract available JSON paths for formula composition.

```
POST /rule-engine/extract-paths
Authorization: <id_token>
Content-Type: application/json

{
  "s3_path": "s3://data-sync-platform-website-data/AAPL_v2_user_inputs.json",
  "generalize": true
}
```

**Response** `200 OK`:
```json
{
  "paths": [
    "symbol",
    "owners.*.shares",
    "shortInterestFloat"
  ]
}
```

---

## Predefined Rule Catalog APIs

Operators manage the catalog of predefined rules, and users read the catalog and toggle alert rules.

### GET /rule-catalog

List all alert rules available in the predefined catalog.

```
GET /rule-catalog
Authorization: <id_token>
```

**Response** `200 OK`: Returns an array of catalog items sorted by Section.
```json
[
  {
    "catalogId": "ssp-sif",
    "section": "Short Selling Pressure",
    "monitorField": "Short Interest Float %",
    "description": "Triggers when short interest relative to free float exceeds your selected limit.",
    "s3Path": "s3://data-sync-platform-website-data/{ticker}_v2_user_inputs.json",
    "jsonPath": "*.shortInterestFloat",
    "unit": "%",
    "defaultOperator": ">",
    "defaultThreshold": 25,
    "defaultSeverity": "High"
  }
]
```

---

### POST /rule-catalog

Create a new rule catalog entry.

```
POST /rule-catalog
Authorization: <id_token>
Content-Type: application/json

{
  "catalogId": "ssp-sif",
  "section": "Short Selling Pressure",
  "monitorField": "Short Interest Float %",
  "s3Path": "s3://data-sync-platform-website-data/{ticker}_v2_user_inputs.json",
  "jsonPath": "*.shortInterestFloat",
  "description": "Triggers when short interest relative to free float exceeds your limit.",
  "unit": "%",
  "defaultOperator": ">",
  "defaultThreshold": 25,
  "defaultSeverity": "High"
}
```

**Permissions**:
- Restricted to users with the `OPERATOR` or `ADMIN` role. Rejects other roles with `403 Forbidden`.

**Response** `200 OK`: Returns the created catalog entry item.

---

### GET/PUT/DELETE /rule-catalog/{catalogId}

Retrieve, update, or delete a predefined catalog rule by ID.

* **GET**: Returns the catalog item details (`200 OK` or `404 Not Found`).
* **PUT**: Modify catalog details (Restricted to `OPERATOR` / `ADMIN` roles).
* **DELETE**: Delete catalog entry (Restricted to `OPERATOR` / `ADMIN` roles).

---

### GET /rule-catalog/user-settings

Fetch the user's active/inactive configured alert rules.

```
GET /rule-catalog/user-settings?ticker=AAPL
Authorization: <id_token>
```

**Parameters**:
- `ticker` (string, optional query parameter): Ticker symbol.

**Response** `200 OK`: Returns user's alert rules (entries starting with `CATALOG__`).
```json
[
  {
    "userId": "user-123",
    "ruleId": "CATALOG__ssp-sif",
    "catalogId": "ssp-sif",
    "ticker": "AAPL",
    "operator": ">",
    "threshold": 30.0,
    "severity": "High",
    "status": "ACTIVE",
    "formula": "*.shortInterestFloat > 30.0",
    "targetFile": "s3://data-sync-platform-website-data/AAPL_v2_user_inputs.json"
  }
]
```

---

### POST /rule-catalog/user-settings

Save alert rule toggle configurations for the user. 
* Validates `ticker` against the user's authorized profile tickers.
* Resolves the `{ticker}` template inside `s3Path` (e.g. replacing it with the actual ticker `AAPL`).
* Active alert settings are saved with status `ACTIVE`.
* Disabled settings are kept in the database with status `INACTIVE`.

```
POST /rule-catalog/user-settings?ticker=AAPL
Authorization: <id_token>
Content-Type: application/json

{
  "settings": [
    {
      "catalogId": "ssp-sif",
      "active": true,
      "operator": ">",
      "threshold": 30,
      "severity": "High"
    },
    {
      "catalogId": "lbp-bfr",
      "active": false
    }
  ]
}
```

**Response** `200 OK`:
```json
{
  "saved": 2,
  "deleted": 0
}
```

---

## Making Authenticated API Calls


All protected API calls must include the Cognito **ID Token** (not the access token) in the `Authorization` header.

```javascript
async function apiCall(method, path, body = null) {
  const idToken = sessionStorage.getItem('id_token');
  
  if (!idToken) {
    throw new Error('Not authenticated');
  }

  const API_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
  
  const options = {
    method,
    headers: {
      'Authorization': idToken,          // ID token directly (no "Bearer " prefix)
      'Content-Type': 'application/json',
    },
  };

  if (body && (method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}`, options);

  if (response.status === 401) {
    // Token expired or invalid — attempt refresh or redirect to login
    throw new Error('Unauthorized');
  }

  return response.json();
}

// Usage examples:
const profile = await apiCall('GET', '/profile');
const updated = await apiCall('PUT', '/profile', { name: 'New Name', bio: 'Updated bio' });
await apiCall('DELETE', '/profile');
```

> **⚠ Authorization Header Format**: The API Gateway Cognito Authorizer expects the raw JWT token directly — `Authorization: <token>`. Do **NOT** add the `Bearer` prefix. Including `Bearer` will cause the authorizer to reject the request with a `401 Unauthorized`.

---

## CORS Configuration

The backend is configured to allow cross-origin requests from specific domains.

**Currently allowed origins** (dev environment):
- `https://ssma-portal.vercel.app`
- `https://ssma-livid.vercel.app`
- `http://localhost:3000`

**Allowed headers:**
```
Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token
```

**Allowed methods (per endpoint):**
- `/secured`: `GET, OPTIONS`
- `/profile`: `GET, PUT, PATCH, DELETE, OPTIONS`
- `/user-inputs`: `GET, OPTIONS`
- `/user-inputs/private-holdings`: `PUT, OPTIONS`
- `/user-inputs/token-chains`: `PUT, OPTIONS`
- `/user-inputs/collateral-chains`: `PUT, OPTIONS`
- `/sec-filings`: `GET, PUT, DELETE, OPTIONS`
- `/market-data`: `GET, POST, OPTIONS`
- `/market-data/batch`: `POST, OPTIONS`
- `/market-data/current`: `GET, OPTIONS`
- `/market-data/history`: `GET, OPTIONS`
- `/market-data/reports`: `GET, OPTIONS`
- `/social-data`: `GET, POST, OPTIONS`

### Adding Your Frontend Origin

To add a new frontend origin (e.g., `https://your-app.vercel.app`):

1. Contact the backend team to update:
   - `allowed_cors_origins` in `terraform/envs/dev/main.tf` (API Gateway module)
   - `callback_urls` in `terraform/envs/dev/main.tf` (Cognito module)  
   - `logout_urls` in `terraform/envs/dev/main.tf` (Cognito module)

2. The values that need to be added:
   ```hcl
   # In the api_gateway module block:
   allowed_cors_origins = ["https://ssma-portal.vercel.app", "http://localhost:3000", "https://your-app.com"]

   # In the cognito module block:
   callback_urls = [...existing..., "https://your-app.com/callback"]
   logout_urls   = [...existing..., "https://your-app.com/logout", "https://your-app.com"]
   ```

3. After Terraform apply, the changes are live.

---

## User Profile Data Model

Profiles are stored in a DynamoDB table with the following schema:

| Field | Type | Source | Mutable via API |
|-------|------|--------|-----------------|
| `sub` | String (PK) | JWT `sub` claim | ❌ Auto-set |
| `email` | String | JWT `email` claim | ❌ Auto-set on first write |
| `status` | String | `"CONFIRMED"` / `"UNCONFIRMED"` | ❌ Auto-set |
| `created_at` | String (ISO 8601) | Server timestamp | ❌ Auto-set on first write |
| `name` | String | User input | ✅ |
| `bio` | String | User input | ✅ |
| `phone_number` | String | User input | ✅ |
| `nickname` | String | User input | ✅ |
| `ticker` | String | Invitation / default | ❌ (restricted to operators) |
| `tickers` | List of Strings | Invitation / default | ❌ (restricted to operators) |
| `role` | String | Invitation / default | ❌ (restricted to operators) |

**Automatic Profile Creation**: When a user signs up and confirms their email, a Cognito Post-Confirmation trigger automatically creates a base profile record in DynamoDB.
- **For Invited Users**: The profile is created with `role` = `"USER"`, the `ticker` is set to the invited stock ticker, and the `tickers` list contains that ticker.
- **For Uninvited Users**: The profile is created with `role` = `"DEMO"`, the `ticker` is set to `"CURR"`, and the `tickers` list contains `["CURR"]` (these values are configurable via environment variables on the backend).

Once confirmed, the user can later update their non-restricted profile attributes (name, bio, phone_number, nickname) via the API.

---

## User Inputs Data Model

User inputs are stored in S3 at `s3://data-sync-platform-website-data/{TICKER}_v2_user_inputs.json`.

### Top-Level Structure

| Field | Type | Mutable via API | Notes |
|-------|------|-----------------|-------|
| `userId` | string | ❌ | The user's `sub` claim identifier |
| `ticker` | string | ❌ | The stock ticker associated with this file |
| `privateHoldings` | array | ✅ via `PUT /user-inputs/private-holdings` | |
| `custodyRows` | array | ❌ | Read-only, managed by data-sync-platform |
| `tokenChains` | array | ✅ via `PUT /user-inputs/token-chains` | |
| `collateralChains` | array | ✅ via `PUT /user-inputs/collateral-chains` | |

### privateHoldings item shape

```json
{
  "id": "string",              // Unique identifier for the holding
  "holderName": "string",      // Display name of the holder
  "category": "string",        // e.g. "Founder", "Strategic Investor"
  "shares": 1000000,           // Number of shares (integer)
  "includeInDeduction": true,  // Whether to deduct from public float calculation
  "notes": "string"            // Optional notes
}
```

### tokenChains item shape

```json
{
  "id": "string",       // Unique identifier, e.g. "eth"
  "chain": "string",    // Chain name, e.g. "ETH", "SOL", "BNB"
  "shares": 1800000,    // Number of tokenized shares on this chain
  "provider": "string" // Tokenization provider, e.g. "Securitize", "xStocks"
}
```

### collateralChains item shape

```json
{
  "id": "string",        // Unique identifier, e.g. "eth-c"
  "chain": "string",     // Chain name, e.g. "ETH", "SOL", "BNB"
  "shares": 900000,      // Number of shares used as collateral on this chain
  "protocol": "string"  // DeFi protocol, e.g. "Aave", "Kamino", "Euler"
}
```

### Consolidator Lambda side-effect

Every successful PUT triggers the `data-sync-platform-consolidator-v2` Lambda **asynchronously** with the following payload containing the resolved stock ticker:

```json
{ "detail": { "source": "user-inputs-update", "ticker": "<TICKER>" } }
```

The Lambda reads existing Fintel/Ortex consolidated JSONs from S3, merges in the updated user inputs, and uploads:
- `institutional_ownership_CURR_consolidated.json` → centralized S3
- `institutional_ownership_CURR_consolidated_4_web.json` → website S3

This process completes in seconds (no CSV re-fetch). The PUT response returns immediately without waiting for consolidation.

---

## SEC Filings Data Model

SEC filings are stored in S3 at `news_filings/{TICKER}_sec_filings.json` within the `data-sync-platform-website-data` bucket.

### Top-Level Operations Envelope Structure

| Field | Type | Mutable | Description |
|---|---|---|---|
| `source` | string | ❌ | Usually `"operations_manual_input"` |
| `schemaVersion` | number | ❌ | Schema version (e.g. `1`) |
| `updatedAt` | string (ISO 8601) | ❌ | Auto-updated server timestamp |
| `s3Key` | string | ❌ | Target S3 location path |
| `records` | array | ✅ via `PUT /sec-filings` | Array of normalized filing items |
| `log` | array | ❌ | History tracking of updates |

### Filing Item Schema (Preferred Operations format)

| Field | Required | Type | Description / Constraints |
|---|---|---|---|
| `id` | auto | string | Auto-generated MD5 string if missing |
| `ticker` | default | string | `"CURR"` (defaults if missing) |
| `companyName` | default | string | `"CURRENC Group Inc."` |
| `formType` | yes | string | e.g. `"4"`, `"8-K"`, `"10-K"`, `"10-Q"` |
| `formDescription` | yes | string | Human-readable document description |
| `filingDate` | yes | string | `"YYYY-MM-DD"` date string |
| `reportingDate` | no | string | `"YYYY-MM-DD"` date string |
| `act` | no | string | SEC Act (e.g., `"33"`, `"34"`) |
| `filmNumber` | no | string | SEC Film Number |
| `fileNumber` | no | string | SEC File Number |
| `accessionNumber` | yes | string | Used as the primary deduplication key |
| `filingsUrl` | yes | string | Link to index URL on SEC EDGAR |
| `notes` | no | string | Notes or comments |
| `createdAt` | auto | string | Server timestamp |
| `createdBy` | yes | string | Operations user name or system |

---

## Notification Hotkey Map Data Model

Hotkey mappings are globally configured and stored in DynamoDB under the table `ssma-portal-hotkeys-${environment}`.

### Hotkey Mapping Item Schema

| Attribute | Key Type | Type | Required | Description / Constraints |
|---|---|---|---|---|
| `ticker` | Partition Key (Hash) | String | Yes | Stock ticker code in UPPERCASE (e.g. `"AAPL"`). |
| `kwatchHotkey` | Sort Key (Range) | String | Yes | Hotkey string mapping (e.g. `"alt+a"`, `"shift+h"`). |
| `createUser` | - | String | Auto | The email of the operator user who created the mapping (falls back to `sub`). |
| `createDatetime` | - | String | Auto | ISO 8601 UTC timestamp string of creation (e.g. `"2026-07-02T12:00:00.000Z"`). |

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Common Cause |
|------|---------|-------------|
| `200` | Success | Request completed |
| `400` | Bad Request | Invalid JSON body |
| `401` | Unauthorized | Missing, expired, or invalid JWT token |
| `403` | Access Denied | Token valid but insufficient permissions |
| `405` | Method Not Allowed | Unsupported HTTP method on endpoint |
| `500` | Internal Server Error | Server-side failure (e.g., DynamoDB unavailable) |

### Error Response Format

All error responses follow this format:
```json
{
  "message": "Human-readable error description"
}
```

### Handling 401 Errors

When you receive a `401`:
1. Attempt a **silent token refresh** using the stored `refresh_token`.
2. If refresh succeeds, **retry the original request** with the new token.
3. If refresh fails, **clear session and redirect to login**.

```javascript
async function authenticatedFetch(method, path, body) {
  try {
    return await apiCall(method, path, body);
  } catch (err) {
    if (err.message === 'Unauthorized') {
      try {
        const newTokens = await refreshTokens(sessionStorage.getItem('refresh_token'));
        sessionStorage.setItem('access_token', newTokens.accessToken);
        sessionStorage.setItem('id_token', newTokens.idToken);
        sessionStorage.setItem('refresh_token', newTokens.refreshToken);
        return await apiCall(method, path, body); // Retry
      } catch {
        logout(); // Give up, force re-login
      }
    }
    throw err;
  }
}
```

---

## JWT Token Structure

The Cognito ID Token contains these relevant claims:

```json
{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "user@example.com",
  "email_verified": true,
  "cognito:username": "google_1234567890",
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXX",
  "aud": "<client_id>",
  "token_use": "id",
  "exp": 1718198400,
  "iat": 1718194800
}
```

### Decoding the ID Token (Browser-Native, No Dependencies)

```javascript
function decodeJWT(token) {
  if (!token) return null;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Convert URL-safe Base64 to standard Base64
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    
    // Pad with '='
    const pad = base64.length % 4;
    if (pad) {
      if (pad === 1) return null; // Invalid
      base64 += '='.repeat(4 - pad);
    }
    
    const binaryStr = atob(base64);
    
    // Handle multibyte/UTF-8 characters
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    
    const decoded = new TextDecoder().decode(bytes);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
```

> **Note**: This is a payload-only decode (no signature verification). Signature verification is handled server-side by the API Gateway Cognito Authorizer. Client-side decoding is safe for extracting display information.

---

## PKCE Implementation

PKCE is required for this integration. Here are browser-native implementations with zero dependencies:

```javascript
// Base64URL encoder
function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Generate a cryptographically secure random code verifier
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

// Generate the S256 code challenge from the verifier
async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hash);
}
```

---

## Onboarding Checklist for New Frontends

Follow this checklist to integrate your frontend with the SSMA Portal backend:

### 1. Register Your URLs (Backend Team Action)
- [ ] Your callback URL added to Cognito `callback_urls` (e.g., `https://your-app.com/callback`)
- [ ] Your logout URL added to Cognito `logout_urls` (e.g., `https://your-app.com/logout`, `https://your-app.com`)
- [ ] Your origin added to API Gateway `allowed_cors_origins` (e.g., `https://your-app.com`)
- [ ] Terraform applied and deployed

### 2. Configure Environment Variables
- [ ] Set `COGNITO_DOMAIN` (obtain from backend team or Terraform outputs)
- [ ] Set `COGNITO_CLIENT_ID` (obtain from backend team or Terraform outputs)
- [ ] Set `REDIRECT_URI` (must match registered callback URL **exactly**)
- [ ] Set `API_GATEWAY_URL` (obtain from backend team or Terraform outputs)

### 3. Implement Auth Flow
- [ ] Implement PKCE utility functions (`generateCodeVerifier`, `generateCodeChallenge`)
- [ ] Create login function that redirects to Cognito Hosted UI
- [ ] Create callback page that exchanges authorization code for tokens
- [ ] Implement session management (store/retrieve/clear tokens in sessionStorage)
- [ ] Implement JWT decoder to extract user claims
- [ ] Implement silent token refresh (check every 30s, refresh at < 5 min TTL)
- [ ] Implement logout (clear local session + redirect to Cognito `/logout`)

### 4. Implement API Integration
- [ ] Create authenticated fetch wrapper with `Authorization: <id_token>` header
- [ ] Implement 401 retry logic (refresh token → retry → logout fallback)
- [ ] Test `GET /secured` to verify authentication works
- [ ] Test `GET /profile` to fetch user profile
- [ ] Test `PUT /profile` to update user profile
- [ ] Test `GET /user-inputs` to fetch the shared demo-user data
- [ ] Test `PUT /user-inputs/private-holdings` to update private holdings
- [ ] Test `PUT /user-inputs/token-chains` to update token chains
- [ ] Test `PUT /user-inputs/collateral-chains` to update collateral chains
- [ ] Test `GET /sec-filings` to fetch SEC filings
- [ ] Test `PUT /sec-filings` to submit SEC filings manual updates
- [ ] Test `DELETE /sec-filings` to remove an SEC filing record

### 5. Implement Route Protection
- [ ] Add route guard for protected pages (check for valid session token)
- [ ] Redirect unauthenticated users to login/landing page
- [ ] Redirect authenticated users away from landing page to dashboard

---

## Working Code Examples

### Minimal Vanilla JavaScript Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>SSMA Integration Example</title>
</head>
<body>
  <div id="app">
    <button id="loginBtn" onclick="login()">Login with SSMA</button>
    <button id="logoutBtn" onclick="logout()" style="display:none">Logout</button>
    <pre id="profile"></pre>
  </div>

  <script>
    // Configuration — replace with your actual values
    const CONFIG = {
      cognitoDomain: 'ssma-portal-auth-dev.auth.us-east-1.amazoncognito.com',
      clientId: 'YOUR_CLIENT_ID',
      redirectUri: 'http://localhost:3000/callback',
      apiUrl: 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev',
    };

    // ─── PKCE Utilities ─────────────────────────
    function base64UrlEncode(buffer) {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function generateCodeVerifier() {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return base64UrlEncode(array);
    }

    async function generateCodeChallenge(verifier) {
      const data = new TextEncoder().encode(verifier);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return base64UrlEncode(hash);
    }

    // ─── JWT Decode ─────────────────────────────
    function decodeJWT(token) {
      try {
        let base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        if (pad) base64 += '='.repeat(4 - pad);
        return JSON.parse(new TextDecoder().decode(
          Uint8Array.from(atob(base64), c => c.charCodeAt(0))
        ));
      } catch { return null; }
    }

    // ─── Auth Functions ─────────────────────────
    async function login() {
      const state = Math.random().toString(36).substring(2, 15);
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);

      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_code_verifier', verifier);

      window.location.href = `https://${CONFIG.cognitoDomain}/oauth2/authorize?` +
        new URLSearchParams({
          client_id: CONFIG.clientId,
          response_type: 'code',
          scope: 'openid email profile aws.cognito.signin.user.admin',
          redirect_uri: CONFIG.redirectUri,
          code_challenge: challenge,
          code_challenge_method: 'S256',
          state,
        });
    }

    function logout() {
      sessionStorage.clear();
      window.location.href = `https://${CONFIG.cognitoDomain}/logout?` +
        new URLSearchParams({
          client_id: CONFIG.clientId,
          logout_uri: window.location.origin,
        });
    }

    // ─── Callback Handler (put this on your callback page) ───
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');

      if (state !== sessionStorage.getItem('oauth_state')) {
        throw new Error('State mismatch');
      }

      const response = await fetch(`https://${CONFIG.cognitoDomain}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: CONFIG.clientId,
          code,
          redirect_uri: CONFIG.redirectUri,
          code_verifier: sessionStorage.getItem('oauth_code_verifier'),
        }),
      });

      const data = await response.json();
      sessionStorage.setItem('access_token', data.access_token);
      sessionStorage.setItem('id_token', data.id_token);
      sessionStorage.setItem('refresh_token', data.refresh_token);
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_code_verifier');

      window.location.href = '/dashboard';
    }

    // ─── API Call ───────────────────────────────
    async function fetchProfile() {
      const idToken = sessionStorage.getItem('id_token');
      const res = await fetch(`${CONFIG.apiUrl}/profile`, {
        headers: { 'Authorization': idToken },
      });
      return res.json();
    }

    // ─── Init ───────────────────────────────────
    (async () => {
      // Handle callback page
      if (window.location.pathname === '/callback') {
        await handleCallback();
        return;
      }

      // Check session
      const idToken = sessionStorage.getItem('id_token');
      if (idToken) {
        const user = decodeJWT(idToken);
        if (user && user.exp > Date.now() / 1000) {
          document.getElementById('loginBtn').style.display = 'none';
          document.getElementById('logoutBtn').style.display = 'inline';
          const profile = await fetchProfile();
          document.getElementById('profile').textContent = JSON.stringify(profile, null, 2);
        }
      }
    })();
  </script>
</body>
</html>
```

### React Hook Pattern

```javascript
// useApi.js — Reusable hook for authenticated API calls
import { useCallback } from 'react';

export function useApi() {
  const apiUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;

  const request = useCallback(async (method, path, body = null) => {
    const idToken = sessionStorage.getItem('id_token');
    if (!idToken) throw new Error('Not authenticated');

    const options = {
      method,
      headers: {
        'Authorization': idToken,
        'Content-Type': 'application/json',
      },
    };

    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${apiUrl}${path}`, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message);
    }

    return response.json();
  }, [apiUrl]);

  return {
    // Profile
    getProfile: () => request('GET', '/profile'),
    updateProfile: (data) => request('PUT', '/profile', data),
    deleteProfile: () => request('DELETE', '/profile'),
    testAuth: () => request('GET', '/secured'),
    // User Inputs
    getUserInputs: () => request('GET', '/user-inputs'),
    updatePrivateHoldings: (items) => request('PUT', '/user-inputs/private-holdings', items),
    updateTokenChains: (items) => request('PUT', '/user-inputs/token-chains', items),
    updateCollateralChains: (items) => request('PUT', '/user-inputs/collateral-chains', items),
    // SEC Filings
    getSecFilings: () => request('GET', '/sec-filings'),
    updateSecFilings: (items) => request('PUT', '/sec-filings', items),
    deleteSecFiling: (id) => request('DELETE', `/sec-filings?id=${id}`),
  };
}
```

---

## Quick Reference Card

| What | Value / Format |
|------|---------------|
| Auth Type | OAuth 2.0 Authorization Code + PKCE |
| Identity Providers | Cognito (email/password), Google |
| Token Type | JWT (Cognito-issued) |
| Token Lifetime | Access Token: 1 hour; Refresh Token: 30 days |
| Auth Header | `Authorization: <raw_id_token>` (no Bearer prefix) |
| API Base URL | `https://3flfpju5k8.execute-api.us-east-1.amazonaws.com/dev` |
| Profile Endpoints | `GET /secured`, `GET/PUT/PATCH/DELETE /profile` |
| User Inputs Endpoints | `GET /user-inputs`, `PUT /user-inputs/private-holdings\|token-chains\|collateral-chains` |
| User Inputs Target | Always `demo-user` entry (hardcoded) |
| Consolidator Trigger | Async Lambda invoke on every PUT to user-inputs sub-paths |
| SEC Filings Endpoints | `GET /sec-filings`, `PUT /sec-filings`, `DELETE /sec-filings` |
| SEC Filings Storage | `news_filings/CURR_sec_filings.json` in `data-sync-platform-website-data` |
| CORS | Origin must be pre-registered in Terraform config |
| Password Policy | Min 8 chars, uppercase, lowercase, number, symbol |
