import { AccountShell } from '@/components/AccountShell';

const plans = [
  ['Starter', '$99/mo', '1 company · basic archive · email routing'],
  ['Pro IR', '$299/mo', 'Up to 10 companies · custom windows · archive downloads'],
  ['Enterprise', 'Custom', 'Unlimited companies · SSO · white-label controls'],
];

export default function AccountBillingPage() {
  return (
    <AccountShell>
      <header className="portal-topbar">
        <div>
          <div className="eyebrow">Account / Billing</div>
          <h1>Billing and subscription</h1>
          <p>Review plan coverage, invoice routing, seats, and retention settings.</p>
        </div>
      </header>

      <section className="portal-stat-grid">
        <div className="portal-stat"><span>Current plan</span><strong>Pro IR</strong><small>multi-company account</small></div>
        <div className="portal-stat"><span>Seats</span><strong>6</strong><small>active users</small></div>
        <div className="portal-stat"><span>Retention</span><strong>12 mo</strong><small>report archive</small></div>
        <div className="portal-stat"><span>Invoice email</span><strong>AP</strong><small>finance@company.com</small></div>
      </section>

      <section className="portal-content-grid">
        <div className="portal-panel wide">
          <div className="portal-panel__head"><div><h2>Plans</h2><p>Coverage options for issuer monitoring operations.</p></div></div>
          <div className="grid cols-3">{plans.map(([name, price, desc]) => <div className="section" key={name}><div className="section__head"><h3 className="section__title">{name}</h3><span className="badge blue">{price}</span></div><p className="page__desc" style={{ margin: 0 }}>{desc}</p></div>)}</div>
        </div>
        <div className="portal-panel"><h2>Account controls</h2><div className="section-list"><div className="section">Archive retention policy</div><div className="section">White-label disclaimer</div><div className="section">Seat and role management</div><div className="section">Monthly usage export</div></div></div>
      </section>
    </AccountShell>
  );
}
