import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type ImportDataVersion = {
  version: string;
  updatedAt: string | null;
  fileCount: number;
};

const importDataRoot = path.join(process.cwd(), 'import_data');

function listJsonFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJsonFiles(fullPath);
    if (!entry.isFile() || !entry.name.endsWith('.json')) return [];
    return fullPath;
  });
}

export function getImportDataVersion(): ImportDataVersion {
  const files = listJsonFiles(importDataRoot).sort();
  const hash = crypto.createHash('sha256');
  let latestModifiedMs = 0;

  for (const file of files) {
    const stat = fs.statSync(file);
    const relativePath = path.relative(importDataRoot, file);
    latestModifiedMs = Math.max(latestModifiedMs, stat.mtimeMs);
    hash.update(relativePath);
    hash.update('\0');
    hash.update(fs.readFileSync(file));
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
