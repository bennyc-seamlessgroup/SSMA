'use client';

import { PortalPageLoading } from '@/components/PortalPageLoading';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';
import { authenticatedFetch, cachedAuthenticatedFetch, getAuthenticatedProfile, invalidateAuthenticatedFetchCache } from '@/lib/auth-client';
import type { InstitutionalHolding } from '@/lib/types';
import { normalizeTicker } from '@/lib/ticker-data';
import { useEffect, useState } from 'react';
import { InstitutionalTabs } from './InstitutionalTabs';
import type { ActivistFiling } from './ActivistFilingsTable';
import { InstitutionalDevTables } from './InstitutionalDevTables';
import { InstitutionalOverview, type InstitutionalOverviewData } from './InstitutionalOverview';
import { ApiSourceTags } from '@/components/ApiSourceTags';
import { mergeInternalFloatHoldings } from '@/lib/internal-float-holdings';
import { demoInternalFloatUserInputs } from '@/lib/internal-float-demo';
import type { InternalFloatPrivateHolding } from '@/lib/internal-float-types';
import { isPublicDemoProfile } from '@/lib/public-demo';
import { InstitutionalActivitySummary, type OwnershipSummaryCurrent } from './InstitutionalActivitySummary';
import { LatestInstitutionalFilings, type LatestInstitutionalFiling } from './LatestInstitutionalFilings';

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
  optionType?: string | null;
  type?: string | null;
  portAlloc?: number | string | null;
  url?: string | null;
  positionStatus?: string | null;
};

type ManualSecurityOwnershipRow = {
  fileDate?: string | null;
  effectiveDate?: string | null;
  source?: string | null;
  investor?: string | null;
  optionType?: string | null;
  type?: string | null;
  avgPriceEst?: number | string | null;
  shares?: number | string | null;
  sharesPct?: number | string | null;
  reportedValue?: number | string | null;
  valueChangePct?: number | string | null;
  portAlloc?: number | string | null;
  positionStatus?: string | null;
};

type ManualSecurityOwnershipDataset = {
  availableDates: string[];
  effectiveDate: string | null;
  endpoint: string;
  rows: ManualSecurityOwnershipRow[];
  error: string;
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
  snapshotDate?: string;
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
type MarketHistory = { generatedAt?: string; records?: Array<Record<string, unknown>> };

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

function availableOwnershipDates(payload: unknown) {
  if (!isRecord(payload)) return [];
  const nestedData = isRecord(payload.data) ? payload.data : null;
  const values = Array.isArray(payload.availableDates)
    ? payload.availableDates
    : Array.isArray(nestedData?.availableDates)
      ? nestedData.availableDates
      : [];
  return Array.from(new Set(values.map(value => String(value).trim()).filter(Boolean))).sort();
}

function manualOwnershipRows(payload: unknown): ManualSecurityOwnershipRow[] {
  if (Array.isArray(payload)) return payload.filter(isRecord) as ManualSecurityOwnershipRow[];
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.records)) return payload.records.filter(isRecord) as ManualSecurityOwnershipRow[];
  if (Array.isArray(payload.data)) return payload.data.filter(isRecord) as ManualSecurityOwnershipRow[];
  if (isRecord(payload.data) && Array.isArray(payload.data.records)) {
    return payload.data.records.filter(isRecord) as ManualSecurityOwnershipRow[];
  }
  return [];
}

async function loadAllManualSecurityOwnership(ticker: string): Promise<ManualSecurityOwnershipDataset> {
  const availableDatesEndpoint = `/manual-input/manual-security-ownership?ticker=${encodeURIComponent(ticker)}&action=available-dates`;
  try {
    const datesPayload = await authenticatedFetch(availableDatesEndpoint, { cache: 'no-store' });
    const availableDates = availableOwnershipDates(datesPayload);
    const effectiveDate = availableDates.at(-1) ?? null;
    if (!effectiveDate) {
      return { availableDates, effectiveDate: null, endpoint: availableDatesEndpoint, rows: [], error: '' };
    }

    const partitions = await Promise.allSettled(availableDates.map(async date => {
      const endpoint = `/manual-input/manual-security-ownership?ticker=${encodeURIComponent(ticker)}&effectiveDate=${encodeURIComponent(date)}`;
      const payload = await authenticatedFetch(endpoint, { cache: 'no-store' });
      return manualOwnershipRows(payload);
    }));
    const rows = partitions.flatMap(result => result.status === 'fulfilled' ? result.value : []);
    const failedPartitions = partitions.filter(result => result.status === 'rejected').length;
    const endpoint = `/manual-input/manual-security-ownership?ticker=${encodeURIComponent(ticker)}&effectiveDate={all-available-dates}`;
    return {
      availableDates,
      effectiveDate,
      endpoint,
      rows,
      error: failedPartitions
        ? `${failedPartitions} of ${availableDates.length} ownership history partitions could not be loaded.`
        : '',
    };
  } catch (cause) {
    return {
      availableDates: [],
      effectiveDate: null,
      endpoint: availableDatesEndpoint,
      rows: [],
      error: cause instanceof Error ? cause.message : 'Unable to load manual security ownership data.',
    };
  }
}

function normalizeManualSecurityOwnershipRow(row: ManualSecurityOwnershipRow): SecurityOwnershipRow {
  return {
    holderName: row.investor,
    formType: row.source,
    fileDate: row.fileDate,
    effectiveDate: row.effectiveDate,
    ownershipPercent: row.sharesPct,
    shares: row.shares,
    value: row.reportedValue,
    valuePercentChange: row.valueChangePct,
    costBasis: row.avgPriceEst,
    optionType: row.optionType,
    type: row.type,
    portAlloc: row.portAlloc,
    positionStatus: row.positionStatus,
  };
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

function isPutOrCallHoldingType(value: unknown) {
  return /\b(?:put|call)\b/i.test(String(value ?? '').trim());
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

function emptyInternalFloatInputsOnNotFound(cause: unknown): InternalFloatInputsResponse {
  const message = cause instanceof Error ? cause.message : String(cause ?? '');
  if (/\b404(?:\s+Not Found)?\b/i.test(message)) return {};
  throw cause;
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

function ownershipCategoryPayload<T extends Record<string, unknown>>(payload: unknown, category: string): T | null {
  if (!isRecord(payload)) return null;
  if (isRecord(payload[category])) return payload[category] as T;
  if (isRecord(payload.data)) {
    if (isRecord(payload.data[category])) return payload.data[category] as T;
    return payload.data as T;
  }
  return payload as T;
}

export function InstitutionalBrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const [isDemo, setIsDemo] = useState(false);
  const [current, setCurrent] = useState<OwnershipCurrent | null>(null);
  const [activitySummary, setActivitySummary] = useState<OwnershipSummaryCurrent | null>(null);
  const [history, setHistory] = useState<OwnershipHistory | null>(null);
  const [marketHistory, setMarketHistory] = useState<MarketHistory | null>(null);
  const [manualOwnership, setManualOwnership] = useState<ManualSecurityOwnershipDataset | null>(null);
  const [internalFloatCurrent, setInternalFloatCurrent] = useState<InternalFloatCurrent | null>(null);
  const [strategicHoldings, setStrategicHoldings] = useState<InternalFloatPrivateHolding[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const expectedUserStrategicShares = strategicHoldings
    .filter(row => row.includeInDeduction !== false)
    .reduce((sum, row) => sum + Number(row.shares ?? 0), 0);
  const consolidatedStrategicShares = isDemo
    ? expectedUserStrategicShares
    : consolidatedStrategicTotal(internalFloatCurrent);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      cachedAuthenticatedFetch<OwnershipCurrent>(`/market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=ownership-current`),
      cachedAuthenticatedFetch<OwnershipSummaryCurrent>(`/market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=ownership-summary-current`).catch(() => null),
      cachedAuthenticatedFetch<OwnershipHistory>(`/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=ownership-history`),
      cachedAuthenticatedFetch<Record<string, unknown>>(`/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=market-history`),
      cachedAuthenticatedFetch<unknown>(`/market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=internal-float-current-user`),
      cachedAuthenticatedFetch<InternalFloatInputsResponse>(`/manual-input/internal-float-inputs-user?ticker=${encodeURIComponent(normalizedTicker)}`)
        .catch(emptyInternalFloatInputsOnNotFound),
      loadAllManualSecurityOwnership(normalizedTicker),
      getAuthenticatedProfile(),
    ]).then(([nextCurrent, nextActivitySummary, nextHistory, nextMarketHistory, nextInternalFloatCurrent, nextInternalFloatInputs, nextManualOwnership, profile]) => {
      if (cancelled) return;
      const nextIsDemo = isPublicDemoProfile(profile);
      setIsDemo(nextIsDemo);
      setCurrent(nextCurrent);
      setActivitySummary(nextActivitySummary);
      setHistory(nextHistory);
      setMarketHistory(ownershipCategoryPayload<MarketHistory>(nextMarketHistory, 'market-history'));
      setInternalFloatCurrent(normalizeInternalFloatCurrent(nextInternalFloatCurrent));
      setStrategicHoldings(mergeInternalFloatHoldings(
        nextIsDemo
          ? demoInternalFloatUserInputs.privateHoldings
          : nextInternalFloatInputs.managementStrategicHoldings?.records ?? [],
      ));
      setManualOwnership(nextManualOwnership);
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
    if (isDemo || !strategicHoldings.length || expectedShares === consolidatedShares) return;

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
  }, [consolidatedStrategicShares, expectedUserStrategicShares, isDemo, normalizedTicker, strategicHoldings.length]);

  if (loading) return <PortalPageLoading variant="ownership" />;
  if (error || !current || !history || !marketHistory) {
    return <div className="page"><section className="panel"><h2>Ownership data unavailable</h2><p>{error}</p></section></div>;
  }

  const allHistoryRows = Array.isArray(history.records) ? history.records : [];
  const activistRows = allHistoryRows.filter(row => String(row.sourceType ?? '').toLowerCase().includes('activist')) as ActivistFilingRow[];
  const manualSecurityRows = (manualOwnership?.rows ?? [])
    .map(normalizeManualSecurityOwnershipRow)
    .sort((a, b) => {
      const effectiveDateComparison = String(b.effectiveDate ?? '').localeCompare(String(a.effectiveDate ?? ''));
      if (effectiveDateComparison !== 0) return effectiveDateComparison;
      return String(b.fileDate ?? '').localeCompare(String(a.fileDate ?? ''));
    });
  const securitySource = `GET ${manualOwnership?.endpoint ?? `/manual-input/manual-security-ownership?ticker=${encodeURIComponent(normalizedTicker)}&action=available-dates`}`;
  const manualOwnershipEmptyMessage = manualOwnership?.error
    ? `Manual Security Ownership could not be loaded: ${manualOwnership.error}`
    : manualOwnership?.availableDates.length
      ? 'No imported Manual Security Ownership records are available across the recorded effective dates.'
      : 'No imported Manual Security Ownership records are available for this ticker.';
  const managementRecords = strategicHoldings;
  const institutionBreakdownRows = current.institutionBreakdown ?? [];
  const toInstitutionBar = (row: Record<string, unknown>) => ({
    name: String(row.holderName ?? row.name ?? 'Unknown holder'),
    shares: Number(row.shares ?? 0),
    value: Number(row.value ?? 0),
    ownershipPercentOfInstitutional: Number(row.percentOfInstitutionalShares ?? row.ownershipPercentOfInstitutional ?? 0),
    ownershipPercentOfSharesOutstanding: Number(row.percentOfIssuedShare ?? row.ownershipPercentOfSharesOutstanding ?? 0),
  });
  const institutionBars = institutionBreakdownRows.map(toInstitutionBar);
  const visibleInstitutionBars = institutionBreakdownRows
    .filter(row => (finiteNumber(row.shares) ?? 0) > 0 && !isPutOrCallHoldingType(row.type))
    .map(toInstitutionBar);
  const issuedShare = Number(current.issuedShare ?? 0);
  const institutionalShares = Number(current.institutionalSharesLong ?? 0);
  const strategicShares = consolidatedStrategicShares ?? 0;
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
    institution_bars: visibleInstitutionBars,
  };
  const holdings: InstitutionalHolding[] = manualSecurityRows.map((row, index) => ({
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
    option_type: row.optionType ?? undefined,
    holding_type: row.type ?? undefined,
    portfolio_allocation: formatPercent(row.portAlloc),
    position_status: row.positionStatus ?? undefined,
    source_type: 'manual-security-ownership',
    source_label: securitySource,
  }));
  const latestChartHoldings: InstitutionalHolding[] = institutionBreakdownRows
    .filter(row => !isPutOrCallHoldingType(row.type))
    .map((row, index) => ({
      id: `latest-ownership-${index}`,
      company_id: `company-${normalizedTicker}`,
      fund_name: String(row.holderName ?? row.name ?? 'Unknown holder'),
      shares: formatNumber(row.shares),
      market_value: formatNumber(row.value),
      change_type: 'unchanged',
      filing_date: String(row.fileDate ?? 'N/A'),
      source: String(row.formType ?? row.formTypeShort ?? 'Latest filing'),
      form_type: String(row.formType ?? row.formTypeShort ?? 'N/A'),
      effective_date: String(row.effectiveDate ?? row.fileDate ?? 'N/A'),
      holding_type: String(row.type ?? ''),
      cost_basis: formatNumber(row.avgPrice),
      ownership_percent: formatPercent(row.percentOfInstitutionalShares),
      position_status: String(row.positionStatus ?? ''),
      source_type: 'free_data',
      source_label: 'GET /market-data/current?category=ownership-current',
    }));
  const chartHoldings = [...holdings, ...latestChartHoldings];
  const marketHistoryRows = Array.isArray(marketHistory.records) ? marketHistory.records : [];
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
      <InstitutionalOverview data={overviewData} ticker={normalizedTicker} managementRecords={managementRecords} demoMode={isDemo} />
      <InstitutionalActivitySummary
        data={activitySummary}
        ticker={normalizedTicker}
      />
      <LatestInstitutionalFilings
        rows={institutionBreakdownRows as LatestInstitutionalFiling[]}
        ticker={normalizedTicker}
        snapshotDate={current.snapshotDate ?? current.updatedAt ?? current.generatedAt}
        chartHoldings={chartHoldings}
        marketHistory={marketHistoryRows}
      />
      <section className="panel">
        <ApiSourceTags sources={[
          { endpoint: securitySource, label: 'Imported ownership records' },
          { endpoint: 'GET /market-data/history?category=ownership-history', label: 'Insider filings' },
          { endpoint: 'GET /market-data/current?category=internal-float-current-user', label: 'Consolidated strategic total' },
          { endpoint: 'GET /manual-input/internal-float-inputs-user', label: 'Strategic entities' },
        ]} />
        <InstitutionalTabs
          holdings={holdings}
          activistFilings={activistFilings}
          ticker={normalizedTicker}
          companyName={normalizedTicker}
          chartHoldings={chartHoldings}
          marketHistory={marketHistoryRows}
          manualSchema
          ownershipEmptyMessage={manualOwnershipEmptyMessage}
        />
      </section>
      <PageDisclaimerNotice noticeKey="ownership" disclaimerKey="regulatoryFiling" />
      <InstitutionalDevTables
        ticker={normalizedTicker}
        overviewFile={`GET /market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=ownership-current`}
        activistFile={`GET /market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=ownership-history`}
        manualOwnershipFile={manualOwnership?.endpoint ? `GET ${manualOwnership.endpoint}` : `GET /manual-input/manual-security-ownership?ticker=${encodeURIComponent(normalizedTicker)}&action=available-dates`}
        manualOwnershipDate={manualOwnership?.effectiveDate ?? null}
        manualOwnershipError={manualOwnership?.error ?? ''}
        ownershipCurrent={(current ?? null) as Record<string, unknown> | null}
        ownershipSummaryCurrent={(activitySummary ?? null) as Record<string, unknown> | null}
        overview={(overviewData.overview ?? null) as Record<string, unknown> | null}
        internalFloatCurrent={(internalFloatCurrent ?? null) as Record<string, unknown> | null}
        expectedUserStrategicShares={expectedUserStrategicShares}
        displayedStrategicShares={strategicShares}
        ownershipStructure={(overviewData.ownership_structure ?? []) as Array<Record<string, unknown>>}
        insiderBars={(overviewData.insider_bars ?? []) as Array<Record<string, unknown>>}
        institutionBars={institutionBars as Array<Record<string, unknown>>}
        publicFloatBreakdown={(overviewData.public_float_breakdown ?? []) as Array<Record<string, unknown>>}
        manualOwnershipRows={(manualOwnership?.rows ?? []) as Array<Record<string, unknown>>}
        activistRows={activistRows as Array<Record<string, unknown>>}
        managementHoldings={managementRecords as Array<Record<string, unknown>>}
        latestFilings={institutionBreakdownRows}
        marketHistory={marketHistoryRows}
      />
    </div>
  );
}
