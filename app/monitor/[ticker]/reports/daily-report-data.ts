'use client';

import { fetchAiReport, type AiReport } from '@/lib/ai-report-api';
import { cachedAuthenticatedFetch, invalidateAuthenticatedFetchCache } from '@/lib/auth-client';
import type { ReportArchiveRecord } from '@/lib/report-archive';

type Row = Record<string, unknown>;

type DailyReportPayload = Row & {
  ticker?: unknown;
  reportDateIso?: unknown;
  asOfDate?: unknown;
  tradingSnapshot?: unknown;
  snapshotKpis?: unknown;
  shortInterestScore?: unknown;
  shortLending?: unknown;
  sentiment?: unknown;
};

const unavailableAiAnalysis = 'AI analysis is not available for this report date.';
const marginKeys = new Set(['initialMargin', 'maintenanceMargin']);
const sentimentPlatformNames = ['Reddit', 'X', 'Facebook', 'LinkedIn', 'Stocktwits'] as const;

function objectValue(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function signed(value: number, suffix: string) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
}

function decimalRatioToPercent(value: unknown) {
  const numeric = finiteNumber(value);
  if (numeric === null) return null;

  // The report API currently returns margin ratios such as 1.5 for 150%.
  // Retain compatibility if the backend later returns percentage points.
  return Math.abs(numeric) <= 10 ? numeric * 100 : numeric;
}

function normalizeMarginKpi(value: unknown) {
  const row = objectValue(value);
  const key = String(row.key ?? '');
  if (!marginKeys.has(key)) return row;

  const rawValue = decimalRatioToPercent(row.rawValue);
  const previousRawValue = decimalRatioToPercent(row.previousRawValue);
  const numericChange = rawValue !== null && previousRawValue !== null
    ? rawValue - previousRawValue
    : null;
  const percentChange = numericChange !== null && previousRawValue !== 0
    ? numericChange / Math.abs(previousRawValue as number) * 100
    : null;

  return {
    ...row,
    rawValue,
    previousRawValue,
    numericChange,
    percentChange,
    value: rawValue === null ? 'N/A' : `${rawValue.toFixed(2)}%`,
    changeValue: numericChange === null ? '--' : signed(numericChange, ' pts'),
    changePercent: percentChange === null ? '--' : signed(percentChange, '%'),
  };
}

function normalizeShortInterestScore(value: unknown) {
  const source = objectValue(value);
  const score = finiteNumber(source.score);
  const level = score === null
    ? String(source.level ?? 'Unavailable')
    : score > 80
      ? 'Extreme'
      : score >= 65
        ? 'High'
        : score >= 40
          ? 'Moderate'
          : 'Low';
  const tone = level.toLowerCase();

  return {
    ...source,
    level,
    tone,
    ranges: [
      { range: '0-39', level: 'Low', description: 'Pressure is relatively contained.', active: score !== null && score < 40 },
      { range: '40-64', level: 'Moderate', description: 'Pressure is developing.', active: score !== null && score >= 40 && score < 65 },
      { range: '65-80', level: 'High', description: 'Elevated squeeze sensitivity.', active: score !== null && score >= 65 && score <= 80 },
      { range: '>80', level: 'Extreme', description: 'Severe pressure warrants review.', active: score !== null && score > 80 },
    ],
  };
}

function normalizedSentimentScore(value: unknown) {
  const numeric = finiteNumber(value);
  if (numeric === null) return null;
  return numeric >= 0 && numeric <= 1 ? numeric * 100 : numeric;
}

function sentimentLabel(score: number | null, mentions: number, supplied?: unknown) {
  const explicit = String(supplied ?? '').trim();
  if (!mentions) return 'No data';
  if (explicit) return explicit;
  if (score === null) return 'No data';
  if (score >= 60) return 'Bullish';
  if (score <= 40) return 'Bearish';
  return 'Neutral';
}

function sentimentPlatformName(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['x', 'twitter'].includes(normalized)) return 'X';
  if (normalized === 'reddit') return 'Reddit';
  if (normalized === 'facebook') return 'Facebook';
  if (['linkedin', 'linked_in', 'linkin'].includes(normalized)) return 'LinkedIn';
  if (normalized === 'stocktwits') return 'Stocktwits';
  return null;
}

function sevenDaySentimentCandidates(payload: DailyReportPayload) {
  const data = objectValue(payload.data);
  const sources = [payload.sentiment, payload.sentimentSnapshot, data.sentiment, data.sentimentSnapshot];

  return sources.flatMap(source => {
    const root = objectValue(source);
    if (!Object.keys(root).length) return [];
    const periods = objectValue(root.periods);
    const sevenDay = objectValue(periods['7D'] ?? periods['7d'] ?? periods['1W'] ?? periods['1w']);
    return Object.keys(sevenDay).length
      ? [{ value: sevenDay, explicitSevenDay: true }]
      : [{
        value: root,
        explicitSevenDay: ['7D', '7 DAYS', '7-DAY', '1W'].includes(String(root.window ?? '').trim().toUpperCase()),
      }];
  });
}

function sentimentRows(period: Row) {
  if (Array.isArray(period.timeline)) return period.timeline.map(objectValue);
  if (Array.isArray(period.records)) return period.records.map(objectValue);
  return [];
}

function rowMentions(row: Row) {
  return finiteNumber(row.mentions ?? row.totalMentions ?? row.mentionCount ?? row.count) ?? 0;
}

function candidateWeight(candidate: { value: Row; explicitSevenDay: boolean }) {
  const directMentions = finiteNumber(candidate.value.mentions ?? candidate.value.totalMentions ?? candidate.value.mentionCount);
  const timelineMentions = sentimentRows(candidate.value).reduce((sum, row) => sum + rowMentions(row), 0);
  const mentions = Math.max(directMentions ?? 0, timelineMentions);
  const overall = objectValue(candidate.value.overall);
  const hasScore = normalizedSentimentScore(
    overall.score ?? candidate.value.overallSentimentScore ?? candidate.value.sentimentScore,
  ) !== null;
  return (candidate.explicitSevenDay ? 1_000_000_000 : 0) + mentions * 100 + (hasScore ? 1 : 0);
}

function distributionCounts(row: Row) {
  const distribution = objectValue(row.distribution ?? row.sentimentDistribution ?? row.sentiment_distribution);
  return {
    bullish: finiteNumber(distribution.bullishCount ?? distribution.positiveCount ?? distribution.bullish ?? distribution.positive) ?? 0,
    neutral: finiteNumber(distribution.neutralCount ?? distribution.neutral) ?? 0,
    bearish: finiteNumber(distribution.bearishCount ?? distribution.negativeCount ?? distribution.bearish ?? distribution.negative) ?? 0,
  };
}

function datePart(value: unknown) {
  return String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
}

function previousDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function hasSentimentDistribution(period: Row) {
  const distribution = objectValue(period.distribution ?? period.sentimentDistribution ?? period.sentiment_distribution);
  const hasBullish = finiteNumber(
    distribution.bullishCount
    ?? distribution.positiveCount
    ?? distribution.bullishPercent
    ?? distribution.positivePercent,
  ) !== null;
  const hasNeutral = finiteNumber(distribution.neutralCount ?? distribution.neutralPercent) !== null;
  const hasBearish = finiteNumber(
    distribution.bearishCount
    ?? distribution.negativeCount
    ?? distribution.bearishPercent
    ?? distribution.negativePercent,
  ) !== null;
  return hasBullish && hasNeutral && hasBearish;
}

function hasCompleteSevenDaySentiment(
  candidate: { value: Row; explicitSevenDay: boolean } | undefined,
  reportDate: string,
) {
  if (!candidate?.explicitSevenDay) return false;

  const period = candidate.value;
  const windowStart = datePart(period.windowStart ?? period.windowStartUtc ?? period.start);
  const windowEnd = datePart(period.windowEnd ?? period.windowEndUtc ?? period.end);
  const windowEndsOnReportDate = windowEnd === reportDate || previousDate(windowEnd) === reportDate;
  const mentions = finiteNumber(period.mentions ?? period.totalMentions ?? period.mentionCount);
  const overall = objectValue(period.overall);
  const overallScore = normalizedSentimentScore(
    overall.score ?? period.overallSentimentScore ?? period.sentimentScore,
  );
  const rawPlatforms = Array.isArray(period.platforms)
    ? period.platforms.map(objectValue)
    : Array.isArray(period.platformBreakdown)
      ? period.platformBreakdown.map(objectValue)
      : [];
  const hasAllPlatforms = sentimentPlatformNames.every(name => rawPlatforms.some(row => (
    sentimentPlatformName(row.platform ?? row.name) === name
    && finiteNumber(row.mentions ?? row.totalMentions ?? row.mentionCount ?? row.count) !== null
  )));

  return Boolean(
    windowStart
    && windowEnd
    && windowStart <= windowEnd
    && windowEndsOnReportDate
    && mentions !== null
    && overallScore !== null
    && hasSentimentDistribution(period)
    && hasAllPlatforms
  );
}

function normalizeSevenDaySentiment(payload: DailyReportPayload, reportDate: string) {
  const candidates = sevenDaySentimentCandidates(payload);
  candidates.sort((a, b) => {
    const completenessDifference = Number(hasCompleteSevenDaySentiment(b, reportDate))
      - Number(hasCompleteSevenDaySentiment(a, reportDate));
    return completenessDifference || candidateWeight(b) - candidateWeight(a);
  });
  const selectedCandidate = candidates[0];
  const period = selectedCandidate?.value ?? {};
  const available = hasCompleteSevenDaySentiment(selectedCandidate, reportDate);
  const timeline = sentimentRows(period);
  const directMentions = finiteNumber(period.mentions ?? period.totalMentions ?? period.mentionCount);
  const timelineMentions = timeline.reduce((sum, row) => sum + rowMentions(row), 0);
  const mentions = directMentions ?? timelineMentions;
  const overall = objectValue(period.overall);
  const directScore = normalizedSentimentScore(
    overall.score ?? period.overallSentimentScore ?? period.sentimentScore,
  );
  const weightedTimelineScore = timeline.reduce((sum, row) => {
    const count = rowMentions(row);
    const score = normalizedSentimentScore(row.sentimentScore ?? row.overallSentimentScore ?? row.score);
    return score === null ? sum : sum + score * count;
  }, 0);
  const timelineScoreMentions = timeline.reduce((sum, row) => {
    const score = normalizedSentimentScore(row.sentimentScore ?? row.overallSentimentScore ?? row.score);
    return score === null ? sum : sum + rowMentions(row);
  }, 0);
  const calculatedScore = directScore ?? (timelineScoreMentions ? weightedTimelineScore / timelineScoreMentions : null);
  const calculatedPreviousScore = normalizedSentimentScore(
    overall.previousScore
    ?? period.previousOverallSentimentScore
    ?? period.previousSentimentScore
    ?? objectValue(period.comparison).previousScore,
  );
  const score = mentions > 0 ? calculatedScore : null;
  const previousScore = mentions > 0 ? calculatedPreviousScore : null;
  const numericChange = score !== null && previousScore !== null ? score - previousScore : null;
  const directDistribution = objectValue(period.distribution ?? period.sentimentDistribution);
  const directCounts = distributionCounts(period);
  const timelineCounts = timeline.reduce<{ bullish: number; neutral: number; bearish: number }>((totals, row) => {
    const counts = distributionCounts(row);
    return {
      bullish: totals.bullish + counts.bullish,
      neutral: totals.neutral + counts.neutral,
      bearish: totals.bearish + counts.bearish,
    };
  }, { bullish: 0, neutral: 0, bearish: 0 });
  const useTimelineCounts = directCounts.bullish + directCounts.neutral + directCounts.bearish === 0;
  const counts = useTimelineCounts ? timelineCounts : directCounts;
  const classifiedMentions = counts.bullish + counts.neutral + counts.bearish;
  const percent = (value: number) => classifiedMentions ? value / classifiedMentions * 100 : 0;
  const rawPlatforms = Array.isArray(period.platforms)
    ? period.platforms.map(objectValue)
    : Array.isArray(period.platformBreakdown)
      ? period.platformBreakdown.map(objectValue)
      : [];
  const timelinePlatformRows = timeline.filter(row => sentimentPlatformName(row.platform ?? row.name));
  const platformSource = rawPlatforms.length ? rawPlatforms : timelinePlatformRows;

  const platforms = sentimentPlatformNames.map(name => {
    const rows = platformSource.filter(row => sentimentPlatformName(row.platform ?? row.name) === name);
    const platformMentions = rows.reduce((sum, row) => sum + rowMentions(row), 0);
    const weightedScore = rows.reduce((sum, row) => {
      const rowScore = normalizedSentimentScore(row.sentimentScore ?? row.overallSentimentScore ?? row.score);
      return rowScore === null ? sum : sum + rowScore * rowMentions(row);
    }, 0);
    const scoreMentions = rows.reduce((sum, row) => {
      const rowScore = normalizedSentimentScore(row.sentimentScore ?? row.overallSentimentScore ?? row.score);
      return rowScore === null ? sum : sum + rowMentions(row);
    }, 0);
    const platformScore = rows.length === 1
      ? normalizedSentimentScore(rows[0].sentimentScore ?? rows[0].overallSentimentScore ?? rows[0].score)
      : scoreMentions ? weightedScore / scoreMentions : null;
    const suppliedLabel = rows.find(row => row.sentimentLabel ?? row.label)?.sentimentLabel
      ?? rows.find(row => row.sentimentLabel ?? row.label)?.label;
    const suppliedShare = rows.length === 1
      ? finiteNumber(rows[0].sharePercent ?? rows[0].percentage)
      : null;
    return {
      name,
      mentions: platformMentions,
      mentionsDisplay: platformMentions.toLocaleString('en-US'),
      sharePercent: suppliedShare ?? (mentions ? platformMentions / mentions * 100 : 0),
      sentimentScore: platformScore,
      sentimentLabel: sentimentLabel(platformScore, platformMentions, suppliedLabel),
    };
  });

  const scoreDisplay = score === null ? 'N/A' : score.toFixed(2);
  const changeDisplay = typeof overall.changeDisplay === 'string' && overall.changeDisplay.trim()
    ? overall.changeDisplay
    : numericChange === null ? '--' : `${numericChange >= 0 ? '+' : ''}${numericChange.toFixed(2)}`;

  return {
    available,
    unavailableMessage: available ? undefined : 'Sentiment data unavailable for this report.',
    window: '7D',
    windowStart: period.windowStart ?? period.windowStartUtc ?? period.start,
    windowEnd: period.windowEnd ?? period.windowEndUtc ?? period.end,
    mentions,
    mentionsDisplay: mentions.toLocaleString('en-US'),
    overall: {
      ...overall,
      score,
      scoreDisplay,
      previousScore,
      numericChange,
      changeDisplay,
      deltaTone: numericChange === null ? '' : numericChange > 0 ? 'positive' : numericChange < 0 ? 'negative' : '',
      label: sentimentLabel(score, mentions, overall.label ?? period.sentimentLabel ?? period.label),
    },
    distribution: {
      ...directDistribution,
      scoreDisplay: mentions.toLocaleString('en-US'),
      mentionsDisplay: mentions.toLocaleString('en-US'),
      label: 'Mentions',
      bullishCount: counts.bullish,
      neutralCount: counts.neutral,
      bearishCount: counts.bearish,
      bullishPercent: finiteNumber(directDistribution.bullishPercent ?? directDistribution.positivePercent) ?? percent(counts.bullish),
      neutralPercent: finiteNumber(directDistribution.neutralPercent) ?? percent(counts.neutral),
      bearishPercent: finiteNumber(directDistribution.bearishPercent ?? directDistribution.negativePercent) ?? percent(counts.bearish),
    },
    platforms,
  };
}

function normalizeReportPayload(
  payload: DailyReportPayload,
  report: ReportArchiveRecord,
  aiAnalysis: string,
) {
  const responseTicker = String(payload.ticker ?? '').trim().toUpperCase();
  const reportDateIso = String(payload.reportDateIso ?? '').trim();
  const tradingSnapshot = objectValue(payload.tradingSnapshot);
  const tradingSnapshotDate = String(tradingSnapshot.asOfDateIso ?? '').trim();
  const legacyAsOfDate = String(payload.asOfDate ?? '').trim();
  const responseDate = reportDateIso
    || (/^\d{4}-\d{2}-\d{2}$/.test(tradingSnapshotDate) ? tradingSnapshotDate : '')
    || (/^\d{4}-\d{2}-\d{2}$/.test(legacyAsOfDate) ? legacyAsOfDate : '');

  if (responseTicker !== report.ticker.toUpperCase()) {
    throw new Error(`The report API returned data for ${responseTicker || 'an unknown ticker'} instead of ${report.ticker}.`);
  }
  if (responseDate !== report.reportDate) {
    throw new Error(`The report API returned ${responseDate || 'an unknown date'} instead of ${report.reportDate}.`);
  }

  const snapshotKpis = Array.isArray(payload.snapshotKpis)
    ? payload.snapshotKpis.map(normalizeMarginKpi)
    : [];
  const shortInterestScore = normalizeShortInterestScore(payload.shortInterestScore);
  const shortLending = objectValue(payload.shortLending);
  const ftdChart = objectValue(shortLending.ftdChart);
  const sentiment = normalizeSevenDaySentiment(payload, report.reportDate);

  return {
    ...payload,
    // Older archived report objects use asOfDate, while the current lean
    // report contract uses reportDateIso. Normalize the validated date so the
    // renderer receives one canonical field without weakening date matching.
    reportDateIso: responseDate,
    snapshotKpis,
    shortInterestScore: {
      ...shortInterestScore,
      aiAnalysis,
      aiSourceScope: aiAnalysis === unavailableAiAnalysis ? 'none' : 'authenticated-ai-report',
    },
    sentiment: {
      ...sentiment,
      window: '7D',
    },
    shortLending: {
      ...shortLending,
      ftdChart: {
        ...ftdChart,
        title: 'Fails-to-Deliver Trend',
      },
    },
  };
}

export async function buildDailyReportData(report: ReportArchiveRecord) {
  const ticker = report.ticker.toUpperCase();
  const reportPath = `/market-data/reports?ticker=${encodeURIComponent(ticker)}&date=${encodeURIComponent(report.reportDate)}`;

  // A dated report can be regenerated by the backend without changing its URL.
  // Always refresh both dated payloads before generating a new PDF.
  invalidateAuthenticatedFetchCache(reportPath);
  invalidateAuthenticatedFetchCache('/market-data/ai-report');

  const [payload, aiReport] = await Promise.all([
    cachedAuthenticatedFetch<DailyReportPayload>(reportPath),
    fetchAiReport(ticker, report.reportDate).catch((): AiReport => ({})),
  ]);
  const aiAnalysis = typeof aiReport.short_interest_current_interpretation === 'string'
    && aiReport.short_interest_current_interpretation.trim()
    ? aiReport.short_interest_current_interpretation
    : unavailableAiAnalysis;

  return normalizeReportPayload(payload, report, aiAnalysis);
}
