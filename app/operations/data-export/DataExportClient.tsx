'use client';

import { OperationsDevelopmentData, type OperationsDevelopmentDatum } from '@/components/OperationsDevelopmentData';
import { authenticatedFileDownload } from '@/lib/auth-client';
import { getOperationsTicker } from '@/lib/operations/ticker-client';
import { useEffect, useMemo, useState } from 'react';

type Dataset = 'chartexchange' | 'fintel' | 'history' | 'manual-input' | 'kwatch';

const categorySuggestions = [
  'profile',
  'issued-share',
  'short-score',
  'institutional-owner',
  'manual-security-ownership',
  'management-holdings',
  'internal-float-inputs-ticker',
  'internal-float-inputs-user',
  'manual-availability',
  'utilization',
  'sec-filings',
  'margins',
  'market-history',
  'ftd-history',
  'short-volume-history',
  'reddit',
  'twitter',
  'stocktwits',
];

const defaultCategories: Partial<Record<Dataset, string>> = {
  history: 'market-history',
  'manual-input': 'utilization',
  kwatch: 'reddit',
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some(value => value.length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  row.push(cell);
  if (row.some(value => value.length > 0)) rows.push(row);
  return rows;
}

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function socialCsvNewestFirst(csv: string) {
  const rows = parseCsv(csv);
  const headers = rows[0]?.map(value => value.replace(/^\uFEFF/, '').trim().toLowerCase()) ?? [];
  const timestampIndex = ['datetime', 'timestamp', 'date', 'created_at', 'messages__created_at']
    .map(header => headers.indexOf(header))
    .find(index => index >= 0);
  if (rows.length < 3 || timestampIndex === undefined) return csv;

  const timestamp = (row: string[]) => {
    const parsed = Date.parse(row[timestampIndex] ?? '');
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const sortedRows = [...rows.slice(1)].sort((left, right) => timestamp(right) - timestamp(left));
  return [rows[0], ...sortedRows].map(row => row.map(csvCell).join(',')).join('\r\n').concat('\r\n');
}

export function DataExportClient() {
  const [ticker, setTicker] = useState('CURR');
  const [dataset, setDataset] = useState<Dataset>('manual-input');
  const [category, setCategory] = useState('utilization');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [debugRows, setDebugRows] = useState<OperationsDevelopmentDatum[]>([]);
  const categoryRequired = dataset === 'manual-input' || dataset === 'kwatch';

  useEffect(() => {
    setTicker(getOperationsTicker());
  }, []);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ dataset, ticker });
    if (category.trim()) params.set('category', category.trim());
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return `/export/csv?${params.toString()}`;
  }, [category, dataset, endDate, startDate, ticker]);

  function selectDataset(next: Dataset) {
    setDataset(next);
    setCategory(defaultCategories[next] ?? '');
    setMessage('');
    setStatus('idle');
  }

  async function downloadCsv(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (categoryRequired && !category.trim()) {
      setStatus('error');
      setMessage('Choose a category for this dataset.');
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      setStatus('error');
      setMessage('Start date must be on or before end date.');
      return;
    }

    setStatus('loading');
    setMessage('');
    try {
      const result = await authenticatedFileDownload(endpoint);
      const rawCsv = await result.blob.text();
      const preview = dataset === 'kwatch' ? socialCsvNewestFirst(rawCsv) : rawCsv;
      const downloadBlob = dataset === 'kwatch'
        ? new Blob([preview], { type: result.contentType })
        : result.blob;
      const url = URL.createObjectURL(downloadBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      const recordCount = Math.max(0, preview.trim().split(/\r?\n/).filter(Boolean).length - 1);
      setDebugRows([{
        endpoint: `GET ${endpoint}`,
        source: 'CSV Export API',
        state: 'downloaded',
        recordCount,
        payload: {
          filename: result.filename,
          contentType: result.contentType,
          preview: preview.slice(0, 4000),
        },
      }]);
      setStatus('success');
      setMessage(`Downloaded ${result.filename}.`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unable to export CSV.';
      setDebugRows([{
        endpoint: `GET ${endpoint}`,
        source: 'CSV Export API',
        state: `error: ${reason}`,
        payload: null,
      }]);
      setStatus('error');
      setMessage(reason);
    }
  }

  return (
    <>
      <section className="ops-panel ops-export-panel">
        <div className="ops-panel-head">
          <div>
            <span className="ops-eyebrow">Authenticated CSV Export</span>
            <h2>Export portal data</h2>
            <p>Download an authorized dataset for {ticker}. Date filters are optional.</p>
          </div>
          <span className="ops-record-count">{ticker}</span>
        </div>

        <form className="ops-export-form" onSubmit={downloadCsv}>
          <label>
            <span>Dataset</span>
            <select value={dataset} onChange={event => selectDataset(event.target.value as Dataset)}>
              <option value="manual-input">Manual input</option>
              <option value="history">History</option>
              <option value="chartexchange">Chart Exchange</option>
              <option value="fintel">Fintel</option>
              <option value="kwatch">KWatch</option>
            </select>
          </label>
          <label>
            <span>Category {categoryRequired ? '' : '(optional)'}</span>
            <input
              list="export-category-suggestions"
              value={category}
              required={categoryRequired}
              placeholder={categoryRequired ? 'Choose or enter a category' : 'All available categories'}
              onChange={event => setCategory(event.target.value)}
            />
            <datalist id="export-category-suggestions">
              {categorySuggestions.map(item => <option value={item} key={item} />)}
            </datalist>
          </label>
          <label>
            <span>Start date</span>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              suppressHydrationWarning
              onChange={event => setStartDate(event.target.value)}
            />
          </label>
          <label>
            <span>End date</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              suppressHydrationWarning
              onChange={event => setEndDate(event.target.value)}
            />
          </label>
          <div className="ops-export-form__action">
            <button className="ops-primary-button" type="submit" disabled={status === 'loading'}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 20h16" /></svg>
              {status === 'loading' ? 'Preparing CSV...' : 'Download CSV'}
            </button>
          </div>
        </form>

        {message ? <div className={`ops-form-message ${status === 'error' ? 'bad' : 'good'}`}>{message}</div> : null}
      </section>

      <OperationsDevelopmentData
        title="CSV Export API Response"
        description="The latest authenticated export request, file metadata, and a limited CSV preview."
        rows={debugRows}
      />
    </>
  );
}
