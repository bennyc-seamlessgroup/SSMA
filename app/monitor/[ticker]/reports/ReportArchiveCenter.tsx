'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePortalTimeZone } from '@/components/usePortalTimeZone';
import { formatPortalDate } from '@/lib/timezone';
import type { ReportArchiveRecord } from '@/lib/report-archive';
import { generateClientReportPdf, reportFileName } from './client-report-pdf';
import { buildDailyReportData } from './daily-report-data';
import { ReportHtmlViewer } from './ReportHtmlViewer';

const HISTORY_PAGE_SIZE = 10;

type ReportCadence = 'daily' | 'weekly' | 'monthly';

const reportCadences: Array<{
  id: ReportCadence;
  label: string;
  available: boolean;
}> = [
  { id: 'daily', label: 'Daily Reports', available: true },
  { id: 'weekly', label: 'Weekly Reports', available: false },
  { id: 'monthly', label: 'Monthly Reports', available: false },
];

const comingSoonContent: Record<Exclude<ReportCadence, 'daily'>, {
  eyebrow: string;
  title: string;
}> = {
  weekly: {
    eyebrow: 'Weekly Intelligence',
    title: 'Weekly Reports are coming soon',
  },
  monthly: {
    eyebrow: 'Monthly Intelligence',
    title: 'Monthly Reports are coming soon',
  },
};

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

function reportDocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v5h5M10 12h5M10 16h5" />
    </svg>
  );
}

function ComingSoonReport({ cadence }: { cadence: Exclude<ReportCadence, 'daily'> }) {
  const content = comingSoonContent[cadence];
  return (
    <section id={`report-panel-${cadence}`} className="report-cadence-coming-soon" role="tabpanel" aria-labelledby={`report-tab-${cadence}`}>
      <div className="report-cadence-coming-soon__hero">
        <span className="report-coming-soon-mark">{reportDocumentIcon()}</span>
        <span className="report-archive-kicker">{content.eyebrow}</span>
        <h2>{content.title}</h2>
        <span className="report-coming-soon">COMING SOON</span>
      </div>
    </section>
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
  const sortedReports = useMemo(() => (
    [...reports].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
  ), [reports]);
  const minDate = sortedReports.at(-1)?.reportDate ?? addDays(new Date(todayDate), -30);
  const maxDate = sortedReports[0]?.reportDate ?? todayDate;
  const [activeCadence, setActiveCadence] = useState<ReportCadence>('daily');
  const [startDate, setStartDate] = useState(minDate);
  const [endDate, setEndDate] = useState(maxDate > todayDate ? maxDate : todayDate);
  const [historyPage, setHistoryPage] = useState(1);
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState('');
  const [viewer, setViewer] = useState<{
    report: ReportArchiveRecord;
    reportData?: unknown;
    error?: string;
  } | null>(null);

  const latestReport = sortedReports[0] ?? null;
  const filteredReports = useMemo(() => sortedReports.filter(report => (
    report.reportDate >= startDate && report.reportDate <= endDate
  )), [endDate, sortedReports, startDate]);

  useEffect(() => {
    setHistoryPage(1);
  }, [startDate, endDate]);

  const historyPageCount = Math.max(1, Math.ceil(filteredReports.length / HISTORY_PAGE_SIZE));
  const safeHistoryPage = Math.min(historyPage, historyPageCount);
  const paginatedReports = filteredReports.slice(
    (safeHistoryPage - 1) * HISTORY_PAGE_SIZE,
    safeHistoryPage * HISTORY_PAGE_SIZE,
  );
  const historyStart = filteredReports.length ? (safeHistoryPage - 1) * HISTORY_PAGE_SIZE + 1 : 0;
  const historyEnd = Math.min(safeHistoryPage * HISTORY_PAGE_SIZE, filteredReports.length);

  async function loadReportData(report: ReportArchiveRecord) {
    return buildDailyReportData(report);
  }

  async function openReport(report: ReportArchiveRecord) {
    setViewer({ report });
    setLoadingReportId(report.id);
    setGenerationError('');
    try {
      const reportData = await loadReportData(report);
      setViewer(current => current?.report.id === report.id ? { report, reportData } : current);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load the report.';
      setViewer(current => current?.report.id === report.id ? { report, error: message } : current);
    } finally {
      setLoadingReportId(current => current === report.id ? null : current);
    }
  }

  async function downloadReport(report: ReportArchiveRecord, preloadedData?: unknown) {
    setDownloadingReportId(report.id);
    setGenerationError('');
    try {
      const reportData = preloadedData ?? await loadReportData(report);
      const blob = await generateClientReportPdf(report, reportData);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = reportFileName(report);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Unable to generate the report.');
    } finally {
      setDownloadingReportId(current => current === report.id ? null : current);
    }
  }

  const closeViewer = useCallback(() => setViewer(null), []);

  return (
    <div className="report-center">
      <section className="report-cadence-nav" aria-label="Report frequency">
        <div>
          <span className="report-archive-kicker">Report Library</span>
          <h2>Intelligence Reports</h2>
        </div>
        <div className="report-cadence-tabs" role="tablist" aria-label="Report frequency">
          {reportCadences.map(cadence => (
            <button
              id={`report-tab-${cadence.id}`}
              key={cadence.id}
              type="button"
              role="tab"
              aria-selected={activeCadence === cadence.id}
              aria-controls={`report-panel-${cadence.id}`}
              className={activeCadence === cadence.id ? 'active' : ''}
              onClick={() => setActiveCadence(cadence.id)}
            >
              <span>{cadence.label}</span>
              {!cadence.available ? <em>Coming soon</em> : <em>{sortedReports.length} available</em>}
            </button>
          ))}
        </div>
      </section>

      {activeCadence !== 'daily' ? (
        <ComingSoonReport cadence={activeCadence} />
      ) : (
        <div id="report-panel-daily" role="tabpanel" aria-labelledby="report-tab-daily" className="report-daily-panel">
          <section className="report-daily-feature">
            <div className="report-daily-feature__icon">{reportDocumentIcon()}</div>
            <div className="report-daily-feature__copy">
              <span className="report-archive-kicker">Latest Daily Report</span>
              <h2>{latestReport?.title ?? 'Daily Market Close Report'}</h2>
              <p>{latestReport
                ? `${formatDisplayDate(latestReport.reportDate, timeZone)} · ${formatWeekday(latestReport.reportDate, timeZone)}`
                : 'No daily report is currently available.'}</p>
            </div>
            <div className="report-daily-feature__status">
              <span className={latestReport ? 'is-ready' : ''}>{latestReport ? 'Available' : 'Unavailable'}</span>
            </div>
            <div className="report-daily-feature__actions">
              {latestReport ? (
                <>
                  <button className="report-primary-button" type="button" onClick={() => openReport(latestReport)} disabled={loadingReportId === latestReport.id}>
                    {loadingReportId === latestReport.id ? 'Loading...' : 'View Report'}
                  </button>
                  <button type="button" onClick={() => downloadReport(latestReport)} disabled={downloadingReportId === latestReport.id}>
                    {downloadingReportId === latestReport.id ? 'Preparing...' : 'Download PDF'}
                  </button>
                </>
              ) : <span>Report unavailable</span>}
            </div>
          </section>

          <section className="report-history-table-panel">
            <div className="report-history-table-head">
              <div className="report-timeline-title">
                <span className="report-center-icon">{reportDocumentIcon()}</span>
                <div>
                  <h2>Daily Report Archive</h2>
                </div>
              </div>
              <div className="report-history-controls">
                <label><span>From</span><input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
                <span>→</span>
                <label><span>To</span><input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
              </div>
            </div>

            <div className="report-history-table report-daily-history-table">
              <div className="report-history-table-row is-head">
                <span>Date</span>
                <span>Report</span>
                <span>Actions</span>
              </div>
              {paginatedReports.map(report => (
                <div className="report-history-table-row" key={report.id}>
                  <div>
                    <strong>{formatDisplayDate(report.reportDate, timeZone)}</strong>
                    <small>{formatWeekday(report.reportDate, timeZone)}</small>
                  </div>
                  <div className="report-daily-history-document">
                    <span>{reportDocumentIcon()}</span>
                    <div><strong>{report.title}</strong></div>
                  </div>
                  <div className="report-history-row-menu">
                    <button type="button" onClick={() => openReport(report)} disabled={loadingReportId === report.id}>
                      {loadingReportId === report.id ? 'Loading...' : 'View Report'}
                    </button>
                    <button type="button" onClick={() => downloadReport(report)} disabled={downloadingReportId === report.id}>
                      {downloadingReportId === report.id ? 'Preparing...' : 'Download PDF'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {filteredReports.length === 0 ? <div className="report-history-empty">No daily reports match the selected range.</div> : null}
            {generationError ? <div className="report-generation-error" role="alert">{generationError}</div> : null}
            {filteredReports.length > HISTORY_PAGE_SIZE ? (
              <div className="report-history-pagination">
                <span>Showing {historyStart}-{historyEnd} of {filteredReports.length} reports</span>
                <div>
                  <button type="button" onClick={() => setHistoryPage(page => Math.max(1, page - 1))} disabled={safeHistoryPage <= 1} aria-label="Previous history page">‹</button>
                  {Array.from({ length: historyPageCount }, (_, index) => index + 1)
                    .filter(page => page === 1 || page === historyPageCount || Math.abs(page - safeHistoryPage) <= 1)
                    .map((page, index, pages) => (
                      <span key={page} className="report-history-page-item">
                        {index > 0 && page - pages[index - 1] > 1 ? <em>…</em> : null}
                        <button type="button" className={page === safeHistoryPage ? 'active report-primary-button' : ''} onClick={() => setHistoryPage(page)} aria-label={`Go to history page ${page}`}>{page}</button>
                      </span>
                    ))}
                  <button type="button" onClick={() => setHistoryPage(page => Math.min(historyPageCount, page + 1))} disabled={safeHistoryPage >= historyPageCount} aria-label="Next history page">›</button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      )}
      {viewer ? (
        <ReportHtmlViewer
          report={viewer.report}
          reportData={viewer.reportData}
          loading={loadingReportId === viewer.report.id}
          error={viewer.error ?? ''}
          downloading={downloadingReportId === viewer.report.id}
          onClose={closeViewer}
          onDownload={() => downloadReport(viewer.report, viewer.reportData)}
        />
      ) : null}
    </div>
  );
}
