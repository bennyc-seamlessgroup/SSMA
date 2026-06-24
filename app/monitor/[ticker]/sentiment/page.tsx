import { InfoTooltip } from '@/components/InfoTooltip';
import { readImportJson, readLocalImportText } from '@/lib/import-data';
import type { ReactNode } from 'react';
import { MentionFeedCards, type MentionFeedRow } from './MentionFeedCards';
import { SentimentTimeline } from './SentimentTimeline';

type AdanosMention = {
  id?: string | number | null;
  text?: string | null;
  timestamp?: string | null;
  platform?: string | null;
  sentiment_score?: number | string | null;
  url?: string | null;
  author?: string | null;
  likes?: number | string | null;
  comments?: number | string | null;
};

function percent(value: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function InfoTitle({ children, text }: { children: ReactNode; text: string }) {
  return <span className="with-info">{children} <InfoTooltip text={text} /></span>;
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

async function readAdanosFeed(relativePath: string) {
  try {
    return asArray(await readImportJson<AdanosMention[] | { data?: AdanosMention[]; mentions?: AdanosMention[] }>(relativePath));
  } catch (error) {
    console.error(`Narrative feed read failed for ${relativePath}; using bundled fallback.`, error);
    return asArray(JSON.parse(readLocalImportText(relativePath)));
  }
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

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sentimentBucket(value: unknown): 'positive' | 'negative' | 'neutral' {
  const score = numeric(value);
  if (score > 0.1) return 'positive';
  if (score < -0.1) return 'negative';
  return 'neutral';
}

function normalizedSentimentScore(value: unknown) {
  const score = Math.max(-1, Math.min(1, numeric(value)));
  return Math.round(((score + 1) / 2) * 100);
}

function averageScoreFor(mentions: AdanosMention[]) {
  if (!mentions.length) return 0;
  return Math.round(mentions.reduce((sum, item) => sum + normalizedSentimentScore(item.sentiment_score), 0) / mentions.length);
}

function deltaLabel(current: number, previous: number) {
  const delta = current - previous;
  return `${delta >= 0 ? '↑ +' : '↓ '}${delta} vs yesterday`;
}

function DeltaText({ current, previous }: { current: number; previous: number }) {
  const delta = current - previous;
  return <small className={`narrative-delta ${delta >= 0 ? 'up' : 'down'}`}>{deltaLabel(current, previous)}</small>;
}

function KpiTitle({ children, text }: { children: ReactNode; text: string }) {
  return <span className="narrative-kpi-title">{children} <InfoTooltip text={text} /></span>;
}

function mentionTimestampMs(value: unknown) {
  const date = new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatMentionDate(value: unknown) {
  const date = new Date(String(value ?? ''));
  if (Number.isNaN(date.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function feedRows(feed: AdanosMention[], platformLabel: string) {
  return feed.map((item): MentionFeedRow => ({
    timestamp: formatMentionDate(item.timestamp),
    timestampMs: mentionTimestampMs(item.timestamp),
    platform: platformLabel,
    author: String(item.author ?? 'N/A'),
    sentiment: sentimentBucket(item.sentiment_score),
    text: String(item.text ?? ''),
    likes: numeric(item.likes).toLocaleString('en-US'),
    comments: item.comments == null ? 'N/A' : numeric(item.comments).toLocaleString('en-US'),
    url: String(item.url ?? ''),
  }));
}

function countBySentiment(mentions: AdanosMention[]) {
  return mentions.reduce<Record<'positive' | 'negative' | 'neutral', number>>((acc, item) => {
    acc[sentimentBucket(item.sentiment_score)] += 1;
    return acc;
  }, { positive: 0, negative: 0, neutral: 0 });
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

function MiniBars({ values }: { values: Array<{ label: string; value: number }> }) {
  const max = Math.max(...values.map(item => item.value), 1);
  return (
    <div className="terminal-bars">
      {values.map(item => (
        <div className="terminal-bar-row" key={item.label}>
          <span>{item.label}</span>
          <div><i style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} /></div>
          <strong>{item.value.toLocaleString('en-US')}</strong>
        </div>
      ))}
    </div>
  );
}

function TrendLine({ values }: { values: number[] }) {
  const cleaned = values.length ? values : [0, 0];
  const max = Math.max(...cleaned, 1);
  const min = Math.min(...cleaned, 0);
  const range = Math.max(max - min, 1);
  const points = cleaned.map((value, index) => {
    const x = cleaned.length === 1 ? 0 : (index / (cleaned.length - 1)) * 100;
    const y = 88 - ((value - min) / range) * 68;
    return { value, x, y };
  });

  return (
    <div className="terminal-line-chart narrative-trend-chart">
      <div className="trend-chart-label">Sentiment Score: <strong>{Math.round(cleaned[cleaned.length - 1] ?? 0)}</strong></div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} />
      </svg>
      {points.map((point, index) => (
        <span
          className={`trend-marker ${index === 0 || index === points.length - 1 ? 'show-label' : ''}`}
          key={`${point.x}-${point.value}-${index}`}
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        >
          <i />
          {(index === 0 || index === points.length - 1) && <b>{Math.round(point.value)}</b>}
        </span>
      ))}
    </div>
  );
}

function Sparkline({ values, tone = 'blue' }: { values: number[]; tone?: 'blue' | 'green' | 'red' }) {
  const cleaned = values.length ? values.slice(-12) : [40, 46, 44, 50, 54, 52, 58];
  const max = Math.max(...cleaned, 1);
  const min = Math.min(...cleaned, 0);
  const range = Math.max(max - min, 1);
  const points = cleaned.map((value, index) => {
    const x = cleaned.length === 1 ? 0 : (index / (cleaned.length - 1)) * 100;
    const y = 80 - ((value - min) / range) * 58;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg className={`narrative-sparkline ${tone}`} viewBox="0 0 100 86" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} />
    </svg>
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
          <span>{score >= 55 ? 'Bullish' : score <= 45 ? 'Bearish' : 'Neutral'}</span>
        </div>
      </div>
    </div>
  );
}

const themeConfig = [
  { name: 'Short Squeeze', keywords: ['squeeze', 'short', 'cover'], direction: '↑ Trending' },
  { name: 'Reg SHO', keywords: ['reg sho', 'threshold', 'fail', 'buy-in'], direction: '↑ Growing' },
  { name: 'Institutional Buying', keywords: ['institution', 'ownership', 'accumulation', '13f'], direction: '→ Stable' },
  { name: 'Liquidity Risk', keywords: ['liquidity', 'borrow', 'ctb', 'pressure'], direction: '↓ Fading' },
  { name: 'Tokenization', keywords: ['token', 'blockchain', 'sol', 'eth'], direction: '↑ Emerging' },
] as const;

function narrativeThemes(mentions: AdanosMention[]) {
  const total = Math.max(mentions.length, 1);
  return themeConfig.map(theme => {
    const matched = mentions.filter(item => {
      const text = String(item.text ?? '').toLowerCase();
      return theme.keywords.some(keyword => text.includes(keyword));
    });
    const score = Math.min(92, Math.max(18, Math.round((matched.length / total) * 100) + (theme.name === 'Short Squeeze' ? 38 : 24)));
    const sentiment = matched.length
      ? Math.round(matched.reduce((sum, item) => sum + normalizedSentimentScore(item.sentiment_score), 0) / matched.length)
      : score;
    return {
      ...theme,
      volume: matched.length,
      score: Math.round((score + sentiment) / 2),
    };
  }).sort((a, b) => b.score - a.score);
}

function formatCompactNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('en-US');
}

export default async function SentimentPage() {
  const [redditMentions, xMentions, stocktwitsMentions] = await Promise.all([
    readAdanosFeed('adanos-reddit_CURR_consolidated_4_web.json'),
    readAdanosFeed('adanos-x_CURR_consolidated_4_web.json'),
    readOptionalAdanosFeed('adanos-stocktwits_CURR_consolidated_4_web.json'),
  ]);
  const mentions = [...redditMentions, ...xMentions, ...stocktwitsMentions];
  const validMentionTimes = mentions.map(item => mentionTimestampMs(item.timestamp)).filter(value => value > 0);
  const latestMentionTime = validMentionTimes.length ? Math.max(...validMentionTimes) : Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const currentWindowStart = latestMentionTime - dayMs;
  const previousWindowStart = latestMentionTime - dayMs * 2;
  const dailyMentions = mentions.filter(item => {
    const time = mentionTimestampMs(item.timestamp);
    return time > currentWindowStart && time <= latestMentionTime;
  });
  const previousDailyMentions = mentions.filter(item => {
    const time = mentionTimestampMs(item.timestamp);
    return time > previousWindowStart && time <= currentWindowStart;
  });
  const sentimentCounts = countBySentiment(dailyMentions);
  const positive = sentimentCounts.positive;
  const negative = sentimentCounts.negative;
  const neutral = sentimentCounts.neutral;
  const averageScore = averageScoreFor(dailyMentions);
  const previousAverageScore = averageScoreFor(previousDailyMentions);
  const platformCounts = [
    ['X', dailyMentions.filter(item => item.platform === 'X' || xMentions.includes(item)).length] as const,
    ['Reddit', dailyMentions.filter(item => item.platform === 'Reddit' || redditMentions.includes(item)).length] as const,
    ['Stocktwits', dailyMentions.filter(item => item.platform === 'Stocktwits' || stocktwitsMentions.includes(item)).length] as const,
  ].filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  const topPlatform = platformCounts[0]?.[0] ?? 'N/A';
  const sortedMentions = [...mentions].sort((a, b) => new Date(String(a.timestamp ?? '')).getTime() - new Date(String(b.timestamp ?? '')).getTime());
  const trendValues = sortedMentions.map((_, index) => {
    const sample = sortedMentions.slice(0, index + 1);
    return Math.round(sample.reduce((sum, item) => sum + normalizedSentimentScore(item.sentiment_score), 0) / sample.length);
  }).filter(Number.isFinite);
  const topAuthors = [...mentions]
    .sort((a, b) => numeric(b.likes) + numeric(b.comments) - numeric(a.likes) - numeric(a.comments))
    .slice(0, 5)
    .map(item => String(item.author ?? 'N/A'));
  const redditRows = feedRows(redditMentions, 'Reddit');
  const xRows = feedRows(xMentions, 'X');
  const stocktwitsRows = feedRows(stocktwitsMentions, 'Stocktwits');
  const allRows = [...redditRows, ...xRows, ...stocktwitsRows];
  const themes = narrativeThemes(mentions);
  const overallDelta = averageScore - previousAverageScore;
  const dailyXMentions = xMentions.filter(item => {
    const time = mentionTimestampMs(item.timestamp);
    return time > currentWindowStart && time <= latestMentionTime;
  });
  const previousDailyXMentions = xMentions.filter(item => {
    const time = mentionTimestampMs(item.timestamp);
    return time > previousWindowStart && time <= currentWindowStart;
  });
  const dailyRedditMentions = redditMentions.filter(item => {
    const time = mentionTimestampMs(item.timestamp);
    return time > currentWindowStart && time <= latestMentionTime;
  });
  const previousDailyRedditMentions = redditMentions.filter(item => {
    const time = mentionTimestampMs(item.timestamp);
    return time > previousWindowStart && time <= currentWindowStart;
  });
  const socialScore = dailyXMentions.length
    ? averageScoreFor(dailyXMentions)
    : averageScore;
  const previousSocialScore = previousDailyXMentions.length ? averageScoreFor(previousDailyXMentions) : 0;
  const newsScore = dailyRedditMentions.length
    ? averageScoreFor(dailyRedditMentions)
    : averageScore;
  const previousNewsScore = previousDailyRedditMentions.length ? averageScoreFor(previousDailyRedditMentions) : 0;
  const socialTrendValues = xMentions.map((_, index) => {
    const sample = xMentions.slice(0, index + 1);
    return Math.round(sample.reduce((sum, item) => sum + normalizedSentimentScore(item.sentiment_score), 0) / sample.length);
  });
  const newsTrendValues = redditMentions.map((_, index) => {
    const sample = redditMentions.slice(0, index + 1);
    return Math.round(sample.reduce((sum, item) => sum + normalizedSentimentScore(item.sentiment_score), 0) / sample.length);
  });
  const timelineMentions = [
    ...redditMentions.map(item => ({ timestampMs: mentionTimestampMs(item.timestamp), platform: 'Reddit' as const, score: normalizedSentimentScore(item.sentiment_score) })),
    ...xMentions.map(item => ({ timestampMs: mentionTimestampMs(item.timestamp), platform: 'X' as const, score: normalizedSentimentScore(item.sentiment_score) })),
    ...stocktwitsMentions.map(item => ({ timestampMs: mentionTimestampMs(item.timestamp), platform: 'Stocktwits' as const, score: normalizedSentimentScore(item.sentiment_score) })),
  ].filter(item => item.timestampMs > 0);
  return (
    <div className="page narrative-page">
      <div className="compact-page-header">
        <span>Sentiment</span>
        <p>Track market sentiment and narrative momentum across X, Reddit, and Stocktwits.</p>
      </div>

      <section className="narrative-overview-panel narrative-command-overview">
        <div className="narrative-section-head">
          <div>
            <span>Section 1</span>
            <h2>Narrative Overview</h2>
          </div>
        </div>

        <div className="narrative-command-kpis">
          <div className="narrative-kpi-card primary gauge-card">
            <KpiTitle text="Composite sentiment score across imported X, Reddit, and Stocktwits records.">Overall Sentiment</KpiTitle>
            <SentimentGauge score={averageScore} />
            <DeltaText current={averageScore} previous={previousAverageScore} />
          </div>
          <div className="narrative-kpi-card"><KpiTitle text="Average Reddit sentiment score in the latest 24h window.">Reddit Sentiment</KpiTitle><strong>{newsScore}</strong><DeltaText current={newsScore} previous={previousNewsScore} /></div>
          <div className="narrative-kpi-card"><KpiTitle text="Average X sentiment score in the latest 24h window.">X Sentiment</KpiTitle><strong>{socialScore}</strong><DeltaText current={socialScore} previous={previousSocialScore} /></div>
          <div className="narrative-kpi-card"><KpiTitle text="Total imported X, Reddit, and Stocktwits mentions in the latest 24h window.">Mentions (24h)</KpiTitle><strong>{formatCompactNumber(dailyMentions.length)}</strong><small className={`narrative-delta ${dailyMentions.length - previousDailyMentions.length >= 0 ? 'up' : 'down'}`}>{dailyMentions.length - previousDailyMentions.length >= 0 ? '+' : ''}{dailyMentions.length - previousDailyMentions.length} vs yesterday</small></div>
          <div className="narrative-kpi-card"><KpiTitle text="Direction of the composite sentiment score versus yesterday.">Momentum</KpiTitle><strong>{overallDelta >= 0 ? 'Rising' : 'Falling'}</strong><small className={`narrative-delta ${overallDelta >= 0 ? 'up' : 'down'}`}>{topPlatform} led</small></div>
        </div>
      </section>

      <div className="narrative-command-layout">
        <main className="narrative-command-main">
          <section className="narrative-feed-panel">
            <div className="narrative-section-head">
              <div>
                <span>Section 2</span>
                <h2 className="panel__title">Narrative Feed <InfoTooltip text="Narrative records with sentiment, source, and short AI-ready summaries." /></h2>
              </div>
              <div className="narrative-feed-count">
                <span>{mentions.length} records</span>
              </div>
            </div>
            <MentionFeedCards rows={allRows} />
          </section>
        </main>

        <aside className="narrative-radar">
          <section className="narrative-feed-panel">
            <SentimentTimeline mentions={timelineMentions} />
          </section>

          <section className="narrative-feed-panel">
            <div className="narrative-section-head">
              <div>
                <span>Breakdown</span>
                <h2>Sentiment Breakdown (24h)</h2>
              </div>
            </div>
            <Donut total={dailyMentions.length} segments={[
              { label: 'Bullish', value: positive, color: '#16a34a' },
              { label: 'Neutral', value: neutral, color: '#facc15' },
              { label: 'Bearish', value: negative, color: '#ef4444' },
            ]} />
          </section>

          <section className="narrative-feed-panel narrative-themes-panel">
            <div className="narrative-section-head">
              <div>
                <span>Themes</span>
                <h2>Top Themes</h2>
              </div>
            </div>
            <div className="narrative-theme-list compact">
              {themes.map(theme => (
                <div className="narrative-theme-row" key={theme.name}>
                  <div>
                    <strong>{theme.name}</strong>
                    <span>{theme.volume.toLocaleString('en-US')}</span>
                  </div>
                  <div className="narrative-theme-bar"><i style={{ width: `${theme.score}%` }} /></div>
                  <b>{theme.score}%</b>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
