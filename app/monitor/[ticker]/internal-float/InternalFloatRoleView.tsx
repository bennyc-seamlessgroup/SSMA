'use client';

import { useEffect, useState } from 'react';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { ApiDevelopmentTabs } from '@/components/ApiDevelopmentTabs';
import { ApiSourceTags } from '@/components/ApiSourceTags';
import { cachedAuthenticatedFetch, getAuthenticatedProfile } from '@/lib/auth-client';
import {
  demoInsiderSuggestions,
  demoInternalFloatUserInputs,
  sampleTraditionalCustodyRows,
} from '@/lib/internal-float-demo';
import type { FloatAdjustments, InternalFloatAuditEntry, InternalFloatUserInput, ManagementSuggestionDecision } from '@/lib/internal-float-types';
import {
  managementSuggestionDecisionsFromAuditLog,
  mergeManagementSuggestionDecisions,
} from '@/lib/internal-float-suggestion-decisions';
import type { ManagementHoldingInputRecord } from '@/lib/operations/data-types';
import { normalizeTicker } from '@/lib/ticker-data';
import { InternalFloatClient, type InsiderSuggestionSource, type InstitutionalOwnershipOverview } from './InternalFloatClient';
import { isPublicDemoProfile } from '@/lib/public-demo';

type OwnershipCurrent = {
  issuedShare?: number;
  institutionalSharesLong?: number;
  publicFloat?: { shares?: number | null };
};

type InternalFloatCurrent = {
  issuedShare?: number;
  institutionalSharesLong?: number;
  realTradableFloat?: { shares?: number; percentOfIssuedShare?: number };
  managementStrategicHoldings?: { shares?: number; records?: Array<Record<string, unknown>> };
  tokenizedShares?: { shares?: number; records?: Array<Record<string, unknown>> };
  collateralizedShares?: { shares?: number; records?: Array<Record<string, unknown>> };
  suggestedChanges?: InsiderSuggestionSource[];
};

type InternalFloatInputs = {
  managementStrategicHoldings?: { records?: Array<Record<string, unknown>> };
  managementSuggestionDecisions?: { records?: ManagementSuggestionDecision[] };
  auditLog?: InternalFloatAuditEntry[];
  tokenizedShares?: { records?: Array<Record<string, unknown>> };
  collateralizedShares?: { records?: Array<Record<string, unknown>> };
  privateFriendlyHolders?: { shares?: number; ratio?: number };
};

type ManagementHoldingsResponse =
  | ManagementHoldingInputRecord[]
  | { records?: ManagementHoldingInputRecord[]; data?: { records?: ManagementHoldingInputRecord[] } };

function managementHoldingRecords(payload: ManagementHoldingsResponse) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.records)) return payload.records;
  if (Array.isArray(payload.data?.records)) return payload.data.records;
  return [];
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === 'fulfilled' ? result.value : fallback;
}

function settledStatus(result: PromiseSettledResult<unknown>) {
  if (result.status === 'fulfilled') return 'Connected';
  return `Error: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`;
}

const liveSeedAdjustments: FloatAdjustments = {
  officialSharesOutstanding: 0,
  officialFreeFloat: 0,
  officialShortInterestShares: 0,
  managementControlledShares: 0,
  strategicLockedShares: 0,
  tokenizedShares: 0,
  unavailableForTradingShares: 0,
  unavailableForLendingShares: 0,
  estimatedRealTradableFloat: 0,
  estimatedRealLendableFloat: 0,
  officialShortInterestPercentFloat: 0,
  adjustedShortInterestRealFloat: 0,
  adjustedShortInterestLendableFloat: 0,
  floatReductionPercent: 0,
  lendingPoolReductionPercent: 0,
  internalSqueezeRiskAdjustment: 'N/A',
  internalAdjustedSqueezeScore: 0,
};

function LiveInternalFloat({ ticker, demoMode = false }: { ticker: string; demoMode?: boolean }) {
  const [payloads, setPayloads] = useState<{
    ownership: OwnershipCurrent;
    current: InternalFloatCurrent;
    tickerInputs: InternalFloatInputs;
    userInputs: InternalFloatInputs;
    managementHoldings: ManagementHoldingInputRecord[];
  } | null>(null);
  const [sourceStatuses, setSourceStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPayloads(null);
    setSourceStatuses({});
    Promise.allSettled([
      cachedAuthenticatedFetch<OwnershipCurrent>(`/market-data/current?ticker=${encodeURIComponent(ticker)}&category=ownership-current`),
      cachedAuthenticatedFetch<InternalFloatCurrent>(`/market-data/current?ticker=${encodeURIComponent(ticker)}&category=internal-float-current-user`),
      cachedAuthenticatedFetch<InternalFloatInputs>(`/manual-input/internal-float-inputs-ticker?ticker=${encodeURIComponent(ticker)}`),
      cachedAuthenticatedFetch<InternalFloatInputs>(`/manual-input/internal-float-inputs-user?ticker=${encodeURIComponent(ticker)}`),
      cachedAuthenticatedFetch<ManagementHoldingsResponse>(`/manual-input/management-holdings?ticker=${encodeURIComponent(ticker)}`),
    ]).then(([ownershipResult, currentResult, tickerInputsResult, userInputsResult, managementHoldingsResult]) => {
      if (cancelled) return;
      const managementHoldings = settledValue<ManagementHoldingsResponse>(managementHoldingsResult, []);
      setPayloads({
        ownership: settledValue(ownershipResult, {}),
        current: settledValue(currentResult, {}),
        tickerInputs: settledValue(tickerInputsResult, {}),
        userInputs: settledValue(userInputsResult, {}),
        managementHoldings: managementHoldingRecords(managementHoldings),
      });
      setSourceStatuses({
        ownership: settledStatus(ownershipResult),
        current: settledStatus(currentResult),
        tickerInputs: settledStatus(tickerInputsResult),
        userInputs: settledStatus(userInputsResult),
        managementHoldings: settledStatus(managementHoldingsResult),
      });
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [ticker]);

  if (loading) return <PortalPageLoading variant="internalFloat" />;
  if (!payloads) return null;

  const userPrivateRecords = demoMode
    ? demoInternalFloatUserInputs.privateHoldings
    : payloads.userInputs.managementStrategicHoldings?.records ?? [];
  const privateRecords = userPrivateRecords
    .map((row, index) => ({
      id: String(row.id ?? `input-${index}`),
      holderName: String(row.holderName ?? ''),
      category: String(row.category ?? 'Other'),
      shares: Math.max(0, Number(row.shares ?? 0)),
      includeInDeduction: row.includeInDeduction !== false,
      notes: String(row.notes ?? ''),
    }))
    .filter(row => row.holderName && row.shares > 0);
  const tokenRecords = payloads.tickerInputs.tokenizedShares?.records ?? [];
  const collateralRecords = payloads.tickerInputs.collateralizedShares?.records ?? [];
  const userAuditLog = payloads.userInputs.auditLog ?? [];
  const apiInputs: InternalFloatUserInput = {
    userId: `workspace:${ticker}`,
    workspaceId: ticker,
    ticker,
    privateHoldings: privateRecords.map((row, index) => ({
      id: String(row.id ?? `holding-${index}`),
      holderName: String(row.holderName ?? ''),
      category: String(row.category ?? 'Other'),
      shares: Number(row.shares ?? 0),
      includeInDeduction: row.includeInDeduction !== false,
      notes: String(row.notes ?? ''),
    })),
    managementSuggestionDecisions: demoMode
      ? demoInternalFloatUserInputs.managementSuggestionDecisions
      : mergeManagementSuggestionDecisions(
        managementSuggestionDecisionsFromAuditLog(userAuditLog),
        payloads.userInputs.managementSuggestionDecisions?.records,
      ),
    auditLog: demoMode ? [] : userAuditLog,
    privateFriendlyHolders: demoMode
      ? demoInternalFloatUserInputs.privateFriendlyHolders
      : payloads.userInputs.privateFriendlyHolders,
    custodyRows: sampleTraditionalCustodyRows,
    tokenChains: tokenRecords.map((row, index) => ({ id: String(row.id ?? `token-${index}`), chain: String(row.chain ?? ''), shares: Number(row.shares ?? 0), provider: String(row.provider ?? '') })),
    collateralChains: collateralRecords.map((row, index) => ({ id: String(row.id ?? `collateral-${index}`), chain: String(row.chain ?? ''), shares: Number(row.shares ?? 0), protocol: String(row.protocol ?? '') })),
  };
  const institutionalOverview: InstitutionalOwnershipOverview = {
    shares_outstanding: payloads.current.issuedShare ?? payloads.ownership.issuedShare,
    institutional_shares_long: payloads.current.institutionalSharesLong ?? payloads.ownership.institutionalSharesLong,
    public_float_shares: payloads.ownership.publicFloat?.shares,
  };
  const insiderSuggestionSources = (demoMode
    ? demoInsiderSuggestions
    : [
        ...(payloads.current.suggestedChanges ?? []),
        ...payloads.managementHoldings
          .filter(row => row.showAsSuggestion)
          .map(row => ({ ...row, name: row.holderName })),
      ])
    .filter(row => !row.status || row.status === 'pending')
    .filter((row, index, rows) => !row.id || rows.findIndex(candidate => candidate.id === row.id) === index)
    .map(row => ({ ...row, name: row.name ?? row.holderName ?? 'Unknown holder' }));

  return (
    <>
      <ApiSourceTags sources={[
        { endpoint: 'GET /market-data/current?category=ownership-current', label: 'Issued shares & ownership' },
        { endpoint: 'GET /market-data/current?category=internal-float-current-user', label: 'User float snapshot' },
        { endpoint: 'GET /manual-input/internal-float-inputs-ticker', label: 'Ticker float inputs' },
        { endpoint: 'GET /manual-input/internal-float-inputs-user', label: 'User float inputs' },
        { endpoint: 'GET /manual-input/management-holdings', label: 'Strategic holdings' },
      ]} />
      <InternalFloatClient
        key={`${demoMode ? 'demo' : 'live'}-${ticker}`}
        ticker={ticker}
        initialHoldings={[]}
        initialAdjustments={liveSeedAdjustments}
        initialUserInputs={apiInputs}
        institutionalOverview={institutionalOverview}
        custodyDataIsSample
        insiderSuggestionSources={insiderSuggestionSources}
        demoMode={demoMode}
      />
      <section className="terminal-section import-data-dev-panel">
        <div className="terminal-section__head"><div><span>Development Data</span><h2>Internal Float API Data</h2><p className="section-subtitle">Live API payloads only. No local or S3 JSON fallback is used.</p></div></div>
        <ApiDevelopmentTabs sources={[
          { id: 'ownership-current', title: 'Ownership Current', endpoint: `GET /market-data/current?ticker=${encodeURIComponent(ticker)}&category=ownership-current`, source: 'API Gateway', payload: payloads.ownership, status: sourceStatuses.ownership },
          { id: 'internal-float-current-user', title: 'User Float Current', endpoint: `GET /market-data/current?ticker=${encodeURIComponent(ticker)}&category=internal-float-current-user`, source: 'API Gateway', payload: payloads.current, status: sourceStatuses.current },
          { id: 'internal-float-inputs-ticker', title: 'Ticker Float Inputs', endpoint: `GET /manual-input/internal-float-inputs-ticker?ticker=${encodeURIComponent(ticker)}`, source: 'API Gateway', payload: payloads.tickerInputs, status: sourceStatuses.tickerInputs },
          { id: 'internal-float-inputs-user', title: 'User Float Inputs', endpoint: `GET /manual-input/internal-float-inputs-user?ticker=${encodeURIComponent(ticker)}`, source: 'API Gateway', payload: payloads.userInputs, status: sourceStatuses.userInputs },
          { id: 'management-holdings', title: 'Management Holdings', endpoint: `GET /manual-input/management-holdings?ticker=${encodeURIComponent(ticker)}`, source: 'API Gateway', payload: payloads.managementHoldings, status: sourceStatuses.managementHoldings },
        ]} />
      </section>
    </>
  );
}

export function InternalFloatRoleView({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAuthenticatedProfile()
      .then(profile => {
        if (!cancelled) {
          setRole(isPublicDemoProfile(profile)
            ? 'DEMO'
            : String(profile.role ?? 'USER').trim().toUpperCase());
        }
      })
      .catch(() => {
        if (!cancelled) setRole('USER');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!role) return <PortalPageLoading variant="internalFloat" />;
  return <LiveInternalFloat ticker={normalizedTicker} demoMode={role === 'DEMO'} />;
}
