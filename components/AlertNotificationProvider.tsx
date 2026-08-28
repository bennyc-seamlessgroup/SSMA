'use client';

import { getStoredTokens } from '@/lib/auth-client';
import { fetchAlertHistory } from '@/lib/alerts/alertHistoryApi';
import { ymdInPortalTimeZone } from '@/lib/timezone';
import { usePortalTimeZone } from '@/components/usePortalTimeZone';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type LiveAlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export type LiveAlertNotification = {
  id: string;
  alertId?: string;
  ruleId?: string;
  catalogId?: string;
  ticker: string;
  formula: string;
  triggeredValue: string;
  severity: LiveAlertSeverity;
  createDatetime: string;
};

type AlertNotificationContextValue = {
  alerts: LiveAlertNotification[];
  unreadCount: number;
  connectionStatus: 'disabled' | 'connecting' | 'connected' | 'reconnecting';
  markAllRead: () => void;
};

const AlertNotificationContext = createContext<AlertNotificationContextValue>({
  alerts: [],
  unreadCount: 0,
  connectionStatus: 'disabled',
  markAllRead: () => undefined,
});

const defaultWebSocketUrl = 'wss://xd5onp9o52.execute-api.us-east-1.amazonaws.com/dev';
const alertStoragePrefix = 'currenc-alert-notifications';
const maxDailyAlerts = 200;

function text(value: unknown) {
  return value == null ? '' : String(value).trim();
}

function normalizeSeverity(value: unknown): LiveAlertSeverity {
  const normalized = text(value).toLowerCase();
  if (normalized === 'critical' || normalized === 'high' || normalized === 'low') return normalized;
  return 'medium';
}

function alertId(alert: Omit<LiveAlertNotification, 'id'>) {
  return [
    alert.ticker,
    alert.formula,
    alert.triggeredValue,
    alert.createDatetime,
  ].join('|');
}

function normalizedRuleFormula(formula: string) {
  return formula.trim().toLowerCase().replace(/\s+/g, ' ');
}

function alertRuleTokens(alert: Pick<LiveAlertNotification, 'ticker' | 'formula' | 'ruleId' | 'catalogId'>) {
  const ticker = alert.ticker.trim().toUpperCase();
  return [
    alert.catalogId ? `${ticker}|catalog:${alert.catalogId.trim().toLowerCase()}` : '',
    alert.ruleId ? `${ticker}|rule:${alert.ruleId.trim().toLowerCase()}` : '',
    `${ticker}|formula:${normalizedRuleFormula(alert.formula)}`,
  ].filter(Boolean);
}

function alertsShareRule(left: LiveAlertNotification, right: LiveAlertNotification) {
  const leftTokens = new Set(alertRuleTokens(left));
  return alertRuleTokens(right).some(token => leftTokens.has(token));
}

function normalizeAlertPayload(value: unknown): LiveAlertNotification | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (text(row.type).toLowerCase() !== 'alert') return null;

  const ticker = text(row.ticker).toUpperCase();
  const formula = text(row.formula);
  const createDatetime = text(row.createDatetime);
  if (!ticker || !formula || !createDatetime || Number.isNaN(new Date(createDatetime).getTime())) return null;

  const alert = {
    alertId: text(row.alertId) || undefined,
    ruleId: text(row.ruleId) || undefined,
    catalogId: text(row.catalogId) || undefined,
    ticker,
    formula,
    triggeredValue: text(row.triggeredValue),
    severity: normalizeSeverity(row.severity),
    createDatetime,
  };
  return { ...alert, id: alert.alertId || alertId(alert) };
}

function readStoredAlerts(key: string): LiveAlertNotification[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return collapseAlertsByRule(
      parsed
        .map(normalizeStoredAlert)
        .filter((alert): alert is LiveAlertNotification => Boolean(alert)),
    );
  } catch {
    return [];
  }
}

function normalizeStoredAlert(value: unknown): LiveAlertNotification | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const ticker = text(row.ticker).toUpperCase();
  const formula = text(row.formula);
  const createDatetime = text(row.createDatetime);
  if (!ticker || !formula || !createDatetime || Number.isNaN(new Date(createDatetime).getTime())) return null;
  const alert = {
    alertId: text(row.alertId) || undefined,
    ruleId: text(row.ruleId) || undefined,
    catalogId: text(row.catalogId) || undefined,
    ticker,
    formula,
    triggeredValue: text(row.triggeredValue),
    severity: normalizeSeverity(row.severity),
    createDatetime,
  };
  return { ...alert, id: text(row.id) || alertId(alert) };
}

function normalizeHistoryAlert(value: Awaited<ReturnType<typeof fetchAlertHistory>>[number]): LiveAlertNotification {
  const alert = {
    alertId: value.alertId || undefined,
    ruleId: value.ruleId || undefined,
    catalogId: value.catalogId || undefined,
    ticker: value.ticker,
    formula: value.formula,
    triggeredValue: text(value.triggeredValue),
    severity: normalizeSeverity(value.severity),
    createDatetime: value.createDatetime,
  };
  return { ...alert, id: value.alertId || alertId(alert) };
}

function sortAlerts(alerts: LiveAlertNotification[]) {
  return [...alerts].sort(
    (left, right) => new Date(right.createDatetime).getTime() - new Date(left.createDatetime).getTime(),
  );
}

function collapseAlertsByRule(alerts: LiveAlertNotification[]) {
  return sortAlerts(alerts).reduce<LiveAlertNotification[]>((latest, alert) => {
    if (!latest.some(existing => alertsShareRule(existing, alert))) latest.push(alert);
    return latest;
  }, []).slice(0, maxDailyAlerts);
}

export function readableAlertMetric(formula: string) {
  const metric = formula.split(/\s*(?:>=|<=|>|<|==|!=)\s*/)[0] ?? formula;
  return metric
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, letter => letter.toUpperCase())
    .trim() || 'Rule alert';
}

export function alertMetricIdentity(value: string) {
  const readable = readableAlertMetric(value)
    .toLowerCase()
    .replace(/\b(?:value|percentage|percent|rate)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
  const aliases: Record<string, string> = {
    availableshares: 'shortableshares',
    shortinterestofthefloat: 'shortinterestfloat',
  };
  return aliases[readable] ?? readable;
}

export function AlertNotificationProvider({
  ticker,
  children,
}: {
  ticker: string;
  children: React.ReactNode;
}) {
  const timeZone = usePortalTimeZone();
  const normalizedTicker = ticker.trim().toUpperCase();
  const [dayKey, setDayKey] = useState('');
  const storageKey = `${alertStoragePrefix}:${normalizedTicker}:${dayKey}`;
  const [alerts, setAlerts] = useState<LiveAlertNotification[]>([]);
  const [toast, setToast] = useState<LiveAlertNotification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<AlertNotificationContextValue['connectionStatus']>('disabled');
  const storageKeyRef = useRef(storageKey);
  const timeZoneRef = useRef(timeZone);
  const alertsRef = useRef<LiveAlertNotification[]>([]);

  useEffect(() => {
    const refreshDay = () => setDayKey(ymdInPortalTimeZone(new Date(), timeZone));
    refreshDay();
    const timer = window.setInterval(refreshDay, 60 * 1000);
    return () => window.clearInterval(timer);
  }, [timeZone]);

  useEffect(() => {
    if (!dayKey) return;
    let cancelled = false;
    storageKeyRef.current = storageKey;
    timeZoneRef.current = timeZone;
    const storedAlerts = readStoredAlerts(storageKey);
    alertsRef.current = storedAlerts;
    setAlerts(storedAlerts);
    setUnreadCount(0);
    fetchAlertHistory(normalizedTicker)
      .then(history => {
        if (cancelled) return;
        const todaysHistory = history
          .map(normalizeHistoryAlert)
          .filter(alert => ymdInPortalTimeZone(new Date(alert.createDatetime), timeZone) === dayKey);
        const merged = collapseAlertsByRule([...todaysHistory, ...alertsRef.current]);
        alertsRef.current = merged;
        setAlerts(merged);
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(merged));
        } catch {
          // Persisted history remains available from the API on the next load.
        }
      })
      .catch(() => {
        // WebSocket alerts remain available if history cannot be loaded.
      });
    return () => {
      cancelled = true;
    };
  }, [dayKey, normalizedTicker, storageKey, timeZone]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    function syncStoredAlerts(event: StorageEvent) {
      if (event.key === storageKeyRef.current) {
        const storedAlerts = readStoredAlerts(storageKeyRef.current);
        alertsRef.current = storedAlerts;
        setAlerts(storedAlerts);
      }
    }
    window.addEventListener('storage', syncStoredAlerts);
    return () => window.removeEventListener('storage', syncStoredAlerts);
  }, []);

  useEffect(() => {
    const tokens = getStoredTokens();
    const configuredUrl = process.env.NEXT_PUBLIC_WS_API_URL?.trim() || defaultWebSocketUrl;
    if (!tokens?.idToken || !configuredUrl) {
      setConnectionStatus('disabled');
      return undefined;
    }

    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let pingTimer: number | null = null;

    function clearTimers() {
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (pingTimer !== null) window.clearInterval(pingTimer);
      reconnectTimer = null;
      pingTimer = null;
    }

    function connect() {
      if (disposed) return;
      const currentTokens = getStoredTokens();
      if (!currentTokens?.idToken) {
        setConnectionStatus('disabled');
        return;
      }

      setConnectionStatus(socket ? 'reconnecting' : 'connecting');
      const separator = configuredUrl.includes('?') ? '&' : '?';
      socket = new WebSocket(`${configuredUrl}${separator}token=${encodeURIComponent(currentTokens.idToken)}`);

      socket.onopen = () => {
        if (disposed) return;
        setConnectionStatus('connected');
        if (pingTimer !== null) window.clearInterval(pingTimer);
        pingTimer = window.setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ action: 'ping' }));
          }
        }, 9 * 60 * 1000);
      };

      socket.onmessage = event => {
        let payload: unknown;
        try {
          payload = JSON.parse(String(event.data));
        } catch {
          return;
        }
        const alert = normalizeAlertPayload(payload);
        if (!alert || alert.ticker !== normalizedTicker) return;

        const alertDay = ymdInPortalTimeZone(new Date(alert.createDatetime), timeZoneRef.current);
        const currentDay = ymdInPortalTimeZone(new Date(), timeZoneRef.current);
        if (alertDay !== currentDay) return;

        const alreadyNotified = alertsRef.current.some(item => alertsShareRule(item, alert));
        const next = collapseAlertsByRule([alert, ...alertsRef.current]);
        alertsRef.current = next;
        setAlerts(next);
        try {
          window.localStorage.setItem(storageKeyRef.current, JSON.stringify(next));
        } catch {
          // Alerts still remain available for the active browser session.
        }
        if (!alreadyNotified) {
          setToast(alert);
          setUnreadCount(count => count + 1);
        }
      };

      socket.onerror = () => {
        // onclose handles the reconnect so the browser does not start competing retries.
      };

      socket.onclose = () => {
        if (pingTimer !== null) window.clearInterval(pingTimer);
        pingTimer = null;
        if (disposed) return;
        setConnectionStatus('reconnecting');
        reconnectTimer = window.setTimeout(connect, 5000);
      };
    }

    connect();
    return () => {
      disposed = true;
      clearTimers();
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000);
    };
  }, [normalizedTicker]);

  const markAllRead = useCallback(() => setUnreadCount(0), []);
  const contextValue = useMemo(
    () => ({ alerts, unreadCount, connectionStatus, markAllRead }),
    [alerts, unreadCount, connectionStatus, markAllRead],
  );

  return (
    <AlertNotificationContext.Provider value={contextValue}>
      {children}
      {toast ? (
        <div className={`live-alert-toast ${toast.severity}`} role="alert" aria-live="assertive">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 2.8 20h18.4L12 3Z" />
            <path d="M12 9v5M12 17.2v.1" />
          </svg>
          <div>
            <span>{toast.severity} alert · {toast.ticker}</span>
            <strong>{readableAlertMetric(toast.formula)}</strong>
            <p>{toast.formula} · Triggered value {toast.triggeredValue || 'N/A'}</p>
          </div>
          <button type="button" aria-label="Dismiss alert notification" onClick={() => setToast(null)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
      ) : null}
    </AlertNotificationContext.Provider>
  );
}

export function useAlertNotifications() {
  return useContext(AlertNotificationContext);
}
