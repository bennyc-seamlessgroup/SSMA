'use client';

import { useMemo, useState } from 'react';

export type SecFilingRow = {
  title: string;
  formType: string;
  url: string;
  excerpt: string;
  publishDate: string;
  publishAt?: string;
  sourcePlatform?: string;
};

const pageSize = 25;

function formatDate(value: string) {
  if (!value) return 'N/A';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function isUsableUrl(value: string) {
  return /^https?:\/\//.test(value) && !value.endsWith('/null');
}

export function SecFilingsList({ filings }: { filings: SecFilingRow[] }) {
  const [query, setQuery] = useState('');
  const [formType, setFormType] = useState('all');
  const [page, setPage] = useState(1);

  const formTypes = useMemo(() => {
    return Array.from(new Set(filings.map(row => row.formType).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [filings]);

  const filteredFilings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rows = filings.filter(row => {
      const matchesType = formType === 'all' || row.formType === formType;
      const searchText = [row.title, row.formType, row.excerpt, row.publishDate, row.sourcePlatform].join(' ').toLowerCase();
      return matchesType && (!normalizedQuery || searchText.includes(normalizedQuery));
    });
    return rows.sort((a, b) => String(b.publishDate).localeCompare(String(a.publishDate)));
  }, [filings, formType, query]);

  const totalPages = Math.max(1, Math.ceil(filteredFilings.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredFilings.slice((safePage - 1) * pageSize, safePage * pageSize);

  function updateQuery(next: string) {
    setQuery(next);
    setPage(1);
  }

  function updateFormType(next: string) {
    setFormType(next);
    setPage(1);
  }

  function goToPage(nextPage: number) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  return (
    <section className="sec-filings-panel">
      <div className="sec-filings-panel__head">
        <div className="sec-filings-controls">
          <label>
            <span>Filter</span>
            <select className="select" value={formType} onChange={event => updateFormType(event.target.value)}>
              <option value="all">All form types</option>
              {formTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label>
            <span>Search</span>
            <input
              className="input"
              value={query}
              onChange={event => updateQuery(event.target.value)}
              placeholder="Search filings"
            />
          </label>
        </div>
      </div>

      <div className="sec-filings-count">
        Showing {pageRows.length.toLocaleString()} of {filteredFilings.length.toLocaleString()} filings
      </div>

      <div className="sec-filings-list">
        {pageRows.length ? pageRows.map((row, index) => {
          const key = `${row.publishDate}-${row.formType}-${row.title}-${index}`;
          const linked = isUsableUrl(row.url);
          return (
            <article className="sec-filing-row" key={key}>
              <time>{formatDate(row.publishDate)}</time>
              <strong>{row.formType || 'N/A'}</strong>
              <div>
                {linked ? (
                  <a href={row.url} target="_blank" rel="noreferrer">{row.title || row.formType || 'SEC filing'}</a>
                ) : (
                  <span>{row.title || row.formType || 'SEC filing'}</span>
                )}
                <p>{row.excerpt || 'No filing summary available.'}</p>
              </div>
            </article>
          );
        }) : (
          <div className="sec-filings-empty">No filings match the current filters.</div>
        )}
      </div>

      <div className="sec-filings-pagination" aria-label="SEC filings pagination">
        <button type="button" onClick={() => goToPage(1)} disabled={safePage === 1}>First</button>
        <button type="button" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}>Previous</button>
        <span>Page {safePage} of {totalPages}</span>
        <button type="button" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}>Next</button>
        <button type="button" onClick={() => goToPage(totalPages)} disabled={safePage === totalPages}>Last</button>
      </div>
    </section>
  );
}
