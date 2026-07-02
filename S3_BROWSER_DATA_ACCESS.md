# Browser-to-S3 Data Access

The portal now checks public import-data versions directly from the browser instead of polling a Vercel API route. This removes the recurring `/api/ticker-data-status/[ticker]` function invocation and the associated server-side S3 listing work.

## Required S3 CORS configuration

Public object access alone is not enough for browser JavaScript. The bucket must return CORS headers for the portal origins.

Apply this CORS policy to `data-sync-platform-website-data`:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://ssma-livid.vercel.app"
    ],
    "ExposeHeaders": [
      "ETag",
      "Last-Modified",
      "Content-Length"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

Add every production or preview portal origin that should be allowed to read the data. Avoid using `"*"` for `AllowedOrigins` if the data should only be consumed by approved portal deployments.

## Environment variables

```env
NEXT_PUBLIC_IMPORT_DATA_BASE_URL=https://data-sync-platform-website-data.s3.us-east-1.amazonaws.com
NEXT_PUBLIC_IMPORT_DATA_LIST_URL=https://data-sync-platform-website-data.s3.amazonaws.com
NEXT_PUBLIC_IMPORT_DATA_POLL_SECONDS=60
NEXT_PUBLIC_IMPORT_DATA_SERVER_FALLBACK=false
```

These values are public by design and contain no AWS credentials.

Keep `NEXT_PUBLIC_IMPORT_DATA_SERVER_FALLBACK=true` during the CORS rollout. After direct browser requests succeed in production, set it to `false` so failed public requests cannot fall back to a Vercel function.

## S3 permissions

The browser requires:

- Public `s3:GetObject` for JSON objects displayed by the portal.
- Public `s3:ListBucket` limited to `report_data/` and the social-data prefixes if timeline/report update detection must list changing object names.

If bucket listing should remain private, the backend data pipeline should publish a small public `manifest.json` containing each page's object keys, ETags, sizes, and update timestamps. Polling one manifest is preferable to listing prefixes or checking many objects.

## Server-only operations

The following must remain server-side:

- Writing or deleting S3 objects.
- User/workspace input APIs.
- Cognito/API Gateway authenticated operations.
- Playwright PDF rendering.
- Any operation requiring AWS credentials.

Never place `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` in a `NEXT_PUBLIC_*` variable.
