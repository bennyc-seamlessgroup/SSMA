import { ImportDataTable } from '@/components/ImportDataTable';
import { InfoTooltip } from '@/components/InfoTooltip';
import { readImportFile } from '@/lib/import-data';
import type { ReactNode } from 'react';

type SocialMention = {
  id: string;
  platform: string;
  author: string;
  postedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  topic: string;
  comment: string;
  sourceLink: string;
  engagement: number;
  language: string;
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

export default function SentimentPage() {
  const envelope = readImportFile<SocialMention[]>('sentiment/social_mentions.json');
  const mentions = envelope.data;
  const positive = mentions.filter(item => item.sentiment === 'positive').length;
  const negative = mentions.filter(item => item.sentiment === 'negative').length;
  const neutral = mentions.filter(item => item.sentiment === 'neutral').length;
  const averageScore = mentions.length
    ? Math.round(mentions.reduce((sum, item) => sum + item.sentimentScore, 0) / mentions.length)
    : 0;
  const topPlatform = Object.entries(mentions.reduce<Record<string, number>>((acc, item) => {
    acc[item.platform] = (acc[item.platform] ?? 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';
  const platformCounts = Object.entries(mentions.reduce<Record<string, number>>((acc, item) => {
    const key = ['X', 'Reddit', 'StockTwits'].includes(item.platform) ? item.platform : 'Other';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const sortedMentions = [...mentions].sort((a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime());
  const trendValues = sortedMentions.map((_, index) => {
    const sample = sortedMentions.slice(0, index + 1);
    return Math.round(sample.reduce((sum, item) => sum + item.sentimentScore, 0) / sample.length);
  });
  const topicCounts = Object.entries(mentions.reduce<Record<string, number>>((acc, item) => {
    acc[item.topic] = (acc[item.topic] ?? 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const topInfluencers = [...mentions].sort((a, b) => b.engagement - a.engagement).slice(0, 5).map(item => item.author);
  const bullishNarratives = mentions
    .filter(item => item.sentiment === 'positive')
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 4)
    .map(item => item.topic);
  const bearishNarratives = mentions
    .filter(item => item.sentiment === 'negative')
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 4)
    .map(item => item.topic);

  const rows = mentions.map(item => ({
    postedAt: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(item.postedAt)),
    platform: item.platform,
    author: item.author,
    sentiment: item.sentiment,
    sentimentScore: String(item.sentimentScore),
    topic: item.topic,
    comment: item.comment,
    engagement: item.engagement.toLocaleString('en-US'),
    sourceLink: item.sourceLink,
  }));

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Sentiment & Narrative Intelligence</h1>
          <p className="page__desc">Social-media mention scan across public platforms, with sentiment classification and links back to the source posts.</p>
          <span className="import-file-tag">import_data/sentiment/social_mentions.json</span>
        </div>
      </div>

      <section className="terminal-section narrative-overview">
        <div className="terminal-section__head">
          <div>
            <span>Overview</span>
            <h2>Market Narrative Overview</h2>
            <p className="section-subtitle">Visual readout of sentiment, platform activity, discussion momentum, and dominant narratives.</p>
          </div>
          <div className="terminal-section-actions">{sourceChip(envelope.sourcePlatform ?? 'Social Media Engine')}</div>
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
            <ul>{bullishNarratives.map(topic => <li key={topic}>{topic}</li>)}</ul>
          </div>
          <div className="terminal-card narrative-card">
            <span>Top Bearish Narratives</span>
            <ul>{bearishNarratives.map(topic => <li key={topic}>{topic}</li>)}</ul>
          </div>
          <div className="terminal-card narrative-card">
            <span>Topics, Influencers, Communities</span>
            <p><strong>Topics:</strong> {topicCounts.slice(0, 6).map(([topic]) => topic).join(', ')}</p>
            <p><strong>Influencers:</strong> {topInfluencers.join(', ')}</p>
            <p><strong>Communities:</strong> {platformCounts.map(([platform]) => platform).join(', ')}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section__head">
          <h2 className="panel__title with-info">
            Mention Feed
            <InfoTooltip text="This table lists imported posts mentioning the company. Use it to see what investors, traders, and market observers are saying, then open the source link for context." />
          </h2>
          <div className="import-source-meta">
            <span>{envelope.sourcePlatform}</span>
            <span>{envelope.recordCount} records</span>
          </div>
        </div>
        <ImportDataTable
          columns={['postedAt', 'platform', 'author', 'sentiment', 'sentimentScore', 'topic', 'comment', 'engagement', 'sourceLink']}
          rows={rows}
          pageSize={10}
        />
      </section>
    </div>
  );
}
