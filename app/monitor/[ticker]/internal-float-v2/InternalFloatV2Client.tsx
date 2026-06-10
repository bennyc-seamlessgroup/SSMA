'use client';

import { useMemo, useState } from 'react';
import type { FloatAdjustments, ManualHolding } from '@/lib/internal-float';

type OwnershipData = {
  sharesOutstanding: number;
  insiderShares: number;
  institutionShares: number;
  publicFloat: number;
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
type TokenChain = { id: string; chain: string; shares: number };
type ProviderRow = { id: string; provider: string; shares: number };
type CollateralChain = { id: string; chain: string; shares: number };
type ProtocolRow = { id: string; protocol: string; shares: number; stablecoinBorrowed: string; ltv: number };
type Segment = { label: string; value: number; color: string };
type EditPanel = 'private' | 'tokenized' | 'providers' | 'collateral' | 'protocols' | null;

const colors = ['#2453a6', '#0f8a6a', '#d89018', '#6f7bd9', '#8896a8', '#c2415b'];
const privateCategories = ['Founder', 'CEO', 'Management', 'Insider', 'Strategic Investor', 'Family Office', 'Long-Term Holder', 'Other'];

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

function seedOwnership(holdings: ManualHolding[], adjustments: FloatAdjustments): OwnershipData {
  const insiderTypes = new Set(['CEO', 'CFO', 'Founder', 'Director', 'Management', 'Affiliated Entity']);
  const institutionTypes = new Set(['Major Shareholder', 'Strategic Investor', 'Friendly Holder', 'Friendly Long-Term Holder']);
  const sharesOutstanding = numeric(adjustments.officialSharesOutstanding) || 58030000;
  const publicFloat = numeric(adjustments.officialFreeFloat) || 32664808;
  const insiderShares = holdings.filter(row => insiderTypes.has(row.holderType)).reduce((sum, row) => sum + numeric(row.numberOfShares), 0) || 15000000;
  const institutionShares = holdings.filter(row => institutionTypes.has(row.holderType)).reduce((sum, row) => sum + numeric(row.numberOfShares), 0) || 10000000;
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
    { id: 'strategic', holderName: 'Strategic long-term holders', category: 'Strategic Investor', shares: 3000000, includeInDeduction: true, notes: 'Friendly / restricted holder estimate.' },
  ];
}

function Donut({ title, center, segments, bare = false }: { title: string; center: string; segments: Segment[]; bare?: boolean }) {
  const total = segments.reduce((sum, row) => sum + row.value, 0) || 1;
  let cursor = 0;
  const gradient = segments.map(row => {
    const start = cursor;
    cursor += pct(row.value, total);
    return `${row.color} ${start}% ${cursor}%`;
  }).join(', ');

  return (
    <div className={bare ? 'float-v2-story-card float-v2-embedded-panel' : 'terminal-card float-v2-story-card'}>
      <h3>{title}</h3>
      <div className="float-v2-donut-story">
        <div className="float-donut" style={{ background: `conic-gradient(${gradient})` }}>
          <div><strong>{center}</strong><span>Total</span></div>
        </div>
        <div className="float-v2-value-legend">
          {segments.map(row => (
            <div key={row.label}>
              <span><i style={{ background: row.color }} />{row.label}</span>
              <strong>{compact(row.value)} <small>{formatPct(pct(row.value, total))}</small></strong>
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
          <div><i style={{ width: `${Math.max(4, (row.value / max) * 100)}%`, background: colors[index % colors.length] }} /></div>
          <strong>{formatNumber(row.value)} <small>{formatPct(pct(row.value, total))}</small></strong>
          {showExtra && row.extra && <em>{row.extra}</em>}
        </div>
      ))}
    </div>
  );
}

function Waterfall({ officialFloat, privateShares, collateralizedShares, realTradableFloat }: { officialFloat: number; privateShares: number; collateralizedShares: number; realTradableFloat: number }) {
  const rows = [
    { label: 'Official Float', value: officialFloat, className: '' },
    { label: 'Private Friendly Holders', value: -privateShares, className: 'down' },
    { label: 'Collateralized Shares', value: -collateralizedShares, className: 'down' },
    { label: 'Real Tradable Float', value: realTradableFloat, className: 'end' },
  ];
  return (
    <div className="terminal-card float-v2-waterfall">
      {rows.map(row => (
        <div key={row.label} className={row.className}>
          <span>{row.label}</span>
          <strong>{row.value < 0 ? '-' : ''}{compact(Math.abs(row.value))}</strong>
          <small>{formatPct(pct(Math.abs(row.value), officialFloat))} of official float</small>
        </div>
      ))}
    </div>
  );
}

export function InternalFloatV2Client({ initialHoldings, initialAdjustments }: { initialHoldings: ManualHolding[]; initialAdjustments: FloatAdjustments }) {
  const [editPanel, setEditPanel] = useState<EditPanel>(null);
  const [ownership, setOwnership] = useState<OwnershipData>(() => seedOwnership(initialHoldings, initialAdjustments));
  const [privateHoldings, setPrivateHoldings] = useState<PrivateHolding[]>(() => seedPrivateHoldings(initialHoldings));
  const [custodyRows] = useState<CustodyRow[]>([
    { id: 'bny', name: 'Bank of NY Mellon', shares: 6200000 },
    { id: 'ibkr', name: 'IBKR', shares: 4200000 },
    { id: 'citibank', name: 'Citibank', shares: 3500000 },
    { id: 'futu', name: 'FUTU', shares: 2400000 },
    { id: 'fidelity', name: 'Fidelity', shares: 1900000 },
    { id: 'schwab', name: 'Charles Schwab', shares: 1600000 },
    { id: 'others', name: 'Others', shares: 4800000 },
  ]);
  const [tokenChains, setTokenChains] = useState<TokenChain[]>([
    { id: 'eth', chain: 'ETH', shares: 3200000 },
    { id: 'sol', chain: 'SOL', shares: 1800000 },
    { id: 'bnb', chain: 'BNB', shares: 1000000 },
  ]);
  const [providerRows, setProviderRows] = useState<ProviderRow[]>([
    { id: 'securitize', provider: 'Securitize', shares: 2400000 },
    { id: 'xstocks', provider: 'xStocks', shares: 1600000 },
    { id: 'ondo', provider: 'Ondo', shares: 1200000 },
    { id: 'bstocks', provider: 'bStocks', shares: 800000 },
  ]);
  const [collateralChains, setCollateralChains] = useState<CollateralChain[]>([
    { id: 'eth-c', chain: 'ETH', shares: 1500000 },
    { id: 'sol-c', chain: 'SOL', shares: 800000 },
    { id: 'bnb-c', chain: 'BNB', shares: 300000 },
  ]);
  const [protocolRows, setProtocolRows] = useState<ProtocolRow[]>([
    { id: 'aave', protocol: 'Aave', shares: 900000, stablecoinBorrowed: '$580K', ltv: 42 },
    { id: 'kamino', protocol: 'Kamino', shares: 720000, stablecoinBorrowed: '$410K', ltv: 38 },
    { id: 'euler', protocol: 'Euler', shares: 560000, stablecoinBorrowed: '$330K', ltv: 36 },
    { id: 'morpho', protocol: 'Morpho', shares: 420000, stablecoinBorrowed: '$260K', ltv: 34 },
  ]);

  const privateShares = privateHoldings.filter(row => row.includeInDeduction).reduce((sum, row) => sum + numeric(row.shares), 0);
  const tokenizedShares = tokenChains.reduce((sum, row) => sum + row.shares, 0);
  const collateralizedShares = collateralChains.reduce((sum, row) => sum + row.shares, 0);
  const realTradableFloat = Math.max(0, ownership.publicFloat - privateShares - collateralizedShares);
  const floatReductionPercent = pct(ownership.publicFloat - realTradableFloat, ownership.publicFloat);
  const traditionalShares = Math.max(0, ownership.publicFloat - tokenizedShares);
  const availableTokenizedShares = Math.max(0, tokenizedShares - collateralizedShares);

  const ownershipSegments = [
    { label: 'Insiders', value: ownership.insiderShares, color: colors[0] },
    { label: 'Institutions', value: ownership.institutionShares, color: colors[1] },
    { label: 'Public Float', value: ownership.publicFloat, color: colors[2] },
  ];
  const publicFloatSegments = [
    { label: 'Traditional', value: traditionalShares, color: colors[0] },
    { label: 'Tokenized', value: availableTokenizedShares, color: colors[3] },
    { label: 'Collateralized', value: collateralizedShares, color: colors[2] },
  ];
  const collateralSegments = collateralChains.map((row, index) => ({ label: row.chain, value: row.shares, color: colors[index] }));
  const tokenSegments = tokenChains.map((row, index) => ({ label: row.chain, value: row.shares, color: colors[index] }));

  const allocationTree = useMemo(() => [
    { level: 0, label: 'Shares Outstanding', value: ownership.sharesOutstanding },
    { level: 1, label: 'Insiders', value: ownership.insiderShares },
    { level: 1, label: 'Institutions', value: ownership.institutionShares },
    { level: 1, label: 'Public Float', value: ownership.publicFloat },
    { level: 2, label: 'Traditional', value: traditionalShares },
    { level: 2, label: 'Tokenized', value: tokenizedShares },
    { level: 3, label: 'Collateralized', value: collateralizedShares },
    { level: 2, label: 'Real Tradable Float', value: realTradableFloat },
  ], [collateralizedShares, ownership, realTradableFloat, tokenizedShares, traditionalShares]);

  function patchPrivate(id: string, patch: Partial<PrivateHolding>) {
    setPrivateHoldings(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  }

  function patchTokenChain(id: string, patch: Partial<TokenChain>) {
    setTokenChains(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  }

  function patchProvider(id: string, patch: Partial<ProviderRow>) {
    setProviderRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  }

  function patchCollateralChain(id: string, patch: Partial<CollateralChain>) {
    setCollateralChains(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  }

  function patchProtocol(id: string, patch: Partial<ProtocolRow>) {
    setProtocolRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  }

  function renderEditModal() {
    if (!editPanel) return null;

    const titleMap: Record<Exclude<EditPanel, null>, string> = {
      private: 'Edit Private / Strategic Holdings',
      tokenized: 'Edit Tokenized Shares',
      providers: 'Edit Tokenization Providers',
      collateral: 'Edit Collateralized Shares',
      protocols: 'Edit DeFi Protocol Exposure',
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
              <button className="button secondary" type="button" onClick={() => setTokenChains(current => [...current, { id: id('token-chain'), chain: `Chain ${current.length + 1}`, shares: 0 }])}>Add Chain</button>
              <div className="float-v2-manual-list">
                {tokenChains.map(row => (
                  <article key={row.id}>
                    <label><span>Chain</span><input className="input" value={row.chain} onChange={event => patchTokenChain(row.id, { chain: event.target.value })} /></label>
                    <label><span>Shares</span><input className="input numeric-input" type="number" value={row.shares} onChange={event => patchTokenChain(row.id, { shares: Number(event.target.value) })} /></label>
                    <small>{formatPct(pct(row.shares, ownership.sharesOutstanding))} of shares outstanding</small>
                    <button className="button ghost" type="button" onClick={() => setTokenChains(current => current.filter(item => item.id !== row.id))}>Delete</button>
                  </article>
                ))}
              </div>
            </>
          )}

          {editPanel === 'providers' && (
            <>
              <button className="button secondary" type="button" onClick={() => setProviderRows(current => [...current, { id: id('provider'), provider: `Provider ${current.length + 1}`, shares: 0 }])}>Add Provider</button>
              <div className="float-v2-manual-list">
                {providerRows.map(row => (
                  <article key={row.id}>
                    <label><span>Provider</span><input className="input" value={row.provider} onChange={event => patchProvider(row.id, { provider: event.target.value })} /></label>
                    <label><span>Shares</span><input className="input numeric-input" type="number" value={row.shares} onChange={event => patchProvider(row.id, { shares: Number(event.target.value) })} /></label>
                    <small>{formatPct(pct(row.shares, tokenizedShares))} of tokenized shares</small>
                    <button className="button ghost" type="button" onClick={() => setProviderRows(current => current.filter(item => item.id !== row.id))}>Delete</button>
                  </article>
                ))}
              </div>
            </>
          )}

          {editPanel === 'collateral' && (
            <>
              <button className="button secondary" type="button" onClick={() => setCollateralChains(current => [...current, { id: id('collateral-chain'), chain: `Chain ${current.length + 1}`, shares: 0 }])}>Add Collateral Row</button>
              <div className="float-v2-manual-list">
                {collateralChains.map(row => (
                  <article key={row.id}>
                    <label><span>Chain</span><input className="input" value={row.chain} onChange={event => patchCollateralChain(row.id, { chain: event.target.value })} /></label>
                    <label><span>Shares</span><input className="input numeric-input" type="number" value={row.shares} onChange={event => patchCollateralChain(row.id, { shares: Number(event.target.value) })} /></label>
                    <small>{formatPct(pct(row.shares, tokenizedShares))} of tokenized shares</small>
                    <button className="button ghost" type="button" onClick={() => setCollateralChains(current => current.filter(item => item.id !== row.id))}>Delete</button>
                  </article>
                ))}
              </div>
            </>
          )}

          {editPanel === 'protocols' && (
            <>
              <button className="button secondary" type="button" onClick={() => setProtocolRows(current => [...current, { id: id('protocol'), protocol: `Protocol ${current.length + 1}`, shares: 0, stablecoinBorrowed: '$0', ltv: 0 }])}>Add Protocol</button>
              <div className="float-v2-manual-list wide">
                {protocolRows.map(row => (
                  <article key={row.id}>
                    <label><span>Protocol</span><input className="input" value={row.protocol} onChange={event => patchProtocol(row.id, { protocol: event.target.value })} /></label>
                    <label><span>Shares</span><input className="input numeric-input" type="number" value={row.shares} onChange={event => patchProtocol(row.id, { shares: Number(event.target.value) })} /></label>
                    <label><span>Borrowed</span><input className="input" value={row.stablecoinBorrowed} onChange={event => patchProtocol(row.id, { stablecoinBorrowed: event.target.value })} /></label>
                    <label><span>LTV %</span><input className="input numeric-input" type="number" value={row.ltv} onChange={event => patchProtocol(row.id, { ltv: Number(event.target.value) })} /></label>
                    <button className="button ghost" type="button" onClick={() => setProtocolRows(current => current.filter(item => item.id !== row.id))}>Delete</button>
                  </article>
                ))}
              </div>
            </>
          )}

          <div className="modal-actions">
            <button className="button primary" type="button" onClick={() => setEditPanel(null)}>Done</button>
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
            <span>Share Allocation & Tradable Float Intelligence</span>
            <h2>Executive Summary</h2>
            <p className="section-subtitle">Analyze ownership structure, public float composition, tokenized shares, collateralized shares, and estimated real tradable float.</p>
          </div>
          <span className="source-chip">Source: Internal Management Input</span>
        </div>

        <div className="grid cols-4 float-v2-kpis">
          <div className="terminal-card terminal-stat"><span>Shares Outstanding</span><strong>{formatNumber(ownership.sharesOutstanding)}</strong><small>Total issued share base</small></div>
          <div className="terminal-card terminal-stat"><span>Official Public Float</span><strong>{formatNumber(ownership.publicFloat)}</strong><small>{formatPct(pct(ownership.publicFloat, ownership.sharesOutstanding))} of outstanding</small></div>
          <div className="terminal-card terminal-stat"><span>Estimated Real Tradable Float</span><strong>{formatNumber(realTradableFloat)}</strong><small>{formatPct(pct(realTradableFloat, ownership.sharesOutstanding))} of outstanding</small></div>
          <div className="terminal-card terminal-stat"><span>Float Reduction</span><strong>{formatPct(floatReductionPercent)}</strong><small>-{formatNumber(ownership.publicFloat - realTradableFloat)} shares</small></div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 1</span><h2>Ownership & Public Float Breakdown</h2></div></div>
        <div className="float-v2-two-col">
          <Donut title="Ownership Structure" center={compact(ownership.sharesOutstanding)} segments={ownershipSegments} />
          <Donut title="Public Float" center={compact(ownership.publicFloat)} segments={publicFloatSegments} />
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div><span>Section 2</span><h2>Official Float vs Real Tradable Float</h2></div>
        </div>
        <Waterfall officialFloat={ownership.publicFloat} privateShares={privateShares} collateralizedShares={collateralizedShares} realTradableFloat={realTradableFloat} />
        <div className="terminal-card warning-card float-v2-warning">
          <h3>Internal Analytical Estimate</h3>
          <p>Real Tradable Float is an internal analytical estimate and may differ from official public float reported by market data providers.</p>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div><span>Section 3</span><h2>Private / Strategic Holdings</h2><p className="section-subtitle">Internal deduction assumptions used to estimate real tradable float.</p></div>
          <button className="button secondary" type="button" onClick={() => setEditPanel('private')}>Edit</button>
        </div>
        <div className="terminal-card"><RankedBars showExtra rows={privateHoldings.map(row => ({ key: row.id, label: row.holderName, value: row.shares, extra: `${row.category} · ${row.includeInDeduction ? 'deducted from float' : 'not deducted'}` }))} total={ownership.publicFloat} /></div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 4</span><h2>Traditional Custody Breakdown</h2><p className="section-subtitle">Future integration with DTC Position Reports.</p></div></div>
        <div className="terminal-card"><RankedBars rows={custodyRows.map(row => ({ key: row.id, label: row.name, value: row.shares }))} total={ownership.publicFloat} /></div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div><span>Section 5</span><h2>Tokenized Shares & Providers</h2></div>
          <div className="float-v2-section-actions">
            <button className="button secondary" type="button" onClick={() => setEditPanel('tokenized')}>Edit Shares</button>
            <button className="button secondary" type="button" onClick={() => setEditPanel('providers')}>Edit Providers</button>
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
          <div><span>Section 6</span><h2>Collateralized Shares & DeFi Exposure</h2><p className="section-subtitle">Shares pledged into DeFi lending protocols as collateral.</p></div>
          <div className="float-v2-section-actions">
            <button className="button secondary" type="button" onClick={() => setEditPanel('collateral')}>Edit Collateral</button>
            <button className="button secondary" type="button" onClick={() => setEditPanel('protocols')}>Edit Protocols</button>
          </div>
        </div>
        <div className="terminal-card float-v2-combined-card">
          <div className="float-v2-combined-grid">
            <Donut bare title="Collateralized Shares by Chain" center={compact(collateralizedShares)} segments={collateralSegments} />
            <div className="float-v2-embedded-panel">
              <h3>DeFi Protocol Exposure</h3>
              <RankedBars
                showExtra
                rows={protocolRows.map(row => ({
                  key: row.id,
                  label: row.protocol,
                  value: row.shares,
                  extra: `${row.stablecoinBorrowed} borrowed · ${row.ltv}% LTV · ${formatPct(pct(row.shares, tokenizedShares))} tokenized`,
                }))}
                total={ownership.publicFloat}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 7</span><h2>Share Allocation Tree</h2></div></div>
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
