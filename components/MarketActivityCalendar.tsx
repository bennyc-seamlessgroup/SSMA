import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { MarketActivityDay, MarketEventCategory } from '@/lib/market-activity';
import { formatMarketDate, formatShares, marketActivityMonths } from '@/lib/market-activity';

type Props = {
  ticker: string;
  monthLabel: string;
  selectedMonth: string;
  days: MarketActivityDay[];
  featuredDay: MarketActivityDay;
};

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const eventLabels: Record<MarketEventCategory, string> = {
  company_pr: 'Company PR',
  third_party_news: 'News',
  social: 'Social',
  filing: 'Filing',
};

function Sparkline({ values, positive, large = false }: Readonly<{ values: number[]; positive: boolean; large?: boolean }>) {
  const width = large ? 520 : 92;
  const height = large ? 140 : 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 0.01);
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - ((value - min) / spread) * (height - (large ? 20 : 8)) - (large ? 10 : 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg className={large ? 'market-sparkline market-sparkline--large' : 'market-sparkline'} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Price trend">
      {large && <line x1="0" y1={height - 16} x2={width} y2={height - 16} className="market-sparkline__baseline" />}
      <polyline points={points} className={positive ? 'market-sparkline__line positive' : 'market-sparkline__line negative'} />
    </svg>
  );
}

export function MarketActivitySparkline({ values, positive, large = false }: Readonly<{ values: number[]; positive: boolean; large?: boolean }>) {
  return <Sparkline values={values} positive={positive} large={large} />;
}

export function MarketEventBadge({ category }: Readonly<{ category: MarketEventCategory }>) {
  return <span className={`market-event-dot ${category}`} title={eventLabels[category]} aria-label={eventLabels[category]} />;
}

export function MarketActivityCalendar({ ticker, monthLabel, selectedMonth, days, featuredDay }: Readonly<Props>) {
  const monthStartsOn = new Date(`${days[0]?.date ?? '2026-05-01'}T00:00:00Z`).getUTCDay();
  const cells: Array<MarketActivityDay | null> = [...Array.from({ length: monthStartsOn }, () => null), ...days];
  const lastChangeClass = featuredDay.changePercent >= 0 ? 'positive' : 'negative';

  return (
    <section className="panel market-calendar-panel">
      <div className="portal-panel__head market-calendar-panel__head">
        <div>
          <div className="eyebrow">Market activity</div>
          <h2>Daily market calendar</h2>
          <p>Price action, volume intensity, and catalyst activity for {ticker} across {monthLabel}.</p>
        </div>
        <div className="market-calendar-controls">
          <form className="month-picker" action={`/monitor/${ticker}` as any}>
            <label htmlFor={`${ticker}-market-month`}>Month</label>
            <input id={`${ticker}-market-month`} className="input" type="month" name="month" defaultValue={selectedMonth} />
            <button className="button secondary" type="submit">View</button>
          </form>
          <div className="month-quick-links" aria-label="Available months">
            {marketActivityMonths.map(month => (
              <Link key={month} className={`month-chip ${month === selectedMonth ? 'active' : ''}`} href={`/monitor/${ticker}?month=${month}` as any}>{month}</Link>
            ))}
          </div>
          <div className="market-event-legend" aria-label="Event legend">
            {(Object.keys(eventLabels) as MarketEventCategory[]).map(category => (
              <span key={category}><MarketEventBadge category={category} />{eventLabels[category]}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="market-calendar-wrap">
        <div className="market-calendar-grid market-calendar-grid--weekdays">
          {weekdays.map(day => <div key={day} className="market-weekday">{day}</div>)}
        </div>
        <div className="market-calendar-grid">
          {cells.map((day, index) => {
            if (!day) return <div className="market-day market-day--empty" key={`empty-${index}`} />;
            const direction = day.changePercent >= 0 ? 'positive' : 'negative';
            return (
              <Link
                className={`market-day ${direction}`}
                href={`/monitor/${ticker}/daily/${day.date}` as any}
                key={day.date}
                style={{ '--volume-alpha': (0.08 + day.volumePercentOfMonth / 160).toFixed(2) } as CSSProperties}
                aria-label={`${formatMarketDate(day.date)} close $${day.close.toFixed(2)}, ${day.changePercent.toFixed(2)} percent`}
              >
                <div className="market-day__top"><span>{day.day}</span><strong>${day.close.toFixed(2)}</strong></div>
                <div className="market-day__change">{day.changePercent >= 0 ? '+' : ''}{day.changePercent.toFixed(2)}%</div>
                <Sparkline values={day.sparkline} positive={day.changePercent >= 0} />
                <div className="market-day__foot">
                  <span>{formatShares(day.volume)}</span>
                  <span className="market-day__events">{day.events.map(event => <MarketEventBadge key={event.id} category={event.category} />)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="market-featured-day">
        <div>
          <span className="mini-label">Featured session</span>
          <h3>{formatMarketDate(featuredDay.date)}</h3>
          <p>Close ${featuredDay.close.toFixed(2)} · <span className={lastChangeClass}>{featuredDay.changePercent >= 0 ? '+' : ''}{featuredDay.changePercent.toFixed(2)}%</span> · {formatShares(featuredDay.volume)} shares</p>
        </div>
        <div className="market-featured-day__events">
          {featuredDay.events.length > 0 ? featuredDay.events.map(event => (
            <div key={event.id} className="market-event-row"><MarketEventBadge category={event.category} /><span>{event.title}</span></div>
          )) : <div className="market-event-row"><span className="market-event-dot muted" /><span>No major catalyst recorded</span></div>}
        </div>
        <Link className="button secondary" href={`/monitor/${ticker}/daily/${featuredDay.date}` as any}>Open session detail</Link>
      </div>
    </section>
  );
}
