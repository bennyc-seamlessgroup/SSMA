import { ImportDataTable } from '@/components/ImportDataTable';
import { getCurrentDataSourceRows } from '@/lib/current-data-sources';
import { normalizeTicker } from '@/lib/ticker-data';

function formatDate(value: string | null) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default async function DataSourcesPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);
  const rows = await getCurrentDataSourceRows(normalizedTicker);
  const tableRows = rows.map(row => ({
    page: row.page,
    connection: row.connection,
    jsonSource: row.jsonSource,
    owner: row.owner,
    lastUpdated: formatDate(row.lastUpdated),
    records: row.recordCount?.toLocaleString('en-US') ?? 'N/A',
    status: row.status,
  }));

  return (
    <div className="page">
      <section className="panel">
        <div className="section-list" style={{ marginBottom: 16 }}>
          <div className="section">
            <h2 className="section__title">Runtime source</h2>
            <p className="page__desc" style={{ margin: '8px 0 0' }}>Authenticated centralized APIs</p>
          </div>
          <div className="section">
            <h2 className="section__title">Tracked connections</h2>
            <p className="page__desc" style={{ margin: '8px 0 0' }}>{rows.length.toLocaleString('en-US')} active API connections or retained social/report prefixes for {normalizedTicker}</p>
          </div>
        </div>
        <ImportDataTable
          columns={['page', 'connection', 'jsonSource', 'owner', 'lastUpdated', 'records', 'status']}
          rows={tableRows}
          pageSize={50}
        />
      </section>
    </div>
  );
}
