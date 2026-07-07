'use client';

import { useRouter } from 'next/navigation';
import { portalTimeZoneOptions } from '@/lib/timezone';
import { setPortalTimeZonePreference, usePortalTimeZone } from './usePortalTimeZone';

export function PortalTimeZoneSelect() {
  const router = useRouter();
  const timeZone = usePortalTimeZone();

  return (
    <label className="settings-timezone-control">
      <span>Portal time zone</span>
      <select
        value={timeZone}
        onChange={event => {
          setPortalTimeZonePreference(event.target.value);
          router.refresh();
        }}
      >
        {portalTimeZoneOptions.map(option => (
          <option value={option.value} key={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
