'use client';

import { useEffect, useState } from 'react';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { authenticatedFetch } from '@/lib/auth-client';
import { latestCompleteMarketPublicationRecordFromSources, marketNumber, marketRecordDate } from '@/lib/market-data-publication';
import type { DashboardMarginRecord, DashboardUtilizationRecord, OperationsSecFilingRecord } from '@/lib/operations/data-types';
import { normalizeTicker } from '@/lib/ticker-data';
import { DashboardClient } from './DashboardClient';
import { DashboardDevTables } from './DashboardDevTables';

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
  shortInterestShares?: unknown;
  shortInterestPercent?: unknown;
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
type ManualAvailabilityRecord = ManualDateRecord & {
  availableSharesIbkr?: unknown;
  availableSharesFutu?: unknown;
};
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
  availability: ManualAvailabilityRecord[];
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
  const publishedRecord = latestCompleteMarketPublicationRecordFromSources(historyRecords, manualInputs);
  const publishedDate = publishedRecord ? marketRecordDate(publishedRecord) : '';
  const secFilingRows = Array.isArray(secFilingsFile?.records) ? secFilingsFile.records : [];
  const marketTrendData = historyRecords
    .filter(row => Boolean(publishedDate) && plainText(row.tradeDate ?? row.date) <= publishedDate)
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
        averageDuration: null,
        margin: null,
      };
    })
    .filter((row): row is TrendPoint => Boolean(row))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (currentFile?.snapshotDate && currentFile.snapshotDate <= publishedDate && !marketTrendData.some(row => row.date === currentFile.snapshotDate)) {
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

  const recordTicker = plainText(historyFile?.ticker ?? currentFile?.ticker, 'CURR').toUpperCase();
  const utilizationInputs = manualUtilizationRecords(manualInputs.utilization, recordTicker).filter(record => Boolean(publishedDate) && record.date <= publishedDate);
  const marginInputs = manualMarginRecords(manualInputs.margins, recordTicker).filter(record => Boolean(publishedDate) && record.date <= publishedDate);
  const utilizationByDate = new Map(utilizationInputs.map(record => [record.date, record.utilization]));
  const averageDurationByDate = new Map(
    marginInputs
      .filter(record => record.averageDurationDays !== null)
      .map(record => [record.date, record.averageDurationDays as number]),
  );
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
        averageDuration: null,
        margin: null,
      });
    }
  });
  averageDurationByDate.forEach((averageDuration, date) => {
    const existing = trendByDate.get(date);
    if (existing) {
      trendByDate.set(date, { ...existing, averageDuration });
    } else {
      trendByDate.set(date, {
        date,
        price: null,
        feeRate: null,
        tradeVolume: null,
        shortableShares: null,
        daysToCover: null,
        utilization: null,
        averageDuration,
        margin: null,
      });
    }
  });
  const trendData = [...trendByDate.values()]
    .map(point => ({
      ...point,
      utilization: utilizationByDate.get(point.date) ?? point.utilization,
      averageDuration: averageDurationByDate.get(point.date) ?? point.averageDuration,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const current = publishedRecord ? {
    publishedTradeDate: publishedDate,
    shortInterestPcFreeFloat: marketNumber(publishedRecord.shortInterestPercent),
    shortInterestShares: marketNumber(publishedRecord.shortInterestShares),
    shortScore: marketNumber(publishedRecord.shortScore),
    borrowFee: marketNumber(publishedRecord.borrowFeePercent),
    feeRate: marketNumber(publishedRecord.borrowFeePercent),
    utilization: marketNumber(publishedRecord.utilizationPercent),
    availableShares: marketNumber(publishedRecord.availableShares),
    daysToCover: marketNumber(publishedRecord.daysToCover),
    price: marketNumber(publishedRecord.price),
    sourceRecords: {
      marketHistory: publishedRecord,
    },
  } : null;

  return { currentFile, historyFile, secFilingsFile, trendData, utilizationInputs, marginInputs, events: secFilingEvents(secFilingRows), current, manualInputs };
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
        const [currentFile, historyFile, secFilingsFile, utilizationPayload, availabilityPayload, marginsPayload] = await Promise.all([
          authenticatedFetch(`/market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=market-current`) as Promise<MarketCurrentFile>,
          authenticatedFetch(`/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=market-history`) as Promise<MarketHistoryFile>,
          authenticatedFetch(`/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=sec-filings-history`) as Promise<SecFilingsHistoryFile>,
          authenticatedFetch(`/manual-input/utilization?ticker=${encodeURIComponent(normalizedTicker)}`),
          authenticatedFetch(`/manual-input/manual-availability?ticker=${encodeURIComponent(normalizedTicker)}`),
          authenticatedFetch(`/manual-input/margins?ticker=${encodeURIComponent(normalizedTicker)}`),
        ]);
        const manualInputs: ManualMarketInputs = {
          utilization: asApiArray<ManualUtilizationRecord>(utilizationPayload),
          availability: asApiArray<ManualAvailabilityRecord>(availabilityPayload),
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
  return (
    <div className="page dashboard-page">
      <DashboardClient ticker={normalizedTicker} data={trendData} events={events} utilizationRecords={utilizationInputs} marginRecords={marginInputs} current={current} />
      <DashboardDevTables
        marketCurrent={apiData.currentFile as Record<string, unknown> | null}
        marketHistory={apiData.historyFile as Record<string, unknown> | null}
        manualUtilization={apiData.manualInputs.utilization as Array<Record<string, unknown>>}
        manualAvailability={apiData.manualInputs.availability as Array<Record<string, unknown>>}
        manualMargins={apiData.manualInputs.margins as Array<Record<string, unknown>>}
        secFilingsHistory={apiData.secFilingsFile as Record<string, unknown> | null}
      />
    </div>
  );
}
