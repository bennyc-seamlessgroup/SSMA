'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPublicTickerDataStatus } from '@/lib/public-import-data';
import { authenticatedFetch } from '@/lib/auth-client';

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

type ApiDataset = { generatedAt?: string; updatedAt?: string } | null;
type CombinedApiPayload = Record<string, ApiDataset>;

function apiStatus(...datasets: ApiDataset[]): TickerPageDataStatus {
  const timestamps = datasets.map(row => row?.updatedAt ?? row?.generatedAt).filter((value): value is string => Boolean(value));
  const updatedAt = timestamps.sort((a, b) => b.localeCompare(a))[0] ?? null;
  return { version: datasets.map(row => row?.updatedAt ?? row?.generatedAt ?? 'missing').join('|'), updatedAt };
}

async function getApiTickerDataStatus(ticker: string): Promise<Pick<TickerDataStatus, 'pages' | 'updatedAt'>> {
  const [current, history] = await Promise.all([
    authenticatedFetch(`/market-data/current?ticker=${encodeURIComponent(ticker)}`) as Promise<CombinedApiPayload>,
    authenticatedFetch(`/market-data/history?ticker=${encodeURIComponent(ticker)}`) as Promise<CombinedApiPayload>,
  ]);
  const marketCurrent = current['market-current'];
  const marketHistory = history['market-history'];
  const ownershipCurrent = current['ownership-current'];
  const ownershipHistory = history['ownership-history'];
  const internalFloatCurrent = current['internal-float-current'];
  const secFilingsHistory = history['sec-filings-history'];
  const shortVolumeHistory = history['short-volume-history'];
  const ftdHistory = history['ftd-history'];
  const pages = {
    'dashboard': apiStatus(marketCurrent, marketHistory, secFilingsHistory),
    institutional: apiStatus(ownershipCurrent, ownershipHistory),
    'internal-float': apiStatus(internalFloatCurrent, ownershipCurrent),
    'short-interest': apiStatus(marketCurrent, marketHistory, shortVolumeHistory, ftdHistory),
    'lending-pressure': apiStatus(marketCurrent, marketHistory),
    'event-calendar': apiStatus(secFilingsHistory),
  };
  const updatedAt = Object.values(pages).map(page => page.updatedAt).filter((value): value is string => Boolean(value)).sort((a, b) => b.localeCompare(a))[0] ?? null;
  return { pages, updatedAt };
}

export function TickerDataStatusProvider({ ticker, children }: { ticker: string; children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<TickerDataStatus | null>(null);
  const lastVersion = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let requestInFlight = false;
    const controller = new AbortController();
    lastVersion.current = null;
    setStatus(null);

    async function poll() {
      if (document.visibilityState === 'hidden' || requestInFlight) return;
      requestInFlight = true;
      try {
        const [publicStatus, apiStatusResult] = await Promise.all([
          getPublicTickerDataStatus(ticker, controller.signal),
          getApiTickerDataStatus(ticker),
        ]);
        const pages = { ...publicStatus.pages, ...apiStatusResult.pages };
        const updatedAt = [publicStatus.updatedAt, apiStatusResult.updatedAt].filter((value): value is string => Boolean(value)).sort((a, b) => b.localeCompare(a))[0] ?? null;
        const next: TickerDataStatus = {
          ticker,
          pages,
          updatedAt,
          version: Object.entries(pages).map(([slug, page]) => `${slug}:${page.version}`).join('|'),
        };
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
