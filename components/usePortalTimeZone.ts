'use client';

import { useEffect, useState } from 'react';
import {
  defaultPortalTimeZone,
  normalizePortalTimeZone,
  portalTimeZoneCookie,
  portalTimeZoneStorageKey,
} from '@/lib/timezone';

const eventName = 'portal-time-zone-change';

function readCookieTimeZone() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${portalTimeZoneCookie}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

export function setPortalTimeZonePreference(timeZone: string) {
  const normalized = normalizePortalTimeZone(timeZone);
  window.localStorage.setItem(portalTimeZoneStorageKey, normalized);
  document.cookie = `${portalTimeZoneCookie}=${encodeURIComponent(normalized)}; path=/; max-age=31536000; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(eventName, { detail: normalized }));
}

export function usePortalTimeZone() {
  const [timeZone, setTimeZone] = useState(defaultPortalTimeZone);

  useEffect(() => {
    const readStored = () => normalizePortalTimeZone(
      window.localStorage.getItem(portalTimeZoneStorageKey) ?? readCookieTimeZone(),
    );

    const initial = readStored();
    setTimeZone(initial);
    window.localStorage.setItem(portalTimeZoneStorageKey, initial);
    document.cookie = `${portalTimeZoneCookie}=${encodeURIComponent(initial)}; path=/; max-age=31536000; SameSite=Lax`;

    const handleChange = (event: Event) => {
      const next = event instanceof CustomEvent ? event.detail : readStored();
      setTimeZone(normalizePortalTimeZone(String(next ?? '')));
    };

    window.addEventListener(eventName, handleChange);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener(eventName, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  return timeZone;
}
