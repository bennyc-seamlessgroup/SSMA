'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { UserMenu } from './UserMenu';
import { DevModeToggle } from './DevModeToggle';

const groups = [
  {
    label: 'Workspace',
    items: [
      ['Dashboard', 'dashboard-v2'],
      ['Ownership', 'institutional'],
      ['Short Interest', 'short-interest'],
      ['Lending Pressure', 'lending-pressure'],
      ['Squeeze Readiness', 'squeeze-readiness'],
      ['Internal Float', 'internal-float-v2'],
      ['Narrative', 'sentiment'],
      ['SEC Filings', 'event-calendar'],
      ['Price Scenarios', 'price-scenario'],
      ['Report Archive', 'reports'],
    ],
  },
  {
    label: 'Research',
    muted: true,
    items: [
      ['Overview (Obsolete)', ''],
      ['Dashboard (Obsolete)', 'dashboard'],
      ['Internal Float (Obsolete)', 'internal-float'],
      ['Smart Money', 'smart-money'],
      ['News & Filings', 'news'],
      ['Insider Activity', 'insider'],
      ['Shareholder Watch', 'shareholder-watch'],
      ['Options / Gamma', 'options'],
      ['Peer Comparison', 'peer-comparison'],
      ['Market Defense', 'market-defense'],
      ['Premium', 'premium-intelligence'],
    ],
  },
  {
    label: 'AI Reports',
    muted: true,
    items: [
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
const pageImportSeenKeyPrefix = 'import-data-page-seen-version';

const pageImportFiles: Record<string, string[]> = {
  'dashboard-v2': ['dashboard_v2_CURR_consolidated_4_web.json'],
  institutional: [
    'institutional_ownership_CURR_consolidated_4_web.json',
    'fintel_security_ownership_premium_CURR_consolidated_4_web.json',
    'fintel_activist_filings_premium_CURR_consolidated_4_web.json',
  ],
  'short-interest': ['ortex_CURR_consolidated_4_web.json'],
  'lending-pressure': ['lending_pressure_CURR_consolidated_4_web.json'],
  sentiment: ['adanos-reddit_CURR_consolidated_4_web.json', 'adanos-x_CURR_consolidated_4_web.json'],
  'event-calendar': ['news_filings/CURR_sec_filings.json'],
};

type ImportFileStatus = {
  path: string;
  exists: boolean;
  updatedAt: string | null;
  size: number | null;
  versionKey: string | null;
};

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
  const router = useRouter();
  const [currentImportDataVersion, setCurrentImportDataVersion] = useState(importDataVersion);
  const [seenImportDataVersion, setSeenImportDataVersion] = useState(importDataVersion);
  const [currentPageImportVersions, setCurrentPageImportVersions] = useState<Record<string, string>>({});
  const [seenPageImportVersions, setSeenPageImportVersions] = useState<Record<string, string>>({});
  const [designBPanel, setDesignBPanel] = useState<'workspace' | 'development'>('workspace');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.filter(group => group.muted).map(group => [group.label, true])),
  );
  const hasImportDataUpdate = currentImportDataVersion !== seenImportDataVersion;

  const fetchPageImportVersions = useCallback(async () => {
    const versions: Record<string, string> = {};

    await Promise.all(Object.entries(pageImportFiles).map(async ([slug, files]) => {
      const parts = await Promise.all(files.map(async file => {
        try {
          const response = await fetch(`/api/import-data-version?file=${encodeURIComponent(file)}`, { cache: 'no-store' });
          if (!response.ok) return `${file}:unavailable`;

          const status = await response.json() as ImportFileStatus;
          const version = status.exists
            ? status.versionKey ?? status.updatedAt ?? String(status.size ?? 'exists')
            : 'missing';

          return `${file}:${version}`;
        } catch {
          return `${file}:unavailable`;
        }
      }));

      versions[slug] = parts.join('|');
    }));

    return versions;
  }, []);

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

    const initializePageImportVersions = async () => {
      const latest = await fetchPageImportVersions();
      if (cancelled) return;

      setCurrentPageImportVersions(latest);
      setSeenPageImportVersions(Object.fromEntries(Object.entries(latest).map(([slug, version]) => {
        const key = pageImportSeenKey(ticker, slug);
        const storedVersion = window.localStorage.getItem(key);
        if (storedVersion) return [slug, storedVersion];

        window.localStorage.setItem(key, version);
        return [slug, version];
      })));
    };

    initializePageImportVersions();

    return () => {
      cancelled = true;
    };
  }, [fetchPageImportVersions, ticker]);

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

  useEffect(() => {
    let cancelled = false;

    const checkForPageImportUpdates = async () => {
      const latest = await fetchPageImportVersions();
      if (cancelled) return;

      const changed = Object.entries(latest).some(([slug, version]) => {
        const current = currentPageImportVersions[slug];
        return current && current !== version;
      });

      if (changed) {
        setCurrentPageImportVersions(current => ({ ...current, ...latest }));
        router.refresh();
      }
    };

    const interval = window.setInterval(checkForPageImportUpdates, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [currentPageImportVersions, fetchPageImportVersions, router]);

  const acknowledgeImportDataUpdate = () => {
    window.localStorage.setItem(importDataSeenKey, currentImportDataVersion);
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
        {groups.map((group, index) => {
          const collapsed = Boolean(collapsedGroups[group.label]);
          const showDevelopmentDivider = group.muted && !groups[index - 1]?.muted;

          return (
            <div
              key={group.label}
              className={`portal-sidebar__group-wrap ${group.muted ? 'design-b-dev-wrap' : 'design-b-workspace-wrap'}`}
            >
              {showDevelopmentDivider && (
                <div className="design-b-dev-controls">
                  <DevModeToggle />
                  <Link className="portal-backend-link dev-only" href="/operations/sec-filings">Backend Portal</Link>
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
