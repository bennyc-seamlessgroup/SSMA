'use client';

import { useEffect, useMemo, useState } from 'react';
import { authenticatedFetch, getAuthenticatedProfile } from '@/lib/auth-client';

type HotkeyMapping = {
  ticker: string;
  kwatchHotkey: string;
  platform?: HotkeyPlatform | string | null;
  createUser: string;
  createDatetime: string;
};

type HotkeyResponse = HotkeyMapping[] | {
  hotkeys?: HotkeyMapping[];
  items?: HotkeyMapping[];
};

type LoadState = 'loading' | 'idle' | 'saving' | 'deleting' | 'error';
type HotkeyPlatform = 'Reddit' | 'X' | 'Facebook' | 'Linkedin';

const platformOptions: HotkeyPlatform[] = ['Reddit', 'X', 'Facebook', 'Linkedin'];

function normalizeHotkey(value: string) {
  return value.trim();
}

function isConfiguredPlatform(value: unknown): value is HotkeyPlatform {
  return platformOptions.includes(value as HotkeyPlatform);
}

function inferPlatformFromHotkey(value: string): HotkeyPlatform | null {
  const normalized = value.toLowerCase();
  if (normalized.includes('youtube')) return null;
  if (normalized.includes('reddit')) return 'Reddit';
  if (normalized.includes('twitter') || normalized.includes('tweet')) return 'X';
  if (normalized === 'x' || normalized.startsWith('x_') || normalized.startsWith('x-') || normalized.includes('_x_') || normalized.includes('-x-')) return 'X';
  if (normalized.includes('facebook') || normalized.includes('fb_') || normalized.includes('fb-')) return 'Facebook';
  if (normalized.includes('linkedin') || normalized.includes('linked_in')) return 'Linkedin';
  return null;
}

function platformForDisplay(mapping: HotkeyMapping) {
  if (isConfiguredPlatform(mapping.platform)) return mapping.platform;
  return inferPlatformFromHotkey(mapping.kwatchHotkey);
}

function mappingsFromResponse(response: HotkeyResponse) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.hotkeys)) return response.hotkeys;
  if (Array.isArray(response.items)) return response.items;
  return [];
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'Not available';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function HotkeyOperationsClient({ ticker }: { ticker: string }) {
  const normalizedTicker = ticker.trim().toUpperCase();
  const [mappings, setMappings] = useState<HotkeyMapping[]>([]);
  const [hotkey, setHotkey] = useState('');
  const [platform, setPlatform] = useState<HotkeyPlatform>('Reddit');
  const [isOperator, setIsOperator] = useState(false);
  const [state, setState] = useState<LoadState>('loading');
  const [message, setMessage] = useState('');

  async function loadMappings(preserveMessage = false) {
    setState('loading');
    if (!preserveMessage) setMessage('');
    try {
      const response = await authenticatedFetch(
        `/hotkeys?ticker=${encodeURIComponent(normalizedTicker)}`,
        { cache: 'no-store' },
      ) as HotkeyResponse;
      setMappings(mappingsFromResponse(response));
      setState('idle');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Unable to load notification hotkeys.');
    }
  }

  async function assignInferredPlatforms(nextMappings: HotkeyMapping[]) {
    const updates = nextMappings
      .map(mapping => ({ mapping, inferredPlatform: platformForDisplay(mapping) }))
      .filter((item): item is { mapping: HotkeyMapping; inferredPlatform: HotkeyPlatform } => (
        Boolean(item.inferredPlatform)
        && !isConfiguredPlatform(item.mapping.platform)
      ));

    if (!updates.length) return;

    await Promise.all(updates.map(({ mapping, inferredPlatform }) => (
      authenticatedFetch('/hotkeys', {
        method: 'POST',
        body: JSON.stringify({
          ticker: mapping.ticker || normalizedTicker,
          kwatchHotkey: mapping.kwatchHotkey,
          platform: inferredPlatform,
        }),
      })
    )));
  }

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getAuthenticatedProfile(),
      authenticatedFetch(`/hotkeys?ticker=${encodeURIComponent(normalizedTicker)}`, { cache: 'no-store' }) as Promise<HotkeyResponse>,
    ])
      .then(([profile, response]) => {
        if (cancelled) return;
        setIsOperator(String(profile.role ?? '').trim().toUpperCase() === 'OPERATOR');
        const nextMappings = mappingsFromResponse(response);
        setMappings(nextMappings);
        setState('idle');
        if (String(profile.role ?? '').trim().toUpperCase() === 'OPERATOR') {
          assignInferredPlatforms(nextMappings)
            .then(() => {
              if (!cancelled) return loadMappings(true);
            })
            .catch(() => undefined);
        }
      })
      .catch(error => {
        if (cancelled) return;
        setState('error');
        setMessage(error instanceof Error ? error.message : 'Unable to load notification hotkeys.');
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedTicker]);

  const sortedMappings = useMemo(
    () => [...mappings].sort((a, b) => {
      const platformSort = String(platformForDisplay(a) ?? '').localeCompare(String(platformForDisplay(b) ?? ''));
      return platformSort || a.kwatchHotkey.localeCompare(b.kwatchHotkey);
    }),
    [mappings],
  );
  const busy = state === 'loading' || state === 'saving' || state === 'deleting';
  const normalizedDraft = normalizeHotkey(hotkey);

  async function saveMapping(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!normalizedDraft || !isOperator) return;

    setState('saving');
    setMessage('');
    try {
      await authenticatedFetch('/hotkeys', {
        method: 'POST',
        body: JSON.stringify({
          ticker: normalizedTicker,
          kwatchHotkey: normalizedDraft,
          platform,
        }),
      });
      setHotkey('');
      setMessage(`Saved ${normalizedDraft} for ${normalizedTicker} under ${platform}.`);
      await loadMappings(true);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Unable to save the hotkey mapping.');
    }
  }

  async function deleteMapping(mapping: HotkeyMapping) {
    if (!isOperator) return;
    setState('deleting');
    setMessage('');
    try {
      await authenticatedFetch(
        `/hotkeys/${encodeURIComponent(mapping.ticker)}/${encodeURIComponent(mapping.kwatchHotkey)}`,
        { method: 'DELETE' },
      );
      setMessage(`Deleted ${mapping.kwatchHotkey} from ${mapping.ticker}.`);
      await loadMappings(true);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Unable to delete the hotkey mapping.');
    }
  }

  return (
    <div className="hotkey-settings-stack">
      {isOperator && (
        <section className="settings-panel hotkey-editor">
          <div className="settings-panel__head">
            <div>
              <span>Operator control</span>
              <h2>Add notification hotkey</h2>
            </div>
            <span className="badge blue">{normalizedTicker}</span>
          </div>
          <form className="hotkey-form" onSubmit={saveMapping}>
            <label>
              <span>Hotkey binding</span>
              <input
                value={hotkey}
                onChange={event => setHotkey(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                suppressHydrationWarning
                required
              />
            </label>
            <label>
              <span>Platform</span>
              <select
                value={platform}
                suppressHydrationWarning
                onChange={event => setPlatform(event.target.value as HotkeyPlatform)}
              >
                {platformOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <button className="button primary" type="submit" disabled={busy || !normalizedDraft}>
              {state === 'saving' ? 'Saving...' : 'Save hotkey'}
            </button>
          </form>
        </section>
      )}

      <section className="settings-panel">
        <div className="settings-panel__head">
          <div>
            <span>Notification map</span>
            <h2>{normalizedTicker} hotkeys</h2>
          </div>
          <span className="hotkey-count">{sortedMappings.length} mapped</span>
        </div>

        {message && <div className={`hotkey-message ${state === 'error' ? 'is-error' : ''}`} role="status">{message}</div>}

        {state === 'loading' && mappings.length === 0 ? (
          <div className="hotkey-empty">Loading hotkey mappings...</div>
        ) : sortedMappings.length === 0 ? (
          <div className="hotkey-empty">
            <strong>No hotkeys configured</strong>
            <span>No notification hotkeys are currently mapped to {normalizedTicker}.</span>
          </div>
        ) : (
          <div className={`hotkey-table ${isOperator ? '' : 'is-readonly'}`}>
            <div className="hotkey-table__head">
              <span>Hotkey</span>
              <span>Platform</span>
              <span>Created by</span>
              <span>Created</span>
              {isOperator && <span>Action</span>}
            </div>
            {sortedMappings.map(mapping => (
              <div className={`hotkey-table__row ${isOperator ? '' : 'is-readonly'}`} key={`${mapping.ticker}:${mapping.kwatchHotkey}:${mapping.platform ?? 'unassigned'}`}>
                <kbd>{mapping.kwatchHotkey}</kbd>
                <span className="hotkey-platform">{platformForDisplay(mapping) || 'Unassigned'}</span>
                <span>{mapping.createUser || 'Not available'}</span>
                <time dateTime={mapping.createDatetime}>{formatCreatedAt(mapping.createDatetime)}</time>
                {isOperator && (
                  <button
                    className="hotkey-delete"
                    type="button"
                    disabled={busy}
                    onClick={() => deleteMapping(mapping)}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
