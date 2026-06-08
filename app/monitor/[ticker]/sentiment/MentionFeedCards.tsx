'use client';

import { useMemo, useState } from 'react';

export type MentionFeedRow = {
  timestamp: string;
  platform: string;
  author: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  text: string;
  likes: string;
  comments: string;
  url: string;
};

const PAGE_SIZE = 6;

function sentimentTone(sentiment: string) {
  if (sentiment === 'positive') return 'positive';
  if (sentiment === 'negative') return 'negative';
  return 'neutral';
}

export function MentionFeedCards({ rows }: { rows: MentionFeedRow[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleRows = useMemo(
    () => rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [rows, safePage],
  );

  function goToPage(nextPage: number) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  return (
    <div className="narrative-feed-shell">
      <div className="narrative-feed-list">
        {visibleRows.map((row, index) => (
          <article className="narrative-feed-card" key={`${row.url}-${row.timestamp}-${index}`}>
            <div className="narrative-feed-card__top">
              <span className={`narrative-sentiment-pill ${sentimentTone(row.sentiment)}`}>{row.sentiment}</span>
              <time>{row.timestamp}</time>
            </div>
            <p className="narrative-feed-text">{row.text || 'No post text available.'}</p>
            <div className="narrative-feed-meta">
              <span>-- {row.author}</span>
              <span>{row.platform}</span>
            </div>
            <div className="narrative-feed-card__bottom">
              <span>{row.likes} likes</span>
              <span>{row.comments} comments</span>
              {row.url && <a className="text-link table-link" href={row.url} target="_blank" rel="noreferrer">View source</a>}
            </div>
          </article>
        ))}
      </div>

      <div className="narrative-feed-pagination" aria-label={`${rows[0]?.platform ?? 'Mention'} feed pagination`}>
        <button type="button" onClick={() => goToPage(1)} disabled={safePage === 1}>First</button>
        <button type="button" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}>Previous</button>
        <span>Page {safePage} of {totalPages}</span>
        <button type="button" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}>Next</button>
        <button type="button" onClick={() => goToPage(totalPages)} disabled={safePage === totalPages}>Last</button>
      </div>
    </div>
  );
}
