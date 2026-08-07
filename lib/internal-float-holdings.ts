import type { InternalFloatPrivateHolding } from './internal-float-types';

function holderKey(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Builds the current Internal Float holding list exclusively from user-saved
 * holdings. Operations records are recommendations and are never merged here.
 */
export function mergeInternalFloatHoldings(
  inputRows: Array<Record<string, unknown>>,
): InternalFloatPrivateHolding[] {
  const holdings = new Map<string, InternalFloatPrivateHolding>();

  inputRows.forEach((row, index) => {
    const key = holderKey(row.holderName) || `input-${index}`;
    holdings.set(key, {
      id: String(row.id ?? `input-${index}`),
      holderName: String(row.holderName ?? ''),
      category: String(row.category ?? 'Other'),
      shares: Math.max(0, Number(row.shares ?? 0)),
      includeInDeduction: row.includeInDeduction !== false,
      notes: String(row.notes ?? ''),
    });
  });

  return Array.from(holdings.values()).filter(row => row.shares > 0);
}
