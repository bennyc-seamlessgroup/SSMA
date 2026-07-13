import crypto from 'crypto';
import { readImportFile, writeImportJson, type ImportEnvelope } from '@/lib/import-data';
import {
  defaultInternalFloatV2UserInput,
  internalFloatV2UserInputPaths,
  internalFloatWorkspaceId,
  selectInternalFloatWorkspaceInput,
  type InternalFloatV2PrivateHolding,
  type InternalFloatV2UserInput,
} from '@/lib/internal-float';
import { managementHoldingsInputFile, normalizeTicker } from '@/lib/ticker-data';

export type ManagementHoldingAction = 'add' | 'deduct';

export type ManagementHoldingInputRecord = {
  id: string;
  ticker: string;
  holderName: string;
  category: string;
  shares: number;
  action: ManagementHoldingAction;
  notes: string;
  effectiveDate: string;
  showInOwnership: boolean;
  showAsSuggestion: boolean;
  autoApply: boolean;
  status: 'pending' | 'applied' | 'discarded';
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
};

export type ManagementHoldingsInputFile = {
  source: 'operations_management_holdings_input';
  schemaVersion: 1;
  ticker: string;
  updatedAt: string;
  s3Key: string;
  records: ManagementHoldingInputRecord[];
};

type UserInputsEnvelope = {
  users: InternalFloatV2UserInput[];
};

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeDate(value: unknown) {
  const raw = text(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function stableId(ticker: string, input: Pick<ManagementHoldingInputRecord, 'holderName' | 'effectiveDate' | 'action' | 'shares'>) {
  return crypto
    .createHash('sha256')
    .update(`${ticker}|${input.effectiveDate}|${input.holderName}|${input.action}|${input.shares}`)
    .digest('hex')
    .slice(0, 18);
}

function blankFile(ticker: string): ManagementHoldingsInputFile {
  return {
    source: 'operations_management_holdings_input',
    schemaVersion: 1,
    ticker,
    updatedAt: new Date().toISOString(),
    s3Key: managementHoldingsInputFile(ticker),
    records: [],
  };
}

function normalizeRecord(input: Partial<ManagementHoldingInputRecord>, ticker = 'CURR'): ManagementHoldingInputRecord {
  const normalizedTicker = normalizeTicker(input.ticker ?? ticker);
  const shares = Math.abs(numeric(input.shares));
  const action: ManagementHoldingAction = input.action === 'deduct' ? 'deduct' : 'add';
  const effectiveDate = normalizeDate(input.effectiveDate);
  const base = {
    holderName: text(input.holderName) || 'Unnamed holder',
    action,
    shares,
    effectiveDate,
  };
  return {
    id: text(input.id) || stableId(normalizedTicker, base),
    ticker: normalizedTicker,
    holderName: base.holderName,
    category: text(input.category) || 'Strategic Investor',
    shares,
    action,
    notes: text(input.notes),
    effectiveDate,
    showInOwnership: input.showInOwnership === false ? false : true,
    showAsSuggestion: Boolean(input.showAsSuggestion),
    autoApply: Boolean(input.autoApply),
    status: input.status === 'applied' || input.status === 'discarded' ? input.status : 'pending',
    createdAt: text(input.createdAt) || new Date().toISOString(),
    updatedAt: text(input.updatedAt) || new Date().toISOString(),
    updatedBy: text(input.updatedBy) || 'operations',
  };
}

function normalizeFile(input: Partial<ManagementHoldingsInputFile>, ticker: string): ManagementHoldingsInputFile {
  const normalizedTicker = normalizeTicker(ticker);
  return {
    ...blankFile(normalizedTicker),
    ...input,
    source: 'operations_management_holdings_input',
    schemaVersion: 1,
    ticker: normalizedTicker,
    s3Key: managementHoldingsInputFile(normalizedTicker),
    records: Array.isArray(input.records)
      ? input.records.map(row => normalizeRecord(row, normalizedTicker)).filter(row => row.ticker === normalizedTicker)
      : [],
  };
}

export async function readManagementHoldingsInputs(ticker = 'CURR') {
  const normalizedTicker = normalizeTicker(ticker);
  try {
    const envelope = await readImportFile<ManagementHoldingsInputFile>(managementHoldingsInputFile(normalizedTicker));
    const data = envelope.data && typeof envelope.data === 'object'
      ? envelope.data
      : envelope as unknown as ManagementHoldingsInputFile;
    return normalizeFile(data, normalizedTicker);
  } catch {
    return blankFile(normalizedTicker);
  }
}

async function readInternalFloatWorkspaceEnvelope(ticker: string) {
  for (const path of internalFloatV2UserInputPaths(ticker)) {
    try {
      const envelope = await readImportFile<UserInputsEnvelope>(path);
      return { path, envelope };
    } catch {
      // Try next compatibility path.
    }
  }
  return null;
}

function normalizedName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function applyRecordToPrivateHoldings(currentRows: InternalFloatV2PrivateHolding[], record: ManagementHoldingInputRecord) {
  const nextRows = [...currentRows];
  const matchingIndex = nextRows.findIndex(row => normalizedName(row.holderName) === normalizedName(record.holderName));

  if (record.action === 'add') {
    if (matchingIndex >= 0) {
      nextRows[matchingIndex] = {
        ...nextRows[matchingIndex],
        shares: numeric(nextRows[matchingIndex].shares) + record.shares,
        notes: [nextRows[matchingIndex].notes, record.notes].filter(Boolean).join(' '),
      };
      return nextRows;
    }
    return [
      ...nextRows,
      {
        id: `ops-${record.id}`,
        holderName: record.holderName,
        category: record.category,
        shares: record.shares,
        includeInDeduction: true,
        notes: record.notes || `Applied from operations input dated ${record.effectiveDate}.`,
      },
    ];
  }

  if (matchingIndex >= 0) {
    nextRows[matchingIndex] = {
      ...nextRows[matchingIndex],
      shares: Math.max(0, numeric(nextRows[matchingIndex].shares) - record.shares),
      notes: [nextRows[matchingIndex].notes, record.notes].filter(Boolean).join(' '),
    };
  }
  return nextRows;
}

function reverseRecordFromPrivateHoldings(currentRows: InternalFloatV2PrivateHolding[], record: ManagementHoldingInputRecord) {
  const matchingIndex = currentRows.findIndex(row => normalizedName(row.holderName) === normalizedName(record.holderName));
  if (matchingIndex < 0) return currentRows;

  return currentRows.map((row, index) => {
    if (index !== matchingIndex) return row;
    const direction = record.action === 'deduct' ? 1 : -1;
    return {
      ...row,
      shares: Math.max(0, numeric(row.shares) + direction * record.shares),
    };
  });
}

async function updateInternalFloatPrivateHoldings(
  ticker: string,
  updater: (rows: InternalFloatV2PrivateHolding[]) => InternalFloatV2PrivateHolding[],
) {
  const workspace = await readInternalFloatWorkspaceEnvelope(ticker);
  if (!workspace) return;

  const users = Array.isArray(workspace.envelope.data?.users) ? workspace.envelope.data.users : [];
  const current = users.length
    ? selectInternalFloatWorkspaceInput(users, ticker)
    : { ...defaultInternalFloatV2UserInput, userId: internalFloatWorkspaceId(ticker), workspaceId: ticker, ticker };

  const updated: InternalFloatV2UserInput = {
    ...current,
    privateHoldings: updater(current.privateHoldings),
  };
  const workspaceUserId = internalFloatWorkspaceId(ticker);
  const nextUsers = [
    ...users.filter(row => row.userId !== workspaceUserId && row.workspaceId !== ticker),
    updated,
  ];
  const now = new Date().toISOString();

  await writeImportJson(workspace.path, {
    ...workspace.envelope,
    ticker,
    importedAt: now,
    asOfDate: now.slice(0, 10),
    recordCount: nextUsers.length,
    notes: 'Workspace-scoped Internal Float inputs shared by all authorized ticker users.',
    data: { ...workspace.envelope.data, users: nextUsers },
  });
}

async function autoApplyToInternalFloat(record: ManagementHoldingInputRecord) {
  await updateInternalFloatPrivateHoldings(record.ticker, rows => applyRecordToPrivateHoldings(rows, record));
}

async function reverseAutoApplyFromInternalFloat(record: ManagementHoldingInputRecord) {
  await updateInternalFloatPrivateHoldings(record.ticker, rows => reverseRecordFromPrivateHoldings(rows, record));
}

export async function saveManagementHoldingInput(input: Partial<ManagementHoldingInputRecord>) {
  const ticker = normalizeTicker(input.ticker);
  const current = await readManagementHoldingsInputs(ticker);
  const now = new Date().toISOString();
  let record = normalizeRecord({ ...input, ticker, updatedAt: now }, ticker);
  const existingIndex = current.records.findIndex(row => row.id === record.id);
  const existingRecord = existingIndex >= 0 ? current.records[existingIndex] : null;

  if (existingRecord?.autoApply && existingRecord.status === 'applied') {
    await reverseAutoApplyFromInternalFloat(existingRecord);
  }

  if (record.autoApply) {
    await autoApplyToInternalFloat(record);
    record = { ...record, status: 'applied' };
  } else if (!record.showAsSuggestion && record.status === 'pending') {
    record = { ...record, status: 'applied' };
  }

  const nextRecords = [...current.records];
  nextRecords[existingIndex >= 0 ? existingIndex : nextRecords.length] = {
    ...record,
    createdAt: existingIndex >= 0 ? nextRecords[existingIndex].createdAt : record.createdAt,
    updatedAt: now,
  };
  const nextFile: ManagementHoldingsInputFile = {
    ...blankFile(ticker),
    updatedAt: now,
    records: nextRecords.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.updatedAt.localeCompare(a.updatedAt)),
  };

  await writeImportJson(managementHoldingsInputFile(ticker), {
    ...nextFile,
    data: nextFile,
  });

  return { ...nextFile, savedRecord: record };
}

export async function deleteManagementHoldingInput(ticker = 'CURR', id: string) {
  const normalizedTicker = normalizeTicker(ticker);
  const current = await readManagementHoldingsInputs(normalizedTicker);
  const record = current.records.find(row => row.id === id);
  if (!record) return current;

  if (record.autoApply && record.status === 'applied') {
    await reverseAutoApplyFromInternalFloat(record);
  }

  const now = new Date().toISOString();
  const nextFile: ManagementHoldingsInputFile = {
    ...blankFile(normalizedTicker),
    updatedAt: now,
    records: current.records.filter(row => row.id !== id),
  };

  await writeImportJson(managementHoldingsInputFile(normalizedTicker), {
    ...nextFile,
    data: nextFile,
  });

  return nextFile;
}
