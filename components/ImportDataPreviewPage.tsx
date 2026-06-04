import { readImportFile } from '@/lib/import-data';
import { ImportDataTable } from '@/components/ImportDataTable';
import { InfoTooltip } from '@/components/InfoTooltip';
import { ImportDataTabs } from '@/components/ImportDataTabs';

type ImportDataPreviewPageProps = {
  title: string;
  description: string;
  files: string[];
  children?: React.ReactNode;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatLabel(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'number') return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return `${value.length} records`;
  if (isRecord(value)) return 'Object';
  return String(value);
}

function cleanTitle(file: string) {
  const name = file.split('/').pop()?.replace('.json', '') ?? file;
  return name.replace(/_/g, ' ').replace(/^./, char => char.toUpperCase());
}

function DataSection({ row }: {
  row: {
    file: string;
    title: string;
    sourcePlatform: string;
    recordCount: number;
    status: string;
    notes: string;
    data: unknown;
  };
}) {
  return (
    <div className="section import-data-section">
      <div className="section__head import-dataset-head">
        <div>
          <h3 className="section__title with-info">
            {row.title}
            <InfoTooltip text="This table is rendered from the normalized import_data JSON file shown below. Backend connectors can replace the file content without changing the portal UI." />
          </h3>
          <span className="import-file-tag">{row.file}</span>
        </div>
        <div className="import-source-meta">
          <span>{row.sourcePlatform}</span>
          <span>{row.recordCount.toLocaleString()} records</span>
          <span>{row.status}</span>
        </div>
      </div>
      {row.notes && <p className="page__desc import-notes">{row.notes}</p>}
      <ImportDataRenderer data={row.data} />
    </div>
  );
}

function pickColumns(rows: Record<string, unknown>[]) {
  const preferred = [
    'date',
    'fileDate',
    'effectiveDate',
    'publishDate',
    'investorName',
    'insiderName',
    'securityName',
    'formType',
    'shares',
    'sharesChange',
    'percentChange',
    'value',
    'costToBorrowAll',
    'shortAvailabilityShares',
    'shortInterestPcFreeFloat',
    'putCallRatio',
    'title',
    'alertType',
    'severity',
    'sourcePlatform',
  ];
  const discovered = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const ordered = [...preferred.filter(key => discovered.includes(key)), ...discovered.filter(key => !preferred.includes(key))];
  return ordered.slice(0, 9);
}

function DataRowsTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) {
    return <p className="page__desc import-empty">No records imported yet.</p>;
  }
  const columns = pickColumns(rows);
  const tableRows = rows.map(row => Object.fromEntries(columns.map(column => [column, formatValue(row[column])])));
  return <ImportDataTable columns={columns} rows={tableRows} pageSize={10} />;
}

function ObjectSummaryTable({ data }: { data: Record<string, unknown> }) {
  const rows = Object.entries(data).filter(([, value]) => !Array.isArray(value) && !isRecord(value));
  if (!rows.length) return null;
  return <ImportDataTable columns={['field', 'value']} rows={rows.map(([key, value]) => ({ field: formatLabel(key), value: formatValue(value) }))} pageSize={10} />;
}

function ImportDataRenderer({ data }: { data: unknown }) {
  if (Array.isArray(data)) {
    return <DataRowsTable rows={data.filter(isRecord)} />;
  }
  if (isRecord(data)) {
    const arrayEntries = Object.entries(data).filter(([, value]) => Array.isArray(value)) as Array<[string, unknown[]]>;
    const objectEntries = Object.entries(data).filter(([, value]) => isRecord(value)) as Array<[string, Record<string, unknown>]>;
    return (
      <div className="import-render-stack">
        <ObjectSummaryTable data={data} />
        {objectEntries.map(([key, value]) => (
          <div className="import-subsection" key={key}>
            <h4>{formatLabel(key)}</h4>
            <ObjectSummaryTable data={value} />
          </div>
        ))}
        {arrayEntries.map(([key, value]) => (
          <div className="import-subsection" key={key}>
            <h4>{formatLabel(key)}</h4>
            <DataRowsTable rows={value.filter(isRecord)} />
          </div>
        ))}
      </div>
    );
  }
  return <p className="page__desc import-empty">{formatValue(data)}</p>;
}

export async function ImportDataPreviewPage({ title, description, files, children }: ImportDataPreviewPageProps) {
  const datasets = await Promise.all(files.map(async file => {
    try {
      const envelope = await readImportFile(file);
      return {
        id: file.replace(/[^a-zA-Z0-9]+/g, '-'),
        file,
        title: cleanTitle(file),
        sourcePlatform: envelope.sourcePlatform ?? 'Internal',
        recordCount: envelope.recordCount ?? 0,
        status: envelope.status ?? 'ready',
        notes: envelope.notes ?? 'Ready for portal workflow.',
        importedAt: envelope.importedAt ?? '',
        data: envelope.data,
      };
    } catch {
      return {
        id: file.replace(/[^a-zA-Z0-9]+/g, '-'),
        file,
        title: cleanTitle(file),
        sourcePlatform: 'Missing import file',
        recordCount: 0,
        status: 'missing',
        notes: 'This import file is mapped but was not found in the active data source.',
        importedAt: '',
        data: [],
      };
    }
  }));

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">{title}</h1>
          <p className="page__desc">{description}</p>
        </div>
      </div>
      <section className="panel">
        {children}
        <div className="import-data-dev-panel">
          {datasets.length > 1 ? (
            <ImportDataTabs
              tabs={datasets.map(row => ({
                id: row.id,
                title: row.title,
                file: row.file,
                sourcePlatform: row.sourcePlatform,
                recordCount: row.recordCount,
                status: row.status,
              }))}
            >
              {datasets.map(row => <DataSection key={row.file} row={row} />)}
            </ImportDataTabs>
          ) : (
            <div className="section-list">
              {datasets.map(row => <DataSection key={row.file} row={row} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
