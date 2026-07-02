import { getPageDataSources, type PageDataSource } from '@/lib/page-data-sources';
import { normalizeTicker, stocktwitsFile } from '@/lib/ticker-data';

export type PublicImportFileStatus = {
  exists: boolean;
  version: string;
  updatedAt: string | null;
};

export type PublicPageDataStatus = {
  version: string;
  updatedAt: string | null;
};

export type PublicTickerDataStatus = {
  ticker: string;
  version: string;
  updatedAt: string | null;
  pages: Record<string, PublicPageDataStatus>;
};

const defaultBucketBase = 'https://data-sync-platform-website-data.s3.us-east-1.amazonaws.com';
const defaultBucketListBase = 'https://data-sync-platform-website-data.s3.amazonaws.com';

export function publicImportDataBaseUrl() {
  return (process.env.NEXT_PUBLIC_IMPORT_DATA_BASE_URL || defaultBucketBase).replace(/\/+$/, '');
}

function publicImportListBaseUrl() {
  return (process.env.NEXT_PUBLIC_IMPORT_DATA_LIST_URL || defaultBucketListBase).replace(/\/+$/, '');
}

function encodeObjectPath(relativePath: string) {
  return relativePath
    .replace(/^import_data\//, '')
    .replace(/^\/+/, '')
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

export function publicImportDataUrl(relativePath: string) {
  return `${publicImportDataBaseUrl()}/${encodeObjectPath(relativePath)}`;
}

export async function readPublicImportJson<T>(relativePath: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(publicImportDataUrl(relativePath), {
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    throw new Error(`Public import data file ${relativePath} returned ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

function stableVersion(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function latestDate(values: Array<string | null | undefined>) {
  const latestMs = values.reduce((latest, value) => {
    const parsed = value ? Date.parse(value) : Number.NaN;
    return Number.isFinite(parsed) ? Math.max(latest, parsed) : latest;
  }, 0);
  return latestMs ? new Date(latestMs).toISOString() : null;
}

export async function getPublicImportFileStatus(
  relativePath: string,
  signal?: AbortSignal,
): Promise<PublicImportFileStatus> {
  const response = await fetch(publicImportDataUrl(relativePath), {
    method: 'HEAD',
    cache: 'no-store',
    signal,
  });
  if (response.status === 404) {
    return { exists: false, version: `${relativePath}:missing`, updatedAt: null };
  }
  if (!response.ok) {
    throw new Error(`Public import data status for ${relativePath} returned ${response.status} ${response.statusText}`);
  }

  const updatedAt = response.headers.get('last-modified');
  const versionSeed = [
    relativePath,
    response.headers.get('etag'),
    updatedAt,
    response.headers.get('content-length'),
  ].join(':');
  return {
    exists: true,
    version: stableVersion(versionSeed),
    updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
  };
}

async function importFilesStatus(files: string[], signal?: AbortSignal): Promise<PublicPageDataStatus> {
  const statuses = await Promise.all(files.map(async file => {
    try {
      return await getPublicImportFileStatus(file, signal);
    } catch {
      return { exists: false, version: `${file}:unavailable`, updatedAt: null };
    }
  }));
  return {
    version: stableVersion(statuses.map(status => status.version).join('|')),
    updatedAt: latestDate(statuses.map(status => status.updatedAt)),
  };
}

function xmlValues(xml: string, tag: string) {
  return Array.from(xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'g')))
    .map(match => match[1]?.trim() ?? '');
}

async function listPrefixStatus(prefix: string, signal?: AbortSignal): Promise<PublicPageDataStatus> {
  const query = new URLSearchParams({ 'list-type': '2', prefix });
  const response = await fetch(`${publicImportListBaseUrl()}/?${query.toString()}`, {
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    throw new Error(`Public S3 prefix ${prefix} returned ${response.status} ${response.statusText}`);
  }
  const xml = await response.text();
  const keys = xmlValues(xml, 'Key');
  const updated = xmlValues(xml, 'LastModified');
  const etags = xmlValues(xml, 'ETag');
  const versions = keys.map((key, index) => `${key}:${updated[index] ?? ''}:${etags[index] ?? ''}`);
  return {
    version: stableVersion(versions.join('|') || `${prefix}:empty`),
    updatedAt: latestDate(updated),
  };
}

async function socialStatus(ticker: string, signal?: AbortSignal): Promise<PublicPageDataStatus> {
  const normalizedTicker = normalizeTicker(ticker);
  const [reddit, x, stocktwits] = await Promise.all([
    listPrefixStatus(`social-data/Reddit_${normalizedTicker}`, signal).catch(() => null),
    listPrefixStatus(`social-data/Twitter__${normalizedTicker}`, signal).catch(() => null),
    importFilesStatus([stocktwitsFile(normalizedTicker)], signal).catch(() => null),
  ]);
  const statuses = [reddit, x, stocktwits].filter((status): status is PublicPageDataStatus => Boolean(status));
  return {
    version: stableVersion(statuses.map(status => status.version).join('|') || 'social:unavailable'),
    updatedAt: latestDate(statuses.map(status => status.updatedAt)),
  };
}

async function pageStatus(
  source: PageDataSource,
  ticker: string,
  signal?: AbortSignal,
): Promise<PublicPageDataStatus> {
  if (source.type === 'import-files') return importFilesStatus(source.files, signal);
  if (source.type === 'social-data') return socialStatus(ticker, signal);
  return listPrefixStatus(`report_data/`, signal).catch(() => ({
    version: stableVersion('reports:unavailable'),
    updatedAt: null,
  }));
}

export async function getPublicTickerDataStatus(
  ticker: string,
  signal?: AbortSignal,
): Promise<PublicTickerDataStatus> {
  const normalizedTicker = normalizeTicker(ticker);
  const sources = getPageDataSources(normalizedTicker);
  const entries = await Promise.all(
    Object.entries(sources).map(async ([slug, source]) => [
      slug,
      await pageStatus(source, normalizedTicker, signal),
    ] as const),
  );
  const pages = Object.fromEntries(entries);
  return {
    ticker: normalizedTicker,
    version: stableVersion(entries.map(([slug, status]) => `${slug}:${status.version}`).join('|')),
    updatedAt: latestDate(entries.map(([, status]) => status.updatedAt)),
    pages,
  };
}
