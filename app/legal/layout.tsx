import Link from 'next/link';
import { DisclaimerFooter } from '@/components/DisclaimerFooter';

export default function LegalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="legal-shell">
      <header className="legal-shell__nav">
        <Link className="legal-shell__brand" href="/">
          <img src="/ci_logo01.png" alt="" />
          <span><strong>Currenc Intelligence</strong><small>Legal & Compliance</small></span>
        </Link>
        <nav>
          <Link href="/legal/methodology">Methodology</Link>
          <Link href="/legal/disclaimers">Disclaimers</Link>
          <Link href="/">Return to Currenc Intelligence</Link>
        </nav>
      </header>
      <main>{children}</main>
      <DisclaimerFooter />
    </div>
  );
}
