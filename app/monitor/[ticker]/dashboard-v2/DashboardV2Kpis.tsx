'use client';

import { InfoTooltip } from '@/components/InfoTooltip';
import { useMemo } from 'react';

export type PeriodKey = '1D' | '5D' | '1M' | '3M' | '1Y' | 'YTD';

type TrendPoint = {
  date: string;
  feeRate: number | null;
  shortableShares: number | null;
  daysToCover: number | null;
  utilization: number | null;
  margin?: number | null;
};

type KpiConfig = {
  key: keyof TrendPoint;
  label: string;
  valueFormatter: (value: number | undefined) => string;
  changeFormatter: (value: number) => string;
  detail: string;
  explanation: string;
};

export const dashboardV2Periods: PeriodKey[] = ['1D', '5D', '1M', '3M', '1Y', 'YTD'];

const kpis: KpiConfig[] = [
  {
    key: 'feeRate',
    label: 'Borrow Fee',
    valueFormatter: value => pct(value, 2),
    changeFormatter: value => signed(value, 2, ' pts'),
    detail: 'Borrow cost trend',
    explanation: 'Current annualized cost to borrow shares. Higher borrow fees can indicate tighter lending supply or stronger short-side demand.',
  },
  {
    key: 'margin',
    label: 'Margin',
    valueFormatter: value => pct(value, 1),
    changeFormatter: value => signed(value, 2, ' pts'),
    detail: 'Current maintenance estimate',
    explanation: 'Estimated margin requirement for maintaining the position. Higher margin can reflect greater perceived financing or risk pressure.',
  },
  {
    key: 'shortableShares',
    label: 'Available Shares',
    valueFormatter: value => compact(value),
    changeFormatter: value => signed(value, 0, ' shares'),
    detail: 'Shortable share supply',
    explanation: 'Number of shares currently available to borrow for shorting. Lower availability can signal tighter lendable supply.',
  },
  {
    key: 'utilization',
    label: 'Utilization',
    valueFormatter: value => pct(value, 1),
    changeFormatter: value => signed(value, 2, ' pts'),
    detail: 'Lending pool utilization',
    explanation: 'Percentage of lendable inventory currently being used. Higher utilization means more of the borrowable share pool is already committed.',
  },
  {
    key: 'daysToCover',
    label: 'Days to Cover',
    valueFormatter: value => value === undefined ? 'N/A' : `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}d`,
    changeFormatter: value => signed(value, 1, 'd'),
    detail: 'Short interest coverage',
    explanation: 'Estimated number of trading days it would take short sellers to cover current short interest based on average trading volume.',
  },
];

function pct(value: number | undefined, digits: number) {
  return value === undefined ? 'N/A' : `${value.toLocaleString('en-US', { maximumFractionDigits: digits })}%`;
}

function compact(value: number | undefined) {
  if (value === undefined) return 'N/A';
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toLocaleString('en-US', { maximumFractionDigits: 2 })}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`;
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function signed(value: number, digits: number, suffix: string) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('en-US', { maximumFractionDigits: digits })}${suffix}`;
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function targetDate(latest: Date, period: PeriodKey) {
  const target = new Date(latest);
  if (period === '1D') target.setUTCDate(target.getUTCDate() - 1);
  if (period === '5D') target.setUTCDate(target.getUTCDate() - 5);
  if (period === '1M') target.setUTCMonth(target.getUTCMonth() - 1);
  if (period === '3M') target.setUTCMonth(target.getUTCMonth() - 3);
  if (period === '1Y') target.setUTCFullYear(target.getUTCFullYear() - 1);
  if (period === 'YTD') return new Date(Date.UTC(latest.getUTCFullYear(), 0, 1));
  return target;
}

function comparisonPoint(data: TrendPoint[], period: PeriodKey) {
  const latest = data[data.length - 1];
  if (!latest) return null;
  const target = targetDate(parseDate(latest.date), period);

  if (period === 'YTD') {
    return data.find(point => parseDate(point.date) >= target) ?? data[0] ?? null;
  }

  return [...data].reverse().find(point => parseDate(point.date) <= target) ?? data[0] ?? null;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function DashboardV2Kpis({ data, period }: { data: TrendPoint[]; period: PeriodKey }) {
  const cleanData = useMemo(() => data.filter(point => point?.date).sort((a, b) => a.date.localeCompare(b.date)), [data]);
  const latest = cleanData[cleanData.length - 1];
  const compare = comparisonPoint(cleanData, period);

  return (
    <section className="dashboard-v2-kpi-block" aria-label="Borrow market KPIs">
      <div className="dashboard-v2-kpis">
        {kpis.map(item => {
          const currentValue = toNumber(latest?.[item.key]);
          const compareValue = toNumber(compare?.[item.key]);
          const change = currentValue !== undefined && compareValue !== undefined ? currentValue - compareValue : null;
          const changePercent = change !== null && compareValue ? (change / compareValue) * 100 : null;
          const tone = change === null ? 'neutral' : change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

          return (
            <article className="dashboard-v2-kpi" key={item.label}>
              <span className="dashboard-v2-kpi-label">{item.label} <InfoTooltip text={item.explanation} /></span>
              <strong>{item.valueFormatter(currentValue)}</strong>
              <div className={`dashboard-v2-kpi-change ${tone}`}>
                <b>{change === null ? 'No baseline' : item.changeFormatter(change)}</b>
                <em>{changePercent === null ? '' : `(${signed(changePercent, 2, '%')})`}</em>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
