'use client';

import type { AggregatedSentimentBucket, SentimentPlatformFilter } from '@/lib/sentiment-buckets';
import { useState } from 'react';

const platformColors: Record<SentimentPlatformFilter, string> = {
  All: '#7c3aed',
  X: 'var(--narrative-x-color, #111827)',
  Reddit: '#ff4500',
  Facebook: '#1877f2',
  Linkedin: '#0a66c2',
  Stocktwits: '#1296f3',
};

const chart = {
  width: 1100,
  height: 300,
  left: 48,
  right: 22,
  top: 16,
  bottom: 42,
};

function groupCenterX(index: number, total: number) {
  const plotWidth = chart.width - chart.left - chart.right;
  return chart.left + ((index + .5) / Math.max(total, 1)) * plotWidth;
}

function yFor(value: number) {
  const plotHeight = chart.height - chart.top - chart.bottom;
  return chart.top + ((100 - value) / 100) * plotHeight;
}

function visibleLabelIndexes(length: number) {
  const targetLabels = 7;
  const step = Math.max(1, Math.ceil((length - 1) / (targetLabels - 1)));
  const indexes = new Set<number>();
  for (let index = 0; index < length; index += step) indexes.add(index);
  indexes.add(length - 1);
  return indexes;
}

function platformLabel(platform: SentimentPlatformFilter) {
  return platform === 'Linkedin' ? 'LinkedIn' : platform;
}

export function SentimentTimeline({
  buckets,
  selectedPlatform,
  selectedBucketId,
  onSelectBucket,
}: {
  buckets: AggregatedSentimentBucket[];
  selectedPlatform: SentimentPlatformFilter;
  selectedBucketId: string | null;
  onSelectBucket: (bucket: AggregatedSentimentBucket) => void;
}) {
  const [hoveredBucketId, setHoveredBucketId] = useState<string | null>(null);
  const labels = visibleLabelIndexes(buckets.length);
  const selectedColor = platformColors[selectedPlatform];
  const plotWidth = chart.width - chart.left - chart.right;
  const groupStep = plotWidth / Math.max(buckets.length, 1);
  const barWidth = Math.min(Math.max(groupStep * .46, 5), 28);
  const selectedIndex = selectedBucketId ? buckets.findIndex(bucket => bucket.id === selectedBucketId) : -1;
  const hoveredIndex = hoveredBucketId ? buckets.findIndex(bucket => bucket.id === hoveredBucketId) : -1;
  const activeIndex = hoveredIndex >= 0 ? hoveredIndex : selectedIndex >= 0 ? selectedIndex : null;
  const tooltipIndex = activeIndex;
  const tooltipX = tooltipIndex !== null ? groupCenterX(tooltipIndex, buckets.length) : 0;

  return (
    <div className="narrative-timeline-card narrative-line-timeline">
      <div className="narrative-section-head narrative-timeline-head">
        <div>
          <h2>Sentiment Timeline</h2>
          <p>Fixed date buckets keep every bar aligned to the selected timeframe.</p>
        </div>
        <div className="narrative-timeline-current">
          <i style={{ background: selectedColor }} />
          {selectedPlatform}
        </div>
      </div>

      <div className="narrative-line-chart narrative-grouped-bar-chart">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          role="img"
          aria-label="Grouped sentiment scores over time"
          onMouseLeave={() => setHoveredBucketId(null)}
        >
          {[100, 75, 50, 25, 0].map(tick => (
            <g key={tick} className="narrative-line-grid">
              <line x1={chart.left} x2={chart.width - chart.right} y1={yFor(tick)} y2={yFor(tick)} />
              <text x={chart.left - 12} y={yFor(tick) + 4} textAnchor="end">{tick}</text>
            </g>
          ))}

          {buckets.map((bucket, index) => labels.has(index) && (
            <text
              className="narrative-line-x-label"
              key={`${bucket.label}-${index}`}
              x={groupCenterX(index, buckets.length)}
              y={chart.height - 12}
              textAnchor="middle"
            >
              {bucket.label}
            </text>
          ))}

          <g>
            {buckets.map((bucket, bucketIndex) => {
              const value = bucket.score ?? 0;
              const y = yFor(value);
              const selected = selectedBucketId === bucket.id;
              return (
                <rect
                  key={bucket.id}
                  className={`narrative-series-bar ${selected ? 'selected' : ''} ${bucket.mentions ? '' : 'is-empty'}`}
                  x={groupCenterX(bucketIndex, buckets.length) - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={Math.max(2, yFor(0) - y)}
                  rx={Math.min(5, barWidth / 2)}
                  style={{ fill: selectedColor, opacity: selectedBucketId && !selected ? .32 : bucket.mentions ? .92 : .18 }}
                  onMouseEnter={() => setHoveredBucketId(bucket.id)}
                  onClick={() => onSelectBucket(bucket)}
                />
              );
            })}
          </g>
        </svg>

        {tooltipIndex !== null && (
          <div
            className={`narrative-line-tooltip ${tooltipX > chart.width * .68 ? 'is-right' : ''}`}
            style={{ left: `${(tooltipX / chart.width) * 100}%` }}
          >
            <strong>{buckets[tooltipIndex].tooltipLabel}</strong>
            <span className="focused">
              <i style={{ background: selectedColor }} />
              {platformLabel(selectedPlatform)}
              <b>{buckets[tooltipIndex].score ?? 'No data'}</b>
            </span>
            <span>Mentions <b>{buckets[tooltipIndex].mentions}</b></span>
            <span>Bullish <b>{buckets[tooltipIndex].positive}</b></span>
            <span>Neutral <b>{buckets[tooltipIndex].neutral}</b></span>
            <span>Bearish <b>{buckets[tooltipIndex].negative}</b></span>
          </div>
        )}
      </div>
    </div>
  );
}
