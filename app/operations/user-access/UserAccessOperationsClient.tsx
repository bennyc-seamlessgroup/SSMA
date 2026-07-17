'use client';

import { useEffect, useMemo, useState } from 'react';
import { authenticatedFetch, getAuthenticatedProfile } from '@/lib/auth-client';
import { OperationsDevelopmentData } from '@/components/OperationsDevelopmentData';

type RegisteredUser = {
  sub?: string;
  email?: string;
  role?: string;
  status?: string;
  created_at?: string;
  ticker?: string;
  tickers?: string[];
};

type Invitation = {
  email: string;
  ticker: string;
  created_at: string;
  registered: boolean;
  registered_user: RegisteredUser | null;
};

type RegistrationFilter = 'all' | 'registered' | 'pending';
type SortDirection = 'newest' | 'oldest';

const pageSize = 15;

function normalizeInvitations(payload: unknown): Invitation[] {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { invitations?: unknown[] } | null)?.invitations)
      ? (payload as { invitations: unknown[] }).invitations
      : Array.isArray((payload as { data?: unknown[] } | null)?.data)
        ? (payload as { data: unknown[] }).data
        : [];

  return rows.map(row => {
    const item = row as Partial<Invitation>;
    return {
      email: String(item.email ?? ''),
      ticker: String(item.ticker ?? '').toUpperCase(),
      created_at: String(item.created_at ?? ''),
      registered: Boolean(item.registered),
      registered_user: item.registered_user && typeof item.registered_user === 'object'
        ? item.registered_user
        : null,
    };
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'Not available';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function invitationStatus(invitation: Invitation) {
  if (!invitation.registered) return { label: 'Pending registration', tone: 'pending' };
  const status = String(invitation.registered_user?.status ?? '').toUpperCase();
  if (status === 'CONFIRMED') return { label: 'Active', tone: 'active' };
  return { label: 'Awaiting confirmation', tone: 'waiting' };
}

export function UserAccessOperationsClient() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [rawPayload, setRawPayload] = useState<unknown>();
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'error' | 'forbidden'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [ticker, setTicker] = useState('CURR');
  const [search, setSearch] = useState('');
  const [registrationFilter, setRegistrationFilter] = useState<RegistrationFilter>('all');
  const [tickerFilter, setTickerFilter] = useState('all');
  const [sortDirection, setSortDirection] = useState<SortDirection>('newest');
  const [page, setPage] = useState(1);

  async function loadInvitations() {
    setStatus('loading');
    setMessage('');
    try {
      const profile = await getAuthenticatedProfile();
      if (String(profile.role ?? '').trim().toUpperCase() !== 'OPERATOR') {
        setStatus('forbidden');
        setMessage('User Access is available only to operations users.');
        return;
      }
      const payload = await authenticatedFetch('/tickers/invite', { cache: 'no-store' });
      setRawPayload(payload);
      setInvitations(normalizeInvitations(payload));
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to load user invitations.');
    }
  }

  useEffect(() => {
    loadInvitations();
    // Initial operator workspace load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tickerOptions = useMemo(
    () => Array.from(new Set(invitations.map(invitation => invitation.ticker).filter(Boolean))).sort(),
    [invitations],
  );

  const filteredInvitations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return invitations
      .filter(invitation => {
        if (registrationFilter === 'registered' && !invitation.registered) return false;
        if (registrationFilter === 'pending' && invitation.registered) return false;
        if (tickerFilter !== 'all' && invitation.ticker !== tickerFilter) return false;
        if (!query) return true;
        const user = invitation.registered_user;
        return [
          invitation.email,
          invitation.ticker,
          user?.email,
          user?.role,
          user?.status,
          ...(user?.tickers ?? []),
        ].some(value => String(value ?? '').toLowerCase().includes(query));
      })
      .sort((left, right) => {
        const comparison = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
        return sortDirection === 'newest' ? -comparison : comparison;
      });
  }, [invitations, registrationFilter, search, sortDirection, tickerFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredInvitations.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleInvitations = filteredInvitations.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [registrationFilter, search, sortDirection, tickerFilter]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  async function createInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedTicker = ticker.trim().toUpperCase();
    if (!normalizedEmail || !normalizedTicker) return;

    setStatus('saving');
    setMessage('');
    try {
      await authenticatedFetch('/tickers/invite', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, ticker: normalizedTicker }),
      });
      setEmail('');
      setTicker(normalizedTicker);
      await loadInvitations();
      setMessage(`Invitation created for ${normalizedEmail} with access to ${normalizedTicker}.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to create invitation.');
    }
  }

  if (status === 'forbidden') {
    return (
      <section className="ops-panel ops-access-restricted">
        <span className="ops-eyebrow">Restricted</span>
        <h2>Operator access required</h2>
        <p>{message}</p>
      </section>
    );
  }

  return (
    <>
      <section className="ops-panel ops-access-invite-panel">
        <div className="ops-panel-head">
          <div>
            <span className="ops-eyebrow">New Access</span>
            <h2>Invite User</h2>
          </div>
          <span className={`ops-status ${status === 'error' ? 'bad' : ''}`}>
            {status === 'loading' ? 'loading' : status === 'saving' ? 'sending' : 'operator'}
          </span>
        </div>
        <form className="ops-access-invite-form" onSubmit={createInvitation}>
          <label>
            <span>Email address</span>
            <input
              suppressHydrationWarning
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="user@example.com"
            />
          </label>
          <label>
            <span>Company ticker</span>
            <input
              suppressHydrationWarning
              required
              maxLength={10}
              value={ticker}
              onChange={event => setTicker(event.target.value.toUpperCase())}
              placeholder="CURR"
            />
          </label>
          <button className="ops-primary-button" type="submit" disabled={status === 'saving' || status === 'loading'}>
            {status === 'saving' ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>
        {message && (
          <p className={`ops-form-message ${status === 'error' ? 'bad' : 'good'}`}>{message}</p>
        )}
      </section>

      <section className="ops-panel ops-access-history-panel">
        <div className="ops-panel-head">
          <div>
            <span className="ops-eyebrow">Access History</span>
            <h2>Invitations</h2>
          </div>
          <span className="company-count-badge">{filteredInvitations.length} records</span>
        </div>

        <div className="ops-access-toolbar">
          <input
            suppressHydrationWarning
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search email or ticker..."
            aria-label="Search invitations"
          />
          <select value={registrationFilter} onChange={event => setRegistrationFilter(event.target.value as RegistrationFilter)}>
            <option value="all">All statuses</option>
            <option value="registered">Registered</option>
            <option value="pending">Pending</option>
          </select>
          <select value={tickerFilter} onChange={event => setTickerFilter(event.target.value)}>
            <option value="all">All tickers</option>
            {tickerOptions.map(option => <option value={option} key={option}>{option}</option>)}
          </select>
          <select value={sortDirection} onChange={event => setSortDirection(event.target.value as SortDirection)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <button type="button" className="ops-secondary-button" onClick={loadInvitations} disabled={status === 'loading'}>
            Refresh
          </button>
        </div>

        <div className="ops-table-wrap">
          <table className="ops-table ops-access-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Ticker</th>
                <th>Invited</th>
                <th>Registration</th>
                <th>Account Status</th>
                <th>Role</th>
                <th>Assigned Tickers</th>
              </tr>
            </thead>
            <tbody>
              {visibleInvitations.map((invitation, index) => {
                const invitationState = invitationStatus(invitation);
                const user = invitation.registered_user;
                return (
                  <tr key={`${invitation.email}:${invitation.ticker}:${invitation.created_at}:${index}`}>
                    <td><strong>{invitation.email || 'Not available'}</strong></td>
                    <td><span className="ops-access-ticker">{invitation.ticker || 'N/A'}</span></td>
                    <td>{formatDateTime(invitation.created_at)}</td>
                    <td><span className={`ops-access-status ${invitationState.tone}`}>{invitationState.label}</span></td>
                    <td>{user?.status || (invitation.registered ? 'Unknown' : 'Not registered')}</td>
                    <td>{user?.role || '—'}</td>
                    <td>{user?.tickers?.length ? user.tickers.join(', ') : user?.ticker || '—'}</td>
                  </tr>
                );
              })}
              {status !== 'loading' && !visibleInvitations.length && (
                <tr><td colSpan={7} className="ops-table-empty">No invitations match the selected filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="ops-pagination" aria-label="Invitation history pagination">
          <button type="button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={safePage === 1}>Previous</button>
          <span>Page {safePage} of {pageCount}</span>
          <button type="button" onClick={() => setPage(current => Math.min(pageCount, current + 1))} disabled={safePage === pageCount}>Next</button>
        </div>
      </section>

      <OperationsDevelopmentData
        title="Ticker Invitation API Response"
        description="Operator-only invitation records returned by the access API."
        rows={[{
          endpoint: 'GET /tickers/invite',
          source: 'Backend API',
          state: status,
          recordCount: invitations.length,
          payload: rawPayload ?? { status, message },
        }]}
      />
    </>
  );
}
