# Currenc Intelligence

API-backed market intelligence portal for public-company management teams.

## Features

- Authenticated multi-ticker user portal
- Dashboard, ownership, internal float, short interest, lending pressure, and social sentiment
- SEC filing monitoring and daily report archive
- Operations portal for market data, filings, ownership, imports, social data, and notification routing
- Cognito authentication and API Gateway data access
- Client-side API caching with periodic data-version checks

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run typecheck
npm run build
```

## Environment

Copy `.env.example` to `.env.local` and provide the Cognito and API Gateway values for the target environment.

The browser reads portal data through authenticated backend APIs. Local JSON and direct S3 import-data fallbacks are not part of the current runtime architecture.

Current API and data contracts are documented under `docs/api/`, `docs/architecture/`, and `docs/data/`.
