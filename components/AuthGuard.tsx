'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAuthenticatedProfile, getStoredTokens, isTokenValid, refreshTokens } from '@/lib/auth-client';
import { authorizedMonitorRedirect, profileAllowsTicker } from '@/lib/ticker-access';

export function AuthGuard({ children, ticker }: { children: React.ReactNode; ticker: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'authenticated'>('checking');

  useEffect(() => {
    let cancelled = false;
    const currentPath = () => window.location.pathname || `/monitor/${ticker}/dashboard-v2`;

    async function verifySession() {
      setStatus('checking');
      const tokens = getStoredTokens();
      if (tokens?.idToken && isTokenValid(tokens.idToken, 0)) {
        try {
          const profile = await getAuthenticatedProfile();
          if (!profileAllowsTicker(profile, ticker)) {
            router.replace(authorizedMonitorRedirect(currentPath(), profile) as never);
            return;
          }
          if (!cancelled) setStatus('authenticated');
        } catch {
          router.replace(`/login?next=${encodeURIComponent(currentPath())}`);
        }
        return;
      }

      if (tokens?.refreshToken) {
        try {
          await refreshTokens(tokens.refreshToken);
          const profile = await getAuthenticatedProfile();
          if (!profileAllowsTicker(profile, ticker)) {
            router.replace(authorizedMonitorRedirect(currentPath(), profile) as never);
            return;
          }
          if (!cancelled) setStatus('authenticated');
          return;
        } catch {
          // Redirect below.
        }
      }

      const next = encodeURIComponent(currentPath());
      router.replace(`/login?next=${next}`);
    }

    verifySession();

    const interval = window.setInterval(async () => {
      const tokens = getStoredTokens();
      if (!tokens?.idToken || !tokens.refreshToken) return;
      if (!isTokenValid(tokens.idToken, 300)) {
        try {
          await refreshTokens(tokens.refreshToken);
        } catch {
          router.replace(`/login?next=${encodeURIComponent(currentPath())}`);
        }
      }
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [router, ticker]);

  if (status !== 'authenticated') {
    return (
      <div className="auth-checking">
        <strong>Checking secure session</strong>
        <span>Redirecting to sign in if authentication is required.</span>
      </div>
    );
  }

  return children;
}
