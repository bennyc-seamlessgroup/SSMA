'use client';

import { useEffect, useMemo, useState } from 'react';

type MarginRecord = {
  id: string;
  ticker: string;
  date: string;
  initialMargin: number;
  maintenanceMargin: number;
  averageDurationDays: number;
  updatedAt: string;
  updatedBy: string;
};

type MarginResponse = {
  storage?: 's3' | 'local';
  s3Key?: string;
  updatedAt: string;
  records: MarginRecord[];
};

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function formatPct(value: number | string) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? `${numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : 'N/A';
}

function formatDays(value: number | string) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? `${numeric.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}d` : 'N/A';
}

function formatDateTime(value: string) {
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

function normalizePayload(payload: unknown): MarginResponse {
  const envelope = payload as { data?: Partial<MarginResponse> } & Partial<MarginResponse>;
  const data = envelope.data ?? envelope;
  return {
    storage: data.storage,
    s3Key: data.s3Key ?? 'dashboard/CURR_margin_inputs.json',
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    records: Array.isArray(data.records) ? data.records as MarginRecord[] : [],
  };
}

export function DashboardMarginOperationsClient() {
  const [form, setForm] = useState({
    ticker: 'CURR',
    date: todayYmd(),
    initialMargin: '',
    maintenanceMargin: '',
    averageDurationDays: '',
    updatedBy: 'operations',
  });
  const [data, setData] = useState<MarginResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [message, setMessage] = useState('');

  async function loadRecords() {
    setStatus('loading');
    try {
      const response = await fetch('/api/operations/dashboard-margin', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Unable to load margin records.');
      setData(normalizePayload(payload));
      setStatus('idle');
      setMessage('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to load margin records.');
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  const records = useMemo(() => {
    return [...(data?.records ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  }, [data]);

  const ready = Boolean(form.date && form.initialMargin && form.maintenanceMargin && form.averageDurationDays);

  function updateField(field: keyof typeof form, value: string) {
    setForm(current => ({ ...current, [field]: value }));
  }

  function editRecord(record: MarginRecord) {
    setForm({
      ticker: record.ticker,
      date: record.date,
      initialMargin: String(record.initialMargin),
      maintenanceMargin: String(record.maintenanceMargin),
      averageDurationDays: String(record.averageDurationDays),
      updatedBy: record.updatedBy || 'operations',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch('/api/operations/dashboard-margin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: form.ticker,
          date: form.date,
          initialMargin: Number(form.initialMargin),
          maintenanceMargin: Number(form.maintenanceMargin),
          averageDurationDays: Number(form.averageDurationDays),
          updatedBy: form.updatedBy,
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload.ok === false) throw new Error(payload.error || 'Unable to save margin record.');
      setData(normalizePayload(payload));
      setStatus('saved');
      setMessage(`Saved ${form.date} margin inputs.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to save margin record.');
    }
  }

  return (
    <div className="ops-sec-grid">
      <section className="ops-panel ops-sec-form-panel">
        <div className="ops-panel-head">
          <div>
            <span className="ops-eyebrow">Manual Input</span>
            <h2>Daily Margin Record</h2>
          </div>
          <span className={`ops-status ${status === 'error' ? 'bad' : status === 'saved' ? 'good' : ''}`}>{status}</span>
        </div>

        <form className="ops-sec-form" onSubmit={saveRecord}>
          <div className="ops-form-grid two">
            <label>Ticker<input value={form.ticker} onChange={event => updateField('ticker', event.target.value.toUpperCase())} /></label>
            <label>Date<input type="date" value={form.date} onChange={event => updateField('date', event.target.value)} /></label>
          </div>
          <div className="ops-form-grid two">
            <label>Initial Margin<input type="number" step="0.01" min="0" placeholder="150.00" value={form.initialMargin} onChange={event => updateField('initialMargin', event.target.value)} /></label>
            <label>Maintenance Margin<input type="number" step="0.01" min="0" placeholder="150.00" value={form.maintenanceMargin} onChange={event => updateField('maintenanceMargin', event.target.value)} /></label>
          </div>
          <div className="ops-form-grid two">
            <label>Average Duration (D)<input type="number" step="0.1" min="0" placeholder="4.8" value={form.averageDurationDays} onChange={event => updateField('averageDurationDays', event.target.value)} /></label>
            <label>Updated by<input value={form.updatedBy} onChange={event => updateField('updatedBy', event.target.value)} /></label>
          </div>
          <div className="ops-form-footer">
            <span>{ready ? `Preview: ${formatPct(form.initialMargin)} / ${formatPct(form.maintenanceMargin)} / ${formatDays(form.averageDurationDays)}` : 'Required: date, initial margin, maintenance margin, average duration'}</span>
            <button className="ops-primary-button" type="submit" disabled={!ready || status === 'saving'}>{status === 'saving' ? 'Saving...' : 'Save Margin'}</button>
          </div>
          {message && <p className={`ops-form-message ${status === 'error' ? 'bad' : 'good'}`}>{message}</p>}
        </form>
      </section>

      <aside className="ops-side-stack">
        <section className="ops-panel">
          <div className="ops-panel-head">
            <div>
              <span className="ops-eyebrow">Current Preview</span>
              <h2>Dashboard Card</h2>
            </div>
          </div>
          <dl className="ops-preview-list">
            <div><dt>Date</dt><dd>{form.date || 'N/A'}</dd></div>
            <div><dt>Initial Margin</dt><dd>{form.initialMargin ? formatPct(form.initialMargin) : 'N/A'}</dd></div>
            <div><dt>Maintenance Margin</dt><dd>{form.maintenanceMargin ? formatPct(form.maintenanceMargin) : 'N/A'}</dd></div>
            <div><dt>Average Duration</dt><dd>{form.averageDurationDays ? formatDays(form.averageDurationDays) : 'N/A'}</dd></div>
          </dl>
        </section>

        <section className="ops-panel">
          <div className="ops-panel-head">
            <div>
              <span className="ops-eyebrow">Storage</span>
              <h2>JSON Target</h2>
            </div>
          </div>
          <div className="ops-storage-box">
            <span>{data?.storage ?? 'loading'}</span>
            <strong>{data?.s3Key ?? 'dashboard/CURR_margin_inputs.json'}</strong>
            <small>{data?.updatedAt ? `Updated ${formatDateTime(data.updatedAt)}` : 'Waiting for first save'}</small>
          </div>
        </section>
      </aside>

      <section className="ops-panel ops-wide-panel">
        <div className="ops-panel-head">
          <div>
            <span className="ops-eyebrow">Previous Entries</span>
            <h2>Saved Margin Records</h2>
          </div>
          <span className="ops-record-count">{records.length.toLocaleString()} records</span>
        </div>
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Initial Margin</th>
                <th>Maintenance Margin</th>
                <th>Average Duration (D)</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr key={record.id}>
                  <td>{record.date}</td>
                  <td>{formatPct(record.initialMargin)}</td>
                  <td>{formatPct(record.maintenanceMargin)}</td>
                  <td>{formatDays(record.averageDurationDays)}</td>
                  <td>{formatDateTime(record.updatedAt)} · {record.updatedBy}</td>
                  <td><button className="ops-secondary-button" type="button" onClick={() => editRecord(record)}>Edit</button></td>
                </tr>
              ))}
              {!records.length && <tr><td colSpan={6}>No margin records have been saved yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
