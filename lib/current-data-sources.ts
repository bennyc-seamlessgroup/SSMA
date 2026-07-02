import { getImportDataRuntimeConfig, getImportFileStatus } from '@/lib/import-data';
import { getPageDataSources } from '@/lib/page-data-sources';
import { listReportArchive } from '@/lib/report-archive';
import { getPublicSocialPrefixes, publicSocialPrefixVersion } from '@/lib/social-s3-data';
import { normalizeTicker, stocktwitsFile } from '@/lib/ticker-data';

export type CurrentDataSourceRow = {
  page: string;
  connection: string;
  jsonSource: string;
  owner: string;
  lastUpdated: string | null;
  status: 'Ready' | 'Missing' | 'Unavailable';
  recordCount: number | null;
};

const currentPageLabels: Record<string, string> = {
  'dashboard-v2': 'Dashboard',
  institutional: 'Ownership',
  'internal-float-v2': 'Internal Float',
  'short-interest': 'Short Interest',
  'lending-pressure': 'Lending Pressure',
  'squeeze-readiness': 'Squeeze Readiness',
  sentiment: 'Social Sentiment',
  'event-calendar': 'SEC Filings',
  reports: 'Report Archive',
};

function connectorOwner(path: string) {
  if (/margin_inputs/i.test(path)) return 'Operations Portal';
  if (/v2_user_inputs/i.test(path)) return 'Authenticated User Input API';
  if (/news_filings/i.test(path)) return 'SEC Filings API';
  if (/report_data\/ai_analysis/i.test(path)) return 'AI Analysis Pipeline';
  if (/dashboard_v2_events/i.test(path)) return 'Event Consolidation Pipeline';
  return 'Data Sync Pipeline';
}

export async function getCurrentDataSourceRows(rawTicker: string): Promise<CurrentDataSourceRow[]> {
  const ticker = normalizeTicker(rawTicker);
  const runtime = getImportDataRuntimeConfig();
  const sources = getPageDataSources(ticker);
  const rows: CurrentDataSourceRow[] = [];

  for (const [slug, pageLabel] of Object.entries(currentPageLabels)) {
    const source = sources[slug];
    if (!source) continue;

    if (source.type === 'import-files') {
      const statuses = await Promise.all(source.files.map(file => getImportFileStatus(file).catch(() => null)));
      source.files.forEach((file, index) => {
        const status = statuses[index];
        rows.push({
          page: pageLabel,
          connection: runtime.source === 's3' ? 'Amazon S3 JSON' : 'Local JSON',
          jsonSource: file,
          owner: connectorOwner(file),
          lastUpdated: status?.updatedAt ?? null,
          status: status ? (status.exists ? 'Ready' : 'Missing') : 'Unavailable',
          recordCount: null,
        });
      });
      continue;
    }

    if (source.type === 'social-data') {
      const prefixes = getPublicSocialPrefixes(ticker);
      const [reddit, x, stocktwits] = await Promise.all([
        publicSocialPrefixVersion(prefixes.reddit).catch(() => null),
        publicSocialPrefixVersion(prefixes.x).catch(() => null),
        getImportFileStatus(stocktwitsFile(ticker)).catch(() => null),
      ]);
      rows.push(
        {
          page: pageLabel,
          connection: 'Public S3 Prefix',
          jsonSource: `${prefixes.reddit}*.json`,
          owner: 'Social Data Pipeline',
          lastUpdated: reddit?.updatedAt ?? null,
          status: reddit ? 'Ready' : 'Unavailable',
          recordCount: reddit?.count ?? null,
        },
        {
          page: pageLabel,
          connection: 'Public S3 Prefix',
          jsonSource: `${prefixes.x}*.json`,
          owner: 'Social Data Pipeline',
          lastUpdated: x?.updatedAt ?? null,
          status: x ? 'Ready' : 'Unavailable',
          recordCount: x?.count ?? null,
        },
        {
          page: pageLabel,
          connection: runtime.source === 's3' ? 'Amazon S3 JSON' : 'Local JSON',
          jsonSource: stocktwitsFile(ticker),
          owner: 'Operations Portal',
          lastUpdated: stocktwits?.updatedAt ?? null,
          status: stocktwits ? (stocktwits.exists ? 'Ready' : 'Missing') : 'Unavailable',
          recordCount: null,
        },
      );
      continue;
    }

    const reports = await listReportArchive(ticker).catch(() => null);
    rows.push({
      page: pageLabel,
      connection: 'Public S3 Prefix',
      jsonSource: `report_data/*/${ticker}_report_data.json`,
      owner: 'Report Generation Pipeline',
      lastUpdated: reports?.[0]?.generatedAt ?? null,
      status: reports ? 'Ready' : 'Unavailable',
      recordCount: reports?.length ?? null,
    });
  }

  return rows;
}
