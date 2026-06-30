import {
  aiAnalysisFile,
  dashboardMarginFile,
  dashboardV2File,
  institutionalActivistFile,
  institutionalOverviewFile,
  institutionalSecurityFile,
  internalFloatUserInputFile,
  lendingPressureFile,
  secFilingsFile,
  shortInterestFile,
} from '@/lib/ticker-data';

export type PageDataSource =
  | { type: 'import-files'; files: string[] }
  | { type: 'report-archive' }
  | { type: 'social-data' };

export function getPageDataSources(ticker: string): Record<string, PageDataSource> {
  return {
  'dashboard-v2': {
    type: 'import-files',
    files: [dashboardV2File(ticker), 'dashboard_v2_events.json', dashboardMarginFile(ticker)],
  },
  institutional: {
    type: 'import-files',
    files: [
      institutionalOverviewFile(ticker),
      institutionalSecurityFile(ticker),
      institutionalActivistFile(ticker),
    ],
  },
  'short-interest': {
    type: 'import-files',
    files: [shortInterestFile(ticker), aiAnalysisFile(ticker)],
  },
  'lending-pressure': {
    type: 'import-files',
    files: [lendingPressureFile(ticker), aiAnalysisFile(ticker)],
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
    files: [institutionalOverviewFile(ticker), internalFloatUserInputFile(ticker)],
  },
  sentiment: {
    type: 'social-data',
  },
  'event-calendar': {
    type: 'import-files',
    files: [secFilingsFile(ticker)],
  },
  dashboard: {
    type: 'import-files',
    files: [`dashboard_${ticker.toUpperCase()}_consolidated_4_web.json`],
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
}

export function slugFromPathname(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts[2] || 'dashboard-v2';
}
