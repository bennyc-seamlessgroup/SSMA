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

Use the same score ranges as the portal: `0-39 Low`, `40-64 Moderate`, `65-79 High`, and `80-100 Extreme`. Do not generate or split the AI text in the frontend.

## Short and Lending

```json
{
  "shortLending": {
    "posture": "Moderate Lending Pressure",
    "borrowFeeChart": {},
    "shortableSharesChart": {},
    "utilizationChart": {},
    "daysToCoverChart": {},
    "signalGuide": []
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

## Sentiment

```json
{
  "sentiment": {
    "window": "1D",
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

All sentiment fields must be filtered to the report's latest 24-hour window. Percentages should total approximately 100 after rounding. Platform mentions should reconcile to total mentions.

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
