'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { UserMenu } from './UserMenu';
import { slugFromPathname } from '@/lib/page-data-sources';
import { formatPortalDateTime } from '@/lib/timezone';
import { usePortalTimeZone } from './usePortalTimeZone';
import { CompanySwitcher } from './CompanySwitcher';
import { useTickerDataStatus } from './TickerDataStatusProvider';
import { NotificationInbox } from './NotificationInbox';
import { usePortalLanguage } from './usePortalLanguage';
import { portalLocale, type PortalMessageKey } from '@/lib/portal-i18n';
import { PortalLanguageMenu } from './PortalLanguageMenu';

const storageKey = 'monitor-design-b-sidebar-collapsed';
const themeStorageKey = 'monitor-design-b-theme';

const routeLabels: Record<string, { section: PortalMessageKey; page: PortalMessageKey }> = {
  'dashboard': { section: 'workspace', page: 'dashboard' },
  institutional: { section: 'workspace', page: 'ownership' },
  'short-interest': { section: 'workspace', page: 'shortInterest' },
  'lending-pressure': { section: 'workspace', page: 'lendingPressure' },
  'squeeze-readiness': { section: 'development', page: 'squeezeReadiness' },
  'internal-float': { section: 'workspace', page: 'internalFloat' },
  sentiment: { section: 'workspace', page: 'socialSentiment' },
  'event-calendar': { section: 'workspace', page: 'secFilings' },
  'price-scenario': { section: 'development', page: 'priceScenarios' },
  reports: { section: 'workspace', page: 'reportArchive' },
  settings: { section: 'settings', page: 'general' },
  'user-profile': { section: 'settings', page: 'userProfile' },
  'role-permissions': { section: 'settings', page: 'rolePermissions' },
  billing: { section: 'development', page: 'billingPlan' },
  companies: { section: 'settings', page: 'companyManagement' },
  'email-settings': { section: 'settings', page: 'deliverySettings' },
  'alert-rules': { section: 'settings', page: 'alertRules' },
  notifications: { section: 'development', page: 'notifications' },
  policy: { section: 'development', page: 'securityPolicy' },
  'api-connectors': { section: 'development', page: 'connectors' },
  'import-data': { section: 'development', page: 'dataSources' },
};

function applyCollapsedState(collapsed: boolean) {
  document.documentElement.dataset.designBSidebar = collapsed ? 'collapsed' : 'expanded';
}

function applyThemeState(theme: 'light' | 'dark') {
  document.documentElement.dataset.designBTheme = theme;
}

function formatImportDataUpdatedAt(updatedAt: string | null, timeZone: string, emptyText: string, locale: string) {
  if (!updatedAt) return emptyText;
  return formatPortalDateTime(updatedAt, timeZone, {}, locale);
}

function formatDataDate(value: string | null, locale: string, emptyText: string, suffix = '') {
  if (!value) return emptyText;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return `${value}${suffix}`;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const formatted = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  return `${formatted}${suffix}`;
}

export function DesignBTopbar({
  ticker,
  companyName,
}: {
  ticker: string;
  companyName: string;
}) {
  const pathname = usePathname();
  const { language, t } = usePortalLanguage();
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

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const next = (event as CustomEvent<'light' | 'dark'>).detail;
      if (next !== 'light' && next !== 'dark') return;
      setTheme(next);
      applyThemeState(next);
    };
    window.addEventListener('currenc-theme-change', handleThemeChange);
    return () => window.removeEventListener('currenc-theme-change', handleThemeChange);
  }, []);

  const current = useMemo(() => {
    if (pathname.endsWith('/internal-float/dtc-upload')) {
      return { section: t('internalFloat'), page: t('dtcReportUpload') };
    }
    if (pathname.endsWith('/settings/alerts')) {
      return { section: t('settings'), page: t('alertRules') };
    }
    const slug = slugFromPathname(pathname);
    const route = routeLabels[slug];
    return route
      ? { section: t(route.section), page: t(route.page) }
      : { section: t('workspace'), page: slug ? slug.replace(/-/g, ' ') : t('overview') };
  }, [pathname, t]);
  const currentSlug = slugFromPathname(pathname);
  const pageStatus = tickerStatus?.pages[currentSlug];
  const pageUpdatedAt = pageStatus?.updatedAt ?? null;
  const dateMode = pageStatus?.dateMode ?? 'last-update';
  const isDataAsOf = dateMode === 'market-close' || dateMode === 'snapshot';
  const statusLabel = dateMode === 'latest-filing'
    ? t('latestFiling')
    : dateMode === 'last-update'
      ? t('lastUpdate')
      : t('dataAsOf');
  const locale = portalLocale(language);
  const statusValue = dateMode === 'last-update'
    ? formatImportDataUpdatedAt(pageUpdatedAt, timeZone, t('noImportFiles'), locale)
    : formatDataDate(pageStatus?.displayDate ?? null, locale, t('noData'), isDataAsOf ? ` · ${t('usMarketClose')}` : '');

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
          aria-label={collapsed ? t('keepSidebarExpanded') : t('useCompactSidebar')}
          aria-pressed={!collapsed}
          title={collapsed ? t('keepSidebarExpanded') : t('useCompactSidebar')}
          onClick={toggleCollapsed}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="10" width="14" height="10" rx="2" />
            <path d={collapsed ? 'M9 10V7a4 4 0 0 1 7.5-2' : 'M8 10V7a4 4 0 0 1 8 0v3'} />
            <path d="M12 14v2" />
          </svg>
        </button>

        <div className="portal-design-b-actions" aria-label={t('quickActions')}>
          <CompanySwitcher ticker={ticker} companyName={companyName} />
          <button
            type="button"
            className={theme === 'dark' ? 'is-active' : ''}
            aria-label={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
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
          <PortalLanguageMenu />
          <NotificationInbox />
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
              <span>{statusLabel}</span>
              <strong title={isDataAsOf ? 'US market trading-session date' : undefined}>{statusValue}</strong>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
