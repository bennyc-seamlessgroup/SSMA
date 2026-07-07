'use client';

import { useMemo, useState } from 'react';
import { usePortalTimeZone } from '@/components/usePortalTimeZone';
import { normalizePortalTimeZone } from '@/lib/timezone';

type TimelineMention = {
  timestampMs: number;
  platform: 'Reddit' | 'X' | 'Facebook' | 'Linkedin' | 'Stocktwits';
  score: number;
};

type SeriesKey = 'overall' | 'x' | 'reddit' | 'facebook' | 'linkedin' | 'stocktwits';
type TimelineBucket = {
  label: string;
  overall: number | null;
  x: number | null;
  reddit: number | null;
  facebook: number | null;
  linkedin: number | null;
  stocktwits: number | null;
};

const seriesConfig: Array<{ key: SeriesKey; label: string; color: string }> = [
  { key: 'overall', label: 'Overall', color: '#7c3aed' },
  { key: 'x', label: 'X', color: 'var(--narrative-x-color, #111827)' },
  { key: 'reddit', label: 'Reddit', color: '#ff4500' },
  { key: 'facebook', label: 'Facebook', color: '#1877f2' },
  { key: 'linkedin', label: 'Linkedin', color: '#0a66c2' },
  { key: 'stocktwits', label: 'Stocktwits', color: '#1296f3' },
];

const chart = {
  width: 1100,
  height: 300,
  left: 48,
  right: 22,
  top: 16,
  bottom: 42,
};

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function formatTimeLabel(timestamp: number, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: true,
    timeZone: normalizePortalTimeZone(timeZone),
  }).format(new Date(timestamp));
}

function formatDateLabel(timestamp: number, rangeDays: number, timeZone: string) {
  const options: Intl.DateTimeFormatOptions = rangeDays > 90
    ? { month: 'short', year: '2-digit' }
    : rangeDays > 7
      ? { month: 'short', day: 'numeric' }
      : { weekday: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: normalizePortalTimeZone(timeZone),
  }).format(new Date(timestamp));
}

function formatBucketLabel(start: number, rangeDays: number, timeZone: string) {
  return rangeDays === 1 ? formatTimeLabel(start, timeZone) : formatDateLabel(start, rangeDays, timeZone);
}

function bucketCountFor(rangeDays: number) {
  if (rangeDays === 1) return 12;
  if (rangeDays <= 7) return 14;
  if (rangeDays <= 30) return 20;
  if (rangeDays <= 183) return 24;
  return 30;
}

function buildSeries(points: TimelineMention[], rangeDays: number, timeZone: string): TimelineBucket[] {
  const latest = Date.now();
  const start = latest - rangeDays * 24 * 60 * 60 * 1000;
  const filtered = points.filter(point => point.timestampMs >= start && point.timestampMs <= latest);
  const bucketCount = bucketCountFor(rangeDays);
  const bucketSize = Math.max((latest - start) / bucketCount, 1);

  return Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = start + index * bucketSize;
    const bucketEnd = index === bucketCount - 1 ? latest : bucketStart + bucketSize;
    const bucketPoints = filtered.filter(point => (
      point.timestampMs >= bucketStart
      && (index === bucketCount - 1 ? point.timestampMs <= bucketEnd : point.timestampMs < bucketEnd)
    ));
    const reddit = bucketPoints.filter(point => point.platform === 'Reddit').map(point => point.score);
    const x = bucketPoints.filter(point => point.platform === 'X').map(point => point.score);
    const facebook = bucketPoints.filter(point => point.platform === 'Facebook').map(point => point.score);
    const linkedin = bucketPoints.filter(point => point.platform === 'Linkedin').map(point => point.score);
    const stocktwits = bucketPoints.filter(point => point.platform === 'Stocktwits').map(point => point.score);

    return {
      label: formatBucketLabel(bucketStart, rangeDays, timeZone),
      overall: average(bucketPoints.map(point => point.score)),
      reddit: average(reddit),
      x: average(x),
      facebook: average(facebook),
      linkedin: average(linkedin),
      stocktwits: average(stocktwits),
    };
  });
}

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

export function SentimentTimeline({ mentions, rangeDays }: { mentions: TimelineMention[]; rangeDays: number }) {
  const [selectedSeries, setSelectedSeries] = useState<SeriesKey>('overall');
  const [hovered, setHovered] = useState<number | null>(null);
  const timeZone = usePortalTimeZone();
  const series = useMemo(() => buildSeries(mentions, rangeDays, timeZone), [mentions, rangeDays, timeZone]);
  const labels = useMemo(() => visibleLabelIndexes(series.length), [series.length]);
  const selectedConfig = seriesConfig.find(item => item.key === selectedSeries) ?? seriesConfig[0];
  const plotWidth = chart.width - chart.left - chart.right;
  const groupStep = plotWidth / Math.max(series.length, 1);
  const barWidth = Math.min(Math.max(groupStep * .46, 5), 28);
  const hoveredX = hovered !== null ? groupCenterX(hovered, series.length) : 0;

  return (
    <div className="narrative-timeline-card narrative-line-timeline">
      <div className="narrative-section-head narrative-timeline-head">
        <div>
          <h2>Sentiment Timeline</h2>
          <p>One sentiment series at a time. Use the selector to compare platforms without duplicate bars per date.</p>
        </div>
        <div className="narrative-timeline-select">
          <span>Series</span>
          <select value={selectedSeries} onChange={event => setSelectedSeries(event.target.value as SeriesKey)}>
            {seriesConfig.map(item => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="narrative-line-chart narrative-grouped-bar-chart">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          role="img"
          aria-label="Grouped sentiment scores over time"
          onMouseLeave={() => setHovered(null)}
        >
          {[100, 75, 50, 25, 0].map(tick => (
            <g key={tick} className="narrative-line-grid">
              <line x1={chart.left} x2={chart.width - chart.right} y1={yFor(tick)} y2={yFor(tick)} />
              <text x={chart.left - 12} y={yFor(tick) + 4} textAnchor="end">{tick}</text>
            </g>
          ))}

          {series.map((bucket, index) => labels.has(index) && (
            <text
              className="narrative-line-x-label"
              key={`${bucket.label}-${index}`}
              x={groupCenterX(index, series.length)}
              y={chart.height - 12}
              textAnchor="middle"
            >
              {bucket.label}
            </text>
          ))}

          <g>
            {series.map((bucket, bucketIndex) => {
              const value = bucket[selectedSeries];
              if (value === null) return null;
              const y = yFor(value);
              return (
                <rect
                  key={`${bucketIndex}-${selectedSeries}`}
                  className="narrative-series-bar"
                  x={groupCenterX(bucketIndex, series.length) - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={Math.max(2, yFor(0) - y)}
                  rx={Math.min(5, barWidth / 2)}
                  style={{ fill: selectedConfig.color, opacity: hovered === null || hovered === bucketIndex ? .92 : .28 }}
                  onMouseEnter={() => setHovered(bucketIndex)}
                />
              );
            })}
          </g>
        </svg>

        {hovered !== null && (
          <div
            className={`narrative-line-tooltip ${hoveredX > chart.width * .68 ? 'is-right' : ''}`}
            style={{ left: `${(hoveredX / chart.width) * 100}%` }}
          >
            <strong>{series[hovered].label}</strong>
            <span className="focused">
              <i style={{ background: selectedConfig.color }} />
              {selectedConfig.label}
              <b>{series[hovered][selectedSeries] ?? 'No data'}</b>
            </span>
          </div>
        )}

        <div className="narrative-timeline-current">
          <i style={{ background: selectedConfig.color }} />
          {selectedConfig.label}
        </div>
      </div>
    </div>
  );
}
