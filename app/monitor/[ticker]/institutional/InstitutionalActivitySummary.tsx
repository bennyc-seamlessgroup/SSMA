'use client';

import { ApiSourceTags } from '@/components/ApiSourceTags';
import { InfoTooltip } from '@/components/InfoTooltip';
import { formatCompactQuantity, formatExactNumber, portalNumber } from '@/lib/number-format';
import type { ReactNode } from 'react';

export type OwnershipSummaryCurrent = {
  schemaVersion?: number;
  ticker?: string;
  generatedAt?: string;
  snapshotDate?: string;
  sourceWatermarks?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  updatedAt?: string;
  data?: unknown;
  body?: unknown;
  'ownership-summary-current'?: unknown;
  [key: string]: unknown;
};

type SummarySourceRow = {
  formType?: unknown;
  source?: unknown;
  ownerCount?: unknown;
  owners?: unknown;
  shares?: unknown;
  value?: unknown;
  percentShare?: unknown;
  percentShares?: unknown;
};

function unwrapSummaryValue(value: unknown): unknown {
  let current = value;
  const visited = new Set<object>();

  while (current && typeof current === 'object' && !Array.isArray(current)) {
    if (visited.has(current)) break;
    visited.add(current);
    const record = current as Record<string, unknown>;
    const next = record.value ?? record.currentValue ?? record.rawValue ?? record.amount;
    if (next === undefined) break;
    current = next;
  }

  return current;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      return asRecord(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function normalizedFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function hasSummaryValue(value: unknown) {
  return value !== null && value !== undefined && value !== '';
}

function matchesSummaryTarget(candidate: string, targets: Set<string>) {
  return [...targets].some(target => {
    if (candidate === target || candidate.endsWith(target)) return true;
    return ['value', 'currentvalue', 'rawvalue', 'amount'].some(
      suffix => candidate === `${target}${suffix}` || candidate.endsWith(`${target}${suffix}`),
    );
  });
}

function summaryValue(payload: unknown, ...keys: string[]) {
  const targets = new Set(keys.map(normalizedFieldName));
  const queue: Array<{ value: unknown; path: string[] }> = [{ value: payload, path: [] }];
  const visited = new Set<object>();
  let pathMatch: unknown;
  let provenanceMatch: unknown;

  while (queue.length) {
    const candidate = queue.shift()!;
    const candidateValue = candidate.value;
    const current = asRecord(candidateValue);
    if (current) {
      if (visited.has(current)) continue;
      visited.add(current);

      const fieldIdentifier = current.field
        ?? current.fieldName
        ?? current.dataPoint
        ?? current.metric
        ?? current.key;
      const normalizedIdentifier = normalizedFieldName(String(fieldIdentifier ?? ''));
      const candidatePath = normalizedFieldName(candidate.path.join('.'));
      const candidateIsProvenance = candidatePath.includes('fieldprovenance') || candidatePath.includes('provenance');
      if (matchesSummaryTarget(normalizedIdentifier, targets)) {
        const resolved = unwrapSummaryValue(
          current.value ?? current.currentValue ?? current.rawValue ?? current.amount,
        );
        if (hasSummaryValue(resolved)) {
          if (!candidateIsProvenance) return resolved;
          provenanceMatch ??= resolved;
        }
      }

      for (const [key, nested] of Object.entries(current)) {
        const nextPath = [...candidate.path, key];
        const normalizedPath = normalizedFieldName(nextPath.join('.'));
        const isProvenance = normalizedPath.includes('fieldprovenance') || normalizedPath.includes('provenance');
        const resolved = unwrapSummaryValue(nested);
        const normalizedKey = normalizedFieldName(key);
        if (matchesSummaryTarget(normalizedKey, targets) && hasSummaryValue(resolved)) {
          if (!isProvenance) return resolved;
          provenanceMatch ??= resolved;
        }
        if (pathMatch === undefined
          && matchesSummaryTarget(normalizedPath, targets)
          && hasSummaryValue(resolved)) {
          if (isProvenance) provenanceMatch ??= resolved;
          else pathMatch = resolved;
        }
        if (nested && (typeof nested === 'object' || typeof nested === 'string')) {
          queue.push({ value: nested, path: nextPath });
        }
      }
    } else if (Array.isArray(candidateValue)) {
      if (visited.has(candidateValue)) continue;
      visited.add(candidateValue);
      candidateValue.forEach((nested, index) => queue.push({ value: nested, path: [...candidate.path, String(index)] }));
    } else if (typeof candidateValue === 'string') {
      try {
        queue.push({ value: JSON.parse(candidateValue), path: candidate.path });
      } catch {
        // Non-JSON strings cannot contain the structured summary payload.
      }
    }
  }

  return pathMatch ?? provenanceMatch;
}

function summaryNumber(payload: unknown, ...keys: string[]) {
  return portalNumber(summaryValue(payload, ...keys));
}

function summaryRecord(payload: unknown): Record<string, unknown> | null {
  const queue: unknown[] = [payload];
  const visited = new Set<object>();

  while (queue.length) {
    const current = asRecord(queue.shift());
    if (!current || visited.has(current)) continue;
    visited.add(current);
    const summary = asRecord(current.summary);
    if (summary) return summary;
    queue.push(current['ownership-summary-current'], current.data, current.body);
  }

  return null;
}

function directSummaryValue(payload: unknown, key: string, ...aliases: string[]) {
  const summary = summaryRecord(payload);
  if (summary && Object.prototype.hasOwnProperty.call(summary, key)) {
    const value = unwrapSummaryValue(summary[key]);
    if (hasSummaryValue(value)) return value;
  }
  return summaryValue(payload, key, ...aliases);
}

function directSummaryNumber(payload: unknown, key: string, ...aliases: string[]) {
  return portalNumber(directSummaryValue(payload, key, ...aliases));
}

function ownershipSummaryMetadata(value: unknown): Record<string, unknown> {
  let current = asRecord(value);
  const visited = new Set<Record<string, unknown>>();

  while (current && !visited.has(current)) {
    visited.add(current);
    if (current.snapshotDate || current.generatedAt || current.summary) return current;
    current = asRecord(current['ownership-summary-current'])
      ?? asRecord(current.data)
      ?? asRecord(current.body);
  }

  return asRecord(value) ?? {};
}

function exactInteger(value: unknown) {
  return formatExactNumber(value, { maximumFractionDigits: 0 });
}

function exactPercent(value: unknown) {
  const numeric = portalNumber(value);
  return numeric === null
    ? 'N/A'
    : `${numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function thousandsCurrency(value: unknown) {
  const numeric = portalNumber(value);
  return numeric === null
    ? 'N/A'
    : (numeric / 1_000).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

function sourceValueInThousands(value: unknown) {
  const numeric = portalNumber(value);
  return numeric === null
    ? 'N/A'
    : (numeric / 1_000).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

function parseDate(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const timestamp = Date.parse(text.length === 10 ? `${text}T00:00:00Z` : text);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatDate(value: unknown) {
  const timestamp = parseDate(value);
  return timestamp === null
    ? 'N/A'
    : new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(timestamp);
}

function sourceLabel(formType: unknown) {
  const normalized = String(formType ?? '').trim().toUpperCase();
  if (normalized === '13F-HR') return '13F Institutions';
  if (normalized === '13F-HR/A') return '13F Amendments';
  if (normalized.startsWith('NPORT')) return 'NPORT Funds';
  return normalized || 'Other filings';
}

function DirectionValue({ value, direction, formatter = exactInteger }: {
  value: unknown;
  direction?: 'up' | 'down';
  formatter?: (value: unknown) => string;
}) {
  const numeric = portalNumber(value);
  const resolvedDirection = direction ?? (numeric === null || numeric === 0 ? undefined : numeric > 0 ? 'up' : 'down');
  return (
    <strong className={resolvedDirection ? `institutional-activity-value is-${resolvedDirection}` : 'institutional-activity-value'}>
      {resolvedDirection === 'up' ? <span aria-hidden="true">▲</span> : null}
      {resolvedDirection === 'down' ? <span aria-hidden="true">▼</span> : null}
      {formatter(value)}
    </strong>
  );
}

function ActivityHeading({ label, description }: { label: string; description: string }) {
  return <h3 className="with-info">{label}<InfoTooltip text={description} /></h3>;
}

function ActivityMetric({ label, description, children }: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="institutional-activity-metric">
      <span className="with-info">{label}<InfoTooltip text={description} /></span>
      {children}
    </div>
  );
}

function HolderSentimentTooltip({ sentiment }: { sentiment: unknown }) {
  const normalized = String(sentiment ?? '').trim().toLowerCase();
  if (normalized === 'hedged') {
    return <InfoTooltip text="The institution does hold physical shares (buying Calls/Puts as a portfolio insurance/hedging strategy)." />;
  }
  if (normalized === 'directional') {
    return <InfoTooltip text="The institution does not hold any physical shares (making a pure directional speculative bet using options)." />;
  }
  return null;
}

function exposureIndex(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const numeric = portalNumber(value);
  if (numeric !== null) return `▲ ${numeric.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
  return text;
}

export function InstitutionalActivitySummary({
  data,
  ticker,
}: {
  data: OwnershipSummaryCurrent | null;
  ticker: string;
}) {
  const metadata = ownershipSummaryMetadata(data);
  const sourceData = summaryValue(
    data,
    'summary.sourceBreakdown',
    'summary.sources',
    'summary.source',
    'IO_Summary_Source',
  );
  const sourceRows = Array.isArray(sourceData)
    ? sourceData.filter(row => row && typeof row === 'object') as SummarySourceRow[]
    : [];
  const optionsLargestHolder = directSummaryValue(data, 'oeLargetHolder', 'summary.oeLargetHolder')
    ?? directSummaryValue(data, 'oeLargestHolder', 'summary.oeLargestHolder', 'IO_Summary_OE_largest_holder', 'summary.optionsExposure.largestHolder', 'summary.optionsExposureLargestHolder');
  const calls = {
    holders: directSummaryNumber(data, 'oeCount', 'summary.oeCount', 'IO_Summary_OE_count', 'summary.optionsExposure.count', 'summary.optionsExposure.holders', 'summary.optionsExposureCount'),
    shares: directSummaryNumber(data, 'oeShares', 'summary.oeShares', 'IO_Summary_OE_shares', 'summary.optionsExposure.shares', 'summary.optionsExposure.underlyingShares', 'summary.optionsExposureShares'),
    value: directSummaryNumber(data, 'oeValue', 'summary.oeValue', 'IO_Summary_OE_value', 'summary.optionsExposure.value', 'summary.optionsExposure.reportedValue', 'summary.optionsExposureValue'),
    largestHolder: optionsLargestHolder,
    holderTag: directSummaryValue(data, 'oeLargestHolderTag', 'summary.oeLargestHolderTag', 'IO_Summary_OE_largest_holder_tag', 'summary.optionsExposure.largestHolderTag', 'summary.optionsExposure.holderTag', 'summary.optionsExposureLargestHolderTag'),
    index: directSummaryValue(data, 'oeSharesIndex', 'summary.oeSharesIndex', 'IO_Summary_OE_shares_index', 'summary.optionsExposure.sharesIndex', 'summary.optionsExposure.index', 'summary.optionsExposureSharesIndex'),
  };
  const puts = {
    holders: summaryNumber(data, 'IO_Summary_OE_put_count') ?? 0,
    shares: summaryNumber(data, 'IO_Summary_OE_put_shares') ?? 0,
    value: summaryNumber(data, 'IO_Summary_OE_put_value') ?? 0,
    largestHolder: summaryValue(data, 'IO_Summary_OE_put_largest_holder'),
    holderTag: summaryValue(data, 'IO_Summary_OE_put_largest_holder_tag'),
    index: summaryValue(data, 'IO_Summary_OE_put_shares_index'),
  };
  const ratio = directSummaryNumber(data, 'oeHolderPutCallRatio', 'summary.oeHolderPutCallRatio', 'IO_Summary_OE_holder_Put_Call_Ratio', 'summary.optionsExposure.holderPutCallRatio', 'summary.optionsExposure.putCallRatio', 'summary.optionsExposureHolderPutCallRatio');
  const ratioSentiment = String(directSummaryValue(data, 'oeHolderPutCallRatioSentiment', 'summary.oeHolderPutCallRatioSentiment', 'IO_Summary_OE_holder_Put_Call_Ratio_Sentiment', 'summary.optionsExposure.holderPutCallRatioSentiment', 'summary.optionsExposure.putCallRatioSentiment', 'summary.optionsExposureHolderPutCallRatioSentiment') ?? '').trim();

  return (
    <section className="institutional-activity-summary" aria-labelledby="institutional-activity-title">
      <ApiSourceTags sources={[{
        endpoint: `GET /market-data/current?ticker=${encodeURIComponent(ticker)}&category=ownership-summary-current`,
        label: 'Institutional activity summary',
      }]} />
      <header className="institutional-activity-summary__head">
        <div>
          <h2 id="institutional-activity-title">Institutional Activity Summary</h2>
          <p>Based on the latest reported and disclosed 13F, NPORT, and beneficial-ownership filings. Regulatory filings are delayed and do not represent real-time ownership.</p>
        </div>
        <span>As of {formatDate(metadata.snapshotDate ?? metadata.generatedAt)}</span>
      </header>

      <div className="institutional-activity-cards">
        <article>
          <ActivityHeading label="Ownership Flow" description="Summarizes quarterly position adjustments across disclosed institutional holders, showing the net change in total shares and market value." />
          <ActivityMetric label="Buyers" description="Number of institutions that increased their share count during the reporting period."><DirectionValue value={summaryValue(data, 'summary.buyer', 'buyer', 'IO_Summary_Buy')} direction="up" /></ActivityMetric>
          <ActivityMetric label="Sellers" description="Number of institutions that reduced their share count without fully closing the position."><DirectionValue value={summaryValue(data, 'summary.seller', 'seller', 'IO_Summary_Sellers')} direction="down" /></ActivityMetric>
          <ActivityMetric label="Unchanged" description="Number of institutions holding the exact same number of shares as the prior quarter."><DirectionValue value={summaryValue(data, 'summary.unchangedOwner', 'unchangedOwner', 'IO_Summary_Unchanged')} /></ActivityMetric>
          <ActivityMetric label="Newly reported" description="Number of institutions opening a brand-new position or reporting for the first time."><DirectionValue value={summaryValue(data, 'summary.newReported', 'newReported', 'IO_Summary_New_reported')} /></ActivityMetric>
          <ActivityMetric label="Exited / no longer reported" description="Number of institutions that completely liquidated their position or fell below reporting thresholds."><DirectionValue value={summaryValue(data, 'summary.exitedOwner', 'exitedOwner', 'IO_Summary_Exit_no_longer_reported')} /></ActivityMetric>
          <ActivityMetric label="Net shares changed" description="Total net share volume added (+) or removed (-) across all reporting institutions."><DirectionValue value={summaryValue(data, 'summary.netSharesChanged', 'netSharesChanged', 'IO_Summary_net_shares_changed')} formatter={formatCompactQuantity} /></ActivityMetric>
          <ActivityMetric label="Net value changed" description="Estimated net dollar value of shares bought or sold across all institutions."><DirectionValue value={summaryValue(data, 'summary.netValuesChanged', 'netValuesChanged', 'IO_Summary_net_values_changed')} formatter={thousandsCurrency} /></ActivityMetric>
        </article>

        <article>
          <ActivityHeading label="New / Exited" description="Highlights newly opened institutional positions versus completely liquidated positions, along with the total shares and capital involved." />
          <ActivityMetric label="Newly reported" description="Count of institutions initiating a new position during the latest reporting cycle."><DirectionValue value={summaryValue(data, 'summary.newReported', 'newReported', 'IO_Summary_New_reported')} /></ActivityMetric>
          <ActivityMetric label="New shares" description="Combined number of shares accumulated across all newly established positions."><DirectionValue value={summaryValue(data, 'summary.newShares', 'newShares', 'IO_Summary_New_shares')} formatter={formatCompactQuantity} /></ActivityMetric>
          <ActivityMetric label="New value ($1000)" description="Total estimated market value (in thousands) of all newly established positions."><DirectionValue value={summaryValue(data, 'summary.newValue', 'newValue', 'IO_Summary_New_value')} formatter={thousandsCurrency} /></ActivityMetric>
          <div className="institutional-activity-card-divider" />
          <ActivityMetric label="Exited / no longer reported" description="Count of institutions that fully closed their position or dropped off regulatory disclosures."><DirectionValue value={summaryValue(data, 'summary.exitedOwner', 'exitedOwner', 'IO_Summary_Exit_no_longer_reported')} /></ActivityMetric>
          <ActivityMetric label="Prior shares exited" description="Total share volume previously owned by institutions that have now fully exited."><DirectionValue value={summaryValue(data, 'summary.priorSharesExited', 'priorSharesExited', 'IO_Summary_Prior_shares_exited')} formatter={formatCompactQuantity} /></ActivityMetric>
          <ActivityMetric label="Prior value exited ($1000)" description="Estimated market value (in thousands) of the exited positions prior to liquidation."><DirectionValue value={summaryValue(data, 'summary.priorValueExited', 'priorValueExited', 'IO_Summary_Prior_value_exited')} formatter={thousandsCurrency} /></ActivityMetric>
        </article>

        <article>
          <ActivityHeading label="Concentration" description="Shows total disclosed institutional shares and the percentage controlled by the top 5 and top 10 largest institutional holders." />
          <ActivityMetric label="Total disclosed shares" description="Aggregate share volume reported across all valid institutional filings (13F, NPORT, etc.)."><DirectionValue value={summaryValue(data, 'summary.totalDisclosedShares', 'totalDisclosedShares', 'IO_Summary_Total_disclosed_shares')} formatter={formatCompactQuantity} /></ActivityMetric>
          <ActivityMetric label="Top 5 concentration" description="Share percentage controlled by the 5 largest institutional holders relative to total disclosed institutional shares."><DirectionValue value={summaryValue(data, 'summary.top5Concentration', 'top5Concentration', 'IO_Summary_Top_5_concentration')} formatter={exactPercent} /></ActivityMetric>
          <ActivityMetric label="Top 10 concentration" description="Share percentage controlled by the 10 largest institutional holders relative to total disclosed institutional shares."><DirectionValue value={summaryValue(data, 'summary.top10Concentration', 'top10Concentration', 'IO_Summary_Top_10_concentration')} formatter={exactPercent} /></ActivityMetric>
          <p className="institutional-activity-card-note">Concentration is measured against total disclosed institutional shares.</p>
        </article>

      </div>

      <div className="institutional-activity-details">
        <article className="institutional-activity-table-card">
          <div className="institutional-activity-table-title">
            <h3>Source Breakdown</h3>
            <InfoTooltip text="The mix of disclosed institutional shares grouped by regulatory filing source." />
          </div>
          <div className="institutional-activity-table-wrap">
            <table>
              <thead><tr><th>Source</th><th>Owners</th><th>Shares</th><th>Value ($1000)</th><th>% Shares</th></tr></thead>
              <tbody>
                {sourceRows.length ? sourceRows.map((row, index) => (
                  <tr key={`${String(row.formType ?? 'source')}-${index}`}>
                    <th>{sourceLabel(row.formType ?? row.source)}</th>
                    <td>{exactInteger(row.ownerCount ?? row.owners)}</td>
                    <td>{exactInteger(row.shares)}</td>
                    <td>{sourceValueInThousands(row.value)}</td>
                    <td>{exactPercent(row.percentShare ?? row.percentShares)}</td>
                  </tr>
                )) : <tr><td colSpan={5} className="institutional-activity-empty">No source breakdown is available.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="institutional-activity-footnote">13F: quarterly institutional holdings. NPORT: fund portfolio holdings. Beneficial-ownership filings disclose positions above applicable reporting thresholds.</p>
        </article>

        <article className="institutional-activity-table-card institutional-options-exposure">
          <div className="institutional-activity-table-title">
            <h3>Reported Institutional Options Exposure</h3>
            <InfoTooltip text="Reported options exposure from institutional filings. It does not represent current open-market positioning." />
          </div>
          <div className="institutional-activity-table-wrap">
            <table>
              <thead><tr><th>Metric</th><th>Calls</th><th>Puts</th></tr></thead>
              <tbody>
                <tr><th>Holders</th><td>{exactInteger(calls.holders)}</td><td>{exactInteger(puts.holders)}</td></tr>
                <tr>
                  <th>Underlying Shares</th>
                  <td><span className="institutional-options-value">{exactInteger(calls.shares)}{exposureIndex(calls.index) ? <em>{exposureIndex(calls.index)}</em> : null}</span></td>
                  <td><span className="institutional-options-value">{exactInteger(puts.shares)}{exposureIndex(puts.index) ? <em>{exposureIndex(puts.index)}</em> : null}</span></td>
                </tr>
                <tr><th>Reported Value ($1000)</th><td>{thousandsCurrency(calls.value)}</td><td>{thousandsCurrency(puts.value)}</td></tr>
                <tr>
                  <th>Largest Holder</th>
                  <td><span className="institutional-options-value">{String(calls.largestHolder ?? '—')}{calls.holderTag ? <em className="is-directional">{String(calls.holderTag)}</em> : null}{calls.holderTag ? <HolderSentimentTooltip sentiment={calls.holderTag} /> : null}</span></td>
                  <td><span className="institutional-options-value">{String(puts.largestHolder ?? '—')}{puts.holderTag ? <em className="is-directional">{String(puts.holderTag)}</em> : null}{puts.holderTag ? <HolderSentimentTooltip sentiment={puts.holderTag} /> : null}</span></td>
                </tr>
                <tr className="institutional-options-ratio">
                  <th><span className="with-info">Put / Call Ratio<InfoTooltip text="Ratio of Put share exposure (or value) to Call share exposure. Values below 1.0 indicate a Call-heavy (bullish) institutional stance, while values above 1.0 indicate a Put-heavy (bearish) stance." /></span></th>
                  <td colSpan={2}>
                    <strong>{ratio === null ? 'N/A' : ratio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    {ratioSentiment ? <span className={`is-${ratioSentiment.toLowerCase().replace(/\s+/g, '-')}`}>{ratioSentiment}</span> : null}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
