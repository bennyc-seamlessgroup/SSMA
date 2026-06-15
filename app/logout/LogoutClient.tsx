'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { clearAuthSession } from '@/lib/auth-client';

export function LogoutClient() {
  useEffect(() => {
    clearAuthSession();
  }, []);

  return (
    <main className="auth-page">
      <section className="auth-callback-card">
        <h1>Signed out</h1>
        <p>Your local portal session has been cleared.</p>
        <Link className="button light-primary" href="/login">Sign in again</Link>
      </section>
    </main>
  );
}
