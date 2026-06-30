'use client';

import { ImportDataTable } from '@/components/ImportDataTable';
import { ImportDataTabs } from '@/components/ImportDataTabs';

type InstitutionalDevTablesProps = {
  overviewFile: string;
  securityFile: string;
  activistFile: string;
  overview: Record<string, unknown> | null;
  ownershipStructure: Array<Record<string, unknown>>;
  insiderBars: Array<Record<string, unknown>>;
  institutionBars: Array<Record<string, unknown>>;
  publicFloatBreakdown: Array<Record<string, unknown>>;
  securityRows: Array<Record<string, unknown>>;
  activistRows: Array<Record<string, unknown>>;
};

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

function overviewRows(overview: Record<string, unknown> | null) {
  return overview
    ? Object.entries(overview).map(([field, value]) => ({ field, value: formatValue(value) }))
    : [];
}

function columnsFor(rows: Array<Record<string, unknown>>, fallback: string[]) {
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  return columns.length ? columns : fallback;
}

export function InstitutionalDevTables({
  overviewFile,
  securityFile,
  activistFile,
  overview,
  ownershipStructure,
  insiderBars,
  institutionBars,
  publicFloatBreakdown,
  securityRows,
  activistRows,
}: InstitutionalDevTablesProps) {
  const ownershipStructureColumns = columnsFor(ownershipStructure, ['key', 'label', 'shares', 'percent', 'color']);
  const insiderBarColumns = columnsFor(insiderBars, ['name', 'shares', 'ownershipPercentOfInsiders', 'ownershipPercentOfSharesOutstanding']);
  const institutionBarColumns = columnsFor(institutionBars, ['name', 'shares', 'value', 'ownershipPercentOfInstitutional', 'ownershipPercentOfSharesOutstanding']);
  const publicFloatBreakdownColumns = columnsFor(publicFloatBreakdown, ['key', 'label', 'shares', 'percent', 'color', 'source']);
  const tabs = [
    {
      id: 'overview',
      title: 'Overview',
      file: overviewFile,
      sourcePlatform: 'Backend Derived',
      recordCount: overview ? 1 : 0,
      status: 'ready',
    },
    {
      id: 'ownership-structure',
      title: 'Ownership Structure',
      file: overviewFile,
      sourcePlatform: 'Backend Derived',
      recordCount: ownershipStructure.length,
      status: 'ready',
    },
    {
      id: 'insider-bars',
      title: 'Insider Bars',
      file: overviewFile,
      sourcePlatform: 'Backend Derived',
      recordCount: insiderBars.length,
      status: 'ready',
    },
    {
      id: 'institution-bars',
      title: 'Institution Bars',
      file: overviewFile,
      sourcePlatform: 'Backend Derived',
      recordCount: institutionBars.length,
      status: 'ready',
    },
    {
      id: 'public-float-breakdown',
      title: 'Public Float',
      file: overviewFile,
      sourcePlatform: 'Backend Derived',
      recordCount: publicFloatBreakdown.length,
      status: 'ready',
    },
    {
      id: 'security-ownership',
      title: 'Security Ownership History',
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
          <p className="section-subtitle">Backend-derived chart fields plus raw historical ownership and activist filing records used by this page.</p>
          <span className="import-file-tag">{overviewFile}</span>
          <span className="import-file-tag">{securityFile}</span>
          <span className="import-file-tag">{activistFile}</span>
        </div>
      </div>

      <ImportDataTabs tabs={tabs}>
        <ImportDataTable columns={['field', 'value']} rows={overviewRows(overview)} pageSize={25} />
        <ImportDataTable columns={ownershipStructureColumns} rows={toTableRows(ownershipStructure, ownershipStructureColumns)} pageSize={25} />
        <ImportDataTable columns={insiderBarColumns} rows={toTableRows(insiderBars, insiderBarColumns)} pageSize={25} />
        <ImportDataTable columns={institutionBarColumns} rows={toTableRows(institutionBars, institutionBarColumns)} pageSize={25} />
        <ImportDataTable columns={publicFloatBreakdownColumns} rows={toTableRows(publicFloatBreakdown, publicFloatBreakdownColumns)} pageSize={25} />
        <ImportDataTable columns={securityColumns} rows={toTableRows(securityRows, securityColumns)} pageSize={25} />
        <ImportDataTable columns={activistColumns} rows={toTableRows(activistRows, activistColumns)} pageSize={25} />
      </ImportDataTabs>
    </section>
  );
}
