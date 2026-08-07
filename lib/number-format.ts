export type CompactNumberOptions = {
  fallback?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

const compactThresholds = [
  { value: 1_000_000, suffix: 'M' },
  { value: 1_000, suffix: 'K' },
] as const;

export function portalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number'
    ? value
    : Number(String(value).replace(/[$,%]/g, '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function compactParts(value: number) {
  const threshold = compactThresholds.find(item => Math.abs(value) >= item.value);
  return threshold
    ? { scaledValue: value / threshold.value, suffix: threshold.suffix }
    : { scaledValue: value, suffix: '' };
}

export function formatCompactQuantity(
  value: unknown,
  options: CompactNumberOptions = {},
) {
  const parsed = portalNumber(value);
  if (parsed === null) return options.fallback ?? 'N/A';

  const { scaledValue, suffix } = compactParts(parsed);
  const isCompact = Boolean(suffix);
  const maximumFractionDigits = options.maximumFractionDigits ?? 2;
  const minimumFractionDigits = Math.min(
    options.minimumFractionDigits ?? (isCompact ? 2 : 0),
    maximumFractionDigits,
  );
  return `${scaledValue.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  })}${suffix}`;
}

export function formatCompactCurrency(
  value: unknown,
  options: CompactNumberOptions & { currency?: string } = {},
) {
  const parsed = portalNumber(value);
  if (parsed === null) return options.fallback ?? 'N/A';

  const { scaledValue, suffix } = compactParts(parsed);
  const isCompact = Boolean(suffix);
  const maximumFractionDigits = options.maximumFractionDigits ?? 2;
  const minimumFractionDigits = Math.min(
    options.minimumFractionDigits ?? (isCompact ? 2 : 0),
    maximumFractionDigits,
  );
  const formatted = scaledValue.toLocaleString('en-US', {
    style: 'currency',
    currency: options.currency ?? 'USD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits,
    maximumFractionDigits,
  });
  return `${formatted}${suffix}`;
}

export function formatExactNumber(
  value: unknown,
  options: Intl.NumberFormatOptions = {},
  fallback = 'N/A',
) {
  const parsed = portalNumber(value);
  return parsed === null ? fallback : parsed.toLocaleString('en-US', options);
}
