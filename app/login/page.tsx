import { Suspense } from 'react';
import { LoginRedirectClient } from './LoginRedirectClient';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-page">
          <section className="auth-callback-card">
            <h1>Opening secure sign in</h1>
            <p>Redirecting to SSMA secure authentication.</p>
          </section>
        </main>
      }
    >
      <LoginRedirectClient />
    </Suspense>
  );
}
