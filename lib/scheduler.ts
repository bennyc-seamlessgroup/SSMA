const NY_TIMEZONE = 'America/New_York';

export function getNewYorkTime(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: NY_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date);
}

export function isTradingDay(date = new Date()) {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: NY_TIMEZONE, weekday: 'short' }).format(date);
  return !['Sat', 'Sun'].includes(weekday);
}

export const scheduledTimesNY = ['08:00', '11:50', '19:00'];
