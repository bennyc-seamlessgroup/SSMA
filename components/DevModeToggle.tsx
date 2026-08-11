'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { getAuthenticatedProfile } from '@/lib/auth-client';

const storageKey = 'monitor-dev-mode-enabled';

function applyDevMode(enabled: boolean) {
  document.documentElement.dataset.devMode = enabled ? 'true' : 'false';
}

export function DevModeToggle() {
  const [enabled, setEnabled] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useLayoutEffect(() => {
    // Keep development-only UI hidden until the authenticated role is known.
    applyDevMode(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const disable = () => {
      window.localStorage.removeItem(storageKey);
      applyDevMode(false);
      if (!cancelled) {
        setEnabled(false);
        setAuthorized(false);
      }
    };

    getAuthenticatedProfile()
      .then(profile => {
        if (cancelled) return;
        const role = String(profile.role ?? '').trim().toUpperCase();
        const canUseDevMode = role === 'OPERATOR' || role === 'ADMIN';
        if (!canUseDevMode) {
          disable();
          return;
        }

        const stored = window.localStorage.getItem(storageKey) === 'true';
        setAuthorized(true);
        setEnabled(stored);
        applyDevMode(stored);
      })
      .catch(disable);

    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = () => {
    if (!authorized) return;
    const next = !enabled;
    setEnabled(next);
    window.localStorage.setItem(storageKey, String(next));
    applyDevMode(next);
  };

  if (!authorized) return null;

  return (
    <div className="dev-mode-toggle-row">
      <span>Dev mode</span>
      <button
        type="button"
        className={`dev-mode-toggle ${enabled ? 'is-on' : ''}`}
        aria-label="Toggle development mode"
        aria-pressed={enabled}
        onClick={toggle}
      >
        <i aria-hidden="true" />
      </button>
    </div>
  );
}
