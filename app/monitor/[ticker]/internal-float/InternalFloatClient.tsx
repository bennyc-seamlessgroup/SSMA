'use client';

import { useMemo, useState } from 'react';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { FloatAdjustments, ManualHolding } from '@/lib/internal-float';

const holderTypeOptions = ['CEO', 'CFO', 'Founder', 'Director', 'Management', 'Major Shareholder', 'Strategic Investor', 'Affiliated Entity', 'Friendly Holder', 'Tokenized Shares', 'Other'];
const sourceTypeOptions = ['Personally Controlled', 'Transfer Agent Record', 'Trust Structure', 'Custodian Statement', 'Tokenized Wallet', 'Internal Estimate', 'Known Friendly Holder', 'Legal Record', 'Other'];

type Props = {
  initialHoldings: ManualHolding[];
  initialAdjustments: FloatAdjustments;
  analysisSummary: string;
  riskNotes: string[];
};

type ChartSegment = {
  label: string;
  value: number;
  color: string;
};

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown, options?: Intl.NumberFormatOptions) {
  return numeric(value).toLocaleString('en-US', options);
}

function formatPercent(value: unknown) {
  return `${numeric(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

function pct(part: number, total: number) {
  return total ? (part / total) * 100 : 0;
}

function sourceChip(source: string) {
  return <span className="source-chip">Source: {source}</span>;
}

function isTokenized(row: ManualHolding) {
  return row.holderType === 'Tokenized Shares' || row.holderType === 'Tokenized Holder';
}

function isTradable(row: ManualHolding) {
  return !isTokenized(row) && row.tradabilityStatus === 'Freely Tradable';
}

function isLendable(row: ManualHolding) {
  return !isTokenized(row) && row.lendingAvailability === 'Available for Lending';
}

function calculate(holdings: ManualHolding[], base: FloatAdjustments): FloatAdjustments {
  const sumWhere = (predicate: (holding: ManualHolding) => boolean) =>
    holdings.reduce((sum, holding) => sum + (predicate(holding) ? numeric(holding.numberOfShares) : 0), 0);
  const managementTypes = new Set(['CEO', 'CFO', 'Founder', 'Director', 'Management', 'Major Shareholder', 'Affiliated Entity', 'Treasury Related']);
  const managementControlledShares = sumWhere(holding => managementTypes.has(holding.holderType));
  const tokenizedShares = sumWhere(isTokenized);
  const strategicLockedShares = sumWhere(holding => !isTradable(holding) || holding.holderType === 'Strategic Investor' || holding.holderType === 'Friendly Holder' || holding.holderType === 'Friendly Long-Term Holder');
  const unavailableForTradingShares = sumWhere(holding => !isTradable(holding));
  const unavailableForLendingShares = sumWhere(holding => !isTokenized(holding) && !isLendable(holding));
  const estimatedRealTradableFloat = Math.max(0, base.officialFreeFloat - unavailableForTradingShares);
  const estimatedRealLendableFloat = Math.max(0, base.officialFreeFloat - unavailableForLendingShares - tokenizedShares);
  const adjustedShortInterestRealFloat = estimatedRealTradableFloat ? (base.officialShortInterestShares / estimatedRealTradableFloat) * 100 : 0;
  const adjustedShortInterestLendableFloat = estimatedRealLendableFloat ? (base.officialShortInterestShares / estimatedRealLendableFloat) * 100 : 0;
  const floatReductionPercent = base.officialFreeFloat ? ((base.officialFreeFloat - estimatedRealTradableFloat) / base.officialFreeFloat) * 100 : 0;
  const lendingPoolReductionPercent = base.officialFreeFloat ? ((base.officialFreeFloat - estimatedRealLendableFloat) / base.officialFreeFloat) * 100 : 0;
  const internalAdjustedSqueezeScore = Math.max(0, Math.min(100, Math.round(58 + adjustedShortInterestRealFloat * 3.2 + lendingPoolReductionPercent * 0.45)));

  return {
    ...base,
    managementControlledShares,
    strategicLockedShares,
    tokenizedShares,
    unavailableForTradingShares,
    unavailableForLendingShares,
    estimatedRealTradableFloat,
    estimatedRealLendableFloat,
    adjustedShortInterestRealFloat,
    adjustedShortInterestLendableFloat,
    floatReductionPercent,
    lendingPoolReductionPercent,
    internalSqueezeRiskAdjustment: internalAdjustedSqueezeScore >= 80 ? 'High' : internalAdjustedSqueezeScore >= 65 ? 'Elevated' : 'Watch',
    internalAdjustedSqueezeScore,
  };
}

function normalizeHolding(row: ManualHolding): ManualHolding {
  if (!isTokenized(row)) return row;
  return {
    ...row,
    holderType: 'Tokenized Shares',
    tradabilityStatus: 'Not Available for Trading',
    lendingAvailability: 'Not Available for Lending',
    tokenizationStatus: row.tokenizationStatus === 'Not Tokenized' ? 'Tokenized' : row.tokenizationStatus,
  };
}

function newRow(): ManualHolding {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `manual-${Date.now()}`;
  return {
    id,
    holderName: 'New Holder',
    holderType: 'Other',
    accountType: 'Other',
    brokerCustodian: '',
    numberOfShares: 0,
    tradabilityStatus: 'Freely Tradable',
    lendingAvailability: 'Unknown',
    tokenizationStatus: 'Not Tokenized',
    lockUpStatus: 'No Lock-up',
    confidenceLevel: 'Medium',
    sourceType: 'Internal Estimate',
    notes: '',
  };
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="terminal-card terminal-stat"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function DonutChart({ segments }: { segments: ChartSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  let cursor = 0;
  const gradient = segments.map(segment => {
    const start = cursor;
    cursor += (segment.value / total) * 100;
    return `${segment.color} ${start}% ${cursor}%`;
  }).join(', ');

  return (
    <div className="float-donut-layout">
      <div className="float-donut" style={{ background: `conic-gradient(${gradient})` }}>
        <div aria-hidden="true" />
      </div>
      <div className="float-legend">
        {segments.map(segment => (
          <div key={segment.label}>
            <span><i style={{ background: segment.color }} />{segment.label}</span>
            <strong>{formatNumber(segment.value)} <small>{formatPercent(pct(segment.value, total))}</small></strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreComparison({ publicScore, internalScore }: { publicScore: number; internalScore: number }) {
  const amplification = internalScore - publicScore;
  return (
    <div className="score-amplifier">
      <div>
        <span>Public</span>
        <strong>{publicScore}</strong>
        <i style={{ height: `${publicScore}%` }} />
      </div>
      <div className="amplifier-delta">
        <span>Risk Amplification</span>
        <strong>{amplification >= 0 ? `+${amplification}` : amplification}</strong>
      </div>
      <div className="internal">
        <span>Internal</span>
        <strong>{internalScore}</strong>
        <i style={{ height: `${internalScore}%` }} />
      </div>
    </div>
  );
}

function SelectCell({ value, options, onChange, disabled = false }: { value: string; options: string[]; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <select className="select internal-float-select" value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function HeaderLabel({ label, help }: { label: string; help?: string }) {
  return <span className="internal-table-header-label">{label}{help && <InfoTooltip text={help} />}</span>;
}

export function InternalFloatClient({ initialHoldings, initialAdjustments, analysisSummary, riskNotes }: Props) {
  const [holdings, setHoldings] = useState(initialHoldings.map(normalizeHolding));
  const [savedMessage, setSavedMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingRows, setEditingRows] = useState<Record<string, boolean>>({});
  const adjustments = useMemo(() => calculate(holdings, initialAdjustments), [holdings, initialAdjustments]);

  const tokenizedShares = adjustments.tokenizedShares;
  const nonTradableShares = holdings
    .filter(row => !isTokenized(row) && !isTradable(row))
    .reduce((sum, row) => sum + numeric(row.numberOfShares), 0);
  const tradableMarketFloat = adjustments.estimatedRealTradableFloat;
  const chartTradableMarketFloat = Math.max(0, adjustments.officialFreeFloat - tokenizedShares - nonTradableShares);
  const publicScore = 72;

  const floatSegments = [
    { label: 'Tokenized', value: tokenizedShares, color: '#8b5cf6' },
    { label: 'Non-Tradable', value: nonTradableShares, color: '#e11d48' },
    { label: 'Tradable Market Float', value: chartTradableMarketFloat, color: '#16a34a' },
  ];
  const lendableShares = Math.max(0, adjustments.estimatedRealLendableFloat);
  const nonLendableShares = holdings
    .filter(row => !isTokenized(row) && !isLendable(row))
    .reduce((sum, row) => sum + numeric(row.numberOfShares), 0);
  const officialShortInterestOfLendableShares = adjustments.officialFreeFloat
    ? (adjustments.officialShortInterestShares / adjustments.officialFreeFloat) * 100
    : 0;
  const lendingSegments = [
    { label: 'Lendable', value: lendableShares, color: '#16a34a' },
    { label: 'Non-Lendable', value: nonLendableShares, color: '#e11d48' },
    { label: 'Tokenized', value: tokenizedShares, color: '#8b5cf6' },
  ];

  function updateRow(id: string, patch: Partial<ManualHolding>) {
    setHoldings(current => current.map(row => row.id === id ? normalizeHolding({ ...row, ...patch }) : row));
    setSavedMessage('');
  }

  function updateHolderType(row: ManualHolding, holderType: string) {
    updateRow(row.id, holderType === 'Tokenized Shares'
      ? {
        holderType,
        tradabilityStatus: 'Not Available for Trading',
        lendingAvailability: 'Not Available for Lending',
        tokenizationStatus: 'Tokenized',
      }
      : {
        holderType,
        tradabilityStatus: row.tradabilityStatus === 'Not Available for Trading' ? 'Freely Tradable' : row.tradabilityStatus,
        lendingAvailability: row.lendingAvailability === 'Not Available for Lending' ? 'Unknown' : row.lendingAvailability,
        tokenizationStatus: 'Not Tokenized',
      });
  }

  function toggleTradable(row: ManualHolding, checked: boolean) {
    updateRow(row.id, {
      tradabilityStatus: checked ? 'Freely Tradable' : 'Not Available for Trading',
      lockUpStatus: checked ? 'No Lock-up' : row.lockUpStatus,
    });
  }

  function toggleLendable(row: ManualHolding, checked: boolean) {
    updateRow(row.id, { lendingAvailability: checked ? 'Available for Lending' : 'Not Available for Lending' });
  }

  async function saveChanges(action?: 'reset') {
    setIsSaving(true);
    setSavedMessage('');
    try {
      const response = await fetch('/api/internal-float', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'reset' ? { action: 'reset' } : { holdings }),
      });
      if (!response.ok) throw new Error(`Save failed with status ${response.status}`);
      const payload = await response.json();
      if (payload.holdings) setHoldings(payload.holdings.map(normalizeHolding));
      setSavedMessage(action === 'reset' ? 'Demo data restored.' : 'Changes saved.');
    } catch {
      setSavedMessage('Save failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section className="terminal-section internal-float-intro">
        <div className="terminal-section__head">
          <div>
            <span>Internal Management Input</span>
            <h2>Why This Page Exists</h2>
          </div>
          {sourceChip('Internal Management Input')}
        </div>
        <div className="terminal-card internal-float-intro-card">
          <p>
            This page lets CEOs, CFOs, founders, controlling shareholders, and management enter private shareholding information that public market data may not show.
          </p>
          <p>
            Use it for shares held through nominee accounts, affiliated entities, locked accounts, friendly long-term holders, treasury-related structures, or tokenized share arrangements. The system uses those inputs to estimate real tradable float, real lendable float, adjusted short interest, and internal squeeze risk.
          </p>
        </div>
      </section>

      <section className="terminal-section float-hero-section">
        <div className="terminal-section__head">
          <div>
            <span>Section 1</span>
            <h2>Float Structure Overview</h2>
          </div>
          {sourceChip('Public Market Data + Internal Management Input')}
        </div>
        <div className="grid cols-4">
          <MetricCard label="Official Float" value={formatNumber(adjustments.officialFreeFloat)} detail="Public market view" />
          <MetricCard label="Real Tradable Float" value={formatNumber(tradableMarketFloat)} detail={`${formatPercent(adjustments.floatReductionPercent)} reduction`} />
          <MetricCard label="Real Lending Pool" value={formatNumber(lendableShares)} detail={`${formatPercent(adjustments.lendingPoolReductionPercent)} reduction`} />
          <MetricCard label="Internal Squeeze Risk" value={adjustments.internalSqueezeRiskAdjustment} detail={`Score ${adjustments.internalAdjustedSqueezeScore}/100`} />
        </div>
        <div className="internal-float-dual-charts">
          <div className="terminal-card float-hero-card">
            <h3>Float Structure Overview</h3>
            <DonutChart segments={floatSegments} />
          </div>
          <div className="terminal-card float-hero-card">
            <h3>Lending Pool Analysis</h3>
            <DonutChart segments={lendingSegments} />
          </div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 2</span><h2>Official vs Internal View</h2></div>{sourceChip('Public Market Data + Internal Management Input')}</div>
        <div className="comparison-grid executive-comparison-grid">
          <div className="terminal-card comparison-card">
            <h3>Public Market View</h3>
            <p><span>Official Float</span><strong>{formatNumber(adjustments.officialFreeFloat)}</strong></p>
            <p><span>Official SI %</span><strong>{formatPercent(adjustments.officialShortInterestPercentFloat)}</strong></p>
            <p><span>Official Lendable Shares</span><strong>{formatNumber(adjustments.officialFreeFloat)}</strong></p>
            <p><span>Official SI% of Lendable Shares</span><strong>{formatPercent(officialShortInterestOfLendableShares)}</strong></p>
          </div>
          <div className="terminal-card comparison-card internal">
            <h3>Internal Management View</h3>
            <p><span>Adjusted Float</span><strong>{formatNumber(tradableMarketFloat)}</strong></p>
            <p><span>Adjusted SI %</span><strong>{formatPercent(adjustments.adjustedShortInterestRealFloat)}</strong></p>
            <p><span>Adjusted Lendable Shares</span><strong>{formatNumber(lendableShares)}</strong></p>
            <p><span>Adjusted SI% of Lendable Shares</span><strong>{formatPercent(adjustments.adjustedShortInterestLendableFloat)}</strong></p>
          </div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 3</span><h2>Tokenization Impact</h2></div>{sourceChip('Internal Management Input')}</div>
        <div className="grid cols-2">
          <div className="terminal-card tokenization-card">
            <DonutChart segments={[
              { label: 'Tokenized Shares', value: tokenizedShares, color: '#8b5cf6' },
              { label: 'Remaining Official Float', value: Math.max(0, adjustments.officialFreeFloat - tokenizedShares), color: '#dbe6f3' },
            ]} />
          </div>
          <div className="grid cols-2 compact-kpi-grid">
            <MetricCard label="Tokenized Shares" value={formatNumber(tokenizedShares)} detail="Type = Tokenized Shares" />
            <MetricCard label="Tokenized % Outstanding" value={formatPercent(pct(tokenizedShares, adjustments.officialSharesOutstanding))} detail="System calculated" />
            <MetricCard label="Tokenized % Float" value={formatPercent(pct(tokenizedShares, adjustments.officialFreeFloat))} detail="System calculated" />
            <MetricCard label="Lending Pool Reduction" value={formatPercent(adjustments.lendingPoolReductionPercent)} detail="Estimated impact" />
          </div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 4</span><h2>Squeeze Risk Amplifier</h2></div>{sourceChip('Internal Model')}</div>
        <div className="terminal-card">
          <ScoreComparison publicScore={publicScore} internalScore={adjustments.internalAdjustedSqueezeScore} />
        </div>
      </section>

      <section className="terminal-section holdings-detail-section">
        <div className="terminal-section__head">
          <div>
            <span>Manual Inputs</span>
            <h2>Holdings Detail</h2>
          </div>
          <div className="internal-float-actions">
            {savedMessage && <small>{savedMessage}</small>}
            <button className="button" type="button" disabled={isSaving} onClick={() => saveChanges()}>{isSaving ? 'Saving...' : 'Save changes'}</button>
            <button className="button ghost" type="button" disabled={isSaving} onClick={() => saveChanges('reset')}>Reset demo data</button>
          </div>
        </div>
        <div className="internal-float-table-wrap compact">
          <div className="compact-holdings-toolbar">
            <button className="button secondary" type="button" onClick={() => {
              const row = newRow();
              setHoldings(current => [...current, row]);
              setEditingRows(current => ({ ...current, [row.id]: true }));
            }}>Add holder</button>
            <p>Enter only what management knows. The system calculates float, lending, and squeeze impact.</p>
          </div>
          <table className="table internal-float-table compact">
            <thead>
              <tr>
                <th>Holder</th>
                <th><HeaderLabel label="Type" help="Classifies the relationship between the holder and the company. Use Tokenized Shares when applicable." /></th>
                <th><HeaderLabel label="Shares" help="Number of shares controlled by this holder." /></th>
                <th><HeaderLabel label="Source" help="Where this ownership information originated." /></th>
                <th><HeaderLabel label="Is Tradable" help="Checked means these shares are realistically available for public trading." /></th>
                <th><HeaderLabel label="Is Lendable" help="Checked means these shares may be borrowed by short sellers." /></th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map(row => {
                const tokenized = isTokenized(row);
                const isEditing = Boolean(editingRows[row.id]);
                return (
                  <tr key={row.id}>
                    <td><input className="input" value={row.holderName} disabled={!isEditing} onChange={event => updateRow(row.id, { holderName: event.target.value })} /></td>
                    <td><SelectCell value={row.holderType === 'Tokenized Holder' ? 'Tokenized Shares' : row.holderType} options={holderTypeOptions} disabled={!isEditing} onChange={value => updateHolderType(row, value)} /></td>
                    <td><input className="input numeric-input" type="number" value={row.numberOfShares} disabled={!isEditing} onChange={event => updateRow(row.id, { numberOfShares: Number(event.target.value) })} /></td>
                    <td><SelectCell value={row.sourceType ?? 'Internal Estimate'} options={sourceTypeOptions} disabled={!isEditing} onChange={value => updateRow(row.id, { sourceType: value })} /></td>
                    <td><label className="toggle-cell boolean-cell" title={tokenized ? 'Tokenized shares are treated as not tradable.' : 'Check if tradable'}><input type="checkbox" aria-label="Is tradable" checked={!tokenized && isTradable(row)} disabled={!isEditing || tokenized} onChange={event => toggleTradable(row, event.target.checked)} /></label></td>
                    <td><label className="toggle-cell boolean-cell" title={tokenized ? 'Tokenized shares are treated as not lendable.' : 'Check if lendable'}><input type="checkbox" aria-label="Is lendable" checked={!tokenized && isLendable(row)} disabled={!isEditing || tokenized} onChange={event => toggleLendable(row, event.target.checked)} /></label></td>
                    <td className="row-actions-cell">
                      <button className="button secondary" type="button" onClick={() => setEditingRows(current => ({ ...current, [row.id]: !isEditing }))}>{isEditing ? 'Done' : 'Edit'}</button>
                      {isEditing && <button className="button ghost" type="button" onClick={() => setHoldings(current => current.filter(item => item.id !== row.id))}>Delete</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 5</span><h2>AI Executive Analysis</h2></div>{sourceChip('Internal Management Input')}</div>
        <div className="terminal-card internal-analysis-card executive-analysis-card">
          <p>{analysisSummary}</p>
          <p>Management inputs indicate that a significant portion of the reported float may not be available for trading or securities lending. After adjusting for internally controlled holdings and tokenized shares, the estimated tradable float is {formatNumber(tradableMarketFloat)}, compared with the official float of {formatNumber(adjustments.officialFreeFloat)}.</p>
          <p>As a result, short interest as a percentage of real float may be substantially higher than public data suggests: {formatPercent(adjustments.officialShortInterestPercentFloat)} officially versus {formatPercent(adjustments.adjustedShortInterestRealFloat)} on the internal tradable-float estimate.</p>
          <ul>
            {riskNotes.map(note => <li key={note}>{note}</li>)}
            <li>For internal analysis only. This does not constitute legal, investment, or regulatory advice.</li>
          </ul>
        </div>
      </section>

      <section className="terminal-section disclaimer-section">
        <div className="terminal-card warning-card">
          <h3>Internal Estimate Disclaimer</h3>
          <p>This analysis is based on manual inputs provided by company management. These inputs may not be publicly verifiable and should be treated as internal estimates only. This page does not constitute legal, investment, or regulatory advice.</p>
        </div>
      </section>
    </>
  );
}
