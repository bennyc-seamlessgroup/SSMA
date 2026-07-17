import { normalizeTicker } from '@/lib/ticker-data';

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

export function publicImportDataBaseUrl() {
  return (process.env.NEXT_PUBLIC_IMPORT_DATA_BASE_URL || defaultBucketBase).replace(/\/+$/, '');
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

export async function getPublicTickerDataStatus(
  ticker: string,
  _signal?: AbortSignal,
): Promise<PublicTickerDataStatus> {
  const normalizedTicker = normalizeTicker(ticker);
  return {
    ticker: normalizedTicker,
    version: stableVersion('api-only'),
    updatedAt: null,
    pages: {},
  };
}
