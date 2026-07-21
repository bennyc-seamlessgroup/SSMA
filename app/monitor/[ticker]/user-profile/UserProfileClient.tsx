'use client';

import { useEffect, useMemo, useState } from 'react';
import { authenticatedFetch, cachedAuthenticatedFetch, decodeJWT, getStoredTokens, setCachedAuthenticatedProfile } from '@/lib/auth-client';
import { PortalPageLoading } from '@/components/PortalPageLoading';

type Profile = {
  sub?: string;
  email?: string;
  status?: string;
  created_at?: string;
  name?: string;
  bio?: string;
  phone_number?: string;
  nickname?: string;
  ticker?: string;
  tickers?: string[];
  companyAccess?: Array<{ ticker?: string; role?: string }>;
};

function formatDateTime(value?: string) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function shortSub(value?: string) {
  if (!value) return 'N/A';
  if (value.length <= 30) return value;
  return `${value.slice(0, 18)}...${value.slice(-8)}`;
}

export function UserProfileClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({ name: '', nickname: '', phone_number: '', bio: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const tokenUser = useMemo(() => {
    const tokens = getStoredTokens();
    return decodeJWT(tokens?.idToken ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setIsLoading(true);
      setError('');
      try {
        const data = await cachedAuthenticatedFetch<Profile>('/profile');
        if (cancelled) return;
        setProfile(data);
        setForm({
          name: data.name ?? '',
          nickname: data.nickname ?? '',
          phone_number: data.phone_number ?? '',
          bio: data.bio ?? '',
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load profile.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setMessage('');
    try {
      const data = await authenticatedFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify(form),
      }) as Profile;
      setProfile(data);
      setCachedAuthenticatedProfile(data as Record<string, unknown>);
      setMessage('Profile saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <PortalPageLoading variant="profile" />;

  const metadata = {
    sub: profile?.sub ?? tokenUser?.sub,
    email: profile?.email ?? (typeof tokenUser?.email === 'string' ? tokenUser.email : undefined),
    status: profile?.status ?? 'N/A',
    createdAt: profile?.created_at,
    tickerAccess: profile?.tickers?.join(', ')
      || profile?.companyAccess?.map(entry => entry.ticker).filter(Boolean).join(', ')
      || profile?.ticker
      || 'N/A',
  };

  return (
    <div className="user-profile-grid">
      <section className="user-profile-card">
        <div className="user-profile-card__head">
          <h2>Edit Profile Settings</h2>
        </div>
        <form className="user-profile-form" onSubmit={saveProfile}>
          <label>
            <span>Full Name</span>
            <input className="input" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="e.g. Benny" />
          </label>
          <label>
            <span>Nickname</span>
            <input className="input" value={form.nickname} onChange={event => setForm(current => ({ ...current, nickname: event.target.value }))} placeholder="e.g. benny" />
          </label>
          <label>
            <span>Phone Number</span>
            <input className="input" value={form.phone_number} onChange={event => setForm(current => ({ ...current, phone_number: event.target.value }))} placeholder="e.g. +15550100" />
          </label>
          <label>
            <span>Biography</span>
            <textarea className="textarea" value={form.bio} onChange={event => setForm(current => ({ ...current, bio: event.target.value }))} placeholder="Write something about yourself..." rows={5} />
          </label>
          <button className="button" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
        </form>
        {message && <p className="user-profile-message success">{message}</p>}
        {error && <p className="user-profile-message error">{error}</p>}
      </section>

      <section className="user-profile-card">
        <div className="user-profile-card__head">
          <h2>Account Metadata</h2>
        </div>
        <div className="user-profile-metadata">
          <div>
            <span>User Unique ID (Sub)</span>
            <strong title={metadata.sub}>{shortSub(metadata.sub)}</strong>
          </div>
          <div>
            <span>Email Address</span>
            <strong>{metadata.email ?? 'N/A'}</strong>
          </div>
          <div>
            <span>Profile Sync Status</span>
            <strong className={`profile-status ${metadata.status === 'CONFIRMED' ? 'confirmed' : ''}`}>{metadata.status}</strong>
          </div>
          <div>
            <span>Profile Created At</span>
            <strong>{formatDateTime(metadata.createdAt)}</strong>
          </div>
          <div>
            <span>Company Access</span>
            <strong>{metadata.tickerAccess}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
