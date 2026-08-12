'use client';

import { useEffect, useState } from 'react';
import { getAuthenticatedProfile } from '@/lib/auth-client';
import {
  dismissPublicDemoWelcome,
  isPublicDemoProfile,
  shouldShowPublicDemoWelcome,
} from '@/lib/public-demo';

export function PublicDemoWelcome() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAuthenticatedProfile()
      .then(profile => {
        if (cancelled) return;
        const isDemo = isPublicDemoProfile(profile);
        setIsOpen(isDemo && shouldShowPublicDemoWelcome());
        if (!isDemo) dismissPublicDemoWelcome();
      })
      .catch(() => {
        if (!cancelled) setIsOpen(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function close() {
    dismissPublicDemoWelcome();
    setIsOpen(false);
  }

  if (!isOpen) return null;

  return (
    <div className="public-demo-welcome-backdrop" role="presentation" onMouseDown={close}>
      <section
        className="public-demo-welcome"
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-demo-welcome-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <button className="public-demo-welcome__close" type="button" aria-label="Close welcome guide" onClick={close}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        <div className="public-demo-welcome__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-7" /></svg>
        </div>
        <span>Live Product Demo</span>
        <h1 id="public-demo-welcome-title">Welcome to Currenc Intelligence</h1>
        <p>
          You are viewing the authenticated demonstration account for the CURRENC Group Inc. (CURR) workspace.
          Shared company information is loaded from the same APIs used by other authorized CURR users.
        </p>
        <div className="public-demo-welcome__note">
          Internal Float uses fictional user-specific holdings. This account is read-only, and changes are
          not saved to company data.
        </div>
        <div className="public-demo-welcome__actions">
          <button className="button primary" type="button" onClick={close}>Start Exploring</button>
        </div>
      </section>
    </div>
  );
}
