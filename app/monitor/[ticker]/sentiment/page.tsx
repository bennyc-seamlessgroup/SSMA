import { ImportDataTable } from '@/components/ImportDataTable';
import { InfoTooltip } from '@/components/InfoTooltip';
import { readImportJson, readLocalImportText } from '@/lib/import-data';
import { getServerPortalTimeZone } from '@/lib/server-timezone';
import { publicSocialPrefixes, readPublicSocialMentions } from '@/lib/social-s3-data';
import { formatPortalDateTime } from '@/lib/timezone';
import type { ReactNode } from 'react';
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
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
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

async function readOptionalAdanosFeed(relativePath: string) {
  try {
    return asArray(await readImportJson<AdanosMention[] | { data?: AdanosMention[]; mentions?: AdanosMention[] }>(relativePath));
  } catch {
    try {
      return asArray(JSON.parse(readLocalImportText(relativePath)));
    } catch {
      return [];
    }
  }
}

async function readNarrativePlatformFeed(primaryPath: string, legacyPath: string) {
  const primary = await readOptionalAdanosFeed(primaryPath);
  if (primary.length) return primary;
  return readOptionalAdanosFeed(legacyPath);
}

async function readPublicNarrativeFeed(prefix: string, platform: 'Reddit' | 'X', fallbackPath: string) {
  try {
    const mentions = await readPublicSocialMentions(prefix, platform);
    if (mentions.length) return mentions as AdanosMention[];
  } catch {
    // Public S3 prefix listing may be blocked; local fallback keeps the page usable.
  }
  return readOptionalAdanosFeed(fallbackPath);
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

function deltaLabel(current: number, previous: number) {
  const delta = current - previous;
  return `${delta >= 0 ? '↑ +' : '↓ '}${delta} vs previous period`;
}

function DeltaText({ current, previous }: { current: number; previous: number }) {
  const delta = current - previous;
  return <small className={`narrative-delta ${delta >= 0 ? 'up' : 'down'}`}>{deltaLabel(current, previous)}</small>;
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
  const label = String(value ?? '1D').toUpperCase();
  return rangeOptions.find(option => option.label === label) ?? rangeOptions[0];
}

function feedRows(feed: AdanosMention[], platformLabel: string, timeZone: string) {
  return feed.map((item): MentionFeedRow => {
    const metrics: MentionFeedRow['metrics'] = [];
    let engagementScore = 0;
    let sortLabel = 'Most Engaged';

    if (platformLabel === 'X') {
      metrics.push({ label: 'Followers', value: numeric(item.followers).toLocaleString('en-US') });
      metrics.push({ label: 'Likes', value: numeric(item.likes).toLocaleString('en-US') });
      metrics.push({ label: 'Retweets', value: numeric(item.retweets).toLocaleString('en-US') });
      engagementScore = numeric(item.followers);
      sortLabel = 'Most Followers';
    } else if (platformLabel === 'Reddit') {
      if (item.subreddit) metrics.push({ label: 'Subreddit', value: String(item.subreddit) });
      metrics.push({ label: 'Upvotes', value: numeric(item.upvotes).toLocaleString('en-US') });
      engagementScore = numeric(item.upvotes);
      sortLabel = 'Most Upvotes';
    } else if (platformLabel === 'Stocktwits') {
      metrics.push({ label: 'Followers', value: numeric(item.followers).toLocaleString('en-US') });
      metrics.push({ label: 'Likes', value: numeric(item.likes).toLocaleString('en-US') });
      metrics.push({ label: 'Reshares', value: numeric(item.reshares).toLocaleString('en-US') });
      engagementScore = numeric(item.followers);
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

function formatCompactNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('en-US');
}

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

export default async function SentimentPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const timeZone = await getServerPortalTimeZone();
  const activeRange = rangeFromSearch(Array.isArray(resolvedSearchParams.range) ? resolvedSearchParams.range[0] : resolvedSearchParams.range);
  const [redditMentions, xMentions, stocktwitsMentions] = await Promise.all([
    readPublicNarrativeFeed(publicSocialPrefixes.reddit, 'Reddit', 'social/reddit_CURR_mentions.json'),
    readPublicNarrativeFeed(publicSocialPrefixes.x, 'X', 'social/x_CURR_mentions.json'),
    readNarrativePlatformFeed('social/stocktwits_CURR_mentions.json', 'adanos-stocktwits_CURR_consolidated_4_web.json'),
  ]);
  const [redditJson, xJson, stocktwitsJson] = await Promise.all([
    Promise.resolve({ platform: 'Reddit', recordCount: redditMentions.length, originalFileName: publicSocialPrefixes.reddit, data: redditMentions }),
    Promise.resolve({ platform: 'X', recordCount: xMentions.length, originalFileName: publicSocialPrefixes.x, data: xMentions }),
    readImportJson<SocialMentionsFile>('social/stocktwits_CURR_mentions.json').catch(() => ({ platform: 'Stocktwits', data: stocktwitsMentions })),
  ]);

  const mentions = [...redditMentions, ...xMentions, ...stocktwitsMentions];
  const validMentionTimes = mentions.map(item => mentionTimestampMs(item.timestamp)).filter(value => value > 0);
  const latestMentionTime = validMentionTimes.length ? Math.max(...validMentionTimes) : Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const currentWindowMs = activeRange.days * dayMs;
  const currentWindowStart = latestMentionTime - currentWindowMs;
  const previousWindowStart = latestMentionTime - currentWindowMs * 2;

  const windowMentions = filterWindow(mentions, currentWindowStart, latestMentionTime);
  const previousWindowMentions = filterWindow(mentions, previousWindowStart, currentWindowStart);
  const windowRedditMentions = filterWindow(redditMentions, currentWindowStart, latestMentionTime);
  const windowXMentions = filterWindow(xMentions, currentWindowStart, latestMentionTime);
  const windowStocktwitsMentions = filterWindow(stocktwitsMentions, currentWindowStart, latestMentionTime);

  const sentimentCounts = countBySentiment(windowMentions);
  const averageScore = averageScoreFor(windowMentions);
  const previousAverageScore = averageScoreFor(previousWindowMentions);
  const redditScore = averageScoreFor(windowRedditMentions);
  const xScore = averageScoreFor(windowXMentions);
  const stocktwitsScore = averageScoreFor(windowStocktwitsMentions);
  const allRows = [
    ...feedRows(windowRedditMentions, 'Reddit', timeZone),
    ...feedRows(windowXMentions, 'X', timeZone),
    ...feedRows(windowStocktwitsMentions, 'Stocktwits', timeZone),
  ];
  const timelineMentions = [
    ...redditMentions.map(item => ({ timestampMs: mentionTimestampMs(item.timestamp), platform: 'Reddit' as const, score: sentimentValue(item) })),
    ...xMentions.map(item => ({ timestampMs: mentionTimestampMs(item.timestamp), platform: 'X' as const, score: sentimentValue(item) })),
    ...stocktwitsMentions.map(item => ({ timestampMs: mentionTimestampMs(item.timestamp), platform: 'Stocktwits' as const, score: sentimentValue(item) })),
  ].filter(item => item.timestampMs > 0);

  return (
    <div className="page narrative-page">
      <div className="compact-page-header">
        <span>Sentiment</span>
        <p>Track market sentiment and narrative momentum across X, Reddit, and Stocktwits.</p>
      </div>

      <NarrativeRangeSelector activeRange={activeRange.label} ranges={rangeOptions} />

      <section className="narrative-overview-panel narrative-command-overview">
        <div className="narrative-section-head">
          <div>
            <h2>{`Narrative Overview (${activeRange.label})`}</h2>
          </div>
        </div>

        <div className="narrative-command-kpis">
          <div className="narrative-kpi-card primary gauge-card">
            <KpiTitle text="Count-based composite sentiment. Positive records count as 100, neutral as 50, and negative as 0.">Overall Sentiment</KpiTitle>
            <SentimentGauge score={averageScore} />
            <DeltaText current={averageScore} previous={previousAverageScore} />
          </div>
          <div className="narrative-kpi-card"><KpiTitle text="Reddit sentiment label in the selected timeframe using positive, neutral, and negative counts.">Reddit Sentiment</KpiTitle><strong>{sentimentLabelFor(redditScore)}</strong><small>{windowRedditMentions.length.toLocaleString('en-US')} feeds in timeframe</small></div>
          <div className="narrative-kpi-card"><KpiTitle text="X sentiment label in the selected timeframe using positive, neutral, and negative counts.">X Sentiment</KpiTitle><strong>{sentimentLabelFor(xScore)}</strong><small>{windowXMentions.length.toLocaleString('en-US')} feeds in timeframe</small></div>
          <div className="narrative-kpi-card"><KpiTitle text="Stocktwits sentiment label in the selected timeframe using positive, neutral, and negative counts.">Stocktwits Sentiment</KpiTitle><strong>{sentimentLabelFor(stocktwitsScore)}</strong><small>{windowStocktwitsMentions.length.toLocaleString('en-US')} feeds in timeframe</small></div>
          <div className="narrative-kpi-card"><KpiTitle text="Total imported X, Reddit, and Stocktwits records in the selected timeframe.">Mentions</KpiTitle><strong>{formatCompactNumber(windowMentions.length)}</strong><small>{activeRange.label} window</small></div>
        </div>
      </section>

      <div className="narrative-command-layout">
        <main className="narrative-command-main">
          <section className="narrative-feed-panel">
            <div className="narrative-section-head">
              <div>
                <h2 className="panel__title">Narrative Feed <InfoTooltip text="Narrative records filtered by the selected page timeframe." /></h2>
              </div>
            </div>
            <MentionFeedCards rows={allRows} />
          </section>
        </main>

        <aside className="narrative-radar">
          <section className="narrative-feed-panel">
            <SentimentTimeline mentions={timelineMentions} rangeDays={activeRange.days} />
          </section>

          <section className="narrative-feed-panel">
            <div className="narrative-section-head">
              <div>
                <h2>{`Sentiment Breakdown (${activeRange.label})`}</h2>
              </div>
            </div>
            <Donut total={windowMentions.length} segments={[
              { label: 'Bullish', value: sentimentCounts.positive, color: '#16a34a' },
              { label: 'Neutral', value: sentimentCounts.neutral, color: '#facc15' },
              { label: 'Bearish', value: sentimentCounts.negative, color: '#ef4444' },
            ]} />
          </section>
        </aside>
      </div>

      <DevJsonTables timeZone={timeZone} datasets={[
        { file: 'S3 prefix: social-data/Reddit_CURR', payload: redditJson },
        { file: 'S3 prefix: social-data/Twitter__CURR', payload: xJson },
        { file: 'social/stocktwits_CURR_mentions.json', payload: stocktwitsJson },
      ]} />
    </div>
  );
}
