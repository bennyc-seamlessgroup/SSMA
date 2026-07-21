'use client';

import { ImportDataTable } from '@/components/ImportDataTable';
import { ImportDataTabs } from '@/components/ImportDataTabs';

export type ApiDevelopmentSource = {
  id: string;
  title: string;
  endpoint: string;
  source: string;
  payload: unknown;
  status?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'number') return value.toLocaleString('en-US', { maximumFractionDigits: 8 });
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value) || isRecord(value)) return JSON.stringify(value);
  return String(value);
}

function payloadRecords(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.records)) return payload.records.filter(isRecord);
  if (Array.isArray(payload.data)) return payload.data.filter(isRecord);
  if (isRecord(payload.data) && Array.isArray(payload.data.records)) return payload.data.records.filter(isRecord);
  return [];
}

function recordCount(payload: unknown) {
  const records = payloadRecords(payload);
  if (records.length) return records.length;
  return payload === null || payload === undefined ? 0 : 1;
}

function rowsTable(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return null;
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  return (
    <ImportDataTable
      columns={columns}
      rows={rows.map(row => Object.fromEntries(columns.map(column => [column, formatValue(row[column])]))) }
      pageSize={25}
      expandableColumns={columns.filter(column => rows.some(row => Array.isArray(row[column]) || isRecord(row[column])))}
    />
  );
}

function PayloadPanel({ source }: { source: ApiDevelopmentSource }) {
  const records = payloadRecords(source.payload);
  const metadata = isRecord(source.payload)
    ? Object.entries(source.payload)
      .filter(([key, value]) => key !== 'records' && !(key === 'data' && (Array.isArray(value) || (isRecord(value) && Array.isArray(value.records)))))
      .map(([field, value]) => ({ field, value: formatValue(value) }))
    : [];

  return (
    <div className="api-development-panel">
      <div className="api-development-panel__meta">
        <code>{source.endpoint}</code>
        <span>{source.source}</span>
        <span className={`api-development-status ${source.status?.toLowerCase().startsWith('error') ? 'error' : ''}`}>{source.status ?? 'Connected'}</span>
      </div>
      {metadata.length ? <ImportDataTable columns={['field', 'value']} rows={metadata} pageSize={15} expandableColumns={['value']} /> : null}
      {rowsTable(records)}
      {!metadata.length && !records.length && isRecord(source.payload) ? (
        <ImportDataTable
          columns={['field', 'value']}
          rows={Object.entries(source.payload).map(([field, value]) => ({ field, value: formatValue(value) }))}
          pageSize={25}
          expandableColumns={['value']}
        />
      ) : null}
      {!metadata.length && !records.length && !isRecord(source.payload) ? <p className="import-empty">No payload returned by this API.</p> : null}
    </div>
  );
}

export function ApiDevelopmentTabs({ sources }: { sources: ApiDevelopmentSource[] }) {
  const tabs = sources.map(source => ({
    id: source.id,
    title: source.title,
    file: source.endpoint,
    sourcePlatform: source.endpoint,
    recordCount: recordCount(source.payload),
    status: source.status ?? 'api',
  }));

  return (
    <ImportDataTabs tabs={tabs}>
      {sources.map(source => <PayloadPanel key={source.id} source={source} />)}
    </ImportDataTabs>
  );
}
