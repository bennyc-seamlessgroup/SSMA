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
  followersScore: number;
  likesScore: number;
  sortLabel: string;
  url: string;
};

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
  const firstSentence = clean.split(/[.!?]/)[0]?.trim() || clean;
  const withoutHeadline = clean.startsWith(firstSentence) ? clean.slice(firstSentence.length).replace(/^[.!?\s]+/, '').trim() : clean;
  const text = withoutHeadline || clean;
  return text.length > 128 ? `${text.slice(0, 125)}...` : text;
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
  fromDate,
  toDate,
  minDate,
  maxDate,
  isLoadingRange = false,
  onDateRangeChange,
  canSeeMore = false,
  showSeeMore = true,
  onSeeMore,
  hidePlatformFilter = false,
  emptyMessage = 'No social feeds captured for this platform and time window.',
}: {
  rows: MentionFeedRow[];
  fromDate: string;
  toDate: string;
  minDate: string;
  maxDate: string;
  isLoadingRange?: boolean;
  onDateRangeChange: (fromDate: string, toDate: string) => void | Promise<void>;
  canSeeMore?: boolean;
  showSeeMore?: boolean;
  onSeeMore: () => void | Promise<void>;
  hidePlatformFilter?: boolean;
  emptyMessage?: string;
}) {
  const [sentimentFilter, setSentimentFilter] = useState<(typeof sentimentFilters)[number]>('All Sentiment');
  const [sortMode, setSortMode] = useState<'recent' | 'followers' | 'likes' | 'engagement'>('recent');
  const [dateRangeError, setDateRangeError] = useState('');
  const filteredRows = useMemo(() => {
    return rows
      .filter(row => sentimentFilter === 'All Sentiment' || sentimentLabel(row.sentiment) === sentimentFilter)
      .sort((a, b) => {
        if (sortMode === 'followers') return b.followersScore - a.followersScore;
        if (sortMode === 'likes') return b.likesScore - a.likesScore;
        if (sortMode === 'engagement') return engagement(b) - engagement(a);
        return b.timestampMs - a.timestampMs;
      });
  }, [rows, sentimentFilter, sortMode]);
  return (
    <div className="narrative-feed-shell">
      <div className="narrative-command-filters">
        {!hidePlatformFilter && <span className="narrative-feed-filter-label">Feed filters</span>}
        <div className="narrative-filter-selects">
          <label className="narrative-date-range-field">
            <span>Post date from</span>
            <input
              type="date"
              value={fromDate}
              min={minDate}
              max={toDate}
              onChange={event => {
                if (!event.target.value) return;
                if (event.target.value > toDate) {
                  setDateRangeError('Select a valid post-date range.');
                  return;
                }
                setDateRangeError('');
                void onDateRangeChange(event.target.value, toDate);
              }}
              aria-label="Social feed starting post date"
            />
          </label>
          <label className="narrative-date-range-field">
            <span>Post date to</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={maxDate}
              onChange={event => {
                if (!event.target.value) return;
                if (event.target.value < fromDate) {
                  setDateRangeError('Select a valid post-date range.');
                  return;
                }
                setDateRangeError('');
                void onDateRangeChange(fromDate, event.target.value);
              }}
              aria-label="Social feed ending post date"
            />
          </label>
          <select value={sentimentFilter} onChange={event => setSentimentFilter(event.target.value as (typeof sentimentFilters)[number])} aria-label="Sentiment filter">
            {sentimentFilters.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <select value={sortMode} onChange={event => setSortMode(event.target.value as 'recent' | 'followers' | 'likes' | 'engagement')} aria-label="Sort feed">
            <option value="recent">Newest</option>
            <option value="followers">Highest Followers</option>
            <option value="likes">Highest Likes</option>
            <option value="engagement">Highest Engagement</option>
          </select>
        </div>
      </div>
      {dateRangeError && <div className="narrative-trade-date-error" role="alert">{dateRangeError}</div>}

      <div
        className={`narrative-intel-feed${isLoadingRange ? ' is-loading' : ''}`}
        aria-busy={isLoadingRange}
      >
        {filteredRows.length === 0 ? (
          <div className="narrative-feed-empty">{emptyMessage}</div>
        ) : filteredRows.map((row, index) => (
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
        {isLoadingRange && (
          <div className="narrative-feed-loading-overlay" role="status" aria-live="polite">
            <div className="narrative-feed-loading-message">
              <span className="narrative-feed-loading-spinner" aria-hidden="true" />
              <strong>Loading social feeds…</strong>
              <small>Updating posts published in the selected post-date range.</small>
            </div>
          </div>
        )}
      </div>

      <div className="narrative-feed-pagination" aria-label={`${rows[0]?.platform ?? 'Mention'} feed count`}>
        <span>Showing {filteredRows.length} posts in selected post-date range</span>
        {showSeeMore && (
          <button type="button" onClick={() => void onSeeMore()} disabled={!canSeeMore || isLoadingRange}>
            {isLoadingRange ? 'Loading…' : 'See previous 7 days'}
          </button>
        )}
      </div>
    </div>
  );
}
