'use client';

import { ApiDevelopmentTabs } from '@/components/ApiDevelopmentTabs';

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

export function OperationsDevelopmentData({ title, description, rows }: OperationsDevelopmentDataProps) {
  return (
    <section className="ops-panel ops-wide-panel operations-development-data import-data-dev-panel" aria-label={`${title} development data`}>
      <div className="ops-panel-head">
        <div>
          <span className="ops-eyebrow">Development Data</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <ApiDevelopmentTabs sources={rows.map((row, index) => ({
        id: `operations-api-${index}`,
        title: row.endpoint.replace(/^\w+\s+/, '').split('?')[0].split('/').filter(Boolean).slice(-2).join(' / ') || `API ${index + 1}`,
        endpoint: row.endpoint,
        source: row.source,
        payload: row.payload,
        status: [row.state, row.recordCount === undefined ? '' : `${row.recordCount} records`, row.updatedAt || ''].filter(Boolean).join(' · '),
      }))} />
    </section>
  );
}
