import { readImportFile } from '@/lib/import-data';
import type { InstitutionalHolding } from '@/lib/types';
import { OwnershipTable } from './OwnershipTable';
import { InfoTooltip } from '@/components/InfoTooltip';
import { formatImportDataUpdatedAt, getImportDataVersion } from '@/lib/import-data-version';

type SecurityOwnershipRow = {
  investorName?: string | null;
  formType?: string | null;
  effectiveDate?: string | null;
  fileDate?: string | null;
  ownershipPercent?: number | string | null;
  shares?: number | string | null;
  sharesChange?: number | string | null;
  sharesPercentChange?: number | string | null;
  value?: number | string | null;
  valueChange?: number | string | null;
  valuePercentChange?: number | string | null;
  costBasis?: number | string | null;
  url?: string | null;
};

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

export default async function InstitutionalPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = ticker.toUpperCase();
  const [envelope, importDataVersion] = await Promise.all([
    readImportFile<SecurityOwnershipRow[]>('ownership/security_ownership.json'),
    getImportDataVersion(),
  ]);
  const rows = envelope.data;
  const holdings: InstitutionalHolding[] = rows.map((row, index) => ({
    id: `import-ownership-${index}`,
    company_id: `company-${normalizedTicker}`,
    fund_name: row.investorName ?? 'Unknown holder',
    shares: formatNumber(row.shares),
    market_value: formatNumber(row.value),
    change_type: changeType(row.sharesChange),
    filing_date: row.fileDate ?? 'N/A',
    source: row.formType ?? envelope.sourcePlatform ?? 'import_data',
    ownership_percent: formatPercent(row.ownershipPercent),
    shares_change: formatNumber(row.sharesChange),
    shares_change_percent: formatPercent(row.sharesPercentChange),
    value_change: formatNumber(row.valueChange),
    value_change_percent: formatPercent(row.valuePercentChange),
    form_type: row.formType ?? undefined,
    effective_date: row.effectiveDate ?? undefined,
    owner_url: row.url ?? undefined,
    cost_basis: formatNumber(row.costBasis),
    source_type: 'free_data',
    source_label: 'import_data/ownership/security_ownership.json',
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

      <section className="panel">
        <div className="section__head">
          <h2 className="panel__title with-info">
            Holder Table
            <InfoTooltip text="Institutional ownership tables show reported holdings from 13F and ownership filings. They help IR teams identify large holders, position changes, and ownership concentration." />
          </h2>
        </div>
        <OwnershipTable holdings={holdings} ticker={normalizedTicker} companyName="CURRENC Group Inc." />
      </section>
    </div>
  );
}
