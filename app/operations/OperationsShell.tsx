'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DevModeToggle } from '@/components/DevModeToggle';
import { OperationsUserPortalLink } from '@/components/OperationsUserPortalLink';
import { PortalLanguageMenu } from '@/components/PortalLanguageMenu';
import { PortalPageTranslator } from '@/components/PortalPageTranslator';
import { getAuthenticatedProfile, getCurrentUser, signOut } from '@/lib/auth-client';
import { getOperationsTicker, setOperationsTicker } from '@/lib/operations/ticker-client';

const workflowItems = [
  ['Market Data', '/operations/market-data', 'market', 'Maintain daily market and broker inputs.'],
  ['SEC Filings', '/operations/sec-filings', 'filings', 'Create and correct SEC filing records.'],
  ['Ownership Data', '/operations/ownership', 'ownership', 'Manage strategic and management holdings.'],
  ['Data Import', '/operations/data-import', 'import', 'Replace operations datasets from validated CSV files.'],
  ['Social Data Upload', '/operations/narrative-social', 'social', 'Upload operations-managed social datasets.'],
  ['Notification Routing', '/operations/hotkeys', 'hotkeys', 'Map notification hotkeys to portal platforms.'],
] as const;

const administrationItems = [
  ['Team Access', '/operations/user-access', 'users', 'Invite users and review workspace access.'],
] as const;

const allNavigationItems = [...workflowItems, ...administrationItems];

function OperationsNavIcon({ icon }: { icon: string }) {
  if (icon === 'market') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /><path d="M16 7h3v3" /></svg>;
  }
  if (icon === 'filings') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v5h5M9 12h7M9 16h7" /></svg>;
  }
  if (icon === 'users') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="4" /><path d="M3 21a6 6 0 0 1 12 0M16 7h5M18.5 4.5v5" /></svg>;
  }
  if (icon === 'hotkeys') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h2m2 0h2m2 0h2M7 14h7m2 0h1" /></svg>;
  }
  if (icon === 'social') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4V5Z" /><path d="M8 9h8M8 12h5" /></svg>;
  }
  if (icon === 'import') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 15v5h16v-5" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M6 17V9m4 8V9m4 8V9m4 8V9M3 7h18L12 3 3 7Z" /></svg>;
}

function OperationsNavigation({
  items,
  pathname,
}: {
  items: ReadonlyArray<readonly [string, string, string, string]>;
  pathname: string;
}) {
  return items.map(([label, href, icon]) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link href={href as never} key={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
        <span className="ops-nav__icon"><OperationsNavIcon icon={icon} /></span>
        <span>{label}</span>
      </Link>
    );
  });
}

export function OperationsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [account, setAccount] = useState({ email: '', name: '', role: '' });
  const [accountOpen, setAccountOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [tickerDraft, setTickerDraft] = useState('CURR');
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.dataset.portalDesign = 'b';
    const storedTheme = window.localStorage.getItem('monitor-design-b-theme') === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.designBTheme = storedTheme;
    setTheme(storedTheme);
    setTickerDraft(getOperationsTicker());

    let cancelled = false;
    const tokenUser = getCurrentUser();
    const tokenEmail = typeof tokenUser?.email === 'string' ? tokenUser.email.trim() : '';
    if (tokenEmail) setAccount(current => ({ ...current, email: tokenEmail }));

    getAuthenticatedProfile()
      .then(profile => {
        if (cancelled) return;
        setAccount({
          email: typeof profile.email === 'string' ? profile.email.trim() : tokenEmail,
          name: typeof profile.name === 'string' ? profile.name.trim() : '',
          role: typeof profile.role === 'string' ? profile.role.trim().toUpperCase() : '',
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!accountOpen) return;

    function closeOnOutside(event: MouseEvent | TouchEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setAccountOpen(false);
    }

    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('touchstart', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('touchstart', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [accountOpen]);

  const email = account.email || 'Signed-in team member';
  const avatarLetter = (account.email || account.name || 'O').charAt(0).toUpperCase();
  const canUseDevMode = account.role === 'ADMIN' || account.role === 'OPERATOR';
  const currentPage = allNavigationItems.find(([, href]) => pathname === href || pathname.startsWith(`${href}/`))
    ?? workflowItems[0];

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.localStorage.setItem('monitor-design-b-theme', next);
    document.documentElement.dataset.designBTheme = next;
    window.dispatchEvent(new CustomEvent('currenc-theme-change', { detail: next }));
  }

  function applyTicker(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const previous = getOperationsTicker();
    const next = setOperationsTicker(tickerDraft);
    setTickerDraft(next);
    if (next !== previous) window.location.reload();
  }

  return (
    <div className="ops-shell">
      <PortalPageTranslator rootSelector=".ops-shell" />
      <aside className="ops-sidebar">
        <Link href="/operations/market-data" className="ops-brand">
          <span><img src="/ci_logo01.png" alt="" /></span>
          <div className="ops-brand__wordmark">
            <strong>OPERATIONS</strong>
            <strong>PORTAL</strong>
          </div>
        </Link>

        <div className="ops-sidebar__scroll">
          <nav className="ops-nav" aria-label="Operations portal navigation">
            <span className="ops-nav__section">Data Operations</span>
            <OperationsNavigation items={workflowItems} pathname={pathname} />
            <span className="ops-nav__section ops-nav__section--admin">Administration</span>
            <OperationsNavigation items={administrationItems} pathname={pathname} />
          </nav>
        </div>

        <div className="ops-sidebar__utilities">
          {canUseDevMode && <DevModeToggle />}
          <OperationsUserPortalLink />
        </div>
      </aside>

      <main className="ops-main">
        <header className="ops-topbar">
          <div className="ops-topbar__heading">
            <h1>{currentPage[0]}</h1>
            <nav aria-label="Breadcrumb">
              <span>Operations Portal</span>
              <i>/</i>
              <strong>{currentPage[0]}</strong>
            </nav>
          </div>

          <div className="ops-topbar__actions">
            <form className="ops-topbar__ticker" onSubmit={applyTicker}>
              <span>Ticker</span>
              <input
                value={tickerDraft}
                maxLength={10}
                aria-label="Company ticker"
                suppressHydrationWarning
                onChange={event => setTickerDraft(event.target.value.toUpperCase())}
              />
              <button type="submit" aria-label="Load ticker workspace" title="Load ticker workspace">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </form>

            <button
              type="button"
              className={`ops-topbar__icon-button ${theme === 'dark' ? 'is-active' : ''}`}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={theme === 'dark'}
              onClick={toggleTheme}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {theme === 'dark' ? (
                  <>
                    <path d="M12 4V2M12 22v-2M4.93 4.93 3.52 3.52M20.48 20.48l-1.41-1.41M4 12H2M22 12h-2M4.93 19.07l-1.41 1.41M20.48 3.52l-1.41 1.41" />
                    <circle cx="12" cy="12" r="4" />
                  </>
                ) : (
                  <path d="M21 14.1A7.5 7.5 0 0 1 9.9 3a8.8 8.8 0 1 0 11.1 11.1Z" />
                )}
              </svg>
            </button>
            <PortalLanguageMenu buttonClassName="ops-topbar__icon-button" />
            <div className="ops-account ops-topbar__account" ref={accountRef}>
              <button
                type="button"
                className="ops-topbar__profile"
                aria-label="Open operations profile"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                onClick={() => setAccountOpen(open => !open)}
              >
                <span className="ops-account__avatar" aria-hidden="true">{avatarLetter}</span>
              </button>

              {accountOpen && (
                <div className="ops-account__panel" role="menu">
                  <div className="ops-account__profile">
                    <span className="ops-account__avatar" aria-hidden="true">{avatarLetter}</span>
                    <div>
                      <strong>{account.name || 'Team Member'}</strong>
                      <small title={email}>{email}</small>
                      {account.role && <em>{account.role}</em>}
                    </div>
                  </div>
                  <button type="button" role="menuitem" onClick={signOut}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="ops-page-intro">
          <span className="ops-eyebrow">Operations Workspace</span>
          <p>{currentPage[3]}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
