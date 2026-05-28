import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';
import { InfoTooltip } from '@/components/InfoTooltip';
import { readImportFile } from '@/lib/import-data';
import type { ReactNode } from 'react';

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Row[] : [];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function latest(items: Row[], dateKey = 'date') {
  return [...items].sort((a, b) => String(b[dateKey] ?? '').localeCompare(String(a[dateKey] ?? '')))[0] ?? {};
}

function formatNumber(value: unknown, options?: Intl.NumberFormatOptions) {
  const parsed = numeric(value);
  return parsed === null ? 'N/A' : parsed.toLocaleString('en-US', options);
}

function formatPercent(value: unknown, options?: Intl.NumberFormatOptions) {
  const parsed = numeric(value);
  return parsed === null ? 'No Source' : `${parsed.toLocaleString('en-US', options)}%`;
}

function sourceChip(source: string) {
  return <span className="source-chip ready">Source: {source}</span>;
}

function InfoTitle({ children, text }: { children: ReactNode; text: string }) {
  return <span className="with-info">{children} <InfoTooltip text={text} /></span>;
}

function TrendLine({ values, label }: { values: number[]; label: string }) {
  const cleaned = values.filter(value => Number.isFinite(value));
  const plottedValues = cleaned.length ? cleaned : [0, 0];
  const max = Math.max(...plottedValues, 1);
  const min = Math.min(...plottedValues, 0);
  const range = Math.max(max - min, 1);
  const points = plottedValues.map((value, index) => {
    const x = plottedValues.length === 1 ? 0 : (index / (plottedValues.length - 1)) * 100;
    const y = 88 - ((value - min) / range) * 68;
    return { value, x, y };
  });

  return (
    <div className="terminal-line-chart short-interest-chart">
      <div className="trend-chart-label">{label}: <strong>{formatNumber(plottedValues[plottedValues.length - 1], { maximumFractionDigits: 2 })}</strong></div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} />
      </svg>
      {points.map((point, index) => (
        <span
          className={`trend-marker ${index === 0 || index === points.length - 1 ? 'show-label' : ''}`}
          key={`${point.x}-${point.value}-${index}`}
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        >
          <i />
          {(index === 0 || index === points.length - 1) && <b>{formatNumber(point.value, { maximumFractionDigits: 0 })}</b>}
        </span>
      ))}
    </div>
  );
}

function MiniBars({ values }: { values: Array<{ label: string; value: number }> }) {
  const max = Math.max(...values.map(item => item.value), 1);
  return (
    <div className="terminal-bars">
      {values.map(item => (
        <div className="terminal-bar-row" key={item.label}>
          <span>{item.label}</span>
          <div><i style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} /></div>
          <strong>{formatNumber(item.value, { maximumFractionDigits: 0 })}</strong>
        </div>
      ))}
    </div>
  );
}

export default function ShortInterestPage() {
  const shortInterestEnvelope = readImportFile<Row>('short/short_interest.json');
  const borrowFeeEnvelope = readImportFile<Row>('short/borrow_fee.json');
  const sharesEnvelope = readImportFile<Row[]>('short/shares_available.json');
  const utilizationEnvelope = readImportFile<Row[]>('short/utilization.json');
  const shortScoreEnvelope = readImportFile<Row[]>('short/short_score.json');
  const shortVolumeEnvelope = readImportFile<Row[]>('short/short_volume.json');

  const shortCurrent = record(record(shortInterestEnvelope.data).current);
  const shortHistory = rows(record(shortInterestEnvelope.data).finraHistory).slice(0, 12).reverse();
  const borrowRows = rows(record(borrowFeeEnvelope.data).all);
  const borrowCurrent = record(record(borrowFeeEnvelope.data).current);
  const availableRows = rows(sharesEnvelope.data);
  const latestAvailable = latest(availableRows);
  const utilizationRows = rows(utilizationEnvelope.data);
  const latestUtilization = latest(utilizationRows);
  const shortScores = rows(shortScoreEnvelope.data);
  const latestShortScore = latest(shortScores);
  const shortVolumeRows = rows(record(shortVolumeEnvelope.data).fintelShortVolume).slice(0, 8);

  const shortInterestShares = numeric(shortCurrent.shortInterestShares);
  const shortInterestPercent = numeric(shortCurrent.shortInterestPcFreeFloat);
  const borrowFee = numeric(borrowCurrent.costToBorrowAll);
  const sharesAvailable = numeric(latestAvailable.shortAvailabilityShares);
  const utilization = numeric(latestUtilization.utilization);
  const shortScore = Math.round(numeric(latestShortScore.score) ?? 0);
  const daysToCover = numeric(shortCurrent.daysToCoverQuantity ?? record(shortInterestEnvelope.data).daysToCover);
  const firstHistory = shortHistory[0] ?? {};
  const lastHistory = shortHistory[shortHistory.length - 1] ?? {};
  const trendChange = (() => {
    const first = numeric(firstHistory.currentShortPositionQuantity);
    const last = numeric(lastHistory.currentShortPositionQuantity);
    return first && last ? ((last - first) / first) * 100 : null;
  })();

  return (
    <ImportDataPreviewPage
      title="Short Interest Intelligence"
      description="Short interest, borrow fee, shares available, short volume, and squeeze risk from the standardized import data pool."
      files={[
        'short/short_interest.json',
        'short/borrow_fee.json',
        'short/shares_available.json',
        'short/short_volume.json',
        'short/short_score.json',
      ]}
    >
      <section className="terminal-section short-interest-overview">
        <div className="terminal-section__head">
          <div>
            <span>Overview</span>
            <h2>Short Interest Overview</h2>
            <p className="section-subtitle">Executive view of short exposure, borrow pressure, available inventory, and squeeze-risk inputs.</p>
          </div>
          <div className="terminal-section-actions">
            {sourceChip(shortInterestEnvelope.sourcePlatform ?? 'Ortex/FINRA')}
            {sourceChip(borrowFeeEnvelope.sourcePlatform ?? 'Ortex')}
          </div>
        </div>

        <div className="short-interest-kpi-grid">
          <div className="terminal-card terminal-stat"><span>Short Interest</span><strong>{formatNumber(shortInterestShares)}</strong><small>Reported short shares</small></div>
          <div className="terminal-card terminal-stat"><span>SI % Float</span><strong>{formatPercent(shortInterestPercent, { maximumFractionDigits: 2 })}</strong><small>Official free-float view</small></div>
          <div className="terminal-card terminal-stat"><span>Days To Cover</span><strong>{formatNumber(daysToCover, { maximumFractionDigits: 2 })}</strong><small>Public short-interest liquidity context</small></div>
          <div className="terminal-card terminal-stat"><span>Borrow Fee</span><strong>{formatPercent(borrowFee, { maximumFractionDigits: 2 })}</strong><small>Current cost to borrow</small></div>
          <div className="terminal-card terminal-stat"><span>Short Score</span><strong>{shortScore || 'No Source'}</strong><small>Internal model input</small></div>
          <div className="terminal-card terminal-stat"><span>Shares Available</span><strong>{formatNumber(sharesAvailable)}</strong><small>Latest borrow inventory</small></div>
          <div className="terminal-card terminal-stat"><span>Utilization</span><strong>{formatPercent(utilization, { maximumFractionDigits: 2 })}</strong><small>{utilizationRows.length ? 'Lendable inventory used' : 'Pending institutional data source'}</small></div>
          <div className="terminal-card terminal-stat"><span>Short Trend</span><strong>{formatPercent(trendChange, { maximumFractionDigits: 1 })}</strong><small>Latest sample window</small></div>
        </div>

        <div className="short-interest-visual-grid">
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Trend of reported short-interest shares. Rising values indicate more shares have been sold short.">Short Interest Trend</InfoTitle></h3>
            <TrendLine label="Shares" values={shortHistory.map(row => numeric(row.currentShortPositionQuantity) ?? 0)} />
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Cost to borrow shows how expensive it is for short sellers to maintain or open short positions.">Borrow Fee Trend</InfoTitle></h3>
            <TrendLine label="CTB" values={borrowRows.map(row => numeric(row.costToBorrowAll) ?? 0)} />
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Available shares indicate how many shares may still be available for borrowing. Lower inventory can increase borrow pressure.">Shares Available Trend</InfoTitle></h3>
            <TrendLine label="Available" values={availableRows.map(row => numeric(row.shortAvailabilityShares) ?? 0)} />
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Short-volume records help validate whether short-side activity is showing up in reported market volume.">Short Volume Breakdown</InfoTitle></h3>
            <MiniBars values={shortVolumeRows.map((row, index) => ({
              label: String(row.date ?? row.marketDate ?? `Record ${index + 1}`),
              value: numeric(row.shortVolume) ?? numeric(row.totalShortVolume) ?? numeric(row.volume) ?? 0,
            }))} />
          </div>
        </div>

        <div className="short-interest-analysis-grid">
          <div className="terminal-card short-pressure-card">
            <span>Current Interpretation</span>
            <strong>{(borrowFee ?? 0) >= 25 || shortScore >= 65 ? 'Borrow pressure is visible' : 'Short pressure is moderate'}</strong>
            <p>Current data shows {formatNumber(shortInterestShares)} reported short shares, {formatPercent(shortInterestPercent, { maximumFractionDigits: 2 })} short interest as a percentage of float, and a {formatPercent(borrowFee, { maximumFractionDigits: 2 })} borrow fee. This overview helps management understand whether short sellers are facing rising cost, tighter inventory, or increasing positioning pressure.</p>
          </div>
          <div className="terminal-card short-pressure-card">
            <span>Management Watch Items</span>
            <ul>
              <li>Borrow fee movement above current levels</li>
              <li>Any decline in available shares to borrow</li>
              <li>Short-interest increases confirmed by volume data</li>
              <li>Days-to-cover rising with lower trading liquidity</li>
            </ul>
          </div>
        </div>
      </section>
    </ImportDataPreviewPage>
  );
}
