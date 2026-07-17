export const defaultTicker = 'CURR';

export function normalizeTicker(value: unknown, fallback = defaultTicker) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (/^[A-Z0-9.-]{1,10}$/.test(normalized)) return normalized;
  return fallback;
}
