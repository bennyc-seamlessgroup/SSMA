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

type SentimentCandidate = {
  value: Row;
  explicitSevenDay: boolean;
  path: string;
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

function datePart(value: unknown) {
  return String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
}

function hasSevenDayDateBoundary(row: Row) {
  const windowStart = datePart(row.windowStart ?? row.windowStartUtc ?? row.start);
  const windowEnd = datePart(row.windowEnd ?? row.windowEndUtc ?? row.end);
  if (!windowStart || !windowEnd) return false;
  const startTime = Date.parse(`${windowStart}T00:00:00Z`);
  const endTime = Date.parse(`${windowEnd}T00:00:00Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return false;
  const calendarDayDifference = Math.round((endTime - startTime) / 86_400_000);

  // Support both inclusive boundaries (Aug 15–21 = six date intervals) and
  // a next-day exclusive end (Aug 15–22 = seven date intervals).
  return calendarDayDifference === 6 || calendarDayDifference === 7;
}

function sentimentSourceRoots(payload: DailyReportPayload) {
  const roots: Array<{ value: Row; path: string }> = [];
  const visited = new Set<unknown>();

  function visit(value: unknown, sentimentContext: boolean, depth: number, path: string) {
    if (depth > 8 || !value) return;
    if (typeof value === 'string') {
      const serialized = value.trim();
      if (serialized.length <= 2_000_000 && (serialized.startsWith('{') || serialized.startsWith('['))) {
        try {
          visit(JSON.parse(serialized), sentimentContext, depth + 1, `${path} (parsed JSON)`);
        } catch {
          // Ignore ordinary report strings that happen to begin with JSON punctuation.
        }
      }
      return;
    }
    if (typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);

    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, sentimentContext, depth + 1, `${path}[${index}]`));
      return;
    }

    const row = value as Row;
    const periods = objectValue(row.periods);
    const hasSevenDayPeriod = Object.keys(objectValue(
      periods['7D'] ?? periods['7d'] ?? periods['1W'] ?? periods['1w'],
    )).length > 0;
    const hasAggregate = finiteNumber(row.mentions ?? row.totalMentions ?? row.mentionCount) !== null
      && (
        Object.keys(objectValue(row.overall)).length > 0
        || Object.keys(objectValue(row.distribution ?? row.sentimentDistribution)).length > 0
        || Array.isArray(row.platforms)
        || Array.isArray(row.platformBreakdown)
      );
    const hasWindowBoundary = Boolean(
      datePart(row.windowStart ?? row.windowStartUtc ?? row.start)
      && datePart(row.windowEnd ?? row.windowEndUtc ?? row.end),
    );
    if (
      (sentimentContext || hasAggregate)
      && (row.window !== undefined || hasSevenDayPeriod || hasAggregate || hasWindowBoundary)
    ) {
      roots.push({ value: row, path });
    }

    Object.entries(row).forEach(([key, nestedValue]) => {
      const nestedSentimentContext = sentimentContext || key.toLowerCase().includes('sentiment');
      visit(nestedValue, nestedSentimentContext, depth + 1, `${path}.${key}`);
    });
  }

  visit(payload, false, 0, '$');
  return roots;
}

function sevenDaySentimentCandidates(payload: DailyReportPayload) {
  const candidates = new Map<Row, SentimentCandidate>();
  const addCandidate = (value: Row, explicitSevenDay: boolean, path: string) => {
    const current = candidates.get(value);
    candidates.set(value, {
      value,
      explicitSevenDay: Boolean(current?.explicitSevenDay) || explicitSevenDay,
      path: current?.path ?? path,
    });
  };

  sentimentSourceRoots(payload).forEach(source => {
    const root = source.value;
    const periods = objectValue(root.periods);
    const sevenDayKey = ['7D', '7d', '1W', '1w'].find(key => Object.keys(objectValue(periods[key])).length) ?? '';
    const sevenDay = objectValue(sevenDayKey ? periods[sevenDayKey] : undefined);
    const rootIsSevenDay = ['7D', '7 DAYS', '7-DAY', '1W'].includes(String(root.window ?? '').trim().toUpperCase())
      || hasSevenDayDateBoundary(root);

    // Some dated report files contain a populated aggregate on the sentiment
    // root while retaining an older empty periods.7D object. Keep both so the
    // populated candidate can win instead of discarding it at collection time.
    if (rootIsSevenDay || !Object.keys(sevenDay).length) {
      addCandidate(root, rootIsSevenDay, source.path);
    }
    if (Object.keys(sevenDay).length) {
      addCandidate(sevenDay, true, `${source.path}.periods.${sevenDayKey}`);
    }
  });

  return [...candidates.values()];
}

function sentimentRows(period: Row) {
  if (Array.isArray(period.timeline)) return period.timeline.map(objectValue);
  if (Array.isArray(period.records)) return period.records.map(objectValue);
  return [];
}

function rowMentions(row: Row) {
  return finiteNumber(row.mentions ?? row.totalMentions ?? row.mentionCount ?? row.count) ?? 0;
}

function candidateWeight(candidate: SentimentCandidate) {
  const directMentions = finiteNumber(candidate.value.mentions ?? candidate.value.totalMentions ?? candidate.value.mentionCount);
  const timelineMentions = sentimentRows(candidate.value).reduce((sum, row) => sum + rowMentions(row), 0);
  const mentions = directMentions ?? timelineMentions;
  const overall = objectValue(candidate.value.overall);
  const hasScore = normalizedSentimentScore(
    overall.score ?? candidate.value.overallSentimentScore ?? candidate.value.sentimentScore,
  ) !== null;
  const hasPopulatedDirectAggregate = directMentions !== null && directMentions > 0 && hasScore;
  const hasTimelineOnlyData = directMentions === null && timelineMentions > 0;
  return (candidate.explicitSevenDay ? 1_000_000_000 : 0)
    + (hasPopulatedDirectAggregate ? 100_000_000 : 0)
    + (hasTimelineOnlyData ? 10_000_000 : 0)
    + mentions * 100
    + (hasScore ? 1 : 0);
}

function distributionCounts(row: Row) {
  const distribution = objectValue(row.distribution ?? row.sentimentDistribution ?? row.sentiment_distribution);
  return {
    bullish: finiteNumber(distribution.bullishCount ?? distribution.positiveCount ?? distribution.bullish ?? distribution.positive) ?? 0,
    neutral: finiteNumber(distribution.neutralCount ?? distribution.neutral) ?? 0,
    bearish: finiteNumber(distribution.bearishCount ?? distribution.negativeCount ?? distribution.bearish ?? distribution.negative) ?? 0,
  };
}

function previousDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function inclusiveSevenDayWindowStart(reportDate: string) {
  const [year, month, day] = reportDate.split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 6);
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

function hasMatchingSevenDayWindow(
  candidate: SentimentCandidate | undefined,
  reportDate: string,
) {
  if (!candidate?.explicitSevenDay) return false;

  const period = candidate.value;
  const windowStart = datePart(period.windowStart ?? period.windowStartUtc ?? period.start);
  const windowEnd = datePart(period.windowEnd ?? period.windowEndUtc ?? period.end);
  const windowEndsOnReportDate = windowEnd === reportDate || previousDate(windowEnd) === reportDate;

  return Boolean(
    windowStart
    && windowEnd
    && windowStart <= windowEnd
    && windowEndsOnReportDate
  );
}

function distributionCandidateWeight(candidate: SentimentCandidate) {
  const distribution = objectValue(
    candidate.value.distribution
    ?? candidate.value.sentimentDistribution
    ?? candidate.value.sentiment_distribution,
  );
  const counts = distributionCounts(candidate.value);
  const classifiedCount = counts.bullish + counts.neutral + counts.bearish;
  const percentageTotal = [
    distribution.bullishPercent ?? distribution.positivePercent,
    distribution.neutralPercent,
    distribution.bearishPercent ?? distribution.negativePercent,
  ].reduce<number>((sum, value) => sum + (finiteNumber(value) ?? 0), 0);
  return (hasSentimentDistribution(candidate.value) ? 1_000_000_000 : 0)
    + classifiedCount * 10_000
    + percentageTotal * 10
    + candidateWeight(candidate);
}

function platformRowsForPeriod(period: Row) {
  const directRows = Array.isArray(period.platforms)
    ? period.platforms.map(objectValue)
    : Array.isArray(period.platformBreakdown)
      ? period.platformBreakdown.map(objectValue)
      : [];
  if (directRows.length) return directRows;
  return sentimentRows(period).filter(row => sentimentPlatformName(row.platform ?? row.name));
}

function platformCandidateWeight(candidate: SentimentCandidate) {
  const rows = platformRowsForPeriod(candidate.value);
  const recognizedRows = rows.filter(row => sentimentPlatformName(row.platform ?? row.name));
  const mentions = recognizedRows.reduce((sum, row) => sum + rowMentions(row), 0);
  return (recognizedRows.length ? 1_000_000_000 : 0)
    + mentions * 10_000
    + candidateWeight(candidate);
}

function selectSevenDaySentimentCandidates(payload: DailyReportPayload, reportDate: string) {
  const candidates = sevenDaySentimentCandidates(payload);
  candidates.sort((a, b) => {
    const matchingWindowDifference = Number(hasMatchingSevenDayWindow(b, reportDate))
      - Number(hasMatchingSevenDayWindow(a, reportDate));
    return matchingWindowDifference || candidateWeight(b) - candidateWeight(a);
  });
  const matchingCandidates = candidates.filter(candidate => hasMatchingSevenDayWindow(candidate, reportDate));
  // A dated report must never borrow sentiment from a different report date.
  // If the archived file contains a stale or future window, leave sentiment
  // unavailable so the mismatch is visible and can be corrected upstream.
  const selectedCandidate = matchingCandidates[0];
  const distributionCandidate = [...matchingCandidates]
    .sort((a, b) => distributionCandidateWeight(b) - distributionCandidateWeight(a))[0];
  const platformCandidate = [...matchingCandidates]
    .sort((a, b) => platformCandidateWeight(b) - platformCandidateWeight(a))[0];

  return {
    candidates,
    matchingCandidates,
    selectedCandidate,
    distributionCandidate,
    platformCandidate,
  };
}

export function reportSentimentDiagnostics(payload: unknown, reportDate: string) {
  const selection = selectSevenDaySentimentCandidates(payload as DailyReportPayload, reportDate);

  return selection.candidates.map(candidate => {
    const period = candidate.value;
    const timeline = sentimentRows(period);
    const directMentions = finiteNumber(period.mentions ?? period.totalMentions ?? period.mentionCount);
    const timelineMentions = timeline.reduce((sum, row) => sum + rowMentions(row), 0);
    const overall = objectValue(period.overall);
    const score = normalizedSentimentScore(
      overall.score ?? period.overallSentimentScore ?? period.sentimentScore,
    );
    const counts = distributionCounts(period);
    const platformRows = platformRowsForPeriod(period);
    const platformMentions = platformRows.reduce((sum, row) => sum + rowMentions(row), 0);
    const selectedFor = [
      selection.selectedCandidate === candidate ? 'Overall' : '',
      selection.distributionCandidate === candidate ? 'Distribution' : '',
      selection.platformCandidate === candidate ? 'Platforms' : '',
    ].filter(Boolean).join(', ') || 'Not selected';

    return {
      selectedFor,
      path: candidate.path,
      explicit7D: candidate.explicitSevenDay ? 'Yes' : 'No',
      matchesReportDate: hasMatchingSevenDayWindow(candidate, reportDate) ? 'Yes' : 'No',
      window: String(period.window ?? 'N/A'),
      windowStart: datePart(period.windowStart ?? period.windowStartUtc ?? period.start) || 'N/A',
      windowEnd: datePart(period.windowEnd ?? period.windowEndUtc ?? period.end) || 'N/A',
      directMentions: directMentions === null ? 'N/A' : String(directMentions),
      timelineMentions: String(timelineMentions),
      score: score === null ? 'N/A' : String(score),
      distribution: `${counts.bullish} / ${counts.neutral} / ${counts.bearish}`,
      platformRows: String(platformRows.length),
      platformMentions: String(platformMentions),
    };
  });
}

function normalizeSevenDaySentiment(payload: DailyReportPayload, reportDate: string) {
  const {
    candidates,
    matchingCandidates,
    selectedCandidate,
    distributionCandidate,
    platformCandidate,
  } = selectSevenDaySentimentCandidates(payload, reportDate);
  const period = selectedCandidate?.value ?? {};
  const matchingWindow = hasMatchingSevenDayWindow(selectedCandidate, reportDate);
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
  const distributionPeriod = distributionCandidate?.value ?? period;
  const distributionTimeline = sentimentRows(distributionPeriod);
  const directDistribution = objectValue(
    distributionPeriod.distribution
    ?? distributionPeriod.sentimentDistribution
    ?? distributionPeriod.sentiment_distribution,
  );
  const directCounts = distributionCounts(distributionPeriod);
  const timelineCounts = distributionTimeline.reduce<{ bullish: number; neutral: number; bearish: number }>((totals, row) => {
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
  const platformPeriod = platformCandidate?.value ?? period;
  const platformSource = platformRowsForPeriod(platformPeriod);
  const overallAvailable = matchingWindow && calculatedScore !== null;
  const distributionAvailable = Boolean(distributionCandidate) && (
    hasSentimentDistribution(distributionPeriod)
    || distributionTimeline.some(hasSentimentDistribution)
  );
  const platformsAvailable = Boolean(platformCandidate) && platformSource.some(row => (
    sentimentPlatformName(row.platform ?? row.name) !== null
    && finiteNumber(row.mentions ?? row.totalMentions ?? row.mentionCount ?? row.count) !== null
  ));
  const available = overallAvailable || distributionAvailable || platformsAvailable;

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
    overallAvailable,
    distributionAvailable,
    platformsAvailable,
    unavailableMessage: available
      ? undefined
      : candidates.length && !matchingCandidates.length
        ? 'Sentiment data unavailable: the archived sentiment window does not match this report date.'
        : 'Sentiment data unavailable for this report.',
    window: '7D',
    // The report labels an inclusive seven-calendar-day observation window.
    // Anchor it to the immutable report date so an incorrect legacy boundary
    // such as Aug 20–25 cannot be presented as seven days.
    windowStart: inclusiveSevenDayWindowStart(reportDate),
    windowEnd: reportDate,
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
