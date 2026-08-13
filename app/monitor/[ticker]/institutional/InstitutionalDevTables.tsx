'use client';

import { ImportDataTable } from '@/components/ImportDataTable';
import { ImportDataTabs } from '@/components/ImportDataTabs';

type InstitutionalDevTablesProps = {
  ticker: string;
  overviewFile: string;
  activistFile: string;
  manualOwnershipFile: string;
  manualOwnershipDate: string | null;
  manualOwnershipError: string;
  ownershipCurrent: Record<string, unknown> | null;
  ownershipSummaryCurrent: Record<string, unknown> | null;
  overview: Record<string, unknown> | null;
  internalFloatCurrent: Record<string, unknown> | null;
  expectedUserStrategicShares: number;
  displayedStrategicShares: number;
  ownershipStructure: Array<Record<string, unknown>>;
  insiderBars: Array<Record<string, unknown>>;
  institutionBars: Array<Record<string, unknown>>;
  publicFloatBreakdown: Array<Record<string, unknown>>;
  manualOwnershipRows: Array<Record<string, unknown>>;
  activistRows: Array<Record<string, unknown>>;
  managementHoldings: Array<Record<string, unknown>>;
  latestFilings: Array<Record<string, unknown>>;
  marketHistory: Array<Record<string, unknown>>;
};

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
  displayedStrategicShares: number,
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
    { field: 'frontend.displayedConsolidatedShares', value: formatValue(displayedStrategicShares) },
    {
      field: 'frontend.matchesCurrentUserInput',
      value: Math.abs(displayedStrategicShares - expectedUserStrategicShares) <= 0.5 ? 'Yes' : 'No',
    },
  ];
}

function columnsFor(rows: Array<Record<string, unknown>>, fallback: string[]) {
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  return columns.length ? columns : fallback;
}

export function InstitutionalDevTables({
  ticker,
  overviewFile,
  activistFile,
  manualOwnershipFile,
  manualOwnershipDate,
  manualOwnershipError,
  ownershipCurrent,
  ownershipSummaryCurrent,
  overview,
  internalFloatCurrent,
  expectedUserStrategicShares,
  displayedStrategicShares,
  ownershipStructure,
  insiderBars,
  institutionBars,
  publicFloatBreakdown,
  manualOwnershipRows,
  activistRows,
  managementHoldings,
  latestFilings,
  marketHistory,
}: InstitutionalDevTablesProps) {
  const ownershipStructureColumns = columnsFor(ownershipStructure, ['key', 'label', 'shares', 'percent', 'color']);
  const insiderBarColumns = columnsFor(insiderBars, ['name', 'shares', 'ownershipPercentOfInsiders', 'ownershipPercentOfSharesOutstanding']);
  const institutionBarColumns = columnsFor(institutionBars, ['name', 'shares', 'value', 'ownershipPercentOfInstitutional', 'ownershipPercentOfSharesOutstanding']);
  const publicFloatBreakdownColumns = columnsFor(publicFloatBreakdown, ['key', 'label', 'shares', 'percent', 'color', 'source']);
  const managementHoldingColumns = columnsFor(managementHoldings, ['holderName', 'category', 'shares', 'action', 'effectiveDate', 'showInOwnership', 'status']);
  const manualOwnershipColumns = columnsFor(manualOwnershipRows, [
    'fileDate',
    'effectiveDate',
    'source',
    'investor',
    'optionType',
    'type',
    'avgPriceEst',
    'shares',
    'sharesPct',
    'reportedValue',
    'valueChangePct',
    'portAlloc',
  ]);
  const latestFilingColumns = columnsFor(latestFilings, [
    'holderName',
    'formType',
    'fileDate',
    'effectiveDate',
    'shares',
    'prevShares',
    'avgPrice',
    'percentOfInstitutionalShares',
    'positionStatus',
  ]);
  const marketHistoryColumns = columnsFor(marketHistory, ['tradeDate', 'price', 'open', 'high', 'low', 'close']);
  const tabs = [
    {
      id: 'ownership-current-raw',
      title: 'Ownership Current (Raw)',
      file: overviewFile,
      sourcePlatform: 'API Gateway',
      recordCount: ownershipCurrent ? 1 : 0,
      status: ownershipCurrent ? 'ready' : 'missing',
    },
    {
      id: 'overview-view-model',
      title: 'Ownership View Model',
      file: `Frontend composition: GET /market-data/current?ticker=${encodeURIComponent(ticker)}&category=ownership-current + GET /market-data/current?ticker=${encodeURIComponent(ticker)}&category=internal-float-current-user`,
      sourcePlatform: 'Frontend composition',
      recordCount: overview ? 1 : 0,
      status: overview ? 'ready' : 'missing',
    },
    {
      id: 'ownership-summary-current',
      title: 'Institutional Activity Summary',
      file: `GET /market-data/current?ticker=${encodeURIComponent(ticker)}&category=ownership-summary-current`,
      sourcePlatform: 'API Gateway',
      recordCount: ownershipSummaryCurrent ? 1 : 0,
      status: ownershipSummaryCurrent ? 'ready' : 'missing',
    },
    {
      id: 'latest-institutional-filings',
      title: 'Latest Filings',
      file: `GET /market-data/current?ticker=${encodeURIComponent(ticker)}&category=ownership-current · institutionBreakdown`,
      sourcePlatform: 'API Gateway',
      recordCount: latestFilings.length,
      status: 'ready',
    },
    {
      id: 'ownership-chart-market-history',
      title: 'Chart Price History',
      file: `GET /market-data/history?ticker=${encodeURIComponent(ticker)}&category=market-history`,
      sourcePlatform: 'API Gateway',
      recordCount: marketHistory.length,
      status: marketHistory.length ? 'ready' : 'missing',
    },
    {
      id: 'management-holdings',
      title: 'User Strategic Entities',
      file: `GET /manual-input/internal-float-inputs-user?ticker=${encodeURIComponent(ticker)}`,
      sourcePlatform: 'API Gateway · Authenticated user scope',
      recordCount: managementHoldings.length,
      status: 'ready',
    },
    {
      id: 'internal-float-current-user',
      title: 'Consolidated Strategic Total',
      file: `GET /market-data/current?ticker=${encodeURIComponent(ticker)}&category=internal-float-current-user`,
      sourcePlatform: 'API Gateway',
      recordCount: internalFloatCurrent ? 1 : 0,
      status: internalFloatCurrent ? 'ready' : 'missing',
    },
    {
      id: 'ownership-structure',
      title: 'Ownership Structure',
      file: overviewFile,
      sourcePlatform: 'API Gateway',
      recordCount: ownershipStructure.length,
      status: 'ready',
    },
    {
      id: 'insider-bars',
      title: 'Insider Bars',
      file: overviewFile,
      sourcePlatform: 'API Gateway',
      recordCount: insiderBars.length,
      status: 'ready',
    },
    {
      id: 'institution-bars',
      title: 'Institution Bars',
      file: overviewFile,
      sourcePlatform: 'API Gateway',
      recordCount: institutionBars.length,
      status: 'ready',
    },
    {
      id: 'public-float-breakdown',
      title: 'Public Float',
      file: overviewFile,
      sourcePlatform: 'API Gateway',
      recordCount: publicFloatBreakdown.length,
      status: 'ready',
    },
    {
      id: 'manual-security-ownership',
      title: 'Manual Security Ownership',
      file: manualOwnershipFile,
      sourcePlatform: 'API Gateway',
      recordCount: manualOwnershipRows.length,
      status: manualOwnershipError ? `error: ${manualOwnershipError}` : manualOwnershipDate ? `ready · ${manualOwnershipDate}` : 'missing',
    },
    {
      id: 'activist-filings',
      title: 'Activist Filings',
      file: activistFile,
      sourcePlatform: 'API Gateway',
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
          <span className="import-file-tag">GET /market-data/current?category=ownership-summary-current</span>
          <span className="import-file-tag">{activistFile}</span>
          <span className="import-file-tag">{manualOwnershipFile}</span>
          <span className="import-file-tag">GET /market-data/current?category=internal-float-current-user</span>
          <span className="import-file-tag">GET /manual-input/internal-float-inputs-user</span>
          <span className="import-file-tag">GET /market-data/history?category=market-history</span>
        </div>
      </div>

      <ImportDataTabs tabs={tabs}>
        <ImportDataTable columns={['field', 'value']} rows={flattenedRows(ownershipCurrent)} pageSize={25} />
        <ImportDataTable columns={['field', 'value']} rows={overviewRows(overview)} pageSize={25} />
        <ImportDataTable columns={['field', 'value']} rows={flattenedRows(ownershipSummaryCurrent)} pageSize={25} />
        <ImportDataTable columns={latestFilingColumns} rows={toTableRows(latestFilings, latestFilingColumns)} pageSize={25} />
        <ImportDataTable columns={marketHistoryColumns} rows={toTableRows(marketHistory, marketHistoryColumns)} pageSize={25} />
        <ImportDataTable columns={managementHoldingColumns} rows={toTableRows(managementHoldings, managementHoldingColumns)} pageSize={25} />
        <ImportDataTable
          columns={['field', 'value']}
          rows={consolidatedStrategicRows(internalFloatCurrent, expectedUserStrategicShares, displayedStrategicShares)}
          pageSize={25}
        />
        <ImportDataTable columns={ownershipStructureColumns} rows={toTableRows(ownershipStructure, ownershipStructureColumns)} pageSize={25} />
        <ImportDataTable columns={insiderBarColumns} rows={toTableRows(insiderBars, insiderBarColumns)} pageSize={25} />
        <ImportDataTable columns={institutionBarColumns} rows={toTableRows(institutionBars, institutionBarColumns)} pageSize={25} />
        <ImportDataTable columns={publicFloatBreakdownColumns} rows={toTableRows(publicFloatBreakdown, publicFloatBreakdownColumns)} pageSize={25} />
        <ImportDataTable columns={manualOwnershipColumns} rows={toTableRows(manualOwnershipRows, manualOwnershipColumns)} pageSize={25} />
        <ImportDataTable columns={activistColumns} rows={toTableRows(activistRows, activistColumns)} pageSize={25} />
      </ImportDataTabs>
    </section>
  );
}
