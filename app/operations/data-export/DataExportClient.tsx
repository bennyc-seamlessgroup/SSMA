'use client';

import { OperationsDevelopmentData, type OperationsDevelopmentDatum } from '@/components/OperationsDevelopmentData';
import { authenticatedFileDownload } from '@/lib/auth-client';
import { getOperationsTicker } from '@/lib/operations/ticker-client';
import { useEffect, useMemo, useState } from 'react';

type Dataset = 'chartexchange' | 'fintel' | 'history' | 'manual-input' | 'kwatch';
type ExportOrder = 'desc' | 'asc';
type CategoryOption = { value: string; label: string };

const kwatchCategories = [
  { value: '', label: 'All KWatch categories' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'stocktwits', label: 'Stocktwits' },
] as const;

const chartExchangeCategories = [
  { value: '', label: 'All Chart Exchange categories' },
  { value: 'borrow_fee', label: 'Borrow fee' },
  { value: 'failure_to_deliver', label: 'Failure to deliver' },
  { value: 'short_interest_daily', label: 'Daily short interest' },
  { value: 'short_volume', label: 'Short volume' },
  { value: 'exchange_volume', label: 'Exchange volume' },
] as const;

const historyCategories = [
  { value: 'market-history', label: 'Market history' },
  { value: 'short-volume-history', label: 'Short volume history' },
  { value: 'ftd-history', label: 'Fails-to-deliver history' },
  { value: 'exchange-volume-history', label: 'Exchange volume history' },
  { value: 'ownership-history', label: 'Ownership history' },
  { value: 'ownership-summary-history', label: 'Ownership summary history' },
  { value: 'sec-filings-history', label: 'SEC filings history' },
  { value: 'sentiment-events', label: 'Sentiment events' },
] as const;

const manualInputCategories = [
  { value: 'profile', label: 'Company profile' },
  { value: 'issued-share', label: 'Issued shares' },
  { value: 'short-score', label: 'Short score' },
  { value: 'institutional-owner', label: 'Institutional owner security names' },
  { value: 'management-holdings', label: 'Management holdings' },
  { value: 'internal-float-inputs', label: 'Internal float inputs' },
  { value: 'manual-availability', label: 'Manual availability' },
  { value: 'utilization', label: 'Utilization' },
  { value: 'sec-filings', label: 'SEC filings' },
  { value: 'margins', label: 'Margins' },
] as const;

const fintelCategories = [
  { value: '', label: 'All Fintel categories' },
  { value: 'activist_filings', label: 'Activist filings' },
  { value: 'security_ownership', label: 'Security ownership' },
] as const;

const categoriesByDataset: Record<Dataset, readonly CategoryOption[]> = {
  chartexchange: chartExchangeCategories,
  fintel: fintelCategories,
  history: historyCategories,
  'manual-input': manualInputCategories,
  kwatch: kwatchCategories,
};

const defaultCategories: Partial<Record<Dataset, string>> = {
  history: 'market-history',
  'manual-input': 'utilization',
};

export function DataExportClient() {
  const [ticker, setTicker] = useState('CURR');
  const [dataset, setDataset] = useState<Dataset>('manual-input');
  const [category, setCategory] = useState('utilization');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [order, setOrder] = useState<ExportOrder>('desc');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [debugRows, setDebugRows] = useState<OperationsDevelopmentDatum[]>([]);
  const categoryRequired = dataset === 'manual-input';
  const categoryOptions = categoriesByDataset[dataset];

  useEffect(() => {
    setTicker(getOperationsTicker());
  }, []);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ dataset, ticker, order });
    if (category.trim()) params.set('category', category.trim());
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return `/export/csv?${params.toString()}`;
  }, [category, dataset, endDate, order, startDate, ticker]);

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
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      const recordCount = Math.max(0, rawCsv.trim().split(/\r?\n/).filter(Boolean).length - 1);
      setDebugRows([{
        endpoint: `GET ${endpoint}`,
        source: 'CSV Export API',
        state: 'downloaded',
        recordCount,
        payload: {
          filename: result.filename,
          contentType: result.contentType,
          preview: rawCsv.slice(0, 4000),
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
            <select value={category} required={categoryRequired} onChange={event => setCategory(event.target.value)}>
              {categoryOptions.map(item => (
                <option value={item.value} key={`${dataset}-${item.value || 'all'}`}>{item.label}</option>
              ))}
            </select>
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
          <label>
            <span>Order</span>
            <select value={order} onChange={event => setOrder(event.target.value as ExportOrder)}>
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
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
