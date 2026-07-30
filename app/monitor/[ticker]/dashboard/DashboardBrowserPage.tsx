'use client';

import { useEffect, useState } from 'react';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { cachedAuthenticatedFetch } from '@/lib/auth-client';
import {
  latestCompleteMarketPublicationRecordFromHistory,
  marketCurrentMetricObservation,
  marketNumber,
  marketRecordDate,
} from '@/lib/market-data-publication';
import type { DashboardMarginRecord, DashboardUtilizationRecord, OperationsSecFilingRecord } from '@/lib/operations/data-types';
import { normalizeTicker } from '@/lib/ticker-data';
import { DashboardClient } from './DashboardClient';
import { DashboardDevTables } from './DashboardDevTables';
import type { CurrentAlertMetricValues } from '@/lib/alerts/ruleCatalogApi';

type TrendPoint = {
  date: string;
  price: number | null;
  feeRate: number | null;
  tradeVolume: number | null;
  shortableShares: number | null;
  daysToCover: number | null;
  utilization: number | null;
  averageDuration: number | null;
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
  borrowFee?: { percent?: unknown; numChange?: unknown; percentChange?: unknown };
  availableShares?: { value?: unknown; numChange?: unknown; percentChange?: unknown };
  utilization?: { percent?: unknown; numChange?: unknown; percentChange?: unknown };
  daysToCover?: { value?: unknown; numChange?: unknown; percentChange?: unknown };
  margins?: {
    initialMargin?: unknown;
    maintenanceMargin?: unknown;
    averageDurationDays?: unknown;
    valueFormat?: string;
    displayFormat?: string;
  };
  otherDateData?: Array<{ field?: unknown; date?: unknown }>;
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
  shortInterestShares?: unknown;
  shortInterestPercent?: unknown;
  initialMargin?: unknown;
  initialMarginIbkr?: unknown;
  initialMarginFutu?: unknown;
  maintenanceMargin?: unknown;
  maintenanceMarginIbkr?: unknown;
  maintenanceMarginFutu?: unknown;
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

type DashboardApiData = {
  currentFile: MarketCurrentFile | null;
  historyFile: MarketHistoryFile | null;
  secFilingsFile: SecFilingsHistoryFile | null;
  trendData: TrendPoint[];
  utilizationInputs: DashboardUtilizationRecord[];
  marginInputs: DashboardMarginRecord[];
  events: CompanyEvent[];
  current: Record<string, unknown> | null;
  currentAlertMetrics: CurrentAlertMetricValues;
};

function plainText(value: unknown, fallback = '') {
  return String(value ?? fallback).replace(/\s+/g, ' ').trim();
}

function numericOrNull(value: unknown) {
  if (value === null || value === undefined || value === '' || value === 'N/A') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[%,$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveNumericOrNull(value: unknown) {
  const numeric = numericOrNull(value);
  return numeric !== null && numeric > 0 ? numeric : null;
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
  const payload = value as { records?: unknown; data?: unknown | { records?: unknown } };
  if (Array.isArray(payload.records)) return payload.records as T[];
  if (Array.isArray(payload.data)) return payload.data as T[];
  if (payload.data && typeof payload.data === 'object') {
    const nested = payload.data as { records?: unknown };
    if (Array.isArray(nested.records)) return nested.records as T[];
  }
  return [];
}

function categoryPayload<T extends Record<string, unknown>>(value: unknown, category: string): T | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  const directCategory = payload[category];
  if (directCategory && typeof directCategory === 'object' && !Array.isArray(directCategory)) {
    return directCategory as T;
  }
  const data = payload.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const dataRecord = data as Record<string, unknown>;
    const nestedCategory = dataRecord[category];
    if (nestedCategory && typeof nestedCategory === 'object' && !Array.isArray(nestedCategory)) {
      return nestedCategory as T;
    }
    return dataRecord as T;
  }
  return payload as T;
}

function maxNumeric(...values: unknown[]) {
  const candidates = values.map(numericOrNull).filter((value): value is number => value !== null);
  return candidates.length ? Math.max(...candidates) : null;
}

function historyUtilizationRecords(records: MarketHistoryRecord[], ticker: string): DashboardUtilizationRecord[] {
  return records
    .map((record, index): DashboardUtilizationRecord | null => {
      const date = plainText(record.tradeDate);
      const utilization = numericOrNull(record.utilizationPercent);
      if (!date || utilization === null) return null;
      return {
        id: `market-history-utilization-${date}-${index}`,
        ticker,
        date,
        utilization,
        updatedAt: date,
        updatedBy: 'market-data-history-api',
      };
    })
    .filter((record): record is DashboardUtilizationRecord => Boolean(record))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function historyMarginRecords(records: MarketHistoryRecord[], ticker: string): DashboardMarginRecord[] {
  return records
    .map((record, index): DashboardMarginRecord | null => {
      const date = plainText(record.tradeDate);
      if (!date) return null;
      const valueFormat = record.valueFormat ?? 'decimal_ratio';
      const displayFormat = record.displayFormat ?? 'percent';
      const initialMargin = normalizeMarginPercent(maxNumeric(record.initialMargin, record.initialMarginIbkr, record.initialMarginFutu), valueFormat, displayFormat);
      const maintenanceMargin = normalizeMarginPercent(maxNumeric(record.maintenanceMargin, record.maintenanceMarginIbkr, record.maintenanceMarginFutu), valueFormat, displayFormat);
      const averageDurationDays = positiveNumericOrNull(record.averageDurationDays);
      if (initialMargin === null && maintenanceMargin === null && averageDurationDays === null) return null;
      return {
        id: `market-history-margin-${date}-${index}`,
        ticker,
        date,
        initialMargin,
        maintenanceMargin,
        averageDurationDays,
        updatedAt: date,
        updatedBy: 'market-data-history-api',
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
): DashboardApiData {
  const historyRecords = Array.isArray(historyFile?.records) ? historyFile.records : [];
  const publishedRecord = latestCompleteMarketPublicationRecordFromHistory(historyRecords);
  const publishedDate = publishedRecord ? marketRecordDate(publishedRecord) : '';
  const currentUtilization = marketCurrentMetricObservation(currentFile, 'utilization.percent');
  const currentAverageDuration = marketCurrentMetricObservation(currentFile, 'margins.averageDurationDays');
  const secFilingRows = asApiArray<OperationsSecFilingRecord>(secFilingsFile);
  const marketTrendData = historyRecords
    .map((row): TrendPoint | null => {
      const date = plainText(row.tradeDate ?? row.date);
      if (!date) return null;
      return {
        date,
        price: numericOrNull(row.price),
        feeRate: numericOrNull(row.borrowFeePercent),
        tradeVolume: numericOrNull(row.tradeVolume ?? row.volume ?? row.totalVolume),
        shortableShares: numericOrNull(row.availableShares),
        daysToCover: numericOrNull(row.daysToCover),
        utilization: numericOrNull(row.utilizationPercent),
        averageDuration: positiveNumericOrNull(row.averageDurationDays),
        margin: normalizeMarginPercent(row.initialMargin, row.valueFormat, row.displayFormat),
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
      averageDuration: null,
      margin: null,
    });
    marketTrendData.sort((a, b) => a.date.localeCompare(b.date));
  }

  function applyCurrentObservation(
    observation: { date: string; value: number } | null,
    key: 'utilization' | 'averageDuration',
  ) {
    if (!observation) return;
    const existing = marketTrendData.find(row => row.date === observation.date);
    if (existing) {
      if (existing[key] === null) existing[key] = observation.value;
      return;
    }
    marketTrendData.push({
      date: observation.date,
      price: null,
      feeRate: null,
      tradeVolume: null,
      shortableShares: null,
      daysToCover: null,
      utilization: key === 'utilization' ? observation.value : null,
      averageDuration: key === 'averageDuration' ? observation.value : null,
      margin: null,
    });
  }
  applyCurrentObservation(currentUtilization, 'utilization');
  applyCurrentObservation(currentAverageDuration, 'averageDuration');
  marketTrendData.sort((a, b) => a.date.localeCompare(b.date));

  const recordTicker = plainText(historyFile?.ticker ?? currentFile?.ticker, 'CURR').toUpperCase();
  // Dashboard cards and charts use each metric's latest valid observation
  // independently. Publication readiness only controls the consolidated alert
  // snapshot below, so sparse rows from a ticker such as MIMI remain visible.
  const utilizationInputs = historyUtilizationRecords(historyRecords, recordTicker);
  if (currentUtilization) {
    const existing = utilizationInputs.find(row => row.date === currentUtilization.date);
    if (!existing) {
      utilizationInputs.push({
        id: `market-current-utilization-${currentUtilization.date}`,
        ticker: recordTicker,
        date: currentUtilization.date,
        utilization: currentUtilization.value,
        updatedAt: currentUtilization.date,
        updatedBy: 'market-data-current-api',
      });
    }
    utilizationInputs.sort((a, b) => a.date.localeCompare(b.date));
  }
  const marginInputs = historyMarginRecords(historyRecords, recordTicker);
  if (currentAverageDuration && currentAverageDuration.value > 0) {
    const existing = marginInputs.find(row => row.date === currentAverageDuration.date);
    if (!existing || !(Number(existing.averageDurationDays) > 0)) {
      if (existing) {
        existing.averageDurationDays = currentAverageDuration.value;
      } else {
        marginInputs.push({
          id: `market-current-average-duration-${currentAverageDuration.date}`,
          ticker: recordTicker,
          date: currentAverageDuration.date,
          initialMargin: null,
          maintenanceMargin: null,
          averageDurationDays: currentAverageDuration.value,
          updatedAt: currentAverageDuration.date,
          updatedBy: 'market-data-current-api',
        });
      }
    }
    marginInputs.sort((a, b) => a.date.localeCompare(b.date));
  }
  const trendData = marketTrendData;

  const current = publishedRecord ? {
    publishedTradeDate: publishedDate,
    shortInterestPcFreeFloat: marketNumber(publishedRecord.shortInterestPercent),
    shortInterestShares: marketNumber(publishedRecord.shortInterestShares),
    shortScore: marketNumber(publishedRecord.shortScore),
    borrowFee: marketNumber(publishedRecord.borrowFeePercent),
    feeRate: marketNumber(publishedRecord.borrowFeePercent),
    utilization: currentUtilization?.value ?? marketNumber(publishedRecord.utilizationPercent),
    availableShares: marketNumber(publishedRecord.availableShares),
    daysToCover: marketNumber(publishedRecord.daysToCover),
    price: marketNumber(publishedRecord.price),
    sourceRecords: {
      marketHistory: publishedRecord,
    },
  } : null;

  const currentAlertMetrics: CurrentAlertMetricValues = {
    shortInterestFloatPercent: publishedRecord ? marketNumber(publishedRecord.shortInterestPercent) : null,
    shortScore: publishedRecord ? marketNumber(publishedRecord.shortScore) : null,
    borrowFeeRate: publishedRecord ? marketNumber(publishedRecord.borrowFeePercent) : null,
    utilization: currentUtilization?.value ?? (publishedRecord ? marketNumber(publishedRecord.utilizationPercent) : null),
    availableShares: publishedRecord ? marketNumber(publishedRecord.availableShares) : null,
  };
  return {
    currentFile,
    historyFile,
    secFilingsFile,
    trendData,
    utilizationInputs,
    marginInputs,
    events: secFilingEvents(secFilingRows),
    current,
    currentAlertMetrics,
  };
}

export function DashboardBrowserPage({ ticker }: { ticker: string }) {
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
        const [currentResponse, historyResponse, secFilingsResponse] = await Promise.all([
          cachedAuthenticatedFetch<Record<string, unknown>>(`/market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=market-current`),
          cachedAuthenticatedFetch<Record<string, unknown>>(`/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=market-history`),
          cachedAuthenticatedFetch<Record<string, unknown>>(`/manual-input/sec-filings?ticker=${encodeURIComponent(normalizedTicker)}`),
        ]);
        const currentFile = categoryPayload<MarketCurrentFile>(currentResponse, 'market-current');
        const historyFile = categoryPayload<MarketHistoryFile>(historyResponse, 'market-history');
        const secFilingsFile = categoryPayload<SecFilingsHistoryFile>(secFilingsResponse, 'sec-filings');
        if (!cancelled) setApiData(marketHistoryToDashboardData(currentFile, historyFile, secFilingsFile));
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
  return (
    <div className="page dashboard-page">
      <DashboardClient
        ticker={normalizedTicker}
        data={trendData}
        events={events}
        utilizationRecords={utilizationInputs}
        marginRecords={marginInputs}
        currentAlertMetrics={apiData.currentAlertMetrics}
      />
      <DashboardDevTables
        marketCurrent={apiData.currentFile as Record<string, unknown> | null}
        marketHistory={apiData.historyFile as Record<string, unknown> | null}
        secFilingsHistory={apiData.secFilingsFile as Record<string, unknown> | null}
      />
    </div>
  );
}
