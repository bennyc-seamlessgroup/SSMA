'use client';

import { InfoTooltip } from '@/components/InfoTooltip';
import { authenticatedFetch } from '@/lib/auth-client';
import { useEffect, useMemo, useState } from 'react';
import type { FloatAdjustments, InternalFloatV2UserInput, ManualHolding } from '@/lib/internal-float';

type OwnershipData = {
  sharesOutstanding: number;
  insiderShares: number;
  institutionShares: number;
  publicFloat: number;
};

export type InstitutionalOwnershipOverview = {
  shares_outstanding?: number | string | null;
  public_float_shares?: number | string | null;
  institutional_shares_long?: number | string | null;
  insider_shares_long?: number | string | null;
};

type PrivateHolding = {
  id: string;
  holderName: string;
  category: string;
  shares: number;
  includeInDeduction: boolean;
  notes: string;
};

type CustodyRow = { id: string; name: string; shares: number };
type TokenChain = { id: string; chain: string; shares: number; provider: string };
type CollateralChain = { id: string; chain: string; shares: number; protocol: string };
type Segment = { label: string; value: number; color: string };
type EditPanel = 'private' | 'tokenized' | 'collateral' | null;

const colors = ['#2453a6', '#0f8a6a', '#d89018', '#6f7bd9', '#8896a8', '#c2415b'];
const privateCategories = ['Founder', 'CEO', 'Management', 'Insider', 'Strategic Investor', 'Family Office', 'Long-Term Holder', 'Other'];
const tokenizationProviderOptions = ['Securitize', 'xStocks', 'Ondo', 'bStocks'];
const protocolOptions = ['Aave', 'Euler', 'Kamino', 'Morpho'];

const userInputEndpoints: Record<Exclude<EditPanel, null>, string> = {
  private: '/user-inputs/private-holdings',
  tokenized: '/user-inputs/token-chains',
  collateral: '/user-inputs/collateral-chains',
};

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown, options?: Intl.NumberFormatOptions) {
  return numeric(value).toLocaleString('en-US', options);
}

function compact(value: number) {
  return value.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
}

function pct(part: number, total: number) {
  return total ? (part / total) * 100 : 0;
}

function formatPct(value: number) {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function seedOwnership(holdings: ManualHolding[], adjustments: FloatAdjustments, institutionalOverview?: InstitutionalOwnershipOverview): OwnershipData {
  const insiderTypes = new Set(['CEO', 'CFO', 'Founder', 'Director', 'Management', 'Affiliated Entity']);
  const institutionTypes = new Set(['Major Shareholder', 'Strategic Investor', 'Friendly Holder', 'Friendly Long-Term Holder']);
  const sharesOutstanding = numeric(institutionalOverview?.shares_outstanding) || numeric(adjustments.officialSharesOutstanding) || 58030000;
  const publicFloat = numeric(institutionalOverview?.public_float_shares) || numeric(adjustments.officialFreeFloat) || 32664808;
  const insiderShares = numeric(institutionalOverview?.insider_shares_long) || holdings.filter(row => insiderTypes.has(row.holderType)).reduce((sum, row) => sum + numeric(row.numberOfShares), 0) || 15000000;
  const institutionShares = numeric(institutionalOverview?.institutional_shares_long) || holdings.filter(row => institutionTypes.has(row.holderType)).reduce((sum, row) => sum + numeric(row.numberOfShares), 0) || 10000000;
  return { sharesOutstanding, insiderShares, institutionShares, publicFloat };
}

function seedPrivateHoldings(holdings: ManualHolding[]): PrivateHolding[] {
  const rows = holdings.slice(0, 4).map((row, index) => ({
    id: row.id || `private-${index}`,
    holderName: row.holderName || 'Holder',
    category: privateCategories.includes(row.holderType) ? row.holderType : 'Other',
    shares: numeric(row.numberOfShares),
    includeInDeduction: true,
    notes: row.notes || '',
  })).filter(row => row.shares > 0);

  return rows.length ? rows : [
    { id: 'founder', holderName: 'Founder / management group', category: 'Founder', shares: 5000000, includeInDeduction: true, notes: 'Internal management assumption.' },
    { id: 'strategic', holderName: 'Strategic long-term holders', category: 'Strategic Investor', shares: 3000000, includeInDeduction: true, notes: 'Management / strategic holder estimate.' },
  ];
}

function Donut({ title, center, segments, bare = false }: { title: string; center: string; segments: Segment[]; bare?: boolean }) {
  const total = segments.reduce((sum, row) => sum + row.value, 0) || 1;
  let cursor = 0;
  const segmentLabels = segments.map(row => {
    const start = cursor;
    const percent = pct(row.value, total);
    const end = start + percent;
    cursor = end;
    const angle = ((start + percent / 2) / 100) * Math.PI * 2 - Math.PI / 2;
    const radius = 35;
    return {
      ...row,
      percent,
      start,
      end,
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
    };
  });
  const gradient = segmentLabels.map(row => {
    return `${row.color} ${row.start}% ${row.end}%`;
  }).join(', ');

  return (
    <div className={bare ? 'float-v2-story-card float-v2-embedded-panel' : 'terminal-card float-v2-story-card'}>
      <h3>{title}</h3>
      <div className="float-v2-donut-story">
        <div className="float-donut" style={{ background: `conic-gradient(${gradient})` }}>
          {segmentLabels.map(row => row.percent >= 3 && (
            <span
              key={`${row.label}-pct`}
              className="float-donut__pct"
              style={{ left: `${row.x}%`, top: `${row.y}%` }}
            >
              {formatPct(row.percent)}
            </span>
          ))}
          <div><strong>{center}</strong><span>Total</span></div>
        </div>
        <div className="float-v2-value-legend">
          {segments.map(row => (
            <div key={row.label}>
              <span><i style={{ background: row.color }} />{row.label}</span>
              <strong>{compact(row.value)}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RankedBars({ rows, total, showExtra = false }: { rows: Array<{ key?: string; label: string; value: number; extra?: string }>; total: number; showExtra?: boolean }) {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map(row => row.value), 1);
  return (
    <div className="float-v2-ranked-bars">
      {sorted.map((row, index) => (
        <div key={row.key ?? `${row.label}-${index}`}>
          <span>{row.label}</span>
          <div className="float-v2-ranked-meter">
            <div><i style={{ width: `${Math.max(4, (row.value / max) * 100)}%`, background: colors[index % colors.length] }} /></div>
            <small>{formatPct(pct(row.value, total))}</small>
          </div>
          <strong className="float-v2-ranked-value">
            <b>{formatNumber(row.value)}</b>
          </strong>
          {showExtra && row.extra && <em>{row.extra}</em>}
        </div>
      ))}
    </div>
  );
}

function Waterfall({ marketFloat, privateShares, tokenizedShares, collateralizedShares, realTradableFloat }: { marketFloat: number; privateShares: number; tokenizedShares: number; collateralizedShares: number; realTradableFloat: number }) {
  const rows = [
    { label: 'Market Float', value: marketFloat, className: '' },
    { label: 'Management / Strategic', value: -privateShares, className: 'down' },
    { label: 'Tokenized Shares', value: -tokenizedShares, className: 'down' },
    { label: 'Collateralized Shares', value: -collateralizedShares, className: 'down' },
    { label: 'Real Tradable Float', value: realTradableFloat, className: 'end' },
  ];
  return (
    <div className="terminal-card float-v2-waterfall">
      {rows.map(row => (
        <div key={row.label} className={row.className}>
          <span className={row.label === 'Real Tradable Float' ? 'with-info' : ''}>
            {row.label}
            {row.label === 'Real Tradable Float' && (
              <InfoTooltip text="Estimated shares that may realistically trade after deducting internal management/strategic holdings, tokenized shares, and collateralized shares from shares outstanding after insiders and institutions." />
            )}
          </span>
          <strong>{row.value < 0 ? '-' : ''}{compact(Math.abs(row.value))}</strong>
          <small>{formatPct(pct(Math.abs(row.value), marketFloat))} of market float</small>
        </div>
      ))}
    </div>
  );
}

export function InternalFloatV2Client({
  initialHoldings,
  initialAdjustments,
  initialUserInputs,
  institutionalOverview,
}: {
  initialHoldings: ManualHolding[];
  initialAdjustments: FloatAdjustments;
  initialUserInputs: InternalFloatV2UserInput;
  institutionalOverview?: InstitutionalOwnershipOverview;
}) {
  const [editPanel, setEditPanel] = useState<EditPanel>(null);
  const [ownership] = useState<OwnershipData>(() => seedOwnership(initialHoldings, initialAdjustments, institutionalOverview));
  const [privateHoldings, setPrivateHoldings] = useState<PrivateHolding[]>(() => initialUserInputs.privateHoldings);
  const [custodyRows, setCustodyRows] = useState<CustodyRow[]>(() => initialUserInputs.custodyRows);
  const [tokenChains, setTokenChains] = useState<TokenChain[]>(() => initialUserInputs.tokenChains);
  const [collateralChains, setCollateralChains] = useState<CollateralChain[]>(() => initialUserInputs.collateralChains);
  const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');
  const [apiMessage, setApiMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadUserInputs() {
      setApiStatus('loading');
      try {
        const data = await authenticatedFetch('/user-inputs') as InternalFloatV2UserInput;
        if (cancelled) return;
        if (Array.isArray(data.privateHoldings)) setPrivateHoldings(data.privateHoldings);
        if (Array.isArray(data.custodyRows)) setCustodyRows(data.custodyRows);
        if (Array.isArray(data.tokenChains)) setTokenChains(data.tokenChains);
        if (Array.isArray(data.collateralChains)) setCollateralChains(data.collateralChains);
        setApiStatus('idle');
        setApiMessage('');
      } catch (error) {
        if (cancelled) return;
        setApiStatus('error');
        setApiMessage(error instanceof Error ? error.message : 'Unable to load user inputs from API.');
      }
    }

    loadUserInputs();

    return () => {
      cancelled = true;
    };
  }, []);

  const privateShares = privateHoldings.filter(row => row.includeInDeduction).reduce((sum, row) => sum + numeric(row.shares), 0);
  const tokenizedShares = tokenChains.reduce((sum, row) => sum + row.shares, 0);
  const collateralizedShares = collateralChains.reduce((sum, row) => sum + row.shares, 0);
  const privateFloatShares = privateShares;
  const internalFloatShares = privateFloatShares + tokenizedShares + collateralizedShares;
  const floatBeforeInternalAdjustments = Math.max(0, ownership.sharesOutstanding - ownership.insiderShares - ownership.institutionShares);
  const publicFloatShares = Math.max(0, floatBeforeInternalAdjustments - internalFloatShares);
  const realTradableFloat = publicFloatShares;
  const floatReductionPercent = pct(internalFloatShares, floatBeforeInternalAdjustments);

  const ownershipSegments = [
    { label: 'Insiders', value: ownership.insiderShares, color: colors[0] },
    { label: 'Institutions', value: ownership.institutionShares, color: colors[1] },
    { label: 'Real Tradable Float', value: publicFloatShares, color: colors[2] },
    { label: 'Internal Float', value: internalFloatShares, color: colors[3] },
  ];
  const internalFloatSegments = [
    { label: 'Management / Strategic', value: privateFloatShares, color: colors[4] },
    { label: 'Tokenized', value: tokenizedShares, color: colors[3] },
    { label: 'Collateralized', value: collateralizedShares, color: colors[2] },
  ];
  const collateralSegments = collateralChains.map((row, index) => ({ label: row.chain, value: row.shares, color: colors[index] }));
  const tokenSegments = tokenChains.map((row, index) => ({ label: row.chain, value: row.shares, color: colors[index] }));
  const providerRows = Array.from(tokenChains.reduce((map, row) => {
    map.set(row.provider, (map.get(row.provider) ?? 0) + row.shares);
    return map;
  }, new Map<string, number>())).map(([provider, shares]) => ({ id: provider, provider, shares }));
  const protocolRows = Array.from(collateralChains.reduce((map, row) => {
    map.set(row.protocol, (map.get(row.protocol) ?? 0) + row.shares);
    return map;
  }, new Map<string, number>())).map(([protocol, shares]) => ({ id: protocol, protocol, shares }));

  const allocationTree = useMemo(() => [
    { level: 0, label: 'Shares Outstanding', value: ownership.sharesOutstanding },
    { level: 1, label: 'Insiders', value: ownership.insiderShares },
    { level: 1, label: 'Institutions', value: ownership.institutionShares },
    { level: 1, label: 'Market Float', value: floatBeforeInternalAdjustments },
    { level: 2, label: 'Internal Float', value: internalFloatShares },
    { level: 3, label: 'Management / Strategic', value: privateFloatShares },
    { level: 3, label: 'Tokenized', value: tokenizedShares },
    { level: 3, label: 'Collateralized', value: collateralizedShares },
    { level: 2, label: 'Real Tradable Float', value: realTradableFloat },
  ], [collateralizedShares, floatBeforeInternalAdjustments, internalFloatShares, ownership, privateFloatShares, realTradableFloat, tokenizedShares]);

  function patchPrivate(id: string, patch: Partial<PrivateHolding>) {
    setPrivateHoldings(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  }

  function patchTokenChain(id: string, patch: Partial<TokenChain>) {
    setTokenChains(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  }

  function patchCollateralChain(id: string, patch: Partial<CollateralChain>) {
    setCollateralChains(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  }

  async function saveEditPanel() {
    if (!editPanel) return;

    const payload = editPanel === 'private'
      ? privateHoldings
      : editPanel === 'tokenized'
        ? tokenChains
        : collateralChains;

    setApiStatus('saving');
    setApiMessage('');

    try {
      const updated = await authenticatedFetch(userInputEndpoints[editPanel], {
        method: 'PUT',
        body: JSON.stringify(payload),
      }) as InternalFloatV2UserInput;

      if (Array.isArray(updated.privateHoldings)) setPrivateHoldings(updated.privateHoldings);
      if (Array.isArray(updated.custodyRows)) setCustodyRows(updated.custodyRows);
      if (Array.isArray(updated.tokenChains)) setTokenChains(updated.tokenChains);
      if (Array.isArray(updated.collateralChains)) setCollateralChains(updated.collateralChains);

      setApiStatus('saved');
      setApiMessage('Saved. Institutional ownership consolidation will refresh shortly.');
      setEditPanel(null);
    } catch (error) {
      setApiStatus('error');
      setApiMessage(error instanceof Error ? error.message : 'Unable to save user inputs.');
    }
  }

  function renderEditModal() {
    if (!editPanel) return null;

    const titleMap: Record<Exclude<EditPanel, null>, string> = {
      private: 'Edit Management / Strategic Holdings',
      tokenized: 'Edit Tokenized Shares & Providers',
      collateral: 'Edit Collateralized Shares & Protocols',
    };

    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={() => setEditPanel(null)}>
        <div className="modal-card float-v2-edit-modal" role="dialog" aria-modal="true" aria-labelledby="float-v2-edit-title" onMouseDown={event => event.stopPropagation()}>
          <div className="modal-card__head">
            <div>
              <h2 id="float-v2-edit-title">{titleMap[editPanel]}</h2>
              <p className="section-subtitle">Manual inputs are used until these values can be auto-detected from production data sources.</p>
            </div>
            <button className="icon-button" type="button" aria-label="Close edit modal" onClick={() => setEditPanel(null)}>x</button>
          </div>
          {apiMessage && <p className={`float-v2-api-message ${apiStatus === 'error' ? 'error' : 'success'}`}>{apiMessage}</p>}

          {editPanel === 'private' && (
            <>
              <button className="button secondary" type="button" onClick={() => setPrivateHoldings(current => [...current, { id: id('private'), holderName: `Holder ${current.length + 1}`, category: 'Other', shares: 0, includeInDeduction: true, notes: '' }])}>Add Entry</button>
              <div className="float-v2-manual-list private">
                {privateHoldings.map(row => (
                  <article key={row.id}>
                    <label><span>Holder</span><input className="input" value={row.holderName} onChange={event => patchPrivate(row.id, { holderName: event.target.value })} /></label>
                    <label><span>Category</span><select className="select" value={row.category} onChange={event => patchPrivate(row.id, { category: event.target.value })}>{privateCategories.map(category => <option key={category}>{category}</option>)}</select></label>
                    <label><span>Shares</span><input className="input numeric-input" type="number" value={row.shares} onChange={event => patchPrivate(row.id, { shares: Number(event.target.value) })} /></label>
                    <label className="float-v2-checkbox-field"><input type="checkbox" checked={row.includeInDeduction} onChange={event => patchPrivate(row.id, { includeInDeduction: event.target.checked })} /> Deduct from float</label>
                    <label><span>Notes</span><input className="input" value={row.notes} onChange={event => patchPrivate(row.id, { notes: event.target.value })} /></label>
                    <button className="button ghost" type="button" onClick={() => setPrivateHoldings(current => current.filter(item => item.id !== row.id))}>Delete</button>
                  </article>
                ))}
              </div>
            </>
          )}

          {editPanel === 'tokenized' && (
            <>
              <button className="button secondary" type="button" onClick={() => setTokenChains(current => [...current, { id: id('token-chain'), chain: `Chain ${current.length + 1}`, shares: 0, provider: tokenizationProviderOptions[0] }])}>Add Entry</button>
              <div className="float-v2-manual-list">
                {tokenChains.map(row => (
                  <article key={row.id}>
                    <label><span>Chain</span><input className="input" value={row.chain} onChange={event => patchTokenChain(row.id, { chain: event.target.value })} /></label>
                    <label><span>Shares</span><input className="input numeric-input" type="number" value={row.shares} onChange={event => patchTokenChain(row.id, { shares: Number(event.target.value) })} /></label>
                    <label><span>Tokenization Provider</span><select className="select" value={row.provider} onChange={event => patchTokenChain(row.id, { provider: event.target.value })}>{tokenizationProviderOptions.map(provider => <option key={provider}>{provider}</option>)}</select></label>
                    <small>{formatPct(pct(row.shares, ownership.sharesOutstanding))} of shares outstanding</small>
                    <button className="button ghost" type="button" onClick={() => setTokenChains(current => current.filter(item => item.id !== row.id))}>Delete</button>
                  </article>
                ))}
              </div>
            </>
          )}

          {editPanel === 'collateral' && (
            <>
              <button className="button secondary" type="button" onClick={() => setCollateralChains(current => [...current, { id: id('collateral-chain'), chain: `Chain ${current.length + 1}`, shares: 0, protocol: protocolOptions[0] }])}>Add Entry</button>
              <div className="float-v2-manual-list">
                {collateralChains.map(row => (
                  <article key={row.id}>
                    <label><span>Chain</span><input className="input" value={row.chain} onChange={event => patchCollateralChain(row.id, { chain: event.target.value })} /></label>
                    <label><span>Shares</span><input className="input numeric-input" type="number" value={row.shares} onChange={event => patchCollateralChain(row.id, { shares: Number(event.target.value) })} /></label>
                    <label><span>Protocol</span><select className="select" value={row.protocol} onChange={event => patchCollateralChain(row.id, { protocol: event.target.value })}>{protocolOptions.map(protocol => <option key={protocol}>{protocol}</option>)}</select></label>
                    <small>{formatPct(pct(row.shares, tokenizedShares))} of tokenized shares</small>
                    <button className="button ghost" type="button" onClick={() => setCollateralChains(current => current.filter(item => item.id !== row.id))}>Delete</button>
                  </article>
                ))}
              </div>
            </>
          )}

          <div className="modal-actions">
            <button className="button secondary" type="button" onClick={() => setEditPanel(null)} disabled={apiStatus === 'saving'}>Cancel</button>
            <button className="button primary" type="button" onClick={saveEditPanel} disabled={apiStatus === 'saving'}>
              {apiStatus === 'saving' ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="terminal-section float-hero-section">
        <div className="terminal-section__head">
          <div>
            <span>Section 1</span>
            <h2>Executive Summary</h2>
          </div>
        </div>
        {apiStatus === 'loading' && <p className="float-v2-api-message">Loading saved user inputs...</p>}
        {apiStatus === 'error' && apiMessage && !editPanel && <p className="float-v2-api-message error">{apiMessage}</p>}
        {apiStatus === 'saved' && apiMessage && !editPanel && <p className="float-v2-api-message success">{apiMessage}</p>}

        <div className="float-v2-kpis">
          <div className="terminal-card terminal-stat"><span>Shares Outstanding</span><strong>{formatNumber(ownership.sharesOutstanding)}</strong><small>Total issued share base</small></div>
          <div className="terminal-card terminal-stat float-v2-formula-stat">
            <span className="with-info">Market Float → Real Tradable Float <InfoTooltip text="Market float is shares outstanding minus insiders and institutions. Real tradable float then subtracts management/strategic, tokenized, and collateralized internal float." /></span>
            <div className="float-v2-compact-formula">
              <strong>{compact(floatBeforeInternalAdjustments)}</strong>
              <em>→</em>
              <strong>{compact(realTradableFloat)}</strong>
            </div>
            <small>Shares outstanding - insiders - institutions, then less internal float</small>
          </div>
          <div className="terminal-card terminal-stat"><span>Float Reduction</span><strong>{formatPct(floatReductionPercent)}</strong><small>-{formatNumber(internalFloatShares)} internal float shares</small></div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 2</span><h2>Ownership & Internal Float Breakdown</h2></div></div>
        <div className="float-v2-two-col">
          <Donut title="Ownership Structure" center={compact(ownership.sharesOutstanding)} segments={ownershipSegments} />
          <Donut title="Internal Float" center={compact(internalFloatShares)} segments={internalFloatSegments} />
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div><span>Section 3</span><h2>Market Float vs Real Tradable Float</h2></div>
        </div>
        <Waterfall marketFloat={floatBeforeInternalAdjustments} privateShares={privateShares} tokenizedShares={tokenizedShares} collateralizedShares={collateralizedShares} realTradableFloat={realTradableFloat} />
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div><span>Section 4</span><h2>Management / Strategic Holdings</h2><p className="section-subtitle">Internal deduction assumptions used to estimate real tradable float.</p></div>
          <button className="button secondary" type="button" onClick={() => setEditPanel('private')}>Edit</button>
        </div>
        <div className="terminal-card"><RankedBars showExtra rows={privateHoldings.map(row => ({ key: row.id, label: row.holderName, value: row.shares, extra: `${row.category} · ${row.includeInDeduction ? 'deducted from float' : 'not deducted'}` }))} total={floatBeforeInternalAdjustments} /></div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 5</span><h2>Traditional Custody Breakdown</h2><p className="section-subtitle">Future integration with DTC Position Reports.</p></div></div>
        <div className="terminal-card"><RankedBars rows={custodyRows.map(row => ({ key: row.id, label: row.name, value: row.shares }))} total={floatBeforeInternalAdjustments} /></div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div><span>Section 6</span><h2>Tokenized Shares & Providers</h2></div>
          <div className="float-v2-section-actions">
            <button className="button secondary" type="button" onClick={() => setEditPanel('tokenized')}>Edit</button>
          </div>
        </div>
        <div className="terminal-card float-v2-combined-card">
          <div className="float-v2-combined-grid">
            <Donut bare title="Tokenized Chain Allocation" center={compact(tokenizedShares)} segments={tokenSegments} />
            <div className="float-v2-embedded-panel">
              <h3>Tokenization Providers</h3>
              <RankedBars rows={providerRows.map(row => ({ key: row.id, label: row.provider, value: row.shares }))} total={tokenizedShares} />
            </div>
          </div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div><span>Section 7</span><h2>Collateralized Shares & DeFi Exposure</h2><p className="section-subtitle">Shares pledged into DeFi lending protocols as collateral.</p></div>
          <div className="float-v2-section-actions">
            <button className="button secondary" type="button" onClick={() => setEditPanel('collateral')}>Edit</button>
          </div>
        </div>
        <div className="terminal-card float-v2-combined-card">
          <div className="float-v2-combined-grid">
            <Donut bare title="Collateralized Shares by Chain" center={compact(collateralizedShares)} segments={collateralSegments} />
            <div className="float-v2-embedded-panel">
              <h3>DeFi Protocol Exposure</h3>
              <RankedBars
                rows={protocolRows.map(row => ({
                  key: row.id,
                  label: row.protocol,
                  value: row.shares,
                }))}
                total={tokenizedShares}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 8</span><h2>Share Allocation Tree</h2></div></div>
        <div className="terminal-card float-v2-tree">
          {allocationTree.map(row => (
            <div key={`${row.level}-${row.label}`} style={{ marginLeft: `${row.level * 28}px` }}>
              <span>{row.level === 0 ? '' : row.level === 1 ? '├──' : '└──'} {row.label}</span>
              <strong>{formatNumber(row.value)}</strong>
            </div>
          ))}
        </div>
      </section>
      {renderEditModal()}
    </>
  );
}
