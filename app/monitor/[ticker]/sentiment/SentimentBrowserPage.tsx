'use client';

import { ImportDataTable } from '@/components/ImportDataTable';
import { InfoTooltip } from '@/components/InfoTooltip';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { usePortalTimeZone } from '@/components/usePortalTimeZone';
import { usePublicImportFiles } from '@/components/usePublicImportFiles';
import { getPublicSocialPrefixes, readPublicSocialMentions } from '@/lib/social-s3-data';
import { aggregateSentimentByBucket, getSentimentBuckets, type SentimentPlatformFilter, type SentimentTimeframe } from '@/lib/sentiment-buckets';
import { normalizeTicker, stocktwitsFile } from '@/lib/ticker-data';
import { formatPortalDateTime } from '@/lib/timezone';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { MentionFeedCards, type MentionFeedRow } from './MentionFeedCards';
import { NarrativeRangeSelector } from './NarrativeRangeSelector';
import { SentimentTimeline } from './SentimentTimeline';

type SentimentBucket = 'positive' | 'negative' | 'neutral';

type AdanosMention = {
  id?: string | number | null;
  text?: string | null;
  timestamp?: string | null;
  platform?: string | null;
  sentiment_score?: number | string | null;
  sentiment_label?: string | null;
  catalyst_tag?: string | null;
  url?: string | null;
  author?: string | null;
  followers?: number | string | null;
  likes?: number | string | null;
  comments?: number | string | null;
  retweets?: number | string | null;
  reshares?: number | string | null;
  upvotes?: number | string | null;
  subreddit?: string | null;
};

type SocialMentionsFile = {
  platform?: string;
  updatedAt?: string;
  recordCount?: number;
  originalFileName?: string;
  data?: AdanosMention[];
};

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

function asArray(value: unknown): AdanosMention[] {
  if (Array.isArray(value)) return value as AdanosMention[];
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: AdanosMention[] }).data;
  }
  if (value && typeof value === 'object' && Array.isArray((value as { mentions?: unknown }).mentions)) {
    return (value as { mentions: AdanosMention[] }).mentions;
  }
  return [];
}

type PublicFeedState = {
  reddit: AdanosMention[];
  x: AdanosMention[];
  facebook: AdanosMention[];
  linkedin: AdanosMention[];
};

async function readPublicNarrativeFeed(prefix: string, platform: 'Reddit' | 'X' | 'Facebook' | 'Linkedin') {
  const mentions = await readPublicSocialMentions(prefix, platform);
  return mentions as AdanosMention[];
}

async function readPublicNarrativeFeeds(
  ticker: string,
  prefixes: ReturnType<typeof getPublicSocialPrefixes>,
) {
  const results = await Promise.allSettled([
    readPublicNarrativeFeed(prefixes.reddit, 'Reddit'),
    readPublicNarrativeFeed(prefixes.x, 'X'),
    readPublicNarrativeFeed(prefixes.facebook, 'Facebook'),
    readPublicNarrativeFeed(prefixes.linkedin, 'Linkedin'),
  ]);
  const [redditResult, xResult, facebookResult, linkedinResult] = results;

  if (results.every(result => result.status === 'fulfilled')) {
    return {
      reddit: redditResult.status === 'fulfilled' ? redditResult.value : [],
      x: xResult.status === 'fulfilled' ? xResult.value : [],
      facebook: facebookResult.status === 'fulfilled' ? facebookResult.value : [],
      linkedin: linkedinResult.status === 'fulfilled' ? linkedinResult.value : [],
    };
  }

  const response = await fetch(`/api/social-data-feed?ticker=${encodeURIComponent(ticker)}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Social data fallback returned ${response.status} ${response.statusText}`);
  }
  const fallback = await response.json() as Partial<PublicFeedState>;
  return {
    reddit: redditResult.status === 'fulfilled' ? redditResult.value : (fallback.reddit ?? []),
    x: xResult.status === 'fulfilled' ? xResult.value : (fallback.x ?? []),
    facebook: facebookResult.status === 'fulfilled' ? facebookResult.value : (fallback.facebook ?? []),
    linkedin: linkedinResult.status === 'fulfilled' ? linkedinResult.value : (fallback.linkedin ?? []),
  };
}

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
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
  const delta = current - previous;
  return `${delta >= 0 ? '↑ +' : '↓ '}${delta} vs previous ${label}`;
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
  });
}

function filterWindow(mentions: AdanosMention[], start: number, end: number) {
  return mentions.filter(item => {
    const time = mentionTimestampMs(item.timestamp);
    return time > start && time <= end;
  });
}

function rangeFromSearch(value: unknown) {
  const label = String(value ?? '1Y').toUpperCase();
  return rangeOptions.find(option => option.label === label) ?? rangeOptions[rangeOptions.length - 1];
}

function feedRows(feed: AdanosMention[], platformLabel: string, timeZone: string) {
  return feed.map((item): MentionFeedRow => {
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
  const rotation = -90 + (clamped / 100) * 180;
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
        : '';
  return (
    <span className={`narrative-platform-icon ${platform.toLowerCase()}`}>
      {logo ? (
        <img src={logo} alt="" />
      ) : platform === 'Facebook' ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="narrative-brand-svg">
          <path d="M15.2 8.2h-2.1c-.6 0-.9.4-.9 1v1.7h2.8l-.4 2.8h-2.4V21H9.3v-7.3H7v-2.8h2.3V8.8c0-2.4 1.5-3.8 3.7-3.8.9 0 1.8.1 2.2.1v3.1Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="narrative-brand-svg">
          <path d="M5 9h3.1v10H5V9Zm1.6-4.8A1.8 1.8 0 1 1 6.6 8a1.8 1.8 0 0 1 0-3.6ZM10.4 9h3v1.4h.1c.4-.8 1.5-1.7 3.1-1.7 3.3 0 3.9 2.2 3.9 5V19h-3.1v-4.7c0-1.1 0-2.6-1.6-2.6s-1.8 1.2-1.8 2.5V19h-3.1V9Z" />
        </svg>
      )}
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

function DevJsonTables({ datasets, timeZone }: { datasets: Array<{ file: string; payload: SocialMentionsFile }>; timeZone: string }) {
  return (
    <section className="narrative-feed-panel dev-only">
      <div className="narrative-section-head">
        <div>
          <h2>Development Data</h2>
        </div>
      </div>
      <div className="import-render-stack">
        {datasets.map(dataset => {
          const rows = (dataset.payload.data ?? []).map(row => ({
            timestamp: formatMentionDate(row.timestamp, timeZone),
            platform: dataset.payload.platform ?? row.platform ?? 'N/A',
            author: row.author ?? 'N/A',
            sentiment: row.sentiment_label ?? 'N/A',
            catalystTag: row.catalyst_tag ?? 'N/A',
            text: row.text ?? '',
          }));
          return (
            <div className="import-subsection" key={dataset.file}>
              <h4>{dataset.file}</h4>
              <ImportDataTable columns={['timestamp', 'platform', 'author', 'sentiment', 'catalystTag', 'text']} rows={rows} pageSize={10} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function SentimentBrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const publicSocialPrefixes = getPublicSocialPrefixes(normalizedTicker);
  const stocktwitsPath = stocktwitsFile(normalizedTicker);
  const searchParams = useSearchParams();
  const timeZone = usePortalTimeZone();
  const activeRange = rangeFromSearch(searchParams.get('range') ?? undefined);
  const [selectedPlatform, setSelectedPlatform] = useState<SentimentPlatformFilter>('All');
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const stocktwitsState = usePublicImportFiles([stocktwitsPath]);
  const [publicFeeds, setPublicFeeds] = useState<PublicFeedState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const feeds = await readPublicNarrativeFeeds(normalizedTicker, publicSocialPrefixes);
        if (!cancelled) setPublicFeeds(feeds);
      } catch {
        if (!cancelled) setPublicFeeds({ reddit: [], x: [], facebook: [], linkedin: [] });
      }
    };
    void load();
    window.addEventListener('import-data-updated', load);
    return () => {
      cancelled = true;
      window.removeEventListener('import-data-updated', load);
    };
  }, [
    normalizedTicker,
    publicSocialPrefixes.reddit,
    publicSocialPrefixes.x,
    publicSocialPrefixes.facebook,
    publicSocialPrefixes.linkedin,
  ]);

  if (!publicFeeds || (stocktwitsState.loading && !stocktwitsState.data)) {
    return <PortalPageLoading variant="sentiment" />;
  }

  const redditMentions = publicFeeds.reddit;
  const xMentions = publicFeeds.x;
  const facebookMentions = publicFeeds.facebook;
  const linkedinMentions = publicFeeds.linkedin;
  const stocktwitsJson = (stocktwitsState.data?.[stocktwitsPath] ?? {}) as SocialMentionsFile;
  const stocktwitsMentions = asArray(stocktwitsJson);
  const redditJson = { platform: 'Reddit', recordCount: redditMentions.length, originalFileName: publicSocialPrefixes.reddit, data: redditMentions };
  const xJson = { platform: 'X', recordCount: xMentions.length, originalFileName: publicSocialPrefixes.x, data: xMentions };
  const facebookJson = { platform: 'Facebook', recordCount: facebookMentions.length, originalFileName: publicSocialPrefixes.facebook, data: facebookMentions };
  const linkedinJson = { platform: 'Linkedin', recordCount: linkedinMentions.length, originalFileName: publicSocialPrefixes.linkedin, data: linkedinMentions };

  const mentions = [...redditMentions, ...xMentions, ...facebookMentions, ...linkedinMentions, ...stocktwitsMentions];
  const validMentionTimes = mentions.map(item => mentionTimestampMs(item.timestamp)).filter(value => value > 0);
  const latestMentionTime = validMentionTimes.length ? Math.max(...validMentionTimes) : Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const currentWindowMs = activeRange.days * dayMs;
  const currentWindowStart = latestMentionTime - currentWindowMs;
  const previousWindowStart = latestMentionTime - currentWindowMs * 2;
  const activeRangeLabel = activeRange.label as SentimentTimeframe;

  const windowMentions = filterWindow(mentions, currentWindowStart, latestMentionTime);
  const previousWindowMentions = filterWindow(mentions, previousWindowStart, currentWindowStart);
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

  const sentimentCounts = countBySentiment(windowMentions);
  const averageScore = averageScoreFor(windowMentions);
  const previousAverageScore = averageScoreFor(previousWindowMentions);
  const redditScore = averageScoreFor(windowRedditMentions);
  const xScore = averageScoreFor(windowXMentions);
  const facebookScore = averageScoreFor(windowFacebookMentions);
  const linkedinScore = averageScoreFor(windowLinkedinMentions);
  const stocktwitsScore = averageScoreFor(windowStocktwitsMentions);
  const platformSentiments = [
    { label: 'Reddit' as const, score: redditScore, previousScore: previousRedditMentions.length ? averageScoreFor(previousRedditMentions) : null, count: windowRedditMentions.length },
    { label: 'X' as const, score: xScore, previousScore: previousXMentions.length ? averageScoreFor(previousXMentions) : null, count: windowXMentions.length },
    { label: 'Facebook' as const, score: facebookScore, previousScore: previousFacebookMentions.length ? averageScoreFor(previousFacebookMentions) : null, count: windowFacebookMentions.length },
    { label: 'Linkedin' as const, score: linkedinScore, previousScore: previousLinkedinMentions.length ? averageScoreFor(previousLinkedinMentions) : null, count: windowLinkedinMentions.length },
    { label: 'Stocktwits' as const, score: stocktwitsScore, previousScore: previousStocktwitsMentions.length ? averageScoreFor(previousStocktwitsMentions) : null, count: windowStocktwitsMentions.length },
  ];
  const allRows = [
    ...feedRows(windowRedditMentions, 'Reddit', timeZone),
    ...feedRows(windowXMentions, 'X', timeZone),
    ...feedRows(windowFacebookMentions, 'Facebook', timeZone),
    ...feedRows(windowLinkedinMentions, 'Linkedin', timeZone),
    ...feedRows(windowStocktwitsMentions, 'Stocktwits', timeZone),
  ];
  const timelineMentions = [
    ...redditMentions.map(item => ({ timestampMs: mentionTimestampMs(item.timestamp), platform: 'Reddit' as const, score: sentimentValue(item), sentiment: mentionSentiment(item) })),
    ...xMentions.map(item => ({ timestampMs: mentionTimestampMs(item.timestamp), platform: 'X' as const, score: sentimentValue(item), sentiment: mentionSentiment(item) })),
    ...facebookMentions.map(item => ({ timestampMs: mentionTimestampMs(item.timestamp), platform: 'Facebook' as const, score: sentimentValue(item), sentiment: mentionSentiment(item) })),
    ...linkedinMentions.map(item => ({ timestampMs: mentionTimestampMs(item.timestamp), platform: 'Linkedin' as const, score: sentimentValue(item), sentiment: mentionSentiment(item) })),
    ...stocktwitsMentions.map(item => ({ timestampMs: mentionTimestampMs(item.timestamp), platform: 'Stocktwits' as const, score: sentimentValue(item), sentiment: mentionSentiment(item) })),
  ].filter(item => item.timestampMs > 0);
  const sentimentBuckets = getSentimentBuckets(activeRangeLabel, currentWindowStart, latestMentionTime);
  const aggregatedBuckets = aggregateSentimentByBucket(timelineMentions, sentimentBuckets, selectedPlatform);
  const selectedBucket = selectedBucketId ? aggregatedBuckets.find(bucket => bucket.id === selectedBucketId) ?? null : null;
  const platformRows = selectedPlatform === 'All' ? allRows : allRows.filter(row => row.platform === selectedPlatform);
  const filteredRows = selectedBucket
    ? platformRows.filter(row => row.timestampMs >= selectedBucket.startMs && row.timestampMs < selectedBucket.endMs)
    : platformRows;
  const platformCounts = Object.fromEntries(platformFilters.map(platform => [
    platform,
    platform === 'All' ? allRows.length : allRows.filter(row => row.platform === platform).length,
  ])) as Record<SentimentPlatformFilter, number>;

  return (
    <div className="page narrative-page">
      <div className="compact-page-header">
        <span>Social Sentiment</span>
        <p>Track market sentiment and narrative momentum across X, Reddit, Facebook, Linkedin, and Stocktwits.</p>
      </div>

      <NarrativeRangeSelector activeRange={activeRange.label} ranges={rangeOptions} />

      <section className="narrative-overview-panel narrative-command-overview">
        <div className="narrative-section-head">
          <div>
          <h2>Social Sentiment Overview</h2>
          </div>
        </div>

        <div className="narrative-command-kpis">
          <div className="narrative-kpi-card primary gauge-card">
            <KpiTitle text="Count-based composite sentiment. Positive records count as 100, neutral as 50, and negative as 0.">Overall Sentiment</KpiTitle>
            <SentimentGauge score={averageScore} />
            <div className="narrative-overall-footer">
              <DeltaText current={averageScore} previous={previousAverageScore} label={activeRange.label} />
              <small>{windowMentions.length.toLocaleString('en-US')} feeds in selected timeframe</small>
            </div>
          </div>
          <PlatformSentimentCard platforms={platformSentiments} totalFeeds={windowMentions.length} />
          <div className="narrative-kpi-card narrative-feed-summary-panel">
            <KpiTitle text="Distribution of bullish, neutral, and bearish social records in the selected timeframe.">Sentiment Distribution</KpiTitle>
            <Donut total={windowMentions.length} segments={[
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
            <h2 className="panel__title">Sentiment Timeline & Social Feed <InfoTooltip text="Platform and date filters apply to both the timeline and feed list." /></h2>
          </div>
        </div>
        <div className="narrative-filter-group narrative-platform-filter" aria-label="Platform filter">
          {platformFilters.map(platform => (
            <button
              key={platform}
              type="button"
              className={selectedPlatform === platform ? 'active' : ''}
              onClick={() => {
                setSelectedPlatform(platform);
                setSelectedBucketId(null);
              }}
            >
              {platformDisplayLabel(platform)} ({platformCounts[platform].toLocaleString('en-US')})
            </button>
          ))}
        </div>
        <SentimentTimeline
          buckets={aggregatedBuckets}
          selectedPlatform={selectedPlatform}
          selectedBucketId={selectedBucketId}
          onSelectBucket={bucket => setSelectedBucketId(current => current === bucket.id ? null : bucket.id)}
        />
        {selectedBucket && (
          <div className="narrative-date-filter-note">
            <span>Filtered to {selectedBucket.tooltipLabel}</span>
            <button type="button" onClick={() => setSelectedBucketId(null)}>Clear date filter</button>
          </div>
        )}
        <div className="narrative-feed-under-chart">
          <MentionFeedCards
            rows={filteredRows}
            hidePlatformFilter
            emptyMessage="No social feeds captured for this platform and time window."
          />
        </div>
      </section>

      <DevJsonTables timeZone={timeZone} datasets={[
        { file: `S3 prefix: ${publicSocialPrefixes.reddit}`, payload: redditJson },
        { file: `S3 prefix: ${publicSocialPrefixes.x}`, payload: xJson },
        { file: `S3 prefix: ${publicSocialPrefixes.facebook}`, payload: facebookJson },
        { file: `S3 prefix: ${publicSocialPrefixes.linkedin}`, payload: linkedinJson },
        { file: stocktwitsPath, payload: stocktwitsJson },
      ]} />
    </div>
  );
}
