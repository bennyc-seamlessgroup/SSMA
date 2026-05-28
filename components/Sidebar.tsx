'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { UserMenu } from './UserMenu';

const groups = [
  {
    label: 'Workspace',
    items: [
      ['Dashboard', 'dashboard'],
      ['Short Interest', 'short-interest'],
      ['Lending Pressure', 'lending-pressure'],
      ['Squeeze Readiness', 'squeeze-readiness'],
      ['Internal Float', 'internal-float'],
      ['Smart Money', 'smart-money'],
      ['Narrative', 'sentiment'],
      ['Catalysts', 'event-calendar'],
      ['Price Scenarios', 'price-scenario'],
      ['Market Defense', 'market-defense'],
      ['Premium', 'premium-intelligence'],
    ],
  },
  {
    label: 'Research',
    muted: true,
    items: [
      ['Overview (Obsolete)', ''],
      ['News & Filings', 'news'],
      ['Insider Activity', 'insider'],
      ['Institutional Ownership', 'institutional'],
      ['Shareholder Watch', 'shareholder-watch'],
      ['Options / Gamma', 'options'],
      ['Peer Comparison', 'peer-comparison'],
    ],
  },
  {
    label: 'AI Reports',
    muted: true,
    items: [
      ['Archive', 'reports'],
      ['Daily Brief', 'daily-brief'],
      ['Ownership Report', 'ownership-report'],
      ['Short Interest Report', 'short-interest-report'],
      ['Options Report', 'options-report'],
      ['Risk Alerts', 'risk-alerts'],
      ['Weekly Summary', 'weekly-executive-summary'],
    ],
  },
  {
    label: 'Admin / Data',
    muted: true,
    items: [
      ['Import Pool', 'import-data'],
      ['Manual Float', 'manual-float-inputs'],
      ['Source Map', 'source-map'],
      ['Dictionary', 'data-dictionary'],
      ['Connectors', 'api-connectors'],
    ],
  },
];

export function Sidebar({ ticker, companyName }: { ticker: string; companyName: string }) {
  const pathname = usePathname();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (label: string) => {
    setCollapsedGroups(current => ({ ...current, [label]: !current[label] }));
  };

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
        {groups.map(group => {
          const collapsed = Boolean(collapsedGroups[group.label]);

          return (
            <div
              key={group.label}
              className={`portal-sidebar__group ${collapsed ? 'is-collapsed' : ''} ${group.muted ? 'is-muted' : ''}`}
            >
              <button
                type="button"
                className="portal-sidebar__group-toggle"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={!collapsed}
              >
                <span>{group.label}</span>
                <span className="portal-sidebar__chevron" aria-hidden="true">›</span>
              </button>
              {!collapsed && (
                <div className="portal-sidebar__group-items">
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
              )}
            </div>
          );
        })}
      </div>

      <UserMenu ticker={ticker} />
    </aside>
  );
}
