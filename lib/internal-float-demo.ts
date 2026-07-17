import type { FloatAdjustments, InternalFloatUserInput, ManualHolding } from '@/lib/internal-float-types';
import type { InsiderSuggestionSource, InstitutionalOwnershipOverview } from '@/app/monitor/[ticker]/internal-float/InternalFloatClient';

export const demoInternalFloatHoldings: ManualHolding[] = [];

export const demoInternalFloatAdjustments: FloatAdjustments = {
  officialSharesOutstanding: 125_000_000,
  officialFreeFloat: 85_000_000,
  officialShortInterestShares: 18_750_000,
  managementControlledShares: 22_000_000,
  strategicLockedShares: 8_000_000,
  tokenizedShares: 9_500_000,
  unavailableForTradingShares: 43_500_000,
  unavailableForLendingShares: 43_500_000,
  estimatedRealTradableFloat: 41_500_000,
  estimatedRealLendableFloat: 41_500_000,
  officialShortInterestPercentFloat: 22.06,
  adjustedShortInterestRealFloat: 45.18,
  adjustedShortInterestLendableFloat: 45.18,
  floatReductionPercent: 51.18,
  lendingPoolReductionPercent: 51.18,
  internalSqueezeRiskAdjustment: 'DEMO',
  internalAdjustedSqueezeScore: 74,
};

export const sampleTraditionalCustodyRows = [
  { id: 'sample-custody-1', name: 'Example Prime Broker', shares: 18_000_000 },
  { id: 'sample-custody-2', name: 'Sample Global Custody', shares: 14_000_000 },
  { id: 'sample-custody-3', name: 'Prototype Retail Broker', shares: 11_500_000 },
  { id: 'sample-custody-4', name: 'Other Demo Custodians', shares: 19_000_000 },
];

export const demoInternalFloatUserInputs: InternalFloatUserInput = {
  userId: 'demo-session',
  workspaceId: 'CURR',
  ticker: 'CURR',
  privateHoldings: [
    { id: 'demo-founder', holderName: 'Example Founder Holdings', category: 'Founder', shares: 12_000_000, includeInDeduction: true, notes: 'Fictional demonstration record.' },
    { id: 'demo-strategic', holderName: 'Sample Strategic Partners', category: 'Strategic Investor', shares: 6_500_000, includeInDeduction: true, notes: 'Fictional demonstration record.' },
    { id: 'demo-management', holderName: 'Prototype Management Trust', category: 'Management', shares: 2_500_000, includeInDeduction: true, notes: 'Fictional demonstration record.' },
    { id: 'demo-transfer-agent', holderName: 'Demo Transfer Agent Reserve', category: 'Transfer Agent', shares: 1_000_000, includeInDeduction: true, notes: 'Fictional demonstration record.' },
  ],
  custodyRows: sampleTraditionalCustodyRows,
  tokenChains: [
    { id: 'demo-eth-securitize', chain: 'ETH', shares: 3_000_000, provider: 'Securitize' },
    { id: 'demo-sol-xstocks', chain: 'SOL', shares: 2_500_000, provider: 'xStocks' },
    { id: 'demo-bnb-ondo', chain: 'BNB', shares: 2_000_000, provider: 'Ondo' },
    { id: 'demo-eth-bstocks', chain: 'ETH', shares: 2_000_000, provider: 'bStocks' },
  ],
  collateralChains: [
    { id: 'demo-eth-aave', chain: 'ETH', shares: 1_400_000, protocol: 'Aave' },
    { id: 'demo-eth-euler', chain: 'ETH', shares: 900_000, protocol: 'Euler' },
    { id: 'demo-sol-kamino', chain: 'SOL', shares: 1_100_000, protocol: 'Kamino' },
    { id: 'demo-bnb-morpho', chain: 'BNB', shares: 600_000, protocol: 'Morpho' },
  ],
};

export const demoInstitutionalOverview: InstitutionalOwnershipOverview = {
  shares_outstanding: 125_000_000,
  public_float_shares: 85_000_000,
  institutional_shares_long: 40_000_000,
  insider_shares_long: 0,
};

export const demoInsiderSuggestions: InsiderSuggestionSource[] = [
  {
    name: 'Fictional Executive One',
    shares: 1_250_000,
    latestFileDate: '2026-06-30',
    latestEffectiveDate: '2026-06-30',
    formType: '4',
  },
  {
    name: 'Sample Director Holdings',
    shares: 725_000,
    latestFileDate: '2026-06-30',
    latestEffectiveDate: '2026-06-30',
    formType: '3',
  },
];
