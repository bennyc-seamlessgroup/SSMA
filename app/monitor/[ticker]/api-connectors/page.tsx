import { readSourceMap } from '@/lib/import-data';

export default async function ApiConnectorsPage() {
  const connectorRows = (await readSourceMap()).data.filter(row => row.connectorOwner === 'backend');

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">API Connectors</h1>
          <p className="page__desc">Backend-owned provider outputs should write normalized JSON into the mapped import data files.</p>
        </div>
      </div>
      <section className="panel">
        <div className="section-list">
          {connectorRows.slice(0, 12).map(row => (
            <div className="section" key={row.file}>
              <h2 className="section__title">{row.expectedSource}</h2>
              <p className="page__desc" style={{ margin: '8px 0 0' }}>{row.file}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
