# Currenc Intelligence

Local-first executive dashboard for public company management teams.

## Features
- Ticker setup page
- Executive dashboard for CURR and future NASDAQ / NYSE tickers
- Three daily AI-style reports
- Email recipient management UI
- API status panel
- Local JSON storage
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
