'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  ['Account Overview', '/portal'],
  ['Companies', '/portal/companies'],
  ['Billing', '/portal/billing'],
];

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="portal-page account-portal">
      <aside className="portal-sidebar">
        <Link href="/" className="brand-lockup portal-brand">
          <span className="brand-mark">CI</span>
          <span>Currenc Intelligence</span>
        </Link>

        <div className="portal-help-card workspace-card">
          <div className="portal-sidebar__label">Account portal</div>
          <div className="workspace-card__ticker">Account</div>
          <p>Companies, billing, and account settings.</p>
        </div>

        <div className="portal-sidebar__group">
          <div className="portal-sidebar__label">Account</div>
          {nav.map(([label, href]) => (
            <Link key={href} className={`portal-menu ${pathname === href ? 'active' : ''}`} href={href as any}>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </aside>

      <section className="portal-main">{children}</section>
    </main>
  );
}
