'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';
import {
  customAlertCategories,
  defaultCustomAlertThresholds,
  loadCustomAlertThresholds,
  saveCustomAlertThresholds,
  type AlertOperator,
  type AlertSeverity,
  type CustomAlertThreshold,
} from '@/lib/alerts/customAlertRules';

const operators: AlertOperator[] = ['>', '<', '>=', '<='];
const severities: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];

function cloneDefaults() {
  return defaultCustomAlertThresholds.map(rule => ({ ...rule }));
}

function inputSuffix(rule: CustomAlertThreshold) {
  if (rule.unit === '%') return '%';
  if (rule.unit === '$') return '$';
  if (rule.unit === 'x') return 'x';
  if (rule.unit === 'score') return '/100';
  return 'shares';
}

export function CustomAlertSettingsClient({ ticker }: { ticker: string }) {
  const router = useRouter();
  const [thresholds, setThresholds] = useState<CustomAlertThreshold[]>(cloneDefaults);
  const [savedThresholds, setSavedThresholds] = useState<CustomAlertThreshold[]>(cloneDefaults);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const loaded = loadCustomAlertThresholds(ticker);
    setThresholds(loaded);
    setSavedThresholds(loaded);
  }, [ticker]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const changed = useMemo(
    () => JSON.stringify(thresholds) !== JSON.stringify(savedThresholds),
    [savedThresholds, thresholds],
  );

  function patchRule(id: string, patch: Partial<CustomAlertThreshold>) {
    setThresholds(current => current.map(rule => rule.id === id ? { ...rule, ...patch } : rule));
  }

  function resetRule(id: string) {
    const defaultRule = defaultCustomAlertThresholds.find(rule => rule.id === id);
    if (defaultRule) patchRule(id, { ...defaultRule });
  }

  function resetDefaults() {
    setThresholds(cloneDefaults());
  }

  function save() {
    const saved = saveCustomAlertThresholds(ticker, thresholds);
    setThresholds(saved);
    setSavedThresholds(saved);
    setToast('Alert thresholds saved successfully.');
  }

  function cancel() {
    setThresholds(savedThresholds.map(rule => ({ ...rule })));
    router.push(`/monitor/${ticker}/dashboard`);
  }

  return (
    <div className="page custom-alert-settings-page">
      <div className="custom-alert-settings-header">
        <div>
          <p>Define your own risk limits. Alerts will appear on the dashboard when live values cross your configured thresholds.</p>
        </div>
        <div>
          <Link className="custom-alert-back" href={`/monitor/${ticker}/dashboard`}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            Back to Dashboard
          </Link>
          <button className="button primary" type="button" onClick={save} disabled={!changed}>Save Alert Settings</button>
        </div>
      </div>

      <div className="custom-alert-settings-groups">
        {customAlertCategories.map(category => {
          const categoryRules = thresholds.filter(rule => rule.category === category);
          return (
            <section className="custom-alert-settings-card" key={category}>
              <div className="custom-alert-settings-card__head">
                <div>
                  <span>{categoryRules.filter(rule => rule.enabled).length} active</span>
                  <h2>{category}</h2>
                </div>
              </div>
              <div className="custom-alert-rule-list">
                {categoryRules.map(rule => (
                  <div className={`custom-alert-setting-row ${rule.enabled ? 'enabled' : 'disabled'}`} key={rule.id}>
                    <div className="custom-alert-setting-copy">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rule.enabled}
                        className="custom-alert-toggle"
                        onClick={() => patchRule(rule.id, { enabled: !rule.enabled })}
                      >
                        <span />
                      </button>
                      <div>
                        <strong>{rule.label}</strong>
                        <p>{rule.description}</p>
                      </div>
                    </div>

                    <div className="custom-alert-condition">
                      <label>
                        <span>Operator</span>
                        <select value={rule.operator} disabled={!rule.enabled} onChange={event => patchRule(rule.id, { operator: event.target.value as AlertOperator })}>
                          {operators.map(operator => <option value={operator} key={operator}>{operator}</option>)}
                        </select>
                      </label>
                      <label className="custom-alert-threshold-input">
                        <span>Threshold</span>
                        <div>
                          {rule.unit === '$' ? <i>$</i> : null}
                          <input
                            type="number"
                            min={rule.metric === 'shortScore' ? 0 : undefined}
                            max={rule.metric === 'shortScore' ? 100 : undefined}
                            step={rule.unit === 'shares' || rule.unit === '$' ? 1 : 0.1}
                            value={rule.threshold}
                            disabled={!rule.enabled}
                            onChange={event => patchRule(rule.id, { threshold: Number(event.target.value) })}
                          />
                          {rule.unit !== '$' ? <i>{inputSuffix(rule)}</i> : null}
                        </div>
                      </label>
                      <label>
                        <span>Severity</span>
                        <select value={rule.severity} disabled={!rule.enabled} onChange={event => patchRule(rule.id, { severity: event.target.value as AlertSeverity })}>
                          {severities.map(severity => <option value={severity} key={severity}>{severity[0].toUpperCase() + severity.slice(1)}</option>)}
                        </select>
                      </label>
                      <button className="custom-alert-reset-row" type="button" onClick={() => resetRule(rule.id)} title={`Reset ${rule.label} to default`} aria-label={`Reset ${rule.label} to default`}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg>
                      </button>
                    </div>
                    <small>{rule.helperText}</small>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <PageDisclaimerNotice noticeKey="alert" disclaimerKey="alert" title="Alert Disclaimer" />

      <div className="custom-alert-sticky-actions">
        <div>
          <strong>{thresholds.filter(rule => rule.enabled).length} active thresholds</strong>
          <span>{changed ? 'You have unsaved changes.' : 'All changes are saved locally.'}</span>
        </div>
        <div>
          <button className="button ghost" type="button" onClick={resetDefaults}>Reset Defaults</button>
          <button className="button secondary" type="button" onClick={cancel}>Cancel</button>
          <button className="button primary" type="button" onClick={save} disabled={!changed}>Save Alert Settings</button>
        </div>
      </div>

      {toast ? (
        <div className="custom-alert-toast" role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
