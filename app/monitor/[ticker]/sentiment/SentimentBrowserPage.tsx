'use client';

import { ApiDevelopmentTabs } from '@/components/ApiDevelopmentTabs';
import { ApiSourceTags } from '@/components/ApiSourceTags';
import { InfoTooltip } from '@/components/InfoTooltip';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { usePortalTimeZone } from '@/components/usePortalTimeZone';
import { aggregateSentimentByBucket, getSentimentBuckets, type AggregatedSentimentBucket, type SentimentBucket as TimelineBucket, type SentimentPlatformFilter, type SentimentTimeframe } from '@/lib/sentiment-buckets';
import {
  getSocialDataPage,
  getSentimentCurrent,
  getSentimentEvents,
  recordsFromSentimentEvents,
  sentimentPeriod,
  sortSocialMentionsNewestFirst,
  type SentimentCurrentPayload,
  type SocialMention,
} from '@/lib/social-data-api';
import { normalizeTicker } from '@/lib/ticker-data';
import { formatPortalDateTime } from '@/lib/timezone';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MentionFeedCards, type MentionFeedRow } from './MentionFeedCards';
import { NarrativeRangeSelector } from './NarrativeRangeSelector';
import { sentimentPlatformColors, SentimentTimeline } from './SentimentTimeline';

type SentimentBucket = 'positive' | 'negative' | 'neutral';

type AdanosMention = SocialMention;

const rangeOptions = [
  { label: '1D', days: 1 },
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '6M', days: 183 },
  { label: '1Y', days: 365 },
] as const;

function KpiTitle({ children, text }: { children: ReactNode; text: string }) {
  return <span className="narrative-kpi-title">{children} <InfoTooltip text={text} /></span>;
}

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumeric(value: unknown) {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function backendTimelinePlatform(item: Record<string, unknown>): SentimentPlatformFilter | null {
  const value = String(item.platform ?? item.source ?? item.channel ?? '').trim().toLowerCase();
  if (!value || ['all', 'all platforms', 'all_platforms', 'overall', 'combined', 'total'].includes(value)) return 'All';
  if (['x', 'twitter'].includes(value)) return 'X';
  if (value === 'reddit') return 'Reddit';
  if (value === 'facebook') return 'Facebook';
  if (['linkedin', 'linked_in', 'linkin'].includes(value)) return 'Linkedin';
  if (value === 'stocktwits') return 'Stocktwits';
  return null;
}

function aggregateBackendTimeline(
  timeline: Record<string, unknown>[],
  buckets: TimelineBucket[],
  selectedPlatform: SentimentPlatformFilter,
  eventBuckets: AggregatedSentimentBucket[],
): AggregatedSentimentBucket[] {
  const hasOverallRows = timeline.some(item => backendTimelinePlatform(item) === 'All');
  const eventBucketsById = new Map(eventBuckets.map(item => [item.id, item]));
  return buckets.map((bucket, index) => {
    const rows = timeline.filter(item => {
      const timestampMs = Date.parse(String(item.bucketStart ?? item.date ?? item.timestamp ?? ''));
      const platform = backendTimelinePlatform(item);
      const matchesPlatform = selectedPlatform === 'All'
        ? (hasOverallRows ? platform === 'All' : platform !== null)
        : platform === selectedPlatform;
      return Number.isFinite(timestampMs)
        && timestampMs >= bucket.startMs
        && (index === buckets.length - 1 ? timestampMs <= bucket.endMs : timestampMs < bucket.endMs)
        && matchesPlatform;
    });
    const mentions = rows.reduce((sum, item) => sum + (optionalNumeric(item.mentions ?? item.count) ?? 0), 0);
    const weightedScore = rows.reduce((sum, item) => {
      const count = optionalNumeric(item.mentions ?? item.count) ?? 0;
      const score = optionalNumeric(item.sentimentScore ?? item.score) ?? 0;
      return sum + score * count;
    }, 0);
    const hasBackendBreakdown = rows.length > 0 && rows.every(item => (
      Object.hasOwn(item, 'positiveCount')
      || Object.hasOwn(item, 'positive')
      || Object.hasOwn(item, 'neutralCount')
      || Object.hasOwn(item, 'neutral')
      || Object.hasOwn(item, 'negativeCount')
      || Object.hasOwn(item, 'negative')
    ));
    const eventBucket = eventBucketsById.get(bucket.id);
    const breakdown = hasBackendBreakdown
      ? {
        positive: rows.reduce((sum, item) => sum + (optionalNumeric(item.positiveCount ?? item.positive) ?? 0), 0),
        neutral: rows.reduce((sum, item) => sum + (optionalNumeric(item.neutralCount ?? item.neutral) ?? 0), 0),
        negative: rows.reduce((sum, item) => sum + (optionalNumeric(item.negativeCount ?? item.negative) ?? 0), 0),
        classifiedMentions: rows.reduce((sum, item) => (
          sum
          + (optionalNumeric(item.positiveCount ?? item.positive) ?? 0)
          + (optionalNumeric(item.neutralCount ?? item.neutral) ?? 0)
          + (optionalNumeric(item.negativeCount ?? item.negative) ?? 0)
        ), 0),
      }
      : {
        positive: eventBucket?.positive ?? 0,
        neutral: eventBucket?.neutral ?? 0,
        negative: eventBucket?.negative ?? 0,
        classifiedMentions: eventBucket?.classifiedMentions ?? 0,
      };
    return {
      ...bucket,
      score: mentions ? Math.round(weightedScore / mentions) : null,
      mentions,
      ...breakdown,
    };
  });
}

function sentimentBucketFromLabel(value: unknown): SentimentBucket {
  const label = String(value ?? '').toLowerCase().trim();
  if (['positive', 'bullish', 'pos'].includes(label)) return 'positive';
  if (['negative', 'bearish', 'neg'].includes(label)) return 'negative';
  if (['neutral', 'mixed'].includes(label)) return 'neutral';

  const score = numeric(value);
  if (score > 0.1) return 'positive';
  if (score < -0.1) return 'negative';
  return 'neutral';
}

function mentionSentiment(item: AdanosMention) {
  return sentimentBucketFromLabel(item.sentiment_label ?? item.sentiment_score);
}

function sentimentValue(item: AdanosMention) {
  const bucket = mentionSentiment(item);
  if (bucket === 'positive') return 100;
  if (bucket === 'negative') return 0;
  return 50;
}

function averageScoreFor(mentions: AdanosMention[]) {
  if (!mentions.length) return 0;
  return Math.round(mentions.reduce((sum, item) => sum + sentimentValue(item), 0) / mentions.length);
}

function sentimentLabelFor(score: number) {
  if (score >= 60) return 'Bullish';
  if (score <= 40) return 'Bearish';
  return 'Neutral';
}

function deltaLabel(current: number, previous: number, label: string) {
  const rawDelta = current - previous;
  const delta = Math.abs(rawDelta) < .005 ? 0 : Math.round(rawDelta * 100) / 100;
  const formattedDelta = Number.isInteger(delta)
    ? Math.abs(delta).toLocaleString('en-US')
    : Math.abs(delta).toLocaleString('en-US', { maximumFractionDigits: 2 });

  if (delta === 0) return `→ 0 vs previous ${label}`;
  return `${delta > 0 ? '↑ +' : '↓ -'}${formattedDelta} vs previous ${label}`;
}

function DeltaText({ current, previous, label }: { current: number; previous: number; label: string }) {
  const delta = current - previous;
  return <small className={`narrative-delta ${delta >= 0 ? 'up' : 'down'}`}>{deltaLabel(current, previous, label)}</small>;
}

function mentionTimestampMs(value: unknown) {
  const date = new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatMentionDate(value: unknown, timeZone: string) {
  const date = new Date(String(value ?? ''));
  if (Number.isNaN(date.getTime())) return 'N/A';
  return formatPortalDateTime(date, timeZone, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function filterWindow(mentions: AdanosMention[], start: number, end: number) {
  return mentions.filter(item => {
    const time = mentionTimestampMs(item.timestamp);
    return time > start && time <= end;
  });
}

function uniqueMentions(mentions: AdanosMention[]) {
  const seen = new Set<string>();
  return mentions.filter(item => {
    const canonicalUrl = item.url.trim().replace(/[?#].*$/, '').replace(/\/$/, '');
    const stableIdentity = item.key
      || item.id
      || `${canonicalUrl}|${item.timestamp}|${item.author.trim().toLowerCase()}|${item.text.trim().replace(/\s+/g, ' ')}`;
    const identity = `${item.platform}|${stableIdentity}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function isoDateWithOffset(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function shiftIsoDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function datesNewestFirst(fromDate: string, toDate: string) {
  const start = Date.parse(`${fromDate}T00:00:00Z`);
  const end = Date.parse(`${toDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return [];
  const dates: string[] = [];
  for (let cursor = end; cursor >= start; cursor -= 24 * 60 * 60 * 1000) {
    dates.push(new Date(cursor).toISOString().slice(0, 10));
  }
  return dates;
}

function feedTotalsFrom(records: AdanosMention[]): Record<SentimentPlatformFilter, number> {
  const totals: Record<SentimentPlatformFilter, number> = {
    All: records.length,
    X: 0,
    Reddit: 0,
    Stocktwits: 0,
    Facebook: 0,
    Linkedin: 0,
  };
  records.forEach(record => {
    totals[record.platform] += 1;
  });
  return totals;
}

async function dailyFeedRange(
  ticker: string,
  fromDate: string,
  toDate: string,
  platform?: Exclude<SentimentPlatformFilter, 'All'>,
) {
  const dates = datesNewestFirst(fromDate, toDate);
  const results = await Promise.allSettled(dates.map(async date => ({
    date,
    response: await getSocialDataPage({
      ticker,
      platform,
      date,
      sort: 'datetime',
      order: 'desc',
    }),
  })));
  const responses = results.flatMap(result => result.status === 'fulfilled' ? [result.value.response] : []);
  const failures = results.flatMap((result, index) => result.status === 'rejected'
    ? [{
      date: dates[index],
      reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
    }]
    : []);
  if (dates.length && !responses.length) {
    throw new Error(`Unable to load social feeds for ${fromDate} to ${toDate}.${failures[0]?.reason ? ` ${failures[0].reason}` : ''}`);
  }
  const records = uniqueMentions(responses.flatMap(response => response.records));
  return {
    records,
    pages: responses.map(response => response.raw),
    totals: feedTotalsFrom(records),
    failures,
  };
}

async function feedRangeWithLatestFallback(
  ticker: string,
  fromDate: string,
  toDate: string,
  platform: Exclude<SentimentPlatformFilter, 'All'> | undefined,
  allowLatestFallback: boolean,
  minimumDate: string,
  maximumDate: string,
) {
  const requested = await dailyFeedRange(ticker, fromDate, toDate, platform);
  if (requested.records.length || !platform || !allowLatestFallback) {
    return {
      ...requested,
      fromDate,
      toDate,
      fallbackNotice: '',
    };
  }

  const latest = await getSocialDataPage({
    ticker,
    platform,
    page: 1,
    limit: 100,
    sort: 'datetime',
    order: 'desc',
  });
  const latestDate = sortSocialMentionsNewestFirst(latest.records)[0]?.timestamp.slice(0, 10) ?? '';
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(latestDate)
    || latestDate < minimumDate
    || latestDate > maximumDate
  ) {
    return {
      ...requested,
      fromDate,
      toDate,
      fallbackNotice: '',
    };
  }

  const fallbackToDate = latestDate;
  const shiftedFromDate = shiftIsoDate(fallbackToDate, -6);
  const fallbackFromDate = shiftedFromDate < minimumDate ? minimumDate : shiftedFromDate;
  const fallback = await dailyFeedRange(ticker, fallbackFromDate, fallbackToDate, platform);
  return {
    ...fallback,
    fromDate: fallbackFromDate,
    toDate: fallbackToDate,
    fallbackNotice: `No ${platformDisplayLabel(platform)} feeds were found from ${fromDate} to ${toDate}. Showing the latest available seven-day period instead.`,
  };
}

function localIsoDate(timestampMs: number) {
  const date = new Date(timestampMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function feedRangeForBucket(bucket: AggregatedSentimentBucket) {
  return {
    fromDate: localIsoDate(bucket.startMs),
    toDate: localIsoDate(bucket.endMs - 1),
  };
}

function rangeFromSearch(value: unknown) {
  const label = String(value ?? '1Y').toUpperCase();
  return rangeOptions.find(option => option.label === label) ?? rangeOptions[rangeOptions.length - 1];
}

function feedRows(feed: AdanosMention[], timeZone: string) {
  return feed.map((item): MentionFeedRow => {
    const platformLabel = item.platform;
    const metrics: MentionFeedRow['metrics'] = [];
    let engagementScore = 0;
    let followersScore = 0;
    let likesScore = 0;
    let sortLabel = 'Most Engaged';

    if (platformLabel === 'X') {
      followersScore = numeric(item.followers);
      likesScore = numeric(item.likes);
      metrics.push({ label: 'Followers', value: followersScore.toLocaleString('en-US') });
      metrics.push({ label: 'Likes', value: likesScore.toLocaleString('en-US') });
      metrics.push({ label: 'Retweets', value: numeric(item.retweets).toLocaleString('en-US') });
      engagementScore = followersScore + likesScore + numeric(item.retweets);
      sortLabel = 'Most Followers';
    } else if (platformLabel === 'Reddit') {
      if (item.subreddit) metrics.push({ label: 'Subreddit', value: String(item.subreddit) });
      likesScore = numeric(item.upvotes);
      metrics.push({ label: 'Upvotes', value: likesScore.toLocaleString('en-US') });
      engagementScore = likesScore + numeric(item.comments);
      sortLabel = 'Most Upvotes';
    } else if (platformLabel === 'Stocktwits') {
      followersScore = numeric(item.followers);
      likesScore = numeric(item.likes);
      metrics.push({ label: 'Followers', value: followersScore.toLocaleString('en-US') });
      metrics.push({ label: 'Likes', value: likesScore.toLocaleString('en-US') });
      metrics.push({ label: 'Reshares', value: numeric(item.reshares).toLocaleString('en-US') });
      engagementScore = followersScore + likesScore + numeric(item.reshares);
      sortLabel = 'Most Followers';
    } else if (platformLabel === 'Facebook') {
      followersScore = numeric(item.followers);
      likesScore = numeric(item.likes);
      metrics.push({ label: 'Followers', value: followersScore.toLocaleString('en-US') });
      metrics.push({ label: 'Likes', value: likesScore.toLocaleString('en-US') });
      metrics.push({ label: 'Comments', value: numeric(item.comments).toLocaleString('en-US') });
      engagementScore = followersScore + likesScore + numeric(item.comments);
      sortLabel = 'Most Followers';
    } else if (platformLabel === 'Linkedin') {
      followersScore = numeric(item.followers);
      likesScore = numeric(item.likes);
      metrics.push({ label: 'Followers', value: followersScore.toLocaleString('en-US') });
      metrics.push({ label: 'Likes', value: likesScore.toLocaleString('en-US') });
      metrics.push({ label: 'Comments', value: numeric(item.comments).toLocaleString('en-US') });
      engagementScore = followersScore + likesScore + numeric(item.comments);
      sortLabel = 'Most Followers';
    }

    return {
      timestamp: formatMentionDate(item.timestamp, timeZone),
      timestampMs: mentionTimestampMs(item.timestamp),
      platform: platformLabel,
      author: String(item.author ?? 'N/A'),
      sentiment: mentionSentiment(item),
      text: String(item.text ?? ''),
      metrics,
      engagementScore,
      followersScore,
      likesScore,
      sortLabel,
      url: String(item.url ?? ''),
    };
  });
}

function countBySentiment(mentions: AdanosMention[]) {
  return mentions.reduce<Record<SentimentBucket, number>>((acc, item) => {
    acc[mentionSentiment(item)] += 1;
    return acc;
  }, { positive: 0, negative: 0, neutral: 0 });
}

function percent(value: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function Donut({ segments, total }: { segments: Array<{ label: string; value: number; color: string }>; total: number }) {
  let cursor = 0;
  const safeTotal = total || 1;
  const gradient = segments.map(item => {
    const start = cursor;
    cursor += (item.value / safeTotal) * 100;
    return `${item.color} ${start}% ${cursor}%`;
  }).join(', ');

  return (
    <div className="terminal-donut-wrap">
      <div className="terminal-donut" style={{ background: `conic-gradient(${gradient})` }}>
        <div><strong>{total}</strong><span>mentions</span></div>
      </div>
      <div className="terminal-legend">
        {segments.map(item => (
          <span key={item.label}><i style={{ background: item.color }} />{item.label} {percent(item.value, total)}</span>
        ))}
      </div>
    </div>
  );
}

function SentimentGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const rotation = 90 - (clamped / 100) * 180;
  return (
    <div className="narrative-sentiment-gauge" aria-label={`Overall sentiment ${score}`}>
      <div className="narrative-sentiment-gauge__arc">
        <i style={{ transform: `rotate(${rotation}deg)` }} />
        <div>
          <strong>{score}</strong>
          <span>{sentimentLabelFor(score)}</span>
        </div>
      </div>
    </div>
  );
}

function sentimentToneFromScore(score: number) {
  const label = sentimentLabelFor(score);
  if (label === 'Bullish') return 'positive';
  if (label === 'Bearish') return 'negative';
  return 'neutral';
}

function platformDisplayLabel(platform: SentimentPlatformFilter) {
  return platform === 'Linkedin' ? 'LinkedIn' : platform;
}

function PlatformIcon({ platform }: { platform: Exclude<SentimentPlatformFilter, 'All'> }) {
  const logo = platform === 'Reddit'
    ? '/reddit_logo_128x128.png'
    : platform === 'X'
      ? '/x_logo_128x128.png'
      : platform === 'Stocktwits'
        ? '/stocktwits_logo_128x128.png'
        : platform === 'Facebook'
          ? '/facebook_logo_128x128.png'
          : '/linkedin_logo_128x128.png';
  return (
    <span className={`narrative-platform-icon ${platform.toLowerCase()}`}>
      <img src={logo} alt="" />
    </span>
  );
}

function PlatformSentimentCard({ platforms, totalFeeds }: {
  platforms: Array<{ label: Exclude<SentimentPlatformFilter, 'All'>; score: number; previousScore: number | null; count: number }>;
  totalFeeds: number;
}) {
  return (
    <div className="narrative-kpi-card narrative-platform-card">
      <KpiTitle text="Platform sentiment and contribution to total social mentions in the selected timeframe.">Platform Breakdown</KpiTitle>
      <div className="narrative-platform-table">
        {platforms.map(item => {
          const share = totalFeeds ? Math.round((item.count / totalFeeds) * 100) : 0;
          return (
          <div className={`narrative-platform-row ${item.count ? '' : 'is-empty'}`} key={item.label}>
            <PlatformIcon platform={item.label} />
            <span>{platformDisplayLabel(item.label)}</span>
            {item.count > 0 ? (
              <>
                <strong className={sentimentToneFromScore(item.score)}>{sentimentLabelFor(item.score)}</strong>
                <div className="narrative-platform-contribution" aria-label={`${platformDisplayLabel(item.label)} contribution ${share}%`}>
                  <i style={{ width: `${share}%` }} />
                </div>
                <em>{share}%</em>
              </>
            ) : (
              <>
                <strong className="empty">No data</strong>
                <div className="narrative-platform-contribution" aria-label={`${platformDisplayLabel(item.label)} contribution 0%`}>
                  <i style={{ width: '0%' }} />
                </div>
                <em>0%</em>
              </>
            )}
          </div>
        );
        })}
      </div>
    </div>
  );
}

const platformFilters: SentimentPlatformFilter[] = ['All', 'X', 'Reddit', 'Stocktwits', 'Facebook', 'Linkedin'];

function DevApiTables({
  mentions,
  socialPages,
  current,
  events,
  timeZone,
}: {
  mentions: AdanosMention[];
  socialPages: unknown[];
  current: SentimentCurrentPayload | null;
  events: unknown;
  timeZone: string;
}) {
  const mentionRows = mentions.map(row => ({ ...row, timestamp: formatMentionDate(row.timestamp, timeZone) }));

  return (
    <section className="narrative-feed-panel dev-only import-data-dev-panel">
      <div className="narrative-section-head">
        <div>
          <h2>Development Data</h2>
        </div>
      </div>
      <ApiDevelopmentTabs sources={[
        { id: 'social-data', title: 'Social Records', endpoint: 'GET /social-data?date=YYYY-MM-DD', source: `${socialPages.length} daily API response(s)`, payload: mentionRows },
        { id: 'sentiment-current', title: 'Sentiment Current', endpoint: 'GET /market-data/current?category=sentiment-current', source: 'Market Data API', payload: current },
        { id: 'sentiment-events', title: 'Sentiment Timeline', endpoint: 'GET /market-data/history?category=sentiment-events', source: 'Market Data API', payload: events },
      ]} />
    </section>
  );
}

export function SentimentBrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const searchParams = useSearchParams();
  const timeZone = usePortalTimeZone();
  const activeRange = rangeFromSearch(searchParams.get('range') ?? undefined);
  const feedMinDate = isoDateWithOffset(-365);
  const feedMaxDate = isoDateWithOffset(0);
  const [selectedPlatform, setSelectedPlatform] = useState<SentimentPlatformFilter>('All');
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [feedDateRange, setFeedDateRange] = useState(() => ({
    fromDate: isoDateWithOffset(-6),
    toDate: isoDateWithOffset(0),
  }));
  const [allowLatestFeedFallback, setAllowLatestFeedFallback] = useState(true);
  const [apiData, setApiData] = useState<{
    mentions: AdanosMention[];
    socialPages: unknown[];
    feedTotals: Record<SentimentPlatformFilter, number>;
    feedRange: { fromDate: string; toDate: string };
    fallbackNotice: string;
    current: SentimentCurrentPayload | null;
    sentimentEvents: unknown;
    timelineMentions: AdanosMention[];
  } | null>(null);
  const [loadError, setLoadError] = useState('');
  const [isLoadingFeeds, setIsLoadingFeeds] = useState(false);
  const feedRequestId = useRef(0);
  const feedRangeBeforeBucket = useRef<{
    range: { fromDate: string; toDate: string };
    allowLatestFallback: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const requestId = ++feedRequestId.current;
      setIsLoadingFeeds(true);
      try {
        setLoadError('');
        const [current, sentimentEvents, social] = await Promise.all([
          getSentimentCurrent(normalizedTicker).catch(() => null),
          getSentimentEvents(normalizedTicker).catch(() => null),
          feedRangeWithLatestFallback(
            normalizedTicker,
            feedDateRange.fromDate,
            feedDateRange.toDate,
            selectedPlatform === 'All' ? undefined : selectedPlatform,
            allowLatestFeedFallback,
            feedMinDate,
            feedMaxDate,
          ),
        ]);
        if (!cancelled && requestId === feedRequestId.current) {
          if (cancelled || requestId !== feedRequestId.current) return;
          if (social.failures.length) {
            setLoadError(`${social.failures.length} daily feed request(s) failed. ${social.failures.map(failure => `${failure.date}: ${failure.reason}`).join(' · ')}`);
          }
          setApiData({
            mentions: social.records,
            socialPages: social.pages,
            feedTotals: social.totals,
            feedRange: { fromDate: social.fromDate, toDate: social.toDate },
            fallbackNotice: social.fallbackNotice,
            current,
            sentimentEvents,
            timelineMentions: recordsFromSentimentEvents(sentimentEvents),
          });
        }
      } catch (error) {
        if (!cancelled && requestId === feedRequestId.current) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load social sentiment data.');
          setApiData({
            mentions: [],
            socialPages: [],
            feedTotals: { All: 0, X: 0, Reddit: 0, Stocktwits: 0, Facebook: 0, Linkedin: 0 },
            feedRange: feedDateRange,
            fallbackNotice: '',
            current: null,
            sentimentEvents: null,
            timelineMentions: [],
          });
        }
      } finally {
        if (!cancelled && requestId === feedRequestId.current) setIsLoadingFeeds(false);
      }
    };
    void load();
    window.addEventListener('import-data-updated', load);
    return () => {
      cancelled = true;
      window.removeEventListener('import-data-updated', load);
    };
  }, [allowLatestFeedFallback, normalizedTicker, feedDateRange.fromDate, feedDateRange.toDate, selectedPlatform]);

  const selectFeedDateRange = (fromDate: string, toDate: string) => {
    if (!datesNewestFirst(fromDate, toDate).length) return;
    setLoadError('');
    feedRangeBeforeBucket.current = null;
    setAllowLatestFeedFallback(false);
    setFeedDateRange({ fromDate, toDate });
    setSelectedBucketId(null);
  };
  const showMoreFeedDays = () => {
    const visibleRange = apiData?.feedRange ?? feedDateRange;
    const extendedFromDate = shiftIsoDate(visibleRange.fromDate, -7);
    selectFeedDateRange(
      extendedFromDate < feedMinDate ? feedMinDate : extendedFromDate,
      visibleRange.toDate,
    );
  };
  const selectTimelineBucket = (bucket: AggregatedSentimentBucket) => {
    if (selectedBucketId === bucket.id) {
      const prior = feedRangeBeforeBucket.current;
      feedRangeBeforeBucket.current = null;
      setSelectedBucketId(null);
      if (prior) {
        setAllowLatestFeedFallback(prior.allowLatestFallback);
        setFeedDateRange(prior.range);
      }
      return;
    }
    if (!selectedBucketId) {
      feedRangeBeforeBucket.current = {
        range: apiData?.feedRange ?? feedDateRange,
        allowLatestFallback: allowLatestFeedFallback,
      };
    }
    setAllowLatestFeedFallback(false);
    setSelectedBucketId(bucket.id);
    setFeedDateRange(feedRangeForBucket(bucket));
  };
  const clearTimelineBucket = () => {
    const prior = feedRangeBeforeBucket.current;
    feedRangeBeforeBucket.current = null;
    setSelectedBucketId(null);
    if (prior) {
      setAllowLatestFeedFallback(prior.allowLatestFallback);
      setFeedDateRange(prior.range);
    }
  };

  if (!apiData) {
    return <PortalPageLoading variant="sentiment" />;
  }

  const mentions = uniqueMentions(apiData.mentions);
  const timelineSourceMentions = sortSocialMentionsNewestFirst(
    apiData.timelineMentions.length ? apiData.timelineMentions : mentions,
  );
  const redditMentions = timelineSourceMentions.filter(item => item.platform === 'Reddit');
  const xMentions = timelineSourceMentions.filter(item => item.platform === 'X');
  const facebookMentions = timelineSourceMentions.filter(item => item.platform === 'Facebook');
  const linkedinMentions = timelineSourceMentions.filter(item => item.platform === 'Linkedin');
  const stocktwitsMentions = timelineSourceMentions.filter(item => item.platform === 'Stocktwits');
  const backendPeriod = sentimentPeriod(apiData.current, activeRange.label);
  const backendTimeline = Array.isArray(backendPeriod.timeline) ? backendPeriod.timeline.map(objectValue) : [];
  const backendPeriodStart = Date.parse(String(backendPeriod.start ?? ''));
  const backendPeriodEnd = Date.parse(String(backendPeriod.end ?? ''));
  const validMentionTimes = [...timelineSourceMentions, ...mentions]
    .map(item => mentionTimestampMs(item.timestamp))
    .filter(value => value > 0);
  const latestMentionTime = Number.isFinite(backendPeriodEnd)
    ? backendPeriodEnd
    : validMentionTimes.length
      ? Math.max(...validMentionTimes)
      : Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const currentWindowMs = activeRange.days * dayMs;
  const currentWindowStart = Number.isFinite(backendPeriodStart)
    ? backendPeriodStart
    : latestMentionTime - currentWindowMs;
  const previousWindowStart = latestMentionTime - currentWindowMs * 2;
  const activeRangeLabel = activeRange.label as SentimentTimeframe;

  const windowMentions = filterWindow(timelineSourceMentions, currentWindowStart, latestMentionTime);
  const previousWindowMentions = filterWindow(timelineSourceMentions, previousWindowStart, currentWindowStart);
  const windowFeedMentions = mentions;
  const windowRedditMentions = filterWindow(redditMentions, currentWindowStart, latestMentionTime);
  const windowXMentions = filterWindow(xMentions, currentWindowStart, latestMentionTime);
  const windowFacebookMentions = filterWindow(facebookMentions, currentWindowStart, latestMentionTime);
  const windowLinkedinMentions = filterWindow(linkedinMentions, currentWindowStart, latestMentionTime);
  const windowStocktwitsMentions = filterWindow(stocktwitsMentions, currentWindowStart, latestMentionTime);
  const previousRedditMentions = filterWindow(redditMentions, previousWindowStart, currentWindowStart);
  const previousXMentions = filterWindow(xMentions, previousWindowStart, currentWindowStart);
  const previousFacebookMentions = filterWindow(facebookMentions, previousWindowStart, currentWindowStart);
  const previousLinkedinMentions = filterWindow(linkedinMentions, previousWindowStart, currentWindowStart);
  const previousStocktwitsMentions = filterWindow(stocktwitsMentions, previousWindowStart, currentWindowStart);

  const backendDistribution = objectValue(backendPeriod.distribution);
  const backendBreakdown = Array.isArray(backendPeriod.platformBreakdown)
    ? backendPeriod.platformBreakdown.map(objectValue)
    : [];
  const backendPlatform = (platform: Exclude<SentimentPlatformFilter, 'All'>) => backendBreakdown.find(item => {
    const label = String(item.platform ?? item.name ?? '').trim().toLowerCase();
    const target = platform === 'X'
      ? ['x', 'twitter']
      : platform === 'Linkedin'
        ? ['linkedin', 'linked_in', 'linkin']
        : [platform.toLowerCase()];
    return target.includes(label);
  });
  const computedSentimentCounts = countBySentiment(windowMentions);
  const sentimentCounts = {
    positive: optionalNumeric(backendDistribution.positiveCount ?? backendDistribution.positive) ?? computedSentimentCounts.positive,
    neutral: optionalNumeric(backendDistribution.neutralCount ?? backendDistribution.neutral) ?? computedSentimentCounts.neutral,
    negative: optionalNumeric(backendDistribution.negativeCount ?? backendDistribution.negative) ?? computedSentimentCounts.negative,
  };
  const averageScore = optionalNumeric(
    backendPeriod.overallSentimentScore ?? backendPeriod.sentimentScore,
  ) ?? averageScoreFor(windowMentions);
  const previousAverageScore = optionalNumeric(
    backendPeriod.previousOverallSentimentScore
    ?? backendPeriod.previousSentimentScore
    ?? objectValue(backendPeriod.comparison).previousScore,
  ) ?? averageScoreFor(previousWindowMentions);
  const consolidatedTotalMentions = optionalNumeric(
    backendPeriod.totalMentions ?? backendPeriod.mentionCount,
  ) ?? windowMentions.length;
  const totalMentions = consolidatedTotalMentions;
  const scoreForPlatform = (platform: Exclude<SentimentPlatformFilter, 'All'>, rows: AdanosMention[]) => {
    const item = backendPlatform(platform);
    const backendScore = optionalNumeric(item?.sentimentScore ?? item?.score);
    if (backendScore !== null) return backendScore;
    if (rows.length) return averageScoreFor(rows);
    return apiData.feedTotals[platform] > 0 ? 50 : 0;
  };
  const countForPlatform = (platform: Exclude<SentimentPlatformFilter, 'All'>, rows: AdanosMention[]) => {
    const item = backendPlatform(platform);
    return optionalNumeric(item?.count ?? item?.mentions ?? item?.mentionCount)
      ?? rows.length;
  };
  const redditScore = scoreForPlatform('Reddit', windowRedditMentions);
  const xScore = scoreForPlatform('X', windowXMentions);
  const facebookScore = scoreForPlatform('Facebook', windowFacebookMentions);
  const linkedinScore = scoreForPlatform('Linkedin', windowLinkedinMentions);
  const stocktwitsScore = scoreForPlatform('Stocktwits', windowStocktwitsMentions);
  const platformSentiments = [
    { label: 'Reddit' as const, score: redditScore, previousScore: previousRedditMentions.length ? averageScoreFor(previousRedditMentions) : null, count: countForPlatform('Reddit', windowRedditMentions) },
    { label: 'X' as const, score: xScore, previousScore: previousXMentions.length ? averageScoreFor(previousXMentions) : null, count: countForPlatform('X', windowXMentions) },
    { label: 'Facebook' as const, score: facebookScore, previousScore: previousFacebookMentions.length ? averageScoreFor(previousFacebookMentions) : null, count: countForPlatform('Facebook', windowFacebookMentions) },
    { label: 'Linkedin' as const, score: linkedinScore, previousScore: previousLinkedinMentions.length ? averageScoreFor(previousLinkedinMentions) : null, count: countForPlatform('Linkedin', windowLinkedinMentions) },
    { label: 'Stocktwits' as const, score: stocktwitsScore, previousScore: previousStocktwitsMentions.length ? averageScoreFor(previousStocktwitsMentions) : null, count: countForPlatform('Stocktwits', windowStocktwitsMentions) },
  ];
  const allRows = feedRows(windowFeedMentions, timeZone);
  const timelineMentions = timelineSourceMentions.map(item => ({
      timestampMs: mentionTimestampMs(item.timestamp),
      platform: item.platform,
      score: sentimentValue(item),
      sentiment: mentionSentiment(item),
    })).filter(item => (
      item.timestampMs > 0
      && item.timestampMs >= currentWindowStart
      && item.timestampMs <= latestMentionTime
    ));
  const sentimentBuckets = getSentimentBuckets(activeRangeLabel, currentWindowStart, latestMentionTime);
  const eventAggregatedBuckets = aggregateSentimentByBucket(
    timelineMentions,
    sentimentBuckets,
    selectedPlatform,
  );
  const hasBackendTimelineForSelection = backendTimeline.some(item => {
    const platform = backendTimelinePlatform(item);
    if (selectedPlatform === 'All') {
      const hasOverallRows = backendTimeline.some(row => backendTimelinePlatform(row) === 'All');
      return hasOverallRows ? platform === 'All' : platform !== null;
    }
    return platform === selectedPlatform;
  });
  const aggregatedBuckets = hasBackendTimelineForSelection
    ? aggregateBackendTimeline(
      backendTimeline,
      sentimentBuckets,
      selectedPlatform,
      eventAggregatedBuckets,
    )
    : eventAggregatedBuckets;
  const selectedBucket = selectedBucketId ? aggregatedBuckets.find(bucket => bucket.id === selectedBucketId) ?? null : null;
  const platformRows = selectedPlatform === 'All' ? allRows : allRows.filter(row => row.platform === selectedPlatform);
  const filteredRows = selectedBucket
    ? platformRows.filter(row => row.timestampMs >= selectedBucket.startMs && row.timestampMs < selectedBucket.endMs)
    : platformRows;
  const platformCounts: Record<SentimentPlatformFilter, number> = {
    All: totalMentions,
    ...Object.fromEntries(platformSentiments.map(item => [item.label, item.count])),
  } as Record<SentimentPlatformFilter, number>;

  return (
    <div className="page narrative-page">
      {loadError && <div className="panel narrative-api-error">{loadError}</div>}
      <section className="narrative-overview-panel narrative-command-overview">
        <div className="narrative-section-head">
          <div>
            <h2>Social Sentiment Overview</h2>
          </div>
          <ApiSourceTags sources={[
            { endpoint: 'GET /market-data/current?category=sentiment-current', label: 'Overview' },
            { endpoint: 'GET /social-data', label: 'Platform records' },
          ]} />
          <NarrativeRangeSelector activeRange={activeRange.label} ranges={rangeOptions} />
        </div>

        <div className="narrative-command-kpis">
          <div className="narrative-kpi-card primary gauge-card">
            <KpiTitle text="Count-based composite sentiment. Positive records count as 100, neutral as 50, and negative as 0.">Overall Sentiment</KpiTitle>
            <SentimentGauge score={averageScore} />
            <div className="narrative-overall-footer">
              <DeltaText current={averageScore} previous={previousAverageScore} label={activeRange.label} />
              <small>{totalMentions.toLocaleString('en-US')} feeds in selected timeframe</small>
            </div>
          </div>
          <PlatformSentimentCard platforms={platformSentiments} totalFeeds={totalMentions} />
          <div className="narrative-kpi-card narrative-feed-summary-panel">
            <KpiTitle text="Distribution of bullish, neutral, and bearish social records in the selected timeframe.">Sentiment Distribution</KpiTitle>
            <Donut total={totalMentions} segments={[
              { label: 'Bullish', value: sentimentCounts.positive, color: '#16a34a' },
              { label: 'Neutral', value: sentimentCounts.neutral, color: '#facc15' },
              { label: 'Bearish', value: sentimentCounts.negative, color: '#ef4444' },
            ]} />
          </div>
        </div>
      </section>

      <section className="narrative-feed-panel narrative-timeline-fullwidth">
        <div className="narrative-section-head">
          <div>
            <h2 className="panel__title">Sentiment Timeline & Social Feed <InfoTooltip text="Platform counts follow the selected 1D, 1W, 1M, 6M, or 1Y timeframe. The calendar range controls which feed cards are loaded." /></h2>
          </div>
          <ApiSourceTags sources={[
            { endpoint: 'GET /market-data/current?category=sentiment-current', label: 'Timeline' },
            { endpoint: 'GET /social-data', label: 'Social feed' },
          ]} />
        </div>
        <div className="narrative-platform-filter-row">
          <div className="narrative-filter-group narrative-platform-filter" aria-label="Platform filter">
            {platformFilters.map(platform => (
              <button
                key={platform}
                type="button"
                className={selectedPlatform === platform ? 'active' : ''}
                onClick={() => {
                  setSelectedPlatform(platform);
                }}
              >
                {platformDisplayLabel(platform)} ({platformCounts[platform].toLocaleString('en-US')})
              </button>
            ))}
          </div>
          <div className="narrative-timeline-current" aria-label={`Timeline series: ${platformDisplayLabel(selectedPlatform)}`}>
            <i style={{ background: sentimentPlatformColors[selectedPlatform] }} />
            {platformDisplayLabel(selectedPlatform)}
          </div>
        </div>
        <SentimentTimeline
          buckets={aggregatedBuckets}
          selectedPlatform={selectedPlatform}
          selectedBucketId={selectedBucketId}
          onSelectBucket={selectTimelineBucket}
        />
        {selectedBucket && (
          <div className="narrative-date-filter-note">
            <span>Filtered to {selectedBucket.tooltipLabel}</span>
            <button type="button" onClick={clearTimelineBucket}>Clear date filter</button>
          </div>
        )}
        {apiData.fallbackNotice && (
          <div className="narrative-date-filter-note" role="status">
            <span>{apiData.fallbackNotice}</span>
          </div>
        )}
        <div className="narrative-feed-under-chart">
          <MentionFeedCards
            rows={filteredRows}
            fromDate={apiData.feedRange.fromDate}
            toDate={apiData.feedRange.toDate}
            minDate={feedMinDate}
            maxDate={feedMaxDate}
            isLoadingRange={isLoadingFeeds}
            onDateRangeChange={selectFeedDateRange}
            canSeeMore={apiData.feedRange.fromDate > feedMinDate}
            onSeeMore={showMoreFeedDays}
            hidePlatformFilter
            emptyMessage={isLoadingFeeds ? 'Loading social feeds...' : 'No social feeds captured for this platform and time window.'}
          />
        </div>
      </section>

      <DevApiTables
        mentions={mentions}
        socialPages={apiData.socialPages}
        current={apiData.current}
        events={apiData.sentimentEvents}
        timeZone={timeZone}
      />
    </div>
  );
}
