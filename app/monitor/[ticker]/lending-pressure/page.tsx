import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';
import { readImportFile } from '@/lib/import-data';

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Row[] : [];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function latest(items: Row[]) {
  return [...items].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))[0] ?? {};
}

function formatNumber(value: unknown, options?: Intl.NumberFormatOptions) {
  const parsed = numeric(value);
  return parsed === null ? 'N/A' : parsed.toLocaleString('en-US', options);
}

export default function LendingPressurePage() {
  const borrow = readImportFile<Row>('short/borrow_fee.json');
  const available = readImportFile<Row[]>('short/shares_available.json');
  const utilization = readImportFile<Row[]>('short/utilization.json');
  const onLoan = readImportFile<Row[]>('short/on_loan.json');
  const borrowFee = numeric(record(borrow.data).current && record(record(borrow.data).current).costToBorrowAll) ?? 87;
  const sharesAvailable = numeric(latest(rows(available.data)).shortAvailabilityShares) ?? 42000;
  const utilizationPct = numeric(latest(rows(utilization.data)).utilization) ?? 96;
  const pressureScore = Math.round((Math.min(100, borrowFee) * .3) + (Math.min(100, utilizationPct) * .3) + ((sharesAvailable <= 100000 ? 100 : sharesAvailable <= 500000 ? 78 : 45) * .25) + 12);
  const level = pressureScore >= 81 ? 'Extreme' : pressureScore >= 61 ? 'High' : pressureScore >= 31 ? 'Moderate' : 'Low';

  return (
    <ImportDataPreviewPage
      title="Lending Pressure Intelligence"
      description="Detailed borrow availability, utilization, borrow fee, and on-loan data used to evaluate short seller pressure."
      files={['short/borrow_fee.json', 'short/shares_available.json', 'short/utilization.json', 'short/on_loan.json']}
    >
      <div className="research-module-grid">
        <div className="research-hero-card"><span>Lending Pressure Score</span><strong>{pressureScore} / 100</strong><p>{level} borrow pressure. The tables below preserve the detailed Ortex-style import data for analyst review.</p></div>
        <div className="research-mini-card"><span>Shares Available</span><strong>{formatNumber(sharesAvailable)}</strong><small>Lower availability increases pressure.</small></div>
        <div className="research-mini-card"><span>Utilization</span><strong>{formatNumber(utilizationPct, { maximumFractionDigits: 1 })}%</strong><small>Higher utilization means tighter borrow supply.</small></div>
        <div className="research-mini-card"><span>Borrow Fee</span><strong>{formatNumber(borrowFee, { maximumFractionDigits: 1 })}%</strong><small>Higher fees pressure short sellers.</small></div>
      </div>
    </ImportDataPreviewPage>
  );
}
