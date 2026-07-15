'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { UserMenu } from './UserMenu';
import { DevModeToggle } from './DevModeToggle';
import { useTickerDataStatus } from './TickerDataStatusProvider';
import { getAuthenticatedProfile } from '@/lib/auth-client';

const groups = [
  {
    label: 'Workspace',
    items: [
      ['Dashboard', 'dashboard-v2'],
      ['Ownership', 'institutional'],
      ['Internal Float', 'internal-float-v2'],
      ['Short Interest', 'short-interest'],
      ['Lending Pressure', 'lending-pressure'],
      ['Social Sentiment', 'sentiment'],
      ['SEC Filings', 'event-calendar'],
      ['Report Archive', 'reports'],
    ],
  },
  {
    label: 'Research',
    muted: true,
    items: [
      ['Overview (Obsolete)', ''],
      ['Dashboard (Obsolete)', 'dashboard'],
      ['Option / Gamma', 'options'],
      ['Peer Comparison', 'peer-comparison'],
      ['Squeeze Readiness', 'squeeze-readiness'],
      ['Price Scenarios', 'price-scenario'],
      ['Market Defense', 'market-defense'],
      ['Premium', 'premium-intelligence'],
    ],
  },
  {
    label: 'Admin / Data',
    muted: true,
    items: [
      ['Data Sources', 'import-data'],
      ['Connectors', 'api-connectors'],
      ['Notifications', 'notifications'],
      ['Security Policy', 'policy'],
      ['Billing & Plan', 'billing'],
    ],
  },
];

const settingsItems = [
  ['General', 'settings'],
  ['User Profile', 'user-profile'],
  ['Role & Permissions', 'role-permissions'],
  ['Company Management', 'companies'],
  ['Delivery Settings', 'email-settings'],
  ['Alert Rules', 'alert-rules'],
];

const importDataSeenKeyPrefix = 'import-data-seen-version';
const pageImportSeenKeyPrefix = 'import-data-page-seen-version';

function importDataSeenKey(ticker: string) {
  return `${importDataSeenKeyPrefix}:${ticker}`;
}

function pageImportSeenKey(ticker: string, slug: string) {
  return `${pageImportSeenKeyPrefix}:${ticker}:${slug}`;
}

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
  const tickerStatus = useTickerDataStatus();
  const currentImportDataVersion = tickerStatus?.version ?? importDataVersion;
  const [seenImportDataVersion, setSeenImportDataVersion] = useState(importDataVersion);
  const [seenPageImportVersions, setSeenPageImportVersions] = useState<Record<string, string>>({});
  const [designBPanel, setDesignBPanel] = useState<'workspace' | 'settings' | 'development'>('workspace');
  const [isOperator, setIsOperator] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.filter(group => group.muted).map(group => [group.label, true])),
  );
  const currentPageImportVersions = useMemo(
    () => Object.fromEntries(
      Object.entries(tickerStatus?.pages ?? {}).map(([slug, status]) => [slug, status.version]),
    ),
    [tickerStatus],
  );
  const hasImportDataUpdate = currentImportDataVersion !== seenImportDataVersion;

  useEffect(() => {
    const key = importDataSeenKey(ticker);
    const storedVersion = window.localStorage.getItem(key);
    if (storedVersion) {
      setSeenImportDataVersion(storedVersion);
    } else {
      window.localStorage.setItem(key, currentImportDataVersion);
      setSeenImportDataVersion(currentImportDataVersion);
    }
  }, [currentImportDataVersion, ticker]);

  useEffect(() => {
    setSeenPageImportVersions({});
  }, [ticker]);

  useEffect(() => {
    let cancelled = false;
    getAuthenticatedProfile()
      .then(profile => {
        if (!cancelled) setIsOperator(String(profile.role ?? '').trim().toUpperCase() === 'OPERATOR');
      })
      .catch(() => {
        if (!cancelled) setIsOperator(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSeenPageImportVersions(current => {
      const next = { ...current };
      for (const [slug, version] of Object.entries(currentPageImportVersions)) {
        if (next[slug]) continue;
        const key = pageImportSeenKey(ticker, slug);
        const storedVersion = window.localStorage.getItem(key);
        if (storedVersion) {
          next[slug] = storedVersion;
        } else {
          window.localStorage.setItem(key, version);
          next[slug] = version;
        }
      }
      return next;
    });
  }, [currentPageImportVersions, ticker]);

  useEffect(() => {
    const slug = pathname.split('/').filter(Boolean)[2] ?? '';
    const settingsSlugs = new Set(settingsItems.map(([, itemSlug]) => itemSlug));
    const developmentSlugs = new Set(groups.filter(group => group.muted).flatMap(group => group.items.map(([, itemSlug]) => itemSlug)));
    if (settingsSlugs.has(slug)) {
      setDesignBPanel('settings');
    } else if (developmentSlugs.has(slug)) {
      setDesignBPanel('development');
    }
  }, [pathname]);

  const acknowledgeImportDataUpdate = () => {
    window.localStorage.setItem(importDataSeenKey(ticker), currentImportDataVersion);
    setSeenImportDataVersion(currentImportDataVersion);
  };

  const hasPageImportUpdate = (slug: string) => {
    const current = currentPageImportVersions[slug];
    if (!current) return false;

    return current !== seenPageImportVersions[slug];
  };

  const acknowledgePageImportUpdate = (slug: string) => {
    const current = currentPageImportVersions[slug];
    if (!current) return;

    window.localStorage.setItem(pageImportSeenKey(ticker, slug), current);
    setSeenPageImportVersions(versions => ({ ...versions, [slug]: current }));
  };

  const toggleGroup = (label: string) => {
    setCollapsedGroups(current => ({ ...current, [label]: !current[label] }));
  };

  return (
    <aside className="portal-sidebar company-sidebar" data-design-b-panel={designBPanel}>
      <div className="portal-design-b-rail" aria-label="Design B workspace rail">
        <Link href="/" className="portal-design-b-rail-logo" aria-label="Currenc Intelligence home">
          <img src="/ci_logo01.png" alt="" />
        </Link>
        <nav>
          <button
            type="button"
            className={designBPanel === 'workspace' ? 'active' : ''}
            title="Workspace"
            aria-label="Workspace"
            onClick={() => setDesignBPanel('workspace')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h5A1.5 1.5 0 0 1 12 5.5v5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 4 10.5v-5Z" />
              <path d="M14 5.5A1.5 1.5 0 0 1 15.5 4h3A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5v-13Z" />
              <path d="M4 15.5A1.5 1.5 0 0 1 5.5 14h5a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 4 18.5v-3Z" />
            </svg>
          </button>
          <button
            type="button"
            className={designBPanel === 'settings' ? 'active' : ''}
            title="Settings"
            aria-label="Settings"
            onClick={() => setDesignBPanel('settings')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.97 19.35a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.94a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.57 1.7 1.7 0 0 0 10 3.01V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.91 10H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
            </svg>
          </button>
          {isOperator ? (
            <button
              type="button"
              className={designBPanel === 'development' ? 'active' : ''}
              title="Development use only"
              aria-label="Development use only"
              onClick={() => {
                setDesignBPanel('development');
                setCollapsedGroups(current => ({
                  ...current,
                  ...Object.fromEntries(groups.filter(group => group.muted).map(group => [group.label, false])),
                }));
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m8 9-4 3 4 3" />
                <path d="m16 9 4 3-4 3" />
                <path d="m14 5-4 14" />
              </svg>
            </button>
          ) : null}
        </nav>
      </div>

      <Link href="/" className="brand-lockup portal-brand">
        <span className="brand-mark">CI</span>
        <span className="portal-brand__text">
          <strong>Currenc Intelligence</strong>
          <small>Short Monitoring &amp; Analysis</small>
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
        <div className="portal-sidebar__group-wrap design-b-settings-wrap">
          <div className="portal-sidebar__group-block">
            <div className="portal-sidebar__group">
              <div className="portal-sidebar__group-items portal-sidebar__settings-flat">
                {settingsItems.map(([label, slug]) => {
                  const href = `/monitor/${ticker}/${slug}`;
                  const active = pathname === href;
                  const pageHasImportUpdate = hasPageImportUpdate(slug);
                  return (
                    <Link
                      key={`${slug}-${label}`}
                      href={href as any}
                      className={`portal-menu ${active ? 'active' : ''}`}
                      onClick={() => {
                        acknowledgeImportDataUpdate();
                        acknowledgePageImportUpdate(slug);
                      }}
                    >
                      <span>{label}</span>
                      {pageHasImportUpdate && <span className="portal-update-dot" aria-label="New import data available" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {groups.map((group, index) => {
          const collapsed = designBPanel === 'development' && group.muted ? false : Boolean(collapsedGroups[group.label]);
          const showDevelopmentDivider = group.muted && !groups[index - 1]?.muted;

          return (
            <div
              key={group.label}
              className={`portal-sidebar__group-wrap ${group.muted ? 'design-b-dev-wrap' : 'design-b-workspace-wrap'}`}
            >
              {showDevelopmentDivider && (
                <div className="design-b-dev-controls">
                  <DevModeToggle />
                  <Link className="portal-backend-link dev-only" href="/operations/market-data">Backend Portal</Link>
                  <div className="portal-sidebar__dev-divider dev-only">Development use only</div>
                </div>
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
                        const pageHasImportUpdate = slug ? hasPageImportUpdate(slug) : false;
                        return (
                          <Link
                            key={slug || 'overview'}
                            href={href as any}
                            className={`portal-menu ${active ? 'active' : ''}`}
                            onClick={() => {
                              acknowledgeImportDataUpdate();
                              if (slug) acknowledgePageImportUpdate(slug);
                            }}
                          >
                            <span>{label}</span>
                            {pageHasImportUpdate && <span className="portal-update-dot" aria-label="New import data available" />}
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
