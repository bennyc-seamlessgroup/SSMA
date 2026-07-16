'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function TickerSearch({ defaultTicker = 'CURR' }: { defaultTicker?: string }) {
  const [ticker, setTicker] = useState(defaultTicker);
  const router = useRouter();
  return (
    <form className="form-row" onSubmit={(e) => { e.preventDefault(); router.push(`/monitor/${ticker.trim().toUpperCase()}/dashboard`); }}>
      <input className="input" value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="Enter NASDAQ / NYSE ticker" aria-label="Ticker" />
      <button className="button" type="submit">Start Monitoring</button>
    </form>
  );
}
