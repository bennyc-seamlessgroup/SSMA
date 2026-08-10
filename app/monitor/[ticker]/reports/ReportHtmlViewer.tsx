'use client';

import { useEffect, useState } from 'react';
import type { ReportArchiveRecord } from '@/lib/report-archive';
import { reportTemplateUrl } from './client-report-pdf';

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function ReportHtmlViewer({
  report,
  reportData,
  loading,
  error,
  downloading,
  onClose,
  onDownload,
}: {
  report: ReportArchiveRecord;
  reportData?: unknown;
  loading: boolean;
  error: string;
  downloading: boolean;
  onClose: () => void;
  onDownload: () => void;
}) {
  const [reportDataUrl, setReportDataUrl] = useState('');

  useEffect(() => {
    if (reportData === undefined) {
      setReportDataUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(reportData)], { type: 'application/json' }));
    setReportDataUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [reportData]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  const viewerUrl = reportDataUrl ? reportTemplateUrl(reportDataUrl, 'html') : '';

  return (
    <div className="report-html-viewer-backdrop" role="dialog" aria-modal="true" aria-label={`${report.title} report viewer`}>
      <section className="report-html-viewer">
        <header className="report-html-viewer__toolbar">
          <div>
            <span>Daily Report</span>
            <strong>{report.title}</strong>
            <small>{report.reportDate} · {report.ticker}</small>
          </div>
          <div className="report-html-viewer__actions">
            <button className="report-html-viewer__download" type="button" onClick={onDownload} disabled={!reportData || downloading}>
              <DownloadIcon />
              {downloading ? 'Preparing PDF...' : 'Download PDF'}
            </button>
            <button className="report-html-viewer__close" type="button" onClick={onClose} aria-label="Close report">
              <CloseIcon />
            </button>
          </div>
        </header>
        <div className="report-html-viewer__body">
          {loading ? (
            <div className="report-html-viewer__loading" role="status">
              <span />
              <strong>Loading report</strong>
              <small>Collecting the selected market close data.</small>
            </div>
          ) : error ? (
            <div className="report-html-viewer__error" role="alert">
              <strong>Report unavailable</strong>
              <span>{error}</span>
            </div>
          ) : viewerUrl ? (
            <iframe title={`${report.title} HTML report`} src={viewerUrl} />
          ) : null}
        </div>
      </section>
    </div>
  );
}
