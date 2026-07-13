'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { operationsFetch, operationsProfile } from '@/lib/operations/api-client';
import { getOperationsTicker, setOperationsTicker } from '@/lib/operations/ticker-client';

type MarketDataRecord = {
  tradeDate: string;
  ticker: string;
  issuedShare: string;
  shortAvailabilityPct: string;
  shortAvailabilityShares: string;
  costToBorrowNew: string;
  daysToCover: string;
  shortInterestShares: string;
  shortInterestPcFreeFloat: string;
  score: string;
  tanRequestData: string;
};

type MarketDataResponse = {
  records?: MarketDataRecord[];
  message?: string;
  record?: MarketDataRecord;
  totalRows?: number;
  filesCreated?: string[];
};

const csvHeaders = [
  'tradeDate',
  'ticker',
  'issuedShare',
  'shortAvailabilityPct',
  'shortAvailabilityShares',
  'costToBorrowNew',
  'daysToCover',
  'shortInterestShares',
  'shortInterestPcFreeFloat',
  'score',
  'tanRequestData',
] as const;

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function emptyRecord(ticker: string): MarketDataRecord {
  return {
    tradeDate: todayYmd(),
    ticker,
    issuedShare: '',
    shortAvailabilityPct: '',
    shortAvailabilityShares: '',
    costToBorrowNew: '',
    daysToCover: '',
    shortInterestShares: '',
    shortInterestPcFreeFloat: '',
    score: '',
    tanRequestData: '',
  };
}

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 10) || 'CURR';
}

function displayNumber(value: string, suffix = '') {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? `${numeric.toLocaleString('en-US', { maximumFractionDigits: 4 })}${suffix}`
    : value || 'N/A';
}

export function MarketDataOperationsClient() {
  const initialTicker = 'CURR';
  const [selectedTicker, setSelectedTicker] = useState(initialTicker);
  const [tickerDraft, setTickerDraft] = useState(initialTicker);
  const [form, setForm] = useState<MarketDataRecord>(() => emptyRecord(initialTicker));
  const [records, setRecords] = useState<MarketDataRecord[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'checking' | 'loading' | 'idle' | 'saving' | 'uploading' | 'success' | 'error' | 'forbidden'>('checking');
  const [message, setMessage] = useState('');
  const [batchResult, setBatchResult] = useState<MarketDataResponse | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function loadRecords(ticker: string, preserveFeedback = false) {
    const normalized = normalizeTicker(ticker);
    setStatus('loading');
    if (!preserveFeedback) setMessage('');
    try {
      const payload = await operationsFetch(`/market-data?ticker=${encodeURIComponent(normalized)}`) as MarketDataResponse;
      setSelectedTicker(normalized);
      setTickerDraft(normalized);
      setOperationsTicker(normalized);
      setForm(emptyRecord(normalized));
      setRecords(Array.isArray(payload.records) ? payload.records : []);
      setStatus(preserveFeedback ? 'success' : 'idle');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to load market data.');
    }
  }

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      try {
        const profile = await operationsProfile();
        if (String(profile.role ?? '').trim().toUpperCase() !== 'OPERATOR') {
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

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => b.tradeDate.localeCompare(a.tradeDate)),
    [records],
  );
  const formReady = csvHeaders.every(field => field === 'tanRequestData' || Boolean(form[field].trim()));
  const busy = ['checking', 'loading', 'saving', 'uploading'].includes(status);

  function updateField(field: keyof MarketDataRecord, value: string) {
    setForm(current => ({ ...current, [field]: field === 'ticker' ? value.toUpperCase() : value }));
  }

  function editRecord(record: MarketDataRecord) {
    setForm({ ...record });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formReady) return;
    setStatus('saving');
    setMessage('');
    try {
      const payload = await operationsFetch('/market-data', {
        method: 'POST',
        body: JSON.stringify({ ...form, ticker: normalizeTicker(form.ticker) }),
      }) as MarketDataResponse;
      setStatus('success');
      setMessage(payload.message || `Saved ${form.tradeDate} market data.`);
      await loadRecords(selectedTicker, true);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to save market data.');
    }
  }

  async function uploadBatch() {
    if (!file) return;
    setStatus('uploading');
    setMessage('');
    setBatchResult(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('ticker', selectedTicker);
      const payload = await operationsFetch(`/market-data/batch?ticker=${encodeURIComponent(selectedTicker)}`, {
        method: 'POST',
        body,
      }) as MarketDataResponse;
      setBatchResult(payload);
      setStatus('success');
      setMessage(payload.message || `Uploaded ${payload.totalRows ?? 0} records.`);
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      await loadRecords(selectedTicker, true);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to upload market data CSV.');
    }
  }

  function acceptFile(candidate?: File) {
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith('.csv')) {
      setStatus('error');
      setMessage('Select a CSV file using the required market-data headers.');
      return;
    }
    setFile(candidate);
    setMessage('');
    setBatchResult(null);
  }

  if (status === 'forbidden') {
    return <section className="ops-panel ops-empty-panel"><h2>Operator access required</h2><p>{message}</p></section>;
  }

  return (
    <div className="ops-market-data-page">
      <div className="ops-ticker-context">
        <label>
          <span>Company ticker</span>
          <input value={tickerDraft} maxLength={10} onChange={event => setTickerDraft(event.target.value.toUpperCase())} />
        </label>
        <button type="button" onClick={() => loadRecords(tickerDraft)} disabled={busy}>
          {status === 'loading' ? 'Loading...' : 'Load Workspace'}
        </button>
        <small>Future API target: /market-data?ticker={selectedTicker}</small>
      </div>

      <div className="ops-market-data-grid">
        <section className="ops-panel">
          <div className="ops-panel-head">
            <div><span className="ops-eyebrow">Single Record</span><h2>Daily Market Data</h2></div>
            <span className={`ops-status ${status === 'error' ? 'bad' : status === 'success' ? 'good' : ''}`}>{status}</span>
          </div>
          <form className="ops-sec-form" onSubmit={saveRecord}>
            <div className="ops-form-grid two">
              <label>Trade Date<input type="date" value={form.tradeDate} onChange={event => updateField('tradeDate', event.target.value)} required /></label>
              <label>Ticker<input value={form.ticker} maxLength={10} onChange={event => updateField('ticker', event.target.value)} required /></label>
            </div>
            <div className="ops-form-grid three">
              <label>Issued Share<input inputMode="numeric" value={form.issuedShare} onChange={event => updateField('issuedShare', event.target.value)} required /></label>
              <label>Short Availability %<input inputMode="decimal" value={form.shortAvailabilityPct} onChange={event => updateField('shortAvailabilityPct', event.target.value)} required /></label>
              <label>Shortable Shares<input inputMode="numeric" value={form.shortAvailabilityShares} onChange={event => updateField('shortAvailabilityShares', event.target.value)} required /></label>
            </div>
            <div className="ops-form-grid three">
              <label>Cost to Borrow New<input inputMode="decimal" value={form.costToBorrowNew} onChange={event => updateField('costToBorrowNew', event.target.value)} required /></label>
              <label>Days to Cover<input inputMode="decimal" value={form.daysToCover} onChange={event => updateField('daysToCover', event.target.value)} required /></label>
              <label>Short Interest Shares<input inputMode="numeric" value={form.shortInterestShares} onChange={event => updateField('shortInterestShares', event.target.value)} required /></label>
              <label>Short Interest % Free Float<input inputMode="decimal" value={form.shortInterestPcFreeFloat} onChange={event => updateField('shortInterestPcFreeFloat', event.target.value)} required /></label>
            </div>
            <div className="ops-form-grid two">
              <label>Score<input inputMode="decimal" value={form.score} onChange={event => updateField('score', event.target.value)} required /></label>
              <label>TAN Request Data<input value={form.tanRequestData} onChange={event => updateField('tanRequestData', event.target.value)} /></label>
            </div>
            <div className="ops-form-footer">
              <span>All values are submitted as strings to match the API contract.</span>
              <button className="ops-primary-button" type="submit" disabled={!formReady || busy}>{status === 'saving' ? 'Saving...' : 'Save Record'}</button>
            </div>
          </form>
        </section>

        <aside className="ops-panel ops-market-batch-panel">
          <div className="ops-panel-head">
            <div><span className="ops-eyebrow">Batch Import</span><h2>Upload CSV</h2></div>
          </div>
          <button
            type="button"
            className={`ops-market-dropzone ${file ? 'is-ready' : ''}`}
            onClick={() => fileInput.current?.click()}
            onDragOver={event => event.preventDefault()}
            onDrop={event => {
              event.preventDefault();
              acceptFile(event.dataTransfer.files[0]);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5" /></svg>
            <strong>{file?.name ?? 'Drop market-data CSV here'}</strong>
            <span>{file ? `${(file.size / 1024).toFixed(1)} KB selected` : 'or click to choose a file'}</span>
          </button>
          <input ref={fileInput} hidden type="file" accept=".csv,text/csv" onChange={event => acceptFile(event.target.files?.[0])} />
          <div className="ops-market-schema">
            <strong>Required header order</strong>
            <code>{csvHeaders.join(', ')}</code>
          </div>
          <button className="ops-primary-button" type="button" disabled={!file || busy} onClick={uploadBatch}>
            {status === 'uploading' ? 'Uploading...' : 'Upload Batch'}
          </button>
          {batchResult ? <p className="ops-form-message good">{batchResult.totalRows ?? 0} rows processed · {batchResult.filesCreated?.length ?? 0} files created</p> : null}
        </aside>
      </div>

      {message ? <p className={`ops-form-message ops-market-message ${status === 'error' ? 'bad' : 'good'}`}>{message}</p> : null}

      <section className="ops-panel ops-wide-panel">
        <div className="ops-panel-head">
          <div><span className="ops-eyebrow">GET /market-data</span><h2>Existing Records</h2></div>
          <span className="ops-record-count">{sortedRecords.length.toLocaleString()} records</span>
        </div>
        <div className="ops-table-wrap">
          <table className="ops-table ops-market-table">
            <thead><tr><th>Trade Date</th><th>Ticker</th><th>Issued Share</th><th>Availability</th><th>Shortable Shares</th><th>Borrow Fee</th><th>Days to Cover</th><th>Short Interest</th><th>SI % Float</th><th>Score</th><th>Action</th></tr></thead>
            <tbody>
              {sortedRecords.map((record, index) => (
                <tr key={`${record.tradeDate}-${record.ticker}-${index}`}>
                  <td>{record.tradeDate}</td>
                  <td>{record.ticker}</td>
                  <td>{displayNumber(record.issuedShare)}</td>
                  <td>{displayNumber(record.shortAvailabilityPct, '%')}</td>
                  <td>{displayNumber(record.shortAvailabilityShares)}</td>
                  <td>{displayNumber(record.costToBorrowNew, '%')}</td>
                  <td>{displayNumber(record.daysToCover)}</td>
                  <td>{displayNumber(record.shortInterestShares)}</td>
                  <td>{displayNumber(record.shortInterestPcFreeFloat, '%')}</td>
                  <td>{displayNumber(record.score)}</td>
                  <td><button className="ops-secondary-button" type="button" onClick={() => editRecord(record)}>Edit</button></td>
                </tr>
              ))}
              {!sortedRecords.length && <tr><td colSpan={11}>{busy ? 'Loading market data...' : 'No market data records found for this ticker.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
