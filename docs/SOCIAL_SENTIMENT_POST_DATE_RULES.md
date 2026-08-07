# Social Sentiment Post-Date Rules

## Purpose

Social sentiment is grouped by each feed's actual posting date, not by a U.S.
market session or an assigned trading day. The same date meaning must drive
Timeline bars, event fallback buckets, and date filtering.

## Canonical post date

- Prefer an explicit backend actual-date field (`postDate`, `post_date`,
  `actualDate`, `actual_date`, `publishedDate`, or `published_date`).
- Otherwise derive `postDate` from the normalized source `datetime` timestamp
  in UTC.
- Never derive `postDate` from `tradeDate`, `targetDate`,
  `calculatedTargetDate`, `bucketStart`, or an S3 folder date.
- The portal timezone changes the displayed posting time only. It does not move
  a record into a different post-date container.
- Weekend and market-holiday posts remain on their actual calendar date.

## Portal behavior

- The Timeline title, tooltip, and date filters identify values as post dates.
- From/To controls accept every calendar date, including weekends and holidays.
- The default feed window contains the latest seven calendar dates, inclusive,
  ending on today in the timezone selected in General Settings.
- Switching platforms keeps that selected range. It must not silently jump to
  an older period when the selected platform has no posts in the current range.
- “See previous 7 days” extends the start date by seven earlier calendar days.
- Clicking a Timeline bar requests the exact UTC calendar date or date period
  represented by that bucket.
- Newest is the default time ordering. Oldest is intentionally unavailable
  because the loaded date window is not the platform's complete archive.
- Engagement, follower, and like sorts apply only to the currently loaded date
  range.
- Feed timestamps continue to use the timezone selected in General Settings.
- Feed cards show only that full timezone-aware timestamp. They do not repeat a
  separate UTC post-date badge, which could appear to contradict the displayed
  local date near midnight UTC.

## Data-source invariants

- Timeline totals and platform counts remain authoritative from
  `sentiment-current` for the selected 1D/1W/1M/6M/1Y range.
- `sentiment-events` is used only as a fallback for bucket-level sentiment
  breakdowns where the current response lacks them.
- `/social-data` supplies the visible feed cards and does not resize the
  consolidated Timeline totals.
- Raw-feed deduplication must not alter authoritative consolidated totals.
- A date-scoped `/social-data` response is authoritative for feed membership.
  The frontend deduplicates repeated record identities but does not reject a
  returned record by deriving a second calendar date from its UTC timestamp.

## Backend contract dependency

`docs/INTEGRATION (7).md` currently says the `date` query may match a post date,
S3 target-bucket date, or calculated target date. The frontend now trusts the
backend's date-scoped result as requested. The document should be updated to
state the backend team's current actual-post-date behavior and should expose an
explicit canonical post-date field alongside `datetime`.
