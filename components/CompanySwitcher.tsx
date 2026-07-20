'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { authenticatedFetch, getAuthenticatedProfile } from '@/lib/auth-client';
import { companyAccessFromProfile } from '@/lib/ticker-access';
import { useTickerDataStatus } from './TickerDataStatusProvider';
import { usePortalLanguage } from './usePortalLanguage';

type CompanyOption = {
  ticker: string;
  name: string;
  role: string;
};

const companyNameCache = new Map<string, string>();

function companyNameFromPayload(payload: unknown, requestedTicker: string) {
  const root = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null;
  const data = root?.data && typeof root.data === 'object' ? root.data as Record<string, unknown> : null;
  const candidates = [
    root,
    data,
    root?.['company-profile-current'],
    data?.['company-profile-current'],
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const record = candidate as Record<string, unknown>;
    const responseTicker = String(record.ticker ?? record.stockCode ?? '').trim().toUpperCase();
    if (responseTicker !== requestedTicker.trim().toUpperCase()) continue;
    const name = String(record.companyName ?? '').trim();
    if (name) return name;
  }
  return '';
}

async function resolveCompanyName(ticker: string) {
  const cached = companyNameCache.get(ticker);
  if (cached) return cached;
  try {
    const payload = await authenticatedFetch(
      `/market-data/current?ticker=${encodeURIComponent(ticker)}&category=company-profile-current`,
    );
    const name = companyNameFromPayload(payload, ticker);
    if (name) companyNameCache.set(ticker, name);
    return name;
  } catch {
    return '';
  }
}

export function CompanySwitcher({ ticker, companyName }: { ticker: string; companyName: string }) {
  const pathname = usePathname();
  const { t } = usePortalLanguage();
  const tickerStatus = useTickerDataStatus();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([{
    ticker,
    name: companyName,
    role: 'Viewer',
  }]);

  useEffect(() => {
    let cancelled = false;
    getAuthenticatedProfile()
      .then(async profile => {
        if (cancelled) return;
        const access = companyAccessFromProfile(profile);
        const resolved = await Promise.all(access.map(async entry => ({
          ticker: entry.ticker,
          role: entry.role,
          name: await resolveCompanyName(entry.ticker),
        })));
        if (!cancelled) setCompanies(resolved);
      })
      .catch(() => {
        if (!cancelled) setCompanies([{ ticker, name: companyName, role: 'Viewer' }]);
      });
    return () => {
      cancelled = true;
    };
  }, [companyName, ticker]);

  useEffect(() => {
    if (!isOpen) return;
    const close = (event: MouseEvent | TouchEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', escape);
    };
  }, [isOpen]);

  const current = companies.find(company => company.ticker === ticker) ?? {
    ticker,
    name: companyName,
    role: 'Viewer',
  };
  const currentDisplayName = tickerStatus?.companyName?.trim()
    || t('companyNameUnavailable');
  const roleLabel = (role: string) => role.trim().toLowerCase() === 'viewer' ? t('viewer') : role;
  const routeSuffix = useMemo(() => {
    const match = pathname.match(/^\/monitor\/[^/]+(\/.*)?$/i);
    return match?.[1] || '/dashboard';
  }, [pathname]);

  return (
    <div className="company-switcher" ref={menuRef}>
      <button
        className="portal-design-b-company portal-design-b-company-main company-switcher__button"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen(open => !open)}
      >
        <strong>{current.ticker}</strong>
        <span>{currentDisplayName}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
      </button>

      {isOpen && (
        <div className="company-switcher__menu" role="menu">
          <div className="company-switcher__head">
            <span>{t('companyAccess')}</span>
            <strong>{companies.length}</strong>
          </div>
          {companies.map(company => (
            <Link
              key={company.ticker}
              href={`/monitor/${company.ticker}${routeSuffix}`}
              role="menuitem"
              className={company.ticker === ticker ? 'active' : ''}
              onClick={() => setIsOpen(false)}
            >
              <span className="company-switcher__ticker">{company.ticker}</span>
              <span>
                <strong>
                  {company.ticker === ticker
                    ? currentDisplayName
                    : company.name.trim() || t('companyNameUnavailable')}
                </strong>
                <small>{roleLabel(company.role)}</small>
              </span>
              {company.ticker === ticker && (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
              )}
            </Link>
          ))}
          <Link className="company-switcher__manage" href={`/monitor/${ticker}/companies`} onClick={() => setIsOpen(false)}>
            {t('manageCompanyAccess')}
          </Link>
        </div>
      )}
    </div>
  );
}
