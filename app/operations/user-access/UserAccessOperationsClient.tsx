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
type AccessMode = 'invite' | 'assign';
type InviteAttempt = {
  state: 'requesting' | 'success' | 'error';
  request: { email: string; ticker: string };
  response?: unknown;
  error?: string;
};
type AssignAttempt = {
  state: 'requesting' | 'success' | 'error';
  request: { email: string; ticker: string; action: 'add' | 'remove' };
  response?: unknown;
  error?: string;
};
type RegisteredAccessUser = {
  email: string;
  sub: string;
  primaryTicker: string;
  tickers: string[];
};
type ManagedTicker = {
  ticker: string;
  companyName: string;
};

const pageSize = 15;
const tickerPattern = /^[A-Z0-9.-]+$/;

function normalizeTicker(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function normalizeManagedTickers(payload: unknown): ManagedTicker[] {
  const envelope = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const nestedData = envelope.data && typeof envelope.data === 'object' && !Array.isArray(envelope.data)
    ? envelope.data as Record<string, unknown>
    : null;
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(envelope.tickers)
      ? envelope.tickers
      : Array.isArray(envelope.data)
        ? envelope.data
        : Array.isArray(nestedData?.tickers)
          ? nestedData.tickers
          : [];
  return rows.flatMap(value => {
    const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const ticker = normalizeTicker(record.ticker);
    if (!ticker) return [];
    return [{ ticker, companyName: String(record.companyName ?? '').trim() }];
  });
}

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
  const [rawTickerPayload, setRawTickerPayload] = useState<unknown>();
  const [tickerLoadError, setTickerLoadError] = useState('');
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'error' | 'forbidden'>('loading');
  const [message, setMessage] = useState('');
  const [accessMode, setAccessMode] = useState<AccessMode>('invite');
  const [email, setEmail] = useState('');
  const [ticker, setTicker] = useState('CURR');
  const [inviteAttempt, setInviteAttempt] = useState<InviteAttempt | null>(null);
  const [managedTickers, setManagedTickers] = useState<ManagedTicker[]>([]);
  const [operatorEmail, setOperatorEmail] = useState('');
  const [assignEmail, setAssignEmail] = useState('');
  const [assignTicker, setAssignTicker] = useState('');
  const [assignAttempt, setAssignAttempt] = useState<AssignAttempt | null>(null);
  const [assignmentStatus, setAssignmentStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [pendingRemovalTicker, setPendingRemovalTicker] = useState('');
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
      setOperatorEmail(String(profile.email ?? '').trim().toLowerCase());
      const [payload, tickerResult] = await Promise.all([
        authenticatedFetch('/tickers/invite', { cache: 'no-store' }),
        authenticatedFetch('/tickers?status=ACTIVE&includeDeleted=false&limit=100', { cache: 'no-store' })
          .then(value => ({ payload: value, error: '' }))
          .catch(error => ({
            payload: null,
            error: error instanceof Error ? error.message : 'Unable to load managed tickers.',
          })),
      ]);
      setRawPayload(payload);
      setInvitations(normalizeInvitations(payload));
      setRawTickerPayload(tickerResult.payload);
      setManagedTickers(normalizeManagedTickers(tickerResult.payload));
      setTickerLoadError(tickerResult.error);
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

  const registeredUsers = useMemo(() => {
    const users = new Map<string, RegisteredAccessUser>();
    invitations.forEach(invitation => {
      const registered = invitation.registered_user;
      if (!invitation.registered || !registered) return;
      const registeredEmail = String(registered.email ?? invitation.email).trim().toLowerCase();
      if (!registeredEmail) return;
      const primaryTicker = normalizeTicker(registered.ticker);
      const assignedTickers = [
        primaryTicker,
        ...(Array.isArray(registered.tickers) ? registered.tickers.map(normalizeTicker) : []),
      ].filter(Boolean);
      const current = users.get(registeredEmail);
      users.set(registeredEmail, {
        email: registeredEmail,
        sub: String(registered.sub ?? current?.sub ?? ''),
        primaryTicker: primaryTicker || current?.primaryTicker || '',
        tickers: Array.from(new Set([...(current?.tickers ?? []), ...assignedTickers])).sort(),
      });
    });
    return Array.from(users.values()).sort((left, right) => left.email.localeCompare(right.email));
  }, [invitations]);

  const selectedAccessUser = useMemo(
    () => registeredUsers.find(user => user.email === assignEmail.trim().toLowerCase()) ?? null,
    [assignEmail, registeredUsers],
  );
  const extraTickers = selectedAccessUser
    ? selectedAccessUser.tickers.filter(value => value !== selectedAccessUser.primaryTicker)
    : [];
  const activeTickerOptions = managedTickers.length
    ? managedTickers
    : tickerOptions.map(value => ({ ticker: value, companyName: '' }));

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

  function clearFormFeedback() {
    if (status === 'error' || message) {
      setStatus('idle');
      setMessage('');
    }
  }

  async function createInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedTicker = ticker.trim().toUpperCase();
    if (!normalizedEmail || !normalizedTicker) return;

    setStatus('saving');
    setMessage('');
    const request = { email: normalizedEmail, ticker: normalizedTicker };
    setInviteAttempt({ state: 'requesting', request });
    try {
      const response = await authenticatedFetch('/tickers/invite', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      setInviteAttempt({ state: 'success', request, response });
      setEmail('');
      setTicker(normalizedTicker);
      await loadInvitations();
      setMessage(`Invitation created for ${normalizedEmail} with access to ${normalizedTicker}.`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unable to create invitation.';
      setInviteAttempt({ state: 'error', request, error: reason });
      setStatus('error');
      setMessage(`Invitation for ${normalizedEmail} failed. ${reason}`);
    }
  }

  function clearAssignmentFeedback() {
    if (assignmentStatus === 'error' || assignmentStatus === 'success' || assignmentMessage) {
      setAssignmentStatus('idle');
      setAssignmentMessage('');
    }
    setPendingRemovalTicker('');
  }

  function openAccessManager(invitation: Invitation) {
    const targetEmail = String(invitation.registered_user?.email ?? invitation.email).trim().toLowerCase();
    setAccessMode('assign');
    setAssignEmail(targetEmail);
    setAssignTicker('');
    clearAssignmentFeedback();
    window.requestAnimationFrame(() => {
      document.getElementById('existing-user-access')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function submitAssignment(action: 'add' | 'remove', requestedTicker: string) {
    const normalizedEmail = assignEmail.trim().toLowerCase();
    const normalizedTicker = normalizeTicker(requestedTicker);
    if (!normalizedEmail || !normalizedTicker) {
      setAssignmentStatus('error');
      setAssignmentMessage('Registered email and company ticker are required.');
      return;
    }
    if (!tickerPattern.test(normalizedTicker)) {
      setAssignmentStatus('error');
      setAssignmentMessage('Select a valid managed company ticker.');
      return;
    }
    if (managedTickers.length && !managedTickers.some(item => item.ticker === normalizedTicker)) {
      setAssignmentStatus('error');
      setAssignmentMessage(`${normalizedTicker} is not an active managed ticker.`);
      return;
    }

    if (action === 'remove') {
      if (!selectedAccessUser) {
        setAssignmentStatus('error');
        setAssignmentMessage('Select a registered user from Access History before removing access.');
        return;
      }
      if (normalizedTicker === selectedAccessUser.primaryTicker) {
        setAssignmentStatus('error');
        setAssignmentMessage(`${normalizedTicker} is this user's Primary ticker and cannot be removed.`);
        return;
      }
      if (!selectedAccessUser.tickers.includes(normalizedTicker)) {
        setAssignmentStatus('error');
        setAssignmentMessage(`${normalizedTicker} is not currently assigned to this user.`);
        return;
      }
    } else if (selectedAccessUser?.tickers.includes(normalizedTicker)) {
      setAssignmentStatus('error');
      setAssignmentMessage(`${normalizedTicker} is already assigned to this user.`);
      return;
    }

    const request = { email: normalizedEmail, ticker: normalizedTicker, action } as const;
    setAssignmentStatus('saving');
    setAssignmentMessage('');
    setAssignAttempt({ state: 'requesting', request });
    try {
      const response = await authenticatedFetch('/tickers/assign', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      setAssignAttempt({ state: 'success', request, response });
      setAssignmentStatus('success');
      setAssignmentMessage(action === 'add'
        ? `${normalizedTicker} access was added for ${normalizedEmail}.`
        : `${normalizedTicker} access was removed for ${normalizedEmail}.`);
      setAssignTicker('');
      setPendingRemovalTicker('');
      if (normalizedEmail === operatorEmail) {
        await getAuthenticatedProfile(true).catch(() => null);
      }
      await loadInvitations();
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unable to update ticker access.';
      setAssignAttempt({ state: 'error', request, error: reason });
      setAssignmentStatus('error');
      setAssignmentMessage(reason);
    }
  }

  async function addAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitAssignment('add', assignTicker);
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
            <span className="ops-eyebrow">Access Management</span>
            <h2>{accessMode === 'invite' ? 'Invite New User' : 'Manage Existing User'}</h2>
          </div>
          <span className={`ops-status ${(accessMode === 'invite' ? status === 'error' : assignmentStatus === 'error') ? 'bad' : ''}`}>
            {accessMode === 'invite'
              ? status === 'loading' ? 'loading' : status === 'saving' ? 'sending' : status === 'error' ? 'error' : 'operator'
              : assignmentStatus === 'saving' ? 'saving' : assignmentStatus === 'error' ? 'error' : assignmentStatus === 'success' ? 'saved' : 'operator'}
          </span>
        </div>
        <div className="ops-access-mode-tabs" role="tablist" aria-label="User access workflow">
          <button type="button" role="tab" aria-selected={accessMode === 'invite'} className={accessMode === 'invite' ? 'active' : ''} onClick={() => setAccessMode('invite')}>Invite New User</button>
          <button type="button" role="tab" aria-selected={accessMode === 'assign'} className={accessMode === 'assign' ? 'active' : ''} onClick={() => setAccessMode('assign')}>Manage Existing User</button>
        </div>

        {accessMode === 'invite' ? (
          <>
            <form className="ops-access-invite-form" onSubmit={createInvitation}>
              <label>
                <span>Email address</span>
                <input
                  suppressHydrationWarning
                  type="email"
                  required
                  value={email}
                  onChange={event => {
                    setEmail(event.target.value);
                    clearFormFeedback();
                  }}
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
                  onChange={event => {
                    setTicker(event.target.value.toUpperCase());
                    clearFormFeedback();
                  }}
                  placeholder="CURR"
                />
              </label>
              <label>
                <span>Account role</span>
                <select value="USER" disabled aria-label="Account role assigned by the invitation API">
                  <option value="USER">USER (API default)</option>
                </select>
              </label>
              <button className="ops-primary-button" type="submit" disabled={status === 'saving' || status === 'loading'}>
                {status === 'saving' ? 'Sending...' : 'Send Invitation'}
              </button>
            </form>
            {message && (
              <p className={`ops-form-message ${status === 'error' ? 'bad' : 'good'}`} role="status" aria-live="polite">{message}</p>
            )}
            <p className="ops-access-contract-note">
              <strong>Invitation API limits:</strong> Use this workflow only for a new account. Existing registered users must use Manage Existing User.
            </p>
          </>
        ) : (
          <div id="existing-user-access" className="ops-existing-access-manager" role="tabpanel">
            <form className="ops-access-assign-form" onSubmit={addAssignment}>
              <label>
                <span>Registered email</span>
                <input
                  suppressHydrationWarning
                  type="email"
                  list="registered-access-users"
                  required
                  value={assignEmail}
                  onChange={event => {
                    setAssignEmail(event.target.value.toLowerCase());
                    clearAssignmentFeedback();
                  }}
                  placeholder="registered@example.com"
                />
                <datalist id="registered-access-users">
                  {registeredUsers.map(user => <option value={user.email} key={user.email} />)}
                </datalist>
              </label>
              <label>
                <span>Add company ticker</span>
                <input
                  suppressHydrationWarning
                  list="managed-access-tickers"
                  required
                  maxLength={10}
                  value={assignTicker}
                  onChange={event => {
                    setAssignTicker(event.target.value.toUpperCase());
                    clearAssignmentFeedback();
                  }}
                  placeholder="NIVF"
                />
                <datalist id="managed-access-tickers">
                  {activeTickerOptions.map(option => (
                    <option value={option.ticker} key={option.ticker}>{option.companyName}</option>
                  ))}
                </datalist>
              </label>
              <button className="ops-primary-button" type="submit" disabled={assignmentStatus === 'saving' || status === 'loading'}>
                {assignmentStatus === 'saving' ? 'Adding...' : 'Add Access'}
              </button>
            </form>

            {tickerLoadError ? <p className="ops-access-inline-warning">Managed ticker suggestions are unavailable. Enter a valid ticker symbol manually.</p> : null}
            {assignmentMessage ? (
              <p className={`ops-form-message ${assignmentStatus === 'error' ? 'bad' : 'good'}`} role="status" aria-live="polite">{assignmentMessage}</p>
            ) : null}

            <div className="ops-current-access-card">
              <div className="ops-current-access-head">
                <div><span>Current access</span><strong>{selectedAccessUser?.email || 'Select a registered user'}</strong></div>
                {selectedAccessUser ? <small>{selectedAccessUser.tickers.length} tickers</small> : null}
              </div>
              {selectedAccessUser ? (
                <div className="ops-access-chip-list">
                  {selectedAccessUser.primaryTicker ? (
                    <span className="ops-access-primary-chip">
                      <b>{selectedAccessUser.primaryTicker}</b>
                      <small>Primary · Locked</small>
                    </span>
                  ) : null}
                  {extraTickers.map(value => (
                    <button
                      className="ops-access-extra-chip"
                      type="button"
                      key={value}
                      disabled={assignmentStatus === 'saving'}
                      onClick={() => {
                        setPendingRemovalTicker(value);
                        setAssignmentMessage('');
                        setAssignmentStatus('idle');
                      }}
                    >
                      <b>{value}</b><small>Remove</small>
                    </button>
                  ))}
                  {!extraTickers.length ? <span className="ops-access-no-extra">No additional ticker access.</span> : null}
                </div>
              ) : (
                <p>Choose a registered account from the suggestions or use Manage Access in the table below. Adding access also supports another registered email, but removal is available only when the current Primary ticker can be identified.</p>
              )}
            </div>

            {pendingRemovalTicker && selectedAccessUser ? (
              <div className="ops-access-remove-confirm" role="alert">
                <span>Remove <b>{pendingRemovalTicker}</b> access from <b>{selectedAccessUser.email}</b>?</span>
                <div>
                  <button className="ops-secondary-button" type="button" onClick={() => setPendingRemovalTicker('')}>Cancel</button>
                  <button className="ops-danger-button" type="button" disabled={assignmentStatus === 'saving'} onClick={() => void submitAssignment('remove', pendingRemovalTicker)}>Confirm Remove</button>
                </div>
              </div>
            ) : null}

            <p className="ops-access-contract-note">
              <strong>Primary ticker protection:</strong> The Primary ticker is permanently locked in this portal. Only additional tickers can be added or removed; Replace is not available.
            </p>
          </div>
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
                <th>Action</th>
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
                    <td>
                      {invitation.registered && user ? (
                        <button className="ops-secondary-button" type="button" onClick={() => openAccessManager(invitation)}>Manage Access</button>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
              {status !== 'loading' && !visibleInvitations.length && (
                <tr><td colSpan={8} className="ops-table-empty">No invitations match the selected filters.</td></tr>
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
        title="Team Access API Responses"
        description="Operator-only invitation, managed-ticker, and existing-user assignment responses used by this page."
        rows={[
          {
            endpoint: 'GET /tickers/invite',
            source: 'Backend API',
            state: status,
            recordCount: invitations.length,
            payload: rawPayload ?? { status, message },
          },
          {
            endpoint: 'GET /tickers?status=ACTIVE&includeDeleted=false&limit=100',
            source: 'Backend API',
            state: tickerLoadError ? `error: ${tickerLoadError}` : rawTickerPayload ? 'ok' : 'loading',
            recordCount: managedTickers.length,
            payload: rawTickerPayload ?? { error: tickerLoadError || undefined },
          },
          ...(inviteAttempt ? [{
            endpoint: 'POST /tickers/invite',
            source: 'Backend API',
            state: inviteAttempt.state,
            payload: {
              request: inviteAttempt.request,
              response: inviteAttempt.response,
              error: inviteAttempt.error,
              apiCapabilities: {
                roleSelection: false,
                invitationDeletion: false,
              },
            },
          }] : []),
          ...(assignAttempt ? [{
            endpoint: 'POST /tickers/assign',
            source: 'Backend API',
            state: assignAttempt.state,
            payload: {
              request: assignAttempt.request,
              response: assignAttempt.response,
              error: assignAttempt.error,
              frontendPolicy: {
                replaceExposed: false,
                primaryTickerRemovalAllowed: false,
              },
            },
          }] : []),
        ]}
      />
    </>
  );
}
