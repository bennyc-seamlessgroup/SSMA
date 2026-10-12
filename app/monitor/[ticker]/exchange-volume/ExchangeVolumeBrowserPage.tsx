'use client';

import { ApiDevelopmentTabs } from '@/components/ApiDevelopmentTabs';
import { ApiSourceTags } from '@/components/ApiSourceTags';
import { InfoTooltip } from '@/components/InfoTooltip';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { cachedAuthenticatedFetch } from '@/lib/auth-client';
import {
  marketCurrentFieldDate,
  marketCurrentSnapshotDate,
  type MarketCurrentSnapshot,
} from '@/lib/market-data-publication';
import { normalizeTicker } from '@/lib/ticker-data';
import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';

type Row = Record<string, unknown>;
type PeriodKey = '1M' | '3M' | '6M' | '1Y' | 'All';

type VenuePercentage = {
  key: string;
  label: string;
  percent: number;
};

type HistoryPoint = {
  date: string;
  values: Record<string, number>;
  tradeVolume: number | null;
};

type PagePayload = {
  current: unknown;
  exchangeHistory: unknown;
  marketHistory: unknown;
  currentError: string;
  exchangeHistoryError: string;
  marketHistoryError: string;
};

const periods: PeriodKey[] = ['1M', '3M', '6M', '1Y', 'All'];
const chartColors = [
  '#2563eb', '#8b5cf6', '#06b6d4', '#16a34a', '#f59e0b', '#e11d48', '#0f766e', '#7c3aed',
  '#ea580c', '#0891b2', '#4f46e5', '#65a30d', '#db2777', '#0284c7', '#9333ea', '#0d9488',
  '#ca8a04', '#dc2626', '#475569', '#14b8a6', '#6366f1', '#84cc16', '#f97316', '#ec4899',
];
const tradeVolumeColor = '#e11d48';

const offExchangeExplanation = 'Trades executed away from public stock exchanges, such as through alternative trading systems (dark pools) or broker-dealer internalization. These trades are still reported through FINRA facilities and do not necessarily indicate short selling or unusual activity.';

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
  offexchangeshare: 'Off Exchange',
  exoffexchangeshare: 'Off Exchange',
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
  'totalvolume', 'totalpercent', 'totalpercentage',
  'openchangevalue', 'openchangeperc', 'highchangevalue', 'highchangeperc', 'lowchangevalue',
  'lowchangeperc', 'closechangevalue', 'closechangeperc', 'openchangepercent', 'highchangepercent',
  'lowchangepercent', 'closechangepercent', 'valueformat', 'displayformat',
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

function percentage(value: unknown) {
  const parsed = numeric(value);
  return parsed !== null && parsed >= 0 && parsed <= 100 ? parsed : null;
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

function percentageFieldBaseKey(value: string) {
  return value.replace(/(?:[_-]?(?:percentage|percent))$/i, '');
}

function exchangePercentageEntries(value: unknown): VenuePercentage[] {
  const entries = new Map<string, VenuePercentage>();
  const genericPercentFields = new Set([
    'percent', 'percentage', 'volumepercent', 'volumepercentage', 'sharepercent', 'sharepercentage',
    'marketsharepercent', 'marketsharepercentage', 'exchangepercent', 'exchangepercentage',
  ]);

  function visit(current: unknown, contextKey = '', contextLabel = '', depth = 0) {
    if (depth > 6 || !current || typeof current !== 'object') return;
    if (Array.isArray(current)) {
      current.forEach(item => visit(item, '', '', depth + 1));
      return;
    }

    const row = record(current);
    const identityKey = String(
      row.key ?? row.code ?? row.exchangeCode ?? row.venueCode ?? row.exchange ?? row.venue ?? row.name ?? contextKey,
    ).trim();
    const identityLabel = String(
      row.label ?? row.exchangeName ?? row.venueName ?? row.name ?? contextLabel,
    ).trim();

    Object.entries(row).forEach(([fieldName, raw]) => {
      if (raw && typeof raw === 'object') {
        visit(raw, fieldName, displayLabel(fieldName), depth + 1);
        return;
      }
      if (!fieldName.toLowerCase().includes('percent')) return;
      if (fieldName.startsWith('_') || nonVenueKeys.has(normalizedKey(fieldName))) return;

      const percent = percentage(raw);
      if (percent === null) return;
      const fieldIsGeneric = genericPercentFields.has(normalizedKey(fieldName));
      const key = (fieldIsGeneric ? identityKey : percentageFieldBaseKey(fieldName)).trim();
      if (!key) return;
      entries.set(normalizedKey(key), {
        key,
        label: fieldIsGeneric && identityLabel ? identityLabel : displayLabel(key),
        percent,
      });
    });
  }

  visit(value);
  return [...entries.values()];
}

function historyVenuePercentages(row: Row) {
  return exchangePercentageEntries(row).filter(item => (
    Boolean(venueLabels[normalizedKey(item.key)]) || /^ex(?=[A-Z0-9_-])/.test(item.key)
  ));
}

function findHistoryRows(value: unknown, categoryKeys: string[], depth = 0): Row[] {
  if (depth > 5) return [];
  if (Array.isArray(value)) {
    const rows = value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) as Row[];
    if (rows.length) return rows;
    return [];
  }
  const container = record(value);
  for (const key of ['records', 'data', ...categoryKeys, 'history', 'items']) {
    if (!(key in container)) continue;
    const rows = findHistoryRows(container[key], categoryKeys, depth + 1);
    if (rows.length) return rows;
  }
  return [];
}

function exchangeHistoryRows(payload: unknown) {
  return findHistoryRows(payload, ['exchange-volume-history', 'exchangeVolumeHistory']);
}

function marketHistoryRows(payload: unknown) {
  return findHistoryRows(payload, ['market-history', 'marketHistory']);
}

function historyDate(row: Row) {
  return String(row.tradeDate ?? row.date ?? row.snapshotDate ?? row.asOf ?? '').slice(0, 10);
}

function buildHistoryPoints(rows: Row[]): HistoryPoint[] {
  return rows
    .map(row => ({
      date: historyDate(row),
      values: Object.fromEntries(historyVenuePercentages(row).map(item => [item.key, item.percent])),
      tradeVolume: firstNumeric(
        row.totalVolume,
        row.tradeVolume,
        record(row.volume).totalVolume,
        record(row.volume).tradeVolume,
      ),
    }))
    .filter(point => point.date && (Object.keys(point.values).length || point.tradeVolume !== null))
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

function filterPoints(points: HistoryPoint[], period: PeriodKey, endDate = '') {
  const throughEndDate = endDate ? points.filter(point => point.date <= endDate) : points;
  if (period === 'All' || !throughEndDate.length) return throughEndDate;
  const latest = parseTradeDate(endDate || throughEndDate.at(-1)?.date || '');
  if (!latest) return throughEndDate;
  const start = periodStart(latest, period);
  return start ? throughEndDate.filter(point => {
    const date = parseTradeDate(point.date);
    return date !== null && date >= start;
  }) : throughEndDate;
}

function formatPercentage(value: number | null) {
  return value === null ? 'N/A' : `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

function formatPrice(value: number | null) {
  return value === null ? 'N/A' : value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatVolume(value: number | null) {
  return value === null ? 'N/A' : Math.round(value).toLocaleString('en-US');
}

function formatCompactVolume(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
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

function exactHistoryRecord(rows: Row[], date: string) {
  return rows.find(row => historyDate(row).slice(0, 10) === date) ?? null;
}

function tradeVolumeValue(row: Row) {
  return firstNumeric(
    row.tradeVolume,
    row.totalVolume,
    record(row.volume).tradeVolume,
    record(row.volume).totalVolume,
  );
}

function isOffExchangeVenue(key: string) {
  return normalizedKey(key).includes('offexchange');
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
  const latestValues = points.at(-1)?.values ?? {};
  return keys.sort((a, b) => (
    (latestValues[b] ?? -1) - (latestValues[a] ?? -1)
    || displayLabel(a).localeCompare(displayLabel(b))
  ));
}

function ExchangeShareStackedChart({
  points,
  availableKeys,
  enabledKeys,
  onToggle,
  onShowAll,
  onHideAll,
  tradeVolumeEnabled,
  onToggleTradeVolume,
}: {
  points: HistoryPoint[];
  availableKeys: string[];
  enabledKeys: string[];
  onToggle: (key: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  tradeVolumeEnabled: boolean;
  onToggleTradeVolume: () => void;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const activeKeys = availableKeys.filter(key => enabledKeys.includes(key));
  const values = points.flatMap(point => activeKeys.map(key => point.values[key])).filter(Number.isFinite);
  const tradeVolumes = points.map(point => point.tradeVolume).filter((value): value is number => value !== null);
  const hasTradeVolume = tradeVolumeEnabled && tradeVolumes.length > 0;
  const maximumTradeVolume = Math.max(...tradeVolumes, 0);
  const width = Math.max(1100, 106 + points.length * 8);
  const height = 390;
  const pad = { top: 22, right: 88, bottom: 48, left: 82 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const bandWidth = plotWidth / Math.max(points.length, 1);
  const barWidth = Math.max(1.5, Math.min(20, bandWidth * .72));
  const x = (index: number) => pad.left + (index + .5) * bandWidth;
  const y = (value: number) => pad.top + plotHeight - value / 100 * plotHeight;
  const volumeY = (value: number) => pad.top + plotHeight - value / Math.max(maximumTradeVolume, 1) * plotHeight;
  const xLabelIndexes = Array.from(new Set(Array.from({ length: Math.min(6, points.length) }, (_, index) => (
    points.length <= 1 ? 0 : Math.round(index * (points.length - 1) / (Math.min(6, points.length) - 1))
  ))));
  const hoveredPoint = hoverIndex === null ? null : points[hoverIndex] ?? null;

  function setHoverPosition(event: ReactMouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = (event.clientX - rect.left) / Math.max(rect.width, 1) * width;
    const ratio = Math.min(.999999, Math.max(0, (pointerX - pad.left) / plotWidth));
    const nextIndex = Math.floor(ratio * points.length);
    setHoverIndex(nextIndex);
  }

  const volumeSegments: Array<Array<{ x: number; y: number }>> = [];
  let currentVolumeSegment: Array<{ x: number; y: number }> = [];
  points.forEach((point, index) => {
    if (point.tradeVolume === null) {
      if (currentVolumeSegment.length) volumeSegments.push(currentVolumeSegment);
      currentVolumeSegment = [];
      return;
    }
    currentVolumeSegment.push({ x: x(index), y: volumeY(point.tradeVolume) });
  });
  if (currentVolumeSegment.length) volumeSegments.push(currentVolumeSegment);

  if (!points.length || (!availableKeys.length && !tradeVolumes.length)) {
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
          <button
            type="button"
            className={tradeVolumeEnabled ? 'exchange-volume-trade-toggle' : 'exchange-volume-trade-toggle is-muted'}
            onClick={onToggleTradeVolume}
            aria-pressed={tradeVolumeEnabled}
            disabled={!tradeVolumes.length}
          >
            <i style={{ background: tradeVolumeColor }} />
            Trade Volume
          </button>
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
      {(!activeKeys.length || !values.length) && !hasTradeVolume ? (
        <div className="exchange-volume-empty exchange-volume-chart-empty">
          Select at least one exchange with percentage data for this range.
        </div>
      ) : <div className="exchange-volume-chart-scroll">
        <svg
          className="exchange-volume-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Daily stacked exchange share percentage history"
          onMouseMove={setHoverPosition}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {[0, .25, .5, .75, 1].map(ratio => {
            const chartY = pad.top + plotHeight - ratio * plotHeight;
            return (
              <g key={ratio}>
                <line x1={pad.left} x2={width - pad.right} y1={chartY} y2={chartY} className="exchange-volume-grid-line" vectorEffect="non-scaling-stroke" />
                <text x={pad.left - 12} y={chartY + 4} textAnchor="end" className="exchange-volume-axis-label">
                  {formatPercentage(100 * ratio)}
                </text>
                {hasTradeVolume ? (
                  <text x={width - pad.right + 12} y={chartY + 4} textAnchor="start" className="exchange-volume-axis-label exchange-volume-volume-axis-label">
                    {formatCompactVolume(maximumTradeVolume * ratio)}
                  </text>
                ) : null}
              </g>
            );
          })}
          {points.map((point, pointIndex) => {
            let cumulativePercent = 0;
            return activeKeys.map(key => {
              const value = point.values[key];
              if (!Number.isFinite(value) || value <= 0) return null;
              cumulativePercent += value;
              const colorIndex = availableKeys.indexOf(key);
              return (
                <rect
                  className={`exchange-volume-stacked-segment${hoverIndex !== null && hoverIndex !== pointIndex ? ' is-muted' : ''}`}
                  key={`${point.date}-${key}`}
                  x={x(pointIndex) - barWidth / 2}
                  y={y(cumulativePercent)}
                  width={barWidth}
                  height={value / 100 * plotHeight}
                  fill={chartColors[colorIndex % chartColors.length]}
                />
              );
            });
          })}
          {hasTradeVolume ? volumeSegments.map((segment, segmentIndex) => segment.length > 1 ? (
            <polyline
              className="exchange-volume-trade-line"
              key={`trade-volume-segment-${segmentIndex + 1}`}
              points={segment.map(point => `${point.x},${point.y}`).join(' ')}
              fill="none"
              style={{ stroke: tradeVolumeColor }}
              vectorEffect="non-scaling-stroke"
            />
          ) : (
            <circle
              className="exchange-volume-trade-point"
              key={`trade-volume-point-${segmentIndex + 1}`}
              cx={segment[0].x}
              cy={segment[0].y}
              r="2.6"
              style={{ fill: tradeVolumeColor }}
              vectorEffect="non-scaling-stroke"
            />
          )) : null}
          {hasTradeVolume ? points.map((point, pointIndex) => point.tradeVolume === null ? null : (
            <circle
              className={`exchange-volume-trade-point${hoverIndex !== null && hoverIndex !== pointIndex ? ' is-muted' : ''}`}
              key={`trade-volume-dot-${point.date}`}
              cx={x(pointIndex)}
              cy={volumeY(point.tradeVolume)}
              r={hoverIndex === pointIndex ? 3.2 : 1.8}
              style={{ fill: tradeVolumeColor }}
              vectorEffect="non-scaling-stroke"
            />
          )) : null}
          {xLabelIndexes.map(index => (
            <text key={`${points[index].date}-${index}`} x={x(index)} y={height - 16} textAnchor="middle" className="exchange-volume-axis-label">
              {formatShortDate(points[index].date)}
            </text>
          ))}
          {hoveredPoint && hoverIndex !== null ? (
            <g className="exchange-volume-hover-layer">
              <rect
                className="exchange-volume-hover-bar"
                x={x(hoverIndex) - Math.max(barWidth, 6) / 2}
                y={pad.top}
                width={Math.max(barWidth, 6)}
                height={plotHeight}
              />
            </g>
          ) : null}
        </svg>
        {hoveredPoint && hoverIndex !== null ? (
          <div
            className={`exchange-volume-tooltip${x(hoverIndex) > width * .62 ? ' is-right' : ''}`}
            style={{ left: `${x(hoverIndex) / width * 100}%` }}
          >
            <strong>{formatFullDate(hoveredPoint.date)}</strong>
            {[...activeKeys].sort((a, b) => (hoveredPoint.values[b] ?? -1) - (hoveredPoint.values[a] ?? -1)).map(key => {
              const value = hoveredPoint.values[key];
              if (!Number.isFinite(value)) return null;
              const colorIndex = availableKeys.indexOf(key);
              return (
                <span key={`tooltip-${key}`}>
                  <i style={{ background: chartColors[colorIndex % chartColors.length] }} />
                  <em>{displayLabel(key)}</em>
                  <b>{formatPercentage(value)}</b>
                </span>
              );
            })}
            {tradeVolumeEnabled && hoveredPoint.tradeVolume !== null ? (
              <span className="exchange-volume-tooltip-trade-volume">
                <i style={{ background: tradeVolumeColor }} />
                <em>Trade Volume</em>
                <b>{formatVolume(hoveredPoint.tradeVolume)}</b>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>}
    </div>
  );
}

function CurrentExchangeShare({
  entries,
  emptyMessage = 'No current exchange-percentage fields were returned by the API.',
  ariaLabel = 'Latest exchange share percentage by venue',
}: {
  entries: VenuePercentage[];
  emptyMessage?: string;
  ariaLabel?: string;
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const sortedEntries = [...entries].sort((a, b) => b.percent - a.percent || a.label.localeCompare(b.label));
  const chartEntries = sortedEntries.filter(entry => entry.percent > 0);
  const total = chartEntries.reduce((sum, entry) => sum + entry.percent, 0);
  let cursorAngle = -90;
  const slices = chartEntries.map((entry, index) => {
    const startAngle = cursorAngle;
    const endAngle = startAngle + entry.percent / 100 * 360;
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
    return <div className="exchange-volume-empty">{emptyMessage}</div>;
  }
  return (
    <div className="exchange-volume-pie-layout">
      <div className="exchange-volume-pie-wrap">
        <div className="exchange-volume-pie-frame" onMouseLeave={() => setHoveredKey(null)}>
          <svg className="exchange-volume-pie" viewBox="0 0 200 200" role="img" aria-label={ariaLabel}>
            {slices.map(entry => (
              <path
                className={hoveredKey && hoveredKey !== entry.key ? 'is-muted' : ''}
                d={entry.path}
                fill={entry.color}
                key={entry.key}
                tabIndex={0}
                aria-label={`${entry.label}: ${formatPercentage(entry.percent)}`}
                onMouseEnter={() => setHoveredKey(entry.key)}
                onFocus={() => setHoveredKey(entry.key)}
                onBlur={() => setHoveredKey(null)}
              />
            ))}
          </svg>
          {hoveredEntry ? (
            <div className="exchange-volume-pie-tooltip" role="status">
              <strong><i style={{ background: hoveredEntry.color }} />{hoveredEntry.label}</strong>
              <span>Share <b>{formatPercentage(hoveredEntry.percent)}</b></span>
            </div>
          ) : null}
        </div>
        <small>Slice size uses each API percentage directly, without frontend normalization.</small>
      </div>
      <div className="exchange-volume-pie-legend">
        {legendColumns.map((column, columnIndex) => (
          <div className="exchange-volume-pie-legend-column" key={`legend-column-${columnIndex + 1}`}>
            {column.map((entry, rowIndex) => {
              const rankIndex = columnIndex * legendColumnSize + rowIndex;
              return (
                <div className="exchange-volume-pie-legend-row" key={entry.key}>
                  <div className="exchange-volume-pie-legend-name">
                    <i style={{ background: chartColors[rankIndex % chartColors.length] }} />
                    <span className="exchange-volume-pie-legend-text">{entry.label}</span>
                    {entry.label === 'Off Exchange' ? <InfoTooltip text={offExchangeExplanation} /> : null}
                  </div>
                  <strong>{formatPercentage(entry.percent)}</strong>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExchangeVolumeBrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const [payload, setPayload] = useState<PagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('3M');
  const [disabledVenueKeys, setDisabledVenueKeys] = useState<string[]>([]);
  const [tradeVolumeEnabled, setTradeVolumeEnabled] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPayload(null);
    setDisabledVenueKeys([]);
    setTradeVolumeEnabled(true);
    setSelectedDate('');
    Promise.allSettled([
      cachedAuthenticatedFetch(`/market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=market-current`),
      cachedAuthenticatedFetch(`/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=exchange-volume-history`),
      cachedAuthenticatedFetch(`/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=market-history`),
    ]).then(([currentResult, exchangeHistoryResult, marketHistoryResult]) => {
      if (cancelled) return;
      setPayload({
        current: currentResult.status === 'fulfilled' ? currentResult.value : null,
        exchangeHistory: exchangeHistoryResult.status === 'fulfilled' ? exchangeHistoryResult.value : null,
        marketHistory: marketHistoryResult.status === 'fulfilled' ? marketHistoryResult.value : null,
        currentError: currentResult.status === 'rejected'
          ? currentResult.reason instanceof Error ? currentResult.reason.message : String(currentResult.reason)
          : '',
        exchangeHistoryError: exchangeHistoryResult.status === 'rejected'
          ? exchangeHistoryResult.reason instanceof Error ? exchangeHistoryResult.reason.message : String(exchangeHistoryResult.reason)
          : '',
        marketHistoryError: marketHistoryResult.status === 'rejected'
          ? marketHistoryResult.reason instanceof Error ? marketHistoryResult.reason.message : String(marketHistoryResult.reason)
          : '',
      });
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [normalizedTicker]);

  const current = categoryRecord(payload?.current, 'market-current');
  const rawExchangeHistoryRows = useMemo(
    () => exchangeHistoryRows(payload?.exchangeHistory),
    [payload?.exchangeHistory],
  );
  const rawMarketHistoryRows = useMemo(
    () => marketHistoryRows(payload?.marketHistory),
    [payload?.marketHistory],
  );
  const allPoints = useMemo(() => {
    const marketVolumeByDate = new Map(rawMarketHistoryRows.map(row => [historyDate(row).slice(0, 10), tradeVolumeValue(row)]));
    return buildHistoryPoints(rawExchangeHistoryRows).map(point => ({
      ...point,
      tradeVolume: point.tradeVolume ?? marketVolumeByDate.get(point.date.slice(0, 10)) ?? null,
    }));
  }, [rawExchangeHistoryRows, rawMarketHistoryRows]);
  const allVenueKeys = useMemo(() => venueKeys(allPoints), [allPoints]);
  const currentSnapshotDate = marketCurrentSnapshotDate(current as MarketCurrentSnapshot);
  const availableDates = useMemo(() => [...new Set([
    currentSnapshotDate,
    ...rawMarketHistoryRows.map(row => historyDate(row).slice(0, 10)),
    ...rawExchangeHistoryRows.map(row => historyDate(row).slice(0, 10)),
  ].filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)))].sort(), [
    currentSnapshotDate,
    rawExchangeHistoryRows,
    rawMarketHistoryRows,
  ]);
  const latestAvailableDate = availableDates.at(-1) ?? '';
  const effectiveHistoricalDate = selectedDate || (!currentSnapshotDate ? latestAvailableDate : '');
  const dataDate = effectiveHistoricalDate || currentSnapshotDate || latestAvailableDate;
  const isHistoricalSelection = Boolean(effectiveHistoricalDate);
  const visiblePoints = useMemo(
    () => filterPoints(allPoints, period, dataDate),
    [allPoints, dataDate, period],
  );
  const venueKeySignature = allVenueKeys.join('|');

  useEffect(() => {
    if (!allVenueKeys.length) return;
    setDisabledVenueKeys(allVenueKeys.filter(key => !isOffExchangeVenue(key)));
  }, [normalizedTicker, venueKeySignature]);

  const enabledVenueKeys = allVenueKeys.filter(key => !disabledVenueKeys.includes(key));
  const currentEntries = exchangePercentageEntries({
    exchangePercentages: current.exchangePercentages,
    exchangeVolumePercentages: current.exchangeVolumePercentages,
    exchangeVolumePercentage: current.exchangeVolumePercentage,
    exchangeVolume: current.exchangeVolume,
  });
  const selectedMarketHistoryRecord = effectiveHistoricalDate
    ? exactHistoryRecord(rawMarketHistoryRows, effectiveHistoricalDate)
    : null;
  const selectedExchangeHistoryRecord = effectiveHistoricalDate
    ? exactHistoryRecord(rawExchangeHistoryRows, effectiveHistoricalDate)
    : null;
  const overviewRecord = isHistoricalSelection ? record(selectedMarketHistoryRecord) : current;
  const selectedExchangeEntries = isHistoricalSelection
    ? historyVenuePercentages(record(selectedExchangeHistoryRecord))
    : currentEntries;
  const currentExchangeVolumeDate = marketCurrentFieldDate(current as MarketCurrentSnapshot, 'exchangeVolume');
  const currentTradeVolumeDate = marketCurrentFieldDate(current as MarketCurrentSnapshot, 'tradeVolume');
  const shareDataDate = isHistoricalSelection ? effectiveHistoricalDate : currentExchangeVolumeDate;
  const overviewDataDate = isHistoricalSelection ? effectiveHistoricalDate : currentSnapshotDate;
  const priceMetrics = (['open', 'high', 'low', 'close'] as const).map(key => priceMetric(overviewRecord, key));
  const overviewTradeVolume = tradeVolumeValue(overviewRecord);

  function selectDataDate(date: string) {
    setSelectedDate(date && date !== currentSnapshotDate ? date : '');
  }

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
      {(payload?.currentError || payload?.exchangeHistoryError || payload?.marketHistoryError) ? (
        <section className="exchange-volume-api-errors" aria-label="Exchange volume API errors">
          {payload.currentError ? <p><strong>Current snapshot failed:</strong> {payload.currentError}</p> : null}
          {payload.exchangeHistoryError ? <p><strong>Exchange-volume history failed:</strong> {payload.exchangeHistoryError}</p> : null}
          {payload.marketHistoryError ? <p><strong>Market history failed:</strong> {payload.marketHistoryError}</p> : null}
        </section>
      ) : null}

      <section className="terminal-section exchange-volume-overview">
        <div className="terminal-section__head">
          <div>
            <span>Market Activity</span>
            <h2 className="terminal-title">
              <span className="with-info">
                Exchange Volume Overview
                <InfoTooltip text="Exchange and off-exchange trading share percentages exactly as supplied by percentage-named Market Data API fields. This page does not calculate percentages, totals, or replacement values." />
              </span>
            </h2>
            <p className="section-subtitle">{isHistoricalSelection
              ? 'Historical market snapshot and venue-level trading share percentages for the selected data date.'
              : 'Current market snapshot and venue-level trading share percentages from the centralized Market Data APIs.'}</p>
          </div>
          <div className="exchange-volume-overview-actions">
            <div className="exchange-volume-date-control">
              <label htmlFor="exchange-volume-data-date">
                <span>Data Date</span>
                <input
                  id="exchange-volume-data-date"
                  type="date"
                  value={dataDate}
                  min={availableDates[0] || undefined}
                  max={latestAvailableDate || undefined}
                  onChange={event => selectDataDate(event.target.value)}
                />
              </label>
              <button
                type="button"
                className={!isHistoricalSelection ? 'active' : ''}
                onClick={() => setSelectedDate('')}
                disabled={!currentSnapshotDate}
              >
                Latest
              </button>
            </div>
            <ApiSourceTags sources={[
              { endpoint: 'GET /market-data/current?category=market-current', label: 'Current snapshot' },
              { endpoint: 'GET /market-data/history?category=market-history', label: 'Market history' },
              { endpoint: 'GET /market-data/history?category=exchange-volume-history', label: 'Exchange-volume history' },
            ]} />
          </div>
        </div>

        {isHistoricalSelection && !selectedMarketHistoryRecord ? (
          <div className="exchange-volume-date-notice">No market-history record is available for the selected date.</div>
        ) : null}
        <div className="exchange-volume-price-grid">
          {priceMetrics.map(metric => (
            <article className="terminal-card exchange-volume-price-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{formatPrice(metric.value)}</strong>
              <small>{isHistoricalSelection
                ? overviewDataDate ? `As of ${formatFullDate(overviewDataDate)}` : 'Historical snapshot'
                : formatChange(metric.changeValue, metric.changePercent)}</small>
            </article>
          ))}
          <article className="terminal-card exchange-volume-price-card">
            <span>Trade Volume</span>
            <strong>{formatVolume(overviewTradeVolume)}</strong>
            <small>{(isHistoricalSelection ? overviewDataDate : currentTradeVolumeDate)
              ? `As of ${formatFullDate(isHistoricalSelection ? overviewDataDate : currentTradeVolumeDate)}`
              : isHistoricalSelection ? 'Historical snapshot' : 'Current snapshot'}</small>
          </article>
        </div>

        <div className="exchange-volume-current-subsection">
          <div className="terminal-section__head">
            <div>
              <span>{isHistoricalSelection ? 'Historical Snapshot' : 'Current Snapshot'}</span>
              <h2>{isHistoricalSelection ? 'Exchange Share Snapshot' : 'Latest Exchange Share'}</h2>
              <p className="section-subtitle">{isHistoricalSelection
                ? 'Exchange share percentages for the selected historical date, using the exact percentage-named fields returned by exchange-volume-history.'
                : 'Latest exchange share percentages from market-current.exchangeVolume. Slice sizes and labels use the percentages returned by the API.'}</p>
              {shareDataDate ? <p className="exchange-volume-selected-date"><span>Data Date</span><strong>{formatFullDate(shareDataDate)}</strong></p> : null}
            </div>
            <ApiSourceTags sources={[
              isHistoricalSelection
                ? { endpoint: 'GET /market-data/history?category=exchange-volume-history', label: 'Exchange-volume history' }
                : { endpoint: 'GET /market-data/current?category=market-current', label: 'Exchange volume object' },
            ]} />
          </div>
          <article className="terminal-card exchange-volume-current-card">
            <CurrentExchangeShare
              entries={selectedExchangeEntries}
              ariaLabel={isHistoricalSelection ? 'Historical exchange share percentage by venue' : 'Latest exchange share percentage by venue'}
              emptyMessage={isHistoricalSelection
                ? 'No exchange-percentage fields are available for the selected date.'
                : 'No current exchange-percentage fields were returned by the API.'}
            />
          </article>
        </div>
      </section>

      <section className="terminal-section exchange-volume-history-section">
        <div className="terminal-section__head">
          <div>
            <span>Historical Share</span>
            <h2>Exchange Share by Venue</h2>
            <p className="section-subtitle">Daily venue share percentages with Trade Volume for context.</p>
          </div>
          <div className="terminal-section-actions exchange-volume-actions">
            <div className="exchange-volume-periods" aria-label="Exchange volume period">
              {periods.map(option => (
                <button className={period === option ? 'active' : ''} type="button" key={option} onClick={() => setPeriod(option)}>{option}</button>
              ))}
            </div>
          </div>
        </div>
        <article className="terminal-card exchange-volume-chart-card">
          <ExchangeShareStackedChart
            points={visiblePoints}
            availableKeys={allVenueKeys}
            enabledKeys={enabledVenueKeys}
            onToggle={toggleVenue}
            onShowAll={showAllVenues}
            onHideAll={hideAllVenues}
            tradeVolumeEnabled={tradeVolumeEnabled}
            onToggleTradeVolume={() => setTradeVolumeEnabled(current => !current)}
          />
        </article>
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
            payload: payload?.exchangeHistory,
            status: payload?.exchangeHistoryError ? `Error: ${payload.exchangeHistoryError}` : 'Connected',
            preferredColumns: ['date', 'tradeDate', 'totalVolume', 'tradeVolume'],
          },
          {
            id: 'market-history',
            title: 'Market History',
            endpoint: `GET /market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=market-history`,
            source: 'API Gateway',
            payload: payload?.marketHistory,
            status: payload?.marketHistoryError ? `Error: ${payload.marketHistoryError}` : 'Connected',
            preferredColumns: ['date', 'tradeDate'],
          },
        ]} />
      </section>
    </div>
  );
}
