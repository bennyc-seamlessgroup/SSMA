'use client';

import { PortalPageLoading } from '@/components/PortalPageLoading';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';
import { cachedAuthenticatedFetch } from '@/lib/auth-client';
import type { InstitutionalHolding } from '@/lib/types';
import { normalizeTicker } from '@/lib/ticker-data';
import { useEffect, useState } from 'react';
import { InstitutionalTabs } from './InstitutionalTabs';
import type { ActivistFiling } from './ActivistFilingsTable';
import { InstitutionalDevTables } from './InstitutionalDevTables';
import { InstitutionalOverview, type InstitutionalOverviewData } from './InstitutionalOverview';
import { ApiSourceTags } from '@/components/ApiSourceTags';

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

type ManagementHoldingInputRecord = {
  id: string;
  ticker: string;
  holderName: string;
  category: string;
  shares: number | string;
  action: 'add' | 'deduct';
  previousShares?: number | string;
  latestTotalShares?: number | string;
  sharesChange?: number | string;
  changeType?: 'increase' | 'decrease' | 'no-change';
  notes?: string;
  effectiveDate?: string;
  showInOwnership?: boolean;
  showAsSuggestion?: boolean;
  autoApply?: boolean;
  status?: 'pending' | 'applied' | 'discarded';
};

type OwnershipCurrent = {
  generatedAt?: string;
  updatedAt?: string;
  issuedShare?: number;
  institutionalOwners?: number;
  institutionalSharesLong?: number;
  institutionalHoldingPercent?: number;
  institutionalValue?: number;
  averagePortfolioAllocationPercent?: number;
  strategicEntities?: { shares?: number; percent?: number; records?: ManagementHoldingInputRecord[] };
  publicFloat?: { shares?: number; percent?: number };
  institutionBreakdown?: Array<Record<string, unknown>>;
};

type OwnershipHistory = { generatedAt?: string; records?: Array<Record<string, unknown>> };

type ManagementHoldingsResponse =
  | ManagementHoldingInputRecord[]
  | { records?: ManagementHoldingInputRecord[]; data?: { records?: ManagementHoldingInputRecord[] } };

function managementHoldingRecords(payload: ManagementHoldingsResponse | null) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data?.records)) return payload.data.records;
  return [];
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
  const [managementHoldings, setManagementHoldings] = useState<ManagementHoldingInputRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      cachedAuthenticatedFetch<OwnershipCurrent>(`/market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=ownership-current`),
      cachedAuthenticatedFetch<OwnershipHistory>(`/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=ownership-history`),
      cachedAuthenticatedFetch<ManagementHoldingsResponse>(`/manual-input/management-holdings?ticker=${encodeURIComponent(normalizedTicker)}`),
    ]).then(([nextCurrent, nextHistory, nextManagementHoldings]) => {
      if (cancelled) return;
      setCurrent(nextCurrent);
      setHistory(nextHistory);
      setManagementHoldings(managementHoldingRecords(nextManagementHoldings));
    }).catch(cause => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load ownership data.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [normalizedTicker]);

  if (loading) return <PortalPageLoading variant="ownership" />;
  if (error || !current || !history) {
    return <div className="page"><section className="panel"><h2>Ownership data unavailable</h2><p>{error}</p></section></div>;
  }

  const allHistoryRows = Array.isArray(history.records) ? history.records : [];
  const securityRows = allHistoryRows.filter(row => !String(row.sourceType ?? '').toLowerCase().includes('activist')) as SecurityOwnershipRow[];
  const activistRows = allHistoryRows.filter(row => String(row.sourceType ?? '').toLowerCase().includes('activist')) as ActivistFilingRow[];
  const managementRecords = managementHoldings;
  const institutionBars = (current.institutionBreakdown ?? []).map(row => ({
    name: String(row.holderName ?? row.name ?? 'Unknown holder'),
    shares: Number(row.shares ?? 0),
    value: Number(row.value ?? 0),
    ownershipPercentOfInstitutional: Number(row.percentOfInstitutionalShares ?? row.ownershipPercentOfInstitutional ?? 0),
    ownershipPercentOfSharesOutstanding: Number(row.percentOfIssuedShare ?? row.ownershipPercentOfSharesOutstanding ?? 0),
  }));
  const overviewData: InstitutionalOverviewData = {
    overview: {
      shares_outstanding: current.issuedShare,
      institutional_owners: current.institutionalOwners,
      institutional_shares_long: current.institutionalSharesLong,
      institutional_ownership_percent: current.institutionalHoldingPercent,
      institutional_value_thousands_usd: current.institutionalValue,
      average_portfolio_allocation_percent: current.averagePortfolioAllocationPercent,
      public_float_shares: current.publicFloat?.shares,
      public_float_percent: current.publicFloat?.percent,
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
          { endpoint: 'GET /manual-input/management-holdings', label: 'Strategic entities' },
        ]} />
        <InstitutionalTabs holdings={holdings} activistFilings={activistFilings} ticker={normalizedTicker} companyName={normalizedTicker} />
      </section>
      <PageDisclaimerNotice noticeKey="ownership" disclaimerKey="regulatoryFiling" />
      <InstitutionalDevTables
        overviewFile="GET /market-data/current?category=ownership-current"
        securityFile="GET /market-data/history?category=ownership-history"
        activistFile="GET /market-data/history?category=ownership-history"
        overview={(overviewData.overview ?? null) as Record<string, unknown> | null}
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
