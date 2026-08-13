'use client';

import { useMemo, useState } from 'react';
import type { InstitutionalHolding } from '@/lib/types';
import { formatSignedPercent } from '@/lib/number-format';
import { OwnershipHistoryChartModal, type OwnershipMarketHistoryRecord } from './OwnershipHistoryChart';

type OwnershipTableProps = {
  holdings: InstitutionalHolding[];
  ticker: string;
  companyName: string;
  chartHoldings?: InstitutionalHolding[];
  marketHistory?: OwnershipMarketHistoryRecord[];
  manualSchema?: boolean;
  emptyMessage?: string;
};

const QUARTERS_PER_PAGE = 2;

export function OwnershipTable({
  holdings,
  ticker,
  companyName,
  chartHoldings = holdings,
  marketHistory = [],
  manualSchema = false,
  emptyMessage = 'No ownership records are available.',
}: OwnershipTableProps) {
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
      row.position_status,
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
                  <td colSpan={manualSchema ? 11 : 9} className="ownership-table-empty">{emptyMessage}</td>
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
                    const normalizedStatus = normalizedPositionStatus(row.position_status);
                    const rowClass = normalizedStatus
                      ? positionStatusClass(row.position_status)
                      : row.change_type === 'new' || row.change_type === 'increased'
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
                            <td>
                              <OwnershipChartButton holding={row} onClick={() => setSelectedHolding(row)} />
                            </td>
                            <td>{displayOwnershipType(row.holding_type)}</td>
                            <td className="num">{row.cost_basis ?? 'N/A'}</td>
                            <td className="num">{row.shares}</td>
                            <td className="num">{formatSignedPercent(row.ownership_percent)}</td>
                            <td className="num">{row.market_value}</td>
                            <td className="num">{formatSignedPercent(row.value_change_percent)}</td>
                          </>
                        ) : (
                          <>
                            <td>
                              <OwnershipChartButton holding={row} onClick={() => setSelectedHolding(row)} />
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
        <OwnershipHistoryChartModal
          holding={selectedHolding}
          holdings={chartHoldings}
          marketHistory={marketHistory}
          ticker={ticker}
          companyName={companyName}
          onClose={() => setSelectedHolding(null)}
        />
      )}
    </>
  );
}

export function OwnershipTableHeader({
  manualSchema,
  latestSchema = false,
}: {
  manualSchema: boolean;
  latestSchema?: boolean;
}) {
  return (
    <thead>
      <tr>
        <th>File Date</th>
        <th>Effective Date</th>
        <th>{manualSchema ? 'Source' : 'Form'}</th>
        <th>Investor</th>
        {manualSchema ? (
          <>
            <th>View on chart</th>
            <th>Type</th>
            <th>Avg Price Est.</th>
            <th>Shares</th>
            <th>{latestSchema ? '% of Institutional Shares' : 'Shares %'}</th>
            {!latestSchema ? (
              <>
                <th>Reported Value</th>
                <th>Value Change %</th>
              </>
            ) : null}
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

export function OwnershipChartButton({ holding, onClick }: { holding: InstitutionalHolding; onClick: () => void }) {
  return (
    <button
      className="ownership-link ownership-chart-icon-button"
      type="button"
      onClick={onClick}
      aria-label={`Open ownership chart for ${holding.fund_name}`}
      title="View ownership history"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 19h16" />
        <path d="M7 16V9" />
        <path d="M12 16V5" />
        <path d="M17 16v-4" />
      </svg>
    </button>
  );
}

function normalizedPositionStatus(value: string | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function positionStatusClass(value: string | undefined) {
  const normalized = normalizedPositionStatus(value);
  if (/^(new|new position|new buy|new purchase|opened|open)$/.test(normalized)) return 'is-new';
  if (/^(closed|closing|close|closed position|fully closed|exited|exit|sold out)$/.test(normalized)) return 'is-closed';
  return '';
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
