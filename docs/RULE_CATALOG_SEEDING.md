# Rule Catalog Seeding

This repo includes a seed payload for the predefined Alert Rules catalog:

- `scripts/rule-catalog-seed.json`
- `scripts/seed-rule-catalog.mjs`

The script posts every catalog entry to:

```text
POST /rule-catalog
```

The endpoint is restricted to users with `OPERATOR` or `ADMIN` role, so the script requires a Cognito ID token.

## Seed Command

1. Sign in to the portal as an operator/admin user.
2. Open browser DevTools on the portal domain.
3. Copy the value returned by:

```js
sessionStorage.getItem('id_token')
```

4. Run:

```bash
RULE_CATALOG_ID_TOKEN="<id_token>" node scripts/seed-rule-catalog.mjs
```

Optional API override:

```bash
API_GATEWAY_URL="https://3flfpju5k8.execute-api.us-east-1.amazonaws.com/dev" \
RULE_CATALOG_ID_TOKEN="<id_token>" \
node scripts/seed-rule-catalog.mjs
```

## Catalog ID Convention

Catalog IDs are human-readable and stable:

```text
{section-slug}-{metric-slug}
```

Example:

```text
lending-borrowing-pressure-borrow-fee-rate
```

## Seeded Rules

The seed currently covers the predefined dashboard Alert Rules:

- Short Interest Float %
- Daily Short Volume Ratio
- Short Score
- Borrow Fee Rate
- Utilization
- Shortable Shares
- FTD Count
- FTD Value
- Price Drawdown
- Volume Spike
- Intraday Price Spike

The catalog JSON paths use backend-ready canonical fields, for example:

```text
*.borrowFeeRate
*.utilization
*.volumeSpike
```

If a field is currently frontend-derived, backend should emit the same canonical field in the target dashboard rule-evaluation JSON before enabling server-side rule checks.
