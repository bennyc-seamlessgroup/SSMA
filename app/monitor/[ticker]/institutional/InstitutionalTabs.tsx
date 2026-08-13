'use client';

import { useState } from 'react';
import type { InstitutionalHolding } from '@/lib/types';
import { OwnershipTable } from './OwnershipTable';
import type { OwnershipMarketHistoryRecord } from './OwnershipHistoryChart';
import { ActivistFilingsTable, type ActivistFiling } from './ActivistFilingsTable';

export function InstitutionalTabs({
  holdings,
  activistFilings,
  ticker,
  companyName,
  chartHoldings,
  marketHistory,
  manualSchema,
  ownershipEmptyMessage,
}: {
  holdings: InstitutionalHolding[];
  activistFilings: ActivistFiling[];
  ticker: string;
  companyName: string;
  chartHoldings?: InstitutionalHolding[];
  marketHistory?: OwnershipMarketHistoryRecord[];
  manualSchema?: boolean;
  ownershipEmptyMessage?: string;
}) {
  const [activeTab, setActiveTab] = useState<'ownership' | 'activist'>('ownership');

  return (
    <div className="institutional-tabs">
      <header className="institutional-history-heading">
        <div className="institutional-section-heading">
          <span className="institutional-section-heading__icon is-history" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M6 3v3M18 3v3M4 9h16" />
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M8 13h3M8 17h6" />
            </svg>
          </span>
          <div>
            <h2>Quarterly Filing History</h2>
            <p>Completed reporting periods grouped by quarter for historical review and comparison.</p>
          </div>
        </div>
      </header>
      <div className="institutional-tabs__bar" role="tablist" aria-label="Institutional ownership datasets">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ownership'}
          className={activeTab === 'ownership' ? 'active' : ''}
          onClick={() => setActiveTab('ownership')}
        >
          <span>Institutions</span>
          <small>{holdings.length.toLocaleString()} records</small>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'activist'}
          className={activeTab === 'activist' ? 'active' : ''}
          onClick={() => setActiveTab('activist')}
        >
          <span>Insiders</span>
          <small>{activistFilings.length.toLocaleString()} records</small>
        </button>
      </div>

      <div className="institutional-tabs__panel" role="tabpanel">
        {activeTab === 'ownership' ? (
          <OwnershipTable
            holdings={holdings}
            ticker={ticker}
            companyName={companyName}
            chartHoldings={chartHoldings}
            marketHistory={marketHistory}
            manualSchema={manualSchema}
            emptyMessage={ownershipEmptyMessage}
          />
        ) : (
          <ActivistFilingsTable rows={activistFilings} />
        )}
      </div>
    </div>
  );
}
