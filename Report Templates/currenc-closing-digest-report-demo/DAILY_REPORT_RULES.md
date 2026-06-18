# Daily Close Report Rules

This document defines deterministic backend rules for the daily close report.

LLM may rewrite text for readability later, but the trigger logic should stay rule-based, auditable, and reproducible.

## General Selection Rules

- Generate candidate alerts from the latest daily close values and comparison values.
- Rank by `severity`, then by `priority`, then by absolute percentage change.
- Show only the top 3 daily alerts in the PDF.
- Show only the top 4 management watch items.
- Show only the top 4 tomorrow watchlist items.
- Do not show data-provider names in user-facing text.
- If a value is missing, skip that rule instead of displaying `N/A` as an alert.

Severity order:

1. `critical`
2. `high`
3. `medium`
4. `low`

Recommended output shape:

```json
{
  "id": "borrow_fee_high",
  "section": "top_daily_alerts",
  "severity": "high",
  "priority": 20,
  "metric": "borrowFee",
  "value": 31.2,
  "comparisonValue": 30.4,
  "change": 0.8,
  "changePercent": 2.63,
  "displayText": "Borrow fee closed at 31.20%, up 0.80 pts from the prior close."
}
```

## Top Daily Alerts

Top Daily Alerts should answer: **What changed today that management should notice immediately?**

### Rule A1: Borrow Fee High

Trigger:

```text
borrowFee >= 50
```

Severity:

```text
critical if borrowFee >= 100
high if borrowFee >= 50
medium if borrowFee >= 25
```

Display:

```text
Borrow fee closed at {borrowFeeDisplay}.
```

### Rule A2: Borrow Fee Increased

Trigger:

```text
borrowFeeChangePts >= 5 OR borrowFeeChangePercent >= 15
```

Formula:

```text
borrowFeeChangePts = latestBorrowFee - comparisonBorrowFee
borrowFeeChangePercent = (borrowFeeChangePts / comparisonBorrowFee) * 100
```

Severity:

```text
high if borrowFeeChangePts >= 10 OR borrowFeeChangePercent >= 30
medium otherwise
```

Display:

```text
Borrow fee rose {borrowFeeChangePtsDisplay} versus the prior close.
```

### Rule A3: Shortable Shares Declined

Trigger:

```text
shortableSharesChangePercent <= -10 OR shortableSharesChange <= -250000
```

Formula:

```text
shortableSharesChange = latestShortableShares - comparisonShortableShares
shortableSharesChangePercent = (shortableSharesChange / comparisonShortableShares) * 100
```

Severity:

```text
critical if shortableSharesChangePercent <= -30 OR latestShortableShares < 500000
high if shortableSharesChangePercent <= -20 OR latestShortableShares < 1000000
medium otherwise
```

Display:

```text
Shortable shares fell to {shortableSharesDisplay}, down {changeDisplay}.
```

### Rule A4: Utilization High

Trigger:

```text
utilization >= 85
```

Severity:

```text
critical if utilization >= 95
high if utilization >= 85
medium if utilization >= 75
```

Display:

```text
Utilization closed at {utilizationDisplay}.
```

### Rule A5: Utilization Increased

Trigger:

```text
utilizationChangePts >= 5
```

Formula:

```text
utilizationChangePts = latestUtilization - comparisonUtilization
```

Severity:

```text
high if utilizationChangePts >= 10
medium otherwise
```

Display:

```text
Utilization increased {utilizationChangePtsDisplay} versus the prior close.
```

### Rule A6: Days to Cover Increased

Trigger:

```text
daysToCover >= 5 OR daysToCoverChangePercent >= 20
```

Formula:

```text
daysToCoverChange = latestDaysToCover - comparisonDaysToCover
daysToCoverChangePercent = (daysToCoverChange / comparisonDaysToCover) * 100
```

Severity:

```text
high if daysToCover >= 7 OR daysToCoverChangePercent >= 40
medium otherwise
```

Display:

```text
Days to cover closed at {daysToCoverDisplay}.
```

### Rule A7: Social Feed Volume Elevated

Trigger:

```text
socialRecords >= 2500 OR socialRecordsChangePercent >= 50
```

Formula:

```text
socialRecords = redditRecordCount + xRecordCount
socialRecordsChangePercent = ((latestSocialRecords - comparisonSocialRecords) / comparisonSocialRecords) * 100
```

Severity:

```text
high if socialRecords >= 10000 OR socialRecordsChangePercent >= 100
medium otherwise
```

Display:

```text
Reddit and X feeds contained {socialRecordsDisplay} monitored records.
```

### Rule A8: New Filing Detected

Trigger:

```text
latestFilingPublishDate == reportDate
```

Severity:

```text
high for 8-K, 10-K, 10-Q, S-1, S-3, 13D, 13G, Form 4
medium for other forms
```

Display:

```text
New {formType} filing detected after the latest filing refresh.
```

## Management Watch Items

Management Watch Items should answer: **What should management monitor because it could change the situation quickly?**

These are condition-based, not long summaries.

### Rule M1: Borrow Fee Watch

Trigger:

```text
borrowFee >= 25 OR borrowFeeChangePts >= 3
```

Display:

```text
Borrow fee movement above current levels
```

### Rule M2: Availability Watch

Trigger:

```text
latestShortableShares <= 2500000 OR shortableSharesChangePercent <= -5
```

Display:

```text
Any decline in available shares to borrow
```

### Rule M3: Short Interest Watch

Trigger:

```text
shortInterestPercentFloatChangePts >= 0.25 OR shortInterestSharesChangePercent >= 5
```

Display:

```text
Short-interest increases confirmed by daily short-interest records
```

### Rule M4: Liquidity Watch

Trigger:

```text
daysToCoverChangePercent >= 10 OR tradeVolumeChangePercent <= -20
```

Display:

```text
Days-to-cover rising with lower trading liquidity
```

### Rule M5: Narrative Watch

Trigger:

```text
socialRecords >= 2500 OR socialRecordsChangePercent >= 50
```

Display:

```text
Social narrative acceleration across Reddit and X
```

### Rule M6: Filing Watch

Trigger:

```text
latestFilingPublishDate >= reportDate - 1 calendar day
```

Display:

```text
Recent filing activity requiring management review
```

## Tomorrow Watchlist

Tomorrow Watchlist should answer: **What thresholds should the team watch before and during the next open?**

The report should output clear threshold levels instead of generic observations.

### Rule T1: Borrow Fee Threshold

Always show when borrow fee is available.

Formula:

```text
borrowFeeWatchLevel = latestBorrowFee + max(5, latestBorrowFee * 0.10)
```

Display:

```text
Watch borrow fee moving above {borrowFeeWatchLevelDisplay}.
```

### Rule T2: Shortable Shares Threshold

Always show when shortable shares are available.

Formula:

```text
shortableSharesWatchLevel = latestShortableShares * 0.85
```

Display:

```text
Watch shortable shares falling below {shortableSharesWatchLevelDisplay}.
```

### Rule T3: Utilization Threshold

Always show when utilization is available.

Formula:

```text
utilizationWatchLevel = min(100, latestUtilization + max(5, latestUtilization * 0.05))
```

Display:

```text
Watch utilization moving above {utilizationWatchLevelDisplay}.
```

### Rule T4: Days to Cover Threshold

Show when days to cover is available.

Formula:

```text
daysToCoverWatchLevel = latestDaysToCover + max(0.5, latestDaysToCover * 0.10)
```

Display:

```text
Watch days to cover moving above {daysToCoverWatchLevelDisplay}.
```

### Rule T5: Filing / PR Timing

Show when there is a filing in the last 3 calendar days or a known pending company catalyst.

Display:

```text
Watch filings, PR timing, and social narrative acceleration before the open.
```

### Rule T6: Social Volume Threshold

Show when social records are available.

Formula:

```text
socialWatchLevel = latestSocialRecords * 1.25
```

Display:

```text
Watch Reddit and X records moving above {socialWatchLevelDisplay}.
```

## SEC Filing Watch Display Rule

The PDF should not show the full filing history.

Display rule:

```text
Show latest 3 filings only.
Sort by publishDate descending.
Columns: Date, Form, Title.
Do not show long excerpts in the PDF.
```

If a filing is published on the report date or the prior calendar day, add a Top Daily Alert candidate using Rule A8.

The full filing history should remain in the portal page, not in the daily PDF.
