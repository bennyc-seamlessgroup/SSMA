'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clearAuthSession, getAuthenticatedProfile, storeTokens, type AuthTokens } from '@/lib/auth-client';
import {
  endPublicDemoSession,
  publicDemoEmail,
  publicDemoTicker,
  requestPublicDemoWelcome,
} from '@/lib/public-demo';

export function DemoLauncher() {
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    clearAuthSession();
    endPublicDemoSession();
    requestPublicDemoWelcome();

    async function openDemo() {
      try {
        const response = await fetch('/api/demo-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({})) as Partial<AuthTokens> & { message?: string };
        if (!response.ok) throw new Error(payload.message || 'Automatic demo sign in failed.');
        if (!payload.accessToken || !payload.idToken || !payload.refreshToken) {
          throw new Error('The demo authentication response was incomplete.');
        }
        storeTokens({
          accessToken: payload.accessToken,
          idToken: payload.idToken,
          refreshToken: payload.refreshToken,
        });
        const profile = await getAuthenticatedProfile(true);
        if (String(profile.email ?? '').trim().toLowerCase() !== publicDemoEmail) {
          clearAuthSession();
          throw new Error('The authenticated account is not the configured demo account.');
        }
        if (!cancelled) window.location.replace(`/monitor/${publicDemoTicker}/dashboard`);
      } catch (cause) {
        clearAuthSession();
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Automatic demo sign in failed.');
      }
    }

    void openDemo();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="demo-launcher">
      <div className="demo-launcher__mark">CI</div>
      <strong>{error ? 'Unable to open the live demo' : 'Opening the Currenc Intelligence live demo'}</strong>
      <span>{error || `Signing in securely as ${publicDemoEmail}...`}</span>
      {error ? <Link className="button light-primary" href="/">Return home</Link> : null}
    </main>
  );
}
