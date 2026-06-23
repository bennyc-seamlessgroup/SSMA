'use client';

import { useEffect, useState } from 'react';

const storageKey = 'monitor-portal-design';

type PortalDesign = 'a' | 'b';

function applyPortalDesign(design: PortalDesign) {
  document.documentElement.dataset.portalDesign = design;
}

export function PortalDesignToggle() {
  const [design, setDesign] = useState<PortalDesign>('a');

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey) === 'b' ? 'b' : 'a';
    setDesign(stored);
    applyPortalDesign(stored);
  }, []);

  const toggle = () => {
    const next = design === 'a' ? 'b' : 'a';
    setDesign(next);
    window.localStorage.setItem(storageKey, next);
    applyPortalDesign(next);
  };

  return (
    <div className="portal-design-toggle-row dev-only">
      <span>Design {design.toUpperCase()}</span>
      <button
        type="button"
        className={`portal-design-toggle ${design === 'b' ? 'is-on' : ''}`}
        aria-pressed={design === 'b'}
        onClick={toggle}
      >
        <span>A</span>
        <span>B</span>
      </button>
    </div>
  );
}
