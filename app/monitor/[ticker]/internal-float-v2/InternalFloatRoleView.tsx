'use client';

import { useEffect, useState } from 'react';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { usePublicImportFiles } from '@/components/usePublicImportFiles';
import { getAuthenticatedProfile } from '@/lib/auth-client';
import {
  demoInsiderSuggestions,
  demoInstitutionalOverview,
  demoInternalFloatAdjustments,
  demoInternalFloatHoldings,
  demoInternalFloatUserInputs,
} from '@/lib/internal-float-demo';
import type { FloatAdjustments, InternalFloatV2UserInput } from '@/lib/internal-float';
import { institutionalOverviewFile, managementHoldingsInputFile, normalizeTicker } from '@/lib/ticker-data';
import { InternalFloatV2Client, type InsiderSuggestionSource, type InstitutionalOwnershipOverview } from './InternalFloatV2Client';
import { isPublicDemoSession } from '@/lib/public-demo';

type OwnershipEnvelope = {
  data?: {
    overview?: InstitutionalOwnershipOverview;
    insider_bars?: InsiderSuggestionSource[];
  };
};

type ManagementHoldingsEnvelope = {
  records?: InsiderSuggestionSource[];
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
  const ownershipFile = institutionalOverviewFile(ticker);
  const managementFile = managementHoldingsInputFile(ticker);
  const { data, error, loading } = usePublicImportFiles([ownershipFile, managementFile]);

  if (loading && !data) return <PortalPageLoading variant="internalFloat" />;
  if (error || !data) {
    return <section className="panel"><h2>Internal Float data unavailable</h2><p>{error ?? 'Unable to load ownership data.'}</p></section>;
  }

  const envelope = (data[ownershipFile] ?? {}) as OwnershipEnvelope;
  const ownershipData = envelope.data ?? {};
  const managementEnvelope = ((data[managementFile] as { data?: ManagementHoldingsEnvelope })?.data ?? data[managementFile] ?? {}) as ManagementHoldingsEnvelope;
  const emptyInputs: InternalFloatV2UserInput = {
    userId: `workspace:${ticker}`,
    workspaceId: ticker,
    ticker,
    privateHoldings: [],
    custodyRows: [],
    tokenChains: [],
    collateralChains: [],
  };

  return (
    <InternalFloatV2Client
      key={`live-${ticker}`}
      ticker={ticker}
      initialHoldings={[]}
      initialAdjustments={liveSeedAdjustments}
      initialUserInputs={emptyInputs}
      institutionalOverview={ownershipData.overview}
      insiderSuggestionSources={(managementEnvelope.records ?? [])
        .filter(row => row.status === 'pending')
        .map(row => ({ ...row, name: row.name ?? row.holderName ?? 'Unknown holder' }))}
    />
  );
}

function DemoInternalFloat() {
  return (
    <InternalFloatV2Client
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
