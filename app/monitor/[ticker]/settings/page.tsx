import Link from 'next/link';
import { buildDashboard } from '@/lib/mock-data';

export default async function SettingsPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const company = buildDashboard(ticker).company;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Settings</h1>
          <p className="page__desc">Account, workspace, delivery, and governance settings for the current company workspace.</p>
        </div>
      </div>

      <section className="grid cols-3">
        <div className="panel">
          <h2 className="panel__title">Profile & Access</h2>
          <div className="section-list">
            <div className="section"><strong>Demo User</strong><p className="page__desc" style={{ margin: '6px 0 0' }}>IR Admin · demo@currencintel.com</p></div>
            <div className="section">Role and permission management</div>
            <div className="section">Session and security policy</div>
          </div>
        </div>

        <div className="panel">
          <h2 className="panel__title">Company Workspace</h2>
          <div className="section-list">
            <div className="section"><strong>{company.company_name}</strong><p className="page__desc" style={{ margin: '6px 0 0' }}>{company.ticker} · {company.exchange}</p></div>
            <Link className="quick-action" href={`/monitor/${company.ticker}/companies`}><span><strong>Manage companies</strong><small>Switch or add covered issuers</small></span><span>→</span></Link>
            <Link className="quick-action" href={`/monitor/${company.ticker}/billing`}><span><strong>Billing & plan</strong><small>Seats, plan coverage, and invoice routing</small></span><span>→</span></Link>
          </div>
        </div>

        <div className="panel">
          <h2 className="panel__title">Delivery & Alerts</h2>
          <div className="section-list">
            <Link className="quick-action" href={`/monitor/${company.ticker}/email-settings`}><span><strong>Delivery settings</strong><small>Recipients, windows, and approval flow</small></span><span>→</span></Link>
            <Link className="quick-action" href={`/monitor/${company.ticker}/alert-rules`}><span><strong>Alert rules</strong><small>Thresholds for short pressure and sentiment events</small></span><span>→</span></Link>
            <div className="section">Notification preference center</div>
          </div>
        </div>
      </section>
    </div>
  );
}
