'use client';

import { authenticatedFetch } from '@/lib/auth-client';
import { normalizeTicker } from '@/lib/ticker-data';

export type AiReport = {
  created_at_utc?: string;
  lending_pressure_analysis?: string;
  short_interest_current_interpretation?: string;
};

export async function fetchAiReport(ticker: string): Promise<AiReport> {
  const normalizedTicker = normalizeTicker(ticker);
  const payload = await authenticatedFetch(
    `/market-data/ai-report?ticker=${encodeURIComponent(normalizedTicker)}`,
    { cache: 'no-store' },
  ) as AiReport & { requestError?: unknown };

  if (typeof payload.requestError === 'string' && payload.requestError.trim()) {
    throw new Error('The AI report service could not authorize its data request.');
  }

  return payload;
}
