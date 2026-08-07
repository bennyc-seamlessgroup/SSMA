import type { InternalFloatPrivateHolding } from './internal-float-types';
import type { ManagementHoldingInputRecord } from './operations/data-types';
import { signedRecordDifference } from './operations/ownership-entry.js';

function holderKey(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Builds the current Internal Float holding list from user-saved holdings and
 * operations records that were explicitly approved for direct application.
 */
export function mergeInternalFloatHoldings(
  inputRows: Array<Record<string, unknown>>,
  operationsRows: ManagementHoldingInputRecord[],
): InternalFloatPrivateHolding[] {
  const holdings = new Map<string, InternalFloatPrivateHolding>();
  const savedHolderKeys = new Set<string>();

  inputRows.forEach((row, index) => {
    const key = holderKey(row.holderName) || `input-${index}`;
    savedHolderKeys.add(key);
    holdings.set(key, {
      id: String(row.id ?? `input-${index}`),
      holderName: String(row.holderName ?? ''),
      category: String(row.category ?? 'Other'),
      shares: Math.max(0, Number(row.shares ?? 0)),
      includeInDeduction: row.includeInDeduction !== false,
      notes: String(row.notes ?? ''),
    });
  });

  operationsRows
    .filter(row => row.autoApply && row.status !== 'discarded' && !savedHolderKeys.has(holderKey(row.holderName)))
    .forEach((row, index) => {
      const key = holderKey(row.holderName) || `operations-${row.id || index}`;
      const current = holdings.get(key);
      const nextShares = Math.max(0, Number(current?.shares ?? 0) + signedRecordDifference(row));
      holdings.set(key, {
        id: String(current?.id ?? row.id ?? `operations-${index}`),
        holderName: row.holderName,
        category: row.category || current?.category || 'Management',
        shares: nextShares,
        includeInDeduction: true,
        notes: [current?.notes, row.notes].filter(Boolean).join(' '),
      });
    });

  return Array.from(holdings.values()).filter(row => row.shares > 0);
}
