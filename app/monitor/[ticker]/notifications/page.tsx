import { SettingsBackLink } from '@/components/SettingsBackLink';
import { buildDashboard } from '@/lib/mock-data';

const notificationRows = [
  ['Short pressure spike', 'Email + in-app', 'Executive alert'],
  ['Borrow fee movement', 'Email', 'IR team'],
  ['New SEC filing', 'Email + archive', 'IR team and advisors'],
  ['Sentiment spike', 'In-app', 'IR team'],
  ['Daily report delivery', 'Email', 'Approved recipients'],
  ['Weekly executive summary', 'Email + archive', 'Management and board viewers'],
];

export default async function NotificationsPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const company = buildDashboard(ticker).company;

  return (
    <div className="page settings-page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Notifications</h1>
          <p className="page__desc">Demo notification center for {company.ticker} alerts, report delivery, and executive routing.</p>
        </div>
        <SettingsBackLink ticker={company.ticker} />
      </div>

      <section className="settings-panel">
        <div className="settings-panel__head"><div><span>Preference center</span><h2>Notification routing</h2></div><span className="badge blue">Demo</span></div>
        <div className="settings-table">
          <div className="settings-table__head"><span>Event</span><span>Channel</span><span>Audience</span></div>
          {notificationRows.map(([event, channel, audience]) => (
            <div className="settings-table__row" key={event}><strong>{event}</strong><span>{channel}</span><span>{audience}</span></div>
          ))}
        </div>
      </section>

      <section className="grid cols-3">
        <div className="panel"><h2 className="panel__title">Quiet Hours</h2><p className="page__desc">Critical market alerts remain active. Non-urgent workflow notifications can be delayed.</p></div>
        <div className="panel"><h2 className="panel__title">Escalation</h2><p className="page__desc">High-risk alerts can route to executives and capital markets advisors simultaneously.</p></div>
        <div className="panel"><h2 className="panel__title">Digest Mode</h2><p className="page__desc">Lower-priority alerts can be grouped into daily or weekly summaries.</p></div>
      </section>
    </div>
  );
}
