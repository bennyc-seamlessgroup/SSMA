'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  customAlertStorageKey,
  customAlertUpdatedEvent,
  evaluateCustomAlerts,
  loadCustomAlertThresholds,
  type AlertUnit,
  type AlertSeverity,
  type CustomAlertThreshold,
  type CustomAlertValues,
} from '@/lib/alerts/customAlertRules';

type TrendPoint = {
  date: string;
  price: number | null;
  feeRate: number | null;
  tradeVolume: number | null;
  shortableShares: number | null;
  daysToCover: number | null;
  utilization: number | null;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numeric(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[$,%x,]/gi, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function latestValue<T>(rows: TrendPoint[], pick: (row: TrendPoint) => T | null) {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const value = pick(rows[index]);
    if (value !== null && value !== undefined) return value;
  }
  return undefined;
}

function dashboardAlertValues(data: TrendPoint[], current: Record<string, unknown> | null): CustomAlertValues {
  const currentRow = current ?? {};
  const sourceRecords = record(currentRow.sourceRecords);
  const shortInterest = record(sourceRecords.shortInterest);
  const shortScore = record(sourceRecords.shortScore);
  const closingPrices = record(sourceRecords.closingPrices);
  const ftd = record(sourceRecords.ftd);
  const validPrices = data.filter(row => typeof row.price === 'number' && Number.isFinite(row.price));
  const latestPrice = validPrices.at(-1)?.price;
  const previousPrice = validPrices.at(-2)?.price;
  const priceDrawdown = typeof latestPrice === 'number' && typeof previousPrice === 'number' && previousPrice !== 0
    ? ((latestPrice - previousPrice) / previousPrice) * 100
    : undefined;
  const validVolumes = data.filter(row => typeof row.tradeVolume === 'number' && row.tradeVolume > 0);
  const latestVolume = validVolumes.at(-1)?.tradeVolume;
  const comparisonVolumes = validVolumes.slice(-21, -1).map(row => row.tradeVolume as number);
  const averageVolume = comparisonVolumes.length
    ? comparisonVolumes.reduce((sum, value) => sum + value, 0) / comparisonVolumes.length
    : undefined;
  const volumeSpike = typeof latestVolume === 'number' && averageVolume ? latestVolume / averageVolume : undefined;
  const open = numeric(closingPrices.open, currentRow.open);
  const high = numeric(closingPrices.high, currentRow.high);
  const intradayPriceSpike = open && high !== undefined ? ((high - open) / open) * 100 : undefined;

  return {
    shortInterestFloatPercent: numeric(currentRow.shortInterestPcFreeFloat, shortInterest.shortInterestPcFreeFloat),
    dailyShortVolumeRatio: numeric(currentRow.dailyShortVolumeRatio, currentRow.shortVolumeRatio, sourceRecords.shortVolumeRatio),
    shortScore: numeric(currentRow.shortScore, shortScore.score),
    borrowFeeRate: numeric(currentRow.borrowFee, currentRow.feeRate, latestValue(data, row => row.feeRate)),
    utilization: numeric(currentRow.utilization, latestValue(data, row => row.utilization)),
    availableShares: numeric(currentRow.availableShares, currentRow.shortAvailabilityShares, latestValue(data, row => row.shortableShares)),
    onLoanShares: numeric(currentRow.onLoanShares, currentRow.sharesOnLoan, sourceRecords.onLoanShares),
    ftdCount: numeric(currentRow.ftdCount, currentRow.ftdShares, ftd.ftdShares),
    ftdValue: numeric(currentRow.ftdValue, currentRow.ftdValueUsd, ftd.ftdValue),
    priceDrawdown,
    volumeSpike,
    intradayPriceSpike: numeric(currentRow.intradayPriceSpike, intradayPriceSpike),
  };
}

function compact(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
}

function formatAlertValue(value: number, unit: AlertUnit) {
  if (unit === '$') return `$${compact(value)}`;
  if (unit === 'shares') return compact(value);
  if (unit === '%') return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
  if (unit === 'x') return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}x`;
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

const alertSeverities: Array<{ severity: AlertSeverity; label: string }> = [
  { severity: 'critical', label: 'Critical' },
  { severity: 'high', label: 'High' },
  { severity: 'medium', label: 'Medium' },
  { severity: 'low', label: 'Low' },
];

export function CustomAlertCenter({
  ticker,
  data,
  current,
}: {
  ticker: string;
  data: TrendPoint[];
  current: Record<string, unknown> | null;
}) {
  const [thresholds, setThresholds] = useState<CustomAlertThreshold[]>([]);

  useEffect(() => {
    const load = () => {
      setThresholds(loadCustomAlertThresholds(ticker));
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === customAlertStorageKey(ticker)) load();
    };
    load();
    window.addEventListener(customAlertUpdatedEvent, load);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(customAlertUpdatedEvent, load);
      window.removeEventListener('storage', handleStorage);
    };
  }, [ticker]);

  const values = useMemo(() => dashboardAlertValues(data, current), [current, data]);
  const triggered = useMemo(() => evaluateCustomAlerts(values, thresholds), [thresholds, values]);
  const severityCounts = useMemo(
    () => triggered.reduce<Record<AlertSeverity, number>>(
      (counts, alert) => {
        counts[alert.severity] += 1;
        return counts;
      },
      { critical: 0, high: 0, medium: 0, low: 0 },
    ),
    [triggered],
  );
  const settingsHref = `/monitor/${ticker}/alert-rules`;

  return (
    <section className="dashboard-custom-alerts">
      <div className="dashboard-custom-alerts__head">
        <div className="dashboard-custom-alerts__title">
          <h2>Alert Center</h2>
          {triggered.length ? (
            <div className="custom-alert-severity-summary" aria-label={`${triggered.length} triggered alerts`}>
              {alertSeverities
                .filter(({ severity }) => severityCounts[severity] > 0)
                .map(({ severity, label }) => (
                  <div className={`custom-alert-severity-chip ${severity}`} key={severity}>
                    <strong>{label}</strong>
                    <b>{severityCounts[severity]}</b>
                  </div>
                ))}
            </div>
          ) : null}
        </div>
        <Link className="custom-alert-configure" href={settingsHref as any}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M14 4v6M4 17h2M10 17h10M6 14v6" /></svg>
          Configure Alerts
        </Link>
      </div>

      {triggered.length ? (
        <div className="custom-alert-triggered-list">
          {triggered.map(alert => (
            <div className={`custom-alert-row ${alert.severity}`} key={alert.id}>
              <svg className="custom-alert-row__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3 2.8 20h18.4L12 3Z" />
                <path d="M12 9v5M12 17.2v.1" />
              </svg>
              <strong>{alert.label}</strong>
              <span className="custom-alert-row__value">{formatAlertValue(alert.currentValue, alert.unit)}</span>
              <span className="custom-alert-row__threshold">
                Threshold <b>{alert.operator} {formatAlertValue(alert.threshold, alert.unit)}</b>
              </span>
              <p>{alert.message}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="custom-alert-empty">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 1-3-6.2M9 11l2 2 5-6" /></svg>
          <div>
            <strong>No alerts triggered</strong>
            <p>You are all clear. Alerts will appear here when a configured threshold is breached.</p>
          </div>
        </div>
      )}
    </section>
  );
}
