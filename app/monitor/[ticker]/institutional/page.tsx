import { readImportFile, readImportJson, readLocalImportText, type ImportEnvelope } from '@/lib/import-data';
import type { InstitutionalHolding } from '@/lib/types';
import { formatImportDataUpdatedAt, getImportDataVersion } from '@/lib/import-data-version';
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

const institutionalOverviewFile = 'institutional_ownership_CURR_consolidated_4_web.json';

async function readInstitutionalOverviewFile(): Promise<ImportEnvelope<InstitutionalOverviewData>> {
  try {
    return await readImportFile<InstitutionalOverviewData>(institutionalOverviewFile);
  } catch {
    return JSON.parse(readLocalImportText(institutionalOverviewFile)) as ImportEnvelope<InstitutionalOverviewData>;
  }
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

export default async function InstitutionalPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = ticker.toUpperCase();
  const [securityRows, activistRows, overviewEnvelope, importDataVersion] = await Promise.all([
    readImportJson<SecurityOwnershipRow[]>('fintel_security_ownership_premium_CURR_consolidated_4_web.json'),
    readImportJson<ActivistFilingRow[]>('fintel_activist_filings_premium_CURR_consolidated_4_web.json'),
    readInstitutionalOverviewFile(),
    getImportDataVersion(),
  ]);
  const holdings: InstitutionalHolding[] = securityRows.map((row, index) => ({
    id: `import-ownership-${index}`,
    company_id: `company-${normalizedTicker}`,
    fund_name: row.name ?? 'Unknown holder',
    shares: formatNumber(row.shares),
    market_value: formatNumber(row.value),
    change_type: ownershipChangeType(row),
    filing_date: row.fileDate ?? 'N/A',
    source: row.formTypeShort ?? row.formType ?? 'Fintel Premium',
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
    source_label: 'fintel_security_ownership_premium_CURR_consolidated_4_web.json',
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

  return (
    <div className="page institutional-page">
      <div className="compact-page-header">
        <span>Institutional Ownership</span>
        <p>Normalized ownership records</p>
        <span className="page-header-import-status" aria-label="Latest import data update">
          <span>Latest import data update</span>
          <strong>{formatImportDataUpdatedAt(importDataVersion.updatedAt)}</strong>
        </span>
      </div>

      <InstitutionalOverview data={overviewEnvelope.data} ticker={normalizedTicker} />

      <section className="panel">
        <InstitutionalTabs holdings={holdings} activistFilings={activistFilings} ticker={normalizedTicker} companyName="CURRENC Group Inc." />
      </section>

      <InstitutionalDevTables
        overview={(overviewEnvelope.data.overview ?? null) as Record<string, unknown> | null}
        ownershipStructure={(overviewEnvelope.data.ownership_structure ?? []) as Array<Record<string, unknown>>}
        insiderBars={(overviewEnvelope.data.insider_bars ?? []) as Array<Record<string, unknown>>}
        institutionBars={(overviewEnvelope.data.institution_bars ?? []) as Array<Record<string, unknown>>}
        publicFloatBreakdown={(overviewEnvelope.data.public_float_breakdown ?? []) as Array<Record<string, unknown>>}
        securityRows={securityRows as Array<Record<string, unknown>>}
        activistRows={activistRows as Array<Record<string, unknown>>}
      />
    </div>
  );
}
