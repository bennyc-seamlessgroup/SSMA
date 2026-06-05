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
    ortexEnvelope,
    pageContent,
  ] = await Promise.all([
    readImportFile<Row>('short/ortex_consolidated.json'),
    readPageContent('shortInterest'),
  ]);

  const ortexData = record(ortexEnvelope.data);
  const shortCurrent = record(ortexData.current);
  const dailyRows = rows(ortexData.daily);
  const shortInterestTrendRows = dailyRows
    .sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')))
    .slice(-7);
  const sortedDailyRows = [...dailyRows].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const latestDaily = sortedDailyRows[0] ?? {};
  const previousDaily = sortedDailyRows[1] ?? {};

  const shortInterestShares = numeric(shortCurrent.shortInterestShares);
  const shortInterestPercent = numeric(shortCurrent.shortInterestPcFreeFloat);
  const borrowFee = numeric(shortCurrent.costToBorrowAll);
  const sharesAvailable = numeric(shortCurrent.shortAvailabilityShares);
  const utilization = numeric(shortCurrent.shortAvailabilityPct);
  const shortScore = Math.round(numeric(shortCurrent.shortScore) ?? 0);
  const shortScoreLevel = shortScore >= 80 ? 'Extreme' : shortScore >= 65 ? 'High' : shortScore >= 40 ? 'Moderate' : 'Low';
  const shortScoreTone = shortScore >= 80 ? 'extreme' : shortScore >= 65 ? 'high' : shortScore >= 40 ? 'moderate' : 'low';
  const daysToCover = numeric(shortCurrent.daysToCoverQuantity);
  const latestShortInterest = record(latestDaily.shortInterest);
  const previousShortInterest = record(previousDaily.shortInterest);
  const latestDaysToCover = record(latestDaily.daysToCover);
  const previousDaysToCover = record(previousDaily.daysToCover);
  const latestBorrowFee = record(latestDaily.borrowFeeAll);
  const previousBorrowFee = record(previousDaily.borrowFeeAll);
  const latestAvailability = record(latestDaily.availability);
  const previousAvailability = record(previousDaily.availability);
  const latestShortScore = record(latestDaily.shortScore);
  const previousShortScore = record(previousDaily.shortScore);
  const shortInterestDelta = delta(numeric(latestShortInterest.shortInterestShares), numeric(previousShortInterest.shortInterestShares), { maximumFractionDigits: 0 });
  const shortInterestPctDelta = delta(numeric(latestShortInterest.shortInterestPcFreeFloat), numeric(previousShortInterest.shortInterestPcFreeFloat), { maximumFractionDigits: 2 });
  const daysToCoverDelta = delta(numeric(latestDaysToCover.daysToCover), numeric(previousDaysToCover.daysToCover), { maximumFractionDigits: 2 });
  const borrowFeeDelta = delta(numeric(latestBorrowFee.costToBorrowAll), numeric(previousBorrowFee.costToBorrowAll), { maximumFractionDigits: 2 });
  const shortScoreDelta = delta(Math.round(numeric(latestShortScore.score) ?? 0) || null, numeric(previousShortScore.score), { maximumFractionDigits: 1 });
  const sharesAvailableDelta = delta(numeric(latestAvailability.shortAvailabilityShares), numeric(previousAvailability.shortAvailabilityShares), { maximumFractionDigits: 0 });
  const utilizationDelta = delta(numeric(latestAvailability.shortAvailabilityPct), numeric(previousAvailability.shortAvailabilityPct), { maximumFractionDigits: 2 });
  const shortCards = record(record(record(ortexData.derived).shortInterestPage).cards) as Record<string, Row> | undefined;
  const shortInterestCard = record(shortCards?.shortInterest);
  const siPercentCard = record(shortCards?.shortInterestPercentFloat);
  const daysToCoverCard = record(shortCards?.daysToCover);
  const borrowFeeCard = record(shortCards?.borrowFee);
  const sharesAvailableCard = record(shortCards?.sharesAvailable);
  const utilizationCard = record(shortCards?.utilization);
  const shortScoreCard = record(shortCards?.shortScore);
  const shortScoreLevelCard = record(shortCards?.shortScoreLevel);
  const currentInterpretation = record(ortexData.currentInterpretation);
  const managementWatchItems = textList(ortexData.managementWatchItems, [
    'Borrow fee movement above current levels',
    'Any decline in available shares to borrow',
    'Short-interest increases confirmed by ORTEX daily records',
    'Days-to-cover rising with lower trading liquidity',
  ]);

  return (
    <ImportDataPreviewPage
      title="Short Interest Intelligence"
      description="Short interest, borrow fee, shares available, days to cover, and squeeze risk from the consolidated ORTEX import data."
      files={[
        'short/ortex_consolidated.json',
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
            {sourceChip(ortexEnvelope.sourcePlatform ?? 'Ortex')}
          </div>
        </div>

        <div className="lending-pressure-hero-grid short-interest-score-grid">
          <div className={`lending-pressure-hero short-score-hero ${shortScoreTone}`}>
            <span>Short Score</span>
            <strong>{shortScore ? `${shortScore} / 100` : 'No Source'}</strong>
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
          <KpiCard label="Short Interest" value={formatNumber(shortInterestShares)} change={shortInterestDelta} suffix=" shares" deltaDisplay={String(shortInterestCard.deltaDisplay ?? '')} />
          <KpiCard label="SI % Float" value={formatPercent(shortInterestPercent, { maximumFractionDigits: 2 })} change={shortInterestPctDelta} suffix=" pts" deltaDisplay={String(siPercentCard.deltaDisplay ?? '')} />
          <KpiCard label="Days To Cover" value={formatNumber(daysToCover, { maximumFractionDigits: 2 })} change={daysToCoverDelta} deltaDisplay={String(daysToCoverCard.deltaDisplay ?? '')} />
          <KpiCard label="Borrow Fee" value={formatPercent(borrowFee, { maximumFractionDigits: 2 })} change={borrowFeeDelta} suffix=" pts" deltaDisplay={String(borrowFeeCard.deltaDisplay ?? '')} />
          <KpiCard label="Shares Available" value={formatNumber(sharesAvailable)} change={sharesAvailableDelta} suffix=" shares" deltaDisplay={String(sharesAvailableCard.deltaDisplay ?? '')} />
          <KpiCard label="Utilization" value={formatPercent(utilization, { maximumFractionDigits: 2 })} change={utilizationDelta} suffix=" pts" deltaDisplay={String(utilizationCard.deltaDisplay ?? '')} />
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
            <p className="section-subtitle">ORTEX-backed trend charts for short exposure, borrow cost, and borrow availability.</p>
          </div>
          <div className="terminal-section-actions">
            {sourceChip(ortexEnvelope.sourcePlatform ?? 'Ortex')}
          </div>
        </div>
        <div className="short-interest-trend-grid">
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Trend of reported short-interest shares. Rising values indicate more shares have been sold short.">Short Interest Trend</InfoTitle></h3>
            <TrendLine
              label="Shares"
              labels={shortInterestTrendRows.map(row => shortDateLabel(row.date))}
              values={shortInterestTrendRows.map(row => numeric(record(row.shortInterest).shortInterestShares) ?? 0)}
            />
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Cost to borrow shows how expensive it is for short sellers to maintain or open short positions.">Borrow Fee Trend</InfoTitle></h3>
            <TrendLine
              label="CTB"
              labels={shortInterestTrendRows.map(row => shortDateLabel(row.date))}
              values={shortInterestTrendRows.map(row => numeric(record(row.borrowFeeAll).costToBorrowAll) ?? 0)}
              valueFormatter={value => `${formatNumber(value, { maximumFractionDigits: 2 })}%`}
            />
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Available shares indicate how many shares may still be available for borrowing. Lower inventory can increase borrow pressure.">Shares Available Trend</InfoTitle></h3>
            <TrendLine
              label="Available"
              labels={shortInterestTrendRows.map(row => shortDateLabel(row.date))}
              values={shortInterestTrendRows.map(row => numeric(record(row.availability).shortAvailabilityShares) ?? 0)}
            />
          </div>
        </div>
      </section>
    </ImportDataPreviewPage>
  );
}
