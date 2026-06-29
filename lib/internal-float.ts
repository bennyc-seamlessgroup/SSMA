import fs from 'fs';
import path from 'path';
import { readImportFile, type ImportEnvelope } from '@/lib/import-data';

export type ManualHolding = {
  id: string;
  holderName: string;
  holderType: string;
  accountType: string;
  brokerCustodian: string;
  numberOfShares: number;
  tradabilityStatus: string;
  lendingAvailability: string;
  tokenizationStatus: string;
  lockUpStatus: string;
  confidenceLevel: string;
  sourceType: string;
  notes: string;
};

export type FloatAdjustments = {
  officialSharesOutstanding: number;
  officialFreeFloat: number;
  officialShortInterestShares: number;
  managementControlledShares: number;
  strategicLockedShares: number;
  tokenizedShares: number;
  unavailableForTradingShares: number;
  unavailableForLendingShares: number;
  estimatedRealTradableFloat: number;
  estimatedRealLendableFloat: number;
  officialShortInterestPercentFloat: number;
  adjustedShortInterestRealFloat: number;
  adjustedShortInterestLendableFloat: number;
  floatReductionPercent: number;
  lendingPoolReductionPercent: number;
  internalSqueezeRiskAdjustment: string;
  internalAdjustedSqueezeScore: number;
};

export type InternalFloatV2PrivateHolding = {
  id: string;
  holderName: string;
  category: string;
  shares: number;
  includeInDeduction: boolean;
  notes: string;
};

export type InternalFloatV2CustodyRow = {
  id: string;
  name: string;
  shares: number;
};

export type InternalFloatV2TokenChain = {
  id: string;
  chain: string;
  shares: number;
  provider: string;
};

export type InternalFloatV2CollateralChain = {
  id: string;
  chain: string;
  shares: number;
  protocol: string;
};

export type InternalFloatV2UserInput = {
  userId: string;
  ticker: string;
  privateHoldings: InternalFloatV2PrivateHolding[];
  custodyRows: InternalFloatV2CustodyRow[];
  tokenChains: InternalFloatV2TokenChain[];
  collateralChains: InternalFloatV2CollateralChain[];
};

type InternalFloatV2UserInputsEnvelope = {
  users: InternalFloatV2UserInput[];
};

export type InternalFloatV2UserInputReadResult = {
  envelope: ImportEnvelope<InternalFloatV2UserInputsEnvelope> | null;
  path: string;
  userInput: InternalFloatV2UserInput;
  usedDefault: boolean;
};

export function internalFloatV2UserInputPaths(ticker = 'CURR') {
  const normalizedTicker = ticker.toUpperCase();
  return [
    `${normalizedTicker}_v2_user_inputs.json`,
    `internal_float/${normalizedTicker}_v2_user_inputs.json`,
    'internal_float/v2_user_inputs.json',
  ];
}

export const defaultInternalFloatV2UserInput: InternalFloatV2UserInput = {
  userId: 'demo-user',
  ticker: 'CURR',
  privateHoldings: [
    { id: 'founder-management', holderName: 'Founder / management group', category: 'Founder', shares: 5000000, includeInDeduction: true, notes: 'Internal management assumption.' },
    { id: 'strategic-long-term', holderName: 'Strategic long-term holders', category: 'Strategic Investor', shares: 3000000, includeInDeduction: true, notes: 'Friendly / restricted holder estimate.' },
  ],
  custodyRows: [
    { id: 'bny', name: 'Bank of NY Mellon', shares: 5000000 },
    { id: 'ibkr', name: 'IBKR', shares: 3600000 },
    { id: 'citibank', name: 'Citibank', shares: 3100000 },
    { id: 'futu', name: 'FUTU', shares: 2000000 },
    { id: 'fidelity', name: 'Fidelity', shares: 1700000 },
    { id: 'schwab', name: 'Charles Schwab', shares: 1300000 },
    { id: 'others', name: 'Others', shares: 2964808 },
  ],
  tokenChains: [
    { id: 'eth', chain: 'ETH', shares: 1800000, provider: 'Securitize' },
    { id: 'sol', chain: 'SOL', shares: 1000000, provider: 'xStocks' },
    { id: 'bnb', chain: 'BNB', shares: 600000, provider: 'Ondo' },
  ],
  collateralChains: [
    { id: 'eth-c', chain: 'ETH', shares: 900000, protocol: 'Aave' },
    { id: 'sol-c', chain: 'SOL', shares: 500000, protocol: 'Kamino' },
    { id: 'bnb-c', chain: 'BNB', shares: 200000, protocol: 'Euler' },
  ],
};

export const holderTypeOptions = [
  'CEO',
  'CFO',
  'Founder',
  'Director',
  'Management',
  'Major Shareholder',
  'Strategic Investor',
  'Affiliated Entity',
  'Friendly Long-Term Holder',
  'Treasury Related',
  'Tokenized Shares',
  'Other',
];

export const accountTypeOptions = [
  'Personal Brokerage',
  'Corporate Account',
  'Nominee Account',
  'Custodian Account',
  'Transfer Agent',
  'Tokenized Custody',
  'Lending Protocol',
  'Locked Wallet',
  'Other',
];

export const tradabilityOptions = [
  'Freely Tradable',
  'Long-Term Held',
  'Restricted',
  'Locked',
  'Tokenized',
  'Not Available for Trading',
];

export const lendingOptions = ['Available for Lending', 'Not Available for Lending', 'Unknown'];
export const tokenizationOptions = ['Not Tokenized', 'Tokenized', 'Pending Tokenization', 'Locked On-Chain', 'Removed From Broker Lending Pool'];
export const lockUpOptions = ['No Lock-up', 'Contractual Lock-up', 'Insider Restriction', 'Strategic Lock-up', 'Tokenization Lock-up', 'Voluntary Lock-up'];
export const confidenceLevelOptions = ['High', 'Medium', 'Low'];
export const sourceTypeOptions = ['Personally Controlled', 'Transfer Agent Record', 'Trust Structure', 'Custodian Statement', 'Tokenized Wallet', 'Internal Estimate', 'Known Friendly Holder', 'Legal Record', 'Other'];

const importDataRoot = path.join(process.cwd(), 'import_data');

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function writeEnvelope<T>(relativePath: string, envelope: ImportEnvelope<T>) {
  fs.writeFileSync(path.join(importDataRoot, relativePath), `${JSON.stringify(envelope, null, 2)}\n`);
}

export async function baseMarketInputs() {
  const [capitalEnvelope, shortInterestEnvelope] = await Promise.all([
    readImportFile<Record<string, unknown>>('company/capital_structure.json'),
    readImportFile<Record<string, unknown>>('short/short_interest.json'),
  ]);
  const capital = capitalEnvelope.data;
  const shortInterest = shortInterestEnvelope.data;
  const currentShort = shortInterest.current && typeof shortInterest.current === 'object'
    ? shortInterest.current as Record<string, unknown>
    : {};
  const officialSharesOutstanding = numeric(capital.sharesOutstanding) || 58030000;
  const shortInterestShares = numeric(currentShort.shortInterestShares);
  const impliedFreeFloat = numeric(currentShort.shortInterestPcFreeFloat)
    ? shortInterestShares / (numeric(currentShort.shortInterestPcFreeFloat) / 100)
    : 0;

  return {
    officialSharesOutstanding,
    officialFreeFloat: numeric(capital.freeFloat) || Math.round(impliedFreeFloat) || 32660000,
    officialShortInterestShares: shortInterestShares || 940721,
  };
}

export function demoManualHoldings(): ManualHolding[] {
  return [
    {
      id: 'demo-ceo-controlled-account',
      holderName: 'CEO Controlled Account',
      holderType: 'CEO',
      accountType: 'Personal Brokerage',
      brokerCustodian: 'Private Broker A',
      numberOfShares: 4200000,
      tradabilityStatus: 'Long-Term Held',
      lendingAvailability: 'Not Available for Lending',
      tokenizationStatus: 'Not Tokenized',
      lockUpStatus: 'Insider Restriction',
      confidenceLevel: 'High',
      sourceType: 'Personally Controlled',
      notes: 'Fictional demo management-controlled account.',
    },
    {
      id: 'demo-founder-trust',
      holderName: 'Founder Trust',
      holderType: 'Founder',
      accountType: 'Custodian Account',
      brokerCustodian: 'Trust Custodian',
      numberOfShares: 3600000,
      tradabilityStatus: 'Restricted',
      lendingAvailability: 'Not Available for Lending',
      tokenizationStatus: 'Not Tokenized',
      lockUpStatus: 'Contractual Lock-up',
      confidenceLevel: 'High',
      sourceType: 'Trust Structure',
      notes: 'Fictional demo founder trust position.',
    },
    {
      id: 'demo-strategic-investor-a',
      holderName: 'Strategic Investor A',
      holderType: 'Strategic Investor',
      accountType: 'Corporate Account',
      brokerCustodian: 'Institutional Custodian',
      numberOfShares: 2800000,
      tradabilityStatus: 'Long-Term Held',
      lendingAvailability: 'Unknown',
      tokenizationStatus: 'Not Tokenized',
      lockUpStatus: 'Strategic Lock-up',
      confidenceLevel: 'Medium',
      sourceType: 'Custodian Statement',
      notes: 'Fictional demo strategic holder.',
    },
    {
      id: 'demo-tokenized-treasury-allocation',
      holderName: 'Tokenized Treasury Allocation',
      holderType: 'Tokenized Shares',
      accountType: 'Tokenized Custody',
      brokerCustodian: 'Token Custody Platform',
      numberOfShares: 1750000,
      tradabilityStatus: 'Tokenized',
      lendingAvailability: 'Not Available for Lending',
      tokenizationStatus: 'Locked On-Chain',
      lockUpStatus: 'Tokenization Lock-up',
      confidenceLevel: 'High',
      sourceType: 'Tokenized Wallet',
      notes: 'Fictional demo tokenized allocation removed from broker lending pool.',
    },
    {
      id: 'demo-long-term-friendly-holder',
      holderName: 'Long-Term Friendly Holder',
      holderType: 'Friendly Long-Term Holder',
      accountType: 'Nominee Account',
      brokerCustodian: 'Nominee Bank',
      numberOfShares: 2100000,
      tradabilityStatus: 'Long-Term Held',
      lendingAvailability: 'Not Available for Lending',
      tokenizationStatus: 'Not Tokenized',
      lockUpStatus: 'Voluntary Lock-up',
      confidenceLevel: 'Medium',
      sourceType: 'Known Friendly Holder',
      notes: 'Fictional demo friendly long-term holder.',
    },
    {
      id: 'demo-locked-custody-account',
      holderName: 'Locked Custody Account',
      holderType: 'Affiliated Entity',
      accountType: 'Locked Wallet',
      brokerCustodian: 'Restricted Custody',
      numberOfShares: 1250000,
      tradabilityStatus: 'Locked',
      lendingAvailability: 'Not Available for Lending',
      tokenizationStatus: 'Pending Tokenization',
      lockUpStatus: 'Voluntary Lock-up',
      confidenceLevel: 'Low',
      sourceType: 'Internal Estimate',
      notes: 'Fictional demo locked custody account.',
    },
  ];
}

export async function calculateFloatAdjustments(holdings: ManualHolding[]): Promise<FloatAdjustments> {
  const base = await baseMarketInputs();
  const sumWhere = (predicate: (holding: ManualHolding) => boolean) =>
    holdings.reduce((sum, holding) => sum + (predicate(holding) ? numeric(holding.numberOfShares) : 0), 0);

  const managementTypes = new Set(['CEO', 'CFO', 'Founder', 'Director', 'Management', 'Major Shareholder', 'Affiliated Entity', 'Treasury Related']);
  const managementControlledShares = sumWhere(holding => managementTypes.has(holding.holderType));
  const tokenizedShares = sumWhere(holding => holding.holderType === 'Tokenized Shares' || holding.holderType === 'Tokenized Holder' || holding.tokenizationStatus !== 'Not Tokenized' || holding.tradabilityStatus === 'Tokenized');
  const strategicLockedShares = sumWhere(holding => holding.lockUpStatus !== 'No Lock-up' || holding.holderType === 'Strategic Investor' || holding.holderType === 'Friendly Holder' || holding.holderType === 'Friendly Long-Term Holder');
  const unavailableForTradingShares = sumWhere(holding =>
    holding.holderType === 'Tokenized Shares' ||
    ['Long-Term Held', 'Restricted', 'Locked', 'Tokenized', 'Not Available for Trading'].includes(holding.tradabilityStatus) ||
    holding.lockUpStatus !== 'No Lock-up',
  );
  const unavailableForLendingShares = sumWhere(holding =>
    !['Tokenized Shares', 'Tokenized Holder'].includes(holding.holderType) && (
      holding.lendingAvailability === 'Not Available for Lending' ||
      holding.tokenizationStatus !== 'Not Tokenized' ||
      ['Locked', 'Tokenized', 'Not Available for Trading'].includes(holding.tradabilityStatus)
    ),
  );

  const estimatedRealTradableFloat = Math.max(0, base.officialFreeFloat - unavailableForTradingShares);
  const estimatedRealLendableFloat = Math.max(0, base.officialFreeFloat - unavailableForLendingShares - tokenizedShares);
  const officialShortInterestPercentFloat = base.officialFreeFloat ? (base.officialShortInterestShares / base.officialFreeFloat) * 100 : 0;
  const adjustedShortInterestRealFloat = estimatedRealTradableFloat ? (base.officialShortInterestShares / estimatedRealTradableFloat) * 100 : 0;
  const adjustedShortInterestLendableFloat = estimatedRealLendableFloat ? (base.officialShortInterestShares / estimatedRealLendableFloat) * 100 : 0;
  const floatReductionPercent = base.officialFreeFloat ? ((base.officialFreeFloat - estimatedRealTradableFloat) / base.officialFreeFloat) * 100 : 0;
  const lendingPoolReductionPercent = base.officialFreeFloat ? ((base.officialFreeFloat - estimatedRealLendableFloat) / base.officialFreeFloat) * 100 : 0;
  const internalAdjustedSqueezeScore = Math.max(0, Math.min(100, Math.round(58 + adjustedShortInterestRealFloat * 3.2 + lendingPoolReductionPercent * 0.45)));

  return {
    ...base,
    managementControlledShares,
    strategicLockedShares,
    tokenizedShares,
    unavailableForTradingShares,
    unavailableForLendingShares,
    estimatedRealTradableFloat,
    estimatedRealLendableFloat,
    officialShortInterestPercentFloat,
    adjustedShortInterestRealFloat,
    adjustedShortInterestLendableFloat,
    floatReductionPercent,
    lendingPoolReductionPercent,
    internalSqueezeRiskAdjustment: internalAdjustedSqueezeScore >= 80 ? 'High' : internalAdjustedSqueezeScore >= 65 ? 'Elevated' : 'Watch',
    internalAdjustedSqueezeScore,
  };
}

export async function readInternalFloatInputs() {
  return readImportFile<ManualHolding[]>('internal_float/manual_holdings.json');
}

export async function readInternalFloatAdjustments() {
  return readImportFile<FloatAdjustments>('internal_float/float_adjustments.json');
}

export async function readInternalFloatV2UserInputs(userId = 'demo-user', ticker = 'CURR'): Promise<InternalFloatV2UserInput> {
  return (await readInternalFloatV2UserInputSource(userId, ticker)).userInput;
}

export async function readInternalFloatV2UserInputSource(userId = 'demo-user', ticker = 'CURR'): Promise<InternalFloatV2UserInputReadResult> {
  const normalizedTicker = ticker.toUpperCase();
  const paths = internalFloatV2UserInputPaths(normalizedTicker);
  for (const path of paths) {
    try {
      const envelope = await readImportFile<InternalFloatV2UserInputsEnvelope>(path);
      const users = Array.isArray(envelope.data?.users) ? envelope.data.users : [];
      const userInput = users.find(row => row.userId === userId && row.ticker.toUpperCase() === normalizedTicker)
        ?? users.find(row => row.ticker.toUpperCase() === normalizedTicker)
        ?? users[0]
        ?? defaultInternalFloatV2UserInput;
      return { envelope, path, userInput, usedDefault: !users.length };
    } catch {
      // Continue to the legacy demo path before falling back to defaults.
    }
  }
  return { envelope: null, path: paths[0], userInput: defaultInternalFloatV2UserInput, usedDefault: true };
}

export async function saveInternalFloatInputs(holdings: ManualHolding[]) {
  const importedAt = new Date().toISOString();
  const normalizedHoldings = holdings.map(holding => holding.holderType === 'Tokenized Shares'
    ? {
      ...holding,
      tradabilityStatus: 'Not Available for Trading',
      lendingAvailability: 'Not Available for Lending',
      tokenizationStatus: holding.tokenizationStatus === 'Not Tokenized' ? 'Tokenized' : holding.tokenizationStatus,
    }
    : holding);
  const normalizedAdjustments = await calculateFloatAdjustments(normalizedHoldings);
  const tokenized = normalizedHoldings.filter(holding => holding.holderType === 'Tokenized Shares' || holding.tokenizationStatus !== 'Not Tokenized' || holding.tradabilityStatus === 'Tokenized');
  const enrichHolding = (holding: ManualHolding) => ({
    ...holding,
    calculatedPercentageOfSharesOutstanding: normalizedAdjustments.officialSharesOutstanding
      ? (numeric(holding.numberOfShares) / normalizedAdjustments.officialSharesOutstanding) * 100
      : 0,
  });
  const enrichedHoldings = normalizedHoldings.map(enrichHolding);
  const lending = normalizedHoldings.map(holding => ({
    id: holding.id,
    holderName: holding.holderName,
    numberOfShares: holding.numberOfShares,
    confidenceLevel: holding.confidenceLevel,
    sourceType: holding.sourceType,
    lendingAvailability: holding.lendingAvailability,
    estimatedUnavailableForLending: holding.holderType === 'Tokenized Shares' || holding.lendingAvailability === 'Not Available for Lending' || holding.tokenizationStatus !== 'Not Tokenized',
  }));

  writeEnvelope('internal_float/manual_holdings.json', {
    ticker: 'CURR',
    asOfDate: '2026-05-27',
    importedAt,
    source: 'Manual demo seed and portal edits',
    sourcePlatform: 'Internal Management Input',
    recordType: 'manualHoldings',
    category: 'internal_float',
    recordCount: holdings.length,
    status: 'ready',
    notes: 'Private management estimates. Demo environment stores rows in import_data for review.',
    data: enrichedHoldings,
  });
  writeEnvelope('internal_float/float_adjustments.json', {
    ticker: 'CURR',
    asOfDate: '2026-05-27',
    importedAt,
    source: 'Calculated from public market data and internal management input',
    sourcePlatform: 'Public Market Data + Internal Management Input',
    recordType: 'floatAdjustments',
    category: 'internal_float',
    recordCount: 1,
    status: 'ready',
    notes: 'Calculated estimates for internal analysis only.',
    data: normalizedAdjustments,
  });
  writeEnvelope('internal_float/tokenized_shares.json', {
    ticker: 'CURR',
    asOfDate: '2026-05-27',
    importedAt,
    source: 'Manual management input',
    sourcePlatform: 'Internal Management Input',
    recordType: 'tokenizedShares',
    category: 'internal_float',
    recordCount: tokenized.length,
    status: 'ready',
    notes: 'Subset of manual holdings marked as tokenized, pending tokenization, locked on-chain, or removed from broker lending pool.',
    data: tokenized.map(enrichHolding),
  });
  writeEnvelope('internal_float/lending_availability.json', {
    ticker: 'CURR',
    asOfDate: '2026-05-27',
    importedAt,
    source: 'Manual management input',
    sourcePlatform: 'Internal Management Input',
    recordType: 'lendingAvailability',
    category: 'internal_float',
    recordCount: lending.length,
    status: 'ready',
    notes: 'Management-provided estimate of lending availability by holder/account.',
    data: lending,
  });
  writeEnvelope('internal_float/internal_float_analysis.json', {
    ticker: 'CURR',
    asOfDate: '2026-05-27',
    importedAt,
    source: 'Calculated from public market data and internal management input',
    sourcePlatform: 'Internal Management Input',
    recordType: 'internalFloatAnalysis',
    category: 'internal_float',
    recordCount: 1,
    status: 'ready',
    notes: 'Executive-style internal estimate, not legal, investment, or regulatory advice.',
    data: {
      summary: 'Based on management-provided internal inputs, the estimated real tradable float may be materially lower than the official free float. This internal management view suggests public short interest may understate pressure when locked, tokenized, and long-term controlled shares are removed from the active float estimate.',
      riskNotes: [
        'Estimated adjusted float is based on manual inputs and is not based solely on public market data.',
        'Tokenized or locked holdings may reduce both active trading supply and broker lending availability.',
        'Adjusted short interest percentages should be treated as internal estimates for management review only.',
      ],
      adjustments: normalizedAdjustments,
    },
  });

  return normalizedAdjustments;
}
