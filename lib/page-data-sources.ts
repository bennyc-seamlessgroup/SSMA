export type PageDataSource =
  | { type: 'import-files'; files: string[] }
  | { type: 'report-archive' }
  | { type: 'social-data' };

export const pageDataSources: Record<string, PageDataSource> = {
  'dashboard-v2': {
    type: 'import-files',
    files: ['dashboard_v2_CURR_consolidated_4_web.json', 'dashboard_v2_events.json'],
  },
  institutional: {
    type: 'import-files',
    files: [
      'institutional_ownership_CURR_consolidated_4_web.json',
      'fintel_security_ownership_premium_CURR_consolidated_4_web.json',
      'fintel_activist_filings_premium_CURR_consolidated_4_web.json',
    ],
  },
  'short-interest': {
    type: 'import-files',
    files: ['ortex_CURR_consolidated_4_web.json'],
  },
  'lending-pressure': {
    type: 'import-files',
    files: ['lending_pressure_CURR_consolidated_4_web.json'],
  },
  'squeeze-readiness': {
    type: 'import-files',
    files: [
      'short/short_score.json',
      'short/short_interest.json',
      'short/borrow_fee.json',
      'options/gamma_exposure.json',
      'sentiment/social_mentions.json',
      'internal_float/float_adjustments.json',
    ],
  },
  'internal-float-v2': {
    type: 'import-files',
    files: ['institutional_ownership_CURR_consolidated_4_web.json', 'internal_float/CURR_v2_user_inputs.json'],
  },
  sentiment: {
    type: 'social-data',
  },
  'event-calendar': {
    type: 'import-files',
    files: ['news_filings/CURR_sec_filings.json'],
  },
  dashboard: {
    type: 'import-files',
    files: ['dashboard_CURR_consolidated_4_web.json'],
  },
  'internal-float': {
    type: 'import-files',
    files: ['internal_float/internal_float_analysis.json', 'internal_float/manual_holdings.json', 'internal_float/float_adjustments.json'],
  },
  reports: {
    type: 'report-archive',
  },
  'import-data': {
    type: 'import-files',
    files: ['metadata/import_log.json'],
  },
  'source-map': {
    type: 'import-files',
    files: ['metadata/source_map.json'],
  },
  'data-dictionary': {
    type: 'import-files',
    files: ['metadata/data_dictionary.json'],
  },
};

export function slugFromPathname(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts[2] || 'dashboard-v2';
}
