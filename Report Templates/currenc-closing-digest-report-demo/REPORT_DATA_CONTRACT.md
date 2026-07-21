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
  "riskSignals": [],
  "dataAsOf": [],
  "shortLending": {},
  "sentiment": {},
  "secFilings": []
}
```

## Snapshot KPIs

`snapshotKpis` supports these currently available values:

1. Short Interest
2. SI / Float
3. Borrow Fee
4. Shortable Shares
5. Utilization
6. Days to Cover
7. Short Score

Each item is already formatted by the backend:

```json
{
  "label": "Borrow Fee",
  "value": "29.15%",
  "delta": "Daily borrow cost",
  "tone": "warning"
}
```

Supported tones are `positive`, `negative`, `warning`, or an empty string.

## Risk Signals

`riskSignals` contains backend-provided classifications without frontend scoring:

```json
{
  "label": "Utilization risk",
  "value": "Moderate",
  "tone": "warning"
}
```

Expected signals are short-interest risk, borrow-fee risk, availability risk, utilization risk, and lending-pressure risk.

## Data Timestamps

`dataAsOf` gives human-readable timing for the data shown in the report:

```json
{ "label": "Short interest", "value": "21 Jul 2026" }
```

Do not expose vendor names, internal object paths, or API implementation details.

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
- Maximum rendered history is the latest 60 valid observations.

## Sentiment

```json
{
  "sentiment": {
    "mentions": 104,
    "mentionsDisplay": "104",
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

Percentages should total approximately 100 after rounding. Platform mentions should reconcile to total mentions.

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
- AI executive, market, narrative, catalyst, and management sections
- Routine ownership breakdowns and internal-float details

These remain available in the archived comprehensive v2 specification for possible future restoration.
