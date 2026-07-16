'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DevModeToggle } from './DevModeToggle';
import { useTickerDataStatus } from './TickerDataStatusProvider';

const workspaceItems = [
  ['Dashboard', 'dashboard'],
  ['Ownership', 'institutional'],
  ['Internal Float', 'internal-float'],
  ['Short Interest', 'short-interest'],
  ['Lending Pressure', 'lending-pressure'],
  ['Social Sentiment', 'sentiment'],
  ['SEC Filings', 'event-calendar'],
  ['Report Archive', 'reports'],
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
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v5h5M9 13h7M9 17h5" /></svg>;
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
  const tickerStatus = useTickerDataStatus();
  const currentImportDataVersion = tickerStatus?.version ?? importDataVersion;
  const [, setSeenImportDataVersion] = useState(importDataVersion);
  const [seenPageImportVersions, setSeenPageImportVersions] = useState<Record<string, string>>({});
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
        <nav className="portal-primary-navigation" aria-label="Primary navigation">
          {workspaceItems.map(([label, slug]) => {
            const href = `/monitor/${ticker}/${slug}`;
            const active = pathname === href;
            const pageHasImportUpdate = hasPageImportUpdate(slug);
            return (
              <Link
                key={slug}
                href={href as any}
                className={`portal-menu ${active ? 'active' : ''}`}
                title={label}
                onClick={() => {
                  acknowledgeImportDataUpdate();
                  acknowledgePageImportUpdate(slug);
                }}
              >
                <span className="portal-menu__icon"><NavigationIcon slug={slug} /></span>
                <span className="portal-menu__label">{label}</span>
                {pageHasImportUpdate && <span className="portal-update-dot" aria-label="New data available" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="portal-sidebar__utilities">
        <DevModeToggle />
        <Link className="portal-backend-link dev-only" href="/operations/market-data" title="Backend Portal">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" /></svg>
          <span>Backend Portal</span>
        </Link>
      </div>
    </aside>
  );
}
