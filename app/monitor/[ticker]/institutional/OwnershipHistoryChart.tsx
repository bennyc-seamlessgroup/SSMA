'use client';

import type { InstitutionalHolding } from '@/lib/types';
import { formatCompactQuantity } from '@/lib/number-format';
import { useEffect, useMemo, useState } from 'react';

export type OwnershipMarketHistoryRecord = Record<string, unknown>;

type OwnershipHistoryChartModalProps = {
  holding: InstitutionalHolding;
  holdings: InstitutionalHolding[];
  marketHistory: OwnershipMarketHistoryRecord[];
  ticker: string;
  companyName?: string;
  onClose: () => void;
};

type ChartPoint = {
  date: Date;
  dateKey: string;
  price: number;
};

type FilingPoint = {
  date: Date;
  dateKey: string;
  sharesHeld: number;
};

function numericValue(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = typeof value === 'number'
    ? value
    : Number(String(value).replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

function recordValue(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function dateValue(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text || text === 'N/A') return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00Z` : text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizedHolderName(value: unknown) {
  return String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function marketClose(record: OwnershipMarketHistoryRecord) {
  const price = recordValue(record.price);
  return numericValue(record.close)
    ?? numericValue(record.closePrice)
    ?? numericValue(price?.close)
    ?? numericValue(price?.value)
    ?? numericValue(record.price);
}

function marketDate(record: OwnershipMarketHistoryRecord) {
  return dateValue(record.tradeDate ?? record.date ?? record.snapshotDate);
}

function filingSeries(selected: InstitutionalHolding, holdings: InstitutionalHolding[]) {
  const selectedName = normalizedHolderName(selected.fund_name);
  const candidates = [...holdings, selected].filter(row => (
    normalizedHolderName(row.fund_name) === selectedName
    && !/\b(?:put|call)\b/i.test(String(row.holding_type ?? row.option_type ?? ''))
  ));
  const byDate = new Map<string, FilingPoint>();

  candidates.forEach(row => {
    const date = dateValue(row.effective_date ?? row.filing_date);
    const shares = numericValue(row.shares);
    if (!date || shares === null) return;
    const key = dateKey(date);
    byDate.set(key, { date, dateKey: key, sharesHeld: shares });
  });

  return [...byDate.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

function priceSeries(records: OwnershipMarketHistoryRecord[]) {
  const byDate = new Map<string, ChartPoint>();
  records.forEach(record => {
    const date = marketDate(record);
    const price = marketClose(record);
    if (!date || price === null) return;
    const key = dateKey(date);
    byDate.set(key, { date, dateKey: key, price });
  });
  return [...byDate.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

function sampledPriceSeries(points: ChartPoint[], maxPoints = 120) {
  if (points.length <= maxPoints) return points;
  const sampled = Array.from({ length: maxPoints }, (_, index) => (
    points[Math.round(index * (points.length - 1) / (maxPoints - 1))]
  ));
  return sampled.filter((point, index) => index === 0 || point.dateKey !== sampled[index - 1]?.dateKey);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

function fullOwnershipDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function rangeTicks(start: Date, end: Date, count = 6) {
  const span = Math.max(end.getTime() - start.getTime(), 1);
  return Array.from({ length: count }, (_, index) => new Date(start.getTime() + span * index / (count - 1)));
}

export function OwnershipHistoryChartModal({
  holding,
  holdings,
  marketHistory,
  ticker,
  companyName,
  onClose,
}: OwnershipHistoryChartModalProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="ownership-chart-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="ownership-chart-modal" role="dialog" aria-modal="true" aria-labelledby="ownership-chart-title" onMouseDown={event => event.stopPropagation()}>
        <button className="ownership-chart-close" type="button" onClick={onClose} aria-label="Close ownership chart">×</button>
        <OwnershipHistoryChart
          holding={holding}
          holdings={holdings}
          marketHistory={marketHistory}
          ticker={ticker}
          companyName={companyName}
        />
      </div>
    </div>
  );
}

function OwnershipHistoryChart({
  holding,
  holdings,
  marketHistory,
  ticker,
  companyName,
}: Omit<OwnershipHistoryChartModalProps, 'onClose'>) {
  const filings = useMemo(() => filingSeries(holding, holdings), [holding, holdings]);
  const allPrices = useMemo(() => priceSeries(marketHistory), [marketHistory]);
  const prices = useMemo(() => {
    if (!allPrices.length || !filings.length) return sampledPriceSeries(allPrices);
    const filingStart = filings[0].date.getTime();
    const filingEnd = filings.at(-1)?.date.getTime() ?? filingStart;
    const padding = 31 * 24 * 60 * 60 * 1000;
    const relevant = allPrices.filter(point => (
      point.date.getTime() >= filingStart - padding
      && point.date.getTime() <= Math.max(filingEnd + padding, allPrices.at(-1)?.date.getTime() ?? filingEnd)
    ));
    return sampledPriceSeries(relevant.length ? relevant : allPrices);
  }, [allPrices, filings]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; label: string; value: string } | null>(null);

  const width = 860;
  const height = 440;
  const left = 70;
  const right = 70;
  const top = 76;
  const bottom = 344;
  const plotWidth = width - left - right;
  const plotHeight = bottom - top;
  const allDates = [...filings.map(point => point.date), ...prices.map(point => point.date)];
  const fallbackDate = new Date();
  const startDate = allDates.length ? new Date(Math.min(...allDates.map(date => date.getTime()))) : fallbackDate;
  const rawEndDate = allDates.length ? new Date(Math.max(...allDates.map(date => date.getTime()))) : fallbackDate;
  const endDate = rawEndDate.getTime() === startDate.getTime()
    ? new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
    : rawEndDate;
  const dateSpan = Math.max(endDate.getTime() - startDate.getTime(), 1);
  const maxShares = Math.max(1, ...filings.map(point => point.sharesHeld)) * 1.12;
  const rawMinPrice = prices.length ? Math.min(...prices.map(point => point.price)) : 0;
  const rawMaxPrice = prices.length ? Math.max(...prices.map(point => point.price)) : 1;
  const pricePadding = Math.max((rawMaxPrice - rawMinPrice) * .12, rawMaxPrice * .04, .05);
  const minPrice = Math.max(0, rawMinPrice - pricePadding);
  const maxPrice = Math.max(minPrice + .1, rawMaxPrice + pricePadding);
  const xForDate = (date: Date) => left + ((date.getTime() - startDate.getTime()) / dateSpan) * plotWidth;
  const yForShares = (value: number) => bottom - (value / maxShares) * plotHeight;
  const yForPrice = (value: number) => bottom - ((value - minPrice) / (maxPrice - minPrice)) * plotHeight;
  const pricePath = prices.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xForDate(point.date).toFixed(2)} ${yForPrice(point.price).toFixed(2)}`).join(' ');
  const shareTicks = [maxShares, maxShares * .75, maxShares * .5, maxShares * .25, 0];
  const priceTicks = [maxPrice, maxPrice - (maxPrice - minPrice) * .25, maxPrice - (maxPrice - minPrice) * .5, maxPrice - (maxPrice - minPrice) * .75, minPrice];
  const dateTicks = rangeTicks(startDate, endDate);
  const priceDotInterval = Math.max(1, Math.ceil(prices.length / 24));
  const visiblePriceDots = prices.filter((_, index) => (
    index % priceDotInterval === 0 || index === prices.length - 1
  ));
  const tooltipWidth = 228;
  const tooltipHeight = 78;
  const tooltipX = tooltip ? Math.min(Math.max(tooltip.x - tooltipWidth / 2, 10), width - tooltipWidth - 10) : 0;
  const tooltipY = tooltip ? Math.max(tooltip.y - tooltipHeight - 14, 10) : 0;
  const issuer = companyName && normalizedHolderName(companyName) !== normalizedHolderName(ticker)
    ? `${ticker} / ${companyName}`
    : ticker;

  return (
    <div className="ownership-history-chart">
      <h2 id="ownership-chart-title">{issuer} - {holding.fund_name}</h2>
      <p>Reported Institutional Ownership</p>
      {filings.length || prices.length ? (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Reported ownership and closing-price history for ${holding.fund_name}`}>
          <text className="ownership-chart-axis-title" x="23" y={top + plotHeight / 2} transform={`rotate(-90 23 ${top + plotHeight / 2})`}>Shares Held</text>
          <text className="ownership-chart-axis-title" x={width - 20} y={top + plotHeight / 2} transform={`rotate(90 ${width - 20} ${top + plotHeight / 2})`}>Closing Price</text>

          {shareTicks.map((tick, index) => {
            const y = yForShares(tick);
            return (
              <g key={`share-${index}`}>
                <line className="ownership-chart-grid" x1={left} x2={width - right} y1={y} y2={y} />
                <text className="ownership-chart-tick" x={left - 14} y={y + 4} textAnchor="end">{formatCompactQuantity(tick)}</text>
              </g>
            );
          })}

          {prices.length ? priceTicks.map((tick, index) => (
            <text className="ownership-chart-tick" key={`price-${index}`} x={width - right + 15} y={yForPrice(tick) + 4}>${tick.toLocaleString('en-US', { maximumFractionDigits: 2 })}</text>
          )) : null}

          {dateTicks.map((date, index) => (
            <g key={`${date.toISOString()}-${index}`}>
              <line className="ownership-chart-month" x1={xForDate(date)} x2={xForDate(date)} y1={top} y2={bottom} />
              <text className="ownership-chart-date" x={xForDate(date)} y={bottom + 28} textAnchor="middle">{monthLabel(date)}</text>
            </g>
          ))}

          {filings.map(point => {
            const centerX = xForDate(point.date);
            const y = yForShares(point.sharesHeld);
            const isClosedAtZero = point.sharesHeld === 0;
            const naturalBarHeight = bottom - y;
            const visibleBarHeight = isClosedAtZero ? 0 : Math.max(naturalBarHeight, 4);
            const markerY = isClosedAtZero ? bottom - 3 : bottom - visibleBarHeight;
            const showTooltip = () => setTooltip({
              x: centerX,
              y: markerY,
              date: fullOwnershipDate(point.date),
              label: 'Reported Shares Held',
              value: formatCompactQuantity(point.sharesHeld),
            });
            return (
              <g
                className="ownership-chart-bar-group"
                key={point.dateKey}
                onMouseEnter={showTooltip}
                onMouseLeave={() => setTooltip(null)}
              >
                {isClosedAtZero ? (
                  <>
                    <line
                      className="ownership-chart-zero-marker"
                      x1={centerX - 10}
                      x2={centerX + 10}
                      y1={markerY}
                      y2={markerY}
                    />
                    <rect
                      className="ownership-chart-zero-hit-area"
                      x={centerX - 13}
                      y={bottom - 14}
                      width="26"
                      height="16"
                    />
                  </>
                ) : (
                  <rect
                    className="ownership-chart-bar"
                    x={centerX - 10}
                    y={markerY}
                    width="20"
                    height={visibleBarHeight}
                    rx="2"
                  />
                )}
              </g>
            );
          })}

          {prices.length ? <path className="ownership-chart-price-line" d={pricePath} /> : null}
          {visiblePriceDots.map(point => (
            <circle
              className="ownership-chart-price-dot"
              key={point.dateKey}
              cx={xForDate(point.date)}
              cy={yForPrice(point.price)}
              r="3.5"
              onMouseEnter={() => setTooltip({
                x: xForDate(point.date),
                y: yForPrice(point.price),
                date: fullOwnershipDate(point.date),
                label: 'Closing Price',
                value: `$${point.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
              })}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}

          <line className="ownership-chart-baseline" x1={left} x2={width - right} y1={bottom} y2={bottom} />
          {tooltip ? (
            <g className="ownership-chart-tooltip" pointerEvents="none">
              <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="6" />
              <text x={tooltipX + 12} y={tooltipY + 20}>{tooltip.date}</text>
              <text className="ownership-chart-tooltip-label" x={tooltipX + 12} y={tooltipY + 42}>{tooltip.label}</text>
              <text className="ownership-chart-tooltip-value" x={tooltipX + 12} y={tooltipY + 62}>{tooltip.value}</text>
            </g>
          ) : null}
        </svg>
      ) : (
        <div className="ownership-chart-empty">No reported share or closing-price history is available for this holder.</div>
      )}
      <div className="ownership-chart-legend">
        <span><i className="price" />Closing Price</span>
        <span><i className="shares" />Reported Shares Held</span>
      </div>
      <small className="ownership-chart-note">Bars reflect disclosed filing snapshots. The line reflects market closing prices and does not imply daily ownership changes.</small>
    </div>
  );
}
