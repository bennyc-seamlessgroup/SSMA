export type SentimentTimeframe = '1D' | '1W' | '1M' | '6M' | '1Y';
export type SentimentPlatformFilter = 'All' | 'X' | 'Reddit' | 'Facebook' | 'Linkedin' | 'Stocktwits';
export type SentimentTone = 'positive' | 'neutral' | 'negative';

export type SentimentBucketInput = {
  timestampMs: number;
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
};

export type AggregatedSentimentBucket = SentimentBucket & {
  score: number | null;
  mentions: number;
  positive: number;
  neutral: number;
  negative: number;
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
  return buckets.map((item, index) => {
    const bucketFeeds = feeds.filter(feed => (
      (selectedPlatform === 'All' || feed.platform === selectedPlatform)
      && feed.timestampMs >= item.startMs
      && (index === buckets.length - 1 ? feed.timestampMs <= item.endMs : feed.timestampMs < item.endMs)
    ));
    const mentions = bucketFeeds.length;
    const score = mentions ? Math.round(bucketFeeds.reduce((sum, feed) => sum + feed.score, 0) / mentions) : null;
    return {
      ...item,
      score,
      mentions,
      positive: bucketFeeds.filter(feed => feed.sentiment === 'positive').length,
      neutral: bucketFeeds.filter(feed => feed.sentiment === 'neutral').length,
      negative: bucketFeeds.filter(feed => feed.sentiment === 'negative').length,
    };
  });
}
