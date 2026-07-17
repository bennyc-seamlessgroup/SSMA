'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { footerDisclaimer } from '@/lib/legal/disclaimers';

const links = [
  ['Terms', '/legal/terms'],
  ['Privacy', '/legal/privacy'],
  ['Methodology', '/legal/methodology'],
  ['Disclaimers', '/legal/disclaimers'],
  ['Data Sources', '/legal/methodology#data-sources'],
] as const;

export function DisclaimerFooter() {
  const pathname = usePathname();
  const isPortalSettingsPage = /^\/monitor\/[^/]+\/(?:settings(?:\/.*)?|user-profile|companies|alert-rules|email-settings)\/?$/i.test(pathname);

  if (isPortalSettingsPage) return null;

  return (
    <footer className="disclaimer-footer">
      <p>{footerDisclaimer}</p>
      <nav aria-label="Legal and methodology links">
        {links.map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}
      </nav>
    </footer>
  );
}
