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
const googleDriveFolderMimeType = 'application/vnd.google-apps.folder';
const googleDriveApiBase = 'https://www.googleapis.com/drive/v3';
const importDataCacheMs = Math.max(5, Number(process.env.IMPORT_DATA_CACHE_SECONDS ?? 10)) * 1000;

type ImportDataSource = 'local' | 'google-drive';

type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  md5Checksum?: string;
};

type GoogleDriveIndexEntry = {
  id: string;
  modifiedTime: string | null;
  md5Checksum: string | null;
};

type GoogleDriveIndex = {
  expiresAt: number;
  files: Map<string, GoogleDriveIndexEntry>;
};

type GoogleDriveContentCache = {
  versionKey: string;
  content: string;
};

let googleDriveIndexCache: GoogleDriveIndex | null = null;
const googleDriveContentCache = new Map<string, GoogleDriveContentCache>();

function importDataSource(): ImportDataSource {
  return process.env.IMPORT_DATA_SOURCE === 'google-drive' ? 'google-drive' : 'local';
}

function googleDriveConfig() {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY?.trim();
  const folderId = process.env.GOOGLE_DRIVE_IMPORT_FOLDER_ID?.trim();
  if (!apiKey || !folderId) {
    throw new Error('Google Drive import data requires GOOGLE_DRIVE_API_KEY and GOOGLE_DRIVE_IMPORT_FOLDER_ID.');
  }
  return { apiKey, folderId };
}

function normalizeImportPath(relativePath: string) {
  return relativePath.replace(/^import_data\//, '').replace(/^\/+/, '');
}

function driveVersionKey(entry: GoogleDriveIndexEntry) {
  return `${entry.md5Checksum ?? ''}:${entry.modifiedTime ?? ''}`;
}

async function listGoogleDriveChildren(folderId: string, apiKey: string): Promise<GoogleDriveFile[]> {
  const files: GoogleDriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      key: apiKey,
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,md5Checksum)',
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const response = await fetch(`${googleDriveApiBase}/files?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Unable to list Google Drive import data folder: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as { files?: GoogleDriveFile[]; nextPageToken?: string };
    files.push(...(payload.files ?? []));
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return files;
}

async function buildGoogleDriveIndex() {
  const { apiKey, folderId } = googleDriveConfig();
  const files = new Map<string, GoogleDriveIndexEntry>();

  async function walk(currentFolderId: string, prefix = '') {
    const children = await listGoogleDriveChildren(currentFolderId, apiKey);
    for (const child of children) {
      const childPath = `${prefix}${child.name}`;
      if (child.mimeType === googleDriveFolderMimeType) {
        await walk(child.id, `${childPath}/`);
      } else if (child.name.endsWith('.json')) {
        files.set(childPath, {
          id: child.id,
          modifiedTime: child.modifiedTime ?? null,
          md5Checksum: child.md5Checksum ?? null,
        });
      }
    }
  }

  await walk(folderId);
  googleDriveIndexCache = {
    expiresAt: Date.now() + importDataCacheMs,
    files,
  };
  return googleDriveIndexCache;
}

async function getGoogleDriveIndex() {
  if (googleDriveIndexCache && googleDriveIndexCache.expiresAt > Date.now()) {
    return googleDriveIndexCache;
  }

  return buildGoogleDriveIndex();
}

export function listLocalImportJsonFiles(): string[] {
  if (!fs.existsSync(importDataRoot)) return [];

  function walk(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      if (!entry.isFile() || !entry.name.endsWith('.json')) return [];
      return normalizeImportPath(path.relative(importDataRoot, fullPath));
    });
  }

  return walk(importDataRoot).sort();
}

export function readLocalImportText(relativePath: string) {
  const fullPath = path.join(importDataRoot, normalizeImportPath(relativePath));
  return fs.readFileSync(fullPath, 'utf8');
}

export function getLocalImportFileUpdatedAt(relativePath: string) {
  const fullPath = path.join(importDataRoot, normalizeImportPath(relativePath));
  return fs.statSync(fullPath).mtimeMs;
}

async function readGoogleDriveText(relativePath: string) {
  const normalizedPath = normalizeImportPath(relativePath);
  const index = await getGoogleDriveIndex();
  const entry = index.files.get(normalizedPath);
  if (!entry) {
    throw new Error(`Google Drive import data file not found: ${normalizedPath}`);
  }

  const versionKey = driveVersionKey(entry);
  const cached = googleDriveContentCache.get(normalizedPath);
  if (cached?.versionKey === versionKey) return cached.content;

  const { apiKey } = googleDriveConfig();
  const params = new URLSearchParams({ key: apiKey, alt: 'media' });
  const response = await fetch(`${googleDriveApiBase}/files/${entry.id}?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to download Google Drive import data file ${normalizedPath}: ${response.status} ${response.statusText}`);
  }

  const content = await response.text();
  googleDriveContentCache.set(normalizedPath, { versionKey, content });
  return content;
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const content = importDataSource() === 'google-drive'
    ? await readGoogleDriveText(relativePath)
    : readLocalImportText(relativePath);
  return JSON.parse(content) as T;
}

export async function listImportDataFiles() {
  if (importDataSource() === 'google-drive') {
    const index = await getGoogleDriveIndex();
    return Array.from(index.files.keys()).sort();
  }

  return listLocalImportJsonFiles();
}

export async function getImportFileVersionParts(relativePath: string) {
  const normalizedPath = normalizeImportPath(relativePath);
  if (importDataSource() === 'google-drive') {
    const index = await getGoogleDriveIndex();
    const entry = index.files.get(normalizedPath);
    if (!entry) return null;
    return {
      path: normalizedPath,
      versionKey: driveVersionKey(entry),
      updatedAtMs: entry.modifiedTime ? Date.parse(entry.modifiedTime) : 0,
    };
  }

  const fullPath = path.join(importDataRoot, normalizedPath);
  if (!fs.existsSync(fullPath)) return null;
  const stat = fs.statSync(fullPath);
  return {
    path: normalizedPath,
    versionKey: fs.readFileSync(fullPath, 'utf8'),
    updatedAtMs: stat.mtimeMs,
  };
}

export async function readImportFile<T = unknown>(relativePath: string) {
  return readJsonFile<ImportEnvelope<T>>(relativePath);
}

export async function readSourceMap() {
  return readJsonFile<{ importedAt: string; recordCount: number; data: SourceMapEntry[] }>('metadata/source_map.json');
}

export async function readDataDictionary() {
  return readJsonFile<{ importedAt: string; recordCount: number; data: DataDictionaryEntry[] }>('metadata/data_dictionary.json');
}

export async function readImportLog() {
  return readJsonFile<{ importedAt: string; recordCount: number; data: ImportLogEntry[] }>('metadata/import_log.json');
}

export async function readImportDataPoolRows(): Promise<ImportDataPoolRow[]> {
  const sourceMap = (await readSourceMap()).data;
  return Promise.all(sourceMap.map(async entry => {
    const relativePath = entry.file.replace(/^import_data\//, '');
    const envelope = await readImportFile(relativePath);
    return {
      category: entry.category,
      fileName: entry.file,
      sourcePlatform: envelope.sourcePlatform ?? entry.expectedSource,
      lastUpdated: envelope.importedAt ?? '',
      recordCount: envelope.recordCount ?? 0,
      status: envelope.status ?? entry.status,
      notes: envelope.notes ?? '',
    };
  }));
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

export async function buildImportDashboard() {
  const [
    profileEnvelope,
    capitalStructureEnvelope,
    ownershipChangesEnvelope,
    topHoldersEnvelope,
    insiderNetEnvelope,
    shortInterestEnvelope,
    borrowFeeEnvelope,
    sharesAvailableEnvelope,
    shortScoreEnvelope,
    putCallEnvelope,
    gammaExposureEnvelope,
    expirationsEnvelope,
    filingsEnvelope,
    alertsEnvelope,
    stockScoreEnvelope,
  ] = await Promise.all([
    readImportFile<Record<string, unknown>>('company/profile.json'),
    readImportFile<Record<string, unknown>>('company/capital_structure.json'),
    readImportFile('ownership/ownership_changes.json'),
    readImportFile('ownership/top_holders.json'),
    readImportFile('insider/net_insider_activity.json'),
    readImportFile('short/short_interest.json'),
    readImportFile('short/borrow_fee.json'),
    readImportFile('short/shares_available.json'),
    readImportFile('short/short_score.json'),
    readImportFile('options/put_call_ratio.json'),
    readImportFile('options/gamma_exposure.json'),
    readImportFile('options/expiration_wall.json'),
    readImportFile('news_filings/sec_filings.json'),
    readImportFile('alerts/alerts.json'),
    readImportFile('price/technical_summary.json'),
  ]);

  const profile = profileEnvelope.data;
  const capitalStructure = capitalStructureEnvelope.data;
  const ownershipChanges = asRows(ownershipChangesEnvelope.data);
  const topHolders = asRows(topHoldersEnvelope.data);
  const insiderNet = asRecord(insiderNetEnvelope.data);
  const shortInterest = asRecord(shortInterestEnvelope.data);
  const borrowFee = asRecord(borrowFeeEnvelope.data);
  const sharesAvailable = asRows(sharesAvailableEnvelope.data);
  const shortScore = asRows(shortScoreEnvelope.data);
  const putCall = asRecord(putCallEnvelope.data);
  const gammaExposure = asRows(gammaExposureEnvelope.data);
  const expirations = asRows(expirationsEnvelope.data);
  const filings = asRows(filingsEnvelope.data);
  const alerts = asRows(alertsEnvelope.data);
  const stockScore = asRecord(stockScoreEnvelope.data);

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
      daysToCover: formatNumber(shortInterest.daysToCover ?? null, { maximumFractionDigits: 2 }),
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
