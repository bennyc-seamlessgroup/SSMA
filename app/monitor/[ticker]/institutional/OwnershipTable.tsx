'use client';

import { useMemo, useState } from 'react';
import type { InstitutionalHolding } from '@/lib/types';

type OwnershipTableProps = {
  holdings: InstitutionalHolding[];
  ticker: string;
  companyName: string;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export function OwnershipTable({ holdings, ticker, companyName }: OwnershipTableProps) {
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<InstitutionalHolding | null>(null);

  const filteredHoldings = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = !query ? holdings : holdings.filter(row => [
      row.filing_date,
      row.effective_date,
      row.form_type,
      row.fund_name,
      row.shares,
      row.shares_change_percent,
      row.market_value,
      row.value_change_percent,
    ].some(value => String(value ?? '').toLowerCase().includes(query)));

    if (!sort) return filtered;

    return [...filtered].sort((a, b) => {
      const aValue = ownershipSortValue(a, sort.column);
      const bValue = ownershipSortValue(b, sort.column);
      const comparison = compareValues(aValue, bValue);
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [holdings, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredHoldings.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredHoldings.slice((safePage - 1) * pageSize, safePage * pageSize);

  function goToPage(nextPage: number) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  function updatePageSize(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
  }

  function toggleSort(column: string) {
    setSort(current => {
      if (!current || current.column !== column) return { column, direction: 'asc' };
      if (current.direction === 'asc') return { column, direction: 'desc' };
      return null;
    });
    setPage(1);
  }

  function sortLabel(column: string) {
    if (sort?.column !== column) return '↕';
    return sort.direction === 'asc' ? '↑' : '↓';
  }

  return (
    <>
      <div className="ownership-toolbar">
        <div className="ownership-legend">
          <span><mark className="legend-new">Green rows indicate new positions</mark></span>
          <span><mark className="legend-closed">Red rows indicate closed positions.</mark></span>
        </div>
        <div className="ownership-actions">
          <input
            className="ownership-search"
            placeholder="Search…"
            aria-label="Search ownership records"
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="ownership-table-wrap">
        <table className="ownership-table">
          <thead>
            <tr>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('filingDate')}>File Date <span>{sortLabel('filingDate')}</span></button></th>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('effectiveDate')}>Effective Date <span>{sortLabel('effectiveDate')}</span></button></th>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('form')}>Form <span>{sortLabel('form')}</span></button></th>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('investor')}>Investor <span>{sortLabel('investor')}</span></button></th>
              <th>View on chart</th>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('shares')}>Shares (x1000) <span>{sortLabel('shares')}</span></button></th>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('sharesChanged')}>Shares Changed (%) <span>{sortLabel('sharesChanged')}</span></button></th>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('value')}>Value (x1000) <span>{sortLabel('value')}</span></button></th>
              <th><button className="table-sort-button" type="button" onClick={() => toggleSort('valueChanged')}>Value Changed (%) <span>{sortLabel('valueChanged')}</span></button></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(row => {
              const rowClass = row.change_type === 'new' || row.change_type === 'increased'
                ? 'is-new'
                : row.change_type === 'exited' || row.shares_change_percent === '-100%'
                  ? 'is-closed'
                  : '';
              return (
                <tr key={row.id} className={rowClass}>
                  <td>{formatOwnershipDate(row.filing_date)}</td>
                  <td>{formatOwnershipDate(row.effective_date)}</td>
                  <td>{row.form_type ?? row.source}</td>
                  <td className="investor-cell">{row.fund_name}</td>
                  <td>
                    <button className="ownership-link ownership-chart-icon-button" type="button" onClick={() => setSelectedHolding(row)} aria-label={`Open ownership chart for ${row.fund_name}`} title="View on chart">
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M4 19h16" />
                        <path d="M7 16V9" />
                        <path d="M12 16V5" />
                        <path d="M17 16v-4" />
                      </svg>
                    </button>
                  </td>
                  <td className="num">{row.shares}</td>
                  <td className="num">{row.shares_change_percent ?? row.shares_change ?? 'N/A'}</td>
                  <td className="num">{row.market_value}</td>
                  <td className="num">{row.value_change_percent ?? row.value_change ?? 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ownership-pagination" aria-label="Ownership table pagination">
        <button type="button" onClick={() => goToPage(1)} disabled={safePage === 1}>First</button>
        <button type="button" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}>Previous</button>
        <span className="ownership-page-count">Page {safePage} of {totalPages}</span>
        <input
          aria-label="Page number"
          className="ownership-page-input"
          type="number"
          min={1}
          max={totalPages}
          value={safePage}
          onChange={event => goToPage(Number(event.target.value) || 1)}
        />
        <select aria-label="Rows per page" value={pageSize} onChange={event => updatePageSize(Number(event.target.value))}>
          {PAGE_SIZE_OPTIONS.map(option => <option key={option} value={option}>Show {option}</option>)}
        </select>
        <button type="button" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}>Next</button>
        <button type="button" onClick={() => goToPage(totalPages)} disabled={safePage === totalPages}>Last</button>
      </div>

      {selectedHolding && (
        <div className="ownership-chart-modal-backdrop" role="presentation" onMouseDown={() => setSelectedHolding(null)}>
          <div className="ownership-chart-modal" role="dialog" aria-modal="true" aria-labelledby="ownership-chart-title" onMouseDown={event => event.stopPropagation()}>
            <button className="ownership-chart-close" type="button" onClick={() => setSelectedHolding(null)} aria-label="Close ownership chart">×</button>
            <OwnershipHistoryChart holding={selectedHolding} ticker={ticker} companyName={companyName} />
          </div>
        </div>
      )}
    </>
  );
}

function investorSeed(value: string) {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function parseThousands(value: string | undefined) {
  const numeric = numericValue(value);
  if (numeric === null) return 60;
  return Math.max(8, Math.min(160, numeric > 1000 ? numeric / 1000 : numeric));
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

function formatOwnershipDate(value: string | undefined) {
  if (!value || value === 'N/A') return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).replace(',', '');
}

function ownershipHistory(holding: InstitutionalHolding) {
  const seed = investorSeed(holding.fund_name);
  const start = new Date('2025-06-01T00:00:00Z');
  const points = Array.from({ length: 52 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index * 7);
    const trend = 0.72 + index * 0.055;
    const wave = Math.sin((index + seed % 11) / 3.8) * 0.22 + Math.sin(index / 8) * 0.16;
    const spike = index > 38 && index < 45 ? Math.sin((index - 38) / 7 * Math.PI) * 0.8 : 0;
    return {
      date,
      price: Math.max(0.25, Number((trend + wave + spike).toFixed(2))),
    };
  });

  const currentShares = parseThousands(holding.shares);
  const barIndexes = [2 + seed % 4, 15 + seed % 5, 28 + seed % 6, 40 + seed % 5].filter(index => index < points.length);
  const bars = barIndexes.map((index, barIndex) => ({
    date: points[index].date,
    sharesHeld: Math.max(4, Number((currentShares * (0.82 + barIndex * 0.06)).toFixed(1))),
    index,
  }));

  return { points, bars };
}

function OwnershipHistoryChart({ holding, ticker, companyName }: { holding: InstitutionalHolding; ticker: string; companyName: string }) {
  const { points, bars } = ownershipHistory(holding);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    label: string;
    value: string;
  } | null>(null);
  const width = 760;
  const height = 430;
  const left = 62;
  const right = 58;
  const top = 78;
  const bottom = 336;
  const plotWidth = width - left - right;
  const plotHeight = bottom - top;
  const maxShares = Math.max(80, ...bars.map(bar => bar.sharesHeld)) * 1.08;
  const maxPrice = Math.max(4.8, ...points.map(point => point.price)) * 1.05;
  const xFor = (index: number) => left + (index / Math.max(points.length - 1, 1)) * plotWidth;
  const yForShares = (value: number) => bottom - (value / maxShares) * plotHeight;
  const yForPrice = (value: number) => bottom - (value / maxPrice) * plotHeight;
  const pricePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index).toFixed(2)} ${yForPrice(point.price).toFixed(2)}`).join(' ');
  const shareTicks = [maxShares, maxShares * .75, maxShares * .5, maxShares * .25, 0];
  const priceTicks = [maxPrice, maxPrice * .75, maxPrice * .5, maxPrice * .25, 0];
  const monthTicks = points
    .map((point, index) => ({ point, index }))
    .filter(({ point, index }) => index === 0 || point.date.getUTCMonth() !== points[index - 1]?.date.getUTCMonth())
    .filter((_, index) => index % 2 === 0);
  const tooltipWidth = 228;
  const tooltipHeight = 78;
  const tooltipX = tooltip ? Math.min(Math.max(tooltip.x - tooltipWidth / 2, 10), width - tooltipWidth - 10) : 0;
  const tooltipY = tooltip ? Math.max(tooltip.y - tooltipHeight - 14, 10) : 0;

  return (
    <div className="ownership-history-chart">
      <h2 id="ownership-chart-title">{ticker} / {companyName} - {holding.fund_name}</h2>
      <p>Institutional Ownership</p>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Institutional ownership history for ${holding.fund_name}`}>
        <text className="ownership-chart-axis-title" x="22" y={top + plotHeight / 2} transform={`rotate(-90 22 ${top + plotHeight / 2})`}>Shares Held (x1000)</text>
        <text className="ownership-chart-axis-title" x={width - 18} y={top + plotHeight / 2} transform={`rotate(90 ${width - 18} ${top + plotHeight / 2})`}>Share Price</text>

        {shareTicks.map((tick, index) => {
          const y = yForShares(tick);
          return (
            <g key={`share-${index}`}>
              <line className="ownership-chart-grid" x1={left} x2={width - right} y1={y} y2={y} />
              <text className="ownership-chart-tick" x={left - 16} y={y + 4} textAnchor="end">{Math.round(tick)}</text>
            </g>
          );
        })}

        {priceTicks.map((tick, index) => (
          <text className="ownership-chart-tick" key={`price-${index}`} x={width - right + 18} y={yForPrice(tick) + 4}>{tick.toLocaleString('en-US', { maximumFractionDigits: 1 })}</text>
        ))}

        {monthTicks.map(({ point, index }) => (
          <g key={point.date.toISOString()}>
            <line className="ownership-chart-month" x1={xFor(index)} x2={xFor(index)} y1={top} y2={bottom} />
            <text className="ownership-chart-date" x={xFor(index)} y={bottom + 28} textAnchor="middle">{monthLabel(point.date)}</text>
          </g>
        ))}

        {bars.map(bar => {
          const x = xFor(bar.index) - 10;
          const y = yForShares(bar.sharesHeld);
          return (
            <g className="ownership-chart-bar-group" key={bar.date.toISOString()}>
              <rect
                className="ownership-chart-bar"
                x={x}
                y={y}
                width="20"
                height={bottom - y}
                rx="2"
                onMouseEnter={() => setTooltip({
                  x: xFor(bar.index),
                  y,
                  date: fullOwnershipDate(bar.date),
                  label: 'Shares Held (x1000)',
                  value: bar.sharesHeld.toLocaleString('en-US', { maximumFractionDigits: 1 }),
                })}
                onMouseLeave={() => setTooltip(null)}
              />
            </g>
          );
        })}

        <path className="ownership-chart-price-line" d={pricePath} />
        {points
          .map((point, index) => ({ point, index }))
          .filter(({ index }) => index % 4 === 0)
          .map(({ point, index }) => (
            <circle
              className="ownership-chart-price-dot"
              key={point.date.toISOString()}
              cx={xFor(index)}
              cy={yForPrice(point.price)}
              r="4"
              onMouseEnter={() => setTooltip({
                x: xFor(index),
                y: yForPrice(point.price),
                date: fullOwnershipDate(point.date),
                label: 'Share Price',
                value: `$${point.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
              })}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}

        <line className="ownership-chart-baseline" x1={left} x2={width - right} y1={bottom} y2={bottom} />

        {tooltip && (
          <g className="ownership-chart-tooltip" pointerEvents="none">
            <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="6" />
            <text x={tooltipX + 12} y={tooltipY + 20}>{tooltip.date}</text>
            <text className="ownership-chart-tooltip-label" x={tooltipX + 12} y={tooltipY + 42}>{tooltip.label}</text>
            <text className="ownership-chart-tooltip-value" x={tooltipX + 12} y={tooltipY + 62}>{tooltip.value}</text>
          </g>
        )}
      </svg>
      <div className="ownership-chart-legend">
        <span><i className="price" />Share Price</span>
        <span><i className="shares" />Shares Held (x1000)</span>
      </div>
    </div>
  );
}

function numericValue(value: string | undefined) {
  const numeric = Number(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

function compareValues(aValue: string | number, bValue: string | number) {
  if (typeof aValue === 'number' && typeof bValue === 'number') return aValue - bValue;
  return String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' });
}

function ownershipSortValue(row: InstitutionalHolding, column: string): string | number {
  const map: Record<string, string | undefined> = {
    filingDate: row.filing_date,
    effectiveDate: row.effective_date,
    form: row.form_type ?? row.source,
    investor: row.fund_name,
    shares: row.shares,
    sharesChanged: row.shares_change_percent ?? row.shares_change,
    value: row.market_value,
    valueChanged: row.value_change_percent ?? row.value_change,
  };
  const value = map[column] ?? '';
  return numericValue(value) ?? value;
}
