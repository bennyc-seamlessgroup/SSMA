import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

export type PageContentMap = Record<string, Record<string, unknown>>;

const importDataRoot = path.join(process.cwd(), 'import_data');
const importDataCacheSeconds = Math.max(5, Number(process.env.IMPORT_DATA_CACHE_SECONDS ?? 10));
const importDataCacheMs = importDataCacheSeconds * 1000;

type ImportDataSource = 'local' | 's3';

type S3IndexEntry = {
  key: string;
  objectKey: string;
  eTag: string | null;
  lastModified: string | null;
  size: number | null;
};

type S3Index = {
  expiresAt: number;
  files: Map<string, S3IndexEntry>;
};

type S3ContentCache = {
  versionKey: string;
  content: string;
};

let s3IndexCache: S3Index | null = null;
const s3ContentCache = new Map<string, S3ContentCache>();
const s3ContentRequests = new Map<string, Promise<string>>();

function importDataSource(): ImportDataSource {
  return process.env.IMPORT_DATA_SOURCE === 's3' ? 's3' : 'local';
}

export function getImportDataRuntimeConfig() {
  return {
    source: importDataSource(),
    cacheSeconds: importDataCacheSeconds,
  };
}

function s3Config() {
  const region = process.env.AWS_REGION?.trim() || 'us-east-1';
  const bucket = process.env.AWS_S3_BUCKET_NAME?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 import data requires AWS_REGION, AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.');
  }
  return { region, bucket, accessKeyId, secretAccessKey };
}

function localS3FallbackEnabled() {
  return process.env.IMPORT_DATA_LOCAL_FALLBACK === 'true';
}

function normalizeImportPath(relativePath: string) {
  return relativePath.replace(/^import_data\//, '').replace(/^\/+/, '');
}

function s3VersionKey(entry: S3IndexEntry) {
  if (entry.eTag) return `${entry.eTag}:${entry.size ?? ''}`;
  return `${entry.lastModified ?? ''}:${entry.size ?? ''}`;
}

function hashImportContent(content: string) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function hmac(key: crypto.BinaryLike, value: string) {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest();
}

function sha256Hex(value: string) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function awsEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeS3Key(key: string) {
  return key.split('/').map(awsEncode).join('/');
}

function formatAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function s3SigningKey(secretAccessKey: string, dateStamp: string, region: string) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
}

function buildCanonicalQuery(params: URLSearchParams) {
  return [...params.entries()]
    .sort(([aKey, aValue], [bKey, bValue]) => aKey === bKey ? aValue.localeCompare(bValue) : aKey.localeCompare(bKey))
    .map(([key, value]) => `${awsEncode(key)}=${awsEncode(value)}`)
    .join('&');
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? `; cause: ${error.cause.message}` : '';
    return `${error.message}${cause}`;
  }
  return String(error);
}

async function signedS3Fetch(method: 'GET' | 'HEAD', key: string, params = new URLSearchParams()) {
  const { region, bucket, accessKeyId, secretAccessKey } = s3Config();
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const canonicalUri = `/${encodeS3Key(key)}`;
  const canonicalQueryString = buildCanonicalQuery(params);
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:UNSIGNED-PAYLOAD`,
    `x-amz-date:${amzDate}`,
  ].join('\n') + '\n';
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signature = crypto.createHmac('sha256', s3SigningKey(secretAccessKey, dateStamp, region)).update(stringToSign, 'utf8').digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const url = `https://${host}${canonicalUri}${canonicalQueryString ? `?${canonicalQueryString}` : ''}`;

  const requestLabel = key || 'bucket listing';
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await fetch(url, {
        method,
        cache: 'no-store',
        headers: {
          Authorization: authorization,
          'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
          'x-amz-date': amzDate,
        },
      });
    } catch (error) {
      lastError = error;
      if (attempt < 2) await sleep(200 * (attempt + 1));
    }
  }

  throw new Error(`Unable to reach S3 import data ${requestLabel}: ${getErrorMessage(lastError)}`);
}

function xmlText(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? decodeXml(match[1]) : null;
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function listS3Objects(): Promise<S3IndexEntry[]> {
  const files: S3IndexEntry[] = [];
  let continuationToken: string | null = null;

  do {
    const params = new URLSearchParams({
      'list-type': '2',
      'max-keys': '1000',
    });
    if (continuationToken) params.set('continuation-token', continuationToken);

    const response = await signedS3Fetch('GET', '', params);
    if (!response.ok) {
      throw new Error(`Unable to list S3 import data bucket: ${response.status} ${response.statusText}`);
    }

    const payload = await response.text();
    for (const match of payload.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const block = match[1];
      const key = xmlText(block, 'Key');
      if (!key || !key.endsWith('.json')) continue;
      files.push({
        key: normalizeImportPath(key),
        objectKey: key,
        eTag: xmlText(block, 'ETag')?.replace(/^"|"$/g, '') ?? null,
        lastModified: xmlText(block, 'LastModified'),
        size: numeric(xmlText(block, 'Size')),
      });
    }
    continuationToken = xmlText(payload, 'NextContinuationToken');
  } while (continuationToken);

  return files;
}

async function buildS3Index() {
  const files = new Map<string, S3IndexEntry>();
  for (const file of await listS3Objects()) {
    files.set(file.key, file);
  }

  s3IndexCache = {
    expiresAt: Date.now() + importDataCacheMs,
    files,
  };
  return s3IndexCache;
}

async function getS3Index() {
  if (s3IndexCache && s3IndexCache.expiresAt > Date.now()) {
    return s3IndexCache;
  }

  return buildS3Index();
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

export async function getImportFileStatus(relativePath: string) {
  const normalizedPath = normalizeImportPath(relativePath);

  if (importDataSource() === 's3') {
    const index = await getS3Index();
    const entry = index.files.get(normalizedPath);
    return {
      path: normalizedPath,
      source: 's3' as const,
      exists: Boolean(entry),
      objectKey: entry?.objectKey ?? null,
      updatedAt: entry?.lastModified ?? null,
      size: entry?.size ?? null,
      versionKey: entry ? s3VersionKey(entry) : null,
    };
  }

  const fullPath = path.join(importDataRoot, normalizedPath);
  if (!fs.existsSync(fullPath)) {
    return {
      path: normalizedPath,
      source: 'local' as const,
      exists: false,
      updatedAt: null,
      size: null,
      versionKey: null,
    };
  }

  const stat = fs.statSync(fullPath);
  return {
    path: normalizedPath,
    source: 'local' as const,
    exists: true,
    updatedAt: new Date(stat.mtimeMs).toISOString(),
    size: stat.size,
    versionKey: hashImportContent(fs.readFileSync(fullPath, 'utf8')),
  };
}

async function readS3Text(relativePath: string) {
  const normalizedPath = normalizeImportPath(relativePath);
  const index = await getS3Index();
  const entry = index.files.get(normalizedPath);
  if (!entry) {
    throw new Error(`S3 import data file not found: ${normalizedPath}`);
  }

  const versionKey = s3VersionKey(entry);
  const cached = s3ContentCache.get(normalizedPath);
  if (cached?.versionKey === versionKey) return cached.content;

  const pending = s3ContentRequests.get(normalizedPath);
  if (pending) return pending;

  const request = (async () => {
    const response = await signedS3Fetch('GET', entry.objectKey);
    if (!response.ok) {
      throw new Error(`Unable to download S3 import data file ${normalizedPath}: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    s3ContentCache.set(normalizedPath, { versionKey, content });
    return content;
  })();

  s3ContentRequests.set(normalizedPath, request);
  try {
    return await request;
  } finally {
    s3ContentRequests.delete(normalizedPath);
  }
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const normalizedPath = normalizeImportPath(relativePath);
  let content: string;

  if (importDataSource() === 's3') {
    try {
      content = await readS3Text(normalizedPath);
    } catch (error) {
      const localPath = path.join(importDataRoot, normalizedPath);
      if (!localS3FallbackEnabled() || !fs.existsSync(localPath)) throw error;
      content = readLocalImportText(normalizedPath);
    }
  } else {
    content = readLocalImportText(normalizedPath);
  }

  return JSON.parse(content) as T;
}

export async function listImportDataFiles() {
  if (importDataSource() === 's3') {
    const index = await getS3Index();
    return Array.from(index.files.keys()).sort();
  }

  return listLocalImportJsonFiles();
}

export async function getImportFileVersionParts(relativePath: string) {
  const normalizedPath = normalizeImportPath(relativePath);
  if (importDataSource() === 's3') {
    const index = await getS3Index();
    const entry = index.files.get(normalizedPath);
    if (!entry) return null;
    return {
      path: normalizedPath,
      versionKey: s3VersionKey(entry) || hashImportContent(await readS3Text(normalizedPath)),
      updatedAtMs: entry.lastModified ? Date.parse(entry.lastModified) : 0,
    };
  }

  const fullPath = path.join(importDataRoot, normalizedPath);
  if (!fs.existsSync(fullPath)) return null;
  const stat = fs.statSync(fullPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  return {
    path: normalizedPath,
    versionKey: hashImportContent(content),
    updatedAtMs: stat.mtimeMs,
  };
}

export async function readImportFile<T = unknown>(relativePath: string) {
  return readJsonFile<ImportEnvelope<T>>(relativePath);
}

export async function readPageContent<T extends Record<string, unknown> = Record<string, unknown>>(pageKey: string): Promise<T> {
  try {
    const envelope = await readImportFile<PageContentMap>('content/page_content.json');
    const pageContent = envelope.data[pageKey];
    return (pageContent && typeof pageContent === 'object' && !Array.isArray(pageContent) ? pageContent : {}) as T;
  } catch {
    return {} as T;
  }
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
