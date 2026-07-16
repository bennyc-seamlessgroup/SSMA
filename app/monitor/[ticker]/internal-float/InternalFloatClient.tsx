'use client';

import { InfoTooltip } from '@/components/InfoTooltip';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { authenticatedFetch, getCurrentUser } from '@/lib/auth-client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { FloatAdjustments, InternalFloatUserInput, ManualHolding } from '@/lib/internal-float-types';
import {
  buildInternalFloatActivity,
  type InternalFloatActivityItem,
} from '@/lib/internal-float-audit';

type OwnershipData = {
  sharesOutstanding: number;
  institutionShares: number;
  publicFloat: number;
};

export type InstitutionalOwnershipOverview = {
  shares_outstanding?: number | string | null;
  public_float_shares?: number | string | null;
  institutional_shares_long?: number | string | null;
  insider_shares_long?: number | string | null;
};

export type InsiderSuggestionSource = {
  id?: string;
  name?: string;
  holderName?: string;
  shares: number | string;
  action?: 'add' | 'deduct';
  category?: string;
  notes?: string;
  effectiveDate?: string | null;
  showInOwnership?: boolean;
  showAsSuggestion?: boolean;
  autoApply?: boolean;
  status?: 'pending' | 'applied' | 'discarded';
  latestFileDate?: string | null;
  latestEffectiveDate?: string | null;
  formType?: string | null;
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
type TokenizationReminder = {
  summary: string;
  message: string;
};

const colors = ['#2453a6', '#0f8a6a', '#d89018', '#6f7bd9', '#8896a8', '#c2415b'];
const privateCategories = ['Founder', 'CEO', 'Management', 'Insider', 'Strategic Investor', 'Family Office', 'Long-Term Holder', 'Transfer Agent', 'Other'];
const tokenizationProviderOptions = ['Securitize', 'xStocks', 'Ondo', 'bStocks'];
const protocolOptions = ['Aave', 'Euler', 'Kamino', 'Morpho'];
const userInputSections: Record<Exclude<EditPanel, null>, 'privateHoldings' | 'tokenChains' | 'collateralChains'> = {
  private: 'privateHoldings',
  tokenized: 'tokenChains',
  collateral: 'collateralChains',
};

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown, options?: Intl.NumberFormatOptions) {
  return numeric(value).toLocaleString('en-US', options);
}

function shareInputValue(value: number) {
  return value === 0 ? '' : formatNumber(value);
}

function compact(value: number) {
  return value.toLocaleString('en-US', { notation: 'compact', minimumFractionDigits: Math.abs(value) >= 1_000 ? 2 : 0, maximumFractionDigits: Math.abs(value) >= 1_000 ? 2 : 0 });
}

function pct(part: number, total: number) {
  return total ? (part / total) * 100 : 0;
}

function formatPct(value: number) {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

function rowSignature(row: unknown) {
  return JSON.stringify(row);
}

function rowsMatch(left: unknown[], right: unknown[]) {
  const canonicalize = (row: unknown) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
    return Object.fromEntries(Object.entries(row as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)));
  };
  return JSON.stringify(left.map(canonicalize)) === JSON.stringify(right.map(canonicalize));
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatActivityTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function sectionLabel(panel: Exclude<EditPanel, null>) {
  if (panel === 'private') return 'Management / Strategic';
  if (panel === 'tokenized') return 'Tokenized Shares';
  return 'Collateralized Shares';
}

function diffRows<T extends { id: string }>(before: T[], after: T[]) {
  const beforeMap = new Map(before.map(row => [row.id, row]));
  const afterMap = new Map(after.map(row => [row.id, row]));
  const added = after.filter(row => !beforeMap.has(row.id)).length;
  const deleted = before.filter(row => !afterMap.has(row.id)).length;
  const updated = after.filter(row => {
    const previous = beforeMap.get(row.id);
    return previous ? rowSignature(previous) !== rowSignature(row) : false;
  }).length;
  return { added, deleted, updated, changed: added + deleted + updated };
}

function describeDiff(diff: { added: number; deleted: number; updated: number }) {
  const parts = [
    diff.added ? `${diff.added} added` : '',
    diff.deleted ? `${diff.deleted} deleted` : '',
    diff.updated ? `${diff.updated} updated` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'No row changes';
}

function seedOwnership(holdings: ManualHolding[], adjustments: FloatAdjustments, institutionalOverview?: InstitutionalOwnershipOverview): OwnershipData {
  const institutionTypes = new Set(['Major Shareholder', 'Strategic Investor', 'Friendly Holder', 'Friendly Long-Term Holder']);
  const sharesOutstanding = numeric(institutionalOverview?.shares_outstanding) || numeric(adjustments.officialSharesOutstanding);
  const publicFloat = numeric(institutionalOverview?.public_float_shares) || numeric(adjustments.officialFreeFloat);
  const institutionShares = numeric(institutionalOverview?.institutional_shares_long) || holdings.filter(row => institutionTypes.has(row.holderType)).reduce((sum, row) => sum + numeric(row.numberOfShares), 0);
  return { sharesOutstanding, institutionShares, publicFloat };
}

function normalizedHolderName(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function sourceSuggestionId(row: InsiderSuggestionSource) {
  if (row.id) return row.id;
  const holder = normalizedHolderName(row.holderName ?? row.name ?? 'holder').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'holder';
  return `${holder}:${row.action ?? 'add'}:${numeric(row.shares)}:${row.effectiveDate ?? row.latestEffectiveDate ?? row.latestFileDate ?? ''}`;
}

function privateHoldingId(row: InsiderSuggestionSource) {
  const holder = normalizedHolderName(row.holderName ?? row.name ?? 'holder').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'holder';
  return `management-suggestion-${holder}-${sourceSuggestionId(row)}`;
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

  return rows;
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
    <div className={bare ? 'internal-float-story-card internal-float-embedded-panel' : 'terminal-card internal-float-story-card'}>
      <h3>{title}</h3>
      <div className="internal-float-donut-story">
        <div className="float-donut" style={{ background: `conic-gradient(${gradient})` }}>
          {segmentLabels.map((row, index) => row.percent >= 3 && (
            <span
              key={`${row.label}-${index}-${row.start}-${row.end}-pct`}
              className="float-donut__pct"
              style={{ left: `${row.x}%`, top: `${row.y}%` }}
            >
              {formatPct(row.percent)}
            </span>
          ))}
          <div><strong>{center}</strong><span>Total</span></div>
        </div>
        <div className="internal-float-value-legend">
          {segments.map((row, index) => (
            <div key={`${row.label}-${index}`}>
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
    <div className={`internal-float-ranked-bars ${showExtra ? 'has-extra' : ''}`}>
      {sorted.map((row, index) => (
        <div key={row.key ?? `${row.label}-${index}`}>
          <span>{row.label}</span>
          <div className="internal-float-ranked-meter">
            <div><i style={{ width: `${Math.max(4, (row.value / max) * 100)}%`, background: colors[index % colors.length] }} /></div>
            <small>{formatPct(pct(row.value, total))}</small>
          </div>
          <strong className="internal-float-ranked-value">
            <b>{formatNumber(row.value)}</b>
          </strong>
          {showExtra && row.extra && <em>{row.extra}</em>}
        </div>
      ))}
    </div>
  );
}

function Waterfall({
  sharesOutstanding,
  institutionShares,
  privateShares,
  tokenizedShares,
  collateralizedShares,
  realTradableFloat,
}: {
  sharesOutstanding: number;
  institutionShares: number;
  privateShares: number;
  tokenizedShares: number;
  collateralizedShares: number;
  realTradableFloat: number;
}) {
  const rows = [
    { label: 'Issued Share', value: sharesOutstanding, className: '' },
    { label: 'Institutions', value: -institutionShares, className: 'down' },
    { label: 'Management / Strategic', value: -privateShares, className: 'down' },
    { label: 'Tokenized Shares', value: -tokenizedShares, className: 'down' },
    { label: 'Collateralized Shares', value: -collateralizedShares, className: 'down' },
    { label: 'Real Tradable Float', value: realTradableFloat, className: 'end' },
  ];
  return (
    <div className="terminal-card internal-float-waterfall">
      {rows.map(row => (
        <div key={row.label} className={row.className}>
          <span className={row.label === 'Real Tradable Float' ? 'with-info' : ''}>
            {row.label}
            {row.label === 'Real Tradable Float' && (
              <InfoTooltip text="Estimated shares that may realistically trade after deducting institutions and accepted internal management/strategic, tokenized, and collateralized holdings from issued shares." />
            )}
          </span>
          <strong>{row.value < 0 ? '-' : ''}{compact(Math.abs(row.value))}</strong>
          <small>{formatPct(pct(Math.abs(row.value), sharesOutstanding))} of issued shares</small>
        </div>
      ))}
    </div>
  );
}

export function InternalFloatClient({
  ticker,
  initialHoldings,
  initialAdjustments,
  initialUserInputs,
  institutionalOverview,
  insiderSuggestionSources = [],
  demoMode = false,
}: {
  ticker: string;
  initialHoldings: ManualHolding[];
  initialAdjustments: FloatAdjustments;
  initialUserInputs: InternalFloatUserInput;
  institutionalOverview?: InstitutionalOwnershipOverview;
  insiderSuggestionSources?: InsiderSuggestionSource[];
  demoMode?: boolean;
}) {
  const [editPanel, setEditPanel] = useState<EditPanel>(null);
  const [ownership] = useState<OwnershipData>(() => seedOwnership(initialHoldings, initialAdjustments, institutionalOverview));
  const [privateHoldings, setPrivateHoldings] = useState<PrivateHolding[]>(() => initialUserInputs.privateHoldings);
  const [custodyRows, setCustodyRows] = useState<CustodyRow[]>(() => initialUserInputs.custodyRows);
  const [tokenChains, setTokenChains] = useState<TokenChain[]>(() => initialUserInputs.tokenChains);
  const [collateralChains, setCollateralChains] = useState<CollateralChain[]>(() => initialUserInputs.collateralChains);
  const [savedPrivateHoldings, setSavedPrivateHoldings] = useState<PrivateHolding[]>(() => initialUserInputs.privateHoldings);
  const [savedTokenChains, setSavedTokenChains] = useState<TokenChain[]>(() => initialUserInputs.tokenChains);
  const [savedCollateralChains, setSavedCollateralChains] = useState<CollateralChain[]>(() => initialUserInputs.collateralChains);
  const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');
  const [apiMessage, setApiMessage] = useState('');
  const [activityLog, setActivityLog] = useState<InternalFloatActivityItem[]>(() => initialUserInputs.activityLog ?? []);
  const [expandedPrivateNotes, setExpandedPrivateNotes] = useState<string[]>([]);
  const [tokenizationReminder, setTokenizationReminder] = useState<TokenizationReminder | null>(null);
  const [resolvedSuggestionIds, setResolvedSuggestionIds] = useState<string[]>([]);
  const [suggestionActionId, setSuggestionActionId] = useState<string | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState<InsiderSuggestionSource | null>(null);

  async function workspaceInputsRequest(
    section?: 'privateHoldings' | 'tokenChains' | 'collateralChains',
    rows?: unknown[],
  ) {
    const endpoint = `/manual-input/internal-float-inputs?ticker=${encodeURIComponent(ticker)}`;
    const raw = await authenticatedFetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify({
        managementStrategicHoldings: { records: section === 'privateHoldings' ? rows : privateHoldings },
        tokenizedShares: { records: section === 'tokenChains' ? rows : tokenChains },
        collateralizedShares: { records: section === 'collateralChains' ? rows : collateralChains },
      }),
    }) as Record<string, unknown>;
    const management = raw.managementStrategicHoldings as { records?: PrivateHolding[] } | undefined;
    const tokenized = raw.tokenizedShares as { records?: TokenChain[] } | undefined;
    const collateralized = raw.collateralizedShares as { records?: CollateralChain[] } | undefined;
    return {
      userId: `workspace:${ticker}`,
      workspaceId: ticker,
      ticker,
      privateHoldings: management?.records ?? [],
      custodyRows: [],
      tokenChains: tokenized?.records ?? [],
      collateralChains: collateralized?.records ?? [],
      activityLog: Array.isArray(raw.auditLog) ? raw.auditLog as InternalFloatActivityItem[] : [],
    };
  }

  const privateShares = privateHoldings.filter(row => row.includeInDeduction).reduce((sum, row) => sum + numeric(row.shares), 0);
  const tokenizedShares = tokenChains.reduce((sum, row) => sum + row.shares, 0);
  const collateralizedShares = collateralChains.reduce((sum, row) => sum + row.shares, 0);
  const privateFloatShares = privateShares;
  const internalFloatShares = privateFloatShares + tokenizedShares + collateralizedShares;
  const floatBeforeInternalAdjustments = Math.max(0, ownership.sharesOutstanding - ownership.institutionShares);
  const realTradableFloat = Math.max(0, ownership.sharesOutstanding - ownership.institutionShares - internalFloatShares);
  const floatReductionPercent = pct(internalFloatShares, floatBeforeInternalAdjustments);

  const ownershipSegments = [
    { label: 'Institutions', value: ownership.institutionShares, color: colors[1] },
    { label: 'Real Tradable Float', value: realTradableFloat, color: colors[2] },
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

  const availableInsiderSuggestions = insiderSuggestionSources.filter(row => {
      const holderName = row.holderName ?? row.name;
      if (!holderName?.trim() || numeric(row.shares) <= 0) return false;
      if (row.status && row.status !== 'pending') return false;
      if (resolvedSuggestionIds.includes(sourceSuggestionId(row))) return false;
      return true;
    });

  function patchPrivate(id: string, patch: Partial<PrivateHolding>) {
    setPrivateHoldings(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  }

  function patchTokenChain(id: string, patch: Partial<TokenChain>) {
    setTokenChains(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  }

  function patchCollateralChain(id: string, patch: Partial<CollateralChain>) {
    setCollateralChains(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  }

  function activityActor() {
    const user = getCurrentUser();
    return String(user?.email || user?.name || user?.nickname || user?.sub || 'Demo user');
  }

  async function updateManagementSuggestionStatus(row: InsiderSuggestionSource, status: 'applied' | 'discarded') {
    if (demoMode || !row.id) return;
    await authenticatedFetch(`/manual-input/management-holdings?ticker=${encodeURIComponent(ticker)}&id=${encodeURIComponent(row.id)}`, {
      method: 'PUT',
      cache: 'no-store',
      body: JSON.stringify({
        ...row,
        ticker,
        holderName: row.holderName ?? row.name ?? 'Unknown holder',
        action: row.action === 'deduct' ? 'deduct' : 'add',
        shares: numeric(row.shares),
        effectiveDate: row.effectiveDate ?? row.latestEffectiveDate ?? row.latestFileDate ?? new Date().toISOString().slice(0, 10),
        autoApply: false,
        status,
        updatedBy: activityActor(),
      }),
    });
  }

  async function dismissInsiderSuggestion(row: InsiderSuggestionSource) {
    const suggestionId = sourceSuggestionId(row);
    setSuggestionActionId(suggestionId);
    try {
      await updateManagementSuggestionStatus(row, 'discarded');
      setResolvedSuggestionIds(current => Array.from(new Set([...current, suggestionId])));
    } finally {
      setSuggestionActionId(null);
    }
  }

  function openSuggestionReview(row: InsiderSuggestionSource) {
    setActiveSuggestion(row);
    setApiStatus('idle');
    setApiMessage('');
  }

  async function applyManagementSuggestion(row: InsiderSuggestionSource, targetId: string) {
    const suggestionId = sourceSuggestionId(row);
    const holderName = (row.holderName ?? row.name ?? 'Unknown holder').trim();
    const action = row.action === 'deduct' ? 'deduct' : 'add';
    const shareDelta = numeric(row.shares);
    const note = [
      row.notes,
      `Operations ${action === 'deduct' ? 'deduction' : 'addition'} suggestion.`,
      row.effectiveDate || row.latestEffectiveDate || row.latestFileDate ? `Effective ${row.effectiveDate ?? row.latestEffectiveDate ?? row.latestFileDate}.` : '',
    ].filter(Boolean).join(' ');
    const nextRows = targetId === '__new__'
      ? [
        ...privateHoldings,
        {
          id: privateHoldingId(row),
          holderName,
          category: row.category || 'Management',
          shares: action === 'deduct' ? 0 : shareDelta,
          includeInDeduction: true,
          notes: note,
        },
      ]
      : privateHoldings.map(holding => {
        if (holding.id !== targetId) return holding;
        return {
          ...holding,
          shares: action === 'deduct'
            ? Math.max(0, numeric(holding.shares) - shareDelta)
            : numeric(holding.shares) + shareDelta,
          notes: [holding.notes, note].filter(Boolean).join(' '),
        };
      });

    setSuggestionActionId(suggestionId);
    setApiStatus('saving');
    setApiMessage('');
    if (demoMode) {
      setPrivateHoldings(nextRows);
      setSavedPrivateHoldings(nextRows);
      setResolvedSuggestionIds(current => Array.from(new Set([...current, suggestionId])));
      setApiStatus('saved');
      setApiMessage(`${holderName} was updated for this demo session. Changes will reset when the page reloads.`);
      setActivityLog(current => [
        ...buildInternalFloatActivity('privateHoldings', privateHoldings, nextRows, activityActor()),
        ...current,
      ]);
      setSuggestionActionId(null);
      setActiveSuggestion(null);
      return;
    }
    try {
      const updated = await workspaceInputsRequest('privateHoldings', nextRows);

      if (!Array.isArray(updated.privateHoldings) || !rowsMatch(updated.privateHoldings, nextRows)) {
        throw new Error('The suggested holding was not confirmed by the server. Please try again.');
      }

      setPrivateHoldings(updated.privateHoldings);
      setSavedPrivateHoldings(updated.privateHoldings);
      setActivityLog(updated.activityLog ?? []);
      await updateManagementSuggestionStatus(row, 'applied');
      setResolvedSuggestionIds(current => Array.from(new Set([...current, suggestionId])));
      setApiStatus('saved');
      setApiMessage(`${holderName} was updated in Management / Strategic Holdings.`);
      setActiveSuggestion(null);
    } catch (error) {
      setApiStatus('error');
      setApiMessage(error instanceof Error ? error.message : 'Unable to apply the suggested holding.');
    } finally {
      setSuggestionActionId(null);
    }
  }

  function addPrivateHolding() {
    const row = { id: id('private'), holderName: '', category: 'Other', shares: 0, includeInDeduction: true, notes: '' };
    setPrivateHoldings(current => [...current, row]);
  }

  function deletePrivateHolding(row: PrivateHolding) {
    setPrivateHoldings(current => current.filter(item => item.id !== row.id));
    setExpandedPrivateNotes(current => current.filter(item => item !== row.id));
  }

  function togglePrivateNotes(rowId: string) {
    setExpandedPrivateNotes(current => current.includes(rowId) ? current.filter(item => item !== rowId) : [...current, rowId]);
  }

  function privateRowError(row: PrivateHolding) {
    if (!row.holderName.trim()) return 'Holder name is required.';
    if (!row.category) return 'Category is required.';
    if (!Number.isFinite(numeric(row.shares)) || numeric(row.shares) < 0) return 'Shares must be non-negative.';
    return '';
  }

  function tokenRowError(row: TokenChain) {
    if (!row.chain.trim()) return 'Chain is required.';
    if (!row.provider) return 'Provider is required.';
    if (!Number.isFinite(numeric(row.shares)) || numeric(row.shares) < 0) return 'Shares must be non-negative.';
    return '';
  }

  function collateralRowError(row: CollateralChain) {
    if (!row.chain.trim()) return 'Chain is required.';
    if (!row.protocol) return 'Protocol is required.';
    if (!Number.isFinite(numeric(row.shares)) || numeric(row.shares) < 0) return 'Shares must be non-negative.';
    return '';
  }

  function addTokenChain() {
    const row = { id: id('token-chain'), chain: `Chain ${tokenChains.length + 1}`, shares: 0, provider: tokenizationProviderOptions[0] };
    setTokenChains(current => [...current, row]);
  }

  function deleteTokenChain(row: TokenChain) {
    setTokenChains(current => current.filter(item => item.id !== row.id));
  }

  function addCollateralChain() {
    const row = { id: id('collateral-chain'), chain: `Chain ${collateralChains.length + 1}`, shares: 0, protocol: protocolOptions[0] };
    setCollateralChains(current => [...current, row]);
  }

  function deleteCollateralChain(row: CollateralChain) {
    setCollateralChains(current => current.filter(item => item.id !== row.id));
  }

  function openEditPanel(panel: Exclude<EditPanel, null>) {
    setApiStatus('idle');
    setApiMessage('');
    setEditPanel(panel);
  }

  function discardEditPanel() {
    if (apiStatus === 'saving') return;

    if (editPanel === 'private') setPrivateHoldings(savedPrivateHoldings);
    if (editPanel === 'tokenized') setTokenChains(savedTokenChains);
    if (editPanel === 'collateral') setCollateralChains(savedCollateralChains);

    setApiStatus('idle');
    setApiMessage('');
    setEditPanel(null);
  }

  function tokenizationReminderFor(diff: { added: number; deleted: number; updated: number }): TokenizationReminder {
    const summary = describeDiff(diff);

    if (diff.added > 0 && diff.deleted === 0 && diff.updated === 0) {
      return {
        summary,
        message: 'If these tokenized shares came from management or strategic holdings, reduce the corresponding holding by the same amount to prevent double counting.',
      };
    }
    if (diff.deleted > 0 && diff.added === 0 && diff.updated === 0) {
      return {
        summary,
        message: 'Review whether the removed tokenized shares should be restored to a related management or strategic holding so the ownership allocation remains complete.',
      };
    }

    return {
      summary,
      message: 'Reconcile the related management and strategic holdings after this change. Shares should appear in only one allocation category to keep the real tradable float accurate.',
    };
  }

  async function saveEditPanel() {
    if (!editPanel) return;
    const savedPanel = editPanel;

    const payload = editPanel === 'private'
      ? privateHoldings
      : editPanel === 'tokenized'
        ? tokenChains
        : collateralChains;

    setApiStatus('saving');
    setApiMessage('');

    const diff = editPanel === 'private'
      ? diffRows(savedPrivateHoldings, privateHoldings)
      : editPanel === 'tokenized'
        ? diffRows(savedTokenChains, tokenChains)
        : diffRows(savedCollateralChains, collateralChains);

    if (editPanel === 'private') {
      const invalidRow = privateHoldings.find(row => privateRowError(row));
      if (invalidRow) {
        setApiStatus('error');
        setApiMessage(privateRowError(invalidRow));
        return;
      }
    }
    if (editPanel === 'tokenized') {
      const invalidRow = tokenChains.find(row => tokenRowError(row));
      if (invalidRow) {
        setApiStatus('error');
        setApiMessage(tokenRowError(invalidRow));
        return;
      }
    }
    if (editPanel === 'collateral') {
      const invalidRow = collateralChains.find(row => collateralRowError(row));
      if (invalidRow) {
        setApiStatus('error');
        setApiMessage(collateralRowError(invalidRow));
        return;
      }
    }

    if (demoMode) {
      if (savedPanel === 'private') setSavedPrivateHoldings([...privateHoldings]);
      if (savedPanel === 'tokenized') setSavedTokenChains([...tokenChains]);
      if (savedPanel === 'collateral') setSavedCollateralChains([...collateralChains]);
      setApiStatus('saved');
      setApiMessage('Demo changes applied for this session only. No data was saved.');
      setEditPanel(null);
      if (diff.changed > 0) {
        const beforeRows = savedPanel === 'private'
          ? savedPrivateHoldings
          : savedPanel === 'tokenized'
            ? savedTokenChains
            : savedCollateralChains;
        setActivityLog(current => [
          ...buildInternalFloatActivity(
            userInputSections[savedPanel],
            beforeRows,
            payload,
            activityActor(),
          ),
          ...current,
        ]);
        if (savedPanel === 'tokenized') setTokenizationReminder(tokenizationReminderFor(diff));
      }
      return;
    }

    try {
      const updated = await workspaceInputsRequest(userInputSections[editPanel], payload);

      const confirmedRows = savedPanel === 'private'
        ? updated.privateHoldings
        : savedPanel === 'tokenized'
          ? updated.tokenChains
          : updated.collateralChains;

      if (!Array.isArray(confirmedRows) || !rowsMatch(confirmedRows, payload)) {
        throw new Error(`The ${sectionLabel(savedPanel).toLowerCase()} records were not confirmed by the server. Your draft remains open; please try saving again.`);
      }

      // Each endpoint replaces only its own array. Preserve unrelated sections even
      // if its response contains stale values for those sections.
      if (savedPanel === 'private') {
        setPrivateHoldings(confirmedRows as PrivateHolding[]);
        setSavedPrivateHoldings(confirmedRows as PrivateHolding[]);
      }
      if (savedPanel === 'tokenized') {
        setTokenChains(confirmedRows as TokenChain[]);
        setSavedTokenChains(confirmedRows as TokenChain[]);
      }
      if (savedPanel === 'collateral') {
        setCollateralChains(confirmedRows as CollateralChain[]);
        setSavedCollateralChains(confirmedRows as CollateralChain[]);
      }

      setApiStatus('saved');
      setApiMessage('Saved. Institutional ownership consolidation will refresh shortly.');
      setActivityLog(updated.activityLog ?? []);
      setEditPanel(null);
      if (diff.changed > 0) {
        if (savedPanel === 'tokenized') setTokenizationReminder(tokenizationReminderFor(diff));
      }
    } catch (error) {
      setApiStatus('error');
      setApiMessage(error instanceof Error ? error.message : 'Unable to save user inputs.');
    }
  }

  function renderActivityLog() {
    return (
      <aside className="terminal-card internal-float-activity-card" aria-label="Internal float activity log">
        <div className="internal-float-activity-list">
          {activityLog.length ? (
            activityLog.map(item => (
              <article key={item.id} className={`internal-float-activity-item ${item.action.toLowerCase()}`}>
                <i aria-hidden="true" />
                <div>
                  <div>
                    <strong>{item.label}</strong>
                    <time>{formatActivityTime(item.createdAt)}</time>
                  </div>
                  <p>{item.section}</p>
                  <small>{item.detail}</small>
                  <small className="internal-float-activity-actor">By {item.actor || 'Unknown user'}</small>
                </div>
              </article>
            ))
          ) : (
            <div className="internal-float-activity-empty">
              <strong>No saved changes yet</strong>
              <p>Saved record changes will appear here after you update an input section.</p>
            </div>
          )}
        </div>
      </aside>
    );
  }

  function renderEditModal() {
    if (!editPanel) return null;

    const titleMap: Record<Exclude<EditPanel, null>, string> = {
      private: 'Edit Management / Strategic Holdings',
      tokenized: 'Edit Tokenized Shares & Providers',
      collateral: 'Edit Collateralized Shares & Protocols',
    };

    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={discardEditPanel}>
        <div className="modal-card internal-float-edit-modal" role="dialog" aria-modal="true" aria-labelledby="internal-float-edit-title" onMouseDown={event => event.stopPropagation()}>
          <div className="modal-card__head">
            <div>
              <h2 id="internal-float-edit-title">{titleMap[editPanel]}</h2>
              <p className="section-subtitle">Manual inputs are used until these values can be auto-detected from production data sources.</p>
            </div>
            <button className="icon-button" type="button" aria-label="Close edit modal and discard unsaved changes" onClick={discardEditPanel}>x</button>
          </div>
          {apiMessage && <p className={`internal-float-api-message ${apiStatus === 'error' ? 'error' : 'success'}`}>{apiMessage}</p>}

          {editPanel === 'private' && (
            <div className="internal-float-holder-editor">
              <div className="internal-float-modal-impact-summary" aria-label="Management strategic holdings impact summary">
                <div><span>Official Float</span><strong>{compact(floatBeforeInternalAdjustments)}</strong></div>
                <div><span>Deducted Holdings</span><strong>{compact(privateShares)}</strong></div>
                <div><span>Estimated Tradable Float</span><strong>{compact(realTradableFloat)}</strong></div>
              </div>
              <div className="internal-float-holder-toolbar">
                <button className="button secondary" type="button" onClick={addPrivateHolding}>+ Add Holder</button>
              </div>
              <div className="internal-float-holder-grid-shell">
                <div className="internal-float-holder-grid" role="table" aria-label="Editable management and strategic holders">
                  <div className="internal-float-holder-grid__header" role="row">
                    <span>Holder</span>
                    <span>Category</span>
                    <span>Shares</span>
                    <span>Float Impact</span>
                    <span>Notes</span>
                    <span>Action</span>
                  </div>
                  {privateHoldings.length === 0 ? (
                    <div className="internal-float-holder-empty">
                      <strong>No strategic holders added yet.</strong>
                      <button className="button secondary" type="button" onClick={addPrivateHolding}>+ Add Holder</button>
                    </div>
                  ) : privateHoldings.map(row => {
                    const error = privateRowError(row);
                    const notesOpen = expandedPrivateNotes.includes(row.id);
                    return (
                      <div className="internal-float-holder-row-group" key={row.id}>
                        <div className={`internal-float-holder-row ${error ? 'invalid' : ''}`} role="row">
                          <label aria-label="Holder">
                            <input className="input" value={row.holderName} placeholder="Holder name" onChange={event => patchPrivate(row.id, { holderName: event.target.value })} />
                          </label>
                          <label aria-label="Category">
                            <select className="select" value={row.category} onChange={event => patchPrivate(row.id, { category: event.target.value })}>
                              {privateCategories.map(category => <option key={category}>{category}</option>)}
                            </select>
                          </label>
                          <label aria-label="Shares">
                            <input
                              className="input numeric-input"
                              inputMode="numeric"
                              value={shareInputValue(row.shares)}
                              placeholder="Enter shares"
                              onChange={event => patchPrivate(row.id, { shares: numeric(event.target.value) })}
                            />
                          </label>
                          <button
                            className={`internal-float-impact-toggle ${row.includeInDeduction ? 'on' : 'off'}`}
                            type="button"
                            aria-pressed={row.includeInDeduction}
                            onClick={() => patchPrivate(row.id, { includeInDeduction: !row.includeInDeduction })}
                          >
                            <i aria-hidden="true" />
                            {row.includeInDeduction ? 'Deduct' : 'Ignore'}
                          </button>
                          <button className={`internal-float-note-toggle ${notesOpen || row.notes ? 'has-note' : ''}`} type="button" onClick={() => togglePrivateNotes(row.id)}>
                            {notesOpen ? 'Hide Note' : row.notes ? 'View Note' : 'Note'}
                          </button>
                          <button className="internal-float-trash-button" type="button" aria-label={`Delete ${row.holderName || 'holder'}`} onClick={() => deletePrivateHolding(row)}>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 8h10l-.8 12H7.8L7 8Z" />
                            </svg>
                          </button>
                        </div>
                        {error && <p className="internal-float-holder-error">{error}</p>}
                        {notesOpen && (
                          <label className="internal-float-holder-notes">
                            <span>Notes</span>
                            <input className="input" value={row.notes} placeholder="Add internal context for this holder..." onChange={event => patchPrivate(row.id, { notes: event.target.value })} />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {editPanel === 'tokenized' && (
            <div className="internal-float-holder-editor">
              <div className="internal-float-modal-impact-summary" aria-label="Tokenized shares impact summary">
                <div><span>Issued Share</span><strong>{compact(ownership.sharesOutstanding)}</strong></div>
                <div><span>Tokenized Shares</span><strong>{compact(tokenizedShares)}</strong></div>
                <div><span>Outstanding Impact</span><strong>{formatPct(pct(tokenizedShares, ownership.sharesOutstanding))}</strong></div>
              </div>
              <div className="internal-float-holder-toolbar">
                <button className="button secondary" type="button" onClick={addTokenChain}>+ Add Chain</button>
              </div>
              <div className="internal-float-holder-grid-shell">
                <div className="internal-float-holder-grid compact" role="table" aria-label="Editable tokenized share rows">
                  <div className="internal-float-holder-grid__header" role="row">
                    <span>Chain</span>
                    <span>Shares</span>
                    <span>Provider</span>
                    <span>Impact</span>
                    <span>Action</span>
                  </div>
                  {tokenChains.length === 0 ? (
                    <div className="internal-float-holder-empty">
                      <strong>No tokenized share rows added yet.</strong>
                      <button className="button secondary" type="button" onClick={addTokenChain}>+ Add Chain</button>
                    </div>
                  ) : tokenChains.map(row => {
                    const error = tokenRowError(row);
                    return (
                      <div className="internal-float-holder-row-group" key={row.id}>
                        <div className={`internal-float-holder-row compact ${error ? 'invalid' : ''}`} role="row">
                          <label aria-label="Chain"><input className="input" value={row.chain} placeholder="Chain" onChange={event => patchTokenChain(row.id, { chain: event.target.value })} /></label>
                          <label aria-label="Shares"><input className="input numeric-input" inputMode="numeric" value={shareInputValue(row.shares)} placeholder="Enter shares" onChange={event => patchTokenChain(row.id, { shares: numeric(event.target.value) })} /></label>
                          <label className="internal-float-provider-field" aria-label="Provider">
                            <select
                              className="select"
                              value={tokenizationProviderOptions.includes(row.provider) ? row.provider : 'Others'}
                              onChange={event => patchTokenChain(row.id, { provider: event.target.value === 'Others' ? '' : event.target.value })}
                            >
                              {tokenizationProviderOptions.map(provider => <option key={provider}>{provider}</option>)}
                              <option value="Others">Others</option>
                            </select>
                            {!tokenizationProviderOptions.includes(row.provider) && (
                              <input
                                className="input"
                                value={row.provider}
                                placeholder="Provider name"
                                onChange={event => patchTokenChain(row.id, { provider: event.target.value })}
                              />
                            )}
                          </label>
                          <span className="internal-float-grid-impact">{formatPct(pct(row.shares, ownership.sharesOutstanding))}</span>
                          <button className="internal-float-trash-button" type="button" aria-label={`Delete ${row.chain || 'chain'}`} onClick={() => deleteTokenChain(row)}>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 8h10l-.8 12H7.8L7 8Z" /></svg>
                          </button>
                        </div>
                        {error && <p className="internal-float-holder-error">{error}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {editPanel === 'collateral' && (
            <div className="internal-float-holder-editor">
              <div className="internal-float-modal-impact-summary" aria-label="Collateralized shares impact summary">
                <div><span>Tokenized Shares</span><strong>{compact(tokenizedShares)}</strong></div>
                <div><span>Collateralized Shares</span><strong>{compact(collateralizedShares)}</strong></div>
                <div><span>Tokenized Impact</span><strong>{formatPct(pct(collateralizedShares, tokenizedShares))}</strong></div>
              </div>
              <div className="internal-float-holder-toolbar">
                <button className="button secondary" type="button" onClick={addCollateralChain}>+ Add Protocol</button>
              </div>
              <div className="internal-float-holder-grid-shell">
                <div className="internal-float-holder-grid compact" role="table" aria-label="Editable collateralized share rows">
                  <div className="internal-float-holder-grid__header" role="row">
                    <span>Chain</span>
                    <span>Shares</span>
                    <span>Protocol</span>
                    <span>Impact</span>
                    <span>Action</span>
                  </div>
                  {collateralChains.length === 0 ? (
                    <div className="internal-float-holder-empty">
                      <strong>No collateralized share rows added yet.</strong>
                      <button className="button secondary" type="button" onClick={addCollateralChain}>+ Add Protocol</button>
                    </div>
                  ) : collateralChains.map(row => {
                    const error = collateralRowError(row);
                    return (
                      <div className="internal-float-holder-row-group" key={row.id}>
                        <div className={`internal-float-holder-row compact ${error ? 'invalid' : ''}`} role="row">
                          <label aria-label="Chain"><input className="input" value={row.chain} placeholder="Chain" onChange={event => patchCollateralChain(row.id, { chain: event.target.value })} /></label>
                          <label aria-label="Shares"><input className="input numeric-input" inputMode="numeric" value={shareInputValue(row.shares)} placeholder="Enter shares" onChange={event => patchCollateralChain(row.id, { shares: numeric(event.target.value) })} /></label>
                          <label aria-label="Protocol"><select className="select" value={row.protocol} onChange={event => patchCollateralChain(row.id, { protocol: event.target.value })}>{protocolOptions.map(protocol => <option key={protocol}>{protocol}</option>)}</select></label>
                          <span className="internal-float-grid-impact">{formatPct(pct(row.shares, tokenizedShares))}</span>
                          <button className="internal-float-trash-button" type="button" aria-label={`Delete ${row.chain || 'chain'}`} onClick={() => deleteCollateralChain(row)}>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 8h10l-.8 12H7.8L7 8Z" /></svg>
                          </button>
                        </div>
                        {error && <p className="internal-float-holder-error">{error}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button className="button secondary" type="button" onClick={discardEditPanel} disabled={apiStatus === 'saving'}>Cancel</button>
            <button className="button primary" type="button" onClick={saveEditPanel} disabled={apiStatus === 'saving'}>
              {apiStatus === 'saving' ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderSuggestionModal() {
    if (!activeSuggestion) return null;
    const suggestionId = sourceSuggestionId(activeSuggestion);
    const saving = suggestionActionId === suggestionId;
    const holderName = activeSuggestion.holderName ?? activeSuggestion.name ?? 'Unknown holder';
    const action = activeSuggestion.action === 'deduct' ? 'deduct' : 'add';

    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={() => !saving && setActiveSuggestion(null)}>
        <div className="modal-card internal-float-suggestion-modal" role="dialog" aria-modal="true" aria-labelledby="internal-float-suggestion-title" onMouseDown={event => event.stopPropagation()}>
          <div className="modal-card__head">
            <div>
              <h2 id="internal-float-suggestion-title">{action === 'deduct' ? 'Deduct from holding' : 'Add to holding'}</h2>
              <p className="section-subtitle">
                Select the existing record to update. Use Add New Record when this entity is not already in the list.
              </p>
            </div>
            <button className="icon-button" type="button" aria-label="Close suggestion modal" onClick={() => setActiveSuggestion(null)} disabled={saving}>x</button>
          </div>
          <div className="internal-float-suggestion-summary">
            <strong>{holderName}</strong>
            <span>{action === 'deduct' ? '-' : '+'}{formatNumber(activeSuggestion.shares)} shares</span>
            <small>{[activeSuggestion.category, activeSuggestion.effectiveDate ?? activeSuggestion.latestEffectiveDate ?? activeSuggestion.latestFileDate].filter(Boolean).join(' · ')}</small>
          </div>
          <div className="internal-float-suggestion-targets" role="radiogroup" aria-label="Select holding target">
            {privateHoldings.map(row => (
              <button
                key={row.id}
                type="button"
                disabled={saving}
                onClick={() => applyManagementSuggestion(activeSuggestion, row.id)}
              >
                <span>{row.holderName}</span>
                <strong>{formatNumber(row.shares)} shares</strong>
                <small>{row.category}</small>
              </button>
            ))}
            {action === 'add' && (
              <button
                type="button"
                disabled={saving}
                onClick={() => applyManagementSuggestion(activeSuggestion, '__new__')}
              >
                <span>Add New Record</span>
                <strong>{holderName}</strong>
                <small>Create a new Management / Strategic holding</small>
              </button>
            )}
          </div>
          <div className="modal-actions">
            <button className="button secondary" type="button" onClick={() => setActiveSuggestion(null)} disabled={saving}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  if (apiStatus === 'loading') {
    return <PortalPageLoading variant="internalFloat" />;
  }

  return (
    <>
      {renderSuggestionModal()}
      {demoMode ? (
        <div className="internal-float-demo-banner" role="note">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4M12 17h.01" /></svg>
          <div>
            <strong>Interactive demonstration</strong>
            <span>All names and values on this page are fictional. You can edit the data, but changes remain in this browser session and are never saved.</span>
          </div>
        </div>
      ) : null}
      <section className="terminal-section float-hero-section">
        <div className="terminal-section__head">
          <div>
            <h2>Executive Summary</h2>
            <p className="section-subtitle">Key float figures and the current reduction from internal share assumptions.</p>
          </div>
        </div>
        {apiStatus === 'error' && apiMessage && !editPanel && <p className="internal-float-api-message error">{apiMessage}</p>}
        {apiStatus === 'saved' && apiMessage && !editPanel && <p className="internal-float-api-message success">{apiMessage}</p>}

        <div className="internal-float-kpis">
          <div className="terminal-card terminal-stat internal-float-formula-stat">
            <span className="with-info">Issued Share → Real Tradable Float <InfoTooltip text="Real tradable float is calculated as issued shares minus institutions and accepted internal float assumptions, including management / strategic, tokenized, and collateralized shares." /></span>
            <div className="internal-float-compact-formula">
              <strong>{compact(ownership.sharesOutstanding)}</strong>
              <em>→</em>
              <strong>{compact(realTradableFloat)}</strong>
            </div>
            <small>Issued share - institutions - internal float</small>
          </div>
          <div className="terminal-card terminal-stat"><span>Float Reduction</span><strong>{formatPct(floatReductionPercent)}</strong><small>-{formatNumber(internalFloatShares)} internal float shares</small></div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><h2>Ownership & Internal Float Breakdown</h2><p className="section-subtitle">Visual breakdown of issued shares, real tradable float, and internal float assumptions.</p></div></div>
        <div className="internal-float-two-col">
          <Donut title="Ownership Structure" center={compact(ownership.sharesOutstanding)} segments={ownershipSegments} />
          <Donut title="Internal Float" center={compact(internalFloatShares)} segments={internalFloatSegments} />
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div><h2>Issued Share vs Real Tradable Float</h2><p className="section-subtitle">Shows each deduction from issued shares used to estimate the real tradable float.</p></div>
        </div>
        <Waterfall
          sharesOutstanding={ownership.sharesOutstanding}
          institutionShares={ownership.institutionShares}
          privateShares={privateShares}
          tokenizedShares={tokenizedShares}
          collateralizedShares={collateralizedShares}
          realTradableFloat={realTradableFloat}
        />
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div><h2>Management / Strategic Holdings</h2><p className="section-subtitle">Internal deduction assumptions used to estimate real tradable float.</p></div>
          <button className="button secondary" type="button" onClick={() => openEditPanel('private')}>Edit</button>
        </div>
        {availableInsiderSuggestions.length > 0 && (
          <div className="internal-float-insider-suggestions" aria-label="Suggested management and strategic holdings">
            <div className="internal-float-insider-suggestions__intro">
              <span>Suggested changes</span>
              <strong>Review management holdings inputs</strong>
              <p>Operations entered these changes for company review. Apply them to the correct Management / Strategic record or discard the suggestion.</p>
            </div>
            <div className="internal-float-insider-suggestions__list">
              {availableInsiderSuggestions.map(row => {
                const suggestionId = sourceSuggestionId(row);
                const saving = suggestionActionId === suggestionId;
                const holderName = row.holderName ?? row.name ?? 'Unknown holder';
                const action = row.action === 'deduct' ? 'deduct' : 'add';
                return (
                  <article key={suggestionId}>
                    <div>
                      <strong>{holderName}</strong>
                      <span>{action === 'deduct' ? '-' : '+'}{formatNumber(row.shares)} shares</span>
                      {(row.category || row.effectiveDate || row.latestEffectiveDate || row.latestFileDate || row.formType) && (
                        <small>{[row.category, row.formType, row.effectiveDate ?? row.latestEffectiveDate ?? row.latestFileDate].filter(Boolean).join(' · ')}</small>
                      )}
                    </div>
                    <div className="internal-float-insider-suggestion-actions">
                      <button className="button primary" type="button" disabled={suggestionActionId !== null} onClick={() => openSuggestionReview(row)}>
                        {saving ? 'Saving...' : action === 'deduct' ? 'Deduct from list' : 'Add to list'}
                      </button>
                      <button className="button ghost" type="button" disabled={suggestionActionId !== null} onClick={() => dismissInsiderSuggestion(row)}>
                        Discard
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
        <div className="terminal-card"><RankedBars showExtra rows={privateHoldings.map(row => ({ key: row.id, label: row.holderName, value: row.shares, extra: `${row.category} · ${row.includeInDeduction ? 'deducted from float' : 'not deducted'}` }))} total={floatBeforeInternalAdjustments} /></div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div><h2>Tokenized Shares & Providers</h2><p className="section-subtitle">Manual tokenized share assumptions grouped by blockchain and provider.</p></div>
          <div className="internal-float-section-actions">
            <button className="button secondary" type="button" onClick={() => openEditPanel('tokenized')}>Edit</button>
          </div>
        </div>
        <div className="terminal-card internal-float-combined-card">
          <div className="internal-float-combined-grid">
            <Donut bare title="Tokenized Chain Allocation" center={compact(tokenizedShares)} segments={tokenSegments} />
            <div className="internal-float-embedded-panel">
              <h3>Tokenization Providers</h3>
              <RankedBars rows={providerRows.map(row => ({ key: row.id, label: row.provider, value: row.shares }))} total={tokenizedShares} />
            </div>
          </div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div><h2>Collateralized Shares & DeFi Exposure</h2><p className="section-subtitle">Shares pledged into DeFi lending protocols as collateral.</p></div>
          <div className="internal-float-section-actions">
            <button className="button secondary" type="button" onClick={() => openEditPanel('collateral')}>Edit</button>
          </div>
        </div>
        <div className="terminal-card internal-float-combined-card">
          <div className="internal-float-combined-grid">
            <Donut bare title="Collateralized Shares by Chain" center={compact(collateralizedShares)} segments={collateralSegments} />
            <div className="internal-float-embedded-panel">
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
        <div className="terminal-section__head">
          <div>
            <div className="internal-float-sample-heading">
              <h2>Traditional Custody Breakdown</h2>
              <span>Sample only</span>
            </div>
            <p className="section-subtitle">Example of the broker and custodian breakdown available after we process your DTC Position Report.</p>
          </div>
          <Link className="button primary" href={`/monitor/${ticker}/internal-float/dtc-upload`}>
            Upload DTC Report
          </Link>
        </div>
        <div className="internal-float-custody-service">
          <div>
            <strong>Managed DTC report processing</strong>
            <p>Upload your report and our operations team will normalize the positions for this workspace.</p>
          </div>
          <div>
            <strong>$100</strong>
            <span>per report</span>
          </div>
        </div>
        <div className="terminal-card internal-float-custody-sample">
          <span className="internal-float-sample-watermark" aria-hidden="true">Sample</span>
          <RankedBars rows={custodyRows.map(row => ({ key: row.id, label: row.name, value: row.shares }))} total={floatBeforeInternalAdjustments} />
        </div>
      </section>

      <section className="terminal-section internal-float-activity-section">
        <div className="terminal-section__head">
          <div>
            <h2>Activity Log</h2>
            <p className="section-subtitle">Permanent audit history for saved workspace input changes.</p>
          </div>
        </div>
        {renderActivityLog()}
      </section>
      {renderEditModal()}
      {tokenizationReminder && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setTokenizationReminder(null)}>
          <div className="modal-card internal-float-reminder-modal" role="alertdialog" aria-modal="true" aria-labelledby="tokenization-reminder-title" onMouseDown={event => event.stopPropagation()}>
            <div className="internal-float-reminder-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 3a7 7 0 0 0-4.3 12.5c.8.6 1.3 1.4 1.3 2.3V19h6v-1.2c0-.9.5-1.7 1.3-2.3A7 7 0 0 0 12 3Zm-3 18h6" /></svg>
            </div>
            <div className="internal-float-reminder-content">
              <span>Tokenized shares saved</span>
              <h2 id="tokenization-reminder-title">Review Related Holdings</h2>
              <strong>{tokenizationReminder.summary}</strong>
              <p>{tokenizationReminder.message}</p>
            </div>
            <div className="modal-actions">
              <button className="button primary" type="button" onClick={() => setTokenizationReminder(null)}>Understood</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
