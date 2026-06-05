import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';
import { InfoTooltip } from '@/components/InfoTooltip';
import { readImportFile, readPageContent } from '@/lib/import-data';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Row[] : [];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function textList(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim()) as string[] : fallback;
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

function formatCompactNumber(value: unknown) {
  const parsed = numeric(value);
  return parsed === null ? 'N/A' : new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(parsed);
}

function formatAxisNumber(value: unknown) {
  const parsed = numeric(value);
  return parsed === null ? 'N/A' : new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 0,
  }).format(Math.round(parsed));
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

function shortDateLabel(value: unknown) {
  const raw = String(value ?? '');
  if (!raw) return '';
  const [year, month, day] = raw.split('-');
  if (year && month && day) return `${Number(month)}/${Number(day)}`;
  return raw;
}

function TrendLine({ values, labels, label, valueFormatter = formatCompactNumber }: {
  values: number[];
  labels?: string[];
  label: string;
  valueFormatter?: (value: number) => string;
}) {
  const cleaned = values.map(value => Number.isFinite(value) ? value : 0);
  const plottedValues = cleaned.length ? cleaned : [0, 0];
  const rawMax = Math.max(...plottedValues);
  const rawMin = Math.min(...plottedValues);
  const rawRange = Math.max(rawMax - rawMin, Math.max(Math.abs(rawMax) * 0.02, 1));
  const padding = rawRange * 0.18;
  const max = rawMax + padding;
  const min = Math.max(0, rawMin - padding);
  const range = Math.max(max - min, 1);
  const mid = min + (range / 2);
  const points = plottedValues.map((value, index) => {
    const x = plottedValues.length === 1 ? 50 : (index / (plottedValues.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return { value, x, y };
  });
  const displayLabels = labels?.length === plottedValues.length
    ? labels
    : plottedValues.map((_, index) => `Day ${index + 1}`);

  return (
    <div className="terminal-line-chart short-interest-chart axis-line-chart">
      <span className="chart-axis-title chart-axis-title-y">{label}</span>
      <div className="chart-y-axis" aria-hidden="true">
        <span>{formatAxisNumber(max)}</span>
        <span>{formatAxisNumber(mid)}</span>
        <span>{formatAxisNumber(min)}</span>
      </div>
      <div className="chart-plot-area">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line className="chart-axis-line" x1="0" y1="0" x2="0" y2="100" />
          <line className="chart-axis-line" x1="0" y1="100" x2="100" y2="100" />
          <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} />
        </svg>
        {points.map((point, index) => {
          const shouldLabel = index === 0 || index === points.length - 1;
          const edgeClass = index === 0 ? 'edge-start' : index === points.length - 1 ? 'edge-end' : '';
          return (
            <span
              className={`trend-marker ${shouldLabel ? 'show-label' : ''} ${edgeClass}`}
              key={`${point.x}-${point.value}-${index}`}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              <i />
              {shouldLabel && <b>{valueFormatter(point.value)}</b>}
              <em className="trend-tooltip">
                <strong>{displayLabels[index]}</strong>
                <span>{label}: {valueFormatter(point.value)}</span>
              </em>
            </span>
          );
        })}
      </div>
      <div className="chart-x-axis" aria-hidden="true">
        {displayLabels.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
      </div>
      <span className="chart-axis-title chart-axis-title-x">Date</span>
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

function DeltaBadge({ info, suffix = '', display }: { info: ReturnType<typeof delta>; suffix?: string; display?: string }) {
  if (display) {
    return <span className={`short-kpi-delta ${display.startsWith('-') ? 'down' : display.startsWith('+') ? 'up' : 'neutral'}`}><strong>{display}</strong></span>;
  }
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

function KpiCard({ label, value, detail, change, suffix, deltaDisplay }: {
  label: string;
  value: ReactNode;
  detail?: string;
  change: ReturnType<typeof delta>;
  suffix?: string;
  deltaDisplay?: string;
}) {
  return (
    <div className="terminal-card terminal-stat short-kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <DeltaBadge info={change} suffix={suffix} display={deltaDisplay} />
      {detail && <small>{detail}</small>}
    </div>
  );
}

export default async function ShortInterestPage() {
  const [
    shortInterestEnvelope,
    borrowFeeEnvelope,
    sharesEnvelope,
    shortScoreEnvelope,
    shortVolumeEnvelope,
    shortInterestTrendEnvelope,
    pageContent,
  ] = await Promise.all([
    readImportFile<Row>('short/short_interest.json'),
    readImportFile<Row>('short/borrow_fee.json'),
    readImportFile<Row[]>('short/shares_available.json'),
    readImportFile<Row[]>('short/short_score.json'),
    readImportFile<Row[]>('short/short_volume.json'),
    readImportFile<Row[]>('short/short_interest_2.json').catch(() => ({ data: [] })),
    readPageContent('shortInterest'),
  ]);

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
  const shortInterestTrendRows = rows(shortInterestTrendEnvelope.data)
    .sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')))
    .slice(-7);
  const shortVolumeByDate = rows(record(shortVolumeEnvelope.data).regSho).reduce<Record<string, number>>((acc, row) => {
    const date = String(row.tradeReportDate ?? row.date ?? '');
    if (!date) return acc;
    acc[date] = (acc[date] ?? 0) + (numeric(row.shortParQuantity) ?? numeric(row.shortVolume) ?? numeric(row.totalShortVolume) ?? 0);
    return acc;
  }, {});
  const shortVolumeTrendRows = Object.entries(shortVolumeByDate)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .slice(-7)
    .map(([date, value]) => ({ date, value }));
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
  const shortCards = record(record(record(shortInterestEnvelope.data).derived).shortInterestPage).cards as Record<string, Row> | undefined;
  const borrowCards = record(record(record(borrowFeeEnvelope.data).derived).shortInterestPage).cards as Record<string, Row> | undefined;
  const availableCards = record(record(record((sharesEnvelope as unknown as Row).dataDerived).shortInterestPage).cards) as Record<string, Row> | undefined;
  const scoreCards = record(record(record(shortScoreEnvelope as unknown as Row).dataDerived).shortInterestPage).cards as Record<string, Row> | undefined;
  const shortInterestCard = record(shortCards?.shortInterest);
  const siPercentCard = record(shortCards?.shortInterestPercentFloat);
  const daysToCoverCard = record(shortCards?.daysToCover);
  const borrowFeeCard = record(borrowCards?.borrowFee);
  const sharesAvailableCard = record(availableCards?.sharesAvailable);
  const utilizationCard = record(availableCards?.utilization);
  const shortScoreCard = record(scoreCards?.shortScore);
  const shortScoreLevelCard = record(scoreCards?.shortScoreLevel);
  const currentInterpretation = record(pageContent.currentInterpretation);
  const managementWatchItems = textList(pageContent.managementWatchItems, [
    'Borrow fee movement above current levels',
    'Any decline in available shares to borrow',
    'Short-interest increases confirmed by volume data',
    'Days-to-cover rising with lower trading liquidity',
  ]);

  return (
    <ImportDataPreviewPage
      title="Short Interest Intelligence"
      description={text(pageContent.pageDescription, 'Short interest, borrow fee, shares available, short volume, and squeeze risk from the standardized import data pool.')}
      files={[
        'short/short_interest.json',
        'short/short_interest_2.json',
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
            <p className="section-subtitle">{text(pageContent.overviewSubtitle, 'Executive view of short exposure, borrow pressure, available inventory, and squeeze-risk inputs.')}</p>
          </div>
          <div className="terminal-section-actions">
            {sourceChip(shortInterestEnvelope.sourcePlatform ?? 'Ortex/FINRA')}
            {sourceChip(borrowFeeEnvelope.sourcePlatform ?? 'Ortex')}
          </div>
        </div>

        <div className="lending-pressure-hero-grid short-interest-score-grid">
          <div className={`lending-pressure-hero short-score-hero ${shortScoreTone}`}>
            <span>Short Score</span>
            <strong>{String(shortScoreCard.valueDisplay ?? `${shortScore || 'No Source'} / 100`)}</strong>
            <div className="short-score-status-row">
              <em>{String(shortScoreLevelCard.valueDisplay ?? shortScoreLevel)}</em>
              <DeltaBadge info={shortScoreDelta} display={String(shortScoreCard.deltaDisplay ?? '')} />
            </div>
            <p>{text(pageContent.shortScoreDescription, 'Composite short-interest risk score using short exposure, borrow pressure, share availability, and related market-pressure inputs.')}</p>
          </div>
          <div className="lending-gauge-card short-score-gauge-card">
            <div className="triggered-gauge" style={{ background: `conic-gradient(#be123c 0% ${shortScore || 0}%, #e8eef7 ${shortScore || 0}% 100%)` }}>
              <div><strong>{shortScore || 0}</strong><span>short score</span></div>
            </div>
            <p>{shortScoreLevel} Short Pressure</p>
          </div>
        </div>

        <div className="lending-kpi-row short-interest-kpi-grid">
          <KpiCard label="Short Interest" value={String(shortInterestCard.valueDisplay ?? formatNumber(shortInterestShares))} change={shortInterestDelta} suffix=" shares" deltaDisplay={String(shortInterestCard.deltaDisplay ?? '')} />
          <KpiCard label="SI % Float" value={String(siPercentCard.valueDisplay ?? formatPercent(shortInterestPercent, { maximumFractionDigits: 2 }))} change={shortInterestPctDelta} suffix=" pts" deltaDisplay={String(siPercentCard.deltaDisplay ?? '')} />
          <KpiCard label="Days To Cover" value={String(daysToCoverCard.valueDisplay ?? formatNumber(daysToCover, { maximumFractionDigits: 2 }))} change={daysToCoverDelta} deltaDisplay={String(daysToCoverCard.deltaDisplay ?? '')} />
          <KpiCard label="Borrow Fee" value={String(borrowFeeCard.valueDisplay ?? formatPercent(borrowFee, { maximumFractionDigits: 2 }))} change={borrowFeeDelta} suffix=" pts" deltaDisplay={String(borrowFeeCard.deltaDisplay ?? '')} />
          <KpiCard label="Shares Available" value={String(sharesAvailableCard.valueDisplay ?? formatNumber(sharesAvailable))} change={sharesAvailableDelta} suffix=" shares" deltaDisplay={String(sharesAvailableCard.deltaDisplay ?? '')} />
          <KpiCard label="Utilization" value={String(utilizationCard.valueDisplay ?? formatPercent(utilization, { maximumFractionDigits: 2 }))} change={utilizationDelta} suffix=" pts" deltaDisplay={String(utilizationCard.deltaDisplay ?? '')} />
        </div>

        <div className="short-interest-analysis-grid">
          <div className="terminal-card short-pressure-card">
            <span>Current Interpretation</span>
            <strong>{text(currentInterpretation.headline, (borrowFee ?? 0) >= 25 || shortScore >= 65 ? 'Borrow pressure is visible' : 'Short pressure is moderate')}</strong>
            <p>{text(currentInterpretation.body, `Current data shows ${formatNumber(shortInterestShares)} reported short shares, ${formatPercent(shortInterestPercent, { maximumFractionDigits: 2 })} short interest as a percentage of float, and a ${formatPercent(borrowFee, { maximumFractionDigits: 2 })} borrow fee. This overview helps management understand whether short sellers are facing rising cost, tighter inventory, or increasing positioning pressure.`)}</p>
          </div>
          <div className="terminal-card short-pressure-card">
            <span>Management Watch Items</span>
            <ul>
              {managementWatchItems.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="terminal-section short-interest-trends-section">
        <div className="terminal-section__head">
          <div>
            <span>Trend Analysis</span>
            <h2>Short Interest Movement</h2>
            <p className="section-subtitle">{text(pageContent.trendSubtitle, 'Larger charts for short exposure, borrow cost, borrow availability, and reported short volume.')}</p>
          </div>
          <div className="terminal-section-actions">
            {sourceChip(shortInterestEnvelope.sourcePlatform ?? 'Ortex/FINRA')}
            {sourceChip(shortVolumeEnvelope.sourcePlatform ?? 'FINRA')}
          </div>
        </div>
        <div className="short-interest-trend-grid">
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Trend of reported short-interest shares. Rising values indicate more shares have been sold short.">Short Interest Trend</InfoTitle></h3>
            <TrendLine
              label="Shares"
              labels={shortInterestTrendRows.map(row => shortDateLabel(row.date))}
              values={shortInterestTrendRows.map(row => numeric(row.shortInterestShares) ?? 0)}
            />
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Cost to borrow shows how expensive it is for short sellers to maintain or open short positions.">Borrow Fee Trend</InfoTitle></h3>
            <TrendLine label="CTB" labels={borrowRows.map(row => shortDateLabel(row.date))} values={borrowRows.map(row => numeric(row.costToBorrowAll) ?? 0)} valueFormatter={value => `${formatNumber(value, { maximumFractionDigits: 2 })}%`} />
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Available shares indicate how many shares may still be available for borrowing. Lower inventory can increase borrow pressure.">Shares Available Trend</InfoTitle></h3>
            <TrendLine label="Available" labels={availableRows.map(row => shortDateLabel(row.date))} values={availableRows.map(row => numeric(row.shortAvailabilityShares) ?? 0)} />
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Short-volume records help validate whether short-side activity is showing up in reported market volume.">Short Volume Breakdown</InfoTitle></h3>
            <TrendLine
              label="Volume"
              labels={shortVolumeTrendRows.map(row => shortDateLabel(row.date))}
              values={shortVolumeTrendRows.map(row => row.value)}
            />
          </div>
        </div>
      </section>
    </ImportDataPreviewPage>
  );
}
