import { cookies } from 'next/headers';
import { normalizePortalTimeZone, portalTimeZoneCookie } from './timezone';

export async function getServerPortalTimeZone() {
  const cookieStore = await cookies();
  return normalizePortalTimeZone(cookieStore.get(portalTimeZoneCookie)?.value);
}
