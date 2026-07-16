'use client';

import { useEffect, useState } from 'react';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { ImportDataTable } from '@/components/ImportDataTable';
import { authenticatedFetch, getAuthenticatedProfile } from '@/lib/auth-client';
import {
  demoInsiderSuggestions,
  demoInstitutionalOverview,
  demoInternalFloatAdjustments,
  demoInternalFloatHoldings,
  demoInternalFloatUserInputs,
} from '@/lib/internal-float-demo';
import type { FloatAdjustments, InternalFloatUserInput } from '@/lib/internal-float-types';
import { normalizeTicker } from '@/lib/ticker-data';
import { InternalFloatClient, type InsiderSuggestionSource, type InstitutionalOwnershipOverview } from './InternalFloatClient';
import { isPublicDemoSession } from '@/lib/public-demo';

type OwnershipCurrent = {
  issuedShare?: number;
  institutionalSharesLong?: number;
  publicFloat?: { shares?: number };
};

type InternalFloatCurrent = {
  issuedShare?: number;
  institutionalSharesLong?: number;
  realTradableFloat?: { shares?: number; percentOfIssuedShare?: number };
  managementStrategicHoldings?: { shares?: number; records?: Array<Record<string, unknown>> };
  tokenizedShares?: { shares?: number; records?: Array<Record<string, unknown>> };
  collateralizedShares?: { shares?: number; records?: Array<Record<string, unknown>> };
  suggestedChanges?: InsiderSuggestionSource[];
  auditLog?: InternalFloatUserInput['activityLog'];
};

type InternalFloatInputs = {
  managementStrategicHoldings?: { records?: Array<Record<string, unknown>> };
  tokenizedShares?: { records?: Array<Record<string, unknown>> };
  collateralizedShares?: { records?: Array<Record<string, unknown>> };
  auditLog?: InternalFloatUserInput['activityLog'];
};

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

function LiveInternalFloat({ ticker }: { ticker: string }) {
  const [payloads, setPayloads] = useState<{ ownership: OwnershipCurrent; current: InternalFloatCurrent; inputs: InternalFloatInputs } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      authenticatedFetch(`/market-data/current?ticker=${encodeURIComponent(ticker)}&category=ownership-current`) as Promise<OwnershipCurrent>,
      authenticatedFetch(`/market-data/current?ticker=${encodeURIComponent(ticker)}&category=internal-float-current`) as Promise<InternalFloatCurrent>,
      authenticatedFetch(`/manual-input/internal-float-inputs?ticker=${encodeURIComponent(ticker)}`) as Promise<InternalFloatInputs>,
    ]).then(([ownership, current, inputs]) => {
      if (!cancelled) setPayloads({ ownership, current, inputs });
    }).catch(cause => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load Internal Float API data.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [ticker]);

  if (loading) return <PortalPageLoading variant="internalFloat" />;
  if (error || !payloads) {
    return <section className="panel"><h2>Internal Float data unavailable</h2><p>{error ?? 'Unable to load ownership data.'}</p></section>;
  }

  const privateRecords = payloads.inputs.managementStrategicHoldings?.records ?? [];
  const tokenRecords = payloads.inputs.tokenizedShares?.records ?? [];
  const collateralRecords = payloads.inputs.collateralizedShares?.records ?? [];
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
    custodyRows: [],
    tokenChains: tokenRecords.map((row, index) => ({ id: String(row.id ?? `token-${index}`), chain: String(row.chain ?? ''), shares: Number(row.shares ?? 0), provider: String(row.provider ?? '') })),
    collateralChains: collateralRecords.map((row, index) => ({ id: String(row.id ?? `collateral-${index}`), chain: String(row.chain ?? ''), shares: Number(row.shares ?? 0), protocol: String(row.protocol ?? '') })),
    activityLog: payloads.inputs.auditLog ?? payloads.current.auditLog ?? [],
  };
  const institutionalOverview: InstitutionalOwnershipOverview = {
    shares_outstanding: payloads.current.issuedShare ?? payloads.ownership.issuedShare,
    institutional_shares_long: payloads.current.institutionalSharesLong ?? payloads.ownership.institutionalSharesLong,
    public_float_shares: payloads.ownership.publicFloat?.shares,
  };

  return (
    <>
      <InternalFloatClient
        key={`live-${ticker}`}
        ticker={ticker}
        initialHoldings={[]}
        initialAdjustments={liveSeedAdjustments}
        initialUserInputs={apiInputs}
        institutionalOverview={institutionalOverview}
        insiderSuggestionSources={(payloads.current.suggestedChanges ?? [])
          .filter(row => !row.status || row.status === 'pending')
          .map(row => ({ ...row, name: row.name ?? row.holderName ?? 'Unknown holder' }))}
      />
      <section className="terminal-section import-data-dev-panel">
        <div className="terminal-section__head"><div><span>Development Data</span><h2>Internal Float API Data</h2><p className="section-subtitle">Live API payloads only. No local or S3 JSON fallback is used.</p></div></div>
        <ImportDataTable
          columns={['endpoint', 'records', 'payload']}
          rows={[
            { endpoint: 'GET /market-data/current?category=ownership-current', records: '1', payload: JSON.stringify(payloads.ownership) },
            { endpoint: 'GET /market-data/current?category=internal-float-current', records: '1', payload: JSON.stringify(payloads.current) },
            { endpoint: 'GET /manual-input/internal-float-inputs', records: String(privateRecords.length + tokenRecords.length + collateralRecords.length), payload: JSON.stringify(payloads.inputs) },
          ]}
          pageSize={10}
        />
      </section>
    </>
  );
}

function DemoInternalFloat() {
  return (
    <InternalFloatClient
      key="demo-internal-float"
      ticker="CURR"
      initialHoldings={demoInternalFloatHoldings}
      initialAdjustments={demoInternalFloatAdjustments}
      initialUserInputs={demoInternalFloatUserInputs}
      institutionalOverview={demoInstitutionalOverview}
      insiderSuggestionSources={demoInsiderSuggestions}
      demoMode
    />
  );
}

export function InternalFloatRoleView({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (isPublicDemoSession()) {
      setRole('DEMO');
      return;
    }
    let cancelled = false;
    getAuthenticatedProfile()
      .then(profile => {
        if (!cancelled) setRole(String(profile.role ?? 'USER').trim().toUpperCase());
      })
      .catch(() => {
        if (!cancelled) setRole('USER');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!role) return <PortalPageLoading variant="internalFloat" />;
  if (role === 'DEMO') return <DemoInternalFloat />;
  return <LiveInternalFloat ticker={normalizedTicker} />;
}
