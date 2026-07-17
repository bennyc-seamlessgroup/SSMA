'use client';

import { normalizeTicker } from '@/lib/ticker-data';

export const operationsTickerStorageKey = 'operations-selected-ticker';
export const operationsTickerChangedEvent = 'operations-ticker-changed';

export function getOperationsTicker() {
  if (typeof window === 'undefined') return 'CURR';
  const routeTicker = window.location.pathname.startsWith('/operations')
    ? new URLSearchParams(window.location.search).get('ticker')
    : null;
  return normalizeTicker(routeTicker || window.localStorage.getItem(operationsTickerStorageKey));
}

export function setOperationsTicker(ticker: string) {
  const normalized = normalizeTicker(ticker);
  window.localStorage.setItem(operationsTickerStorageKey, normalized);
  window.dispatchEvent(new CustomEvent(operationsTickerChangedEvent, { detail: normalized }));
  return normalized;
}
