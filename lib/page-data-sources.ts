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
  const sources: Record<string, PageDataSource> = {
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
  reports: {
    type: 'report-archive',
  },
  };

  sources['import-data'] = {
    type: 'import-files',
    files: Array.from(new Set(
      Object.values(sources)
        .filter((source): source is Extract<PageDataSource, { type: 'import-files' }> => source.type === 'import-files')
        .flatMap(source => source.files),
    )),
  };

  return sources;
}

export function slugFromPathname(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts[2] || 'dashboard-v2';
}
