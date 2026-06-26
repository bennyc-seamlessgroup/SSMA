'use client';

import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { usePortalTimeZone } from '@/components/usePortalTimeZone';
import { normalizePortalTimeZone } from '@/lib/timezone';

type TimelineMention = {
  timestampMs: number;
  platform: 'Reddit' | 'X' | 'Stocktwits';
  score: number;
};

type SeriesKey = 'overall' | 'x' | 'reddit' | 'stocktwits';

const seriesConfig: Array<{ key: SeriesKey; label: string; color: string }> = [
  { key: 'overall', label: 'Overall', color: '#7c3aed' },
  { key: 'x', label: 'X', color: '#111827' },
  { key: 'reddit', label: 'Reddit', color: '#ff4500' },
  { key: 'stocktwits', label: 'Stocktwits', color: '#1296f3' },
];

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function formatTimeLabel(timestamp: number, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hour12: false,
    timeZone: normalizePortalTimeZone(timeZone),
  }).format(new Date(timestamp));
}

function formatDateLabel(timestamp: number, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: normalizePortalTimeZone(timeZone),
  }).format(new Date(timestamp));
}

function formatBucketLabel(start: number, end: number, rangeDays: number, timeZone: string) {
  if (rangeDays === 1) return `${formatTimeLabel(start, timeZone)}-${formatTimeLabel(end, timeZone)}`;
  return formatDateLabel(start, timeZone);
}

function buildSeries(points: TimelineMention[], rangeDays: number, timeZone: string) {
  const latest = Math.max(...points.map(point => point.timestampMs), Date.now());
  const start = latest - rangeDays * 24 * 60 * 60 * 1000;
  const filtered = points.filter(point => point.timestampMs >= start && point.timestampMs <= latest);
  const buckets = rangeDays === 1 ? 8 : 10;
  const bucketSize = Math.max((latest - start) / buckets, 1);

  return Array.from({ length: buckets }, (_, index) => {
    const bucketStart = start + index * bucketSize;
    const bucketEnd = bucketStart + bucketSize;
    const bucketPoints = filtered.filter(point => point.timestampMs >= bucketStart && point.timestampMs < bucketEnd);
    const reddit = bucketPoints.filter(point => point.platform === 'Reddit').map(point => point.score);
    const x = bucketPoints.filter(point => point.platform === 'X').map(point => point.score);
    const stocktwits = bucketPoints.filter(point => point.platform === 'Stocktwits').map(point => point.score);
    return {
      label: formatBucketLabel(bucketStart, bucketEnd, rangeDays, timeZone),
      overall: average(bucketPoints.map(point => point.score)),
      reddit: average(reddit),
      x: average(x),
      stocktwits: average(stocktwits),
    };
  });
}

export function SentimentTimeline({ mentions, rangeDays }: { mentions: TimelineMention[]; rangeDays: number }) {
  const [selectedSeries, setSelectedSeries] = useState<SeriesKey>('overall');
  const timeZone = usePortalTimeZone();
  const series = useMemo(() => buildSeries(mentions, rangeDays, timeZone), [mentions, rangeDays, timeZone]);
  const selectedConfig = seriesConfig.find(item => item.key === selectedSeries) ?? seriesConfig[0];
  const axisTicks = [100, 75, 50, 25, 0];
  const visibleLabelIndexes = new Set(
    rangeDays === 1
      ? series.map((_, index) => index).filter(index => index % 2 === 0 || index === series.length - 1)
      : [0, Math.floor((series.length - 1) / 2), series.length - 1],
  );

  return (
    <div className="narrative-timeline-card">
      <div className="narrative-section-head">
        <div>
          <h2>Sentiment Timeline</h2>
        </div>
        <label className="narrative-timeline-select">
          <span>Series</span>
          <select value={selectedSeries} onChange={event => setSelectedSeries(event.target.value as SeriesKey)}>
            {seriesConfig.map(item => (
              <option value={item.key} key={item.key}>{item.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="narrative-bar-chart">
        <div className="narrative-bar-axis" aria-hidden="true">
          {axisTicks.map(tick => <span key={tick}>{tick}</span>)}
        </div>
        <div className="narrative-bar-plot">
          {axisTicks.filter(tick => tick > 0).map(tick => <i key={tick} style={{ bottom: `${tick}%` }} />)}
          <div className="narrative-bar-groups" style={{ '--bar-count': series.length } as CSSProperties}>
            {series.map((bucket, bucketIndex) => (
              <div className="narrative-bar-group" key={`${bucket.label}-${bucketIndex}`}>
                <div className="narrative-bar-stack">
                  {bucket[selectedSeries] === null ? (
                    <span
                      className="is-empty"
                      title={`${selectedConfig.label}: no data`}
                      style={{ background: selectedConfig.color }}
                    />
                  ) : (
                    <span
                      title={`${selectedConfig.label}: ${bucket[selectedSeries]}`}
                      style={{ height: `${Math.max(2, bucket[selectedSeries] ?? 0)}%`, background: selectedConfig.color }}
                    />
                  )}
                </div>
                <em>{visibleLabelIndexes.has(bucketIndex) ? bucket.label : ''}</em>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="narrative-timeline-current" aria-label="Selected sentiment timeline series">
        <i style={{ background: selectedConfig.color }} />
        {selectedConfig.label}
      </div>
    </div>
  );
}
