import type { PortalLanguage } from './portal-i18n';

export type AiReportLocalizedText = string | Record<string, unknown> | null | undefined;

type AiReportLanguageMap = {
  en?: unknown;
  zh_tc?: unknown;
  zh_sc?: unknown;
  'zh-Hant'?: unknown;
  'zh-Hans'?: unknown;
};

function languageMap(value: unknown): AiReportLanguageMap | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as AiReportLanguageMap;
  return ['en', 'zh_tc', 'zh_sc', 'zh-Hant', 'zh-Hans'].some(key => (
    typeof candidate[key as keyof AiReportLanguageMap] === 'string'
  )) ? candidate : null;
}

function embeddedLanguageMap(value: string): AiReportLanguageMap | null {
  const trimmed = value.trim();
  const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1]?.trim()
    ?? (trimmed.startsWith('{') && trimmed.endsWith('}') ? trimmed : '');
  if (!candidate) return null;

  try {
    return languageMap(JSON.parse(candidate));
  } catch {
    return null;
  }
}

function localizedValue(map: AiReportLanguageMap, language: PortalLanguage) {
  const preferred = language === 'zh-Hant'
    ? [map.zh_tc, map['zh-Hant'], map.en, map.zh_sc, map['zh-Hans']]
    : language === 'zh-Hans'
      ? [map.zh_sc, map['zh-Hans'], map.en, map.zh_tc, map['zh-Hant']]
      : [map.en, map.zh_tc, map['zh-Hant'], map.zh_sc, map['zh-Hans']];
  return preferred.find(value => typeof value === 'string' && value.trim()) as string | undefined;
}

/**
 * Selects one language from the new multilingual AI-report shape while
 * retaining complete compatibility with historical plain-text reports.
 */
export function aiReportTextForLanguage(
  value: unknown,
  language: PortalLanguage,
  fallback = '',
) {
  const directMap = languageMap(value);
  if (directMap) return localizedValue(directMap, language)?.trim() || fallback;

  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  const embeddedMap = embeddedLanguageMap(trimmed);
  return embeddedMap
    ? localizedValue(embeddedMap, language)?.trim() || fallback
    : trimmed;
}
