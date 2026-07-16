const MARKET_TIME_ZONE = 'America/New_York';

type DateParts = { year: number; month: number; day: number };

function parseDateKey(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (date.getUTCFullYear() !== parts.year || date.getUTCMonth() !== parts.month - 1 || date.getUTCDate() !== parts.day) return null;
  return parts;
}

function dateKey(parts: DateParts) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function addUtcDays(parts: DateParts, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function observedDate(year: number, month: number, day: number) {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addUtcDays({ year, month, day }, weekday === 6 ? -1 : weekday === 0 ? 1 : 0);
}

function nthWeekday(year: number, month: number, weekday: number, occurrence: number) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return { year, month, day: 1 + ((weekday - firstWeekday + 7) % 7) + (occurrence - 1) * 7 };
}

function lastWeekday(year: number, month: number, weekday: number) {
  const last = new Date(Date.UTC(year, month, 0));
  return { year, month, day: last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7) };
}

function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  return { year, month, day: ((h + l - 7 * m + 114) % 31) + 1 };
}

function marketHolidays(year: number) {
  return new Set([
    dateKey(observedDate(year, 1, 1)),
    dateKey(nthWeekday(year, 1, 1, 3)),
    dateKey(nthWeekday(year, 2, 1, 3)),
    dateKey(addUtcDays(easterSunday(year), -2)),
    dateKey(lastWeekday(year, 5, 1)),
    dateKey(observedDate(year, 6, 19)),
    dateKey(observedDate(year, 7, 4)),
    dateKey(nthWeekday(year, 9, 1, 1)),
    dateKey(nthWeekday(year, 11, 4, 4)),
    dateKey(observedDate(year, 12, 25)),
    dateKey(observedDate(year + 1, 1, 1)),
  ]);
}

export function isUsMarketTradingDay(value: string) {
  const parts = parseDateKey(value);
  if (!parts) return false;
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  return weekday !== 0 && weekday !== 6 && !marketHolidays(parts.year).has(value);
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
  return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second) - date.getTime();
}

export function usMarketCloseTime(value: string) {
  const parts = parseDateKey(value);
  if (!parts) return null;
  const localClockAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, 16, 0, 0);
  let instant = localClockAsUtc;
  for (let iteration = 0; iteration < 2; iteration += 1) {
    instant = localClockAsUtc - timeZoneOffsetMs(new Date(instant), MARKET_TIME_ZONE);
  }
  return new Date(instant);
}

export function newYorkDateKey(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: MARKET_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function latestClosedUsMarketDate(now = new Date()) {
  let candidate = parseDateKey(newYorkDateKey(now));
  if (!candidate) return '';

  for (let attempts = 0; attempts < 370; attempts += 1) {
    const candidateKey = dateKey(candidate);
    const closeAt = usMarketCloseTime(candidateKey);
    if (isUsMarketTradingDay(candidateKey) && closeAt && now.getTime() >= closeAt.getTime()) {
      return candidateKey;
    }
    candidate = addUtcDays(candidate, -1);
  }

  return '';
}

export function marketEntryAvailability(value: string, now = new Date()) {
  const closeAt = usMarketCloseTime(value);
  const isTradingDay = isUsMarketTradingDay(value);
  return {
    closeAt,
    isTradingDay,
    isOpen: Boolean(closeAt && isTradingDay && now.getTime() >= closeAt.getTime()),
    remainingMs: closeAt && isTradingDay ? Math.max(0, closeAt.getTime() - now.getTime()) : 0,
  };
}

export function formatMarketCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [days ? `${days}d` : '', `${String(hours).padStart(2, '0')}h`, `${String(minutes).padStart(2, '0')}m`, `${String(seconds).padStart(2, '0')}s`].filter(Boolean).join(' ');
}
