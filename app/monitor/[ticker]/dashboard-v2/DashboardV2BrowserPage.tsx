'use client';

import { useEffect, useState } from 'react';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { usePublicImportFiles } from '@/components/usePublicImportFiles';
import { authenticatedFetch } from '@/lib/auth-client';
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

type MarketCurrentFile = {
  schemaVersion?: number;
  ticker?: string;
  generatedAt?: string;
  snapshotDate?: string;
  price?: { value?: unknown };
  shortInterest?: { percent?: unknown; shares?: unknown };
  borrowFee?: { percent?: unknown };
  availableShares?: { value?: unknown };
  utilization?: { percent?: unknown };
  daysToCover?: { value?: unknown };
  margins?: {
    initialMargin?: unknown;
    maintenanceMargin?: unknown;
    averageDurationDays?: unknown;
    valueFormat?: string;
    displayFormat?: string;
  };
  scores?: { shortScore?: { value?: unknown } };
  sourceWatermarks?: Record<string, unknown>;
  _field_provenance?: Record<string, unknown>;
};

type MarketHistoryRecord = {
  tradeDate?: string;
  date?: string;
  price?: unknown;
  borrowFeePercent?: unknown;
  tradeVolume?: unknown;
  volume?: unknown;
  totalVolume?: unknown;
  availableShares?: unknown;
  availableSharesIbkr?: unknown;
  availableSharesFutu?: unknown;
  availableSharesChartExchange?: unknown;
  utilizationPercent?: unknown;
  daysToCover?: unknown;
  initialMargin?: unknown;
  maintenanceMargin?: unknown;
  averageDurationDays?: unknown;
  valueFormat?: string;
  displayFormat?: string;
};

type MarketHistoryFile = {
  schemaVersion?: number;
  ticker?: string;
  generatedAt?: string;
  records?: MarketHistoryRecord[];
  sourceWatermarks?: Record<string, unknown>;
  _field_provenance?: Record<string, unknown>;
};

type DashboardApiData = {
  currentFile: MarketCurrentFile | null;
  historyFile: MarketHistoryFile | null;
  trendData: TrendPoint[];
  marginInputs: DashboardMarginRecord[];
  current: Record<string, unknown> | null;
};

function plainText(value: unknown, fallback = '') {
  return String(value ?? fallback).replace(/\s+/g, ' ').trim();
}

function numericOrNull(value: unknown) {
  if (value === null || value === undefined || value === '' || value === 'N/A') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[%,$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMarginPercent(value: unknown, valueFormat?: string, displayFormat?: string) {
  const numeric = numericOrNull(value);
  if (numeric === null) return null;
  if (valueFormat === 'decimal_ratio' && displayFormat === 'percent') return numeric * 100;
  return numeric;
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

function marketHistoryToDashboardData(currentFile: MarketCurrentFile | null, historyFile: MarketHistoryFile | null): DashboardApiData {
  const historyRecords = Array.isArray(historyFile?.records) ? historyFile.records : [];
  const trendData = historyRecords
    .map((row): TrendPoint | null => {
      const date = plainText(row.tradeDate ?? row.date);
      if (!date) return null;
      return {
        date,
        price: numericOrNull(row.price),
        feeRate: numericOrNull(row.borrowFeePercent),
        tradeVolume: numericOrNull(row.tradeVolume ?? row.volume ?? row.totalVolume),
        shortableShares: numericOrNull(row.availableShares ?? row.availableSharesIbkr ?? row.availableSharesFutu ?? row.availableSharesChartExchange),
        daysToCover: numericOrNull(row.daysToCover),
        utilization: numericOrNull(row.utilizationPercent),
        margin: normalizeMarginPercent(row.initialMargin, row.valueFormat, row.displayFormat),
      };
    })
    .filter((row): row is TrendPoint => Boolean(row))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (currentFile?.snapshotDate && !trendData.some(row => row.date === currentFile.snapshotDate)) {
    trendData.push({
      date: currentFile.snapshotDate,
      price: numericOrNull(currentFile.price?.value),
      feeRate: numericOrNull(currentFile.borrowFee?.percent),
      tradeVolume: null,
      shortableShares: numericOrNull(currentFile.availableShares?.value),
      daysToCover: numericOrNull(currentFile.daysToCover?.value),
      utilization: numericOrNull(currentFile.utilization?.percent),
      margin: normalizeMarginPercent(currentFile.margins?.initialMargin, currentFile.margins?.valueFormat, currentFile.margins?.displayFormat),
    });
    trendData.sort((a, b) => a.date.localeCompare(b.date));
  }

  const marginInputs = historyRecords
    .map((row, index): DashboardMarginRecord | null => {
      const date = plainText(row.tradeDate ?? row.date);
      if (!date) return null;
      return {
        id: `market-history-margin-${date}-${index}`,
        ticker: plainText(historyFile?.ticker ?? currentFile?.ticker, 'CURR').toUpperCase(),
        date,
        initialMargin: normalizeMarginPercent(row.initialMargin, row.valueFormat, row.displayFormat) ?? 0,
        maintenanceMargin: normalizeMarginPercent(row.maintenanceMargin, row.valueFormat, row.displayFormat) ?? 0,
        averageDurationDays: numericOrNull(row.averageDurationDays) ?? 0,
        updatedAt: plainText(historyFile?.generatedAt ?? currentFile?.generatedAt, new Date().toISOString()),
        updatedBy: 'market-data-api',
      };
    })
    .filter((row): row is DashboardMarginRecord => Boolean(row));

  const current = currentFile ? {
    shortInterestPcFreeFloat: numericOrNull(currentFile.shortInterest?.percent),
    shortInterestShares: numericOrNull(currentFile.shortInterest?.shares),
    shortScore: numericOrNull(currentFile.scores?.shortScore?.value),
    borrowFee: numericOrNull(currentFile.borrowFee?.percent),
    feeRate: numericOrNull(currentFile.borrowFee?.percent),
    utilization: numericOrNull(currentFile.utilization?.percent),
    availableShares: numericOrNull(currentFile.availableShares?.value),
    daysToCover: numericOrNull(currentFile.daysToCover?.value),
    price: numericOrNull(currentFile.price?.value),
    sourceRecords: {
      marketCurrent: currentFile,
    },
  } : null;

  return { currentFile, historyFile, trendData, marginInputs, current };
}

export function DashboardV2BrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const dashboardFile = dashboardV2File(normalizedTicker);
  const marginFile = dashboardMarginFile(normalizedTicker);
  const filingsFile = secFilingsFile(normalizedTicker);
  const files = [dashboardFile, marginFile, filingsFile];
  const { data, error, loading } = usePublicImportFiles(files);
  const [apiData, setApiData] = useState<DashboardApiData | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadApiData() {
      setApiLoading(true);
      setApiError(null);
      try {
        const [currentFile, historyFile] = await Promise.all([
          authenticatedFetch(`/market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=market-current`) as Promise<MarketCurrentFile>,
          authenticatedFetch(`/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=market-history`) as Promise<MarketHistoryFile>,
        ]);
        if (!cancelled) setApiData(marketHistoryToDashboardData(currentFile, historyFile));
      } catch (err) {
        if (!cancelled) {
          setApiData(null);
          setApiError(err instanceof Error ? err.message : 'Unable to load market data API.');
        }
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    }

    void loadApiData();
    return () => {
      cancelled = true;
    };
  }, [normalizedTicker]);

  if (apiLoading && !apiData) return <PortalPageLoading variant="dashboard" />;
  if (!apiData && loading && !data) return <PortalPageLoading variant="dashboard" />;
  if (!apiData && (error || !data)) {
    return (
      <div className="page">
        <section className="panel import-data-error">
          <h2>Dashboard data unavailable</h2>
          <p>{apiError ?? error ?? 'The market data API and public import data files could not be loaded.'}</p>
        </section>
      </div>
    );
  }

  const publicData = data ?? {};
  const dashboardEnvelope = (publicData[dashboardFile] ?? {}) as DashboardEnvelope;
  const dashboardData = dashboardEnvelope.data ?? {};
  const marginPayload = (publicData[marginFile] ?? {}) as Partial<DashboardMarginFile>;
  const filingsPayload = (publicData[filingsFile] ?? {}) as Partial<OperationsSecFilingsFile>;
  const trendData = apiData?.trendData ?? (Array.isArray(dashboardData.trends) ? dashboardData.trends : []);
  const dashboardEvents = Array.isArray(dashboardData.events) ? dashboardData.events : [];
  const filingRows = Array.isArray(filingsPayload.records) ? filingsPayload.records : [];
  const marginInputs = apiData?.marginInputs ?? (Array.isArray(marginPayload.records) ? marginPayload.records : []) as DashboardMarginRecord[];
  const events = [...dashboardEvents, ...secFilingEvents(filingRows)];
  const current = apiData?.current ?? dashboardData.current ?? null;
  const missingFromSource = Array.isArray(dashboardData.missingFromSource) ? dashboardData.missingFromSource : [];
  const derived = dashboardData.derived ?? null;
  const sourcePlatform = apiData ? 'Market Data API' : dashboardEnvelope.sourcePlatform ?? dashboardEnvelope.source ?? 'Internal';
  const sourceStatus = apiData ? 'api-current-history' : dashboardEnvelope.status ?? 'ready';
  const devCurrent = apiData?.currentFile
    ? { ...apiData.currentFile, marketHistoryGeneratedAt: apiData.historyFile?.generatedAt ?? null }
    : current;

  return (
    <div className="page dashboard-v2-page">
      <div className="dashboard-v2-header">
        <span>Dashboard</span>
        <p>Borrow market dashboard</p>
      </div>

      <DashboardV2Client ticker={normalizedTicker} data={trendData} events={events} marginRecords={marginInputs} current={current} />
      <DashboardV2DevTables
        file={apiData ? 'GET /market-data/current + GET /market-data/history' : dashboardFile}
        sourcePlatform={sourcePlatform}
        status={sourceStatus}
        current={devCurrent}
        trends={trendData as Array<Record<string, unknown>>}
        marginInputs={marginInputs as unknown as Array<Record<string, unknown>>}
        marginFile={apiData ? 'market-history.records[].margins' : marginPayload.s3Key ?? marginFile}
        marginStatus={apiData ? 'api-history' : 'public-s3'}
        events={events as Array<Record<string, unknown>>}
        missingFromSource={missingFromSource}
        derived={derived}
      />
    </div>
  );
}
