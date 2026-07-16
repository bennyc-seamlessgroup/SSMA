'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DevModeToggle } from '@/components/DevModeToggle';
import { OperationsUserPortalLink } from '@/components/OperationsUserPortalLink';

const navItems = [
  ['Market Data', '/operations/market-data', 'market'],
  ['SEC Filing Entry', '/operations/sec-filings', 'filings'],
  ['Notification Hotkeys', '/operations/hotkeys', 'hotkeys'],
  ['Narrative Social Upload', '/operations/narrative-social', 'social'],
  ['Ownership', '/operations/ownership', 'ownership'],
] as const;

function OperationsNavIcon({ icon }: { icon: string }) {
  if (icon === 'market') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /><path d="M16 7h3v3" /></svg>;
  }
  if (icon === 'filings') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v5h5M9 12h7M9 16h7" /></svg>;
  }
  if (icon === 'hotkeys') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h2m2 0h2m2 0h2M7 14h7m2 0h1" /></svg>;
  }
  if (icon === 'social') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4V5Z" /><path d="M8 9h8M8 12h5" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M6 17V9m4 8V9m4 8V9m4 8V9M3 7h18L12 3 3 7Z" /></svg>;
}

export function OperationsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="ops-shell">
      <aside className="ops-sidebar">
        <Link href="/operations/market-data" className="ops-brand">
          <span><img src="/ci_logo01.png" alt="" /></span>
          <div>
            <strong>Operations Portal</strong>
            <small>Manual data input workspace</small>
          </div>
        </Link>

        <div className="ops-sidebar__scroll">
          <nav className="ops-nav" aria-label="Operations portal navigation">
            {navItems.map(([label, href, icon]) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link href={href} key={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
                  <span className="ops-nav__icon"><OperationsNavIcon icon={icon} /></span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="ops-sidebar__utilities">
          <DevModeToggle />
          <OperationsUserPortalLink />
        </div>
      </aside>

      <main className="ops-main">{children}</main>
    </div>
  );
}
