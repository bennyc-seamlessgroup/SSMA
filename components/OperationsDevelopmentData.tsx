'use client';

import { ImportDataTable } from '@/components/ImportDataTable';

export type OperationsDevelopmentDatum = {
  endpoint: string;
  source: string;
  state: string;
  recordCount?: number | string;
  updatedAt?: string;
  payload?: unknown;
};

type OperationsDevelopmentDataProps = {
  title: string;
  description: string;
  rows: OperationsDevelopmentDatum[];
};

function serializePayload(payload: unknown) {
  if (payload === undefined) return 'Not available';
  if (payload === null) return 'null';
  if (typeof payload === 'string') return payload || 'Empty string';

  try {
    const serialized = JSON.stringify(payload);
    if (!serialized) return String(payload);
    return serialized.length > 800 ? `${serialized.slice(0, 800)}…` : serialized;
  } catch {
    return String(payload);
  }
}

export function OperationsDevelopmentData({ title, description, rows }: OperationsDevelopmentDataProps) {
  const tableRows = rows.map(row => ({
    endpoint: row.endpoint,
    source: row.source,
    state: row.state,
    recordCount: row.recordCount === undefined ? 'N/A' : String(row.recordCount),
    updatedAt: row.updatedAt || 'N/A',
    payload: serializePayload(row.payload),
  }));

  return (
    <section className="ops-panel ops-wide-panel operations-development-data import-data-dev-panel" aria-label={`${title} development data`}>
      <div className="ops-panel-head">
        <div>
          <span className="ops-eyebrow">Development Data</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <ImportDataTable
        columns={['endpoint', 'source', 'state', 'recordCount', 'updatedAt', 'payload']}
        rows={tableRows}
        pageSize={10}
      />
    </section>
  );
}
