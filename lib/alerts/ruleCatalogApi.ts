'use client';

import { authenticatedFetch } from '@/lib/auth-client';

export type AlertOperator = '>' | '<' | '>=' | '<=';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertUnit = '%' | 'shares' | '$' | 'x' | 'score';

export type RuleCatalogItem = {
  catalogId: string;
  section: string;
  monitorField: string;
  description: string;
  s3Path: string;
  jsonPath: string;
  unit: AlertUnit;
  defaultOperator: AlertOperator;
  defaultThreshold: number;
  defaultSeverity: AlertSeverity;
};

export type AlertRuleSetting = {
  id: string;
  catalogId: string;
  persisted: boolean;
  label: string;
  category: string;
  enabled: boolean;
  operator: AlertOperator;
  threshold: number;
  unit: AlertUnit;
  severity: AlertSeverity;
  description: string;
  helperText: string;
  message: string;
  jsonPath: string;
  targetFile: string;
  formula: string;
  defaultOperator: AlertOperator;
  defaultThreshold: number;
  defaultSeverity: AlertSeverity;
};

export type TriggeredApiAlert = {
  id: string;
  label: string;
  category: string;
  severity: AlertSeverity;
  currentValue: number | null;
  threshold: number;
  operator: AlertOperator;
  unit: AlertUnit;
  message: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function parsedPayload(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function arrayPayload(value: unknown, depth = 0): unknown[] {
  const parsed = parsedPayload(value);
  if (Array.isArray(parsed)) return parsed;
  if (depth > 3) return [];
  const root = record(parsed);
  const collectionKeys = [
    'data',
    'items',
    'records',
    'settings',
    'rules',
    'ruleSettings',
    'rule_settings',
    'userSettings',
    'user_settings',
    'body',
  ];
  for (const key of collectionKeys) {
    if (!(key in root)) continue;
    const nested = arrayPayload(root[key], depth + 1);
    if (nested.length) return nested;
    if (Array.isArray(parsedPayload(root[key]))) return [];
  }

  const values = Object.values(root);
  if (values.length && values.every(item => {
    const row = record(item);
    return Boolean(row.catalogId ?? row.catalog_id ?? row.ruleId ?? row.rule_id);
  })) {
    return values;
  }

  return [];
}

function text(value: unknown) {
  return value == null ? '' : String(value).trim();
}

function number(value: unknown, fallback = 0) {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function operator(value: unknown, fallback: AlertOperator = '>'): AlertOperator {
  const normalized = text(value);
  return ['>', '<', '>=', '<='].includes(normalized) ? normalized as AlertOperator : fallback;
}

function severity(value: unknown, fallback: AlertSeverity = 'medium'): AlertSeverity {
  const normalized = text(value).toLowerCase();
  return ['low', 'medium', 'high', 'critical'].includes(normalized)
    ? normalized as AlertSeverity
    : fallback;
}

function unit(value: unknown): AlertUnit {
  const normalized = text(value).toLowerCase();
  if (normalized === '$' || normalized === 'usd') return '$';
  if (normalized === 'shares' || normalized === 'share') return 'shares';
  if (normalized === 'x' || normalized === 'multiple') return 'x';
  if (normalized === 'score' || normalized === '/100') return 'score';
  return '%';
}

function normalizeCatalogItem(value: unknown): RuleCatalogItem | null {
  const row = record(value);
  const catalogId = text(row.catalogId ?? row.catalog_id);
  if (!catalogId) return null;
  return {
    catalogId,
    section: text(row.section) || 'Other',
    monitorField: text(row.monitorField ?? row.monitor_field) || catalogId,
    description: text(row.description),
    s3Path: text(row.s3Path ?? row.s3_path),
    jsonPath: text(row.jsonPath ?? row.json_path),
    unit: unit(row.unit),
    defaultOperator: operator(row.defaultOperator ?? row.default_operator),
    defaultThreshold: number(row.defaultThreshold ?? row.default_threshold),
    defaultSeverity: severity(row.defaultSeverity ?? row.default_severity),
  };
}

const preferredCatalogIds = new Set([
  'short-selling-pressure-short-interest-float-percent',
  'short-selling-pressure-daily-short-volume-ratio',
  'short-selling-pressure-short-score',
  'lending-borrowing-pressure-borrow-fee-rate',
  'lending-borrowing-pressure-utilization',
  'lending-borrowing-pressure-shortable-shares',
  'settlement-ftd-risk-ftd-count',
  'settlement-ftd-risk-ftd-value',
  'market-movement-price-drawdown',
  'market-movement-volume-spike',
  'market-movement-intraday-price-spike',
]);

const catalogMetricAliases: Record<string, string> = {
  availableshares: 'available-shares',
  shortableshares: 'available-shares',
  shortavailabilityshares: 'available-shares',
  borrowfee: 'borrow-fee-rate',
  borrowfeerate: 'borrow-fee-rate',
  dailyshortvolumeratio: 'daily-short-volume-ratio',
  shortvolumeratio: 'daily-short-volume-ratio',
  ftdcount: 'ftd-count',
  ftdshares: 'ftd-count',
  ftdvalue: 'ftd-value',
  ftdvalueusd: 'ftd-value',
  intradaypricespike: 'intraday-price-spike',
  pricedrawdown: 'price-drawdown',
  shortinterestfloat: 'short-interest-float-percent',
  shortinterestfloatpercent: 'short-interest-float-percent',
  shortinterestpcfreefloat: 'short-interest-float-percent',
  shortscore: 'short-score',
  utilization: 'utilization',
  volumespike: 'volume-spike',
};

function normalizedMetricName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function catalogMetricKey(item: RuleCatalogItem) {
  const pathLeaf = item.jsonPath.split('.').at(-1) ?? '';
  const pathKey = catalogMetricAliases[normalizedMetricName(pathLeaf)];
  const labelKey = catalogMetricAliases[normalizedMetricName(item.monitorField)];
  return pathKey || labelKey || item.catalogId;
}

function deduplicateCatalog(items: RuleCatalogItem[]) {
  const groups = new Map<string, RuleCatalogItem[]>();
  items.forEach(item => {
    const key = catalogMetricKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });

  return Array.from(groups.values()).map(group => (
    group.find(item => preferredCatalogIds.has(item.catalogId)) ?? group[0]
  ));
}

function settingByCatalogId(value: unknown) {
  return new Map(arrayPayload(value).map(item => {
    const row = record(item);
    const ruleId = text(row.ruleId ?? row.rule_id);
    const catalogId = text(row.catalogId ?? row.catalog_id)
      || (ruleId.startsWith('CATALOG__') ? ruleId.slice('CATALOG__'.length) : '');
    return [catalogId, row] as const;
  }).filter(([catalogId]) => Boolean(catalogId)));
}

function catalogIdFromSetting(setting: Record<string, unknown> | undefined) {
  if (!setting) return '';
  const ruleId = text(setting.ruleId ?? setting.rule_id);
  return text(setting.catalogId ?? setting.catalog_id)
    || (ruleId.startsWith('CATALOG__') ? ruleId.slice('CATALOG__'.length) : '');
}

function settingEnabled(setting: Record<string, unknown> | undefined): boolean | null {
  if (!setting) return null;
  const value = setting.active
    ?? setting.isActive
    ?? setting.is_active
    ?? setting.enabled
    ?? setting.isEnabled
    ?? setting.is_enabled
    ?? setting.status
    ?? setting.ruleStatus
    ?? setting.rule_status;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = text(value).toUpperCase();
  if (['ACTIVE', 'ENABLED', 'ON', 'TRUE', '1'].includes(normalized)) return true;
  if (['INACTIVE', 'DISABLED', 'OFF', 'FALSE', '0'].includes(normalized)) return false;
  return null;
}

export async function loadAlertRuleData(ticker: string) {
  const normalizedTicker = ticker.toUpperCase();
  const [catalogPayload, settingsPayload] = await Promise.all([
    authenticatedFetch('/rule-catalog', { cache: 'no-store' }),
    authenticatedFetch(`/rule-catalog/user-settings?ticker=${encodeURIComponent(normalizedTicker)}`, { cache: 'no-store' }),
  ]);
  const catalogCandidates = arrayPayload(catalogPayload)
    .map(normalizeCatalogItem)
    .filter((item): item is RuleCatalogItem => Boolean(item));
  const catalog = deduplicateCatalog(catalogCandidates);
  const saved = settingByCatalogId(settingsPayload);

  const rules = catalog.map(item => {
    const matchingSettings = [
      saved.get(item.catalogId),
      ...catalogCandidates
        .filter(candidate => catalogMetricKey(candidate) === catalogMetricKey(item))
        .map(candidate => saved.get(candidate.catalogId)),
    ].filter((candidate): candidate is Record<string, unknown> => Boolean(candidate));
    const setting = matchingSettings.find(candidate => settingEnabled(candidate) === true)
      ?? saved.get(item.catalogId)
      ?? matchingSettings[0];
    const enabled = matchingSettings.some(candidate => settingEnabled(candidate) === true)
      || (matchingSettings.length > 0 && matchingSettings.every(candidate => settingEnabled(candidate) === null));
    const activeOperator = operator(setting?.operator, item.defaultOperator);
    const activeThreshold = number(setting?.threshold, item.defaultThreshold);
    const activeSeverity = severity(setting?.severity, item.defaultSeverity);
    const targetFile = text(setting?.targetFile ?? setting?.target_file)
      || item.s3Path.replaceAll('{ticker}', normalizedTicker);
    const formula = text(setting?.formula)
      || `${item.jsonPath} ${activeOperator} ${activeThreshold}`;
    return {
      id: item.catalogId,
      catalogId: catalogIdFromSetting(setting) || item.catalogId,
      persisted: matchingSettings.length > 0,
      label: item.monitorField,
      category: item.section,
      enabled,
      operator: activeOperator,
      threshold: activeThreshold,
      unit: item.unit,
      severity: activeSeverity,
      description: item.description,
      helperText: '',
      message: item.description || `${item.monitorField} crossed the configured threshold.`,
      jsonPath: item.jsonPath,
      targetFile,
      formula,
      defaultOperator: item.defaultOperator,
      defaultThreshold: item.defaultThreshold,
      defaultSeverity: item.defaultSeverity,
    };
  });
  return { rules, catalogPayload, settingsPayload };
}

export async function loadAlertRuleSettings(ticker: string): Promise<AlertRuleSetting[]> {
  const data = await loadAlertRuleData(ticker);
  return data.rules;
}

export async function saveAlertRuleSettings(ticker: string, rules: AlertRuleSetting[]) {
  const settings = rules
    .filter(rule => rule.persisted || rule.enabled)
    .map(rule => ({
      catalogId: rule.catalogId,
      active: rule.enabled,
      operator: rule.operator,
      threshold: rule.threshold,
      severity: rule.severity[0].toUpperCase() + rule.severity.slice(1),
    }));

  return authenticatedFetch(
    `/rule-catalog/user-settings?ticker=${encodeURIComponent(ticker.toUpperCase())}`,
    {
      method: 'POST',
      body: JSON.stringify({
        settings,
      }),
    },
  );
}

export async function evaluateAlertRule(rule: AlertRuleSetting): Promise<TriggeredApiAlert | null> {
  const payload = await authenticatedFetch('/rule-engine/check', {
    method: 'POST',
    body: JSON.stringify({
      formula: rule.formula || `${rule.jsonPath} ${rule.operator} ${rule.threshold}`,
      s3_path: rule.targetFile,
      ruleId: `CATALOG__${rule.catalogId}`,
    }),
  });
  const result = record(payload);
  const triggered = result.pass === true || result.result === true;
  if (!triggered) return null;
  const rawValue = result.currentValue ?? result.current_value ?? result.actualValue ?? result.actual_value ?? result.value;
  const currentValue = rawValue == null ? null : number(rawValue, Number.NaN);
  return {
    id: rule.id,
    label: rule.label,
    category: rule.category,
    severity: rule.severity,
    currentValue: Number.isFinite(currentValue) ? currentValue : null,
    threshold: rule.threshold,
    operator: rule.operator,
    unit: rule.unit,
    message: rule.message,
  };
}
