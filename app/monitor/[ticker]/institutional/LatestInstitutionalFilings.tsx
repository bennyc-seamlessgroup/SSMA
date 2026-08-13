'use client';

import { ApiSourceTags } from '@/components/ApiSourceTags';
import { formatExactNumber, formatSignedPercent, portalNumber } from '@/lib/number-format';
import type { InstitutionalHolding } from '@/lib/types';
import { useMemo, useState } from 'react';
import { OwnershipChartButton, OwnershipTableHeader } from './OwnershipTable';
import { OwnershipHistoryChartModal, type OwnershipMarketHistoryRecord } from './OwnershipHistoryChart';

export type LatestInstitutionalFiling = {
  holderName?: unknown;
  formType?: unknown;
  fileDate?: unknown;
  effectiveDate?: unknown;
  shares?: unknown;
  percentOfInstitutionalShares?: unknown;
  type?: unknown;
  prevShares?: unknown;
  avgPrice?: unknown;
  positionStatus?: unknown;
};

const ROWS_PER_PAGE = 10;

function dateText(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return 'N/A';
  const timestamp = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00Z` : text);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(timestamp)
    : text;
}

function decimalText(value: unknown) {
  const numeric = portalNumber(value);
  return numeric === null
    ? 'N/A'
    : numeric.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      });
}

function normalizedStatus(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function statusClass(value: unknown) {
  const status = normalizedStatus(value);
  if (/^(new|new position|new buy|new purchase|opened|open)$/.test(status)) return 'is-new';
  if (/^(closed|closing|close|closed position|fully closed|exited|exit|sold out)$/.test(status)) return 'is-closed';
  return '';
}

function isOptionRecord(value: unknown) {
  return /\b(?:put|call)\b/i.test(String(value ?? '').trim());
}

export function LatestInstitutionalFilings({
  rows,
  ticker,
  snapshotDate,
  chartHoldings,
  marketHistory,
}: {
  rows: LatestInstitutionalFiling[];
  ticker: string;
  snapshotDate?: string;
  chartHoldings: InstitutionalHolding[];
  marketHistory: OwnershipMarketHistoryRecord[];
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedHolding, setSelectedHolding] = useState<InstitutionalHolding | null>(null);
  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows
      .filter(row => !isOptionRecord(row.type))
      .filter(row => !query || [
        row.fileDate,
        row.effectiveDate,
        row.formType,
        row.holderName,
        row.shares,
        row.avgPrice,
        row.percentOfInstitutionalShares,
        row.type,
        row.positionStatus,
      ].some(value => String(value ?? '').toLowerCase().includes(query)))
      .sort((a, b) => {
        const fileDateComparison = String(b.fileDate ?? '').localeCompare(String(a.fileDate ?? ''));
        if (fileDateComparison !== 0) return fileDateComparison;
        const effectiveDateComparison = String(b.effectiveDate ?? '').localeCompare(String(a.effectiveDate ?? ''));
        if (effectiveDateComparison !== 0) return effectiveDateComparison;
        return String(a.holderName ?? '').localeCompare(String(b.holderName ?? ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageRows = visibleRows.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  function goToPage(nextPage: number) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  return (
    <section className="institutional-latest-filings" aria-labelledby="institutional-latest-filings-title">
      <ApiSourceTags sources={[{
        endpoint: `GET /market-data/current?ticker=${encodeURIComponent(ticker)}&category=ownership-current`,
        label: 'Latest institutional filings',
      }]} />
      <header className="institutional-latest-filings__head">
        <div className="institutional-section-heading">
          <span className="institutional-section-heading__icon is-activity" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M4 12h3l2-5 4 10 2-5h5" />
              <path d="M12 3a9 9 0 1 0 9 9" />
            </svg>
          </span>
          <div>
            <h2 id="institutional-latest-filings-title">Recent Institutional Activity</h2>
            <p>Recently filed institutional positions, ordered by file date. Completed reporting periods are organized in Quarterly Filing History below.</p>
          </div>
        </div>
        <span>As of {dateText(snapshotDate)}</span>
      </header>

      <div className="ownership-toolbar institutional-latest-filings__toolbar">
        <div className="ownership-legend">
          <span><mark className="legend-new">Green rows indicate new positions</mark></span>
          <span><mark className="legend-closed">Red rows indicate closed positions.</mark></span>
        </div>
        <div className="ownership-actions">
          <input
            className="ownership-search"
            placeholder="Search…"
            aria-label="Search latest institutional filings"
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="ownership-table-wrap institutional-latest-filings__table-wrap">
        <table className="ownership-table institutional-latest-filings__table">
          <OwnershipTableHeader manualSchema latestSchema />
          <tbody>
            {pageRows.length ? pageRows.map((row, index) => {
              const chartHolding = latestFilingHolding(row, ticker, index);
              return (
                <tr
                  key={`${String(row.fileDate ?? 'date')}-${String(row.holderName ?? 'holder')}-${index}`}
                  className={statusClass(row.positionStatus)}
                >
                  <td>{dateText(row.fileDate)}</td>
                  <td>{dateText(row.effectiveDate)}</td>
                  <td>{String(row.formType ?? 'N/A')}</td>
                  <td className="investor-cell">{String(row.holderName ?? 'Unknown holder')}</td>
                  <td><OwnershipChartButton holding={chartHolding} onClick={() => setSelectedHolding(chartHolding)} /></td>
                  <td>{String(row.type ?? '')}</td>
                  <td className="num">{decimalText(row.avgPrice)}</td>
                  <td className="num">{formatExactNumber(row.shares, { maximumFractionDigits: 0 })}</td>
                  <td className="num">{formatSignedPercent(row.percentOfInstitutionalShares, { minimumFractionDigits: 2 })}</td>
                </tr>
              );
            }) : (
              <tr><td colSpan={9} className="ownership-table-empty">No current institutional filings are available.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {visibleRows.length > 0 ? (
        <div className="ownership-pagination" aria-label="Latest institutional filings pagination">
          <button type="button" onClick={() => goToPage(1)} disabled={safePage === 1}>First</button>
          <button type="button" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}>Previous</button>
          <span className="ownership-page-count">Page {safePage} of {totalPages} · {ROWS_PER_PAGE} records per page</span>
          <button type="button" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}>Next</button>
          <button type="button" onClick={() => goToPage(totalPages)} disabled={safePage === totalPages}>Last</button>
        </div>
      ) : null}

      {selectedHolding ? (
        <OwnershipHistoryChartModal
          holding={selectedHolding}
          holdings={chartHoldings}
          marketHistory={marketHistory}
          ticker={ticker}
          onClose={() => setSelectedHolding(null)}
        />
      ) : null}
    </section>
  );
}

function latestFilingHolding(row: LatestInstitutionalFiling, ticker: string, index: number): InstitutionalHolding {
  return {
    id: `latest-filing-${index}`,
    company_id: `company-${ticker}`,
    fund_name: String(row.holderName ?? 'Unknown holder'),
    shares: formatExactNumber(row.shares, { maximumFractionDigits: 0 }),
    market_value: 'N/A',
    change_type: 'unchanged',
    filing_date: String(row.fileDate ?? 'N/A'),
    effective_date: String(row.effectiveDate ?? row.fileDate ?? 'N/A'),
    source: String(row.formType ?? 'Latest filing'),
    form_type: String(row.formType ?? 'N/A'),
    ownership_percent: formatSignedPercent(row.percentOfInstitutionalShares, { minimumFractionDigits: 2 }),
    holding_type: String(row.type ?? ''),
    cost_basis: decimalText(row.avgPrice),
    position_status: String(row.positionStatus ?? ''),
    source_type: 'free_data',
    source_label: 'GET /market-data/current?category=ownership-current',
  };
}
