'use client';

import { useEffect, useState } from 'react';
import { getOperationsTicker } from '@/lib/operations/ticker-client';
import { HotkeyOperationsClient } from './HotkeyOperationsClient';

export function HotkeyWorkspace() {
  const [ticker, setTicker] = useState('CURR');

  useEffect(() => {
    setTicker(getOperationsTicker());
  }, []);

  return <HotkeyOperationsClient key={ticker} ticker={ticker} />;
}
