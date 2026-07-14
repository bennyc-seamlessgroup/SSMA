'use client';

import { InfoTooltip } from '@/components/InfoTooltip';
import type { DashboardMarginRecord } from '@/lib/operations/dashboard-margin-store';
import { useMemo } from 'react';

export type PeriodKey = '1D' | '5D' | '1M' | '3M' | '1Y' | 'YTD';

type TrendPoint = {
  date: string;
  feeRate: number | null;
  shortableShares: number | null;
  daysToCover: number | null;
  utilization: number | null;
};

type ManualKpiKey = 'initialMargin' | 'maintenanceMargin' | 'averageDurationDays';
type TrendKpiKey = Exclude<keyof TrendPoint, 'date'>;

type KpiConfig = {
  key: TrendKpiKey | ManualKpiKey;
  label: string;
  valueFormatter: (value: number | undefined) => string;
  changeFormatter: (value: number) => string;
  detail: string;
  explanation: string;
  chartTone: 'blue' | 'red' | 'green' | 'orange' | 'purple' | 'slate';
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
    chartTone: 'red',
  },
  {
    key: 'initialMargin',
    label: 'Initial Margin',
    valueFormatter: value => pctFixed(value, 2),
    changeFormatter: value => signed(value, 2, ' pts'),
    detail: 'Opening margin requirement',
    explanation: 'Initial margin is the upfront collateral requirement to open or support a position. Requirements can differ by platform, so this view reflects market broker inputs collected from major platforms.',
    chartTone: 'blue',
  },
  {
    key: 'maintenanceMargin',
    label: 'Maintenance Margin',
    valueFormatter: value => pctFixed(value, 2),
    changeFormatter: value => signed(value, 2, ' pts'),
    detail: 'Ongoing margin requirement',
    explanation: 'Maintenance margin is the ongoing collateral level required to keep a position open. Requirements can vary across broker platforms and may change with volatility or risk controls.',
    chartTone: 'slate',
  },
  {
    key: 'shortableShares',
    label: 'Shortable Shares',
    valueFormatter: value => compact(value),
    changeFormatter: value => signed(value, 0, ' shares'),
    detail: 'Shortable share supply',
    explanation: 'Number of shares currently available to borrow for shorting. Lower availability can signal tighter lendable supply.',
    chartTone: 'orange',
  },
  {
    key: 'utilization',
    label: 'Utilization',
    valueFormatter: value => pct(value, 1),
    changeFormatter: value => signed(value, 2, ' pts'),
    detail: 'Lending pool utilization',
    explanation: 'Percentage of lendable inventory currently being used. Higher utilization means more of the borrowable share pool is already committed.',
    chartTone: 'green',
  },
  {
    key: 'averageDurationDays',
    label: 'Average Duration (D)',
    valueFormatter: value => value === undefined ? 'N/A' : `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}d`,
    changeFormatter: value => signed(value, 1, 'd'),
    detail: 'Average holding duration',
    explanation: 'Average duration shows the estimated average number of days positions remain open. A longer duration can indicate slower turnover or more persistent positioning.',
    chartTone: 'purple',
  },
  {
    key: 'daysToCover',
    label: 'Days to Cover',
    valueFormatter: value => value === undefined ? 'N/A' : `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}d`,
    changeFormatter: value => signed(value, 1, 'd'),
    detail: 'Short interest coverage',
    explanation: 'Estimated number of trading days it would take short sellers to cover current short interest based on average trading volume.',
    chartTone: 'blue',
  },
];

function pct(value: number | undefined, digits: number) {
  return value === undefined ? 'N/A' : `${value.toLocaleString('en-US', { maximumFractionDigits: digits })}%`;
}

function pctFixed(value: number | undefined, digits: number) {
  return value === undefined ? 'N/A' : `${value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
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

function latestMarginRecord(records: DashboardMarginRecord[]) {
  return [...records].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

function comparisonMarginRecord(records: DashboardMarginRecord[], period: PeriodKey) {
  const sorted = [...records].filter(record => record.date).sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  if (!latest) return null;
  const target = targetDate(parseDate(latest.date), period);

  if (period === 'YTD') {
    return sorted.find(record => parseDate(record.date) >= target && record.date !== latest.date) ?? null;
  }

  return [...sorted].reverse().find(record => record.date !== latest.date && parseDate(record.date) <= target) ?? null;
}

function isManualKpiKey(key: KpiConfig['key']): key is ManualKpiKey {
  return key === 'initialMargin' || key === 'maintenanceMargin' || key === 'averageDurationDays';
}

function sparklinePath(values: number[], width: number, height: number, pad = 5) {
  if (!values.length) return { line: '', area: '' };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || Math.max(Math.abs(max), 1) * 0.08;
  const xStep = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  const points = values.map((value, index) => {
    const x = values.length > 1 ? pad + index * xStep : width / 2;
    const y = height - pad - ((value - min) / spread) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const area = `${line} L ${points[points.length - 1][0].toFixed(2)} ${height} L ${points[0][0].toFixed(2)} ${height} Z`;
  return { line, area };
}

function Sparkline({ values, tone }: { values: number[]; tone: KpiConfig['chartTone'] }) {
  const compactValues = values.filter(value => Number.isFinite(value)).slice(-36);
  const { line, area } = sparklinePath(compactValues, 210, 48);
  const isEmpty = compactValues.length < 2 || !line;

  return (
    <div className={`dashboard-v2-kpi-spark dashboard-v2-kpi-spark--${tone}`} aria-hidden="true">
      {isEmpty ? (
        <span />
      ) : (
        <svg viewBox="0 0 210 48" preserveAspectRatio="none" focusable="false">
          <path className="dashboard-v2-kpi-spark-area" d={area} />
          <path className="dashboard-v2-kpi-spark-line" d={line} />
        </svg>
      )}
    </div>
  );
}

export function DashboardV2Kpis({ data, period, marginRecords }: { data: TrendPoint[]; period: PeriodKey; marginRecords: DashboardMarginRecord[] }) {
  const cleanData = useMemo(() => data.filter(point => point?.date).sort((a, b) => a.date.localeCompare(b.date)), [data]);
  const cleanMarginRecords = useMemo(() => [...marginRecords].filter(record => record.date).sort((a, b) => a.date.localeCompare(b.date)), [marginRecords]);
  const latestMargin = useMemo(() => latestMarginRecord(marginRecords), [marginRecords]);
  const compareMargin = useMemo(() => comparisonMarginRecord(marginRecords, period), [marginRecords, period]);
  const latest = cleanData[cleanData.length - 1];
  const compare = comparisonPoint(cleanData, period);

  return (
    <section className="dashboard-v2-kpi-block" aria-label="Borrow market KPIs">
      <div className="dashboard-v2-kpis">
        {kpis.map(item => {
          const isManualInput = isManualKpiKey(item.key);
          let currentValue: number | undefined;
          let compareValue: number | undefined;
          if (isManualKpiKey(item.key)) {
            currentValue = toNumber(latestMargin?.[item.key]);
            compareValue = toNumber(compareMargin?.[item.key]);
          } else {
            currentValue = toNumber(latest?.[item.key]);
            compareValue = toNumber(compare?.[item.key]);
          }
          let chartValues: number[];
          if (isManualKpiKey(item.key)) {
            const key = item.key;
            chartValues = cleanMarginRecords.map(record => toNumber(record[key])).filter((value): value is number => value !== undefined);
          } else {
            const key = item.key;
            chartValues = cleanData.map(point => toNumber(point[key])).filter((value): value is number => value !== undefined);
          }
          const change = currentValue !== undefined && compareValue !== undefined ? currentValue - compareValue : null;
          const changePercent = change !== null && compareValue ? (change / compareValue) * 100 : null;
          const tone = change === null ? 'neutral' : change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

          return (
            <article className="dashboard-v2-kpi" key={item.label}>
              <div className="dashboard-v2-kpi-top">
                <span className="dashboard-v2-kpi-label">{item.label} <InfoTooltip text={item.explanation} /></span>
                <strong>{item.valueFormatter(currentValue)}</strong>
                <div className={`dashboard-v2-kpi-change ${tone}`}>
                  <b>{change === null ? (isManualInput ? '--' : 'No baseline') : item.changeFormatter(change)}</b>
                  <em>{changePercent === null ? '' : `(${signed(changePercent, 2, '%')})`}</em>
                </div>
              </div>
              <Sparkline values={chartValues} tone={item.chartTone} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
