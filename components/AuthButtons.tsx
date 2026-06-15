'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { startLogin } from '@/lib/auth-client';

export function LoginButton({ children = 'Sign in with Cognito' }: { children?: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function onClick() {
    setError('');
    setIsLoading(true);
    try {
      await startLogin({ redirectTo: searchParams.get('next') || '/monitor/CURR/dashboard-v2' });
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Unable to start login.');
    }
  }

  return (
    <>
      <button className="button light-primary large" type="button" onClick={onClick} disabled={isLoading}>
        {isLoading ? 'Opening secure sign in...' : children}
      </button>
      {error && <p className="auth-error">{error}</p>}
    </>
  );
}

export function SignupButton({ children = 'Create account with Cognito' }: { children?: React.ReactNode }) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function onClick() {
    setError('');
    setIsLoading(true);
    try {
      await startLogin({ redirectTo: '/monitor/CURR/dashboard-v2', screenHint: 'signup' });
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Unable to start signup.');
    }
  }

  return (
    <>
      <button className="button light-primary large" type="button" onClick={onClick} disabled={isLoading}>
        {isLoading ? 'Opening secure signup...' : children}
      </button>
      {error && <p className="auth-error">{error}</p>}
    </>
  );
}
