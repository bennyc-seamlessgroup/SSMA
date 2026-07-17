'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DevModeToggle } from './DevModeToggle';
import { useTickerDataStatus } from './TickerDataStatusProvider';
import { setOperationsTicker } from '@/lib/operations/ticker-client';
import { usePortalLanguage } from './usePortalLanguage';

const workspaceItems = [
  ['dashboard', 'dashboard'],
  ['ownership', 'institutional'],
  ['internalFloat', 'internal-float'],
  ['shortInterest', 'short-interest'],
  ['lendingPressure', 'lending-pressure'],
  ['socialSentiment', 'sentiment'],
  ['secFilings', 'event-calendar'],
  ['reportArchive', 'reports'],
] as const;

const settingsItems = [
  ['general', 'settings'],
  ['userProfile', 'user-profile'],
  ['companyManagement', 'companies'],
  ['alertRules', 'alert-rules'],
  ['deliverySettings', 'email-settings'],
] as const;

const importDataSeenKeyPrefix = 'import-data-seen-version';
const pageImportSeenKeyPrefix = 'import-data-page-seen-version';

function importDataSeenKey(ticker: string) {
  return `${importDataSeenKeyPrefix}:${ticker}`;
}

function pageImportSeenKey(ticker: string, slug: string) {
  return `${pageImportSeenKeyPrefix}:${ticker}:${slug}`;
}

function NavigationIcon({ slug }: { slug: string }) {
  if (slug === 'dashboard') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
  }
  if (slug === 'institutional') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M6 17V9m4 8V9m4 8V9m4 8V9M3 7h18L12 3 3 7Z" /></svg>;
  }
  if (slug === 'internal-float') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z" /><path d="M8 10h8M8 14h5M7 6V4h10v2" /></svg>;
  }
  if (slug === 'short-interest') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M8.5 13.5 12 17l3.5-3.5" /></svg>;
  }
  if (slug === 'lending-pressure') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15c2.2 0 2.2-6 4.4-6s2.2 6 4.4 6 2.2-6 4.4-6S19.4 15 22 15" /><path d="M4 19h16M4 5h16" /></svg>;
  }
  if (slug === 'sentiment') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4V5Z" /><path d="M8 9h8M8 12h5" /></svg>;
  }
  if (slug === 'event-calendar') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h6" /></svg>;
  }
  if (slug === 'settings') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.1.38.3.72.6 1 .3.28.68.42 1.1.4h.1v4h-.1a1.7 1.7 0 0 0-1.7.6Z" /></svg>;
  }
  if (slug === 'user-profile') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>;
  }
  if (slug === 'companies') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V5l8-3 8 3v16M8 8h2m4 0h2M8 12h2m4 0h2M8 16h2m4 0h2M10 21v-3h4v3" /></svg>;
  }
  if (slug === 'alert-rules') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /><path d="M18.5 3.5 20 2m-14.5 1.5L4 2" /></svg>;
  }
  if (slug === 'email-settings') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v5h5M9 13h7M9 17h5" /></svg>;
}

function isSettingsPath(pathname: string, ticker: string) {
  return settingsItems.some(([, slug]) => pathname === `/monitor/${ticker}/${slug}`);
}

export function Sidebar({
  ticker,
  importDataVersion,
}: {
  ticker: string;
  companyName: string;
  importDataVersion: string;
}) {
  const pathname = usePathname();
  const { t } = usePortalLanguage();
  const tickerStatus = useTickerDataStatus();
  const currentImportDataVersion = tickerStatus?.version ?? importDataVersion;
  const [, setSeenImportDataVersion] = useState(importDataVersion);
  const [seenPageImportVersions, setSeenPageImportVersions] = useState<Record<string, string>>({});
  const [navigationView, setNavigationView] = useState<'workspace' | 'settings'>(
    () => isSettingsPath(pathname, ticker) ? 'settings' : 'workspace',
  );
  const currentPageImportVersions = useMemo(
    () => Object.fromEntries(Object.entries(tickerStatus?.pages ?? {}).map(([slug, status]) => [slug, status.version])),
    [tickerStatus],
  );

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
    setNavigationView(isSettingsPath(pathname, ticker) ? 'settings' : 'workspace');
  }, [pathname, ticker]);

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

  const acknowledgeImportDataUpdate = () => {
    window.localStorage.setItem(importDataSeenKey(ticker), currentImportDataVersion);
    setSeenImportDataVersion(currentImportDataVersion);
  };

  const hasPageImportUpdate = (slug: string) => {
    const current = currentPageImportVersions[slug];
    return Boolean(current && current !== seenPageImportVersions[slug]);
  };

  const acknowledgePageImportUpdate = (slug: string) => {
    const current = currentPageImportVersions[slug];
    if (!current) return;
    window.localStorage.setItem(pageImportSeenKey(ticker, slug), current);
    setSeenPageImportVersions(versions => ({ ...versions, [slug]: current }));
  };

  return (
    <aside className="portal-sidebar company-sidebar">
      <Link href="/" className="brand-lockup portal-brand" aria-label="Currenc Intelligence home">
        <img className="portal-brand__logo" src="/ci_logo01.png" alt="" />
        <span className="portal-brand__text">
          <strong><span>CURRENC</span><span>INTELLIGENCE</span></strong>
        </span>
      </Link>

      <div className="portal-sidebar__scroll">
        <div className={`portal-navigation-slider is-${navigationView}`}>
          <nav className="portal-primary-navigation portal-navigation-panel portal-workspace-navigation" aria-label={t('primaryNavigation')} aria-hidden={navigationView !== 'workspace'}>
            {workspaceItems.map(([labelKey, slug]) => {
              const href = `/monitor/${ticker}/${slug}`;
              const active = pathname === href;
              const pageHasImportUpdate = hasPageImportUpdate(slug);
              return (
                <Link
                  key={slug}
                  href={href as any}
                  className={`portal-menu ${active ? 'active' : ''}`}
                  title={t(labelKey)}
                  tabIndex={navigationView === 'workspace' ? 0 : -1}
                  onClick={() => {
                    acknowledgeImportDataUpdate();
                    acknowledgePageImportUpdate(slug);
                  }}
                >
                  <span className="portal-menu__icon">
                    <NavigationIcon slug={slug} />
                    {navigationView === 'workspace' && pageHasImportUpdate && (
                      <span className="portal-update-dot" aria-label={t('newDataAvailable')} />
                    )}
                  </span>
                  <span className="portal-menu__label">{t(labelKey)}</span>
                </Link>
              );
            })}
            <button
              className={`portal-menu portal-menu--button ${isSettingsPath(pathname, ticker) ? 'active' : ''}`}
              type="button"
              title={t('settings')}
              tabIndex={navigationView === 'workspace' ? 0 : -1}
              onClick={() => setNavigationView('settings')}
            >
              <span className="portal-menu__icon"><NavigationIcon slug="settings" /></span>
              <span className="portal-menu__label">{t('settings')}</span>
              <svg className="portal-menu__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </nav>

          <nav className="portal-primary-navigation portal-navigation-panel portal-settings-navigation" aria-label={t('settingsNavigation')} aria-hidden={navigationView !== 'settings'}>
            <button
              className="portal-settings-back"
              type="button"
              tabIndex={navigationView === 'settings' ? 0 : -1}
              onClick={() => setNavigationView('workspace')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
              <span>{t('settings')}</span>
            </button>
            {settingsItems.map(([labelKey, slug]) => {
              const href = `/monitor/${ticker}/${slug}`;
              return (
                <Link
                  key={slug}
                  href={href as any}
                  className={`portal-menu ${pathname === href ? 'active' : ''}`}
                  title={t(labelKey)}
                  tabIndex={navigationView === 'settings' ? 0 : -1}
                >
                  <span className="portal-menu__icon"><NavigationIcon slug={slug} /></span>
                  <span className="portal-menu__label">{t(labelKey)}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="portal-sidebar__utilities">
        <DevModeToggle />
        <Link
          className="portal-backend-link dev-only"
          href={`/operations/market-data?ticker=${encodeURIComponent(ticker)}`}
          title={t('openBackendPortal', { ticker })}
          onClick={() => setOperationsTicker(ticker)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" /></svg>
          <span>{t('backendPortal')}</span>
        </Link>
      </div>
    </aside>
  );
}
