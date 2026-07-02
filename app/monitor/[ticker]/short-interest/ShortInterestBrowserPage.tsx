'use client';

import { ImportDataPreviewPage } from '@/components/ImportDataPreviewPage';
import { InfoTooltip } from '@/components/InfoTooltip';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { usePublicImportFiles } from '@/components/usePublicImportFiles';
import { evaluateShortInterestWatchItems, type WatchItemSeverity } from '@/lib/short-interest/watchItemRules';
import { aiAnalysisFile, normalizeTicker, shortInterestFile } from '@/lib/ticker-data';
import type { ReactNode } from 'react';

type Row = Record<string, unknown>;
type ImportEnvelope<T> = {
  sourcePlatform?: string;
  data?: T;
};

type AiAnalysis = {
  short_interest_current_interpretation?: string;
};

function parseAiAnalysis(value: unknown) {
  const lines = String(value ?? '')
    .replaceAll('**', '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
  return { headline: lines[0] ?? '', body: lines.slice(1).join(' ') };
}

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

function percentageChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

function conciseSentences(value: string, limit = 2) {
  const matches = value.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  return matches.map(sentence => sentence.trim()).filter(Boolean).slice(0, limit);
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
    const match = display.match(/^(.+?)(\([^)]*\))$/);
    return (
      <span className={`short-kpi-delta ${display.startsWith('-') ? 'down' : display.startsWith('+') ? 'up' : 'neutral'}`}>
        <strong>{match?.[1]?.trim() ?? display}</strong>
        <em>{match ? `${match[2]} vs yesterday` : 'vs yesterday'}</em>
      </span>
    );
  }
  if (!info) {
    return <span className="short-kpi-delta neutral">No prior update</span>;
  }
  const tone = info.change > 0 ? 'up' : info.change < 0 ? 'down' : 'neutral';
  const sign = info.change > 0 ? '+' : info.change < 0 ? '-' : '';
  return (
    <span className={`short-kpi-delta ${tone}`}>
      <strong>{info.valueText}{suffix}</strong>
      <em>({sign}{Math.abs(info.percent).toLocaleString('en-US', { maximumFractionDigits: 2 })}%) vs yesterday</em>
    </span>
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

function shortScoreExplanation(score: number, level: string) {
  if (score >= 80) return `${level} pressure means short-side risk is elevated. Borrow cost, short exposure, availability, or coverage conditions may be signaling a stronger squeeze-risk setup.`;
  if (score >= 65) return `${level} pressure means the score is above the normal range. Management should monitor whether borrow cost, short exposure, or share availability continues to tighten.`;
  if (score >= 40) return `${level} pressure means short-side conditions are present but not yet severe. The setup warrants monitoring, especially if multiple inputs move higher together.`;
  return `${level} pressure means current short-side conditions are relatively contained. The score does not indicate meaningful pressure unless the underlying inputs begin to worsen.`;
}

function shortScoreSummary(score: number, level: string) {
  if (score >= 80) return `${level} short-side pressure. Escalate monitoring of borrow cost, utilization, and inventory.`;
  if (score >= 65) return `${level} short-side pressure. Watch borrow cost, utilization, and available inventory.`;
  if (score >= 40) return `${level} pressure. Monitor whether multiple short-market inputs tighten together.`;
  return `${level} pressure. Current short-market conditions remain relatively contained.`;
}

type ShortSignal = {
  label: string;
  status: string;
  severity: WatchItemSeverity;
};

export function ShortInterestBrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const dataFile = shortInterestFile(normalizedTicker);
  const analysisFile = aiAnalysisFile(normalizedTicker);
  const contentFile = 'content/page_content.json';
  const { data, error, loading } = usePublicImportFiles([dataFile, analysisFile, contentFile]);

  if (loading && !data) return <PortalPageLoading variant="shortInterest" />;
  if (error || !data) {
    return <div className="page"><section className="panel"><h2>Short interest data unavailable</h2><p>{error}</p></section></div>;
  }

  const ortexEnvelope = (data[dataFile] ?? {}) as ImportEnvelope<Row>;
  const contentEnvelope = (data[contentFile] ?? {}) as ImportEnvelope<Record<string, Row>>;
  const contentMap = contentEnvelope.data ?? {};
  const pageContent = record(contentMap.shortInterest);
  const aiAnalysis = (data[analysisFile] ?? null) as AiAnalysis | null;

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
  const latestClosing = record(latestDaily.closingPrices);
  const previousClosing = record(previousDaily.closingPrices);
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
  const aiInterpretation = parseAiAnalysis(aiAnalysis?.short_interest_current_interpretation);
  const interpretationHeadline = text(aiInterpretation.headline, text(currentInterpretation.headline, 'Short positioning remains under management review'));
  const interpretationBody = text(aiInterpretation.body, text(currentInterpretation.body, shortScoreExplanation(shortScore, shortScoreLevel)));
  const ftdRows = rows(ortexData.ftd);
  const latestFtd = latest(ftdRows);
  const previousFtd = [...ftdRows].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))[1] ?? {};
  const ftdShares = optionalNumeric(shortCurrent.ftdShares ?? latestFtd.ftdShares);
  const ftdChangePercent = optionalNumeric(shortCurrent.ftdChangePercent)
    ?? percentageChange(ftdShares, numeric(previousFtd.ftdShares));
  const shortInterestChangePercent = numeric(shortInterestCard.changePercent) ?? shortInterestDelta?.percent;
  const borrowFeeChangePercent = numeric(borrowFeeCard.changePercent) ?? borrowFeeDelta?.percent;
  const sharesAvailableChangePercent = numeric(sharesAvailableCard.changePercent) ?? sharesAvailableDelta?.percent;
  const priceChangePercent = percentageChange(numeric(latestClosing.close), numeric(previousClosing.close));
  const volumeChangePercent = percentageChange(numeric(latestClosing.volume), numeric(previousClosing.volume));
  const floatShares = shortInterestPercent
    ? (shortInterestShares ?? 0) / (shortInterestPercent / 100)
    : undefined;
  const watchItems = evaluateShortInterestWatchItems({
    shortInterestPercent: shortInterestPercent ?? undefined,
    shortInterestShares: shortInterestShares ?? undefined,
    shortInterestChangePercent: shortInterestChangePercent ?? undefined,
    daysToCover: daysToCover ?? undefined,
    borrowFeePercent: borrowFee ?? undefined,
    borrowFeeChangePercent: borrowFeeChangePercent ?? undefined,
    utilizationPercent: utilization ?? undefined,
    sharesAvailable: sharesAvailable ?? undefined,
    sharesAvailableChangePercent: sharesAvailableChangePercent ?? undefined,
    ftdShares: ftdShares ?? undefined,
    ftdChangePercent: ftdChangePercent ?? undefined,
    priceChangePercent,
    volumeChangePercent,
    floatShares,
  });
  const guideBullets = [
    interpretationHeadline,
    ...conciseSentences(interpretationBody),
  ].slice(0, 3);
  const watchNext = watchItems[0]?.suggestedAction
    ?? 'Continue monitoring short exposure, borrow cost, utilization, and available inventory for material changes.';
  const signals: ShortSignal[] = [
    {
      label: 'Short Interest Trend',
      status: (shortInterestChangePercent ?? 0) >= 20 ? 'Rising rapidly' : (shortInterestChangePercent ?? 0) > 0 ? 'Rising' : (shortInterestChangePercent ?? 0) < 0 ? 'Falling' : 'Stable',
      severity: (shortInterestChangePercent ?? 0) >= 20 ? 'high' : (shortInterestChangePercent ?? 0) > 0 ? 'medium' : 'low',
    },
    {
      label: 'Borrow Fee Pressure',
      status: (borrowFee ?? 0) >= 50 ? 'Extreme' : (borrowFee ?? 0) >= 30 ? 'Elevated' : 'Normal',
      severity: (borrowFee ?? 0) >= 50 ? 'high' : (borrowFee ?? 0) >= 30 ? 'medium' : 'low',
    },
    {
      label: 'Utilization Pressure',
      status: (utilization ?? 0) >= 85 ? 'High' : (utilization ?? 0) >= 60 ? 'Moderate' : 'Low',
      severity: (utilization ?? 0) >= 85 ? 'high' : (utilization ?? 0) >= 60 ? 'medium' : 'low',
    },
    {
      label: 'Availability Stress',
      status: (sharesAvailable ?? Infinity) <= 100_000 ? 'Constrained' : (sharesAvailableChangePercent ?? 0) <= -30 ? 'Tightening' : 'Available',
      severity: (sharesAvailable ?? Infinity) <= 100_000 ? 'high' : (sharesAvailableChangePercent ?? 0) <= -30 ? 'medium' : 'low',
    },
    {
      label: 'Days to Cover Risk',
      status: (daysToCover ?? 0) >= 5 ? 'High' : (daysToCover ?? 0) >= 3 ? 'Moderate' : 'Low',
      severity: (daysToCover ?? 0) >= 5 ? 'high' : (daysToCover ?? 0) >= 3 ? 'medium' : 'low',
    },
    {
      label: 'FTD Pressure',
      status: ftdShares === null ? 'No data' : (ftdShares >= 500_000 || (ftdChangePercent ?? 0) >= 50) ? 'Building' : 'Normal',
      severity: ftdShares === null ? 'info' : (ftdShares >= 500_000 || (ftdChangePercent ?? 0) >= 50) ? 'medium' : 'low',
    },
  ];
  const scoreProgress = Math.min(100, Math.max(0, shortScore));

  return (
    <ImportDataPreviewPage
      title="Short Interest Intelligence"
      description="Short interest, borrow fee, shares available, days to cover, and squeeze risk from the consolidated ORTEX import data."
      files={[
        dataFile,
        analysisFile,
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

        <div className="short-executive-grid">
          <article className={`terminal-card short-executive-card short-executive-score ${shortScoreTone}`}>
            <span>Short Interest Score</span>
            <div className="short-score-compact">
              <div
                className="short-score-radial"
                style={{ background: `conic-gradient(var(--short-score-accent) ${scoreProgress}%, #e8eef7 ${scoreProgress}% 100%)` }}
              >
                <div>
                  <strong>{shortScore || 'N/A'}</strong>
                  <small>/ 100</small>
                </div>
              </div>
              <div className="short-score-compact__copy">
                <em>{String(shortScoreLevelCard.valueDisplay ?? shortScoreLevel)} Risk</em>
                <DeltaBadge info={shortScoreDelta} display={String(shortScoreCard.deltaDisplay ?? '')} />
                <p>{shortScoreSummary(shortScore, shortScoreLevel)}</p>
              </div>
            </div>
          </article>

          <article className="terminal-card short-executive-card short-key-metrics-card">
            <span>Key Short Metrics</span>
            <div className="short-executive-metrics">
              <ExecutiveMetric label="Short Interest %" value={String(siPercentCard.valueDisplay ?? formatPercent(shortInterestPercent, { maximumFractionDigits: 2 }))} changePercent={numeric(siPercentCard.changePercent) ?? shortInterestPctDelta?.percent} />
              <ExecutiveMetric label="Short Interest Shares" value={String(shortInterestCard.valueDisplay ?? formatNumber(shortInterestShares))} changePercent={shortInterestChangePercent} />
              <ExecutiveMetric label="Days to Cover" value={String(daysToCoverCard.valueDisplay ?? formatNumber(daysToCover, { maximumFractionDigits: 2 }))} changePercent={numeric(daysToCoverCard.changePercent) ?? daysToCoverDelta?.percent} />
              <ExecutiveMetric label="Borrow Fee" value={String(borrowFeeCard.valueDisplay ?? formatPercent(borrowFee, { maximumFractionDigits: 2 }))} changePercent={borrowFeeChangePercent} />
              <ExecutiveMetric label="Utilization" value={String(utilizationCard.valueDisplay ?? formatPercent(utilization, { maximumFractionDigits: 2 }))} changePercent={numeric(utilizationCard.changePercent) ?? utilizationDelta?.percent} />
            </div>
          </article>

          <article className="terminal-card short-executive-card short-management-guide">
            <span>Management Interpretation Guide</span>
            <ul>
              {guideBullets.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
            </ul>
            <div>
              <strong>What management should watch next</strong>
              <p>{watchNext}</p>
            </div>
          </article>
        </div>

        <div className="short-signal-strip" aria-label="Current short-interest signals">
          {signals.map(signal => (
            <div className={`short-signal-pill ${signal.severity}`} key={signal.label}>
              <i aria-hidden="true" />
              <span>{signal.label}</span>
              <strong>{signal.status}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="terminal-section short-management-watch-section">
        <div className="terminal-section__head">
          <div>
            <span>Rule-Based Monitoring</span>
            <h2>Management Watch Items</h2>
            <p className="section-subtitle">Triggered from transparent short-interest, borrow-market, utilization, availability, settlement, and price-volume rules.</p>
          </div>
        </div>
        {watchItems.length ? (
          <div className="short-watch-grid">
            {watchItems.map(item => (
              <article className={`short-watch-card ${item.severity}`} key={item.id}>
                <div className="short-watch-card__meta">
                  <em>{item.severity}</em>
                  <span>{item.category}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.message}</p>
                <div className="short-watch-card__detail">
                  <span>Why triggered</span>
                  <p>{item.reason}</p>
                </div>
                <div className="short-watch-card__detail action">
                  <span>Suggested action</span>
                  <p>{item.suggestedAction}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="short-watch-calm">
            <strong>No major management watch items triggered</strong>
            <p>No major management watch items triggered based on current short interest rules.</p>
          </div>
        )}
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
            <h3><InfoTitle text="Shortable shares indicate how many shares may still be available for borrowing. Lower inventory can increase borrow pressure.">Shortable Shares Trend</InfoTitle></h3>
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
