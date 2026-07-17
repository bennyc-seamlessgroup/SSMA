import Link from 'next/link';
import { PortalLanguageMenu } from '@/components/PortalLanguageMenu';
import { PortalPageTranslator } from '@/components/PortalPageTranslator';

export default function OperationsLoginPage() {
  return (
    <main className="ops-login-page">
      <PortalPageTranslator rootSelector=".ops-login-page" />
      <section className="ops-login-card">
        <div className="ops-login-language">
          <PortalLanguageMenu buttonClassName="ops-topbar__icon-button" />
        </div>
        <div>
          <span className="ops-eyebrow">Operations Portal</span>
          <h1>Backend data workspace</h1>
          <p>Prototype login for operations team workflows. Real authentication can be connected after the data-entry flow is approved.</p>
        </div>

        <form className="ops-login-form">
          <label>
            Email
            <input defaultValue="operations@currenc-intelligence.local" />
          </label>
          <label>
            Password
            <input defaultValue="prototype" type="password" />
          </label>
          <Link className="ops-primary-button" href="/operations/market-data">Enter Operations Portal</Link>
        </form>
      </section>
    </main>
  );
}
