import { ImportDataTable } from '@/components/ImportDataTable';
import { SettingsBackLink } from '@/components/SettingsBackLink';
import { readImportDataPoolRows } from '@/lib/import-data';

function formatDate(value: string) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default async function ImportDataPoolPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = ticker?.toUpperCase() ?? 'CURR';
  const rows = readImportDataPoolRows();
  const tableRows = rows.map(row => ({
    category: row.category,
    fileName: row.fileName,
    sourcePlatform: row.sourcePlatform,
    lastUpdated: formatDate(row.lastUpdated),
    recordCount: row.recordCount.toLocaleString(),
    status: row.status,
    notes: row.notes || 'Ready',
  }));

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Import Data Pool</h1>
          <p className="page__desc">Standardized data files used by portal dashboards, AI reports, and alert logic.</p>
        </div>
        <SettingsBackLink ticker={normalizedTicker} />
      </div>

      <section className="panel">
        <ImportDataTable
          columns={['category', 'fileName', 'sourcePlatform', 'lastUpdated', 'recordCount', 'status', 'notes']}
          rows={tableRows}
          pageSize={50}
        />
      </section>
    </div>
  );
}
