import companyProfileCurrentJson from '@/reference-data/centralized-v2/current/CURR/company-profile-current.json';
import internalFloatCurrentJson from '@/reference-data/centralized-v2/current/CURR/internal-float-current.json';
import marketCurrentJson from '@/reference-data/centralized-v2/current/CURR/market-current.json';
import ownershipCurrentJson from '@/reference-data/centralized-v2/current/CURR/ownership-current.json';
import ftdHistoryJson from '@/reference-data/centralized-v2/history/CURR/ftd-history.json';
import marketHistoryJson from '@/reference-data/centralized-v2/history/CURR/market-history.json';
import ownershipHistoryJson from '@/reference-data/centralized-v2/history/CURR/ownership-history.json';
import secFilingsHistoryJson from '@/reference-data/centralized-v2/history/CURR/sec-filings-history.json';
import shortVolumeHistoryJson from '@/reference-data/centralized-v2/history/CURR/short-volume-history.json';
import internalFloatInputsJson from '@/reference-data/centralized-v2/manual-input/internal-float-inputs/CURR/internal-float-inputs.json';
import issuedShareJson from '@/reference-data/centralized-v2/manual-input/issued-share/CURR/issued-share.json';
import managementHoldingsJson from '@/reference-data/centralized-v2/manual-input/management-holdings/CURR/management-holdings.json';
import secFilingsJson from '@/reference-data/centralized-v2/manual-input/sec-filings/CURR/sec-filings.json';
import demoReportJson from '@/public/report-templates/daily-close/report-data.json';
import { demoInternalFloatUserInputs } from './internal-float-demo';
import { publicDemoProfile, publicDemoTicker } from './public-demo';

type Row = Record<string, unknown>;

const dayMs = 24 * 60 * 60 * 1000;
const demoGeneratedAt = '2026-06-12T23:59:00Z';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function objectValue(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function dateDaysAgo(days: number) {
  const date = new Date(Date.now() - days * dayMs);
  return date.toISOString().slice(0, 10);
}

function demoSocialRecords() {
  const definitions = [
    ['X', 'Bullish', 82, 'Momentum remains constructive as investors monitor lending conditions.', 0],
    ['Reddit', 'Neutral', 55, 'Discussion is focused on the latest filing and upcoming company developments.', 0],
    ['Stocktwits', 'Bullish', 76, '$CURR traders are watching the recent volume expansion and borrow availability.', 1],
    ['LinkedIn', 'Neutral', 58, 'CURRENC Group shared a corporate update with its professional community.', 1],
    ['X', 'Bearish', 28, 'Some traders remain cautious about volatility and elevated borrowing costs.', 2],
    ['Reddit', 'Bullish', 71, 'Shareholders discussed the improving market structure and recent disclosures.', 2],
    ['Stocktwits', 'Neutral', 51, '$CURR is consolidating while market participants wait for the next catalyst.', 3],
    ['Facebook', 'Neutral', 50, 'Community members shared the company’s latest public announcement.', 3],
    ['X', 'Bullish', 79, 'Short-side pressure and limited inventory remain prominent discussion points.', 4],
    ['Reddit', 'Bearish', 35, 'Investors debated liquidity risk and the durability of the recent move.', 5],
    ['Stocktwits', 'Bullish', 74, '$CURR sentiment improved as attention returned to trading volume.', 6],
  ] as const;

  return definitions.map(([platform, sentiment, score, content, daysAgo], index) => {
    const postDate = dateDaysAgo(daysAgo);
    return {
      id: `demo-social-${index + 1}`,
      key: `demo/${platform}/${postDate}/${index + 1}`,
      ticker: publicDemoTicker,
      platform,
      postDate,
      datetime: `${postDate}T${String(15 + index % 5).padStart(2, '0')}:15:00Z`,
      author: platform === 'LinkedIn' ? 'CURRENC Group' : `Demo ${platform} Contributor`,
      content,
      sentiment,
      sentimentScore: score,
      followers: 1200 + index * 175,
      likes: 18 + index * 3,
      comments: 3 + index,
      retweets: platform === 'X' ? 4 + index : 0,
      upvotes: platform === 'Reddit' ? 12 + index : 0,
      url: 'https://example.com/demo-social-post',
    };
  });
}

const socialRecords = demoSocialRecords();

function sentimentPayload() {
  const timeline = socialRecords.map(record => ({
    bucketStart: `${record.postDate}T00:00:00Z`,
    platform: record.platform,
    mentions: 1,
    sentimentScore: record.sentimentScore,
    distribution: {
      positiveCount: record.sentiment === 'Bullish' ? 1 : 0,
      neutralCount: record.sentiment === 'Neutral' ? 1 : 0,
      negativeCount: record.sentiment === 'Bearish' ? 1 : 0,
    },
  }));
  const positive = socialRecords.filter(record => record.sentiment === 'Bullish').length;
  const neutral = socialRecords.filter(record => record.sentiment === 'Neutral').length;
  const negative = socialRecords.filter(record => record.sentiment === 'Bearish').length;
  const score = socialRecords.reduce((sum, record) => sum + record.sentimentScore, 0) / socialRecords.length;
  const platformBreakdown = ['Reddit', 'X', 'Facebook', 'LinkedIn', 'Stocktwits'].map(platform => {
    const rows = socialRecords.filter(record => record.platform === platform);
    return {
      platform,
      mentions: rows.length,
      sentimentScore: rows.length ? rows.reduce((sum, record) => sum + record.sentimentScore, 0) / rows.length : null,
    };
  });
  const period = {
    start: `${dateDaysAgo(364)}T00:00:00Z`,
    end: `${dateDaysAgo(0)}T23:59:59Z`,
    totalMentions: socialRecords.length,
    overallSentimentScore: score,
    previousOverallSentimentScore: 57,
    distribution: { positiveCount: positive, neutralCount: neutral, negativeCount: negative },
    platformBreakdown,
    timeline,
  };
  return {
    schemaVersion: 1,
    ticker: publicDemoTicker,
    generatedAt: new Date().toISOString(),
    snapshotDate: dateDaysAgo(0),
    periods: { '1D': period, '7D': period, '1W': period, '1M': period, '6M': period, '1Y': period },
  };
}

const sentimentCurrent = sentimentPayload();
const sentimentEvents = {
  schemaVersion: 1,
  ticker: publicDemoTicker,
  generatedAt: sentimentCurrent.generatedAt,
  records: socialRecords,
};

function enrichedMarketCurrent() {
  const current = clone(marketCurrentJson) as Row;
  const latestVolume = (shortVolumeHistoryJson.records.at(-1) ?? {}) as Row;
  current.price = {
    value: 3.25,
    open: 3.1151,
    high: 3.45,
    low: 3.03,
    close: 3.25,
    asOf: '2026-06-12T20:00:00Z',
    source: 'Demonstration market snapshot',
  };
  current.tradeVolume = 204973;
  current.exchangeVolume = Object.fromEntries(Object.entries(latestVolume).filter(([key, value]) => (
    !['date', 'totalVolumeReported', 'totalShortVolumeReported', 'totalLongVolumeReported'].includes(key)
    && typeof value === 'number'
  )));
  current.otherDateData = [{ field: 'exchangeVolume', date: '2026-06-12' }];
  return current;
}

function enrichedMarketHistory() {
  const payload = clone(marketHistoryJson) as { records: Row[] } & Row;
  payload.records = payload.records.map((row, index) => ({
    ...row,
    open: index === 0 ? 3.04 : 3.1151,
    high: index === 0 ? 3.21 : 3.45,
    low: index === 0 ? 2.97 : 3.03,
    close: index === 0 ? 3.08 : 3.25,
    price: index === 0 ? 3.08 : 3.25,
    tradeVolume: index === 0 ? 161240 : 204973,
  }));
  return payload;
}

const marketCurrent = enrichedMarketCurrent();
const marketHistory = enrichedMarketHistory();
const exchangeVolumeHistory = {
  schemaVersion: 1,
  ticker: publicDemoTicker,
  generatedAt: demoGeneratedAt,
  records: shortVolumeHistoryJson.records.map(row => ({ ...row, tradeDate: row.date })),
};

const demoStrategicRecords = demoInternalFloatUserInputs.privateHoldings.map(row => ({
  ...row,
  createdBy: 'demo-session',
  createdAt: demoGeneratedAt,
  updatedBy: 'demo-session',
  updatedAt: demoGeneratedAt,
  deletedAt: null,
}));
const demoStrategicShares = demoStrategicRecords
  .filter(row => row.includeInDeduction !== false)
  .reduce((sum, row) => sum + row.shares, 0);

const demoInternalFloatInputs = {
  ...clone(internalFloatInputsJson),
  managementStrategicHoldings: { records: demoStrategicRecords },
};

const demoInternalFloatCurrent = (() => {
  const payload = clone(internalFloatCurrentJson);
  const tokenizedShares = Number(payload.tokenizedShares?.shares ?? 0);
  const collateralizedShares = Number(payload.collateralizedShares?.shares ?? 0);
  const realTradableShares = Math.max(0,
    Number(payload.issuedShare ?? 0)
      - Number(payload.institutionalSharesLong ?? 0)
      - demoStrategicShares
      - tokenizedShares
      - collateralizedShares,
  );
  return {
    ...payload,
    managementStrategicHoldings: {
      shares: demoStrategicShares,
      records: demoStrategicRecords,
    },
    realTradableFloat: {
      ...payload.realTradableFloat,
      shares: realTradableShares,
      percentOfIssuedShare: Number(payload.issuedShare ?? 0) > 0
        ? realTradableShares / Number(payload.issuedShare) * 100
        : 0,
    },
  };
})();

const demoOwnershipCurrent = (() => {
  const payload = clone(ownershipCurrentJson);
  const issuedShare = Number(payload.issuedShare ?? 0);
  const publicFloatShares = Math.max(0,
    issuedShare - Number(payload.institutionalSharesLong ?? 0) - demoStrategicShares,
  );
  return {
    ...payload,
    strategicEntities: {
      shares: demoStrategicShares,
      percent: issuedShare > 0 ? demoStrategicShares / issuedShare * 100 : 0,
      records: demoStrategicRecords,
    },
    publicFloat: {
      shares: publicFloatShares,
      percent: issuedShare > 0 ? publicFloatShares / issuedShare * 100 : 0,
    },
  };
})();

const ownershipSummaryCurrent = {
  schemaVersion: 1,
  ticker: publicDemoTicker,
  generatedAt: demoGeneratedAt,
  snapshotDate: '2026-06-12',
  summary: {
    IO_Summary_OE_count: 3,
    IO_Summary_OE_shares: 145000,
    IO_Summary_OE_value: 471250,
    IO_Summary_OE_largest_holder: 'Two Sigma Investments, LP',
    IO_Summary_OE_largest_holder_tag: '13F Institution',
    IO_Summary_OE_shares_index: '▲ 6.8%',
    IO_Summary_OE_put_count: 1,
    IO_Summary_OE_put_shares: 18000,
    IO_Summary_OE_put_value: 58500,
    IO_Summary_OE_put_largest_holder: 'Demonstration Fund',
    IO_Summary_OE_put_largest_holder_tag: 'Put exposure',
    IO_Summary_OE_holder_Put_Call_Ratio: 0.12,
    IO_Summary_OE_holder_Put_Call_Ratio_Sentiment: 'Constructive',
  },
};

function manualOwnershipRows() {
  return ownershipHistoryJson.records.map((row, index) => ({
    id: `demo-ownership-${index + 1}`,
    fileDate: row.fileDate,
    effectiveDate: row.effectiveDate,
    source: row.formType,
    investor: row.holderName,
    optionType: '',
    type: 'Shares',
    avgPriceEst: row.shares ? Number(row.value ?? 0) / Number(row.shares) : null,
    shares: row.shares,
    sharesPct: Number(row.shares ?? 0) / Number(ownershipCurrentJson.issuedShare || 1) * 100,
    reportedValue: row.value,
    valueChangePct: row.percentValueChange,
    portAlloc: null,
  }));
}

const securityOwnershipRows = manualOwnershipRows();
const securityOwnershipDates = Array.from(new Set(securityOwnershipRows.map(row => String(row.effectiveDate ?? '')).filter(Boolean))).sort();

const alertCatalog = [
  ['short-selling-pressure-short-interest-float-percent', 'Short Selling Pressure', 'Short Interest Float %', 'shortInterest.percent', '%', '>', 8, 'high'],
  ['short-selling-pressure-short-score', 'Short Selling Pressure', 'Short Score', 'scores.shortScore.value', 'score', '>', 65, 'high'],
  ['lending-borrowing-pressure-borrow-fee-rate', 'Lending & Borrowing Pressure', 'Borrow Fee Rate', 'borrowFee.percent', '%', '>', 20, 'high'],
  ['lending-borrowing-pressure-utilization', 'Lending & Borrowing Pressure', 'Utilization', 'utilization.percent', '%', '>', 80, 'critical'],
  ['lending-borrowing-pressure-shortable-shares', 'Lending & Borrowing Pressure', 'Shortable Shares', 'availableShares.value', 'shares', '<', 1000000, 'high'],
  ['market-movement-volume-spike', 'Market Movement', 'Volume Spike', 'tradeVolume', 'x', '>', 2, 'medium'],
].map(([catalogId, section, monitorField, jsonPath, unit, defaultOperator, defaultThreshold, defaultSeverity]) => ({
  catalogId,
  section,
  monitorField,
  description: `Demonstration alert rule for ${monitorField}.`,
  jsonPath,
  unit,
  defaultOperator,
  defaultThreshold,
  defaultSeverity,
}));

function currentPayload(category: string | null) {
  const categories: Record<string, unknown> = {
    'company-profile-current': companyProfileCurrentJson,
    'market-current': marketCurrent,
    'ownership-current': demoOwnershipCurrent,
    'ownership-summary-current': ownershipSummaryCurrent,
    'internal-float-current': demoInternalFloatCurrent,
    'internal-float-current-user': demoInternalFloatCurrent,
    'sentiment-current': sentimentCurrent,
  };
  return category ? categories[category] ?? {} : categories;
}

function historyPayload(category: string | null) {
  const categories: Record<string, unknown> = {
    'market-history': marketHistory,
    'ownership-history': ownershipHistoryJson,
    'sec-filings-history': secFilingsHistoryJson,
    'short-volume-history': shortVolumeHistoryJson,
    'ftd-history': ftdHistoryJson,
    'exchange-volume-history': exchangeVolumeHistory,
    'sentiment-events': sentimentEvents,
  };
  return category ? categories[category] ?? {} : categories;
}

function socialPayload(params: URLSearchParams) {
  const requestedDate = params.get('date');
  const platform = String(params.get('platform') ?? '').toLowerCase();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const limit = Math.max(1, Number(params.get('limit')) || 100);
  const filtered = socialRecords
    .filter(record => !requestedDate || record.postDate === requestedDate)
    .filter(record => !platform || (
      String(record.platform).toLowerCase() === platform
      || (platform === 'twitter' && record.platform === 'X')
      || (platform === 'linkedin' && record.platform === 'LinkedIn')
    ))
    .sort((left, right) => right.datetime.localeCompare(left.datetime));
  const records = requestedDate ? filtered : filtered.slice((page - 1) * limit, page * limit);
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  return {
    records,
    pagination: {
      page,
      limit,
      totalItems: filtered.length,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

function reportPayload(requestedDate: string) {
  const report = clone(demoReportJson) as Row;
  report.reportDateIso = requestedDate;
  report.reportDate = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${requestedDate}T00:00:00Z`));
  report.generatedAt = `${requestedDate}T23:05:00Z`;
  return report;
}

export async function publicDemoFetch(path: string, options: RequestInit = {}) {
  const method = String(options.method ?? 'GET').toUpperCase();
  if (!['GET', 'HEAD'].includes(method)) {
    throw new Error('The public demonstration workspace is read-only. Sign in to save changes.');
  }

  const url = new URL(path, 'https://demo.currencintelligence.local');
  const ticker = String(url.searchParams.get('ticker') ?? publicDemoTicker).toUpperCase();
  if (ticker !== publicDemoTicker) throw new Error(`Demo data is available only for ${publicDemoTicker}.`);

  let response: unknown;
  if (url.pathname === '/profile') response = publicDemoProfile;
  else if (url.pathname === '/market-data/current') response = currentPayload(url.searchParams.get('category'));
  else if (url.pathname === '/market-data/history') response = historyPayload(url.searchParams.get('category'));
  else if (url.pathname === '/market-data/ai-report') response = {
    created_at_utc: demoGeneratedAt,
    lending_pressure_analysis: 'Demonstration analysis: lending conditions remain elevated and warrant monitoring.',
    short_interest_current_interpretation: 'Demonstration analysis: short interest and borrow conditions indicate elevated short-side pressure.',
  };
  else if (url.pathname === '/market-data/reports') {
    const requestedDate = url.searchParams.get('date');
    response = requestedDate
      ? reportPayload(requestedDate)
      : { dates: ['2026-06-12'], pagination: { page: 1, limit: 100, totalItems: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false } };
  } else if (url.pathname === '/manual-input/sec-filings') response = secFilingsJson;
  else if (url.pathname === '/manual-input/issued-share') response = issuedShareJson;
  else if (url.pathname === '/manual-input/management-holdings') response = managementHoldingsJson;
  else if (url.pathname === '/manual-input/internal-float-inputs-user' || url.pathname === '/manual-input/internal-float-inputs-ticker') response = demoInternalFloatInputs;
  else if (url.pathname === '/manual-input/manual-security-ownership') {
    response = url.searchParams.get('action') === 'available-dates'
      ? { availableDates: securityOwnershipDates }
      : { records: securityOwnershipRows.filter(row => !url.searchParams.get('effectiveDate') || row.effectiveDate === url.searchParams.get('effectiveDate')) };
  } else if (url.pathname === '/social-data') response = socialPayload(url.searchParams);
  else if (url.pathname === '/rule-catalog') response = alertCatalog;
  else if (url.pathname === '/rule-catalog/user-settings') response = [];
  else if (url.pathname === '/alerts') response = { alerts: [], count: 0 };
  else if (url.pathname === `/tickers/${publicDemoTicker}`) response = {
    ticker: publicDemoTicker,
    companyName: companyProfileCurrentJson.companyName,
    status: 'ACTIVE',
    effectiveDate: '2026-06-12',
  };
  else throw new Error(`Demo data is not available for ${url.pathname}.`);

  return clone(response);
}
