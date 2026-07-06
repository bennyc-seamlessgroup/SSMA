'use client';

import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';
import { InfoTooltip } from '@/components/InfoTooltip';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';
import { usePublicImportFiles } from '@/components/usePublicImportFiles';
import type { LendingWatchItemSeverity } from '@/lib/lending-pressure/watchItemRules';
import type { DashboardMarginFile, DashboardMarginRecord } from '@/lib/operations/dashboard-margin-store';
import { aiAnalysisFile, dashboardMarginFile, lendingPressureFile, normalizeTicker } from '@/lib/ticker-data';
import type { ReactNode } from 'react';

type Row = Record<string, unknown>;
type ImportEnvelope<T> = {
  importedAt?: string;
  sourcePlatform?: string;
  data?: T;
};

type AiAnalysis = {
  created_at_utc?: string;
  lending_pressure_analysis?: string;
};

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

function AiSummary({ value }: { value: string }) {
  const paragraphs = value.split(/\n+/).map(paragraph => paragraph.trim()).filter(Boolean);
  return (
    <div className="short-ai-analysis-copy">
      {paragraphs.map((paragraph, paragraphIndex) => {
        const parts = paragraph.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        return (
          <p key={`${paragraphIndex}-${paragraph.slice(0, 24)}`}>
            {parts.map((part, partIndex) => part.startsWith('**') && part.endsWith('**')
              ? <strong key={`${partIndex}-${part}`}>{part.slice(2, -2)}</strong>
              : <span key={`${partIndex}-${part.slice(0, 16)}`}>{part}</span>)}
          </p>
        );
      })}
    </div>
  );
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
          ? `${changePercent > 0 ? '+' : ''}${changePercent.toLocaleString('en-US', { maximumFractionDigits: 2 })}% vs yesterday`
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

export function LendingPressureBrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const dataFile = lendingPressureFile(normalizedTicker);
  const analysisFile = aiAnalysisFile(normalizedTicker);
  const marginFile = dashboardMarginFile(normalizedTicker);
  const contentFile = 'content/page_content.json';
  const { data, error, loading } = usePublicImportFiles([dataFile, analysisFile, marginFile, contentFile]);

  if (loading && !data) return <PortalPageLoading variant="lendingPressure" />;
  if (error || !data) {
    return <div className="page"><section className="panel"><h2>Lending pressure data unavailable</h2><p>{error}</p></section></div>;
  }

  const lendingEnvelope = (data[dataFile] ?? {}) as ImportEnvelope<Row>;
  const contentEnvelope = (data[contentFile] ?? {}) as ImportEnvelope<Record<string, Row>>;
  const pageContent = record((contentEnvelope.data ?? {}).lendingPressure);
  const aiAnalysis = (data[analysisFile] ?? null) as AiAnalysis | null;
  const marginPayload = (data[marginFile] ?? {}) as Partial<DashboardMarginFile>;
  const marginRecords = (Array.isArray(marginPayload.records) ? marginPayload.records : []) as DashboardMarginRecord[];
  const sortedMarginRecords = [...marginRecords].filter(row => row.date).sort((a, b) => b.date.localeCompare(a.date));
  const latestMarginRecord = sortedMarginRecords[0];
  const previousMarginRecord = sortedMarginRecords[1];
  const lendingData = record(lendingEnvelope.data);
  const current = record(lendingData.current);
  const dailyRows = rows(lendingData.daily);
  const sortedDailyRows = [...dailyRows].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const latestDaily = sortedDailyRows[0] ?? {};
  const previousDaily = sortedDailyRows[1] ?? {};
  const trendRows = [...dailyRows].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? ''))).slice(-7);
  const availabilityTrendRows = trendRows.filter(row => optionalNumeric(record(row.availability).shortAvailabilityShares) !== null);
  const utilizationTrendRows = trendRows.filter(row => optionalNumeric(record(row.availability).shortAvailabilityPct) !== null);
  const borrowFeeTrendRows = trendRows.filter(row => optionalNumeric(record(row.borrowFeeAll).costToBorrowAll) !== null);
  const latestAvailability = record(latestDaily.availability);
  const previousAvailability = record(previousDaily.availability);
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
  const lendingCards = record(lendingDerived.cards);
  const sharesAvailableCard = record(lendingCards.sharesAvailable);
  const utilizationCard = record(lendingCards.utilization);
  const borrowFeeCard = record(lendingCards.borrowFee);
  const displayPressureScore = numeric(lendingSummary.pressureScore) ?? pressureScore;
  const displayLevel = String(lendingSummary.level ?? level);
  const utilizationChangePercent = optionalNumeric(utilizationCard.changePercent)
    ?? percentageChange(utilizationPct, previousUtilizationPct);
  const borrowFeeChangePercent = optionalNumeric(borrowFeeCard.changePercent)
    ?? percentageChange(borrowFee, previousBorrowFee);
  const sharesAvailableChangePercent = optionalNumeric(sharesAvailableCard.changePercent)
    ?? percentageChange(sharesAvailable, previousSharesAvailable);
  const averageDurationDays = optionalNumeric(latestMarginRecord?.averageDurationDays);
  const previousAverageDurationDays = optionalNumeric(previousMarginRecord?.averageDurationDays);
  const averageDurationChangePercent = percentageChange(averageDurationDays, previousAverageDurationDays);
  const protocolLockupPercent = optionalNumeric(current.protocolLockupPercent);
  const protocolLockupChangePercent = optionalNumeric(current.protocolLockupChangePercent);
  const lockedCollateralShares = optionalNumeric(current.lockedCollateralShares);
  const lockedCollateralChangePercent = optionalNumeric(current.lockedCollateralChangePercent);
  const aiSummary = text(
    aiAnalysis?.lending_pressure_analysis,
    text(lendingData.aiLendingAnalysis, text(pageContent.aiLendingAnalysis, lendingScoreSummary(displayPressureScore, displayLevel))),
  ).trim();
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
  const scoreRanges = [
    { range: '0-30', level: 'Low', description: 'Borrow-market pressure is relatively contained.', active: displayPressureScore <= 30 },
    { range: '31-60', level: 'Moderate', description: 'Conditions warrant monitoring but are not uniformly stressed.', active: displayPressureScore >= 31 && displayPressureScore <= 60 },
    { range: '61-80', level: 'High', description: 'Tightening supply or cost may pressure short sellers.', active: displayPressureScore >= 61 && displayPressureScore <= 80 },
    { range: '81-100', level: 'Extreme', description: 'Severe lending pressure warrants close review.', active: displayPressureScore >= 81 },
  ];

  return (
    <ImportDataPreviewPage
      title="Lending Pressure Intelligence"
      description={text(pageContent.pageDescription, 'Detailed borrow availability, utilization, and borrow fee data used to evaluate short seller pressure.')}
      files={[dataFile, analysisFile, marginFile]}
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
            <div className="lending-score-layout">
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
                </div>
              </div>
              <div className="short-score-card-ranges" aria-label="Lending Pressure Score interpretation ranges">
                {scoreRanges.map(row => (
                  <div className={row.active ? 'active' : ''} key={row.range}>
                    <strong>{row.range}</strong>
                    <span><b>{row.level}</b>{row.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="terminal-card short-executive-card lending-market-snapshot">
            <span>Lending Market Snapshot</span>
            <div className="short-executive-metrics">
              <ExecutiveMetric label="Utilization" value={String(utilizationCard.valueDisplay ?? formatPercent(utilizationPct, { maximumFractionDigits: 1 }))} changePercent={utilizationChangePercent} />
              <ExecutiveMetric label="Borrow Fee" value={String(borrowFeeCard.valueDisplay ?? formatPercent(borrowFee, { maximumFractionDigits: 2 }))} changePercent={borrowFeeChangePercent} />
              <ExecutiveMetric label="Shortable Shares" value={String(sharesAvailableCard.valueDisplay ?? formatNumber(sharesAvailable))} changePercent={sharesAvailableChangePercent} />
              <ExecutiveMetric label="Average Duration" value={averageDurationDays === null ? 'N/A' : `${formatNumber(averageDurationDays, { maximumFractionDigits: 2 })}d`} changePercent={averageDurationChangePercent} />
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

        <article className="terminal-card short-executive-card short-management-guide lending-management-guide short-ai-analysis-card">
          <span>AI Analysis</span>
          <AiSummary value={aiSummary || 'Data unavailable'} />
          <small>AI-assisted interpretation. Review underlying data before making decisions.</small>
        </article>

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
          <div className="terminal-card chart-card"><h3><InfoTitle text="Trend of shares available to borrow. Declining availability can indicate tightening borrow supply.">Shortable Shares Trend</InfoTitle></h3><TrendLine label="Available" labels={availabilityTrendRows.map(row => shortDateLabel(row.date))} values={availabilityTrendRows.map(row => optionalNumeric(record(row.availability).shortAvailabilityShares) as number)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Utilization is currently mapped to the availability percentage in the consolidated lending file.">Utilization Trend</InfoTitle></h3><TrendLine label="Utilization" labels={utilizationTrendRows.map(row => shortDateLabel(row.date))} values={utilizationTrendRows.map(row => optionalNumeric(record(row.availability).shortAvailabilityPct) as number)} valueFormatter={value => `${formatNumber(value, { maximumFractionDigits: 2 })}%`} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Borrow fee trend shows whether short sellers are paying more to maintain or open short positions.">Borrow Fee Trend</InfoTitle></h3><TrendLine label="Borrow Fee" labels={borrowFeeTrendRows.map(row => shortDateLabel(row.date))} values={borrowFeeTrendRows.map(row => optionalNumeric(record(row.borrowFeeAll).costToBorrowAll) as number)} valueFormatter={value => `${formatNumber(value, { maximumFractionDigits: 2 })}%`} /></div>
        </div>
      </section>
      <PageDisclaimerNotice noticeKey="lendingPressure" disclaimerKey="securitiesLending" />
    </ImportDataPreviewPage>
  );
}
