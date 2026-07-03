import Link from 'next/link';
import { footerDisclaimer } from '@/lib/legal/disclaimers';

const links = [
  ['Terms', '/legal/terms'],
  ['Privacy', '/legal/privacy'],
  ['Methodology', '/legal/methodology'],
  ['Disclaimers', '/legal/disclaimers'],
  ['Data Sources', '/legal/methodology#data-sources'],
] as const;

export function DisclaimerFooter() {
  return (
    <footer className="disclaimer-footer">
      <p>{footerDisclaimer}</p>
      <nav aria-label="Legal and methodology links">
        {links.map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}
      </nav>
    </footer>
  );
}
