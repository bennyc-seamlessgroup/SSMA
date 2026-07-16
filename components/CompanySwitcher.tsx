'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getAuthenticatedProfile } from '@/lib/auth-client';
import { companyAccessFromProfile } from '@/lib/ticker-access';

type CompanyOption = {
  ticker: string;
  name: string;
  role: string;
};

export function CompanySwitcher({ ticker, companyName }: { ticker: string; companyName: string }) {
  const pathname = usePathname();
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
      .then(profile => {
        if (cancelled) return;
        setCompanies(companyAccessFromProfile(profile).map(entry => ({
          ticker: entry.ticker,
          role: entry.role,
          name: entry.name,
        })));
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
  const currentDisplayName = current.name.trim() || 'Company name unavailable';
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
            <span>Company access</span>
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
                <strong>{company.name.trim() || 'Company name unavailable'}</strong>
                <small>{company.role}</small>
              </span>
              {company.ticker === ticker && (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
              )}
            </Link>
          ))}
          <Link className="company-switcher__manage" href={`/monitor/${ticker}/companies`} onClick={() => setIsOpen(false)}>
            Manage company access
          </Link>
        </div>
      )}
    </div>
  );
}
