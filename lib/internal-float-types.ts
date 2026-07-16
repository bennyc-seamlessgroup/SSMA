import type { InternalFloatActivityItem } from '@/lib/internal-float-audit';

export type ManualHolding = {
  id: string; holderName: string; holderType: string; accountType: string;
  brokerCustodian: string; numberOfShares: number; tradabilityStatus: string;
  lendingAvailability: string; tokenizationStatus: string; lockUpStatus: string;
  confidenceLevel: string; sourceType: string; notes: string;
};

export type FloatAdjustments = {
  officialSharesOutstanding: number; officialFreeFloat: number; officialShortInterestShares: number;
  managementControlledShares: number; strategicLockedShares: number; tokenizedShares: number;
  unavailableForTradingShares: number; unavailableForLendingShares: number;
  estimatedRealTradableFloat: number; estimatedRealLendableFloat: number;
  officialShortInterestPercentFloat: number; adjustedShortInterestRealFloat: number;
  adjustedShortInterestLendableFloat: number; floatReductionPercent: number;
  lendingPoolReductionPercent: number; internalSqueezeRiskAdjustment: string;
  internalAdjustedSqueezeScore: number;
};

export type InternalFloatPrivateHolding = { id: string; holderName: string; category: string; shares: number; includeInDeduction: boolean; notes: string };
export type InternalFloatUserInput = {
  userId: string; workspaceId?: string; ticker: string;
  privateHoldings: InternalFloatPrivateHolding[];
  custodyRows: Array<{ id: string; name: string; shares: number }>;
  tokenChains: Array<{ id: string; chain: string; shares: number; provider: string }>;
  collateralChains: Array<{ id: string; chain: string; shares: number; protocol: string }>;
  activityLog?: InternalFloatActivityItem[];
};
