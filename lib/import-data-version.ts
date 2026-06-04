import crypto from 'crypto';
import { getImportFileVersionParts, listImportDataFiles } from '@/lib/import-data';

export type ImportDataVersion = {
  version: string;
  updatedAt: string | null;
  fileCount: number;
};

export async function getImportDataVersion(): Promise<ImportDataVersion> {
  const files = await listImportDataFiles();
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
