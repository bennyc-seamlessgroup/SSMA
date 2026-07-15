'use client';

import { authenticatedFetch, getAuthenticatedProfile, type AuthenticatedProfile } from '@/lib/auth-client';

export async function operationsFetch(path: string, options: RequestInit = {}) {
  return authenticatedFetch(path, options);
}

export async function operationsProfile(): Promise<AuthenticatedProfile> {
  return getAuthenticatedProfile();
}
