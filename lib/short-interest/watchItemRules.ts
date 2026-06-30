export type WatchItemSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type WatchItemCategory =
  | 'Short Interest'
  | 'Borrow Market'
  | 'Utilization'
  | 'Availability'
  | 'FTD'
  | 'Price/Volume'
  | 'Squeeze Risk';

export interface ShortInterestRuleInput {
  shortInterestPercent?: number;
  shortInterestShares?: number;
  shortInterestChangePercent?: number;
  daysToCover?: number;
  borrowFeePercent?: number;
  borrowFeeChangePercent?: number;
  utilizationPercent?: number;
  sharesAvailable?: number;
  sharesAvailableChangePercent?: number;
  ftdShares?: number;
  ftdChangePercent?: number;
  priceChangePercent?: number;
  volumeChangePercent?: number;
  floatShares?: number;
}

export interface ManagementWatchItem {
  id: string;
  title: string;
  severity: WatchItemSeverity;
  category: WatchItemCategory;
  message: string;
  reason: string;
  suggestedAction: string;
}

export interface ShortInterestWatchRule {
  id: string;
  title: string;
  severity: WatchItemSeverity;
  category: WatchItemCategory;
  message: string;
  suggestedAction: string;
  isTriggered: (input: ShortInterestRuleInput) => boolean;
  reason: (input: ShortInterestRuleInput) => string;
}

export const shortInterestThresholds = {
  highShortInterestPercent: 15,
  rapidShortInterestIncreasePercent: 20,
  extremeBorrowFeePercent: 50,
  borrowFeeSpikePercent: 30,
  highUtilizationPercent: 85,
  lowShareAvailability: 100_000,
  availabilityDropPercent: -30,
  highDaysToCover: 5,
  highFtdShares: 500_000,
  ftdIncreasePercent: 50,
  squeezeBorrowFeePercent: 30,
  priceIncreasePercent: 10,
  pricePressureShortInterestPercent: 10,
} as const;

export const watchItemSeverityOrder: Record<WatchItemSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

function isNumber(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function percent(value: number | undefined) {
  return isNumber(value) ? `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}%` : 'unavailable';
}

function shares(value: number | undefined) {
  return isNumber(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 0 }) : 'unavailable';
}

export const shortInterestWatchRules: ShortInterestWatchRule[] = [
  // Rule A: flag elevated short exposure relative to free float.
  {
    id: 'high-short-interest',
    title: 'Elevated Short Interest',
    severity: 'high',
    category: 'Short Interest',
    message: 'Short interest is above the elevated-risk threshold.',
    suggestedAction: 'Review recent short activity, borrow market conditions, and upcoming catalysts.',
    isTriggered: input => isNumber(input.shortInterestPercent) && input.shortInterestPercent >= shortInterestThresholds.highShortInterestPercent,
    reason: input => `Short interest is ${percent(input.shortInterestPercent)}, at or above the ${shortInterestThresholds.highShortInterestPercent}% threshold.`,
  },
  // Rule B: identify a sharp increase in short positioning.
  {
    id: 'rapid-short-interest-increase',
    title: 'Rapid Increase in Short Interest',
    severity: 'high',
    category: 'Short Interest',
    message: 'Short interest has increased sharply compared with the previous period.',
    suggestedAction: 'Check whether the increase is event-driven, market-maker related, or directional short selling.',
    isTriggered: input => isNumber(input.shortInterestChangePercent) && input.shortInterestChangePercent >= shortInterestThresholds.rapidShortInterestIncreasePercent,
    reason: input => `Short interest increased ${percent(input.shortInterestChangePercent)} versus the previous period; the trigger is ${shortInterestThresholds.rapidShortInterestIncreasePercent}%.`,
  },
  // Rule C: surface unusually expensive securities lending conditions.
  {
    id: 'extreme-borrow-fee',
    title: 'Borrow Fee Pressure',
    severity: 'high',
    category: 'Borrow Market',
    message: 'Borrow cost is elevated and may increase pressure on short sellers.',
    suggestedAction: 'Monitor borrow availability, utilization, and intraday price reaction.',
    isTriggered: input => isNumber(input.borrowFeePercent) && input.borrowFeePercent >= shortInterestThresholds.extremeBorrowFeePercent,
    reason: input => `Borrow fee is ${percent(input.borrowFeePercent)}, at or above the ${shortInterestThresholds.extremeBorrowFeePercent}% threshold.`,
  },
  // Rule D: detect a material period-over-period increase in borrow cost.
  {
    id: 'borrow-fee-spike',
    title: 'Borrow Fee Spike',
    severity: 'medium',
    category: 'Borrow Market',
    message: 'Borrow fee has increased materially over the comparison period.',
    suggestedAction: 'Watch for tightening securities lending conditions.',
    isTriggered: input => isNumber(input.borrowFeeChangePercent) && input.borrowFeeChangePercent >= shortInterestThresholds.borrowFeeSpikePercent,
    reason: input => `Borrow fee increased ${percent(input.borrowFeeChangePercent)}; the spike trigger is ${shortInterestThresholds.borrowFeeSpikePercent}%.`,
  },
  // Rule E: identify when most reported lendable inventory appears committed.
  {
    id: 'high-utilization',
    title: 'High Utilization',
    severity: 'high',
    category: 'Utilization',
    message: 'Most lendable shares appear to be committed.',
    suggestedAction: 'Monitor availability, borrow fee, and failed locate pressure.',
    isTriggered: input => isNumber(input.utilizationPercent) && input.utilizationPercent >= shortInterestThresholds.highUtilizationPercent,
    reason: input => `Utilization is ${percent(input.utilizationPercent)}, above the ${shortInterestThresholds.highUtilizationPercent}% threshold.`,
  },
  // Rule F: flag an absolute shortage of reported borrow inventory.
  {
    id: 'low-share-availability',
    title: 'Low Share Availability',
    severity: 'medium',
    category: 'Availability',
    message: 'Available borrow inventory is limited.',
    suggestedAction: 'Watch for borrow fee increases and locate constraints.',
    isTriggered: input => isNumber(input.sharesAvailable) && input.sharesAvailable <= shortInterestThresholds.lowShareAvailability,
    reason: input => `${shares(input.sharesAvailable)} shares are available; the low-availability trigger is ${shares(shortInterestThresholds.lowShareAvailability)} or fewer.`,
  },
  // Rule G: identify a rapid contraction in reported borrow inventory.
  {
    id: 'availability-drop',
    title: 'Sharp Drop in Available Shares',
    severity: 'medium',
    category: 'Availability',
    message: 'Borrow inventory has fallen sharply.',
    suggestedAction: 'Review whether shares were newly borrowed, recalled, or removed from lending pools.',
    isTriggered: input => isNumber(input.sharesAvailableChangePercent) && input.sharesAvailableChangePercent <= shortInterestThresholds.availabilityDropPercent,
    reason: input => `Available shares changed ${percent(input.sharesAvailableChangePercent)}; the decline trigger is ${shortInterestThresholds.availabilityDropPercent}%.`,
  },
  // Rule H: flag positions that may require several average-volume days to cover.
  {
    id: 'high-days-to-cover',
    title: 'High Days to Cover',
    severity: 'high',
    category: 'Squeeze Risk',
    message: 'Short sellers may need multiple trading days to cover based on average volume.',
    suggestedAction: 'Monitor liquidity, volume expansion, and short covering risk.',
    isTriggered: input => isNumber(input.daysToCover) && input.daysToCover >= shortInterestThresholds.highDaysToCover,
    reason: input => `Days to cover is ${input.daysToCover?.toLocaleString('en-US', { maximumFractionDigits: 2 })}; the high-risk threshold is ${shortInterestThresholds.highDaysToCover}.`,
  },
  // Rule I: identify elevated or rapidly increasing fail-to-deliver activity.
  {
    id: 'ftd-pressure',
    title: 'FTD Pressure Building',
    severity: 'medium',
    category: 'FTD',
    message: 'Fail-to-deliver activity is elevated or increasing.',
    suggestedAction: 'Review settlement pressure and compare with short interest and volume.',
    isTriggered: input => (
      (isNumber(input.ftdShares) && input.ftdShares >= shortInterestThresholds.highFtdShares)
      || (isNumber(input.ftdChangePercent) && input.ftdChangePercent >= shortInterestThresholds.ftdIncreasePercent)
    ),
    reason: input => `FTD shares are ${shares(input.ftdShares)} and the period change is ${percent(input.ftdChangePercent)}.`,
  },
  // Rule J: escalate when the three core squeeze-pressure measures are elevated together.
  {
    id: 'combined-short-squeeze-risk',
    title: 'Combined Short Squeeze Risk',
    severity: 'critical',
    category: 'Squeeze Risk',
    message: 'Short interest, utilization, and borrow fee are all elevated.',
    suggestedAction: 'Escalate to management review and monitor price, borrow, and volume activity closely.',
    isTriggered: input => (
      isNumber(input.shortInterestPercent)
      && isNumber(input.utilizationPercent)
      && isNumber(input.borrowFeePercent)
      && input.shortInterestPercent >= shortInterestThresholds.highShortInterestPercent
      && input.utilizationPercent >= shortInterestThresholds.highUtilizationPercent
      && input.borrowFeePercent >= shortInterestThresholds.squeezeBorrowFeePercent
    ),
    reason: input => `Short interest is ${percent(input.shortInterestPercent)}, utilization is ${percent(input.utilizationPercent)}, and borrow fee is ${percent(input.borrowFeePercent)}.`,
  },
  // Rule K: identify price strength that could force covering into an already pressured borrow market.
  {
    id: 'price-strength-against-short-pressure',
    title: 'Price Strength Against Short Pressure',
    severity: 'high',
    category: 'Price/Volume',
    message: 'Price is rising while short pressure remains elevated.',
    suggestedAction: 'Watch for forced covering, momentum acceleration, and liquidity gaps.',
    isTriggered: input => (
      isNumber(input.priceChangePercent)
      && isNumber(input.shortInterestPercent)
      && isNumber(input.borrowFeePercent)
      && input.priceChangePercent >= shortInterestThresholds.priceIncreasePercent
      && input.shortInterestPercent >= shortInterestThresholds.pricePressureShortInterestPercent
      && input.borrowFeePercent >= shortInterestThresholds.squeezeBorrowFeePercent
    ),
    reason: input => `Price increased ${percent(input.priceChangePercent)} while short interest is ${percent(input.shortInterestPercent)} and borrow fee is ${percent(input.borrowFeePercent)}.`,
  },
];

export function evaluateShortInterestWatchItems(input: ShortInterestRuleInput): ManagementWatchItem[] {
  return shortInterestWatchRules
    .filter(rule => rule.isTriggered(input))
    .map(rule => ({
      id: rule.id,
      title: rule.title,
      severity: rule.severity,
      category: rule.category,
      message: rule.message,
      reason: rule.reason(input),
      suggestedAction: rule.suggestedAction,
    }))
    .sort((a, b) => watchItemSeverityOrder[a.severity] - watchItemSeverityOrder[b.severity]);
}
