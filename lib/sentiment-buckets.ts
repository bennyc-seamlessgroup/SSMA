export type SentimentTimeframe = '1D' | '1W' | '1M' | '6M' | '1Y';
export type SentimentPlatformFilter = 'All' | 'X' | 'Reddit' | 'Facebook' | 'Linkedin' | 'Stocktwits';
export type SentimentTone = 'positive' | 'neutral' | 'negative';

export type SentimentBucketInput = {
  timestampMs: number;
  tradeDate?: string;
  platform: Exclude<SentimentPlatformFilter, 'All'>;
  score: number;
  sentiment: SentimentTone;
};

export type SentimentBucket = {
  id: string;
  label: string;
  tooltipLabel: string;
  startMs: number;
  endMs: number;
  apiDateZone?: 'utc';
  tradeDateFrom?: string;
  tradeDateTo?: string;
};

export type AggregatedSentimentBucket = SentimentBucket & {
  score: number | null;
  mentions: number;
  positive: number;
  neutral: number;
  negative: number;
  classifiedMentions: number;
};

const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;

function startOfHour(value: number) {
  const date = new Date(value);
  date.setMinutes(0, 0, 0);
  return date.getTime();
}

function startOfDay(value: number) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function startOfMonth(value: number) {
  const date = new Date(value);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function addMonths(value: number, months: number) {
  const date = new Date(value);
  date.setMonth(date.getMonth() + months);
  return date.getTime();
}

function fmt(value: number, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', options).format(new Date(value));
}

function bucket(id: string, startMs: number, endMs: number, label: string, tooltipLabel = label): SentimentBucket {
  return { id, startMs, endMs, label, tooltipLabel };
}

function isoDate(value: number) {
  return new Date(value).toISOString().slice(0, 10);
}

export function alignSentimentBucketsToTimeline(
  timeline: Record<string, unknown>[],
  buckets: SentimentBucket[],
) {
  const backendStarts = [...new Set(timeline
    .map(item => Date.parse(String(item.bucketStart ?? item.date ?? item.timestamp ?? '')))
    .filter(Number.isFinite))]
    .sort((a, b) => a - b);

  return buckets.map((item, index) => {
    const matchingStarts = backendStarts.filter(timestampMs => (
      timestampMs >= item.startMs
      && (index === buckets.length - 1 ? timestampMs <= item.endMs : timestampMs < item.endMs)
    ));
    if (!matchingStarts.length) return item;
    const startMs = matchingStarts[0];
    return {
      ...item,
      startMs,
      endMs: startMs + (item.endMs - item.startMs),
      apiDateZone: 'utc' as const,
      tradeDateFrom: isoDate(startMs),
      tradeDateTo: isoDate(matchingStarts[matchingStarts.length - 1]),
    };
  });
}

export function getSentimentBuckets(timeframe: SentimentTimeframe, startDate: number, endDate: number): SentimentBucket[] {
  const safeEnd = Number.isFinite(endDate) ? endDate : Date.now();

  if (timeframe === '1D') {
    const lastHour = startOfHour(safeEnd);
    return Array.from({ length: 24 }, (_, index) => {
      const startMs = lastHour - (23 - index) * hourMs;
      const endMs = startMs + hourMs;
      return bucket(`hour-${startMs}`, startMs, endMs, fmt(startMs, { hour: 'numeric', hour12: true }), fmt(startMs, { month: 'short', day: 'numeric', hour: 'numeric', hour12: true }));
    });
  }

  if (timeframe === '1W') {
    const lastDay = startOfDay(safeEnd);
    return Array.from({ length: 7 }, (_, index) => {
      const startMs = lastDay - (6 - index) * dayMs;
      const endMs = startMs + dayMs;
      return bucket(`day-${startMs}`, startMs, endMs, fmt(startMs, { weekday: 'short' }), fmt(startMs, { month: 'short', day: 'numeric' }));
    });
  }

  if (timeframe === '1M') {
    const startMs = startOfDay(startDate || safeEnd - 29 * dayMs);
    const endDay = startOfDay(safeEnd);
    const count = Math.max(1, Math.min(31, Math.round((endDay - startMs) / dayMs) + 1));
    return Array.from({ length: count }, (_, index) => {
      const bucketStart = startMs + index * dayMs;
      return bucket(`day-${bucketStart}`, bucketStart, bucketStart + dayMs, fmt(bucketStart, { month: 'short', day: 'numeric' }));
    });
  }

  if (timeframe === '6M') {
    const lastMonth = startOfMonth(safeEnd);
    return Array.from({ length: 6 }, (_, index) => {
      const startMs = addMonths(lastMonth, index - 5);
      const endMs = addMonths(startMs, 1);
      return bucket(`month-${startMs}`, startMs, endMs, fmt(startMs, { month: 'short' }), fmt(startMs, { month: 'long', year: 'numeric' }));
    });
  }

  const lastMonth = startOfMonth(safeEnd);
  return Array.from({ length: 12 }, (_, index) => {
    const startMs = addMonths(lastMonth, index - 11);
    const endMs = addMonths(startMs, 1);
    return bucket(`month-${startMs}`, startMs, endMs, fmt(startMs, { month: 'short' }), fmt(startMs, { month: 'long', year: 'numeric' }));
  });
}

export function aggregateSentimentByBucket(
  feeds: SentimentBucketInput[],
  buckets: SentimentBucket[],
  selectedPlatform: SentimentPlatformFilter,
): AggregatedSentimentBucket[] {
  const scoreTotals = buckets.map(() => 0);
  const aggregated = buckets.map(item => ({
    ...item,
    score: null,
    mentions: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    classifiedMentions: 0,
  } satisfies AggregatedSentimentBucket));

  feeds.forEach(feed => {
    if (selectedPlatform !== 'All' && feed.platform !== selectedPlatform) return;

    let low = 0;
    let high = buckets.length - 1;
    let matchingIndex = -1;
    if (feed.tradeDate && /^\d{4}-\d{2}-\d{2}$/.test(feed.tradeDate)) {
      matchingIndex = buckets.findIndex(candidate => (
        Boolean(candidate.tradeDateFrom && candidate.tradeDateTo)
        && candidate.endMs - candidate.startMs >= dayMs
        && feed.tradeDate! >= candidate.tradeDateFrom!
        && feed.tradeDate! <= candidate.tradeDateTo!
      ));
    }
    while (low <= high) {
      if (matchingIndex >= 0) break;
      const middle = Math.floor((low + high) / 2);
      const candidate = buckets[middle];
      const isLast = middle === buckets.length - 1;
      if (feed.timestampMs < candidate.startMs) {
        high = middle - 1;
      } else if (feed.timestampMs > candidate.endMs || (!isLast && feed.timestampMs === candidate.endMs)) {
        low = middle + 1;
      } else {
        matchingIndex = middle;
        break;
      }
    }
    if (matchingIndex < 0) return;

    const target = aggregated[matchingIndex];
    target.mentions += 1;
    target[feed.sentiment] = (target[feed.sentiment] ?? 0) + 1;
    target.classifiedMentions += 1;
    scoreTotals[matchingIndex] += feed.score;
  });

  return aggregated.map((item, index) => ({
    ...item,
    score: item.mentions ? Math.round(scoreTotals[index] / item.mentions) : null,
  }));
}
