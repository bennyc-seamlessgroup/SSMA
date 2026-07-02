'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPublicTickerDataStatus } from '@/lib/public-import-data';

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
const configuredPollSeconds = Number(process.env.NEXT_PUBLIC_IMPORT_DATA_POLL_SECONDS ?? 60);
const pollIntervalMs = Math.max(30, Number.isFinite(configuredPollSeconds) ? configuredPollSeconds : 60) * 1000;

export function TickerDataStatusProvider({ ticker, children }: { ticker: string; children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<TickerDataStatus | null>(null);
  const lastVersion = useRef<string | null>(null);
  const serverFallbackAttempted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let requestInFlight = false;
    const controller = new AbortController();
    lastVersion.current = null;
    serverFallbackAttempted.current = false;
    setStatus(null);

    async function poll() {
      if (document.visibilityState === 'hidden' || requestInFlight) return;
      requestInFlight = true;
      try {
        let next = await getPublicTickerDataStatus(ticker, controller.signal) as TickerDataStatus;
        if (!next.updatedAt) {
          if (serverFallbackAttempted.current) return;
          serverFallbackAttempted.current = true;
          const fallbackResponse = await fetch(`/api/ticker-data-status/${encodeURIComponent(ticker)}`, { cache: 'no-store' });
          if (!fallbackResponse.ok) return;
          next = await fallbackResponse.json() as TickerDataStatus;
        }
        if (cancelled) return;
        const changed = Boolean(lastVersion.current && lastVersion.current !== next.version);
        lastVersion.current = next.version;
        setStatus(next);
        if (changed) {
          window.dispatchEvent(new CustomEvent('import-data-updated', { detail: next }));
          router.refresh();
        }
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
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [router, ticker]);

  return <TickerDataStatusContext.Provider value={status}>{children}</TickerDataStatusContext.Provider>;
}

export function useTickerDataStatus() {
  return useContext(TickerDataStatusContext);
}
