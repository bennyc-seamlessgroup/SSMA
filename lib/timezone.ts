export const portalTimeZoneCookie = 'portal-time-zone';
export const portalTimeZoneStorageKey = 'portal-time-zone';
export const defaultPortalTimeZone = 'Asia/Hong_Kong';

export const portalTimeZoneOptions = [
  { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'America/Los_Angeles', label: 'Los Angeles' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Europe/London', label: 'London' },
  { value: 'UTC', label: 'UTC' },
] as const;

export function isSupportedTimeZone(value: string | null | undefined) {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizePortalTimeZone(value: string | null | undefined) {
  return isSupportedTimeZone(value) ? String(value) : defaultPortalTimeZone;
}

export function formatPortalDateTime(
  value: string | number | Date | null | undefined,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {},
) {
  if (!value) return 'N/A';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const hasCustomOptions = Object.keys(options).length > 0;
  return new Intl.DateTimeFormat('en-US', {
    ...(hasCustomOptions ? {} : { dateStyle: 'medium' as const, timeStyle: 'short' as const }),
    timeZone: normalizePortalTimeZone(timeZone),
    ...options,
  }).format(date);
}

export function formatPortalDate(
  value: string | number | Date | null | undefined,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {},
) {
  if (!value) return 'N/A';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const hasCustomOptions = Object.keys(options).length > 0;
  return new Intl.DateTimeFormat('en-US', {
    ...(hasCustomOptions ? {} : { month: 'short' as const, day: 'numeric' as const, year: 'numeric' as const }),
    timeZone: normalizePortalTimeZone(timeZone),
    ...options,
  }).format(date);
}

export function ymdInPortalTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: normalizePortalTimeZone(timeZone),
  }).formatToParts(date);
  const year = parts.find(part => part.type === 'year')?.value ?? '1970';
  const month = parts.find(part => part.type === 'month')?.value ?? '01';
  const day = parts.find(part => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}
