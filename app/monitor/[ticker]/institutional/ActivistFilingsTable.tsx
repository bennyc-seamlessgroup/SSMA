'use client';

import { useMemo, useState } from 'react';

export type ActivistFiling = {
  id: string;
  name: string;
  formType: string;
  fileDate: string;
  effectiveDate: string;
  ownershipPercent: string;
  ownershipPercentChange: string;
  shares: string;
  sharesChange: string;
  sharesPercentChange: string;
  url?: string;
};

const pageSize = 25;

function formatDate(value: string) {
  if (!value || value === 'N/A') return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).replace(',', '');
}

function numericValue(value: string | undefined) {
  const numeric = Number(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

export function ActivistFilingsTable({ rows }: { rows: ActivistFiling[] }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = normalized
      ? rows.filter(row => [
        row.name,
        row.formType,
        row.fileDate,
        row.effectiveDate,
        row.ownershipPercent,
        row.shares,
      ].some(value => String(value ?? '').toLowerCase().includes(normalized)))
      : rows;

    return [...matches].sort((a, b) => String(b.fileDate).localeCompare(String(a.fileDate)));
  }, [query, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  function goToPage(nextPage: number) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  return (
    <>
      <div className="ownership-toolbar">
        <div className="ownership-legend">
          <span><mark className="legend-new">Schedule 13D / 13G style activist or major-holder filings</mark></span>
        </div>
        <div className="ownership-actions">
          <input
            className="ownership-search"
            placeholder="Search activist filings..."
            aria-label="Search activist filings"
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="ownership-table-wrap">
        <table className="ownership-table activist-filings-table">
          <thead>
            <tr>
              <th>File Date</th>
              <th>Effective Date</th>
              <th>Form</th>
              <th>Investor</th>
              <th>Ownership %</th>
              <th>Ownership Change</th>
              <th>Shares</th>
              <th>Shares Change</th>
              <th>Shares Change %</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(row => {
              const change = numericValue(row.sharesChange);
              const rowClass = change === null ? '' : change > 0 ? 'is-new' : change < 0 ? 'is-closed' : '';
              return (
                <tr key={row.id} className={rowClass}>
                  <td>{formatDate(row.fileDate)}</td>
                  <td>{formatDate(row.effectiveDate)}</td>
                  <td>{row.formType}</td>
                  <td className="investor-cell">
                    {row.url ? <a className="text-link" href={row.url} target="_blank" rel="noreferrer">{row.name}</a> : row.name}
                  </td>
                  <td className="num">{row.ownershipPercent}</td>
                  <td className="num">{row.ownershipPercentChange}</td>
                  <td className="num">{row.shares}</td>
                  <td className="num">{row.sharesChange}</td>
                  <td className="num">{row.sharesPercentChange}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ownership-pagination" aria-label="Activist filings pagination">
        <button type="button" onClick={() => goToPage(1)} disabled={safePage === 1}>First</button>
        <button type="button" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}>Previous</button>
        <span className="ownership-page-count">Page {safePage} of {totalPages}</span>
        <button type="button" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}>Next</button>
        <button type="button" onClick={() => goToPage(totalPages)} disabled={safePage === totalPages}>Last</button>
      </div>
    </>
  );
}
