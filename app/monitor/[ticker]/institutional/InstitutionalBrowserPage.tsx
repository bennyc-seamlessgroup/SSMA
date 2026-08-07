'use client';

import { PortalPageLoading } from '@/components/PortalPageLoading';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';
import { authenticatedFetch, cachedAuthenticatedFetch, invalidateAuthenticatedFetchCache } from '@/lib/auth-client';
import type { InstitutionalHolding } from '@/lib/types';
import { normalizeTicker } from '@/lib/ticker-data';
import { useEffect, useState } from 'react';
import { InstitutionalTabs } from './InstitutionalTabs';
import type { ActivistFiling } from './ActivistFilingsTable';
import { InstitutionalDevTables } from './InstitutionalDevTables';
import { InstitutionalOverview, type InstitutionalOverviewData } from './InstitutionalOverview';
import { ApiSourceTags } from '@/components/ApiSourceTags';
import { mergeInternalFloatHoldings } from '@/lib/internal-float-holdings';
import type { InternalFloatPrivateHolding } from '@/lib/internal-float-types';

type SecurityOwnershipRow = {
  name?: string | null;
  holderName?: string | null;
  formType?: string | null;
  formTypeShort?: string | null;
  effectiveDate?: string | null;
  fileDate?: string | null;
  ownershipPercent?: number | string | null;
  ownershipPercentChange?: number | string | null;
  shares?: number | string | null;
  sharesChange?: number | string | null;
  sharesPercentChange?: number | string | null;
  percentChange?: number | string | null;
  value?: number | string | null;
  valueChange?: number | string | null;
  valuePercentChange?: number | string | null;
  percentValueChange?: number | string | null;
  costBasis?: number | string | null;
  url?: string | null;
};

type ActivistFilingRow = {
  name?: string | null;
  holderName?: string | null;
  formType?: string | null;
  effectiveDate?: string | null;
  fileDate?: string | null;
  ownershipPercent?: number | string | null;
  ownershipPercentChange?: number | string | null;
  shares?: number | string | null;
  sharesChange?: number | string | null;
  sharesPercentChange?: number | string | null;
  percentChange?: number | string | null;
  url?: string | null;
};

type OwnershipCurrent = {
  generatedAt?: string;
  updatedAt?: string;
  issuedShare?: number;
  institutionalOwners?: number;
  institutionalSharesLong?: number;
  institutionalHoldingPercent?: number;
  institutionalValue?: number;
  strategicEntities?: { shares?: number | null; percent?: number | null; records?: Array<Record<string, unknown>> };
  publicFloat?: { shares?: number | null; percent?: number | null };
  institutionBreakdown?: Array<Record<string, unknown>>;
};

type OwnershipHistory = { generatedAt?: string; records?: Array<Record<string, unknown>> };

type InternalFloatCurrent = {
  generatedAt?: string;
  updatedAt?: string;
  managementStrategicHoldings?: {
    shares?: number | null;
    records?: Array<Record<string, unknown>>;
  };
};

type InternalFloatCurrentEnvelope = InternalFloatCurrent & {
  data?: InternalFloatCurrent | { 'internal-float-current-user'?: InternalFloatCurrent };
  'internal-float-current-user'?: InternalFloatCurrent;
};

type InternalFloatInputsResponse = {
  managementStrategicHoldings?: { records?: Array<Record<string, unknown>> };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeInternalFloatCurrent(payload: unknown): InternalFloatCurrent {
  if (!isRecord(payload)) return {};
  const envelope = payload as InternalFloatCurrentEnvelope;
  const nestedData = isRecord(envelope.data) ? envelope.data as Record<string, unknown> : null;
  const candidates = [
    envelope['internal-float-current-user'],
    nestedData?.['internal-float-current-user'],
    nestedData,
    envelope,
  ];
  return (candidates.find(candidate => isRecord(candidate) && (
    'managementStrategicHoldings' in candidate
    || 'issuedShare' in candidate
    || 'realTradableFloat' in candidate
  )) as InternalFloatCurrent | undefined) ?? {};
}

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

function consolidatedStrategicTotal(snapshot: InternalFloatCurrent | null) {
  const holdings = snapshot?.managementStrategicHoldings;
  const aggregate = finiteNumber(holdings?.shares);
  const records = Array.isArray(holdings?.records) ? holdings.records : [];
  const activeRecords = records.filter(record => {
    if (!isRecord(record)) return false;
    return record.deletedAt == null && record.includeInDeduction !== false;
  });
  if (!activeRecords.length) return aggregate;

  const recordTotal = activeRecords.reduce((sum, record) => sum + (finiteNumber(record.shares) ?? 0), 0);
  return aggregate == null || Math.abs(aggregate - recordTotal) > 0.5 ? recordTotal : aggregate;
}

function formatNumber(value: unknown, options?: Intl.NumberFormatOptions) {
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return value ? String(value) : 'N/A';
  return numeric.toLocaleString('en-US', options);
}

function formatPercent(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return value ? String(value) : 'N/A';
  return `${numeric.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

function changeType(value: unknown): InstitutionalHolding['change_type'] {
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return 'unchanged';
  if (numeric > 0) return 'increased';
  if (numeric < 0) return 'reduced';
  return 'unchanged';
}

function ownershipChangeType(row: SecurityOwnershipRow): InstitutionalHolding['change_type'] {
  const sharesChange = typeof row.sharesChange === 'number' ? row.sharesChange : Number(String(row.sharesChange ?? '').replace(/,/g, ''));
  const rawPctChange = row.percentChange ?? row.sharesPercentChange;
  const pctChange = typeof rawPctChange === 'number' ? rawPctChange : Number(String(rawPctChange ?? '').replace(/,/g, ''));
  if (Number.isFinite(pctChange) && pctChange <= -100) return 'exited';
  return changeType(Number.isFinite(sharesChange) ? sharesChange : row.sharesChange);
}

export function InstitutionalBrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const [current, setCurrent] = useState<OwnershipCurrent | null>(null);
  const [history, setHistory] = useState<OwnershipHistory | null>(null);
  const [internalFloatCurrent, setInternalFloatCurrent] = useState<InternalFloatCurrent | null>(null);
  const [strategicHoldings, setStrategicHoldings] = useState<InternalFloatPrivateHolding[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const consolidatedStrategicShares = consolidatedStrategicTotal(internalFloatCurrent);
  const expectedUserStrategicShares = strategicHoldings
    .filter(row => row.includeInDeduction !== false)
    .reduce((sum, row) => sum + Number(row.shares ?? 0), 0);
  const userScopedStrategicShares = consolidatedStrategicShares != null
    && Math.abs(consolidatedStrategicShares - expectedUserStrategicShares) <= 0.5
    ? consolidatedStrategicShares
    : null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      cachedAuthenticatedFetch<OwnershipCurrent>(`/market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=ownership-current`),
      cachedAuthenticatedFetch<OwnershipHistory>(`/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=ownership-history`),
      cachedAuthenticatedFetch<unknown>(`/market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=internal-float-current-user`),
      cachedAuthenticatedFetch<InternalFloatInputsResponse>(`/manual-input/internal-float-inputs-user?ticker=${encodeURIComponent(normalizedTicker)}`),
    ]).then(([nextCurrent, nextHistory, nextInternalFloatCurrent, nextInternalFloatInputs]) => {
      if (cancelled) return;
      setCurrent(nextCurrent);
      setHistory(nextHistory);
      setInternalFloatCurrent(normalizeInternalFloatCurrent(nextInternalFloatCurrent));
      setStrategicHoldings(mergeInternalFloatHoldings(
        nextInternalFloatInputs.managementStrategicHoldings?.records ?? [],
        [],
      ));
    }).catch(cause => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load ownership data.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [normalizedTicker]);

  useEffect(() => {
    const expectedShares = expectedUserStrategicShares;
    const consolidatedShares = consolidatedStrategicShares ?? 0;
    if (!strategicHoldings.length || expectedShares === consolidatedShares) return;

    let cancelled = false;
    let attempts = 0;
    const path = `/market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=internal-float-current-user`;
    const refresh = async () => {
      attempts += 1;
      try {
        const next = normalizeInternalFloatCurrent(await authenticatedFetch(path, { cache: 'no-store' }));
        if (cancelled) return;
        setInternalFloatCurrent(next);
        if ((consolidatedStrategicTotal(next) ?? 0) === expectedShares || attempts >= 12) {
          invalidateAuthenticatedFetchCache('/market-data/current');
          clearInterval(timer);
        }
      } catch {
        if (attempts >= 12) clearInterval(timer);
      }
    };
    const timer = window.setInterval(refresh, 15_000);
    void refresh();
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [consolidatedStrategicShares, expectedUserStrategicShares, normalizedTicker, strategicHoldings.length]);

  if (loading) return <PortalPageLoading variant="ownership" />;
  if (error || !current || !history) {
    return <div className="page"><section className="panel"><h2>Ownership data unavailable</h2><p>{error}</p></section></div>;
  }

  const allHistoryRows = Array.isArray(history.records) ? history.records : [];
  const securityRows = allHistoryRows.filter(row => !String(row.sourceType ?? '').toLowerCase().includes('activist')) as SecurityOwnershipRow[];
  const activistRows = allHistoryRows.filter(row => String(row.sourceType ?? '').toLowerCase().includes('activist')) as ActivistFilingRow[];
  const managementRecords = strategicHoldings;
  const institutionBars = (current.institutionBreakdown ?? []).map(row => ({
    name: String(row.holderName ?? row.name ?? 'Unknown holder'),
    shares: Number(row.shares ?? 0),
    value: Number(row.value ?? 0),
    ownershipPercentOfInstitutional: Number(row.percentOfInstitutionalShares ?? row.ownershipPercentOfInstitutional ?? 0),
    ownershipPercentOfSharesOutstanding: Number(row.percentOfIssuedShare ?? row.ownershipPercentOfSharesOutstanding ?? 0),
  }));
  const issuedShare = Number(current.issuedShare ?? 0);
  const institutionalShares = Number(current.institutionalSharesLong ?? 0);
  const strategicShares = userScopedStrategicShares ?? 0;
  const publicFloatShares = Math.max(0, issuedShare - institutionalShares - strategicShares);
  const overviewData: InstitutionalOverviewData = {
    overview: {
      shares_outstanding: current.issuedShare,
      institutional_owners: current.institutionalOwners,
      institutional_shares_long: current.institutionalSharesLong,
      institutional_ownership_percent: current.institutionalHoldingPercent,
      institutional_value_thousands_usd: current.institutionalValue,
      public_float_shares: publicFloatShares,
      public_float_percent: issuedShare > 0 ? publicFloatShares / issuedShare * 100 : 0,
      strategic_entities_shares: strategicShares,
      strategic_entities_percent: issuedShare > 0 ? strategicShares / issuedShare * 100 : 0,
    },
    institution_bars: institutionBars,
  };
  const holdings: InstitutionalHolding[] = securityRows.map((row, index) => ({
    id: `import-ownership-${index}`,
    company_id: `company-${normalizedTicker}`,
    fund_name: row.holderName ?? row.name ?? 'Unknown holder',
    shares: formatNumber(row.shares),
    market_value: formatNumber(row.value),
    change_type: ownershipChangeType(row),
    filing_date: row.fileDate ?? 'N/A',
    source: row.formTypeShort ?? row.formType ?? 'Imported filing',
    ownership_percent: formatPercent(row.ownershipPercent),
    shares_change: formatNumber(row.sharesChange),
    shares_change_percent: formatPercent(row.percentChange ?? row.sharesPercentChange),
    value_change: formatNumber(row.valueChange),
    value_change_percent: formatPercent(row.percentValueChange ?? row.valuePercentChange),
    form_type: row.formType ?? undefined,
    effective_date: row.effectiveDate ?? undefined,
    owner_url: row.url ?? undefined,
    cost_basis: formatNumber(row.costBasis),
    source_type: 'fintel',
    source_label: 'GET /market-data/history?category=ownership-history',
  }));
  const activistFilings: ActivistFiling[] = activistRows.map((row, index) => ({
    id: `activist-filing-${index}`,
    name: row.holderName ?? row.name ?? 'Unknown holder',
    formType: row.formType ?? 'N/A',
    fileDate: row.fileDate ?? 'N/A',
    effectiveDate: row.effectiveDate ?? 'N/A',
    ownershipPercent: formatPercent(row.ownershipPercent),
    ownershipPercentChange: formatPercent(row.ownershipPercentChange),
    shares: formatNumber(row.shares),
    sharesChange: formatNumber(row.sharesChange),
    sharesPercentChange: formatPercent(row.percentChange ?? row.sharesPercentChange),
    url: row.url ?? undefined,
  }));
  return (
    <div className="page institutional-page">
      <InstitutionalOverview data={overviewData} ticker={normalizedTicker} managementRecords={managementRecords} />
      <section className="panel">
        <ApiSourceTags sources={[
          { endpoint: 'GET /market-data/history?category=ownership-history', label: 'Ownership filings' },
          { endpoint: 'GET /market-data/current?category=internal-float-current-user', label: 'Consolidated strategic total' },
          { endpoint: 'GET /manual-input/internal-float-inputs-user', label: 'Strategic entities' },
        ]} />
        <InstitutionalTabs holdings={holdings} activistFilings={activistFilings} ticker={normalizedTicker} companyName={normalizedTicker} />
      </section>
      <PageDisclaimerNotice noticeKey="ownership" disclaimerKey="regulatoryFiling" />
      <InstitutionalDevTables
        overviewFile="GET /market-data/current?category=ownership-current"
        securityFile="GET /market-data/history?category=ownership-history"
        activistFile="GET /market-data/history?category=ownership-history"
        ownershipCurrent={(current ?? null) as Record<string, unknown> | null}
        overview={(overviewData.overview ?? null) as Record<string, unknown> | null}
        internalFloatCurrent={(internalFloatCurrent ?? null) as Record<string, unknown> | null}
        expectedUserStrategicShares={expectedUserStrategicShares}
        userScopedStrategicShares={userScopedStrategicShares}
        ownershipStructure={(overviewData.ownership_structure ?? []) as Array<Record<string, unknown>>}
        insiderBars={(overviewData.insider_bars ?? []) as Array<Record<string, unknown>>}
        institutionBars={institutionBars as Array<Record<string, unknown>>}
        publicFloatBreakdown={(overviewData.public_float_breakdown ?? []) as Array<Record<string, unknown>>}
        securityRows={securityRows as Array<Record<string, unknown>>}
        activistRows={activistRows as Array<Record<string, unknown>>}
        managementHoldings={managementRecords as Array<Record<string, unknown>>}
      />
    </div>
  );
}
