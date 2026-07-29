'use client';

import { useEffect, useRef, useState } from 'react';
import { cachedAuthenticatedFetch } from '@/lib/auth-client';

type IndicatorLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PointerInteraction = {
  mode: 'move' | 'resize';
  pointerX: number;
  pointerY: number;
  layout: IndicatorLayout;
};

const storageKey = 'currenc-operations-company-indicator';
const minimumWidth = 240;
const minimumHeight = 118;

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function companyNameFromPayload(payload: unknown, ticker: string) {
  const root = objectValue(payload);
  const data = objectValue(root.data);
  const requestedTicker = ticker.trim().toUpperCase();
  const candidates = [
    root,
    data,
    objectValue(root['company-profile-current']),
    objectValue(data['company-profile-current']),
    ...([root.records, data.records]
      .filter(Array.isArray)
      .flatMap(records => records as Array<Record<string, unknown>>)),
  ];

  for (const candidate of candidates) {
    const record = objectValue(candidate);
    const recordTicker = String(record.ticker ?? record.stockCode ?? '').trim().toUpperCase();
    const companyName = String(record.companyName ?? '').trim();
    if (companyName && (!recordTicker || recordTicker === requestedTicker)) return companyName;
  }
  return '';
}

function defaultLayout() {
  const width = Math.min(340, Math.max(minimumWidth, window.innerWidth - 32));
  const height = 138;
  return {
    x: Math.max(16, window.innerWidth - width - 24),
    y: Math.max(16, window.innerHeight - height - 24),
    width,
    height,
  };
}

function fitLayout(layout: IndicatorLayout) {
  const maximumWidth = Math.max(minimumWidth, window.innerWidth - 24);
  const maximumHeight = Math.max(minimumHeight, window.innerHeight - 24);
  const width = Math.min(Math.max(layout.width, minimumWidth), maximumWidth);
  const height = Math.min(Math.max(layout.height, minimumHeight), maximumHeight);
  return {
    width,
    height,
    x: Math.min(Math.max(layout.x, 12), Math.max(12, window.innerWidth - width - 12)),
    y: Math.min(Math.max(layout.y, 12), Math.max(12, window.innerHeight - height - 12)),
  };
}

export function OperationsCompanyIndicator({ ticker }: { ticker: string }) {
  const [companyName, setCompanyName] = useState('');
  const [layout, setLayout] = useState<IndicatorLayout>({ x: 16, y: 16, width: 340, height: 138 });
  const [ready, setReady] = useState(false);
  const interaction = useRef<PointerInteraction | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) as Partial<IndicatorLayout> : null;
      const isValid = parsed
        && [parsed.x, parsed.y, parsed.width, parsed.height].every(value => typeof value === 'number' && Number.isFinite(value));
      setLayout(fitLayout(isValid ? parsed as IndicatorLayout : defaultLayout()));
    } catch {
      setLayout(defaultLayout());
    }
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCompanyName('');
    cachedAuthenticatedFetch(
      `/market-data/current?ticker=${encodeURIComponent(ticker)}&category=company-profile-current`,
    )
      .then(payload => {
        if (!cancelled) setCompanyName(companyNameFromPayload(payload, ticker));
      })
      .catch(() => {
        if (!cancelled) setCompanyName('');
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  useEffect(() => {
    if (!ready) return;
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify(layout));
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [layout, ready]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const current = interaction.current;
      if (!current) return;
      const deltaX = event.clientX - current.pointerX;
      const deltaY = event.clientY - current.pointerY;
      setLayout(fitLayout(current.mode === 'move'
        ? { ...current.layout, x: current.layout.x + deltaX, y: current.layout.y + deltaY }
        : {
            ...current.layout,
            width: current.layout.width + deltaX,
            height: current.layout.height + deltaY,
          }));
    }

    function stopInteraction() {
      interaction.current = null;
      document.body.classList.remove('is-moving-operations-company');
    }

    function handleResize() {
      setLayout(current => fitLayout(current));
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopInteraction);
    window.addEventListener('pointercancel', stopInteraction);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopInteraction);
      window.removeEventListener('pointercancel', stopInteraction);
      window.removeEventListener('resize', handleResize);
      document.body.classList.remove('is-moving-operations-company');
    };
  }, []);

  function startInteraction(event: React.PointerEvent, mode: PointerInteraction['mode']) {
    if (event.button !== 0) return;
    event.preventDefault();
    interaction.current = {
      mode,
      pointerX: event.clientX,
      pointerY: event.clientY,
      layout,
    };
    document.body.classList.add('is-moving-operations-company');
  }

  return (
    <aside
      className="ops-company-indicator"
      aria-label={`Active company: ${companyName || 'Company name unavailable'}, ${ticker}`}
      aria-live="polite"
      style={{
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
        visibility: ready ? 'visible' : 'hidden',
      }}
    >
      <div
        className="ops-company-indicator__handle"
        onPointerDown={event => startInteraction(event, 'move')}
        title="Drag to move"
      >
        <span>Active company</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2v20M2 12h20M12 2l-3 3m3-3 3 3M12 22l-3-3m3 3 3-3M2 12l3-3m-3 3 3 3M22 12l-3-3m3 3-3 3" />
        </svg>
      </div>
      <div className="ops-company-indicator__content">
        <strong className="ops-company-indicator__ticker">{ticker}</strong>
        <span className="ops-company-indicator__name">{companyName || 'Company name unavailable'}</span>
      </div>
      <button
        type="button"
        className="ops-company-indicator__resize"
        aria-label="Resize company indicator"
        title="Drag to resize"
        onPointerDown={event => startInteraction(event, 'resize')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 21 12-12M15 21l6-6M3 21 18-18" />
        </svg>
      </button>
    </aside>
  );
}
