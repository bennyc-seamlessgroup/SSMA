'use client';

import { useEffect, useState } from 'react';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { usePortalTimeZone } from '@/components/usePortalTimeZone';
import { listReportArchive, type ReportArchiveRecord } from '@/lib/report-archive';
import { normalizeTicker } from '@/lib/ticker-data';
import { ymdInPortalTimeZone } from '@/lib/timezone';
import { ReportArchiveCenter } from './ReportArchiveCenter';

export function ReportArchiveBrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const timeZone = usePortalTimeZone();
  const [reports, setReports] = useState<ReportArchiveRecord[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        let next: ReportArchiveRecord[];
        try {
          next = await listReportArchive(normalizedTicker);
        } catch (directError) {
          if (process.env.NEXT_PUBLIC_IMPORT_DATA_SERVER_FALLBACK === 'false') throw directError;
          const response = await fetch(`/api/reports/archive-list/${encodeURIComponent(normalizedTicker)}`, { cache: 'no-store' });
          if (!response.ok) throw new Error(`Report archive fallback returned ${response.status} ${response.statusText}`);
          const payload = await response.json() as { reports?: ReportArchiveRecord[] };
          next = payload.reports ?? [];
        }
        if (!cancelled) {
          setReports(next);
          setError('');
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load report archive.');
          setReports([]);
        }
      }
    };
    void load();
    window.addEventListener('import-data-updated', load);
    return () => {
      cancelled = true;
      window.removeEventListener('import-data-updated', load);
    };
  }, [normalizedTicker]);

  if (reports === null) return <PortalPageLoading variant="reports" />;
  const todayDate = ymdInPortalTimeZone(new Date(), timeZone);

  return (
    <div className="page report-archive-page">
      <div className="page__header dashboard-command-header">
        <div>
          <h1 className="page__title">Report Archive</h1>
          <p className="page__desc">Access and download all daily reports.</p>
        </div>
      </div>
      {error ? <section className="report-history-empty">{error}</section> : null}
      <ReportArchiveCenter ticker={normalizedTicker} reports={reports} todayDate={todayDate} />
    </div>
  );
}
