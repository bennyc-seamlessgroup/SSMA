'use client';

import { useEffect, useState } from 'react';
import { PortalTimeZoneSelect } from '@/components/PortalTimeZoneSelect';
import { usePortalLanguage } from '@/components/usePortalLanguage';
import {
  normalizePortalLanguage,
  portalGeneralSettingsChangedEvent,
  portalGeneralSettingsStorageKey,
  portalLanguageOptions,
  type PortalLanguage,
} from '@/lib/portal-i18n';

const themeStorageKey = 'monitor-design-b-theme';

type GeneralSettings = {
  language: PortalLanguage;
  theme: 'light' | 'dark' | 'system';
};

const defaultSettings: GeneralSettings = {
  language: 'en',
  theme: 'light',
};

function readSettings(): GeneralSettings {
  try {
    const raw = window.localStorage.getItem(portalGeneralSettingsStorageKey);
    const stored = raw ? JSON.parse(raw) as Partial<GeneralSettings> : {};
    const portalTheme = window.localStorage.getItem(themeStorageKey);
    return {
      language: normalizePortalLanguage(stored.language),
      theme: portalTheme === 'dark' ? 'dark' : portalTheme === 'light' ? 'light' : defaultSettings.theme,
    };
  } catch {
    const portalTheme = window.localStorage.getItem(themeStorageKey);
    return {
      ...defaultSettings,
      theme: portalTheme === 'dark' ? 'dark' : 'light',
    };
  }
}

function resolveTheme(theme: GeneralSettings['theme']) {
  if (theme !== 'system') return theme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemePreference(theme: GeneralSettings['theme']) {
  const resolvedTheme = resolveTheme(theme);
  window.localStorage.setItem(themeStorageKey, resolvedTheme);
  document.documentElement.dataset.designBTheme = resolvedTheme;
  window.dispatchEvent(new CustomEvent('currenc-theme-change', { detail: resolvedTheme }));
}

export function GeneralSettingsClient({ ticker: _ticker }: { ticker: string }) {
  const { t } = usePortalLanguage();
  const [settings, setSettings] = useState<GeneralSettings>(defaultSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readSettings();
    setSettings(stored);
    applyThemePreference(stored.theme);
    setReady(true);
  }, []);

  function patchSettings(patch: Partial<GeneralSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    window.localStorage.setItem(portalGeneralSettingsStorageKey, JSON.stringify(next));
    if (patch.theme) applyThemePreference(next.theme);
    window.dispatchEvent(new CustomEvent(portalGeneralSettingsChangedEvent, { detail: next }));
  }

  return (
    <div className="page settings-page settings-general-page">
      <section className="settings-simple-panel" aria-busy={!ready}>
        <div className="settings-simple-row">
          <div>
            <strong>{t('language')}</strong>
            <span>{t('languageDescription')}</span>
          </div>
          <select
            aria-label={t('portalLanguage')}
            value={settings.language}
            onChange={event => patchSettings({ language: normalizePortalLanguage(event.target.value) })}
          >
            {portalLanguageOptions.map(([value, label]) => (
              <option value={value} key={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="settings-simple-row">
          <div>
            <strong>{t('theme')}</strong>
            <span>{t('themeDescription')}</span>
          </div>
          <select
            aria-label={t('portalTheme')}
            value={settings.theme}
            onChange={event => patchSettings({ theme: event.target.value as GeneralSettings['theme'] })}
          >
            <option value="light">{t('light')}</option>
            <option value="dark">{t('dark')}</option>
            <option value="system">{t('system')}</option>
          </select>
        </div>

        <div className="settings-simple-row settings-simple-row--timezone">
          <div>
            <strong>{t('dateTime')}</strong>
            <span>{t('dateTimeDescription')}</span>
          </div>
          <PortalTimeZoneSelect />
        </div>
      </section>
      <p className="settings-simple-note">{t('automaticChanges')}</p>
    </div>
  );
}
