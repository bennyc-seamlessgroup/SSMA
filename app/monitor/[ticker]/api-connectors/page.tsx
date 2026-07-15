import { ImportDataTable } from '@/components/ImportDataTable';
import { getCurrentDataSourceRows } from '@/lib/current-data-sources';
import { normalizeTicker } from '@/lib/ticker-data';

export default async function ApiConnectorsPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);
  const rows = await getCurrentDataSourceRows(normalizedTicker);
  const connectorNames = Array.from(new Set(rows.map(row => row.owner)));

  return (
    <div className="page">
      <div className="compact-page-header">
        <span>Connectors</span>
        <p>Active API pipelines and retained social/report data connections.</p>
      </div>

      <section className="panel">
        <div className="section-list" style={{ marginBottom: 16 }}>
          {connectorNames.map(name => {
            const connectorRows = rows.filter(row => row.owner === name);
            const readyCount = connectorRows.filter(row => row.status === 'Ready').length;
            return (
              <div className="section" key={name}>
                <h2 className="section__title">{name}</h2>
                <p className="page__desc" style={{ margin: '8px 0 0' }}>{readyCount} of {connectorRows.length} outputs ready</p>
              </div>
            );
          })}
        </div>
        <ImportDataTable
          columns={['connector', 'page', 'connection', 'jsonSource', 'status']}
          rows={rows.map(row => ({
            connector: row.owner,
            page: row.page,
            connection: row.connection,
            jsonSource: row.jsonSource,
            status: row.status,
          }))}
          pageSize={50}
        />
      </section>
    </div>
  );
}
