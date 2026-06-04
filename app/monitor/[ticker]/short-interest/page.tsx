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

function signed(value: number, options?: Intl.NumberFormatOptions) {
  const formatted = Math.abs(value).toLocaleString('en-US', options);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
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

function delta(current: number | null, previous: number | null, options?: Intl.NumberFormatOptions) {
  if (current === null || previous === null || previous === 0) return null;
  const change = current - previous;
  return {
    change,
    percent: (change / previous) * 100,
    valueText: signed(change, options),
  };
}

function DeltaBadge({ info, suffix = '' }: { info: ReturnType<typeof delta>; suffix?: string }) {
  if (!info) {
    return <span className="short-kpi-delta neutral">No prior update</span>;
  }
  const tone = info.change > 0 ? 'up' : info.change < 0 ? 'down' : 'neutral';
  const sign = info.change > 0 ? '+' : info.change < 0 ? '-' : '';
  return (
    <span className={`short-kpi-delta ${tone}`}>
      <strong>{info.valueText}{suffix}</strong>
      <em>({sign}{Math.abs(info.percent).toLocaleString('en-US', { maximumFractionDigits: 2 })}%)</em>
    </span>
  );
}

function KpiCard({ label, value, detail, change, suffix }: {
  label: string;
  value: ReactNode;
  detail?: string;
  change: ReturnType<typeof delta>;
  suffix?: string;
}) {
  return (
    <div className="terminal-card terminal-stat short-kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <DeltaBadge info={change} suffix={suffix} />
      {detail && <small>{detail}</small>}
    </div>
  );
}

export default function ShortInterestPage() {
  const shortInterestEnvelope = readImportFile<Row>('short/short_interest.json');
  const borrowFeeEnvelope = readImportFile<Row>('short/borrow_fee.json');
  const sharesEnvelope = readImportFile<Row[]>('short/shares_available.json');
  const shortScoreEnvelope = readImportFile<Row[]>('short/short_score.json');
  const shortVolumeEnvelope = readImportFile<Row[]>('short/short_volume.json');

  const shortCurrent = record(record(shortInterestEnvelope.data).current);
  const shortHistory = rows(record(shortInterestEnvelope.data).finraHistory).slice(0, 12).reverse();
  const borrowRows = rows(record(borrowFeeEnvelope.data).all);
  const borrowCurrent = record(record(borrowFeeEnvelope.data).current);
  const availableRows = rows(sharesEnvelope.data);
  const sortedAvailableRows = [...availableRows].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const latestAvailable = latest(availableRows);
  const shortScores = rows(shortScoreEnvelope.data);
  const sortedShortScores = [...shortScores].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const latestShortScore = latest(shortScores);
  const shortVolumeRows = rows(record(shortVolumeEnvelope.data).fintelShortVolume).slice(0, 8);
  const sortedBorrowRows = [...borrowRows].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const sortedShortHistory = [...shortHistory].sort((a, b) => String(b.settlementDate ?? b.accountingDate ?? '').localeCompare(String(a.settlementDate ?? a.accountingDate ?? '')));
  const latestShortHistory = sortedShortHistory[0] ?? {};
  const previousShortHistory = sortedShortHistory[1] ?? {};

  const shortInterestShares = numeric(shortCurrent.shortInterestShares);
  const shortInterestPercent = numeric(shortCurrent.shortInterestPcFreeFloat);
  const borrowFee = numeric(borrowCurrent.costToBorrowAll);
  const sharesAvailable = numeric(latestAvailable.shortAvailabilityShares);
  const utilization = numeric(latestAvailable.shortAvailabilityPct);
  const shortScore = Math.round(numeric(latestShortScore.score) ?? 0);
  const shortScoreLevel = shortScore >= 80 ? 'Extreme' : shortScore >= 65 ? 'High' : shortScore >= 40 ? 'Moderate' : 'Low';
  const shortScoreTone = shortScore >= 80 ? 'extreme' : shortScore >= 65 ? 'high' : shortScore >= 40 ? 'moderate' : 'low';
  const daysToCover = numeric(shortCurrent.daysToCoverQuantity ?? record(shortInterestEnvelope.data).daysToCover);
  const shortHistoryCurrent = numeric(latestShortHistory.currentShortPositionQuantity);
  const shortHistoryPrevious = numeric(latestShortHistory.previousShortPositionQuantity) ?? numeric(previousShortHistory.currentShortPositionQuantity);
  const shortInterestDelta = shortInterestShares !== null && shortHistoryCurrent !== null && shortHistoryPrevious !== null
    ? {
      change: shortHistoryCurrent - shortHistoryPrevious,
      percent: shortHistoryPrevious ? ((shortHistoryCurrent - shortHistoryPrevious) / shortHistoryPrevious) * 100 : 0,
      valueText: signed(shortHistoryCurrent - shortHistoryPrevious),
    }
    : null;
  const shortInterestPctDelta = shortInterestDelta && shortInterestPercent !== null
    ? {
      change: shortInterestPercent * (shortInterestDelta.percent / 100),
      percent: shortInterestDelta.percent,
      valueText: signed(shortInterestPercent * (shortInterestDelta.percent / 100), { maximumFractionDigits: 2 }),
    }
    : null;
  const daysToCoverDelta = delta(numeric(latestShortHistory.daysToCoverQuantity), numeric(previousShortHistory.daysToCoverQuantity), { maximumFractionDigits: 2 });
  const borrowFeeDelta = delta(borrowFee, numeric(sortedBorrowRows[1]?.costToBorrowAll), { maximumFractionDigits: 2 });
  const shortScoreDelta = delta(shortScore || null, numeric(sortedShortScores[1]?.score), { maximumFractionDigits: 1 });
  const sharesAvailableDelta = delta(sharesAvailable, numeric(sortedAvailableRows[1]?.shortAvailabilityShares), { maximumFractionDigits: 0 });
  const utilizationDelta = delta(utilization, numeric(sortedAvailableRows[1]?.shortAvailabilityPct), { maximumFractionDigits: 2 });

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

        <div className="lending-pressure-hero-grid short-interest-score-grid">
          <div className={`lending-pressure-hero short-score-hero ${shortScoreTone}`}>
            <span>Short Score</span>
            <strong>{shortScore || 'No Source'} / 100</strong>
            <div className="short-score-status-row">
              <em>{shortScoreLevel}</em>
              <DeltaBadge info={shortScoreDelta} />
            </div>
            <p>Composite short-interest risk score using short exposure, borrow pressure, share availability, and related market-pressure inputs.</p>
          </div>
          <div className="lending-gauge-card short-score-gauge-card">
            <div className="triggered-gauge" style={{ background: `conic-gradient(#be123c 0% ${shortScore || 0}%, #e8eef7 ${shortScore || 0}% 100%)` }}>
              <div><strong>{shortScore || 0}</strong><span>short score</span></div>
            </div>
            <p>{shortScoreLevel} Short Pressure</p>
          </div>
        </div>

        <div className="lending-kpi-row short-interest-kpi-grid">
          <KpiCard label="Short Interest" value={formatNumber(shortInterestShares)} change={shortInterestDelta} suffix=" shares" />
          <KpiCard label="SI % Float" value={formatPercent(shortInterestPercent, { maximumFractionDigits: 2 })} change={shortInterestPctDelta} suffix=" pts" />
          <KpiCard label="Days To Cover" value={formatNumber(daysToCover, { maximumFractionDigits: 2 })} change={daysToCoverDelta} />
          <KpiCard label="Borrow Fee" value={formatPercent(borrowFee, { maximumFractionDigits: 2 })} change={borrowFeeDelta} suffix=" pts" />
          <KpiCard label="Shares Available" value={formatNumber(sharesAvailable)} change={sharesAvailableDelta} suffix=" shares" />
          <KpiCard label="Utilization" value={formatPercent(utilization, { maximumFractionDigits: 2 })} change={utilizationDelta} suffix=" pts" />
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

      <section className="terminal-section short-interest-trends-section">
        <div className="terminal-section__head">
          <div>
            <span>Trend Analysis</span>
            <h2>Short Interest Movement</h2>
            <p className="section-subtitle">Larger charts for short exposure, borrow cost, borrow availability, and reported short volume.</p>
          </div>
          <div className="terminal-section-actions">
            {sourceChip(shortInterestEnvelope.sourcePlatform ?? 'Ortex/FINRA')}
            {sourceChip(shortVolumeEnvelope.sourcePlatform ?? 'FINRA')}
          </div>
        </div>
        <div className="short-interest-trend-grid">
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
              label: String(row.date ?? row.marketDate ?? row.tradeReportDate ?? `Record ${index + 1}`),
              value: numeric(row.shortVolume) ?? numeric(row.totalShortVolume) ?? numeric(row.shortParQuantity) ?? numeric(row.volume) ?? 0,
            }))} />
          </div>
        </div>
      </section>
    </ImportDataPreviewPage>
  );
}
