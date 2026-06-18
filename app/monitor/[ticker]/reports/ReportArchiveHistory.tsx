'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReportRecord } from '@/lib/types';

const pageSize = 25;

type ReportWindowMeta = Record<ReportRecord['report_type'], {
  label: string;
  shortLabel: string;
}>;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function ReportArchiveHistory({
  ticker,
  reports,
  reportWindowMeta,
}: {
  ticker: string;
  reports: ReportRecord[];
  reportWindowMeta: ReportWindowMeta;
}) {
  const [query, setQuery] = useState('');
  const [selectedWindow, setSelectedWindow] = useState<ReportRecord['report_type'] | 'all'>('all');
  const [page, setPage] = useState(1);

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return reports
      .filter(report => selectedWindow === 'all' || report.report_type === selectedWindow)
      .filter(report => {
        if (!normalizedQuery) return true;
        return [
          report.title,
          report.report_time,
          report.report_type,
          report.report_date,
          report.generated_at,
        ].some(value => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
  }, [query, reports, selectedWindow]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageReports = filteredReports.slice((safePage - 1) * pageSize, safePage * pageSize);

  const filteredGroups = useMemo(() => {
    return (['8AM', '1150AM', '7PM'] as const).map(type => {
      const groupReports = pageReports.filter(report => report.report_type === type);
      return { type, reports: groupReports };
    }).filter(group => group.reports.length > 0);
  }, [pageReports]);

  useEffect(() => {
    setPage(1);
  }, [query, selectedWindow]);

  function goToPage(nextPage: number) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  return (
    <section className="panel report-history-panel">
      <div className="section__head report-history-head">
        <div>
          <span className="report-archive-kicker">All Records</span>
          <h2 className="panel__title">Report History</h2>
        </div>
        <span>{filteredReports.length.toLocaleString()} records</span>
      </div>

      <div className="report-history-toolbar">
        <input
          className="input"
          type="search"
          placeholder="Search reports by title, time, or date"
          value={query}
          onChange={event => setQuery(event.target.value)}
          aria-label="Search report archive"
        />
        <div className="report-history-filter" aria-label="Filter by report window">
          <button type="button" className={selectedWindow === 'all' ? 'active' : ''} onClick={() => setSelectedWindow('all')}>All</button>
          {(['8AM', '1150AM', '7PM'] as const).map(type => (
            <button
              type="button"
              className={selectedWindow === type ? 'active' : ''}
              key={type}
              onClick={() => setSelectedWindow(type)}
            >
              {reportWindowMeta[type].shortLabel}
            </button>
          ))}
        </div>
      </div>

      {filteredGroups.length > 0 ? (
        <>
          <div className="report-history-list">
            {filteredGroups.map(group => (
              <div className="report-history-group" key={group.type}>
                <div className="report-history-group__label">
                  <span>{reportWindowMeta[group.type].shortLabel}</span>
                  <strong>{reportWindowMeta[group.type].label}</strong>
                </div>
                <div className="report-history-group__rows">
                  {group.reports.map(report => (
                    <a
                      className="report-history-row"
                      href={`/api/reports/archive/${ticker}/${report.report_type}`}
                      key={report.id}
                    >
                      <span>
                        <strong>{report.title}</strong>
                        <small>{formatDate(report.generated_at)} · {report.report_time}</small>
                      </span>
                      <em>Download PDF</em>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="import-pagination report-history-pagination">
            <button type="button" onClick={() => goToPage(1)} disabled={safePage === 1}>First</button>
            <button type="button" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}>Previous</button>
            <span>Page {safePage} of {totalPages}</span>
            <button type="button" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}>Next</button>
            <button type="button" onClick={() => goToPage(totalPages)} disabled={safePage === totalPages}>Last</button>
          </div>
        </>
      ) : (
        <div className="report-history-empty">No reports match the current search.</div>
      )}
    </section>
  );
}
