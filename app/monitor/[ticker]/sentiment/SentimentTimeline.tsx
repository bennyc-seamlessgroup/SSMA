'use client';

import { useMemo, useState } from 'react';

type TimelineMention = {
  timestampMs: number;
  platform: 'Reddit' | 'X' | 'Stocktwits';
  score: number;
};

const ranges = [
  { label: '1D', days: 1 },
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
] as const;

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 50;
}

function buildSeries(points: TimelineMention[], rangeDays: number) {
  const latest = Math.max(...points.map(point => point.timestampMs), Date.now());
  const start = latest - rangeDays * 24 * 60 * 60 * 1000;
  const filtered = points.filter(point => point.timestampMs >= start && point.timestampMs <= latest);
  const buckets = rangeDays === 1 ? 12 : 18;
  const bucketSize = Math.max((latest - start) / buckets, 1);

  return Array.from({ length: buckets }, (_, index) => {
    const bucketStart = start + index * bucketSize;
    const bucketEnd = bucketStart + bucketSize;
    const bucketPoints = filtered.filter(point => point.timestampMs >= bucketStart && point.timestampMs < bucketEnd);
    const reddit = bucketPoints.filter(point => point.platform === 'Reddit').map(point => point.score);
    const x = bucketPoints.filter(point => point.platform === 'X').map(point => point.score);
    const stocktwits = bucketPoints.filter(point => point.platform === 'Stocktwits').map(point => point.score);
    return {
      overall: average(bucketPoints.map(point => point.score)),
      reddit: average(reddit),
      x: average(x),
      stocktwits: average(stocktwits),
    };
  });
}

function pointsFor(values: number[], min: number, range: number) {
  return values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
    const y = 84 - ((value - min) / range) * 68;
    return `${x},${y}`;
  }).join(' ');
}

export function SentimentTimeline({ mentions }: { mentions: TimelineMention[] }) {
  const [activeRange, setActiveRange] = useState<(typeof ranges)[number]['label']>('1D');
  const active = ranges.find(range => range.label === activeRange) ?? ranges[0];
  const series = useMemo(() => buildSeries(mentions, active.days), [active.days, mentions]);
  const lines = [
    { label: 'Overall', values: series.map(point => point.overall), color: '#7c3aed' },
    { label: 'X', values: series.map(point => point.x), color: '#111827' },
    { label: 'Reddit', values: series.map(point => point.reddit), color: '#ff4500' },
    { label: 'Stocktwits', values: series.map(point => point.stocktwits), color: '#1296f3' },
  ];
  const allValues = lines.flatMap(line => line.values);
  const max = Math.max(...allValues, 100);
  const min = Math.min(...allValues, 0);
  const range = Math.max(max - min, 1);

  return (
    <div className="narrative-timeline-card">
      <div className="narrative-section-head">
        <div>
          <span>Timeline</span>
          <h2>Sentiment Timeline</h2>
        </div>
        <div className="narrative-range-tabs">
          {ranges.map(rangeOption => (
            <button
              type="button"
              key={rangeOption.label}
              className={activeRange === rangeOption.label ? 'active' : ''}
              onClick={() => setActiveRange(rangeOption.label)}
            >
              {rangeOption.label}
            </button>
          ))}
        </div>
      </div>
      <div className="narrative-multi-line">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" x2="100" y1="84" y2="84" />
          <line x1="0" x2="100" y1="50" y2="50" />
          <line x1="0" x2="100" y1="16" y2="16" />
          {lines.map(line => <polyline key={line.label} points={pointsFor(line.values, min, range)} style={{ stroke: line.color }} />)}
        </svg>
      </div>
      <div className="narrative-timeline-legend">
        {lines.map(line => <span key={line.label}><i style={{ background: line.color }} />{line.label}</span>)}
      </div>
    </div>
  );
}
