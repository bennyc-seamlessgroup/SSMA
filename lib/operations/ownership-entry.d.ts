import type { ManagementHoldingAction, ManagementHoldingInputRecord, OwnershipChangeType } from './data-types';

export const NEW_HOLDER_VALUE: '__new_holder__';

export type CurrentOwnershipHolder = {
  key: string;
  referenceId: string;
  holderName: string;
  category: string;
  priorTotalShares: number;
  latestEffectiveDate: string;
  recordCount: number;
};

export type ShareParseResult = { valid: true; value: number } | { valid: false; error: string };

export function normalizeHolderName(value: unknown): string;
export function parseShareTotal(value: unknown, options?: { allowZero?: boolean }): ShareParseResult;
export function calculateOwnershipDifference(previousShares: unknown, latestTotalShares: unknown): {
  previousShares: number;
  latestTotalShares: number;
  signedDifference: number;
  absoluteDifference: number;
  state: OwnershipChangeType;
  action: ManagementHoldingAction;
};
export function signedRecordDifference(record: { shares?: unknown; action?: ManagementHoldingAction; sharesChange?: unknown }): number;
export type ManagementHoldingWritePayload = {
  holderName?: string;
  source?: string;
  percentOfShares?: number;
  showInOwnership?: boolean;
  action?: ManagementHoldingAction;
  category?: string;
  shares?: number;
  autoApply?: boolean;
  effectiveDate?: string;
  status?: 'pending' | 'applied' | 'discarded';
  notes?: string;
  id?: string;
  showAsSuggestion?: boolean;
  fileDate?: string;
  form?: string;
};
export function toManagementHoldingWritePayload(input: Record<string, unknown>): ManagementHoldingWritePayload;
export function currentHoldersFromRecords(records?: Array<Partial<ManagementHoldingInputRecord>>): CurrentOwnershipHolder[];
export function validateOwnershipEntry(input: {
  mode: 'existing' | 'new';
  holderName: string;
  holderSelection: string;
  latestTotalShares: unknown;
  currentHolders?: CurrentOwnershipHolder[];
}): ({ valid: true; value: number; holder?: CurrentOwnershipHolder } | { valid: false; error: string });
export function buildOwnershipSubmission(input: {
  mode: 'existing' | 'new';
  holder?: CurrentOwnershipHolder;
  holderName: string;
  category: string;
  latestTotalShares: number;
  effectiveDate: string;
  notes: string;
  showInOwnership: boolean;
  showAsSuggestion: boolean;
  autoApply: boolean;
}): ManagementHoldingWritePayload;
