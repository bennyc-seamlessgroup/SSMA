export const portalTimeZoneCookie = 'portal-time-zone';
export const portalTimeZoneStorageKey = 'portal-time-zone';
export const defaultPortalTimeZone = 'Asia/Hong_Kong';

export const portalTimeZoneOptions = [
  { value: 'UTC', label: 'UTC (UTC+00:00)' },
  { value: 'Pacific/Honolulu', label: 'United States - Honolulu (UTC-10:00)' },
  { value: 'America/Anchorage', label: 'United States - Anchorage (UTC-09:00)' },
  { value: 'America/Los_Angeles', label: 'United States - Los Angeles (UTC-08:00)' },
  { value: 'America/Denver', label: 'United States - Denver (UTC-07:00)' },
  { value: 'America/Chicago', label: 'United States - Chicago (UTC-06:00)' },
  { value: 'America/New_York', label: 'United States - New York (UTC-05:00)' },
  { value: 'America/Toronto', label: 'Canada - Toronto (UTC-05:00)' },
  { value: 'America/Vancouver', label: 'Canada - Vancouver (UTC-08:00)' },
  { value: 'America/Mexico_City', label: 'Mexico - Mexico City (UTC-06:00)' },
  { value: 'America/Bogota', label: 'Colombia - Bogota (UTC-05:00)' },
  { value: 'America/Lima', label: 'Peru - Lima (UTC-05:00)' },
  { value: 'America/Santiago', label: 'Chile - Santiago (UTC-04:00)' },
  { value: 'America/Sao_Paulo', label: 'Brazil - Sao Paulo (UTC-03:00)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina - Buenos Aires (UTC-03:00)' },
  { value: 'Atlantic/Reykjavik', label: 'Iceland - Reykjavik (UTC+00:00)' },
  { value: 'Europe/London', label: 'United Kingdom - London (UTC+00:00)' },
  { value: 'Europe/Dublin', label: 'Ireland - Dublin (UTC+00:00)' },
  { value: 'Europe/Lisbon', label: 'Portugal - Lisbon (UTC+00:00)' },
  { value: 'Europe/Madrid', label: 'Spain - Madrid (UTC+01:00)' },
  { value: 'Europe/Paris', label: 'France - Paris (UTC+01:00)' },
  { value: 'Europe/Brussels', label: 'Belgium - Brussels (UTC+01:00)' },
  { value: 'Europe/Amsterdam', label: 'Netherlands - Amsterdam (UTC+01:00)' },
  { value: 'Europe/Berlin', label: 'Germany - Berlin (UTC+01:00)' },
  { value: 'Europe/Zurich', label: 'Switzerland - Zurich (UTC+01:00)' },
  { value: 'Europe/Rome', label: 'Italy - Rome (UTC+01:00)' },
  { value: 'Europe/Stockholm', label: 'Sweden - Stockholm (UTC+01:00)' },
  { value: 'Europe/Oslo', label: 'Norway - Oslo (UTC+01:00)' },
  { value: 'Europe/Copenhagen', label: 'Denmark - Copenhagen (UTC+01:00)' },
  { value: 'Europe/Warsaw', label: 'Poland - Warsaw (UTC+01:00)' },
  { value: 'Europe/Athens', label: 'Greece - Athens (UTC+02:00)' },
  { value: 'Europe/Helsinki', label: 'Finland - Helsinki (UTC+02:00)' },
  { value: 'Europe/Istanbul', label: 'Turkey - Istanbul (UTC+03:00)' },
  { value: 'Asia/Jerusalem', label: 'Israel - Jerusalem (UTC+02:00)' },
  { value: 'Africa/Cairo', label: 'Egypt - Cairo (UTC+02:00)' },
  { value: 'Africa/Johannesburg', label: 'South Africa - Johannesburg (UTC+02:00)' },
  { value: 'Africa/Nairobi', label: 'Kenya - Nairobi (UTC+03:00)' },
  { value: 'Asia/Dubai', label: 'United Arab Emirates - Dubai (UTC+04:00)' },
  { value: 'Asia/Qatar', label: 'Qatar - Doha (UTC+03:00)' },
  { value: 'Asia/Riyadh', label: 'Saudi Arabia - Riyadh (UTC+03:00)' },
  { value: 'Asia/Kolkata', label: 'India - Kolkata (UTC+05:30)' },
  { value: 'Asia/Bangkok', label: 'Thailand - Bangkok (UTC+07:00)' },
  { value: 'Asia/Jakarta', label: 'Indonesia - Jakarta (UTC+07:00)' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Vietnam - Ho Chi Minh City (UTC+07:00)' },
  { value: 'Asia/Manila', label: 'Philippines - Manila (UTC+08:00)' },
  { value: 'Asia/Singapore', label: 'Singapore - Singapore (UTC+08:00)' },
  { value: 'Asia/Kuala_Lumpur', label: 'Malaysia - Kuala Lumpur (UTC+08:00)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong - Hong Kong (UTC+08:00)' },
  { value: 'Asia/Shanghai', label: 'China - Shanghai (UTC+08:00)' },
  { value: 'Asia/Taipei', label: 'Taiwan - Taipei (UTC+08:00)' },
  { value: 'Asia/Seoul', label: 'South Korea - Seoul (UTC+09:00)' },
  { value: 'Asia/Tokyo', label: 'Japan - Tokyo (UTC+09:00)' },
  { value: 'Australia/Perth', label: 'Australia - Perth (UTC+08:00)' },
  { value: 'Australia/Adelaide', label: 'Australia - Adelaide (UTC+09:30)' },
  { value: 'Australia/Sydney', label: 'Australia - Sydney (UTC+10:00)' },
  { value: 'Pacific/Auckland', label: 'New Zealand - Auckland (UTC+12:00)' },
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
