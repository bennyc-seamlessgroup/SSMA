import Link from 'next/link';
import { MarketActivitySparkline, MarketEventBadge } from '@/components/MarketActivityCalendar';
import { formatMarketDate, formatShares, getNearestMarketActivityDay } from '@/lib/market-activity';
import { buildCompany } from '@/lib/mock-data';

export default async function DailyMarketActivityPage({ params }: Readonly<{ params: Promise<{ ticker: string; date: string }> }>) {
  const { ticker, date } = await params;
  const company = buildCompany(ticker);
  const day = getNearestMarketActivityDay(company.ticker, date);
  const changeClass = day.changePercent >= 0 ? 'positive' : 'negative';

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="pill">Market activity · {company.ticker}</div>
          <h1 className="page__title">{formatMarketDate(day.date)}</h1>
          <p className="page__desc">{company.company_name} session detail</p>
        </div>
        <Link className="button secondary" href={`/monitor/${company.ticker}` as any}>Back to overview</Link>
      </div>

      <div className="grid cols-4">
        <div className="metric"><div className="metric__label">Close</div><div className="metric__value">${day.close.toFixed(2)}</div><div className={`metric__note ${changeClass}`}>{day.changePercent >= 0 ? '+' : ''}{day.changePercent.toFixed(2)}%</div></div>
        <div className="metric"><div className="metric__label">Volume</div><div className="metric__value">{formatShares(day.volume)}</div><div className="metric__note">{day.volumePercentOfMonth}% monthly peak</div></div>
        <div className="metric"><div className="metric__label">High</div><div className="metric__value">${day.high.toFixed(2)}</div><div className="metric__note">Session high</div></div>
        <div className="metric"><div className="metric__label">Low</div><div className="metric__value">${day.low.toFixed(2)}</div><div className="metric__note">Session low</div></div>
      </div>

      <div className="grid cols-2 market-detail-grid">
        <section className="panel market-detail-chart">
          <div className="section__head">
            <h2 className="panel__title">Intraday trend</h2>
            <span className={`badge ${day.changePercent >= 0 ? 'good' : 'warn'}`}>{day.changePercent >= 0 ? 'Up session' : 'Down session'}</span>
          </div>
          <MarketActivitySparkline values={day.sparkline} positive={day.changePercent >= 0} large />
        </section>

        <section className="panel">
          <div className="section__head">
            <h2 className="panel__title">Session events</h2>
            <span className="badge blue">{day.events.length} events</span>
          </div>
          <div className="section-list">
            {day.events.length > 0 ? day.events.map(event => (
              <div className="section market-event-detail" key={event.id}>
                <div className="section__head">
                  <h3 className="section__title"><MarketEventBadge category={event.category} />{event.title}</h3>
                  <span className="badge pending">{event.time}</span>
                </div>
                <div className="mini-label">{event.source}</div>
                <p className="page__desc" style={{ margin: '8px 0 0' }}>{event.summary}</p>
              </div>
            )) : (
              <div className="section">
                <h3 className="section__title">No major catalyst recorded</h3>
                <p className="page__desc" style={{ margin: '8px 0 0' }}>Price and volume activity remained within the tracked range for this session.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
