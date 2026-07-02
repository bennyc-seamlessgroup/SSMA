import Link from 'next/link';
import { ApiStatusPanel } from '@/components/ApiStatusPanel';
import { MarketActivityCalendar } from '@/components/MarketActivityCalendar';
import { SourceBadge } from '@/components/SourceBadge';
import { buildDashboardWithFintel } from '@/lib/fintel-provider';
import { buildMarketActivityCalendar } from '@/lib/market-activity';

export default async function WorkspacePortalPage({ params, searchParams }: Readonly<{ params: Promise<{ ticker: string }>; searchParams?: Promise<{ month?: string }> }>) {
  const { ticker } = await params;
  const query = searchParams ? await searchParams : {};
  const normalizedTicker = ticker?.toUpperCase() ?? 'CURR';
  const selectedMonth = /^\d{4}-\d{2}$/.test(query.month ?? '') ? query.month! : '2026-05';
  const dashboard = await buildDashboardWithFintel(normalizedTicker);
  const marketCalendar = buildMarketActivityCalendar(normalizedTicker, selectedMonth);
  const { company, reports } = dashboard;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="pill">Company workspace · {company.exchange}</div>
          <h1 className="page__title">{company.company_name} ({company.ticker})</h1>
          <p className="page__desc">Manage delivery settings, report archive, and intelligence signals for {company.ticker}.</p>
        </div>
        <SourceBadge label={company.source_label} />
      </div>

      <div className="grid cols-4">
        <div className="metric"><div className="metric__label">Selected ticker</div><div className="metric__value">{company.ticker}</div><div className="metric__note">Selected workspace</div></div>
        <div className="metric"><div className="metric__label">Report windows</div><div className="metric__value">3</div><div className="metric__note">8AM · 11:50AM · 7PM</div></div>
        <div className="metric"><div className="metric__label">Archive items</div><div className="metric__value">{reports.length}</div><div className="metric__note">Generated PDF history</div></div>
        <div className="metric"><div className="metric__label">Workspace status</div><div className="metric__value">Active</div><div className="metric__note">Monitoring workflow enabled</div></div>
      </div>

      <MarketActivityCalendar
        ticker={company.ticker}
        monthLabel={marketCalendar.monthLabel}
        selectedMonth={marketCalendar.month}
        days={marketCalendar.days}
        featuredDay={marketCalendar.featuredDay}
      />

      <div className="panel">
        <div className="section__head">
          <h2 className="panel__title">Provider status</h2>
          <SourceBadge label={dashboard.apiStatus.Fintel === 'Available' ? 'fintel' : 'provider status'} />
        </div>
        <ApiStatusPanel status={dashboard.apiStatus} />
      </div>

      <div className="grid cols-2">
        <div className="panel">
          <div className="section__head">
            <h2 className="panel__title">{company.ticker} delivery schedule</h2>
            <Link className="text-link" href={`/monitor/${company.ticker}/email-settings`}>Edit schedule</Link>
          </div>
          <div className="section-list">
            {reports.map(report => (
              <div key={report.id} className="section">
                <div className="section__head">
                  <h3 className="section__title">{report.report_time}</h3>
                  <span className="badge blue">{report.report_type}</span>
                </div>
                <p className="page__desc" style={{ margin: 0 }}>{report.title}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section__head">
            <h2 className="panel__title">Next actions</h2>
            <span className="badge good">Active</span>
          </div>
          <div className="section-list">
            <Link className="quick-action" href={`/monitor/${company.ticker}/reports`}><span><strong>Review {company.ticker} archive</strong><small>Download sent reports</small></span><span>→</span></Link>
            <Link className="quick-action" href={`/monitor/${company.ticker}/event-calendar`}><span><strong>Review disclosure stream</strong><small>SEC filing records for this ticker</small></span><span>→</span></Link>
            <Link className="quick-action" href={`/monitor/${company.ticker}/short-interest`}><span><strong>Check short-interest view</strong><small>Public short-interest and borrow context</small></span><span>→</span></Link>
            <Link className="quick-action" href={`/monitor/${company.ticker}/sentiment`}><span><strong>Review narrative signals</strong><small>Sentiment and topic tags for this ticker</small></span><span>→</span></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
