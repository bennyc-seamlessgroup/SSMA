'use client';

import { useEffect, useState } from 'react';
import { PortalTimeZoneSelect } from '@/components/PortalTimeZoneSelect';

const languageOptions = [
  ['en', 'English'],
  ['zh-Hant', 'Traditional Chinese'],
  ['zh-Hans', 'Simplified Chinese'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
] as const;

const storageKey = 'currenc-general-settings';
const themeStorageKey = 'monitor-design-b-theme';

type GeneralSettings = {
  language: string;
  theme: 'light' | 'dark' | 'system';
};

const defaultSettings: GeneralSettings = {
  language: 'en',
  theme: 'light',
};

function readSettings(): GeneralSettings {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const stored = raw ? JSON.parse(raw) as Partial<GeneralSettings> : {};
    const portalTheme = window.localStorage.getItem(themeStorageKey);
    return {
      language: typeof stored.language === 'string' ? stored.language : defaultSettings.language,
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
  const [settings, setSettings] = useState<GeneralSettings>(defaultSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readSettings();
    setSettings(stored);
    applyThemePreference(stored.theme);
    setReady(true);
  }, []);

  function patchSettings(patch: Partial<GeneralSettings>) {
    setSettings(current => {
      const next = { ...current, ...patch };
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      if (patch.theme) applyThemePreference(next.theme);
      window.dispatchEvent(new CustomEvent('currenc-general-settings-change', { detail: next }));
      return next;
    });
  }

  return (
    <div className="page settings-page settings-general-page">
      <section className="settings-simple-panel" aria-busy={!ready}>
        <div className="settings-simple-row">
          <div>
            <strong>Language</strong>
            <span>Choose the language used across the portal.</span>
          </div>
          <select
            aria-label="Portal language"
            value={settings.language}
            onChange={event => patchSettings({ language: event.target.value })}
          >
            {languageOptions.map(([value, label]) => (
              <option value={value} key={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="settings-simple-row">
          <div>
            <strong>Theme</strong>
            <span>Control the portal appearance on this device.</span>
          </div>
          <select
            aria-label="Portal theme"
            value={settings.theme}
            onChange={event => patchSettings({ theme: event.target.value as GeneralSettings['theme'] })}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>

        <div className="settings-simple-row settings-simple-row--timezone">
          <div>
            <strong>Date &amp; Time</strong>
            <span>Display dates and update times in your preferred time zone.</span>
          </div>
          <PortalTimeZoneSelect />
        </div>
      </section>
      <p className="settings-simple-note">Changes are applied automatically and stored on this device.</p>
    </div>
  );
}
