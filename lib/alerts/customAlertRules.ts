export type AlertOperator = '>' | '<' | '>=' | '<=';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertUnit = '%' | 'shares' | '$' | 'x' | 'score';

export type AlertCategory =
  | 'Short Selling Pressure'
  | 'Lending & Borrowing Pressure'
  | 'Settlement & FTD Risk'
  | 'Market Movement';

export interface CustomAlertThreshold {
  id: string;
  metric: keyof CustomAlertValues;
  label: string;
  category: AlertCategory;
  enabled: boolean;
  operator: AlertOperator;
  threshold: number;
  unit: AlertUnit;
  severity: AlertSeverity;
  description: string;
  helperText: string;
  message: string;
}

export interface TriggeredCustomAlert {
  id: string;
  label: string;
  category: AlertCategory;
  severity: AlertSeverity;
  currentValue: number;
  threshold: number;
  operator: AlertOperator;
  unit: AlertUnit;
  message: string;
}

export type CustomAlertValues = {
  shortInterestFloatPercent?: number;
  dailyShortVolumeRatio?: number;
  shortScore?: number;
  borrowFeeRate?: number;
  utilization?: number;
  availableShares?: number;
  onLoanShares?: number;
  ftdCount?: number;
  ftdValue?: number;
  priceDrawdown?: number;
  volumeSpike?: number;
  intradayPriceSpike?: number;
};

export const customAlertCategories: AlertCategory[] = [
  'Short Selling Pressure',
  'Lending & Borrowing Pressure',
  'Settlement & FTD Risk',
  'Market Movement',
];

export const defaultCustomAlertThresholds: CustomAlertThreshold[] = [
  {
    id: 'short-interest-float',
    metric: 'shortInterestFloatPercent',
    label: 'Short Interest Float %',
    category: 'Short Selling Pressure',
    enabled: true,
    operator: '>',
    threshold: 25,
    unit: '%',
    severity: 'high',
    description: 'Triggers when short interest relative to free float exceeds your selected limit.',
    helperText: 'Higher values indicate a larger portion of freely tradable shares has been sold short.',
    message: 'Short interest relative to float is above your defined risk limit.',
  },
  {
    id: 'daily-short-volume-ratio',
    metric: 'dailyShortVolumeRatio',
    label: 'Daily Short Volume Ratio',
    category: 'Short Selling Pressure',
    enabled: true,
    operator: '>',
    threshold: 55,
    unit: '%',
    severity: 'medium',
    description: 'Triggers when short-sale volume represents an elevated share of daily volume.',
    helperText: 'This compares reported short volume with total reported trading volume.',
    message: 'Daily short volume has crossed your configured participation threshold.',
  },
  {
    id: 'short-score',
    metric: 'shortScore',
    label: 'Short Score',
    category: 'Short Selling Pressure',
    enabled: true,
    operator: '>',
    threshold: 75,
    unit: 'score',
    severity: 'high',
    description: 'Triggers when the composite short-pressure score exceeds your limit.',
    helperText: 'The score is normalized from 0 to 100.',
    message: 'The composite short-pressure score is above your configured limit.',
  },
  {
    id: 'borrow-fee-rate',
    metric: 'borrowFeeRate',
    label: 'Borrow Fee Rate',
    category: 'Lending & Borrowing Pressure',
    enabled: true,
    operator: '>',
    threshold: 35,
    unit: '%',
    severity: 'high',
    description: 'Triggers when stock borrowing cost exceeds your selected percentage.',
    helperText: 'Higher borrow fees can make short positions more expensive to maintain.',
    message: 'Borrow cost is above your custom risk threshold.',
  },
  {
    id: 'utilization',
    metric: 'utilization',
    label: 'Utilization',
    category: 'Lending & Borrowing Pressure',
    enabled: true,
    operator: '>',
    threshold: 85,
    unit: '%',
    severity: 'critical',
    description: 'Triggers when lending-pool utilization enters a constrained range.',
    helperText: 'High utilization can indicate that less borrow inventory remains available.',
    message: 'Lending pool utilization has entered a high-pressure zone.',
  },
  {
    id: 'available-shares',
    metric: 'availableShares',
    label: 'Available Shares',
    category: 'Lending & Borrowing Pressure',
    enabled: true,
    operator: '<',
    threshold: 1_000_000,
    unit: 'shares',
    severity: 'high',
    description: 'Triggers when shares available to borrow fall below your selected inventory floor.',
    helperText: 'Lower available inventory can signal tightening borrow supply.',
    message: 'Shortable share inventory is below your configured minimum.',
  },
  {
    id: 'on-loan-shares',
    metric: 'onLoanShares',
    label: 'On Loan Shares',
    category: 'Lending & Borrowing Pressure',
    enabled: true,
    operator: '>',
    threshold: 5_000_000,
    unit: 'shares',
    severity: 'medium',
    description: 'Triggers when reported shares on loan exceed your selected level.',
    helperText: 'On-loan shares measure the quantity currently borrowed in the lending market.',
    message: 'Reported shares on loan are above your configured threshold.',
  },
  {
    id: 'ftd-count',
    metric: 'ftdCount',
    label: 'FTD Count',
    category: 'Settlement & FTD Risk',
    enabled: true,
    operator: '>',
    threshold: 500_000,
    unit: 'shares',
    severity: 'high',
    description: 'Triggers when reported failures to deliver exceed your selected share count.',
    helperText: 'FTD data is reported with a delay and should be interpreted in that context.',
    message: 'Reported failures to deliver exceed your configured count.',
  },
  {
    id: 'ftd-value',
    metric: 'ftdValue',
    label: 'FTD Value',
    category: 'Settlement & FTD Risk',
    enabled: true,
    operator: '>',
    threshold: 1_000_000,
    unit: '$',
    severity: 'medium',
    description: 'Triggers when the estimated market value of failures to deliver exceeds your limit.',
    helperText: 'Value is calculated from reported FTD shares and the associated market price.',
    message: 'Estimated failure-to-deliver value is above your configured threshold.',
  },
  {
    id: 'price-drawdown',
    metric: 'priceDrawdown',
    label: 'Price Drawdown',
    category: 'Market Movement',
    enabled: true,
    operator: '<',
    threshold: -8,
    unit: '%',
    severity: 'high',
    description: 'Triggers when the latest daily price move falls below your drawdown limit.',
    helperText: 'A negative percentage represents a decline from the prior available close.',
    message: 'The latest price drawdown is below your configured risk limit.',
  },
  {
    id: 'volume-spike',
    metric: 'volumeSpike',
    label: 'Volume Spike',
    category: 'Market Movement',
    enabled: true,
    operator: '>',
    threshold: 3,
    unit: 'x',
    severity: 'medium',
    description: 'Triggers when latest volume exceeds a multiple of the recent average.',
    helperText: 'The comparison uses up to 20 prior available trading observations.',
    message: 'Trading volume is above your configured multiple of recent average volume.',
  },
  {
    id: 'intraday-price-spike',
    metric: 'intradayPriceSpike',
    label: 'Intraday Price Spike',
    category: 'Market Movement',
    enabled: true,
    operator: '>',
    threshold: 10,
    unit: '%',
    severity: 'critical',
    description: 'Triggers when the reported intraday price increase exceeds your limit.',
    helperText: 'This metric requires an intraday change value from the market-data source.',
    message: 'Intraday price movement is above your configured spike threshold.',
  },
];

export const customAlertStorageKeyPrefix = 'currenc-custom-alert-thresholds';
export const customAlertUpdatedEvent = 'currenc-custom-alerts-updated';

export function customAlertStorageKey(ticker: string) {
  return `${customAlertStorageKeyPrefix}:${ticker.toUpperCase()}`;
}

function cloneDefaults() {
  return defaultCustomAlertThresholds.map(item => ({ ...item }));
}

export function normalizeCustomAlertThresholds(value: unknown): CustomAlertThreshold[] {
  if (!Array.isArray(value)) return cloneDefaults();
  const saved = new Map(
    value
      .filter(item => item && typeof item === 'object' && !Array.isArray(item))
      .map(item => [String((item as { id?: unknown }).id ?? ''), item as Partial<CustomAlertThreshold>]),
  );
  return defaultCustomAlertThresholds.map(defaultItem => {
    const item = saved.get(defaultItem.id);
    if (!item) return { ...defaultItem };
    return {
      ...defaultItem,
      enabled: typeof item.enabled === 'boolean' ? item.enabled : defaultItem.enabled,
      operator: ['>', '<', '>=', '<='].includes(String(item.operator)) ? item.operator as AlertOperator : defaultItem.operator,
      threshold: Number.isFinite(Number(item.threshold)) ? Number(item.threshold) : defaultItem.threshold,
      severity: ['low', 'medium', 'high', 'critical'].includes(String(item.severity)) ? item.severity as AlertSeverity : defaultItem.severity,
    };
  });
}

export function loadCustomAlertThresholds(ticker: string) {
  if (typeof window === 'undefined') return cloneDefaults();
  try {
    const stored = window.localStorage.getItem(customAlertStorageKey(ticker));
    return stored ? normalizeCustomAlertThresholds(JSON.parse(stored)) : cloneDefaults();
  } catch {
    return cloneDefaults();
  }
}

export function saveCustomAlertThresholds(ticker: string, thresholds: CustomAlertThreshold[]) {
  const normalized = normalizeCustomAlertThresholds(thresholds);
  window.localStorage.setItem(customAlertStorageKey(ticker), JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(customAlertUpdatedEvent, { detail: { ticker: ticker.toUpperCase() } }));
  return normalized;
}

function compare(current: number, operator: AlertOperator, threshold: number) {
  if (operator === '>') return current > threshold;
  if (operator === '<') return current < threshold;
  if (operator === '>=') return current >= threshold;
  return current <= threshold;
}

const severityRank: Record<AlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function evaluateCustomAlerts(
  values: CustomAlertValues,
  thresholds: CustomAlertThreshold[],
): TriggeredCustomAlert[] {
  return thresholds
    .flatMap(rule => {
      const currentValue = values[rule.metric];
      if (!rule.enabled || typeof currentValue !== 'number' || !Number.isFinite(currentValue)) return [];
      if (!compare(currentValue, rule.operator, rule.threshold)) return [];
      return [{
        id: rule.id,
        label: rule.label,
        category: rule.category,
        severity: rule.severity,
        currentValue,
        threshold: rule.threshold,
        operator: rule.operator,
        unit: rule.unit,
        message: rule.message,
      }];
    })
    .sort((left, right) => severityRank[right.severity] - severityRank[left.severity]);
}
