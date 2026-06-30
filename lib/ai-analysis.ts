import { readImportJson } from '@/lib/import-data';
import { aiAnalysisFile, normalizeTicker } from '@/lib/ticker-data';

export type AiAnalysis = {
  ticker?: string;
  created_at_utc?: string;
  lending_pressure_analysis?: string;
  short_interest_current_interpretation?: string;
};

export async function readAiAnalysis(ticker: string): Promise<AiAnalysis> {
  return readImportJson<AiAnalysis>(aiAnalysisFile(normalizeTicker(ticker)));
}

export function parseAiAnalysis(value: unknown) {
  const lines = String(value ?? '')
    .replaceAll('**', '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);

  return {
    headline: lines[0] ?? '',
    body: lines.slice(1).join(' '),
  };
}
