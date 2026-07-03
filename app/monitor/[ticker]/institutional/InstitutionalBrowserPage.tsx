'use client';

import { PortalPageLoading } from '@/components/PortalPageLoading';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';
import { usePortalTimeZone } from '@/components/usePortalTimeZone';
import { usePublicImportFiles } from '@/components/usePublicImportFiles';
import { useTickerDataStatus } from '@/components/TickerDataStatusProvider';
import { formatPortalDateTime } from '@/lib/timezone';
import type { InstitutionalHolding } from '@/lib/types';
import { institutionalActivistFile, institutionalOverviewFile, institutionalSecurityFile, normalizeTicker } from '@/lib/ticker-data';
import { buildDashboard } from '@/lib/mock-data';
import { InstitutionalTabs } from './InstitutionalTabs';
import type { ActivistFiling } from './ActivistFilingsTable';
import { InstitutionalDevTables } from './InstitutionalDevTables';
import { InstitutionalOverview, type InstitutionalOverviewData } from './InstitutionalOverview';

type SecurityOwnershipRow = {
  name?: string | null;
  formType?: string | null;
  formTypeShort?: string | null;
  effectiveDate?: string | null;
  fileDate?: string | null;
  ownershipPercent?: number | string | null;
  ownershipPercentChange?: number | string | null;
  shares?: number | string | null;
  sharesChange?: number | string | null;
  sharesPercentChange?: number | string | null;
  value?: number | string | null;
  valueChange?: number | string | null;
  valuePercentChange?: number | string | null;
  costBasis?: number | string | null;
  url?: string | null;
};

type ActivistFilingRow = {
  name?: string | null;
  formType?: string | null;
  effectiveDate?: string | null;
  fileDate?: string | null;
  ownershipPercent?: number | string | null;
  ownershipPercentChange?: number | string | null;
  shares?: number | string | null;
  sharesChange?: number | string | null;
  sharesPercentChange?: number | string | null;
  url?: string | null;
};

type ImportEnvelope<T> = { data?: T };

function unwrap<T>(value: unknown): T {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'data' in value) {
    return (value as ImportEnvelope<T>).data as T;
  }
  return value as T;
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

function ownershipChangeType(row: Pick<SecurityOwnershipRow, 'sharesChange' | 'sharesPercentChange'>): InstitutionalHolding['change_type'] {
  const sharesChange = typeof row.sharesChange === 'number' ? row.sharesChange : Number(String(row.sharesChange ?? '').replace(/,/g, ''));
  const pctChange = typeof row.sharesPercentChange === 'number' ? row.sharesPercentChange : Number(String(row.sharesPercentChange ?? '').replace(/,/g, ''));
  if (Number.isFinite(pctChange) && pctChange <= -100) return 'exited';
  return changeType(Number.isFinite(sharesChange) ? sharesChange : row.sharesChange);
}

export function InstitutionalBrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const company = buildDashboard(normalizedTicker).company;
  const overviewFile = institutionalOverviewFile(normalizedTicker);
  const securityFile = institutionalSecurityFile(normalizedTicker);
  const activistFile = institutionalActivistFile(normalizedTicker);
  const files = [overviewFile, securityFile, activistFile];
  const { data, error, loading } = usePublicImportFiles(files);
  const status = useTickerDataStatus();
  const timeZone = usePortalTimeZone();

  if (loading && !data) return <PortalPageLoading variant="ownership" />;
  if (error || !data) {
    return <div className="page"><section className="panel"><h2>Ownership data unavailable</h2><p>{error}</p></section></div>;
  }

  const securityRows = unwrap<SecurityOwnershipRow[]>(data[securityFile]) ?? [];
  const activistRows = unwrap<ActivistFilingRow[]>(data[activistFile]) ?? [];
  const overviewEnvelope = (data[overviewFile] ?? {}) as ImportEnvelope<InstitutionalOverviewData>;
  const overviewData = overviewEnvelope.data ?? unwrap<InstitutionalOverviewData>(data[overviewFile]) ?? {};
  const holdings: InstitutionalHolding[] = securityRows.map((row, index) => ({
    id: `import-ownership-${index}`,
    company_id: `company-${normalizedTicker}`,
    fund_name: row.name ?? 'Unknown holder',
    shares: formatNumber(row.shares),
    market_value: formatNumber(row.value),
    change_type: ownershipChangeType(row),
    filing_date: row.fileDate ?? 'N/A',
    source: row.formTypeShort ?? row.formType ?? 'Imported filing',
    ownership_percent: formatPercent(row.ownershipPercent),
    shares_change: formatNumber(row.sharesChange),
    shares_change_percent: formatPercent(row.sharesPercentChange),
    value_change: formatNumber(row.valueChange),
    value_change_percent: formatPercent(row.valuePercentChange),
    form_type: row.formType ?? undefined,
    effective_date: row.effectiveDate ?? undefined,
    owner_url: row.url ?? undefined,
    cost_basis: formatNumber(row.costBasis),
    source_type: 'fintel',
    source_label: securityFile,
  }));
  const activistFilings: ActivistFiling[] = activistRows.map((row, index) => ({
    id: `activist-filing-${index}`,
    name: row.name ?? 'Unknown holder',
    formType: row.formType ?? 'N/A',
    fileDate: row.fileDate ?? 'N/A',
    effectiveDate: row.effectiveDate ?? 'N/A',
    ownershipPercent: formatPercent(row.ownershipPercent),
    ownershipPercentChange: formatPercent(row.ownershipPercentChange),
    shares: formatNumber(row.shares),
    sharesChange: formatNumber(row.sharesChange),
    sharesPercentChange: formatPercent(row.sharesPercentChange),
    url: row.url ?? undefined,
  }));
  const updatedAt = status?.pages.institutional?.updatedAt;

  return (
    <div className="page institutional-page">
      <div className="compact-page-header">
        <span>Institutional Ownership</span>
        <p>Normalized ownership records</p>
        <span className="page-header-import-status" aria-label="Latest import data update">
          <span>Latest import data update</span>
          <strong>{updatedAt ? formatPortalDateTime(updatedAt, timeZone) : 'Checking public data'}</strong>
        </span>
      </div>

      <InstitutionalOverview data={overviewData} ticker={normalizedTicker} />
      <section className="panel">
        <InstitutionalTabs holdings={holdings} activistFilings={activistFilings} ticker={normalizedTicker} companyName={company.company_name} />
      </section>
      <PageDisclaimerNotice noticeKey="ownership" disclaimerKey="regulatoryFiling" />
      <InstitutionalDevTables
        overviewFile={overviewFile}
        securityFile={securityFile}
        activistFile={activistFile}
        overview={(overviewData.overview ?? null) as Record<string, unknown> | null}
        ownershipStructure={(overviewData.ownership_structure ?? []) as Array<Record<string, unknown>>}
        insiderBars={(overviewData.insider_bars ?? []) as Array<Record<string, unknown>>}
        institutionBars={(overviewData.institution_bars ?? []) as Array<Record<string, unknown>>}
        publicFloatBreakdown={(overviewData.public_float_breakdown ?? []) as Array<Record<string, unknown>>}
        securityRows={securityRows as Array<Record<string, unknown>>}
        activistRows={activistRows as Array<Record<string, unknown>>}
      />
    </div>
  );
}
