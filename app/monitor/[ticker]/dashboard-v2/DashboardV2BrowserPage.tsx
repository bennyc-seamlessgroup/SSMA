'use client';

import { PortalPageLoading } from '@/components/PortalPageLoading';
import { usePublicImportFiles } from '@/components/usePublicImportFiles';
import type { DashboardMarginFile, DashboardMarginRecord } from '@/lib/operations/dashboard-margin-store';
import type { OperationsSecFilingRecord, OperationsSecFilingsFile } from '@/lib/operations/sec-filings-store';
import { dashboardMarginFile, dashboardV2File, normalizeTicker, secFilingsFile } from '@/lib/ticker-data';
import { DashboardV2Client } from './DashboardV2Client';
import { DashboardV2DevTables } from './DashboardV2DevTables';

type TrendPoint = {
  date: string;
  price: number | null;
  feeRate: number | null;
  tradeVolume: number | null;
  shortableShares: number | null;
  daysToCover: number | null;
  utilization: number | null;
  margin?: number | null;
};

type CompanyEvent = {
  id: string;
  date: string;
  type: string;
  title: string;
  summary: string;
  source?: string;
  url?: string;
};

type DashboardV2ConsolidatedData = {
  current?: Record<string, unknown>;
  trends?: TrendPoint[];
  events?: CompanyEvent[];
  missingFromSource?: unknown[];
  derived?: Record<string, unknown>;
};

type DashboardEnvelope = {
  source?: string;
  sourcePlatform?: string;
  status?: string;
  data?: DashboardV2ConsolidatedData;
};

function plainText(value: unknown, fallback = '') {
  return String(value ?? fallback).replace(/\s+/g, ' ').trim();
}

function dateOnly(value: unknown) {
  const raw = plainText(value);
  if (!raw) return '';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw.slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function secFilingEvents(rows: OperationsSecFilingRecord[]): CompanyEvent[] {
  return rows
    .map((row, index): CompanyEvent | null => {
      const formType = plainText(row.formType, 'SEC');
      const filingDate = dateOnly(row.filingDate);
      if (!filingDate) return null;
      const title = plainText(row.formDescription, `${formType} filing`);
      const summary = [
        row.formDescription,
        row.reportingDate ? `Reporting date: ${row.reportingDate}` : '',
        row.act ? `Act: ${row.act}` : '',
        row.filmNumber ? `Film number: ${row.filmNumber}` : '',
        row.fileNumber ? `File number: ${row.fileNumber}` : '',
        row.accessionNumber ? `Accession: ${row.accessionNumber}` : '',
      ].filter(Boolean).join(' · ') || 'SEC filing available for review.';
      return {
        id: `sec-filing-${plainText(row.id ?? row.accessionNumber, String(index))}`,
        date: filingDate,
        type: 'SEC',
        title: `${formType} · ${title}`,
        summary: summary.length > 220 ? `${summary.slice(0, 217)}...` : summary,
        source: 'Operations SEC filings',
        url: plainText(row.filingsUrl),
      };
    })
    .filter((event): event is CompanyEvent => Boolean(event))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function DashboardV2BrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const dashboardFile = dashboardV2File(normalizedTicker);
  const marginFile = dashboardMarginFile(normalizedTicker);
  const filingsFile = secFilingsFile(normalizedTicker);
  const files = [dashboardFile, marginFile, filingsFile];
  const { data, error, loading } = usePublicImportFiles(files);

  if (loading && !data) return <PortalPageLoading variant="dashboard" />;
  if (error || !data) {
    return (
      <div className="page">
        <section className="panel import-data-error">
          <h2>Dashboard data unavailable</h2>
          <p>{error ?? 'The public import data files could not be loaded.'}</p>
        </section>
      </div>
    );
  }

  const dashboardEnvelope = (data[dashboardFile] ?? {}) as DashboardEnvelope;
  const dashboardData = dashboardEnvelope.data ?? {};
  const marginPayload = (data[marginFile] ?? {}) as Partial<DashboardMarginFile>;
  const filingsPayload = (data[filingsFile] ?? {}) as Partial<OperationsSecFilingsFile>;
  const trendData = Array.isArray(dashboardData.trends) ? dashboardData.trends : [];
  const dashboardEvents = Array.isArray(dashboardData.events) ? dashboardData.events : [];
  const filingRows = Array.isArray(filingsPayload.records) ? filingsPayload.records : [];
  const marginInputs = (Array.isArray(marginPayload.records) ? marginPayload.records : []) as DashboardMarginRecord[];
  const events = [...dashboardEvents, ...secFilingEvents(filingRows)];
  const current = dashboardData.current ?? null;
  const missingFromSource = Array.isArray(dashboardData.missingFromSource) ? dashboardData.missingFromSource : [];
  const derived = dashboardData.derived ?? null;

  return (
    <div className="page dashboard-v2-page">
      <div className="dashboard-v2-header">
        <span>Dashboard</span>
        <p>Borrow market dashboard</p>
      </div>

      <DashboardV2Client data={trendData} events={events} marginRecords={marginInputs} />
      <DashboardV2DevTables
        file={dashboardFile}
        sourcePlatform={dashboardEnvelope.sourcePlatform ?? dashboardEnvelope.source ?? 'Internal'}
        status={dashboardEnvelope.status ?? 'ready'}
        current={current}
        trends={trendData as Array<Record<string, unknown>>}
        marginInputs={marginInputs as unknown as Array<Record<string, unknown>>}
        marginFile={marginPayload.s3Key ?? marginFile}
        marginStatus="public-s3"
        events={events as Array<Record<string, unknown>>}
        missingFromSource={missingFromSource}
        derived={derived}
      />
    </div>
  );
}
