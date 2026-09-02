'use client';

import { cachedAuthenticatedFetch } from '@/lib/auth-client';
import type { AiReportLocalizedText } from '@/lib/ai-report-localization';
import { normalizeTicker } from '@/lib/ticker-data';

export type AiReport = {
  created_at_utc?: string;
  lending_pressure_analysis?: AiReportLocalizedText;
  short_interest_current_interpretation?: AiReportLocalizedText;
};

export async function fetchAiReport(ticker: string, date?: string): Promise<AiReport> {
  const normalizedTicker = normalizeTicker(ticker);
  const normalizedDate = date?.trim();
  if (normalizedDate && !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw new Error('AI report date must use YYYY-MM-DD format.');
  }

  const params = new URLSearchParams({ ticker: normalizedTicker });
  if (normalizedDate) params.set('date', normalizedDate);

  const payload = await cachedAuthenticatedFetch(
    `/market-data/ai-report?${params.toString()}`,
  ) as AiReport & { requestError?: unknown };

  if (typeof payload.requestError === 'string' && payload.requestError.trim()) {
    throw new Error('The AI report service could not authorize its data request.');
  }

  return payload;
}
