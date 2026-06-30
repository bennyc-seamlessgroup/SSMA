import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getImportFileStatus } from '@/lib/import-data';
import { getPageDataSources } from '@/lib/page-data-sources';
import { listReportArchive } from '@/lib/report-archive';
import { getPublicSocialPrefixes, publicSocialPrefixVersion } from '@/lib/social-s3-data';
import { normalizeTicker, stocktwitsFile } from '@/lib/ticker-data';

export const dynamic = 'force-dynamic';

type PageStatus = {
  version: string;
  updatedAt: string | null;
};

function latestDate(values: Array<string | null | undefined>) {
  const latest = values.reduce((latestMs, value) => {
    if (!value) return latestMs;
    const time = Date.parse(value);
    return Number.isFinite(time) ? Math.max(latestMs, time) : latestMs;
  }, 0);
  return latest ? new Date(latest).toISOString() : null;
}

async function importFilesStatus(files: string[]): Promise<PageStatus> {
  const statuses = await Promise.all(files.map(file => getImportFileStatus(file).catch(() => null)));
  return {
    version: statuses.map((status, index) => {
      if (!status) return `${files[index]}:unavailable`;
      if (!status.exists) return `${files[index]}:missing`;
      return `${files[index]}:${status.versionKey ?? status.updatedAt ?? status.size ?? 'exists'}`;
    }).join('|'),
    updatedAt: latestDate(statuses.map(status => status?.updatedAt)),
  };
}

async function socialStatus(ticker: string): Promise<PageStatus> {
  const prefixes = getPublicSocialPrefixes(ticker);
  const [reddit, x, stocktwits] = await Promise.all([
    publicSocialPrefixVersion(prefixes.reddit).catch(() => null),
    publicSocialPrefixVersion(prefixes.x).catch(() => null),
    getImportFileStatus(stocktwitsFile(ticker)).catch(() => null),
  ]);
  return {
    version: [
      `reddit:${reddit?.version ?? 'unavailable'}`,
      `x:${x?.version ?? 'unavailable'}`,
      `stocktwits:${stocktwits?.versionKey ?? stocktwits?.updatedAt ?? 'missing'}`,
    ].join('|'),
    updatedAt: latestDate([reddit?.updatedAt, x?.updatedAt, stocktwits?.updatedAt]),
  };
}

async function reportsStatus(ticker: string): Promise<PageStatus> {
  try {
    const reports = await listReportArchive(ticker);
    return {
      version: reports.map(report => `${report.dataKey}:${report.generatedAt}:${report.sizeBytes}`).join('|') || 'empty',
      updatedAt: latestDate(reports.map(report => report.generatedAt)),
    };
  } catch {
    return { version: 'reports:unavailable', updatedAt: null };
  }
}

export async function GET(_request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker: rawTicker } = await context.params;
  const ticker = normalizeTicker(rawTicker);
  const sources = getPageDataSources(ticker);
  const pages = Object.fromEntries(await Promise.all(Object.entries(sources).map(async ([slug, source]) => {
    if (source.type === 'social-data') return [slug, await socialStatus(ticker)];
    if (source.type === 'report-archive') return [slug, await reportsStatus(ticker)];
    return [slug, await importFilesStatus(source.files)];
  }))) as Record<string, PageStatus>;
  const version = crypto
    .createHash('sha256')
    .update(Object.entries(pages).map(([slug, status]) => `${slug}:${status.version}`).join('|'))
    .digest('hex');

  return NextResponse.json({
    ticker,
    version,
    updatedAt: latestDate(Object.values(pages).map(page => page.updatedAt)),
    pages,
  }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

