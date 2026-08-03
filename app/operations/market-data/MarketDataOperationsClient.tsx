'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { OperationsDevelopmentData, type OperationsDevelopmentDatum } from '@/components/OperationsDevelopmentData';
import { authenticatedFetch } from '@/lib/auth-client';
import {
  captureConsolidatedOutputs,
  waitForConsolidatedOutputChange,
} from '@/lib/consolidation-verification';
import {
  marketNumber,
  marketPublicationFields,
  marketPublicationRecordForDate,
  marketRecordDate,
  type MarketPublicationRecord,
} from '@/lib/market-data-publication';
import { operationsProfile } from '@/lib/operations/api-client';
import { getOperationsTicker, setOperationsTicker } from '@/lib/operations/ticker-client';
import { formatMarketCountdown, latestClosedUsMarketDate, marketEntryAvailability } from '@/lib/us-market-calendar';

type DateSpecificRecord = {
  ticker?: string;
  tradeDate?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
};

type UtilizationRecord = DateSpecificRecord & {
  utilizationPercent?: number | null;
};

type AvailabilityRecord = DateSpecificRecord & {
  availableSharesIbkr?: number | null;
  availableSharesFutu?: number | null;
};

type MarginRecord = DateSpecificRecord & {
  initialMarginIbkr?: number | null;
  initialMarginFutu?: number | null;
  maintenanceMarginIbkr?: number | null;
  maintenanceMarginFutu?: number | null;
  averageDurationDays?: number | null;
  valueFormat?: string;
  displayFormat?: string;
};

type ShortScoreRecord = DateSpecificRecord & {
  shortScore?: number | null;
};

type IssuedShareRecord = DateSpecificRecord & {
  issuedShare?: number | Record<string, unknown> | null;
  issuedShares?: number | null;
  issued_share?: number | null;
};

type MarketInputRow = {
  ticker?: string;
  tradeDate: string;
  issuedShare?: number;
  utilizationPercent?: number;
  availableSharesIbkr?: number;
  availableSharesFutu?: number;
  initialMarginIbkr?: number;
  initialMarginFutu?: number;
  maintenanceMarginIbkr?: number;
  maintenanceMarginFutu?: number;
  averageDurationDays?: number | null;
  shortScore?: number;
  updatedAt?: string;
  updatedBy?: string;
};

type FormState = {
  tradeDate: string;
  issuedShare: string;
  utilizationPercent: string;
  availableSharesIbkr: string;
  availableSharesFutu: string;
  initialMarginIbkr: string;
  initialMarginFutu: string;
  maintenanceMarginIbkr: string;
  maintenanceMarginFutu: string;
  averageDurationDays: string;
  shortScore: string;
};

const dateSpecificCategories = ['issued-share', 'utilization', 'manual-availability', 'margins', 'short-score'] as const;
const historyPageSize = 10;

function marketConsolidatedOutputEndpoints(ticker: string) {
  const tickerParam = encodeURIComponent(ticker);
  return [
    `/market-data/current?ticker=${tickerParam}&category=market-current`,
    `/market-data/history?ticker=${tickerParam}&category=market-history`,
  ];
}

function emptyForm(): FormState {
  return {
    tradeDate: '',
    issuedShare: '',
    utilizationPercent: '',
    availableSharesIbkr: '',
    availableSharesFutu: '',
    initialMarginIbkr: '',
    initialMarginFutu: '',
    maintenanceMarginIbkr: '',
    maintenanceMarginFutu: '',
    averageDurationDays: '',
    shortScore: '',
  };
}

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 10) || 'CURR';
}

function numberOrUndefined(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(/[%,$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function latestMetricAtOrBefore(
  records: MarketPublicationRecord[],
  selectedDate: string,
  key: keyof MarketPublicationRecord,
  positiveOnly = false,
) {
  return [...records]
    .filter(record => marketRecordDate(record) <= selectedDate)
    .sort((a, b) => marketRecordDate(b).localeCompare(marketRecordDate(a)))
    .map(record => ({
      date: marketRecordDate(record),
      value: marketNumber(record[key]),
    }))
    .find(item => item.value !== null && (!positiveOnly || item.value > 0)) ?? null;
}

function formatShareInput(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
}

function percentInputToRatio(value: string) {
  const numeric = numberOrUndefined(value);
  return numeric === undefined ? undefined : roundDecimal(numeric / 100);
}

function ratioToPercent(value: unknown) {
  if (value === null || value === undefined || value === '') return '';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return '';
  return String(roundDecimal(numeric * 100));
}

function roundDecimal(value: number, digits = 10) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function formatNumber(value: unknown, digits = 0) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric)
    ? numeric.toLocaleString('en-US', { maximumFractionDigits: digits })
    : 'N/A';
}

function formatDecimalFixed(value: unknown, digits = 2) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric)
    ? numeric.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : 'N/A';
}

function decimalInput(value: unknown, digits = 2) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : '';
}

function formatPercentFromRatio(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric)
    ? `${(numeric * 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    : 'N/A';
}

function formatPercent(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric)
    ? `${numeric.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
    : 'N/A';
}

function formatPercentFixed(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric)
    ? `${numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    : 'N/A';
}

function formatDays(value: unknown, digits = 1, minimumDigits = 0) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric)
    ? `${numeric.toLocaleString('en-US', { minimumFractionDigits: minimumDigits, maximumFractionDigits: digits })}d`
    : 'N/A';
}

function formatReadinessValue(field: ReturnType<typeof marketPublicationFields>[number]) {
  if (field.value === null) return 'Missing';
  if (field.key === 'availableShares' || field.key.startsWith('availableShares')) return formatNumber(field.value);
  if (field.key === 'averageDurationDays' || field.key === 'daysToCover') return formatDays(field.value);
  if (field.key === 'initialMargin' || field.key === 'maintenanceMargin') return formatPercentFromRatio(field.value);
  return formatPercent(field.value);
}

function parsePayload(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function categoryPayload(value: unknown, category: string): unknown {
  const parsed = parsePayload(value);
  if (Array.isArray(parsed) || !isRecord(parsed)) return parsed;

  const categoryValue = parsed[category];
  if (categoryValue !== undefined && categoryValue !== null) {
    return categoryPayload(categoryValue, category);
  }

  for (const key of ['data', 'result', 'record', 'item', 'items', 'body']) {
    if (parsed[key] !== undefined && parsed[key] !== null) {
      const nested = categoryPayload(parsed[key], category);
      if (nested !== parsed[key] || Array.isArray(nested) || isRecord(nested)) return nested;
    }
  }

  return parsed;
}

function recordsFromPayload<T>(value: unknown): T[] {
  const parsed = parsePayload(value);
  if (Array.isArray(parsed)) return parsed as T[];
  if (isRecord(parsed) && Array.isArray(parsed.records)) return parsed.records as T[];
  if (isRecord(parsed) && Array.isArray(parsed.items)) return parsed.items as T[];
  if (isRecord(parsed) && Array.isArray(parsed.data)) return parsed.data as T[];
  if (isRecord(parsed) && isRecord(parsed.data) && Array.isArray(parsed.data.records)) return parsed.data.records as T[];
  return [];
}

function recordMatchesTicker(record: DateSpecificRecord, ticker: string) {
  const aliases = record as DateSpecificRecord & { recordTicker?: string; stockCode?: string };
  const recordTicker = aliases.ticker ?? aliases.recordTicker ?? aliases.stockCode;
  return !recordTicker || normalizeTicker(recordTicker) === normalizeTicker(ticker);
}

function tickerRecordsFromPayload<T extends DateSpecificRecord>(value: unknown, ticker: string): T[] {
  return recordsFromPayload<T>(value)
    .map(record => {
      const date = String(record.tradeDate ?? (record as DateSpecificRecord & { date?: string }).date ?? '').slice(0, 10);
      return date && !record.tradeDate ? { ...record, tradeDate: date } : record;
    })
    .filter(record => recordMatchesTicker(record, ticker));
}

function issuedShareValue(record: IssuedShareRecord) {
  const issuedShare = record.issuedShare;
  const nestedIssuedShare = isRecord(issuedShare) ? issuedShare : {};
  return numberOrUndefined(String(
    (isRecord(issuedShare) ? undefined : issuedShare)
    ?? record.issuedShares
    ?? record.issued_share
    ?? nestedIssuedShare.value
    ?? nestedIssuedShare.shares
    ?? nestedIssuedShare.total
    ?? '',
  ));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function payloadRecordCount(value: unknown) {
  const parsed = parsePayload(value);
  if (Array.isArray(parsed)) return parsed.length;
  if (isRecord(parsed) && Array.isArray(parsed.records)) return parsed.records.length;
  if (isRecord(parsed) && Array.isArray(parsed.items)) return parsed.items.length;
  if (isRecord(parsed) && Array.isArray(parsed.data)) return parsed.data.length;
  if (isRecord(parsed) && isRecord(parsed.data) && Array.isArray(parsed.data.records)) return parsed.data.records.length;
  if (parsed === null || parsed === undefined) return 0;
  return 1;
}

function payloadGeneratedAt(value: unknown) {
  if (isRecord(value)) {
    return String(value.generatedAt ?? value.updatedAt ?? value.createdAt ?? '');
  }
  if (Array.isArray(value)) {
    const latest = value
      .filter(isRecord)
      .map(row => String(row.generatedAt ?? row.updatedAt ?? row.createdAt ?? ''))
      .filter(Boolean)
      .sort()
      .at(-1);
    return latest ?? '';
  }
  return '';
}

function withoutUndefined<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}

async function saveManualInput(endpoint: string, payload: Record<string, unknown>) {
  const body = JSON.stringify(withoutUndefined(payload));
  return authenticatedFetch(endpoint, { method: 'PUT', body });
}

async function deleteManualInput(endpoint: string) {
  try {
    return await authenticatedFetch(endpoint, { method: 'DELETE' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) return null;
    throw error;
  }
}

type NamedRequest = {
  label: string;
  request: Promise<unknown>;
};

async function runNamedRequests(summary: string, requests: NamedRequest[]) {
  const results = await Promise.allSettled(requests.map(item => item.request));
  const failures = results.flatMap((result, index) => result.status === 'rejected'
    ? [`• ${requests[index].label}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`]
    : []);
  if (failures.length) throw new Error(`${summary}\n${failures.join('\n')}`);
  return results.map(result => result.status === 'fulfilled' ? result.value : null);
}

function latestMeta(...records: Array<DateSpecificRecord | undefined>) {
  return records
    .filter((record): record is DateSpecificRecord => Boolean(record))
    .sort((a, b) => String(b.updatedAt ?? b.createdAt ?? '').localeCompare(String(a.updatedAt ?? a.createdAt ?? '')))[0];
}

function mergeRows(
  ticker: string,
  utilization: UtilizationRecord[],
  availability: AvailabilityRecord[],
  margins: MarginRecord[],
  shortScores: ShortScoreRecord[],
) {
  const rows = new Map<string, MarketInputRow>();

  function row(date: string) {
    const existing = rows.get(date);
    if (existing) return existing;
    const next: MarketInputRow = {
      ticker,
      tradeDate: date,
    };
    rows.set(date, next);
    return next;
  }

  utilization.forEach(record => {
    if (!record.tradeDate) return;
    const target = row(record.tradeDate);
    target.utilizationPercent = record.utilizationPercent ?? undefined;
    const meta = latestMeta(target as DateSpecificRecord, record);
    target.updatedAt = meta?.updatedAt ?? meta?.createdAt;
    target.updatedBy = meta?.updatedBy ?? meta?.createdBy;
  });
  availability.forEach(record => {
    if (!record.tradeDate) return;
    const target = row(record.tradeDate);
    target.availableSharesIbkr = record.availableSharesIbkr ?? undefined;
    target.availableSharesFutu = record.availableSharesFutu ?? undefined;
    const meta = latestMeta(target as DateSpecificRecord, record);
    target.updatedAt = meta?.updatedAt ?? meta?.createdAt;
    target.updatedBy = meta?.updatedBy ?? meta?.createdBy;
  });
  margins.forEach(record => {
    if (!record.tradeDate) return;
    const target = row(record.tradeDate);
    target.initialMarginIbkr = record.initialMarginIbkr ?? undefined;
    target.initialMarginFutu = record.initialMarginFutu ?? undefined;
    target.maintenanceMarginIbkr = record.maintenanceMarginIbkr ?? undefined;
    target.maintenanceMarginFutu = record.maintenanceMarginFutu ?? undefined;
    target.averageDurationDays = record.averageDurationDays;
    const meta = latestMeta(target as DateSpecificRecord, record);
    target.updatedAt = meta?.updatedAt ?? meta?.createdAt;
    target.updatedBy = meta?.updatedBy ?? meta?.createdBy;
  });
  shortScores.forEach(record => {
    if (!record.tradeDate) return;
    const target = row(record.tradeDate);
    target.shortScore = record.shortScore ?? undefined;
    const meta = latestMeta(target as DateSpecificRecord, record);
    target.updatedAt = meta?.updatedAt ?? meta?.createdAt;
    target.updatedBy = meta?.updatedBy ?? meta?.createdBy;
  });

  return [...rows.values()].sort((a, b) => b.tradeDate.localeCompare(a.tradeDate));
}

function mergeManualInputRows(
  ticker: string,
  issuedShares: IssuedShareRecord[],
  utilization: UtilizationRecord[],
  availability: AvailabilityRecord[],
  margins: MarginRecord[],
  shortScores: ShortScoreRecord[],
) {
  const rows = new Map(
    mergeRows(ticker, utilization, availability, margins, shortScores)
      .map(record => [record.tradeDate, record]),
  );

  issuedShares.forEach(record => {
    if (!record.tradeDate) return;
    const target = rows.get(record.tradeDate) ?? { ticker, tradeDate: record.tradeDate };
    target.issuedShare = issuedShareValue(record);
    const meta = latestMeta(target as DateSpecificRecord, record);
    target.updatedAt = meta?.updatedAt ?? meta?.createdAt;
    target.updatedBy = meta?.updatedBy ?? meta?.createdBy;
    rows.set(record.tradeDate, target);
  });

  return [...rows.values()]
    .filter(hasManualInputValues)
    .sort((a, b) => b.tradeDate.localeCompare(a.tradeDate));
}

function manualRowsFromPayloads(
  ticker: string,
  payloads: {
    issuedShare: unknown;
    utilization: unknown;
    availability: unknown;
    margins: unknown;
    shortScore: unknown;
  },
) {
  return mergeManualInputRows(
    ticker,
    tickerRecordsFromPayload<IssuedShareRecord>(
      categoryPayload(payloads.issuedShare, 'issued-share'),
      ticker,
    ),
    tickerRecordsFromPayload<UtilizationRecord>(
      categoryPayload(payloads.utilization, 'utilization'),
      ticker,
    ),
    tickerRecordsFromPayload<AvailabilityRecord>(
      categoryPayload(payloads.availability, 'manual-availability'),
      ticker,
    ),
    tickerRecordsFromPayload<MarginRecord>(
      categoryPayload(payloads.margins, 'margins'),
      ticker,
    ),
    tickerRecordsFromPayload<ShortScoreRecord>(
      categoryPayload(payloads.shortScore, 'short-score'),
      ticker,
    ),
  );
}

function hasManualInputValues(record: MarketInputRow | undefined) {
  if (!record) return false;
  return [
    record.issuedShare,
    record.utilizationPercent,
    record.availableSharesIbkr,
    record.availableSharesFutu,
    record.initialMarginIbkr,
    record.initialMarginFutu,
    record.maintenanceMarginIbkr,
    record.maintenanceMarginFutu,
    record.averageDurationDays,
    record.shortScore,
  ].some(value => value !== undefined && value !== null);
}

function manualRowKey(ticker: string, tradeDate: string) {
  return `${normalizeTicker(ticker)}:${tradeDate}`;
}

function formFromDailyRecord(tradeDate: string, record: MarketInputRow | undefined, issuedShare: number | undefined): FormState {
  return {
    ...emptyForm(),
    tradeDate,
    issuedShare: formatShareInput(issuedShare),
    utilizationPercent: record?.utilizationPercent === undefined ? '' : String(record.utilizationPercent),
    availableSharesIbkr: formatShareInput(record?.availableSharesIbkr),
    availableSharesFutu: formatShareInput(record?.availableSharesFutu),
    initialMarginIbkr: ratioToPercent(record?.initialMarginIbkr),
    initialMarginFutu: ratioToPercent(record?.initialMarginFutu),
    maintenanceMarginIbkr: ratioToPercent(record?.maintenanceMarginIbkr),
    maintenanceMarginFutu: ratioToPercent(record?.maintenanceMarginFutu),
    averageDurationDays: record?.averageDurationDays == null ? '' : String(record.averageDurationDays),
    shortScore: decimalInput(record?.shortScore),
  };
}

export function MarketDataOperationsClient() {
  const [selectedTicker, setSelectedTicker] = useState('CURR');
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [rows, setRows] = useState<MarketInputRow[]>([]);
  const [marketHistory, setMarketHistory] = useState<MarketPublicationRecord[]>([]);
  const [apiDebugRows, setApiDebugRows] = useState<OperationsDevelopmentDatum[]>([]);
  const [status, setStatus] = useState<'checking' | 'loading' | 'idle' | 'saving' | 'consolidating' | 'success' | 'error' | 'forbidden'>('checking');
  const [message, setMessage] = useState('');
  const [deletingDate, setDeletingDate] = useState('');
  const [editingDate, setEditingDate] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [historyRefreshMessage, setHistoryRefreshMessage] = useState('');
  const [manualRowsByDate, setManualRowsByDate] = useState<Record<string, MarketInputRow>>({});
  const activeTickerRef = useRef('CURR');
  const loadGenerationRef = useRef(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  async function loadApi(endpoint: string) {
    try {
      const payload = await authenticatedFetch(endpoint, { cache: 'no-store' });
      return {
        payload,
        debug: {
          endpoint: `GET ${endpoint}`,
          source: 'API Gateway',
          state: 'ok',
          recordCount: payloadRecordCount(payload),
          updatedAt: payloadGeneratedAt(payload),
          payload,
        },
      };
    } catch (error) {
      return {
        payload: null,
        debug: {
          endpoint: `GET ${endpoint}`,
          source: 'API Gateway',
          state: error instanceof Error ? `error: ${error.message}` : 'error',
          payload: null,
        },
      };
    }
  }

  async function loadRecords(
    ticker: string,
    preserveFeedback = false,
    additionalDebugRows: OperationsDevelopmentDatum[] = [],
  ) {
    const normalized = normalizeTicker(ticker);
    const loadGeneration = loadGenerationRef.current + 1;
    loadGenerationRef.current = loadGeneration;
    activeTickerRef.current = normalized;
    const selectedTradeDate = form.tradeDate || latestClosedUsMarketDate();
    setSelectedTicker(normalized);
    setOperationsTicker(normalized);
    setRows([]);
    setMarketHistory([]);
    setManualRowsByDate({});
    setEditingDate('');
    setForm(formFromDailyRecord(selectedTradeDate, undefined, undefined));
    setStatus('loading');
    if (!preserveFeedback) setMessage('');
    try {
      const endpoints = [
        `/market-data/history?ticker=${encodeURIComponent(normalized)}&category=market-history`,
        `/manual-input/issued-share?ticker=${encodeURIComponent(normalized)}`,
        `/manual-input/utilization?ticker=${encodeURIComponent(normalized)}`,
        `/manual-input/manual-availability?ticker=${encodeURIComponent(normalized)}`,
        `/manual-input/margins?ticker=${encodeURIComponent(normalized)}`,
        `/manual-input/short-score?ticker=${encodeURIComponent(normalized)}`,
      ];
      const [marketHistoryResult, issuedShareResult, utilizationResult, availabilityResult, marginsResult, shortScoreResult] = await Promise.all([
        loadApi(endpoints[0]),
        loadApi(endpoints[1]),
        loadApi(endpoints[2]),
        loadApi(endpoints[3]),
        loadApi(endpoints[4]),
        loadApi(endpoints[5]),
      ]);
      if (loadGenerationRef.current !== loadGeneration || activeTickerRef.current !== normalized) return;
      setApiDebugRows([
        ...[marketHistoryResult, issuedShareResult, utilizationResult, availabilityResult, marginsResult, shortScoreResult].map(result => result.debug),
        ...additionalDebugRows,
      ]);
      const historyRecords = tickerRecordsFromPayload<MarketPublicationRecord & DateSpecificRecord>(
        categoryPayload(marketHistoryResult.payload, 'market-history'),
        normalized,
      );
      setMarketHistory(historyRecords);
      const manualRows = manualRowsFromPayloads(
        normalized,
        {
          issuedShare: issuedShareResult.payload,
          utilization: utilizationResult.payload,
          availability: availabilityResult.payload,
          margins: marginsResult.payload,
          shortScore: shortScoreResult.payload,
        },
      );
      setRows(manualRows);
      setManualRowsByDate(Object.fromEntries(
        manualRows.map(record => [manualRowKey(normalized, record.tradeDate), record]),
      ));
      setStatus(preserveFeedback ? 'success' : 'idle');
    } catch (error) {
      if (loadGenerationRef.current !== loadGeneration || activeTickerRef.current !== normalized) return;
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to load Manual Input V2 records.');
    }
  }

  async function refreshSavedInputs() {
    const requestTicker = normalizeTicker(selectedTicker);
    const tickerParam = encodeURIComponent(requestTicker);
    const endpoints = [
      `/manual-input/issued-share?ticker=${tickerParam}`,
      `/manual-input/utilization?ticker=${tickerParam}`,
      `/manual-input/manual-availability?ticker=${tickerParam}`,
      `/manual-input/margins?ticker=${tickerParam}`,
      `/manual-input/short-score?ticker=${tickerParam}`,
    ];
    setHistoryRefreshing(true);
    setHistoryRefreshMessage('');
    const [issuedShareResult, utilizationResult, availabilityResult, marginsResult, shortScoreResult] = await Promise.all(
      endpoints.map(endpoint => loadApi(endpoint)),
    );
    const results = [issuedShareResult, utilizationResult, availabilityResult, marginsResult, shortScoreResult];
    setApiDebugRows(current => [
      ...current.filter(row => !endpoints.some(endpoint => row.endpoint === `GET ${endpoint}`)),
      ...results.map(result => result.debug),
    ]);

    if (results.some(result => result.debug.state.startsWith('error'))) {
      setHistoryRefreshMessage('Unable to refresh one or more Manual Input history APIs.');
      setHistoryRefreshing(false);
      return;
    }

    const manualRows = manualRowsFromPayloads(requestTicker, {
      issuedShare: issuedShareResult.payload,
      utilization: utilizationResult.payload,
      availability: availabilityResult.payload,
      margins: marginsResult.payload,
      shortScore: shortScoreResult.payload,
    });
    setRows(manualRows);
    setManualRowsByDate(Object.fromEntries(
      manualRows.map(record => [manualRowKey(requestTicker, record.tradeDate), record]),
    ));
    setHistoryPage(1);
    setHistoryRefreshMessage(`Refreshed ${manualRows.length.toLocaleString()} saved Manual Input dates.`);
    setHistoryRefreshing(false);
  }

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      try {
        const profile = await operationsProfile();
        const role = String(profile.role ?? '').trim().toUpperCase();
        if (!['OPERATOR', 'ADMIN'].includes(role)) {
          if (!cancelled) {
            setStatus('forbidden');
            setMessage('Market Data Intake is available only to operations users.');
          }
          return;
        }
        if (!cancelled) await loadRecords(getOperationsTicker());
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          setMessage(error instanceof Error ? error.message : 'Unable to verify operations access.');
        }
      }
    };
    void initialize();
    return () => {
      cancelled = true;
    };
    // Initial authenticated operations load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setForm(current => current.tradeDate ? current : { ...current, tradeDate: latestClosedUsMarketDate() });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formHasAnyData = useMemo(
    () => Object.entries(form).some(([key, value]) => key !== 'tradeDate' && Boolean(value.trim())),
    [form],
  );
  const previewCategories = useMemo(() => [
    numberOrUndefined(form.issuedShare) !== undefined ? 'Issued Share' : '',
    numberOrUndefined(form.utilizationPercent) !== undefined ? 'Utilization' : '',
    numberOrUndefined(form.availableSharesIbkr) !== undefined || numberOrUndefined(form.availableSharesFutu) !== undefined ? 'Availability' : '',
    numberOrUndefined(form.initialMarginIbkr) !== undefined || numberOrUndefined(form.initialMarginFutu) !== undefined || numberOrUndefined(form.maintenanceMarginIbkr) !== undefined || numberOrUndefined(form.maintenanceMarginFutu) !== undefined || numberOrUndefined(form.averageDurationDays) !== undefined ? 'Margins' : '',
    numberOrUndefined(form.shortScore) !== undefined ? 'Short Score' : '',
  ].filter(Boolean), [form]);
  const entryAvailability = useMemo(
    () => marketEntryAvailability(form.tradeDate, new Date(nowMs)),
    [form.tradeDate, nowMs],
  );
  const previewPublicationRows = useMemo(() => {
    if (!form.tradeDate) return rows as MarketPublicationRecord[];
    const saved = manualRowsByDate[manualRowKey(selectedTicker, form.tradeDate)];
    const hasSavedRecord = hasManualInputValues(saved);
    const useFormValues = !hasSavedRecord || editingDate === form.tradeDate;
    const preview: MarketPublicationRecord = useFormValues
      ? {
          ...saved,
          tradeDate: form.tradeDate,
          utilizationPercent: numberOrUndefined(form.utilizationPercent),
          availableSharesIbkr: numberOrUndefined(form.availableSharesIbkr),
          availableSharesFutu: numberOrUndefined(form.availableSharesFutu),
          initialMarginIbkr: percentInputToRatio(form.initialMarginIbkr),
          initialMarginFutu: percentInputToRatio(form.initialMarginFutu),
          maintenanceMarginIbkr: percentInputToRatio(form.maintenanceMarginIbkr),
          maintenanceMarginFutu: percentInputToRatio(form.maintenanceMarginFutu),
          averageDurationDays: numberOrUndefined(form.averageDurationDays),
        }
      : saved ?? { tradeDate: form.tradeDate };
    return [
      ...(rows as MarketPublicationRecord[]).filter(row => marketRecordDate(row) !== form.tradeDate),
      preview,
    ];
  }, [editingDate, form, manualRowsByDate, rows, selectedTicker]);
  const manualPublicationInputs = useMemo(() => ({
    utilization: previewPublicationRows,
    availability: previewPublicationRows,
    margins: previewPublicationRows,
  }), [previewPublicationRows]);
  const selectedReadinessRecord = useMemo(
    () => marketPublicationRecordForDate(marketHistory, manualPublicationInputs, form.tradeDate),
    [form.tradeDate, manualPublicationInputs, marketHistory],
  );
  const selectedReadiness = useMemo(() => marketPublicationFields(selectedReadinessRecord), [selectedReadinessRecord]);
  const selectedReadinessSummary = useMemo(() => {
    const borrowFee = selectedReadiness.find(field => field.key === 'borrowFeePercent');
    const shortableShares = selectedReadiness.find(field => field.key === 'availableShares');
    const daysToCover = selectedReadiness.find(field => field.key === 'daysToCover');
    const initialMargin = selectedReadiness.find(field => field.key === 'initialMargin');
    const maintenanceMargin = selectedReadiness.find(field => field.key === 'maintenanceMargin');
    const utilization = selectedReadiness.find(field => field.key === 'utilizationPercent');
    const averageDuration = selectedReadiness.find(field => field.key === 'averageDurationDays');

    function withLatestValue(
      field: (typeof selectedReadiness)[number] | undefined,
      historyKey: keyof MarketPublicationRecord,
      positiveOnly = false,
    ) {
      if (!field) return null;
      const exactValue = field.value !== null && (!positiveOnly || field.value > 0)
        ? field.value
        : null;
      const latest = exactValue === null
        ? latestMetricAtOrBefore(marketHistory, form.tradeDate, historyKey, positiveOnly)
        : null;
      return {
        ...field,
        value: exactValue ?? latest?.value ?? null,
        sourceDate: exactValue !== null ? form.tradeDate : latest?.date ?? '',
      };
    }

    return [
      withLatestValue(borrowFee, 'borrowFeePercent'),
      withLatestValue(initialMargin, 'initialMargin'),
      withLatestValue(maintenanceMargin, 'maintenanceMargin'),
      withLatestValue(shortableShares, 'availableShares'),
      withLatestValue(utilization, 'utilizationPercent'),
      withLatestValue(averageDuration, 'averageDurationDays', true),
      withLatestValue(daysToCover, 'daysToCover'),
    ].filter((field): field is NonNullable<typeof field> => Boolean(field));
  }, [form.tradeDate, marketHistory, selectedReadiness]);
  const selectedOutputReady = useMemo(
    () => selectedReadinessSummary.length > 0 && selectedReadinessSummary.every(field => field.value !== null),
    [selectedReadinessSummary],
  );
  const busy = ['checking', 'loading', 'saving', 'consolidating'].includes(status);
  const selectedSavedRecord = useMemo(() => {
    const exactManualRecord = manualRowsByDate[manualRowKey(selectedTicker, form.tradeDate)];
    return hasManualInputValues(exactManualRecord) ? exactManualRecord : undefined;
  }, [form.tradeDate, manualRowsByDate, selectedTicker]);
  const isEditingSavedRecord = Boolean(selectedSavedRecord && editingDate === form.tradeDate);
  const inputFieldsDisabled = !entryAvailability.isOpen || Boolean(selectedSavedRecord && !isEditingSavedRecord);
  const filteredHistoryRows = useMemo(
    () => rows.filter(record => (
      (!historyStartDate || record.tradeDate >= historyStartDate)
      && (!historyEndDate || record.tradeDate <= historyEndDate)
    )),
    [historyEndDate, historyStartDate, rows],
  );
  const historyPageCount = Math.max(1, Math.ceil(filteredHistoryRows.length / historyPageSize));
  const safeHistoryPage = Math.min(historyPage, historyPageCount);
  const visibleHistoryRows = useMemo(
    () => filteredHistoryRows.slice(
      (safeHistoryPage - 1) * historyPageSize,
      safeHistoryPage * historyPageSize,
    ),
    [filteredHistoryRows, safeHistoryPage],
  );

  function updateField(field: keyof FormState, value: string) {
    setForm(current => ({ ...current, [field]: value }));
  }

  function selectTradeDate(tradeDate: string) {
    const savedRecord = manualRowsByDate[manualRowKey(selectedTicker, tradeDate)];
    setForm(formFromDailyRecord(
      tradeDate,
      savedRecord,
      savedRecord?.issuedShare,
    ));
    setEditingDate('');
    setMessage('');
    setStatus('idle');
  }

  function editRecord(record: MarketInputRow) {
    const savedRecord = manualRowsByDate[manualRowKey(selectedTicker, record.tradeDate)] ?? record;
    setForm(formFromDailyRecord(record.tradeDate, savedRecord, savedRecord.issuedShare));
    setEditingDate(record.tradeDate);
    setMessage('');
    setStatus('idle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function beginEditingSelectedRecord() {
    if (!selectedSavedRecord) return;
    setForm(formFromDailyRecord(
      selectedSavedRecord.tradeDate,
      selectedSavedRecord,
      selectedSavedRecord.issuedShare,
    ));
    setEditingDate(selectedSavedRecord.tradeDate);
    setMessage('');
  }

  function cancelEditingSelectedRecord() {
    if (!selectedSavedRecord) return;
    setForm(formFromDailyRecord(
      selectedSavedRecord.tradeDate,
      selectedSavedRecord,
      selectedSavedRecord.issuedShare,
    ));
    setEditingDate('');
    setMessage('');
  }

  async function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.tradeDate || !formHasAnyData) return;
    if (selectedSavedRecord && !isEditingSavedRecord) return;
    if (!entryAvailability.isOpen) {
      setStatus('error');
      setMessage(entryAvailability.isTradingDay
        ? 'Inputs cannot be saved until the regular US market session has closed for this trade date.'
        : 'This date is not a regular US market trading day. Select a valid trading date.');
      return;
    }
    setStatus('saving');
    setMessage('');

    const tickerParam = encodeURIComponent(selectedTicker);
    const tradeDateParam = encodeURIComponent(form.tradeDate);
    const requests: NamedRequest[] = [];
    const issuedShare = numberOrUndefined(form.issuedShare);
    const utilizationPercent = numberOrUndefined(form.utilizationPercent);
    const availableSharesIbkr = numberOrUndefined(form.availableSharesIbkr);
    const availableSharesFutu = numberOrUndefined(form.availableSharesFutu);
    const initialMarginIbkr = percentInputToRatio(form.initialMarginIbkr);
    const initialMarginFutu = percentInputToRatio(form.initialMarginFutu);
    const maintenanceMarginIbkr = percentInputToRatio(form.maintenanceMarginIbkr);
    const maintenanceMarginFutu = percentInputToRatio(form.maintenanceMarginFutu);
    const averageDurationDays = numberOrUndefined(form.averageDurationDays);
    const shortScoreValue = numberOrUndefined(form.shortScore);
    const shortScore = shortScoreValue === undefined ? undefined : roundDecimal(shortScoreValue, 2);

    if (shortScore !== undefined && (shortScore < 0 || shortScore > 100)) {
      setStatus('error');
      setMessage('Short Score must be between 0 and 100.');
      return;
    }

    if (issuedShare !== undefined) {
      requests.push({
        label: 'Issued Share',
        request: saveManualInput(
          `/manual-input/issued-share?ticker=${tickerParam}&tradeDate=${tradeDateParam}`,
          { issuedShare },
        ),
      });
    }
    requests.push({
      label: 'Utilization',
      request: saveManualInput(
        `/manual-input/utilization?ticker=${tickerParam}&tradeDate=${tradeDateParam}`,
        { utilizationPercent: utilizationPercent ?? null },
      ),
    });
    requests.push({
      label: 'Shortable Shares',
      request: saveManualInput(
        `/manual-input/manual-availability?ticker=${tickerParam}&tradeDate=${tradeDateParam}`,
        {
          availableSharesIbkr: availableSharesIbkr ?? null,
          availableSharesFutu: availableSharesFutu ?? null,
        },
      ),
    });
    requests.push({
      label: 'Margins / Average Duration',
      request: saveManualInput(`/manual-input/margins?ticker=${tickerParam}&tradeDate=${tradeDateParam}`, {
        initialMarginIbkr: initialMarginIbkr ?? null,
        initialMarginFutu: initialMarginFutu ?? null,
        maintenanceMarginIbkr: maintenanceMarginIbkr ?? null,
        maintenanceMarginFutu: maintenanceMarginFutu ?? null,
        averageDurationDays: averageDurationDays ?? null,
        valueFormat: 'decimal_ratio',
        displayFormat: 'percent',
      }),
    });
    requests.push({
      label: 'Short Score',
      request: saveManualInput(
        `/manual-input/short-score?ticker=${tickerParam}&tradeDate=${tradeDateParam}`,
        { shortScore: shortScore ?? null },
      ),
    });

    try {
      await runNamedRequests('One or more market inputs could not be saved:', requests);
      const savedRecord: MarketInputRow = {
        ticker: selectedTicker,
        tradeDate: form.tradeDate,
        issuedShare,
        utilizationPercent,
        availableSharesIbkr,
        availableSharesFutu,
        initialMarginIbkr,
        initialMarginFutu,
        maintenanceMarginIbkr,
        maintenanceMarginFutu,
        averageDurationDays,
        shortScore,
      };

      const savedRowKey = manualRowKey(selectedTicker, form.tradeDate);
      setManualRowsByDate(current => ({ ...current, [savedRowKey]: savedRecord }));
      setRows(current => [
        ...current.filter(record => record.tradeDate !== form.tradeDate),
        savedRecord,
      ].sort((a, b) => b.tradeDate.localeCompare(a.tradeDate)));
      setEditingDate('');
      setStatus('success');
      setMessage(`Saved Manual Input data for ${form.tradeDate}. Run consolidation when all additions and deletions are complete.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to save Manual Input V2 records.');
    }
  }

  async function runConsolidation() {
    const requestTicker = normalizeTicker(selectedTicker);
    const tickerParam = encodeURIComponent(requestTicker);
    const consolidateEndpoint = `/manual-input/consolidate?ticker=${tickerParam}`;
    const verificationEndpoints = marketConsolidatedOutputEndpoints(requestTicker);
    setStatus('consolidating');
    setMessage(`Sending the consolidation request for ${requestTicker}...`);

    try {
      const baseline = await captureConsolidatedOutputs(verificationEndpoints);
      const consolidationPayload = await authenticatedFetch(consolidateEndpoint, {
        method: 'POST',
        body: JSON.stringify({ ticker: requestTicker }),
      });
      const consolidationDebug: OperationsDevelopmentDatum = {
        endpoint: `POST ${consolidateEndpoint}`,
        source: 'API Gateway',
        state: 'triggered manually',
        recordCount: payloadRecordCount(consolidationPayload),
        updatedAt: payloadGeneratedAt(consolidationPayload),
        payload: consolidationPayload,
      };
      setApiDebugRows(current => [
        ...current.filter(row => row.endpoint !== consolidationDebug.endpoint),
        consolidationDebug,
      ]);
      setMessage(`Consolidation was accepted for ${requestTicker}; waiting for published market output...`);
      const verification = await waitForConsolidatedOutputChange({
        endpoints: verificationEndpoints,
        baseline,
        onProgress: elapsedSeconds => {
          setMessage(`Still checking published market output for ${requestTicker} (${elapsedSeconds}s elapsed)...`);
        },
      });
      const verificationDebug: OperationsDevelopmentDatum = {
        endpoint: verificationEndpoints.join(' + '),
        source: 'Centralized Market Data API',
        state: verification.changed ? 'confirmed after manual consolidation' : 'unchanged after 5 minutes',
        recordCount: verification.latest.availableOutputs,
        updatedAt: verification.latest.checks.map(check => check.updatedAt).filter(Boolean).sort().at(-1),
        payload: verification.latest.checks,
      };
      await loadRecords(requestTicker, true, [consolidationDebug, verificationDebug]);
      if (verification.changed) {
        setStatus('success');
        setMessage(`Consolidated market output was confirmed for ${requestTicker}.`);
      } else if (verification.latest.availableOutputs === verification.latest.expectedOutputs) {
        setStatus('success');
        setMessage(`Consolidation was accepted for ${requestTicker}, but no payload change was detected within 5 minutes. The published output may already be current.`);
      } else {
        setStatus('error');
        setMessage(`One or more expected consolidated market outputs were unavailable after 5 minutes. Consolidation completion was not confirmed.`);
      }
    } catch (error) {
      const consolidationDebug: OperationsDevelopmentDatum = {
        endpoint: `POST ${consolidateEndpoint}`,
        source: 'API Gateway',
        state: error instanceof Error ? `error: ${error.message}` : 'error',
        payload: null,
      };
      setApiDebugRows(current => [
        ...current.filter(row => row.endpoint !== consolidationDebug.endpoint),
        consolidationDebug,
      ]);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to trigger consolidation.');
    }
  }

  async function deleteRecord(record: MarketInputRow) {
    if (!record.tradeDate) return;
    setDeletingDate(record.tradeDate);
    setStatus('saving');
    setMessage('');

    const requestTicker = normalizeTicker(selectedTicker);
    const tickerParam = encodeURIComponent(requestTicker);
    const tradeDateParam = encodeURIComponent(record.tradeDate);

    try {
      await runNamedRequests('One or more market inputs could not be deleted:', [
        { label: 'Issued Share', request: deleteManualInput(`/manual-input/issued-share?ticker=${tickerParam}&tradeDate=${tradeDateParam}`) },
        { label: 'Utilization', request: deleteManualInput(`/manual-input/utilization?ticker=${tickerParam}&tradeDate=${tradeDateParam}`) },
        { label: 'Shortable Shares', request: deleteManualInput(`/manual-input/manual-availability?ticker=${tickerParam}&tradeDate=${tradeDateParam}`) },
        { label: 'Margins / Average Duration', request: deleteManualInput(`/manual-input/margins?ticker=${tickerParam}&tradeDate=${tradeDateParam}`) },
        { label: 'Short Score', request: deleteManualInput(`/manual-input/short-score?ticker=${tickerParam}&tradeDate=${tradeDateParam}`) },
      ]);

      const deletedRowKey = manualRowKey(requestTicker, record.tradeDate);
      setManualRowsByDate(current => {
        const next = { ...current };
        delete next[deletedRowKey];
        return next;
      });
      setRows(current => current.filter(item => item.tradeDate !== record.tradeDate));
      if (form.tradeDate === record.tradeDate && activeTickerRef.current === requestTicker) {
        setForm(formFromDailyRecord(record.tradeDate, undefined, undefined));
        setEditingDate('');
      }
      setStatus('success');
      setMessage(`Deleted all Manual Input data for ${record.tradeDate}. Run consolidation when all additions and deletions are complete.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to delete Manual Input V2 records.');
    } finally {
      setDeletingDate('');
    }
  }

  if (status === 'forbidden') {
    return <section className="ops-panel ops-empty-panel"><h2>Operator access required</h2><p>{message}</p></section>;
  }

  return (
    <div className="ops-market-data-page">
      <div className="ops-market-data-grid">
      <div className="ops-market-entry-column">
      <section className="ops-panel">
        <div className="ops-panel-head">
          <div><span className="ops-eyebrow">Manual Input V2</span><h2>Daily Market Inputs</h2></div>
          <div className="ops-market-form-head-actions">
            {selectedSavedRecord ? (
              isEditingSavedRecord ? (
                <button className="ops-secondary-button" type="button" onClick={cancelEditingSelectedRecord} disabled={busy}>Cancel Edit</button>
              ) : (
                <button className="ops-secondary-button" type="button" onClick={beginEditingSelectedRecord} disabled={busy || !entryAvailability.isOpen}>Edit Record</button>
              )
            ) : null}
            <span className={`ops-status ${status === 'error' ? 'bad' : status === 'success' ? 'good' : ''}`}>{status}</span>
          </div>
        </div>
        <form className="ops-sec-form" onSubmit={saveRecord}>
          <div className="ops-form-grid three">
            <label>Trade Date<input type="date" value={form.tradeDate} onChange={event => selectTradeDate(event.target.value)} required suppressHydrationWarning /></label>
            <label>Issued Share<input inputMode="numeric" value={form.issuedShare} onChange={event => updateField('issuedShare', formatShareInput(event.target.value))} disabled={inputFieldsDisabled} suppressHydrationWarning /></label>
            <label>Short Score<input type="number" inputMode="decimal" min="0" max="100" step="0.01" value={form.shortScore} onChange={event => updateField('shortScore', event.target.value)} disabled={inputFieldsDisabled} suppressHydrationWarning /></label>
          </div>
          <div className="ops-broker-input-grid">
            <fieldset className="ops-broker-input-group">
              <legend><strong>IBKR</strong><span>Primary lending data</span></legend>
              <label>Utilization %<input inputMode="decimal" value={form.utilizationPercent} onChange={event => updateField('utilizationPercent', event.target.value)} disabled={inputFieldsDisabled} suppressHydrationWarning /></label>
              <label>Average Duration (Days)<input inputMode="decimal" value={form.averageDurationDays} onChange={event => updateField('averageDurationDays', event.target.value)} disabled={inputFieldsDisabled} suppressHydrationWarning /></label>
              <label>IBKR Shortable Shares<input inputMode="numeric" value={form.availableSharesIbkr} onChange={event => updateField('availableSharesIbkr', formatShareInput(event.target.value))} disabled={inputFieldsDisabled} suppressHydrationWarning /></label>
              <label>IBKR Initial Margin %<input inputMode="decimal" value={form.initialMarginIbkr} onChange={event => updateField('initialMarginIbkr', event.target.value)} disabled={inputFieldsDisabled} suppressHydrationWarning /></label>
              <label>IBKR Maintenance Margin %<input inputMode="decimal" value={form.maintenanceMarginIbkr} onChange={event => updateField('maintenanceMarginIbkr', event.target.value)} disabled={inputFieldsDisabled} suppressHydrationWarning /></label>
            </fieldset>
            <fieldset className="ops-broker-input-group">
              <legend><strong>Futu</strong><span>Secondary lending data</span></legend>
              <label>Futu Shortable Shares<input inputMode="numeric" value={form.availableSharesFutu} onChange={event => updateField('availableSharesFutu', formatShareInput(event.target.value))} disabled={inputFieldsDisabled} suppressHydrationWarning /></label>
              <label>Futu Initial Margin %<input inputMode="decimal" value={form.initialMarginFutu} onChange={event => updateField('initialMarginFutu', event.target.value)} disabled={inputFieldsDisabled} suppressHydrationWarning /></label>
              <label>Futu Maintenance Margin %<input inputMode="decimal" value={form.maintenanceMarginFutu} onChange={event => updateField('maintenanceMarginFutu', event.target.value)} disabled={inputFieldsDisabled} suppressHydrationWarning /></label>
            </fieldset>
          </div>
          <div className={`ops-market-entry-gate ${entryAvailability.isOpen ? 'is-open' : 'is-locked'}`}>
            <span className="ops-market-entry-icon" aria-hidden="true">
              {entryAvailability.isOpen ? (
                <svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10" /></svg>
              ) : (
                <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
              )}
            </span>
            <div>
              <strong>{entryAvailability.isOpen ? 'Market closed - input available' : entryAvailability.isTradingDay ? 'Input opens after market close' : 'No regular US market session'}</strong>
              <small>
                {entryAvailability.isOpen
                  ? 'This trade date is closed and values may be entered or updated.'
                  : entryAvailability.isTradingDay && entryAvailability.closeAt
                    ? `Available in ${formatMarketCountdown(entryAvailability.remainingMs)} at 4:00 PM New York time.`
                    : 'Weekends and US market holidays cannot receive daily market inputs.'}
              </small>
            </div>
          </div>
          <div className="ops-form-footer">
            <span>{selectedSavedRecord && !isEditingSavedRecord
              ? 'A record already exists for this trade date. Click Edit Record to make changes.'
              : !formHasAnyData
              ? 'Enter the required values to prepare this trade date.'
              : 'Save the Manual Input record first. Run consolidation separately after all additions and deletions are complete.'}</span>
            <div className="ops-form-actions">
              <button
                className="ops-secondary-button"
                type="button"
                disabled={busy}
                onClick={() => void runConsolidation()}
              >
                {status === 'consolidating' ? 'Consolidating...' : 'Run Consolidation'}
              </button>
              <button
                className="ops-primary-button"
                type="submit"
                disabled={!form.tradeDate || !formHasAnyData || !entryAvailability.isOpen || Boolean(selectedSavedRecord && !isEditingSavedRecord) || busy}
                aria-busy={status === 'saving'}
              >
                {status === 'saving' ? 'Saving...' : 'Save Data'}
              </button>
            </div>
          </div>
          {message ? <p className={`ops-form-message ${status === 'error' ? 'bad' : 'good'}`}>{message}</p> : null}
        </form>
      </section>

      <section className="ops-panel ops-market-readiness-panel">
        <div className="ops-panel-head">
          <div><span className="ops-eyebrow">Publication Readiness</span><h2>{form.tradeDate || 'Select a trade date'}</h2></div>
          <div className="ops-readiness-head-actions">
            <span className={`ops-status ${selectedOutputReady ? 'good' : ''}`}>{selectedOutputReady ? 'Available' : 'Partial'}</span>
            <button className="ops-secondary-button" type="button" onClick={() => loadRecords(selectedTicker, true)} disabled={busy}>Refresh</button>
          </div>
        </div>
        <div className="ops-readiness-list">
          {selectedReadinessSummary.map(field => {
            const complete = field.value !== null;
            return (
              <div className="ops-readiness-group" key={field.key}>
                <div className={complete ? 'ops-readiness-row is-complete' : 'ops-readiness-row is-missing'}>
                  <span className="ops-readiness-check" aria-hidden="true">
                    {complete
                      ? <svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10" /></svg>
                      : <svg viewBox="0 0 24 24"><path d="M12 7v6m0 4h.01" /><circle cx="12" cy="12" r="9" /></svg>}
                  </span>
                  <span>
                    <strong>{field.label}</strong>
                    <small>
                      {field.source}{field.sourceDate ? ` · Latest available: ${field.sourceDate}` : ''}
                    </small>
                  </span>
                  <b>
                    {complete ? formatReadinessValue(field) : 'Not available'}
                  </b>
                </div>
              </div>
            );
          })}
        </div>
        <p className="ops-readiness-note">
          Each dashboard metric uses its latest available value independently. Source dates may differ, and a missing metric does not hold back available metrics.
        </p>
      </section>
      </div>

      <aside className="ops-side-stack">
        <section className="ops-panel">
          <div className="ops-panel-head">
            <div><span className="ops-eyebrow">Preview</span><h2>Input Output</h2></div>
          </div>
          <dl className="ops-preview-list">
            <div><dt>Ticker</dt><dd>{selectedTicker}</dd></div>
            <div><dt>Trade date</dt><dd>{form.tradeDate || 'N/A'}</dd></div>
            <div><dt>Categories</dt><dd>{previewCategories.join(' / ') || 'No values entered'}</dd></div>
            <div><dt>Issued share</dt><dd>{formatNumber(numberOrUndefined(form.issuedShare))}</dd></div>
            <div><dt>Utilization</dt><dd>{formatPercent(numberOrUndefined(form.utilizationPercent))}</dd></div>
            <div><dt>Shortable shares</dt><dd>IBKR {formatNumber(numberOrUndefined(form.availableSharesIbkr))} · Futu {formatNumber(numberOrUndefined(form.availableSharesFutu))}</dd></div>
            <div><dt>Initial margin</dt><dd>IBKR {formatPercent(numberOrUndefined(form.initialMarginIbkr))} · Futu {formatPercent(numberOrUndefined(form.initialMarginFutu))}</dd></div>
            <div><dt>Maintenance margin</dt><dd>IBKR {formatPercent(numberOrUndefined(form.maintenanceMarginIbkr))} · Futu {formatPercent(numberOrUndefined(form.maintenanceMarginFutu))}</dd></div>
            <div><dt>Average duration</dt><dd>{formatDays(numberOrUndefined(form.averageDurationDays))}</dd></div>
            <div><dt>Short score</dt><dd>{formatDecimalFixed(numberOrUndefined(form.shortScore))}</dd></div>
          </dl>
        </section>
      </aside>
      </div>

      <section className="ops-panel ops-wide-panel">
        <div className="ops-panel-head">
          <div>
            <span className="ops-eyebrow">{dateSpecificCategories.join(' / ')}</span>
            <h2>Saved Daily Inputs</h2>
          </div>
          <div className="ops-market-form-head-actions">
            <span className="ops-record-count">{filteredHistoryRows.length.toLocaleString()} dates</span>
            <button
              className="ops-secondary-button"
              type="button"
              disabled={historyRefreshing}
              onClick={() => void refreshSavedInputs()}
            >
              {historyRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        <div className="ops-history-toolbar">
          <div className="ops-history-date-range" aria-label="Filter saved inputs by trade date">
            <label>
              <span>Start date</span>
              <input
                type="date"
                value={historyStartDate}
                max={historyEndDate || undefined}
                suppressHydrationWarning
                onChange={event => {
                  setHistoryStartDate(event.target.value);
                  setHistoryPage(1);
                }}
              />
            </label>
            <span className="ops-history-date-arrow" aria-hidden="true">to</span>
            <label>
              <span>End date</span>
              <input
                type="date"
                value={historyEndDate}
                min={historyStartDate || undefined}
                suppressHydrationWarning
                onChange={event => {
                  setHistoryEndDate(event.target.value);
                  setHistoryPage(1);
                }}
              />
            </label>
            <button
              className="ops-secondary-button"
              type="button"
              disabled={!historyStartDate && !historyEndDate}
              onClick={() => {
                setHistoryStartDate('');
                setHistoryEndDate('');
                setHistoryPage(1);
              }}
            >
              Clear
            </button>
          </div>
          <span>{historyRefreshMessage || '10 records per page'}</span>
        </div>
        <div className="ops-table-wrap">
          <table className="ops-table ops-market-table">
            <thead>
              <tr>
                <th>Trade Date</th>
                <th>Issued Share</th>
                <th>Utilization</th>
                <th>IBKR Shares</th>
                <th>Futu Shares</th>
                <th>IBKR Initial</th>
                <th>Futu Initial</th>
                <th>IBKR Maint.</th>
                <th>Futu Maint.</th>
                <th>Avg Duration</th>
                <th>Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleHistoryRows.map(record => {
                const manualRecord = manualRowsByDate[manualRowKey(selectedTicker, record.tradeDate)] ?? record;
                return (
                  <tr key={record.tradeDate}>
                    <td>{record.tradeDate}</td>
                    <td>{formatNumber(manualRecord.issuedShare)}</td>
                    <td>{formatPercentFixed(manualRecord.utilizationPercent)}</td>
                    <td>{formatNumber(manualRecord.availableSharesIbkr)}</td>
                    <td>{formatNumber(manualRecord.availableSharesFutu)}</td>
                    <td>{formatPercentFromRatio(manualRecord.initialMarginIbkr)}</td>
                    <td>{formatPercentFromRatio(manualRecord.initialMarginFutu)}</td>
                    <td>{formatPercentFromRatio(manualRecord.maintenanceMarginIbkr)}</td>
                    <td>{formatPercentFromRatio(manualRecord.maintenanceMarginFutu)}</td>
                    <td>{formatDays(manualRecord.averageDurationDays, 2, 2)}</td>
                    <td>{formatDecimalFixed(manualRecord.shortScore)}</td>
                    <td>
                      <div className="ops-row-actions">
                        <button className="ops-secondary-button" type="button" onClick={() => editRecord(record)}>Edit</button>
                        <button
                          className="ops-danger-button"
                          type="button"
                          disabled={deletingDate === record.tradeDate || busy}
                          onClick={() => deleteRecord(record)}
                        >
                          {deletingDate === record.tradeDate ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visibleHistoryRows.length && <tr><td colSpan={12}>{busy ? 'Loading saved manual inputs...' : 'No saved inputs match the selected date range.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="ops-pagination" aria-label="Saved daily inputs pagination">
          <button type="button" disabled={safeHistoryPage <= 1} onClick={() => setHistoryPage(1)}>First</button>
          <button type="button" disabled={safeHistoryPage <= 1} onClick={() => setHistoryPage(page => Math.max(1, page - 1))}>Previous</button>
          <span>Page {safeHistoryPage} of {historyPageCount}</span>
          <button type="button" disabled={safeHistoryPage >= historyPageCount} onClick={() => setHistoryPage(page => Math.min(historyPageCount, page + 1))}>Next</button>
          <button type="button" disabled={safeHistoryPage >= historyPageCount} onClick={() => setHistoryPage(historyPageCount)}>Last</button>
        </div>
      </section>

      <OperationsDevelopmentData
        title="Manual Input V2 API Responses"
        description="Exact authenticated endpoints and response state used by this page. No local JSON fallback is used here."
        rows={apiDebugRows}
      />
    </div>
  );
}
