'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { authenticatedFetch, getAuthenticatedProfile } from '@/lib/auth-client';
import { companyAccessFromProfile } from '@/lib/ticker-access';

type TickerStatus = {
  ticker: string;
  status: string;
  effectiveDate: string | null;
};

export default function CompaniesPage() {
  const params = useParams<{ ticker: string }>();
  const ticker = (params?.ticker ?? 'CURR').toUpperCase();
  const [access, setAccess] = useState<Array<{ ticker: string; role: string; name: string }>>([]);
  const [tickerStatuses, setTickerStatuses] = useState<Record<string, TickerStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthenticatedProfile()
      .then(async profile => {
        const nextAccess = companyAccessFromProfile(profile);
        setAccess(nextAccess);
        const statuses = await Promise.all(nextAccess.map(async entry => {
          try {
            return await authenticatedFetch(`/tickers/${encodeURIComponent(entry.ticker)}`) as TickerStatus;
          } catch {
            return { ticker: entry.ticker, status: 'UNKNOWN', effectiveDate: null };
          }
        }));
        setTickerStatuses(Object.fromEntries(statuses.map(status => [status.ticker.toUpperCase(), status])));
      })
      .catch(() => setAccess([{ ticker, role: 'Viewer', name: '' }]))
      .finally(() => setLoading(false));
  }, [ticker]);

  const accountCompanies = useMemo(() => access.map(entry => {
    return {
      ticker: entry.ticker,
      name: entry.name || entry.ticker,
      exchange: '',
      role: entry.role,
      status: tickerStatuses[entry.ticker]?.status ?? 'UNKNOWN',
      effectiveDate: tickerStatuses[entry.ticker]?.effectiveDate ?? null,
    };
  }), [access, tickerStatuses]);

  function formatEffectiveDate(value: string | null) {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="page company-management-page">
      <section className="terminal-section company-management-section">
        <div className="terminal-section__head">
          <div>
            <span>Workspace Portfolio</span>
            <h2>Covered Companies</h2>
            <p className="section-subtitle">Open the issuer workspaces assigned to your account.</p>
          </div>
          <span className="company-count-badge">{accountCompanies.length} {accountCompanies.length === 1 ? 'company' : 'companies'}</span>
        </div>

        <div className="company-access-list">
          {loading && (
            <div className="company-access-loading" role="status">
              <span />
              <div><b /><i /></div>
            </div>
          )}
          {accountCompanies.map(company => (
            <article className="company-access-card" key={company.ticker}>
              <span className="company-access-ticker">{company.ticker}</span>
              <div className="company-access-identity">
                <strong>{company.name}</strong>
                <small>{company.exchange}</small>
              </div>
              <div className="company-access-detail">
                <span>Role</span>
                <strong>{company.role}</strong>
              </div>
              <div className="company-access-detail company-access-date">
                <span>Access since</span>
                <strong>{formatEffectiveDate(company.effectiveDate)}</strong>
              </div>
              <span className={`status-pill ${company.status === 'ACTIVE' ? 'success' : 'muted'}`}>{company.status}</span>
              <Link className="company-access-open" href={`/monitor/${company.ticker}/dashboard`} aria-label={`Open ${company.name}`}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
            </article>
          ))}
          {!loading && !accountCompanies.length && (
            <div className="company-access-empty">No company access is assigned to this profile.</div>
          )}
        </div>
      </section>

    </div>
  );
}
