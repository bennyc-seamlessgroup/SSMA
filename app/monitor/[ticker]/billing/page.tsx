const plans = [
  ['Basic', 'Contact us', 'One stock code · daily reports · core short pressure indicators · basic archive'],
  ['Professional', 'Contact us', 'Up to 10 stock codes · institutional tracking · squeeze pressure analysis · board exports'],
  ['Enterprise', 'Contact us', 'Up to 50 stock codes · branded reports · full traceability · integration support'],
];

export default async function BillingPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  await params;

  return (
    <div className="page">
      <section className="portal-stat-grid">
        <div className="portal-stat"><span>Current plan</span><strong>Professional</strong><small>multi-company account</small></div>
        <div className="portal-stat"><span>Seats</span><strong>6</strong><small>active demo users</small></div>
        <div className="portal-stat"><span>Retention</span><strong>12 mo</strong><small>report archive policy</small></div>
        <div className="portal-stat"><span>Invoice email</span><strong>AP</strong><small>finance@company.com</small></div>
      </section>

      <section className="grid cols-3">
        {plans.map(([name, price, desc]) => (
          <div className="panel" key={name}>
            <div className="section__head">
              <h2 className="panel__title">{name}</h2>
              <span className="badge blue">{price}</span>
            </div>
            <p className="page__desc" style={{ margin: 0 }}>{desc}</p>
          </div>
        ))}
      </section>

      <section className="panel">
        <h2 className="panel__title">Account Controls</h2>
        <div className="grid cols-4">
          <div className="section">Archive retention policy</div>
          <div className="section">Seat and role management</div>
          <div className="section">Invoice routing</div>
          <div className="section">Monthly usage export</div>
        </div>
      </section>
    </div>
  );
}
