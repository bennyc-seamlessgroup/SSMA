import Link from 'next/link';
import { OperationsUserPortalLink } from '@/components/OperationsUserPortalLink';

const navItems = [
  ['Dashboard', '/operations/dashboard'],
  ['Market Data (New)', '/operations/market-data'],
  ['SEC Filing Entry', '/operations/sec-filings'],
  ['Notification Hotkeys', '/operations/hotkeys'],
  ['Narrative Social Upload', '/operations/narrative-social'],
  ['Ownership', '/operations/ownership'],
] as const;

export function OperationsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="ops-shell">
      <aside className="ops-sidebar">
        <Link href="/operations/sec-filings" className="ops-brand">
          <span>OP</span>
          <div>
            <strong>Operations Portal</strong>
            <small>Manual data input workspace</small>
          </div>
        </Link>

        <nav className="ops-nav" aria-label="Operations portal navigation">
          {navItems.map(([label, href]) => (
            <Link href={href} key={href}>{label}</Link>
          ))}
        </nav>

        <OperationsUserPortalLink />

        <div className="ops-sidebar-note">
          <strong>Prototype mode</strong>
          <span>Dummy login only. Data writes through server-side APIs so AWS keys stay off the client.</span>
        </div>
      </aside>

      <main className="ops-main">{children}</main>
    </div>
  );
}
