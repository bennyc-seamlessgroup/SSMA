'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { startLogin } from '@/lib/auth-client';

export function LoginRedirectClient() {
  const searchParams = useSearchParams();
  const hasStartedRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function redirectToCognito() {
      if (hasStartedRef.current) return;
      hasStartedRef.current = true;

      try {
        await startLogin({ redirectTo: searchParams.get('next') || '/monitor/CURR/dashboard-v2' });
      } catch (err) {
        hasStartedRef.current = false;
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to start secure sign in.');
      }
    }

    redirectToCognito();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <main className="auth-page">
      <section className="auth-callback-card">
        <h1>{error ? 'Unable to open secure sign in' : 'Opening secure sign in'}</h1>
        <p>{error || 'Redirecting to SSMA secure authentication.'}</p>
        {error && (
          <Link className="button light-primary" href="/">
            Return home
          </Link>
        )}
      </section>
    </main>
  );
}
