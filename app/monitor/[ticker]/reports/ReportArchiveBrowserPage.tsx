'use client';

import { useEffect, useState } from 'react';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { usePortalTimeZone } from '@/components/usePortalTimeZone';
import { cachedAuthenticatedFetch } from '@/lib/auth-client';
import { isPublicDemoSession } from '@/lib/public-demo';
import type { ReportArchiveRecord } from '@/lib/report-archive';
import { normalizeTicker } from '@/lib/ticker-data';
import { ymdInPortalTimeZone } from '@/lib/timezone';
import { ReportArchiveCenter } from './ReportArchiveCenter';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';

type ReportIndexPayload = {
  dates?: unknown[];
  records?: unknown[];
  data?: {
    dates?: unknown[];
    records?: unknown[];
    pagination?: ReportIndexPagination;
  };
  pagination?: ReportIndexPagination;
};

type ReportIndexPagination = {
  totalPages?: number;
};

function previousDay(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function reportDate(value: unknown) {
  if (typeof value === 'string') return value.slice(0, 10);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const row = value as Record<string, unknown>;
  return String(row.reportDate ?? row.asOfDate ?? row.date ?? '').slice(0, 10);
}

function datesFromIndex(payload: ReportIndexPayload) {
  const values = payload.dates ?? payload.records ?? payload.data?.dates ?? payload.data?.records ?? [];
  return values
    .map(reportDate)
    .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function paginationFromIndex(payload: ReportIndexPayload) {
  return payload.pagination ?? payload.data?.pagination;
}

function archiveRecord(ticker: string, date: string): ReportArchiveRecord {
  return {
    id: `${ticker}-${date}-7PM`,
    ticker,
    reportType: '7PM',
    reportTime: '7:00 PM',
    reportDate: date,
    title: 'Daily Market Close Report',
    generatedAt: `${date}T23:00:00.000Z`,
    dataKey: `reports/${ticker}/${date}/${ticker}_report_data.json`,
    dataUrl: `/market-data/reports?ticker=${encodeURIComponent(ticker)}&date=${encodeURIComponent(date)}`,
    sizeBytes: 0,
  };
}

async function readReportIndex(ticker: string) {
  const firstPage = await cachedAuthenticatedFetch<ReportIndexPayload>(
    `/market-data/reports?ticker=${encodeURIComponent(ticker)}&limit=100&page=1`,
  );
  const totalPages = Math.max(1, Number(paginationFromIndex(firstPage)?.totalPages) || 1);
  const remainingPages = totalPages > 1
    ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => (
      cachedAuthenticatedFetch<ReportIndexPayload>(
        `/market-data/reports?ticker=${encodeURIComponent(ticker)}&limit=100&page=${index + 2}`,
      )
    )))
    : [];
  return [...new Set([firstPage, ...remainingPages].flatMap(datesFromIndex))]
    .sort((a, b) => b.localeCompare(a));
}

export function ReportArchiveBrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const timeZone = usePortalTimeZone();
  const todayDate = ymdInPortalTimeZone(new Date(), timeZone);
  const [reports, setReports] = useState<ReportArchiveRecord[] | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    setReports(null);
    setLoadError('');

    if (isPublicDemoSession()) {
      const date = previousDay(todayDate);
      setReports([archiveRecord(normalizedTicker, date)]);
      return () => {
        active = false;
      };
    }

    void readReportIndex(normalizedTicker)
      .then(dates => {
        if (active) setReports(dates.map(date => archiveRecord(normalizedTicker, date)));
      })
      .catch(error => {
        if (!active) return;
        setReports([]);
        setLoadError(error instanceof Error ? error.message : 'Unable to load the report archive.');
      });

    return () => {
      active = false;
    };
  }, [normalizedTicker, todayDate]);

  if (reports === null) return <PortalPageLoading variant="reports" />;

  return (
    <div className="page report-archive-page">
      {loadError ? <div className="report-generation-error" role="alert">{loadError}</div> : null}
      <ReportArchiveCenter ticker={normalizedTicker} reports={reports} todayDate={todayDate} />
      <PageDisclaimerNotice noticeKey="reports" disclaimerKey="report" />
    </div>
  );
}
