'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { SettingsBackLink } from '@/components/SettingsBackLink';
import { getAuthenticatedProfile } from '@/lib/auth-client';
import { companyAccessFromProfile } from '@/lib/ticker-access';
import { buildDashboard } from '@/lib/mock-data';

export default function CompaniesPage() {
  const params = useParams<{ ticker: string }>();
  const ticker = (params?.ticker ?? 'CURR').toUpperCase();
  const [access, setAccess] = useState<Array<{ ticker: string; role: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthenticatedProfile()
      .then(profile => setAccess(companyAccessFromProfile(profile)))
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
      status: 'Active',
    };
  }), [access]);

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
          <div className="workspace-table__head"><span>Company</span><span>Role</span><span>Status</span><span>Workspace</span><span>Action</span></div>
          {loading && <div className="workspace-row company-workspace-loading"><span>Loading profile access...</span></div>}
          {accountCompanies.map(company => (
            <div className="workspace-row" key={company.ticker}>
              <div><strong>{company.name}</strong><small>{company.ticker} · {company.exchange}</small></div>
              <span>{company.role}</span>
              <span className={`status-pill ${company.status === 'Active' ? 'success' : 'muted'}`}>{company.status}</span>
              <span>{company.ticker === ticker ? 'Current' : 'Available'}</span>
              <Link className="text-link" href={`/monitor/${company.ticker}/dashboard-v2`}>Open</Link>
            </div>
          ))}
          {!loading && !accountCompanies.length && (
            <div className="workspace-row company-workspace-loading"><span>No company access is assigned to this profile.</span></div>
          )}
        </div>
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
