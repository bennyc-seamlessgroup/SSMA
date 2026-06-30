'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getOperationsTicker, operationsTickerChangedEvent } from '@/lib/operations/ticker-client';

export function OperationsUserPortalLink() {
  const [ticker, setTicker] = useState('CURR');

  useEffect(() => {
    setTicker(getOperationsTicker());
    const update = () => setTicker(getOperationsTicker());
    window.addEventListener(operationsTickerChangedEvent, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(operationsTickerChangedEvent, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return <Link className="ops-user-portal-link" href={`/monitor/${ticker}/dashboard-v2`}>User Portal · {ticker}</Link>;
}

