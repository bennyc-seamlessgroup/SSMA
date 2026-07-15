import { SettingsBackLink } from '@/components/SettingsBackLink';
import { normalizeTicker } from '@/lib/ticker-data';

const roles = [
  ['Owner', 'CEO / CFO', 'Full workspace, billing, users, exports'],
  ['IR Admin', 'Investor relations lead', 'Reports, recipients, alerts, company intelligence'],
  ['Board Viewer', 'Board member', 'Read-only dashboard, reports, and archive'],
  ['Advisor', 'Capital markets advisor', 'Dashboard, alerts, reports, and selected data pages'],
];

export default async function RolePermissionsPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);

  return (
    <div className="page settings-page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Role & Permissions</h1>
          <p className="page__desc">Access model for executives, IR users, advisors, and board viewers in the {normalizedTicker} workspace.</p>
        </div>
        <SettingsBackLink ticker={normalizedTicker} />
      </div>

      <section className="settings-panel">
        <div className="settings-panel__head"><div><span>Access model</span><h2>Workspace roles</h2></div><span className="badge blue">Demo</span></div>
        <div className="settings-table">
          <div className="settings-table__head"><span>Role</span><span>Best for</span><span>Access</span></div>
          {roles.map(([role, bestFor, access]) => (
            <div className="settings-table__row" key={role}><strong>{role}</strong><span>{bestFor}</span><span>{access}</span></div>
          ))}
        </div>
      </section>

      <section className="grid cols-3">
        <div className="panel"><h2 className="panel__title">Approval Flow</h2><p className="page__desc">Report approval can require IR Admin review before executive delivery.</p></div>
        <div className="panel"><h2 className="panel__title">External Advisors</h2><p className="page__desc">Advisor access can be limited to selected company workspaces and report categories.</p></div>
        <div className="panel"><h2 className="panel__title">Future Controls</h2><p className="page__desc">SSO, audit logs, and granular field permissions will be added later.</p></div>
      </section>
    </div>
  );
}
