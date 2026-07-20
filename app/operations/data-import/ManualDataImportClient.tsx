'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { OperationsDevelopmentData } from '@/components/OperationsDevelopmentData';
import { authenticatedFetch } from '@/lib/auth-client';
import { getOperationsTicker } from '@/lib/operations/ticker-client';

type ImportCategory =
  | 'utilization'
  | 'margins'
  | 'short-score'
  | 'manual-availability'
  | 'issued-share'
  | 'profile'
  | 'institutional-owner'
  | 'management-holdings'
  | 'sec-filings'
  | 'internal-float-inputs';

type CategoryDefinition = {
  key: ImportCategory;
  label: string;
  description: string;
  replacement: string;
  columns: string[];
  sample: Array<string | number | boolean>;
};

type ImportResponse = {
  message?: string;
  category?: string;
  ticker?: string;
  recordsCount?: number;
  generatedFiles?: string[];
};

const categories: CategoryDefinition[] = [
  {
    key: 'utilization', label: 'Utilization history', description: 'Daily utilization percentages.',
    replacement: 'Only dates included in the CSV are replaced.',
    columns: ['tradeDate', 'utilizationPercent'], sample: ['2026-07-17', 85.5],
  },
  {
    key: 'margins', label: 'Margins and duration', description: 'Daily broker margins and average duration.',
    replacement: 'Only dates included in the CSV are replaced.',
    columns: ['tradeDate', 'initialMarginIbkr', 'initialMarginFutu', 'maintenanceMarginIbkr', 'maintenanceMarginFutu', 'averageDurationDays', 'valueFormat', 'displayFormat'],
    sample: ['2026-07-17', 0.5, 0.6, 0.4, 0.45, 12.4, 'decimal_ratio', 'percent'],
  },
  {
    key: 'short-score', label: 'Short score history', description: 'Daily short-pressure score.',
    replacement: 'Only dates included in the CSV are replaced.',
    columns: ['tradeDate', 'shortScore'], sample: ['2026-07-17', 72],
  },
  {
    key: 'manual-availability', label: 'Broker shortable shares', description: 'Daily IBKR and FUTU shortable-share inputs.',
    replacement: 'Only dates included in the CSV are replaced.',
    columns: ['tradeDate', 'availableSharesIbkr', 'availableSharesFutu'], sample: ['2026-07-17', 2500000, 1500000],
  },
  {
    key: 'issued-share', label: 'Issued share', description: 'Current issued-share value.',
    replacement: 'The current issued-share record is replaced.',
    columns: ['issuedShare'], sample: [112280000],
  },
  {
    key: 'profile', label: 'Company profile', description: 'Company name and stock code.',
    replacement: 'The current company profile is replaced.',
    columns: ['companyName', 'stockCode'], sample: ['CURRENC Group Inc.', 'CURR'],
  },
  {
    key: 'institutional-owner', label: 'Institutional owner names', description: 'Security-name mappings used for institutional ownership collection.',
    replacement: 'The complete record list is replaced.',
    columns: ['id', 'institutionalOwnerSecurityName'], sample: ['io-sec-name-001', 'CURRENC GROUP INC'],
  },
  {
    key: 'management-holdings', label: 'Management holdings', description: 'Operations-managed strategic holding records.',
    replacement: 'The complete record list is replaced.',
    columns: ['id', 'holderName', 'category', 'action', 'shares', 'percentOfShares', 'fileDate', 'effectiveDate', 'form', 'showInOwnership', 'showAsSuggestion', 'autoApply', 'status', 'source', 'notes'],
    sample: ['holding-001', 'Sample Strategic Holder', 'Strategic Investor', 'add', 1000000, 0.89, '2026-07-17', '2026-07-17', '13G/A', true, true, false, 'pending', 'operations-input', ''],
  },
  {
    key: 'sec-filings', label: 'SEC filings', description: 'Complete operations-maintained SEC filing history.',
    replacement: 'The complete filing list is replaced.',
    columns: ['id', 'companyName', 'formType', 'formDescription', 'filingDate', 'reportingDate', 'act', 'filmNumber', 'fileNumber', 'accessionNumber', 'filingsUrl', 'notes'],
    sample: ['filing-001', 'CURRENC Group Inc.', '10-Q', 'Quarterly Report', '2026-07-17', '2026-06-30', '', '', '', '0001213900-26-001234', 'https://www.sec.gov/', ''],
  },
  {
    key: 'internal-float-inputs', label: 'Internal float inputs', description: 'Complete nested internal-float input document.',
    replacement: 'All internal-float inputs are replaced and a new audit log is generated.',
    columns: ['managementStrategicHoldings', 'tokenizedShares', 'collateralizedShares', 'privateFriendlyHolders'],
    sample: ['{"records":[]}', '{"records":[]}', '{"records":[]}', '{"shares":0,"ratio":0}'],
  },
];

function csvCell(value: string | number | boolean) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadTemplate(definition: CategoryDefinition, ticker: string) {
  const csv = `${definition.columns.map(csvCell).join(',')}\n${definition.sample.map(csvCell).join(',')}\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${definition.key}_${ticker}_template.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ManualDataImportClient() {
  const [ticker, setTicker] = useState('CURR');
  const [category, setCategory] = useState<ImportCategory>('utilization');
  const [file, setFile] = useState<File | null>(null);
  const [currentData, setCurrentData] = useState<unknown>();
  const [importResult, setImportResult] = useState<ImportResponse>();
  const [consolidationResult, setConsolidationResult] = useState<unknown>();
  const [status, setStatus] = useState<'idle' | 'loading' | 'importing' | 'consolidating' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement | null>(null);
  const categoryEffectReady = useRef(false);
  const definition = useMemo(() => categories.find(item => item.key === category) ?? categories[0], [category]);

  async function loadCurrent(nextTicker = ticker, nextCategory = category) {
    setStatus('loading');
    setCurrentData(undefined);
    try {
      const payload = await authenticatedFetch(`/manual-input/${nextCategory}?ticker=${encodeURIComponent(nextTicker)}`, { cache: 'no-store' });
      setCurrentData(payload);
      setStatus('idle');
      setMessage('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to load the current category data.');
    }
  }

  useEffect(() => {
    const nextTicker = getOperationsTicker();
    setTicker(nextTicker);
    loadCurrent(nextTicker, category);
    // Initial operations workspace load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!categoryEffectReady.current) {
      categoryEffectReady.current = true;
      return;
    }
    if (status === 'loading' && currentData === undefined) return;
    setFile(null);
    setImportResult(undefined);
    setConsolidationResult(undefined);
    loadCurrent(ticker, category);
    // Category-driven API refresh only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  function selectFile(nextFile?: File) {
    if (!nextFile || !nextFile.name.toLowerCase().endsWith('.csv')) {
      setFile(null);
      setStatus('error');
      setMessage('Choose a CSV file for this import.');
      return;
    }
    setFile(nextFile);
    setStatus('idle');
    setMessage('');
  }

  async function importCsv() {
    if (!file) {
      setStatus('error');
      setMessage('Choose a CSV file before importing.');
      return;
    }
    setStatus('importing');
    setMessage('');
    setImportResult(undefined);
    setConsolidationResult(undefined);
    const formData = new FormData();
    formData.append('ticker', ticker);
    formData.append('category', category);
    formData.append('file', file);
    try {
      const result = await authenticatedFetch(`/manual-input/import?ticker=${encodeURIComponent(ticker)}&category=${encodeURIComponent(category)}`, {
        method: 'POST',
        body: formData,
      }) as ImportResponse;
      setImportResult(result);
      setFile(null);
      await loadCurrent(ticker, category);
      setStatus('idle');
      setMessage(result.message || 'Import completed successfully. Run consolidation when all imports are complete.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Import failed.');
    }
  }

  async function consolidate() {
    setStatus('consolidating');
    setMessage('');
    try {
      const result = await authenticatedFetch(`/manual-input/consolidate?ticker=${encodeURIComponent(ticker)}`, {
        method: 'POST',
        body: JSON.stringify({ ticker }),
      });
      setConsolidationResult(result);
      setStatus('idle');
      setMessage('Consolidation pipeline triggered successfully.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to trigger consolidation.');
    }
  }

  return (
    <div className="ops-import-page">
      <section className="ops-panel ops-import-header">
        <div>
          <span className="ops-eyebrow">Bulk replacement</span>
          <h2>Import operations CSV</h2>
          <p>Choose a category, download its template, and upload the completed CSV. Review the replacement scope before importing.</p>
        </div>
        <button className="ops-secondary-button" type="button" onClick={() => downloadTemplate(definition, ticker)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" /></svg>
          Download template
        </button>
      </section>

      <div className="ops-import-layout">
        <section className="ops-panel ops-import-form">
          <label className="ops-import-category">
            <span>Import category</span>
            <select value={category} onChange={event => setCategory(event.target.value as ImportCategory)}>
              {categories.map(item => <option value={item.key} key={item.key}>{item.label}</option>)}
            </select>
          </label>

          <div className="ops-import-definition">
            <div><strong>{definition.label}</strong><p>{definition.description}</p></div>
            <span>{definition.replacement}</span>
          </div>

          <div className="ops-import-fields">
            <span className="ops-eyebrow">Expected columns</span>
            <div>{definition.columns.map(column => <code key={column}>{column}</code>)}</div>
          </div>

          <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={event => selectFile(event.target.files?.[0])} />
          <button
            type="button"
            className={`ops-import-dropzone ${file ? 'is-ready' : ''}`}
            onClick={() => fileInput.current?.click()}
            onDragOver={event => event.preventDefault()}
            onDrop={event => { event.preventDefault(); selectFile(event.dataTransfer.files[0]); }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L8 8m4-4 4 4M4 15v5h16v-5" /></svg>
            <strong>{file?.name || 'Drop CSV here or choose a file'}</strong>
            <small>{file ? `${(file.size / 1024).toFixed(1)} KB selected` : 'CSV only'}</small>
          </button>

          <div className="ops-import-warning">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 21h20L12 3Z" /><path d="M12 9v5m0 3h.01" /></svg>
            <p><strong>Review before importing</strong><span>{definition.replacement} CSV import does not run consolidation automatically.</span></p>
          </div>

          {message && <p className={`ops-form-message ${status === 'error' ? 'bad' : 'good'}`}>{message}</p>}
          <div className="ops-import-actions">
            <button className="ops-primary-button" type="button" disabled={!file || status === 'importing' || status === 'consolidating'} onClick={importCsv}>
              {status === 'importing' ? 'Importing...' : 'Import CSV'}
            </button>
            <button className="ops-secondary-button" type="button" disabled={!importResult || status === 'consolidating'} onClick={consolidate}>
              {status === 'consolidating' ? 'Consolidating...' : 'Run consolidation'}
            </button>
          </div>
        </section>

        <section className="ops-panel ops-import-preview">
          <div className="ops-panel-head">
            <div><span className="ops-eyebrow">Current API data</span><h2>{definition.label}</h2></div>
            <span className="ops-status">{status === 'loading' ? 'Loading' : ticker}</span>
          </div>
          {importResult && (
            <div className="ops-import-result">
              <strong>{(importResult.recordsCount ?? 0).toLocaleString('en-US')} records imported</strong>
              <span>{importResult.generatedFiles?.length ?? 0} files generated</span>
            </div>
          )}
          <pre>{currentData === undefined ? 'Loading current API response...' : JSON.stringify(currentData, null, 2)}</pre>
        </section>
      </div>

      <OperationsDevelopmentData
        title="Data Import API Responses"
        description="Uncombined API responses for the selected manual-input category, CSV import, and consolidation trigger."
        rows={[
          {
            endpoint: `GET /manual-input/${category}?ticker=${ticker}`,
            source: 'Manual Input V2 API',
            state: currentData === undefined ? status : 'loaded',
            payload: currentData,
          },
          {
            endpoint: `POST /manual-input/import?ticker=${ticker}&category=${category}`,
            source: 'Manual Input V2 API',
            state: status === 'importing' ? 'importing' : importResult ? 'completed' : 'not submitted',
            recordCount: importResult?.recordsCount,
            payload: importResult,
          },
          {
            endpoint: `POST /manual-input/consolidate?ticker=${ticker}`,
            source: 'Manual Input V2 API',
            state: status === 'consolidating' ? 'running' : consolidationResult ? 'triggered' : 'not triggered',
            payload: consolidationResult,
          },
        ]}
      />
    </div>
  );
}
