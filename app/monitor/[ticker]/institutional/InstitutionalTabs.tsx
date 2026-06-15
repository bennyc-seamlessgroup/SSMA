'use client';

import { useState } from 'react';
import type { InstitutionalHolding } from '@/lib/types';
import { OwnershipTable } from './OwnershipTable';
import { ActivistFilingsTable, type ActivistFiling } from './ActivistFilingsTable';

export function InstitutionalTabs({
  holdings,
  activistFilings,
  ticker,
  companyName,
}: {
  holdings: InstitutionalHolding[];
  activistFilings: ActivistFiling[];
  ticker: string;
  companyName: string;
}) {
  const [activeTab, setActiveTab] = useState<'ownership' | 'activist'>('ownership');

  return (
    <div className="institutional-tabs">
      <div className="institutional-tabs__bar" role="tablist" aria-label="Institutional ownership datasets">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ownership'}
          className={activeTab === 'ownership' ? 'active' : ''}
          onClick={() => setActiveTab('ownership')}
        >
          <span>Security Ownership</span>
          <small>{holdings.length.toLocaleString()} records</small>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'activist'}
          className={activeTab === 'activist' ? 'active' : ''}
          onClick={() => setActiveTab('activist')}
        >
          <span>Activist Filings</span>
          <small>{activistFilings.length.toLocaleString()} records</small>
        </button>
      </div>

      <div className="institutional-tabs__panel" role="tabpanel">
        {activeTab === 'ownership' ? (
          <OwnershipTable holdings={holdings} ticker={ticker} companyName={companyName} />
        ) : (
          <ActivistFilingsTable rows={activistFilings} />
        )}
      </div>
    </div>
  );
}
