# Demo Login Backend / IT Handoff

## Objective

Restore password-free public access at:

`https://portal.currenc.capital/demo`

The visitor must be signed in automatically as `demo.curr@gmail.com`, receive
live CURR data through the existing API Gateway, and remain read-only.

## Current failure

The frontend calls:

`POST https://portal.currenc.capital/api/demo-login`

Cognito currently returns:

`UserNotFoundException`

The portal converts that response to:

`The native Cognito demo account was not found.`

This is not a bad-password response. A wrong password would normally return
`NotAuthorizedException`.

Manual sign-in still works because it uses Cognito Hosted UI and Google
federation. A Google-federated identity does not automatically have a native
Cognito password, so it cannot necessarily use `USER_PASSWORD_AUTH` even when
the email address is the same.

## Required fix

1. Locate the existing production Cognito User Pool used by:
   - the Hosted UI domain `auth.currenc.capital`; and
   - the Cognito authorizer on the current API Gateway.
2. In that same User Pool, find all users whose email is
   `demo.curr@gmail.com`.
3. Confirm whether there is a native Cognito user in addition to any
   `Google_*` federated user.
4. If the native user is missing, restore/create it in this existing pool:
   - email: `demo.curr@gmail.com`;
   - email verified: `true`;
   - status: `CONFIRMED`;
   - permanent password set;
   - no forced password change, MFA challenge, or other first-login challenge.
5. Make sure the production portal app client has:
   - no client secret;
   - `ALLOW_USER_PASSWORD_AUTH` enabled;
   - `ALLOW_REFRESH_TOKEN_AUTH` enabled.
6. For the current frontend implementation, use the same app-client ID for
   automatic demo login and normal portal token refresh:
   - set `DEMO_COGNITO_CLIENT_ID` equal to
     `NEXT_PUBLIC_COGNITO_CLIENT_ID`; or
   - remove `DEMO_COGNITO_CLIENT_ID`, allowing the server route to use
     `NEXT_PUBLIC_COGNITO_CLIENT_ID`.
7. Provide the permanent password securely to the Vercel administrator so
   `DEMO_ACCOUNT_PASSWORD` can be updated. Do not put it in Git, this document,
   chat logs, or a public environment variable.
8. Confirm the demo user's application profile grants only:
   - role: `DEMO`;
   - primary ticker: `CURR`;
   - ticker list: `["CURR"]`.

Do **not** create a separate Cognito User Pool. Tokens from another pool will
not be trusted by the existing API Gateway authorizer without backend and
infrastructure changes.

## Important security requirement

The frontend already hides Operations Portal access and blocks mutations for
the demo email/role, but frontend checks can be bypassed.

Before making the demo public, the backend must reject every mutation made by
the demo account's Cognito `sub`. At minimum, reject `POST`, `PUT`, `PATCH`, and
`DELETE` requests with `403 Forbidden` for that identity. Read-only `GET`
requests required by the CURR user portal should remain available.

Use the immutable Cognito `sub` for backend enforcement, not email alone.

## Validation checklist

After Cognito and Vercel are updated:

1. `POST /api/demo-login` returns HTTP `200` and a complete Cognito session:
   `accessToken`, `idToken`, and `refreshToken`.
2. Do not print or send those tokens while testing.
3. The ID token belongs to `demo.curr@gmail.com` in the same User Pool trusted
   by API Gateway.
4. Opening `/demo` automatically reaches `/monitor/CURR/dashboard` without
   asking the visitor for a password.
5. Protected CURR `GET` APIs return live data.
6. The session can refresh after the initial ID token expires.
7. The demo account cannot open the Operations Portal or Development Mode.
8. Direct mutation attempts with the demo token return `403 Forbidden`.

## If a separate app client must be used

A dedicated app client may be created in the **same User Pool**, but the
frontend must then be changed to retain that client ID and use it when
refreshing the demo token. The current browser refresh code uses
`NEXT_PUBLIC_COGNITO_CLIENT_ID`, so using a different demo client without that
frontend change can make the demo fail when the first token expires.

The quickest compatible repair is therefore to use the existing production
portal app client and enable the required explicit authentication flows on it.

## Frontend status

The frontend already:

- attempts server-side native Cognito login without exposing the password to
  the browser;
- verifies that the authenticated profile email is the configured demo email;
- reuses a valid demo session;
- restricts the demo to CURR and applies frontend read-only controls; and
- falls back to Hosted UI if silent login fails.

Hosted UI fallback is only an emergency fallback because it may ask the public
visitor to authenticate. The Cognito work above is required for reliable,
password-free public demo access with live API data.
