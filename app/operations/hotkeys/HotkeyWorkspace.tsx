'use client';

import { useEffect, useState } from 'react';
import { getOperationsTicker, setOperationsTicker } from '@/lib/operations/ticker-client';
import { HotkeyOperationsClient } from './HotkeyOperationsClient';

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 10) || 'CURR';
}

export function HotkeyWorkspace() {
  const [ticker, setTicker] = useState('CURR');
  const [draft, setDraft] = useState('CURR');

  useEffect(() => {
    const storedTicker = getOperationsTicker();
    setTicker(storedTicker);
    setDraft(storedTicker);
  }, []);

  function loadWorkspace() {
    const normalized = normalizeTicker(draft);
    setOperationsTicker(normalized);
    setDraft(normalized);
    setTicker(normalized);
  }

  return (
    <>
      <div className="ops-ticker-context">
        <label>
          <span>Company ticker</span>
          <input
            value={draft}
            maxLength={10}
            suppressHydrationWarning
            onChange={event => setDraft(event.target.value.toUpperCase())}
          />
        </label>
        <button type="button" onClick={loadWorkspace}>Load Workspace</button>
        <small>Notification mappings are managed per ticker.</small>
      </div>
      <HotkeyOperationsClient key={ticker} ticker={ticker} />
    </>
  );
}
