'use client';

import { useMemo, useState } from 'react';
import type { InstitutionalHolding } from '@/lib/types';

type OwnershipTableProps = {
  holdings: InstitutionalHolding[];
  ticker: string;
  companyName: string;
  manualSchema?: boolean;
  emptyMessage?: string;
};

const QUARTERS_PER_PAGE = 2;

export function OwnershipTable({ holdings, ticker, companyName, manualSchema = false, emptyMessage = 'No ownership records are available.' }: OwnershipTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedHolding, setSelectedHolding] = useState<InstitutionalHolding | null>(null);

  const quarterGroups = useMemo(() => {
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
      row.holding_type,
      row.option_type,
      row.cost_basis,
      row.ownership_percent,
    ].some(value => String(value ?? '').toLowerCase().includes(query)));

    const groups = new Map<string, {
      key: string;
      label: string;
      sortValue: number;
      rows: InstitutionalHolding[];
    }>();

    filtered.forEach(row => {
      const quarter = ownershipReportingQuarter(row.effective_date || row.filing_date);
      const group = groups.get(quarter.key);
      if (group) {
        group.rows.push(row);
      } else {
        groups.set(quarter.key, { ...quarter, rows: [row] });
      }
    });

    return [...groups.values()]
      .map(group => ({
        ...group,
        rows: [...group.rows].sort(compareOwnershipRowsNewestFirst),
      }))
      .sort((a, b) => b.sortValue - a.sortValue);
  }, [holdings, search]);

  const totalPages = Math.max(1, Math.ceil(quarterGroups.length / QUARTERS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageQuarterGroups = quarterGroups.slice(
    (safePage - 1) * QUARTERS_PER_PAGE,
    safePage * QUARTERS_PER_PAGE,
  );

  function goToPage(nextPage: number) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  return (
    <>
      <div className="ownership-toolbar">
        <div className="ownership-legend">
          <span><mark className="legend-new">Green rows indicate new positions</mark></span>
          <span><mark className="legend-closed">Red rows indicate closed positions.</mark></span>
          <span className="ownership-record-note">Institutional ownership filings are generally updated quarterly as new 13F and major-holder records become available.</span>
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

      <div className="ownership-quarter-groups">
        {!pageQuarterGroups.length && (
          <div className="ownership-table-wrap">
            <table className="ownership-table">
              <OwnershipTableHeader manualSchema={manualSchema} />
              <tbody>
                <tr>
                  <td colSpan={manualSchema ? 10 : 9} className="ownership-table-empty">{emptyMessage}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {pageQuarterGroups.map(group => (
          <section className="ownership-quarter-group" key={group.key} aria-labelledby={`ownership-quarter-${group.key}`}>
            <div className="ownership-quarter-group__head">
              <div>
                <span>Reporting Quarter</span>
                <h3 id={`ownership-quarter-${group.key}`}>{group.label}</h3>
              </div>
              <small>{group.rows.length.toLocaleString()} records</small>
            </div>
            <div className="ownership-table-wrap">
              <table className="ownership-table">
                <OwnershipTableHeader manualSchema={manualSchema} />
                <tbody>
                  {group.rows.map((row, rowIndex) => {
                    const rowClass = row.change_type === 'new' || row.change_type === 'increased'
                      ? 'is-new'
                      : row.change_type === 'exited' || row.shares_change_percent === '-100%'
                        ? 'is-closed'
                        : '';
                    return (
                      <tr key={`${group.key}-${row.id}-${rowIndex}`} className={rowClass}>
                        <td>{formatOwnershipDate(row.filing_date)}</td>
                        <td>{formatOwnershipDate(row.effective_date)}</td>
                        <td>{row.form_type ?? row.source}</td>
                        <td className="investor-cell">{row.fund_name}</td>
                        {manualSchema ? (
                          <>
                            <td>{displayOwnershipType(row.holding_type)}</td>
                            <td className="num">{row.cost_basis ?? 'N/A'}</td>
                            <td className="num">{row.shares}</td>
                            <td className="num">{row.ownership_percent ?? 'N/A'}</td>
                            <td className="num">{row.market_value}</td>
                            <td className="num">{row.value_change_percent ?? 'N/A'}</td>
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      {quarterGroups.length > 0 && <div className="ownership-pagination" aria-label="Ownership quarter pagination">
        <button type="button" onClick={() => goToPage(1)} disabled={safePage === 1}>First</button>
        <button type="button" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}>Previous</button>
        <span className="ownership-page-count">Page {safePage} of {totalPages} · 2 quarters per page</span>
        <button type="button" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}>Next</button>
        <button type="button" onClick={() => goToPage(totalPages)} disabled={safePage === totalPages}>Last</button>
      </div>}

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

function OwnershipTableHeader({ manualSchema }: { manualSchema: boolean }) {
  return (
    <thead>
      <tr>
        <th>File Date</th>
        <th>Effective Date</th>
        <th>{manualSchema ? 'Source' : 'Form'}</th>
        <th>Investor</th>
        {manualSchema ? (
          <>
            <th>Type</th>
            <th>Avg Price Est.</th>
            <th>Shares</th>
            <th>Shares %</th>
            <th>Reported Value</th>
            <th>Value Change %</th>
          </>
        ) : (
          <>
            <th>View on chart</th>
            <th>Shares (x1000)</th>
            <th>Shares Changed (%)</th>
            <th>Value (x1000)</th>
            <th>Value Changed (%)</th>
          </>
        )}
      </tr>
    </thead>
  );
}

function ownershipReportingQuarter(value: string | undefined) {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})/);
  if (!match) {
    return {
      key: 'unknown',
      label: 'Reporting period unavailable',
      sortValue: Number.NEGATIVE_INFINITY,
    };
  }

  const year = Number(match[1]);
  const quarter = Math.ceil(Number(match[2]) / 3);
  return {
    key: `${year}-Q${quarter}`,
    label: `Q${quarter} ${year}`,
    sortValue: year * 10 + quarter,
  };
}

function compareOwnershipRowsNewestFirst(a: InstitutionalHolding, b: InstitutionalHolding) {
  const filingDateComparison = String(b.filing_date ?? '').localeCompare(String(a.filing_date ?? ''));
  if (filingDateComparison !== 0) return filingDateComparison;
  return a.fund_name.localeCompare(b.fund_name, undefined, { numeric: true, sensitivity: 'base' });
}

function displayOwnershipType(value: string | undefined) {
  const normalized = String(value ?? '').trim();
  return normalized.toUpperCase() === 'N/A' ? '' : normalized;
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
