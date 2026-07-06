export type LendingWatchItemSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type LendingWatchItemCategory =
  | 'Utilization'
  | 'Borrow Fee'
  | 'Availability'
  | 'Average Duration'
  | 'Protocol Lock-up'
  | 'Squeeze Risk'
  | 'Price/Volume';

export interface LendingPressureRuleInput {
  utilizationPercent?: number;
  utilizationChangePercent?: number;
  borrowFeePercent?: number;
  borrowFeeChangePercent?: number;
  sharesAvailable?: number;
  sharesAvailableChangePercent?: number;
  averageDurationDays?: number;
  averageDurationChangePercent?: number;
  protocolLockupPercent?: number;
  protocolLockupChangePercent?: number;
  lockedCollateralShares?: number;
  lockedCollateralChangePercent?: number;
  shortInterestPercent?: number;
  daysToCover?: number;
  priceChangePercent?: number;
  volumeChangePercent?: number;
}

export interface LendingManagementWatchItem {
  id: string;
  title: string;
  severity: LendingWatchItemSeverity;
  category: LendingWatchItemCategory;
  message: string;
  reason: string;
  suggestedAction: string;
}

export interface LendingPressureWatchRule {
  id: string;
  title: string;
  severity: LendingWatchItemSeverity;
  category: LendingWatchItemCategory;
  message: string;
  suggestedAction: string;
  isTriggered: (input: LendingPressureRuleInput) => boolean;
  reason: (input: LendingPressureRuleInput) => string;
}

export const lendingPressureThresholds = {
  highUtilizationPercent: 85,
  extremeUtilizationPercent: 95,
  utilizationSpikePercent: 15,
  highBorrowFeePercent: 30,
  extremeBorrowFeePercent: 75,
  borrowFeeSpikePercent: 30,
  lowShareAvailability: 100_000,
  availabilityDropPercent: -30,
  longAverageDurationDays: 30,
  durationSpikePercent: 25,
  highProtocolLockupPercent: 20,
  protocolLockupSpikePercent: 20,
  squeezeShortInterestPercent: 10,
  priceStrengthPercent: 10,
} as const;

export const lendingSeverityOrder: Record<LendingWatchItemSeverity, number> = {
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

export const lendingPressureWatchRules: LendingPressureWatchRule[] = [
  // Rule A: identify elevated use of the reported lendable inventory.
  {
    id: 'high-utilization',
    title: 'High Lending Utilization',
    severity: 'high',
    category: 'Utilization',
    message: 'Lending utilization is elevated, suggesting limited remaining lendable supply.',
    suggestedAction: 'Monitor borrow fee, availability, and short interest pressure closely.',
    isTriggered: input => isNumber(input.utilizationPercent) && input.utilizationPercent >= lendingPressureThresholds.highUtilizationPercent,
    reason: input => `Utilization is ${percent(input.utilizationPercent)}, at or above the ${lendingPressureThresholds.highUtilizationPercent}% threshold.`,
  },
  // Rule B: escalate when utilization is near or above full reported capacity.
  {
    id: 'extreme-utilization',
    title: 'Extreme Lending Utilization',
    severity: 'critical',
    category: 'Utilization',
    message: 'Utilization is near full capacity, indicating very tight lending supply.',
    suggestedAction: 'Escalate to management review and monitor for borrow fee spikes or forced covering risk.',
    isTriggered: input => isNumber(input.utilizationPercent) && input.utilizationPercent >= lendingPressureThresholds.extremeUtilizationPercent,
    reason: input => `Utilization is ${percent(input.utilizationPercent)}, at or above the ${lendingPressureThresholds.extremeUtilizationPercent}% extreme threshold.`,
  },
  // Rule C: detect a rapid period-over-period increase in utilization.
  {
    id: 'utilization-spike',
    title: 'Utilization Spike',
    severity: 'medium',
    category: 'Utilization',
    message: 'Utilization has increased sharply compared with the previous period.',
    suggestedAction: 'Check whether new borrow demand, reduced lending supply, or recalls are driving the increase.',
    isTriggered: input => isNumber(input.utilizationChangePercent) && input.utilizationChangePercent >= lendingPressureThresholds.utilizationSpikePercent,
    reason: input => `Utilization increased ${percent(input.utilizationChangePercent)}; the spike threshold is ${lendingPressureThresholds.utilizationSpikePercent}%.`,
  },
  // Rule D: identify expensive securities-lending conditions.
  {
    id: 'high-borrow-fee',
    title: 'Elevated Borrow Fee',
    severity: 'high',
    category: 'Borrow Fee',
    message: 'Borrow cost is elevated, which may increase pressure on short sellers.',
    suggestedAction: 'Monitor whether high borrow cost persists and whether it coincides with price strength.',
    isTriggered: input => isNumber(input.borrowFeePercent) && input.borrowFeePercent >= lendingPressureThresholds.highBorrowFeePercent,
    reason: input => `Borrow fee is ${percent(input.borrowFeePercent)}, at or above the ${lendingPressureThresholds.highBorrowFeePercent}% threshold.`,
  },
  // Rule E: escalate unusually severe borrow cost.
  {
    id: 'extreme-borrow-fee',
    title: 'Extreme Borrow Fee Pressure',
    severity: 'critical',
    category: 'Borrow Fee',
    message: 'Borrow fee is at an extreme level, indicating severe borrow market stress.',
    suggestedAction: 'Escalate for management review and monitor availability, utilization, and squeeze risk.',
    isTriggered: input => isNumber(input.borrowFeePercent) && input.borrowFeePercent >= lendingPressureThresholds.extremeBorrowFeePercent,
    reason: input => `Borrow fee is ${percent(input.borrowFeePercent)}, at or above the ${lendingPressureThresholds.extremeBorrowFeePercent}% extreme threshold.`,
  },
  // Rule F: detect a material increase in borrow cost.
  {
    id: 'borrow-fee-spike',
    title: 'Borrow Fee Spike',
    severity: 'medium',
    category: 'Borrow Fee',
    message: 'Borrow fee has increased materially over the comparison period.',
    suggestedAction: 'Review whether the increase is caused by lower availability, higher short demand, or lending pool withdrawal.',
    isTriggered: input => isNumber(input.borrowFeeChangePercent) && input.borrowFeeChangePercent >= lendingPressureThresholds.borrowFeeSpikePercent,
    reason: input => `Borrow fee increased ${percent(input.borrowFeeChangePercent)}; the spike threshold is ${lendingPressureThresholds.borrowFeeSpikePercent}%.`,
  },
  // Rule G: flag a low absolute level of reported borrow inventory.
  {
    id: 'low-share-availability',
    title: 'Low Borrow Availability',
    severity: 'medium',
    category: 'Availability',
    message: 'Available borrow inventory is limited.',
    suggestedAction: 'Watch for additional borrow fee increases and possible locate constraints.',
    isTriggered: input => isNumber(input.sharesAvailable) && input.sharesAvailable <= lendingPressureThresholds.lowShareAvailability,
    reason: input => `${shares(input.sharesAvailable)} shares are available; the low-availability trigger is ${shares(lendingPressureThresholds.lowShareAvailability)} or fewer.`,
  },
  // Rule H: identify a sharp contraction in borrow availability.
  {
    id: 'availability-drop',
    title: 'Sharp Drop in Borrow Availability',
    severity: 'high',
    category: 'Availability',
    message: 'Available shares have dropped sharply, suggesting tighter lending conditions.',
    suggestedAction: 'Check whether shares were newly borrowed, recalled, or removed from lending pools.',
    isTriggered: input => isNumber(input.sharesAvailableChangePercent) && input.sharesAvailableChangePercent <= lendingPressureThresholds.availabilityDropPercent,
    reason: input => `Available shares changed ${percent(input.sharesAvailableChangePercent)}; the decline trigger is ${lendingPressureThresholds.availabilityDropPercent}%.`,
  },
  // Identify persistent borrow positions based on average duration.
  {
    id: 'long-average-duration',
    title: 'Long Average Loan Duration',
    severity: 'medium',
    category: 'Average Duration',
    message: 'Borrowed shares appear to be held for a longer duration.',
    suggestedAction: 'Review whether short positioning is becoming more persistent rather than short-term trading.',
    isTriggered: input => isNumber(input.averageDurationDays) && input.averageDurationDays >= lendingPressureThresholds.longAverageDurationDays,
    reason: input => `Average duration is ${input.averageDurationDays?.toLocaleString('en-US', { maximumFractionDigits: 2 })} days; the trigger is ${lendingPressureThresholds.longAverageDurationDays} days.`,
  },
  // Detect a material increase in average loan duration.
  {
    id: 'average-duration-spike',
    title: 'Average Duration Increasing',
    severity: 'medium',
    category: 'Average Duration',
    message: 'Average loan duration has increased materially.',
    suggestedAction: 'Monitor whether longer-held loans are building structural short pressure.',
    isTriggered: input => isNumber(input.averageDurationChangePercent) && input.averageDurationChangePercent >= lendingPressureThresholds.durationSpikePercent,
    reason: input => `Average duration increased ${percent(input.averageDurationChangePercent)}; the trigger is ${lendingPressureThresholds.durationSpikePercent}%.`,
  },
  // Flag a meaningful share of tokenized equity locked or pledged as collateral.
  {
    id: 'high-protocol-lockup',
    title: 'High Protocol Lock-up Utilization',
    severity: 'medium',
    category: 'Protocol Lock-up',
    message: 'A meaningful portion of shares may be locked or pledged as collateral in lending protocols.',
    suggestedAction: 'Monitor whether locked collateral reduces real tradable float or affects market liquidity.',
    isTriggered: input => isNumber(input.protocolLockupPercent) && input.protocolLockupPercent >= lendingPressureThresholds.highProtocolLockupPercent,
    reason: input => `Protocol lock-up utilization is ${percent(input.protocolLockupPercent)}, at or above the ${lendingPressureThresholds.highProtocolLockupPercent}% threshold.`,
  },
  // Rule O: detect an increase in collateralized share lock-up, not shares lent out.
  {
    id: 'protocol-lockup-spike',
    title: 'Protocol Lock-up Increasing',
    severity: 'medium',
    category: 'Protocol Lock-up',
    message: 'Collateralized share lock-up has increased materially.',
    suggestedAction: 'Review whether shareholders are locking more tokenized shares to borrow stablecoins or other assets.',
    isTriggered: input => (
      (isNumber(input.protocolLockupChangePercent) && input.protocolLockupChangePercent >= lendingPressureThresholds.protocolLockupSpikePercent)
      || (isNumber(input.lockedCollateralChangePercent) && input.lockedCollateralChangePercent >= lendingPressureThresholds.protocolLockupSpikePercent)
    ),
    reason: input => `Protocol utilization changed ${percent(input.protocolLockupChangePercent)} and locked collateral changed ${percent(input.lockedCollateralChangePercent)}.`,
  },
  // Rule P: escalate when utilization, fee, and availability all indicate stress.
  {
    id: 'combined-lending-stress',
    title: 'Combined Lending Market Stress',
    severity: 'critical',
    category: 'Squeeze Risk',
    message: 'Utilization, borrow fee, and availability all indicate lending market stress.',
    suggestedAction: 'Escalate to management review and monitor price action, short interest, and borrow market changes closely.',
    isTriggered: input => (
      isNumber(input.utilizationPercent)
      && isNumber(input.borrowFeePercent)
      && isNumber(input.sharesAvailable)
      && input.utilizationPercent >= lendingPressureThresholds.highUtilizationPercent
      && input.borrowFeePercent >= lendingPressureThresholds.highBorrowFeePercent
      && input.sharesAvailable <= lendingPressureThresholds.lowShareAvailability
    ),
    reason: input => `Utilization is ${percent(input.utilizationPercent)}, borrow fee is ${percent(input.borrowFeePercent)}, and availability is ${shares(input.sharesAvailable)} shares.`,
  },
  // Rule Q: combine tight lending conditions with elevated short interest.
  {
    id: 'squeeze-supportive-lending',
    title: 'Squeeze-Supportive Lending Setup',
    severity: 'high',
    category: 'Squeeze Risk',
    message: 'Lending conditions may be supportive of short squeeze risk.',
    suggestedAction: 'Monitor price strength, volume expansion, days to cover, and borrow availability.',
    isTriggered: input => (
      isNumber(input.utilizationPercent)
      && isNumber(input.borrowFeePercent)
      && isNumber(input.shortInterestPercent)
      && input.utilizationPercent >= lendingPressureThresholds.highUtilizationPercent
      && input.borrowFeePercent >= lendingPressureThresholds.highBorrowFeePercent
      && input.shortInterestPercent >= lendingPressureThresholds.squeezeShortInterestPercent
    ),
    reason: input => `Utilization is ${percent(input.utilizationPercent)}, borrow fee is ${percent(input.borrowFeePercent)}, and short interest is ${percent(input.shortInterestPercent)}.`,
  },
  // Rule R: identify price strength that may force covering during tight lending conditions.
  {
    id: 'price-strength-lending-stress',
    title: 'Price Strength During Lending Stress',
    severity: 'high',
    category: 'Price/Volume',
    message: 'Price is rising while lending conditions are tight.',
    suggestedAction: 'Watch for forced covering, momentum acceleration, and liquidity gaps.',
    isTriggered: input => (
      isNumber(input.priceChangePercent)
      && isNumber(input.utilizationPercent)
      && isNumber(input.borrowFeePercent)
      && input.priceChangePercent >= lendingPressureThresholds.priceStrengthPercent
      && input.utilizationPercent >= lendingPressureThresholds.highUtilizationPercent
      && input.borrowFeePercent >= lendingPressureThresholds.highBorrowFeePercent
    ),
    reason: input => `Price increased ${percent(input.priceChangePercent)} while utilization is ${percent(input.utilizationPercent)} and borrow fee is ${percent(input.borrowFeePercent)}.`,
  },
];

export function evaluateLendingPressureWatchItems(input: LendingPressureRuleInput): LendingManagementWatchItem[] {
  return lendingPressureWatchRules
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
    .sort((a, b) => lendingSeverityOrder[a.severity] - lendingSeverityOrder[b.severity]);
}
