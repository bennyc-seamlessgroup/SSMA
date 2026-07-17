'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  normalizePortalLanguage,
  portalGeneralSettingsChangedEvent,
  portalGeneralSettingsStorageKey,
  portalMessage,
  type PortalLanguage,
  type PortalMessageKey,
} from '@/lib/portal-i18n';

function storedLanguage() {
  try {
    const raw = window.localStorage.getItem(portalGeneralSettingsStorageKey);
    const settings = raw ? JSON.parse(raw) as { language?: unknown } : {};
    return normalizePortalLanguage(settings.language);
  } catch {
    return 'en' as PortalLanguage;
  }
}

export function usePortalLanguage() {
  const [language, setLanguageState] = useState<PortalLanguage>('en');

  useEffect(() => {
    const apply = (next: PortalLanguage) => {
      setLanguageState(next);
      document.documentElement.lang = next;
      document.documentElement.dataset.portalLanguage = next;
    };
    apply(storedLanguage());

    const handleChange = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as { language?: unknown } | undefined : undefined;
      apply(normalizePortalLanguage(detail?.language ?? storedLanguage()));
    };
    window.addEventListener(portalGeneralSettingsChangedEvent, handleChange);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener(portalGeneralSettingsChangedEvent, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  const t = useCallback((key: PortalMessageKey, values?: Record<string, string | number>) => (
    portalMessage(language, key, values)
  ), [language]);

  const setLanguage = useCallback((value: PortalLanguage) => {
    const next = normalizePortalLanguage(value);
    let settings: Record<string, unknown> = {};
    try {
      const raw = window.localStorage.getItem(portalGeneralSettingsStorageKey);
      settings = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    } catch {
      settings = {};
    }
    const nextSettings = { ...settings, language: next };
    window.localStorage.setItem(portalGeneralSettingsStorageKey, JSON.stringify(nextSettings));
    window.dispatchEvent(new CustomEvent(portalGeneralSettingsChangedEvent, { detail: nextSettings }));
  }, []);

  return { language, setLanguage, t };
}
