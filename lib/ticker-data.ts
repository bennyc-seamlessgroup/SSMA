export const defaultTicker = 'CURR';

export function normalizeTicker(value: unknown, fallback = defaultTicker) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (/^[A-Z0-9.-]{1,10}$/.test(normalized)) return normalized;
  return fallback;
}

export function tickerFile(template: string, ticker: string) {
  return template.replaceAll('{ticker}', normalizeTicker(ticker));
}

export function configuredTickerFile(template: string, ticker: string) {
  const normalizedTicker = normalizeTicker(ticker);
  if (template.includes('{ticker}')) return tickerFile(template, normalizedTicker);
  return template.replaceAll(defaultTicker, normalizedTicker);
}

export function dashboardV2File(ticker: string) {
  return tickerFile('dashboard_v2_{ticker}_consolidated_4_web.json', ticker);
}

export function dashboardMarginFile(ticker: string) {
  return tickerFile('dashboard/{ticker}_margin_inputs.json', ticker);
}

export function institutionalOverviewFile(ticker: string) {
  return tickerFile('institutional_ownership_{ticker}_consolidated_4_web.json', ticker);
}

export function institutionalSecurityFile(ticker: string) {
  return tickerFile('fintel_security_ownership_premium_{ticker}_consolidated_4_web.json', ticker);
}

export function institutionalActivistFile(ticker: string) {
  return tickerFile('fintel_activist_filings_premium_{ticker}_consolidated_4_web.json', ticker);
}

export function shortInterestFile(ticker: string) {
  return tickerFile('ortex_{ticker}_consolidated_4_web.json', ticker);
}

export function lendingPressureFile(ticker: string) {
  return tickerFile('lending_pressure_{ticker}_consolidated_4_web.json', ticker);
}

export function aiAnalysisFile(ticker: string) {
  return tickerFile('report_data/ai_analysis_{ticker}.json', ticker);
}

export function internalFloatUserInputFile(ticker: string) {
  return tickerFile('{ticker}_v2_user_inputs.json', ticker);
}

export function secFilingsFile(ticker: string) {
  return tickerFile('news_filings/{ticker}_sec_filings.json', ticker);
}

export function stocktwitsFile(ticker: string) {
  return tickerFile('social/stocktwits_{ticker}_mentions.json', ticker);
}

export function legacyStocktwitsFile(ticker: string) {
  return tickerFile('adanos-stocktwits_{ticker}_consolidated_4_web.json', ticker);
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
