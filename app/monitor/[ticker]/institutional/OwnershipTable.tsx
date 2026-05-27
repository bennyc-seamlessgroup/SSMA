'use client';

import { useMemo, useState } from 'react';
import type { InstitutionalHolding } from '@/lib/types';

type OwnershipTableProps = {
  holdings: InstitutionalHolding[];
  ticker: string;
  companyName: string;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function OwnershipTable({ holdings, ticker, companyName }: OwnershipTableProps) {
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

  const filteredHoldings = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = !query ? holdings : holdings.filter(row => [
      row.filing_date,
      row.effective_date,
      row.form_type,
      ticker,
      companyName,
      row.fund_name,
      row.shares,
      row.shares_change_percent,
      row.market_value,
      row.value_change_percent,
      row.cost_basis,
    ].some(value => String(value ?? '').toLowerCase().includes(query)));

    if (!sort) return filtered;

    return [...filtered].sort((a, b) => {
      const aValue = ownershipSortValue(a, sort.column, ticker, companyName);
      const bValue = ownershipSortValue(b, sort.column, ticker, companyName);
      const comparison = compareValues(aValue, bValue);
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [companyName, holdings, search, sort, ticker]);

  const totalPages = Math.max(1, Math.ceil(filteredHoldings.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredHoldings.slice((safePage - 1) * pageSize, safePage * pageSize);

  function goToPage(nextPage: number) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  function updatePageSize(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
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

  function exportCsv() {
    const headers = ['File Date', 'Effective Date', 'Form', 'Security', 'Investor', 'Shares (x1000)', 'Shares Changed (%)', 'Value (x1000)', 'Value Changed (%)', 'Cost Basis (x1000)', 'Owner URL'];
    const rows = filteredHoldings.map(row => [
      row.filing_date,
      row.effective_date ?? 'N/A',
      row.form_type ?? row.source,
      `${ticker} / ${companyName}`,
      row.fund_name,
      row.shares,
      row.shares_change_percent ?? row.shares_change ?? 'N/A',
      row.market_value,
      row.value_change_percent ?? row.value_change ?? 'N/A',
      row.cost_basis ?? 'N/A',
      row.owner_url ?? '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(value => csvEscape(String(value ?? ''))).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${ticker.toLowerCase()}-ownership.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="ownership-toolbar">
        <div className="ownership-legend">
          <span><mark className="legend-new">Green rows indicate new positions</mark></span>
          <span><mark className="legend-closed">Red rows indicate closed positions.</mark></span>
        </div>
        <div className="ownership-actions">
          <button className="ownership-export" type="button" onClick={exportCsv}>Export CSV</button>
          <input
            className="ownership-search"
            placeholder="Search…"
            aria-label="Search ownership records"
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="ownership-table-wrap">
        <table className="ownership-table">
          <thead>
            <tr>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('filingDate')}>File Date <span>{sortLabel('filingDate')}</span></button></th>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('effectiveDate')}>Effective Date <span>{sortLabel('effectiveDate')}</span></button></th>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('form')}>Form <span>{sortLabel('form')}</span></button></th>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('security')}>Security <span>{sortLabel('security')}</span></button></th>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('investor')}>Investor <span>{sortLabel('investor')}</span></button></th>
              <th>Opt</th>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('shares')}>Shares (x1000) <span>{sortLabel('shares')}</span></button></th>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('sharesChanged')}>Shares Changed (%) <span>{sortLabel('sharesChanged')}</span></button></th>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('value')}>Value (x1000) <span>{sortLabel('value')}</span></button></th>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('valueChanged')}>Value Changed (%) <span>{sortLabel('valueChanged')}</span></button></th>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('costBasis')}>Cost Basis (x1000) <span>{sortLabel('costBasis')}</span></button></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(row => {
              const rowClass = row.change_type === 'new' || row.change_type === 'increased'
                ? 'is-new'
                : row.change_type === 'exited' || row.shares_change_percent === '-100%'
                  ? 'is-closed'
                  : '';
              return (
                <tr key={row.id} className={rowClass}>
                  <td>{row.filing_date}</td>
                  <td>{row.effective_date ?? 'N/A'}</td>
                  <td>{row.form_type ?? row.source}</td>
                  <td className="security-cell"><strong>{ticker}</strong><span>{companyName}</span></td>
                  <td className="investor-cell">{row.fund_name}</td>
                  <td>{row.owner_url ? <a className="ownership-link" href={row.owner_url} target="_blank" rel="noreferrer" aria-label={`Open ${row.fund_name}`}>↗</a> : '—'}</td>
                  <td className="num">{row.shares}</td>
                  <td className="num">{row.shares_change_percent ?? row.shares_change ?? 'N/A'}</td>
                  <td className="num">{row.market_value}</td>
                  <td className="num">{row.value_change_percent ?? row.value_change ?? 'N/A'}</td>
                  <td className="num">{row.cost_basis ?? 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ownership-pagination" aria-label="Ownership table pagination">
        <button type="button" onClick={() => goToPage(1)} disabled={safePage === 1}>First</button>
        <button type="button" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}>Previous</button>
        <span className="ownership-page-count">Page {safePage} of {totalPages}</span>
        <input
          aria-label="Page number"
          className="ownership-page-input"
          type="number"
          min={1}
          max={totalPages}
          value={safePage}
          onChange={event => goToPage(Number(event.target.value) || 1)}
        />
        <select aria-label="Rows per page" value={pageSize} onChange={event => updatePageSize(Number(event.target.value))}>
          {PAGE_SIZE_OPTIONS.map(option => <option key={option} value={option}>Show {option}</option>)}
        </select>
        <button type="button" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}>Next</button>
        <button type="button" onClick={() => goToPage(totalPages)} disabled={safePage === totalPages}>Last</button>
      </div>
    </>
  );
}

function numericValue(value: string | undefined) {
  const numeric = Number(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

function compareValues(aValue: string | number, bValue: string | number) {
  if (typeof aValue === 'number' && typeof bValue === 'number') return aValue - bValue;
  return String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' });
}

function ownershipSortValue(row: InstitutionalHolding, column: string, ticker: string, companyName: string): string | number {
  const map: Record<string, string | undefined> = {
    filingDate: row.filing_date,
    effectiveDate: row.effective_date,
    form: row.form_type ?? row.source,
    security: `${ticker} ${companyName}`,
    investor: row.fund_name,
    shares: row.shares,
    sharesChanged: row.shares_change_percent ?? row.shares_change,
    value: row.market_value,
    valueChanged: row.value_change_percent ?? row.value_change,
    costBasis: row.cost_basis,
  };
  const value = map[column] ?? '';
  return numericValue(value) ?? value;
}
