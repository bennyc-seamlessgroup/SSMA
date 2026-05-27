'use client';

import Link from 'next/link';
import { useState } from 'react';
import { accountCompanies } from '@/components/accountData';

export default function CompaniesPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Company Management</h1>
          <p className="page__desc">Switch issuer workspaces, review account coverage, and add new monitored companies.</p>
        </div>
        <button className="button" onClick={() => setIsOpen(true)}>Add Company</button>
      </div>

      <section className="panel">
        <div className="portal-panel__head">
          <div>
            <h2>Covered companies</h2>
            <p>Issuer workspaces available to this demo account.</p>
          </div>
          <span className="status-pill muted">{accountCompanies.length} companies</span>
        </div>

        <div className="workspace-table company-workspace-table">
          <div className="workspace-table__head"><span>Company</span><span>Status</span><span>Recipients</span><span>Schedule</span><span>Action</span></div>
          {accountCompanies.map(company => (
            <div className="workspace-row" key={company.ticker}>
              <div><strong>{company.name}</strong><small>{company.ticker} · {company.exchange} · {company.plan}</small></div>
              <span className={`status-pill ${company.status === 'Active' ? 'success' : 'muted'}`}>{company.status}</span>
              <span>{company.recipients}</span>
              <span>{company.sendTime}</span>
              <Link className="text-link" href={`/monitor/${company.ticker}/dashboard`}>Open</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="grid cols-3">
        <div className="panel">
          <h2 className="panel__title">Workspace Access</h2>
          <p className="page__desc" style={{ margin: 0 }}>Control which executives, IR users, and advisors can access each company workspace.</p>
        </div>
        <div className="panel">
          <h2 className="panel__title">Coverage Rules</h2>
          <p className="page__desc" style={{ margin: 0 }}>Assign report schedules, alert rules, provider packages, and archive policy by issuer.</p>
        </div>
        <div className="panel">
          <h2 className="panel__title">Profile Menu Placement</h2>
          <p className="page__desc" style={{ margin: 0 }}>Company management is also available from the profile menu because it is account-level administration.</p>
        </div>
      </section>

      {isOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="add-company-title" onMouseDown={event => event.stopPropagation()}>
            <div className="modal-card__head">
              <div>
                <div className="eyebrow">New company</div>
                <h2 id="add-company-title">Add company</h2>
              </div>
              <button className="icon-button" aria-label="Close" onClick={() => setIsOpen(false)}>×</button>
            </div>
            <div className="section-list">
              <label className="field-label">Company legal name<input className="input" placeholder="Acme Holdings Inc." /></label>
              <label className="field-label">Ticker symbol<input className="input" placeholder="ACME" /></label>
              <label className="field-label">Exchange<select className="select" defaultValue="NASDAQ"><option>NASDAQ</option><option>NYSE</option><option>NYSE American</option></select></label>
              <label className="field-label">Primary contact email<input className="input" type="email" placeholder="ir@company.com" /></label>
            </div>
            <div className="modal-actions">
              <button className="button secondary" onClick={() => setIsOpen(false)}>Cancel</button>
              <button className="button" onClick={() => setIsOpen(false)}>Save Company</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
