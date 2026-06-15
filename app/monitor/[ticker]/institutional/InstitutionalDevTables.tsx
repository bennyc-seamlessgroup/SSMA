'use client';

import { ImportDataTable } from '@/components/ImportDataTable';
import { ImportDataTabs } from '@/components/ImportDataTabs';

type InstitutionalDevTablesProps = {
  securityRows: Array<Record<string, unknown>>;
  activistRows: Array<Record<string, unknown>>;
};

const securityFile = 'fintel_security_ownership_premium_CURR_consolidated_4_web.json';
const activistFile = 'fintel_activist_filings_premium_CURR_consolidated_4_web.json';

const securityColumns = [
  'name',
  'formType',
  'formTypeShort',
  'fileDate',
  'effectiveDate',
  'ownershipPercent',
  'ownershipPercentChange',
  'shares',
  'sharesChange',
  'sharesPercentChange',
  'value',
  'valueChange',
  'valuePercentChange',
  'url',
];

const activistColumns = [
  'name',
  'formType',
  'fileDate',
  'effectiveDate',
  'ownershipPercent',
  'ownershipPercentChange',
  'shares',
  'sharesChange',
  'sharesPercentChange',
  'url',
];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'number') return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return `${value.length.toLocaleString()} records`;
  if (typeof value === 'object') return 'Object';
  return String(value);
}

function toTableRows(rows: Array<Record<string, unknown>>, columns: string[]) {
  return rows.map(row => Object.fromEntries(columns.map(column => [column, formatValue(row[column])])));
}

export function InstitutionalDevTables({ securityRows, activistRows }: InstitutionalDevTablesProps) {
  const tabs = [
    {
      id: 'security-ownership',
      title: 'Security Ownership',
      file: securityFile,
      sourcePlatform: 'Fintel Premium',
      recordCount: securityRows.length,
      status: 'ready',
    },
    {
      id: 'activist-filings',
      title: 'Activist Filings',
      file: activistFile,
      sourcePlatform: 'Fintel Premium',
      recordCount: activistRows.length,
      status: 'ready',
    },
  ];

  return (
    <section className="terminal-section import-data-dev-panel">
      <div className="terminal-section__head">
        <div>
          <span>Development Data</span>
          <h2>Institutional Ownership Import Tables</h2>
          <p className="section-subtitle">Raw records from the Fintel ownership and activist filing import files.</p>
          <span className="import-file-tag">{securityFile}</span>
          <span className="import-file-tag">{activistFile}</span>
        </div>
      </div>

      <ImportDataTabs tabs={tabs}>
        <ImportDataTable columns={securityColumns} rows={toTableRows(securityRows, securityColumns)} pageSize={25} />
        <ImportDataTable columns={activistColumns} rows={toTableRows(activistRows, activistColumns)} pageSize={25} />
      </ImportDataTabs>
    </section>
  );
}
