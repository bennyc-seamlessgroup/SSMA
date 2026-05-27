import Link from 'next/link';

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
            <p>Credential validation will be connected later. This demo opens the CURR workspace.</p>
          </div>
          <form className="auth-form" action="/monitor/CURR/dashboard">
            <label>
              Work email
              <input className="input" type="email" defaultValue="demo@currencintel.com" />
            </label>
            <label>
              Password
              <input className="input" type="password" defaultValue="demo-password" />
            </label>
            <div className="auth-form__row">
              <label className="auth-check"><input type="checkbox" defaultChecked /> Keep me signed in</label>
              <a href="#">Forgot password?</a>
            </div>
            <button className="button light-primary large" type="submit">Open Workspace</button>
          </form>
          <div className="auth-card__footer">
            <span>New to Currenc Intelligence?</span>
            <Link href="/signup">Create demo account</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
