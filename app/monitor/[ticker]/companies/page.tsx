'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { SettingsBackLink } from '@/components/SettingsBackLink';
import { authenticatedFetch, getAuthenticatedProfile } from '@/lib/auth-client';
import { companyAccessFromProfile } from '@/lib/ticker-access';
import { buildDashboard } from '@/lib/mock-data';

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
  const [invite, setInvite] = useState({ email: '', ticker });
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [inviteMessage, setInviteMessage] = useState('');

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
    const company = buildDashboard(entry.ticker).company;
    return {
      ticker: company.ticker,
      name: entry.name || company.company_name,
      exchange: company.exchange,
      role: entry.role,
      status: tickerStatuses[entry.ticker]?.status ?? 'UNKNOWN',
      effectiveDate: tickerStatuses[entry.ticker]?.effectiveDate ?? null,
    };
  }), [access, tickerStatuses]);

  async function inviteUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTicker = invite.ticker.trim().toUpperCase();
    setInviteStatus('sending');
    setInviteMessage('');
    try {
      const result = await authenticatedFetch('/tickers/invite', {
        method: 'POST',
        body: JSON.stringify({
          email: invite.email.trim(),
          ticker: normalizedTicker,
        }),
      }) as { email?: string; ticker?: string };
      const invitedTicker = String(result.ticker ?? normalizedTicker).toUpperCase();
      const status = await authenticatedFetch(`/tickers/${encodeURIComponent(invitedTicker)}`) as TickerStatus;
      setTickerStatuses(current => ({ ...current, [invitedTicker]: status }));
      setInviteStatus('success');
      setInviteMessage(`Invitation created for ${result.email ?? invite.email.trim()} with access to ${invitedTicker}.`);
      setInvite(current => ({ ...current, email: '' }));
    } catch (error) {
      setInviteStatus('error');
      setInviteMessage(error instanceof Error ? error.message : 'Unable to create ticker invitation.');
    }
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Company Management</h1>
          <p className="page__desc">Switch between issuer workspaces granted by your user profile.</p>
        </div>
        <div className="page-header-actions">
          <SettingsBackLink ticker={ticker} />
        </div>
      </div>

      <section className="panel">
        <div className="portal-panel__head">
          <div>
            <h2>Covered companies</h2>
            <p>Company access is managed by the authenticated profile.</p>
          </div>
          <span className="status-pill muted">{accountCompanies.length} companies</span>
        </div>

        <div className="workspace-table company-workspace-table">
          <div className="workspace-table__head"><span>Company</span><span>Role</span><span>Status</span><span>Effective Date</span><span>Action</span></div>
          {loading && <div className="workspace-row company-workspace-loading"><span>Loading profile access...</span></div>}
          {accountCompanies.map(company => (
            <div className="workspace-row" key={company.ticker}>
              <div><strong>{company.name}</strong><small>{company.ticker} · {company.exchange}</small></div>
              <span>{company.role}</span>
              <span className={`status-pill ${company.status === 'ACTIVE' ? 'success' : 'muted'}`}>{company.status}</span>
              <span>{company.effectiveDate ?? 'Not available'}</span>
              <Link className="text-link" href={`/monitor/${company.ticker}/dashboard-v2`}>Open</Link>
            </div>
          ))}
          {!loading && !accountCompanies.length && (
            <div className="workspace-row company-workspace-loading"><span>No company access is assigned to this profile.</span></div>
          )}
        </div>
      </section>

      <section className="panel company-invite-panel">
        <div className="portal-panel__head">
          <div>
            <h2>Invite User to Ticker</h2>
            <p>Create a pending invitation for a new user and register the ticker when needed.</p>
          </div>
        </div>
        <form className="company-invite-form" onSubmit={inviteUser}>
          <label>
            <span>Email address</span>
            <input
              className="input"
              type="email"
              required
              value={invite.email}
              onChange={event => setInvite(current => ({ ...current, email: event.target.value }))}
              placeholder="newuser@example.com"
            />
          </label>
          <label>
            <span>Ticker</span>
            <input
              className="input"
              required
              maxLength={10}
              value={invite.ticker}
              onChange={event => setInvite(current => ({ ...current, ticker: event.target.value.toUpperCase() }))}
              placeholder="AAPL"
            />
          </label>
          <button className="button" type="submit" disabled={inviteStatus === 'sending'}>
            {inviteStatus === 'sending' ? 'Sending...' : 'Create Invitation'}
          </button>
        </form>
        {inviteMessage && <p className={`company-invite-message ${inviteStatus}`}>{inviteMessage}</p>}
      </section>

      <section className="grid cols-2">
        <div className="panel">
          <h2 className="panel__title">Workspace Access</h2>
          <p className="page__desc" style={{ margin: 0 }}>The profile API determines which ticker workspaces this account can open.</p>
        </div>
        <div className="panel">
          <h2 className="panel__title">Data Resolution</h2>
          <p className="page__desc" style={{ margin: 0 }}>Each workspace resolves its JSON files using the selected ticker in the existing filename convention.</p>
        </div>
      </section>
    </div>
  );
}
