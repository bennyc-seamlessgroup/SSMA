import Link from 'next/link';
import { PortalTimeZoneSelect } from '@/components/PortalTimeZoneSelect';
import { buildDashboard } from '@/lib/mock-data';

const languageOptions = [
  ['English', 'Active'],
  ['Traditional Chinese', 'Coming soon'],
  ['Simplified Chinese', 'Coming soon'],
];

const settingGroups = [
  {
    title: 'Account',
    rows: [
      ['Profile', 'User profile fields synced through the authentication API', 'user-profile'],
      ['Role & Permissions', 'Manage executives, IR users, advisors, and viewer access', 'role-permissions'],
      ['Billing & Plan', 'Subscription coverage, seats, invoice routing, and retention', 'billing'],
    ],
  },
  {
    title: 'Workspace',
    rows: [
      ['Company Management', 'Switch company, add issuer workspaces, and manage coverage', 'companies'],
      ['Language', 'Portal display language preference for this account', null],
      ['Data Display', 'Number formats, timezone, market session, and chart defaults', null],
    ],
  },
  {
    title: 'Reports & Alerts',
    rows: [
      ['Delivery Settings', 'Recipients, report windows, approval flow, and test emails', 'email-settings'],
      ['Notifications', 'Email, in-app, and executive alert routing preferences', 'notifications'],
      ['Alert Rules', 'Thresholds for short pressure, sentiment, ownership, and filings', 'alert-rules'],
    ],
  },
  {
    title: 'Security & Governance',
    rows: [
      ['Security Policy', 'Session controls, access review, and protected workspace rules', 'policy'],
      ['Connectors & Data Sources', 'Current ticker-aware JSON outputs and pipeline readiness', 'api-connectors'],
      ['Audit Trail', 'Report archive history and future user activity logs', 'reports'],
    ],
  },
];

export default async function SettingsPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const company = buildDashboard(ticker).company;

  return (
    <div className="page settings-page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Settings</h1>
          <p className="page__desc">Manage account preferences, workspace access, report delivery, alerts, and governance controls for this company workspace.</p>
        </div>
      </div>

      <section className="settings-hero">
        <div className="settings-profile-card">
          <div className="settings-avatar">DU</div>
          <div>
            <h2>Demo User</h2>
            <p>IR Admin · demo@currencintel.com</p>
          </div>
        </div>
        <div className="settings-workspace-card">
          <span>Current workspace</span>
          <strong>{company.company_name}</strong>
          <p>{company.ticker} · {company.exchange}</p>
        </div>
      </section>

      <section className="settings-layout">
        <div className="settings-stack">
          <section className="settings-panel" id="language-preferences">
            <div className="settings-panel__head">
              <div>
                <span>Preferences</span>
                <h2>Language</h2>
              </div>
              <span className="badge blue">Demo setting</span>
            </div>
            <div className="language-switch">
              {languageOptions.map(([label, status]) => (
                <button className={status === 'Active' ? 'active' : ''} type="button" key={label}>
                  <strong>{label}</strong>
                  <span>{status}</span>
                </button>
              ))}
            </div>
            <p className="settings-note">Language switching is prepared for the portal UI. Translation behavior will be connected later.</p>
          </section>

          <section className="settings-panel" id="date-time-preferences">
            <div className="settings-panel__head">
              <div>
                <span>Preferences</span>
                <h2>Date & Time</h2>
              </div>
              <span className="badge blue">Active</span>
            </div>
            <PortalTimeZoneSelect />
            <p className="settings-note">This controls portal timestamps, page Last Update values, report dates, and narrative timeline labels for this browser.</p>
          </section>

          {settingGroups.map(group => (
            <section className="settings-panel" id={group.title.toLowerCase().replaceAll(' ', '-')} key={group.title}>
              <div className="settings-panel__head">
                <div>
                  <span>Settings</span>
                  <h2>{group.title}</h2>
                </div>
              </div>
              <div className="settings-list">
                {group.rows.map(([title, description, slug]) => {
                  const content = (
                    <>
                      <span>
                        <strong>{title}</strong>
                        <small>{description}</small>
                      </span>
                      <em>{slug ? 'Open' : 'Configured later'}</em>
                    </>
                  );

                  return slug ? (
                    <Link className="settings-row" href={`/monitor/${company.ticker}/${slug}` as any} key={title}>
                      {content}
                    </Link>
                  ) : (
                    <div className="settings-row muted" key={title}>{content}</div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
