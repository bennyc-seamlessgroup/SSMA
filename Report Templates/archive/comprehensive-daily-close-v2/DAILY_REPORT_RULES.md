# Daily Market Close Report Rules

These rules produce deterministic alerts and next-session thresholds. AI may explain the outputs, but it must not decide whether a rule triggered.

## General Rules

- Evaluate exact-date values against the prior valid market session.
- Skip a rule when its required values are missing.
- Never convert missing values to zero.
- Rank alerts by severity, priority, then absolute change percentage.
- Show no more than three `topDailyAlerts`.
- Show no more than four `nextSession.thresholdWatch` items.
- Show no more than four SEC filings and four material events.
- Do not render data-provider names.

Severity order:

```text
critical > high > medium > low > info
```

## Daily Alert Output

```json
{
  "id": "borrow_fee_increase",
  "title": "Borrow cost increased",
  "text": "Borrow fee closed at 29.14%, up 5.20 pts from the prior close.",
  "severity": "high",
  "priority": 80,
  "metric": "borrowFeePercent",
  "currentValue": 29.14,
  "priorValue": 23.94,
  "change": 5.2,
  "changePercent": 21.72
}
```

## Borrow Fee

Trigger when any condition is true:

```text
borrowFeePercent >= 25
borrowFeeChangePts >= 5
borrowFeeChangePercent >= 15
```

Severity:

```text
critical: borrowFeePercent >= 100 OR borrowFeeChangePts >= 15
high: borrowFeePercent >= 50 OR borrowFeeChangePts >= 10 OR changePercent >= 30
medium: otherwise
```

## Shortable Shares

```text
change = currentShortableShares - priorShortableShares
changePercent = change / priorShortableShares * 100
```

Trigger:

```text
change <= -250000 OR changePercent <= -10 OR currentShortableShares < 2500000
```

Severity:

```text
critical: current < 500000 OR changePercent <= -30
high: current < 1000000 OR changePercent <= -20
medium: otherwise
```

## Utilization

```text
changePts = currentUtilizationPercent - priorUtilizationPercent
```

Trigger:

```text
currentUtilizationPercent >= 75 OR changePts >= 5
```

Severity:

```text
critical: utilization >= 95
high: utilization >= 85 OR changePts >= 10
medium: otherwise
```

## Days to Cover

```text
change = currentDaysToCover - priorDaysToCover
changePercent = change / priorDaysToCover * 100
```

Trigger:

```text
currentDaysToCover >= 5 OR changePercent >= 20
```

Severity:

```text
high: currentDaysToCover >= 7 OR changePercent >= 40
medium: otherwise
```

## Short Interest

Trigger when:

```text
shortInterestPercentChangePts >= 0.25
OR shortInterestSharesChangePercent >= 5
```

The report must state the short-interest as-of date because reported short interest may not be daily.

## Price and Volume

Suggested triggers once feeds are available:

```text
absoluteDailyReturnPercent >= 8
tradeVolumeVs20DayAveragePercent >= 50
shortVolumePercent >= 50
```

High severity when an extreme price move and abnormal volume occur together. Price direction alone must not be described as short covering without supporting short/lending evidence.

## Social Sentiment

Use all enabled platforms in the report window.

```text
sentimentScore = average(positive=100, neutral=50, negative=0)
mentionsChangePercent = (currentMentions - priorMentions) / priorMentions * 100
```

Trigger when:

```text
mentionsChangePercent >= 50
OR absoluteSentimentScoreChange >= 15
OR one platform contributes >= 70% of mentions
```

Platform concentration is a context warning, not evidence that the narrative is true.

## SEC Filings and Material Events

Trigger when an event timestamp falls inside the report window.

High-priority form types:

```text
8-K, 10-K, 10-Q, 20-F, 6-K, S-1, S-3, 13D, 13G, Form 4
```

Show title, form, and date only. Long filing text stays in the portal.

Material event categories may include:

- SEC filing
- confirmed press release
- confirmed corporate action
- ownership change
- strategic-float change
- exchange or compliance event

Do not show unchanged quarterly ownership data as a daily event.

## Next-Session Thresholds

Borrow fee:

```text
watchLevel = currentBorrowFee + max(5, currentBorrowFee * 0.10)
```

Shortable shares:

```text
watchLevel = max(0, currentShortableShares * 0.85)
```

Utilization:

```text
watchLevel = min(100, currentUtilization + 5)
```

Days to cover:

```text
watchLevel = currentDaysToCover + max(0.5, currentDaysToCover * 0.10)
```

Select the four thresholds with the highest current proximity and management relevance.

## AI Handoff

The backend should pass these rule outputs to the AI pipeline:

- exact-date current and prior values
- calculated changes
- triggered alerts and severities
- missing-data list
- filings and verified material events
- social sentiment distribution and platform contribution
- next-session watch thresholds

The AI may summarize and prioritize. It may not alter triggered states, thresholds, source values, or approved legal copy.
