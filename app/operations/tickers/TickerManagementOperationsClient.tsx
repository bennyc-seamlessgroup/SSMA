'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { OperationsDevelopmentData, type OperationsDevelopmentDatum } from '@/components/OperationsDevelopmentData';
import { authenticatedFetch, getAuthenticatedProfile } from '@/lib/auth-client';
import { setOperationsTicker } from '@/lib/operations/ticker-client';

type TickerStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED';
type RequestState = 'idle' | 'loading' | 'saving' | 'error' | 'success';
type ConsolidationState = 'idle' | 'consolidating' | 'error' | 'success';
type PipelineStatus = 'idle' | 'loading' | 'available' | 'in_progress' | 'error';
type Vendor = 'chartexchange' | 'massive' | 'fintel';

type CompanyHistoryStatus = {
  ticker: string;
  companyName: string;
  registryStatus: TickerStatus;
  status: PipelineStatus;
  lockAgeSeconds: number | null;
  checkedAt: string;
  payload: unknown;
};

type TickerRecord = {
  ticker: string;
  companyName: string;
  status: TickerStatus;
  effectiveDate: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

type TickerListEnvelope = {
  tickers?: unknown[];
  data?: unknown[] | { tickers?: unknown[] };
  count?: number;
  nextToken?: string | null;
  next_token?: string | null;
};

const tickerPattern = /^[A-Z0-9.-]+$/;
const allVendors: Vendor[] = ['chartexchange', 'massive', 'fintel'];

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDate(date);
}

function normalizeStatus(value: unknown): TickerStatus {
  const normalized = String(value ?? '').toUpperCase();
  if (normalized === 'DELETED') return 'DELETED';
  if (normalized === 'INACTIVE') return 'INACTIVE';
  return 'ACTIVE';
}

function normalizeTickerRecord(value: unknown): TickerRecord {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    ticker: String(input.ticker ?? '').trim().toUpperCase(),
    companyName: String(input.companyName ?? '').trim(),
    status: normalizeStatus(input.status),
    effectiveDate: String(input.effectiveDate ?? '').trim(),
    createdBy: String(input.createdBy ?? '').trim(),
    updatedBy: String(input.updatedBy ?? '').trim(),
    createdAt: String(input.createdAt ?? '').trim(),
    updatedAt: String(input.updatedAt ?? '').trim(),
  };
}

function normalizeTickerList(payload: unknown) {
  if (Array.isArray(payload)) {
    return { records: payload.map(normalizeTickerRecord), count: payload.length, nextToken: null as string | null };
  }
  const envelope = payload && typeof payload === 'object' ? payload as TickerListEnvelope : {};
  const nestedData = envelope.data && !Array.isArray(envelope.data) ? envelope.data : undefined;
  const rows = Array.isArray(envelope.tickers)
    ? envelope.tickers
    : Array.isArray(envelope.data)
      ? envelope.data
      : Array.isArray(nestedData?.tickers)
        ? nestedData.tickers
        : [];
  const nextToken = envelope.nextToken ?? envelope.next_token ?? null;
  return {
    records: rows.map(normalizeTickerRecord).filter(record => record.ticker),
    count: Number.isFinite(Number(envelope.count)) ? Number(envelope.count) : rows.length,
    nextToken: nextToken ? String(nextToken) : null,
  };
}

function formatDateTime(value: string) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function dateRangeDays(fromDate: string, toDate: string) {
  const start = Date.parse(`${fromDate}T00:00:00Z`);
  const end = Date.parse(`${toDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return NaN;
  return Math.floor((end - start) / 86_400_000) + 1;
}

function normalizePipelineStatus(payload: unknown, pipelineName: string) {
  const root = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const data = root.data && typeof root.data === 'object' ? root.data as Record<string, unknown> : {};
  const status = String(root.status ?? data.status ?? '').trim().toUpperCase();
  const lockAgeValue = root.lock_age_seconds ?? data.lock_age_seconds;
  const lockAgeSeconds = Number.isFinite(Number(lockAgeValue)) ? Math.max(0, Number(lockAgeValue)) : null;
  if (status !== 'AVAILABLE' && status !== 'IN_PROGRESS') {
    throw new Error(`${pipelineName} status returned an unsupported response.`);
  }
  return {
    status: status === 'IN_PROGRESS' ? 'in_progress' as const : 'available' as const,
    lockAgeSeconds,
  };
}

function formatElapsedSeconds(value: number | null) {
  if (value === null) return '';
  const seconds = Math.floor(value);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes ? `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s` : `${remainingSeconds}s`;
}

function pipelineStatusText(label: string, status: PipelineStatus, lockAgeSeconds: number | null) {
  if (status === 'loading') return `${label} · Checking`;
  if (status === 'in_progress') {
    const elapsed = formatElapsedSeconds(lockAgeSeconds);
    return `${label} · Running${elapsed ? ` ${elapsed}` : ''}`;
  }
  if (status === 'available') return `${label} · Ready`;
  if (status === 'error') return `${label} · Unavailable`;
  return `${label} · Select ticker`;
}

function companyHistoryStatusLabel(status: PipelineStatus, lockAgeSeconds: number | null) {
  if (status === 'loading') return 'Checking';
  if (status === 'in_progress') {
    const elapsed = formatElapsedSeconds(lockAgeSeconds);
    return `Running${elapsed ? ` · ${elapsed}` : ''}`;
  }
  if (status === 'available') return 'Ready';
  if (status === 'error') return 'Unavailable';
  return 'Not checked';
}

function companyHistoryStatusPriority(status: PipelineStatus) {
  if (status === 'in_progress') return 0;
  if (status === 'error') return 1;
  if (status === 'loading' || status === 'idle') return 2;
  return 3;
}

function consolidationFeedback(
  ticker: string,
  requestState: ConsolidationState,
  pipelineStatus: PipelineStatus,
  fallbackMessage: string,
  statusError: string,
) {
  if (requestState === 'error') return fallbackMessage;
  if (requestState !== 'success') return fallbackMessage;
  if (pipelineStatus === 'in_progress') {
    if (statusError) {
      return `Consolidation was accepted for ${ticker}, but the latest status check failed. ${statusError} Retrying automatically.`;
    }
    return `Consolidation is running for ${ticker}. Status updates automatically.`;
  }
  if (pipelineStatus === 'available') {
    return `Consolidation is no longer running for ${ticker}. Refresh affected portal data to confirm the latest values.`;
  }
  if (pipelineStatus === 'error') {
    return `The consolidation request for ${ticker} was accepted, but its current status could not be checked. The page will retry automatically.`;
  }
  return fallbackMessage;
}

function statusPayloadError(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';
  const value = (payload as Record<string, unknown>).error;
  return typeof value === 'string' ? value.trim() : '';
}

function historicalFeedback(
  ticker: string,
  requestState: RequestState,
  pipelineStatus: PipelineStatus,
  fallbackMessage: string,
  statusError: string,
) {
  if (requestState === 'error') return fallbackMessage;
  if (pipelineStatus === 'error') {
    const prefix = requestState === 'success'
      ? `Historical initialization was accepted for ${ticker}, but its current status could not be checked.`
      : `Historical initialization status could not be checked for ${ticker}.`;
    return `${prefix}${statusError ? ` ${statusError}` : ''} The page will retry automatically.`;
  }
  if (requestState !== 'success') return fallbackMessage;
  if (pipelineStatus === 'in_progress') {
    if (statusError) {
      return `Historical initialization was accepted for ${ticker}, but the latest status check failed. ${statusError} Retrying automatically.`;
    }
    return `Historical initialization is running for ${ticker}. Status updates automatically.`;
  }
  if (pipelineStatus === 'available') {
    return `Historical initialization is no longer running for ${ticker}. You can now run consolidation.`;
  }
  return fallbackMessage;
}

export function TickerManagementOperationsClient() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [records, setRecords] = useState<TickerRecord[]>([]);
  const [lastListEndpoint, setLastListEndpoint] = useState('GET /tickers');
  const [listPayload, setListPayload] = useState<unknown>();
  const [detailPayload, setDetailPayload] = useState<unknown>();
  const [actionPayload, setActionPayload] = useState<unknown>();
  const [historicalPayload, setHistoricalPayload] = useState<unknown>();
  const [historicalStatusPayload, setHistoricalStatusPayload] = useState<unknown>();
  const [consolidationPayload, setConsolidationPayload] = useState<unknown>();
  const [consolidationStatusPayload, setConsolidationStatusPayload] = useState<unknown>();
  const [listState, setListState] = useState<RequestState>('loading');
  const [actionState, setActionState] = useState<RequestState>('idle');
  const [historicalState, setHistoricalState] = useState<RequestState>('idle');
  const [historicalInitStatus, setHistoricalInitStatus] = useState<PipelineStatus>('idle');
  const [historicalLockAgeSeconds, setHistoricalLockAgeSeconds] = useState<number | null>(null);
  const [historicalInitAcceptedTicker, setHistoricalInitAcceptedTicker] = useState('');
  const [consolidationStatus, setConsolidationStatus] = useState<PipelineStatus>('idle');
  const [consolidationLockAgeSeconds, setConsolidationLockAgeSeconds] = useState<number | null>(null);
  const [consolidationState, setConsolidationState] = useState<ConsolidationState>('idle');
  const [companyHistoryStatuses, setCompanyHistoryStatuses] = useState<CompanyHistoryStatus[]>([]);
  const [companyHistoryState, setCompanyHistoryState] = useState<RequestState>('loading');
  const [companyHistoryUpdatedAt, setCompanyHistoryUpdatedAt] = useState('');
  const [companyHistoryPayload, setCompanyHistoryPayload] = useState<unknown>();
  const [message, setMessage] = useState('');
  const [historicalMessage, setHistoricalMessage] = useState('');
  const [consolidationMessage, setConsolidationMessage] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [limit, setLimit] = useState(25);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [previousTokens, setPreviousTokens] = useState<Array<string | null>>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [reportedCount, setReportedCount] = useState(0);

  const [createTicker, setCreateTicker] = useState('');
  const [createCompanyName, setCreateCompanyName] = useState('');
  const [createStatus, setCreateStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [createEffectiveDate, setCreateEffectiveDate] = useState(localDate());

  const [selectedTicker, setSelectedTicker] = useState<TickerRecord | null>(null);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editEffectiveDate, setEditEffectiveDate] = useState('');
  const [detailState, setDetailState] = useState<RequestState>('idle');

  const [historicalTicker, setHistoricalTicker] = useState('');
  const [fromDate, setFromDate] = useState(daysAgo(29));
  const [toDate, setToDate] = useState(localDate());
  const [vendors, setVendors] = useState<Vendor[]>(allVendors);

  const today = localDate();
  const historicalDays = dateRangeDays(fromDate, toDate);
  const allCompanyHistoryReady = companyHistoryState === 'idle'
    && companyHistoryStatuses.length > 0
    && companyHistoryStatuses.every(item => item.status === 'available');

  const loadHistoricalInitStatus = useCallback(async (tickerInput: string, silent = false) => {
    const ticker = tickerInput.trim().toUpperCase();
    if (!tickerPattern.test(ticker)) {
      setHistoricalInitStatus('idle');
      setHistoricalLockAgeSeconds(null);
      setHistoricalStatusPayload(undefined);
      return null;
    }
    if (!silent) setHistoricalInitStatus('loading');
    const endpoint = `/tickers/historical-init/status?ticker=${encodeURIComponent(ticker)}`;
    try {
      const payload = await authenticatedFetch(endpoint, { cache: 'no-store' });
      const normalized = normalizePipelineStatus(payload, 'Historical initialization');
      setHistoricalStatusPayload(payload);
      setHistoricalInitStatus(normalized.status);
      setHistoricalLockAgeSeconds(normalized.lockAgeSeconds);
      setCompanyHistoryStatuses(current => current.map(item => item.ticker === ticker
        ? { ...item, status: normalized.status, lockAgeSeconds: normalized.lockAgeSeconds, checkedAt: new Date().toISOString(), payload }
        : item));
      return normalized;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unable to load historical initialization status.';
      setHistoricalStatusPayload({ ticker, error: reason });
      setHistoricalInitStatus('error');
      setHistoricalLockAgeSeconds(null);
      setCompanyHistoryStatuses(current => current.map(item => item.ticker === ticker
        ? { ...item, status: 'error', lockAgeSeconds: null, checkedAt: new Date().toISOString(), payload: { ticker, error: reason } }
        : item));
      return null;
    }
  }, []);

  const loadAllCompanyHistoryStatuses = useCallback(async (silent = false) => {
    if (!silent) setCompanyHistoryState('loading');
    try {
      const managedRecords: TickerRecord[] = [];
      const tickerListPayloads: unknown[] = [];
      let nextPageToken: string | null = null;
      let pageGuard = 0;
      do {
        const params = new URLSearchParams({ includeDeleted: 'false', limit: '100' });
        if (nextPageToken) params.set('nextToken', nextPageToken);
        const payload = await authenticatedFetch(`/tickers?${params.toString()}`, { cache: 'no-store' });
        const normalized = normalizeTickerList(payload);
        tickerListPayloads.push(payload);
        managedRecords.push(...normalized.records.filter(record => record.status !== 'DELETED'));
        nextPageToken = normalized.nextToken;
        pageGuard += 1;
      } while (nextPageToken && pageGuard < 50);

      const uniqueRecords = [...new Map(managedRecords.map(record => [record.ticker, record])).values()];
      const checkedAt = new Date().toISOString();
      const statuses = await Promise.all(uniqueRecords.map(async record => {
        const endpoint = `/tickers/historical-init/status?ticker=${encodeURIComponent(record.ticker)}`;
        try {
          const payload = await authenticatedFetch(endpoint, { cache: 'no-store' });
          const normalized = normalizePipelineStatus(payload, 'Historical initialization');
          return {
            ticker: record.ticker,
            companyName: record.companyName,
            registryStatus: record.status,
            status: normalized.status,
            lockAgeSeconds: normalized.lockAgeSeconds,
            checkedAt,
            payload,
          } satisfies CompanyHistoryStatus;
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'Unable to load historical initialization status.';
          return {
            ticker: record.ticker,
            companyName: record.companyName,
            registryStatus: record.status,
            status: 'error',
            lockAgeSeconds: null,
            checkedAt,
            payload: { ticker: record.ticker, error: reason },
          } satisfies CompanyHistoryStatus;
        }
      }));

      setCompanyHistoryStatuses(statuses);
      setCompanyHistoryPayload({ tickerRegistry: tickerListPayloads, statuses });
      setCompanyHistoryUpdatedAt(checkedAt);
      setCompanyHistoryState('idle');
    } catch (error) {
      setCompanyHistoryState('error');
      setCompanyHistoryPayload({ error: error instanceof Error ? error.message : 'Unable to load company history statuses.' });
      if (!silent) setCompanyHistoryStatuses([]);
    }
  }, []);

  const loadConsolidationStatus = useCallback(async (tickerInput: string, silent = false) => {
    const ticker = tickerInput.trim().toUpperCase();
    if (!tickerPattern.test(ticker)) {
      setConsolidationStatus('idle');
      setConsolidationLockAgeSeconds(null);
      setConsolidationStatusPayload(undefined);
      return null;
    }
    if (!silent) setConsolidationStatus('loading');
    const endpoint = `/manual-input/consolidate/status?ticker=${encodeURIComponent(ticker)}`;
    try {
      const payload = await authenticatedFetch(endpoint, { cache: 'no-store' });
      const normalized = normalizePipelineStatus(payload, 'Consolidation');
      setConsolidationStatusPayload(payload);
      setConsolidationStatus(normalized.status);
      setConsolidationLockAgeSeconds(normalized.lockAgeSeconds);
      return normalized;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unable to load consolidation status.';
      setConsolidationStatusPayload({ ticker, error: reason });
      setConsolidationStatus('error');
      setConsolidationLockAgeSeconds(null);
      return null;
    }
  }, []);

  function populateEditor(record: TickerRecord) {
    setSelectedTicker(record);
    setEditCompanyName(record.companyName);
    setEditStatus(record.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE');
    setEditEffectiveDate(record.effectiveDate);
    setHistoricalTicker(record.ticker);
  }

  async function loadTickers(
    token: string | null = currentToken,
    targetPage = pageNumber,
    filters = { search, statusFilter, includeDeleted, limit },
  ) {
    setListState('loading');
    setMessage('');
    const params = new URLSearchParams({ includeDeleted: String(filters.includeDeleted), limit: String(filters.limit) });
    if (filters.search.trim()) params.set('q', filters.search.trim());
    if (filters.statusFilter) params.set('status', filters.statusFilter);
    if (token) params.set('nextToken', token);
    const endpoint = `/tickers?${params.toString()}`;
    setLastListEndpoint(`GET ${endpoint}`);
    try {
      const payload = await authenticatedFetch(endpoint, { cache: 'no-store' });
      const normalized = normalizeTickerList(payload);
      setRecords(normalized.records);
      setReportedCount(normalized.count);
      setNextToken(normalized.nextToken);
      setCurrentToken(token);
      setPageNumber(targetPage);
      setListPayload(payload);
      setListState('idle');
      return true;
    } catch (error) {
      setListState('error');
      setMessage(error instanceof Error ? error.message : 'Unable to load managed tickers.');
      return false;
    }
  }

  useEffect(() => {
    let cancelled = false;
    getAuthenticatedProfile()
      .then(async profile => {
        if (cancelled) return;
        const isOperator = String(profile.role ?? '').trim().toUpperCase() === 'OPERATOR';
        setAuthorized(isOperator);
        if (!isOperator) {
          setListState('idle');
          setMessage('Ticker Management is available only to operations users.');
          return;
        }
        await Promise.all([
          loadTickers(null, 1),
          loadAllCompanyHistoryStatuses(),
        ]);
      })
      .catch(error => {
        if (cancelled) return;
        setAuthorized(false);
        setListState('error');
        setMessage(error instanceof Error ? error.message : 'Unable to verify operator access.');
      });
    return () => { cancelled = true; };
    // Initial operator workspace load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authorized !== true || !companyHistoryStatuses.some(item => item.status === 'in_progress')) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadAllCompanyHistoryStatuses(true);
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [authorized, companyHistoryStatuses, loadAllCompanyHistoryStatuses]);

  useEffect(() => {
    if (authorized !== true) return;
    const ticker = historicalTicker.trim().toUpperCase();
    setHistoricalInitAcceptedTicker(current => current === ticker ? current : '');
    setHistoricalState('idle');
    setHistoricalMessage('');
    setConsolidationState('idle');
    setConsolidationMessage('');
    if (!tickerPattern.test(ticker)) {
      setHistoricalInitStatus('idle');
      setHistoricalLockAgeSeconds(null);
      setHistoricalStatusPayload(undefined);
      setConsolidationStatus('idle');
      setConsolidationLockAgeSeconds(null);
      setConsolidationStatusPayload(undefined);
      return;
    }
    const timer = window.setTimeout(() => {
      void Promise.all([
        loadHistoricalInitStatus(ticker),
        loadConsolidationStatus(ticker),
      ]);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [authorized, historicalTicker, loadConsolidationStatus, loadHistoricalInitStatus]);

  useEffect(() => {
    if (authorized !== true || (historicalInitStatus !== 'in_progress' && historicalInitStatus !== 'error')) return;
    const ticker = historicalTicker.trim().toUpperCase();
    if (!tickerPattern.test(ticker)) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadHistoricalInitStatus(ticker, true);
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [authorized, historicalInitStatus, historicalTicker, loadHistoricalInitStatus]);

  useEffect(() => {
    if (authorized !== true || (consolidationStatus !== 'in_progress' && consolidationStatus !== 'error')) return;
    const ticker = historicalTicker.trim().toUpperCase();
    if (!tickerPattern.test(ticker)) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadConsolidationStatus(ticker, true);
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [authorized, consolidationStatus, historicalTicker, loadConsolidationStatus]);

  async function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreviousTokens([]);
    setCurrentToken(null);
    setPageNumber(1);
    await loadTickers(null, 1);
  }

  async function resetFilters() {
    setSearch('');
    setStatusFilter('');
    setIncludeDeleted(false);
    setLimit(25);
    setPreviousTokens([]);
    setCurrentToken(null);
    setPageNumber(1);
    await loadTickers(null, 1, { search: '', statusFilter: '', includeDeleted: false, limit: 25 });
  }

  async function nextPage() {
    if (!nextToken || listState === 'loading') return;
    const priorToken = currentToken;
    const loaded = await loadTickers(nextToken, pageNumber + 1);
    if (loaded) setPreviousTokens(tokens => [...tokens, priorToken]);
  }

  async function previousPage() {
    if (!previousTokens.length || listState === 'loading') return;
    const token = previousTokens[previousTokens.length - 1] ?? null;
    const loaded = await loadTickers(token, Math.max(1, pageNumber - 1));
    if (loaded) setPreviousTokens(tokens => tokens.slice(0, -1));
  }

  async function createRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ticker = createTicker.trim().toUpperCase();
    const companyName = createCompanyName.trim();
    if (!tickerPattern.test(ticker)) {
      setActionState('error');
      setMessage('Ticker must use only letters, numbers, dots, or hyphens.');
      return;
    }
    if (!companyName || !createEffectiveDate) {
      setActionState('error');
      setMessage('Company name and effective date are required.');
      return;
    }
    setActionState('saving');
    setMessage('Creating ticker...');
    try {
      const payload = await authenticatedFetch('/tickers', {
        method: 'POST',
        body: JSON.stringify({ ticker, companyName, status: createStatus, effectiveDate: createEffectiveDate }),
      });
      const record = normalizeTickerRecord(payload);
      setActionPayload(payload);
      setCreateTicker('');
      setCreateCompanyName('');
      setCreateStatus('ACTIVE');
      setCreateEffectiveDate(localDate());
      populateEditor(record);
      setDetailPayload(payload);
      setPreviousTokens([]);
      await loadTickers(null, 1);
      void loadAllCompanyHistoryStatuses(true);
      setActionState('success');
      setMessage(`${ticker} was created successfully.`);
    } catch (error) {
      setActionState('error');
      setMessage(error instanceof Error ? error.message : 'Unable to create ticker.');
    }
  }

  async function openTicker(ticker: string) {
    setDetailState('loading');
    setMessage('');
    try {
      const payload = await authenticatedFetch(`/tickers/${encodeURIComponent(ticker)}`, { cache: 'no-store' });
      const record = normalizeTickerRecord(payload);
      setDetailPayload(payload);
      populateEditor(record);
      setDetailState('idle');
      if (!record.companyName) setMessage(`${record.ticker} is not registered in the managed ticker table.`);
    } catch (error) {
      setDetailState('error');
      setMessage(error instanceof Error ? error.message : `Unable to load ${ticker}.`);
    }
  }

  async function updateRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicker) return;
    if (!editCompanyName.trim() || !editEffectiveDate) {
      setActionState('error');
      setMessage('Company name and effective date are required.');
      return;
    }
    setActionState('saving');
    setMessage(`Updating ${selectedTicker.ticker}...`);
    try {
      const payload = await authenticatedFetch(`/tickers/${encodeURIComponent(selectedTicker.ticker)}`, {
        method: 'PUT',
        body: JSON.stringify({
          companyName: editCompanyName.trim(),
          status: editStatus,
          effectiveDate: editEffectiveDate,
        }),
      });
      const record = normalizeTickerRecord(payload);
      setActionPayload(payload);
      setDetailPayload(payload);
      populateEditor(record);
      await loadTickers(currentToken, pageNumber);
      void loadAllCompanyHistoryStatuses(true);
      setActionState('success');
      setMessage(`${record.ticker} was updated successfully.`);
    } catch (error) {
      setActionState('error');
      setMessage(error instanceof Error ? error.message : `Unable to update ${selectedTicker.ticker}.`);
    }
  }

  async function deleteRecord() {
    if (!selectedTicker || selectedTicker.status === 'DELETED') return;
    const confirmed = window.confirm(`Soft delete ${selectedTicker.ticker}? It will be removed from your operator ticker list.`);
    if (!confirmed) return;
    setActionState('saving');
    setMessage(`Soft deleting ${selectedTicker.ticker}...`);
    try {
      const payload = await authenticatedFetch(`/tickers/${encodeURIComponent(selectedTicker.ticker)}`, { method: 'DELETE' });
      const returned = payload && typeof payload === 'object' && 'ticker' in payload
        ? (payload as { ticker?: unknown }).ticker
        : payload;
      const record = normalizeTickerRecord(returned);
      setActionPayload(payload);
      setDetailPayload(payload);
      populateEditor(record.ticker ? record : { ...selectedTicker, status: 'DELETED' });
      await loadTickers(currentToken, pageNumber);
      void loadAllCompanyHistoryStatuses(true);
      setActionState('success');
      setMessage(`${selectedTicker.ticker} was soft deleted.`);
    } catch (error) {
      setActionState('error');
      setMessage(error instanceof Error ? error.message : `Unable to delete ${selectedTicker.ticker}.`);
    }
  }

  function toggleVendor(vendor: Vendor) {
    setVendors(current => current.includes(vendor)
      ? current.filter(item => item !== vendor)
      : [...current, vendor]);
  }

  async function runHistoricalInit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ticker = historicalTicker.trim().toUpperCase();
    const days = dateRangeDays(fromDate, toDate);
    if (!tickerPattern.test(ticker)) {
      setHistoricalState('error');
      setHistoricalMessage('Enter a valid ticker before starting historical initialization.');
      return;
    }
    if (!fromDate || !toDate || fromDate > toDate) {
      setHistoricalState('error');
      setHistoricalMessage('From date must be on or before the to date.');
      return;
    }
    if (toDate > today) {
      setHistoricalState('error');
      setHistoricalMessage('The historical initialization end date cannot be in the future.');
      return;
    }
    if (!Number.isFinite(days) || days > 180) {
      setHistoricalState('error');
      setHistoricalMessage('Historical initialization is limited to 180 calendar days per request.');
      return;
    }
    if (!vendors.length) {
      setHistoricalState('error');
      setHistoricalMessage('Select at least one data vendor.');
      return;
    }
    if (!window.confirm(`Start historical initialization for ${ticker} from ${fromDate} to ${toDate}?`)) return;

    setConsolidationState('idle');
    setConsolidationMessage('');
    setHistoricalState('saving');
    setHistoricalMessage('Starting historical initialization...');
    try {
      const payload = await authenticatedFetch('/tickers/historical-init', {
        method: 'POST',
        body: JSON.stringify({ ticker, from_date: fromDate, to_date: toDate, vendors, dry_run: false }),
      });
      setHistoricalPayload(payload);
      setHistoricalState('success');
      setHistoricalInitAcceptedTicker(ticker);
      setHistoricalStatusPayload(undefined);
      setHistoricalInitStatus('in_progress');
      setHistoricalLockAgeSeconds(0);
      setCompanyHistoryStatuses(current => current.map(item => item.ticker === ticker
        ? { ...item, status: 'in_progress', lockAgeSeconds: 0, checkedAt: new Date().toISOString(), payload }
        : item));
      setHistoricalMessage(`Historical initialization was accepted for ${ticker}. Processing continues asynchronously.`);
      void loadHistoricalInitStatus(ticker, true);
    } catch (error) {
      setHistoricalState('error');
      setHistoricalMessage(error instanceof Error ? error.message : 'Unable to start historical initialization.');
      void loadHistoricalInitStatus(ticker, true);
    }
  }

  async function runConsolidation() {
    const ticker = historicalTicker.trim().toUpperCase();
    if (!tickerPattern.test(ticker)) {
      setConsolidationState('error');
      setConsolidationMessage('Enter a valid ticker before running consolidation.');
      return;
    }
    if (!allCompanyHistoryReady && historicalInitAcceptedTicker !== ticker) {
      setConsolidationState('error');
      setConsolidationMessage(`Start historical initialization for ${ticker} before running consolidation.`);
      return;
    }

    const endpoint = `/manual-input/consolidate?ticker=${encodeURIComponent(ticker)}`;
    const request = { ticker };
    setHistoricalState('idle');
    setHistoricalMessage('');
    setConsolidationState('consolidating');
    setConsolidationMessage(`Preparing to consolidate ${ticker}...`);

    try {
      const response = await authenticatedFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      setConsolidationPayload({
        request,
        response,
        state: 'accepted; status tracked by consolidation status API',
      });
      setConsolidationState('success');
      setConsolidationStatusPayload(undefined);
      setConsolidationStatus('in_progress');
      setConsolidationLockAgeSeconds(0);
      setConsolidationMessage(`Consolidation was accepted for ${ticker}. Status is checked automatically.`);
      void loadConsolidationStatus(ticker, true);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unable to trigger consolidation.';
      setConsolidationPayload({ request, error: reason, state: 'error' });
      setConsolidationState('error');
      setConsolidationMessage(reason);
      void loadConsolidationStatus(ticker, true);
    }
  }

  function openWorkspace(record: TickerRecord) {
    setOperationsTicker(record.ticker);
    window.location.assign(`/operations/market-data?ticker=${encodeURIComponent(record.ticker)}`);
  }

  const developmentRows: OperationsDevelopmentDatum[] = [
    {
      endpoint: lastListEndpoint,
      source: 'Ticker Registry API',
      state: listState,
      recordCount: records.length,
      payload: listPayload ?? { state: listState, message },
    },
    {
      endpoint: selectedTicker ? `GET /tickers/${selectedTicker.ticker}` : 'GET /tickers/{ticker}',
      source: 'Ticker Registry API',
      state: detailState,
      recordCount: detailPayload ? 1 : 0,
      payload: detailPayload ?? { state: 'not requested' },
    },
    {
      endpoint: 'POST /tickers · PUT /tickers/{ticker} · DELETE /tickers/{ticker}',
      source: 'Ticker Registry API',
      state: actionState,
      payload: actionPayload ?? { state: 'no mutation in this session' },
    },
    {
      endpoint: 'POST /tickers/historical-init',
      source: 'Historical Initialization API',
      state: historicalState,
      payload: historicalPayload ?? { state: 'not requested' },
    },
    {
      endpoint: `GET /tickers + GET /tickers/historical-init/status × ${companyHistoryStatuses.length}`,
      source: 'All Managed Company History Statuses',
      state: companyHistoryState,
      recordCount: companyHistoryStatuses.length,
      updatedAt: companyHistoryUpdatedAt,
      payload: companyHistoryPayload,
    },
    {
      endpoint: `GET /tickers/historical-init/status?ticker=${historicalTicker.trim().toUpperCase() || '{ticker}'}`,
      source: 'Historical Initialization Status API',
      state: historicalInitStatus,
      recordCount: historicalStatusPayload ? 1 : 0,
      payload: historicalStatusPayload ?? { state: 'not requested' },
    },
    {
      endpoint: `POST /manual-input/consolidate?ticker=${historicalTicker.trim().toUpperCase() || '{ticker}'}`,
      source: 'Manual Input V2 API',
      state: consolidationState,
      payload: consolidationPayload ?? { state: 'not requested' },
    },
    {
      endpoint: `GET /manual-input/consolidate/status?ticker=${historicalTicker.trim().toUpperCase() || '{ticker}'}`,
      source: 'Consolidation Status API',
      state: consolidationStatus,
      recordCount: consolidationStatusPayload ? 1 : 0,
      payload: consolidationStatusPayload ?? { state: 'not requested' },
    },
  ];

  const nonReadyCompanyHistoryStatuses = companyHistoryStatuses.filter(item => item.status !== 'available').sort((a, b) => (
    companyHistoryStatusPriority(a.status) - companyHistoryStatusPriority(b.status)
    || a.ticker.localeCompare(b.ticker)
  ));
  const runningCompanyCount = companyHistoryStatuses.filter(item => item.status === 'in_progress').length;
  const unavailableCompanyCount = companyHistoryStatuses.filter(item => item.status === 'error').length;
  const readyCompanyCount = companyHistoryStatuses.filter(item => item.status === 'available').length;
  const selectedTickerCanConsolidate = tickerPattern.test(historicalTicker.trim().toUpperCase())
    && (allCompanyHistoryReady || historicalInitAcceptedTicker === historicalTicker.trim().toUpperCase());
  const companyHistorySummary = companyHistoryState === 'loading' && !companyHistoryStatuses.length
    ? 'History · Checking all'
    : companyHistoryState === 'error' && !companyHistoryStatuses.length
      ? 'History · Unavailable'
      : runningCompanyCount || unavailableCompanyCount
        ? `History · ${runningCompanyCount + unavailableCompanyCount} not ready`
        : `History · ${readyCompanyCount} ready`;

  if (authorized === false) {
    return (
      <section className="ops-panel ops-access-restricted">
        <span className="ops-eyebrow">Restricted</span>
        <h2>Operator access required</h2>
        <p>{message || 'Ticker Management is available only to operations users.'}</p>
      </section>
    );
  }

  return (
    <div className="ops-ticker-management-page">
      <section className="ops-ticker-management-top">
        <form className="ops-panel ops-ticker-create-panel" onSubmit={createRecord}>
          <div className="ops-panel-head">
            <div><span className="ops-eyebrow">Ticker Registry</span><h2>Add Company</h2><p>Create a managed ticker and add it to your operator workspace.</p></div>
            <span className={`ops-status ${actionState === 'error' ? 'bad' : actionState === 'success' ? 'good' : ''}`}>{actionState === 'saving' ? 'saving' : 'operator'}</span>
          </div>
          <div className="ops-ticker-form-grid">
            <label><span>Ticker symbol</span><input required maxLength={20} value={createTicker} onChange={event => setCreateTicker(event.target.value.toUpperCase())} placeholder="AAPL" /></label>
            <label><span>Company name</span><input required value={createCompanyName} onChange={event => setCreateCompanyName(event.target.value)} placeholder="Apple Inc." /></label>
            <label><span>Status</span><select value={createStatus} onChange={event => setCreateStatus(event.target.value as 'ACTIVE' | 'INACTIVE')}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
            <label><span>Effective date</span><input required type="date" value={createEffectiveDate} onChange={event => setCreateEffectiveDate(event.target.value)} /></label>
          </div>
          <div className="ops-ticker-form-actions"><button className="ops-primary-button" type="submit" disabled={actionState === 'saving'} aria-busy={actionState === 'saving'}>{actionState === 'saving' ? 'Creating...' : 'Create Ticker'}</button></div>
        </form>

        <form className="ops-panel ops-ticker-history-panel" onSubmit={runHistoricalInit}>
          <div className="ops-panel-head">
            <div><span className="ops-eyebrow">Historical Data</span><h2>Initialize History</h2><p>Collect up to 180 days from selected vendors. Accepted jobs run asynchronously.</p></div>
            <div className="ops-ticker-pipeline-statuses" aria-live="polite">
              <span className={`ops-status ${unavailableCompanyCount ? 'bad' : readyCompanyCount && !runningCompanyCount ? 'good' : ''}`}>{companyHistorySummary}</span>
              <span className={`ops-status ${consolidationStatus === 'available' ? 'good' : consolidationStatus === 'error' && consolidationState !== 'idle' ? 'bad' : ''}`}>{pipelineStatusText('Consolidation', consolidationStatus, consolidationLockAgeSeconds)}</span>
            </div>
          </div>
          <section className="ops-company-history-overview" aria-label="Managed company history statuses">
            <div className="ops-company-history-overview__head">
              <div>
                <strong>Companies requiring attention</strong>
                <span>Only companies that are not ready are shown below.</span>
              </div>
              <button className="ops-secondary-button" type="button" disabled={companyHistoryState === 'loading'} onClick={() => void loadAllCompanyHistoryStatuses()}>
                {companyHistoryState === 'loading' ? 'Checking...' : 'Refresh all'}
              </button>
            </div>
            <div className="ops-company-history-overview__summary" aria-label="Company history status totals">
              <span className="is-running">{runningCompanyCount} running</span>
              <span className="is-unavailable">{unavailableCompanyCount} unavailable</span>
              <span className="is-ready">{readyCompanyCount} ready</span>
            </div>
            <div className="ops-company-history-list">
              {nonReadyCompanyHistoryStatuses.map(item => (
                <article className={`is-${item.status}${item.ticker === historicalTicker.trim().toUpperCase() ? ' is-selected' : ''}`} key={item.ticker}>
                  <div>
                    <strong>{item.ticker}</strong>
                    <span>{item.companyName || 'Company name unavailable'}</span>
                  </div>
                  <div>
                    {item.registryStatus === 'INACTIVE' && <small>Inactive</small>}
                    <b>{companyHistoryStatusLabel(item.status, item.lockAgeSeconds)}</b>
                  </div>
                </article>
              ))}
              {companyHistoryState !== 'loading' && !nonReadyCompanyHistoryStatuses.length && (
                <p>All managed companies are ready.</p>
              )}
            </div>
            <small className="ops-company-history-overview__note">Ready means no historical initialization job is currently running. It does not verify historical data completeness.</small>
          </section>
          <div className="ops-ticker-history-fields">
            <label><span>Ticker</span><input required maxLength={20} value={historicalTicker} onChange={event => setHistoricalTicker(event.target.value.toUpperCase())} placeholder="Select a ticker below" /></label>
            <label><span>From date</span><input required type="date" max={today} value={fromDate} onChange={event => setFromDate(event.target.value)} /></label>
            <label><span>To date</span><input required type="date" max={today} value={toDate} onChange={event => setToDate(event.target.value)} /></label>
          </div>
          <fieldset className="ops-ticker-vendors"><legend>Data vendors</legend>{allVendors.map(vendor => <label key={vendor}><input type="checkbox" checked={vendors.includes(vendor)} onChange={() => toggleVendor(vendor)} /><span>{vendor}</span></label>)}</fieldset>
          <div className="ops-ticker-history-summary"><span>{Number.isFinite(historicalDays) ? historicalDays : '—'} days</span><span>{vendors.length} vendors</span><span>Writes enabled</span></div>
          <div className="ops-ticker-history-actions">
            <button
              className="ops-primary-button"
              type="submit"
              disabled={historicalState === 'saving' || historicalInitStatus === 'loading' || historicalInitStatus === 'in_progress' || (historicalInitAcceptedTicker === historicalTicker.trim().toUpperCase() && historicalInitStatus === 'error') || consolidationStatus === 'in_progress' || consolidationState === 'consolidating'}
            >
              {historicalState === 'saving'
                ? 'Submitting...'
                : historicalInitStatus === 'in_progress'
                  ? 'Initialization Running'
                  : historicalInitAcceptedTicker === historicalTicker.trim().toUpperCase() && historicalInitStatus === 'error'
                    ? 'Status Check Unavailable'
                    : 'Start Historical Init'}
            </button>
            <button
              className="ops-secondary-button"
              type="button"
              disabled={!selectedTickerCanConsolidate || historicalState === 'saving' || historicalInitStatus === 'in_progress' || (!allCompanyHistoryReady && historicalInitStatus === 'error') || consolidationStatus === 'loading' || consolidationStatus === 'in_progress' || consolidationStatus === 'error' || consolidationState === 'consolidating'}
              title={!selectedTickerCanConsolidate ? 'Start historical initialization or wait until all company histories are ready before running consolidation.' : undefined}
              onClick={() => void runConsolidation()}
            >
              {consolidationState === 'consolidating' ? 'Submitting...' : consolidationStatus === 'in_progress' ? 'Consolidation Running' : 'Run Consolidation'}
            </button>
          </div>
          {historicalMessage && (
            <p className={`ops-form-message ${historicalState === 'error' || historicalInitStatus === 'error' || statusPayloadError(historicalStatusPayload) ? 'bad' : 'good'}`} role="status" aria-live="polite">
              {historicalFeedback(
                historicalTicker.trim().toUpperCase(),
                historicalState,
                historicalInitStatus,
                historicalMessage,
                statusPayloadError(historicalStatusPayload),
              )}
            </p>
          )}
          {consolidationMessage && (
            <p className={`ops-form-message ${consolidationState === 'error' || consolidationStatus === 'error' || statusPayloadError(consolidationStatusPayload) ? 'bad' : 'good'}`} role="status" aria-live="polite">
              {consolidationFeedback(
                historicalTicker.trim().toUpperCase(),
                consolidationState,
                consolidationStatus,
                consolidationMessage,
                statusPayloadError(consolidationStatusPayload),
              )}
            </p>
          )}
        </form>
      </section>

      {message && <p className={`ops-form-message ops-ticker-page-message ${actionState === 'error' || listState === 'error' || detailState === 'error' ? 'bad' : 'good'}`} role="status">{message}</p>}

      <section className="ops-panel ops-ticker-list-panel">
        <div className="ops-panel-head">
          <div><span className="ops-eyebrow">Company Management</span><h2>Managed Tickers</h2><p>Search, inspect, update, restore, or soft delete ticker definitions.</p></div>
          <span className="company-count-badge">{reportedCount} returned</span>
        </div>
        <form className="ops-ticker-toolbar" onSubmit={applyFilters}>
          <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search ticker or company..." aria-label="Search managed tickers" />
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter ticker status"><option value="">All active statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
          <select value={limit} onChange={event => setLimit(Number(event.target.value))} aria-label="Ticker rows per page"><option value={10}>10 per page</option><option value={25}>25 per page</option><option value={50}>50 per page</option></select>
          <label className="ops-ticker-include-deleted"><input type="checkbox" checked={includeDeleted} onChange={event => setIncludeDeleted(event.target.checked)} /><span>Include deleted</span></label>
          <button className="ops-primary-button" type="submit" disabled={listState === 'loading'}>{listState === 'loading' ? 'Loading...' : 'Apply'}</button>
          <button className="ops-secondary-button" type="button" onClick={resetFilters} disabled={listState === 'loading'}>Reset</button>
          <button className="ops-secondary-button" type="button" onClick={() => loadTickers(currentToken, pageNumber)} disabled={listState === 'loading'}>Refresh</button>
        </form>

        <div className="ops-table-wrap">
          <table className="ops-table ops-ticker-table">
            <thead><tr><th>Ticker</th><th>Company</th><th>Status</th><th>Effective Date</th><th>Updated</th><th>Updated By</th><th>Actions</th></tr></thead>
            <tbody>
              {records.map(record => (
                <tr key={record.ticker} className={selectedTicker?.ticker === record.ticker ? 'is-selected' : ''}>
                  <td><strong className="ops-ticker-symbol">{record.ticker}</strong></td>
                  <td>{record.companyName || 'Company name unavailable'}</td>
                  <td><span className={`ops-ticker-status is-${record.status.toLowerCase()}`}>{record.status}</span></td>
                  <td>{record.effectiveDate || 'Not set'}</td>
                  <td>{formatDateTime(record.updatedAt)}</td>
                  <td>{record.updatedBy || 'Not available'}</td>
                  <td><div className="ops-ticker-row-actions"><button type="button" onClick={() => openTicker(record.ticker)}>View / Edit</button><button type="button" onClick={() => { populateEditor(record); openWorkspace(record); }} disabled={record.status === 'DELETED'}>Open Workspace</button></div></td>
                </tr>
              ))}
              {listState !== 'loading' && !records.length && <tr><td colSpan={7} className="ops-table-empty">No tickers match the selected filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="ops-pagination" aria-label="Managed ticker pagination"><button type="button" onClick={previousPage} disabled={!previousTokens.length || listState === 'loading'}>Previous</button><span>Page {pageNumber}</span><button type="button" onClick={nextPage} disabled={!nextToken || listState === 'loading'}>Next</button></div>
      </section>

      {selectedTicker && (
        <section className="ops-panel ops-ticker-detail-panel">
          <div className="ops-panel-head">
            <div><span className="ops-eyebrow">Ticker Detail</span><h2>{selectedTicker.ticker} · {selectedTicker.companyName || 'Unregistered ticker'}</h2><p>Update the registry record or use it as the target for historical initialization.</p></div>
            <span className={`ops-ticker-status is-${selectedTicker.status.toLowerCase()}`}>{selectedTicker.status}</span>
          </div>
          <div className="ops-ticker-detail-layout">
            <form className="ops-ticker-edit-form" onSubmit={updateRecord}>
              <label><span>Ticker</span><input value={selectedTicker.ticker} disabled /></label>
              <label><span>Company name</span><input required value={editCompanyName} onChange={event => setEditCompanyName(event.target.value)} /></label>
              <label><span>Status</span><select value={editStatus} onChange={event => setEditStatus(event.target.value as 'ACTIVE' | 'INACTIVE')}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select><small>{selectedTicker.status === 'DELETED' ? 'Saving Active or Inactive attempts to restore this soft-deleted ticker.' : 'Use soft delete below to mark the ticker Deleted.'}</small></label>
              <label><span>Effective date</span><input required type="date" value={editEffectiveDate} onChange={event => setEditEffectiveDate(event.target.value)} /></label>
              <div className="ops-ticker-detail-actions"><button className="ops-primary-button" type="submit" disabled={actionState === 'saving' || detailState === 'loading'} aria-busy={actionState === 'saving'}>{actionState === 'saving' ? 'Saving...' : selectedTicker.status === 'DELETED' ? 'Restore Ticker' : 'Save Changes'}</button><button className="ops-secondary-button" type="button" onClick={() => setHistoricalTicker(selectedTicker.ticker)}>Use for Historical Init</button><button className="ops-danger-button" type="button" onClick={deleteRecord} disabled={actionState === 'saving' || selectedTicker.status === 'DELETED'}>Soft Delete</button></div>
            </form>
            <dl className="ops-ticker-audit">
              <div><dt>Created by</dt><dd>{selectedTicker.createdBy || 'Not available'}</dd></div>
              <div><dt>Created at</dt><dd>{formatDateTime(selectedTicker.createdAt)}</dd></div>
              <div><dt>Updated by</dt><dd>{selectedTicker.updatedBy || 'Not available'}</dd></div>
              <div><dt>Updated at</dt><dd>{formatDateTime(selectedTicker.updatedAt)}</dd></div>
            </dl>
          </div>
        </section>
      )}

      <OperationsDevelopmentData title="Ticker Management API Responses" description="Raw authenticated ticker registry, historical initialization, consolidation requests, and separate pipeline status responses." rows={developmentRows} />
    </div>
  );
}
