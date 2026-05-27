import { normalizeTicker } from '@/lib/mock-data';

export type MarketEventCategory = 'company_pr' | 'third_party_news' | 'social' | 'filing';

export type MarketActivityEvent = {
  id: string;
  category: MarketEventCategory;
  title: string;
  source: string;
  time: string;
  summary: string;
};

export type MarketActivityDay = {
  date: string;
  day: number;
  close: number;
  changePercent: number;
  volume: number;
  volumePercentOfMonth: number;
  high: number;
  low: number;
  sparkline: number[];
  events: MarketActivityEvent[];
};

export type MarketActivityCalendarMonth = {
  ticker: string;
  month: string;
  monthLabel: string;
  days: MarketActivityDay[];
  featuredDay: MarketActivityDay;
};

export const marketActivityMonths = ['2026-03', '2026-04', '2026-05'];

const eventCatalog: Array<Omit<MarketActivityEvent, 'id'>> = [
  {
    category: 'company_pr',
    title: 'Corporate update distributed',
    source: 'Company press release',
    time: '08:05 ET',
    summary: 'The company published a corporate update that supported elevated investor attention during the session.',
  },
  {
    category: 'third_party_news',
    title: 'Market coverage highlights volatility',
    source: 'Financial media',
    time: '10:20 ET',
    summary: 'Third-party market coverage referenced unusual trading activity and recent price momentum.',
  },
  {
    category: 'social',
    title: 'Narrative activity increased',
    source: 'Social and community channels',
    time: '12:45 ET',
    summary: 'Public conversation volume increased around liquidity, retail participation, and near-term catalysts.',
  },
  {
    category: 'filing',
    title: 'Disclosure item reviewed',
    source: 'Regulatory filing',
    time: '16:18 ET',
    summary: 'A disclosure item was added to the company record and reviewed for relevance to trading context.',
  },
];

const categorySchedule: Record<number, MarketEventCategory[]> = {
  1: ['third_party_news'],
  4: ['company_pr', 'social'],
  6: ['filing'],
  8: ['third_party_news', 'social'],
  11: ['company_pr'],
  13: ['social'],
  15: ['filing', 'third_party_news'],
  18: ['company_pr', 'social'],
  20: ['filing'],
  22: ['third_party_news'],
  25: ['social', 'company_pr'],
  27: ['filing', 'third_party_news'],
  29: ['company_pr'],
};

function tickerSeed(tickerInput: string) {
  const ticker = normalizeTicker(tickerInput);
  return ticker.split('').reduce((total, char, index) => total + char.charCodeAt(0) * (index + 3), 0);
}

function roundPrice(value: number) {
  return Number(value.toFixed(2));
}

function buildSparkline(close: number, day: number, seed: number) {
  return Array.from({ length: 8 }, (_, index) => {
    const wave = Math.sin((day + index + seed % 9) * 0.78) * 0.045;
    const drift = (index - 3.5) * ((day % 5) - 2) * 0.006;
    return roundPrice(Math.max(0.24, close * (1 + wave + drift)));
  });
}

function buildEvents(day: number, ticker: string): MarketActivityEvent[] {
  const categories = categorySchedule[day] ?? (day % 9 === 0 ? ['social'] : []);
  return categories.map((category, index) => {
    const template = eventCatalog.find(item => item.category === category) ?? eventCatalog[0];
    return {
      ...template,
      id: `${ticker}-${day}-${category}-${index}`,
    };
  });
}

function monthParts(monthInput?: string) {
  const normalized = /^\d{4}-\d{2}$/.test(monthInput ?? '') ? monthInput! : '2026-05';
  const [yearText, monthText] = normalized.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const monthDays = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(Date.UTC(year, monthIndex, 1)));
  return { normalized, year, monthIndex, monthDays, monthLabel };
}

export function buildMarketActivityCalendar(tickerInput: string, monthInput?: string): MarketActivityCalendarMonth {
  const ticker = normalizeTicker(tickerInput);
  const { normalized, year, monthIndex, monthDays, monthLabel } = monthParts(monthInput);
  const seed = tickerSeed(`${ticker}-${normalized}`);
  const isCurr = ticker === 'CURR';
  const base = isCurr ? 1.42 + monthIndex * 0.08 : 12 + (seed % 420) / 100;
  const preliminary = Array.from({ length: monthDays }, (_, index) => {
    const day = index + 1;
    const momentum = Math.sin((day + seed % 13) * 0.54) * (isCurr ? 0.08 : 0.035);
    const catalystLift = categorySchedule[day]?.length ? (isCurr ? 0.035 : 0.018) : 0;
    const close = roundPrice(base + day * (isCurr ? 0.012 : 0.038) + momentum + catalystLift);
    const previousClose = day === 1 ? close - (isCurr ? 0.04 : 0.11) : 0;
    const volume = Math.round((isCurr ? 2_200_000 : 860_000) + ((day * 7919 + seed * 31) % (isCurr ? 9_600_000 : 3_200_000)) + (categorySchedule[day]?.length ?? 0) * (isCurr ? 1_600_000 : 520_000));
    return { day, close, previousClose, volume };
  });

  const closes = preliminary.map(item => item.close);
  const maxVolume = Math.max(...preliminary.map(item => item.volume));

  const days = preliminary.map((item, index): MarketActivityDay => {
    const previous = index === 0 ? item.previousClose : preliminary[index - 1].close;
    const changePercent = Number((((item.close - previous) / previous) * 100).toFixed(2));
    const intradayRange = item.close * (0.035 + ((item.day + seed) % 5) * 0.006);
    return {
      date: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`,
      day: item.day,
      close: item.close,
      changePercent,
      volume: item.volume,
      volumePercentOfMonth: Math.round((item.volume / maxVolume) * 100),
      high: roundPrice(Math.max(item.close, Math.max(...closes.slice(Math.max(0, index - 1), index + 1))) + intradayRange / 2),
      low: roundPrice(Math.max(0.2, Math.min(item.close, previous) - intradayRange / 2)),
      sparkline: buildSparkline(item.close, item.day, seed),
      events: buildEvents(item.day, ticker),
    };
  });

  const featuredDay = days.find(day => day.day === 20) ?? days[days.length - 1];

  return {
    ticker,
    month: normalized,
    monthLabel,
    days,
    featuredDay,
  };
}

export function getMarketActivityDay(tickerInput: string, dateInput: string): MarketActivityDay | null {
  const calendar = buildMarketActivityCalendar(tickerInput, dateInput.slice(0, 7));
  return calendar.days.find(day => day.date === dateInput) ?? null;
}

export function getNearestMarketActivityDay(tickerInput: string, dateInput: string): MarketActivityDay {
  const calendar = buildMarketActivityCalendar(tickerInput, dateInput.slice(0, 7));
  const target = Date.parse(`${dateInput}T00:00:00Z`);
  if (Number.isNaN(target)) return calendar.featuredDay;

  return calendar.days.reduce((nearest, day) => {
    const nearestDistance = Math.abs(Date.parse(`${nearest.date}T00:00:00Z`) - target);
    const dayDistance = Math.abs(Date.parse(`${day.date}T00:00:00Z`) - target);
    return dayDistance < nearestDistance ? day : nearest;
  }, calendar.featuredDay);
}

export function formatMarketDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T00:00:00Z`));
}

export function formatShares(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('en-US');
}
