import { getImportDataRuntimeConfig, getImportFileStatus } from '@/lib/import-data';
import { getPageDataSources } from '@/lib/page-data-sources';
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
  'dashboard': 'Dashboard',
  institutional: 'Ownership',
  'internal-float': 'Internal Float',
  'short-interest': 'Short Interest',
  'lending-pressure': 'Lending Pressure',
  'squeeze-readiness': 'Squeeze Readiness',
  sentiment: 'Social Sentiment',
  'event-calendar': 'SEC Filings',
  reports: 'Report Archive',
};

export async function getCurrentDataSourceRows(rawTicker: string): Promise<CurrentDataSourceRow[]> {
  const ticker = normalizeTicker(rawTicker);
  const runtime = getImportDataRuntimeConfig();
  const sources = getPageDataSources(ticker);
  const rows: CurrentDataSourceRow[] = [];
  const apiRows = [
    ['Dashboard', '/market-data/current + /market-data/history'],
    ['Ownership', '/market-data/current?category=ownership-current + /market-data/history?category=ownership-history'],
    ['Internal Float', '/market-data/current?category=internal-float-current + /manual-input/internal-float-inputs'],
    ['Short Interest', '/market-data/current?category=market-current + /market-data/history'],
    ['Lending Pressure', '/market-data/current?category=market-current + /market-data/history?category=market-history'],
    ['SEC Filings', '/manual-input/sec-filings'],
  ];
  rows.push(...apiRows.map(([page, endpoint]) => ({
    page,
    connection: 'Authenticated REST API',
    jsonSource: endpoint,
    owner: 'Centralized Data API',
    lastUpdated: null,
    status: 'Ready' as const,
    recordCount: null,
  })));

  for (const [slug, pageLabel] of Object.entries(currentPageLabels)) {
    const source = sources[slug];
    if (!source) continue;

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

  }

  return rows;
}
