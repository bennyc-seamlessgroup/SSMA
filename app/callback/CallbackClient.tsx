'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { handleOAuthCallback } from '@/lib/auth-client';

export function CallbackClient() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function completeLogin() {
      try {
        const redirectTo = await handleOAuthCallback();
        if (!cancelled) router.replace(redirectTo as Parameters<typeof router.replace>[0]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Authentication failed.');
      }
    }

    completeLogin();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="auth-page">
      <section className="auth-callback-card">
        <h1>{error ? 'Authentication failed' : 'Completing secure sign in'}</h1>
        <p>{error || 'Please wait while we finish connecting your SSMA session.'}</p>
        {error && <Link className="button light-primary" href="/login">Return to sign in</Link>}
      </section>
    </main>
  );
}
