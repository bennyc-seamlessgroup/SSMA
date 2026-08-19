'use client';

import { ApiDevelopmentTabs } from '@/components/ApiDevelopmentTabs';
import { ApiSourceTags } from '@/components/ApiSourceTags';
import { ImportDataTable } from '@/components/ImportDataTable';
import { InfoTooltip } from '@/components/InfoTooltip';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { cachedAuthenticatedFetch } from '@/lib/auth-client';
import { marketCurrentFieldDate, type MarketCurrentSnapshot } from '@/lib/market-data-publication';
import { normalizeTicker } from '@/lib/ticker-data';
import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';

type Row = Record<string, unknown>;
type PeriodKey = '1M' | '3M' | '6M' | '1Y' | 'All';
type HistoryView = 'chart' | 'table';

type VenueValue = {
  key: string;
  label: string;
  volume: number;
  percent: number | null;
};

type HistoryPoint = {
  date: string;
  values: Record<string, number>;
};

type PagePayload = {
  current: unknown;
  history: unknown;
  currentError: string;
  historyError: string;
};

const periods: PeriodKey[] = ['1M', '3M', '6M', '1Y', 'All'];
const chartColors = [
  '#2563eb', '#8b5cf6', '#06b6d4', '#16a34a', '#f59e0b', '#e11d48', '#0f766e', '#7c3aed',
  '#ea580c', '#0891b2', '#4f46e5', '#65a30d', '#db2777', '#0284c7', '#9333ea', '#0d9488',
  '#ca8a04', '#dc2626', '#475569', '#14b8a6', '#6366f1', '#84cc16', '#f97316', '#ec4899',
];

const exchangeHistoryVenueFields = [
  ['exNasdaqGsm', 'Nasdaq GSM'],
  ['exNyseArca', 'NYSE Arca'],
  ['exOffExchange', 'Off Exchange'],
  ['exCboeEdgx', 'Cboe EDGX'],
  ['exCboeByx', 'Cboe BYX'],
  ['exCboeBzx', 'Cboe BZX'],
  ['exMemx', 'MEMX'],
  ['exIex', 'IEX'],
  ['exMiaxPearl', 'MIAX Pearl'],
  ['exNyse', 'NYSE'],
  ['exNasdaqBx', 'Nasdaq BX'],
  ['ex24xNational', '24X National'],
  ['exNasdaqPhlx', 'Nasdaq PHLX'],
  ['exTexasStockExchangeLlc', 'Texas Stock Exchange LLC'],
  ['exNyseAmerican', 'NYSE American'],
  ['exNyseNational', 'NYSE National'],
  ['exCboeEdga', 'Cboe EDGA'],
  ['exLtse', 'LTSE'],
  ['exChx', 'CHX'],
  ['exOtcEquitySecurity', 'OTC Equity Security'],
] as const;

const venueLabels: Record<string, string> = {
  nasdaqgsm: 'Nasdaq GSM',
  nysearca: 'NYSE Arca',
  offexchange: 'Off Exchange',
  cboeedgx: 'Cboe EDGX',
  cboebyx: 'Cboe BYX',
  cboebzx: 'Cboe BZX',
  memx: 'MEMX',
  iex: 'IEX',
  miaxpearl: 'MIAX Pearl',
  nyse: 'NYSE',
  nasdaqbx: 'Nasdaq BX',
  national24x: '24X National',
  x24national: '24X National',
  nasdaqphlx: 'Nasdaq PHLX',
  texasstockexchangellc: 'Texas Stock Exchange LLC',
  nyseamerican: 'NYSE American',
  nysenational: 'NYSE National',
  cboeedga: 'Cboe EDGA',
  ltse: 'LTSE',
  chx: 'CHX',
  otcequitysecurity: 'OTC Equity Security',
  ...Object.fromEntries(exchangeHistoryVenueFields.map(([key, label]) => [normalizedVenueKey(key), label])),
};

const nonVenueKeys = new Set([
  'date', 'tradedate', 'snapshotdate', 'generatedat', 'updatedat', 'createdat', 'ticker', 'symbol',
  'schemaversion', 'source', 'asof', 'open', 'high', 'low', 'close', 'price', 'tradevolume',
  'totalvolume', 'offexchangesharepercent',
  'openchangevalue', 'openchangeperc', 'highchangevalue', 'highchangeperc', 'lowchangevalue',
  'lowchangeperc', 'closechangevalue', 'closechangeperc', 'valueformat', 'displayformat',
]);

function normalizedVenueKey(value: string) {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function categoryRecord(payload: unknown, category: string) {
  const direct = record(payload);
  const directCategory = record(direct[category]);
  if (Object.keys(directCategory).length) return directCategory;
  const data = record(direct.data);
  const nestedCategory = record(data[category]);
  if (Object.keys(nestedCategory).length) return nestedCategory;
  return Object.keys(data).length ? data : direct;
}

function numeric(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number'
    ? value
    : Number(String(value).replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumeric(...values: unknown[]) {
  for (const value of values) {
    const parsed = numeric(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function normalizedKey(value: string) {
  return normalizedVenueKey(value);
}

function displayLabel(key: string) {
  const normalized = normalizedKey(key);
  if (venueLabels[normalized]) return venueLabels[normalized];
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function venueValueFromItem(value: unknown) {
  if (typeof value === 'number' || typeof value === 'string') {
    return { volume: numeric(value), percent: null };
  }
  const item = record(value);
  return {
    volume: firstNumeric(item.volume, item.exchangeVolume, item.totalVolume, item.value, item.shares),
    percent: firstNumeric(item.percent, item.percentage, item.volumePercent, item.volumePercentage, item.share),
  };
}

function venueArray(value: unknown): VenueValue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const row = record(item);
    const key = String(
      row.key ?? row.code ?? row.exchangeCode ?? row.venueCode ?? row.exchange ?? row.venue ?? row.name ?? row.label ?? `venue-${index + 1}`,
    );
    const parsed = venueValueFromItem(row);
    if (parsed.volume === null) return [];
    return [{
      key,
      label: String(row.label ?? row.exchangeName ?? row.venueName ?? row.name ?? displayLabel(key)),
      volume: parsed.volume,
      percent: parsed.percent,
    }];
  });
}

function exchangeVolumeEntries(value: unknown): VenueValue[] {
  if (Array.isArray(value)) return venueArray(value);
  const container = record(value);
  for (const nestedKey of ['venues', 'exchanges', 'exchangeVolumes', 'volumes', 'volumeByExchange', 'byExchange', 'breakdown', 'items', 'records']) {
    const nestedValue = container[nestedKey];
    if (!nestedValue || (typeof nestedValue !== 'object' && !Array.isArray(nestedValue))) continue;
    const nested = Array.isArray(nestedValue)
      ? venueArray(nestedValue)
      : exchangeVolumeEntries(record(nestedValue));
    if (nested.length) return nested;
  }
  return Object.entries(container).flatMap(([key, raw]) => {
    if (nonVenueKeys.has(normalizedKey(key)) || key.startsWith('_')) return [];
    const parsed = venueValueFromItem(raw);
    if (parsed.volume === null) return [];
    return [{ key, label: displayLabel(key), volume: parsed.volume, percent: parsed.percent }];
  });
}

function exchangeVolumeContainer(row: Row) {
  const nested = row.exchangeVolume ?? row.exchangeVolumes ?? row.venues ?? row.exchanges;
  return nested ?? row;
}

function historyVenueEntries(row: Row) {
  const prefixedEntries = Object.entries(row).flatMap(([key, raw]) => {
    if (!normalizedKey(key).startsWith('ex')) return [];
    const volume = numeric(raw);
    if (volume === null) return [];
    return [{ key, label: venueLabels[normalizedKey(key)] ?? displayLabel(key.replace(/^ex(?=[A-Z0-9_-])/, '')), volume, percent: null }];
  });
  return prefixedEntries.length ? prefixedEntries : exchangeVolumeEntries(exchangeVolumeContainer(row));
}

function findHistoryRows(value: unknown, depth = 0): Row[] {
  if (depth > 5) return [];
  if (Array.isArray(value)) {
    const rows = value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) as Row[];
    if (rows.length) return rows;
    return [];
  }
  const container = record(value);
  for (const key of ['records', 'data', 'exchange-volume-history', 'exchangeVolumeHistory', 'history', 'items']) {
    if (!(key in container)) continue;
    const rows = findHistoryRows(container[key], depth + 1);
    if (rows.length) return rows;
  }
  return [];
}

function historyRows(payload: unknown) {
  return findHistoryRows(payload);
}

function historyDate(row: Row) {
  return String(row.tradeDate ?? row.date ?? row.snapshotDate ?? row.asOf ?? '');
}

function buildHistoryPoints(rows: Row[]): HistoryPoint[] {
  return rows
    .map(row => ({
      date: historyDate(row),
      values: Object.fromEntries(historyVenueEntries(row).map(item => [item.key, item.volume])),
    }))
    .filter(point => point.date && Object.keys(point.values).length)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function parseTradeDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
}

function periodStart(latest: Date, period: PeriodKey) {
  if (period === 'All') return null;
  const start = new Date(latest);
  if (period === '1M') start.setUTCMonth(start.getUTCMonth() - 1);
  if (period === '3M') start.setUTCMonth(start.getUTCMonth() - 3);
  if (period === '6M') start.setUTCMonth(start.getUTCMonth() - 6);
  if (period === '1Y') start.setUTCFullYear(start.getUTCFullYear() - 1);
  return start;
}

function filterPoints(points: HistoryPoint[], period: PeriodKey) {
  if (period === 'All' || !points.length) return points;
  const latest = parseTradeDate(points.at(-1)?.date ?? '');
  if (!latest) return points;
  const start = periodStart(latest, period);
  return start ? points.filter(point => {
    const date = parseTradeDate(point.date);
    return date !== null && date >= start;
  }) : points;
}

function formatVolume(value: number | null) {
  return value === null ? 'N/A' : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatPrice(value: number | null) {
  return value === null ? 'N/A' : value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatChange(value: number | null, percent: number | null) {
  if (value === null && percent === null) return 'Change unavailable';
  const parts: string[] = [];
  if (value !== null) parts.push(`${value > 0 ? '+' : ''}${value.toLocaleString('en-US', { maximumFractionDigits: 4 })}`);
  if (percent !== null) parts.push(`${percent > 0 ? '+' : ''}${percent.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`);
  return parts.join(' · ');
}

function formatShortDate(value: string) {
  const date = parseTradeDate(value);
  if (!date) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatFullDate(value: string) {
  const date = parseTradeDate(value);
  if (!date) return value;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function pieSlicePath(startAngle: number, endAngle: number) {
  const radius = 88;
  const center = 100;
  const cappedEndAngle = Math.min(endAngle, startAngle + 359.999);
  const point = (angle: number) => {
    const radians = angle * Math.PI / 180;
    return {
      x: center + radius * Math.cos(radians),
      y: center + radius * Math.sin(radians),
    };
  };
  const start = point(startAngle);
  const end = point(cappedEndAngle);
  const largeArc = cappedEndAngle - startAngle > 180 ? 1 : 0;
  return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function priceMetric(current: Row, key: 'open' | 'high' | 'low' | 'close') {
  const price = record(current.price);
  const labels = { open: 'Opening Price', high: 'Day High', low: 'Day Low', close: 'Closing Price' } as const;
  return {
    value: firstNumeric(price[key], current[key]),
    changeValue: firstNumeric(price[`${key}ChangeValue`], current[`${key}ChangeValue`]),
    changePercent: firstNumeric(
      price[`${key}ChangePerc`],
      price[`${key}ChangePercent`],
      current[`${key}ChangePerc`],
      current[`${key}ChangePercent`],
    ),
    label: labels[key],
  };
}

function venueKeys(points: HistoryPoint[]) {
  const keys: string[] = [];
  const seen = new Set<string>();
  points.forEach(point => Object.keys(point.values).forEach(key => {
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }));
  return keys;
}

function lineSegments(points: HistoryPoint[], key: string, x: (index: number) => number, y: (value: number) => number) {
  const segments: string[] = [];
  let active = '';
  points.forEach((point, index) => {
    const value = point.values[key];
    if (!Number.isFinite(value)) {
      if (active) segments.push(active);
      active = '';
      return;
    }
    const coordinate = `${x(index).toFixed(2)},${y(value).toFixed(2)}`;
    active = active ? `${active} ${coordinate}` : coordinate;
  });
  if (active) segments.push(active);
  return segments;
}

function ExchangeVolumeChart({
  points,
  availableKeys,
  enabledKeys,
  onToggle,
  onShowAll,
  onHideAll,
}: {
  points: HistoryPoint[];
  availableKeys: string[];
  enabledKeys: string[];
  onToggle: (key: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const activeKeys = availableKeys.filter(key => enabledKeys.includes(key));
  const values = points.flatMap(point => activeKeys.map(key => point.values[key])).filter(Number.isFinite);
  const max = Math.max(...values, 0);
  const width = 1100;
  const height = 390;
  const pad = { top: 22, right: 24, bottom: 48, left: 82 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const x = (index: number) => pad.left + (points.length <= 1 ? plotWidth / 2 : index * plotWidth / (points.length - 1));
  const y = (value: number) => pad.top + plotHeight - (max > 0 ? value / max * plotHeight : 0);
  const xLabelIndexes = Array.from(new Set(Array.from({ length: Math.min(6, points.length) }, (_, index) => (
    points.length <= 1 ? 0 : Math.round(index * (points.length - 1) / (Math.min(6, points.length) - 1))
  ))));
  const hoveredPoint = hoverIndex === null ? null : points[hoverIndex] ?? null;

  function setHoverPosition(event: ReactMouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = (event.clientX - rect.left) / Math.max(rect.width, 1) * width;
    const ratio = Math.min(1, Math.max(0, (pointerX - pad.left) / plotWidth));
    const nextIndex = points.length <= 1 ? 0 : Math.round(ratio * (points.length - 1));
    setHoverIndex(nextIndex);
  }

  if (!points.length || !availableKeys.length) {
    return <div className="exchange-volume-empty">No exchange-volume history was returned by the API for this range.</div>;
  }

  return (
    <div className="exchange-volume-chart-shell">
      <div className="exchange-volume-legend">
        <div className="exchange-volume-legend-toolbar">
          <span>Exchanges</span>
          <div className="exchange-volume-series-actions">
            <button type="button" onClick={onShowAll} disabled={enabledKeys.length === availableKeys.length}>Show all</button>
            <button type="button" onClick={onHideAll} disabled={!enabledKeys.length}>Hide all</button>
          </div>
        </div>
        <div className="exchange-volume-legend-items" aria-label="Exchange series toggles">
          {availableKeys.map((key, index) => (
            <button
              type="button"
              className={enabledKeys.includes(key) ? '' : 'is-muted'}
              key={key}
              onClick={() => onToggle(key)}
              aria-pressed={enabledKeys.includes(key)}
            >
              <i style={{ background: chartColors[index % chartColors.length] }} />
              {displayLabel(key)}
            </button>
          ))}
        </div>
      </div>
      {!activeKeys.length || !values.length ? (
        <div className="exchange-volume-empty exchange-volume-chart-empty">
          Select at least one exchange with data for this range.
        </div>
      ) : <div className="exchange-volume-chart-scroll">
        <svg
          className="exchange-volume-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Daily exchange volume history"
          onMouseMove={setHoverPosition}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {[0, .25, .5, .75, 1].map(ratio => {
            const chartY = pad.top + plotHeight - ratio * plotHeight;
            return (
              <g key={ratio}>
                <line x1={pad.left} x2={width - pad.right} y1={chartY} y2={chartY} className="exchange-volume-grid-line" vectorEffect="non-scaling-stroke" />
                <text x={pad.left - 12} y={chartY + 4} textAnchor="end" className="exchange-volume-axis-label">
                  {formatVolume(max * ratio)}
                </text>
              </g>
            );
          })}
          {activeKeys.map(key => {
            const colorIndex = availableKeys.indexOf(key);
            return lineSegments(points, key, x, y).map((segment, segmentIndex) => (
            <polyline
              key={`${key}-${segmentIndex}`}
              points={segment}
              fill="none"
              stroke={chartColors[colorIndex % chartColors.length]}
              strokeWidth="1.25"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            ));
          })}
          {xLabelIndexes.map(index => (
            <text key={`${points[index].date}-${index}`} x={x(index)} y={height - 16} textAnchor="middle" className="exchange-volume-axis-label">
              {formatShortDate(points[index].date)}
            </text>
          ))}
          {hoveredPoint && hoverIndex !== null ? (
            <g className="exchange-volume-hover-layer">
              <line
                className="exchange-volume-hover-line"
                x1={x(hoverIndex)}
                x2={x(hoverIndex)}
                y1={pad.top}
                y2={height - pad.bottom}
                vectorEffect="non-scaling-stroke"
              />
              {activeKeys.map(key => {
                const value = hoveredPoint.values[key];
                if (!Number.isFinite(value)) return null;
                const colorIndex = availableKeys.indexOf(key);
                return (
                  <circle
                    className="exchange-volume-hover-dot"
                    key={`hover-${key}`}
                    cx={x(hoverIndex)}
                    cy={y(value)}
                    r="3"
                    fill={chartColors[colorIndex % chartColors.length]}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </g>
          ) : null}
        </svg>
        {hoveredPoint && hoverIndex !== null ? (
          <div
            className={`exchange-volume-tooltip${x(hoverIndex) > width * .62 ? ' is-right' : ''}`}
            style={{ left: `${x(hoverIndex) / width * 100}%` }}
          >
            <strong>{formatFullDate(hoveredPoint.date)}</strong>
            {activeKeys.map(key => {
              const value = hoveredPoint.values[key];
              if (!Number.isFinite(value)) return null;
              const colorIndex = availableKeys.indexOf(key);
              return (
                <span key={`tooltip-${key}`}>
                  <i style={{ background: chartColors[colorIndex % chartColors.length] }} />
                  <em>{displayLabel(key)}</em>
                  <b>{formatVolume(value)}</b>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>}
    </div>
  );
}

function CurrentExchangeVolume({ entries }: { entries: VenueValue[] }) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const sortedEntries = [...entries].sort((a, b) => b.volume - a.volume);
  const chartEntries = sortedEntries.filter(entry => entry.volume > 0);
  const total = chartEntries.reduce((sum, entry) => sum + entry.volume, 0);
  let cursorAngle = -90;
  const slices = chartEntries.map((entry, index) => {
    const startAngle = cursorAngle;
    const endAngle = startAngle + entry.volume / total * 360;
    cursorAngle = endAngle;
    return {
      ...entry,
      color: chartColors[index % chartColors.length],
      path: pieSlicePath(startAngle, endAngle),
    };
  });
  const legendColumnSize = Math.ceil(sortedEntries.length / 2);
  const legendColumns = [
    sortedEntries.slice(0, legendColumnSize),
    sortedEntries.slice(legendColumnSize),
  ].filter(column => column.length > 0);
  const hoveredEntry = hoveredKey ? slices.find(entry => entry.key === hoveredKey) ?? null : null;

  if (!entries.length || !total) {
    return <div className="exchange-volume-empty">No current exchange-volume fields were returned by the API.</div>;
  }
  return (
    <div className="exchange-volume-pie-layout">
      <div className="exchange-volume-pie-wrap">
        <div className="exchange-volume-pie-frame" onMouseLeave={() => setHoveredKey(null)}>
          <svg className="exchange-volume-pie" viewBox="0 0 200 200" role="img" aria-label="Latest exchange volume by venue">
            {slices.map(entry => (
              <path
                className={hoveredKey && hoveredKey !== entry.key ? 'is-muted' : ''}
                d={entry.path}
                fill={entry.color}
                key={entry.key}
                tabIndex={0}
                aria-label={`${entry.label}: ${formatVolume(entry.volume)} volume${entry.percent !== null ? `, ${entry.percent.toLocaleString('en-US', { maximumFractionDigits: 4 })}% supplied by API` : ''}`}
                onMouseEnter={() => setHoveredKey(entry.key)}
                onFocus={() => setHoveredKey(entry.key)}
                onBlur={() => setHoveredKey(null)}
              />
            ))}
          </svg>
          {hoveredEntry ? (
            <div className="exchange-volume-pie-tooltip" role="status">
              <strong><i style={{ background: hoveredEntry.color }} />{hoveredEntry.label}</strong>
              <span>Volume <b>{formatVolume(hoveredEntry.volume)}</b></span>
              {hoveredEntry.percent !== null ? <small>{hoveredEntry.percent.toLocaleString('en-US', { maximumFractionDigits: 4 })}% supplied by API</small> : null}
            </div>
          ) : null}
        </div>
        <small>Slice size reflects each volume value returned by the API.</small>
      </div>
      <div className="exchange-volume-pie-legend">
        {legendColumns.map((column, columnIndex) => (
          <div className="exchange-volume-pie-legend-column" key={`legend-column-${columnIndex + 1}`}>
            {column.map((entry, rowIndex) => {
              const rankIndex = columnIndex * legendColumnSize + rowIndex;
              return (
                <div className="exchange-volume-pie-legend-row" key={entry.key}>
                  <span><i style={{ background: chartColors[rankIndex % chartColors.length] }} />{entry.label}</span>
                  <strong>{formatVolume(entry.volume)}</strong>
                  {entry.percent !== null ? <small>{entry.percent.toLocaleString('en-US', { maximumFractionDigits: 4 })}% supplied by API</small> : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryViewToggle({ view, onChange }: { view: HistoryView; onChange: (view: HistoryView) => void }) {
  return (
    <div className="exchange-volume-view-toggle" role="group" aria-label="Exchange volume history view">
      <button
        type="button"
        className={view === 'chart' ? 'active' : ''}
        aria-label="Line chart view"
        title="Line chart view"
        aria-pressed={view === 'chart'}
        onClick={() => onChange('chart')}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M2.5 15.5 7 10.8l3.2 2.6 6-7" />
          <path d="M2.5 3.5v12h15" />
        </svg>
      </button>
      <button
        type="button"
        className={view === 'table' ? 'active' : ''}
        aria-label="Table view"
        title="Table view"
        aria-pressed={view === 'table'}
        onClick={() => onChange('table')}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <rect x="2.5" y="3.5" width="15" height="13" rx="1" />
          <path d="M2.5 8h15M7.5 3.5v13M12.5 3.5v13" />
        </svg>
      </button>
    </div>
  );
}

function historyColumnLabel(column: string) {
  const normalized = normalizedKey(column);
  if (normalized === 'date' || normalized === 'tradedate') return 'Date';
  if (normalized === 'totalvolume') return 'Total Volume';
  if (normalized === 'offexchangesharepercent') return 'Off-Exchange Share %';
  if (normalized.startsWith('ex')) {
    const venueKey = normalized.slice(2);
    return venueLabels[normalized] ?? venueLabels[venueKey] ?? displayLabel(column.replace(/^ex[\s_-]*/i, ''));
  }
  return displayLabel(column);
}

function tableData(rows: Row[]) {
  const apiColumns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const totalVolumeColumn = apiColumns.find(key => normalizedKey(key) === 'totalvolume');
  const offExchangePercentColumn = apiColumns.find(key => normalizedKey(key) === 'offexchangesharepercent');
  const venueColumns = apiColumns.filter(key => normalizedKey(key).startsWith('ex'));
  const exactColumns = [totalVolumeColumn, offExchangePercentColumn, ...venueColumns]
    .filter((key): key is string => Boolean(key));
  if (venueColumns.length) {
    return {
      columns: ['date', ...exactColumns],
      rows: [...rows]
        .filter(row => historyDate(row))
        .sort((a, b) => historyDate(b).localeCompare(historyDate(a)))
        .map(row => ({
          date: historyDate(row),
          ...Object.fromEntries(exactColumns.map(key => {
            const value = numeric(row[key]);
            return [key, value === null ? '—' : formatVolume(value)];
          })),
        })),
    };
  }
  const points = buildHistoryPoints(rows);
  const keys = venueKeys(points);
  const columns = ['tradeDate', ...keys];
  const tableRows = [...points].reverse().map(point => ({
    tradeDate: point.date,
    ...Object.fromEntries(keys.map(key => [key, key in point.values ? formatVolume(point.values[key]) : '—'])),
  }));
  return { columns, rows: tableRows };
}

export function ExchangeVolumeBrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const [payload, setPayload] = useState<PagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('3M');
  const [historyView, setHistoryView] = useState<HistoryView>('chart');
  const [disabledVenueKeys, setDisabledVenueKeys] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPayload(null);
    setHistoryView('chart');
    setDisabledVenueKeys([]);
    Promise.allSettled([
      cachedAuthenticatedFetch(`/market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=market-current`),
      cachedAuthenticatedFetch(`/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=exchange-volume-history`),
    ]).then(([currentResult, historyResult]) => {
      if (cancelled) return;
      setPayload({
        current: currentResult.status === 'fulfilled' ? currentResult.value : null,
        history: historyResult.status === 'fulfilled' ? historyResult.value : null,
        currentError: currentResult.status === 'rejected'
          ? currentResult.reason instanceof Error ? currentResult.reason.message : String(currentResult.reason)
          : '',
        historyError: historyResult.status === 'rejected'
          ? historyResult.reason instanceof Error ? historyResult.reason.message : String(historyResult.reason)
          : '',
      });
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [normalizedTicker]);

  const current = categoryRecord(payload?.current, 'market-current');
  const rawHistoryRows = useMemo(() => historyRows(payload?.history), [payload?.history]);
  const allPoints = useMemo(() => buildHistoryPoints(rawHistoryRows), [rawHistoryRows]);
  const allVenueKeys = useMemo(() => venueKeys(allPoints), [allPoints]);
  const visiblePoints = useMemo(() => filterPoints(allPoints, period), [allPoints, period]);
  const enabledVenueKeys = allVenueKeys.filter(key => !disabledVenueKeys.includes(key));
  const currentEntries = exchangeVolumeEntries(current.exchangeVolume);
  const currentExchangeVolumeDate = marketCurrentFieldDate(current as MarketCurrentSnapshot, 'exchangeVolume');
  const priceMetrics = (['open', 'high', 'low', 'close'] as const).map(key => priceMetric(current, key));
  const visibleHistoryRows = useMemo(() => {
    const visibleDates = new Set(visiblePoints.map(point => point.date));
    return rawHistoryRows.filter(row => visibleDates.has(historyDate(row)));
  }, [rawHistoryRows, visiblePoints]);
  const historicalTable = useMemo(() => tableData(visibleHistoryRows), [visibleHistoryRows]);
  const historicalColumnLabels = useMemo(
    () => Object.fromEntries(historicalTable.columns.map(column => [column, historyColumnLabel(column)])),
    [historicalTable.columns],
  );

  function toggleVenue(key: string) {
    setDisabledVenueKeys(current => current.includes(key)
      ? current.filter(item => item !== key)
      : [...current, key]);
  }

  function showAllVenues() {
    setDisabledVenueKeys([]);
  }

  function hideAllVenues() {
    setDisabledVenueKeys(allVenueKeys);
  }

  if (loading) return <PortalPageLoading variant="generic" />;

  return (
    <div className="page exchange-volume-page">
      {(payload?.currentError || payload?.historyError) ? (
        <section className="exchange-volume-api-errors" aria-label="Exchange volume API errors">
          {payload.currentError ? <p><strong>Current snapshot failed:</strong> {payload.currentError}</p> : null}
          {payload.historyError ? <p><strong>Exchange-volume history failed:</strong> {payload.historyError}</p> : null}
        </section>
      ) : null}

      <section className="terminal-section exchange-volume-overview">
        <div className="terminal-section__head">
          <div>
            <span>Market Activity</span>
            <h2 className="terminal-title">
              <span className="with-info">
                Exchange Volume Overview
                <InfoTooltip text="Exchange and off-exchange trading volumes exactly as supplied by the Market Data APIs. This page does not calculate market share, rankings, totals, or replacement values." />
              </span>
            </h2>
            <p className="section-subtitle">Current market snapshot and venue-level trading volume from the centralized Market Data APIs.</p>
          </div>
          <ApiSourceTags sources={[
            { endpoint: 'GET /market-data/current?category=market-current', label: 'Current snapshot' },
            { endpoint: 'GET /market-data/history?category=exchange-volume-history', label: 'Exchange-volume history' },
          ]} />
        </div>

        <div className="exchange-volume-price-grid">
          {priceMetrics.map(metric => (
            <article className="terminal-card exchange-volume-price-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{formatPrice(metric.value)}</strong>
              <small>{formatChange(metric.changeValue, metric.changePercent)}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="terminal-section exchange-volume-current-section">
        <div className="terminal-section__head">
          <div>
            <span>Current Snapshot</span>
            <h2>Latest Exchange Volume</h2>
            <p className="section-subtitle">Latest venue volumes from market-current.exchangeVolume{currentExchangeVolumeDate ? ` as of ${formatShortDate(currentExchangeVolumeDate)}` : ''}. Slice sizes visualize the returned volume values; labels retain the raw API values.</p>
          </div>
          <ApiSourceTags sources={[
            { endpoint: 'GET /market-data/current?category=market-current', label: 'Exchange volume object' },
          ]} />
        </div>
        <article className="terminal-card exchange-volume-current-card">
          <CurrentExchangeVolume entries={currentEntries} />
        </article>
      </section>

      <section className="terminal-section exchange-volume-history-section">
        <div className="terminal-section__head">
          <div>
            <span>Historical Volume</span>
            <h2>Volume by Exchange</h2>
            <p className="section-subtitle">Daily venue volumes returned by exchange-volume-history. Missing API dates and values remain unavailable rather than being synthesized.</p>
          </div>
          <div className="terminal-section-actions exchange-volume-actions">
            <div className="exchange-volume-periods" aria-label="Exchange volume period">
              {periods.map(option => (
                <button className={period === option ? 'active' : ''} type="button" key={option} onClick={() => setPeriod(option)}>{option}</button>
              ))}
            </div>
            <HistoryViewToggle view={historyView} onChange={setHistoryView} />
          </div>
        </div>
        {historyView === 'chart' ? (
          <article className="terminal-card exchange-volume-chart-card">
            <ExchangeVolumeChart
              points={visiblePoints}
              availableKeys={allVenueKeys}
              enabledKeys={enabledVenueKeys}
              onToggle={toggleVenue}
              onShowAll={showAllVenues}
              onHideAll={hideAllVenues}
            />
          </article>
        ) : (
          <div className="exchange-volume-table-section exchange-volume-history-table">
            {historicalTable.rows.length ? (
              <ImportDataTable
                columns={historicalTable.columns}
                rows={historicalTable.rows}
                pageSize={25}
                columnLabels={historicalColumnLabels}
              />
            ) : (
              <div className="exchange-volume-empty">No exchange-volume history records were returned by the API for this range.</div>
            )}
          </div>
        )}
      </section>

      <PageDisclaimerNotice noticeKey="exchangeVolume" disclaimerKey="marketData" />

      <section className="terminal-section import-data-dev-panel">
        <div className="terminal-section__head">
          <div>
            <span>Development Data</span>
            <h2>Exchange Volume API Data</h2>
            <p className="section-subtitle">Live API payloads only. No local data, calculated metrics, or JSON fallback is used.</p>
          </div>
        </div>
        <ApiDevelopmentTabs sources={[
          {
            id: 'market-current',
            title: 'Market Current',
            endpoint: `GET /market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=market-current`,
            source: 'API Gateway',
            payload: payload?.current,
            status: payload?.currentError ? `Error: ${payload.currentError}` : 'Connected',
          },
          {
            id: 'exchange-volume-history',
            title: 'Exchange Volume History',
            endpoint: `GET /market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=exchange-volume-history`,
            source: 'API Gateway',
            payload: payload?.history,
            status: payload?.historyError ? `Error: ${payload.historyError}` : 'Connected',
            preferredColumns: ['date', 'tradeDate'],
          },
        ]} />
      </section>
    </div>
  );
}
