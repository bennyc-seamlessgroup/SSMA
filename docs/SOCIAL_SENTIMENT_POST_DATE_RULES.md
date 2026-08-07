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

- The Timeline title, tooltip, filters, and feed badges identify values as post
  dates.
- From/To controls accept every calendar date, including weekends and holidays.
- The default feed window contains the latest seven calendar dates, inclusive.
- “See previous 7 days” extends the start date by seven earlier calendar days.
- Clicking a Timeline bar requests the exact UTC calendar date or date period
  represented by that bucket.
- Newest/oldest sorting continues to use the original source timestamp.
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
- Until the backend makes `GET /social-data?date=` strictly post-date-only, the
  frontend defensively retains only records whose canonical `postDate` matches
  the requested date. This prevents legacy target-folder dates from moving or
  duplicating posts.

## Backend contract dependency

`docs/INTEGRATION (7).md` currently says the `date` query may match a post date,
S3 target-bucket date, or calculated target date. The desired final contract is
for this query to match the actual post date only and to return an explicit
canonical post-date field alongside `datetime`.
