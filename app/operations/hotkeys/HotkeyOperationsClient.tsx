'use client';

import { useEffect, useMemo, useState } from 'react';
import { OperationsDevelopmentData } from '@/components/OperationsDevelopmentData';
import { operationsFetch, operationsProfile } from '@/lib/operations/api-client';

type HotkeyMapping = {
  ticker: string;
  kwatchHotkey: string;
  platform?: HotkeyPlatform | string | null;
  createUser: string;
  createDatetime: string;
};

type HotkeyResponse = HotkeyMapping[] | {
  source?: string;
  updatedAt?: string;
  hotkeys?: HotkeyMapping[];
  items?: HotkeyMapping[];
  records?: HotkeyMapping[];
  data?: HotkeyMapping[];
};

type LoadState = 'loading' | 'idle' | 'saving' | 'deleting' | 'error';
type HotkeyPlatform = 'Reddit' | 'X' | 'Facebook' | 'Linkedin';

const platformOptions: HotkeyPlatform[] = ['Reddit', 'X', 'Facebook', 'Linkedin'];

function normalizeHotkey(value: string) {
  return value.trim();
}

function normalizeConfiguredPlatform(value: unknown): HotkeyPlatform | null {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized === 'reddit') return 'Reddit';
  if (normalized === 'x' || normalized === 'twitter') return 'X';
  if (normalized === 'facebook' || normalized === 'fb') return 'Facebook';
  if (normalized === 'linkedin' || normalized === 'linkin') return 'Linkedin';
  return null;
}

function hasConfiguredPlatform(value: unknown) {
  return normalizeConfiguredPlatform(value) !== null;
}

function inferPlatformFromHotkey(value: string): HotkeyPlatform | null {
  const normalized = value.toLowerCase();
  if (normalized.includes('youtube')) return null;
  if (normalized.includes('reddit')) return 'Reddit';
  if (normalized.includes('twitter') || normalized.includes('tweet')) return 'X';
  if (normalized === 'x' || normalized.startsWith('x_') || normalized.startsWith('x-') || normalized.includes('_x_') || normalized.includes('-x-')) return 'X';
  if (normalized.includes('facebook') || normalized.includes('fb_') || normalized.includes('fb-')) return 'Facebook';
  if (normalized.includes('linkedin') || normalized.includes('linked_in') || normalized.includes('linkin')) return 'Linkedin';
  return null;
}

function platformForDisplay(mapping: HotkeyMapping) {
  const configuredPlatform = normalizeConfiguredPlatform(mapping.platform);
  if (configuredPlatform) return configuredPlatform;
  return inferPlatformFromHotkey(mapping.kwatchHotkey);
}

function platformLabel(platform: HotkeyPlatform) {
  return platform === 'Linkedin' ? 'LinkedIn' : platform;
}

function mappingsFromResponse(response: HotkeyResponse) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.hotkeys)) return response.hotkeys;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.records)) return response.records;
  if (Array.isArray(response.data)) return response.data;
  return [];
}

function responseMetadata(response: HotkeyResponse | undefined) {
  if (!response || Array.isArray(response)) return {};
  return { source: response.source, updatedAt: response.updatedAt };
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'Not available';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

async function jsonHotkeysFetch(path: string, options: RequestInit = {}) {
  return operationsFetch(path, { ...options, cache: options.cache ?? 'no-store' });
}

export function HotkeyOperationsClient({ ticker }: { ticker: string }) {
  const normalizedTicker = ticker.trim().toUpperCase();
  const [mappings, setMappings] = useState<HotkeyMapping[]>([]);
  const [hotkey, setHotkey] = useState('');
  const [platform, setPlatform] = useState<HotkeyPlatform>('Reddit');
  const [isOperator, setIsOperator] = useState(false);
  const [state, setState] = useState<LoadState>('loading');
  const [message, setMessage] = useState('');
  const [developmentPayload, setDevelopmentPayload] = useState<HotkeyResponse>();

  async function loadMappings(preserveMessage = false) {
    setState('loading');
    setDevelopmentPayload(undefined);
    if (!preserveMessage) setMessage('');
    try {
      const response = await jsonHotkeysFetch(
        `/hotkeys?ticker=${encodeURIComponent(normalizedTicker)}`,
        { cache: 'no-store' },
      ) as HotkeyResponse;
      setDevelopmentPayload(response);
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
        && !hasConfiguredPlatform(item.mapping.platform)
      ));

    if (!updates.length) return;

    await Promise.all(updates.map(({ mapping, inferredPlatform }) => (
      jsonHotkeysFetch('/hotkeys', {
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
      operationsProfile(),
      jsonHotkeysFetch(`/hotkeys?ticker=${encodeURIComponent(normalizedTicker)}`, { cache: 'no-store' }) as Promise<HotkeyResponse>,
    ])
      .then(([profile, response]) => {
        if (cancelled) return;
        setIsOperator(String(profile.role ?? '').trim().toUpperCase() === 'OPERATOR');
        const nextMappings = mappingsFromResponse(response);
        setDevelopmentPayload(response);
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
  const developmentMetadata = responseMetadata(developmentPayload);

  async function saveMapping(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!normalizedDraft || !isOperator) return;

    setState('saving');
    setMessage('');
    try {
      await jsonHotkeysFetch('/hotkeys', {
        method: 'POST',
        body: JSON.stringify({
          ticker: normalizedTicker,
          kwatchHotkey: normalizedDraft,
          platform,
        }),
      });
      setHotkey('');
      setMessage(`Saved ${normalizedDraft} for ${normalizedTicker} under ${platformLabel(platform)}.`);
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
      await jsonHotkeysFetch(
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
                  <option key={option} value={option}>{platformLabel(option)}</option>
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
            {sortedMappings.map(mapping => {
              const mappedPlatform = platformForDisplay(mapping);
              return (
                <div className={`hotkey-table__row ${isOperator ? '' : 'is-readonly'}`} key={`${mapping.ticker}:${mapping.kwatchHotkey}:${mapping.platform ?? 'unassigned'}`}>
                  <kbd>{mapping.kwatchHotkey}</kbd>
                  <span className="hotkey-platform">{mappedPlatform ? platformLabel(mappedPlatform) : 'Unassigned'}</span>
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
              );
            })}
          </div>
        )}
      </section>

      <OperationsDevelopmentData
        title="Notification Hotkey API Response"
        description="Raw mapping envelope returned by the operations hotkey route for the active ticker."
        rows={[{
          endpoint: `GET /hotkeys?ticker=${normalizedTicker}`,
          source: developmentMetadata.source || 'Authenticated Hotkey API',
          state: state === 'error' && message ? `error: ${message}` : state,
          recordCount: developmentPayload === undefined || state === 'error' ? undefined : mappings.length,
          updatedAt: developmentMetadata.updatedAt,
          payload: developmentPayload,
        }]}
      />
    </div>
  );
}
