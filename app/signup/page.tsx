import Link from 'next/link';
import { SignupButton } from '@/components/AuthButtons';

export default function SignupPage() {
  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-brand-panel">
          <Link href="/" className="brand-lockup auth-brand">
            <span className="brand-mark defense-brand__mark">CI</span>
            <span>Currenc Intelligence</span>
          </Link>
          <div>
            <div className="eyebrow">Demo onboarding</div>
            <h1>Create a company intelligence workspace.</h1>
            <p>
              Set up a demo issuer profile for short pressure monitoring, AI reports,
              recipient delivery, and long-term market defense archives.
            </p>
          </div>
          <div className="auth-onboarding-list">
            <span>Company workspace</span>
            <span>Licensed data source setup</span>
            <span>Report recipients and approval flow</span>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card__head">
            <h2>Create account</h2>
            <p>Create your account through SSMA secure authentication.</p>
          </div>
          <div className="auth-form">
            <SignupButton>Create secure account</SignupButton>
          </div>
          <div className="auth-card__footer">
            <span>Already have access?</span>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
