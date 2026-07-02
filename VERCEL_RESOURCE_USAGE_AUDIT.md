# Vercel Resource Usage Audit

## Implementation update: browser-to-S3 migration

The following mitigations were implemented after this audit:

- The shared ticker layout no longer calls `getImportDataVersion()` or lists S3 during every render.
- `TickerDataStatusProvider` polls public S3 metadata from the browser instead of calling `/api/ticker-data-status/[ticker]` every 30 seconds.
- The default browser poll interval is now 60 seconds and pauses while the tab is hidden.
- Dashboard, Ownership, Short Interest, Lending Pressure, Social Sentiment, Report Archive, and generic import-data preview tables now load public display JSON from S3 in the browser.
- Authenticated writes, Internal Float workspace state, operations APIs, and PDF rendering remain server-side.
- A temporary server fallback exists for deployments where S3 CORS has not yet been configured. Set `NEXT_PUBLIC_IMPORT_DATA_SERVER_FALLBACK=false` after applying the policy in `S3_BROWSER_DATA_ACCESS.md`.

This removes the largest recurring function-invocation source once S3 CORS is active. Vercel will still receive ordinary page requests, authenticated API requests, data writes, and PDF rendering requests.

Date: July 2, 2026

## Executive Summary

The portal is not operating as a mostly static frontend. Most authenticated portal traffic is handled through dynamic Next.js server rendering and Vercel API functions.

The largest recurring resource consumer is the global ticker-data poll:

```text
GET /api/ticker-data-status/{ticker}
```

Every visible portal tab calls this endpoint immediately and then every 30 seconds. Each invocation checks all monitored pages, lists the import-data S3 bucket when its short in-memory cache has expired, lists both social-data prefixes, and lists the report archive.

One continuously visible browser tab can therefore produce approximately:

| Usage pattern | Status function invocations per 30-day month |
|---|---:|
| Open 8 hours per day | 28,800 |
| Open continuously | 86,400 |
| 5 continuously open tabs/users | 432,000 |
| 10 continuously open tabs/users | 864,000 |
| 50 continuously open tabs/users | 4,320,000 |

This does not include page navigation, automatic Next.js link prefetches, server-component refreshes, report rendering, or other API requests.

## Resource Categories

### Edge Requests

Requests reaching Vercel include:

- Portal page and React Server Component requests.
- The 30-second ticker status poll.
- Next.js route prefetch requests.
- Static assets, JavaScript chunks, images, and fonts.
- API requests under `/api/*`.
- Report PDF view and download requests.

Static marketing-page assets are normal Edge traffic. The unusually high volume is more likely caused by recurring status polling, dynamic route prefetching, and server-component refreshes.

### Function Invocations

The following invoke Vercel server functions:

- Every call to `/api/ticker-data-status/{ticker}`.
- Every other route under `app/api`.
- Dynamic monitor pages and layouts.
- React Server Component refreshes triggered by `router.refresh()`.
- Runtime PDF/PPTX generation.

### Fluid Active CPU

The main CPU contributors are:

- Parsing S3 bucket-listing XML and building file indexes.
- Hashing file metadata to generate version values.
- Repeating status calculations for every portal page.
- Fetching and parsing individual social-media JSON objects.
- Server-rendering portal pages and processing large datasets.
- Launching Chromium and rendering PDFs.
- Creating PDFKit and PowerPoint documents.

## Confirmed High-Cost Paths

### 1. Global 30-Second Status Poll

Severity: **Critical**

Code:

- `components/TickerDataStatusProvider.tsx:19`
- `components/TickerDataStatusProvider.tsx:32-55`

Behavior:

1. Poll immediately when the portal shell mounts.
2. Poll every 30 seconds while the tab is visible.
3. Poll again whenever a hidden tab becomes visible.
4. Use `cache: 'no-store'`, so the browser does not reuse a response.
5. Call `router.refresh()` when any monitored page changes.

The provider wraps the entire authenticated portal in `components/AppShell.tsx`, so it runs on every portal page.

Vercel impact:

- One Edge Request per poll.
- One Function Invocation per poll.
- Active CPU while calculating every page's status.
- Additional dynamic page rendering after `router.refresh()`.

### 2. One Status Request Fans Out Across the Entire Portal

Severity: **Critical**

Code:

- `app/api/ticker-data-status/[ticker]/route.ts:25-87`
- `lib/page-data-sources.ts`

Each status request calculates versions for:

- Dashboard
- Ownership
- Internal Float
- Short Interest
- Lending Pressure
- Squeeze Readiness
- Social Sentiment
- SEC Filings
- Report Archive
- Obsolete Dashboard
- Consolidated Data Sources

The Data Sources entry contains the combined import-file list, so many import-file lookups are repeated after their individual page checks.

The same request also:

- Lists Reddit social objects.
- Lists X social objects.
- Checks Stocktwits data.
- Lists report archive objects.
- Hashes all page status strings.

Although these operations run inside one Function Invocation, they increase duration, outbound requests, memory usage, and Fluid Active CPU.

### 3. S3 Bucket Listing Cache Is Too Short and Process-Local

Severity: **High**

Code:

- `lib/import-data.ts:213-270`
- `lib/import-data.ts:46-47`

The S3 metadata cache is currently controlled by `IMPORT_DATA_CACHE_SECONDS`, with a default of 10 seconds and a minimum of 5 seconds.

Problems:

- The ticker poll runs every 30 seconds, so a 10-second cache is expired before almost every poll.
- The cache exists only in the memory of one warm Vercel function instance.
- Other instances and cold starts do not share it.
- Listing more than 1,000 S3 objects requires multiple paginated S3 requests.

Result:

```text
Visible browser tab
  -> Vercel status function
    -> signed S3 ListObjects request
      -> XML parsing
        -> index creation
```

This repeats even when no data changed.

### 4. Every Monitor Route Uses a Force-Dynamic Layout

Severity: **High**

Code:

- `app/monitor/[ticker]/layout.tsx:5-16`

The ticker layout declares:

```ts
export const dynamic = 'force-dynamic';
```

It also calls `getImportDataVersion()` on every render. That function:

1. Lists all import-data files.
2. Iterates every file.
3. Hashes path and version metadata.

Code:

- `lib/import-data-version.ts:13-54`

Consequences:

- Portal navigation requires server execution.
- React Server Component requests invoke functions.
- `router.refresh()` reruns the layout.
- The layout scans the complete import dataset even when the user only needs one page.

Several child pages are also explicitly force-dynamic:

- Dashboard
- Short Interest
- SEC Filings
- Report Archive

### 5. Next.js Sidebar Links Can Trigger Route Prefetches

Severity: **Medium to High**

Code:

- `components/Sidebar.tsx:269-287`
- `components/Sidebar.tsx:323-344`

Sidebar links use the default `<Link>` prefetch behavior. In production, Next.js may prefetch linked routes before the user clicks them.

There are approximately ten workspace links visible in the sidebar. Because monitor routes are dynamic, prefetch requests can contribute Edge Requests and server work.

This should be verified in Vercel request logs, but it is a plausible source of requests that appear even when users are not actively changing pages.

### 6. Social Sentiment Performs Many S3 Requests per Render

Severity: **High when social history grows**

Code:

- `app/monitor/[ticker]/sentiment/page.tsx:68-85`
- `app/monitor/[ticker]/sentiment/page.tsx:286-315`
- `lib/social-s3-data.ts:91-142`

For Reddit and X, the server:

1. Lists every JSON object under each prefix.
2. Fetches every listed JSON object individually.
3. Parses and normalizes every record.
4. Sorts all records.
5. Filters the selected timeframe afterward.

This is an N+1 data-access pattern:

```text
1 prefix listing + N object downloads per platform
```

The default page range is one year, but the server fetches all available objects before applying the range.

The cache lasts 30 seconds and is process-local, so it is unreliable across Vercel instances.

### 7. Report PDFs Launch Chromium on Every View or Download

Severity: **Critical CPU per request**

Code:

- `app/api/reports/render/[ticker]/[reportDate]/route.ts:1-112`

Each report request:

1. Downloads report JSON from S3 without caching.
2. Starts a temporary HTTP server.
3. Launches headless Chromium.
4. Creates a browser page.
5. Waits for network idle and report readiness.
6. Generates a PDF.
7. Closes Chromium.

The route permits up to 60 seconds and returns:

```text
Cache-Control: no-store
```

Viewing and downloading the same report are separate full renders. No generated PDF is reused.

`Download All` opens each report separately:

- `app/monitor/[ticker]/reports/ReportArchiveCenter.tsx:145-150`

This can launch multiple Chromium function invocations within milliseconds.

Additional runtime export routes use PDFKit and PptxGenJS:

- `/api/reports/export/pdf`
- `/api/reports/export/pptx`

### 8. Report and Social Listings Are Repeated in Multiple Places

Severity: **Medium**

Report archive listing occurs in:

- Global ticker status polling.
- Report Archive server-page rendering.
- `/api/reports/archive-status/[ticker]`.
- Data Sources and connector inventory.

Social prefix listing occurs in:

- Global ticker status polling.
- `/api/social-data-status`.
- Social Sentiment server-page rendering.
- Data Sources and connector inventory.

These paths do not share a durable cache.

### 9. Most API Routes Are Public and Have No Rate Limit

Severity: **Critical exposure risk**

Only the new Internal Float workspace route performs an authorization check.

The following expensive or mutating routes currently have no authentication in their route implementation:

- `/api/ticker-data-status/[ticker]`
- `/api/import-data-version`
- `/api/social-data-status`
- `/api/reports/render/[ticker]/[reportDate]`
- `/api/reports/export/pdf`
- `/api/reports/export/pptx`
- Operations upload routes
- Email routes
- Report generation routes

There is no `middleware.ts` protecting these routes and no application rate limiter.

Anyone or any crawler that discovers these URLs can create Vercel invocations. The Chromium report route is especially risky because one unauthenticated request creates substantial CPU work.

Client-side `AuthGuard` protects the visible portal UI but does not protect server API endpoints.

### 10. Operations and File-Processing Routes

Severity: **Low under normal use; high if automated or abused**

Operations routes parse uploaded CSV files, transform records, and write JSON to S3:

- `/api/operations/narrative-social`
- `/api/operations/sec-filings`
- `/api/operations/dashboard-margin`

These should be infrequent human actions. Without server-side authentication and rate limiting, however, they remain an avoidable invocation and abuse risk.

### 11. Internal Float Shared Workspace Route

Severity: **Low**

Route:

- `/api/internal-float-workspace/[ticker]`

It runs once when Internal Float loads and when a user saves. It also calls the existing API Gateway to validate ticker access, then reads or writes one S3 JSON file.

This is not recurring polling and is unlikely to be a major resource consumer.

## Why Current Caching Does Not Prevent the Cost

The application frequently uses:

```ts
cache: 'no-store'
Cache-Control: no-store
dynamic = 'force-dynamic'
```

The custom S3 caches are module-level JavaScript maps. These help only when requests reach the same warm function instance before the short expiration time.

Vercel can create multiple instances, recycle instances, and cold-start new instances. Therefore, process memory is not a shared application cache.

The 30-second poll interval is also longer than the default 10-second import-data cache, guaranteeing frequent cache expiration.

## Estimated Priority by Resource

| Code path | Edge Requests | Function Invocations | Fluid CPU | Priority |
|---|---:|---:|---:|---|
| 30-second ticker polling | Very high | Very high | High | P0 |
| Ticker status fan-out | N/A beyond poll | Included in poll | High | P0 |
| Unauthenticated report renderer | Usage-dependent | Usage-dependent | Very high/request | P0 |
| Force-dynamic ticker layout | High | High | Medium/high | P1 |
| Social object-per-record loading | Medium | Medium | High/render | P1 |
| Sidebar route prefetch | Potentially high | Potentially high | Medium | P1 |
| Report/social duplicate listings | Medium | Medium | Medium | P2 |
| Operations upload routes | Low normally | Low normally | Medium/request | P2 |
| Internal Float workspace API | Low | Low | Low/medium | P3 |

## Recommended Remediation Order

### P0: Replace the Global Polling Design

Recommended:

1. Generate one lightweight status manifest per ticker when backend data changes:

   ```text
   status/CURR.json
   ```

2. Include page versions and timestamps in that manifest.
3. Serve it as a cacheable S3/CDN object or cacheable Vercel response.
4. Poll every 5-15 minutes, or poll only on focus/manual refresh.
5. Later replace polling with an update event or notification service.

Changing from 30 seconds to 5 minutes reduces scheduled status calls by 90%:

```text
86,400 -> 8,640 per continuously open tab/month
```

Changing to 15 minutes reduces them by approximately 96.7%:

```text
86,400 -> 2,880 per continuously open tab/month
```

### P0: Protect and Rate-Limit API Routes

Add server-side authentication to all portal and operations APIs.

At minimum:

- Validate the Cognito token or forward it to the authenticated API Gateway.
- Confirm ticker access.
- Add rate limits to status and rendering routes.
- Block anonymous report rendering.

### P0: Cache Rendered Reports

Recommended flow:

1. User requests a report.
2. Check for an existing PDF in S3 using ticker, date, template version, and data version.
3. Return the existing PDF if present.
4. Render only on a cache miss.
5. Save the generated PDF to S3.

Viewing and downloading should use the same cached PDF.

### P1: Remove Bucket-Wide Work from the Ticker Layout

Remove `getImportDataVersion()` from the force-dynamic shared layout.

The layout should receive a lightweight ticker/company record. Page-specific data versions should come from the status manifest.

Where practical:

- Remove `force-dynamic` from the shared layout.
- Use `revalidate` intervals for read-only data.
- Cache normalized page datasets by ticker and source version.

### P1: Disable Unnecessary Link Prefetch

Use:

```tsx
<Link prefetch={false} ... />
```

for sidebar links to heavy dynamic pages.

Users already receive page-specific loading placeholders, so disabling prefetch should not make navigation feel unresponsive.

### P1: Consolidate Social Data

Backend should generate compact platform datasets, for example:

```text
social-data/CURR/reddit_1y.json
social-data/CURR/x_1y.json
social-data/CURR/stocktwits_1y.json
```

or one daily consolidated file.

The portal should fetch one object per platform, not one object per mention.

### P2: Remove Duplicate Status Endpoints

Use one status source instead of maintaining:

- Ticker status
- Import-data version
- Social-data status
- Report archive status

If specialized endpoints remain, they should read the generated status manifest rather than listing S3 independently.

### P2: Increase Durable Caching

Increasing `IMPORT_DATA_CACHE_SECONDS` alone is not sufficient, but it can reduce repeated work after the larger changes.

Use:

- Vercel cache/revalidation for server responses.
- S3/CloudFront cache headers for immutable or versioned data.
- A durable key-value cache if second-level freshness is required.

## What to Check in Vercel

Use Vercel usage and function logs to group requests by path.

Expected high-volume paths:

```text
/api/ticker-data-status/CURR
/monitor/CURR/*
/_next/*
```

Expected high-CPU paths:

```text
/api/reports/render/CURR/*
/api/reports/export/pdf
/api/reports/export/pptx
/monitor/CURR/sentiment
/api/ticker-data-status/CURR
```

Check:

- Invocation count by route.
- Average and p95 duration.
- Fluid Active CPU by route.
- Number of cold starts.
- Requests by user agent and IP.
- Repeated requests from inactive users or crawlers.
- Whether Next.js prefetch requests appear before navigation.

## Audit Limitations

This report is based on the repository code and request behavior observed locally. It does not include the Vercel usage export, route-level production logs, traffic volume, crawler traffic, or exact CPU allocation.

Therefore:

- The identified code paths are confirmed.
- The invocation estimates are deterministic from the 30-second timer.
- Exact percentages of last month's Vercel bill require Vercel route-level usage data.

## Recommended First Implementation

The highest-value first change is:

1. Stop the 30-second all-page status function.
2. Introduce one lightweight ticker status manifest.
3. Poll it every 5 minutes.
4. Disable sidebar prefetch for dynamic routes.
5. Require authentication for report rendering.
6. Cache generated PDFs.

Those changes address all three exceeded metrics: Edge Requests, Function Invocations, and Fluid Active CPU.
