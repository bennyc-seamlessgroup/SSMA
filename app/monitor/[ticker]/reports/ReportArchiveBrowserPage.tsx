'use client';

import { usePortalTimeZone } from '@/components/usePortalTimeZone';
import { normalizeTicker } from '@/lib/ticker-data';
import { ymdInPortalTimeZone } from '@/lib/timezone';
import { ReportArchiveCenter } from './ReportArchiveCenter';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';

function previousDay(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function ReportArchiveBrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const timeZone = usePortalTimeZone();
  const todayDate = ymdInPortalTimeZone(new Date(), timeZone);
  const reportDate = previousDay(todayDate);
  const reports = [{
    id: `${normalizedTicker}-${reportDate}-7PM`,
    ticker: normalizedTicker,
    reportType: '7PM' as const,
    reportTime: '7:00 PM',
    reportDate,
    title: 'Daily Market Close Report',
    generatedAt: `${reportDate}T23:00:00.000Z`,
    dataKey: `report-data/${reportDate}/${normalizedTicker}_report_data.json`,
    dataUrl: '/report-templates/daily-close/report-data.json',
    sizeBytes: 0,
  }];

  return (
    <div className="page report-archive-page">
      <ReportArchiveCenter ticker={normalizedTicker} reports={reports} todayDate={todayDate} />
      <PageDisclaimerNotice noticeKey="reports" disclaimerKey="report" />
    </div>
  );
}
