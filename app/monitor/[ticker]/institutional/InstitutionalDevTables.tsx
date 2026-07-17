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
  managementHoldings: Array<Record<string, unknown>>;
};

const securityColumns = [
  'holderName',
  'formType',
  'fileDate',
  'effectiveDate',
  'shares',
  'percentChange',
  'value',
  'percentValueChange',
  'sourceType',
];

const activistColumns = [
  'holderName',
  'formType',
  'fileDate',
  'effectiveDate',
  'shares',
  'percentChange',
  'sourceType',
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
  managementHoldings,
}: InstitutionalDevTablesProps) {
  const ownershipStructureColumns = columnsFor(ownershipStructure, ['key', 'label', 'shares', 'percent', 'color']);
  const insiderBarColumns = columnsFor(insiderBars, ['name', 'shares', 'ownershipPercentOfInsiders', 'ownershipPercentOfSharesOutstanding']);
  const institutionBarColumns = columnsFor(institutionBars, ['name', 'shares', 'value', 'ownershipPercentOfInstitutional', 'ownershipPercentOfSharesOutstanding']);
  const publicFloatBreakdownColumns = columnsFor(publicFloatBreakdown, ['key', 'label', 'shares', 'percent', 'color', 'source']);
  const managementHoldingColumns = columnsFor(managementHoldings, ['holderName', 'category', 'shares', 'action', 'effectiveDate', 'showInOwnership', 'status']);
  const tabs = [
    {
      id: 'overview',
      title: 'Overview',
      file: overviewFile,
      sourcePlatform: 'Centralized Data API',
      recordCount: overview ? 1 : 0,
      status: 'ready',
    },
    {
      id: 'management-holdings',
      title: 'Strategic Entities',
      file: 'GET /manual-input/management-holdings',
      sourcePlatform: 'Manual Input V2 API',
      recordCount: managementHoldings.length,
      status: 'ready',
    },
    {
      id: 'ownership-structure',
      title: 'Ownership Structure',
      file: overviewFile,
      sourcePlatform: 'Centralized Data API',
      recordCount: ownershipStructure.length,
      status: 'ready',
    },
    {
      id: 'insider-bars',
      title: 'Insider Bars',
      file: overviewFile,
      sourcePlatform: 'Centralized Data API',
      recordCount: insiderBars.length,
      status: 'ready',
    },
    {
      id: 'institution-bars',
      title: 'Institution Bars',
      file: overviewFile,
      sourcePlatform: 'Centralized Data API',
      recordCount: institutionBars.length,
      status: 'ready',
    },
    {
      id: 'public-float-breakdown',
      title: 'Public Float',
      file: overviewFile,
      sourcePlatform: 'Centralized Data API',
      recordCount: publicFloatBreakdown.length,
      status: 'ready',
    },
    {
      id: 'security-ownership',
      title: 'Security Ownership History',
      file: securityFile,
      sourcePlatform: 'Centralized Data API',
      recordCount: securityRows.length,
      status: 'ready',
    },
    {
      id: 'activist-filings',
      title: 'Activist Filings',
      file: activistFile,
      sourcePlatform: 'Centralized Data API',
      recordCount: activistRows.length,
      status: 'ready',
    },
  ];

  return (
    <section className="terminal-section import-data-dev-panel">
      <div className="terminal-section__head">
        <div>
          <span>Development Data</span>
          <h2>Institutional Ownership API Tables</h2>
          <p className="section-subtitle">Current and historical records returned by the centralized APIs. No local or S3 JSON fallback is used.</p>
          <span className="import-file-tag">{overviewFile}</span>
          <span className="import-file-tag">{securityFile}</span>
          <span className="import-file-tag">{activistFile}</span>
          <span className="import-file-tag">GET /manual-input/management-holdings</span>
        </div>
      </div>

      <ImportDataTabs tabs={tabs}>
        <ImportDataTable columns={['field', 'value']} rows={overviewRows(overview)} pageSize={25} />
        <ImportDataTable columns={managementHoldingColumns} rows={toTableRows(managementHoldings, managementHoldingColumns)} pageSize={25} />
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
