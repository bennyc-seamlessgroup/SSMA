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
    <div className="terminal-line-chart lending-mini-trend">
      <div className="trend-chart-label">{label}: <strong>{formatNumber(plottedValues[plottedValues.length - 1], { maximumFractionDigits: 1 })}</strong></div>
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

function KpiCard({ label, value, change, suffix, deltaDisplay }: {
  label: string;
  value: ReactNode;
  change: ReturnType<typeof delta>;
  suffix?: string;
  deltaDisplay?: string;
}) {
  return (
    <div className="terminal-card terminal-stat short-kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <DeltaBadge info={change} suffix={suffix} display={deltaDisplay} />
    </div>
  );
}

export default async function LendingPressurePage() {
  const [borrow, available, utilization, onLoan] = await Promise.all([
    readImportFile<Row>('short/borrow_fee.json'),
    readImportFile<Row[]>('short/shares_available.json'),
    readImportFile<Row[]>('short/utilization.json'),
    readImportFile<Row[]>('short/on_loan.json'),
  ]);
  const borrowRows = rows(record(borrow.data).all);
  const availableRows = rows(available.data);
  const sortedAvailableRows = [...availableRows].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const sortedBorrowRows = [...borrowRows].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const utilizationRows = rows(utilization.data);
  const onLoanRows = rows(onLoan.data);
  const borrowFee = numeric(record(borrow.data).current && record(record(borrow.data).current).costToBorrowAll) ?? 0;
  const sharesAvailable = numeric(latest(availableRows).shortAvailabilityShares) ?? 0;
  const utilizationPct = numeric(latest(availableRows).shortAvailabilityPct) ?? 0;
  const onLoanShares = numeric(latest(onLoanRows).sharesOnLoan ?? latest(onLoanRows).onLoan) ?? 0;
  const availabilityPressure = sharesAvailable <= 100000 ? 100 : sharesAvailable <= 500000 ? 78 : sharesAvailable <= 1500000 ? 48 : 12;
  const utilizationPressure = Math.min(100, Math.max(0, utilizationPct));
  const borrowFeePressure = Math.min(100, Math.max(0, borrowFee));
  const borrowDemandScore = Math.round((utilizationPressure * .42) + (borrowFeePressure * .35) + (availabilityPressure * .18) + (onLoanShares > 0 ? 5 : 0));
  const previousSharesAvailable = numeric(sortedAvailableRows[1]?.shortAvailabilityShares);
  const previousUtilizationPct = numeric(sortedAvailableRows[1]?.shortAvailabilityPct);
  const previousBorrowFee = numeric(sortedBorrowRows[1]?.costToBorrowAll);
  const previousAvailabilityPressure = previousSharesAvailable === null ? null : previousSharesAvailable <= 100000 ? 100 : previousSharesAvailable <= 500000 ? 78 : previousSharesAvailable <= 1500000 ? 48 : 12;
  const previousUtilizationPressure = previousUtilizationPct === null ? null : Math.min(100, Math.max(0, previousUtilizationPct));
  const previousBorrowFeePressure = previousBorrowFee === null ? null : Math.min(100, Math.max(0, previousBorrowFee));
  const previousBorrowDemandScore = previousAvailabilityPressure === null || previousUtilizationPressure === null || previousBorrowFeePressure === null
    ? null
    : Math.round((previousUtilizationPressure * .42) + (previousBorrowFeePressure * .35) + (previousAvailabilityPressure * .18));
  const pressureScore = Math.round((availabilityPressure * .25) + (utilizationPressure * .3) + (borrowFeePressure * .3) + (borrowDemandScore * .15));
  const level = pressureScore >= 81 ? 'Extreme' : pressureScore >= 61 ? 'High' : pressureScore >= 31 ? 'Moderate' : 'Low';
  const health = pressureScore >= 81 ? 'Critical' : pressureScore >= 61 ? 'Constrained' : pressureScore >= 31 ? 'Tightening' : 'Healthy';
  const borrowDemand = borrowDemandScore >= 81 ? 'Extreme' : borrowDemandScore >= 61 ? 'High' : borrowDemandScore >= 31 ? 'Moderate' : 'Low';
  const componentStatus = (value: number) => value >= 81 ? 'Extreme Pressure' : value >= 61 ? 'High Pressure' : value >= 31 ? 'Moderate Pressure' : 'Low Pressure';
  const componentClass = (value: number) => value >= 81 ? 'extreme' : value >= 61 ? 'high' : value >= 31 ? 'moderate' : 'low';
  const components = [
    { name: 'Shares Available', value: formatNumber(sharesAvailable), weight: '25%', pressure: availabilityPressure, source: available.sourcePlatform ?? 'Ortex' },
    { name: 'Utilization', value: formatPercent(utilizationPct, { maximumFractionDigits: 1 }), weight: '30%', pressure: utilizationPressure, source: available.sourcePlatform ?? 'Ortex' },
    { name: 'Borrow Fee', value: formatPercent(borrowFee, { maximumFractionDigits: 1 }), weight: '30%', pressure: borrowFeePressure, source: borrow.sourcePlatform ?? 'Ortex' },
    { name: 'Borrow Demand', value: borrowDemand, weight: '15%', pressure: borrowDemandScore, source: 'Internal Lending Model' },
  ];
  const availableDerived = record((available as unknown as Row).dataDerived);
  const lendingDerived = record(availableDerived.lendingPressurePage);
  const lendingSummary = record(lendingDerived.summary);
  const lendingCards = record(lendingDerived.cards);
  const borrowCards = record(record(record(borrow.data).derived).lendingPressurePage).cards as Record<string, Row> | undefined;
  const sharesAvailableCard = record(lendingCards.sharesAvailable);
  const utilizationCard = record(lendingCards.utilization);
  const borrowDemandCard = record(lendingCards.borrowDemand);
  const borrowFeeCard = record(borrowCards?.borrowFee);
  const displayPressureScore = numeric(lendingSummary.pressureScore) ?? pressureScore;
  const displayLevel = String(lendingSummary.level ?? level);
  const displayHealth = String(lendingSummary.health ?? health);

  return (
    <ImportDataPreviewPage
      title="Lending Pressure Intelligence"
      description="Detailed borrow availability, utilization, borrow fee, and on-loan data used to evaluate short seller pressure."
      files={['short/borrow_fee.json', 'short/shares_available.json', 'short/utilization.json', 'short/on_loan.json']}
    >
      <section className="terminal-section lending-page-overview">
        <div className="terminal-section__head">
          <div>
            <span>Overview</span>
            <h2><InfoTitle text="Borrow-pressure view focused on whether short sellers can still find shares to borrow and whether borrowing is becoming difficult or expensive.">Lending Pressure Overview</InfoTitle></h2>
            <p className="section-subtitle">Executive view of share availability, borrowing conditions, inventory utilization, and lending pressure.</p>
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
            <p>Borrowing conditions indicate {displayLevel.toLowerCase()} pressure on short sellers based on available inventory, utilization, borrow fee, and borrow demand.</p>
            <div className="lending-health-card">
              <span>Current Status</span>
              <strong>{displayHealth}</strong>
              <small>{displayHealth === 'Healthy' ? 'Available inventory remains sufficient while utilization is controlled.' : 'Borrow conditions warrant management review and continued monitoring.'}</small>
            </div>
          </div>
          <div className="lending-gauge-card">
            <div className="triggered-gauge" style={{ background: `conic-gradient(#be123c 0% ${displayPressureScore}%, #e8eef7 ${displayPressureScore}% 100%)` }}>
              <div><strong>{displayPressureScore}</strong><span>pressure score</span></div>
            </div>
            <p>{displayLevel} Pressure</p>
          </div>
        </div>

        <div className="lending-kpi-row lending-delta-kpi-row">
          <KpiCard label="Shares Available" value={String(sharesAvailableCard.valueDisplay ?? formatNumber(sharesAvailable))} change={delta(sharesAvailable, previousSharesAvailable, { maximumFractionDigits: 0 })} suffix=" shares" deltaDisplay={String(sharesAvailableCard.deltaDisplay ?? '')} />
          <KpiCard label="Utilization" value={String(utilizationCard.valueDisplay ?? formatPercent(utilizationPct, { maximumFractionDigits: 1 }))} change={delta(utilizationPct, previousUtilizationPct, { maximumFractionDigits: 2 })} suffix=" pts" deltaDisplay={String(utilizationCard.deltaDisplay ?? '')} />
          <KpiCard label="Borrow Fee" value={String(borrowFeeCard.valueDisplay ?? formatPercent(borrowFee, { maximumFractionDigits: 2 }))} change={delta(borrowFee, previousBorrowFee, { maximumFractionDigits: 2 })} suffix=" pts" deltaDisplay={String(borrowFeeCard.deltaDisplay ?? '')} />
          <KpiCard label="Borrow Demand" value={String(borrowDemandCard.valueDisplay ?? borrowDemand)} change={delta(borrowDemandScore, previousBorrowDemandScore, { maximumFractionDigits: 0 })} suffix=" pts" deltaDisplay={String(borrowDemandCard.deltaDisplay ?? '')} />
        </div>

        <div className="lending-pressure-grid">
          <div className="terminal-card lending-breakdown-card">
            <h3>Lending Pressure Components</h3>
            <div className="lending-component-list">
              {components.map(component => (
                <div key={component.name}>
                  <span>{component.name}</span>
                  <strong>{component.value}</strong>
                  <small>Weight: {component.weight}</small>
                  <em className={componentClass(component.pressure)}>{componentStatus(component.pressure)}</em>
                  <small>Source: {component.source}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="terminal-card borrow-demand-card">
            <h3>{borrowDemand} Borrow Demand</h3>
            <p>Current borrow activity suggests {borrowDemand.toLowerCase()} demand for available shares based on utilization, borrow fee, on-loan activity, and available inventory.</p>
            <div className="lending-view-tabs"><span>7 Day</span><span>30 Day</span><span>90 Day</span></div>
            {sourceChip('Internal Lending Model')}
          </div>
        </div>

        <div className="lending-trend-grid">
          <div className="terminal-card chart-card"><h3><InfoTitle text="Trend of shares available to borrow. Declining availability can indicate tightening borrow supply.">Shares Available Trend</InfoTitle></h3><TrendLine label="Available" values={availableRows.map(row => numeric(row.shortAvailabilityShares) ?? 0)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Utilization is currently mapped to shortAvailabilityPct from the shares-available file. Higher values indicate more reported short availability percentage in the current MVP data.">Utilization Trend</InfoTitle></h3><TrendLine label="Utilization" values={availableRows.map(row => numeric(row.shortAvailabilityPct) ?? 0)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Borrow fee trend shows whether short sellers are paying more to maintain or open short positions.">Borrow Fee Trend</InfoTitle></h3><TrendLine label="Borrow Fee" values={borrowRows.map(row => numeric(row.costToBorrowAll) ?? 0)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Shares on loan approximates borrow demand. Rising on-loan activity can indicate stronger short-side demand.">On Loan Trend</InfoTitle></h3><TrendLine label="On Loan" values={onLoanRows.map(row => numeric(row.sharesOnLoan) ?? numeric(row.onLoan) ?? 0)} /></div>
        </div>

        <div className="lending-bottom-grid">
          <div className="terminal-card squeeze-impact-card">
            <h3>Impact on Short Squeeze Risk</h3>
            <div className="contributors-grid">
              <div><h4>Positive Contributors</h4><ul><li>Borrow fee remains visible</li><li>Imported inventory can be monitored daily</li><li>Availability changes can quickly update pressure score</li></ul></div>
              <div><h4>Negative Contributors</h4><ul><li>Large remaining inventory</li><li>Low utilization data currently available</li><li>No on-loan sample data yet</li></ul></div>
            </div>
          </div>
          <div className="terminal-card ai-lending-card">
            <h3>AI Lending Analysis</h3>
            <p>Current imported data indicates {level.toLowerCase()} lending pressure. Borrow fees are visible, but available inventory remains meaningful and utilization/on-loan inputs are not yet supported by complete institutional data. Management should monitor borrow fee changes, availability drops, and future utilization feeds as primary indicators.</p>
            {sourceChip('Internal Lending Model')}
          </div>
        </div>
      </section>
    </ImportDataPreviewPage>
  );
}
