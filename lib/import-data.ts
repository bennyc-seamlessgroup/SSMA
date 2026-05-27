import fs from 'fs';
import path from 'path';

export type ImportEnvelope<T = unknown> = {
  ticker?: string;
  asOfDate?: string;
  importedAt?: string;
  source?: string;
  sourcePlatform?: string;
  recordType?: string;
  category?: string;
  recordCount?: number;
  status?: string;
  notes?: string | null;
  originalFiles?: string[];
  data: T;
};

export type SourceMapEntry = {
  file: string;
  category: string;
  expectedSource: string;
  connectorOwner: string;
  updateCadence: string;
  status: string;
};

export type DataDictionaryEntry = {
  field: string;
  definition: string;
};

export type ImportLogEntry = {
  sourceFile: string;
  destinationFile: string;
  detectedDataType: string;
  importTime: string;
  status: string;
  notes: string;
};

export type ImportDataPoolRow = {
  category: string;
  fileName: string;
  sourcePlatform: string;
  lastUpdated: string;
  recordCount: number;
  status: string;
  notes: string;
};

const importDataRoot = path.join(process.cwd(), 'import_data');

function readJsonFile<T>(relativePath: string): T {
  const fullPath = path.join(importDataRoot, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8')) as T;
}

export function readImportFile<T = unknown>(relativePath: string) {
  return readJsonFile<ImportEnvelope<T>>(relativePath);
}

export function readSourceMap() {
  return readJsonFile<{ importedAt: string; recordCount: number; data: SourceMapEntry[] }>('metadata/source_map.json');
}

export function readDataDictionary() {
  return readJsonFile<{ importedAt: string; recordCount: number; data: DataDictionaryEntry[] }>('metadata/data_dictionary.json');
}

export function readImportLog() {
  return readJsonFile<{ importedAt: string; recordCount: number; data: ImportLogEntry[] }>('metadata/import_log.json');
}

export function readImportDataPoolRows(): ImportDataPoolRow[] {
  const sourceMap = readSourceMap().data;
  return sourceMap.map(entry => {
    const relativePath = entry.file.replace(/^import_data\//, '');
    const envelope = readImportFile(relativePath);
    return {
      category: entry.category,
      fileName: entry.file,
      sourcePlatform: envelope.sourcePlatform ?? entry.expectedSource,
      lastUpdated: envelope.importedAt ?? '',
      recordCount: envelope.recordCount ?? 0,
      status: envelope.status ?? entry.status,
      notes: envelope.notes ?? '',
    };
  });
}

function asRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Record<string, unknown>[] : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function latestByDate(rows: Record<string, unknown>[], dateKey = 'date') {
  return [...rows].sort((a, b) => String(b[dateKey] ?? '').localeCompare(String(a[dateKey] ?? '')))[0] ?? {};
}

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: unknown, options?: Intl.NumberFormatOptions) {
  const parsed = numeric(value);
  return parsed === null ? 'N/A' : parsed.toLocaleString('en-US', options);
}

function formatPercent(value: unknown, options?: Intl.NumberFormatOptions) {
  const parsed = numeric(value);
  return parsed === null ? 'N/A' : `${parsed.toLocaleString('en-US', options)}%`;
}

export function buildImportDashboard() {
  const profile = readImportFile<Record<string, unknown>>('company/profile.json').data;
  const capitalStructure = readImportFile<Record<string, unknown>>('company/capital_structure.json').data;
  const ownershipChanges = asRows(readImportFile('ownership/ownership_changes.json').data);
  const topHolders = asRows(readImportFile('ownership/top_holders.json').data);
  const insiderNet = asRecord(readImportFile('insider/net_insider_activity.json').data);
  const shortInterest = asRecord(readImportFile('short/short_interest.json').data);
  const borrowFee = asRecord(readImportFile('short/borrow_fee.json').data);
  const sharesAvailable = asRows(readImportFile('short/shares_available.json').data);
  const shortScore = asRows(readImportFile('short/short_score.json').data);
  const putCall = asRecord(readImportFile('options/put_call_ratio.json').data);
  const gammaExposure = asRows(readImportFile('options/gamma_exposure.json').data);
  const expirations = asRows(readImportFile('options/expiration_wall.json').data);
  const filings = asRows(readImportFile('news_filings/sec_filings.json').data);
  const alerts = asRows(readImportFile('alerts/alerts.json').data);
  const stockScore = asRecord(readImportFile('price/technical_summary.json').data);

  const shortCurrent = asRecord(shortInterest.current);
  const borrowCurrent = asRecord(borrowFee.current);
  const availableCurrent = latestByDate(sharesAvailable);
  const latestShortScore = latestByDate(shortScore);
  const latestStockScore = asRecord(stockScore.latestScore);
  const pcrOiRows = asRows(putCall.openInterestRatio);
  const pcrVolumeRows = asRows(putCall.volumeRatio);
  const latestPcr = latestByDate(pcrOiRows.length ? pcrOiRows : pcrVolumeRows);

  const increasedOwners = ownershipChanges.filter(row => (numeric(row.sharesChange) ?? 0) > 0);
  const decreasedOwners = ownershipChanges.filter(row => (numeric(row.sharesChange) ?? 0) < 0);
  const healthScore = Math.round(numeric(latestStockScore.total) ?? 64);
  const marketSentimentScore = Math.round(numeric(latestStockScore.momentum) ?? 68);
  const squeezeRisk = Math.round(numeric(latestShortScore.score) ?? numeric(latestShortScore.shortScore) ?? 62);

  return {
    company: {
      ticker: String(profile.ticker ?? 'CURR'),
      companyName: String(profile.companyName ?? 'CURRENC Group Inc.'),
      exchange: String(profile.exchange ?? 'NasdaqGM'),
      marketCap: formatNumber(capitalStructure.marketCap),
      freeFloat: formatNumber(capitalStructure.freeFloat),
      sharesOutstanding: formatNumber(capitalStructure.sharesOutstanding),
    },
    scores: {
      healthScore,
      marketSentimentScore,
      ownershipTrend: increasedOwners.length >= decreasedOwners.length ? 'Accumulation' : 'Distribution',
      shortSqueezeRisk: squeezeRisk,
    },
    metrics: {
      borrowFee: formatPercent(borrowCurrent.costToBorrowAll ?? borrowCurrent.costToBorrowNew, { maximumFractionDigits: 2 }),
      sharesAvailable: formatNumber(availableCurrent.shortAvailabilityShares),
      shortInterestPercentFloat: formatPercent(shortCurrent.shortInterestPcFreeFloat, { maximumFractionDigits: 2 }),
      daysToCover: formatNumber(asRecord(readImportFile('short/short_interest.json').data).daysToCover ?? null, { maximumFractionDigits: 2 }),
      putCallRatio: formatNumber(latestPcr.putCallRatio ?? latestPcr.putCallOIRatio ?? latestPcr.putCallVolumeRatio, { maximumFractionDigits: 2 }),
      gammaExposure: gammaExposure.length ? `${gammaExposure.length} records` : 'Pending connector',
    },
    summaries: {
      insiderActivity: `${formatNumber(insiderNet.buyCount)} buys / ${formatNumber(insiderNet.sellCount)} sells`,
      institutionalOwnership: `${topHolders.length} top holders, ${increasedOwners.length} increased positions`,
      latestNewsFilings: filings.slice(0, 4),
      upcomingCatalysts: expirations.slice(0, 4),
      latestAlerts: alerts.slice(0, 5),
    },
  };
}
