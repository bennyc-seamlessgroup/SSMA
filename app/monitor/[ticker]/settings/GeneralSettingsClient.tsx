'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortalTimeZoneSelect } from '@/components/PortalTimeZoneSelect';

const languageOptions = [
  ['en', 'English'],
  ['zh-Hant', 'Traditional Chinese'],
  ['zh-Hans', 'Simplified Chinese'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
] as const;

const landingPageOptions = [
  ['dashboard', 'Dashboard'],
  ['institutional', 'Ownership'],
  ['internal-float', 'Internal Float'],
  ['short-interest', 'Short Interest'],
  ['lending-pressure', 'Lending Pressure'],
  ['sentiment', 'Social Sentiment'],
  ['reports', 'Report Archive'],
] as const;

const numberFormatOptions = [
  ['compact', 'Compact numbers', '2.63M, 940.7K'],
  ['full', 'Full numbers', '2,630,000'],
  ['auto', 'Auto by page', 'Compact KPIs, full tables'],
] as const;

const dateFormatOptions = [
  ['medium', 'Readable dates', '24 Jun 2026'],
  ['short', 'Short dates', '06/24/2026'],
  ['iso', 'ISO dates', '2026-06-24'],
] as const;

const reportBehaviorOptions = [
  ['preview', 'Open preview first'],
  ['download', 'Download directly'],
  ['new-tab', 'Open in new tab'],
] as const;

const sessionTimeoutOptions = [
  ['browser', 'When browser closes'],
  ['8h', '8 hours'],
  ['24h', '24 hours'],
  ['7d', '7 days'],
] as const;

const storageKey = 'currenc-general-settings';
const themeStorageKey = 'monitor-design-b-theme';

type GeneralSettings = {
  language: string;
  landingPage: string;
  theme: 'light' | 'dark' | 'system';
  numberFormat: string;
  dateFormat: string;
  reportBehavior: string;
  rememberWorkspace: boolean;
  sessionTimeout: string;
};

const defaultSettings: GeneralSettings = {
  language: 'en',
  landingPage: 'dashboard',
  theme: 'light',
  numberFormat: 'compact',
  dateFormat: 'medium',
  reportBehavior: 'preview',
  rememberWorkspace: true,
  sessionTimeout: '8h',
};

function readSettings(): GeneralSettings {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultSettings;
    const settings = { ...defaultSettings, ...JSON.parse(raw) } as GeneralSettings;
    if (!landingPageOptions.some(([value]) => value === settings.landingPage)) {
      settings.landingPage = defaultSettings.landingPage;
    }
    return settings;
  } catch {
    return defaultSettings;
  }
}

function applyThemePreference(theme: GeneralSettings['theme']) {
  const resolvedTheme = theme === 'system'
    ? window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : theme;
  window.localStorage.setItem(themeStorageKey, resolvedTheme);
  document.documentElement.dataset.designBTheme = resolvedTheme;
}

function SettingsSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="settings-select-control">
      <span>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option value={optionValue} key={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function SegmentedPreference({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<readonly [string, string, string?]>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="settings-segmented-control">
      <span>{label}</span>
      <div>
        {options.map(([optionValue, optionLabel, hint]) => (
          <button
            type="button"
            key={optionValue}
            className={value === optionValue ? 'active' : ''}
            onClick={() => onChange(optionValue)}
          >
            <strong>{optionLabel}</strong>
            {hint ? <small>{hint}</small> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GeneralSettingsClient({ ticker }: { ticker: string }) {
  const router = useRouter();
  const [settings, setSettings] = useState<GeneralSettings>(defaultSettings);
  const [savedAt, setSavedAt] = useState('');
  const normalizedTicker = ticker.toUpperCase();

  useEffect(() => {
    const stored = readSettings();
    setSettings(stored);
    applyThemePreference(stored.theme);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
    applyThemePreference(settings.theme);
    window.dispatchEvent(new CustomEvent('currenc-general-settings-change', { detail: settings }));
  }, [settings]);

  const landingPreview = useMemo(() => (
    `/monitor/${normalizedTicker}/${settings.landingPage}`
  ), [normalizedTicker, settings.landingPage]);

  function patchSettings(patch: Partial<GeneralSettings>) {
    setSettings(current => ({ ...current, ...patch }));
  }

  function savePreferences() {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
    setSavedAt(new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date()));
    router.refresh();
  }

  function resetPreferences() {
    setSettings(defaultSettings);
    setSavedAt('');
  }

  return (
    <div className="page settings-page settings-general-page">
      <div className="settings-general-grid">
        <section className="settings-panel settings-general-primary">
          <div className="settings-panel__head">
            <div>
              <span>Display</span>
              <h2>Language &amp; Theme</h2>
            </div>
          </div>
          <div className="settings-control-card">
            <SettingsSelect
              label="Portal language"
              value={settings.language}
              options={languageOptions}
              onChange={language => patchSettings({ language })}
            />
            <SegmentedPreference
              label="Theme"
              value={settings.theme}
              options={[
                ['light', 'Light'],
                ['dark', 'Dark'],
                ['system', 'System'],
              ]}
              onChange={theme => patchSettings({ theme: theme as GeneralSettings['theme'] })}
            />
          </div>
        </section>

        <section className="settings-panel">
          <div className="settings-panel__head">
            <div>
              <span>Display</span>
              <h2>Date &amp; Time</h2>
            </div>
          </div>
          <div className="settings-control-card">
            <PortalTimeZoneSelect />
            <SegmentedPreference
              label="Date format"
              value={settings.dateFormat}
              options={dateFormatOptions}
              onChange={dateFormat => patchSettings({ dateFormat })}
            />
          </div>
        </section>

        <section className="settings-panel">
          <div className="settings-panel__head">
            <div>
              <span>Workspace</span>
              <h2>Startup Preferences</h2>
            </div>
          </div>
          <div className="settings-control-card">
            <SettingsSelect
              label="Default landing page"
              value={settings.landingPage}
              options={landingPageOptions}
              onChange={landingPage => patchSettings({ landingPage })}
            />
            <label className="settings-toggle-row">
              <input
                type="checkbox"
                checked={settings.rememberWorkspace}
                onChange={event => patchSettings({ rememberWorkspace: event.target.checked })}
              />
              <span>
                <strong>Remember last company workspace</strong>
                <small>Return to the last ticker you opened when signing in again.</small>
              </span>
            </label>
            <p>Current startup route preview: <strong>{landingPreview}</strong></p>
          </div>
        </section>

        <section className="settings-panel">
          <div className="settings-panel__head">
            <div>
              <span>Formatting</span>
              <h2>Numbers &amp; Reports</h2>
            </div>
          </div>
          <div className="settings-control-card">
            <SegmentedPreference
              label="Number display"
              value={settings.numberFormat}
              options={numberFormatOptions}
              onChange={numberFormat => patchSettings({ numberFormat })}
            />
            <SettingsSelect
              label="Report action"
              value={settings.reportBehavior}
              options={reportBehaviorOptions}
              onChange={reportBehavior => patchSettings({ reportBehavior })}
            />
          </div>
        </section>

        <section className="settings-panel">
          <div className="settings-panel__head">
            <div>
              <span>Privacy</span>
              <h2>Session Preferences</h2>
            </div>
          </div>
          <div className="settings-control-card">
            <SettingsSelect
              label="Session preference"
              value={settings.sessionTimeout}
              options={sessionTimeoutOptions}
              onChange={sessionTimeout => patchSettings({ sessionTimeout })}
            />
            <p>Session enforcement is still handled by authentication policy. This preference documents the user-facing default for the workspace.</p>
          </div>
        </section>
      </div>

      <div className="settings-general-actions">
        <div>
          <strong>General preferences</strong>
          <span>{savedAt ? `Saved at ${savedAt}` : 'Changes are stored in this browser.'}</span>
        </div>
        <div>
          <button className="button secondary" type="button" onClick={resetPreferences}>Reset defaults</button>
          <button className="button primary" type="button" onClick={savePreferences}>Save preferences</button>
        </div>
      </div>
    </div>
  );
}
