const NEW_HOLDER_VALUE = '__new_holder__';

function numeric(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeHolderName(value) {
  return String(value ?? '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

export function parseShareTotal(value, { allowZero = true } = {}) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) return { valid: false, error: 'Enter a whole number within the supported range.' };
    if (value < 0 || (!allowZero && value === 0)) {
      return { valid: false, error: allowZero ? 'Total shares cannot be negative.' : 'Initial total shares must be greater than zero.' };
    }
    return { valid: true, value };
  }

  const raw = String(value ?? '').trim();
  if (!raw) return { valid: false, error: 'Total shares is required.' };
  if (!/^\d{1,3}(,\d{3})*$/.test(raw) && !/^\d+$/.test(raw)) {
    return { valid: false, error: 'Enter total shares as a non-negative whole number.' };
  }
  const parsed = Number(raw.replace(/,/g, ''));
  if (!Number.isSafeInteger(parsed)) return { valid: false, error: 'Enter a whole number within the supported range.' };
  if (parsed < 0 || (!allowZero && parsed === 0)) {
    return { valid: false, error: allowZero ? 'Total shares cannot be negative.' : 'Initial total shares must be greater than zero.' };
  }
  return { valid: true, value: parsed };
}

export function calculateOwnershipDifference(previousShares, latestTotalShares) {
  const previous = numeric(previousShares);
  const latest = numeric(latestTotalShares);
  const signedDifference = latest - previous;
  return {
    previousShares: previous,
    latestTotalShares: latest,
    signedDifference,
    absoluteDifference: Math.abs(signedDifference),
    state: signedDifference > 0 ? 'increase' : signedDifference < 0 ? 'decrease' : 'no-change',
    action: signedDifference < 0 ? 'deduct' : 'add',
  };
}

export function signedRecordDifference(record) {
  const explicit = Number(record?.sharesChange);
  if (Number.isFinite(explicit)) return explicit;
  const shares = Math.abs(numeric(record?.shares));
  return record?.action === 'deduct' ? -shares : shares;
}

const managementHoldingWriteFields = [
  'holderName',
  'source',
  'percentOfShares',
  'showInOwnership',
  'action',
  'category',
  'shares',
  'autoApply',
  'effectiveDate',
  'status',
  'notes',
  'id',
  'showAsSuggestion',
  'fileDate',
  'form',
];

export function toManagementHoldingWritePayload(input) {
  return Object.fromEntries(
    managementHoldingWriteFields
      .filter(field => input?.[field] !== undefined)
      .map(field => [field, input[field]]),
  );
}

export function currentHoldersFromRecords(records = []) {
  const holders = new Map();
  for (const record of records) {
    if (!record || record.status === 'discarded' || record.showInOwnership === false) continue;
    const holderName = String(record.holderName ?? '').trim();
    if (!holderName) continue;
    const key = normalizeHolderName(holderName);
    const current = holders.get(key) ?? {
      key,
      referenceId: String(record.id ?? ''),
      holderName,
      category: String(record.category ?? 'Strategic Investor'),
      priorTotalShares: 0,
      latestEffectiveDate: '',
      recordCount: 0,
    };
    const effectiveDate = String(record.effectiveDate ?? '');
    holders.set(key, {
      ...current,
      referenceId: String(record.id ?? current.referenceId),
      holderName,
      category: String(record.category ?? current.category),
      priorTotalShares: current.priorTotalShares + signedRecordDifference(record),
      latestEffectiveDate: effectiveDate > current.latestEffectiveDate ? effectiveDate : current.latestEffectiveDate,
      recordCount: current.recordCount + 1,
    });
  }
  return Array.from(holders.values())
    .map(holder => ({ ...holder, priorTotalShares: Math.max(0, holder.priorTotalShares) }))
    .sort((left, right) => left.holderName.localeCompare(right.holderName));
}

export function validateOwnershipEntry({ mode, holderName, holderSelection, latestTotalShares, currentHolders = [] }) {
  if (mode === 'existing') {
    const selected = currentHolders.find(holder => holder.key === holderSelection);
    if (!selected) return { valid: false, error: 'Select an existing holder.' };
    const shares = parseShareTotal(latestTotalShares, { allowZero: true });
    if (!shares.valid) return shares;
    return { valid: true, value: shares.value, holder: selected };
  }

  const cleanName = String(holderName ?? '').trim();
  if (!cleanName) return { valid: false, error: 'Holder name is required.' };
  if (currentHolders.some(holder => holder.key === normalizeHolderName(cleanName))) {
    return { valid: false, error: 'This holder already exists. Select the existing holder instead.' };
  }
  const shares = parseShareTotal(latestTotalShares, { allowZero: false });
  if (!shares.valid) return shares;
  return { valid: true, value: shares.value };
}

export function buildOwnershipSubmission({
  mode,
  holder,
  holderName,
  category,
  latestTotalShares,
  effectiveDate,
  notes,
  showInOwnership,
  showAsSuggestion,
  autoApply,
}) {
  const priorTotalShares = mode === 'existing' ? numeric(holder?.priorTotalShares) : 0;
  const difference = calculateOwnershipDifference(priorTotalShares, latestTotalShares);
  return toManagementHoldingWritePayload({
    holderName: mode === 'existing' ? String(holder?.holderName ?? '') : String(holderName ?? '').trim(),
    category: mode === 'existing' ? String(holder?.category ?? category) : category,
    shares: difference.absoluteDifference,
    action: difference.action,
    source: 'operations-input',
    status: 'pending',
    effectiveDate,
    notes,
    showInOwnership,
    showAsSuggestion,
    autoApply,
  });
}

export { NEW_HOLDER_VALUE };
