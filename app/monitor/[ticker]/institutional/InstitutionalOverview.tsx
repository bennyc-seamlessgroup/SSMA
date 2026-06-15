'use client';

import Link from 'next/link';
import { useState } from 'react';

type OwnershipKey = 'insiders' | 'institutions' | 'public_float';

type InstitutionalOverviewData = {
  overview?: {
    institutional_owners?: number;
    insider_owners?: number;
    shares_outstanding?: number;
    public_float_shares?: number;
    institutional_shares_long?: number;
    insider_shares_long?: number;
    institutional_ownership_percent?: number;
    insider_ownership_percent?: number;
    public_float_percent?: number;
    institutional_value_thousands_usd?: number;
    average_portfolio_allocation_percent?: number;
    ownership_structure_total_shares?: number;
  };
  ownership_structure?: Array<{
    key: string;
    label: string;
    shares: number;
    percent: number;
    color: string;
  }>;
  institution_bars?: Array<{
    name: string;
    shares: number;
    value?: number;
    latestFileDate?: string | null;
    latestEffectiveDate?: string | null;
    formType?: string | null;
    ownershipPercentOfInstitutional: number;
    ownershipPercentOfSharesOutstanding: number;
  }>;
  insider_bars?: Array<{
    name: string;
    shares: number;
    latestFileDate?: string | null;
    latestEffectiveDate?: string | null;
    formType?: string | null;
    ownershipPercentOfInsiders: number;
    ownershipPercentOfSharesOutstanding: number;
  }>;
  public_float_breakdown?: Array<{
    key: string;
    label: string;
    shares: number;
    percent: number;
    color: string;
    source?: string;
  }>;
};

function formatNumber(value: unknown, options?: Intl.NumberFormatOptions) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 'N/A';
  return numeric.toLocaleString('en-US', options);
}

function compact(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 'N/A';
  if (Math.abs(numeric) >= 1_000_000) return `${(numeric / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
  if (Math.abs(numeric) >= 1_000) return `${(numeric / 1_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`;
  return formatNumber(numeric);
}

function formatPercent(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 'N/A';
  return `${numeric.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

function ownershipGradient(rows: NonNullable<InstitutionalOverviewData['ownership_structure']>) {
  let cursor = 0;
  return rows.map(row => {
    const start = cursor;
    const end = cursor + Math.max(0, row.percent);
    cursor = end;
    return `${row.color} ${start}% ${end}%`;
  }).join(', ');
}

export function InstitutionalOverview({ data, ticker }: { data: InstitutionalOverviewData; ticker: string }) {
  const [selectedKey, setSelectedKey] = useState<OwnershipKey>('institutions');
  const overview = data.overview ?? {};
  const ownershipRows = data.ownership_structure ?? [];
  const institutionRows = data.institution_bars ?? [];
  const insiderRows = data.insider_bars ?? [];
  const publicFloatRows = data.public_float_breakdown ?? [];
  const selectedOwnership = ownershipRows.find(row => row.key === selectedKey);
  const rightPanelTitle = selectedKey === 'insiders'
    ? 'Insider Holdings Breakdown'
    : selectedKey === 'public_float'
      ? 'Public Float Breakdown'
      : 'Institution Holdings Breakdown';
  const rightPanelSubtitle = selectedKey === 'insiders'
    ? 'Active activist / insider share count by holder'
    : selectedKey === 'public_float'
      ? 'Internal float categories from management inputs'
      : 'Active institution share count by holder';

  return (
    <section className="institutional-overview">
      <div className="institutional-overview__kpis">
        <article>
          <span>Shares Outstanding</span>
          <strong>{compact(overview.shares_outstanding)}</strong>
          <small>Total issued share base</small>
        </article>
        <article>
          <span>Institutional Owners</span>
          <strong>{formatNumber(overview.institutional_owners)}</strong>
          <small>Active rows with shares &gt; 0</small>
        </article>
        <article>
          <span>Institutional Shares Long</span>
          <strong>{compact(overview.institutional_shares_long)}</strong>
          <small>{formatPercent(overview.institutional_ownership_percent)} of shares outstanding</small>
        </article>
        <article>
          <span>Institutional Value</span>
          <strong>${formatNumber(overview.institutional_value_thousands_usd, { maximumFractionDigits: 1 })}K</strong>
          <small>Reported value / 1,000</small>
        </article>
        <article>
          <span>Avg Portfolio Allocation</span>
          <strong>{formatPercent(overview.average_portfolio_allocation_percent)}</strong>
          <small>Mean active allocation</small>
        </article>
      </div>

      <div className="institutional-overview__charts">
        <article className="institutional-chart-card">
          <div className="institutional-chart-card__head">
            <span>Ownership Structure</span>
            <small>Insiders, institutions, and public float</small>
          </div>
          <div className="institutional-donut-layout">
            <div
              className="institutional-donut"
              style={{ background: `conic-gradient(${ownershipGradient(ownershipRows)})` }}
              aria-label="Ownership structure chart"
            >
              <div>
                <strong>{compact(overview.ownership_structure_total_shares)}</strong>
                <span>Total</span>
              </div>
            </div>
            <div className="institutional-value-legend interactive">
              {ownershipRows.map(row => (
                <button
                  key={row.key}
                  type="button"
                  className={selectedKey === row.key ? 'active' : ''}
                  onClick={() => setSelectedKey(row.key as OwnershipKey)}
                >
                  <span><i style={{ background: row.color }} />{row.label}</span>
                  <strong>{compact(row.shares)}</strong>
                  <small>{formatPercent(row.percent)}</small>
                </button>
              ))}
            </div>
          </div>
        </article>

        <article className={`institutional-chart-card institutional-detail-card selected-${selectedKey}`}>
          <div className="institutional-chart-card__head">
            <span>{rightPanelTitle}</span>
            <small>{rightPanelSubtitle}</small>
          </div>
          {selectedKey === 'institutions' && (
            <BreakdownBars
              rows={institutionRows.map(row => ({
                label: row.name,
                shares: row.shares,
                percent: row.ownershipPercentOfInstitutional,
                color: selectedOwnership?.color,
              }))}
            />
          )}
          {selectedKey === 'insiders' && (
            <BreakdownBars
              rows={insiderRows.map(row => ({
                label: row.name,
                shares: row.shares,
                percent: row.ownershipPercentOfInsiders,
                color: selectedOwnership?.color,
              }))}
            />
          )}
          {selectedKey === 'public_float' && (
            <>
              <div className="institutional-public-float-panel">
                <div
                  className="institutional-donut mini"
                  style={{ background: `conic-gradient(${ownershipGradient(publicFloatRows)})` }}
                  aria-label="Public float breakdown chart"
                >
                  <div>
                    <strong>{compact(overview.public_float_shares)}</strong>
                    <span>Total</span>
                  </div>
                </div>
                <div className="institutional-value-legend compact">
                  {publicFloatRows.map(row => (
                    <div key={row.key}>
                      <span><i style={{ background: row.color }} />{row.label}</span>
                      <strong>{compact(row.shares)}</strong>
                      <small>{formatPercent(row.percent)}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="institutional-internal-float-link">
                <p>Public float assumptions come from Internal Float inputs. Add private holdings, tokenized shares, and collateralized shares there to improve this breakdown.</p>
                <Link className="button secondary" href={`/monitor/${ticker}/internal-float-v2` as any}>Open Internal Float</Link>
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
}

function BreakdownBars({ rows }: { rows: Array<{ label: string; shares: number; percent: number; color?: string }> }) {
  if (!rows.length) return <p className="page__desc import-empty">No active records available.</p>;

  return (
    <div className="institutional-ranked-bars">
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`}>
          <span>{row.label}</span>
          <div>
            <i style={{ width: `${Math.max(4, row.percent)}%`, background: row.color ?? '#2f5bb8' }} />
          </div>
          <small>{formatPercent(row.percent)}</small>
          <strong>{formatNumber(row.shares)}</strong>
        </div>
      ))}
    </div>
  );
}

export type { InstitutionalOverviewData };
