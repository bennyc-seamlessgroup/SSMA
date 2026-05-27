import { ImportDataTable } from '@/components/ImportDataTable';
import { InfoTooltip } from '@/components/InfoTooltip';
import { readImportFile } from '@/lib/import-data';

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
          <h1 className="page__title">Sentiment Intelligence</h1>
          <p className="page__desc">Social-media mention scan across public platforms, with sentiment classification and links back to the source posts.</p>
          <span className="import-file-tag">import_data/sentiment/social_mentions.json</span>
        </div>
      </div>

      <section className="grid cols-4">
        <div className="metric">
          <div className="metric__label with-info">Market Sentiment Score <InfoTooltip text="A normalized 0-100 score summarizing the tone of imported public mentions. Higher values indicate more positive discussion." /></div>
          <div className="metric__value">{averageScore}</div>
          <div className="metric__note">Average across {mentions.length} mentions</div>
        </div>
        <div className="metric">
          <div className="metric__label with-info">Positive Mentions <InfoTooltip text="Posts classified as supportive, constructive, or bullish toward the company narrative." /></div>
          <div className="metric__value">{percent(positive, mentions.length)}</div>
          <div className="metric__note">{positive} positive posts</div>
        </div>
        <div className="metric">
          <div className="metric__label with-info">Negative Mentions <InfoTooltip text="Posts classified as skeptical, risk-focused, or bearish toward the company narrative." /></div>
          <div className="metric__value">{percent(negative, mentions.length)}</div>
          <div className="metric__note">{negative} negative posts</div>
        </div>
        <div className="metric">
          <div className="metric__label with-info">Top Platform <InfoTooltip text="The platform with the highest number of imported mentions in the current sentiment scan." /></div>
          <div className="metric__value">{topPlatform}</div>
          <div className="metric__note">{neutral} neutral posts</div>
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
        />
      </section>
    </div>
  );
}
