'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { usePortalTimeZone } from '@/components/usePortalTimeZone';
import { formatPortalDate } from '@/lib/timezone';
import type { ReportArchiveRecord } from '@/lib/report-archive';
import { generateClientReportPdf, reportFileName } from './client-report-pdf';

const reportWindows = [
  { type: '8AM', step: 1, time: '8:00 AM', title: 'Pre-Market Brief', shortTitle: 'Pre-Market', icon: 'sunrise' },
  { type: '1150AM', step: 2, time: '11:50 AM', title: 'Midday Flow Report', shortTitle: 'Midday', icon: 'sun' },
  { type: '7PM', step: 3, time: '7:00 PM', title: 'Post-Market Digest', shortTitle: 'Post-Market', icon: 'moon' },
] as const;

const HISTORY_PAGE_SIZE = 10;

type ReportType = ReportArchiveRecord['reportType'];

function dateFromYmd(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function formatDisplayDate(value: string, timeZone: string) {
  return formatPortalDate(dateFromYmd(value), timeZone);
}

function formatWeekday(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone }).format(dateFromYmd(value));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function iconSvg(icon: string) {
  if (icon === 'sunrise') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 18h16M7 15a5 5 0 0 1 10 0M12 4v4M5.6 8.6l2.8 2.8M18.4 8.6l-2.8 2.8M3 22h18" />
      </svg>
    );
  }
  if (icon === 'sun') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v2M12 17v2M5 12h2M17 12h2M7.1 7.1l1.4 1.4M15.5 15.5l1.4 1.4M16.9 7.1l-1.4 1.4M8.5 15.5l-1.4 1.4" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 15.8A8 8 0 0 1 8.2 4a7 7 0 1 0 11.8 11.8Z" />
      <path d="M18 5v4M16 7h4" />
    </svg>
  );
}

export function ReportArchiveCenter({
  ticker,
  reports,
  todayDate,
}: {
  ticker: string;
  reports: ReportArchiveRecord[];
  todayDate: string;
}) {
  const timeZone = usePortalTimeZone();
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }, [reports]);
  const minDate = sortedReports.at(-1)?.reportDate ?? addDays(new Date(todayDate), -30);
  const maxDate = sortedReports[0]?.reportDate ?? todayDate;
  const [startDate, setStartDate] = useState(minDate);
  const [endDate, setEndDate] = useState(maxDate > todayDate ? maxDate : todayDate);
  const [selectedType, setSelectedType] = useState<ReportType | 'all'>('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [generatingReportId, setGeneratingReportId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState('');

  useEffect(() => {
    if (!openMenu) return undefined;

    function closeOnOutsideInteraction(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key === 'Escape') setOpenMenu(null);
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.report-history-popover') || target.closest('.report-history-icon')) return;
      setOpenMenu(null);
    }

    document.addEventListener('mousedown', closeOnOutsideInteraction);
    document.addEventListener('keydown', closeOnOutsideInteraction);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideInteraction);
      document.removeEventListener('keydown', closeOnOutsideInteraction);
    };
  }, [openMenu]);

  const todayReports = useMemo(() => {
    return reportWindows.map(window => {
      const report = sortedReports.find(item => item.reportDate === todayDate && item.reportType === window.type);
      return { ...window, report };
    });
  }, [sortedReports, todayDate]);

  const completedCount = todayReports.filter(item => item.report).length;
  const latestToday = [...todayReports].reverse().find(item => item.report);

  const filteredReports = useMemo(() => {
    return sortedReports.filter(report => {
      const inDateRange = report.reportDate >= startDate && report.reportDate <= endDate;
      const matchesType = selectedType === 'all' || report.reportType === selectedType;
      return inDateRange && matchesType;
    });
  }, [endDate, selectedType, sortedReports, startDate]);

  const historyRows = useMemo(() => {
    const groups = new Map<string, ReportArchiveRecord[]>();
    filteredReports.forEach(report => {
      const existing = groups.get(report.reportDate) ?? [];
      existing.push(report);
      groups.set(report.reportDate, existing);
    });

    return [...groups.entries()]
      .map(([date, dateReports]) => ({
        date,
        reports: dateReports.sort((a, b) => {
          const aIndex = reportWindows.findIndex(window => window.type === a.reportType);
          const bIndex = reportWindows.findIndex(window => window.type === b.reportType);
          return aIndex - bIndex;
        }),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredReports]);

  useEffect(() => {
    setHistoryPage(1);
    setOpenMenu(null);
  }, [startDate, endDate, selectedType]);

  const historyPageCount = Math.max(1, Math.ceil(historyRows.length / HISTORY_PAGE_SIZE));
  const safeHistoryPage = Math.min(historyPage, historyPageCount);
  const paginatedHistoryRows = historyRows.slice(
    (safeHistoryPage - 1) * HISTORY_PAGE_SIZE,
    safeHistoryPage * HISTORY_PAGE_SIZE,
  );
  const historyStart = historyRows.length ? (safeHistoryPage - 1) * HISTORY_PAGE_SIZE + 1 : 0;
  const historyEnd = Math.min(safeHistoryPage * HISTORY_PAGE_SIZE, historyRows.length);

  async function openReport(report: ReportArchiveRecord, download = false) {
    const previewWindow = download ? null : window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.title = 'Generating report';
      previewWindow.document.body.innerHTML = '<p style="font:14px system-ui;padding:24px;color:#334155">Generating PDF...</p>';
    }

    setGeneratingReportId(report.id);
    setGenerationError('');
    try {
      const blob = await generateClientReportPdf(report);
      const objectUrl = URL.createObjectURL(blob);
      if (download) {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = reportFileName(report);
        link.click();
      } else if (previewWindow) {
        previewWindow.location.href = objectUrl;
      } else {
        window.location.href = objectUrl;
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      previewWindow?.close();
      setGenerationError(error instanceof Error ? error.message : 'Unable to generate the report.');
    } finally {
      setGeneratingReportId(null);
      setOpenMenu(null);
    }
  }

  async function downloadAllReports(dateReports: ReportArchiveRecord[]) {
    for (const report of dateReports) {
      await openReport(report, true);
    }
  }

  return (
    <div className="report-center">
      <section className="report-timeline-panel">
        <div className="report-timeline-head">
          <div className="report-timeline-title">
            <span className="report-center-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 3v3M16 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                <path d="m9 14 2 2 4-5" />
              </svg>
            </span>
            <div>
              <h2>Today&apos;s Reports</h2>
              <p>{formatDisplayDate(todayDate, timeZone)}</p>
            </div>
          </div>
          <div className="report-latest-badge">
            <span>Latest Report</span>
            <strong>{completedCount} / 3 · {latestToday?.time ?? 'Pending'}</strong>
          </div>
        </div>

        <div className="report-timeline" style={{ '--report-progress': `${completedCount <= 1 ? 0 : ((completedCount - 1) / 2) * 100}%` } as CSSProperties}>
          {todayReports.map(item => {
            const isAvailable = Boolean(item.report);
            const isLatest = latestToday?.type === item.type;
            return (
              <div className={`report-timeline-step${isAvailable ? ' is-complete' : ''}${isLatest ? ' is-latest' : ''}`} key={item.type}>
                <div className="report-timeline-node">{item.step}</div>
                <div className="report-timeline-time">{item.time}</div>
                <h3>{item.title}</h3>
                <span className="report-timeline-icon">{iconSvg(item.icon)}</span>
                <div className="report-timeline-actions">
                  {item.report ? (
                    <>
                      <button type="button" onClick={() => openReport(item.report!)} disabled={generatingReportId === item.report.id}>{generatingReportId === item.report.id ? 'Generating...' : 'View PDF'}</button>
                      <button type="button" onClick={() => openReport(item.report!, true)} disabled={generatingReportId === item.report.id}>Download</button>
                    </>
                  ) : (
                    <span>Pending</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="report-history-table-panel">
        <div className="report-history-table-head">
          <div className="report-timeline-title">
            <span className="report-center-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5M12 7v5l3 2" />
              </svg>
            </span>
            <h2>History Archive</h2>
          </div>
          <div className="report-history-controls">
            <label>
              <input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} />
            </label>
            <span>→</span>
            <label>
              <input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} />
            </label>
            <select value={selectedType} onChange={event => setSelectedType(event.target.value as ReportType | 'all')} aria-label="Filter report type">
              <option value="all">All</option>
              <option value="8AM">Pre-Market</option>
              <option value="1150AM">Midday</option>
              <option value="7PM">Post-Market</option>
            </select>
          </div>
        </div>

        <div className="report-history-table">
          <div className="report-history-table-row is-head">
            <span>Date</span>
            <span>Reports Available</span>
            <span>Actions</span>
          </div>
          {paginatedHistoryRows.map(row => (
            <div className="report-history-table-row" key={row.date}>
              <div>
                <strong>{formatDisplayDate(row.date, timeZone)}</strong>
                <small>{formatWeekday(row.date, timeZone)}</small>
              </div>
              <div className="report-history-icons">
                {reportWindows.map(window => {
                  const report = row.reports.find(item => item.reportType === window.type);
                  return (
                    <span className="report-history-icon-wrap" key={`${row.date}-${window.type}`}>
                      <button
                        type="button"
                        className={`report-history-icon${report ? ' is-ready' : ''}`}
                        disabled={!report}
                        onClick={() => report && setOpenMenu(openMenu === report.id ? null : report.id)}
                        title={`${window.title}${report ? '' : ' pending'}`}
                      >
                        {iconSvg(window.icon)}
                        <span>{window.time}</span>
                      </button>
                      {report && openMenu === report.id ? (
                        <span className="report-history-popover">
                          <button type="button" onClick={() => openReport(report)} disabled={generatingReportId === report.id}>{generatingReportId === report.id ? 'Generating...' : 'View PDF'}</button>
                          <button type="button" onClick={() => openReport(report, true)} disabled={generatingReportId === report.id}>Download</button>
                        </span>
                      ) : null}
                    </span>
                  );
                })}
              </div>
              <div className="report-history-row-menu">
                {row.reports.length > 0 ? (
                  <>
                    <button type="button" onClick={() => openReport(row.reports[row.reports.length - 1])} disabled={Boolean(generatingReportId)}>
                      View All ({row.reports.length})
                    </button>
                    <button type="button" onClick={() => downloadAllReports(row.reports)} disabled={Boolean(generatingReportId)}>Download All</button>
                  </>
                ) : (
                  <span>Pending</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {historyRows.length === 0 ? (
          <div className="report-history-empty">No reports match the selected range.</div>
        ) : null}
        {generationError ? <div className="report-generation-error" role="alert">{generationError}</div> : null}
        {historyRows.length > HISTORY_PAGE_SIZE ? (
          <div className="report-history-pagination">
            <span>Showing {historyStart}-{historyEnd} of {historyRows.length} days</span>
            <div>
              <button
                type="button"
                onClick={() => setHistoryPage(page => Math.max(1, page - 1))}
                disabled={safeHistoryPage <= 1}
                aria-label="Previous history page"
              >
                ‹
              </button>
              {Array.from({ length: historyPageCount }, (_, index) => index + 1)
                .filter(page => (
                  page === 1
                  || page === historyPageCount
                  || Math.abs(page - safeHistoryPage) <= 1
                ))
                .map((page, index, pages) => (
                  <span key={page} className="report-history-page-item">
                    {index > 0 && page - pages[index - 1] > 1 ? <em>…</em> : null}
                    <button
                      type="button"
                      className={page === safeHistoryPage ? 'active' : ''}
                      onClick={() => setHistoryPage(page)}
                      aria-label={`Go to history page ${page}`}
                    >
                      {page}
                    </button>
                  </span>
                ))}
              <button
                type="button"
                onClick={() => setHistoryPage(page => Math.min(historyPageCount, page + 1))}
                disabled={safeHistoryPage >= historyPageCount}
                aria-label="Next history page"
              >
                ›
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
