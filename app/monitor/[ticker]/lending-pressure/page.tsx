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

export default function LendingPressurePage() {
  const borrow = readImportFile<Row>('short/borrow_fee.json');
  const available = readImportFile<Row[]>('short/shares_available.json');
  const utilization = readImportFile<Row[]>('short/utilization.json');
  const onLoan = readImportFile<Row[]>('short/on_loan.json');
  const borrowRows = rows(record(borrow.data).all);
  const availableRows = rows(available.data);
  const utilizationRows = rows(utilization.data);
  const onLoanRows = rows(onLoan.data);
  const borrowFee = numeric(record(borrow.data).current && record(record(borrow.data).current).costToBorrowAll) ?? 0;
  const sharesAvailable = numeric(latest(availableRows).shortAvailabilityShares) ?? 0;
  const utilizationPct = numeric(latest(utilizationRows).utilization) ?? 0;
  const onLoanShares = numeric(latest(onLoanRows).sharesOnLoan ?? latest(onLoanRows).onLoan) ?? 0;
  const availabilityPressure = sharesAvailable <= 100000 ? 100 : sharesAvailable <= 500000 ? 78 : sharesAvailable <= 1500000 ? 48 : 12;
  const utilizationPressure = Math.min(100, Math.max(0, utilizationPct));
  const borrowFeePressure = Math.min(100, Math.max(0, borrowFee));
  const borrowDemandScore = Math.round((utilizationPressure * .42) + (borrowFeePressure * .35) + (availabilityPressure * .18) + (onLoanShares > 0 ? 5 : 0));
  const pressureScore = Math.round((availabilityPressure * .25) + (utilizationPressure * .3) + (borrowFeePressure * .3) + (borrowDemandScore * .15));
  const level = pressureScore >= 81 ? 'Extreme' : pressureScore >= 61 ? 'High' : pressureScore >= 31 ? 'Moderate' : 'Low';
  const health = pressureScore >= 81 ? 'Critical' : pressureScore >= 61 ? 'Constrained' : pressureScore >= 31 ? 'Tightening' : 'Healthy';
  const borrowDemand = borrowDemandScore >= 81 ? 'Extreme' : borrowDemandScore >= 61 ? 'High' : borrowDemandScore >= 31 ? 'Moderate' : 'Low';
  const componentStatus = (value: number) => value >= 81 ? 'Extreme Pressure' : value >= 61 ? 'High Pressure' : value >= 31 ? 'Moderate Pressure' : 'Low Pressure';
  const componentClass = (value: number) => value >= 81 ? 'extreme' : value >= 61 ? 'high' : value >= 31 ? 'moderate' : 'low';
  const components = [
    { name: 'Shares Available', value: formatNumber(sharesAvailable), weight: '25%', pressure: availabilityPressure, source: available.sourcePlatform ?? 'Ortex' },
    { name: 'Utilization', value: formatPercent(utilizationPct, { maximumFractionDigits: 1 }), weight: '30%', pressure: utilizationPressure, source: utilization.sourcePlatform ?? 'Ortex' },
    { name: 'Borrow Fee', value: formatPercent(borrowFee, { maximumFractionDigits: 1 }), weight: '30%', pressure: borrowFeePressure, source: borrow.sourcePlatform ?? 'Ortex' },
    { name: 'Borrow Demand', value: borrowDemand, weight: '15%', pressure: borrowDemandScore, source: 'Internal Lending Model' },
  ];

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
          <div className={`lending-pressure-hero ${level.toLowerCase()}`}>
            <span>Lending Pressure Score</span>
            <strong>{pressureScore} / 100</strong>
            <em>{level}</em>
            <p>Borrowing conditions indicate {level.toLowerCase()} pressure on short sellers based on available inventory, utilization, borrow fee, and borrow demand.</p>
            <div className="lending-health-card">
              <span>Current Status</span>
              <strong>{health}</strong>
              <small>{health === 'Healthy' ? 'Available inventory remains sufficient while utilization is controlled.' : 'Borrow conditions warrant management review and continued monitoring.'}</small>
            </div>
          </div>
          <div className="lending-gauge-card">
            <div className="triggered-gauge" style={{ background: `conic-gradient(#be123c 0% ${pressureScore}%, #e8eef7 ${pressureScore}% 100%)` }}>
              <div><strong>{pressureScore}</strong><span>pressure score</span></div>
            </div>
            <p>{level} Pressure</p>
          </div>
        </div>

        <div className="lending-kpi-row">
          <div className="terminal-card terminal-stat"><span>Shares Available</span><strong>{formatNumber(sharesAvailable)}</strong><small>{available.sourcePlatform ?? 'Ortex'} latest inventory</small></div>
          <div className="terminal-card terminal-stat"><span>Utilization</span><strong>{formatPercent(utilizationPct, { maximumFractionDigits: 1 })}</strong><small>{utilizationRows.length ? 'lendable inventory used' : 'pending institutional data source'}</small></div>
          <div className="terminal-card terminal-stat"><span>Borrow Fee</span><strong>{formatPercent(borrowFee, { maximumFractionDigits: 2 })}</strong><small>cost to borrow</small></div>
          <div className="terminal-card terminal-stat"><span>Borrow Demand</span><strong>{borrowDemand}</strong><small>{formatNumber(onLoanShares)} shares on loan</small></div>
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

        <div className="grid cols-4 lending-trend-grid">
          <div className="terminal-card chart-card"><h3><InfoTitle text="Trend of shares available to borrow. Declining availability can indicate tightening borrow supply.">Shares Available Trend</InfoTitle></h3><TrendLine label="Available" values={availableRows.map(row => numeric(row.shortAvailabilityShares) ?? 0)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Utilization shows how much lendable inventory is already borrowed. High utilization can signal constrained borrow supply.">Utilization Trend</InfoTitle></h3><TrendLine label="Utilization" values={utilizationRows.map(row => numeric(row.utilization) ?? 0)} /></div>
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
