'use client';

import { ApiDevelopmentTabs } from '@/components/ApiDevelopmentTabs';
import { ApiSourceTags } from '@/components/ApiSourceTags';
import { InfoTooltip } from '@/components/InfoTooltip';
import { PortalPageLoading } from '@/components/PortalPageLoading';
import { PageDisclaimerNotice } from '@/components/PageDisclaimerNotice';
import { fetchAiReport } from '@/lib/ai-report-api';
import { cachedAuthenticatedFetch } from '@/lib/auth-client';
import { latestCompleteMarketPublicationRecordFromHistory, marketPublicationRecordFromHistoryForDate, marketRecordDate, type MarketPublicationRecord } from '@/lib/market-data-publication';
import { normalizeTicker } from '@/lib/ticker-data';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

type Row = Record<string, unknown>;
type ApiDebugRow = {
  endpoint: string;
  source: string;
  status: string;
  recordCount: string;
  generatedAt: string;
  payload: string;
};

type MarketHistoryRecord = Row & {
  tradeDate?: string;
  borrowFeePercent?: number;
  availableShares?: number;
  availableSharesIbkr?: number;
  availableSharesFutu?: number;
  utilizationPercent?: number;
  averageDurationDays?: number;
};

type DashboardMarginRecord = {
  date: string;
  averageDurationDays?: number;
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

function getPath(input: unknown, path: string[]) {
  let cursor = input;
  for (const key of path) {
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) return undefined;
    cursor = (cursor as Row)[key];
  }
  return cursor;
}

function firstNumeric(...values: unknown[]) {
  for (const value of values) {
    const parsed = optionalNumeric(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function payloadRecordCount(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object' && Array.isArray((value as { records?: unknown }).records)) return (value as { records: unknown[] }).records.length;
  if (value && typeof value === 'object' && Array.isArray((value as { data?: { records?: unknown } }).data?.records)) return (value as { data: { records: unknown[] } }).data.records.length;
  if (value === null || value === undefined) return 0;
  return 1;
}

function payloadGeneratedAt(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const row = value as Row;
    return String(row.generatedAt ?? row.updatedAt ?? row.createdAt ?? row.created_at_utc ?? '');
  }
  if (Array.isArray(value)) {
    return value
      .filter(item => item && typeof item === 'object')
      .map(item => String((item as Row).generatedAt ?? (item as Row).updatedAt ?? (item as Row).createdAt ?? ''))
      .filter(Boolean)
      .sort()
      .at(-1) ?? '';
  }
  return '';
}

function payloadPreview(value: unknown) {
  if (value === null || value === undefined) return 'No data';
  try {
    return JSON.stringify(value).slice(0, 240);
  } catch {
    return String(value).slice(0, 240);
  }
}

function historyRecords(payload: unknown): MarketHistoryRecord[] {
  if (Array.isArray(payload)) return payload as MarketHistoryRecord[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { records?: unknown }).records)) return (payload as { records: MarketHistoryRecord[] }).records;
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: { records?: unknown } }).data?.records)) return (payload as { data: { records: MarketHistoryRecord[] } }).data.records;
  return [];
}

function buildLendingPayload(historyPayload: unknown) {
  const history = historyRecords(historyPayload);
  const publishedRecord = latestCompleteMarketPublicationRecordFromHistory(history);
  const publishedDate = publishedRecord ? marketRecordDate(publishedRecord) : '';
  const sortedHistory = [...history]
    .filter(row => Boolean(publishedDate) && String(row.tradeDate ?? '').slice(0, 10) <= publishedDate)
    .map(row => marketPublicationRecordFromHistoryForDate(history, marketRecordDate(row)))
    .sort((a, b) => String(a.tradeDate ?? '').localeCompare(String(b.tradeDate ?? '')));
  const latestHistory: MarketPublicationRecord = publishedRecord ?? {};
  const currentBorrowFee = firstNumeric(
    latestHistory.borrowFeePercent,
  );
  const currentAvailableShares = firstNumeric(
    latestHistory.availableShares,
    latestHistory.availableSharesIbkr,
    latestHistory.availableSharesFutu,
  );
  const currentUtilization = firstNumeric(
    latestHistory.utilizationPercent,
  );

  return {
    lendingData: {
      current: {
        costToBorrowAll: currentBorrowFee,
        shortAvailabilityShares: currentAvailableShares,
        shortAvailabilityPct: currentUtilization,
      },
      daily: sortedHistory.map(row => ({
        date: row.tradeDate,
        availability: {
          shortAvailabilityShares: firstNumeric(row.availableShares, row.availableSharesIbkr, row.availableSharesFutu),
          shortAvailabilityPct: row.utilizationPercent,
        },
        borrowFeeAll: {
          costToBorrowAll: row.borrowFeePercent,
        },
      })),
      derived: {
        lendingPressurePage: {
          summary: {},
          cards: {},
        },
      },
    },
    marginRecords: sortedHistory
      .filter(row => row.tradeDate)
      .map(row => {
        const averageDurationDays = optionalNumeric(row.averageDurationDays);
        return {
          date: String(row.tradeDate),
          averageDurationDays: averageDurationDays !== null && averageDurationDays > 0
            ? averageDurationDays
            : undefined,
        };
      }),
  };
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

export function LendingPressureBrowserPage({ ticker }: { ticker: string }) {
  const normalizedTicker = normalizeTicker(ticker);
  const [currentPayload, setCurrentPayload] = useState<unknown>(null);
  const [historyPayload, setHistoryPayload] = useState<unknown>(null);
  const [aiReportPayload, setAiReportPayload] = useState<unknown>(null);
  const [apiRows, setApiRows] = useState<ApiDebugRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const currentEndpoint = `/market-data/current?ticker=${encodeURIComponent(normalizedTicker)}&category=market-current`;
    const historyEndpoint = `/market-data/history?ticker=${encodeURIComponent(normalizedTicker)}&category=market-history`;
    const aiReportEndpoint = `/market-data/ai-report?ticker=${encodeURIComponent(normalizedTicker)}`;
    async function loadEndpoint(endpoint: string, request: () => Promise<unknown> = () => cachedAuthenticatedFetch(endpoint)) {
      try {
        const payload = await request();
        return {
          payload,
          debug: {
            endpoint,
            source: 'API Gateway',
            status: 'ok',
            recordCount: String(payloadRecordCount(payload)),
            generatedAt: payloadGeneratedAt(payload) || 'N/A',
            payload: payloadPreview(payload),
          },
        };
      } catch (nextError) {
        return {
          payload: null,
          debug: {
            endpoint,
            source: 'API Gateway',
            status: nextError instanceof Error ? `error: ${nextError.message}` : 'error',
            recordCount: '0',
            generatedAt: 'N/A',
            payload: 'No API payload returned.',
          },
        };
      }
    }

    Promise.all([loadEndpoint(currentEndpoint), loadEndpoint(historyEndpoint), loadEndpoint(aiReportEndpoint, () => fetchAiReport(normalizedTicker))])
      .then(([currentResult, historyResult, aiReportResult]) => {
        if (cancelled) return;
        setCurrentPayload(currentResult.payload);
        setHistoryPayload(historyResult.payload);
        setAiReportPayload(aiReportResult.payload);
        setApiRows([currentResult.debug, historyResult.debug, aiReportResult.debug]);
        if (!currentResult.payload && !historyResult.payload) {
          setStatus('error');
          setError('Unable to load lending pressure API data.');
          return;
        }
        setStatus('idle');
      })
      .catch(nextError => {
        if (cancelled) return;
        setStatus('error');
        setError(nextError instanceof Error ? nextError.message : 'Unable to load lending pressure API data.');
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedTicker]);

  if (status === 'loading') return <PortalPageLoading variant="lendingPressure" />;
  if (status === 'error' && !currentPayload && !historyPayload) {
    return <div className="page"><section className="panel"><h2>Lending pressure data unavailable</h2><p>{error}</p></section></div>;
  }

  const { lendingData, marginRecords } = buildLendingPayload(historyPayload);
  const sortedMarginRecords = [...marginRecords]
    .filter(row => row.date && optionalNumeric(row.averageDurationDays) !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
  const latestMarginRecord = sortedMarginRecords[0];
  const previousMarginRecord = sortedMarginRecords[1];
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
  const aiSummary = text(
    record(aiReportPayload).lending_pressure_analysis,
    'AI analysis is not available for the current consolidation date.',
  );
  const pressureLevels = ['Low', 'Moderate', 'High', 'Extreme'];

  return (
    <div className="page lending-pressure-page">
      <section className="terminal-section lending-page-overview">
        <div className="terminal-section__head">
          <div>
            <span>Overview</span>
            <h2><InfoTitle text="Borrow-pressure view focused on whether short sellers can still find shares to borrow and whether borrowing is becoming difficult or expensive.">Lending Pressure Overview</InfoTitle></h2>
            <p className="section-subtitle">Executive view of share availability, borrowing conditions, inventory utilization, and lending pressure.</p>
          </div>
          <div className="terminal-section-actions">
            <ApiSourceTags sources={[
              { endpoint: 'GET /market-data/current?category=market-current', label: 'Snapshot' },
              { endpoint: 'GET /market-data/history?category=market-history', label: 'Consolidated lending inputs' },
              { endpoint: 'GET /market-data/ai-report', label: 'AI analysis' },
            ]} />
          </div>
        </div>

        <div className="short-executive-grid lending-executive-grid">
          <article className={`terminal-card short-executive-card short-executive-score lending-executive-score lending-risk-factor-card ${displayLevel.toLowerCase()}`}>
            <span>Lending Pressure Risk Factor</span>
            <div className="lending-risk-factor">
              <div className="lending-risk-factor__status">
                <i aria-hidden="true" />
                <div>
                  <small>Current Condition</small>
                  <strong>{displayLevel} Pressure</strong>
                </div>
              </div>
              <p>{lendingScoreSummary(displayPressureScore, displayLevel)}</p>
              <div className="lending-risk-spectrum" aria-label={`Current lending pressure: ${displayLevel}`}>
                {pressureLevels.map(levelName => (
                  <span className={levelName === displayLevel ? 'active' : ''} key={levelName}>
                    <i aria-hidden="true" />
                    {levelName}
                  </span>
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
          <div className="terminal-section-actions">
            <ApiSourceTags sources={[
              { endpoint: 'GET /market-data/history?category=market-history', label: 'Borrow, utilization & availability history' },
            ]} />
          </div>
        </div>
        <div className="lending-trend-grid">
          <div className="terminal-card chart-card"><h3><InfoTitle text="Trend of shares available to borrow. Declining availability can indicate tightening borrow supply.">Shortable Shares Trend</InfoTitle></h3><TrendLine label="Available" labels={availabilityTrendRows.map(row => shortDateLabel(row.date))} values={availabilityTrendRows.map(row => optionalNumeric(record(row.availability).shortAvailabilityShares) as number)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Utilization is currently mapped to the availability percentage in the consolidated lending file.">Utilization Trend</InfoTitle></h3><TrendLine label="Utilization" labels={utilizationTrendRows.map(row => shortDateLabel(row.date))} values={utilizationTrendRows.map(row => optionalNumeric(record(row.availability).shortAvailabilityPct) as number)} valueFormatter={value => `${formatNumber(value, { maximumFractionDigits: 2 })}%`} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Borrow fee trend shows whether short sellers are paying more to maintain or open short positions.">Borrow Fee Trend</InfoTitle></h3><TrendLine label="Borrow Fee" labels={borrowFeeTrendRows.map(row => shortDateLabel(row.date))} values={borrowFeeTrendRows.map(row => optionalNumeric(record(row.borrowFeeAll).costToBorrowAll) as number)} valueFormatter={value => `${formatNumber(value, { maximumFractionDigits: 2 })}%`} /></div>
        </div>
      </section>
      <PageDisclaimerNotice noticeKey="lendingPressure" disclaimerKey="securitiesLending" />
      <section className="terminal-section import-data-dev-panel">
        <div className="terminal-section__head">
          <div>
            <span>Development Data</span>
            <h2>Lending Pressure API Table</h2>
            <p className="section-subtitle">This page reads lending pressure inputs from Market Data APIs only. No consolidated lending-pressure JSON fallback is used.</p>
          </div>
        </div>
        <ApiDevelopmentTabs sources={[
          { id: 'market-current', title: 'Market Current', endpoint: 'GET /market-data/current?category=market-current', source: 'Market Data API', payload: currentPayload, status: apiRows[0]?.status },
          { id: 'market-history', title: 'Market History', endpoint: 'GET /market-data/history?category=market-history', source: 'Market Data API', payload: historyPayload, status: apiRows[1]?.status },
          { id: 'ai-report', title: 'AI Report', endpoint: 'GET /market-data/ai-report', source: 'Market Data API', payload: aiReportPayload, status: apiRows[2]?.status },
        ]} />
      </section>
    </div>
  );
}
