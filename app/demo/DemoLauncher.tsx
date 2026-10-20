'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  clearAuthSession,
  getAuthenticatedProfile,
  getCurrentUser,
  getStoredTokens,
  isTokenValid,
  startLogin,
  storeTokens,
  type AuthTokens,
} from '@/lib/auth-client';
import {
  endPublicDemoSession,
  isPublicDemoEmail,
  publicDemoEmail,
  publicDemoTicker,
  requestPublicDemoWelcome,
} from '@/lib/public-demo';

export function DemoLauncher() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState(`Signing in securely as ${publicDemoEmail}...`);

  useEffect(() => {
    let cancelled = false;
    endPublicDemoSession();
    requestPublicDemoWelcome();

    async function openDemo() {
      const existingTokens = getStoredTokens();
      const existingUser = getCurrentUser();
      if (existingTokens?.idToken
        && isTokenValid(existingTokens.idToken)
        && isPublicDemoEmail(existingUser?.email)) {
        window.location.replace(`/monitor/${publicDemoTicker}/dashboard`);
        return;
      }

      // Do not carry another signed-in account into the public demo flow.
      clearAuthSession();

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
        if (cancelled) return;

        // Federated demo identities can sign in successfully through Cognito's
        // hosted flow even though USER_PASSWORD_AUTH reports UserNotFound.
        // Fall back to that same working portal login and prefill the email.
        setMessage(`Opening secure sign in for ${publicDemoEmail}...`);
        try {
          await startLogin({
            redirectTo: `/monitor/${publicDemoTicker}/dashboard`,
            loginHint: publicDemoEmail,
            requiredEmail: publicDemoEmail,
          });
        } catch (loginCause) {
          if (!cancelled) {
            const automaticMessage = cause instanceof Error ? cause.message : 'Automatic demo sign in failed.';
            const loginMessage = loginCause instanceof Error ? loginCause.message : 'Unable to start secure sign in.';
            setError(`${automaticMessage} ${loginMessage}`);
          }
        }
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
      <span>{error || message}</span>
      {error ? <Link className="button light-primary" href="/">Return home</Link> : null}
    </main>
  );
}
