'use client';

import { useEffect, useMemo, useState } from 'react';
import { authenticatedFetch, getAuthenticatedProfile } from '@/lib/auth-client';

type HotkeyMapping = {
  ticker: string;
  kwatchHotkey: string;
  createUser: string;
  createDatetime: string;
};

type HotkeyResponse = HotkeyMapping[] | {
  hotkeys?: HotkeyMapping[];
  items?: HotkeyMapping[];
};

type LoadState = 'loading' | 'idle' | 'saving' | 'deleting' | 'error';

function normalizeHotkey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
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

export function NotificationHotkeysClient({ ticker }: { ticker: string }) {
  const normalizedTicker = ticker.trim().toUpperCase();
  const [mappings, setMappings] = useState<HotkeyMapping[]>([]);
  const [hotkey, setHotkey] = useState('');
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

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getAuthenticatedProfile(),
      authenticatedFetch(`/hotkeys?ticker=${encodeURIComponent(normalizedTicker)}`, { cache: 'no-store' }) as Promise<HotkeyResponse>,
    ])
      .then(([profile, response]) => {
        if (cancelled) return;
        setIsOperator(String(profile.role ?? '').trim().toUpperCase() === 'OPERATOR');
        setMappings(mappingsFromResponse(response));
        setState('idle');
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
    () => [...mappings].sort((a, b) => a.kwatchHotkey.localeCompare(b.kwatchHotkey)),
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
        }),
      });
      setHotkey('');
      setMessage(`Saved ${normalizedDraft} for ${normalizedTicker}.`);
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
                placeholder="e.g. alt+a or shift+h"
                autoComplete="off"
                spellCheck={false}
                required
              />
            </label>
            <button className="button primary" type="submit" disabled={busy || !normalizedDraft}>
              {state === 'saving' ? 'Saving...' : 'Save hotkey'}
            </button>
          </form>
          <p className="hotkey-help">Use the same key representation expected by KWatch, such as <code>alt+a</code> or <code>shift+h</code>.</p>
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
              <span>Created by</span>
              <span>Created</span>
              {isOperator && <span>Action</span>}
            </div>
            {sortedMappings.map(mapping => (
              <div className={`hotkey-table__row ${isOperator ? '' : 'is-readonly'}`} key={`${mapping.ticker}:${mapping.kwatchHotkey}`}>
                <kbd>{mapping.kwatchHotkey}</kbd>
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
