const notificationRows = [
  ['Short pressure spike', 'Email + in-app', 'Executive alert'],
  ['Borrow fee movement', 'Email', 'IR team'],
  ['New SEC filing', 'Email + archive', 'IR team and advisors'],
  ['Sentiment spike', 'In-app', 'IR team'],
  ['Daily report delivery', 'Email', 'Approved recipients'],
  ['Weekly executive summary', 'Email + archive', 'Management and board viewers'],
];

export default async function NotificationsPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  await params;

  return (
    <div className="page settings-page">
      <section className="settings-panel">
        <div className="settings-panel__head">
          <div><span>Preference center</span><h2>Notification routing</h2></div>
        </div>
        <div className="settings-table">
          <div className="settings-table__head"><span>Event</span><span>Channel</span><span>Audience</span></div>
          {notificationRows.map(([event, channel, audience]) => (
            <div className="settings-table__row" key={event}><strong>{event}</strong><span>{channel}</span><span>{audience}</span></div>
          ))}
        </div>
      </section>
    </div>
  );
}
