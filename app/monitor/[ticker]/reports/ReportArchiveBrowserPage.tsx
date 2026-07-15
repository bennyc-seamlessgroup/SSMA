'use client';

import { usePortalTimeZone } from '@/components/usePortalTimeZone';
import { normalizeTicker } from '@/lib/ticker-data';
import { ymdInPortalTimeZone } from '@/lib/timezone';
import { ReportArchiveCenter } from './ReportArchiveCenter';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';

export function ReportArchiveBrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const timeZone = usePortalTimeZone();
  const todayDate = ymdInPortalTimeZone(new Date(), timeZone);

  return (
    <div className="page report-archive-page">
      <div className="page__header dashboard-command-header">
        <div>
          <h1 className="page__title">Report Archive</h1>
          <p className="page__desc">Access and download all daily reports.</p>
        </div>
      </div>
      <section className="report-history-empty">
        Report Archive is awaiting a centralized report API. Legacy S3 JSON loading has been removed.
      </section>
      <ReportArchiveCenter ticker={normalizedTicker} reports={[]} todayDate={todayDate} />
      <PageDisclaimerNotice noticeKey="reports" disclaimerKey="report" />
    </div>
  );
}
