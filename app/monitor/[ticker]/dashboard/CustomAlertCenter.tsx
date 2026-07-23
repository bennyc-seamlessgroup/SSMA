'use client';

import { ApiSourceTags } from '@/components/ApiSourceTags';
import {
  evaluateAlertRule,
  loadAlertRuleSettings,
  type AlertSeverity,
  type AlertUnit,
  type TriggeredApiAlert,
} from '@/lib/alerts/ruleCatalogApi';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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

const severityRank: Record<AlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const alertSeverities: Array<{ severity: AlertSeverity; label: string }> = [
  { severity: 'critical', label: 'Critical' },
  { severity: 'high', label: 'High' },
  { severity: 'medium', label: 'Medium' },
  { severity: 'low', label: 'Low' },
];

export function CustomAlertCenter({ ticker }: { ticker: string }) {
  const [triggered, setTriggered] = useState<TriggeredApiAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const rules = await loadAlertRuleSettings(ticker);
        const results = await Promise.allSettled(
          rules.filter(rule => rule.enabled).map(rule => evaluateAlertRule(rule)),
        );
        if (cancelled) return;
        const alerts = results
          .filter((result): result is PromiseFulfilledResult<TriggeredApiAlert | null> => result.status === 'fulfilled')
          .map(result => result.value)
          .filter((alert): alert is TriggeredApiAlert => Boolean(alert))
          .sort((left, right) => severityRank[right.severity] - severityRank[left.severity]);
        setTriggered(alerts);
        if (results.some(result => result.status === 'rejected')) {
          setLoadError('Some alert rules could not be evaluated.');
        }
      } catch (error) {
        if (!cancelled) {
          setTriggered([]);
          setLoadError(error instanceof Error ? error.message : 'Unable to evaluate alert rules.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ticker]);

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
        <ApiSourceTags sources={[
          { endpoint: 'GET /rule-catalog', label: 'Alert definitions' },
          { endpoint: 'GET /rule-catalog/user-settings', label: 'Configured alert rules' },
          { endpoint: 'POST /rule-engine/check', label: 'Backend rule evaluation' },
        ]} />
        <Link className="custom-alert-configure" href={settingsHref as any}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M14 4v6M4 17h2M10 17h10M6 14v6" /></svg>
          Configure Alerts
        </Link>
      </div>

      {loadError ? <div className="narrative-api-error">{loadError}</div> : null}

      {loading ? (
        <div className="custom-alert-empty">
          <div>
            <strong>Evaluating alert rules…</strong>
            <p>The backend rule engine is checking your active rules.</p>
          </div>
        </div>
      ) : triggered.length ? (
        <div className="custom-alert-triggered-list">
          {triggered.map(alert => (
            <div className={`custom-alert-row ${alert.severity}`} key={alert.id}>
              <svg className="custom-alert-row__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3 2.8 20h18.4L12 3Z" />
                <path d="M12 9v5M12 17.2v.1" />
              </svg>
              <strong>{alert.label}</strong>
              <span className="custom-alert-row__value">
                {alert.currentValue === null ? 'Triggered' : formatAlertValue(alert.currentValue, alert.unit)}
              </span>
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
            <p>The backend rule engine found no active threshold breaches.</p>
          </div>
        </div>
      )}
    </section>
  );
}
