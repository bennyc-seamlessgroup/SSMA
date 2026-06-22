'use client';

import { authenticatedFetch } from '@/lib/auth-client';
import { useEffect, useMemo, useState } from 'react';

type SecFilingRecord = {
  id: string;
  ticker: string;
  companyName: string;
  formType: string;
  formDescription: string;
  filingDate: string;
  reportingDate: string;
  act: string;
  filmNumber: string;
  fileNumber: string;
  accessionNumber: string;
  filingsUrl: string;
  notes: string;
  createdAt: string;
  createdBy: string;
};

type SecFilingLogEntry = {
  id: string;
  action: 'created' | 'updated';
  accessionNumber: string;
  formType: string;
  filingDate: string;
  savedAt: string;
  savedBy: string;
};

type SecFilingsResponse = {
  storage?: 'api' | 's3' | 'local';
  s3Key?: string;
  updatedAt: string;
  records: SecFilingRecord[];
  log: SecFilingLogEntry[];
};

type SortKey = 'formType' | 'formDescription' | 'filingDate' | 'reportingDate' | 'accessionNumber';
type SortDirection = 'asc' | 'desc';

const initialForm = {
  ticker: 'CURR',
  companyName: 'CURRENC Group Inc.',
  formType: '',
  formDescription: '',
  filingDate: '',
  reportingDate: '',
  act: '',
  filmNumber: '',
  fileNumber: '',
  accessionNumber: '',
  filingsUrl: '',
  notes: '',
  createdBy: 'operations',
};

const recordsPageSize = 25;

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

function normalizeApiEnvelope(payload: unknown): SecFilingsResponse {
  const envelope = payload as Partial<SecFilingsResponse> & {
    data?: Array<{
      title?: string;
      formType?: string;
      url?: string;
      excerpt?: string;
      publishDate?: string;
      publishAt?: string;
      sourcePlatform?: string;
    }>;
  };

  const legacyRows = Array.isArray(envelope.data) ? envelope.data : [];
  const records = Array.isArray(envelope.records)
    ? envelope.records
    : legacyRows.map((row, index) => ({
      id: `${row.formType ?? 'filing'}-${row.publishDate ?? index}-${index}`,
      ticker: 'CURR',
      companyName: 'CURRENC Group Inc.',
      formType: row.formType ?? '',
      formDescription: row.title ?? row.excerpt ?? '',
      filingDate: row.publishDate ?? '',
      reportingDate: '',
      act: '',
      filmNumber: '',
      fileNumber: '',
      accessionNumber: '',
      filingsUrl: row.url ?? '',
      notes: row.excerpt ?? '',
      createdAt: row.publishAt ?? '',
      createdBy: row.sourcePlatform ?? 'import-data',
    }));

  return {
    storage: 'api',
    s3Key: envelope.s3Key ?? 'news_filings/CURR_sec_filings.json',
    updatedAt: envelope.updatedAt ?? new Date().toISOString(),
    records,
    log: Array.isArray(envelope.log) ? envelope.log : [],
  };
}

export function SecFilingsOperationsClient() {
  const [form, setForm] = useState(initialForm);
  const [data, setData] = useState<SecFilingsResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [deletingKey, setDeletingKey] = useState('');
  const [recordsSearch, setRecordsSearch] = useState('');
  const [recordsPage, setRecordsPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('filingDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  async function loadRecords() {
    setStatus('loading');
    try {
      const payload = await authenticatedFetch('/sec-filings', { cache: 'no-store' });
      setData(normalizeApiEnvelope(payload));
      setStatus('idle');
      setMessage('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to load SEC filing records.');
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  const requiredReady = useMemo(() => {
    return Boolean(form.formType && form.formDescription && form.filingDate && form.accessionNumber && form.filingsUrl);
  }, [form]);

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm(current => ({ ...current, [field]: value }));
  }

  function toggleSort(nextKey: SortKey) {
    setRecordsPage(1);
    setSortKey(currentKey => {
      if (currentKey === nextKey) {
        setSortDirection(currentDirection => currentDirection === 'asc' ? 'desc' : 'asc');
        return currentKey;
      }
      setSortDirection(nextKey === 'filingDate' || nextKey === 'reportingDate' ? 'desc' : 'asc');
      return nextKey;
    });
  }

  async function saveRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    try {
      const payload = await authenticatedFetch('/sec-filings', {
        method: 'PUT',
        body: JSON.stringify([form]),
      });
      const nextData = normalizeApiEnvelope(payload);
      setData(nextData);
      setStatus('saved');
      setMessage('Record saved to CURR_sec_filings.json through the backend API.');
      setForm(current => ({
        ...initialForm,
        ticker: current.ticker,
        companyName: current.companyName,
        createdBy: current.createdBy,
      }));
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to save SEC filing record.');
    }
  }

  async function deleteRecord(record: SecFilingRecord) {
    const key = record.accessionNumber || record.id;
    if (!key) {
      setStatus('error');
      setMessage('Unable to delete record without accession number or ID.');
      return;
    }

    setDeletingKey(key);
    setStatus('saving');
    setMessage('');

    try {
      const query = record.accessionNumber
        ? `accessionNumber=${encodeURIComponent(record.accessionNumber)}`
        : `id=${encodeURIComponent(record.id)}`;
      const payload = await authenticatedFetch(`/sec-filings?${query}`, { method: 'DELETE' });
      setData(normalizeApiEnvelope(payload));
      setStatus('saved');
      setMessage(`Deleted ${record.formType} · ${key}.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to delete SEC filing record.');
    } finally {
      setDeletingKey('');
    }
  }

  const records = data?.records ?? [];
  const log = data?.log ?? [];
  const filteredRecords = useMemo(() => {
    const query = recordsSearch.trim().toLowerCase();
    const searched = query
      ? records.filter(record => [
        record.formType,
        record.formDescription,
        record.filingDate,
        record.reportingDate,
        record.accessionNumber,
        record.filingsUrl,
        record.notes,
      ].some(value => String(value ?? '').toLowerCase().includes(query)))
      : records;

    return [...searched].sort((a, b) => {
      const left = String(a[sortKey] ?? '').toLowerCase();
      const right = String(b[sortKey] ?? '').toLowerCase();
      const comparison = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [records, recordsSearch, sortDirection, sortKey]);
  const recordsPageCount = Math.max(1, Math.ceil(filteredRecords.length / recordsPageSize));
  const safeRecordsPage = Math.min(recordsPage, recordsPageCount);
  const pageStartIndex = (safeRecordsPage - 1) * recordsPageSize;
  const visibleRecords = filteredRecords.slice(pageStartIndex, pageStartIndex + recordsPageSize);

  useEffect(() => {
    setRecordsPage(1);
  }, [recordsSearch]);

  useEffect(() => {
    if (recordsPage > recordsPageCount) setRecordsPage(recordsPageCount);
  }, [recordsPage, recordsPageCount]);

  function sortLabel(key: SortKey) {
    if (sortKey !== key) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  }

  return (
    <div className="ops-sec-grid">
      <section className="ops-panel ops-sec-form-panel">
        <div className="ops-panel-head">
          <div>
            <span className="ops-eyebrow">Manual Input</span>
            <h2>SEC Filing Record</h2>
          </div>
          <span className={`ops-status ${status === 'error' ? 'bad' : status === 'saved' ? 'good' : ''}`}>{status}</span>
        </div>

        <form className="ops-sec-form" onSubmit={saveRecord}>
          <div className="ops-form-grid two">
            <label>Ticker<input suppressHydrationWarning value={form.ticker} onChange={event => updateField('ticker', event.target.value)} /></label>
            <label>Company<input suppressHydrationWarning value={form.companyName} onChange={event => updateField('companyName', event.target.value)} /></label>
          </div>
          <div className="ops-form-grid two">
            <label>Form type<input suppressHydrationWarning placeholder="4, 6-K, 424B3" value={form.formType} onChange={event => updateField('formType', event.target.value)} /></label>
            <label>Form description<input suppressHydrationWarning placeholder="Statement of changes in beneficial ownership..." value={form.formDescription} onChange={event => updateField('formDescription', event.target.value)} /></label>
          </div>
          <div className="ops-form-grid three">
            <label>Filing date<input suppressHydrationWarning type="date" value={form.filingDate} onChange={event => updateField('filingDate', event.target.value)} /></label>
            <label>Reporting date<input suppressHydrationWarning type="date" value={form.reportingDate} onChange={event => updateField('reportingDate', event.target.value)} /></label>
            <label>Act<input suppressHydrationWarning placeholder="33, 34" value={form.act} onChange={event => updateField('act', event.target.value)} /></label>
          </div>
          <div className="ops-form-grid three">
            <label>Film number(s)<input suppressHydrationWarning value={form.filmNumber} onChange={event => updateField('filmNumber', event.target.value)} /></label>
            <label>File number<input suppressHydrationWarning value={form.fileNumber} onChange={event => updateField('fileNumber', event.target.value)} /></label>
            <label>Accession number<input suppressHydrationWarning value={form.accessionNumber} onChange={event => updateField('accessionNumber', event.target.value)} /></label>
          </div>
          <label>Filings URL<input suppressHydrationWarning placeholder="https://www.sec.gov/Archives/edgar/..." value={form.filingsUrl} onChange={event => updateField('filingsUrl', event.target.value)} /></label>
          <label>Internal notes<textarea suppressHydrationWarning rows={4} value={form.notes} onChange={event => updateField('notes', event.target.value)} /></label>
          <div className="ops-form-footer">
            <span>{requiredReady ? 'Ready to save' : 'Required: form type, description, filing date, accession number, URL'}</span>
            <button className="ops-primary-button" type="submit" disabled={!requiredReady || status === 'saving'}>{status === 'saving' ? 'Saving...' : 'Save Record'}</button>
          </div>
          {message && <p className={`ops-form-message ${status === 'error' ? 'bad' : 'good'}`}>{message}</p>}
        </form>
      </section>

      <aside className="ops-side-stack">
        <section className="ops-panel">
          <div className="ops-panel-head">
            <div>
              <span className="ops-eyebrow">Preview</span>
              <h2>Record Output</h2>
            </div>
          </div>
          <dl className="ops-preview-list">
            <div><dt>Form</dt><dd>{form.formType || 'N/A'}</dd></div>
            <div><dt>Description</dt><dd>{form.formDescription || 'N/A'}</dd></div>
            <div><dt>Filing date</dt><dd>{form.filingDate || 'N/A'}</dd></div>
            <div><dt>Reporting date</dt><dd>{form.reportingDate || 'N/A'}</dd></div>
            <div><dt>Accession</dt><dd>{form.accessionNumber || 'N/A'}</dd></div>
            <div><dt>URL</dt><dd>{form.filingsUrl || 'N/A'}</dd></div>
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
            <strong>{data?.s3Key ?? 'news_filings/CURR_sec_filings.json'}</strong>
            <small>{data?.updatedAt ? `Updated ${formatDateTime(data.updatedAt)}` : 'Waiting for first save'}</small>
          </div>
        </section>
      </aside>

      <section className="ops-panel ops-wide-panel">
        <div className="ops-panel-head">
          <div>
            <span className="ops-eyebrow">Recent Records</span>
            <h2>Saved SEC Filings</h2>
          </div>
          <span className="ops-record-count">{filteredRecords.length.toLocaleString()} / {records.length.toLocaleString()} records</span>
        </div>
        <div className="ops-record-tools">
          <label>
            <span>Search records</span>
            <input
              value={recordsSearch}
              placeholder="Search form, description, date, accession, URL, notes"
              onChange={event => setRecordsSearch(event.target.value)}
            />
          </label>
          <div>
            <span>Page {safeRecordsPage} of {recordsPageCount}</span>
            <small>{filteredRecords.length ? `${(pageStartIndex + 1).toLocaleString()}-${Math.min(pageStartIndex + recordsPageSize, filteredRecords.length).toLocaleString()} shown` : 'No records shown'}</small>
          </div>
        </div>
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th><button type="button" onClick={() => toggleSort('formType')}>Form type <span>{sortLabel('formType')}</span></button></th>
                <th><button type="button" onClick={() => toggleSort('formDescription')}>Description <span>{sortLabel('formDescription')}</span></button></th>
                <th><button type="button" onClick={() => toggleSort('filingDate')}>Filing date <span>{sortLabel('filingDate')}</span></button></th>
                <th><button type="button" onClick={() => toggleSort('reportingDate')}>Reporting date <span>{sortLabel('reportingDate')}</span></button></th>
                <th><button type="button" onClick={() => toggleSort('accessionNumber')}>Accession number <span>{sortLabel('accessionNumber')}</span></button></th>
                <th>URL</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map(record => (
                <tr key={record.id}>
                  <td>{record.formType}</td>
                  <td>{record.formDescription}</td>
                  <td>{record.filingDate || 'N/A'}</td>
                  <td>{record.reportingDate || 'N/A'}</td>
                  <td>{record.accessionNumber}</td>
                  <td><a href={record.filingsUrl} target="_blank" rel="noreferrer">Open</a></td>
                  <td>
                    <button
                      className="ops-danger-button"
                      type="button"
                      disabled={deletingKey === (record.accessionNumber || record.id) || status === 'loading'}
                      onClick={() => deleteRecord(record)}
                    >
                      {deletingKey === (record.accessionNumber || record.id) ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
              {!visibleRecords.length && <tr><td colSpan={7}>No SEC filing records match the current search.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="ops-pagination" aria-label="SEC filing records pagination">
          <button type="button" disabled={safeRecordsPage <= 1} onClick={() => setRecordsPage(1)}>First</button>
          <button type="button" disabled={safeRecordsPage <= 1} onClick={() => setRecordsPage(page => Math.max(1, page - 1))}>Previous</button>
          <span>Page {safeRecordsPage} of {recordsPageCount}</span>
          <button type="button" disabled={safeRecordsPage >= recordsPageCount} onClick={() => setRecordsPage(page => Math.min(recordsPageCount, page + 1))}>Next</button>
          <button type="button" disabled={safeRecordsPage >= recordsPageCount} onClick={() => setRecordsPage(recordsPageCount)}>Last</button>
        </div>
      </section>

      <section className="ops-panel ops-wide-panel">
        <div className="ops-panel-head">
          <div>
            <span className="ops-eyebrow">Log</span>
            <h2>Save Activity</h2>
          </div>
        </div>
        <div className="ops-log-list">
          {log.slice(0, 8).map((item, index) => (
            <div key={item.id || `${item.savedAt}-${item.action}-${item.accessionNumber}-${index}`}>
              <span>{item.action}</span>
              <strong>{item.formType} · {item.accessionNumber}</strong>
              <small>{item.filingDate} · {formatDateTime(item.savedAt)} · {item.savedBy}</small>
            </div>
          ))}
          {!log.length && <p>No save activity yet.</p>}
        </div>
      </section>
    </div>
  );
}
