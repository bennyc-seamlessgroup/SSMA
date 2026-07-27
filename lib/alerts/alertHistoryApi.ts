import { cachedAuthenticatedFetch } from '@/lib/auth-client';

export type AlertHistoryRecord = {
  alertId: string;
  userId: string;
  ruleId: string;
  catalogId: string;
  ticker: string;
  formula: string;
  severity: string;
  triggeredValue: number | string | null;
  createDatetime: string;
};

type AlertHistoryResponse = {
  alerts?: unknown;
  count?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown) {
  return value == null ? '' : String(value).trim();
}

function normalizeAlert(value: unknown): AlertHistoryRecord | null {
  if (!isRecord(value)) return null;
  const alertId = text(value.alertId);
  const ticker = text(value.ticker).toUpperCase();
  const formula = text(value.formula);
  const createDatetime = text(value.createDatetime);
  if (!alertId || !ticker || !formula || !createDatetime || Number.isNaN(new Date(createDatetime).getTime())) return null;

  return {
    alertId,
    userId: text(value.userId),
    ruleId: text(value.ruleId),
    catalogId: text(value.catalogId),
    ticker,
    formula,
    severity: text(value.severity),
    triggeredValue: typeof value.triggeredValue === 'number' || typeof value.triggeredValue === 'string'
      ? value.triggeredValue
      : null,
    createDatetime,
  };
}

export async function fetchAlertHistory(ticker: string, limit = 100) {
  const normalizedTicker = ticker.trim().toUpperCase();
  const endpoint = `/alerts?ticker=${encodeURIComponent(normalizedTicker)}&limit=${Math.min(100, Math.max(1, limit))}`;
  const payload = await cachedAuthenticatedFetch<AlertHistoryResponse>(endpoint, {}, 5 * 60 * 1000);
  const source = Array.isArray(payload?.alerts) ? payload.alerts : [];
  return source
    .map(normalizeAlert)
    .filter((alert): alert is AlertHistoryRecord => Boolean(alert))
    .sort((left, right) => new Date(right.createDatetime).getTime() - new Date(left.createDatetime).getTime());
}
