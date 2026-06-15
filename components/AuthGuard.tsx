'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getStoredTokens, isTokenValid, refreshTokens } from '@/lib/auth-client';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'checking' | 'authenticated'>('checking');

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      const tokens = getStoredTokens();
      if (tokens?.idToken && isTokenValid(tokens.idToken, 0)) {
        setStatus('authenticated');
        return;
      }

      if (tokens?.refreshToken) {
        try {
          await refreshTokens(tokens.refreshToken);
          if (!cancelled) setStatus('authenticated');
          return;
        } catch {
          // Redirect below.
        }
      }

      const next = encodeURIComponent(pathname || '/monitor/CURR/dashboard-v2');
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
          router.replace(`/login?next=${encodeURIComponent(pathname || '/monitor/CURR/dashboard-v2')}`);
        }
      }
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname, router]);

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
