import crypto from 'crypto';
import { getImportDataRuntimeConfig, getImportFileVersionParts, listImportDataFiles } from '@/lib/import-data';

export type ImportDataVersion = {
  version: string;
  updatedAt: string | null;
  fileCount: number;
  source: 'local' | 's3';
  cacheSeconds: number;
};

export async function getImportDataVersion(): Promise<ImportDataVersion> {
  const files = await listImportDataFiles();
  const runtime = getImportDataRuntimeConfig();
  const hash = crypto.createHash('sha256');
  let latestModifiedMs = 0;

  for (const file of files) {
    const versionParts = await getImportFileVersionParts(file);
    if (!versionParts) continue;
    latestModifiedMs = Math.max(latestModifiedMs, versionParts.updatedAtMs);
    hash.update(versionParts.path);
    hash.update('\0');
    hash.update(versionParts.versionKey);
    hash.update('\0');
  }

  return {
    version: hash.digest('hex'),
    updatedAt: latestModifiedMs ? new Date(latestModifiedMs).toISOString() : null,
    fileCount: files.length,
    source: runtime.source,
    cacheSeconds: runtime.cacheSeconds,
  };
}

export async function getImportFilesVersion(files: string[]): Promise<ImportDataVersion> {
  const runtime = getImportDataRuntimeConfig();
  const hash = crypto.createHash('sha256');
  let latestModifiedMs = 0;
  let fileCount = 0;

  for (const file of files) {
    const versionParts = await getImportFileVersionParts(file);
    if (!versionParts) continue;
    fileCount += 1;
    latestModifiedMs = Math.max(latestModifiedMs, versionParts.updatedAtMs);
    hash.update(versionParts.path);
    hash.update('\0');
    hash.update(versionParts.versionKey);
    hash.update('\0');
  }

  return {
    version: hash.digest('hex'),
    updatedAt: latestModifiedMs ? new Date(latestModifiedMs).toISOString() : null,
    fileCount,
    source: runtime.source,
    cacheSeconds: runtime.cacheSeconds,
  };
}

export function formatImportDataUpdatedAt(updatedAt: string | null) {
  if (!updatedAt) return 'No import data files found';

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Hong_Kong',
  }).format(new Date(updatedAt));
}
