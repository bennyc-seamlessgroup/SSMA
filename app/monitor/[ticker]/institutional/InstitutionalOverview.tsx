'use client';

import { useState } from 'react';
import { InfoTooltip } from '@/components/InfoTooltip';

type OwnershipKey = 'institutions' | 'real_tradable_float' | 'internal_float';

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
  if (Math.abs(numeric) >= 1_000_000) return `${(numeric / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  if (Math.abs(numeric) >= 1_000) return `${(numeric / 1_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}K`;
  return formatNumber(numeric);
}

function formatPercent(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 'N/A';
  return `${numeric.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function pct(part: number, total: number) {
  return total ? (part / total) * 100 : 0;
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

function donutLabels(rows: NonNullable<InstitutionalOverviewData['ownership_structure']>) {
  let cursor = 0;
  return rows.map(row => {
    const start = cursor;
    const percent = Math.max(0, row.percent);
    cursor += percent;
    const angle = ((start + percent / 2) / 100) * Math.PI * 2 - Math.PI / 2;
    const radius = 35;
    return {
      ...row,
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
    };
  });
}

export function InstitutionalOverview({ data, ticker }: { data: InstitutionalOverviewData; ticker: string }) {
  const [selectedKey, setSelectedKey] = useState<OwnershipKey>('institutions');
  const overview = data.overview ?? {};
  const institutionRows = data.institution_bars ?? [];
  const rawPublicFloatRows = data.public_float_breakdown ?? [];
  const managementStrategicShares = rawPublicFloatRows
    .filter(row => row.key === 'private_strategic' || /private|strategic|management/i.test(row.label))
    .reduce((sum, row) => sum + numeric(row.shares), 0);
  const tokenizedShares = rawPublicFloatRows
    .filter(row => row.key === 'tokenized' || /token/i.test(row.label))
    .reduce((sum, row) => sum + numeric(row.shares), 0);
  const collateralizedShares = rawPublicFloatRows
    .filter(row => row.key === 'collateralized' || /collateral/i.test(row.label))
    .reduce((sum, row) => sum + numeric(row.shares), 0);
  const internalFloatShares = managementStrategicShares + tokenizedShares + collateralizedShares;
  const publicFloatShares = Math.max(0, numeric(overview.shares_outstanding) - numeric(overview.institutional_shares_long) - internalFloatShares);
  const ownershipRows = [
    { key: 'institutions', label: 'Institutions', shares: numeric(overview.institutional_shares_long), color: '#14916f' },
    { key: 'internal_float', label: 'Internal Float', shares: internalFloatShares, color: '#747bdc' },
    { key: 'real_tradable_float', label: 'Real Tradable Float', shares: publicFloatShares, color: '#df9514' },
  ].map(row => ({
    ...row,
    percent: pct(row.shares, numeric(overview.shares_outstanding)),
  }));
  const internalFloatRows = [
    { key: 'management_strategic', label: 'Management / Strategic', shares: managementStrategicShares, percent: pct(managementStrategicShares, internalFloatShares), color: '#8d9aaa', source: 'Internal Float V2 user inputs' },
    { key: 'tokenized', label: 'Tokenized', shares: tokenizedShares, percent: pct(tokenizedShares, internalFloatShares), color: '#747bdc', source: 'Internal Float V2 user inputs' },
    { key: 'collateralized', label: 'Collateralized', shares: collateralizedShares, percent: pct(collateralizedShares, internalFloatShares), color: '#df9514', source: 'Internal Float V2 user inputs' },
  ].filter(row => row.shares > 0);
  const ownershipLabelRows = donutLabels(ownershipRows);
  const selectedOwnership = ownershipRows.find(row => row.key === selectedKey);
  const rightPanelTitle = selectedKey === 'internal_float'
      ? 'Internal Float Breakdown'
    : selectedKey === 'real_tradable_float'
      ? 'Real Tradable Float'
      : 'Institution Holdings Breakdown';

  return (
    <section className="institutional-overview">
      <div className="institutional-overview__kpis">
        <article>
          <span className="with-info">Shares Outstanding <InfoTooltip text="Total company shares outstanding used as the base for ownership and float calculations." /></span>
          <strong>{compact(overview.shares_outstanding)}</strong>
        </article>
        <article>
          <span className="with-info">Institutional Owners <InfoTooltip text="Count of active institutional holders with reported shares greater than zero." /></span>
          <strong>{formatNumber(overview.institutional_owners)}</strong>
        </article>
        <article>
          <span className="with-info">Institutional Shares Long <InfoTooltip text="Total active institutional shares reported long, excluding closed positions and non-share options records." /></span>
          <strong>{compact(overview.institutional_shares_long)}</strong>
        </article>
        <article>
          <span className="with-info">Institutional Value <InfoTooltip text="Total reported institutional holding value, displayed in thousands of USD." /></span>
          <strong>${formatNumber(overview.institutional_value_thousands_usd, { maximumFractionDigits: 1 })}K</strong>
        </article>
        <article>
          <span className="with-info">Avg Portfolio Allocation <InfoTooltip text="Average active portfolio allocation percentage across institutional ownership records." /></span>
          <strong>{formatPercent(overview.average_portfolio_allocation_percent)}</strong>
        </article>
      </div>

      <div className="institutional-overview__charts">
        <article className="institutional-chart-card">
          <div className="institutional-chart-card__head">
            <span className="with-info">Ownership Structure <InfoTooltip text="Breakdown of shares outstanding into institutions, estimated real tradable float, and accepted internal float deductions. Reported insider holdings are included only after management accepts them as internal holdings." /></span>
          </div>
          <div className="institutional-donut-layout">
            <div
              className="institutional-donut"
              style={{ background: `conic-gradient(${ownershipGradient(ownershipRows)})` }}
              aria-label="Ownership structure chart"
            >
              {ownershipLabelRows.map(row => row.percent >= 3 && (
                <span
                  key={`${row.key}-pct`}
                  className="institutional-donut__pct"
                  style={{ left: `${row.x}%`, top: `${row.y}%` }}
                >
                  {formatPercent(row.percent)}
                </span>
              ))}
              <div className="institutional-donut__center">
                <strong>{compact(overview.shares_outstanding)}</strong>
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
            <span className="with-info">{rightPanelTitle} <InfoTooltip text="Details update based on the selected ownership segment." /></span>
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
          {selectedKey === 'real_tradable_float' && (
            <RealTradableFloatFormula
              sharesOutstanding={numeric(overview.shares_outstanding)}
              institutionalShares={numeric(overview.institutional_shares_long)}
              internalFloatShares={internalFloatShares}
              realTradableFloat={publicFloatShares}
            />
          )}
          {selectedKey === 'internal_float' && (
            <BreakdownBars
              rows={internalFloatRows.map(row => ({
                label: row.label,
                shares: row.shares,
                percent: row.percent,
                color: row.color,
              }))}
              emptyText="No internal float records available."
            />
          )}
        </article>
      </div>
    </section>
  );
}

function BreakdownBars({ rows, emptyText = 'No active records available.' }: { rows: Array<{ label: string; shares: number; percent: number; color?: string }>; emptyText?: string }) {
  if (!rows.length) return <p className="page__desc import-empty">{emptyText}</p>;

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

function RealTradableFloatFormula({
  sharesOutstanding,
  institutionalShares,
  internalFloatShares,
  realTradableFloat,
}: {
  sharesOutstanding: number;
  institutionalShares: number;
  internalFloatShares: number;
  realTradableFloat: number;
}) {
  const rows = [
    { label: 'Shares Outstanding', value: sharesOutstanding, operator: '' },
    { label: 'Institutions', value: institutionalShares, operator: '-' },
    { label: 'Internal Float', value: internalFloatShares, operator: '-' },
  ];

  return (
    <div className="institutional-float-formula">
      <div className="institutional-float-formula__rows">
        {rows.map(row => (
          <div key={row.label} className={row.operator ? 'is-subtract' : ''}>
            <span>{row.operator}</span>
            <strong>{row.label}</strong>
            <b>{formatNumber(row.value)}</b>
          </div>
        ))}
      </div>
      <div className="institutional-float-formula__total">
        <span>=</span>
        <strong>Real Tradable Float</strong>
        <b>{formatNumber(realTradableFloat)}</b>
        <small>{formatPercent(pct(realTradableFloat, sharesOutstanding))} of shares outstanding</small>
      </div>
    </div>
  );
}

export type { InstitutionalOverviewData };
