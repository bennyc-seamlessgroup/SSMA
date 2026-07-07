'use client';

import { useMemo, useState } from 'react';

export type MentionFeedRow = {
  timestamp: string;
  timestampMs: number;
  platform: string;
  author: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  text: string;
  metrics: Array<{ label: string; value: string }>;
  engagementScore: number;
  sortLabel: string;
  url: string;
};

const PAGE_SIZE = 6;
const sentimentFilters = ['All Sentiment', 'Bullish', 'Neutral', 'Bearish'] as const;

function sentimentTone(sentiment: string) {
  if (sentiment === 'positive') return 'positive';
  if (sentiment === 'negative') return 'negative';
  return 'neutral';
}

function sentimentLabel(sentiment: MentionFeedRow['sentiment']) {
  if (sentiment === 'positive') return 'Bullish';
  if (sentiment === 'negative') return 'Bearish';
  return 'Neutral';
}

function engagement(row: MentionFeedRow) {
  return row.engagementScore;
}

function headline(row: MentionFeedRow) {
  const clean = row.text.replace(/\s+/g, ' ').trim();
  if (!clean) return `${row.platform} narrative mention`;
  const sentence = clean.split(/[.!?]/)[0]?.trim() || clean;
  return sentence.length > 82 ? `${sentence.slice(0, 79)}...` : sentence;
}

function summary(row: MentionFeedRow) {
  const clean = row.text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Mention imported without enough text for narrative summary.';
  const withoutHeadline = clean.replace(headline(row), '').trim();
  const text = withoutHeadline || clean;
  return text.length > 148 ? `${text.slice(0, 145)}...` : text;
}

function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/(\$[A-Za-z][A-Za-z0-9._-]*)/g);
  return (
    <>
      {parts.map((part, index) => (
        /^\$[A-Za-z]/.test(part)
          ? <mark className="narrative-cashtag" key={`${part}-${index}`}>{part}</mark>
          : <span key={`${part}-${index}`}>{part}</span>
      ))}
    </>
  );
}

function logoSrc(row: MentionFeedRow) {
  if (row.platform === 'Reddit') return '/reddit_logo_128x128.png';
  if (row.platform === 'X') return '/x_logo_128x128.png';
  if (row.platform === 'Stocktwits') return '/stocktwits_logo_128x128.png';
  return '';
}

function logoLabel(row: MentionFeedRow) {
  if (row.platform === 'Reddit') return 'R';
  if (row.platform === 'X') return 'X';
  if (row.platform === 'Facebook') return 'f';
  if (row.platform === 'Linkedin') return 'in';
  if (row.platform === 'Stocktwits') return 'S';
  return row.platform.slice(0, 1).toUpperCase();
}

export function MentionFeedCards({
  rows,
  hidePlatformFilter = false,
  emptyMessage = 'No social feeds captured for this platform and time window.',
}: {
  rows: MentionFeedRow[];
  hidePlatformFilter?: boolean;
  emptyMessage?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sentimentFilter, setSentimentFilter] = useState<(typeof sentimentFilters)[number]>('All Sentiment');
  const [sortMode, setSortMode] = useState<'recent' | 'mentioned'>('recent');
  const filteredRows = useMemo(() => {
    return rows
      .filter(row => sentimentFilter === 'All Sentiment' || sentimentLabel(row.sentiment) === sentimentFilter)
      .sort((a, b) => {
        if (sortMode === 'mentioned') return engagement(b) - engagement(a);
        return b.timestampMs - a.timestampMs;
      });
  }, [rows, sentimentFilter, sortMode]);
  const visibleRows = useMemo(
    () => filteredRows.slice(0, visibleCount),
    [filteredRows, visibleCount],
  );

  function resetVisibleRows() {
    setVisibleCount(PAGE_SIZE);
  }

  const platformSortLabel = useMemo(() => {
    const labels = Array.from(new Set(
      rows
        .map(row => row.sortLabel)
        .filter(Boolean),
    ));
    return labels[0] ?? 'Most Engaged';
  }, [rows]);

  return (
    <div className="narrative-feed-shell">
      <div className="narrative-command-filters">
        {!hidePlatformFilter && <span className="narrative-feed-filter-label">Feed filters</span>}
        <div className="narrative-filter-selects">
          <select value={sentimentFilter} onChange={event => { setSentimentFilter(event.target.value as (typeof sentimentFilters)[number]); resetVisibleRows(); }} aria-label="Sentiment filter">
            {sentimentFilters.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <select value={sortMode} onChange={event => { setSortMode(event.target.value as 'recent' | 'mentioned'); resetVisibleRows(); }} aria-label="Sort feed">
            <option value="recent">Most Recent</option>
            <option value="mentioned">{platformSortLabel}</option>
          </select>
        </div>
      </div>

      <div className="narrative-intel-feed">
        {visibleRows.length === 0 ? (
          <div className="narrative-feed-empty">{emptyMessage}</div>
        ) : visibleRows.map((row, index) => (
          <article className="narrative-intel-card" key={`${row.url}-${row.timestamp}-${index}`}>
            <div className="narrative-source-logo">
              {logoSrc(row) ? <img src={logoSrc(row)} alt="" /> : logoLabel(row)}
            </div>
            <div className="narrative-intel-body">
              <div className="narrative-intel-meta">
                <span className={`narrative-sentiment-pill ${sentimentTone(row.sentiment)}`}>{sentimentLabel(row.sentiment)}</span>
                <time>{row.timestamp}</time>
              </div>
              <h3><HighlightedText text={headline(row)} /></h3>
              <p><HighlightedText text={summary(row)} /></p>
              <div className="narrative-intel-foot">
                <span>Source: <strong>{row.platform}</strong></span>
                <span>Author: <strong>{row.author}</strong></span>
                {row.metrics.map(metric => (
                  <span key={`${row.platform}-${row.timestamp}-${metric.label}`}>
                    {metric.label}: <strong>{metric.value}</strong>
                  </span>
                ))}
                {row.url && (
                  <a className="narrative-source-action" href={row.url} target="_blank" rel="noreferrer" aria-label="Open source">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M14 3h7v7" />
                      <path d="M10 14 21 3" />
                      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="narrative-feed-pagination" aria-label={`${rows[0]?.platform ?? 'Mention'} feed pagination`}>
        <span>Showing {visibleRows.length} of {filteredRows.length} items</span>
        <button type="button" onClick={() => setVisibleCount(current => current + PAGE_SIZE)} disabled={visibleRows.length >= filteredRows.length}>Load more</button>
      </div>
    </div>
  );
}
