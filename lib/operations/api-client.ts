'use client';

import { authenticatedFetch, getAuthenticatedProfile, type AuthenticatedProfile } from '@/lib/auth-client';

function localOperationsPath(path: string) {
  if (path.startsWith('/market-data/batch')) return path.replace('/market-data/batch', '/api/operations/market-data/batch');
  if (path.startsWith('/market-data')) return path.replace('/market-data', '/api/operations/market-data');
  if (path.startsWith('/sec-filings')) return path.replace('/sec-filings', '/api/operations/sec-filings');
  if (path.startsWith('/hotkeys/')) {
    const [, , ticker = '', hotkey = ''] = path.split('/');
    const query = new URLSearchParams({
      ticker: decodeURIComponent(ticker),
      kwatchHotkey: decodeURIComponent(hotkey),
    });
    return `/api/operations/hotkeys?${query.toString()}`;
  }
  if (path.startsWith('/hotkeys')) return path.replace('/hotkeys', '/api/operations/hotkeys');
  return `/api/operations${path}`;
}

function unwrapLocalPayload(payload: unknown) {
  const candidate = payload as { ok?: boolean; data?: unknown; error?: string };
  if (candidate && typeof candidate === 'object' && 'ok' in candidate) {
    if (candidate.ok === false) throw new Error(candidate.error || 'Operations API request failed.');
    return candidate.data ?? payload;
  }
  return payload;
}

export async function operationsFetch(path: string, options: RequestInit = {}) {
  try {
    return await authenticatedFetch(path, options);
  } catch {
    const response = await fetch(localOperationsPath(path), {
      ...options,
      cache: options.cache ?? 'no-store',
      headers: options.body instanceof FormData
        ? options.headers
        : { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = payload as { error?: string; message?: string };
      throw new Error(error.error || error.message || 'Operations API request failed.');
    }
    return unwrapLocalPayload(payload);
  }
}

export async function operationsProfile(): Promise<AuthenticatedProfile> {
  try {
    return await getAuthenticatedProfile();
  } catch {
    return {
      role: 'OPERATOR',
      ticker: 'CURR',
      email: 'operations@local.prototype',
      name: 'Operations Prototype',
    };
  }
}
