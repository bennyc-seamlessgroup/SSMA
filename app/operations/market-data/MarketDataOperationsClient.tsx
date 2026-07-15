'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImportDataTable } from '@/components/ImportDataTable';
import { authenticatedFetch } from '@/lib/auth-client';
import { operationsProfile } from '@/lib/operations/api-client';
import { getOperationsTicker, setOperationsTicker } from '@/lib/operations/ticker-client';

type DateSpecificRecord = {
  tradeDate?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
};

type UtilizationRecord = DateSpecificRecord & {
  utilizationPercent?: number;
};

type AvailabilityRecord = DateSpecificRecord & {
  availableSharesIbkr?: number;
  availableSharesFutu?: number;
};

type MarginRecord = DateSpecificRecord & {
  initialMarginIbkr?: number;
  initialMarginFutu?: number;
  maintenanceMarginIbkr?: number;
  maintenanceMarginFutu?: number;
  averageDurationDays?: number;
  valueFormat?: string;
  displayFormat?: string;
};

type ShortScoreRecord = DateSpecificRecord & {
  shortScore?: number;
};

type MarketInputRow = {
  tradeDate: string;
  issuedShare?: number;
  utilizationPercent?: number;
  availableSharesIbkr?: number;
  availableSharesFutu?: number;
  initialMarginIbkr?: number;
  initialMarginFutu?: number;
  maintenanceMarginIbkr?: number;
  maintenanceMarginFutu?: number;
  averageDurationDays?: number;
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

type ApiDebugRow = {
  endpoint: string;
  source: string;
  status: string;
  recordCount: string;
  generatedAt: string;
  payload: string;
};

const dateSpecificCategories = ['utilization', 'manual-availability', 'margins', 'short-score'] as const;

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    tradeDate: todayYmd(),
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

function percentInputToRatio(value: string) {
  const numeric = numberOrUndefined(value);
  return numeric === undefined ? undefined : numeric / 100;
}

function ratioToPercent(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return '';
  return String(numeric * 100);
}

function formatNumber(value: unknown, digits = 0) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric)
    ? numeric.toLocaleString('en-US', { maximumFractionDigits: digits })
    : 'N/A';
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

function formatDays(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric)
    ? `${numeric.toLocaleString('en-US', { maximumFractionDigits: 1 })}d`
    : 'N/A';
}

function formatDateTime(value?: string) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function payloadRecordCount(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (isRecord(value) && Array.isArray(value.records)) return value.records.length;
  if (value === null || value === undefined) return 0;
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

function payloadPreview(value: unknown) {
  if (value === null || value === undefined) return 'No data';
  try {
    return JSON.stringify(value).slice(0, 240);
  } catch {
    return String(value).slice(0, 240);
  }
}

function withoutUndefined<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}

async function saveManualInput(endpoint: string, payload: Record<string, unknown>) {
  const body = JSON.stringify(withoutUndefined(payload));
  try {
    return await authenticatedFetch(endpoint, { method: 'PUT', body });
  } catch (error) {
    try {
      return await authenticatedFetch(endpoint, { method: 'POST', body });
    } catch {
      throw error;
    }
  }
}

function latestMeta(...records: Array<DateSpecificRecord | undefined>) {
  return records
    .filter((record): record is DateSpecificRecord => Boolean(record))
    .sort((a, b) => String(b.updatedAt ?? b.createdAt ?? '').localeCompare(String(a.updatedAt ?? a.createdAt ?? '')))[0];
}

function mergeRows(
  issuedShare: number | undefined,
  utilization: UtilizationRecord[],
  availability: AvailabilityRecord[],
  margins: MarginRecord[],
  shortScores: ShortScoreRecord[],
) {
  const rows = new Map<string, MarketInputRow>();

  function row(date: string) {
    const existing = rows.get(date);
    if (existing) return existing;
    const next: MarketInputRow = { tradeDate: date, issuedShare };
    rows.set(date, next);
    return next;
  }

  utilization.forEach(record => {
    if (!record.tradeDate) return;
    const target = row(record.tradeDate);
    target.utilizationPercent = record.utilizationPercent;
    const meta = latestMeta(target as DateSpecificRecord, record);
    target.updatedAt = meta?.updatedAt ?? meta?.createdAt;
    target.updatedBy = meta?.updatedBy ?? meta?.createdBy;
  });
  availability.forEach(record => {
    if (!record.tradeDate) return;
    const target = row(record.tradeDate);
    target.availableSharesIbkr = record.availableSharesIbkr;
    target.availableSharesFutu = record.availableSharesFutu;
    const meta = latestMeta(target as DateSpecificRecord, record);
    target.updatedAt = meta?.updatedAt ?? meta?.createdAt;
    target.updatedBy = meta?.updatedBy ?? meta?.createdBy;
  });
  margins.forEach(record => {
    if (!record.tradeDate) return;
    const target = row(record.tradeDate);
    target.initialMarginIbkr = record.initialMarginIbkr;
    target.initialMarginFutu = record.initialMarginFutu;
    target.maintenanceMarginIbkr = record.maintenanceMarginIbkr;
    target.maintenanceMarginFutu = record.maintenanceMarginFutu;
    target.averageDurationDays = record.averageDurationDays;
    const meta = latestMeta(target as DateSpecificRecord, record);
    target.updatedAt = meta?.updatedAt ?? meta?.createdAt;
    target.updatedBy = meta?.updatedBy ?? meta?.createdBy;
  });
  shortScores.forEach(record => {
    if (!record.tradeDate) return;
    const target = row(record.tradeDate);
    target.shortScore = record.shortScore;
    const meta = latestMeta(target as DateSpecificRecord, record);
    target.updatedAt = meta?.updatedAt ?? meta?.createdAt;
    target.updatedBy = meta?.updatedBy ?? meta?.createdBy;
  });

  return [...rows.values()].sort((a, b) => b.tradeDate.localeCompare(a.tradeDate));
}

export function MarketDataOperationsClient() {
  const [selectedTicker, setSelectedTicker] = useState('CURR');
  const [tickerDraft, setTickerDraft] = useState('CURR');
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [rows, setRows] = useState<MarketInputRow[]>([]);
  const [apiDebugRows, setApiDebugRows] = useState<ApiDebugRow[]>([]);
  const [status, setStatus] = useState<'checking' | 'loading' | 'idle' | 'saving' | 'success' | 'error' | 'forbidden'>('checking');
  const [message, setMessage] = useState('');
  const [deletingDate, setDeletingDate] = useState('');

  async function loadApi(endpoint: string) {
    try {
      const payload = await authenticatedFetch(endpoint);
      return {
        payload,
        debug: {
          endpoint,
          source: 'API Gateway',
          status: 'ok',
          recordCount: String(payloadRecordCount(payload)),
          generatedAt: payloadGeneratedAt(payload) || 'N/A',
          payload: payloadPreview(payload),
        },
      };
    } catch (error) {
      return {
        payload: null,
        debug: {
          endpoint,
          source: 'API Gateway',
          status: error instanceof Error ? `error: ${error.message}` : 'error',
          recordCount: '0',
          generatedAt: 'N/A',
          payload: 'No API payload returned.',
        },
      };
    }
  }

  async function loadRecords(ticker: string, preserveFeedback = false) {
    const normalized = normalizeTicker(ticker);
    setStatus('loading');
    if (!preserveFeedback) setMessage('');
    try {
      const endpoints = [
        `/manual-input/issued-share?ticker=${encodeURIComponent(normalized)}`,
        `/manual-input/utilization?ticker=${encodeURIComponent(normalized)}`,
        `/manual-input/manual-availability?ticker=${encodeURIComponent(normalized)}`,
        `/manual-input/margins?ticker=${encodeURIComponent(normalized)}`,
        `/manual-input/short-score?ticker=${encodeURIComponent(normalized)}`,
      ];
      const [issuedShareResult, utilizationResult, availabilityResult, marginsResult, shortScoreResult] = await Promise.all([
        loadApi(endpoints[0]),
        loadApi(endpoints[1]),
        loadApi(endpoints[2]),
        loadApi(endpoints[3]),
        loadApi(endpoints[4]),
      ]);
      setApiDebugRows([issuedShareResult, utilizationResult, availabilityResult, marginsResult, shortScoreResult].map(result => result.debug));
      const issuedShare = numberOrUndefined(String((issuedShareResult.payload as { issuedShare?: unknown } | null)?.issuedShare ?? ''));
      setSelectedTicker(normalized);
      setTickerDraft(normalized);
      setOperationsTicker(normalized);
      setForm(current => ({ ...emptyForm(), tradeDate: current.tradeDate || todayYmd(), issuedShare: issuedShare === undefined ? '' : String(issuedShare) }));
      setRows(mergeRows(
        issuedShare,
        asArray<UtilizationRecord>(utilizationResult.payload),
        asArray<AvailabilityRecord>(availabilityResult.payload),
        asArray<MarginRecord>(marginsResult.payload),
        asArray<ShortScoreRecord>(shortScoreResult.payload),
      ));
      setStatus(preserveFeedback ? 'success' : 'idle');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to load Manual Input V2 records.');
    }
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

  const formHasAnyData = useMemo(
    () => Object.entries(form).some(([key, value]) => key !== 'tradeDate' && Boolean(value.trim())),
    [form],
  );
  const busy = ['checking', 'loading', 'saving'].includes(status);

  function updateField(field: keyof FormState, value: string) {
    setForm(current => ({ ...current, [field]: value }));
  }

  function editRecord(record: MarketInputRow) {
    setForm({
      tradeDate: record.tradeDate,
      issuedShare: record.issuedShare === undefined ? '' : String(record.issuedShare),
      utilizationPercent: record.utilizationPercent === undefined ? '' : String(record.utilizationPercent),
      availableSharesIbkr: record.availableSharesIbkr === undefined ? '' : String(record.availableSharesIbkr),
      availableSharesFutu: record.availableSharesFutu === undefined ? '' : String(record.availableSharesFutu),
      initialMarginIbkr: ratioToPercent(record.initialMarginIbkr),
      initialMarginFutu: ratioToPercent(record.initialMarginFutu),
      maintenanceMarginIbkr: ratioToPercent(record.maintenanceMarginIbkr),
      maintenanceMarginFutu: ratioToPercent(record.maintenanceMarginFutu),
      averageDurationDays: record.averageDurationDays === undefined ? '' : String(record.averageDurationDays),
      shortScore: record.shortScore === undefined ? '' : String(record.shortScore),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.tradeDate || !formHasAnyData) return;
    setStatus('saving');
    setMessage('');

    const tickerParam = encodeURIComponent(selectedTicker);
    const tradeDateParam = encodeURIComponent(form.tradeDate);
    const requests: Array<Promise<unknown>> = [];
    const issuedShare = numberOrUndefined(form.issuedShare);
    const utilizationPercent = numberOrUndefined(form.utilizationPercent);
    const availableSharesIbkr = numberOrUndefined(form.availableSharesIbkr);
    const availableSharesFutu = numberOrUndefined(form.availableSharesFutu);
    const initialMarginIbkr = percentInputToRatio(form.initialMarginIbkr);
    const initialMarginFutu = percentInputToRatio(form.initialMarginFutu);
    const maintenanceMarginIbkr = percentInputToRatio(form.maintenanceMarginIbkr);
    const maintenanceMarginFutu = percentInputToRatio(form.maintenanceMarginFutu);
    const averageDurationDays = numberOrUndefined(form.averageDurationDays);
    const shortScore = numberOrUndefined(form.shortScore);

    if (issuedShare !== undefined) {
      requests.push(saveManualInput(`/manual-input/issued-share?ticker=${tickerParam}`, { issuedShare }));
    }
    if (utilizationPercent !== undefined) {
      requests.push(saveManualInput(`/manual-input/utilization?ticker=${tickerParam}&tradeDate=${tradeDateParam}`, { utilizationPercent }));
    }
    if (availableSharesIbkr !== undefined || availableSharesFutu !== undefined) {
      requests.push(saveManualInput(`/manual-input/manual-availability?ticker=${tickerParam}&tradeDate=${tradeDateParam}`, { availableSharesIbkr, availableSharesFutu }));
    }
    if (
      initialMarginIbkr !== undefined ||
      initialMarginFutu !== undefined ||
      maintenanceMarginIbkr !== undefined ||
      maintenanceMarginFutu !== undefined ||
      averageDurationDays !== undefined
    ) {
      requests.push(saveManualInput(`/manual-input/margins?ticker=${tickerParam}&tradeDate=${tradeDateParam}`, {
        initialMarginIbkr,
        initialMarginFutu,
        maintenanceMarginIbkr,
        maintenanceMarginFutu,
        averageDurationDays,
        valueFormat: 'decimal_ratio',
        displayFormat: 'percent',
      }));
    }
    if (shortScore !== undefined) {
      requests.push(saveManualInput(`/manual-input/short-score?ticker=${tickerParam}&tradeDate=${tradeDateParam}`, { shortScore }));
    }

    try {
      await Promise.all(requests);
      setStatus('success');
      setMessage(`Saved Manual Input V2 records for ${form.tradeDate}.`);
      await loadRecords(selectedTicker, true);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to save Manual Input V2 records.');
    }
  }

  async function deleteRecord(record: MarketInputRow) {
    if (!record.tradeDate) return;
    setDeletingDate(record.tradeDate);
    setStatus('saving');
    setMessage('');

    const tickerParam = encodeURIComponent(selectedTicker);
    const tradeDateParam = encodeURIComponent(record.tradeDate);

    try {
      await Promise.all([
        authenticatedFetch(`/manual-input/utilization?ticker=${tickerParam}&tradeDate=${tradeDateParam}`, { method: 'DELETE' }),
        authenticatedFetch(`/manual-input/manual-availability?ticker=${tickerParam}&tradeDate=${tradeDateParam}`, { method: 'DELETE' }),
        authenticatedFetch(`/manual-input/margins?ticker=${tickerParam}&tradeDate=${tradeDateParam}`, { method: 'DELETE' }),
        authenticatedFetch(`/manual-input/short-score?ticker=${tickerParam}&tradeDate=${tradeDateParam}`, { method: 'DELETE' }),
      ]);
      setStatus('success');
      setMessage(`Deleted daily Manual Input V2 records for ${record.tradeDate}. Issued Share was not deleted because it is a ticker-level value.`);
      await loadRecords(selectedTicker, true);
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
      <div className="ops-ticker-context">
        <label>
          <span>Company ticker</span>
          <input value={tickerDraft} maxLength={10} onChange={event => setTickerDraft(event.target.value.toUpperCase())} suppressHydrationWarning />
        </label>
        <button type="button" onClick={() => loadRecords(tickerDraft)} disabled={busy}>
          {status === 'loading' ? 'Loading...' : 'Load Workspace'}
        </button>
        <small>Manual Input V2 target: /manual-input/&lbrace;category&rbrace;?ticker={selectedTicker}</small>
      </div>

      <section className="ops-panel">
        <div className="ops-panel-head">
          <div><span className="ops-eyebrow">Manual Input V2</span><h2>Daily Market Inputs</h2></div>
          <span className={`ops-status ${status === 'error' ? 'bad' : status === 'success' ? 'good' : ''}`}>{status}</span>
        </div>
        <form className="ops-sec-form" onSubmit={saveRecord}>
          <div className="ops-form-grid three">
            <label>Trade Date<input type="date" value={form.tradeDate} onChange={event => updateField('tradeDate', event.target.value)} required /></label>
            <label>Issued Share<input inputMode="numeric" value={form.issuedShare} onChange={event => updateField('issuedShare', event.target.value)} /></label>
            <label>Short Score<input inputMode="decimal" value={form.shortScore} onChange={event => updateField('shortScore', event.target.value)} /></label>
          </div>
          <div className="ops-form-grid three">
            <label>Utilization %<input inputMode="decimal" value={form.utilizationPercent} onChange={event => updateField('utilizationPercent', event.target.value)} /></label>
            <label>IBKR Shortable Shares<input inputMode="numeric" value={form.availableSharesIbkr} onChange={event => updateField('availableSharesIbkr', event.target.value)} /></label>
            <label>Futu Shortable Shares<input inputMode="numeric" value={form.availableSharesFutu} onChange={event => updateField('availableSharesFutu', event.target.value)} /></label>
          </div>
          <div className="ops-form-grid three">
            <label>IBKR Initial Margin %<input inputMode="decimal" value={form.initialMarginIbkr} onChange={event => updateField('initialMarginIbkr', event.target.value)} /></label>
            <label>Futu Initial Margin %<input inputMode="decimal" value={form.initialMarginFutu} onChange={event => updateField('initialMarginFutu', event.target.value)} /></label>
            <label>Average Duration (Days)<input inputMode="decimal" value={form.averageDurationDays} onChange={event => updateField('averageDurationDays', event.target.value)} /></label>
          </div>
          <div className="ops-form-grid two">
            <label>IBKR Maintenance Margin %<input inputMode="decimal" value={form.maintenanceMarginIbkr} onChange={event => updateField('maintenanceMarginIbkr', event.target.value)} /></label>
            <label>Futu Maintenance Margin %<input inputMode="decimal" value={form.maintenanceMarginFutu} onChange={event => updateField('maintenanceMarginFutu', event.target.value)} /></label>
          </div>
          <div className="ops-form-footer">
            <span>{formHasAnyData ? 'Only fields with values will be saved to their matching Manual Input V2 category.' : 'Enter one or more values to save.'}</span>
            <button className="ops-primary-button" type="submit" disabled={!form.tradeDate || !formHasAnyData || busy}>{status === 'saving' ? 'Saving...' : 'Save Inputs'}</button>
          </div>
          {message ? <p className={`ops-form-message ${status === 'error' ? 'bad' : 'good'}`}>{message}</p> : null}
        </form>
      </section>

      <section className="ops-panel ops-wide-panel">
        <div className="ops-panel-head">
          <div>
            <span className="ops-eyebrow">{dateSpecificCategories.join(' / ')}</span>
            <h2>Saved Daily Inputs</h2>
          </div>
          <span className="ops-record-count">{rows.length.toLocaleString()} dates</span>
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
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(record => (
                <tr key={record.tradeDate}>
                  <td>{record.tradeDate}</td>
                  <td>{formatNumber(record.issuedShare)}</td>
                  <td>{formatPercent(record.utilizationPercent)}</td>
                  <td>{formatNumber(record.availableSharesIbkr)}</td>
                  <td>{formatNumber(record.availableSharesFutu)}</td>
                  <td>{formatPercentFromRatio(record.initialMarginIbkr)}</td>
                  <td>{formatPercentFromRatio(record.initialMarginFutu)}</td>
                  <td>{formatPercentFromRatio(record.maintenanceMarginIbkr)}</td>
                  <td>{formatPercentFromRatio(record.maintenanceMarginFutu)}</td>
                  <td>{formatDays(record.averageDurationDays)}</td>
                  <td>{formatNumber(record.shortScore, 1)}</td>
                  <td>{formatDateTime(record.updatedAt)}{record.updatedBy ? ` · ${record.updatedBy}` : ''}</td>
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
              ))}
              {!rows.length && <tr><td colSpan={13}>{busy ? 'Loading Manual Input V2 records...' : 'No Manual Input V2 records found for this ticker.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="terminal-section import-data-dev-panel">
        <div className="terminal-section__head">
          <div>
            <span>Development Data</span>
            <h2>Manual Input V2 API Responses</h2>
            <p className="section-subtitle">This table shows the exact API endpoints used by this operations page. No local JSON fallback is used here.</p>
          </div>
        </div>
        <ImportDataTable
          columns={['endpoint', 'source', 'status', 'recordCount', 'generatedAt', 'payload']}
          rows={apiDebugRows}
          pageSize={10}
        />
      </section>
    </div>
  );
}
