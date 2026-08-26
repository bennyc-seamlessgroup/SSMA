# Lean Daily Market Close Report Data Contract

## Purpose

Lean V1 renders only fields supported by currently implemented APIs. Missing sections are omitted rather than displayed as placeholders.

## Top-Level Shape

```json
{
  "reportVersion": "post-market-daily-close-lean-v1",
  "sampleMode": false,
  "company": "CURRENC Group Inc.",
  "ticker": "CURR",
  "reportDate": "Jul 21, 2026",
  "generatedAt": "Jul 21, 2026, 7:05 PM ET",
  "status": "Moderate Lending Pressure",
  "legalDisclaimers": {},
  "tradingSnapshot": {},
  "snapshotKpis": [],
  "shortInterestScore": {},
  "shortLending": {},
  "sentiment": {},
  "secFilings": []
}
```

## Snapshot KPIs

`snapshotKpis` supports these currently available values:

1. Short Interest %
2. Borrow Fee
3. Initial Margin
4. Maintenance Margin
5. Shortable Shares
6. Utilization
7. Average Duration
8. Days to Cover

Each item is already formatted by the backend:

```json
{
  "label": "Borrow Fee",
  "value": "29.15%",
  "changeValue": "-2.05 pts",
  "changePercent": "-6.57%",
  "tone": "positive"
}
```

Both changes compare with the immediately preceding trading-day record. Supported tones are `positive`, `negative`, `warning`, or an empty string.

## Short Interest Score and AI Analysis

The score is the same consolidated `shortScore` displayed on the Short Interest page. The AI text must come from `GET /market-data/ai-report?ticker={ticker}` field `short_interest_current_interpretation`:

```json
{
  "score": 78,
  "scoreDisplay": "78",
  "level": "High",
  "tone": "high",
  "changeDisplay": "+2 (+2.63%)",
  "deltaTone": "negative",
  "summary": "Elevated short-side pressure may increase squeeze sensitivity.",
  "ranges": [],
  "aiAnalysis": "**Current Interpretation**\n\nDaily AI interpretation text."
}
```

At browser-render time, `aiAnalysis` is overlaid from the authenticated dated
`GET /market-data/ai-report?ticker={ticker}&date={YYYY-MM-DD}` response. The
frontend ignores any AI text embedded in the shared report payload so
user-specific analysis cannot be persisted in or inherited from that shared
file. When the separate AI response is unavailable, the report displays the
standard unavailable message and continues rendering the remaining sections.

Use the same score ranges as the portal: `0-39 Low`, `40-64 Moderate`, `65-80 High`, and `>80 Extreme`. Short Score has no upper limit. Do not generate or split the AI text in the frontend.

## Short and Lending

```json
{
  "shortLending": {
    "posture": "Moderate Lending Pressure",
    "shortVolumeChart": {},
    "borrowFeeChart": {},
    "shortableSharesChart": {},
    "ftdChart": {},
    "utilizationChart": {},
    "daysToCoverChart": {}
  }
}
```

Each chart uses aligned date and value arrays:

```json
{
  "id": "borrowFee",
  "title": "Borrow Fee Trend",
  "subtitle": "Daily borrow cost",
  "color": "#cf3e4f",
  "unit": "percent",
  "minValid": 0,
  "maxValid": 500,
  "dates": ["2026-07-18", "2026-07-21"],
  "values": [31.2, 29.15],
  "latestDisplay": "29.15%"
}
```

- Use `null` for missing observations.
- Do not convert missing values to zero.
- `dates[index]` and `values[index]` must represent the same observation.
- Every chart must contain only the latest seven valid daily observations.
- `shortVolumeChart` uses `totalShortVolumeReported` from
  `GET /market-data/history?category=short-volume-history`.
- `ftdChart` uses `shares` and `tradeDate` from
  `GET /market-data/history?category=ftd-history`.

## Sentiment

```json
{
  "sentiment": {
    "available": true,
    "overallAvailable": true,
    "distributionAvailable": true,
    "platformsAvailable": true,
    "window": "7D",
    "windowStart": "2026-06-06T00:00:00-04:00",
    "windowEnd": "2026-06-13T00:00:00-04:00",
    "mentions": 104,
    "mentionsDisplay": "104",
    "overall": {
      "score": 64,
      "scoreDisplay": "64",
      "label": "Bullish",
      "changeDisplay": "+5",
      "deltaTone": "positive"
    },
    "distribution": {
      "scoreDisplay": "64",
      "label": "Bullish",
      "bullishPercent": 33,
      "neutralPercent": 62,
      "bearishPercent": 5
    },
    "platforms": [
      {
        "name": "X",
        "mentions": 48,
        "mentionsDisplay": "48",
        "sharePercent": 46.2,
        "sentimentLabel": "Bullish"
      }
    ]
  }
}
```

All sentiment fields must represent the previous seven-day window ending on the report date. Percentages should total approximately 100 after rounding. Platform mentions should reconcile to total mentions. The platform array must always include Reddit, X, Facebook, LinkedIn, and Stocktwits; unavailable platforms use zero mentions, zero share, and `No data` sentiment. `previousScore` and `changeDisplay`, when supplied, compare this window with the immediately preceding seven-day window.

The rendered observation-period label is an inclusive seven-calendar-day
range anchored to the immutable report date. Its displayed end is the report
date and its displayed start is six calendar days earlier. For report date
`2026-08-25`, the label must be `Aug 19, 2026 – Aug 25, 2026`; an upstream
legacy boundary such as Aug 20–25 must not be presented as a 7D range.

The archive PDF normalizer also accepts the same seven-day aggregate under
`sentimentSnapshot`, or under `sentimentSnapshot.periods.7D` /
`sentimentSnapshot.periods.1W`. A populated `timeline` or `records` array may
supply dated daily buckets. These input variants are normalized into the shape
above before rendering; they must still belong to the dated
`GET /market-data/reports?ticker={ticker}&date={date}` response. Report
generation must not request or substitute `sentiment-current`. When more than
one dated seven-day candidate exists, the normalizer first requires the window
to match the report date, then prefers the candidate with populated mentions
and a score. Candidate ranking uses an explicitly supplied aggregate mention
count when present; nested timeline mentions must not make an explicit
zero-mention aggregate outrank a populated direct aggregate. A structurally
complete zero-value legacy object must not outrank a populated candidate. When
a populated seven-day aggregate exists on the
sentiment root alongside an older `periods.7D` / `periods.1W` object, both must
be retained as candidates; the nested object must not cause the root aggregate
to be discarded before ranking. Sentiment-keyed containers may appear under a
dated report wrapper; candidate discovery must traverse those report-owned
containers instead of assuming only top-level `sentiment` or `data.sentiment`.
Overall sentiment, distribution, and platform breakdown have independent
availability flags so valid dated data remains visible when a different
subsection is absent. If no dated subsection is usable, the report renders
`Sentiment data unavailable for this report.` instead of live sentiment.

The three subsections may be supplied by separate explicit, date-matched 7D
objects inside the same dated report response. Overall uses the strongest
populated aggregate (`mentions`, `overall`); Distribution uses the strongest
populated `distribution`; and Platform Breakdown uses the strongest populated
`platforms` / `platformBreakdown`. JSON-encoded report-owned sentiment objects
are parsed before candidate selection. This is subsection mapping within one
dated report payload, not cross-date or live-API composition.

## SEC Filings

```json
{
  "date": "21 Jul 2026",
  "formType": "6-K",
  "title": "Report of foreign issuer"
}
```

Return filings newest first. The renderer shows at most five records.

## Excluded From Lean V1

- Report readiness and missing-data scoring
- Market context and liquidity analysis
- Price and trade-volume pages
- Material-event monitor
- Rule-generated alerts and next-session watchlists
- Scheduled-event forecasts
- AI sections other than the implemented Short Interest `short_interest_current_interpretation`
- Routine ownership breakdowns and internal-float details

These remain available in the archived comprehensive v2 specification for possible future restoration.
