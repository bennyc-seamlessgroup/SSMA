import { InfoTooltip } from '@/components/InfoTooltip';
import { readImportFile, readLocalImportText } from '@/lib/import-data';
import type { ReactNode } from 'react';
import { MentionFeedCards, type MentionFeedRow } from './MentionFeedCards';

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

function sourceChip(source: string) {
  return <span className="source-chip ready">Source: {source}</span>;
}

function asArray(value: unknown): AdanosMention[] {
  if (Array.isArray(value)) return value as AdanosMention[];
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: AdanosMention[] }).data;
  }
  return [];
}

async function readAdanosFeed(relativePath: string) {
  try {
    return asArray(await readImportFile<AdanosMention[]>(relativePath));
  } catch (error) {
    console.error(`Narrative feed read failed for ${relativePath}; using bundled fallback.`, error);
    return asArray(JSON.parse(readLocalImportText(relativePath)));
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

export default async function SentimentPage() {
  const [redditMentions, xMentions] = await Promise.all([
    readAdanosFeed('adanos-reddit_CURR_consolidated_4_web.json'),
    readAdanosFeed('adanos-x_CURR_consolidated_4_web.json'),
  ]);
  const mentions = [...redditMentions, ...xMentions];
  const sentimentCounts = countBySentiment(mentions);
  const positive = sentimentCounts.positive;
  const negative = sentimentCounts.negative;
  const neutral = sentimentCounts.neutral;
  const averageScore = mentions.length
    ? Math.round(mentions.reduce((sum, item) => sum + normalizedSentimentScore(item.sentiment_score), 0) / mentions.length)
    : 0;
  const platformCounts = [
    ['X', xMentions.length] as const,
    ['Reddit', redditMentions.length] as const,
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

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Sentiment & Narrative Intelligence</h1>
          <p className="page__desc">Reddit and X mention scan with source posts, sentiment scores, and engagement signals.</p>
          <span className="import-file-tag">import_data/adanos-reddit_CURR_consolidated_4_web.json</span>
          <span className="import-file-tag">import_data/adanos-x_CURR_consolidated_4_web.json</span>
        </div>
      </div>

      <section className="terminal-section narrative-overview">
        <div className="terminal-section__head">
          <div>
            <span>Overview</span>
            <h2>Market Narrative Overview</h2>
            <p className="section-subtitle">Visual readout of Reddit and X sentiment, platform activity, and discussion momentum.</p>
          </div>
          <div className="terminal-section-actions">{sourceChip('Adanos Reddit + X')}</div>
        </div>

        <div className="narrative-kpi-grid">
          <div className="terminal-card terminal-stat"><span>Sentiment Score</span><strong>{averageScore} / 100</strong><small>Average across {mentions.length} mentions</small></div>
          <div className="terminal-card terminal-stat"><span>Discussion Volume</span><strong>{mentions.length}</strong><small>Imported public mentions</small></div>
          <div className="terminal-card terminal-stat"><span>Positive</span><strong>{percent(positive, mentions.length)}</strong><small>{positive} positive posts</small></div>
          <div className="terminal-card terminal-stat"><span>Negative</span><strong>{percent(negative, mentions.length)}</strong><small>{negative} negative posts</small></div>
          <div className="terminal-card terminal-stat"><span>Top Platform</span><strong>{topPlatform}</strong><small>{neutral} neutral posts</small></div>
        </div>

        <div className="narrative-visual-grid">
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Breakdown of positive, neutral, and negative mentions in the imported social scan.">Sentiment Mix</InfoTitle></h3>
            <Donut total={mentions.length} segments={[
              { label: 'Positive', value: positive, color: '#16a34a' },
              { label: 'Neutral', value: neutral, color: '#64748b' },
              { label: 'Negative', value: negative, color: '#e11d48' },
            ]} />
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Shows where mentions are concentrated across public platforms.">Platform Breakdown</InfoTitle></h3>
            <MiniBars values={platformCounts.map(([label, value]) => ({ label, value }))} />
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Rolling sentiment-score trend based on the imported mention sequence. Higher scores indicate more positive tone.">Sentiment Trend</InfoTitle></h3>
            <TrendLine values={trendValues} />
          </div>
        </div>

        <div className="narrative-insight-grid">
          <div className="terminal-card narrative-card">
            <span>Top Bullish Narratives</span>
            <p>pending for AI</p>
          </div>
          <div className="terminal-card narrative-card">
            <span>Top Bearish Narratives</span>
            <p>pending for AI</p>
          </div>
          <div className="terminal-card narrative-card">
            <span>Topics, Influencers, Communities</span>
            <p><strong>Topics:</strong> pending for AI</p>
            <p><strong>Influencers:</strong> {topAuthors.join(', ') || 'N/A'}</p>
            <p><strong>Communities:</strong> {platformCounts.map(([platform]) => platform).join(', ')}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section__head">
          <h2 className="panel__title with-info">
            Reddit Feed
            <InfoTooltip text="This table lists imported Reddit posts mentioning the company. Use it to review author, timestamp, sentiment score, engagement, and source link." />
          </h2>
          <div className="import-source-meta">
            <span>Adanos Reddit</span>
            <span>{redditMentions.length} records</span>
          </div>
        </div>
        <MentionFeedCards rows={redditRows} />
      </section>

      <section className="panel">
        <div className="section__head">
          <h2 className="panel__title with-info">
            X Feed
            <InfoTooltip text="This table lists imported X posts mentioning the company. Use it to review author, timestamp, sentiment score, engagement, and source link." />
          </h2>
          <div className="import-source-meta">
            <span>Adanos X</span>
            <span>{xMentions.length} records</span>
          </div>
        </div>
        <MentionFeedCards rows={xRows} />
      </section>
    </div>
  );
}
