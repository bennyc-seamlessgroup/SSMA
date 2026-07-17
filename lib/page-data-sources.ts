export type PageDataSource = never;

// Portal datasets are now loaded through authenticated APIs. This mapping
// remains for the public status helper, which currently has no page sources.
export function getPageDataSources(_ticker: string): Record<string, PageDataSource> {
  return {};
}

export function slugFromPathname(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts[2] || 'dashboard';
}
