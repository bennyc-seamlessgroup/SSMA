'use client';

import { fetchAiReport } from '@/lib/ai-report-api';
import { cachedAuthenticatedFetch } from '@/lib/auth-client';
import {
  latestCompleteMarketPublicationRecord,
  marketNumber,
  marketRecordDate,
  type MarketPublicationRecord,
} from '@/lib/market-data-publication';
import { getSentimentCurrent, sentimentPeriod } from '@/lib/social-data-api';
import type { ReportArchiveRecord } from '@/lib/report-archive';

type Row = Record<string, unknown>;
type ApiPayload = Row & { records?: Row[]; generatedAt?: string };

function objectValue(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Row[] : [];
}

function category(payload: ApiPayload, name: string): ApiPayload {
  const direct = objectValue(payload[name]);
  if (Object.keys(direct).length) return direct as ApiPayload;
  const data = objectValue(payload.data);
  const nested = objectValue(data[name]);
  if (Object.keys(nested).length) return nested as ApiPayload;
  if (Object.keys(data).length) return data as ApiPayload;
  return payload;
}

function apiRecords(payload: ApiPayload, name: string) {
  const normalized = category(payload, name);
  return rows(normalized.records ?? normalized.data);
}

function numberOrNull(value: unknown) {
  return marketNumber(value);
}

function percentValue(value: unknown, row: Row) {
  const numeric = numberOrNull(value);
  if (numeric === null) return null;
  return row.valueFormat === 'decimal_ratio' && row.displayFormat === 'percent' ? numeric * 100 : numeric;
}

function formatNumber(value: number | null, digits = 2) {
  return value === null ? 'N/A' : value.toLocaleString('en-US', { maximumFractionDigits: digits });
}

function compactNumber(value: number | null) {
  if (value === null) return 'N/A';
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return formatNumber(value, 0);
}

function signed(value: number, suffix: string, digits = 2) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('en-US', { maximumFractionDigits: digits })}${suffix}`;
}

function comparison(current: number | null, previous: number | null, unit: 'percent' | 'shares' | 'days', inverse = false) {
  if (current === null || previous === null) return { changeValue: '--', changePercent: '--', tone: '' };
  const change = current - previous;
  const percent = previous === 0 ? null : change / Math.abs(previous) * 100;
  const changeValue = unit === 'shares'
    ? `${change > 0 ? '+' : ''}${Math.round(change).toLocaleString('en-US')} shares`
    : unit === 'days'
      ? signed(change, 'd')
      : signed(change, ' pts');
  const riskIncrease = inverse ? change < 0 : change > 0;
  return {
    changeValue,
    changePercent: percent === null ? '--' : signed(percent, '%'),
    tone: change === 0 ? '' : riskIncrease ? 'negative' : 'positive',
  };
}

function latestRows(records: Row[], reportDate: string) {
  return [...records]
    .filter(row => {
      const date = marketRecordDate(row);
      return date && date <= reportDate;
    })
    .sort((a, b) => marketRecordDate(b).localeCompare(marketRecordDate(a)));
}

function chart(records: Row[], field: string, options: { id: string; title: string; subtitle: string; color: string; unit: string; percent?: boolean }) {
  const valid = records
    .map(row => ({
      date: marketRecordDate(row),
      value: options.percent ? percentValue(row[field], row) : numberOrNull(row[field]),
    }))
    .filter((row): row is { date: string; value: number } => Boolean(row.date) && row.value !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);
  const latest = valid.at(-1)?.value ?? null;
  return {
    ...options,
    minValid: 0,
    dates: valid.map(row => row.date),
    values: valid.map(row => row.value),
    latestDisplay: options.unit === 'shares'
      ? compactNumber(latest)
      : options.unit === 'days'
        ? latest === null ? 'N/A' : `${formatNumber(latest)}d`
        : latest === null ? 'N/A' : `${formatNumber(latest)}%`,
  };
}

function sentimentLabel(score: number | null) {
  if (score === null) return 'No data';
  if (score >= 60) return 'Bullish';
  if (score <= 40) return 'Bearish';
  return 'Neutral';
}

function platformName(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'twitter' || normalized === 'x') return 'X';
  if (normalized === 'linkedin' || normalized === 'linked_in') return 'LinkedIn';
  if (normalized === 'stocktwits') return 'Stocktwits';
  if (normalized === 'facebook') return 'Facebook';
  return 'Reddit';
}

function companyName(current: ApiPayload, ticker: string) {
  const profile = category(current, 'company-profile-current');
  const name = String(profile.companyName ?? objectValue(profile.profile).companyName ?? '').trim();
  return name || `${ticker} company name unavailable`;
}

function filingRows(payload: ApiPayload) {
  const directRows = rows(payload.records ?? payload.data);
  return directRows
    .map(row => ({
      date: String(row.filingDate ?? '').slice(0, 10),
      formType: String(row.formType ?? 'SEC'),
      title: String(row.formDescription ?? 'SEC filing'),
    }))
    .filter(row => row.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
}

function displayDate(value: string) {
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(parsed);
}

export async function buildDailyReportData(report: ReportArchiveRecord) {
  const ticker = report.ticker.toUpperCase();
  const [current, history, sentimentCurrent, secFilings, aiReport] = await Promise.all([
    cachedAuthenticatedFetch<ApiPayload>(`/market-data/current?ticker=${encodeURIComponent(ticker)}&category=market-current`),
    cachedAuthenticatedFetch<ApiPayload>(`/market-data/history?ticker=${encodeURIComponent(ticker)}&category=market-history`),
    getSentimentCurrent(ticker).catch(() => ({})),
    cachedAuthenticatedFetch<ApiPayload>(`/manual-input/sec-filings?ticker=${encodeURIComponent(ticker)}`).catch(() => ({})),
    fetchAiReport(ticker).catch(() => ({})),
  ]);

  const historyRecords = apiRecords(history, 'market-history');
  const eligibleRecords = latestRows(historyRecords, report.reportDate);
  const latest = latestCompleteMarketPublicationRecord(eligibleRecords as MarketPublicationRecord[]) ?? eligibleRecords[0] ?? {};
  const latestDate = marketRecordDate(latest) || report.reportDate;
  const prior = eligibleRecords.find(row => marketRecordDate(row) < latestDate) ?? {};
  const metric = (field: string, isPercent = false) => isPercent ? percentValue(latest[field], latest) : numberOrNull(latest[field]);
  const priorMetric = (field: string, isPercent = false) => isPercent ? percentValue(prior[field], prior) : numberOrNull(prior[field]);

  const shortInterestPercent = metric('shortInterestPercent');
  const borrowFee = metric('borrowFeePercent');
  const initialMargin = metric('initialMargin', true);
  const maintenanceMargin = metric('maintenanceMargin', true);
  const shortableShares = metric('availableShares');
  const utilization = metric('utilizationPercent');
  const averageDurationValues = eligibleRecords
    .map(row => numberOrNull(row.averageDurationDays))
    .filter((value): value is number => value !== null && value > 0);
  const averageDuration = averageDurationValues[0] ?? null;
  const priorAverageDuration = averageDurationValues[1] ?? null;
  const daysToCover = metric('daysToCover');
  const shortScore = metric('shortScore');
  const previousShortScore = priorMetric('shortScore');
  const roundedScore = shortScore === null ? null : Math.round(shortScore);
  const scoreLevel = roundedScore === null ? 'Unavailable' : roundedScore >= 80 ? 'Extreme' : roundedScore >= 65 ? 'High' : roundedScore >= 40 ? 'Moderate' : 'Low';
  const scoreTone = roundedScore === null ? '' : scoreLevel.toLowerCase();
  const scoreComparison = comparison(shortScore, previousShortScore, 'percent');

  const oneDay = sentimentPeriod(sentimentCurrent, '1D');
  const distribution = objectValue(oneDay.distribution);
  const positiveCount = numberOrNull(distribution.positiveCount ?? distribution.positive) ?? 0;
  const neutralCount = numberOrNull(distribution.neutralCount ?? distribution.neutral) ?? 0;
  const negativeCount = numberOrNull(distribution.negativeCount ?? distribution.negative) ?? 0;
  const totalMentions = numberOrNull(oneDay.totalMentions ?? oneDay.mentionCount) ?? positiveCount + neutralCount + negativeCount;
  const overallScore = numberOrNull(oneDay.overallSentimentScore ?? oneDay.sentimentScore);
  const previousOverallScore = numberOrNull(oneDay.previousOverallSentimentScore ?? oneDay.previousSentimentScore ?? objectValue(oneDay.comparison).previousScore);
  const sentimentDelta = overallScore !== null && previousOverallScore !== null ? overallScore - previousOverallScore : null;
  const platformRows = rows(oneDay.platformBreakdown)
    .map(row => {
      const count = numberOrNull(row.count ?? row.mentions ?? row.mentionCount) ?? 0;
      const score = numberOrNull(row.sentimentScore ?? row.score);
      return {
        name: platformName(row.platform ?? row.name),
        mentions: count,
        mentionsDisplay: formatNumber(count, 0),
        sharePercent: totalMentions ? count / totalMentions * 100 : 0,
        sentimentLabel: sentimentLabel(score),
      };
    })
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 5);

  const percentOfMentions = (count: number) => totalMentions ? count / totalMentions * 100 : 0;
  const scoreDelta = shortScore !== null && previousShortScore !== null
    ? `${signed(shortScore - previousShortScore, '')} (${previousShortScore === 0 ? '--' : signed((shortScore - previousShortScore) / Math.abs(previousShortScore) * 100, '%')})`
    : '--';

  return {
    reportVersion: 'post-market-daily-close-lean-v1',
    sampleMode: false,
    company: companyName(current, ticker),
    ticker,
    reportDate: displayDate(latestDate),
    generatedAt: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
    status: `${scoreLevel} Short Interest Pressure`,
    legalDisclaimers: {
      footer: 'For informational purposes only. Not investment advice. Market data may be delayed or incomplete.',
    },
    snapshotKpis: [
      { label: 'Short Interest %', value: shortInterestPercent === null ? 'N/A' : `${formatNumber(shortInterestPercent)}%`, ...comparison(shortInterestPercent, priorMetric('shortInterestPercent'), 'percent') },
      { label: 'Borrow Fee', value: borrowFee === null ? 'N/A' : `${formatNumber(borrowFee)}%`, ...comparison(borrowFee, priorMetric('borrowFeePercent'), 'percent') },
      { label: 'Initial Margin', value: initialMargin === null ? 'N/A' : `${formatNumber(initialMargin)}%`, ...comparison(initialMargin, priorMetric('initialMargin', true), 'percent') },
      { label: 'Maintenance Margin', value: maintenanceMargin === null ? 'N/A' : `${formatNumber(maintenanceMargin)}%`, ...comparison(maintenanceMargin, priorMetric('maintenanceMargin', true), 'percent') },
      { label: 'Shortable Shares', value: compactNumber(shortableShares), ...comparison(shortableShares, priorMetric('availableShares'), 'shares', true) },
      { label: 'Utilization', value: utilization === null ? 'N/A' : `${formatNumber(utilization)}%`, ...comparison(utilization, priorMetric('utilizationPercent'), 'percent') },
      { label: 'Average Duration', value: averageDuration === null ? 'N/A' : `${formatNumber(averageDuration)}d`, ...comparison(averageDuration, priorAverageDuration, 'days') },
      { label: 'Days to Cover', value: daysToCover === null ? 'N/A' : `${formatNumber(daysToCover)}d`, ...comparison(daysToCover, priorMetric('daysToCover'), 'days') },
    ],
    shortInterestScore: {
      score: roundedScore ?? 0,
      scoreDisplay: roundedScore === null ? 'N/A' : String(roundedScore),
      level: scoreLevel,
      tone: scoreTone,
      color: scoreLevel === 'Extreme' || scoreLevel === 'High' ? '#cf3e4f' : scoreLevel === 'Moderate' ? '#e19713' : '#15936f',
      changeDisplay: scoreDelta,
      deltaTone: scoreComparison.tone,
      summary: roundedScore === null
        ? 'A short-interest score is not available for this report date.'
        : roundedScore >= 80
          ? 'Severe short-side pressure warrants close review.'
          : roundedScore >= 65
            ? 'Elevated short-side conditions may increase squeeze sensitivity.'
            : roundedScore >= 40
              ? 'Short-side pressure is developing and should be monitored.'
              : 'Current short-side pressure is relatively contained.',
      ranges: [
        { range: '0-39', level: 'Low', description: 'Pressure is relatively contained.', active: roundedScore !== null && roundedScore < 40 },
        { range: '40-64', level: 'Moderate', description: 'Pressure is developing.', active: roundedScore !== null && roundedScore >= 40 && roundedScore < 65 },
        { range: '65-79', level: 'High', description: 'Elevated squeeze sensitivity.', active: roundedScore !== null && roundedScore >= 65 && roundedScore < 80 },
        { range: '80-100', level: 'Extreme', description: 'Severe pressure warrants review.', active: roundedScore !== null && roundedScore >= 80 },
      ],
      aiAnalysis: 'short_interest_current_interpretation' in aiReport
        ? aiReport.short_interest_current_interpretation || 'AI analysis is not available for this report date.'
        : 'AI analysis is not available for this report date.',
    },
    shortLending: {
      posture: `${scoreLevel} Short Interest Pressure`,
      borrowFeeChart: chart(eligibleRecords, 'borrowFeePercent', { id: 'borrowFee', title: 'Borrow Fee Trend', subtitle: 'Latest seven available trading days', color: '#cf3e4f', unit: 'percent' }),
      shortableSharesChart: chart(eligibleRecords, 'availableShares', { id: 'shortableShares', title: 'Shortable Shares Trend', subtitle: 'Latest seven available trading days', color: '#e19713', unit: 'shares' }),
      utilizationChart: chart(eligibleRecords, 'utilizationPercent', { id: 'utilization', title: 'Utilization Trend', subtitle: 'Latest seven available trading days', color: '#15936f', unit: 'percent' }),
      daysToCoverChart: chart(eligibleRecords, 'daysToCover', { id: 'daysToCover', title: 'Days to Cover Trend', subtitle: 'Latest seven available trading days', color: '#6757d8', unit: 'days' }),
    },
    sentiment: {
      window: '1D',
      mentions: totalMentions,
      mentionsDisplay: formatNumber(totalMentions, 0),
      overall: {
        score: overallScore ?? 0,
        scoreDisplay: overallScore === null ? 'N/A' : formatNumber(overallScore),
        label: sentimentLabel(overallScore),
        changeDisplay: sentimentDelta === null ? '--' : signed(sentimentDelta, ''),
        deltaTone: sentimentDelta === null || sentimentDelta === 0 ? '' : sentimentDelta > 0 ? 'positive' : 'negative',
      },
      distribution: {
        scoreDisplay: formatNumber(totalMentions, 0),
        label: 'Mentions',
        bullishPercent: percentOfMentions(positiveCount),
        neutralPercent: percentOfMentions(neutralCount),
        bearishPercent: percentOfMentions(negativeCount),
      },
      platforms: platformRows,
    },
    secFilings: filingRows(secFilings),
  };
}
