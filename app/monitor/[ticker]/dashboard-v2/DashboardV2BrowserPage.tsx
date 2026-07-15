'use client';

import { useEffect, useState } from 'react';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { authenticatedFetch } from '@/lib/auth-client';
import type { DashboardMarginRecord, DashboardUtilizationRecord, OperationsSecFilingRecord } from '@/lib/operations/data-types';
import { normalizeTicker } from '@/lib/ticker-data';
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
  shortScore?: unknown;
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

type SecFilingsHistoryFile = {
  schemaVersion?: number;
  ticker?: string;
  generatedAt?: string;
  records?: OperationsSecFilingRecord[];
  sourceWatermarks?: Record<string, unknown>;
  _field_provenance?: Record<string, unknown>;
};

type ManualDateRecord = {
  tradeDate?: string;
  generatedAt?: string;
  updatedAt?: string;
  createdAt?: string;
};

type ManualUtilizationRecord = ManualDateRecord & { utilizationPercent?: unknown };
type ManualMarginRecord = ManualDateRecord & {
  initialMarginIbkr?: unknown;
  initialMarginFutu?: unknown;
  maintenanceMarginIbkr?: unknown;
  maintenanceMarginFutu?: unknown;
  averageDurationDays?: unknown;
  valueFormat?: string;
  displayFormat?: string;
};

type ManualMarketInputs = {
  utilization: ManualUtilizationRecord[];
  margins: ManualMarginRecord[];
};

type DashboardApiData = {
  currentFile: MarketCurrentFile | null;
  historyFile: MarketHistoryFile | null;
  secFilingsFile: SecFilingsHistoryFile | null;
  trendData: TrendPoint[];
  utilizationInputs: DashboardUtilizationRecord[];
  marginInputs: DashboardMarginRecord[];
  events: CompanyEvent[];
  current: Record<string, unknown> | null;
  manualInputs: ManualMarketInputs;
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

function asApiArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== 'object') return [];
  const payload = value as { records?: unknown; data?: unknown };
  if (Array.isArray(payload.records)) return payload.records as T[];
  if (Array.isArray(payload.data)) return payload.data as T[];
  return [];
}

function latestManualRecord<T extends ManualDateRecord>(records: T[]) {
  return [...records].sort((a, b) => plainText(b.tradeDate).localeCompare(plainText(a.tradeDate)))[0];
}

function maxNumeric(...values: unknown[]) {
  const candidates = values.map(numericOrNull).filter((value): value is number => value !== null);
  return candidates.length ? Math.max(...candidates) : null;
}

function manualUtilizationRecords(records: ManualUtilizationRecord[], ticker: string): DashboardUtilizationRecord[] {
  return records
    .map((record, index): DashboardUtilizationRecord | null => {
      const date = plainText(record.tradeDate);
      const utilization = numericOrNull(record.utilizationPercent);
      if (!date || utilization === null) return null;
      return {
        id: `manual-utilization-${date}-${index}`,
        ticker,
        date,
        utilization,
        updatedAt: plainText(record.updatedAt ?? record.generatedAt ?? record.createdAt),
        updatedBy: 'manual-input-api',
      };
    })
    .filter((record): record is DashboardUtilizationRecord => Boolean(record))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function manualMarginRecords(records: ManualMarginRecord[], ticker: string): DashboardMarginRecord[] {
  return records
    .map((record, index): DashboardMarginRecord | null => {
      const date = plainText(record.tradeDate);
      if (!date) return null;
      const valueFormat = record.valueFormat ?? 'decimal_ratio';
      const displayFormat = record.displayFormat ?? 'percent';
      const initialMargin = normalizeMarginPercent(maxNumeric(record.initialMarginIbkr, record.initialMarginFutu), valueFormat, displayFormat);
      const maintenanceMargin = normalizeMarginPercent(maxNumeric(record.maintenanceMarginIbkr, record.maintenanceMarginFutu), valueFormat, displayFormat);
      const averageDurationDays = numericOrNull(record.averageDurationDays);
      if (initialMargin === null && maintenanceMargin === null && averageDurationDays === null) return null;
      return {
        id: `manual-margin-${date}-${index}`,
        ticker,
        date,
        initialMargin,
        maintenanceMargin,
        averageDurationDays,
        updatedAt: plainText(record.updatedAt ?? record.generatedAt ?? record.createdAt),
        updatedBy: 'manual-input-api',
      };
    })
    .filter((record): record is DashboardMarginRecord => Boolean(record))
    .sort((a, b) => a.date.localeCompare(b.date));
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

function marketHistoryToDashboardData(
  currentFile: MarketCurrentFile | null,
  historyFile: MarketHistoryFile | null,
  secFilingsFile: SecFilingsHistoryFile | null,
  manualInputs: ManualMarketInputs,
): DashboardApiData {
  const historyRecords = Array.isArray(historyFile?.records) ? historyFile.records : [];
  const secFilingRows = Array.isArray(secFilingsFile?.records) ? secFilingsFile.records : [];
  const marketTrendData = historyRecords
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
        utilization: null,
        margin: null,
      };
    })
    .filter((row): row is TrendPoint => Boolean(row))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (currentFile?.snapshotDate && !marketTrendData.some(row => row.date === currentFile.snapshotDate)) {
    marketTrendData.push({
      date: currentFile.snapshotDate,
      price: numericOrNull(currentFile.price?.value),
      feeRate: numericOrNull(currentFile.borrowFee?.percent),
      tradeVolume: null,
      shortableShares: numericOrNull(currentFile.availableShares?.value),
      daysToCover: numericOrNull(currentFile.daysToCover?.value),
      utilization: null,
      margin: null,
    });
    marketTrendData.sort((a, b) => a.date.localeCompare(b.date));
  }

  const recordTicker = plainText(historyFile?.ticker ?? currentFile?.ticker, 'CURR').toUpperCase();
  const utilizationInputs = manualUtilizationRecords(manualInputs.utilization, recordTicker);
  const marginInputs = manualMarginRecords(manualInputs.margins, recordTicker);
  const utilizationByDate = new Map(utilizationInputs.map(record => [record.date, record.utilization]));
  const trendByDate = new Map(marketTrendData.map(point => [point.date, point]));
  utilizationInputs.forEach(record => {
    const marketPoint = trendByDate.get(record.date);
    if (marketPoint) {
      trendByDate.set(record.date, { ...marketPoint, utilization: record.utilization });
    } else {
      trendByDate.set(record.date, {
        date: record.date,
        price: null,
        feeRate: null,
        tradeVolume: null,
        shortableShares: null,
        daysToCover: null,
        utilization: record.utilization,
        margin: null,
      });
    }
  });
  const trendData = [...trendByDate.values()]
    .map(point => ({ ...point, utilization: utilizationByDate.get(point.date) ?? point.utilization }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const latestUtilization = latestManualRecord(manualInputs.utilization);
  const current = currentFile || latestUtilization ? {
    shortInterestPcFreeFloat: numericOrNull(currentFile?.shortInterest?.percent),
    shortInterestShares: numericOrNull(currentFile?.shortInterest?.shares),
    shortScore: numericOrNull(currentFile?.scores?.shortScore?.value),
    borrowFee: numericOrNull(currentFile?.borrowFee?.percent),
    feeRate: numericOrNull(currentFile?.borrowFee?.percent),
    utilization: numericOrNull(latestUtilization?.utilizationPercent),
    availableShares: numericOrNull(currentFile?.availableShares?.value),
    daysToCover: numericOrNull(currentFile?.daysToCover?.value),
    price: numericOrNull(currentFile?.price?.value),
    sourceRecords: {
      marketCurrent: currentFile,
    },
  } : null;

  return { currentFile, historyFile, secFilingsFile, trendData, utilizationInputs, marginInputs, events: secFilingEvents(secFilingRows), current, manualInputs };
}

export function DashboardV2BrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const [apiData, setApiData] = useState<DashboardApiData | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadApiData() {
      setApiLoading(true);
      setApiError(null);
      try {
        const [currentFile, historyFile, secFilingsFile, utilizationPayload, marginsPayload] = await Promise.all([
          authenticatedFetch(`/market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=market-current`) as Promise<MarketCurrentFile>,
          authenticatedFetch(`/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=market-history`) as Promise<MarketHistoryFile>,
          authenticatedFetch(`/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=sec-filings-history`) as Promise<SecFilingsHistoryFile>,
          authenticatedFetch(`/manual-input/utilization?ticker=${encodeURIComponent(normalizedTicker)}`),
          authenticatedFetch(`/manual-input/margins?ticker=${encodeURIComponent(normalizedTicker)}`),
        ]);
        const manualInputs: ManualMarketInputs = {
          utilization: asApiArray<ManualUtilizationRecord>(utilizationPayload),
          margins: asApiArray<ManualMarginRecord>(marginsPayload),
        };
        if (!cancelled) setApiData(marketHistoryToDashboardData(currentFile, historyFile, secFilingsFile, manualInputs));
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
  if (!apiData) {
    return (
      <div className="page">
        <section className="panel import-data-error">
          <h2>Dashboard data unavailable</h2>
          <p>{apiError ?? 'The market data API could not be loaded.'}</p>
        </section>
      </div>
    );
  }

  const trendData = apiData.trendData;
  const utilizationInputs = apiData.utilizationInputs;
  const marginInputs = apiData.marginInputs;
  const events = apiData.events;
  const current = apiData.current;
  const devCurrent = {
    ...apiData.currentFile,
    marketHistoryGeneratedAt: apiData.historyFile?.generatedAt ?? null,
    secFilingsHistoryGeneratedAt: apiData.secFilingsFile?.generatedAt ?? null,
    manualInputV2: apiData.manualInputs,
  };

  return (
    <div className="page dashboard-v2-page">
      <div className="dashboard-v2-header">
        <span>Dashboard</span>
        <p>Borrow market dashboard</p>
      </div>

      <DashboardV2Client ticker={normalizedTicker} data={trendData} events={events} utilizationRecords={utilizationInputs} marginRecords={marginInputs} current={current} />
      <DashboardV2DevTables
        file="GET /market-data/current + GET /market-data/history + GET /manual-input/utilization + GET /manual-input/margins"
        sourcePlatform="Market Data API + Manual Input V2 API"
        status="api-separated-sources"
        current={devCurrent}
        trends={trendData as Array<Record<string, unknown>>}
        marginInputs={marginInputs as unknown as Array<Record<string, unknown>>}
        marginFile="GET /manual-input/margins"
        marginStatus="manual-input-api"
        events={events as Array<Record<string, unknown>>}
        missingFromSource={[]}
        derived={null}
      />
    </div>
  );
}
