export type PageDataSource =
  { type: 'social-data' };

// Market, ownership, short-interest, lending-pressure, SEC filing, and
// internal-float pages use authenticated APIs directly. Only the two
// explicitly retained public-data integrations are tracked here.
export function getPageDataSources(_ticker: string): Record<string, PageDataSource> {
  return {
    sentiment: { type: 'social-data' },
  };
}

export function slugFromPathname(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts[2] || 'dashboard-v2';
}
