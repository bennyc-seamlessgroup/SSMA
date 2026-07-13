'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { InternalFloatV2PrivateHolding } from '@/lib/internal-float';
import type { ManagementHoldingAction, ManagementHoldingInputRecord } from '@/lib/operations/management-holdings-store';
import { readPublicImportJson } from '@/lib/public-import-data';
import { managementHoldingsInputFile } from '@/lib/ticker-data';

type ApiPayload = {
  ok: boolean;
  data?: {
    records?: ManagementHoldingInputRecord[];
    workspacePrivateHoldings?: InternalFloatV2PrivateHolding[];
  };
  error?: string;
};

type RecordsTab = 'ownership' | 'suggestions' | 'management';
type CopyTarget = RecordsTab;
type DisplayRecord = ManagementHoldingInputRecord & {
  source: 'operations' | 'workspace';
  editable: boolean;
};

type ManagementHoldingsEnvelope = {
  data?: {
    records?: ManagementHoldingInputRecord[];
  };
  records?: ManagementHoldingInputRecord[];
};

const categories = ['Founder', 'CEO', 'Management', 'Insider', 'Strategic Investor', 'Family Office', 'Long-Term Holder', 'Transfer Agent', 'Other'];

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

function extractManagementRecords(input: unknown) {
  const envelope = input as ManagementHoldingsEnvelope;
  if (Array.isArray(envelope?.data?.records)) return envelope.data.records;
  if (Array.isArray(envelope?.records)) return envelope.records;
  return [];
}

function targetFlags(target: CopyTarget) {
  return {
    showInOwnership: target === 'ownership',
    showAsSuggestion: target === 'suggestions',
    autoApply: target === 'management',
  };
}

function isSuggestedChange(row: ManagementHoldingInputRecord) {
  return row.status === 'pending' && (row.showAsSuggestion || !row.autoApply);
}

export function ManagementHoldingsOperationsClient() {
  const [ticker, setTicker] = useState('CURR');
  const [holderName, setHolderName] = useState('');
  const [category, setCategory] = useState('Strategic Investor');
  const [shares, setShares] = useState('');
  const [action, setAction] = useState<ManagementHoldingAction>('add');
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [showInOwnership, setShowInOwnership] = useState(true);
  const [showAsSuggestion, setShowAsSuggestion] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [records, setRecords] = useState<ManagementHoldingInputRecord[]>([]);
  const [workspacePrivateHoldings, setWorkspacePrivateHoldings] = useState<InternalFloatV2PrivateHolding[]>([]);
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
      const apiRecords = Array.isArray(payload.data?.records) ? payload.data.records : [];
      setRecords(apiRecords);
      setWorkspacePrivateHoldings(Array.isArray(payload.data?.workspacePrivateHoldings) ? payload.data.workspacePrivateHoldings : []);
      try {
        const publicData = await readPublicImportJson<unknown>(managementHoldingsInputFile(nextTicker));
        const publicRecords = extractManagementRecords(publicData);
        if (publicRecords.length >= apiRecords.length) setRecords(publicRecords);
      } catch {
        // Operations can still work from the server API when public S3 is unavailable.
      }
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
    showInOwnership,
    showAsSuggestion,
    autoApply,
  }), [activeTicker, action, autoApply, category, effectiveDate, holderName, shares, showAsSuggestion, showInOwnership]);

  function resetForm() {
    setHolderName('');
    setCategory('Strategic Investor');
    setShares('');
    setAction('add');
    setEffectiveDate(today());
    setNotes('');
    setShowInOwnership(true);
    setShowAsSuggestion(false);
    setAutoApply(false);
    setEditingId(null);
  }

  function editRecord(record: ManagementHoldingInputRecord) {
    setEditingId(record.id);
    setHolderName(record.holderName);
    setCategory(record.category);
    setShares(String(record.shares));
    setAction(record.action);
    setEffectiveDate(record.effectiveDate || today());
    setNotes(record.notes || '');
    setShowInOwnership(record.showInOwnership !== false);
    setShowAsSuggestion(Boolean(record.showAsSuggestion));
    setAutoApply(Boolean(record.autoApply));
    setMessage('');
    setStatus('idle');
  }

  async function deleteRecord(record: ManagementHoldingInputRecord) {
    const confirmed = window.confirm(`Delete ${record.holderName} from management holdings inputs?`);
    if (!confirmed) return;
    setStatus('saving');
    setMessage('');
    try {
      const response = await fetch(`/api/operations/management-holdings?ticker=${encodeURIComponent(activeTicker)}&id=${encodeURIComponent(record.id)}`, {
        method: 'DELETE',
        cache: 'no-store',
      });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Unable to delete record.');
      setRecords(Array.isArray(payload.data?.records) ? payload.data.records : []);
      setWorkspacePrivateHoldings(Array.isArray(payload.data?.workspacePrivateHoldings) ? payload.data.workspacePrivateHoldings : workspacePrivateHoldings);
      if (editingId === record.id) resetForm();
      setStatus('saved');
      setMessage('Record deleted.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to delete record.');
    }
  }

  async function copyRecord(record: DisplayRecord, target: CopyTarget) {
    const flags = targetFlags(target);
    setStatus('saving');
    setMessage('');
    try {
      const response = await fetch('/api/operations/management-holdings', {
        method: 'PUT',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: activeTicker,
          holderName: record.holderName,
          category: record.category,
          shares: record.shares,
          action: record.action,
          effectiveDate: record.effectiveDate || today(),
          notes: [record.notes, `Copied to ${target}.`].filter(Boolean).join(' '),
          ...flags,
          updatedBy: 'operations',
        }),
      });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Unable to copy record.');
      setRecords(Array.isArray(payload.data?.records) ? payload.data.records : []);
      setWorkspacePrivateHoldings(Array.isArray(payload.data?.workspacePrivateHoldings) ? payload.data.workspacePrivateHoldings : workspacePrivateHoldings);
      setStatus('saved');
      setMessage(`Record copied to ${target === 'ownership' ? 'Ownership / Strategic Entities' : target === 'suggestions' ? 'Internal Float / Suggested Changes' : 'Internal Float / Management / Strategic Holdings'}.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to copy record.');
    }
  }

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
    if (!showInOwnership && !showAsSuggestion && !autoApply) {
      setStatus('error');
      setMessage('Select at least one destination for this record.');
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
          id: editingId ?? undefined,
          ticker: activeTicker,
          holderName,
          category,
          shares,
          action,
          effectiveDate,
          notes,
          showInOwnership,
          showAsSuggestion,
          autoApply,
          updatedBy: 'operations',
        }),
      });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Unable to save record.');
      setRecords(Array.isArray(payload.data?.records) ? payload.data.records : []);
      setWorkspacePrivateHoldings(Array.isArray(payload.data?.workspacePrivateHoldings) ? payload.data.workspacePrivateHoldings : workspacePrivateHoldings);
      resetForm();
      setStatus('saved');
      setMessage(autoApply ? 'Record saved and applied directly to Internal Float.' : 'Record saved.');
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
          <input suppressHydrationWarning value={ticker} maxLength={10} onChange={event => setTicker(event.target.value.toUpperCase())} />
        </label>
        <button type="button" onClick={() => loadRecords(activeTicker)} disabled={status === 'loading'}>Load Workspace</button>
        <small>Records are stored per ticker and used by Ownership and Internal Float.</small>
      </div>

      <div className="ops-sec-grid">
        <section className="ops-panel">
          <div className="ops-panel-head">
            <div>
              <h2>Management Holdings Inputs</h2>
              <p>Control whether each management holding record appears in Ownership, Internal Float suggestions, or direct Management / Strategic holdings.</p>
            </div>
          </div>
          <form className="ops-sec-form" onSubmit={saveRecord}>
            <div className="ops-form-grid three ops-management-input-grid">
              <label>
                <span>Holder / Entity</span>
                <input suppressHydrationWarning value={holderName} onChange={event => setHolderName(event.target.value)} />
              </label>
              <label>
                <span>Category</span>
                <select suppressHydrationWarning className="ops-select" value={category} onChange={event => setCategory(event.target.value)}>
                  {categories.map(option => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label>
                <span>Action</span>
                <select suppressHydrationWarning className="ops-select" value={action} onChange={event => setAction(event.target.value as ManagementHoldingAction)}>
                  <option value="add">Add shares</option>
                  <option value="deduct">Deduct shares</option>
                </select>
              </label>
              <label>
                <span>Shares</span>
                <input suppressHydrationWarning inputMode="numeric" value={shares} onChange={event => setShares(event.target.value)} />
              </label>
              <label>
                <span>Effective Date</span>
                <input suppressHydrationWarning type="date" value={effectiveDate} onChange={event => setEffectiveDate(event.target.value)} />
              </label>
            </div>
            <fieldset className="ops-destination-fieldset">
              <legend>Record destinations</legend>
              <div className="ops-destination-grid">
                <label className="ops-check-row">
                  <input suppressHydrationWarning type="checkbox" checked={showInOwnership} onChange={event => setShowInOwnership(event.target.checked)} />
                  <span>
                    <strong>Show on Ownership page</strong>
                    <small>Included in Strategic Entities and the Public Float calculation.</small>
                  </span>
                </label>
                <label className="ops-check-row">
                  <input suppressHydrationWarning type="checkbox" checked={showAsSuggestion} onChange={event => setShowAsSuggestion(event.target.checked)} />
                  <span>
                    <strong>Show in Suggested Changes</strong>
                    <small>Requires company review inside Internal Float.</small>
                  </span>
                </label>
                <label className="ops-check-row">
                  <input suppressHydrationWarning type="checkbox" checked={autoApply} onChange={event => setAutoApply(event.target.checked)} />
                  <span>
                    <strong>Apply to Management / Strategic</strong>
                    <small>For initial historical setup or approved direct changes.</small>
                  </span>
                </label>
              </div>
            </fieldset>
            <label>
              <span>Notes</span>
              <textarea suppressHydrationWarning rows={3} value={notes} onChange={event => setNotes(event.target.value)} />
            </label>
            {message && <p className={`ops-form-message ${status === 'error' ? 'bad' : 'good'}`}>{message}</p>}
            <div className="ops-form-footer">
              <span>{preview.action === 'add' ? '+' : '-'}{formatNumber(preview.shares)} shares · {[
                preview.showInOwnership ? 'ownership' : '',
                preview.showAsSuggestion ? 'suggestion' : '',
                preview.autoApply ? 'direct apply' : '',
              ].filter(Boolean).join(' / ') || 'no destination selected'}</span>
              {editingId && <button className="button secondary" type="button" onClick={resetForm}>Cancel Edit</button>}
              <button className="ops-primary-button" type="submit" disabled={status === 'saving'}>
                {status === 'saving' ? 'Saving...' : editingId ? 'Update Record' : 'Save Record'}
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
              <div><dt>Ownership</dt><dd>{preview.showInOwnership ? 'Visible' : 'Hidden'}</dd></div>
              <div><dt>Suggestion</dt><dd>{preview.showAsSuggestion ? 'Visible' : 'Hidden'}</dd></div>
              <div><dt>Management / Strategic</dt><dd>{preview.autoApply ? 'Direct apply' : 'No direct apply'}</dd></div>
            </dl>
          </section>
        </aside>
      </div>

      <ManagementRecordsPanel records={records} workspacePrivateHoldings={workspacePrivateHoldings} onEdit={editRecord} onCopy={copyRecord} onDelete={deleteRecord} />
    </div>
  );
}

function ManagementRecordsPanel({
  records,
  workspacePrivateHoldings,
  onEdit,
  onCopy,
  onDelete,
}: {
  records: ManagementHoldingInputRecord[];
  workspacePrivateHoldings: InternalFloatV2PrivateHolding[];
  onEdit: (record: ManagementHoldingInputRecord) => void;
  onCopy: (record: DisplayRecord, target: CopyTarget) => void;
  onDelete: (record: ManagementHoldingInputRecord) => void;
}) {
  const [activeTab, setActiveTab] = useState<RecordsTab>('ownership');
  const [pageByTab, setPageByTab] = useState<Record<RecordsTab, number>>({ ownership: 1, suggestions: 1, management: 1 });
  const operationDisplayRecords = records.map(row => ({ ...row, source: 'operations' as const, editable: true }));
  const workspaceDisplayRecords = workspacePrivateHoldings.map(row => ({
    id: `workspace-${row.id}`,
    ticker: records[0]?.ticker ?? 'CURR',
    holderName: row.holderName,
    category: row.category,
    shares: row.shares,
    action: 'add' as ManagementHoldingAction,
    notes: row.notes,
    effectiveDate: '',
    showInOwnership: false,
    showAsSuggestion: false,
    autoApply: true,
    status: 'applied' as const,
    createdAt: '',
    updatedAt: '',
    updatedBy: 'Internal Float workspace',
    source: 'workspace' as const,
    editable: false,
  }));
  const recordsByTab: Record<RecordsTab, DisplayRecord[]> = {
    ownership: operationDisplayRecords.filter(row => row.showInOwnership !== false && row.status !== 'discarded'),
    suggestions: operationDisplayRecords.filter(isSuggestedChange),
    management: workspaceDisplayRecords.length
      ? workspaceDisplayRecords
      : operationDisplayRecords.filter(row => row.autoApply && row.status !== 'discarded'),
  };
  const tabDetails: Record<RecordsTab, { label: string; path: string; description: string }> = {
    ownership: {
      label: 'Strategic Entities',
      path: 'Ownership / Strategic Entities',
      description: 'Records included in the Ownership page Strategic Entities section.',
    },
    suggestions: {
      label: 'Suggested Changes',
      path: 'Internal Float / Suggested Changes',
      description: 'Pending records shown in Internal Float for company review.',
    },
    management: {
      label: 'Management / Strategic',
      path: 'Internal Float / Management / Strategic Holdings',
      description: 'Current Management / Strategic holdings shown in Internal Float.',
    },
  };
  const pageSize = 7;
  const visibleRecords = recordsByTab[activeTab];
  const totalPages = Math.max(1, Math.ceil(visibleRecords.length / pageSize));
  const currentPage = Math.min(pageByTab[activeTab], totalPages);
  const pagedRecords = visibleRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const setPage = (page: number) => setPageByTab(previous => ({ ...previous, [activeTab]: Math.max(1, Math.min(page, totalPages)) }));

  return (
    <section className="ops-panel ops-wide-panel">
      <div className="ops-panel-head">
        <div>
          <h2>Management Holdings Records</h2>
          <p>{tabDetails[activeTab].description}</p>
        </div>
        <span className="ops-record-count">{visibleRecords.length} records</span>
      </div>
      <div className="ops-record-tabs" role="tablist" aria-label="Management holding destinations">
        {(Object.keys(tabDetails) as RecordsTab[]).map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={activeTab === tab ? 'is-active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tabDetails[tab].label} <span>{recordsByTab[tab].length}</span>
            <small>{tabDetails[tab].path}</small>
          </button>
        ))}
      </div>
      <div className="ops-table-wrap">
        <table className="ops-table ops-management-table">
          <thead>
            <tr>
              <th>Effective Date</th>
              <th>Holder</th>
              <th>Category</th>
              <th>Action</th>
              <th>Shares</th>
              <th>Status</th>
              <th>Destinations</th>
              <th>Tools</th>
            </tr>
          </thead>
          <tbody>
            {pagedRecords.map(row => (
              <tr key={row.id}>
                <td>{row.effectiveDate ? formatDate(row.effectiveDate) : 'Workspace'}</td>
                <td>{row.holderName}</td>
                <td>{row.category}</td>
                <td>{row.action === 'add' ? 'Add' : 'Deduct'}</td>
                <td>{formatNumber(row.shares)}</td>
                <td><span className={`ops-status ${row.status === 'pending' ? '' : 'good'}`}>{row.source === 'workspace' ? 'workspace' : row.status}</span></td>
                <td>
                  <div className="ops-destination-tags">
                    {row.source === 'workspace' ? <span>Internal Float</span> : (
                      <>
                        {row.showInOwnership !== false && <span>Ownership</span>}
                        {row.showAsSuggestion && <span>Suggestion</span>}
                        {row.autoApply && <span>Management</span>}
                      </>
                    )}
                  </div>
                </td>
                <td>
                  <div className="ops-row-actions">
                    <RowActionsMenu row={row} activeTab={activeTab} onEdit={onEdit} onCopy={onCopy} onDelete={onDelete} />
                  </div>
                </td>
              </tr>
            ))}
            {!visibleRecords.length && (
              <tr><td colSpan={8}>No records in this section.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {visibleRecords.length > pageSize && (
        <div className="ops-pagination">
          <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
          <span>Page {currentPage} of {totalPages}</span>
          <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
        </div>
      )}
    </section>
  );
}

function RowActionsMenu({
  row,
  activeTab,
  onEdit,
  onCopy,
  onDelete,
}: {
  row: DisplayRecord;
  activeTab: RecordsTab;
  onEdit: (record: ManagementHoldingInputRecord) => void;
  onCopy: (record: DisplayRecord, target: CopyTarget) => void;
  onDelete: (record: ManagementHoldingInputRecord) => void;
}) {
  const copyTargetOptions: Array<{ key: CopyTarget; label: string }> = [
    { key: 'ownership', label: 'Copy to Strategic Entities' },
    { key: 'suggestions', label: 'Copy to Suggested Changes' },
    { key: 'management', label: 'Copy to Management / Strategic' },
  ];
  const copyTargets = copyTargetOptions.filter(target => target.key !== activeTab);

  return (
    <details className="ops-row-menu">
      <summary aria-label={`Open actions for ${row.holderName}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </summary>
      <div className="ops-row-menu__panel">
        {row.editable && <button type="button" onClick={() => onEdit(row)}>Edit</button>}
        {copyTargets.map(target => (
          <button key={target.key} type="button" onClick={() => onCopy(row, target.key)}>{target.label}</button>
        ))}
        {row.editable ? (
          <button type="button" className="danger" onClick={() => onDelete(row)}>Delete</button>
        ) : (
          <small>Workspace row is read-only here</small>
        )}
      </div>
    </details>
  );
}
