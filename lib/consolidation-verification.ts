'use client';

import { authenticatedFetch } from '@/lib/auth-client';

export const CONSOLIDATION_VERIFICATION_TIMEOUT_MS = 5 * 60 * 1000;
export const CONSOLIDATION_POLL_INTERVAL_MS = 10 * 1000;

type OutputCheck = {
  endpoint: string;
  available: boolean;
  updatedAt: string;
  error?: string;
};

export type ConsolidatedOutputSnapshot = {
  fingerprint: string;
  availableOutputs: number;
  expectedOutputs: number;
  checks: OutputCheck[];
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function outputTimestamp(payload: unknown) {
  const root = record(payload);
  const nested = record(root.data);
  return String(
    root.generatedAt
    ?? root.updatedAt
    ?? nested.generatedAt
    ?? nested.updatedAt
    ?? '',
  );
}

export async function captureConsolidatedOutputs(
  endpoints: string[],
): Promise<ConsolidatedOutputSnapshot> {
  const results = await Promise.all(endpoints.map(async endpoint => {
    try {
      const payload = await authenticatedFetch(endpoint, { cache: 'no-store' });
      return {
        endpoint,
        available: true,
        updatedAt: outputTimestamp(payload),
        payload,
      };
    } catch (error) {
      return {
        endpoint,
        available: false,
        updatedAt: '',
        error: error instanceof Error ? error.message : String(error),
        payload: null,
      };
    }
  }));

  return {
    fingerprint: JSON.stringify(results.map(result => ({
      endpoint: result.endpoint,
      available: result.available,
      payload: result.payload,
    }))),
    availableOutputs: results.filter(result => result.available).length,
    expectedOutputs: endpoints.length,
    checks: results.map(({ endpoint, available, updatedAt, error }) => ({
      endpoint,
      available,
      updatedAt,
      ...(error ? { error } : {}),
    })),
  };
}

export async function waitForConsolidatedOutputChange({
  endpoints,
  baseline,
  onProgress,
}: {
  endpoints: string[];
  baseline: ConsolidatedOutputSnapshot;
  onProgress?: (elapsedSeconds: number) => void;
}) {
  const startedAt = Date.now();
  let latest = baseline;

  while (Date.now() - startedAt < CONSOLIDATION_VERIFICATION_TIMEOUT_MS) {
    await new Promise(resolve => window.setTimeout(resolve, CONSOLIDATION_POLL_INTERVAL_MS));
    latest = await captureConsolidatedOutputs(endpoints);
    if (latest.fingerprint !== baseline.fingerprint) {
      return { changed: true, elapsedMs: Date.now() - startedAt, latest };
    }
    onProgress?.(Math.round((Date.now() - startedAt) / 1000));
  }

  return { changed: false, elapsedMs: Date.now() - startedAt, latest };
}

