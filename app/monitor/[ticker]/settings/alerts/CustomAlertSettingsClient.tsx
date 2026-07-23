'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { ApiDevelopmentTabs } from '@/components/ApiDevelopmentTabs';
import { ApiSourceTags } from '@/components/ApiSourceTags';
import {
  loadAlertRuleData,
  saveAlertRuleSettings,
  type AlertOperator,
  type AlertSeverity,
  type AlertRuleSetting,
} from '@/lib/alerts/ruleCatalogApi';

const operators: AlertOperator[] = ['>', '<', '>=', '<='];
const severities: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];

function inputSuffix(rule: AlertRuleSetting) {
  if (rule.unit === '%') return '%';
  if (rule.unit === '$') return '$';
  if (rule.unit === 'x') return 'x';
  if (rule.unit === 'score') return '/100';
  return 'shares';
}

function formattedThreshold(rule: AlertRuleSetting) {
  return rule.threshold.toLocaleString('en-US', {
    useGrouping: rule.unit === 'shares' || rule.unit === '$',
    minimumFractionDigits: 0,
    maximumFractionDigits: rule.unit === 'shares' || rule.unit === '$' ? 0 : 2,
  });
}

export function CustomAlertSettingsClient({ ticker }: { ticker: string }) {
  const router = useRouter();
  const [thresholds, setThresholds] = useState<AlertRuleSetting[]>([]);
  const [savedThresholds, setSavedThresholds] = useState<AlertRuleSetting[]>([]);
  const [toast, setToast] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [thresholdDrafts, setThresholdDrafts] = useState<Record<string, string>>({});
  const [developmentData, setDevelopmentData] = useState<{
    catalog: unknown;
    settings: unknown;
  }>({ catalog: null, settings: null });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const data = await loadAlertRuleData(ticker);
        if (!cancelled) {
          setThresholds(data.rules);
          setSavedThresholds(data.rules);
          setThresholdDrafts({});
          setDevelopmentData({
            catalog: data.catalogPayload,
            settings: data.settingsPayload,
          });
        }
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Unable to load alert rules.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
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

  const categories = useMemo(
    () => Array.from(new Set(thresholds.map(rule => rule.category))),
    [thresholds],
  );

  function patchRule(id: string, patch: Partial<AlertRuleSetting>) {
    setThresholds(current => current.map(rule => rule.id === id ? { ...rule, ...patch } : rule));
  }

  function resetRule(id: string) {
    const rule = thresholds.find(item => item.id === id);
    if (rule) patchRule(id, {
      operator: rule.defaultOperator,
      threshold: rule.defaultThreshold,
      severity: rule.defaultSeverity,
    });
  }

  function resetDefaults() {
    setThresholds(current => current.map(rule => ({
      ...rule,
      operator: rule.defaultOperator,
      threshold: rule.defaultThreshold,
      severity: rule.defaultSeverity,
    })));
  }

  async function save() {
    setSaving(true);
    setLoadError('');
    try {
      await saveAlertRuleSettings(ticker, thresholds);
      const data = await loadAlertRuleData(ticker);
      setThresholds(data.rules);
      setSavedThresholds(data.rules);
      setThresholdDrafts({});
      setDevelopmentData({
        catalog: data.catalogPayload,
        settings: data.settingsPayload,
      });
      setToast('Alert thresholds saved successfully.');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to save alert rules.');
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setThresholds(savedThresholds.map(rule => ({ ...rule })));
    router.push(`/monitor/${ticker}/dashboard`);
  }

  function commitThreshold(rule: AlertRuleSetting) {
    const draft = thresholdDrafts[rule.id];
    const parsed = Number(String(draft ?? rule.threshold).replace(/,/g, ''));
    if (Number.isFinite(parsed)) {
      patchRule(rule.id, {
        threshold: rule.unit === 'score'
          ? Math.min(100, Math.max(0, parsed))
          : parsed,
      });
    }
    setThresholdDrafts(current => {
      const next = { ...current };
      delete next[rule.id];
      return next;
    });
  }

  if (loading) return <PortalPageLoading variant="alertRules" />;

  return (
    <div className="page custom-alert-settings-page">
      {loadError ? <div className="panel import-data-error">{loadError}</div> : null}
      <div className="custom-alert-settings-header">
        <div>
          <p>Define your own risk limits. Alerts will appear on the dashboard when live values cross your configured thresholds.</p>
          <ApiSourceTags sources={[
            { endpoint: 'GET /rule-catalog', label: 'Available alert rules' },
            { endpoint: 'GET /rule-catalog/user-settings', label: 'Your rule settings' },
            { endpoint: 'POST /rule-catalog/user-settings', label: 'Save settings' },
          ]} />
        </div>
        <div>
          <Link className="custom-alert-back" href={`/monitor/${ticker}/dashboard`}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            Back to Dashboard
          </Link>
          <button className="button primary" type="button" onClick={() => void save()} disabled={!changed || saving}>{saving ? 'Saving...' : 'Save Alert Settings'}</button>
        </div>
      </div>

      <div className="custom-alert-settings-groups">
        {categories.map(category => {
          const categoryRules = thresholds.filter(rule => rule.category === category);
          return (
            <section className="custom-alert-settings-card" key={category}>
              <div className="custom-alert-settings-card__head">
                <div>
                  <span>{categoryRules.filter(rule => rule.enabled).length} active</span>
                  <h2>{category}</h2>
                </div>
                <ApiSourceTags sources={[
                  { endpoint: 'GET /rule-catalog', label: 'Rule definitions' },
                  { endpoint: 'GET /rule-catalog/user-settings', label: 'Rule values' },
                ]} />
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
                            type="text"
                            inputMode={rule.unit === 'shares' || rule.unit === '$' ? 'numeric' : 'decimal'}
                            value={thresholdDrafts[rule.id] ?? formattedThreshold(rule)}
                            disabled={!rule.enabled}
                            onFocus={() => setThresholdDrafts(current => ({
                              ...current,
                              [rule.id]: String(rule.threshold),
                            }))}
                            onChange={event => {
                              const draft = event.target.value;
                              setThresholdDrafts(current => ({
                                ...current,
                                [rule.id]: draft,
                              }));
                              const parsed = Number(draft.replace(/,/g, ''));
                              if (draft.trim() && draft !== '-' && Number.isFinite(parsed)) {
                                patchRule(rule.id, {
                                  threshold: rule.unit === 'score'
                                    ? Math.min(100, Math.max(0, parsed))
                                    : parsed,
                                });
                              }
                            }}
                            onBlur={() => commitThreshold(rule)}
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
                    {rule.helperText && rule.helperText !== rule.description
                      ? <small>{rule.helperText}</small>
                      : null}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <section className="panel dev-only import-data-dev-panel">
        <div className="narrative-section-head">
          <div>
            <h2>Development Data</h2>
            <p>Live rule-catalog payloads used by this Alert Rules page.</p>
          </div>
          <ApiSourceTags sources={[
            { endpoint: 'GET /rule-catalog', label: 'Catalog' },
            { endpoint: 'GET /rule-catalog/user-settings', label: 'User settings' },
          ]} />
        </div>
        <ApiDevelopmentTabs sources={[
          {
            id: 'rule-catalog',
            title: 'Rule Catalog',
            endpoint: 'GET /rule-catalog',
            source: 'Rule Catalog API',
            payload: developmentData.catalog,
          },
          {
            id: 'rule-user-settings',
            title: 'User Settings',
            endpoint: `GET /rule-catalog/user-settings?ticker=${ticker}`,
            source: 'Rule Catalog API',
            payload: developmentData.settings,
          },
          {
            id: 'merged-alert-rules',
            title: 'Merged Rules',
            endpoint: 'GET /rule-catalog + GET /rule-catalog/user-settings',
            source: 'Frontend API mapping',
            payload: thresholds,
          },
        ]} />
      </section>

      <PageDisclaimerNotice noticeKey="alert" disclaimerKey="alert" title="Alert Disclaimer" />

      <div className="custom-alert-sticky-actions">
        <div>
          <strong>{thresholds.filter(rule => rule.enabled).length} active thresholds</strong>
          <span>{changed ? 'You have unsaved changes.' : 'All changes are saved to your account.'}</span>
        </div>
        <div>
          <button className="button ghost" type="button" onClick={resetDefaults}>Reset Defaults</button>
          <button className="button secondary" type="button" onClick={cancel}>Cancel</button>
          <button className="button primary" type="button" onClick={() => void save()} disabled={!changed || saving}>{saving ? 'Saving...' : 'Save Alert Settings'}</button>
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
