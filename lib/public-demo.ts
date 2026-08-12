import type { AuthenticatedProfile } from './auth-client';

const publicDemoSessionKey = 'currenc-public-demo-session';
const publicDemoWelcomeKey = 'currenc-public-demo-welcome';

export const publicDemoTicker = 'CURR';
export const publicDemoEmail = 'demo.curr@gmail.com';

export const publicDemoProfile: AuthenticatedProfile = {
  role: 'DEMO',
  ticker: publicDemoTicker,
  tickers: [publicDemoTicker],
  defaultTicker: publicDemoTicker,
  email: publicDemoEmail,
  name: 'Demo Viewer',
  companyAccess: [{
    ticker: publicDemoTicker,
    role: 'Demo Viewer',
  }],
};

export function isPublicDemoSession() {
  return typeof window !== 'undefined' && window.sessionStorage.getItem(publicDemoSessionKey) === 'active';
}

export function isPublicDemoEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase() === publicDemoEmail;
}

export function isPublicDemoProfile(profile: unknown) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return false;
  return isPublicDemoEmail((profile as Record<string, unknown>).email);
}

export function startPublicDemoSession() {
  window.sessionStorage.setItem(publicDemoSessionKey, 'active');
  window.sessionStorage.setItem(publicDemoWelcomeKey, 'pending');
}

export function endPublicDemoSession() {
  window.sessionStorage.removeItem(publicDemoSessionKey);
  window.sessionStorage.removeItem(publicDemoWelcomeKey);
}

export function clearPublicDemoAdapterSession() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(publicDemoSessionKey);
}

export function requestPublicDemoWelcome() {
  window.sessionStorage.setItem(publicDemoWelcomeKey, 'pending');
}

export function shouldShowPublicDemoWelcome() {
  return typeof window !== 'undefined' && window.sessionStorage.getItem(publicDemoWelcomeKey) === 'pending';
}

export function dismissPublicDemoWelcome() {
  window.sessionStorage.removeItem(publicDemoWelcomeKey);
}
