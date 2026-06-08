'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserMenu } from './UserMenu';
import { DevModeToggle } from './DevModeToggle';

const groups = [
  {
    label: 'Workspace',
    items: [
      ['Dashboard', 'dashboard'],
      ['Dashboard (v2)', 'dashboard-v2'],
      ['Institutional Ownership', 'institutional'],
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

const importDataSeenKey = 'import-data-seen-version';

export function Sidebar({
  ticker,
  companyName,
  importDataVersion,
}: {
  ticker: string;
  companyName: string;
  importDataVersion: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentImportDataVersion, setCurrentImportDataVersion] = useState(importDataVersion);
  const [seenImportDataVersion, setSeenImportDataVersion] = useState(importDataVersion);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.filter(group => group.muted).map(group => [group.label, true])),
  );
  const hasImportDataUpdate = currentImportDataVersion !== seenImportDataVersion;

  useEffect(() => {
    const storedVersion = window.localStorage.getItem(importDataSeenKey);
    if (storedVersion) {
      setSeenImportDataVersion(storedVersion);
    } else {
      window.localStorage.setItem(importDataSeenKey, importDataVersion);
    }
  }, [importDataVersion]);

  useEffect(() => {
    setCurrentImportDataVersion(importDataVersion);
  }, [importDataVersion]);

  useEffect(() => {
    let cancelled = false;

    const checkForImportDataUpdate = async () => {
      try {
        const response = await fetch('/api/import-data-version', { cache: 'no-store' });
        if (!response.ok) return;

        const latest = await response.json() as { version?: string };
        if (!latest.version || latest.version === currentImportDataVersion || cancelled) return;

        setCurrentImportDataVersion(latest.version);
        router.refresh();
      } catch {
        // Keep the existing UI if the local dev server is briefly unavailable.
      }
    };

    const interval = window.setInterval(checkForImportDataUpdate, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [currentImportDataVersion, router]);

  const acknowledgeImportDataUpdate = () => {
    window.localStorage.setItem(importDataSeenKey, currentImportDataVersion);
    setSeenImportDataVersion(currentImportDataVersion);
  };

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
        <p className="workspace-card__company">
          <span>{companyName}</span>
          {hasImportDataUpdate && <span className="portal-update-dot" aria-label="New import data available" />}
        </p>
        <Link className="text-link" href={`/monitor/${ticker}/companies`} onClick={acknowledgeImportDataUpdate}>Switch company</Link>
      </div>

      <div className="portal-sidebar__scroll">
        {groups.map((group, index) => {
          const collapsed = Boolean(collapsedGroups[group.label]);
          const showDevelopmentDivider = group.muted && !groups[index - 1]?.muted;

          return (
            <div key={group.label} className="portal-sidebar__group-wrap">
              {showDevelopmentDivider && (
                <>
                  <DevModeToggle />
                  <div className="portal-sidebar__dev-divider dev-only">Development use only</div>
                </>
              )}
              <div className={`portal-sidebar__group-block ${group.muted ? 'dev-only' : ''}`}>
                <div
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
                          <Link
                            key={slug || 'overview'}
                            href={href as any}
                            className={`portal-menu ${active ? 'active' : ''}`}
                            onClick={acknowledgeImportDataUpdate}
                          >
                            <span>{label}</span>
                            {hasImportDataUpdate && active && <span className="portal-update-dot" aria-label="New import data available" />}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <UserMenu ticker={ticker} />
    </aside>
  );
}
