# API Speed and Payload Report

**Prepared:** 21 July 2026  
**Portal:** Currenc Intelligence  
**Reference ticker:** `CURR`  
**API base:** `https://3flfpju5k8.execute-api.us-east-1.amazonaws.com/dev`  
**Excluded:** CSV/data-import workflow, including `POST /manual-input/import`

## 1. Executive Summary

This document records the response speed and response size of every read API currently used by the user portal and operations portal. The measurements were collected from an authenticated portal session in Hong Kong through the local Next.js development proxy to the configured AWS API Gateway.

All 28 endpoints completed all five requests successfully. The main findings are:

- `GET /manual-input/utilization`, `/manual-input/manual-availability`, `/manual-input/margins`, and `/manual-input/short-score` are critical latency outliers at **11.6-12.2 seconds median**.
- `GET /social-data?limit=100` is also slow at **6.8 seconds median**.
- The combined market-history response is the largest payload at **498.6 KiB**, but its **990 ms median** is substantially better than the manual-input outliers.
- Category-specific current endpoints generally return in **377-422 ms median** with small payloads.
- Profile and ticker endpoints show cold/variable p95 latency above 1.4 seconds despite small payloads.

The procedure:

- performs only `GET` requests;
- does not create, update, delete, consolidate, or import data;
- runs every endpoint five times;
- reports median and p95 latency;
- measures the UTF-8 byte size of the compact JSON payload after parsing and re-serializing it in the portal;
- identifies failed, empty, slow, and oversized responses.

## 2. Measurement Standard

### Test conditions

| Setting | Standard |
|---|---|
| Environment | Local Next.js development portal proxying the configured AWS API Gateway |
| Authentication | Valid Cognito ID token for a normal portal user; repeat with an operator account for operator-only endpoints |
| Ticker | `CURR` |
| Cache | `cache: no-store` |
| Runs | 5 sequential requests per endpoint |
| Warm-up | First response retained in results; run the suite twice if cold-start behavior must be separated |
| Latency | Time from browser request start until the full response body is received |
| Payload size | UTF-8 byte length after parsing and compact JSON re-serialization; close to raw JSON size but not compressed wire size |
| Statistic | Median and p95 latency |

### Performance targets

| API type | Good | Review | Poor |
|---|---:|---:|---:|
| Small current/profile response | `< 300 ms` | `300-800 ms` | `> 800 ms` |
| Manual-input list | `< 500 ms` | `500-1,000 ms` | `> 1,000 ms` |
| History/social list | `< 800 ms` | `800-1,500 ms` | `> 1,500 ms` |
| Current/profile payload | `< 100 KB` | `100-250 KB` | `> 250 KB` |
| Manual-input list payload | `< 250 KB` | `250-750 KB` | `> 750 KB` |
| History/social payload | `< 1 MB` | `1-3 MB` | `> 3 MB` |

These are initial portal targets, not backend service-level agreements. They should be revised after production traffic is available.

## 3. Authenticated Read API Results

All results below are based on five sequential authenticated requests. Payload is the average compact JSON size across successful runs.

| Endpoint | Median | p95 | Average payload | Successful runs |
|---|---:|---:|---:|---:|
| `GET /profile` | 373 ms | 1,601 ms | 198 B | 5/5 |
| `GET /tickers/CURR` | 368 ms | 1,426 ms | 64 B | 5/5 |
| `GET /tickers/invite` | 419 ms | 493 ms | 809 B | 5/5 |
| `GET /market-data/current?ticker=CURR` | 533 ms | 799 ms | 26,121 B (25.5 KiB) | 5/5 |
| `GET /market-data/current?ticker=CURR&category=company-profile-current` | 377 ms | 838 ms | 319 B | 5/5 |
| `GET /market-data/current?ticker=CURR&category=market-current` | 391 ms | 411 ms | 2,303 B (2.2 KiB) | 5/5 |
| `GET /market-data/current?ticker=CURR&category=ownership-current` | 394 ms | 433 ms | 5,515 B (5.4 KiB) | 5/5 |
| `GET /market-data/current?ticker=CURR&category=internal-float-current` | 398 ms | 614 ms | 6,304 B (6.2 KiB) | 5/5 |
| `GET /market-data/current?ticker=CURR&category=sentiment-current` | 389 ms | 401 ms | 11,566 B (11.3 KiB) | 5/5 |
| `GET /market-data/ai-report?ticker=CURR` | 422 ms | 741 ms | 1,072 B (1.0 KiB) | 5/5 |
| `GET /market-data/history?ticker=CURR` | 990 ms | 1,101 ms | 510,554 B (498.6 KiB) | 5/5 |
| `GET /market-data/history?ticker=CURR&category=market-history` | 492 ms | 608 ms | 172,647 B (168.6 KiB) | 5/5 |
| `GET /market-data/history?ticker=CURR&category=short-volume-history` | 532 ms | 601 ms | 153,375 B (149.8 KiB) | 5/5 |
| `GET /market-data/history?ticker=CURR&category=ftd-history` | 408 ms | 800 ms | 27,239 B (26.6 KiB) | 5/5 |
| `GET /market-data/history?ticker=CURR&category=ownership-history` | 376 ms | 400 ms | 1,026 B (1.0 KiB) | 5/5 |
| `GET /market-data/history?ticker=CURR&category=sentiment-events` | 413 ms | 436 ms | 94,383 B (92.2 KiB) | 5/5 |
| `GET /manual-input/issued-share?ticker=CURR` | 375 ms | 460 ms | 239 B | 5/5 |
| `GET /manual-input/utilization?ticker=CURR` | **12,205 ms** | **12,633 ms** | 103,144 B (100.7 KiB) | 5/5 |
| `GET /manual-input/manual-availability?ticker=CURR` | **11,723 ms** | **12,578 ms** | 112,925 B (110.3 KiB) | 5/5 |
| `GET /manual-input/margins?ticker=CURR` | **11,736 ms** | **12,385 ms** | 161,980 B (158.2 KiB) | 5/5 |
| `GET /manual-input/short-score?ticker=CURR` | **11,600 ms** | **13,327 ms** | 98,820 B (96.5 KiB) | 5/5 |
| `GET /manual-input/sec-filings?ticker=CURR` | 375 ms | 465 ms | 52,947 B (51.7 KiB) | 5/5 |
| `GET /manual-input/internal-float-inputs?ticker=CURR` | 404 ms | 458 ms | 2,137 B (2.1 KiB) | 5/5 |
| `GET /manual-input/management-holdings?ticker=CURR` | 357 ms | 435 ms | 4,453 B (4.3 KiB) | 5/5 |
| `GET /social-data?ticker=CURR&limit=100&page=1` | **6,764 ms** | **8,320 ms** | 78,354 B (76.5 KiB) | 5/5 |
| `GET /social-data?ticker=CURR&limit=1&page=1` | 735 ms | 823 ms | 597 B | 5/5 |
| `GET /social-data/progress?ticker=CURR` | 459 ms | 776 ms | 11 B | 5/5 |
| `GET /hotkeys?ticker=CURR` | 380 ms | 604 ms | 1,097 B (1.1 KiB) | 5/5 |

### Result classification

| Classification | Endpoints | Finding |
|---|---|---|
| Critical latency | Four manual-input history endpoints | 11.6-12.2 second median; must be investigated before production scale |
| High latency | Social feed with 100 records | 6.8 second median; pagination exists but query/backend processing is still slow |
| Review | Combined market history | 990 ms median and 498.6 KiB payload |
| Generally acceptable | Category-specific current/history and small manual inputs | Mostly 357-533 ms median |
| Variable cold response | Profile, ticker and company profile | Small payloads but p95 reaches 838-1,601 ms |

## 4. State-Changing APIs Not Executed

The following APIs are part of the portal but must not be invoked by a read-only performance audit. Testing them requires a dedicated test ticker, disposable records, and cleanup validation.

| API family | Methods | Reason not executed |
|---|---|---|
| `/profile` | `PUT`, `DELETE` | Changes or removes user profile data |
| `/tickers/invite` | `POST` | Changes company access |
| `/manual-input/{category}` | `POST`, `PUT`, `DELETE` | Creates, replaces, or removes operational records |
| `/manual-input/consolidate` | `POST`, `PUT` | Triggers the consolidation pipeline |
| `/social-data` | `POST` | Starts an asynchronous social-data ingestion job |
| `/hotkeys` | `POST`, `DELETE` | Changes notification routing |
| `/rules` | `POST`, `DELETE` | Changes user alert rules |
| `/rule-catalog` | `POST` | Changes the rule catalog |
| `/rule-catalog/user-settings` | `POST` | Changes user rule settings |
| `/rule-engine/check` | `POST` | Executes rule evaluation and may have variable compute cost |
| `/rule-engine/extract-paths` | `POST` | Executes server-side processing |

For mutation performance testing, use a non-production ticker such as `PERFTEST`, assign unique test IDs, record request and response sizes separately, and remove all test data afterward.

## 5. Excluded Data-Import APIs

Per request, this report excludes:

- `POST /manual-input/import`
- CSV template download and CSV replacement workflow
- any payload-size test involving uploaded CSV files

The consolidation endpoint remains listed above because it is also triggered by normal Market Data saves, but it is not executed by this read-only benchmark.

## 6. Authenticated Benchmark Procedure

1. Sign in to the user portal in Chrome.
2. Open Developer Tools and select **Console**.
3. Paste the script below while on a portal page.
4. Run once using a normal user account.
5. Run again using an operator account to capture operator-only endpoints.
6. Copy the generated Markdown rows into Section 3 of this document.
7. Save the browser/network region and exact test time with the results.

The script only issues `GET` requests.

```js
(async () => {
  const baseUrl = 'https://3flfpju5k8.execute-api.us-east-1.amazonaws.com/dev';
  const ticker = 'CURR';
  const runs = 5;
  const idToken = sessionStorage.getItem('id_token');
  if (!idToken) throw new Error('Sign in to the portal before running the benchmark.');

  const endpoints = [
    '/profile',
    `/tickers/${ticker}`,
    '/tickers/invite',
    `/market-data/current?ticker=${ticker}`,
    `/market-data/current?ticker=${ticker}&category=company-profile-current`,
    `/market-data/current?ticker=${ticker}&category=market-current`,
    `/market-data/current?ticker=${ticker}&category=ownership-current`,
    `/market-data/current?ticker=${ticker}&category=internal-float-current`,
    `/market-data/current?ticker=${ticker}&category=sentiment-current`,
    `/market-data/ai-report?ticker=${ticker}`,
    `/market-data/history?ticker=${ticker}`,
    `/market-data/history?ticker=${ticker}&category=market-history`,
    `/market-data/history?ticker=${ticker}&category=short-volume-history`,
    `/market-data/history?ticker=${ticker}&category=ftd-history`,
    `/market-data/history?ticker=${ticker}&category=ownership-history`,
    `/market-data/history?ticker=${ticker}&category=sentiment-events`,
    `/manual-input/issued-share?ticker=${ticker}`,
    `/manual-input/utilization?ticker=${ticker}`,
    `/manual-input/manual-availability?ticker=${ticker}`,
    `/manual-input/margins?ticker=${ticker}`,
    `/manual-input/short-score?ticker=${ticker}`,
    `/manual-input/sec-filings?ticker=${ticker}`,
    `/manual-input/internal-float-inputs?ticker=${ticker}`,
    `/manual-input/management-holdings?ticker=${ticker}`,
    `/social-data?ticker=${ticker}&limit=100&page=1`,
    `/social-data?ticker=${ticker}&limit=1&page=1`,
    `/social-data/progress?ticker=${ticker}`,
    `/hotkeys?ticker=${ticker}`,
  ];

  const percentile = (values, value) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.ceil(value * sorted.length) - 1)];
  };

  const results = [];
  for (const endpoint of endpoints) {
    const samples = [];
    for (let run = 0; run < runs; run += 1) {
      const started = performance.now();
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          cache: 'no-store',
          headers: { Authorization: idToken },
        });
        const body = await response.text();
        samples.push({
          ok: response.ok,
          status: response.status,
          latencyMs: performance.now() - started,
          bytes: new TextEncoder().encode(body).byteLength,
        });
      } catch (error) {
        samples.push({
          ok: false,
          status: 'NETWORK_ERROR',
          latencyMs: performance.now() - started,
          bytes: 0,
          error: String(error),
        });
      }
    }

    const successful = samples.filter(sample => sample.ok);
    const latencies = successful.map(sample => sample.latencyMs);
    const sizes = successful.map(sample => sample.bytes);
    results.push({
      endpoint,
      status: successful.length === runs
        ? 'OK'
        : samples.map(sample => sample.status).join(','),
      successRuns: `${successful.length}/${runs}`,
      medianMs: latencies.length ? Math.round(percentile(latencies, 0.5)) : null,
      p95Ms: latencies.length ? Math.round(percentile(latencies, 0.95)) : null,
      averageBytes: sizes.length
        ? Math.round(sizes.reduce((total, size) => total + size, 0) / sizes.length)
        : null,
    });
  }

  console.table(results);
  console.log([
    '| Endpoint | Runs | Median | p95 | Payload | Status |',
    '|---|---:|---:|---:|---:|---|',
    ...results.map(result =>
      `| \`${result.endpoint}\` | ${result.successRuns} | ${result.medianMs ?? '-'} ms | ${result.p95Ms ?? '-'} ms | ${result.averageBytes ?? '-'} B | ${result.status} |`
    ),
  ].join('\n'));
})();
```

## 7. Interpretation and Recommended Actions

### Highest-risk endpoints

The measured priorities are:

1. `GET /manual-input/utilization?ticker=CURR` at 12,205 ms median.
2. `GET /manual-input/margins?ticker=CURR` at 11,736 ms median.
3. `GET /manual-input/manual-availability?ticker=CURR` at 11,723 ms median.
4. `GET /manual-input/short-score?ticker=CURR` at 11,600 ms median.
5. `GET /social-data?ticker=CURR&limit=100&page=1` at 6,764 ms median.
6. `GET /market-data/history?ticker=CURR` at 990 ms median with the largest payload, 498.6 KiB.

The similar 11-13 second behavior across four manual-input endpoints suggests a shared backend access pattern, timeout/retry path, storage scan, or repeated initialization rather than payload transfer alone. Their payloads are only 96.5-158.2 KiB and do not justify that latency.

### Recommended improvements after measurement

- Investigate the common read path used by utilization, availability, margins, and short-score before frontend optimization; capture Lambda duration, retries, storage calls, and scanned item counts.
- Add server-side pagination and date-range filters to the four growing manual-input history endpoints.
- Add database or object-store indexes keyed by `ticker` and `tradeDate`, and avoid full-prefix scans followed by application-side filtering.
- Confirm that one manual-input request does not synchronously read or consolidate unrelated categories.
- Optimize `/social-data` queries by ticker, platform, timestamp, and pagination cursor; return only fields required by the feed list.
- Add `from`, `to`, `limit`, and cursor parameters to market history where supported.
- Avoid loading combined `/market-data/current` and `/market-data/history` when a page only needs one category.
- Return list summaries separately from full record details.
- Enable Brotli or gzip at API Gateway for JSON responses.
- Add `ETag` and conditional requests for data that has not changed.
- Set category-specific cache policies based on update frequency.
- Keep current snapshots below 100 KB and paginated list responses below 1 MB.
- Record backend processing time in a response header such as `Server-Timing` so network delay can be separated from Lambda/database time.

## 8. Required Follow-up

Repeat the authenticated benchmark:

- after fixing the five slow endpoints, using the same Hong Kong environment for a direct comparison;
- once from the AWS region or a U.S. test location, to separate geographic network latency from backend execution time.
- against the deployed production portal, which calls API Gateway directly instead of using the local Next.js development proxy.

Retain cold and warm measurements separately. The current five-run figures provide a useful baseline, but the test should also be repeated with larger tickers and growing history to identify payload-related scaling limits.
