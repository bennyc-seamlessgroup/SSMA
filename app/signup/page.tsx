import Link from 'next/link';

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
            <p>This is a demo signup screen. Submitting opens the CURR workspace.</p>
          </div>
          <form className="auth-form" action="/monitor/CURR/dashboard-v2">
            <label>
              Full name
              <input className="input" defaultValue="Benny Cheung" />
            </label>
            <label>
              Work email
              <input className="input" type="email" defaultValue="demo@currencintel.com" />
            </label>
            <label>
              Company ticker
              <input className="input" defaultValue="CURR" />
            </label>
            <label>
              Role
              <select className="select" defaultValue="Investor Relations">
                <option>CEO / Executive</option>
                <option>CFO / Finance</option>
                <option>Investor Relations</option>
                <option>Board Member</option>
                <option>Capital Markets Advisor</option>
              </select>
            </label>
            <button className="button light-primary large" type="submit">Create Demo Workspace</button>
          </form>
          <div className="auth-card__footer">
            <span>Already have access?</span>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
