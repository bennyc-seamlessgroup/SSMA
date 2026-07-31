'use client';

import { ApiSourceTags } from '@/components/ApiSourceTags';

export type DailyMarketSnapshotData = {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  tradeVolume: number | null;
};

function formatPrice(value: number | null) {
  if (value === null) return 'N/A';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatVolume(value: number | null) {
  return value === null ? 'N/A' : Math.round(value).toLocaleString('en-US');
}

function formatDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value || 'Date unavailable';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function DailyMarketSnapshot({ data }: { data: DailyMarketSnapshotData | null }) {
  const metrics = [
    { label: 'Open', value: formatPrice(data?.open ?? null) },
    { label: 'High', value: formatPrice(data?.high ?? null) },
    { label: 'Low', value: formatPrice(data?.low ?? null) },
    { label: 'Close', value: formatPrice(data?.close ?? null) },
    { label: 'Trade Volume', value: formatVolume(data?.tradeVolume ?? null) },
  ];

  return (
    <section className="dashboard-daily-snapshot" aria-label="Daily market trading snapshot">
      <div className="dashboard-daily-snapshot__meta">
        <ApiSourceTags sources={[
          { endpoint: 'GET /market-data/current?category=market-current', label: 'Daily OHLC & volume' },
        ]} />
        <time dateTime={data?.date}>{data ? `As of ${formatDate(data.date)}` : 'No market snapshot available'}</time>
      </div>
      <dl className="dashboard-daily-snapshot__metrics">
        {metrics.map(metric => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
