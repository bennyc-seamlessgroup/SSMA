export type CurrentDataSourceRow = {
  page: string;
  connection: string;
  jsonSource: string;
  owner: string;
  lastUpdated: string | null;
  status: 'Ready' | 'Missing' | 'Unavailable';
  recordCount: number | null;
};

export async function getCurrentDataSourceRows(_rawTicker: string): Promise<CurrentDataSourceRow[]> {
  const rows: CurrentDataSourceRow[] = [];
  const apiRows = [
    ['Dashboard', '/market-data/current + /market-data/history'],
    ['Ownership', '/market-data/current?category=ownership-current + /market-data/history?category=ownership-history'],
    ['Internal Float', '/market-data/current?category=internal-float-current + /manual-input/internal-float-inputs'],
    ['Short Interest', '/market-data/current?category=market-current + /market-data/history'],
    ['Lending Pressure', '/market-data/current?category=market-current + /market-data/history?category=market-history'],
    ['Social Sentiment', '/social-data + /market-data/current?category=sentiment-current + /market-data/history?category=sentiment-events'],
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

  return rows;
}
