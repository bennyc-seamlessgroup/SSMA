'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AccountShell } from '@/components/AccountShell';
import { accountCompanies } from '@/components/accountData';

export default function AccountCompaniesPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AccountShell>
      <header className="portal-topbar">
        <div>
          <div className="eyebrow">Account / Companies</div>
          <h1>Company workspaces</h1>
          <p>Manage issuer coverage, delivery ownership, and workspace access across the account.</p>
        </div>
        <button className="button light-primary" onClick={() => setIsOpen(true)}>Add company</button>
      </header>

      <section className="portal-panel">
        <div className="portal-panel__head">
          <div>
            <h2>All companies</h2>
            <p>Issuer workspaces available to this account.</p>
          </div>
          <span className="status-pill muted">{accountCompanies.length} companies</span>
        </div>
        <div className="workspace-table company-workspace-table">
          <div className="workspace-table__head"><span>Company</span><span>Status</span><span>Recipients</span><span>Schedule</span><span>Action</span></div>
          {accountCompanies.map(company => (
            <div className="workspace-row" key={company.ticker}>
              <div><strong>{company.name}</strong><small>{company.ticker} · {company.exchange}</small></div>
              <span className={`status-pill ${company.status === 'Active' ? 'success' : 'muted'}`}>{company.status}</span>
              <span>{company.recipients}</span>
              <span>{company.sendTime}</span>
              <Link className="text-link" href={`/monitor/${company.ticker}`}>Open</Link>
            </div>
          ))}
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
              <label className="field-label">Primary contact email<input className="input" type="email" placeholder="ir@company.com" /></label>
            </div>
            <div className="modal-actions">
              <button className="button secondary" onClick={() => setIsOpen(false)}>Cancel</button>
              <button className="button" onClick={() => setIsOpen(false)}>Save company</button>
            </div>
          </div>
        </div>
      )}
    </AccountShell>
  );
}
