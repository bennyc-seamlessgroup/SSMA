'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { InternalFloatPrivateHolding } from '@/lib/internal-float-types';
import type { ManagementHoldingAction, ManagementHoldingInputRecord } from '@/lib/operations/data-types';
import {
  buildOwnershipSubmission,
  calculateOwnershipDifference,
  currentHoldersFromRecords,
  NEW_HOLDER_VALUE,
  parseShareTotal,
  signedRecordDifference,
  toManagementHoldingWritePayload,
  validateOwnershipEntry,
  type CurrentOwnershipHolder,
} from '@/lib/operations/ownership-entry.js';
import { authenticatedFetch } from '@/lib/auth-client';
import { OperationsDevelopmentData } from '@/components/OperationsDevelopmentData';
import { getOperationsTicker } from '@/lib/operations/ticker-client';

type ApiPayload = {
  ok: boolean;
  data?: {
    records?: ManagementHoldingInputRecord[];
    workspacePrivateHoldings?: InternalFloatPrivateHolding[];
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

type OwnershipCurrentEnvelope = {
  strategicEntities?: {
    records?: ManagementHoldingInputRecord[];
  };
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

function formatSignedShares(value: unknown) {
  const parsed = numeric(value);
  return `${parsed > 0 ? '+' : parsed < 0 ? '-' : ''}${formatNumber(Math.abs(parsed))}`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || 'N/A';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function extractManagementRecords(input: unknown) {
  if (Array.isArray(input)) return input as ManagementHoldingInputRecord[];
  const envelope = input as ManagementHoldingsEnvelope;
  if (Array.isArray(envelope?.data?.records)) return envelope.data.records;
  if (Array.isArray(envelope?.records)) return envelope.records;
  return [];
}

function normalizeApiRecord(input: Partial<ManagementHoldingInputRecord>, ticker: string): ManagementHoldingInputRecord {
  const now = new Date().toISOString();
  const audit = input as Partial<ManagementHoldingInputRecord> & { createdBy?: string };
  return {
    id: String(input.id ?? ''),
    ticker,
    holderName: String(input.holderName ?? 'Unnamed holder'),
    category: String(input.category ?? 'Strategic Investor'),
    shares: numeric(input.shares),
    action: input.action === 'deduct' ? 'deduct' : 'add',
    notes: String(input.notes ?? ''),
    effectiveDate: String(input.effectiveDate ?? today()),
    showInOwnership: input.showInOwnership === false ? false : true,
    showAsSuggestion: Boolean(input.showAsSuggestion),
    autoApply: Boolean(input.autoApply),
    status: input.status === 'applied' || input.status === 'discarded' ? input.status : 'pending',
    createdAt: String(input.createdAt ?? now),
    updatedAt: String(input.updatedAt ?? now),
    updatedBy: String(input.updatedBy ?? audit.createdBy ?? 'operations'),
    entryMode: input.entryMode === 'existing' || input.entryMode === 'new' ? input.entryMode : undefined,
    holderReferenceId: input.holderReferenceId ? String(input.holderReferenceId) : undefined,
    previousShares: input.previousShares === undefined ? undefined : numeric(input.previousShares),
    latestTotalShares: input.latestTotalShares === undefined ? undefined : numeric(input.latestTotalShares),
    sharesChange: input.sharesChange === undefined ? undefined : numeric(input.sharesChange),
    changeType: input.changeType === 'increase' || input.changeType === 'decrease' || input.changeType === 'no-change' ? input.changeType : undefined,
    sharesSemantics: input.sharesSemantics === 'total' ? 'total' : input.sharesSemantics === 'delta' ? 'delta' : undefined,
  };
}

function normalizeApiRecords(input: unknown, ticker: string) {
  return extractManagementRecords(input)
    .map(row => normalizeApiRecord(row, ticker))
    .filter(row => row.id || row.holderName);
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
  const [holderSelection, setHolderSelection] = useState('');
  const [holderName, setHolderName] = useState('');
  const [category, setCategory] = useState('Strategic Investor');
  const [latestTotalShares, setLatestTotalShares] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [showInOwnership, setShowInOwnership] = useState(true);
  const [showAsSuggestion, setShowAsSuggestion] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const [records, setRecords] = useState<ManagementHoldingInputRecord[]>([]);
  const [currentHolderRecords, setCurrentHolderRecords] = useState<ManagementHoldingInputRecord[]>([]);
  const [workspacePrivateHoldings, setWorkspacePrivateHoldings] = useState<InternalFloatPrivateHolding[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'error' | 'saved'>('idle');
  const [message, setMessage] = useState('');
  const [developmentPayload, setDevelopmentPayload] = useState<unknown>();
  const [developmentOwnershipPayload, setDevelopmentOwnershipPayload] = useState<unknown>();
  const [developmentTicker, setDevelopmentTicker] = useState('CURR');

  const activeTicker = ticker.trim().toUpperCase() || 'CURR';
  const entryMode = holderSelection === NEW_HOLDER_VALUE ? 'new' : 'existing';
  const currentHolders = useMemo(() => currentHoldersFromRecords(currentHolderRecords.length ? currentHolderRecords : records), [currentHolderRecords, records]);
  const selectedHolder = currentHolders.find(holder => holder.key === holderSelection);

  async function loadRecords(nextTicker = activeTicker) {
    setStatus('loading');
    setMessage('');
    setDevelopmentPayload(undefined);
    setDevelopmentOwnershipPayload(undefined);
    setDevelopmentTicker(nextTicker.trim().toUpperCase() || 'CURR');
    try {
      const [payload, ownershipResult] = await Promise.all([
        authenticatedFetch(`/manual-input/management-holdings?ticker=${encodeURIComponent(nextTicker)}`, { cache: 'no-store' }),
        authenticatedFetch(`/market-data/current?ticker=${encodeURIComponent(nextTicker)}&category=ownership-current`, { cache: 'no-store' })
          .then(value => ({ value, error: '' }))
          .catch(error => ({ value: undefined, error: error instanceof Error ? error.message : 'Unable to load current ownership snapshot.' })),
      ]);
      setDevelopmentPayload(payload);
      const nextRecords = normalizeApiRecords(payload, nextTicker);
      const ownershipPayload = ownershipResult.value as OwnershipCurrentEnvelope | undefined;
      const ownershipRecords = normalizeApiRecords(ownershipPayload?.strategicEntities?.records ?? [], nextTicker);
      const workspaceRows = (payload as ApiPayload)?.data?.workspacePrivateHoldings;
      setRecords(nextRecords);
      setCurrentHolderRecords(ownershipRecords.length ? ownershipRecords : nextRecords);
      setWorkspacePrivateHoldings(Array.isArray(workspaceRows) ? workspaceRows : []);
      setDevelopmentOwnershipPayload(ownershipResult.error ? { error: ownershipResult.error, fallback: 'management-holdings records' } : ownershipResult.value);
      setHolderSelection('');
      setLatestTotalShares('');
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to load records.');
    }
  }

  useEffect(() => {
    const storedTicker = getOperationsTicker();
    setTicker(storedTicker);
    loadRecords(storedTicker);
    // Initial operations workspace load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsedLatestTotal = parseShareTotal(latestTotalShares, { allowZero: entryMode === 'existing' });
  const previewDifference = calculateOwnershipDifference(
    selectedHolder?.priorTotalShares ?? 0,
    parsedLatestTotal.valid ? parsedLatestTotal.value : 0,
  );
  const preview = {
    ticker: activeTicker,
    holderName: entryMode === 'existing' ? selectedHolder?.holderName ?? 'Select a holder' : holderName.trim() || 'New holder name',
    category: entryMode === 'existing' ? selectedHolder?.category ?? 'N/A' : category,
    effectiveDate,
    showInOwnership,
    showAsSuggestion,
    autoApply,
  };

  function resetForm() {
    setHolderSelection('');
    setHolderName('');
    setCategory('Strategic Investor');
    setLatestTotalShares('');
    setEffectiveDate(today());
    setNotes('');
    setShowInOwnership(true);
    setShowAsSuggestion(false);
    setAutoApply(false);
  }

  function useExistingHolder(record: ManagementHoldingInputRecord) {
    const holder = currentHolders.find(candidate => candidate.key === record.holderName.trim().toLocaleLowerCase().replace(/\s+/g, ' '));
    if (!holder) return;
    setHolderSelection(holder.key);
    setLatestTotalShares('');
    setEffectiveDate(today());
    setNotes('');
    setShowInOwnership(record.showInOwnership !== false);
    setShowAsSuggestion(Boolean(record.showAsSuggestion));
    setAutoApply(Boolean(record.autoApply));
    setMessage('');
    setStatus('idle');
    document.querySelector('.ops-management-entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function deleteRecord(record: ManagementHoldingInputRecord) {
    const confirmed = window.confirm(`Delete ${record.holderName} from management holdings inputs?`);
    if (!confirmed) return;
    setStatus('saving');
    setMessage('');
    try {
      await authenticatedFetch(`/manual-input/management-holdings?ticker=${encodeURIComponent(activeTicker)}&id=${encodeURIComponent(record.id)}`, {
        method: 'DELETE',
      });
      await loadRecords(activeTicker);
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
      await authenticatedFetch(`/manual-input/management-holdings?ticker=${encodeURIComponent(activeTicker)}`, {
        method: 'POST',
        body: JSON.stringify(toManagementHoldingWritePayload({
          holderName: record.holderName,
          category: record.category,
          shares: record.shares,
          action: record.action,
          effectiveDate: record.effectiveDate || today(),
          notes: [record.notes, `Copied to ${target}.`].filter(Boolean).join(' '),
          ...flags,
          source: 'operations-input',
          status: 'pending',
        })),
      });
      await loadRecords(activeTicker);
      setStatus('saved');
      setMessage(`Record copied to ${target === 'ownership' ? 'Ownership / Strategic Entities' : target === 'suggestions' ? 'Internal Float / Suggested Changes' : 'Internal Float / Management / Strategic Holdings'}.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to copy record.');
    }
  }

  async function saveRecord(event: FormEvent) {
    event.preventDefault();
    const validation = validateOwnershipEntry({
      mode: entryMode,
      holderName,
      holderSelection,
      latestTotalShares,
      currentHolders,
    });
    if (!validation.valid) {
      setStatus('error');
      setMessage(validation.error);
      return;
    }
    if (!showInOwnership && !showAsSuggestion && !autoApply) {
      setStatus('error');
      setMessage('Select at least one destination for this record.');
      return;
    }

    setStatus('saving');
    setMessage('');
    const payload = buildOwnershipSubmission({
      mode: entryMode,
      holder: validation.holder,
      holderName,
      category,
      latestTotalShares: validation.value,
      effectiveDate,
      notes,
      showInOwnership,
      showAsSuggestion,
      autoApply,
    });
    try {
      await authenticatedFetch(`/manual-input/management-holdings?ticker=${encodeURIComponent(activeTicker)}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await loadRecords(activeTicker);
      resetForm();
      setStatus('saved');
      const stateLabel = previewDifference.state === 'increase' ? 'increase' : previewDifference.state === 'decrease' ? 'decrease' : 'no-change filing';
      setMessage(`${payload.holderName} saved as a ${stateLabel}. Current total: ${formatNumber(validation.value)} shares.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to save record.');
    }
  }

  return (
    <div className="ops-management-workspace">
      <div className="ops-sec-grid">
        <section className="ops-panel ops-management-entry-form">
          <div className="ops-panel-head">
            <div>
              <h2>Record Latest 13/F Holding</h2>
              <p>Select the holder and enter the latest total shares reported. The change is calculated automatically.</p>
            </div>
          </div>
          <form className="ops-sec-form" onSubmit={saveRecord}>
            <div className="ops-form-grid two ops-management-input-grid">
              <label>
                <span>Holder</span>
                <select
                  suppressHydrationWarning
                  className="ops-select"
                  value={holderSelection}
                  onChange={event => {
                    setHolderSelection(event.target.value);
                    setLatestTotalShares('');
                    setMessage('');
                    setStatus('idle');
                  }}
                  aria-describedby="ownership-holder-help"
                >
                  <option value="">Select an existing holder</option>
                  {currentHolders.map(holder => (
                    <option key={holder.key} value={holder.key}>{holder.holderName}</option>
                  ))}
                  <option value={NEW_HOLDER_VALUE}>+ New Holder</option>
                </select>
                <small id="ownership-holder-help">Choose from the current strategic holder list or create a new holder.</small>
              </label>
              <label>
                <span>Effective Date</span>
                <input suppressHydrationWarning type="date" value={effectiveDate} onChange={event => setEffectiveDate(event.target.value)} />
              </label>
            </div>
            {entryMode === 'existing' && selectedHolder && (
              <div className="ops-holder-identity" aria-live="polite">
                <div><span>Holder identity</span><strong>{selectedHolder.holderName}</strong></div>
                <div><span>Category</span><strong>{selectedHolder.category}</strong></div>
                <div><span>Prior total shares</span><strong>{formatNumber(selectedHolder.priorTotalShares)}</strong></div>
              </div>
            )}
            {entryMode === 'new' && (
              <div className="ops-form-grid two ops-management-input-grid">
                <label>
                  <span>New Holder / Entity Name</span>
                  <input suppressHydrationWarning value={holderName} onChange={event => setHolderName(event.target.value)} autoComplete="off" />
                </label>
                <label>
                  <span>Category</span>
                  <select suppressHydrationWarning className="ops-select" value={category} onChange={event => setCategory(event.target.value)}>
                    {categories.map(option => <option key={option}>{option}</option>)}
                  </select>
                </label>
              </div>
            )}
            <div className="ops-latest-total-row">
              <label>
                <span>{entryMode === 'new' ? 'Initial Total Shares' : 'Latest Total Shares'}</span>
                <input
                  suppressHydrationWarning
                  inputMode="numeric"
                  value={latestTotalShares}
                  onChange={event => {
                    setLatestTotalShares(event.target.value);
                    if (status === 'error') {
                      setStatus('idle');
                      setMessage('');
                    }
                  }}
                  placeholder="Enter the total shown in the filing"
                  aria-invalid={Boolean(latestTotalShares && !parsedLatestTotal.valid)}
                  aria-describedby="ownership-total-help"
                  disabled={entryMode === 'existing' && !selectedHolder}
                />
                <small id="ownership-total-help">Use the total shares held from the latest filing, not the reported increase or reduction.</small>
              </label>
              <div className={`ops-difference-card is-${previewDifference.state}`} aria-live="polite">
                <span>Calculated difference</span>
                <strong>{parsedLatestTotal.valid ? formatSignedShares(previewDifference.signedDifference) : '—'} shares</strong>
                <small>{!parsedLatestTotal.valid
                  ? 'Enter a valid total to calculate the change.'
                  : previewDifference.state === 'increase'
                    ? 'Increase — latest total is above the prior holding.'
                    : previewDifference.state === 'decrease'
                      ? 'Decrease — latest total is below the prior holding.'
                      : 'No change — latest total matches the prior holding.'}</small>
              </div>
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
              <span>{parsedLatestTotal.valid ? `${formatSignedShares(previewDifference.signedDifference)} suggested delta` : 'Awaiting latest total'} · {[
                preview.showInOwnership ? 'ownership' : '',
                preview.showAsSuggestion ? 'suggestion' : '',
                preview.autoApply ? 'direct apply' : '',
              ].filter(Boolean).join(' / ') || 'no destination selected'}</span>
              <button className="ops-primary-button" type="submit" disabled={status === 'saving'}>
                {status === 'saving' ? 'Saving...' : 'Save Latest Total'}
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
              <div><dt>Entry</dt><dd>{entryMode === 'new' ? 'New holder' : 'Existing holder update'}</dd></div>
              <div><dt>Prior Total</dt><dd>{entryMode === 'existing' && selectedHolder ? formatNumber(selectedHolder.priorTotalShares) : 'Not applicable'}</dd></div>
              <div><dt>Latest Total</dt><dd>{parsedLatestTotal.valid ? formatNumber(parsedLatestTotal.value) : 'Awaiting input'}</dd></div>
              <div><dt>Suggested Delta</dt><dd className={`ops-delta-value is-${previewDifference.state}`}>{parsedLatestTotal.valid ? formatSignedShares(previewDifference.signedDifference) : '—'}</dd></div>
              <div><dt>Ownership</dt><dd>{preview.showInOwnership ? 'Visible' : 'Hidden'}</dd></div>
              <div><dt>Suggestion</dt><dd>{preview.showAsSuggestion ? 'Visible' : 'Hidden'}</dd></div>
              <div><dt>Management / Strategic</dt><dd>{preview.autoApply ? 'Direct apply' : 'No direct apply'}</dd></div>
            </dl>
          </section>
        </aside>
      </div>

      <ManagementRecordsPanel records={records} workspacePrivateHoldings={workspacePrivateHoldings} onUseHolder={useExistingHolder} onCopy={copyRecord} onDelete={deleteRecord} />

      <OperationsDevelopmentData
        title="Management Holdings API Response"
        description="Raw authenticated response used to populate the ownership operations workspace."
        rows={[
          {
            endpoint: `GET /manual-input/management-holdings?ticker=${developmentTicker}`,
            source: 'API Gateway',
            state: status === 'error' && message ? `error: ${message}` : status,
            recordCount: developmentPayload === undefined || status === 'error' ? undefined : extractManagementRecords(developmentPayload).length,
            payload: developmentPayload,
          },
          {
            endpoint: `GET /market-data/current?ticker=${developmentTicker}&category=ownership-current`,
            source: 'API Gateway',
            state: developmentOwnershipPayload && typeof developmentOwnershipPayload === 'object' && 'error' in developmentOwnershipPayload ? 'fallback' : status,
            recordCount: currentHolderRecords.length,
            payload: developmentOwnershipPayload,
          },
        ]}
      />
    </div>
  );
}

function ManagementRecordsPanel({
  records,
  workspacePrivateHoldings,
  onUseHolder,
  onCopy,
  onDelete,
}: {
  records: ManagementHoldingInputRecord[];
  workspacePrivateHoldings: InternalFloatPrivateHolding[];
  onUseHolder: (record: ManagementHoldingInputRecord) => void;
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
  const pageSize = 25;
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
              <th>Calculated Change</th>
              <th>Reported Total</th>
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
                <td>
                  {row.source === 'workspace' ? 'Current holding' : (
                    <span className={`ops-delta-value is-${signedRecordDifference(row) > 0 ? 'increase' : signedRecordDifference(row) < 0 ? 'decrease' : 'no-change'}`}>
                      {formatSignedShares(signedRecordDifference(row))}
                    </span>
                  )}
                </td>
                <td>{row.source === 'workspace' ? formatNumber(row.shares) : row.latestTotalShares === undefined ? 'Legacy record' : formatNumber(row.latestTotalShares)}</td>
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
                    <RowActionsMenu row={row} activeTab={activeTab} onUseHolder={onUseHolder} onCopy={onCopy} onDelete={onDelete} />
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
  onUseHolder,
  onCopy,
  onDelete,
}: {
  row: DisplayRecord;
  activeTab: RecordsTab;
  onUseHolder: (record: ManagementHoldingInputRecord) => void;
  onCopy: (record: DisplayRecord, target: CopyTarget) => void;
  onDelete: (record: ManagementHoldingInputRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const copyTargetOptions: Array<{ key: CopyTarget; label: string }> = [
    { key: 'ownership', label: 'Copy to Strategic Entities' },
    { key: 'suggestions', label: 'Copy to Suggested Changes' },
    { key: 'management', label: 'Copy to Management / Strategic' },
  ];
  const copyTargets = copyTargetOptions.filter(target => target.key !== activeTab);

  function positionPanel() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const triggerRect = trigger.getBoundingClientRect();
    const panelWidth = panelRef.current?.offsetWidth ?? 240;
    const panelHeight = panelRef.current?.offsetHeight ?? 190;
    const gap = 6;
    const left = Math.max(8, Math.min(triggerRect.right - panelWidth, window.innerWidth - panelWidth - 8));
    const top = triggerRect.bottom + gap + panelHeight <= window.innerHeight
      ? triggerRect.bottom + gap
      : Math.max(8, triggerRect.top - panelHeight - gap);
    setPanelPosition({ top, left });
  }

  useEffect(() => {
    if (!open) return;
    positionPanel();
    const frame = window.requestAnimationFrame(positionPanel);
    const closeMenu = () => setOpen(false);
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) closeMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function runAction(action: () => void) {
    setOpen(false);
    action();
  }

  function toggleMenu() {
    if (open) {
      setOpen(false);
      return;
    }
    positionPanel();
    setOpen(true);
  }

  return (
    <div className="ops-row-menu">
      <button
        ref={triggerRef}
        className="ops-row-menu__trigger"
        type="button"
        aria-label={`Open actions for ${row.holderName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggleMenu}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          className="ops-row-menu__panel ops-row-menu__panel--portal"
          role="menu"
          style={{ top: panelPosition.top, left: panelPosition.left }}
        >
          {row.editable && row.showInOwnership !== false && row.status !== 'discarded' && (
            <button role="menuitem" type="button" onClick={() => runAction(() => onUseHolder(row))}>Record latest total for holder</button>
          )}
          {copyTargets.map(target => (
            <button role="menuitem" key={target.key} type="button" onClick={() => runAction(() => onCopy(row, target.key))}>{target.label}</button>
          ))}
          {row.editable ? (
            <button role="menuitem" type="button" className="danger" onClick={() => runAction(() => onDelete(row))}>Delete</button>
          ) : (
            <small>Workspace row is read-only here</small>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
