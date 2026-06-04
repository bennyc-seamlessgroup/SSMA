# Currenc Intelligence

Local-first executive dashboard for public company management teams.

## Features
- Ticker setup page
- Executive dashboard for CURR and future NASDAQ / NYSE tickers
- Three daily AI-style reports
- Email recipient management UI
- API status panel
- Local or S3 JSON import data
- Placeholder API routes for future ORTEX / Fintel / WhaleWisdom integrations

## Run locally
```bash
npm install
npm run dev
```

Open:
http://localhost:3000

## Notes
- The app uses mock data by default.
- Platform-managed fields are clearly labeled in the interface.
- No real email delivery is enabled until a provider key is configured.
- This project is structured for later deployment on Vercel, Render, Railway, Fly.io, or Supabase.

## Environment
Copy `.env.example` to `.env.local` if you want to configure future integrations.

### Import data source
By default the portal reads JSON from the local `import_data` folder:

```bash
IMPORT_DATA_SOURCE=local
```

For deployment, you can point the portal at an S3 bucket that mirrors the same folder structure as `import_data`:

```bash
IMPORT_DATA_SOURCE=s3
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_bucket_name
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
IMPORT_DATA_CACHE_SECONDS=30
```

The S3 bucket must contain the same relative JSON paths, for example `company/profile.json` and `short/short_interest.json`. The portal lists S3 object metadata and refreshes when the object ETag, last modified time, or size changes.
