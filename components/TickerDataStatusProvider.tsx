'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export type TickerPageDataStatus = {
  version: string;
  updatedAt: string | null;
};

export type TickerDataStatus = {
  ticker: string;
  version: string;
  updatedAt: string | null;
  pages: Record<string, TickerPageDataStatus>;
};

const TickerDataStatusContext = createContext<TickerDataStatus | null>(null);
const pollIntervalMs = 30_000;

export function TickerDataStatusProvider({ ticker, children }: { ticker: string; children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<TickerDataStatus | null>(null);
  const lastVersion = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let requestInFlight = false;
    lastVersion.current = null;
    setStatus(null);

    async function poll() {
      if (document.visibilityState === 'hidden' || requestInFlight) return;
      requestInFlight = true;
      try {
        const response = await fetch(`/api/ticker-data-status/${encodeURIComponent(ticker)}`, { cache: 'no-store' });
        if (!response.ok) return;
        const next = await response.json() as TickerDataStatus;
        if (cancelled) return;
        const changed = Boolean(lastVersion.current && lastVersion.current !== next.version);
        lastVersion.current = next.version;
        setStatus(next);
        if (changed) router.refresh();
      } catch {
        // Retain the last successful status during brief network failures.
      } finally {
        requestInFlight = false;
      }
    }

    poll();
    const interval = window.setInterval(poll, pollIntervalMs);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [router, ticker]);

  return <TickerDataStatusContext.Provider value={status}>{children}</TickerDataStatusContext.Provider>;
}

export function useTickerDataStatus() {
  return useContext(TickerDataStatusContext);
}
