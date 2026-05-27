import { ImportDataTable } from '@/components/ImportDataTable';
import { readSourceMap } from '@/lib/import-data';

export default function SourceMapPage() {
  const sourceMap = readSourceMap();
  const rows = sourceMap.data.map(row => ({
    file: row.file,
    category: row.category,
    expectedSource: row.expectedSource,
    connectorOwner: row.connectorOwner,
    updateCadence: row.updateCadence,
    status: row.status,
  }));

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Source Map</h1>
          <p className="page__desc">Expected future provider ownership for each standardized import data file.</p>
        </div>
      </div>

      <section className="panel">
        <ImportDataTable
          columns={['file', 'category', 'expectedSource', 'connectorOwner', 'updateCadence', 'status']}
          rows={rows}
          pageSize={50}
        />
      </section>
    </div>
  );
}
