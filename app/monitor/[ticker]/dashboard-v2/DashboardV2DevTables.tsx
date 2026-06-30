'use client';

import { ImportDataTable } from '@/components/ImportDataTable';
import { ImportDataTabs } from '@/components/ImportDataTabs';

type DashboardV2DevTablesProps = {
  file: string;
  sourcePlatform: string;
  status: string;
  current: Record<string, unknown> | null;
  trends: Array<Record<string, unknown>>;
  marginInputs: Array<Record<string, unknown>>;
  marginFile: string;
  marginStatus: string;
  events: Array<Record<string, unknown>>;
  missingFromSource: unknown[];
  derived: Record<string, unknown> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'number') return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return `${value.length.toLocaleString()} records`;
  if (isRecord(value)) return 'Object';
  return String(value);
}

function toRows(rows: Array<Record<string, unknown>>, columns: string[]) {
  return rows.map(row => Object.fromEntries(columns.map(column => [column, formatValue(row[column])])));
}

function ObjectTable({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <p className="page__desc import-empty">No records imported yet.</p>;
  const rows = Object.entries(data)
    .filter(([, value]) => !isRecord(value) && !Array.isArray(value))
    .map(([field, value]) => ({ field, value: formatValue(value) }));
  return rows.length
    ? <ImportDataTable columns={['field', 'value']} rows={rows} pageSize={10} />
    : <p className="page__desc import-empty">No scalar fields available.</p>;
}

function TrendsTable({ trends }: { trends: Array<Record<string, unknown>> }) {
  const columns = ['date', 'price', 'feeRate', 'tradeVolume', 'shortableShares', 'daysToCover', 'utilization', 'margin'];
  return trends.length
    ? <ImportDataTable columns={columns} rows={toRows(trends, columns)} pageSize={25} />
    : <p className="page__desc import-empty">No trend records imported yet.</p>;
}

function ManualInputsTable({ rows, file }: { rows: Array<Record<string, unknown>>; file: string }) {
  const columns = ['date', 'ticker', 'initialMargin', 'maintenanceMargin', 'averageDurationDays', 'updatedAt', 'updatedBy'];
  return (
    <>
      <p className="import-local-note">
        Developer note: <strong>{file}</strong> is an operations-managed input file. Its storage status is shown on this tab.
      </p>
      {rows.length
        ? <ImportDataTable columns={columns} rows={toRows(rows, columns)} pageSize={25} />
        : <p className="page__desc import-empty">No manual dashboard input records saved yet.</p>}
    </>
  );
}

function EventsTable({ events }: { events: Array<Record<string, unknown>> }) {
  const columns = ['date', 'type', 'title', 'summary', 'source'];
  return events.length
    ? <ImportDataTable columns={columns} rows={toRows(events, columns)} pageSize={10} />
    : <p className="page__desc import-empty">No event records imported yet.</p>;
}

function MissingTable({ rows }: { rows: unknown[] }) {
  return rows.length
    ? <ImportDataTable columns={['field', 'status']} rows={rows.map(row => ({ field: formatValue(row), status: 'Missing from source' }))} pageSize={10} />
    : <p className="page__desc import-empty">No missing fields reported.</p>;
}

function DerivedCardsTable({ derived }: { derived: Record<string, unknown> | null }) {
  const cards = isRecord(derived?.dashboardV2) && isRecord(derived.dashboardV2.cards) ? derived.dashboardV2.cards : {};
  const rows = Object.entries(cards).flatMap(([period, periodValue]) => {
    if (!isRecord(periodValue) || !isRecord(periodValue.cards)) return [];
    return Object.entries(periodValue.cards).map(([metric, card]) => {
      const record = isRecord(card) ? card : {};
      return {
        period,
        metric,
        value: formatValue(record.valueDisplay ?? record.value),
        comparisonDate: formatValue(record.previousDate),
        change: formatValue(record.changeDisplay ?? record.change),
        changePercent: formatValue(record.changePercentDisplay ?? record.changePercent),
        tone: formatValue(record.tone),
        sourceStatus: formatValue(record.sourceStatus),
      };
    });
  });

  return rows.length
    ? <ImportDataTable columns={['period', 'metric', 'value', 'comparisonDate', 'change', 'changePercent', 'tone', 'sourceStatus']} rows={rows} pageSize={25} />
    : <p className="page__desc import-empty">No derived card records imported yet.</p>;
}

export function DashboardV2DevTables({
  file,
  sourcePlatform,
  status,
  current,
  trends,
  marginInputs,
  marginFile,
  marginStatus,
  events,
  missingFromSource,
  derived,
}: DashboardV2DevTablesProps) {
  const tabs = [
    { id: 'current', title: 'Current', file, sourcePlatform, recordCount: current ? 1 : 0, status },
    { id: 'trends', title: 'Trends', file, sourcePlatform, recordCount: trends.length, status },
    { id: 'manual-inputs', title: 'Manual Inputs', file: marginFile, sourcePlatform: 'Operations Dashboard', recordCount: marginInputs.length, status: marginStatus },
    { id: 'events', title: 'Events', file, sourcePlatform, recordCount: events.length, status },
    { id: 'derived', title: 'Derived Cards', file, sourcePlatform, recordCount: isRecord(derived?.dashboardV2) ? 1 : 0, status },
    { id: 'missing', title: 'Missing Fields', file, sourcePlatform, recordCount: missingFromSource.length, status },
  ];

  return (
    <section className="terminal-section import-data-dev-panel">
      <div className="terminal-section__head">
        <div>
          <span>Development Data</span>
          <h2>Dashboard V2 Import Tables</h2>
          <p className="section-subtitle">Raw tables from the consolidated Dashboard V2 import file.</p>
          <span className="import-file-tag">{file}</span>
        </div>
      </div>

      <ImportDataTabs tabs={tabs}>
        <ObjectTable data={current} />
        <TrendsTable trends={trends} />
        <ManualInputsTable rows={marginInputs} file={marginFile} />
        <EventsTable events={events} />
        <DerivedCardsTable derived={derived} />
        <MissingTable rows={missingFromSource} />
      </ImportDataTabs>
    </section>
  );
}
