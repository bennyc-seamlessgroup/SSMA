'use client';

import { InfoTooltip } from '@/components/InfoTooltip';
import { ApiSourceTags } from '@/components/ApiSourceTags';
import type { DashboardMarginRecord, DashboardUtilizationRecord } from '@/lib/operations/data-types';
import { useMemo } from 'react';

export type PeriodKey = '1D' | '5D' | '1M' | '3M' | '1Y' | 'YTD';

type TrendPoint = {
  date: string;
  feeRate: number | null;
  shortableShares: number | null;
  daysToCover: number | null;
  utilization: number | null;
};

type ManualKpiKey = 'initialMargin' | 'maintenanceMargin' | 'averageDurationDays' | 'utilization';
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

export const dashboardPeriods: PeriodKey[] = ['1D', '5D', '1M', '3M', '1Y', 'YTD'];

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

function recordsWithMetric<T extends { date: string }, K extends keyof T>(records: T[], key: K) {
  return records.filter(record => toNumber(record[key]) !== undefined);
}

function latestMetricRecord<T extends { date: string }, K extends keyof T>(records: T[], key: K) {
  return recordsWithMetric(records, key).at(-1) ?? null;
}

function comparisonMetricRecord<T extends { date: string }, K extends keyof T>(records: T[], key: K, period: PeriodKey) {
  const populated = recordsWithMetric(records, key);
  const latest = populated[populated.length - 1];
  if (!latest) return null;
  const target = targetDate(parseDate(latest.date), period);

  if (period === 'YTD') {
    return populated.find(record => parseDate(record.date) >= target && record.date !== latest.date) ?? null;
  }

  return [...populated].reverse().find(record => record.date !== latest.date && parseDate(record.date) <= target) ?? null;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isManualKpiKey(key: KpiConfig['key']): key is ManualKpiKey {
  return key === 'initialMargin' || key === 'maintenanceMargin' || key === 'averageDurationDays' || key === 'utilization';
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
  const { line, area } = sparklinePath(compactValues, 320, 40, 4);
  const isEmpty = compactValues.length < 2 || !line;

  return (
    <div className={`dashboard-kpi-spark dashboard-kpi-spark--${tone}`} aria-hidden="true">
      {isEmpty ? (
        <span />
      ) : (
        <svg viewBox="0 0 320 40" preserveAspectRatio="none" focusable="false">
          <path className="dashboard-kpi-spark-area" d={area} />
          <path className="dashboard-kpi-spark-line" d={line} />
        </svg>
      )}
    </div>
  );
}

export function DashboardKpis({
  data,
  period,
  onPeriodChange,
  utilizationRecords,
  marginRecords,
}: {
  data: TrendPoint[];
  period: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
  utilizationRecords: DashboardUtilizationRecord[];
  marginRecords: DashboardMarginRecord[];
}) {
  const cleanData = useMemo(() => data.filter(point => point?.date).sort((a, b) => a.date.localeCompare(b.date)), [data]);
  const cleanUtilizationRecords = useMemo(() => [...utilizationRecords].filter(record => record.date).sort((a, b) => a.date.localeCompare(b.date)), [utilizationRecords]);
  const cleanMarginRecords = useMemo(() => [...marginRecords].filter(record => record.date).sort((a, b) => a.date.localeCompare(b.date)), [marginRecords]);

  return (
    <section className="dashboard-kpi-block" aria-label="Borrow market KPIs">
      <div className="dashboard-kpi-toolbar">
        <h2>Market Overview</h2>
        <ApiSourceTags sources={[
          { endpoint: 'GET /market-data/current?category=market-current', label: 'Current KPIs' },
          { endpoint: 'GET /market-data/history?category=market-history', label: 'Comparisons' },
          { endpoint: 'GET /manual-input/utilization', label: 'Utilization' },
          { endpoint: 'GET /manual-input/margins', label: 'Margins & duration' },
          { endpoint: 'GET /manual-input/manual-availability', label: 'Broker availability' },
        ]} />
        <div className="dashboard-period-control" aria-label="Overview comparison period">
          {dashboardPeriods.map(item => (
            <button
              type="button"
              key={item}
              className={period === item ? 'active' : ''}
              onClick={() => onPeriodChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="dashboard-kpis">
        {kpis.map(item => {
          const isManualInput = isManualKpiKey(item.key);
          let currentValue: number | undefined;
          let compareValue: number | undefined;
          if (item.key === 'utilization') {
            const latestUtilization = latestMetricRecord(cleanUtilizationRecords, 'utilization');
            const compareUtilization = comparisonMetricRecord(cleanUtilizationRecords, 'utilization', period);
            currentValue = toNumber(latestUtilization?.utilization);
            compareValue = toNumber(compareUtilization?.utilization);
          } else if (isManualKpiKey(item.key)) {
            const latestMargin = latestMetricRecord(cleanMarginRecords, item.key);
            const compareMargin = comparisonMetricRecord(cleanMarginRecords, item.key, period);
            currentValue = toNumber(latestMargin?.[item.key]);
            compareValue = toNumber(compareMargin?.[item.key]);
          } else {
            const latest = latestMetricRecord(cleanData, item.key);
            const compare = comparisonMetricRecord(cleanData, item.key, period);
            currentValue = toNumber(latest?.[item.key]);
            compareValue = toNumber(compare?.[item.key]);
          }
          let chartValues: number[];
          if (item.key === 'utilization') {
            chartValues = cleanUtilizationRecords.map(record => toNumber(record.utilization)).filter((value): value is number => value !== undefined);
          } else if (isManualKpiKey(item.key)) {
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
            <article className="dashboard-kpi" key={item.label}>
              <div className="dashboard-kpi-top">
                <span className="dashboard-kpi-label">{item.label} <InfoTooltip text={item.explanation} /></span>
                <strong>{item.valueFormatter(currentValue)}</strong>
                <div className={`dashboard-kpi-change ${tone}`}>
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
