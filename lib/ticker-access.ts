import { defaultTicker, normalizeTicker } from '@/lib/ticker-data';

export type CompanyAccessEntry = {
  ticker?: unknown;
  role?: unknown;
  name?: unknown;
  companyName?: unknown;
};

export type TickerAccessProfile = {
  role?: unknown;
  ticker?: unknown;
  tickers?: unknown;
  defaultTicker?: unknown;
  default_ticker?: unknown;
  companyAccess?: unknown;
  company_access?: unknown;
  [key: string]: unknown;
};

function arrayTickers(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (typeof item === 'string') return [normalizeTicker(item, '')];
    if (item && typeof item === 'object') {
      return [normalizeTicker((item as CompanyAccessEntry).ticker, '')];
    }
    return [];
  }).filter(ticker => Boolean(ticker) && ticker !== 'NONE');
}

export function allowedTickersFromProfile(profile: TickerAccessProfile | null | undefined) {
  if (String(profile?.role ?? '').trim().toUpperCase() === 'DEMO') {
    return [defaultTicker];
  }
  const values = [
    normalizeTicker(profile?.ticker, ''),
    ...arrayTickers(profile?.tickers),
    ...arrayTickers(profile?.companyAccess),
    ...arrayTickers(profile?.company_access),
  ].filter(ticker => Boolean(ticker) && ticker !== 'NONE');
  const unique = Array.from(new Set(values));
  if (unique.length) return unique;
  return profile ? [] : [defaultTicker];
}

export function companyAccessFromProfile(profile: TickerAccessProfile | null | undefined) {
  const source = Array.isArray(profile?.companyAccess)
    ? profile.companyAccess
    : Array.isArray(profile?.company_access)
      ? profile.company_access
      : [];
  const metadata = new Map<string, { ticker: string; role: string; name: string }>();

  source.forEach(item => {
    if (!item || typeof item !== 'object') return;
    const entry = item as CompanyAccessEntry;
    const ticker = normalizeTicker(entry.ticker, '');
    if (!ticker) return;
    metadata.set(ticker, {
      ticker,
      role: String(entry.role ?? 'Viewer'),
      name: String(entry.name ?? entry.companyName ?? ''),
    });
  });

  return allowedTickersFromProfile(profile).map(ticker => metadata.get(ticker) ?? {
    ticker,
    role: 'Viewer',
    name: '',
  });
}

export function defaultTickerFromProfile(profile: TickerAccessProfile | null | undefined) {
  const allowed = allowedTickersFromProfile(profile);
  const preferred = normalizeTicker(profile?.defaultTicker ?? profile?.default_ticker ?? profile?.ticker, '');
  return preferred && allowed.includes(preferred) ? preferred : allowed[0] ?? defaultTicker;
}

export function profileAllowsTicker(profile: TickerAccessProfile | null | undefined, ticker: string) {
  return allowedTickersFromProfile(profile).includes(normalizeTicker(ticker));
}

export function authorizedMonitorRedirect(pathname: string, profile: TickerAccessProfile | null | undefined) {
  const allowed = allowedTickersFromProfile(profile);
  if (!allowed.length) return `/monitor/${defaultTicker}/companies`;
  const defaultCompany = defaultTickerFromProfile(profile);
  const match = pathname.match(/^\/monitor\/([^/]+)(\/.*)?$/i);
  if (!match) return `/monitor/${defaultCompany}/dashboard`;
  const requestedTicker = normalizeTicker(match[1]);
  if (profileAllowsTicker(profile, requestedTicker)) return pathname;
  return `/monitor/${defaultCompany}${match[2] || '/dashboard'}`;
}
