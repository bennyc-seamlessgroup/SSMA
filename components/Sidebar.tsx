'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserMenu } from './UserMenu';

const groups = [
  {
    label: 'Company workspace',
    items: [
      ['Dashboard', 'dashboard'],
      ['Overview (Obsolete)', ''],
    ],
  },
  {
    label: 'Company intelligence',
    items: [
      ['News & Filings', 'news'],
      ['Insider Activity', 'insider'],
      ['Institutional Ownership', 'institutional'],
      ['Shareholder Watch', 'shareholder-watch'],
      ['Internal Float Intelligence', 'internal-float'],
      ['Short Interest', 'short-interest'],
      ['Options / Gamma', 'options'],
      ['Sentiment', 'sentiment'],
      ['Peer Comparison', 'peer-comparison'],
      ['Event Calendar', 'event-calendar'],
    ],
  },
  {
    label: 'AI reports',
    items: [
      ['Report Archive', 'reports'],
      ['Daily Brief', 'daily-brief'],
      ['Ownership Report', 'ownership-report'],
      ['Short Interest Report', 'short-interest-report'],
      ['Options Report', 'options-report'],
      ['Risk Alerts', 'risk-alerts'],
      ['Weekly Executive Summary', 'weekly-executive-summary'],
    ],
  },
  {
    label: 'Settings',
    items: [
      ['General Settings', 'settings'],
      ['Delivery Settings', 'email-settings'],
      ['Alert Rules', 'alert-rules'],
    ],
  },
  {
    label: 'Admin / Data',
    items: [
      ['Import Data Pool', 'import-data'],
      ['Manual Float Inputs', 'manual-float-inputs'],
      ['Source Map', 'source-map'],
      ['Data Dictionary', 'data-dictionary'],
      ['API Connectors', 'api-connectors'],
    ],
  },
];

export function Sidebar({ ticker, companyName }: { ticker: string; companyName: string }) {
  const pathname = usePathname();

  return (
    <aside className="portal-sidebar company-sidebar">
      <Link href="/" className="brand-lockup portal-brand">
        <span className="brand-mark">CI</span>
        <span className="portal-brand__text">
          <strong>Currenc Intelligence</strong>
          <small>Short Squeeze Monitoring &amp; Analysis</small>
        </span>
      </Link>

      <div className="portal-help-card workspace-card">
        <div className="portal-sidebar__label">Selected company</div>
        <div className="workspace-card__ticker">{ticker}</div>
        <p>{companyName}</p>
        <Link className="text-link" href={`/monitor/${ticker}/companies`}>Switch company</Link>
      </div>

      <div className="portal-sidebar__scroll">
        {groups.map(group => (
          <div key={group.label} className="portal-sidebar__group">
            <div className="portal-sidebar__label">{group.label}</div>
            {group.items.map(([label, slug]) => {
              const href = `/monitor/${ticker}${slug ? `/${slug}` : ''}`;
              const active = pathname === href;
              return (
                <Link key={slug || 'overview'} href={href as any} className={`portal-menu ${active ? 'active' : ''}`}>
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <UserMenu ticker={ticker} />
    </aside>
  );
}
