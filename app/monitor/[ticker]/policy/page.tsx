import { SettingsBackLink } from '@/components/SettingsBackLink';
import { normalizeTicker } from '@/lib/ticker-data';

const policies = [
  ['Session timeout', '8 hours', 'Future tenant-level configurable setting'],
  ['Report archive retention', '12 months', 'Aligned with current demo plan'],
  ['External sharing', 'Restricted', 'Secure links and expiry controls planned'],
  ['Data source visibility', 'Internal labels', 'Provider names are visible in development-style badges'],
  ['Manual inputs', 'Internal only', 'Internal float inputs are management-provided estimates'],
];

export default async function PolicyPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);

  return (
    <div className="page settings-page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Security Policy</h1>
          <p className="page__desc">Governance and security policy settings for the {normalizedTicker} intelligence workspace.</p>
        </div>
        <SettingsBackLink ticker={normalizedTicker} />
      </div>

      <section className="settings-panel">
        <div className="settings-panel__head"><div><span>Governance</span><h2>Workspace policy</h2></div><span className="badge blue">Demo</span></div>
        <div className="settings-table">
          <div className="settings-table__head"><span>Policy</span><span>Current setting</span><span>Notes</span></div>
          {policies.map(([policy, value, note]) => (
            <div className="settings-table__row" key={policy}><strong>{policy}</strong><span>{value}</span><span>{note}</span></div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel__title">Compliance Note</h2>
        <p className="page__desc">Currenc Intelligence provides market intelligence, monitoring, and reporting tools for corporate governance and investor relations workflows. The platform does not provide investment, trading, legal, or financial advice.</p>
      </section>
    </div>
  );
}
