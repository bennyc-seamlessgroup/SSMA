import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';
import { InfoTooltip } from '@/components/InfoTooltip';
import { readImportFile, readPageContent } from '@/lib/import-data';
import type { ReactNode } from 'react';

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

function latest(items: Row[]) {
  return [...items].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))[0] ?? {};
}

function formatNumber(value: unknown, options?: Intl.NumberFormatOptions) {
  const parsed = numeric(value);
  return parsed === null ? 'N/A' : parsed.toLocaleString('en-US', options);
}

function formatPercent(value: unknown, options?: Intl.NumberFormatOptions) {
  const parsed = numeric(value);
  return parsed === null ? 'No Source' : `${parsed.toLocaleString('en-US', options)}%`;
}

function formatCompactNumber(value: number) {
  const absolute = Math.abs(value);
  if (absolute >= 1000000) return `${(value / 1000000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
  if (absolute >= 1000) return `${(value / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`;
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatAxisNumber(value: number) {
  const rounded = Math.round(value);
  const absolute = Math.abs(rounded);
  if (absolute >= 1000000) return `${(rounded / 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 })}M`;
  if (absolute >= 1000) return `${(rounded / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K`;
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function shortDateLabel(value: unknown) {
  const [year, month, day] = String(value ?? '').split('-').map(part => Number(part));
  if (!year || !month || !day) return String(value ?? '');
  return `${month}/${day}`;
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

function TrendLine({ values, labels, label, valueFormatter = formatCompactNumber }: {
  values: number[];
  labels?: string[];
  label: string;
  valueFormatter?: (value: number) => string;
}) {
  const cleaned = values.filter(value => Number.isFinite(value));
  const plottedValues = cleaned.length ? cleaned : [0, 0];
  const rawMax = Math.max(...plottedValues, 1);
  const rawMin = Math.min(...plottedValues, rawMax);
  const rawRange = Math.max(rawMax - rawMin, Math.abs(rawMax) * .08, 1);
  const min = rawMin - rawRange * .16;
  const max = rawMax + rawRange * .16;
  const range = Math.max(max - min, 1);
  const points = plottedValues.map((value, index) => {
    const x = plottedValues.length === 1 ? 50 : (index / (plottedValues.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return { value, x, y };
  });
  const yTicks = [max, min + range / 2, min];
  const displayLabels = labels && labels.length === plottedValues.length
    ? labels
    : plottedValues.map((_, index) => `Point ${index + 1}`);

  return (
    <div className="terminal-line-chart lending-mini-trend axis-line-chart">
      <span className="chart-axis-title chart-axis-title-y">{label}</span>
      <div className="chart-y-axis" aria-hidden="true">
        {yTicks.map((tick, index) => <span key={`${tick}-${index}`}>{formatAxisNumber(tick)}</span>)}
      </div>
      <div className="chart-plot-area">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line className="chart-axis-line" x1="0" y1="0" x2="0" y2="100" />
          <line className="chart-axis-line" x1="0" y1="100" x2="100" y2="100" />
          <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} />
        </svg>
        {points.map((point, index) => (
          <span
            className={`trend-marker ${index === 0 || index === points.length - 1 ? 'show-label' : ''} ${index === 0 ? 'edge-start' : ''} ${index === points.length - 1 ? 'edge-end' : ''}`}
            key={`${point.x}-${point.value}-${index}`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            <i />
            {(index === 0 || index === points.length - 1) && <b>{valueFormatter(point.value)}</b>}
            <em className="trend-tooltip">
              <strong>{displayLabels[index]}</strong>
              <span>{label}: {valueFormatter(point.value)}</span>
            </em>
          </span>
        ))}
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
  if (!info) return <span className="short-kpi-delta neutral">No prior update</span>;
  const tone = info.change > 0 ? 'up' : info.change < 0 ? 'down' : 'neutral';
  const sign = info.change > 0 ? '+' : info.change < 0 ? '-' : '';
  return (
    <span className={`short-kpi-delta ${tone}`}>
      <strong>{info.valueText}{suffix}</strong>
      <em>({sign}{Math.abs(info.percent).toLocaleString('en-US', { maximumFractionDigits: 2 })}%)</em>
    </span>
  );
}

function KpiCard({ label, value, change, suffix, deltaDisplay, pressureLabel, pressureTone }: {
  label: string;
  value: ReactNode;
  change: ReturnType<typeof delta>;
  suffix?: string;
  deltaDisplay?: string;
  pressureLabel: string;
  pressureTone: string;
}) {
  return (
    <div className="terminal-card terminal-stat short-kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <DeltaBadge info={change} suffix={suffix} display={deltaDisplay} />
      <em className={`lending-kpi-pressure ${pressureTone}`}>{pressureLabel}</em>
    </div>
  );
}

export default async function LendingPressurePage() {
  const [borrow, available, utilization, onLoan, pageContent] = await Promise.all([
    readImportFile<Row>('short/borrow_fee.json'),
    readImportFile<Row[]>('short/shares_available.json'),
    readImportFile<Row[]>('short/utilization.json'),
    readImportFile<Row[]>('short/on_loan.json'),
    readPageContent('lendingPressure'),
  ]);
  const borrowRows = rows(record(borrow.data).all);
  const availableRows = rows(available.data);
  const sortedAvailableRows = [...availableRows].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const sortedBorrowRows = [...borrowRows].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const utilizationRows = rows(utilization.data);
  const onLoanRows = rows(onLoan.data);
  const sortedOnLoanRows = [...onLoanRows].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const availableTrendRows = [...availableRows].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? ''))).slice(-7);
  const borrowTrendRows = [...borrowRows].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? ''))).slice(-7);
  const onLoanTrendRows = [...onLoanRows].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? ''))).slice(-7);
  const borrowFee = numeric(record(borrow.data).current && record(record(borrow.data).current).costToBorrowAll) ?? 0;
  const sharesAvailable = numeric(latest(availableRows).shortAvailabilityShares) ?? 0;
  const utilizationPct = numeric(latest(availableRows).shortAvailabilityPct) ?? 0;
  const onLoanShares = numeric(latest(onLoanRows).sharesOnLoan ?? latest(onLoanRows).onLoan) ?? 0;
  const availabilityPressure = sharesAvailable <= 100000 ? 100 : sharesAvailable <= 500000 ? 78 : sharesAvailable <= 1500000 ? 48 : 12;
  const utilizationPressure = Math.min(100, Math.max(0, utilizationPct));
  const borrowFeePressure = Math.min(100, Math.max(0, borrowFee));
  const onLoanPressure = onLoanShares >= 1000000 ? 100 : onLoanShares >= 650000 ? 62 : onLoanShares >= 400000 ? 38 : 12;
  const borrowDemandScore = Math.round((utilizationPressure * .42) + (borrowFeePressure * .35) + (availabilityPressure * .18) + (onLoanShares > 0 ? 5 : 0));
  const previousSharesAvailable = numeric(sortedAvailableRows[1]?.shortAvailabilityShares);
  const previousUtilizationPct = numeric(sortedAvailableRows[1]?.shortAvailabilityPct);
  const previousBorrowFee = numeric(sortedBorrowRows[1]?.costToBorrowAll);
  const previousOnLoanShares = numeric(sortedOnLoanRows[1]?.sharesOnLoan ?? sortedOnLoanRows[1]?.onLoan);
  const pressureScore = Math.round((availabilityPressure * .25) + (utilizationPressure * .3) + (borrowFeePressure * .3) + (borrowDemandScore * .15));
  const level = pressureScore >= 81 ? 'Extreme' : pressureScore >= 61 ? 'High' : pressureScore >= 31 ? 'Moderate' : 'Low';
  const componentStatus = (value: number) => value >= 81 ? 'Extreme Pressure' : value >= 61 ? 'High Pressure' : value >= 31 ? 'Moderate Pressure' : 'Low Pressure';
  const componentClass = (value: number) => value >= 81 ? 'extreme' : value >= 61 ? 'high' : value >= 31 ? 'moderate' : 'low';
  const availableDerived = record((available as unknown as Row).dataDerived);
  const lendingDerived = record(availableDerived.lendingPressurePage);
  const lendingSummary = record(lendingDerived.summary);
  const lendingCards = record(lendingDerived.cards);
  const borrowCards = record(record(record(borrow.data).derived).lendingPressurePage).cards as Record<string, Row> | undefined;
  const sharesAvailableCard = record(lendingCards.sharesAvailable);
  const utilizationCard = record(lendingCards.utilization);
  const borrowFeeCard = record(borrowCards?.borrowFee);
  const displayPressureScore = numeric(lendingSummary.pressureScore) ?? pressureScore;
  const displayLevel = String(lendingSummary.level ?? level);

  return (
    <ImportDataPreviewPage
      title="Lending Pressure Intelligence"
      description={text(pageContent.pageDescription, 'Detailed borrow availability, utilization, borrow fee, and on-loan data used to evaluate short seller pressure.')}
      files={['short/borrow_fee.json', 'short/shares_available.json', 'short/utilization.json', 'short/on_loan.json']}
    >
      <section className="terminal-section lending-page-overview">
        <div className="terminal-section__head">
          <div>
            <span>Overview</span>
            <h2><InfoTitle text="Borrow-pressure view focused on whether short sellers can still find shares to borrow and whether borrowing is becoming difficult or expensive.">Lending Pressure Overview</InfoTitle></h2>
            <p className="section-subtitle">{text(pageContent.overviewSubtitle, 'Executive view of share availability, borrowing conditions, inventory utilization, and lending pressure.')}</p>
          </div>
          <div className="terminal-section-actions">
            {sourceChip(available.sourcePlatform ?? 'Ortex')}
            {sourceChip('Internal Lending Model')}
          </div>
        </div>

        <div className="lending-pressure-hero-grid">
          <div className={`lending-pressure-hero ${displayLevel.toLowerCase()}`}>
            <span>Lending Pressure Score</span>
            <strong>{String(lendingSummary.pressureScoreDisplay ?? `${displayPressureScore} / 100`)}</strong>
            <em>{displayLevel}</em>
            <p>{text(pageContent.pressureNarrative, `Borrowing conditions indicate ${displayLevel.toLowerCase()} pressure on short sellers based on available inventory, utilization, borrow fee, and borrow demand.`)}</p>
          </div>
          <div className="lending-gauge-card">
            <div className="triggered-gauge" style={{ background: `conic-gradient(#be123c 0% ${displayPressureScore}%, #e8eef7 ${displayPressureScore}% 100%)` }}>
              <div><strong>{displayPressureScore}</strong><span>pressure score</span></div>
            </div>
            <p>{displayLevel} Pressure</p>
          </div>
        </div>

        <div className="lending-kpi-row lending-delta-kpi-row">
          <KpiCard label="Shares Available" value={String(sharesAvailableCard.valueDisplay ?? formatNumber(sharesAvailable))} change={delta(sharesAvailable, previousSharesAvailable, { maximumFractionDigits: 0 })} suffix=" shares" deltaDisplay={String(sharesAvailableCard.deltaDisplay ?? '')} pressureLabel={componentStatus(availabilityPressure)} pressureTone={componentClass(availabilityPressure)} />
          <KpiCard label="Utilization" value={String(utilizationCard.valueDisplay ?? formatPercent(utilizationPct, { maximumFractionDigits: 1 }))} change={delta(utilizationPct, previousUtilizationPct, { maximumFractionDigits: 2 })} suffix=" pts" deltaDisplay={String(utilizationCard.deltaDisplay ?? '')} pressureLabel={componentStatus(utilizationPressure)} pressureTone={componentClass(utilizationPressure)} />
          <KpiCard label="Borrow Fee" value={String(borrowFeeCard.valueDisplay ?? formatPercent(borrowFee, { maximumFractionDigits: 2 }))} change={delta(borrowFee, previousBorrowFee, { maximumFractionDigits: 2 })} suffix=" pts" deltaDisplay={String(borrowFeeCard.deltaDisplay ?? '')} pressureLabel={componentStatus(borrowFeePressure)} pressureTone={componentClass(borrowFeePressure)} />
          <KpiCard label="On Loan" value={formatNumber(onLoanShares)} change={delta(onLoanShares, previousOnLoanShares, { maximumFractionDigits: 0 })} suffix=" shares" pressureLabel={componentStatus(onLoanPressure)} pressureTone={componentClass(onLoanPressure)} />
        </div>

        <div className="lending-trend-grid">
          <div className="terminal-card chart-card"><h3><InfoTitle text="Trend of shares available to borrow. Declining availability can indicate tightening borrow supply.">Shares Available Trend</InfoTitle></h3><TrendLine label="Available" labels={availableTrendRows.map(row => shortDateLabel(row.date))} values={availableTrendRows.map(row => numeric(row.shortAvailabilityShares) ?? 0)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Utilization is currently mapped to shortAvailabilityPct from the shares-available file. Higher values indicate more reported short availability percentage in the current MVP data.">Utilization Trend</InfoTitle></h3><TrendLine label="Utilization" labels={availableTrendRows.map(row => shortDateLabel(row.date))} values={availableTrendRows.map(row => numeric(row.shortAvailabilityPct) ?? 0)} valueFormatter={value => `${formatNumber(value, { maximumFractionDigits: 2 })}%`} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Borrow fee trend shows whether short sellers are paying more to maintain or open short positions.">Borrow Fee Trend</InfoTitle></h3><TrendLine label="Borrow Fee" labels={borrowTrendRows.map(row => shortDateLabel(row.date))} values={borrowTrendRows.map(row => numeric(row.costToBorrowAll) ?? 0)} valueFormatter={value => `${formatNumber(value, { maximumFractionDigits: 2 })}%`} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Shares on loan approximates borrow demand. Rising on-loan activity can indicate stronger short-side demand.">On Loan Trend</InfoTitle></h3><TrendLine label="On Loan" labels={onLoanTrendRows.map(row => shortDateLabel(row.date))} values={onLoanTrendRows.map(row => numeric(row.sharesOnLoan) ?? numeric(row.onLoan) ?? 0)} /></div>
        </div>

        <div className="lending-bottom-grid">
          <div className="terminal-card squeeze-impact-card">
            <h3>Impact on Short Squeeze Risk</h3>
            <div className="contributors-grid">
              <div><h4>Positive Contributors</h4><ul>{textList(pageContent.positiveContributors, ['Borrow fee remains visible', 'Imported inventory can be monitored daily', 'Availability changes can quickly update pressure score']).map(item => <li key={item}>{item}</li>)}</ul></div>
              <div><h4>Negative Contributors</h4><ul>{textList(pageContent.negativeContributors, ['Large remaining inventory', 'Low utilization data currently available', 'No on-loan sample data yet']).map(item => <li key={item}>{item}</li>)}</ul></div>
            </div>
          </div>
          <div className="terminal-card ai-lending-card">
            <h3>AI Lending Analysis</h3>
            <p>{text(pageContent.aiLendingAnalysis, `Current imported data indicates ${level.toLowerCase()} lending pressure. Borrow fees are visible, but available inventory remains meaningful and utilization/on-loan inputs are not yet supported by complete institutional data. Management should monitor borrow fee changes, availability drops, and future utilization feeds as primary indicators.`)}</p>
            {sourceChip('Internal Lending Model')}
          </div>
        </div>
      </section>
    </ImportDataPreviewPage>
  );
}
