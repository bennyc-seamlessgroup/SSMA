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

  return (
    <Link
      className="ops-user-portal-link"
      href={`/monitor/${ticker}/dashboard`}
      title={`Open ${ticker} user portal`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 5h5v5M19 5l-7 7" />
        <path d="M11 7H5v12h12v-6" />
      </svg>
      <span>User Portal · {ticker}</span>
    </Link>
  );
}
