import type { AuthenticatedProfile } from './auth-client';

const publicDemoSessionKey = 'currenc-public-demo-session';
const publicDemoWelcomeKey = 'currenc-public-demo-welcome';

export const publicDemoTicker = 'CURR';

export const publicDemoProfile: AuthenticatedProfile = {
  role: 'DEMO',
  ticker: publicDemoTicker,
  tickers: [publicDemoTicker],
  defaultTicker: publicDemoTicker,
  email: 'demo@currencintelligence.com',
  name: 'Demo Viewer',
  companyAccess: [{
    ticker: publicDemoTicker,
    role: 'Demo Viewer',
  }],
};

export function isPublicDemoSession() {
  return typeof window !== 'undefined' && window.sessionStorage.getItem(publicDemoSessionKey) === 'active';
}

export function startPublicDemoSession() {
  window.sessionStorage.setItem(publicDemoSessionKey, 'active');
  window.sessionStorage.setItem(publicDemoWelcomeKey, 'pending');
}

export function endPublicDemoSession() {
  window.sessionStorage.removeItem(publicDemoSessionKey);
  window.sessionStorage.removeItem(publicDemoWelcomeKey);
}

export function shouldShowPublicDemoWelcome() {
  return isPublicDemoSession() && window.sessionStorage.getItem(publicDemoWelcomeKey) === 'pending';
}

export function dismissPublicDemoWelcome() {
  window.sessionStorage.removeItem(publicDemoWelcomeKey);
}
