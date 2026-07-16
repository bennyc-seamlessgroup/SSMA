export type DashboardMarginRecord = {
  id: string; ticker: string; date: string; initialMargin: number | null;
  maintenanceMargin: number | null; averageDurationDays: number | null; updatedAt: string; updatedBy: string;
};

export type DashboardUtilizationRecord = {
  id: string; ticker: string; date: string; utilization: number; updatedAt: string; updatedBy: string;
};

export type OperationsSecFilingRecord = {
  id: string; ticker: string; companyName: string; formType: string; formDescription: string;
  filingDate: string; reportingDate: string; act: string; filmNumber: string; fileNumber: string;
  accessionNumber: string; filingsUrl: string; notes: string; createdAt: string; createdBy: string;
};

export type ManagementHoldingAction = 'add' | 'deduct';
export type OwnershipChangeType = 'increase' | 'decrease' | 'no-change';
export type ManagementHoldingInputRecord = {
  id: string; ticker: string; holderName: string; category: string; shares: number;
  action: ManagementHoldingAction; notes: string; effectiveDate: string;
  showInOwnership: boolean; showAsSuggestion: boolean; autoApply: boolean;
  status: 'pending' | 'applied' | 'discarded'; createdAt: string; updatedAt: string; updatedBy: string;
  entryMode?: 'existing' | 'new'; holderReferenceId?: string;
  previousShares?: number; latestTotalShares?: number; sharesChange?: number;
  changeType?: OwnershipChangeType; sharesSemantics?: 'delta' | 'total';
};
