export const defaultTicker = 'CURR';

export function normalizeTicker(value: unknown, fallback = defaultTicker) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (/^[A-Z0-9.-]{1,10}$/.test(normalized)) return normalized;
  return fallback;
}

export function tickerFile(template: string, ticker: string) {
  return template.replaceAll('{ticker}', normalizeTicker(ticker));
}

export function stocktwitsFile(ticker: string) {
  return tickerFile('social/stocktwits_{ticker}_mentions.json', ticker);
}

export function redditSocialPrefix(ticker: string) {
  return tickerFile('social-data/Reddit_{ticker}', ticker);
}

export function xSocialPrefix(ticker: string) {
  return tickerFile('social-data/Twitter__{ticker}', ticker);
}

export function facebookSocialPrefix(ticker: string) {
  return tickerFile('social-data/Facebook_{ticker}', ticker);
}

export function linkedinSocialPrefix(ticker: string) {
  return tickerFile('social-data/Linkedin_{ticker}', ticker);
}
