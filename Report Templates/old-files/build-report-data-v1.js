const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_JSON = path.resolve(__dirname, 'report-data.json');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(ROOT, relativePath), 'utf8'));
}

function n(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function fmtNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return 'N/A';
  return Math.round(Number(value)).toLocaleString('en-US');
}

function fmtCompact(value) {
  if (value == null || Number.isNaN(Number(value))) return 'N/A';
  const abs = Math.abs(Number(value));
  if (abs >= 1_000_000) return `${(Number(value) / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(Number(value) / 1_000).toFixed(1)}K`;
  return `${Number(value).toFixed(0)}`;
}

function fmtPct(value, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return 'N/A';
  return `${Number(value).toFixed(digits)}%`;
}

function fmtDate(value) {
  if (!value) return 'N/A';
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function fmtShortDate(value) {
  if (!value) return 'N/A';
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function userFacingText(value) {
  return String(value ?? '')
    .replace(/\bORTEX\s+daily\s+records\b/gi, 'daily short-interest records')
    .replace(/\bORTEX\b/gi, 'daily data')
    .replace(/\bFintel\b/gi, 'filing data')
    .replace(/\bWhaleWisdom\b/gi, 'ownership data')
    .replace(/\s+/g, ' ')
    .trim();
}

function seriesValue(row, keys) {
  for (const key of keys) {
    if (row?.[key] != null && Number.isFinite(Number(row[key]))) return Number(row[key]);
  }
  return null;
}

function normalizeFiling(row) {
  const title = row.title || row.description || row.summary || row.excerpt || 'Untitled filing';
  return {
    date: fmtShortDate(row.publishDate || row.filingDate || row.date || row.publishAt),
    formType: row.formType || row.form || row.type || 'N/A',
    title: title.length > 96 ? `${title.slice(0, 96)}...` : title,
  };
}

function buildReportData() {
  const dashboard = readJson('import_data/dashboard_v2_CURR_consolidated_4_web.json');
  const short = readJson('import_data/ortex_CURR_consolidated_4_web.json');
  const reddit = readJson('import_data/adanos-reddit_CURR_consolidated_4_web.json');
  const x = readJson('import_data/adanos-x_CURR_consolidated_4_web.json');
  const filings = readJson('import_data/news_filings/sec_filings.json');

  const current = dashboard.data.current || {};
  const trends = Array.isArray(dashboard.data.trends) ? dashboard.data.trends : [];
  const cardSet = dashboard.data.derived?.dashboardV2?.cards?.['1D']?.cards || {};
  const secRows = Array.isArray(filings.data) ? filings.data : Object.values(filings.data || {});
  const socialTotal = (Array.isArray(reddit) ? reddit.length : 0) + (Array.isArray(x) ? x.length : 0);

  const marketPressure = Math.round(
    n(current.borrowFee) * 0.25 +
    n(current.utilization) * 0.25 +
    n(current.daysToCover) * 5 +
    n(current.sourceRecords?.shortScore?.score) * 0.25
  );

  const dates = trends.map((row) => row.date).filter(Boolean);

  return {
    reportVersion: 'post-market-daily-close-v1',
    company: 'Currenc Group Inc.',
    ticker: 'CURR',
    reportDate: fmtDate(current.date || dashboard.asOfDate),
    generatedAt: new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }),
    status: marketPressure >= 70 ? 'Elevated Closing Risk' : marketPressure >= 45 ? 'Moderate Closing Risk' : 'Low Closing Risk',
    legalDisclaimers: {
      footer: 'For informational purposes only. Not investment advice. Market data and AI-assisted analysis may be inaccurate, delayed, or incomplete.',
      full: 'This report has been prepared by Currenc Intelligence using proprietary analytics, public information, third-party market data, and AI-assisted technologies. It is provided solely for informational purposes and does not constitute investment advice, legal advice, tax advice, accounting advice, investment research, solicitation, or an offer to buy or sell any security. Currenc Intelligence does not guarantee the completeness, accuracy, timeliness, or reliability of any data, analysis, score, forecast, scenario, or alert contained in this report. Users should perform independent due diligence and consult qualified professional advisors before making decisions. Past performance does not guarantee future results.',
    },
    kpis: [
      { label: 'Market Pressure', value: `${marketPressure} / 100`, delta: marketPressure >= 70 ? 'Elevated Closing Risk' : marketPressure >= 45 ? 'Moderate Closing Risk' : 'Low Closing Risk' },
      { label: 'Borrow Fee', value: fmtPct(current.borrowFee), delta: cardSet.borrowFee?.deltaDisplay || 'vs prior close' },
      { label: 'Shortable Shares', value: fmtCompact(current.availableShares), delta: cardSet.availableShares?.deltaDisplay || 'vs prior close' },
      { label: 'Utilization', value: fmtPct(current.utilization), delta: cardSet.utilization?.deltaDisplay || 'vs prior close' },
      { label: 'Days to Cover', value: n(current.daysToCover).toFixed(2), delta: cardSet.daysToCover?.deltaDisplay || 'vs prior close' },
      { label: 'SI / Float', value: fmtPct(current.sourceRecords?.shortInterest?.shortInterestPcFreeFloat), delta: 'reported short interest' },
    ],
    topDailyAlerts: [
      { id: 'borrow_utilization_close', text: `Borrow fee closed at ${fmtPct(current.borrowFee)} while utilization was ${fmtPct(current.utilization)}.` },
      { id: 'shortable_days_to_cover', text: `Shortable shares ended at ${fmtNumber(current.availableShares)}, with days to cover at ${n(current.daysToCover).toFixed(2)}.` },
      { id: 'social_records', text: `Reddit and X feeds contain ${fmtNumber(socialTotal)} monitored records for narrative review.` },
    ],
    charts: [
      { id: 'price', title: 'Price Trend', subtitle: 'Daily close price', color: '#2b7fc3', unit: 'money', dates, values: trends.map((row) => seriesValue(row, ['price', 'close'])) },
      { id: 'borrowFee', title: 'Borrow Fee Trend', subtitle: 'Daily borrow cost', color: '#d84b42', unit: 'percent', dates, values: trends.map((row) => seriesValue(row, ['borrowFee', 'feeRate', 'costToBorrowAll'])) },
      { id: 'shortableShares', title: 'Shortable Shares Trend', subtitle: 'Available shares', color: '#e19713', unit: 'shares', dates, values: trends.map((row) => seriesValue(row, ['availableShares', 'shortableShares', 'shortAvailabilityShares'])) },
      { id: 'volume', title: 'Trade Volume Trend', subtitle: 'Daily share volume', color: '#8f98a6', unit: 'volume', dates, values: trends.map((row) => seriesValue(row, ['tradeVolume', 'volume'])) },
      { id: 'utilization', title: 'Utilization Trend', subtitle: 'Lending pool utilization', color: '#15936f', unit: 'percent', dates, values: trends.map((row) => seriesValue(row, ['utilization', 'shortAvailabilityPct'])) },
      { id: 'daysToCover', title: 'Days to Cover Trend', subtitle: 'Short interest relative to volume', color: '#6757d8', unit: 'days', dates, values: trends.map((row) => seriesValue(row, ['daysToCover', 'daysToCoverQuantity'])) },
    ],
    managementWatchItems: (short.data.managementWatchItems || []).slice(0, 4).map((text, index) => ({ id: `watch_${index + 1}`, text: userFacingText(text) })),
    social: {
      redditCount: Array.isArray(reddit) ? reddit.length : 0,
      xCount: Array.isArray(x) ? x.length : 0,
      total: socialTotal,
      redditCountDisplay: fmtNumber(Array.isArray(reddit) ? reddit.length : 0),
      xCountDisplay: fmtNumber(Array.isArray(x) ? x.length : 0),
      totalDisplay: fmtNumber(socialTotal),
    },
    secFilings: secRows.slice(0, 3).map(normalizeFiling),
    tomorrowWatchlist: [
      { id: 'borrow_fee_watch', text: `Watch borrow fee moving above ${fmtPct(n(current.borrowFee) + 5)}.` },
      { id: 'shortable_shares_watch', text: `Watch shortable shares falling below ${fmtCompact(n(current.availableShares) * 0.85)}.` },
      { id: 'utilization_watch', text: `Watch utilization moving above ${fmtPct(Math.min(100, n(current.utilization) + 5))}.` },
      { id: 'filing_social_watch', text: 'Watch filings, PR timing, and social narrative acceleration before the open.' },
    ],
    llmSections: {
      executiveSummary: {
        status: 'pending',
        placeholder: 'Daily close summary placeholder. The final version should explain what changed today, whether pressure increased or eased, and what management should watch before the next open.',
      },
      borrowShortInterpretation: {
        status: 'pending',
        placeholder: 'Placeholder interpretation. The LLM should explain whether borrow cost, availability, utilization, and days to cover point to rising, stable, or easing pressure.',
      },
      narrativeSummary: {
        status: 'pending',
        placeholder: 'Placeholder narrative summary. The LLM should summarize top Reddit/X themes, sentiment direction, unusual narrative shifts, and management-facing risk.',
      },
      managementActionQueue: {
        status: 'pending',
        placeholder: 'Placeholder action queue. The LLM should translate the daily data into CEO/CFO, IR, legal, and capital-markets action items.',
      },
    },
  };
}

fs.writeFileSync(OUT_JSON, `${JSON.stringify(buildReportData(), null, 2)}\n`);
console.log(`Wrote ${OUT_JSON}`);
