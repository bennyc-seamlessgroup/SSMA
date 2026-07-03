export type InternalFloatActivityItem = {
  id: string;
  action: 'Added' | 'Removed' | 'Updated';
  section: string;
  label: string;
  detail: string;
  actor: string;
  createdAt: string;
};

export type InternalFloatEditableSection = 'privateHoldings' | 'tokenChains' | 'collateralChains';

type AuditRow = Record<string, unknown> & { id?: string };

const sectionNames: Record<InternalFloatEditableSection, string> = {
  privateHoldings: 'Management / Strategic',
  tokenChains: 'Tokenized Shares',
  collateralChains: 'Collateralized Shares',
};

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatShares(value: unknown) {
  return numeric(value).toLocaleString('en-US');
}

function rowLabel(section: InternalFloatEditableSection, row: AuditRow) {
  if (section === 'privateHoldings') return String(row.holderName || 'Unnamed holder');
  if (section === 'tokenChains') {
    return [row.provider, row.chain].filter(Boolean).map(String).join(' · ') || 'Unnamed tokenized position';
  }
  return [row.protocol, row.chain].filter(Boolean).map(String).join(' · ') || 'Unnamed collateralized position';
}

function targetName(section: InternalFloatEditableSection) {
  if (section === 'privateHoldings') return 'holdings';
  if (section === 'tokenChains') return 'tokenized shares';
  return 'collateralized shares';
}

function updatedDetail(before: AuditRow, after: AuditRow) {
  const beforeShares = numeric(before.shares);
  const afterShares = numeric(after.shares);
  const difference = afterShares - beforeShares;
  if (difference > 0) {
    return `${formatShares(difference)} shares added, increasing the position from ${formatShares(beforeShares)} to ${formatShares(afterShares)} shares.`;
  }
  if (difference < 0) {
    return `${formatShares(Math.abs(difference))} shares reduced, decreasing the position from ${formatShares(beforeShares)} to ${formatShares(afterShares)} shares.`;
  }

  const ignoredFields = new Set(['id', 'shares']);
  const changedFields = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .filter(field => !ignoredFields.has(field) && JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map(field => field.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase());
  return changedFields.length
    ? `${changedFields.join(', ')} ${changedFields.length === 1 ? 'was' : 'were'} updated. Share count remains ${formatShares(afterShares)}.`
    : `The record was updated. Share count remains ${formatShares(afterShares)}.`;
}

function auditId() {
  return `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function buildInternalFloatActivity(
  section: InternalFloatEditableSection,
  beforeRows: AuditRow[],
  afterRows: AuditRow[],
  actor: string,
  createdAt = new Date().toISOString(),
) {
  const before = new Map(beforeRows.map(row => [String(row.id ?? ''), row]));
  const after = new Map(afterRows.map(row => [String(row.id ?? ''), row]));
  const entries: InternalFloatActivityItem[] = [];

  for (const row of afterRows) {
    const previous = before.get(String(row.id ?? ''));
    const label = rowLabel(section, row);
    if (!previous) {
      entries.push({
        id: auditId(),
        action: 'Added',
        section: sectionNames[section],
        label: `${label} was added to ${targetName(section)}`,
        detail: `${formatShares(row.shares)} shares added.`,
        actor,
        createdAt,
      });
      continue;
    }
    if (JSON.stringify(previous) !== JSON.stringify(row)) {
      const difference = numeric(row.shares) - numeric(previous.shares);
      entries.push({
        id: auditId(),
        action: 'Updated',
        section: sectionNames[section],
        label: difference > 0
          ? `${label} increased`
          : difference < 0
            ? `${label} decreased`
            : `${label} was updated`,
        detail: updatedDetail(previous, row),
        actor,
        createdAt,
      });
    }
  }

  for (const row of beforeRows) {
    if (after.has(String(row.id ?? ''))) continue;
    const label = rowLabel(section, row);
    entries.push({
      id: auditId(),
      action: 'Removed',
      section: sectionNames[section],
      label: `${label} was removed from ${targetName(section)}`,
      detail: `${formatShares(row.shares)} shares removed.`,
      actor,
      createdAt,
    });
  }

  return entries;
}
