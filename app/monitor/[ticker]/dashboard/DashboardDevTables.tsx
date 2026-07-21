'use client';

import { ImportDataTable } from '@/components/ImportDataTable';
import { ImportDataTabs } from '@/components/ImportDataTabs';

type ApiTable = {
  id: string;
  title: string;
  endpoint: string;
  payload: unknown;
};

type DashboardDevTablesProps = {
  marketCurrent: Record<string, unknown> | null;
  marketHistory: Record<string, unknown> | null;
  secFilingsHistory: Record<string, unknown> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'number') return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value) || isRecord(value)) return JSON.stringify(value);
  return String(value);
}

function flattenObject(input: Record<string, unknown>, prefix = ''): Array<{ field: string; value: string }> {
  return Object.entries(input).flatMap(([key, value]) => {
    const field = prefix ? `${prefix}.${key}` : key;
    if (isRecord(value)) return flattenObject(value, field);
    return [{ field, value: formatValue(value) }];
  });
}

function recordCount(payload: unknown) {
  if (Array.isArray(payload)) return payload.length;
  if (isRecord(payload) && Array.isArray(payload.records)) return payload.records.length;
  return payload ? 1 : 0;
}

function RecordsTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return <p className="page__desc import-empty">No records returned by this API.</p>;
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const formattedRows = rows.map(row => Object.fromEntries(columns.map(column => [column, formatValue(row[column])])));
  return <ImportDataTable columns={columns} rows={formattedRows} pageSize={25} />;
}

function PayloadTable({ payload }: { payload: unknown }) {
  if (Array.isArray(payload)) {
    return <RecordsTable rows={payload.filter(isRecord)} />;
  }
  if (!isRecord(payload)) {
    return <p className="page__desc import-empty">No payload returned by this API.</p>;
  }

  const records = Array.isArray(payload.records) ? payload.records.filter(isRecord) : [];
  const metadata = Object.fromEntries(Object.entries(payload).filter(([key]) => key !== 'records'));
  const metadataRows = flattenObject(metadata);

  return (
    <>
      {metadataRows.length > 0 && (
        <ImportDataTable columns={['field', 'value']} rows={metadataRows} pageSize={15} />
      )}
      {records.length > 0 && <RecordsTable rows={records} />}
      {!metadataRows.length && !records.length && (
        <p className="page__desc import-empty">This API returned an empty object.</p>
      )}
    </>
  );
}

export function DashboardDevTables({
  marketCurrent,
  marketHistory,
  secFilingsHistory,
}: DashboardDevTablesProps) {
  const apiTables: ApiTable[] = [
    {
      id: 'market-current',
      title: 'Market Current',
      endpoint: 'GET /market-data/current?category=market-current',
      payload: marketCurrent,
    },
    {
      id: 'market-history',
      title: 'Market History',
      endpoint: 'GET /market-data/history?category=market-history',
      payload: marketHistory,
    },
    {
      id: 'sec-filings',
      title: 'SEC Filings',
      endpoint: 'GET /manual-input/sec-filings',
      payload: secFilingsHistory,
    },
  ];
  const tabs = apiTables.map(table => ({
    id: table.id,
    title: table.title,
    file: table.endpoint,
    sourcePlatform: table.endpoint,
    recordCount: recordCount(table.payload),
    status: 'api',
  }));

  return (
    <section className="terminal-section import-data-dev-panel">
      <div className="terminal-section__head">
        <div>
          <span>Development Data</span>
          <h2>Dashboard API Tables</h2>
          <p className="section-subtitle">Each tab shows one uncombined API response.</p>
        </div>
      </div>

      <ImportDataTabs tabs={tabs}>
        {apiTables.map(table => <PayloadTable key={table.id} payload={table.payload} />)}
      </ImportDataTabs>
    </section>
  );
}
