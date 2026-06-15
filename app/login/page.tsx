import Link from 'next/link';
import { Suspense } from 'react';
import { LoginButton } from '@/components/AuthButtons';

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-brand-panel">
          <Link href="/" className="brand-lockup auth-brand">
            <span className="brand-mark defense-brand__mark">CI</span>
            <span>Currenc Intelligence</span>
          </Link>
          <div>
            <div className="eyebrow">Secure portal access</div>
            <h1>Enter the market defense workspace.</h1>
            <p>
              Demo access for public-company teams to review short pressure, sentiment risk,
              scheduled intelligence reports, and permanent archive history.
            </p>
          </div>
          <div className="auth-proof-grid">
            <div><strong>3x</strong><span>daily reports</span></div>
            <div><strong>Board</strong><span>archive ready</span></div>
            <div><strong>Multi</strong><span>company workspace</span></div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card__head">
            <h2>Sign in</h2>
            <p>Use SSMA secure authentication to open the CURR workspace.</p>
          </div>
          <div className="auth-form">
            <Suspense fallback={<button className="button light-primary large" type="button" disabled>Preparing secure sign in...</button>}>
              <LoginButton>Open secure sign in</LoginButton>
            </Suspense>
          </div>
          <div className="auth-card__footer">
            <span>New to Currenc Intelligence?</span>
            <Link href="/signup">Create demo account</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
