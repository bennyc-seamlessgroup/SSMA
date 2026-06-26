'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

export function NarrativeRangeSelector({
  activeRange,
  ranges,
}: {
  activeRange: string;
  ranges: ReadonlyArray<{ label: string }>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [loadingRange, setLoadingRange] = useState<string | null>(null);

  useEffect(() => {
    setLoadingRange(null);
  }, [activeRange]);

  function selectRange(label: string) {
    if (label === activeRange) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set('range', label);
    setLoadingRange(label);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}` as never);
    });
  }

  const loading = isPending || Boolean(loadingRange);

  return (
    <div className="narrative-range-shell">
      <div className="narrative-page-range" aria-label="Narrative timeframe">
        {ranges.map(option => (
          <button
            key={option.label}
            type="button"
            className={activeRange === option.label ? 'active' : ''}
            disabled={loading && loadingRange === option.label}
            onClick={() => selectRange(option.label)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {loading && (
        <div className="narrative-range-loading" aria-live="polite">
          <span />
          <strong>Loading {loadingRange ?? activeRange} data...</strong>
        </div>
      )}
    </div>
  );
}
