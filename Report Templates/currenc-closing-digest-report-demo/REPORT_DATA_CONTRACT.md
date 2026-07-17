# Daily Market Close Report Data Contract

The active report template reads one replaceable file:

```text
report-data.json
```

The backend must generate this file after the reporting cutoff. The renderer formats supplied values and draws SVG charts only. It must not calculate risk scores, changes, thresholds, alerts, or AI conclusions.

## Scope

The daily report is designed to answer five management questions:

1. What changed in the market today?
2. Did short and lending pressure strengthen or ease?
3. Did market perception or discussion materially change?
4. Were there new filings or corporate events?
5. What should management monitor before the next session?

Routine quarterly ownership tables and private internal-float details are excluded. A material ownership or strategic-float event may appear in `catalysts.materialEvents` only when a new event occurred during the report window.

## Required Top-Level Shape

```json
{
  "reportVersion": "post-market-daily-close-v2",
  "sampleMode": false,
  "company": "Currenc Group Inc.",
  "ticker": "CURR",
  "reportDate": "Jul 17, 2026",
  "generatedAt": "Jul 17, 2026, 7:05 PM ET",
  "status": "Moderate Closing Risk",
  "dataCoverage": {},
  "executiveKpis": [],
  "topDailyAlerts": [],
  "market": {},
  "shortLending": {},
  "sentiment": {},
  "catalysts": {},
  "nextSession": {},
  "llmSections": {},
  "legalDisclaimers": {}
}
```

## Display Values

All KPI values and deltas are preformatted by backend:

```json
{
  "label": "Borrow Fee",
  "value": "29.14%",
  "delta": "-1.83 pts vs prior close",
  "tone": "positive"
}
```

Supported `tone` values are `positive`, `negative`, `warning`, or an empty string. Tone describes management significance, not merely whether a mathematical change is positive.

Missing data must display as `N/A`, `Pending`, or another explicit status. Never substitute zero or carry forward a stale value without a backend-provided as-of date.

## Data Coverage

```json
{
  "label": "Complete",
  "items": [
    { "label": "Closing market data", "status": "complete", "display": "AVAILABLE" },
    { "label": "Short and lending data", "status": "complete", "display": "AVAILABLE" },
    { "label": "Social sentiment data", "status": "pending", "display": "PARTIAL" },
    { "label": "Filings and events", "status": "complete", "display": "AVAILABLE" }
  ]
}
```

This section is operational metadata. Backend should determine readiness from exact-date data availability, not from the presence of a prior value.

## Executive Close

`executiveKpis` should contain six items in this order:

1. Close Price
2. Borrow Fee
3. Shortable Shares
4. Utilization
5. Days to Cover
6. SI / Float

`topDailyAlerts` contains the three most material deterministic changes:

```json
{
  "id": "borrow_fee_increase",
  "title": "Borrow cost increased",
  "text": "Borrow fee closed at 29.14%, up 3.20 pts from the prior close.",
  "severity": "high"
}
```

Alerts must be generated and ranked by auditable rules in `DAILY_REPORT_RULES.md`.

## Market Performance

```json
{
  "market": {
    "kpis": [],
    "priceChart": {},
    "volumeChart": {},
    "context": [
      { "label": "Prior Close", "value": "$3.02", "note": "Previous session" },
      { "label": "Intraday Range", "value": "$2.95 - $3.14", "note": "Low - high" },
      { "label": "Volume vs 20D", "value": "+18.4%", "note": "Above average" },
      { "label": "Short Volume Ratio", "value": "41.2%", "note": "Reported venues" }
    ]
  }
}
```

Recommended market KPIs are Close Price, Daily Return, Trade Volume, and Short Volume %. Price, volume, high, low, previous close, and volume baseline may remain explicit placeholders until the feeds are available.

## Short and Lending

```json
{
  "shortLending": {
    "posture": "Moderate Pressure",
    "kpis": [],
    "borrowFeeChart": {},
    "shortableSharesChart": {},
    "utilizationChart": {},
    "daysToCoverChart": {},
    "operatingMetrics": [
      { "label": "Average Duration", "value": "169.9d", "delta": "+4.2d" },
      { "label": "Initial Margin", "value": "150.00%", "delta": "Unchanged" },
      { "label": "Maintenance Margin", "value": "140.00%", "delta": "Unchanged" }
    ]
  }
}
```

Short and lending KPIs should contain Short Interest, SI / Float, Borrow Fee, Shortable Shares, Utilization, and Days to Cover. Backend must keep the as-of date for each source internally and publish the report only under the agreed readiness rule.

## Chart Schema

```json
{
  "id": "borrowFee",
  "title": "Borrow Fee Trend",
  "subtitle": "Daily borrow cost",
  "color": "#cf3e4f",
  "unit": "percent",
  "minValid": 0,
  "maxValid": 500,
  "dates": ["2026-07-15", "2026-07-16", "2026-07-17"],
  "values": [31.2, 30.4, 29.14],
  "latestDisplay": "29.14%"
}
```

Supported units are `money`, `percent`, `shares`, `volume`, `days`, and `number`.

- Minimum useful history: 20 trading days
- Preferred history: 60 trading days
- Maximum rendered: latest 60 valid points
- Missing observations: use `null`; do not convert to zero
- `dates[index]` and `values[index]` must describe the same observation
- Optional `minValid` and `maxValid` bounds prevent known invalid source values from being rendered as market moves. Backend should still clean and log rejected observations.

## Sentiment

```json
{
  "sentiment": {
    "mentions": 104,
    "mentionsDisplay": "104",
    "mentionsDelta": "+18 vs prior 24h",
    "distribution": {
      "scoreDisplay": "64",
      "label": "Bullish",
      "bullishPercent": 33,
      "neutralPercent": 63,
      "bearishPercent": 4
    },
    "platforms": [
      { "name": "X", "mentions": 51, "mentionsDisplay": "51", "sharePercent": 49, "sentimentLabel": "Bullish" }
    ],
    "trendChart": {}
  }
}
```

Use the same sentiment method as the portal: Positive = 100, Neutral = 50, Negative = 0, then average all records in the report window. Platform contribution is platform mentions divided by total mentions.

## Catalysts

```json
{
  "catalysts": {
    "secFilings": [
      { "date": "17 Jul 2026", "formType": "6-K", "title": "Report of foreign issuer" }
    ],
    "materialEvents": [
      { "id": "new_filing", "title": "New 6-K filing", "text": "Filed after market close.", "severity": "high" }
    ]
  }
}
```

Show no more than four filings. `materialEvents` may include same-day SEC filings, press releases, confirmed corporate events, ownership changes, or internal-float changes. Do not include unchanged periodic datasets.

## Next Session

```json
{
  "nextSession": {
    "riskLevel": "Moderate",
    "thresholdWatch": [],
    "scheduledEvents": []
  }
}
```

Threshold watch items are deterministic and must contain an observable metric and level. Scheduled events must be known events, not AI predictions.

## AI Sections

Every AI section follows the same contract:

```json
{
  "status": "pending",
  "placeholder": "Instruction describing the analysis that will be generated."
}
```

When ready:

```json
{
  "status": "ready",
  "text": "Approved generated analysis."
}
```

Required fields:

| Field | Purpose | Recommended length |
|---|---|---:|
| `executiveSummary` | Closing posture, dominant driver, what changed, next-session implication | 70-110 words |
| `marketCloseAnalysis` | Price, volume, liquidity, and close-quality interpretation | 55-90 words |
| `shortLendingAnalysis` | Combined short interest, borrow, availability, utilization, duration, margin, and covering-risk analysis | 70-110 words |
| `narrativeCatalystAnalysis` | Social narratives, sentiment direction, filings, verified events, and speculation separation | 65-100 words |
| `nextSessionOutlook` | Conditions that strengthen or weaken risk before the next session | 60-90 words |
| `managementActionQueue` | Role-specific actions for management, IR, legal/compliance, and capital markets | 70-110 words |

AI output requirements:

- State uncertainty and missing inputs.
- Distinguish verified events from social speculation.
- Cite report metrics or event titles in the prose.
- Do not invent price targets, trades, filings, counterparties, or causal claims.
- Do not expose vendor names, internal endpoints, storage paths, or credentials.
- Backend must log model version, prompt version, source-data version, generation time, and approval status.

The proposed AI fields are also listed in `report-ai-data-points.csv` for addition to the central data-point inventory.

## Legal Fields

```json
{
  "legalDisclaimers": {
    "footer": "Approved short disclaimer shown on every page.",
    "full": "Approved full disclaimer shown on the final page."
  }
}
```

The live portal must inject approved copy from the legal disclaimer module. AI must never write or modify legal copy.

## Source Disclosure

Rendered content may use generic wording such as market data, short interest data, borrow market data, filing data, and social data. Do not render provider names, API paths, object-storage paths, access keys, or internal identifiers.
