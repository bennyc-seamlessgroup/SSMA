import { ImportDataTable } from '@/components/ImportDataTable';
import { readOperationsSecFilings, type OperationsSecFilingRecord } from '@/lib/operations/sec-filings-store';
import { buildDashboard } from '@/lib/mock-data';
import { normalizeTicker } from '@/lib/ticker-data';
import { SecFilingsList, type SecFilingRow } from './SecFilingsList';

export const dynamic = 'force-dynamic';

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function normalizeFiling(row: OperationsSecFilingRecord): SecFilingRow {
  return {
    title: text(row.formDescription),
    formType: text(row.formType),
    url: text(row.filingsUrl),
    excerpt: [
      row.formDescription,
      row.reportingDate ? `Reporting date: ${row.reportingDate}` : '',
      row.act ? `Act: ${row.act}` : '',
      row.filmNumber ? `Film number: ${row.filmNumber}` : '',
      row.fileNumber ? `File number: ${row.fileNumber}` : '',
      row.accessionNumber ? `Accession: ${row.accessionNumber}` : '',
    ].filter(Boolean).join(' · '),
    publishDate: text(row.filingDate),
    publishAt: text(row.createdAt),
    sourcePlatform: 'Operations Portal',
  };
}

function tableValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'N/A';
  return String(value);
}

const devColumns = [
  'formType',
  'formDescription',
  'filingDate',
  'reportingDate',
  'act',
  'filmNumber',
  'fileNumber',
  'accessionNumber',
  'filingsUrl',
  'createdAt',
  'createdBy',
];

export default async function EventCalendarPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);
  const company = buildDashboard(normalizedTicker).company;
  const manualFilings = await readOperationsSecFilings(normalizedTicker);
  const filings = manualFilings.records.map(normalizeFiling);
  const devRows = manualFilings.records.map(record =>
    Object.fromEntries(devColumns.map(column => [column, tableValue(record[column as keyof OperationsSecFilingRecord])])),
  );

  return (
    <div className="page catalysts-page">
      <div className="page__header">
        <div>
          <h1 className="page__title">SEC Filings</h1>
          <p className="page__desc">
            All companies that sell securities in the United States must register with the Securities and Exchange Commission and file reports on a regular basis. This page shows recent SEC filings related to {company.company_name}.
          </p>
        </div>
      </div>

      <SecFilingsList filings={filings} />

      <section className="terminal-section import-data-dev-panel">
        <div className="terminal-section__head">
          <div>
            <span>Development Data</span>
            <h2>SEC Filings JSON Table</h2>
            <p className="section-subtitle">Operations-managed SEC filing records displayed by this page.</p>
            <span className="import-file-tag">{manualFilings.s3Key}</span>
          </div>
        </div>
        <ImportDataTable columns={devColumns} rows={devRows} pageSize={25} />
      </section>
    </div>
  );
}
