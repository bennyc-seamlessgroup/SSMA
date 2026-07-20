'use client';

import { ImportDataTable } from '@/components/ImportDataTable';
import { InfoTooltip } from '@/components/InfoTooltip';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';
import { authenticatedFetch } from '@/lib/auth-client';
import { latestCompleteMarketPublicationRecordFromSources, marketPublicationRecordForDate, marketRecordDate } from '@/lib/market-data-publication';
import { normalizeTicker } from '@/lib/ticker-data';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

type Row = Record<string, unknown>;
type ApiFile = { generatedAt?: string; records?: Row[] } & Row;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Row[] : [];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function apiCategory(payload: ApiFile, category: string): ApiFile {
  const directCategory = record(payload[category]);
  if (Object.keys(directCategory).length) return directCategory as ApiFile;

  const data = record(payload.data);
  const dataCategory = record(data[category]);
  if (Object.keys(dataCategory).length) return dataCategory as ApiFile;
  if (Object.keys(data).length) return data as ApiFile;

  return payload;
}

function apiRecords(payload: ApiFile, category: string): Row[] {
  const normalized = apiCategory(payload, category);
  return rows(normalized.records ?? normalized.data);
}

function firstDefined(...values: unknown[]) {
  return values.find(value => value !== undefined && value !== null && value !== '');
}

function text(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function numeric(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumericMetric(...values: unknown[]) {
  const parsed = values.map(numeric).filter((value): value is number => value !== null);
  return parsed.find(value => value !== 0) ?? parsed[0];
}

function optionalNumeric(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  return numeric(value);
}

function latest(items: Row[], dateKey = 'date') {
  return [...items].sort((a, b) => String(b[dateKey] ?? '').localeCompare(String(a[dateKey] ?? '')))[0] ?? {};
}

function formatNumber(value: unknown, options?: Intl.NumberFormatOptions) {
  const parsed = numeric(value);
  return parsed === null ? 'N/A' : parsed.toLocaleString('en-US', options);
}

function formatCompactNumber(value: unknown) {
  const parsed = numeric(value);
  return parsed === null ? 'N/A' : new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(parsed);
}

function formatAxisNumber(value: unknown) {
  const parsed = numeric(value);
  return parsed === null ? 'N/A' : new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 0,
  }).format(Math.round(parsed));
}

function formatPercent(value: unknown, options?: Intl.NumberFormatOptions) {
  const parsed = numeric(value);
  return parsed === null ? 'No Source' : `${parsed.toLocaleString('en-US', options)}%`;
}

function signed(value: number, options?: Intl.NumberFormatOptions) {
  const formatted = Math.abs(value).toLocaleString('en-US', options);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function percentageChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

function dateValue(value: unknown) {
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function rowAtOrBeforeDaysAgo(items: Row[], latestDate: unknown, daysAgo: number) {
  const latestTimestamp = dateValue(latestDate);
  if (latestTimestamp === null) return {};
  const targetTimestamp = latestTimestamp - (daysAgo * 24 * 60 * 60 * 1000);
  return [...items]
    .filter(item => {
      const timestamp = dateValue(item.date);
      return timestamp !== null && timestamp <= targetTimestamp;
    })
    .sort((a, b) => (dateValue(b.date) ?? 0) - (dateValue(a.date) ?? 0))[0] ?? {};
}

function biweeklyRows(items: Row[], maximumPoints = 8) {
  const sorted = [...items]
    .filter(item => dateValue(item.date) !== null)
    .sort((a, b) => (dateValue(a.date) ?? 0) - (dateValue(b.date) ?? 0));
  if (!sorted.length) return [];

  const selected: Row[] = [];
  let cursor = sorted[sorted.length - 1];
  while (cursor && selected.length < maximumPoints) {
    selected.push(cursor);
    cursor = rowAtOrBeforeDaysAgo(sorted, cursor.date, 14);
  }
  return selected.reverse();
}

function sourceChip(source: string) {
  return <span className="source-chip ready">Source: {source}</span>;
}

function InfoTitle({ children, text }: { children: ReactNode; text: string }) {
  return <span className="with-info">{children} <InfoTooltip text={text} /></span>;
}

function AiSummary({ value }: { value: string }) {
  const paragraphs = value.split(/\n+/).map(paragraph => paragraph.trim()).filter(Boolean);
  return (
    <div className="short-ai-analysis-copy">
      {paragraphs.map((paragraph, paragraphIndex) => {
        const parts = paragraph.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        return (
          <p key={`${paragraphIndex}-${paragraph.slice(0, 24)}`}>
            {parts.map((part, partIndex) => part.startsWith('**') && part.endsWith('**')
              ? <strong key={`${partIndex}-${part}`}>{part.slice(2, -2)}</strong>
              : <span key={`${partIndex}-${part.slice(0, 16)}`}>{part}</span>)}
          </p>
        );
      })}
    </div>
  );
}

function shortDateLabel(value: unknown) {
  const raw = String(value ?? '');
  if (!raw) return '';
  const [year, month, day] = raw.split('-');
  if (year && month && day) return `${Number(month)}/${Number(day)}`;
  return raw;
}

function TrendLine({ values, labels, label, valueFormatter = formatCompactNumber }: {
  values: number[];
  labels?: string[];
  label: string;
  valueFormatter?: (value: number) => string;
}) {
  const cleaned = values.map(value => Number.isFinite(value) ? value : 0);
  const plottedValues = cleaned.length ? cleaned : [0, 0];
  const rawMax = Math.max(...plottedValues);
  const rawMin = Math.min(...plottedValues);
  const rawRange = Math.max(rawMax - rawMin, Math.max(Math.abs(rawMax) * 0.02, 1));
  const padding = rawRange * 0.18;
  const max = rawMax + padding;
  const min = Math.max(0, rawMin - padding);
  const range = Math.max(max - min, 1);
  const mid = min + (range / 2);
  const points = plottedValues.map((value, index) => {
    const x = plottedValues.length === 1 ? 50 : (index / (plottedValues.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return { value, x, y };
  });
  const displayLabels = labels?.length === plottedValues.length
    ? labels
    : plottedValues.map((_, index) => `Day ${index + 1}`);

  return (
    <div className="terminal-line-chart short-interest-chart axis-line-chart">
      <span className="chart-axis-title chart-axis-title-y">{label}</span>
      <div className="chart-y-axis" aria-hidden="true">
        <span>{formatAxisNumber(max)}</span>
        <span>{formatAxisNumber(mid)}</span>
        <span>{formatAxisNumber(min)}</span>
      </div>
      <div className="chart-plot-area">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line className="chart-axis-line" x1="0" y1="0" x2="0" y2="100" />
          <line className="chart-axis-line" x1="0" y1="100" x2="100" y2="100" />
          <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} />
        </svg>
        {points.map((point, index) => {
          const shouldLabel = index === 0 || index === points.length - 1;
          const edgeClass = index === 0 ? 'edge-start' : index === points.length - 1 ? 'edge-end' : '';
          return (
            <span
              className={`trend-marker ${shouldLabel ? 'show-label' : ''} ${edgeClass}`}
              key={`${point.x}-${point.value}-${index}`}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              <i />
              {shouldLabel && <b>{valueFormatter(point.value)}</b>}
              <em className="trend-tooltip">
                <strong>{displayLabels[index]}</strong>
                <span>{label}: {valueFormatter(point.value)}</span>
              </em>
            </span>
          );
        })}
      </div>
      <div className="chart-x-axis" aria-hidden="true">
        {displayLabels.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
      </div>
      <span className="chart-axis-title chart-axis-title-x">Date</span>
    </div>
  );
}

function delta(current: number | null, previous: number | null, options?: Intl.NumberFormatOptions) {
  if (current === null || previous === null || previous === 0) return null;
  const change = current - previous;
  return {
    change,
    percent: (change / previous) * 100,
    valueText: signed(change, options),
  };
}

function DeltaBadge({ info, suffix = '', display }: { info: ReturnType<typeof delta>; suffix?: string; display?: string }) {
  if (display) {
    const match = display.match(/^(.+?)(\([^)]*\))$/);
    return (
      <span className={`short-kpi-delta ${display.startsWith('-') ? 'down' : display.startsWith('+') ? 'up' : 'neutral'}`}>
        <strong>{match?.[1]?.trim() ?? display}</strong>
        <em>{match ? `${match[2]} vs yesterday` : 'vs yesterday'}</em>
      </span>
    );
  }
  if (!info) {
    return <span className="short-kpi-delta neutral">No prior update</span>;
  }
  const tone = info.change > 0 ? 'up' : info.change < 0 ? 'down' : 'neutral';
  const sign = info.change > 0 ? '+' : info.change < 0 ? '-' : '';
  return (
    <span className={`short-kpi-delta ${tone}`}>
      <strong>{info.valueText}{suffix}</strong>
      <em>({sign}{Math.abs(info.percent).toLocaleString('en-US', { maximumFractionDigits: 2 })}%) vs yesterday</em>
    </span>
  );
}

function ExecutiveMetric({ label, value, changePercent, comparisonLabel = 'vs yesterday' }: {
  label: string;
  value: string;
  changePercent?: number | null;
  comparisonLabel?: string;
}) {
  const tone = typeof changePercent !== 'number' || !Number.isFinite(changePercent)
    ? 'neutral'
    : changePercent > 0
      ? 'up'
      : changePercent < 0
        ? 'down'
        : 'neutral';
  return (
    <div className="short-executive-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <em className={tone}>
        {typeof changePercent === 'number' && Number.isFinite(changePercent)
          ? `${changePercent > 0 ? '+' : ''}${changePercent.toLocaleString('en-US', { maximumFractionDigits: 2 })}% ${comparisonLabel}`
          : 'No prior period'}
      </em>
    </div>
  );
}

type ShortVolumeRow = {
  date: string;
  totalShortVolume: number;
  totalVolume: number;
  offExchangeNonExempt: number;
  offExchangeExempt: number;
  nasdaqBx: number;
  nasdaqPhlx: number;
  nyse: number;
  nyseArca: number;
  nyseNational: number;
  nyseAmerican: number;
  chx: number;
  totalLongVolume: number;
};

type ShortVolumeMode = 'volume' | 'totalPercent' | 'exchangePercent';

type FtdRow = {
  tradeDate: string;
  settlementDate: string;
  closingDeadline: string;
  failsToDeliver: number;
  ftdChange: number;
  tradeVolume: number;
  price: number;
  notional: number;
};

const shortVolumeBaseColumns: Array<{ key: keyof ShortVolumeRow; label: string }> = [
  { key: 'date', label: 'Date' },
  { key: 'totalShortVolume', label: 'Total Short Volume' },
  { key: 'totalVolume', label: 'Total Volume' },
  { key: 'offExchangeNonExempt', label: 'Off Exchange Non-Exempt' },
  { key: 'offExchangeExempt', label: 'Off Exchange Exempt' },
  { key: 'nasdaqBx', label: 'Nasdaq BX' },
  { key: 'nasdaqPhlx', label: 'Nasdaq PHLX' },
  { key: 'nyse', label: 'NYSE' },
  { key: 'nyseArca', label: 'NYSE Arca' },
  { key: 'nyseNational', label: 'NYSE National' },
  { key: 'nyseAmerican', label: 'NYSE American' },
  { key: 'chx', label: 'CHX' },
  { key: 'totalLongVolume', label: 'Total Long Volume' },
];

const ftdColumns: Array<{ key: keyof FtdRow; label: string }> = [
  { key: 'tradeDate', label: 'Trade Date' },
  { key: 'failsToDeliver', label: 'Fails-to-Deliver' },
  { key: 'ftdChange', label: 'FTD Change' },
  { key: 'tradeVolume', label: 'Trade Volume' },
  { key: 'settlementDate', label: 'Settlement Date' },
  { key: 'closingDeadline', label: 'Closing Deadline' },
  { key: 'price', label: 'Price' },
  { key: 'notional', label: '$ Notional' },
];

const numericFtdColumnKeys: Array<keyof FtdRow> = ['failsToDeliver', 'ftdChange', 'tradeVolume', 'price', 'notional'];

function formatMarketTableValue(value: unknown, mode?: 'currency' | 'percent') {
  const parsed = numeric(value);
  if (parsed === null) return String(value ?? '—');
  if (mode === 'currency') return `$${parsed.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (mode === 'percent') return `${parsed.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
  return parsed.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function shortVolumeValue(row: ShortVolumeRow, key: keyof ShortVolumeRow, mode: ShortVolumeMode) {
  if (key === 'date') return row.date;
  const value = row[key] as number;
  if (mode === 'volume') return formatMarketTableValue(value);
  const denominator = mode === 'totalPercent' ? row.totalVolume : row.totalShortVolume;
  return denominator ? formatMarketTableValue((value / denominator) * 100, 'percent') : '—';
}

function marketDateKey(value: string) {
  return value.trim().slice(0, 10);
}

function DateRangeControls({
  id,
  startDate,
  endDate,
  onStartDate,
  onEndDate,
}: {
  id: string;
  startDate: string;
  endDate: string;
  onStartDate: (value: string) => void;
  onEndDate: (value: string) => void;
}) {
  return (
    <div className="short-market-date-range" role="search" aria-label="Filter records by date range">
      <label htmlFor={`${id}-start`}><span>From</span><input id={`${id}-start`} type="date" value={startDate} max={endDate || undefined} onChange={event => onStartDate(event.target.value)} /></label>
      <span className="short-market-date-range__arrow" aria-hidden="true">→</span>
      <label htmlFor={`${id}-end`}><span>To</span><input id={`${id}-end`} type="date" value={endDate} min={startDate || undefined} onChange={event => onEndDate(event.target.value)} /></label>
      {(startDate || endDate) && <button type="button" onClick={() => { onStartDate(''); onEndDate(''); }}>Clear</button>}
    </div>
  );
}

function PagedShortVolumeTable({ rows: apiRows }: { rows: ShortVolumeRow[] }) {
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<ShortVolumeMode>('volume');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const pageSize = 7;
  const filteredRows = useMemo(() => [...apiRows]
    .sort((a, b) => marketDateKey(b.date).localeCompare(marketDateKey(a.date)))
    .filter(row => {
      const date = marketDateKey(row.date);
      return (!startDate || date >= startDate) && (!endDate || date <= endDate);
    }), [apiRows, startDate, endDate]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <article className="terminal-card short-market-table-card">
      <div className="short-market-table-card__head">
        <div>
          <h3><InfoTitle text="Daily reported short volume by venue. API integration will replace this placeholder table.">Short Volume</InfoTitle></h3>
          <p>Daily reported short, long, and venue-level short volume.</p>
        </div>
        <div className="short-market-table-card__controls">
          <DateRangeControls
            id="short-volume-range"
            startDate={startDate}
            endDate={endDate}
            onStartDate={value => { setStartDate(value); setPage(1); }}
            onEndDate={value => { setEndDate(value); setPage(1); }}
          />
          <select value={mode} onChange={event => setMode(event.target.value as ShortVolumeMode)} aria-label="Short volume display mode">
            <option value="volume">Short Volume</option>
            <option value="totalPercent">Short Percent of Total</option>
            <option value="exchangePercent">Short Percent of Exchange</option>
          </select>
        </div>
      </div>
      <div className="short-market-table-wrap">
        <table className="short-market-table">
          <thead>
            <tr>{shortVolumeBaseColumns.map(column => <th key={column.key}>{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {!pageRows.length && <tr><td colSpan={shortVolumeBaseColumns.length}>No short-volume API records available.</td></tr>}
            {pageRows.map(row => (
              <tr key={row.date}>
                {shortVolumeBaseColumns.map(column => (
                  <td key={column.key} className={column.key === 'date' ? '' : 'num'}>{shortVolumeValue(row, column.key, mode)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePager page={safePage} totalPages={totalPages} totalRows={filteredRows.length} onPage={setPage} />
    </article>
  );
}

function PagedFtdTable({ rows: apiRows }: { rows: FtdRow[] }) {
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const pageSize = 7;
  const filteredRows = useMemo(() => [...apiRows]
    .sort((a, b) => marketDateKey(b.tradeDate || b.settlementDate).localeCompare(marketDateKey(a.tradeDate || a.settlementDate)))
    .filter(row => {
      const date = marketDateKey(row.tradeDate || row.settlementDate);
      return (!startDate || date >= startDate) && (!endDate || date <= endDate);
    }), [apiRows, startDate, endDate]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <article className="terminal-card short-market-table-card">
      <div className="short-market-table-card__head">
        <div>
          <h3><InfoTitle text="Failures-to-deliver are settlement failures reported with a delay. API integration will replace this placeholder table.">Fails-to-Deliver</InfoTitle></h3>
          <p>Settlement failures, closing deadlines, price, and notional value.</p>
        </div>
        <div className="short-market-table-card__controls">
          <DateRangeControls
            id="ftd-range"
            startDate={startDate}
            endDate={endDate}
            onStartDate={value => { setStartDate(value); setPage(1); }}
            onEndDate={value => { setEndDate(value); setPage(1); }}
          />
        </div>
      </div>
      <div className="short-market-table-wrap">
        <table className="short-market-table">
          <thead>
            <tr>{ftdColumns.map(column => <th key={column.key}>{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {!pageRows.length && <tr><td colSpan={ftdColumns.length}>No FTD API records available.</td></tr>}
            {pageRows.map(row => (
              <tr key={row.tradeDate}>
                {ftdColumns.map(column => {
                  const value = row[column.key];
                  const isCurrency = column.key === 'price';
                  return (
                    <td key={column.key} className={numericFtdColumnKeys.includes(column.key) ? 'num' : ''}>
                      {column.key === 'ftdChange' && typeof value === 'number'
                        ? signed(value, { maximumFractionDigits: 0 })
                        : isCurrency
                          ? formatMarketTableValue(value, 'currency')
                          : formatMarketTableValue(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePager page={safePage} totalPages={totalPages} totalRows={filteredRows.length} onPage={setPage} />
    </article>
  );
}

function TablePager({ page, totalPages, totalRows, onPage }: { page: number; totalPages: number; totalRows: number; onPage: (page: number) => void }) {
  return (
    <div className="short-market-table-pager">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}>Previous</button>
      <span>{totalRows.toLocaleString('en-US')} records · Page {page} / {totalPages}</span>
      <button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>Next</button>
    </div>
  );
}

type BriefingMetric = 'shares' | 'floatPercent' | 'daysToCover';

type BriefingTrendRow = {
  date: string;
  shares: number | null;
  floatPercent: number | null;
  daysToCover: number | null;
};

const briefingMetricConfig: Record<BriefingMetric, {
  label: string;
  color: string;
  format: (value: number | null) => string;
}> = {
  shares: {
    label: 'Short Interest Shares',
    color: '#2f6dd5',
    format: value => value === null ? 'Data unavailable' : formatNumber(value),
  },
  floatPercent: {
    label: 'Short Interest Float %',
    color: '#d98b16',
    format: value => value === null ? 'Data unavailable' : formatPercent(value, { maximumFractionDigits: 2 }),
  },
  daysToCover: {
    label: 'Days to Cover',
    color: '#15966f',
    format: value => value === null ? 'Data unavailable' : `${formatNumber(value, { maximumFractionDigits: 2 })} days`,
  },
};

function metricRange(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!valid.length) return { min: 0, max: 1 };
  const rawMin = Math.min(...valid);
  const rawMax = Math.max(...valid);
  const padding = Math.max((rawMax - rawMin) * .12, Math.abs(rawMax) * .025, .1);
  return { min: Math.max(0, rawMin - padding), max: rawMax + padding };
}

function ShortInterestCombinedChart({ data }: { data: BriefingTrendRow[] }) {
  const [enabled, setEnabled] = useState<Record<BriefingMetric, boolean>>({
    shares: true,
    floatPercent: true,
    daysToCover: true,
  });
  const [focusedMetric, setFocusedMetric] = useState<BriefingMetric>('floatPercent');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const metrics = Object.keys(briefingMetricConfig) as BriefingMetric[];
  const secondaryMetric = focusedMetric === 'shares'
    ? (enabled.floatPercent ? 'floatPercent' : 'daysToCover')
    : focusedMetric;
  const width = 1000;
  const height = 330;
  const plot = { left: 78, right: 86, top: 24, bottom: 52 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const ranges = Object.fromEntries(metrics.map(metric => [
    metric,
    metricRange(data.map(row => row[metric])),
  ])) as Record<BriefingMetric, { min: number; max: number }>;
  const x = (index: number) => plot.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const y = (metric: BriefingMetric, value: number) => {
    const range = ranges[metric];
    return plot.top + (1 - ((value - range.min) / Math.max(range.max - range.min, .0001))) * plotHeight;
  };
  const linePoints = (metric: BriefingMetric) => data
    .map((row, index) => row[metric] === null ? null : `${x(index)},${y(metric, row[metric] as number)}`)
    .filter(Boolean)
    .join(' ');
  const focusedIndex = hoveredIndex ?? Math.max(0, data.length - 1);

  if (!data.length) {
    return <div className="short-briefing-chart-empty">Short-interest trend data unavailable.</div>;
  }

  return (
    <div className="short-briefing-chart">
      <div className="short-briefing-chart__legend" aria-label="Trend metrics">
        {metrics.map(metric => (
          <button
            type="button"
            className={`${enabled[metric] ? 'active' : ''} ${focusedMetric === metric ? 'focused' : ''}`}
            key={metric}
            onClick={() => setEnabled(current => ({ ...current, [metric]: !current[metric] }))}
            onMouseEnter={() => setFocusedMetric(metric)}
          >
            <i style={{ background: briefingMetricConfig[metric].color }} />
            {briefingMetricConfig[metric].label}
          </button>
        ))}
      </div>
      <div className="short-briefing-chart__canvas">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Short interest shares, float percentage, and days to cover trend"
          onMouseLeave={() => setHoveredIndex(null)}
          onMouseMove={event => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const svgX = ((event.clientX - bounds.left) / bounds.width) * width;
            const index = Math.round(((svgX - plot.left) / plotWidth) * Math.max(0, data.length - 1));
            setHoveredIndex(Math.max(0, Math.min(data.length - 1, index)));
          }}
        >
          {[0, .25, .5, .75, 1].map((ratio, index) => {
            const gridY = plot.top + ratio * plotHeight;
            const sharesRange = ranges.shares;
            const secondaryRange = ranges[secondaryMetric];
            const sharesValue = sharesRange.max - ratio * (sharesRange.max - sharesRange.min);
            const secondaryValue = secondaryRange.max - ratio * (secondaryRange.max - secondaryRange.min);
            return (
              <g key={ratio}>
                <line className="short-briefing-chart__grid" x1={plot.left} x2={width - plot.right} y1={gridY} y2={gridY} />
                <text className="short-briefing-chart__axis" x={plot.left - 12} y={gridY + 4} textAnchor="end">{formatCompactNumber(sharesValue)}</text>
                <text className="short-briefing-chart__axis" x={width - plot.right + 12} y={gridY + 4}>
                  {secondaryMetric === 'floatPercent'
                    ? `${formatNumber(secondaryValue, { maximumFractionDigits: 1 })}%`
                    : formatNumber(secondaryValue, { maximumFractionDigits: 1 })}
                </text>
                {index === 0 && (
                  <>
                    <text className="short-briefing-chart__axis-title" x={plot.left} y={12}>Shares</text>
                    <text className="short-briefing-chart__axis-title" x={width - plot.right} y={12} textAnchor="end">
                      {secondaryMetric === 'floatPercent' ? 'Float %' : 'Days to Cover'}
                    </text>
                  </>
                )}
              </g>
            );
          })}
          {metrics.map(metric => enabled[metric] && (
            <polyline
              key={metric}
              className={`short-briefing-chart__line ${focusedMetric === metric ? 'focused' : ''}`}
              points={linePoints(metric)}
              style={{ stroke: briefingMetricConfig[metric].color }}
              onMouseEnter={() => setFocusedMetric(metric)}
            />
          ))}
          {hoveredIndex !== null && (
            <line
              className="short-briefing-chart__cursor"
              x1={x(hoveredIndex)}
              x2={x(hoveredIndex)}
              y1={plot.top}
              y2={plot.top + plotHeight}
            />
          )}
          {metrics.map(metric => enabled[metric] && data[focusedIndex]?.[metric] !== null && (
            <circle
              key={`${metric}-${focusedIndex}`}
              cx={x(focusedIndex)}
              cy={y(metric, data[focusedIndex][metric] as number)}
              r={focusedMetric === metric ? 5 : 3.5}
              fill={briefingMetricConfig[metric].color}
              stroke="#fff"
              strokeWidth="2"
            />
          ))}
          {data.map((row, index) => (
            <text
              className="short-briefing-chart__date"
              key={`${row.date}-${index}`}
              x={x(index)}
              y={height - 18}
              textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}
            >
              {shortDateLabel(row.date)}
            </text>
          ))}
        </svg>
        {hoveredIndex !== null && (
          <div
            className="short-briefing-chart__tooltip"
            style={{
              left: `${(x(hoveredIndex) / width) * 100}%`,
              transform: hoveredIndex === 0
                ? 'translateX(0)'
                : hoveredIndex === data.length - 1
                  ? 'translateX(-100%)'
                  : 'translateX(-50%)',
            }}
          >
            <strong>{data[hoveredIndex].date}</strong>
            {metrics.filter(metric => enabled[metric]).map(metric => (
              <span className={focusedMetric === metric ? 'focused' : ''} key={metric}>
                <i style={{ background: briefingMetricConfig[metric].color }} />
                {briefingMetricConfig[metric].label}
                <b>{briefingMetricConfig[metric].format(data[hoveredIndex][metric])}</b>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function shortScoreSummary(score: number, level: string) {
  if (score >= 80) return `${level} short-side pressure. Escalate monitoring of borrow cost, utilization, and inventory.`;
  if (score >= 65) return `${level} short-side pressure. Watch borrow cost, utilization, and available inventory.`;
  if (score >= 40) return `${level} pressure. Monitor whether multiple short-market inputs tighten together.`;
  return `${level} pressure. Current short-market conditions remain relatively contained.`;
}

function marketCurrentToLegacy(payload: ApiFile): Row {
  const current = apiCategory(payload, 'market-current');
  const flatCurrent = latest(rows(current.records), 'tradeDate');
  const shortInterest = record(current.shortInterest);
  const borrowFee = record(current.borrowFee);
  const availableShares = record(current.availableShares);
  const utilization = record(current.utilization);
  const daysToCover = record(current.daysToCover);
  const shortScore = record(record(current.scores).shortScore);
  return {
    shortInterestShares: firstNumericMetric(
      current.shortInterestShares,
      current.shortinterestshares,
      current.short_interest_shares,
      flatCurrent.shortInterestShares,
      flatCurrent.shortinterestshares,
      shortInterest.shares,
      shortInterest.shortInterestShares,
      shortInterest.shortinterestshares,
    ),
    shortInterestPcFreeFloat: firstNumericMetric(
      current.shortInterestPcFreeFloat,
      current.shortInterestPercent,
      current.shortinterestpcfreefloat,
      current.short_interest_percent,
      flatCurrent.shortInterestPcFreeFloat,
      flatCurrent.shortInterestPercent,
      shortInterest.percent,
      shortInterest.shortInterestPcFreeFloat,
      shortInterest.shortInterestPercent,
    ),
    costToBorrowAll: firstNumericMetric(
      current.borrowFeePercent,
      current.costToBorrowAll,
      flatCurrent.borrowFeePercent,
      flatCurrent.costToBorrowAll,
      borrowFee.percent,
      borrowFee.borrowFeePercent,
      borrowFee.costToBorrowAll,
    ),
    shortAvailabilityShares: firstNumericMetric(
      current.shortAvailabilityShares,
      current.availableSharesValue,
      flatCurrent.shortAvailabilityShares,
      flatCurrent.availableShares,
      availableShares.value,
      availableShares.shortAvailabilityShares,
      availableShares.availableShares,
    ),
    shortAvailabilityPct: firstNumericMetric(
      current.utilizationPercent,
      current.shortAvailabilityPct,
      flatCurrent.utilizationPercent,
      flatCurrent.shortAvailabilityPct,
      utilization.percent,
      utilization.utilizationPercent,
      utilization.shortAvailabilityPct,
    ),
    daysToCoverQuantity: firstNumericMetric(
      current.daysToCoverValue,
      typeof current.daysToCover === 'object' ? undefined : current.daysToCover,
      flatCurrent.daysToCover,
      daysToCover.value,
      daysToCover.daysToCover,
      daysToCover.daysToCoverValue,
    ),
    shortScore: firstNumericMetric(
      typeof current.shortScore === 'object' ? undefined : current.shortScore,
      flatCurrent.shortScore,
      shortScore.value,
      shortScore.score,
    ),
  };
}

function marketHistoryToLegacy(row: Row): Row {
  const shortInterest = record(row.shortInterest);
  const borrowFee = record(row.borrowFee);
  const availableShares = record(row.availableShares);
  const utilization = record(row.utilization);
  const daysToCover = record(row.daysToCover);
  const shortScore = record(record(row.scores).shortScore);
  return {
    date: firstDefined(row.tradeDate, row.date, row.snapshotDate),
    shortInterest: {
      shortInterestShares: firstNumericMetric(row.shortInterestShares, row.shortinterestshares, shortInterest.shares, shortInterest.shortInterestShares),
      shortInterestPcFreeFloat: firstNumericMetric(row.shortInterestPercent, row.shortInterestPcFreeFloat, shortInterest.percent, shortInterest.shortInterestPercent),
    },
    daysToCover: {
      daysToCover: firstNumericMetric(
        row.daysToCoverValue,
        daysToCover.value,
        typeof row.daysToCover === 'object' ? undefined : row.daysToCover,
      ),
    },
    borrowFeeAll: { costToBorrowAll: firstNumericMetric(row.borrowFeePercent, row.costToBorrowAll, borrowFee.percent) },
    availability: {
      shortAvailabilityShares: firstNumericMetric(
        row.shortAvailabilityShares,
        availableShares.value,
        typeof row.availableShares === 'object' ? undefined : row.availableShares,
      ),
      shortAvailabilityPct: firstNumericMetric(row.utilizationPercent, row.shortAvailabilityPct, utilization.percent),
    },
    shortScore: { score: firstNumericMetric(row.shortScore, shortScore.value) },
    closingPrices: { price: firstNumericMetric(row.price, record(row.closingPrices).price) },
  };
}

function apiShortVolumeRows(payload: ApiFile): ShortVolumeRow[] {
  return apiRecords(payload, 'short-volume-history').map(row => ({
    date: String(row.date ?? ''),
    totalShortVolume: numeric(row.totalShortVolumeReported) ?? 0,
    totalVolume: numeric(row.totalVolumeReported) ?? 0,
    offExchangeNonExempt: numeric(row.offExchangeNonExempt) ?? 0,
    offExchangeExempt: numeric(row.offExchangeExempt) ?? 0,
    nasdaqBx: numeric(row.nasdaqBx) ?? 0,
    nasdaqPhlx: numeric(row.nasdaqPhlx) ?? 0,
    nyse: numeric(row.nyse) ?? 0,
    nyseArca: numeric(row.nyseArca) ?? 0,
    nyseNational: numeric(row.nyseNational) ?? 0,
    nyseAmerican: numeric(row.nyseAmerican) ?? 0,
    chx: numeric(row.chx) ?? 0,
    totalLongVolume: numeric(row.totalLongVolumeReported) ?? 0,
  })).filter(row => row.date);
}

function apiFtdRows(payload: ApiFile): FtdRow[] {
  return apiRecords(payload, 'ftd-history').map(row => ({
    tradeDate: String(row.settlementDate ?? ''),
    settlementDate: String(row.tradeDate ?? ''),
    closingDeadline: String(row.closingDeadline ?? ''),
    failsToDeliver: numeric(row.shares) ?? 0,
    ftdChange: numeric(row.change) ?? 0,
    tradeVolume: numeric(row.tradeVolume) ?? 0,
    price: numeric(row.price) ?? 0,
    notional: numeric(row.value) ?? 0,
  })).filter(row => row.tradeDate || row.settlementDate);
}

export function ShortInterestBrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const [apiData, setApiData] = useState<{ current: ApiFile; history: ApiFile; shortVolume: ApiFile; ftd: ApiFile; utilization: ApiFile; availability: ApiFile; margins: ApiFile } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      authenticatedFetch(`/market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=market-current`, { cache: 'no-store' }) as Promise<ApiFile>,
      authenticatedFetch(`/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=market-history`, { cache: 'no-store' }) as Promise<ApiFile>,
      authenticatedFetch(`/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=short-volume-history`, { cache: 'no-store' }) as Promise<ApiFile>,
      authenticatedFetch(`/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=ftd-history`, { cache: 'no-store' }) as Promise<ApiFile>,
      authenticatedFetch(`/manual-input/utilization?ticker=${encodeURIComponent(normalizedTicker)}`, { cache: 'no-store' }) as Promise<ApiFile>,
      authenticatedFetch(`/manual-input/manual-availability?ticker=${encodeURIComponent(normalizedTicker)}`, { cache: 'no-store' }) as Promise<ApiFile>,
      authenticatedFetch(`/manual-input/margins?ticker=${encodeURIComponent(normalizedTicker)}`, { cache: 'no-store' }) as Promise<ApiFile>,
    ]).then(([current, history, shortVolume, ftd, utilization, availability, margins]) => {
      if (!cancelled) setApiData({ current, history, shortVolume, ftd, utilization, availability, margins });
    }).catch(cause => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load short-interest API data.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [normalizedTicker]);

  if (loading) return <PortalPageLoading variant="shortInterest" />;
  if (error || !apiData) {
    return <div className="page"><section className="panel"><h2>Short interest data unavailable</h2><p>{error}</p></section></div>;
  }

  const marketHistoryRows = apiRecords(apiData.history, 'market-history');
  const publicationInputs = {
    utilization: rows(apiData.utilization),
    availability: rows(apiData.availability),
    margins: rows(apiData.margins),
  };
  const publishedRecord = latestCompleteMarketPublicationRecordFromSources(marketHistoryRows, publicationInputs);
  const publishedDate = publishedRecord ? marketRecordDate(publishedRecord) : '';
  const shortCurrent = publishedRecord ? marketCurrentToLegacy(publishedRecord as ApiFile) : {};
  const dailyRows = marketHistoryRows
    .filter(row => Boolean(publishedDate) && String(row.tradeDate ?? row.date ?? '').slice(0, 10) <= publishedDate)
    .map(row => marketPublicationRecordForDate(marketHistoryRows, publicationInputs, marketRecordDate(row)))
    .map(marketHistoryToLegacy);
  const shortInterestTrendRows = dailyRows
    .sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')))
    .slice(-7);
  const borrowFeeTrendRows = shortInterestTrendRows.filter(row => optionalNumeric(record(row.borrowFeeAll).costToBorrowAll) !== null);
  const availabilityTrendRows = shortInterestTrendRows.filter(row => optionalNumeric(record(row.availability).shortAvailabilityShares) !== null);
  const sortedDailyRows = [...dailyRows].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const latestDaily = sortedDailyRows[0] ?? {};
  const previousDaily = sortedDailyRows[1] ?? {};
  const twoWeeksAgoDaily = rowAtOrBeforeDaysAgo(dailyRows, latestDaily.date, 14);
  const biweeklyShortInterestTrendRows = biweeklyRows(
    dailyRows.filter(row => optionalNumeric(record(row.shortInterest).shortInterestShares) !== null),
  );
  const shortVolumeTrendRows = apiShortVolumeRows(apiData.shortVolume)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);
  const ftdTrendRows = apiFtdRows(apiData.ftd)
    .sort((a, b) => String(a.tradeDate || a.settlementDate).localeCompare(String(b.tradeDate || b.settlementDate)))
    .slice(-7);

  const shortInterestShares = numeric(shortCurrent.shortInterestShares);
  const shortInterestPercent = numeric(shortCurrent.shortInterestPcFreeFloat);
  const borrowFee = numeric(shortCurrent.costToBorrowAll);
  const sharesAvailable = numeric(shortCurrent.shortAvailabilityShares);
  const utilization = numeric(shortCurrent.shortAvailabilityPct);
  const shortScore = Math.round(numeric(shortCurrent.shortScore) ?? 0);
  const shortScoreLevel = shortScore >= 80 ? 'Extreme' : shortScore >= 65 ? 'High' : shortScore >= 40 ? 'Moderate' : 'Low';
  const shortScoreTone = shortScore >= 80 ? 'extreme' : shortScore >= 65 ? 'high' : shortScore >= 40 ? 'moderate' : 'low';
  const daysToCover = numeric(shortCurrent.daysToCoverQuantity);
  const latestShortInterest = record(latestDaily.shortInterest);
  const twoWeeksAgoShortInterest = record(twoWeeksAgoDaily.shortInterest);
  const latestDaysToCover = record(latestDaily.daysToCover);
  const twoWeeksAgoDaysToCover = record(twoWeeksAgoDaily.daysToCover);
  const latestBorrowFee = record(latestDaily.borrowFeeAll);
  const previousBorrowFee = record(previousDaily.borrowFeeAll);
  const latestAvailability = record(latestDaily.availability);
  const previousAvailability = record(previousDaily.availability);
  const latestShortScore = record(latestDaily.shortScore);
  const previousShortScore = record(previousDaily.shortScore);
  const latestClosing = record(latestDaily.closingPrices);
  const previousClosing = record(previousDaily.closingPrices);
  const shortInterestDelta = delta(numeric(latestShortInterest.shortInterestShares), numeric(twoWeeksAgoShortInterest.shortInterestShares), { maximumFractionDigits: 0 });
  const shortInterestPctDelta = delta(numeric(latestShortInterest.shortInterestPcFreeFloat), numeric(twoWeeksAgoShortInterest.shortInterestPcFreeFloat), { maximumFractionDigits: 2 });
  const daysToCoverDelta = delta(numeric(latestDaysToCover.daysToCover), numeric(twoWeeksAgoDaysToCover.daysToCover), { maximumFractionDigits: 2 });
  const borrowFeeDelta = delta(numeric(latestBorrowFee.costToBorrowAll), numeric(previousBorrowFee.costToBorrowAll), { maximumFractionDigits: 2 });
  const shortScoreDelta = delta(Math.round(numeric(latestShortScore.score) ?? 0) || null, numeric(previousShortScore.score), { maximumFractionDigits: 1 });
  const sharesAvailableDelta = delta(numeric(latestAvailability.shortAvailabilityShares), numeric(previousAvailability.shortAvailabilityShares), { maximumFractionDigits: 0 });
  const utilizationDelta = delta(numeric(latestAvailability.shortAvailabilityPct), numeric(previousAvailability.shortAvailabilityPct), { maximumFractionDigits: 2 });
  const shortCards = {} as Record<string, Row>;
  const shortInterestCard = record(shortCards?.shortInterest);
  const siPercentCard = record(shortCards?.shortInterestPercentFloat);
  const daysToCoverCard = record(shortCards?.daysToCover);
  const borrowFeeCard = record(shortCards?.borrowFee);
  const sharesAvailableCard = record(shortCards?.sharesAvailable);
  const utilizationCard = record(shortCards?.utilization);
  const shortScoreCard = record(shortCards?.shortScore);
  const shortScoreLevelCard = record(shortCards?.shortScoreLevel);
  const shortInterestChangePercent = numeric(shortInterestCard.changePercent) ?? shortInterestDelta?.percent;
  const borrowFeeChangePercent = numeric(borrowFeeCard.changePercent) ?? borrowFeeDelta?.percent;
  const sharesAvailableChangePercent = numeric(sharesAvailableCard.changePercent) ?? sharesAvailableDelta?.percent;
  const aiSummary = 'AI analysis is not available from the current API.';
  const scoreRanges = [
    { range: '0-39', level: 'Low', description: 'Short-side pressure is relatively contained.', active: shortScore < 40 },
    { range: '40-64', level: 'Moderate', description: 'Pressure is developing and should be monitored.', active: shortScore >= 40 && shortScore < 65 },
    { range: '65-79', level: 'High', description: 'Elevated conditions may increase squeeze risk.', active: shortScore >= 65 && shortScore < 80 },
    { range: '80-100', level: 'Extreme', description: 'Severe short-side pressure warrants close review.', active: shortScore >= 80 },
  ];
  const scoreProgress = Math.min(100, Math.max(0, shortScore));

  return (
    <div className="page short-interest-page">
      <section className="terminal-section short-interest-overview">
        <div className="terminal-section__head">
          <div>
            <span>Overview</span>
            <h2>Short Interest Overview</h2>
            <p className="section-subtitle">Executive view of short exposure, borrow pressure, available inventory, and squeeze-risk inputs.</p>
          </div>
          <div className="terminal-section-actions">
            {sourceChip('Market Data API')}
          </div>
        </div>

        <div className="short-executive-grid">
          <article className={`terminal-card short-executive-card short-executive-score ${shortScoreTone}`}>
            <span>Short Interest Score</span>
            <div className="short-overview-score-layout">
              <div className="short-score-compact">
                <div
                  className="short-score-radial"
                  style={{ background: `conic-gradient(var(--short-score-accent) ${scoreProgress}%, var(--short-score-track) ${scoreProgress}% 100%)` }}
                >
                  <div>
                    <strong>{numeric(shortCurrent.shortScore) === null ? 'N/A' : shortScore}</strong>
                    <small>/ 100</small>
                  </div>
                </div>
                <div className="short-score-compact__copy">
                  <em>{String(shortScoreLevelCard.valueDisplay ?? shortScoreLevel)} Risk</em>
                  <DeltaBadge info={shortScoreDelta} display={String(shortScoreCard.deltaDisplay ?? '')} />
                  <p>{shortScoreSummary(shortScore, shortScoreLevel)}</p>
                </div>
              </div>
              <div className="short-score-card-ranges" aria-label="Short Interest Score interpretation ranges">
                {scoreRanges.map(row => (
                  <div className={row.active ? 'active' : ''} key={row.range}>
                    <strong>{row.range}</strong>
                    <span><b>{row.level}</b>{row.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="terminal-card short-executive-card short-key-metrics-card">
            <span>Key Short Metrics</span>
            <div className="short-executive-metrics">
              <ExecutiveMetric label="Short Interest %" value={String(siPercentCard.valueDisplay ?? formatPercent(shortInterestPercent, { maximumFractionDigits: 2 }))} changePercent={numeric(siPercentCard.changePercent) ?? shortInterestPctDelta?.percent} comparisonLabel="vs 2 weeks ago" />
              <ExecutiveMetric label="Short Interest Shares" value={String(shortInterestCard.valueDisplay ?? formatNumber(shortInterestShares))} changePercent={shortInterestChangePercent} comparisonLabel="vs 2 weeks ago" />
              <ExecutiveMetric label="Days to Cover" value={String(daysToCoverCard.valueDisplay ?? formatNumber(daysToCover, { maximumFractionDigits: 2 }))} changePercent={numeric(daysToCoverCard.changePercent) ?? daysToCoverDelta?.percent} comparisonLabel="vs 2 weeks ago" />
              <ExecutiveMetric label="Borrow Fee" value={String(borrowFeeCard.valueDisplay ?? formatPercent(borrowFee, { maximumFractionDigits: 2 }))} changePercent={borrowFeeChangePercent} />
              <ExecutiveMetric label="Utilization" value={String(utilizationCard.valueDisplay ?? formatPercent(utilization, { maximumFractionDigits: 2 }))} changePercent={numeric(utilizationCard.changePercent) ?? utilizationDelta?.percent} />
            </div>
          </article>

        </div>

        <article className="terminal-card short-executive-card short-management-guide short-ai-analysis-card">
          <span>AI Analysis</span>
          <AiSummary value={aiSummary || 'Data unavailable'} />
          <small>AI-assisted interpretation. Review underlying data before making decisions.</small>
        </article>
      </section>

      <section className="terminal-section short-interest-trends-section">
        <div className="terminal-section__head">
          <div>
            <span>Trend Analysis</span>
            <h2>Short Interest Movement</h2>
            <p className="section-subtitle">Daily market trends are grouped in the 2×2 view. Reported short interest appears separately below because it updates bi-weekly.</p>
          </div>
          <div className="terminal-section-actions">
            {sourceChip('Market Data API')}
          </div>
        </div>
        <div className="short-interest-trend-grid">
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Daily reported short-sale volume across trading venues. This is trading activity, not outstanding short interest.">Short Volume Trend</InfoTitle></h3>
            <TrendLine
              label="Volume"
              labels={shortVolumeTrendRows.map(row => shortDateLabel(row.date))}
              values={shortVolumeTrendRows.map(row => row.totalShortVolume)}
            />
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Cost to borrow shows how expensive it is for short sellers to maintain or open short positions.">Borrow Fee Trend</InfoTitle></h3>
            <TrendLine
              label="CTB"
              labels={borrowFeeTrendRows.map(row => shortDateLabel(row.date))}
              values={borrowFeeTrendRows.map(row => optionalNumeric(record(row.borrowFeeAll).costToBorrowAll) as number)}
              valueFormatter={value => `${formatNumber(value, { maximumFractionDigits: 2 })}%`}
            />
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Shortable shares indicate how many shares may still be available for borrowing. Lower inventory can increase borrow pressure.">Shortable Shares Trend</InfoTitle></h3>
            <TrendLine
              label="Available"
              labels={availabilityTrendRows.map(row => shortDateLabel(row.date))}
              values={availabilityTrendRows.map(row => optionalNumeric(record(row.availability).shortAvailabilityShares) as number)}
            />
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Daily fails-to-deliver shares. Higher values can indicate increasing settlement pressure.">Fails-to-Deliver Trend</InfoTitle></h3>
            <TrendLine
              label="FTD Shares"
              labels={ftdTrendRows.map(row => shortDateLabel(row.tradeDate || row.settlementDate))}
              values={ftdTrendRows.map(row => row.failsToDeliver)}
            />
          </div>
        </div>
        <div className="terminal-card chart-card short-interest-biweekly-chart">
          <div className="short-interest-biweekly-chart__head">
            <h3><InfoTitle text="Reported short-interest shares sampled on a 14-day cadence, matching the bi-weekly data update schedule.">Short Interest Trend</InfoTitle></h3>
            <span>Bi-weekly · 14-day reporting cadence</span>
          </div>
          <TrendLine
            label="Shares"
            labels={biweeklyShortInterestTrendRows.map(row => shortDateLabel(row.date))}
            values={biweeklyShortInterestTrendRows.map(row => optionalNumeric(record(row.shortInterest).shortInterestShares) as number)}
          />
        </div>
      </section>

      <section className="terminal-section short-market-data-section">
        <div className="terminal-section__head">
          <div>
            <span>Market Data Tables</span>
            <h2>Short Volume & Fails-to-Deliver</h2>
            <p className="section-subtitle">Placeholder tables for future API data. Each table shows 7 records per page for readability.</p>
          </div>
        </div>
        <div className="short-market-data-grid">
          <PagedShortVolumeTable rows={apiShortVolumeRows(apiData.shortVolume)} />
          <PagedFtdTable rows={apiFtdRows(apiData.ftd)} />
        </div>
      </section>
      <PageDisclaimerNotice noticeKey="shortInterest" disclaimerKey="regulatoryFiling" />
      <section className="terminal-section import-data-dev-panel">
        <div className="terminal-section__head"><div><span>Development Data</span><h2>Short Interest API Data</h2><p className="section-subtitle">Live API payloads only. No local or S3 JSON fallback is used.</p></div></div>
        <ImportDataTable
          columns={['endpoint', 'generatedAt', 'records', 'payload']}
          rows={[
            { endpoint: 'GET /market-data/current?category=market-current', generatedAt: String(apiData.current.generatedAt ?? 'N/A'), records: '1', payload: JSON.stringify(apiData.current) },
            { endpoint: 'GET /market-data/history?category=market-history', generatedAt: String(apiData.history.generatedAt ?? 'N/A'), records: String(rows(apiData.history.records).length), payload: JSON.stringify(apiData.history) },
            { endpoint: 'GET /market-data/history?category=short-volume-history', generatedAt: String(apiData.shortVolume.generatedAt ?? 'N/A'), records: String(rows(apiData.shortVolume.records).length), payload: JSON.stringify(apiData.shortVolume) },
            { endpoint: 'GET /market-data/history?category=ftd-history', generatedAt: String(apiData.ftd.generatedAt ?? 'N/A'), records: String(rows(apiData.ftd.records).length), payload: JSON.stringify(apiData.ftd) },
            { endpoint: 'GET /manual-input/utilization', generatedAt: 'N/A', records: String(rows(apiData.utilization).length), payload: JSON.stringify(apiData.utilization) },
            { endpoint: 'GET /manual-input/manual-availability', generatedAt: 'N/A', records: String(rows(apiData.availability).length), payload: JSON.stringify(apiData.availability) },
            { endpoint: 'GET /manual-input/margins', generatedAt: 'N/A', records: String(rows(apiData.margins).length), payload: JSON.stringify(apiData.margins) },
          ]}
          pageSize={10}
        />
      </section>
    </div>
  );
}
