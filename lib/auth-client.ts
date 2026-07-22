'use client';

import { endPublicDemoSession, isPublicDemoSession, publicDemoProfile } from './public-demo';

export type CognitoUser = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  nickname?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
};

export type AuthTokens = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
};

export type AuthenticatedProfile = Record<string, unknown> & {
  role?: string;
  ticker?: string;
  tickers?: string[];
  defaultTicker?: string;
  default_ticker?: string;
  companyAccess?: Array<{ ticker?: string; role?: string }>;
  company_access?: Array<{ ticker?: string; role?: string }>;
};

const tokenKeys = {
  accessToken: 'access_token',
  idToken: 'id_token',
  refreshToken: 'refresh_token',
  oauthState: 'oauth_state',
  codeVerifier: 'oauth_code_verifier',
  postLoginRedirect: 'post_login_redirect',
};

const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? '';
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? '';
const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? '';
const configuredRedirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI ?? '';
const configuredLogoutUri = process.env.NEXT_PUBLIC_LOGOUT_URI ?? '';
const authenticatedGetCacheTtlMs = Math.max(5, Number(process.env.NEXT_PUBLIC_API_CACHE_SECONDS ?? 900)) * 1000;
let profileRequest: Promise<AuthenticatedProfile> | null = null;
const authenticatedResponseCache = new Map<string, { expiresAt: number; value: unknown }>();
const authenticatedRequestsInFlight = new Map<string, Promise<unknown>>();

function clearAuthenticatedResponseCache() {
  authenticatedResponseCache.clear();
  authenticatedRequestsInFlight.clear();
}

function authenticatedCacheKey(path: string) {
  const user = decodeJWT(sessionStorage.getItem(tokenKeys.idToken));
  const owner = String(user?.sub ?? user?.email ?? 'anonymous');
  const [pathname, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  params.sort();
  return `${owner}:${pathname}${params.size ? `?${params.toString()}` : ''}`;
}

export function invalidateAuthenticatedFetchCache(path?: string) {
  if (!path) {
    clearAuthenticatedResponseCache();
    return;
  }
  const normalizedPath = path.split('?')[0];
  for (const key of authenticatedResponseCache.keys()) {
    if (key.includes(`:${normalizedPath}`)) authenticatedResponseCache.delete(key);
  }
  for (const key of authenticatedRequestsInFlight.keys()) {
    if (key.includes(`:${normalizedPath}`)) authenticatedRequestsInFlight.delete(key);
  }
}

function browserOrigin() {
  return typeof window === 'undefined' ? '' : window.location.origin;
}

export function getRedirectUri() {
  return configuredRedirectUri || `${browserOrigin()}/callback`;
}

export function getLogoutUri() {
  return configuredLogoutUri || `${browserOrigin()}/logout`;
}

export function authConfigReady() {
  return Boolean(cognitoDomain && clientId);
}

function assertAuthConfig() {
  if (!authConfigReady()) {
    throw new Error('Missing Cognito auth configuration.');
  }
}

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hash);
}

export function decodeJWT(token: string | null): CognitoUser | null {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) {
      if (pad === 1) return null;
      base64 += '='.repeat(4 - pad);
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as CognitoUser;
  } catch {
    return null;
  }
}

export function getStoredTokens(): AuthTokens | null {
  if (typeof window === 'undefined') return null;
  const accessToken = sessionStorage.getItem(tokenKeys.accessToken);
  const idToken = sessionStorage.getItem(tokenKeys.idToken);
  const refreshToken = sessionStorage.getItem(tokenKeys.refreshToken);
  if (!accessToken || !idToken || !refreshToken) return null;
  return { accessToken, idToken, refreshToken };
}

export function storeTokens(tokens: AuthTokens) {
  endPublicDemoSession();
  clearAuthenticatedResponseCache();
  sessionStorage.setItem(tokenKeys.accessToken, tokens.accessToken);
  sessionStorage.setItem(tokenKeys.idToken, tokens.idToken);
  sessionStorage.setItem(tokenKeys.refreshToken, tokens.refreshToken);
}

export function clearAuthSession() {
  sessionStorage.removeItem(tokenKeys.accessToken);
  sessionStorage.removeItem(tokenKeys.idToken);
  sessionStorage.removeItem(tokenKeys.refreshToken);
  sessionStorage.removeItem(tokenKeys.oauthState);
  sessionStorage.removeItem(tokenKeys.codeVerifier);
  sessionStorage.removeItem(tokenKeys.postLoginRedirect);
  profileRequest = null;
  clearAuthenticatedResponseCache();
}

export function isTokenValid(idToken: string | null, minimumSeconds = 0) {
  const user = decodeJWT(idToken);
  if (!user?.exp) return false;
  return user.exp - Math.floor(Date.now() / 1000) > minimumSeconds;
}

export function getCurrentUser() {
  return decodeJWT(sessionStorage.getItem(tokenKeys.idToken));
}

export async function startLogin(options: { redirectTo?: string; screenHint?: 'signup' } = {}) {
  assertAuthConfig();
  const state = Math.random().toString(36).slice(2, 15);
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const redirectTo = options.redirectTo || '/monitor/CURR/dashboard';

  sessionStorage.setItem(tokenKeys.oauthState, state);
  sessionStorage.setItem(tokenKeys.codeVerifier, codeVerifier);
  sessionStorage.setItem(tokenKeys.postLoginRedirect, redirectTo);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'openid email profile aws.cognito.signin.user.admin',
    redirect_uri: getRedirectUri(),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });

  if (options.screenHint) params.set('screen_hint', options.screenHint);

  window.location.href = `https://${cognitoDomain}/oauth2/authorize?${params.toString()}`;
}

export async function handleOAuthCallback() {
  assertAuthConfig();
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');
  const errorDescription = params.get('error_description');

  if (error) throw new Error(errorDescription || error);
  if (!code || !state) throw new Error('Missing OAuth callback parameters.');
  if (state !== sessionStorage.getItem(tokenKeys.oauthState)) {
    throw new Error('OAuth state mismatch.');
  }

  const codeVerifier = sessionStorage.getItem(tokenKeys.codeVerifier);
  if (!codeVerifier) throw new Error('Missing OAuth code verifier.');

  const response = await fetch(`https://${cognitoDomain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: getRedirectUri(),
      code_verifier: codeVerifier,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Token exchange failed.');
  }

  storeTokens({
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
  });

  sessionStorage.removeItem(tokenKeys.oauthState);
  sessionStorage.removeItem(tokenKeys.codeVerifier);

  let redirectTo = sessionStorage.getItem(tokenKeys.postLoginRedirect) || '/monitor/CURR/dashboard';
  sessionStorage.removeItem(tokenKeys.postLoginRedirect);
  try {
    const { authorizedMonitorRedirect } = await import('@/lib/ticker-access');
    const profile = await getAuthenticatedProfile(true);
    redirectTo = authorizedMonitorRedirect(redirectTo, profile);
  } catch {
    // Preserve the requested route if profile access is temporarily unavailable.
  }
  return redirectTo;
}

export async function refreshTokens(refreshToken = sessionStorage.getItem(tokenKeys.refreshToken)) {
  assertAuthConfig();
  if (!refreshToken) throw new Error('Missing refresh token.');

  const response = await fetch(`https://${cognitoDomain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Token refresh failed.');
  }

  const tokens = {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token || refreshToken,
  };
  storeTokens(tokens);
  return tokens;
}

export function signOut() {
  assertAuthConfig();
  clearAuthSession();
  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: getLogoutUri(),
  });
  window.location.href = `https://${cognitoDomain}/logout?${params.toString()}`;
}

export async function authenticatedFetch(path: string, options: RequestInit = {}) {
  const tokens = getStoredTokens();
  if (!tokens?.idToken) throw new Error('Not authenticated');
  const isMultipart = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const method = String(options.method ?? 'GET').toUpperCase();
  const isMutation = !['GET', 'HEAD'].includes(method);
  const useSameOriginProxy = typeof window !== 'undefined'
    && (isMutation || ['localhost', '127.0.0.1'].includes(window.location.hostname));
  const requestUrl = useSameOriginProxy
    ? `/api/dev-api${path}`
    : `${apiGatewayUrl}${path}`;

  const doFetch = async (idToken: string) => {
    try {
      return await fetch(requestUrl, {
        ...options,
        headers: {
          Authorization: idToken,
          ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
          ...(options.headers ?? {}),
        },
      });
    } catch (error) {
      const reason = error instanceof Error && error.message && error.message !== 'Failed to fetch'
        ? ` Browser reason: ${error.message}`
        : '';
      throw new Error(`${method} ${path} could not reach the API. The request failed before the server returned a response.${reason}`);
    }
  };

  let response = await doFetch(tokens.idToken);
  if (response.status === 401) {
    try {
      const refreshed = await refreshTokens(tokens.refreshToken);
      response = await doFetch(refreshed.idToken);
    } catch {
      clearAuthSession();
      if (typeof window !== 'undefined') {
        const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
        window.location.assign(`/login?next=${next}`);
      }
      throw new Error('Your session has expired. Please sign in again.');
    }
  }

  if (response.status === 401) {
    clearAuthSession();
    if (typeof window !== 'undefined') {
      const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
      window.location.assign(`/login?next=${next}`);
    }
    throw new Error('Your session is no longer authorized. Please sign in again.');
  }

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    let errorPayload: unknown = responseText;
    try {
      errorPayload = responseText ? JSON.parse(responseText) : null;
    } catch {
      // Preserve a non-JSON backend response as plain text.
    }
    const errorRecord = errorPayload && typeof errorPayload === 'object' && !Array.isArray(errorPayload)
      ? errorPayload as Record<string, unknown>
      : null;
    const validation = errorRecord?.validationErrors ?? errorRecord?.errors ?? errorRecord?.details;
    const validationText = validation == null
      ? ''
      : typeof validation === 'string'
        ? validation
        : JSON.stringify(validation);
    const reasons = [
      errorRecord?.message,
      errorRecord?.error,
      errorRecord?.reason,
      errorRecord?.detail,
      validationText,
      typeof errorPayload === 'string' ? errorPayload : '',
    ].map(value => {
      if (value == null) return '';
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      }
      return String(value).trim();
    }).filter(Boolean);
    const reason = [...new Set(reasons)].join(' — ') || 'The API did not provide an error reason.';
    const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
    throw new Error(`${method} ${path} failed (${status}): ${reason}`);
  }

  const payload = await response.json();
  if (method !== 'GET' && method !== 'HEAD') clearAuthenticatedResponseCache();
  return payload;
}

export async function cachedAuthenticatedFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  ttlMs = authenticatedGetCacheTtlMs,
): Promise<T> {
  const method = String(options.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    return authenticatedFetch(path, options) as Promise<T>;
  }

  const key = authenticatedCacheKey(path);
  const cached = authenticatedResponseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value as T;

  const pending = authenticatedRequestsInFlight.get(key);
  if (pending) return pending as Promise<T>;

  const request = authenticatedFetch(path, { ...options, cache: 'no-store' })
    .then(value => {
      authenticatedResponseCache.set(key, { expiresAt: Date.now() + ttlMs, value });
      return value;
    })
    .finally(() => authenticatedRequestsInFlight.delete(key));
  authenticatedRequestsInFlight.set(key, request);
  return request as Promise<T>;
}

export function setCachedAuthenticatedProfile(profile: AuthenticatedProfile) {
  profileRequest = Promise.resolve(profile);
}

export function getAuthenticatedProfile(force = false) {
  if (typeof window !== 'undefined' && isPublicDemoSession()) return Promise.resolve(publicDemoProfile);
  if (force || !profileRequest) {
    profileRequest = authenticatedFetch('/profile') as Promise<AuthenticatedProfile>;
    profileRequest.catch(() => {
      profileRequest = null;
    });
  }
  return profileRequest;
}
