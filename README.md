# Currenc Intelligence

Local-first executive dashboard for public company management teams.

## Features
- Ticker setup page
- Executive dashboard for CURR and future NASDAQ / NYSE tickers
- Three daily AI-style reports
- Email recipient management UI
- API status panel
- Local or Google Drive JSON import data
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

For deployment, you can point the portal at a Google Drive folder that mirrors the same folder structure as `import_data`:

```bash
IMPORT_DATA_SOURCE=google-drive
GOOGLE_DRIVE_API_KEY=your_google_api_key
GOOGLE_DRIVE_IMPORT_FOLDER_ID=your_drive_folder_id
IMPORT_DATA_CACHE_SECONDS=30
```

The Google Drive folder must contain the same relative JSON paths, for example `company/profile.json` and `short/short_interest.json`. For this MVP path, the folder/files must be readable by the API key, such as a shared folder accessible by link. The portal polls Drive metadata and refreshes when the file checksum or modified time changes.
