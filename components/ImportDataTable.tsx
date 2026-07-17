'use client';

import { useMemo, useState } from 'react';

type ImportDataTableProps = {
  columns: string[];
  rows: Array<Record<string, string>>;
  pageSize?: number;
  expandableColumns?: string[];
};

const expandablePreviewLength = 800;

function ExpandableTableCell({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = value.length > expandablePreviewLength;
  const compactValue = value.replace(/\s+/g, ' ').trim();
  const displayedValue = expanded || !isLong ? value : `${compactValue.slice(0, expandablePreviewLength)}…`;

  return (
    <div className={`import-expandable-cell${expanded ? ' is-expanded' : ''}`}>
      <pre>{displayedValue || 'N/A'}</pre>
      {isLong ? (
        <button
          className="import-expandable-cell__toggle"
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(current => !current)}
        >
          {expanded ? 'Show less' : 'Show all'}
        </button>
      ) : null}
    </div>
  );
}

function formatLabel(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase());
}

export function ImportDataTable({ columns, rows, pageSize = 25, expandableColumns = [] }: ImportDataTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? rows.filter(row => columns.some(column => row[column]?.toLowerCase().includes(query)))
      : rows;

    if (!sort) return filtered;

    return [...filtered].sort((a, b) => {
      const aValue = a[sort.column] ?? '';
      const bValue = b[sort.column] ?? '';
      const aNumeric = Number(aValue.replace(/[$,%]/g, '').replace(/,/g, ''));
      const bNumeric = Number(bValue.replace(/[$,%]/g, '').replace(/,/g, ''));
      const comparison = Number.isFinite(aNumeric) && Number.isFinite(bNumeric)
        ? aNumeric - bNumeric
        : aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [columns, rows, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  function goToPage(nextPage: number) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  function toggleSort(column: string) {
    setSort(current => {
      if (!current || current.column !== column) return { column, direction: 'asc' };
      if (current.direction === 'asc') return { column, direction: 'desc' };
      return null;
    });
    setPage(1);
  }

  function sortLabel(column: string) {
    if (sort?.column !== column) return '↕';
    return sort.direction === 'asc' ? '↑' : '↓';
  }

  function renderCell(value: string, column: string) {
    if (expandableColumns.includes(column)) return <ExpandableTableCell value={value} />;
    if (/^https?:\/\//.test(value) || value.startsWith('/')) {
      return <a className="text-link table-link" href={value} target="_blank" rel="noreferrer">Open source</a>;
    }
    return value || 'N/A';
  }

  return (
    <div className="import-table-shell">
      <div className="import-table-toolbar">
        <input
          className="input import-table-search"
          aria-label="Search table"
          placeholder="Search records"
          suppressHydrationWarning
          value={search}
          onChange={event => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <span>{filteredRows.length.toLocaleString()} records</span>
      </div>

      <div className="data-table-wrap import-record-table-wrap">
        <table className="table admin-data-table import-record-table">
          <thead>
            <tr>
              {columns.map(column => (
                <th key={column}>
                  <button className="table-sort-button" type="button" onClick={() => toggleSort(column)}>
                    {formatLabel(column)} <span>{sortLabel(column)}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, index) => (
              <tr key={`${safePage}-${index}`}>
                {columns.map(column => <td key={column}>{renderCell(row[column] || '', column)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="import-pagination">
        <button type="button" onClick={() => goToPage(1)} disabled={safePage === 1}>First</button>
        <button type="button" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}>Previous</button>
        <span>Page {safePage} of {totalPages}</span>
        <button type="button" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}>Next</button>
        <button type="button" onClick={() => goToPage(totalPages)} disabled={safePage === totalPages}>Last</button>
      </div>
    </div>
  );
}
