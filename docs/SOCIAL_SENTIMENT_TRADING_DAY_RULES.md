# Social Sentiment Trading-Day Rules

## Purpose

Social sentiment is grouped by the U.S. trading day the mention relates to,
not by the calendar date on which the post appears in a user's timezone. The
same assignment must drive Timeline bars, sentiment breakdowns, platform
counts, and Social Feed filtering.

## Authoritative assignment

- The backend-assigned `tradeDate` / `/social-data?date=YYYY-MM-DD` partition is
  authoritative. The portal must not recalculate it from the displayed post
  timestamp.
- Trading-day assignment uses the official U.S. market calendar and
  `America/New_York`, including daylight-saving changes and market holidays.
- A new trading day begins at the regular session open, 9:30:00 a.m. New York
  time. A post at exactly 9:30:00 belongs to the new trading day.
- A pre-market post belongs to the most recent preceding trading day.
- After-hours and overnight posts remain assigned to the current trading day
  until the next trading session opens.
- Weekend and market-holiday posts remain assigned to the most recent trading
  day. An early market close does not end the assignment window; it continues
  until the next trading session opens.
- Late-arriving or backfilled data is assigned from the original source posting
  time, not ingestion time. Its `tradeDate` remains stable unless the source
  timestamp itself is corrected.

## Examples

| Posted time (New York) | Assigned trading day |
|---|---|
| Tue Jul 14, 2026, 9:29:59 a.m. | Mon Jul 13, 2026 |
| Tue Jul 14, 2026, 9:30:00 a.m. | Tue Jul 14, 2026 |
| Fri after-hours | Friday |
| Saturday or Sunday | Previous Friday |
| Monday before 9:30 a.m. | Previous Friday |
| Market holiday | Most recent preceding trading day |

## Portal behavior

- Chart labels and tooltips identify values as trading-day mentions.
- Feed From/To controls select trading days, not posting dates.
- Clicking a Timeline bar requests the exact trading day or trading-day period
  represented by that backend bucket.
- Feed cards show both the immutable assigned trading day and the original post
  timestamp. Portal timezone settings may change the displayed post time but
  never the assigned trading day.
- Newest/oldest feed sorting uses the original post timestamp.
- Bullish, neutral, and bearish event fallback counts use `tradeDate` for daily
  and longer buckets; hourly buckets remain ordered by the source timestamp
  within the selected trading day.
- Weekend and holiday inputs are rejected as filter boundaries because they are
  not trading days.
- The default feed window is the latest five trading days. “See earlier trading
  days” extends the range by five preceding trading days.

## Data consistency invariants

- `sentiment-current`, `sentiment-events`, and `/social-data` must retain a
  stable mention identity and the same backend-assigned trading day.
- Raw-feed deduplication must not alter the authoritative Timeline total.
- If raw source retention is incomplete, the portal may show fewer source posts
  than consolidated mentions, but it must not move posts into a different
  trading day to force the totals to match.
