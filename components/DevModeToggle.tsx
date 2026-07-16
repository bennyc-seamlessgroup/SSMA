'use client';

import { useEffect, useState } from 'react';

const storageKey = 'monitor-dev-mode-enabled';

function applyDevMode(enabled: boolean) {
  document.documentElement.dataset.devMode = enabled ? 'true' : 'false';
}

export function DevModeToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey) === 'true';
    setEnabled(stored);
    applyDevMode(stored);
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    window.localStorage.setItem(storageKey, String(next));
    applyDevMode(next);
  };

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
