import { ImportDataTable } from '@/components/ImportDataTable';
import { readDataDictionary } from '@/lib/import-data';

export default function DataDictionaryPage() {
  const dictionary = readDataDictionary();
  const rows = dictionary.data.map(row => ({ field: row.field, definition: row.definition }));

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Data Dictionary</h1>
          <p className="page__desc">Definitions for the major fields used across the Company Intelligence Portal import data pool.</p>
        </div>
      </div>

      <section className="panel">
        <ImportDataTable columns={['field', 'definition']} rows={rows} />
      </section>
    </div>
  );
}
