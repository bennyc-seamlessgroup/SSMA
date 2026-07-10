'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { ManagementHoldingAction, ManagementHoldingInputRecord } from '@/lib/operations/management-holdings-store';

type ApiPayload = {
  ok: boolean;
  data?: {
    records?: ManagementHoldingInputRecord[];
  };
  error?: string;
};

const categories = ['Founder', 'CEO', 'Management', 'Strategic Investor', 'Family Office', 'Long-Term Holder', 'Transfer Agent', 'Other'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown) {
  return numeric(value).toLocaleString('en-US');
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || 'N/A';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ManagementHoldingsOperationsClient() {
  const [ticker, setTicker] = useState('CURR');
  const [holderName, setHolderName] = useState('');
  const [category, setCategory] = useState('Strategic Investor');
  const [shares, setShares] = useState('');
  const [action, setAction] = useState<ManagementHoldingAction>('add');
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [autoApply, setAutoApply] = useState(false);
  const [records, setRecords] = useState<ManagementHoldingInputRecord[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'error' | 'saved'>('idle');
  const [message, setMessage] = useState('');

  const activeTicker = ticker.trim().toUpperCase() || 'CURR';

  async function loadRecords(nextTicker = activeTicker) {
    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch(`/api/operations/management-holdings?ticker=${encodeURIComponent(nextTicker)}`, { cache: 'no-store' });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Unable to load records.');
      setRecords(Array.isArray(payload.data?.records) ? payload.data.records : []);
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to load records.');
    }
  }

  useEffect(() => {
    loadRecords('CURR');
    // Initial operations workspace load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preview = useMemo(() => ({
    ticker: activeTicker,
    holderName: holderName.trim() || 'Holder name',
    category,
    shares: numeric(shares),
    action,
    effectiveDate,
    autoApply,
  }), [activeTicker, action, autoApply, category, effectiveDate, holderName, shares]);

  async function saveRecord(event: FormEvent) {
    event.preventDefault();
    if (!holderName.trim()) {
      setStatus('error');
      setMessage('Holder name is required.');
      return;
    }
    if (numeric(shares) <= 0) {
      setStatus('error');
      setMessage('Shares must be greater than zero.');
      return;
    }

    setStatus('saving');
    setMessage('');
    try {
      const response = await fetch('/api/operations/management-holdings', {
        method: 'PUT',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: activeTicker,
          holderName,
          category,
          shares,
          action,
          effectiveDate,
          notes,
          autoApply,
          updatedBy: 'operations',
        }),
      });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Unable to save record.');
      setRecords(Array.isArray(payload.data?.records) ? payload.data.records : []);
      setHolderName('');
      setShares('');
      setNotes('');
      setAutoApply(false);
      setStatus('saved');
      setMessage(autoApply ? 'Record saved and applied directly to Internal Float.' : 'Record saved for company review.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to save record.');
    }
  }

  return (
    <div className="ops-management-workspace">
      <div className="ops-ticker-context">
        <label>
          <span>Company ticker</span>
          <input value={ticker} maxLength={10} onChange={event => setTicker(event.target.value.toUpperCase())} />
        </label>
        <button type="button" onClick={() => loadRecords(activeTicker)} disabled={status === 'loading'}>Load Workspace</button>
        <small>Records are stored per ticker and used by Ownership and Internal Float.</small>
      </div>

      <div className="ops-sec-grid">
        <section className="ops-panel">
          <div className="ops-panel-head">
            <div>
              <h2>Management Holdings Inputs</h2>
              <p>Enter management or strategic entity share changes for company review.</p>
            </div>
          </div>
          <form className="ops-sec-form" onSubmit={saveRecord}>
            <div className="ops-form-grid two">
              <label>
                <span>Holder / Entity</span>
                <input value={holderName} onChange={event => setHolderName(event.target.value)} />
              </label>
              <label>
                <span>Category</span>
                <select className="ops-select" value={category} onChange={event => setCategory(event.target.value)}>
                  {categories.map(option => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label>
                <span>Action</span>
                <select className="ops-select" value={action} onChange={event => setAction(event.target.value as ManagementHoldingAction)}>
                  <option value="add">Add shares</option>
                  <option value="deduct">Deduct shares</option>
                </select>
              </label>
              <label>
                <span>Shares</span>
                <input inputMode="numeric" value={shares} onChange={event => setShares(event.target.value)} />
              </label>
              <label>
                <span>Effective Date</span>
                <input type="date" value={effectiveDate} onChange={event => setEffectiveDate(event.target.value)} />
              </label>
              <label className="ops-check-row">
                <input type="checkbox" checked={autoApply} onChange={event => setAutoApply(event.target.checked)} />
                <span>
                  <strong>Apply directly to Management / Strategic holdings</strong>
                  <small>Use only for initial historical setup. Future records should normally require company review.</small>
                </span>
              </label>
            </div>
            <label>
              <span>Notes</span>
              <textarea rows={3} value={notes} onChange={event => setNotes(event.target.value)} />
            </label>
            {message && <p className={`ops-form-message ${status === 'error' ? 'bad' : 'good'}`}>{message}</p>}
            <div className="ops-form-footer">
              <span>{preview.action === 'add' ? '+' : '-'}{formatNumber(preview.shares)} shares · {preview.autoApply ? 'direct apply' : 'suggestion'}</span>
              <button className="ops-primary-button" type="submit" disabled={status === 'saving'}>
                {status === 'saving' ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>
        </section>

        <aside className="ops-side-stack">
          <section className="ops-panel">
            <h2>Preview</h2>
            <dl className="ops-preview-list">
              <div><dt>Ticker</dt><dd>{preview.ticker}</dd></div>
              <div><dt>Holder</dt><dd>{preview.holderName}</dd></div>
              <div><dt>Action</dt><dd>{preview.action === 'add' ? 'Add shares' : 'Deduct shares'}</dd></div>
              <div><dt>Shares</dt><dd>{formatNumber(preview.shares)}</dd></div>
              <div><dt>Routing</dt><dd>{preview.autoApply ? 'Direct to Internal Float' : 'Company review'}</dd></div>
            </dl>
          </section>
        </aside>
      </div>

      <section className="ops-panel ops-wide-panel">
        <div className="ops-panel-head">
          <div>
            <h2>Previous Entries</h2>
            <p>Pending records appear as review suggestions in the Internal Float page.</p>
          </div>
          <span className="ops-record-count">{records.length} records</span>
        </div>
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Effective Date</th>
                <th>Holder</th>
                <th>Category</th>
                <th>Action</th>
                <th>Shares</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map(row => (
                <tr key={row.id}>
                  <td>{formatDate(row.effectiveDate)}</td>
                  <td>{row.holderName}</td>
                  <td>{row.category}</td>
                  <td>{row.action === 'add' ? 'Add' : 'Deduct'}</td>
                  <td>{formatNumber(row.shares)}</td>
                  <td><span className={`ops-status ${row.status === 'pending' ? '' : 'good'}`}>{row.status}</span></td>
                </tr>
              ))}
              {!records.length && (
                <tr><td colSpan={6}>No management holdings inputs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
