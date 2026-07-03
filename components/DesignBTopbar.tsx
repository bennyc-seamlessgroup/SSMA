'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { UserMenu } from './UserMenu';
import { slugFromPathname } from '@/lib/page-data-sources';
import { formatPortalDateTime } from '@/lib/timezone';
import { usePortalTimeZone } from './usePortalTimeZone';
import { CompanySwitcher } from './CompanySwitcher';
import { useTickerDataStatus } from './TickerDataStatusProvider';

const storageKey = 'monitor-design-b-sidebar-collapsed';
const themeStorageKey = 'monitor-design-b-theme';

const routeLabels: Record<string, { section: string; page: string }> = {
  'dashboard-v2': { section: 'Workspace', page: 'Dashboard' },
  institutional: { section: 'Workspace', page: 'Ownership' },
  'short-interest': { section: 'Workspace', page: 'Short Interest' },
  'lending-pressure': { section: 'Workspace', page: 'Lending Pressure' },
  'squeeze-readiness': { section: 'Workspace', page: 'Squeeze Readiness' },
  'internal-float-v2': { section: 'Workspace', page: 'Internal Float' },
  sentiment: { section: 'Workspace', page: 'Social Sentiment' },
  'event-calendar': { section: 'Workspace', page: 'SEC Filings' },
  'price-scenario': { section: 'Workspace', page: 'Price Scenarios' },
  reports: { section: 'Workspace', page: 'Report Archive' },
  settings: { section: 'Settings', page: 'Settings Overview' },
  'user-profile': { section: 'Settings', page: 'User Profile' },
  'role-permissions': { section: 'Settings', page: 'Role & Permissions' },
  billing: { section: 'Settings', page: 'Billing & Plan' },
  companies: { section: 'Settings', page: 'Company Management' },
  'email-settings': { section: 'Settings', page: 'Delivery Settings' },
  notifications: { section: 'Settings', page: 'Notifications' },
  'alert-rules': { section: 'Settings', page: 'Alert Rules' },
  policy: { section: 'Settings', page: 'Security Policy' },
  'api-connectors': { section: 'Settings', page: 'Connectors' },
  dashboard: { section: 'Development', page: 'Dashboard Obsolete' },
  'import-data': { section: 'Development', page: 'Data Sources' },
};

function applyCollapsedState(collapsed: boolean) {
  document.documentElement.dataset.designBSidebar = collapsed ? 'collapsed' : 'expanded';
}

function applyThemeState(theme: 'light' | 'dark') {
  document.documentElement.dataset.designBTheme = theme;
}

function formatImportDataUpdatedAt(updatedAt: string | null, timeZone: string) {
  if (!updatedAt) return 'No import data files found';
  return formatPortalDateTime(updatedAt, timeZone);
}

export function DesignBTopbar({
  ticker,
  companyName,
}: {
  ticker: string;
  companyName: string;
}) {
  const pathname = usePathname();
  const tickerStatus = useTickerDataStatus();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const timeZone = usePortalTimeZone();

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey) === 'true';
    const storedTheme = window.localStorage.getItem(themeStorageKey) === 'dark' ? 'dark' : 'light';
    setCollapsed(stored);
    setTheme(storedTheme);
    applyCollapsedState(stored);
    applyThemeState(storedTheme);
  }, []);

  const current = useMemo(() => {
    if (pathname.endsWith('/internal-float-v2/dtc-upload')) {
      return { section: 'Internal Float', page: 'DTC Report Upload' };
    }
    if (pathname.endsWith('/settings/alerts')) {
      return { section: 'Settings', page: 'Alert Rules' };
    }
    const slug = slugFromPathname(pathname);
    return routeLabels[slug] ?? { section: 'Workspace', page: slug ? slug.replace(/-/g, ' ') : 'Overview' };
  }, [pathname]);
  const currentSlug = slugFromPathname(pathname);
  const pageStatus = tickerStatus?.pages[currentSlug];
  const pageUpdatedAt = pageStatus?.updatedAt ?? null;

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem(storageKey, String(next));
    applyCollapsedState(next);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.localStorage.setItem(themeStorageKey, next);
    applyThemeState(next);
  };

  return (
    <div className="portal-design-b-topbar">
      <div className="portal-design-b-topbar-row">
        <button
          type="button"
          className="portal-design-b-collapse"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={collapsed}
          onClick={toggleCollapsed}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={collapsed ? 'm9 6 6 6-6 6M4 6l6 6-6 6' : 'm15 6-6 6 6 6M20 6l-6 6 6 6'} />
          </svg>
        </button>

        <CompanySwitcher ticker={ticker} companyName={companyName} />

        <div className="portal-design-b-actions" aria-label="Design B quick actions">
          <button
            type="button"
            className={theme === 'dark' ? 'is-active' : ''}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={theme === 'dark'}
            onClick={toggleTheme}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {theme === 'dark' ? (
                <>
                  <path d="M12 4V2" />
                  <path d="M12 22v-2" />
                  <path d="m4.93 4.93-1.41-1.41" />
                  <path d="m20.48 20.48-1.41-1.41" />
                  <path d="M4 12H2" />
                  <path d="M22 12h-2" />
                  <path d="m4.93 19.07-1.41 1.41" />
                  <path d="m20.48 3.52-1.41 1.41" />
                  <path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
                </>
              ) : (
                <path d="M21 14.1A7.5 7.5 0 0 1 9.9 3a8.8 8.8 0 1 0 11.1 11.1Z" />
              )}
            </svg>
          </button>
          <button type="button" aria-label="Notifications">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z" />
              <path d="M10 21h4" />
            </svg>
          </button>
          <UserMenu ticker={ticker} />
        </div>
      </div>

      <div className="portal-design-b-heading-row">
        <div className="portal-design-b-page-title">
          <h1>{current.page}</h1>
          <nav aria-label="Breadcrumb">
            <span>Currenc Intelligence</span>
            <i>/</i>
            <span>{current.section}</span>
            <i>/</i>
            <strong>{current.page}</strong>
          </nav>
        </div>

        {pageStatus ? (
          <div className="portal-design-b-heading-actions">
            <div className="portal-design-b-update">
              <span>Last Update</span>
              <strong>{formatImportDataUpdatedAt(pageUpdatedAt, timeZone)}</strong>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
