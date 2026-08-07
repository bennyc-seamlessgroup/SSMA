'use client';

import { ImportDataTable } from '@/components/ImportDataTable';
import { ImportDataTabs } from '@/components/ImportDataTabs';

type InstitutionalDevTablesProps = {
  overviewFile: string;
  securityFile: string;
  activistFile: string;
  ownershipCurrent: Record<string, unknown> | null;
  overview: Record<string, unknown> | null;
  internalFloatCurrent: Record<string, unknown> | null;
  expectedUserStrategicShares: number;
  userScopedStrategicShares: number | null;
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

function flattenedRows(value: unknown, prefix = ''): Array<{ field: string; value: string }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [{ field: prefix, value: formatValue(value) }] : [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) => {
    const field = prefix ? `${prefix}.${key}` : key;
    if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
      return flattenedRows(nestedValue, field);
    }
    return [{ field, value: formatValue(nestedValue) }];
  });
}

function consolidatedStrategicRows(
  snapshot: Record<string, unknown> | null,
  expectedUserStrategicShares: number,
  userScopedStrategicShares: number | null,
) {
  const holdings = snapshot?.managementStrategicHoldings;
  const holdingsRecord = holdings && typeof holdings === 'object' && !Array.isArray(holdings)
    ? holdings as Record<string, unknown>
    : null;
  return [
    { field: 'generatedAt', value: formatValue(snapshot?.generatedAt) },
    { field: 'updatedAt', value: formatValue(snapshot?.updatedAt) },
    { field: 'managementStrategicHoldings.shares', value: formatValue(holdingsRecord?.shares) },
    { field: 'managementStrategicHoldings.records', value: formatValue(holdingsRecord?.records) },
    { field: 'frontend.expectedUserInputShares', value: formatValue(expectedUserStrategicShares) },
    { field: 'frontend.acceptedAsUserScoped', value: userScopedStrategicShares == null ? 'No' : 'Yes' },
  ];
}

function columnsFor(rows: Array<Record<string, unknown>>, fallback: string[]) {
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  return columns.length ? columns : fallback;
}

export function InstitutionalDevTables({
  overviewFile,
  securityFile,
  activistFile,
  ownershipCurrent,
  overview,
  internalFloatCurrent,
  expectedUserStrategicShares,
  userScopedStrategicShares,
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
      id: 'ownership-current-raw',
      title: 'Ownership Current (Raw)',
      file: overviewFile,
      sourcePlatform: 'Market Data API',
      recordCount: ownershipCurrent ? 1 : 0,
      status: ownershipCurrent ? 'ready' : 'missing',
    },
    {
      id: 'overview-view-model',
      title: 'Ownership View Model',
      file: 'Frontend composition: ownership-current + internal-float-current-user',
      sourcePlatform: 'Frontend composition',
      recordCount: overview ? 1 : 0,
      status: overview ? 'ready' : 'missing',
    },
    {
      id: 'management-holdings',
      title: 'User Strategic Entities',
      file: 'GET /manual-input/internal-float-inputs-user',
      sourcePlatform: 'Authenticated user scope',
      recordCount: managementHoldings.length,
      status: 'ready',
    },
    {
      id: 'internal-float-current-user',
      title: 'Consolidated Strategic Total',
      file: 'GET /market-data/current?category=internal-float-current-user',
      sourcePlatform: 'Market Data API',
      recordCount: internalFloatCurrent ? 1 : 0,
      status: internalFloatCurrent ? 'ready' : 'missing',
    },
    {
      id: 'ownership-structure',
      title: 'Ownership Structure',
      file: overviewFile,
      sourcePlatform: overviewFile,
      recordCount: ownershipStructure.length,
      status: 'ready',
    },
    {
      id: 'insider-bars',
      title: 'Insider Bars',
      file: overviewFile,
      sourcePlatform: overviewFile,
      recordCount: insiderBars.length,
      status: 'ready',
    },
    {
      id: 'institution-bars',
      title: 'Institution Bars',
      file: overviewFile,
      sourcePlatform: overviewFile,
      recordCount: institutionBars.length,
      status: 'ready',
    },
    {
      id: 'public-float-breakdown',
      title: 'Public Float',
      file: overviewFile,
      sourcePlatform: overviewFile,
      recordCount: publicFloatBreakdown.length,
      status: 'ready',
    },
    {
      id: 'security-ownership',
      title: 'Security Ownership History',
      file: securityFile,
      sourcePlatform: securityFile,
      recordCount: securityRows.length,
      status: 'ready',
    },
    {
      id: 'activist-filings',
      title: 'Activist Filings',
      file: activistFile,
      sourcePlatform: activistFile,
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
          <span className="import-file-tag">GET /market-data/current?category=internal-float-current-user</span>
          <span className="import-file-tag">GET /manual-input/internal-float-inputs-user</span>
        </div>
      </div>

      <ImportDataTabs tabs={tabs}>
        <ImportDataTable columns={['field', 'value']} rows={flattenedRows(ownershipCurrent)} pageSize={25} />
        <ImportDataTable columns={['field', 'value']} rows={overviewRows(overview)} pageSize={25} />
        <ImportDataTable columns={managementHoldingColumns} rows={toTableRows(managementHoldings, managementHoldingColumns)} pageSize={25} />
        <ImportDataTable
          columns={['field', 'value']}
          rows={consolidatedStrategicRows(internalFloatCurrent, expectedUserStrategicShares, userScopedStrategicShares)}
          pageSize={25}
        />
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
