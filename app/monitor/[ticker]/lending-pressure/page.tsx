import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';
import { InfoTooltip } from '@/components/InfoTooltip';
import { parseAiAnalysis, readAiAnalysis } from '@/lib/ai-analysis';
import { readImportFile, readPageContent } from '@/lib/import-data';
import { evaluateLendingPressureWatchItems, type LendingWatchItemSeverity } from '@/lib/lending-pressure/watchItemRules';
import { getServerPortalTimeZone } from '@/lib/server-timezone';
import { aiAnalysisFile, lendingPressureFile, normalizeTicker } from '@/lib/ticker-data';
import { formatPortalDateTime } from '@/lib/timezone';
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

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalNumeric(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  return numeric(value);
}

function percentageChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

function conciseSentences(value: string, limit = 1) {
  const matches = value.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  return matches.map(sentence => sentence.trim()).filter(Boolean).slice(0, limit);
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

function ExecutiveMetric({ label, value, changePercent }: { label: string; value: string; changePercent?: number | null }) {
  const tone = typeof changePercent !== 'number' || !Number.isFinite(changePercent)
    ? 'neutral'
    : changePercent > 0
      ? 'up'
      : changePercent < 0
        ? 'down'
        : 'neutral';
  return (
    <div className="short-executive-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <em className={tone}>
        {typeof changePercent === 'number' && Number.isFinite(changePercent)
          ? `${changePercent > 0 ? '+' : ''}${changePercent.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
          : 'No prior period'}
      </em>
    </div>
  );
}

function lendingScoreSummary(score: number, level: string) {
  if (score >= 81) return `${level} lending pressure. Escalate monitoring of utilization, borrow cost, and inventory.`;
  if (score >= 61) return `${level} lending pressure. Watch for continued tightening in borrow supply and cost.`;
  if (score >= 31) return `${level} lending pressure. Conditions warrant monitoring but are not uniformly stressed.`;
  return `${level} lending pressure. Current borrow-market conditions remain relatively contained.`;
}

type LendingSignal = {
  label: string;
  status: string;
  severity: LendingWatchItemSeverity;
  trend?: 'up' | 'down';
};

type LendingContribution = {
  label: string;
  contribution: number | null;
  maxPoints: number;
  detail: string;
};

export default async function LendingPressurePage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);
  const dataFile = lendingPressureFile(normalizedTicker);
  const analysisFile = aiAnalysisFile(normalizedTicker);
  const [lendingEnvelope, pageContent, aiAnalysis, timeZone] = await Promise.all([
    readImportFile<Row>(dataFile),
    readPageContent('lendingPressure'),
    readAiAnalysis(normalizedTicker).catch(() => null),
    getServerPortalTimeZone(),
  ]);
  const lendingData = record(lendingEnvelope.data);
  const current = record(lendingData.current);
  const dailyRows = rows(lendingData.daily);
  const sortedDailyRows = [...dailyRows].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const latestDaily = sortedDailyRows[0] ?? {};
  const previousDaily = sortedDailyRows[1] ?? {};
  const trendRows = [...dailyRows].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? ''))).slice(-7);
  const latestAvailability = record(latestDaily.availability);
  const previousAvailability = record(previousDaily.availability);
  const latestOnLoan = record(latestDaily.onLoan);
  const previousOnLoan = record(previousDaily.onLoan);
  const previousBorrowFeeRow = record(previousDaily.borrowFeeAll);
  const borrowFee = numeric(current.costToBorrowAll) ?? 0;
  const sharesAvailable = numeric(current.shortAvailabilityShares) ?? 0;
  const utilizationPct = numeric(current.shortAvailabilityPct) ?? 0;
  const availabilityPressure = sharesAvailable <= 100000 ? 100 : sharesAvailable <= 500000 ? 78 : sharesAvailable <= 1500000 ? 48 : 12;
  const utilizationPressure = Math.min(100, Math.max(0, utilizationPct));
  const borrowFeePressure = Math.min(100, Math.max(0, borrowFee));
  const borrowDemandScore = Math.round((utilizationPressure * .45) + (borrowFeePressure * .35) + (availabilityPressure * .2));
  const previousSharesAvailable = numeric(previousAvailability.shortAvailabilityShares);
  const previousUtilizationPct = numeric(previousAvailability.shortAvailabilityPct);
  const previousBorrowFee = numeric(previousBorrowFeeRow.costToBorrowAll);
  const pressureScore = Math.round((availabilityPressure * .25) + (utilizationPressure * .3) + (borrowFeePressure * .3) + (borrowDemandScore * .15));
  const level = pressureScore >= 81 ? 'Extreme' : pressureScore >= 61 ? 'High' : pressureScore >= 31 ? 'Moderate' : 'Low';
  const lendingDerived = record(record(lendingData.derived).lendingPressurePage);
  const lendingSummary = record(lendingDerived.summary);
  const lendingComponents = record(lendingDerived.components);
  const lendingCards = record(lendingDerived.cards);
  const sharesAvailableCard = record(lendingCards.sharesAvailable);
  const utilizationCard = record(lendingCards.utilization);
  const borrowFeeCard = record(lendingCards.borrowFee);
  const onLoanCard = record(lendingCards.onLoan);
  const displayPressureScore = numeric(lendingSummary.pressureScore) ?? pressureScore;
  const displayLevel = String(lendingSummary.level ?? level);
  const lendingAnalysis = parseAiAnalysis(aiAnalysis?.lending_pressure_analysis);
  const utilizationChangePercent = optionalNumeric(utilizationCard.changePercent)
    ?? percentageChange(utilizationPct, previousUtilizationPct);
  const borrowFeeChangePercent = optionalNumeric(borrowFeeCard.changePercent)
    ?? percentageChange(borrowFee, previousBorrowFee);
  const sharesAvailableChangePercent = optionalNumeric(sharesAvailableCard.changePercent)
    ?? percentageChange(sharesAvailable, previousSharesAvailable);
  const onLoanShares = optionalNumeric(current.sharesOnLoan ?? latestOnLoan.sharesOnLoan ?? onLoanCard.value);
  const previousOnLoanShares = optionalNumeric(previousOnLoan.sharesOnLoan ?? onLoanCard.previousValue);
  const onLoanChangePercent = optionalNumeric(onLoanCard.changePercent)
    ?? percentageChange(onLoanShares, previousOnLoanShares);
  const averageDurationDays = optionalNumeric(current.averageDurationDays ?? current.averageDuration);
  const averageDurationChangePercent = optionalNumeric(current.averageDurationChangePercent);
  const loanValueUsd = optionalNumeric(current.loanValueUsd ?? current.loanValue);
  const loanValueChangePercent = optionalNumeric(current.loanValueChangePercent);
  const protocolLockupPercent = optionalNumeric(current.protocolLockupPercent);
  const protocolLockupChangePercent = optionalNumeric(current.protocolLockupChangePercent);
  const lockedCollateralShares = optionalNumeric(current.lockedCollateralShares);
  const lockedCollateralChangePercent = optionalNumeric(current.lockedCollateralChangePercent);
  const shortInterestPercent = optionalNumeric(current.shortInterestPercent);
  const daysToCover = optionalNumeric(current.daysToCover);
  const priceChangePercent = optionalNumeric(current.priceChangePercent);
  const volumeChangePercent = optionalNumeric(current.volumeChangePercent);
  const watchItems = evaluateLendingPressureWatchItems({
    utilizationPercent: utilizationPct,
    utilizationChangePercent: utilizationChangePercent ?? undefined,
    borrowFeePercent: borrowFee,
    borrowFeeChangePercent: borrowFeeChangePercent ?? undefined,
    sharesAvailable,
    sharesAvailableChangePercent: sharesAvailableChangePercent ?? undefined,
    onLoanShares: onLoanShares ?? undefined,
    onLoanChangePercent: onLoanChangePercent ?? undefined,
    averageDurationDays: averageDurationDays ?? undefined,
    averageDurationChangePercent: averageDurationChangePercent ?? undefined,
    loanValueUsd: loanValueUsd ?? undefined,
    loanValueChangePercent: loanValueChangePercent ?? undefined,
    protocolLockupPercent: protocolLockupPercent ?? undefined,
    protocolLockupChangePercent: protocolLockupChangePercent ?? undefined,
    lockedCollateralShares: lockedCollateralShares ?? undefined,
    lockedCollateralChangePercent: lockedCollateralChangePercent ?? undefined,
    shortInterestPercent: shortInterestPercent ?? undefined,
    daysToCover: daysToCover ?? undefined,
    priceChangePercent: priceChangePercent ?? undefined,
    volumeChangePercent: volumeChangePercent ?? undefined,
  });
  const interpretationHeadline = text(lendingAnalysis.headline, text(lendingData.aiLendingAnalysis, 'Lending conditions remain under management review'));
  const interpretationSummary = conciseSentences(text(lendingAnalysis.body, text(pageContent.aiLendingAnalysis, 'Monitor utilization, borrow cost, and available inventory for material changes.')))[0] ?? '';
  const watchNext = watchItems[0]?.suggestedAction
    ?? 'Continue monitoring utilization, borrow fee, availability, and changes in reported on-loan balances.';
  const updatedAt = aiAnalysis?.created_at_utc ?? lendingEnvelope.importedAt ?? null;
  const scoreProgress = Math.min(100, Math.max(0, displayPressureScore));
  const signals: LendingSignal[] = [
    {
      label: 'Utilization Pressure',
      status: utilizationPct >= 95 ? 'Extreme' : utilizationPct >= 85 ? 'High' : utilizationPct >= 60 ? 'Moderate' : 'Low',
      severity: utilizationPct >= 95 ? 'critical' : utilizationPct >= 85 ? 'high' : utilizationPct >= 60 ? 'medium' : 'low',
      trend: (utilizationChangePercent ?? 0) > 0 ? 'up' : (utilizationChangePercent ?? 0) < 0 ? 'down' : undefined,
    },
    {
      label: 'Borrow Fee Pressure',
      status: borrowFee >= 75 ? 'Extreme' : borrowFee >= 30 ? 'Elevated' : 'Normal',
      severity: borrowFee >= 75 ? 'critical' : borrowFee >= 30 ? 'high' : 'low',
      trend: (borrowFeeChangePercent ?? 0) > 0 ? 'up' : (borrowFeeChangePercent ?? 0) < 0 ? 'down' : undefined,
    },
    {
      label: 'Availability Stress',
      status: sharesAvailable <= 100_000 ? 'Constrained' : (sharesAvailableChangePercent ?? 0) <= -30 ? 'Tightening' : 'Available',
      severity: sharesAvailable <= 100_000 ? 'high' : (sharesAvailableChangePercent ?? 0) <= -30 ? 'medium' : 'low',
      trend: (sharesAvailableChangePercent ?? 0) > 0 ? 'up' : (sharesAvailableChangePercent ?? 0) < 0 ? 'down' : undefined,
    },
    {
      label: 'On Loan Trend',
      status: onLoanShares === null ? 'No data' : (onLoanChangePercent ?? 0) >= 20 ? 'Rising' : 'Stable',
      severity: onLoanShares === null ? 'info' : (onLoanChangePercent ?? 0) >= 20 ? 'medium' : 'low',
      trend: onLoanShares === null ? undefined : (onLoanChangePercent ?? 0) > 0 ? 'up' : (onLoanChangePercent ?? 0) < 0 ? 'down' : undefined,
    },
    {
      label: 'Average Duration Risk',
      status: averageDurationDays === null ? 'No data' : averageDurationDays >= 30 ? 'Long' : 'Normal',
      severity: averageDurationDays === null ? 'info' : averageDurationDays >= 30 ? 'medium' : 'low',
    },
    {
      label: 'Protocol Lock-up Risk',
      status: protocolLockupPercent === null ? 'No data' : protocolLockupPercent >= 20 ? 'Elevated' : 'Low',
      severity: protocolLockupPercent === null ? 'info' : protocolLockupPercent >= 20 ? 'medium' : 'low',
    },
    {
      label: 'Short Squeeze Support',
      status: utilizationPct >= 85 && borrowFee >= 30 ? 'Partial signal' : 'Low',
      severity: utilizationPct >= 85 && borrowFee >= 30 ? 'medium' : 'low',
    },
  ];
  const utilizationComponent = numeric(lendingComponents.utilizationPressure) ?? utilizationPressure;
  const borrowFeeComponent = numeric(lendingComponents.borrowFeePressure) ?? borrowFeePressure;
  const availabilityComponent = numeric(lendingComponents.availabilityPressure) ?? availabilityPressure;
  const borrowDemandComponent = numeric(lendingComponents.borrowDemandScore) ?? borrowDemandScore;
  const contributions: LendingContribution[] = [
    { label: 'Utilization', contribution: utilizationComponent * .30, maxPoints: 30, detail: `${formatPercent(utilizationPct, { maximumFractionDigits: 1 })} current utilization` },
    { label: 'Borrow Fee', contribution: borrowFeeComponent * .30, maxPoints: 30, detail: `${formatPercent(borrowFee, { maximumFractionDigits: 2 })} current fee` },
    { label: 'Availability', contribution: availabilityComponent * .25, maxPoints: 25, detail: `${formatNumber(sharesAvailable)} shares available` },
    { label: 'Borrow Demand Model', contribution: borrowDemandComponent * .15, maxPoints: 15, detail: String(lendingComponents.borrowDemand ?? 'Model contribution') },
    { label: 'On Loan', contribution: onLoanShares === null ? null : 0, maxPoints: 15, detail: onLoanShares === null ? 'No source data' : `${formatNumber(onLoanShares)} shares on loan` },
    { label: 'Average Duration', contribution: averageDurationDays === null ? null : 0, maxPoints: 15, detail: averageDurationDays === null ? 'No source data' : `${formatNumber(averageDurationDays, { maximumFractionDigits: 2 })} days` },
    { label: 'Protocol Lock-up', contribution: protocolLockupPercent === null ? null : 0, maxPoints: 15, detail: protocolLockupPercent === null ? 'No source data' : `${formatPercent(protocolLockupPercent)} collateralized share lock-up` },
  ];

  return (
    <ImportDataPreviewPage
      title="Lending Pressure Intelligence"
      description={text(pageContent.pageDescription, 'Detailed borrow availability, utilization, and borrow fee data used to evaluate short seller pressure.')}
      files={[dataFile, analysisFile]}
    >
      <section className="terminal-section lending-page-overview">
        <div className="terminal-section__head">
          <div>
            <span>Overview</span>
            <h2><InfoTitle text="Borrow-pressure view focused on whether short sellers can still find shares to borrow and whether borrowing is becoming difficult or expensive.">Lending Pressure Overview</InfoTitle></h2>
            <p className="section-subtitle">{text(pageContent.overviewSubtitle, 'Executive view of share availability, borrowing conditions, inventory utilization, and lending pressure.')}</p>
          </div>
          <div className="terminal-section-actions">
            {sourceChip(lendingEnvelope.sourcePlatform ?? 'Ortex')}
            {sourceChip('Internal Lending Model')}
          </div>
        </div>

        <div className="short-executive-grid lending-executive-grid">
          <article className={`terminal-card short-executive-card short-executive-score lending-executive-score ${displayLevel.toLowerCase()}`}>
            <span>Lending Pressure Score</span>
            <div className="short-score-compact">
              <div
                className="short-score-radial"
                style={{ background: `conic-gradient(var(--short-score-accent) ${scoreProgress}%, #e8eef7 ${scoreProgress}% 100%)` }}
              >
                <div><strong>{displayPressureScore}</strong><small>/ 100</small></div>
              </div>
              <div className="short-score-compact__copy">
                <em>{displayLevel} Pressure</em>
                <p>{lendingScoreSummary(displayPressureScore, displayLevel)}</p>
                {updatedAt && <time dateTime={updatedAt}>Updated {formatPortalDateTime(updatedAt, timeZone)}</time>}
              </div>
            </div>
          </article>

          <article className="terminal-card short-executive-card lending-market-snapshot">
            <span>Lending Market Snapshot</span>
            <div className="short-executive-metrics">
              <ExecutiveMetric label="Utilization" value={String(utilizationCard.valueDisplay ?? formatPercent(utilizationPct, { maximumFractionDigits: 1 }))} changePercent={utilizationChangePercent} />
              <ExecutiveMetric label="Borrow Fee" value={String(borrowFeeCard.valueDisplay ?? formatPercent(borrowFee, { maximumFractionDigits: 2 }))} changePercent={borrowFeeChangePercent} />
              <ExecutiveMetric label="Shares Available" value={String(sharesAvailableCard.valueDisplay ?? formatNumber(sharesAvailable))} changePercent={sharesAvailableChangePercent} />
              <ExecutiveMetric label="On Loan Shares" value={onLoanShares === null ? 'N/A' : formatNumber(onLoanShares)} changePercent={onLoanChangePercent} />
              <ExecutiveMetric label="Loan Value" value={loanValueUsd === null ? 'N/A' : `$${formatNumber(loanValueUsd)}`} changePercent={loanValueChangePercent} />
              <ExecutiveMetric label="Average Duration" value={averageDurationDays === null ? 'N/A' : `${formatNumber(averageDurationDays, { maximumFractionDigits: 2 })}d`} changePercent={averageDurationChangePercent} />
            </div>
          </article>

          <article className="terminal-card short-executive-card short-management-guide lending-management-guide">
            <span>Management Interpretation Guide</span>
            <ul>
              <li>The score combines utilization, borrow fee, availability, and reported borrow demand.</li>
              <li>High utilization can indicate less lendable inventory remains available.</li>
              <li>Rising borrow fees can increase the cost of maintaining short positions.</li>
              <li>Falling availability can signal recalls, new borrowing, or lending-pool withdrawal.</li>
            </ul>
            <div>
              <strong>Current interpretation</strong>
              <p><b>{interpretationHeadline}</b>{interpretationSummary ? ` ${interpretationSummary}` : ''}</p>
              <strong>What management should watch next</strong>
              <p>{watchNext}</p>
            </div>
          </article>
        </div>

        <div className="short-signal-strip lending-signal-strip" aria-label="Current lending-pressure signals">
          {signals.map(signal => (
            <div className={`short-signal-pill ${signal.severity}`} key={signal.label}>
              <i aria-hidden="true" />
              <span>{signal.label}</span>
              <strong>{signal.status}{signal.trend === 'up' ? ' ↑' : signal.trend === 'down' ? ' ↓' : ''}</strong>
            </div>
          ))}
        </div>

        <div className="terminal-card lending-pressure-breakdown">
          <div className="lending-pressure-breakdown__head">
            <div><span>Lending Pressure Breakdown</span><strong>Weighted contribution to the {displayPressureScore}-point score</strong></div>
            <small>Unavailable components are not inferred.</small>
          </div>
          <div className="lending-contribution-list">
            {contributions.map(row => (
              <div className={row.contribution === null ? 'unavailable' : ''} key={row.label}>
                <span>{row.label}</span>
                <div className="lending-contribution-track">
                  <i style={{ width: `${row.contribution === null ? 0 : Math.min(100, (row.contribution / row.maxPoints) * 100)}%` }} />
                </div>
                <strong>{row.contribution === null ? 'N/A' : `${row.contribution.toLocaleString('en-US', { maximumFractionDigits: 1 })} pts`}</strong>
                <small>{row.detail}</small>
              </div>
            ))}
          </div>
          <p>The backend composite also includes its borrow-demand model. Protocol lock-up refers to tokenized shares pledged as collateral, not shares lent out.</p>
        </div>
      </section>

      <section className="terminal-section short-management-watch-section lending-management-watch-section">
        <div className="terminal-section__head">
          <div>
            <span>Rule-Based Monitoring</span>
            <h2>Management Watch Items</h2>
            <p className="section-subtitle">Triggered from transparent utilization, borrow-fee, availability, on-loan, duration, protocol lock-up, and squeeze-risk rules.</p>
          </div>
        </div>
        {watchItems.length ? (
          <div className="short-watch-grid">
            {watchItems.map(item => (
              <article className={`short-watch-card ${item.severity}`} key={item.id}>
                <div className="short-watch-card__meta"><em>{item.severity}</em><span>{item.category}</span></div>
                <h3>{item.title}</h3>
                <p>{item.message}</p>
                <div className="short-watch-card__detail"><span>Why triggered</span><p>{item.reason}</p></div>
                <div className="short-watch-card__detail action"><span>Suggested action</span><p>{item.suggestedAction}</p></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="short-watch-calm">
            <strong>No major management watch items triggered</strong>
            <p>No major management watch items triggered based on current lending pressure rules.</p>
          </div>
        )}
      </section>

      <section className="terminal-section lending-trends-section">
        <div className="terminal-section__head">
          <div>
            <span>Trend Analysis</span>
            <h2>Lending Market Movement</h2>
            <p className="section-subtitle">Recent borrow availability, utilization, and borrow-fee trends.</p>
          </div>
        </div>
        <div className="lending-trend-grid">
          <div className="terminal-card chart-card"><h3><InfoTitle text="Trend of shares available to borrow. Declining availability can indicate tightening borrow supply.">Shares Available Trend</InfoTitle></h3><TrendLine label="Available" labels={trendRows.map(row => shortDateLabel(row.date))} values={trendRows.map(row => numeric(record(row.availability).shortAvailabilityShares) ?? 0)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Utilization is currently mapped to the availability percentage in the consolidated lending file.">Utilization Trend</InfoTitle></h3><TrendLine label="Utilization" labels={trendRows.map(row => shortDateLabel(row.date))} values={trendRows.map(row => numeric(record(row.availability).shortAvailabilityPct) ?? 0)} valueFormatter={value => `${formatNumber(value, { maximumFractionDigits: 2 })}%`} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Borrow fee trend shows whether short sellers are paying more to maintain or open short positions.">Borrow Fee Trend</InfoTitle></h3><TrendLine label="Borrow Fee" labels={trendRows.map(row => shortDateLabel(row.date))} values={trendRows.map(row => numeric(record(row.borrowFeeAll).costToBorrowAll) ?? 0)} valueFormatter={value => `${formatNumber(value, { maximumFractionDigits: 2 })}%`} /></div>
        </div>
      </section>
    </ImportDataPreviewPage>
  );
}
