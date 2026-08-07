'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { OperationsDevelopmentData } from '@/components/OperationsDevelopmentData';
import { authenticatedFetch } from '@/lib/auth-client';
import {
  captureConsolidatedOutputs,
  waitForConsolidatedOutputChange,
} from '@/lib/consolidation-verification';
import { getOperationsTicker } from '@/lib/operations/ticker-client';

type ImportCategory =
  | 'utilization'
  | 'margins'
  | 'short-score'
  | 'manual-availability'
  | 'issued-share'
  | 'profile'
  | 'institutional-owner'
  | 'manual-security-ownership'
  | 'management-holdings'
  | 'sec-filings'
  | 'internal-float-inputs-ticker'
  | 'internal-float-inputs-user';

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
  inputRows?: number;
  importedRows?: number;
  skippedRows?: number;
  errors?: unknown[];
};

type ConsolidationResponse = {
  message?: string;
  ticker?: string;
  detail?: {
    rebuild_from_date?: string;
    force_rebuild?: boolean;
    input_type?: string;
  };
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
    key: 'issued-share', label: 'Issued share history', description: 'Issued-share values effective on each trade date.',
    replacement: 'Only trade dates included in the CSV are replaced. Historical dates are preserved independently.',
    columns: ['tradeDate', 'issuedShare'], sample: ['2026-07-28', 112280000],
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
    key: 'manual-security-ownership', label: 'Manual security ownership', description: 'Institutional security-ownership records grouped by effective date.',
    replacement: 'Only effective dates included in the CSV are replaced. Other dated ownership files remain unchanged.',
    columns: ['fileDate', 'effectiveDate', 'source', 'investor', 'optionType', 'type', 'avgPriceEst', 'shares', 'sharesPct', 'reportedValue', 'valueChangePct', 'portAlloc'],
    sample: ['2026-05-15', '2026-03-31', '13F', 'Citadel Advisors Llc', '', '', 1.98, 58345, '', 153, '', 0],
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
    columns: ['tradeDate', 'id', 'recordTicker', 'companyName', 'formType', 'formDescription', 'filingDate', 'reportingDate', 'act', 'filmNumber', 'fileNumber', 'accessionNumber', 'filingsUrl', 'notes'],
    sample: ['2026-07-17', 'filing-001', 'CURR', 'CURRENC Group Inc.', '10-Q', 'Quarterly Report', '2026-07-17', '2026-06-30', '', '', '', '0001213900-26-001234', 'https://www.sec.gov/', ''],
  },
  {
    key: 'internal-float-inputs-ticker', label: 'Internal float ticker inputs', description: 'Ticker-wide tokenized and collateralized share records.',
    replacement: 'Ticker-level tokenized and collateralized inputs are replaced.',
    columns: ['section', 'id', 'chain', 'provider', 'protocol', 'shares', 'ratio', 'includeInDeduction', 'notes'],
    sample: ['tokenizedShares', 'token-001', 'Ethereum', 'Securitize', '', 500000, '', true, ''],
  },
  {
    key: 'internal-float-inputs-user', label: 'Internal float user inputs', description: 'User-specific management, strategic, and private-friendly holdings.',
    replacement: 'The requesting user’s Internal Float inputs are replaced.',
    columns: ['section', 'id', 'holderName', 'category', 'shares', 'ratio', 'includeInDeduction', 'notes'],
    sample: ['managementStrategicHoldings', 'holder-001', 'Sample Strategic Holder', 'Strategic Investor', 1000000, '', true, ''],
  },
];

const dateSpecificCategories: ImportCategory[] = ['utilization', 'margins', 'short-score', 'manual-availability', 'issued-share'];

function consolidatedOutputEndpoints(category: ImportCategory, ticker: string) {
  const tickerParam = encodeURIComponent(ticker);
  if (dateSpecificCategories.includes(category)) {
    return [
      `/market-data/current?ticker=${tickerParam}&category=market-current`,
      `/market-data/history?ticker=${tickerParam}&category=market-history`,
    ];
  }
  if (category === 'profile') {
    return [`/market-data/current?ticker=${tickerParam}&category=company-profile-current`];
  }
  if (category === 'institutional-owner') {
    return [`/market-data/current?ticker=${tickerParam}&category=ownership-current`];
  }
  if (category === 'manual-security-ownership') {
    return [
      `/market-data/current?ticker=${tickerParam}&category=ownership-current`,
      `/market-data/history?ticker=${tickerParam}&category=ownership-history`,
    ];
  }
  if (category === 'management-holdings' || category === 'internal-float-inputs-ticker') {
    return [`/market-data/current?ticker=${tickerParam}&category=internal-float-current`];
  }
  if (category === 'internal-float-inputs-user') {
    return [`/market-data/current?ticker=${tickerParam}&category=internal-float-current-user`];
  }
  return [`/market-data/history?ticker=${tickerParam}&category=sec-filings-history`];
}

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

function parseCsvRows(text: string) {
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
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

async function inspectCsvTicker(file: File) {
  const rows = parseCsvRows(await file.text());
  const headers = rows[0]?.map(header => header.trim().replace(/^\uFEFF/, '').toLowerCase()) ?? [];
  const tickerIndex = ['recordticker', 'ticker', 'stockcode']
    .map(header => headers.indexOf(header))
    .find(index => index >= 0) ?? -1;
  const tickers = tickerIndex < 0
    ? []
    : Array.from(new Set(rows.slice(1)
      .map(row => row[tickerIndex]?.trim().toUpperCase())
      .filter(Boolean)));
  const tradeDateIndex = headers.indexOf('tradedate');
  const tradeDates = tradeDateIndex < 0
    ? []
    : Array.from(new Set(rows.slice(1)
      .map(row => row[tradeDateIndex]?.trim())
      .filter(Boolean)));
  const effectiveDateIndex = headers.indexOf('effectivedate');
  const effectiveDates = effectiveDateIndex < 0
    ? []
    : Array.from(new Set(rows.slice(1)
      .map(row => row[effectiveDateIndex]?.trim())
      .filter(Boolean)));
  return { rowCount: Math.max(0, rows.length - 1), tickers, tradeDates, effectiveDates };
}

function importPartitionDates(
  category: ImportCategory,
  details?: { tradeDates: string[]; effectiveDates: string[] },
) {
  return category === 'manual-security-ownership'
    ? details?.effectiveDates ?? []
    : details?.tradeDates ?? [];
}

function expectedImportPaths(category: ImportCategory, ticker: string, partitionDates: string[]) {
  if (dateSpecificCategories.includes(category)) {
    return partitionDates.map(date => `manual-input/${category}/${ticker}/${date}/${category}.json`);
  }
  if (category === 'manual-security-ownership') {
    return partitionDates.map(date => `manual-input/manual-security-ownership/${ticker}/${date}/manual-security-ownership.json`);
  }
  if (category === 'institutional-owner') {
    return [`manual-input/${category}/${ticker}/security-name.json`];
  }
  return [`manual-input/${category}/${ticker}/${category}.json`];
}

function invalidImportPath(result: ImportResponse, category: ImportCategory, ticker: string, partitionDates: string[]) {
  const invalidPath = result.generatedFiles?.find(path => /\/(?:none|null|undefined)(?:$|\/)/i.test(path));
  if (invalidPath) return `invalid generated path ${invalidPath}`;

  const expected = expectedImportPaths(category, ticker, partitionDates).sort();
  const generated = [...(result.generatedFiles ?? [])].sort();
  if (category === 'manual-security-ownership') {
    const missing = expected.filter(path => !generated.includes(path));
    return missing.length ? `missing generated ownership paths: ${missing.join(', ')}` : undefined;
  }
  if (category === 'internal-float-inputs-user') {
    const prefix = `manual-input/internal-float-inputs-user/${ticker}/`;
    const suffix = '/internal-float-inputs-user.json';
    if (generated.length === 1 && generated[0].startsWith(prefix) && generated[0].endsWith(suffix)) return undefined;
  }
  if (expected.length === generated.length && expected.every((path, index) => path === generated[index])) return undefined;
  const summarize = (paths: string[]) => paths.length > 3
    ? `${paths.length} date-partitioned files (${paths.slice(0, 2).join(', ')}, ...)`
    : paths.join(', ') || 'no files';
  return `expected ${summarize(expected)}, received ${summarize(generated)}`;
}

export function ManualDataImportClient() {
  const [ticker, setTicker] = useState('CURR');
  const [category, setCategory] = useState<ImportCategory>('utilization');
  const [file, setFile] = useState<File | null>(null);
  const [fileDetails, setFileDetails] = useState<{
    rowCount: number;
    tickers: string[];
    tradeDates: string[];
    effectiveDates: string[];
  }>();
  const [currentData, setCurrentData] = useState<unknown>();
  const [currentEndpoint, setCurrentEndpoint] = useState('');
  const [importResult, setImportResult] = useState<ImportResponse>();
  const [importVerified, setImportVerified] = useState(false);
  const [consolidationResult, setConsolidationResult] = useState<unknown>();
  const [currentLoadedAt, setCurrentLoadedAt] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'importing' | 'consolidating' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement | null>(null);
  const categoryEffectReady = useRef(false);
  const definition = useMemo(() => categories.find(item => item.key === category) ?? categories[0], [category]);

  async function loadCurrent(nextTicker = ticker, nextCategory = category, importedPartitionDates: string[] = []) {
    setStatus('loading');
    setCurrentData(undefined);
    try {
      let verificationDate = (dateSpecificCategories.includes(nextCategory) || nextCategory === 'manual-security-ownership')
        ? [...importedPartitionDates].sort().at(-1)
        : undefined;
      let availableDatesPayload: unknown;
      if (nextCategory === 'manual-security-ownership' && !verificationDate) {
        const availableDatesEndpoint = `/manual-input/manual-security-ownership?ticker=${encodeURIComponent(nextTicker)}&action=available-dates`;
        setCurrentEndpoint(`GET ${availableDatesEndpoint}`);
        availableDatesPayload = await authenticatedFetch(availableDatesEndpoint, { cache: 'no-store' });
        const candidate = availableDatesPayload && typeof availableDatesPayload === 'object'
          ? availableDatesPayload as { availableDates?: unknown; data?: { availableDates?: unknown } }
          : {};
        const availableDates = Array.isArray(candidate.availableDates)
          ? candidate.availableDates
          : Array.isArray(candidate.data?.availableDates)
            ? candidate.data.availableDates
            : [];
        verificationDate = availableDates
          .map(value => String(value))
          .filter(Boolean)
          .sort()
          .at(-1);
      }
      const dateQuery = verificationDate
        ? nextCategory === 'manual-security-ownership'
          ? `&effectiveDate=${encodeURIComponent(verificationDate)}`
          : `&tradeDate=${encodeURIComponent(verificationDate)}`
        : '';
      const endpoint = `/manual-input/${nextCategory}?ticker=${encodeURIComponent(nextTicker)}${dateQuery}`;
      if (nextCategory === 'manual-security-ownership' && !verificationDate) {
        setCurrentData(availableDatesPayload);
        setCurrentLoadedAt(new Date().toISOString());
        setStatus('idle');
        setMessage('No manual security ownership dates are available for this ticker.');
        return availableDatesPayload;
      }
      setCurrentEndpoint(`GET ${endpoint}`);
      const payload = await authenticatedFetch(endpoint, {
        cache: 'no-store',
      });
      setCurrentData(payload);
      setCurrentLoadedAt(new Date().toISOString());
      setStatus('idle');
      setMessage('');
      return payload;
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to load the current category data.');
      return undefined;
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
    setFileDetails(undefined);
    setImportResult(undefined);
    setImportVerified(false);
    setConsolidationResult(undefined);
    loadCurrent(ticker, category);
    // Category-driven API refresh only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  async function selectFile(nextFile?: File) {
    if (!nextFile || !nextFile.name.toLowerCase().endsWith('.csv')) {
      setFile(null);
      setFileDetails(undefined);
      setStatus('error');
      setMessage('Choose a CSV file for this import.');
      return;
    }
    try {
      const details = await inspectCsvTicker(nextFile);
      setFile(nextFile);
      setFileDetails(details);
      const mismatch = details.tickers.length > 0 && !details.tickers.includes(ticker);
      const missingEffectiveDate = category === 'manual-security-ownership' && details.effectiveDates.length === 0;
      setStatus(mismatch || missingEffectiveDate ? 'error' : 'idle');
      setMessage(mismatch
        ? `CSV ticker ${details.tickers.join(', ')} does not match target ticker ${ticker}. Change the target ticker before importing.`
        : missingEffectiveDate
          ? 'Manual security ownership CSV rows require an effectiveDate.'
        : '');
    } catch {
      setFile(null);
      setFileDetails(undefined);
      setStatus('error');
      setMessage('The CSV could not be inspected. Confirm that it is a valid UTF-8 CSV file.');
    }
  }

  async function importCsv() {
    if (!file) {
      setStatus('error');
      setMessage('Choose a CSV file before importing.');
      return;
    }
    if (fileDetails?.tickers.length && !fileDetails.tickers.includes(ticker)) {
      setStatus('error');
      setMessage(`CSV ticker ${fileDetails.tickers.join(', ')} does not match target ticker ${ticker}.`);
      return;
    }
    if (category === 'manual-security-ownership' && !fileDetails?.effectiveDates.length) {
      setStatus('error');
      setMessage('Manual security ownership CSV rows require an effectiveDate.');
      return;
    }
    setStatus('importing');
    setMessage('');
    setImportResult(undefined);
    setImportVerified(false);
    setConsolidationResult(undefined);
    const formData = new FormData();
    formData.append('ticker', ticker);
    formData.append('category', category);
    formData.append('file', file);
    try {
      const previousPayload = JSON.stringify(currentData);
      const result = await authenticatedFetch(`/manual-input/import?ticker=${encodeURIComponent(ticker)}&category=${encodeURIComponent(category)}`, {
        method: 'POST',
        body: formData,
      }) as ImportResponse;
      setImportResult(result);
      setFile(null);
      const partitionDates = importPartitionDates(category, fileDetails);
      const invalidGeneratedPath = invalidImportPath(result, category, ticker, partitionDates);
      const reportedInputRows = result.inputRows ?? result.recordsCount;
      const reportedImportedRows = result.importedRows ?? result.recordsCount;
      const recordCountMismatch = fileDetails !== undefined
        && ((reportedInputRows !== undefined && reportedInputRows !== fileDetails.rowCount)
          || (reportedImportedRows !== undefined && reportedImportedRows !== fileDetails.rowCount));
      const rejectedRows = (result.skippedRows ?? 0) > 0 || Boolean(result.errors?.length);
      const importResponseValid = !invalidGeneratedPath && !recordCountMismatch && !rejectedRows;
      setImportVerified(importResponseValid);
      const baseMessage = result.message || 'Import completed successfully.';
      if (!importResponseValid) {
        setStatus('error');
        setMessage(invalidGeneratedPath
          ? `${baseMessage} Backend verification failed: ${invalidGeneratedPath}. No follow-up GET was attempted.`
          : recordCountMismatch
            ? `${baseMessage} Backend verification failed: the API reported ${reportedImportedRows ?? 'an unknown number of'} imported rows from ${reportedInputRows ?? 'an unknown number of'} input rows, but the CSV contains ${fileDetails?.rowCount} data rows. No follow-up GET was attempted.`
            : `${baseMessage} Backend verification failed: ${result.skippedRows ?? 0} rows were skipped and ${result.errors?.length ?? 0} validation errors were returned. No follow-up GET was attempted.`);
        return;
      }

      let refreshedPayload: unknown;
      for (const delay of [0, 500, 1500]) {
        if (delay) await new Promise(resolve => window.setTimeout(resolve, delay));
        refreshedPayload = await loadCurrent(ticker, category, partitionDates);
        if (refreshedPayload !== undefined && JSON.stringify(refreshedPayload) !== previousPayload) break;
      }
      const currentChanged = refreshedPayload !== undefined && JSON.stringify(refreshedPayload) !== previousPayload;
      setStatus(refreshedPayload === undefined ? 'error' : 'idle');
      setMessage(refreshedPayload === undefined
        ? `${baseMessage} The follow-up GET request failed, so the saved records could not be verified.`
        : currentChanged
          ? `${baseMessage} Raw API data was refreshed. Run consolidation when all imports are complete.`
          : `${baseMessage} The raw GET response is still unchanged. The CSV may match the existing data, or the backend import and read paths are not synchronized.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Import failed.');
    }
  }

  async function consolidate() {
    setStatus('consolidating');
    setMessage(`Preparing to consolidate ${ticker}...`);
    try {
      const importedDates = [...importPartitionDates(category, fileDetails)].sort();
      const requestedRebuildFromDate = importedDates[0];
      const verificationEndpoints = consolidatedOutputEndpoints(category, ticker);
      const baseline = await captureConsolidatedOutputs(verificationEndpoints);
      const requestBody = {
        ticker,
        force_rebuild: true,
        ...(requestedRebuildFromDate ? { rebuild_from_date: requestedRebuildFromDate } : {}),
      };
      const result = await authenticatedFetch(`/manual-input/consolidate?ticker=${encodeURIComponent(ticker)}`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }) as ConsolidationResponse;
      setConsolidationResult({
        request: requestBody,
        response: result,
        baseline: baseline.checks,
        state: 'triggered; awaiting consolidated output',
      });
      const rebuildFromDate = result.detail?.rebuild_from_date;
      const backendUsedLaterCutoff = Boolean(
        requestedRebuildFromDate
        && rebuildFromDate
        && rebuildFromDate > requestedRebuildFromDate,
      );

      if (backendUsedLaterCutoff) {
        setStatus('error');
        setMessage(
          `Full rebuild was requested from ${requestedRebuildFromDate}, but the backend queued consolidation from ${rebuildFromDate}. Dates before the backend cutoff will not update in consolidated portal history.`,
        );
        return;
      }

      setMessage(`Consolidation was accepted for ${ticker}. Waiting for consolidated output...`);
      const verification = await waitForConsolidatedOutputChange({
        endpoints: verificationEndpoints,
        baseline,
        onProgress: elapsedSeconds => {
          setMessage(`Consolidation was accepted for ${ticker}. Still checking consolidated output (${elapsedSeconds}s elapsed)...`);
        },
      });
      setConsolidationResult({
        request: requestBody,
        response: result,
        baseline: baseline.checks,
        verification: verification.latest.checks,
        state: verification.changed
          ? 'confirmed'
          : 'accepted; consolidated output already available after 5 minutes',
      });

      if (verification.changed) {
        setStatus('idle');
        setMessage(`Consolidation output was confirmed for ${ticker}.`);
      } else if (verification.latest.availableOutputs === verification.latest.expectedOutputs) {
        setStatus('idle');
        setMessage(`The consolidation request for ${ticker} was accepted. No payload change was detected within 5 minutes, so the consolidated output may already be current. The API does not provide a completion status for this specific run.`);
      } else {
        setStatus('error');
        setMessage(`The consolidation request for ${ticker} was accepted, but one or more expected consolidated outputs were unavailable after 5 minutes. Consolidation completion was not confirmed.`);
      }
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
            <small>{file
              ? `${(file.size / 1024).toFixed(1)} KB · ${fileDetails?.rowCount ?? 0} rows${fileDetails?.tickers.length ? ` · ${fileDetails.tickers.join(', ')}` : ''}${category === 'manual-security-ownership' ? ` · ${fileDetails?.effectiveDates.length ?? 0} effective dates` : ''}`
              : 'CSV only'}</small>
          </button>

          <div className="ops-import-warning">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 21h20L12 3Z" /><path d="M12 9v5m0 3h.01" /></svg>
            <p><strong>Review before importing</strong><span>{definition.replacement} CSV import does not run consolidation automatically.</span></p>
          </div>

          {message && <p className={`ops-form-message ${status === 'error' ? 'bad' : 'good'}`}>{message}</p>}
          <div className="ops-import-actions">
            <button
              className="ops-primary-button"
              type="button"
              disabled={
                !file
                || Boolean(fileDetails?.tickers.length && !fileDetails.tickers.includes(ticker))
                || Boolean(category === 'manual-security-ownership' && !fileDetails?.effectiveDates.length)
                || status === 'importing'
                || status === 'consolidating'
              }
              aria-busy={status === 'importing'}
              onClick={importCsv}
            >
              {status === 'importing' ? 'Importing...' : 'Import CSV'}
            </button>
            <button className="ops-secondary-button" type="button" disabled={!importVerified || status === 'consolidating'} onClick={consolidate}>
              {status === 'consolidating' ? 'Consolidating...' : 'Run consolidation'}
            </button>
          </div>
        </section>

        <section className="ops-panel ops-import-preview">
          <div className="ops-panel-head">
            <div><span className="ops-eyebrow">Raw manual-input API</span><h2>{definition.label}</h2></div>
            <div className="ops-import-preview-tools">
              <span className="ops-status">{status === 'loading' ? 'Loading' : ticker}</span>
              <button className="ops-secondary-button" type="button" disabled={status === 'loading'} onClick={() => loadCurrent(ticker, category)}>
                Refresh API data
              </button>
            </div>
          </div>
          {currentLoadedAt && <small className="ops-import-refreshed">Fetched {new Date(currentLoadedAt).toLocaleString()}</small>}
          {importResult && (
            <div className={`ops-import-result ${importVerified ? '' : 'is-invalid'}`}>
              <div>
                <strong>{importVerified ? 'Import verified' : 'Import verification failed'} · {(importResult.importedRows ?? importResult.recordsCount ?? 0).toLocaleString('en-US')} records imported</strong>
                <span>
                  {(importResult.inputRows ?? importResult.recordsCount ?? 0).toLocaleString('en-US')} input rows · {(importResult.skippedRows ?? 0).toLocaleString('en-US')} skipped · {importResult.errors?.length ?? 0} errors · {importResult.generatedFiles?.length ?? 0} files generated
                </span>
              </div>
              {Boolean(importResult.generatedFiles?.length) && (
                <ul>{importResult.generatedFiles?.map(path => <li key={path}><code>{path}</code></li>)}</ul>
              )}
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
            endpoint: currentEndpoint || `GET /manual-input/${category}?ticker=${ticker}`,
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
