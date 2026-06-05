import Link from 'next/link';
import { InfoTooltip } from '@/components/InfoTooltip';
import { MonitorExpertButton } from '@/components/MonitorExpertChat';
import { readImportFile } from '@/lib/import-data';

type Row = Record<string, unknown>;
type ImportEnvelope<T> = Row & { data: T; sourcePlatform?: string };
type ImportDashboard = {
  company: {
    ticker: string;
    companyName: string;
    exchange: string;
    marketCap: string;
    freeFloat: string;
    sharesOutstanding: string;
  };
  scores: {
    healthScore: number;
    marketSentimentScore: number;
    ownershipTrend: string;
    shortSqueezeRisk: number;
  };
  metrics: {
    borrowFee: string;
    sharesAvailable: string;
    shortInterestPercentFloat: string;
    daysToCover: string;
    putCallRatio: string;
    gammaExposure: string;
  };
  summaries: Row;
};

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Row[] : [];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function importEnvelope<T>(files: Row, path: string, fallbackData: T): ImportEnvelope<T> {
  const envelope = record(files[path]);
  return (Object.keys(envelope).length ? envelope : { data: fallbackData }) as ImportEnvelope<T>;
}

function text(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function textList(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim()) as string[] : fallback;
}

function recordList(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Row[] : [];
}

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function pct(value: number) {
  return `${Math.round(value)}%`;
}

function formatNumber(value: unknown, options?: Intl.NumberFormatOptions) {
  const parsed = numeric(value);
  return parsed === null ? 'N/A' : parsed.toLocaleString('en-US', options);
}

function formatPercent(value: unknown, options?: Intl.NumberFormatOptions) {
  const parsed = numeric(value);
  return parsed === null ? 'N/A' : `${parsed.toLocaleString('en-US', options)}%`;
}

function formatCurrency(value: unknown, options?: Intl.NumberFormatOptions) {
  const parsed = numeric(value);
  return parsed === null ? 'N/A' : `$${parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, ...options })}`;
}

function latest(rows: Row[], dateKey = 'date') {
  return [...rows].sort((a, b) => String(b[dateKey] ?? '').localeCompare(String(a[dateKey] ?? '')))[0] ?? {};
}

function sourceChip(source: string, tone: 'ready' | 'future' | 'warning' = 'ready') {
  return <span className={`source-chip ${tone}`}>Source: {source}</span>;
}

function viewMore(ticker: string, slug: string, label = 'View more') {
  return <Link className="section-view-more" href={`/monitor/${ticker}/${slug}` as any}>{label}</Link>;
}

function headActions(children: React.ReactNode) {
  return <div className="terminal-section-actions">{children}</div>;
}

function InfoTitle({ children, text }: { children: React.ReactNode; text: string }) {
  return <span className="with-info">{children} <InfoTooltip text={text} /></span>;
}

function MiniBars({ values }: { values: Array<{ label: string; value: number; tone?: string }> }) {
  const max = Math.max(...values.map(item => item.value), 1);
  return (
    <div className="terminal-bars">
      {values.map((item, index) => (
        <div className="terminal-bar-row" key={`${item.label}-${index}`}>
          <span>{item.label}</span>
          <div><i className={item.tone ?? ''} style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} /></div>
          <strong>{formatNumber(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function TrendLine({ values, labels, valueLabel = 'Score' }: { values: number[]; labels?: string[]; valueLabel?: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const plotted = values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
    const y = 88 - ((value - min) / range) * 68;
    return { value, x, y };
  });
  const points = plotted.map(point => `${point.x},${point.y}`).join(' ');

  return (
    <div className="terminal-line-chart">
      <div className="trend-chart-label">{valueLabel}: <strong>{Math.round(values[values.length - 1] ?? 0)}</strong></div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={points} />
      </svg>
      {plotted.map((point, index) => {
        const shouldLabel = index === 0 || index === plotted.length - 1;
        return (
        <span
          className={`trend-marker ${shouldLabel ? 'show-label' : ''}`}
          key={`${point.x}-${point.value}-${index}`}
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        >
          <i />
          {shouldLabel && <b>{Math.round(point.value)}</b>}
        </span>
        );
      })}
      {labels && (
        <div className="trend-x-axis">
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      )}
    </div>
  );
}

function Donut({ segments }: { segments: Array<{ label: string; value: number; color: string }> }) {
  const total = segments.reduce((sum, item) => sum + item.value, 0) || 1;
  let cursor = 0;
  const gradient = segments.map(item => {
    const start = cursor;
    cursor += (item.value / total) * 100;
    return `${item.color} ${start}% ${cursor}%`;
  }).join(', ');

  return (
    <div className="terminal-donut-wrap">
      <div className="terminal-donut" style={{ background: `conic-gradient(${gradient})` }}>
        <div><strong>{total}</strong><span>mentions</span></div>
      </div>
      <div className="terminal-legend">
        {segments.map(item => (
          <span key={item.label}><i style={{ background: item.color }} />{item.label} {pct((item.value / total) * 100)}</span>
        ))}
      </div>
    </div>
  );
}

function RadarChart({ items }: { items: Array<{ label: string; score: number; max: number }> }) {
  const center = 260;
  const points = items.map((item, index) => {
    const angle = ((Math.PI * 2) / items.length) * index - Math.PI / 2;
    const radius = 52 + (item.score / item.max) * 112;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    const labelRadius = 222;
    const labelX = center + Math.cos(angle) * labelRadius;
    const labelY = center + Math.sin(angle) * labelRadius;
    return { ...item, angle, x, y, labelX, labelY };
  });
  const polygonPoints = points.map(point => `${point.x},${point.y}`).join(' ');

  return (
    <div className="radar-shell">
      <div className="radar-web">
        <span className="radar-ring r1" />
        <span className="radar-ring r2" />
        <span className="radar-ring r3" />
        <svg className="radar-lines" viewBox="0 0 520 520" aria-hidden="true">
          <polygon points={polygonPoints} />
          {points.map(point => <line key={`line-${point.label}`} x1={center} y1={center} x2={point.x} y2={point.y} />)}
        </svg>
        {points.map(point => (
          <div
            className="radar-point"
            key={point.label}
            style={{ left: `${point.x}px`, top: `${point.y}px` }}
          />
        ))}
        {points.map(point => (
          <div
            className={`radar-label ${Math.cos(point.angle) < -0.25 ? 'left' : Math.cos(point.angle) > 0.25 ? 'right' : 'center'}`}
            key={`label-${point.label}`}
            style={{ left: `${point.labelX}px`, top: `${point.labelY}px` }}
          >
            <span>{point.label}</span>
            <strong>{point.score} / {point.max}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function CompanyDashboardPage() {
  const dashboardEnvelope = await readImportFile<Row>('dashboard_CURR_consolidated_4_web.json');
  const dashboardData = record(dashboardEnvelope.data);
  const dashboard = dashboardData.dashboard as ImportDashboard;
  const consolidatedFiles = record(dashboardData.files);
  const shortInterestEnvelope = importEnvelope<Row>(consolidatedFiles, 'short/short_interest.json', {});
  const borrowFeeEnvelope = importEnvelope<Row>(consolidatedFiles, 'short/borrow_fee.json', {});
  const sharesEnvelope = importEnvelope<Row[]>(consolidatedFiles, 'short/shares_available.json', []);
  const utilizationEnvelope = importEnvelope<Row[]>(consolidatedFiles, 'short/utilization.json', []);
  const shortScoreEnvelope = importEnvelope<Row[]>(consolidatedFiles, 'short/short_score.json', []);
  const topHoldersEnvelope = importEnvelope<Row[]>(consolidatedFiles, 'ownership/top_holders.json', []);
  const ownershipChangesEnvelope = importEnvelope<Row[]>(consolidatedFiles, 'ownership/ownership_changes.json', []);
  const activistEnvelope = importEnvelope<Row[]>(consolidatedFiles, 'ownership/activist_filings.json', []);
  const ownershipTrendEnvelope = importEnvelope<Row[]>(consolidatedFiles, 'ownership/ownership_trend.json', []);
  const insiderEnvelope = importEnvelope<Row[]>(consolidatedFiles, 'insider/insider_transactions.json', []);
  const insiderNetEnvelope = importEnvelope<Row>(consolidatedFiles, 'insider/net_insider_activity.json', {});
  const optionsEnvelope = importEnvelope<Row>(consolidatedFiles, 'options/options_summary.json', {});
  const putCallEnvelope = importEnvelope<Row>(consolidatedFiles, 'options/put_call_ratio.json', {});
  const openInterestEnvelope = importEnvelope<Row[]>(consolidatedFiles, 'options/open_interest.json', []);
  const gammaEnvelope = importEnvelope<Row[]>(consolidatedFiles, 'options/gamma_exposure.json', []);
  const alertsEnvelope = importEnvelope<Row[]>(consolidatedFiles, 'alerts/alerts.json', []);
  const newsEnvelope = importEnvelope<Row[]>(consolidatedFiles, 'news_filings/news.json', []);
  const filingsEnvelope = importEnvelope<Row[]>(consolidatedFiles, 'news_filings/sec_filings.json', []);
  const sentimentEnvelope = importEnvelope<Row[]>(consolidatedFiles, 'sentiment/social_mentions.json', []);
  const internalFloatEnvelope = importEnvelope<Row>(consolidatedFiles, 'internal_float/float_adjustments.json', {});
  const dashboardMetricsEnvelope = importEnvelope<Row>(consolidatedFiles, 'reports/dashboard_metrics.json', {});
  const pageContent = record(dashboardData.pageContent);
  const { company, scores, metrics, summaries } = dashboard;
  const internalFloat = internalFloatEnvelope.data;

  const shortCurrent = record(record(shortInterestEnvelope.data).current);
  const shortHistory = rows(record(shortInterestEnvelope.data).finraHistory).slice(0, 10).reverse();
  const borrowRows = rows(record(borrowFeeEnvelope.data).all);
  const borrowCurrent = record(record(borrowFeeEnvelope.data).current);
  const availableRows = rows(sharesEnvelope.data);
  const utilizationRows = rows(utilizationEnvelope.data);
  const shortScoreRows = rows(shortScoreEnvelope.data);
  const latestShortScore = latest(shortScoreRows);
  const latestAvailable = latest(availableRows);
  const topHolders = rows(topHoldersEnvelope.data).slice(0, 6);
  const ownershipChanges = rows(ownershipChangesEnvelope.data);
  const increasedPositions = ownershipChanges.filter(row => (numeric(row.sharesChange) ?? 0) > 0);
  const reducedPositions = ownershipChanges.filter(row => (numeric(row.sharesChange) ?? 0) < 0);
  const newHolders = ownershipChanges.filter(row => numeric(row.sharesPercentChange) === null && (numeric(row.sharesChange) ?? 0) > 0);
  const insiderRows = rows(insiderEnvelope.data);
  const insiderNet = record(insiderNetEnvelope.data);
  const socialMentions = rows(sentimentEnvelope.data);
  const positiveMentions = socialMentions.filter(row => String(row.sentiment).toLowerCase() === 'positive').length;
  const negativeMentions = socialMentions.filter(row => String(row.sentiment).toLowerCase() === 'negative').length;
  const neutralMentions = socialMentions.length - positiveMentions - negativeMentions;
  const sentimentScore = socialMentions.length
    ? Math.round(socialMentions.reduce((sum, row) => sum + (numeric(row.sentimentScore) ?? 50), 0) / socialMentions.length)
    : scores.marketSentimentScore;
  const platformCounts = socialMentions.reduce<Record<string, number>>((acc, row) => {
    const platform = String(row.platform ?? 'Other');
    const key = ['X', 'Reddit', 'StockTwits'].includes(platform) ? platform : 'Other';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const topics = [...new Set(socialMentions.map(row => String(row.topic ?? '')).filter(Boolean))].slice(0, 6);
  const influencers = socialMentions
    .sort((a, b) => (numeric(b.engagement) ?? 0) - (numeric(a.engagement) ?? 0))
    .slice(0, 5)
    .map(row => String(row.author ?? 'Unknown'));
  const communities = Object.entries(platformCounts).sort((a, b) => b[1] - a[1]).map(([name]) => name);
  const openInterestRows = rows(openInterestEnvelope.data);
  const gammaRows = rows(gammaEnvelope.data);
  const putCallRows = rows(record(putCallEnvelope.data).openInterestRatio);
  const latestPutCall = latest(putCallRows.length ? putCallRows : rows(record(putCallEnvelope.data).volumeRatio));
  const optionSummary = record(optionsEnvelope.data);
  const filings = rows(filingsEnvelope.data).slice(0, 4);
  const news = rows(newsEnvelope.data).slice(0, 4);
  const alerts = rows(alertsEnvelope.data).slice(0, 5);
  const squeezeScore = Math.max(0, Math.min(100, Math.round(numeric(latestShortScore.score) ?? numeric(latestShortScore.shortScore) ?? scores.shortSqueezeRisk)));
  const internalAdjustedSqueezeScore = Math.max(0, Math.min(100, Math.round(numeric(internalFloat.internalAdjustedSqueezeScore) ?? squeezeScore)));
  const riskAmplification = internalAdjustedSqueezeScore - squeezeScore;
  const squeezeProbability = Math.min(92, Math.max(8, Math.round(squeezeScore * 0.82)));
  const overallRisk = squeezeScore >= 75 ? 'Elevated' : squeezeScore >= 55 ? 'Watch' : 'Controlled';
  const marketRanking = 37;
  const marketUniverse = 4126;
  const percentile = Math.max(1, Math.round((marketRanking / marketUniverse) * 100));
  const shortInterestPct = numeric(shortCurrent.shortInterestPcFreeFloat) ?? 22.4;
  const utilizationPct = numeric(latestAvailable.shortAvailabilityPct) ?? 96;
  const borrowFeePct = numeric(borrowCurrent.costToBorrowAll) ?? 87;
  const sharesAvailable = numeric(latestAvailable.shortAvailabilityShares) ?? 42000;
  const firstShortHistory = shortHistory[0] ?? {};
  const lastShortHistory = shortHistory[shortHistory.length - 1] ?? {};
  const shortTrendPct = (() => {
    const first = numeric(firstShortHistory.currentShortPositionQuantity);
    const last = numeric(lastShortHistory.currentShortPositionQuantity);
    return first && last ? ((last - first) / first) * 100 : 12;
  })();
  const volumeMultiple = 2.4;
  const gammaScore = numeric(record(optionSummary.gamma).score) ?? numeric(record(optionSummary.gammaExposure).score) ?? 78;
  const putCallRatio = numeric(latestPutCall.putCallRatio ?? latestPutCall.putCallOIRatio ?? latestPutCall.putCallVolumeRatio) ?? 0.65;
  const institutionalOwnershipSupport = topHolders.reduce((sum, row) => sum + (numeric(row.ownershipPercent) ?? 0), 0) || 72;
  const adjustedFloatReduction = numeric(internalFloat.floatReductionPercent) ?? 28;

  const kpis = [
    { label: 'Public Short Squeeze Score', value: `${squeezeScore} / 100`, average: 'Market avg 42', rank: `Top ${percentile}%`, detail: `#${marketRanking} of ${marketUniverse}`, source: 'Internal Model', tone: 'bad', change: '+4.8', changeNote: 'risk rising', changeTone: 'bad', barValue: squeezeScore },
    { label: 'Internal Adjusted Squeeze Score', value: `${internalAdjustedSqueezeScore} / 100`, average: 'Private Management View', rank: `${formatPercent(internalFloat.floatReductionPercent, { maximumFractionDigits: 1 })} float reduction`, detail: 'Uses internal adjusted float and lendable float', source: 'Internal Management Input', tone: internalAdjustedSqueezeScore >= 75 ? 'bad' : internalAdjustedSqueezeScore >= 55 ? 'warn' : 'good', change: riskAmplification >= 0 ? `+${riskAmplification}` : `${riskAmplification}`, changeNote: 'vs public score', changeTone: riskAmplification > 0 ? 'bad' : riskAmplification < 0 ? 'good' : 'warn', barValue: internalAdjustedSqueezeScore },
    { label: 'US Market Ranking', value: `#${marketRanking}`, average: `${marketUniverse} stock universe`, rank: `Top ${percentile}%`, detail: 'Internal ranking engine placeholder', source: 'Internal Model', tone: 'bad', change: '+12', changeNote: 'moved up risk table', changeTone: 'bad', barValue: 99 - percentile },
    { label: 'Short Squeeze Probability', value: `${squeezeProbability}%`, average: 'Market avg 18%', rank: squeezeProbability >= 70 ? 'High probability band' : 'Watch band', detail: 'Model-calculated MVP estimate', source: 'Internal Model', tone: 'bad', change: '+3.1%', changeNote: 'probability higher', changeTone: 'bad', barValue: squeezeProbability },
    { label: 'Market Sentiment Score', value: `${sentimentScore} / 100`, average: `${socialMentions.length} social mentions`, rank: `${pct((positiveMentions / Math.max(socialMentions.length, 1)) * 100)} positive`, detail: 'Social media scan', source: 'Social Media Engine', tone: sentimentScore >= 70 ? 'good' : sentimentScore >= 45 ? 'warn' : 'bad', change: '+5.4', changeNote: 'sentiment improving', changeTone: 'good', barValue: sentimentScore },
    { label: 'Overall Risk Level', value: overallRisk, average: 'Management review', rank: 'Capital markets watch', detail: 'Short, options, sentiment, and ownership composite', source: 'Internal Model', tone: overallRisk === 'Elevated' ? 'bad' : overallRisk === 'Watch' ? 'warn' : 'good', change: '+1 level', changeNote: 'risk worsened', changeTone: 'bad', barValue: overallRisk === 'Elevated' ? 82 : overallRisk === 'Watch' ? 58 : 28 },
    { label: 'Company Health Score', value: `${scores.healthScore} / 100`, average: 'Market avg 61', rank: scores.healthScore >= 70 ? 'Above market' : 'Needs review', detail: 'Import data pool composite', source: 'Internal Model', tone: scores.healthScore >= 70 ? 'good' : scores.healthScore >= 45 ? 'warn' : 'bad', change: '+2.6', changeNote: 'health improving', changeTone: 'good', barValue: scores.healthScore },
  ];

  const breakdown = [
    { label: 'Short Interest Ratio', score: 28, max: 30, weight: '30%', contribution: 'High', source: shortInterestEnvelope.sourcePlatform ?? 'Ortex/FINRA' },
    { label: 'Securities Lending Utilization', score: 24, max: 25, weight: '25%', contribution: 'High', source: sharesEnvelope.sourcePlatform ?? 'Ortex' },
    { label: 'Short Position Trend', score: 13, max: 15, weight: '15%', contribution: 'Medium', source: shortInterestEnvelope.sourcePlatform ?? 'FINRA' },
    { label: 'Borrow Rate Pressure', score: 14, max: 15, weight: '15%', contribution: 'High', source: borrowFeeEnvelope.sourcePlatform ?? 'Ortex' },
    { label: 'Volume & Turnover Validation', score: 8, max: 10, weight: '10%', contribution: 'Medium', source: 'FINRA / Market Data' },
    { label: 'Institutional Short Concentration', score: 3, max: 5, weight: '5%', contribution: 'Pending', source: 'Future Data Provider Required' },
  ];

  const rankingRows = [
    ['AURX', 92, 1], ['QNTM', 89, 4], ['VRME', 86, 11], ['MIRA', 83, 19], ['CURR', squeezeScore, marketRanking],
    ['LTRY', 74, 48], ['SNTI', 72, 63], ['BFRG', 70, 88], ['WKEY', 68, 114], ['PBM', 66, 137],
  ];

  const readinessConditions = [
    {
      name: 'Short Interest',
      current: `${formatNumber(shortInterestPct, { maximumFractionDigits: 1 })}%`,
      threshold: '15%',
      status: shortInterestPct >= 15 ? 'TRIGGERED' : shortInterestPct >= 10 ? 'MONITORING' : 'NOT ACTIVE',
      source: shortInterestEnvelope.sourcePlatform ?? 'Ortex',
      explanation: 'Short interest exceeds the threshold associated with elevated squeeze potential.',
      weight: 13,
    },
    {
      name: 'Utilization',
      current: `${formatNumber(utilizationPct, { maximumFractionDigits: 1 })}%`,
      threshold: '90%',
      status: utilizationPct >= 90 ? 'TRIGGERED' : utilizationPct >= 75 ? 'MONITORING' : 'NOT ACTIVE',
      source: sharesEnvelope.sourcePlatform ?? 'Ortex',
      explanation: 'Most lendable shares are already borrowed.',
      weight: 13,
    },
    {
      name: 'Borrow Fee',
      current: `${formatNumber(borrowFeePct, { maximumFractionDigits: 1 })}%`,
      threshold: '50%',
      status: borrowFeePct >= 50 ? 'TRIGGERED' : borrowFeePct >= 25 ? 'MONITORING' : 'NOT ACTIVE',
      source: borrowFeeEnvelope.sourcePlatform ?? 'Ortex',
      explanation: 'High borrowing costs increase pressure on short sellers.',
      weight: 12,
    },
    {
      name: 'Shares Available',
      current: formatNumber(sharesAvailable),
      threshold: '100,000',
      status: sharesAvailable <= 100000 ? 'TRIGGERED' : sharesAvailable <= 250000 ? 'MONITORING' : 'NOT ACTIVE',
      source: sharesEnvelope.sourcePlatform ?? 'Ortex',
      explanation: 'Limited shares remain available for new short positions.',
      weight: 10,
    },
    {
      name: 'Short Interest Trend',
      current: `${shortTrendPct >= 0 ? '+' : ''}${formatNumber(shortTrendPct, { maximumFractionDigits: 1 })}% over 30 days`,
      threshold: 'Positive growth',
      status: shortTrendPct > 0 ? 'TRIGGERED' : shortTrendPct > -5 ? 'MONITORING' : 'NOT ACTIVE',
      source: shortInterestEnvelope.sourcePlatform ?? 'Ortex',
      explanation: 'Short positioning continues to increase.',
      weight: 8,
    },
    {
      name: 'Volume Confirmation',
      current: `${formatNumber(volumeMultiple, { maximumFractionDigits: 1 })}x average volume`,
      threshold: '1.5x',
      status: volumeMultiple >= 1.5 ? 'TRIGGERED' : volumeMultiple >= 1.1 ? 'MONITORING' : 'NOT ACTIVE',
      source: 'Databento',
      explanation: 'Trading activity supports the validity of current positioning.',
      weight: 8,
    },
    {
      name: 'Social Sentiment',
      current: `${sentimentScore}`,
      threshold: '80',
      status: sentimentScore >= 80 ? 'TRIGGERED' : sentimentScore >= 55 ? 'MONITORING' : 'NOT ACTIVE',
      source: 'Social Media Engine',
      explanation: 'Positive sentiment is increasing but has not reached trigger levels.',
      weight: 8,
    },
    {
      name: 'Options Pressure',
      current: `Put/Call ${formatNumber(putCallRatio, { maximumFractionDigits: 2 })} · Gamma ${formatNumber(gammaScore, { maximumFractionDigits: 0 })}`,
      threshold: 'Gamma > 80',
      status: gammaScore >= 80 ? 'TRIGGERED' : gammaScore >= 60 ? 'MONITORING' : 'NOT ACTIVE',
      source: optionsEnvelope.sourcePlatform ?? 'Ortex',
      explanation: 'Options activity is supportive but not yet extreme.',
      weight: 8,
    },
    {
      name: 'Institutional Ownership Support',
      current: `${formatNumber(institutionalOwnershipSupport, { maximumFractionDigits: 1 })}%`,
      threshold: '60%',
      status: institutionalOwnershipSupport >= 60 ? 'TRIGGERED' : institutionalOwnershipSupport >= 40 ? 'MONITORING' : 'NOT ACTIVE',
      source: topHoldersEnvelope.sourcePlatform ?? 'Fintel',
      explanation: 'Strong institutional ownership may reduce effective float.',
      weight: 6,
    },
    {
      name: 'Internal Float Adjustment',
      current: `${formatNumber(adjustedFloatReduction, { maximumFractionDigits: 1 })}% reduction`,
      threshold: '20%',
      status: adjustedFloatReduction >= 20 ? 'TRIGGERED' : adjustedFloatReduction >= 10 ? 'MONITORING' : 'NOT ACTIVE',
      source: 'Internal Float Intelligence',
      explanation: 'Management-adjusted float suggests fewer shares are available than public data indicates.',
      weight: 14,
    },
  ] as const;
  const readinessScore = Math.round(readinessConditions.reduce((sum, condition) => {
    if (condition.status === 'TRIGGERED') return sum + condition.weight;
    if (condition.status === 'MONITORING') return sum + condition.weight * 0.5;
    return sum;
  }, 0));
  const readinessLevel = readinessScore >= 81 ? 'Extreme' : readinessScore >= 61 ? 'High' : readinessScore >= 31 ? 'Moderate' : 'Low';
  const readinessTone = readinessScore >= 81 ? 'extreme' : readinessScore >= 61 ? 'high' : readinessScore >= 31 ? 'moderate' : 'low';
  const triggeredConditions = readinessConditions.filter(condition => condition.status === 'TRIGGERED');
  const monitoringConditions = readinessConditions.filter(condition => condition.status === 'MONITORING');
  const inactiveConditions = readinessConditions.filter(condition => condition.status === 'NOT ACTIVE');
  const activeConditionPercent = Math.round((triggeredConditions.length / readinessConditions.length) * 100);
  const availabilityPressure = sharesAvailable <= 100000 ? 100 : sharesAvailable <= 500000 ? 78 : sharesAvailable <= 2500000 ? 52 : 24;
  const utilizationPressure = Math.max(0, Math.min(100, utilizationPct));
  const borrowFeePressure = Math.max(0, Math.min(100, borrowFeePct));
  const borrowDemandScore = Math.max(0, Math.min(100, Math.round((utilizationPressure * 0.45) + (borrowFeePressure * 0.35) + (availabilityPressure * 0.2))));
  const borrowDemandLabel = borrowDemandScore >= 81 ? 'Extreme' : borrowDemandScore >= 61 ? 'High' : borrowDemandScore >= 31 ? 'Moderate' : 'Low';
  const lendingPressureScore = Math.round((availabilityPressure * 0.25) + (utilizationPressure * 0.3) + (borrowFeePressure * 0.3) + (borrowDemandScore * 0.15));
  const lendingPressureLevel = lendingPressureScore >= 81 ? 'Extreme' : lendingPressureScore >= 61 ? 'High' : lendingPressureScore >= 31 ? 'Moderate' : 'Low';
  const lendingHealthStatus = lendingPressureScore >= 81 ? 'Critical' : lendingPressureScore >= 61 ? 'Constrained' : lendingPressureScore >= 31 ? 'Tightening' : 'Healthy';
  const pressureStatus = (value: number) => value >= 81 ? 'Extreme Pressure' : value >= 61 ? 'High Pressure' : value >= 31 ? 'Moderate Pressure' : 'Low Pressure';
  const lendingComponents = [
    { name: 'Shares Available', weight: '25%', value: formatNumber(sharesAvailable), status: pressureStatus(availabilityPressure), source: sharesEnvelope.sourcePlatform ?? 'Ortex' },
    { name: 'Utilization', weight: '30%', value: `${formatNumber(utilizationPct, { maximumFractionDigits: 1 })}%`, status: pressureStatus(utilizationPressure), source: sharesEnvelope.sourcePlatform ?? 'Ortex' },
    { name: 'Borrow Fee', weight: '30%', value: `${formatNumber(borrowFeePct, { maximumFractionDigits: 1 })}%`, status: pressureStatus(borrowFeePressure), source: borrowFeeEnvelope.sourcePlatform ?? 'Ortex' },
    { name: 'Borrow Demand', weight: '15%', value: borrowDemandLabel, status: pressureStatus(borrowDemandScore), source: 'Internal Lending Model' },
  ];
  const lendingPositiveFactors = [
    borrowFeePressure >= 61 ? 'High Borrow Fee' : null,
    utilizationPressure >= 61 ? 'High Utilization' : null,
    availabilityPressure >= 61 ? 'Limited Share Availability' : null,
    borrowDemandScore >= 61 ? 'Strong Borrow Demand' : null,
  ].filter(Boolean);
  const lendingNegativeFactors = [
    availabilityPressure < 50 ? 'Large Remaining Inventory' : null,
    borrowDemandScore < 50 ? 'Falling Borrow Demand' : null,
    borrowFeePressure < 31 ? 'Low Borrow Fee' : null,
  ].filter(Boolean);
  const sentimentTrendValues = [42, 48, 53, 59, 63, 61, sentimentScore];
  const sentimentTrendLabels = ['May 21', 'May 22', 'May 23', 'May 24', 'May 25', 'May 26', 'May 27'];
  const currentPrice = 4;
  const priceScenarios = [
    { name: 'Base Case', probability: 60, target: 5.2, upside: 30, risk: 'Low', description: 'Normal market appreciation without significant squeeze activity.' },
    { name: 'Moderate Squeeze', probability: 25, target: 8.4, upside: 110, risk: 'Medium', description: 'Partial short covering and increased retail participation.' },
    { name: 'High Squeeze', probability: 10, target: 14.7, upside: 267, risk: 'High', description: 'Broad short covering combined with elevated borrow costs and reduced float.' },
    { name: 'Extreme Squeeze', probability: 5, target: 25, upside: 525, risk: 'Extreme', description: 'Forced institutional covering under severe borrow constraints.' },
  ];
  const priceDrivers = [
    ['High Short Interest', shortInterestPct >= 15 ? 'High' : 'Medium', shortInterestEnvelope.sourcePlatform ?? 'Ortex'],
    ['Elevated Borrow Fee', borrowFeePct >= 50 ? 'High' : 'Medium', borrowFeeEnvelope.sourcePlatform ?? 'Ortex'],
    ['Reduced Effective Float', adjustedFloatReduction >= 20 ? 'High' : 'Medium', 'Internal Float Intelligence'],
    ['Positive Sentiment', sentimentScore >= 70 ? 'High' : 'Medium', 'Social Media Engine'],
    ['Strong Options Activity', gammaScore >= 80 ? 'High' : 'Medium', optionsEnvelope.sourcePlatform ?? 'Ortex'],
  ];
  const catalystItems = [
    { date: 'May 20', title: 'Conference Presentation', category: 'Corporate', impact: 'Medium', source: 'Company Calendar' },
    { date: 'May 30', title: 'Q2 Earnings Call', category: 'Financial', impact: 'High', source: 'Company Calendar' },
    { date: 'June 15', title: 'Russell Reconstitution', category: 'Market Structure', impact: 'High', source: 'News Intelligence' },
    { date: 'June 28', title: 'Investor Day', category: 'Corporate', impact: 'Medium', source: 'Internal Events' },
    { date: 'July 10', title: 'Product Launch', category: 'Product', impact: 'Medium', source: 'Internal Events' },
    { date: 'July 18', title: 'Institutional Ownership Disclosure Window', category: 'Financial', impact: 'Low', source: 'Fintel' },
    { date: 'August 02', title: 'SEC Filing Review', category: 'Regulatory', impact: 'Low', source: 'SEC EDGAR' },
    { date: 'August 12', title: 'Capital Markets Update', category: 'Corporate', impact: 'Medium', source: 'Internal Events' },
    { date: 'August 22', title: 'Lockup Review Window', category: 'Market Structure', impact: 'Low', source: 'Internal Events' },
    { date: 'September 04', title: 'Strategic Partnership Deadline', category: 'Corporate', impact: 'High', source: 'News Intelligence' },
    { date: 'September 18', title: 'Commercial Rollout Milestone', category: 'Product', impact: 'Medium', source: 'Internal Events' },
    { date: 'September 30', title: 'Quarter-End Filing Watch', category: 'Regulatory', impact: 'Low', source: 'SEC EDGAR' },
  ];
  const catalystCategories = [
    ['Financial', 'Earnings · Guidance · SEC filings'],
    ['Corporate', 'M&A · Partnerships · Capital raises'],
    ['Market Structure', 'Russell rebalance · Index inclusion · Lockup expiry'],
    ['Product', 'Product launch · Commercial rollout'],
    ['Regulatory', 'FDA · SEC · Government decisions'],
  ];
  const catalystMonths = [
    ['May', 2, '1 high'],
    ['June', 2, '1 high'],
    ['July', 2, '2 medium'],
    ['August', 3, '1 medium'],
    ['September', 3, '1 high'],
  ];
  const highImpactCatalysts = catalystItems.filter(item => item.impact === 'High').length;
  const mediumImpactCatalysts = catalystItems.filter(item => item.impact === 'Medium').length;
  const lowImpactCatalysts = catalystItems.filter(item => item.impact === 'Low').length;
  const largestNewHolder = [...newHolders].sort((a, b) => (numeric(b.shares) ?? numeric(b.sharesChange) ?? 0) - (numeric(a.shares) ?? numeric(a.sharesChange) ?? 0))[0] ?? {
    investorName: 'BlackRock',
    sharesChange: 1200000,
    fileDate: '2026-05-23',
    formType: '13G',
  };
  const largestIncrease = [...increasedPositions].sort((a, b) => (numeric(b.sharesChange) ?? 0) - (numeric(a.sharesChange) ?? 0))[0] ?? largestNewHolder;
  const largestReduction = [...reducedPositions].sort((a, b) => (numeric(a.sharesChange) ?? 0) - (numeric(b.sharesChange) ?? 0))[0] ?? {
    investorName: 'Vanguard',
    sharesChange: -500000,
    fileDate: '2026-05-18',
    formType: '13F-HR',
  };
  const latestActivistFiling = rows(activistEnvelope.data).sort((a, b) => String(b.fileDate ?? '').localeCompare(String(a.fileDate ?? '')))[0] ?? {
    formType: '13G',
    fileDate: '2026-05-23',
    investorName: 'Institutional Holder Added',
  };
  const netInstitutionalShares = ownershipChanges.reduce((sum, row) => sum + (numeric(row.sharesChange) ?? 0), 0);
  const ownershipScore = Math.max(0, Math.min(100, Math.round(62 + Math.min(24, Math.max(-18, netInstitutionalShares / 3500)) + Math.min(8, newHolders.length * 2))));
  const ownershipSignal = ownershipScore >= 66 ? 'Bullish' : ownershipScore >= 45 ? 'Neutral' : 'Bearish';
  const insiderBuyRows = insiderRows.filter(row => String(row.transactionType).toLowerCase().includes('buy') || String(row.transactionCode).toLowerCase() === 'p');
  const insiderSellRows = insiderRows.filter(row => String(row.transactionType).toLowerCase().includes('sell') || String(row.transactionCode).toLowerCase() === 's');
  const latestInsiderPurchase = [...insiderBuyRows].sort((a, b) => String(b.transactionDate ?? b.fileDate ?? '').localeCompare(String(a.transactionDate ?? a.fileDate ?? '')))[0] ?? {
    insiderName: 'CEO Purchase',
    shares: 200000,
    value: 824000,
    transactionDate: '2026-05-20',
  };
  const latestInsiderSale = [...insiderSellRows].sort((a, b) => String(b.transactionDate ?? b.fileDate ?? '').localeCompare(String(a.transactionDate ?? a.fileDate ?? '')))[0] ?? {
    insiderName: 'Director Sale',
    shares: 50000,
    value: 250500,
    transactionDate: '2026-05-17',
  };
  const largestInsiderTransaction = [...insiderRows].sort((a, b) => (numeric(b.shares) ?? 0) - (numeric(a.shares) ?? 0))[0] ?? latestInsiderPurchase;
  const insiderScore = Math.max(0, Math.min(100, Math.round(50 + insiderBuyRows.length * 9 - insiderSellRows.length * 8 + (insiderNet.netShares && numeric(insiderNet.netShares)! > 0 ? 10 : 0))));
  const insiderSignal = insiderScore >= 66 ? 'Bullish' : insiderScore >= 40 ? 'Neutral' : 'Bearish';
  const optionsBias = putCallRatio <= 0.7 ? 'Bullish' : putCallRatio <= 1.1 ? 'Neutral' : 'Bearish';
  const optionsScore = Math.max(0, Math.min(100, Math.round(50 + (putCallRatio <= 0.7 ? 18 : putCallRatio <= 1.1 ? 4 : -16) + (gammaScore >= 80 ? 18 : gammaScore >= 60 ? 10 : -6))));
  const optionsSignal = optionsScore >= 66 ? 'Bullish' : optionsScore >= 45 ? 'Neutral' : 'Bearish';
  const overallPositioningScore = Math.round(ownershipScore * 0.4 + insiderScore * 0.25 + optionsScore * 0.35);
  const overallPositioningSignal = overallPositioningScore >= 80 ? 'Strong Bullish Positioning' : overallPositioningScore >= 66 ? 'Bullish Positioning' : overallPositioningScore >= 45 ? 'Neutral Positioning' : 'Bearish Positioning';
  const positivePositioningFactors = [
    ownershipSignal === 'Bullish' ? 'Institutional accumulation' : null,
    optionsBias === 'Bullish' ? 'Low Put/Call Ratio' : null,
    gammaScore >= 60 ? 'Positive Gamma Structure' : null,
    adjustedFloatReduction >= 20 ? 'Reduced effective float' : null,
  ].filter(Boolean);
  const negativePositioningFactors = [
    insiderSignal === 'Bearish' ? 'Recent insider selling' : null,
    ownershipSignal !== 'Bullish' ? 'Weak institutional accumulation' : null,
    optionsSignal !== 'Bullish' ? 'Options activity below bullish threshold' : null,
  ].filter(Boolean);
  const marketPressureScore = Math.round((readinessScore * 0.35) + (lendingPressureScore * 0.35) + (Math.min(shortInterestPct * 4, 100) * 0.2) + (borrowFeePressure * 0.1));
  const smartMoneyScore = overallPositioningScore;
  const narrativeScore = sentimentScore;
  const internalFloatImpactScore = Math.max(0, Math.min(100, Math.round(adjustedFloatReduction * 2.5)));
  const overallRiskScore = Math.round((marketPressureScore * 0.35) + (internalAdjustedSqueezeScore * 0.25) + (internalFloatImpactScore * 0.15) + (narrativeScore * 0.1) + (smartMoneyScore * 0.15));
  const executiveRiskStatus = overallRiskScore >= 90 ? 'CRITICAL' : overallRiskScore >= 78 ? 'HIGH RISK' : overallRiskScore >= 62 ? 'ELEVATED' : overallRiskScore >= 40 ? 'WATCH' : 'SAFE';
  const dashboardMetrics = record(dashboardMetricsEnvelope.data);
  const commandCenterMetrics = record(dashboardMetrics.commandCenter);
  const scoreGridMetrics = record(dashboardMetrics.scoreGrid);
  const marketPressureMetrics = record(dashboardMetrics.marketPressure);
  const dashboardFloatMetrics = record(dashboardMetrics.internalFloat);
  const smartMoneyMetrics = record(dashboardMetrics.smartMoney);
  const narrativeMetrics = record(dashboardMetrics.narrative);
  const displayExecutiveRiskStatus = String(commandCenterMetrics.overallRiskStatus ?? executiveRiskStatus);
  const displayOverallRiskScore = numeric(commandCenterMetrics.overallRiskScore) ?? overallRiskScore;
  const displayInternalAdjustedSqueezeScore = numeric(scoreGridMetrics.internalAdjustedSqueezeScore) ?? internalAdjustedSqueezeScore;
  const displayPublicScore = numeric(scoreGridMetrics.publicScore) ?? squeezeScore;
  const displayRiskAmplification = String(scoreGridMetrics.riskAmplificationDisplay ?? `${riskAmplification >= 0 ? '+' : ''}${riskAmplification}`);
  const displayMarketRanking = String(scoreGridMetrics.marketRankingDisplay ?? `#${marketRanking}`);
  const displayPercentile = String(scoreGridMetrics.percentileDisplay ?? `Top ${percentile}%`);
  const displayMarketPressureScore = numeric(marketPressureMetrics.marketPressureScore) ?? marketPressureScore;
  const displaySmartMoneyScore = numeric(smartMoneyMetrics.smartMoneyScore) ?? smartMoneyScore;
  const displayNarrativeScore = numeric(narrativeMetrics.narrativeScore) ?? narrativeScore;
  const displayInternalFloatImpactScore = numeric(dashboardFloatMetrics.internalFloatImpactScore) ?? internalFloatImpactScore;
  const shortInterestPressureLevel = shortInterestPct >= 15 ? 'High' : shortInterestPct >= 5 ? 'Moderate' : 'Low';
  const shortInterestPressureTone = shortInterestPct >= 15 ? 'high' : shortInterestPct >= 5 ? 'moderate' : 'low';
  const marketPressureOverviewCards = [
    {
      title: 'Short Interest',
      value: formatNumber(shortCurrent.shortInterestShares),
      tag: shortInterestPressureLevel,
      tone: shortInterestPressureTone,
      supporting: `SI Float: ${String(marketPressureMetrics.shortInterestPercentDisplay ?? formatPercent(shortInterestPct, { maximumFractionDigits: 1 }))}`,
      href: `/monitor/${company.ticker}/short-interest`,
    },
    {
      title: 'Lending Pressure',
      value: `${lendingPressureScore} / 100`,
      tag: lendingPressureLevel,
      tone: lendingPressureLevel.toLowerCase(),
      supporting: `Borrow Fee: ${String(marketPressureMetrics.borrowFeePercentDisplay ?? formatPercent(borrowFeePct, { maximumFractionDigits: 2 }))}`,
      href: `/monitor/${company.ticker}/lending-pressure`,
    },
    {
      title: 'Squeeze Readiness',
      value: `${String(marketPressureMetrics.readinessScore ?? readinessScore)} / 100`,
      tag: readinessLevel,
      tone: readinessTone,
      supporting: `Triggered: ${triggeredConditions.length} of ${readinessConditions.length}`,
      href: `/monitor/${company.ticker}/squeeze-readiness`,
    },
  ];
  const commandCenterContent = record(pageContent.commandCenter);
  const sectionContent = record(pageContent.sections);
  const marketNarrativeContent = record(pageContent.marketNarrative);
  const dashboardManagementActions = textList(commandCenterContent.managementActions, [
    'Monitor borrow fee and share availability daily.',
    'Review upcoming catalysts and prepare board-level talking points.',
    'Prepare IR response package for short-pressure and rumor questions.',
  ]);
  const dashboardBullishNarratives = textList(marketNarrativeContent.bullishNarratives, ['Borrow fee rising', 'Reduced float', 'Positive catalyst watch']);
  const dashboardBearishNarratives = textList(marketNarrativeContent.bearishNarratives, ['Volatility risk', 'No confirmed catalyst', 'Funding concerns']);
  const dashboardAiCards = recordList(pageContent.aiIntelligence);
  const executiveAlerts = [
    { time: 'Today 08:10', severity: 'High', source: borrowFeeEnvelope.sourcePlatform ?? 'Ortex', title: `Borrow Fee Increased +${formatNumber(Math.max(8, borrowFeePressure / 7), { maximumFractionDigits: 0 })}%`, impact: 'Higher cost to maintain short positions' },
    { time: 'Today 09:25', severity: 'High', source: 'Internal Float Intelligence', title: `Float Reduction ${formatNumber(adjustedFloatReduction, { maximumFractionDigits: 1 })}%`, impact: 'Internal view implies tighter tradable supply' },
    { time: 'Yesterday', severity: ownershipSignal === 'Bullish' ? 'Medium' : 'Low', source: topHoldersEnvelope.sourcePlatform ?? 'Fintel', title: `${String(largestIncrease.investorName ?? 'Institution')} Increased Position`, impact: 'Supports constructive smart-money positioning' },
    { time: '2 days ago', severity: sentimentScore >= 70 ? 'Medium' : 'Low', source: 'Social Media Engine', title: 'Social Sentiment Spike', impact: 'Narrative momentum improving' },
    { time: '3 days ago', severity: gammaScore >= 80 ? 'High' : 'Medium', source: optionsEnvelope.sourcePlatform ?? 'Ortex', title: 'Options Gamma Shift', impact: 'Options positioning becoming more supportive' },
    { time: '4 days ago', severity: 'Low', source: 'SEC EDGAR', title: 'New SEC Filing', impact: 'Disclosure event added to catalyst watch' },
  ];

  return (
    <div className="page dashboard-page squeeze-dashboard">
      <div className="page__header dashboard-command-header">
        <div>
          <div className="terminal-eyebrow">Short Squeeze Monitoring & Analysis Report</div>
          <h1 className="page__title">{company.companyName}</h1>
          <p className="page__desc">{text(pageContent.pageDescription, 'Institutional dashboard for short squeeze risk, market defense, shareholder intelligence, sentiment monitoring, and capital markets decision support.')}</p>
        </div>
      </div>

      <section className="executive-command-center">
        <div className={`command-risk-panel ${displayExecutiveRiskStatus.toLowerCase().replaceAll(' ', '-')}`}>
          <span><InfoTitle text="Overall assessment of current short squeeze risk based on market data, trading activity, sentiment, and internal company factors.">Overall Risk Status</InfoTitle></span>
          <strong>{displayExecutiveRiskStatus}</strong>
          <em>{String(commandCenterMetrics.overallRiskScoreDisplay ?? `${displayOverallRiskScore} / 100`)}</em>
          <p>{text(commandCenterContent.riskNarrative, 'Current market conditions indicate elevated squeeze risk driven by reduced effective float, positive sentiment, and increasing borrow pressure. Internal management adjustments suggest materially higher risk than public market estimates.')}</p>
        </div>
        <div className="command-score-grid">
          <div><span><InfoTitle text="Management-adjusted squeeze risk score incorporating non-public factors such as effective float, insider ownership, strategic holdings, and upcoming corporate catalysts.">Internal Adjusted Squeeze Score</InfoTitle></span><strong>{displayInternalAdjustedSqueezeScore}</strong></div>
          <div><span><InfoTitle text="Market-based squeeze risk score calculated using publicly available data including short interest, borrow fees, utilization, volume, options activity, and sentiment indicators.">Public Score</InfoTitle></span><strong>{displayPublicScore}</strong></div>
          <div><span><InfoTitle text="Additional risk premium added to the Public Score based on internal company conditions that may increase squeeze potential beyond market expectations.">Risk Amplification</InfoTitle></span><strong>{displayRiskAmplification}</strong></div>
          <div><span><InfoTitle text="Company's relative squeeze risk ranking compared to all actively monitored U.S. listed companies in the intelligence database.">Market Ranking</InfoTitle></span><strong>{displayMarketRanking}</strong><small>{displayPercentile}</small></div>
        </div>
        <div className="management-action-panel">
          <h2>Management Action Panel</h2>
          <ul>
            {dashboardManagementActions.map(item => <li key={item}>{item}</li>)}
          </ul>
          <MonitorExpertButton label="Ask Monitor Expert" question="What should management do first based on the current dashboard?" />
        </div>
      </section>

      <section className="executive-layer alert-center-layer">
        <div className="executive-layer__head">
          <div><span>Layer 2</span><h2>Alert Center</h2><p>{text(sectionContent.alertCenterDescription, 'Meaningful changes from the last 7 days.')}</p></div>
          {sourceChip('Internal Model')}
        </div>
        <div className="alert-center-list">
          {executiveAlerts.map(alert => (
            <article className="alert-center-item" key={`${alert.time}-${alert.title}`}>
              <time>{alert.time}</time>
              <span className={`alert-severity ${alert.severity.toLowerCase()}`}>{alert.severity}</span>
              <div><strong>{alert.title}</strong><small>{alert.impact}</small></div>
              <em className="dev-source-inline">{alert.source}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="executive-layer market-pressure-layer">
        <div className="executive-layer__head">
          <div><span>Layer 3</span><h2>Market Pressure Intelligence</h2><p>{text(sectionContent.marketPressureDescription, 'Short interest, borrow pressure, lending conditions, and squeeze readiness in one view.')}</p></div>
          {headActions(<>{sourceChip(shortInterestEnvelope.sourcePlatform ?? 'Ortex/FINRA')}{sourceChip('Internal Lending Model')}</>)}
        </div>
        <div className="market-pressure-layout">
          <div className="pressure-gauge-card">
            <div className="triggered-gauge" style={{ background: `conic-gradient(#be123c 0% ${displayMarketPressureScore}%, #e8eef7 ${displayMarketPressureScore}% 100%)` }}>
              <div><strong>{displayMarketPressureScore}</strong><span>market pressure</span></div>
            </div>
            <h3>{displayMarketPressureScore >= 81 ? 'Extreme' : displayMarketPressureScore >= 61 ? 'High' : displayMarketPressureScore >= 31 ? 'Moderate' : 'Low'} Pressure</h3>
          </div>
          <div className="market-pressure-card-grid">
            {marketPressureOverviewCards.map(card => (
              <Link className="market-pressure-overview-card" href={card.href as any} key={card.title}>
                <span>{card.title}</span>
                <strong>{card.value}</strong>
                <em className={card.tone}>{card.tag}</em>
                <small>{card.supporting}</small>
                <b aria-hidden="true">&gt;</b>
              </Link>
            ))}
            <p className="market-pressure-note">{text(sectionContent.marketPressureNarrative, 'Market pressure is summarized from short interest, lending pressure, and squeeze readiness so executives can quickly decide where to drill in.')}</p>
          </div>
        </div>
      </section>

      <section className="executive-layer internal-float-executive-layer">
        <div className="executive-layer__head">
          <div><span>Layer 4</span><h2>Internal Float Intelligence</h2><p>{text(sectionContent.internalFloatDescription, 'Why management sees a different float reality than the public market.')}</p></div>
          {headActions(<>{sourceChip('Internal Management Input')}{viewMore(company.ticker, 'internal-float')}</>)}
        </div>
        <div className="float-executive-grid">
          <div className="float-metric-card"><span>Official Float</span><strong>{String(dashboardFloatMetrics.officialFloatDisplay ?? formatNumber(internalFloat.officialFreeFloat))}</strong><small>Public float baseline</small></div>
          <div className="float-metric-card"><span>Adjusted Float</span><strong>{String(dashboardFloatMetrics.adjustedFloatDisplay ?? formatNumber(internalFloat.estimatedRealTradableFloat))}</strong><small>Management tradable view</small></div>
          <div className="float-metric-card"><span>Lendable Float</span><strong>{String(dashboardFloatMetrics.lendableFloatDisplay ?? formatNumber(internalFloat.estimatedRealLendableFloat))}</strong><small>Estimated lendable supply</small></div>
          <div className="float-metric-card"><span>Tokenized / Locked</span><strong>{String(dashboardFloatMetrics.tokenizedLockedSharesDisplay ?? formatNumber(internalFloat.tokenizedShares))}</strong><small>Restricted from float</small></div>
          <div className="float-impact-card">
            <span>Internal Float Impact Score</span>
            <strong>{String(dashboardFloatMetrics.internalFloatImpactScoreDisplay ?? `${displayInternalFloatImpactScore} / 100`)}</strong>
            <small>Float reduction: {formatPercent(internalFloat.floatReductionPercent, { maximumFractionDigits: 1 })}</small>
            <small>Adjusted SI: {formatPercent(internalFloat.adjustedShortInterestRealFloat, { maximumFractionDigits: 1 })}</small>
          </div>
        </div>
      </section>

      <section className="executive-layer smart-money-layer">
        <div className="executive-layer__head">
          <div><span>Layer 5</span><h2>Smart Money Intelligence</h2><p>{text(sectionContent.smartMoneyDescription, 'How institutions, insiders, and options traders are positioning.')}</p></div>
          {headActions(<>{sourceChip('Fintel')}{sourceChip('SEC EDGAR')}{sourceChip('Ortex')}</>)}
        </div>
        <div className="smart-money-grid">
          <div className="smart-money-score-card"><span>Smart Money Score</span><strong>{String(smartMoneyMetrics.smartMoneyScoreDisplay ?? `${displaySmartMoneyScore} / 100`)}</strong><em>{overallPositioningSignal}</em></div>
          <div><span>Largest Accumulation</span><strong>{String(largestIncrease.investorName ?? 'Institutional Holder')}</strong><small>+{formatNumber(numeric(largestIncrease.sharesChange) ?? numeric(largestIncrease.shares))} shares</small></div>
          <div><span>Largest Reduction</span><strong>{String(largestReduction.investorName ?? 'Institutional Holder')}</strong><small>{formatNumber(numeric(largestReduction.sharesChange) ?? -500000)} shares</small></div>
          <div><span>Insider Activity</span><strong>{insiderSignal}</strong><small>Latest: {String(largestInsiderTransaction.insiderName ?? 'Form 4 Activity')}</small></div>
          <div><span>Options Activity</span><strong>{optionsSignal}</strong><small>Put/Call {formatNumber(putCallRatio, { maximumFractionDigits: 2 })} · Gamma {formatNumber(gammaScore, { maximumFractionDigits: 0 })}</small></div>
          <div><span>Ownership Trend</span><strong>{ownershipSignal}</strong><small>Score {ownershipScore} / 100</small></div>
        </div>
      </section>

      <section className="executive-layer narrative-layer">
        <div className="executive-layer__head">
          <div><span>Layer 6</span><h2>Market Narrative Intelligence</h2><p>{text(sectionContent.marketNarrativeDescription, 'Sentiment, discussion volume, and narrative momentum.')}</p></div>
          {headActions(<>{sourceChip('Social Media Engine')}{viewMore(company.ticker, 'sentiment')}</>)}
        </div>
        <div className="narrative-executive-grid">
          <div className="narrative-score-card"><span>Narrative Score</span><strong>{String(narrativeMetrics.narrativeScoreDisplay ?? `${displayNarrativeScore} / 100`)}</strong><small>{String(narrativeMetrics.mentionCount ?? socialMentions.length)} mentions tracked</small></div>
          <div><span>Narrative Velocity</span><strong>+18%</strong><small>7-day discussion growth</small></div>
          <div><span>Mention Growth</span><strong>+24%</strong><small>Week over week</small></div>
          <div className="narrative-list"><h3>Top Bullish Narratives</h3><ul>{dashboardBullishNarratives.map(item => <li key={item}>{item}</li>)}</ul></div>
          <div className="narrative-list"><h3>Top Bearish Narratives</h3><ul>{dashboardBearishNarratives.map(item => <li key={item}>{item}</li>)}</ul></div>
        </div>
      </section>

      <section className="executive-layer forward-layer">
        <div className="executive-layer__head">
          <div><span>Layer 7</span><h2>Forward Looking Intelligence</h2><p>{text(sectionContent.forwardLookingDescription, 'Potential price scenarios and upcoming catalysts.')}</p></div>
          {headActions(<>{sourceChip('Internal Model')}{sourceChip('Company Calendar')}{viewMore(company.ticker, 'event-calendar')}</>)}
        </div>
        <div className="forward-grid">
          <div className="scenario-ladder compact">
            <div className="scenario-step current"><span>Current</span><strong>{formatCurrency(currentPrice)}</strong></div>
            {priceScenarios.map(scenario => <div className="scenario-step" key={scenario.name}><span>{scenario.name}</span><strong>{formatCurrency(scenario.target)}</strong><small>{scenario.probability}% · +{scenario.upside}%</small></div>)}
          </div>
          <div className="catalyst-timeline compact">
            {catalystItems.slice(0, 5).map(item => (
              <div className="catalyst-event" key={`${item.date}-${item.title}`}>
                <span>{item.date}</span><div><strong>{item.title}</strong><small>{item.category}</small></div><em className={`impact-badge ${item.impact.toLowerCase()}`}>{item.impact}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="executive-layer ai-intelligence-layer">
        <div className="executive-layer__head">
          <div><span>Layer 8</span><h2>AI Intelligence Center</h2><p>{text(sectionContent.aiIntelligenceDescription, 'Consolidated executive interpretation and recommended actions.')}</p></div>
          {sourceChip('Internal Model')}
        </div>
        <div className="ai-intelligence-grid">
          {(dashboardAiCards.length ? dashboardAiCards : [
            { title: 'AI Executive Summary', body: `${company.ticker} shows elevated market-defense risk driven by borrow pressure, internal float reduction, and constructive narrative momentum.` },
            { title: 'AI Risk Assessment', body: 'The highest risk is a catalyst occurring while borrow supply remains constrained and sentiment continues to improve.' },
            { title: 'AI Opportunities', body: 'Positive positioning, upcoming catalysts, and a lower internal float estimate create a stronger management-view risk picture than public data alone.' },
            { title: 'AI Recommended Actions', body: 'Review borrow fee daily, prepare IR response materials, and escalate material alerts to management and advisors.' },
            { title: 'AI Market Outlook', body: 'Near-term outlook remains sensitive to borrow availability, filings, ownership movement, and catalyst timing.' },
          ]).map(card => <div key={String(card.title)}><h3>{String(card.title)}</h3><p>{String(card.body)}</p></div>)}
        </div>
        <div className="ai-summary-actions">
          <MonitorExpertButton label="Ask Monitor Expert" question="Summarize the current market defense priorities for management." />
        </div>
      </section>

      <div className="legacy-dashboard-sections" hidden>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div>
            <span>Section 1</span>
            <h2>Executive Overview</h2>
          </div>
          {sourceChip('Internal Model')}
        </div>
        <div className="executive-kpi-grid">
          {kpis.map(kpi => (
            <article className={`executive-kpi-card ${kpi.tone}`} key={kpi.label}>
              <div className="kpi-card__top"><span><InfoTitle text={`${kpi.label} is an executive summary metric used to help compare the company against the broader monitored universe. Demo values use the current import data pool and placeholder internal models where noted.`}>{kpi.label}</InfoTitle></span>{sourceChip(kpi.source)}</div>
              <strong>{kpi.value}</strong>
              <div className="kpi-card__change-row">
                <span className={`kpi-card__change ${kpi.changeTone}`}>{kpi.change}</span>
                <small>{kpi.changeNote} today</small>
              </div>
              <div className="kpi-card__meter"><i style={{ width: `${kpi.barValue}%` }} /></div>
              <div className="kpi-card__meta"><span>{kpi.average}</span><span>{kpi.rank}</span><span>{kpi.detail}</span></div>
            </article>
          ))}
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div>
            <span>Private Management View</span>
            <h2>Internal Float Adjustment</h2>
          </div>
          {headActions(<>{sourceChip('Public Market Data + Internal Management Input')}{viewMore(company.ticker, 'internal-float')}</>)}
        </div>
        <div className="grid cols-4">
          <div className="terminal-card terminal-stat"><span>Official Free Float</span><strong>{formatNumber(internalFloat.officialFreeFloat)}</strong><small>Public market view</small></div>
          <div className="terminal-card terminal-stat"><span>Adjusted Real Float</span><strong>{formatNumber(internalFloat.estimatedRealTradableFloat)}</strong><small>Private management estimate</small></div>
          <div className="terminal-card terminal-stat"><span>Float Reduction</span><strong>{formatPercent(internalFloat.floatReductionPercent, { maximumFractionDigits: 2 })}</strong><small>Official vs adjusted</small></div>
          <div className="terminal-card terminal-stat"><span>Adjusted SI % Real Float</span><strong>{formatPercent(internalFloat.adjustedShortInterestRealFloat, { maximumFractionDigits: 2 })}</strong><small>Internal adjusted short pressure</small></div>
        </div>
        <p className="terminal-note">Placeholder score logic is ready to incorporate official short interest, official float, internal adjusted float, internal adjusted lendable float, tokenized shares, and unavailable lending shares.</p>
      </section>

      <section className="terminal-section ai-summary-section">
        <div className="terminal-section__head"><div><span>Section 2</span><h2>AI Executive Summary</h2></div>{sourceChip('Internal Model')}</div>
        <div className="ai-summary-grid">
          <div><h3>Current Situation</h3><p>{company.ticker} is ranked in the top {percentile}% of the demo squeeze-risk universe with elevated borrow pressure, active social discussion, and visible institutional ownership movement.</p></div>
          <div><h3>Key Risks</h3><p>Borrow fee pressure, options positioning, fast-moving retail narratives, and incomplete public disclosure of institutional short concentration require ongoing executive monitoring.</p></div>
          <div><h3>Key Opportunities</h3><p>Positive social sentiment, institutional holder visibility, and a structured report cadence can help management maintain a disciplined market-defense record.</p></div>
          <div><h3>Short Squeeze Outlook</h3><p>Current readiness is {readinessLevel.toLowerCase()} at {readinessScore} / 100. {triggeredConditions.length} of {readinessConditions.length} key conditions are triggered, while {monitoringConditions.length} remain under monitoring.</p></div>
          <div><h3>Management Recommendations</h3><p>Review borrow fee, short interest, and sentiment movement daily. Preserve report history for board review and capital markets advisor coordination.</p></div>
          <div><h3>IR Recommendations</h3><p>Maintain precise disclosure language, monitor rumor sources, prepare FAQ responses for short-pressure questions, and route major alerts to executives quickly.</p></div>
        </div>
        <div className="terminal-alert-strip">
          {alerts.length ? alerts.map((alert, index) => <span key={index}>{String(alert.title ?? alert.alertType ?? 'Alert')}</span>) : <span>No active alerts imported.</span>}
        </div>
        <div className="ai-summary-actions">
          <MonitorExpertButton label="Ask Monitor Expert" question="What should management focus on today based on this dashboard?" />
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div>
            <span>Section 3</span>
            <h2 className="terminal-title"><InfoTitle text="This section emphasizes the Internal Adjusted Squeeze Score when management-provided float data exists. The radar still explains the public market pressure drivers, while the private score adjusts interpretation using internal tradable and lendable float estimates.">Short Squeeze Score Breakdown</InfoTitle></h2>
          </div>
          {sourceChip('Internal Model')}
        </div>
        <div className="score-comparison-strip">
          <div className="score-comparison-card private">
            <span>Primary management score</span>
            <strong>{internalAdjustedSqueezeScore} / 100</strong>
            <small>Internal Adjusted Squeeze Score · Private Management View</small>
          </div>
          <div className="score-comparison-card">
            <span>Public comparable score</span>
            <strong>{squeezeScore} / 100</strong>
            <small>Used for market ranking and peer comparison</small>
          </div>
          <div className={`score-comparison-card ${riskAmplification > 0 ? 'risk-up' : riskAmplification < 0 ? 'risk-down' : ''}`}>
            <span>Risk amplification</span>
            <strong>{riskAmplification >= 0 ? '+' : ''}{riskAmplification}</strong>
            <small>Internal score minus public score</small>
          </div>
        </div>
        <div className="score-breakdown-grid">
          <div className="terminal-card radar-card">
            <RadarChart items={breakdown} />
          </div>
          <div className="terminal-card score-methodology-card">
            <h3>Scoring Methodology</h3>
            <p>
              The radar visualizes the six public-market drivers behind the Short Squeeze Score. The private management score is then adjusted using internal float and lendable-share assumptions.
            </p>
            <div className="methodology-stack">
              <div><strong>Primary pressure drivers</strong><span>Short interest, utilization, borrow-rate pressure, and short-position trend.</span></div>
              <div><strong>Validation layer</strong><span>Volume and turnover are used to confirm whether pressure is supported by trading activity.</span></div>
              <div><strong>Internal adjustment layer</strong><span>Adjusted float, adjusted lendable float, tokenized shares, and non-lendable shares amplify or reduce management’s private risk view.</span></div>
            </div>
            {sourceChip('Internal Model')}
          </div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div>
            <span>Section 4</span>
            <h2 className="terminal-title"><InfoTitle text={`This chart displays a sample of the top 50 ranked stocks by their public Short Squeeze Score. ${company.companyName} is highlighted in gold at position #${marketRanking} with a public score of ${squeezeScore}. The Internal Adjusted Squeeze Score is shown separately because it uses private management inputs and is not directly comparable across the full US market universe.`}>Short Squeeze Score VS US Market</InfoTitle></h2>
          </div>
          {sourceChip('Internal Model')}
        </div>
        <div className="grid cols-4">
          <div className="terminal-card terminal-stat"><span>Market Ranking</span><strong>#{marketRanking}</strong><small>#37 of 4,126</small></div>
          <div className="terminal-card terminal-stat"><span>Percentile Ranking</span><strong>Top {percentile}%</strong><small>US listed universe</small></div>
          <div className="terminal-card terminal-stat"><span>Industry Ranking</span><strong>#4</strong><small>FinTech / digital infrastructure</small></div>
          <div className="terminal-card terminal-stat"><span>Sector Ranking</span><strong>#9</strong><small>Financial technology sector</small></div>
        </div>
        <div className="market-score-note">
          <div>
            <span>Public ranking score</span>
            <strong>{squeezeScore} / 100</strong>
            <small>Comparable across the US market sample</small>
          </div>
          <div className="private">
            <span>Internal adjusted score</span>
            <strong>{internalAdjustedSqueezeScore} / 100</strong>
            <small>Private Management View · not used for public ranking</small>
          </div>
          <p>Market ranking remains based on public/comparable inputs. Internal adjusted score is an overlay for management because other companies do not have the same private float data available.</p>
        </div>
        <div className="terminal-card ranking-panel">
          <div className="ranking-average-line" aria-hidden="true"><span>Market avg 58</span></div>
          {rankingRows.map(([ticker, score, rank]) => (
            <div className={`ranking-row ${ticker === company.ticker ? 'current' : ''}`} key={ticker}>
              <span>#{rank}</span><strong>{ticker}</strong><div><i style={{ width: `${score}%` }} /></div><em>{score}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 5</span><h2>Social Media Sentiment</h2></div>{headActions(<>{sourceChip('Social Media Engine')}{viewMore(company.ticker, 'sentiment')}</>)}</div>
        <div className="grid cols-4">
          <div className="terminal-card terminal-stat"><span>Total Mentions</span><strong>{socialMentions.length}</strong><small>Existing sentiment JSON</small></div>
          <div className="terminal-card terminal-stat"><span>Positive</span><strong>{pct((positiveMentions / Math.max(socialMentions.length, 1)) * 100)}</strong><small>{positiveMentions} mentions</small></div>
          <div className="terminal-card terminal-stat"><span>Negative</span><strong>{pct((negativeMentions / Math.max(socialMentions.length, 1)) * 100)}</strong><small>{negativeMentions} mentions</small></div>
          <div className="terminal-card terminal-stat"><span>Neutral</span><strong>{pct((neutralMentions / Math.max(socialMentions.length, 1)) * 100)}</strong><small>{neutralMentions} mentions</small></div>
        </div>
        <div className="grid cols-3 sentiment-chart-grid">
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Breakdown of social-media mentions classified as positive, neutral, or negative in the imported sentiment JSON.">Sentiment Pie</InfoTitle></h3>
            <div className="chart-card__body"><Donut segments={[{ label: 'Positive', value: positiveMentions, color: '#16a34a' }, { label: 'Neutral', value: neutralMentions, color: '#64748b' }, { label: 'Negative', value: negativeMentions, color: '#e11d48' }]} /></div>
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Shows where company mentions are coming from. Other includes platforms outside X, Reddit, and StockTwits.">Platform Breakdown</InfoTitle></h3>
            <div className="chart-card__body"><MiniBars values={['X', 'Reddit', 'StockTwits', 'Other'].map(label => ({ label, value: platformCounts[label] ?? 0 }))} /></div>
          </div>
          <div className="terminal-card chart-card">
            <h3><InfoTitle text="Seven-day sentiment trend placeholder using the current imported social sentiment score as the latest value.">7 Day Trend</InfoTitle></h3>
            <div className="chart-card__body chart-card__body--trend">
              <TrendLine values={sentimentTrendValues} labels={sentimentTrendLabels} valueLabel="Sentiment Score" />
            </div>
            <p className="terminal-note">Sentiment score, 0-100. Higher is more positive.</p>
          </div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 6</span><h2>Social Narrative Intelligence</h2></div>{headActions(<>{sourceChip('Social Media Engine')}{viewMore(company.ticker, 'sentiment')}</>)}</div>
        <div className="grid cols-3">
          <div className="terminal-card narrative-card"><h3>Top Bullish Narratives</h3><ul><li>Short squeeze incoming</li><li>Borrow fee rising</li><li>Institutions trapped</li><li>Fintech and AI narrative improving</li></ul></div>
          <div className="terminal-card narrative-card"><h3>Top Bearish Narratives</h3><ul><li>Overvalued</li><li>No catalyst</li><li>Meme stock volatility</li><li>Disclosure risk</li></ul></div>
          <div className="terminal-card narrative-card"><h3>Topics, Influencers, Communities</h3><p><strong>Topics:</strong> {topics.join(', ') || 'Pending scan'}</p><p><strong>Influencers:</strong> {influencers.join(', ') || 'Pending scan'}</p><p><strong>Communities:</strong> {communities.join(', ') || 'Pending scan'}</p></div>
        </div>
      </section>

      <section className="terminal-section large-section">
        <div className="terminal-section__head"><div><span>Section 7</span><h2>Short Interest Intelligence</h2></div>{headActions(<>{sourceChip(shortInterestEnvelope.sourcePlatform ?? 'Ortex/FINRA')}{viewMore(company.ticker, 'short-interest')}</>)}</div>
        <div className="grid cols-5 dashboard-metric-row">
          <div className="terminal-card terminal-stat"><span>Short Interest</span><strong>{formatNumber(shortCurrent.shortInterestShares)}</strong><small>Shares</small></div>
          <div className="terminal-card terminal-stat"><span>SI % Float</span><strong>{formatPercent(shortCurrent.shortInterestPcFreeFloat, { maximumFractionDigits: 2 })}</strong><small>{metrics.shortInterestPercentFloat}</small></div>
          <div className="terminal-card terminal-stat"><span>Days To Cover</span><strong>{formatNumber(shortCurrent.daysToCoverQuantity ?? record(shortInterestEnvelope.data).daysToCover, { maximumFractionDigits: 2 })}</strong><small className="dev-source-inline">FINRA / Ortex</small></div>
          <div className="terminal-card terminal-stat"><span>Borrow Fee</span><strong>{formatPercent(borrowCurrent.costToBorrowAll, { maximumFractionDigits: 2 })}</strong><small>CTB all</small></div>
          <div className="terminal-card terminal-stat"><span>Short Score</span><strong>{squeezeScore}</strong><small className="dev-source-inline">Internal model</small></div>
          <div className="terminal-card terminal-stat dev-source-inline"><span>CTB Min</span><strong>No Source</strong><small>Pending Institutional Data Source</small></div>
          <div className="terminal-card terminal-stat"><span>CTB Avg</span><strong>{formatPercent(borrowCurrent.costToBorrowAll, { maximumFractionDigits: 2 })}</strong><small>Current borrow fee</small></div>
          <div className="terminal-card terminal-stat dev-source-inline"><span>CTB Max</span><strong>No Source</strong><small>Pending Institutional Data Source</small></div>
          <div className="terminal-card terminal-stat"><span>Shares Available</span><strong>{formatNumber(latestAvailable.shortAvailabilityShares)}</strong><small>Latest inventory</small></div>
          <div className="terminal-card terminal-stat"><span>Utilization</span><strong>{formatPercent(latestAvailable.shortAvailabilityPct, { maximumFractionDigits: 2 })}</strong><small className="dev-source-inline">shortAvailabilityPct</small></div>
        </div>
        <div className="grid cols-4 dashboard-chart-row compact-chart-row">
          <div className="terminal-card chart-card"><h3><InfoTitle text="Trend of reported short interest shares. Higher values may indicate more shares have been sold short.">SI Trend</InfoTitle></h3><TrendLine values={shortHistory.map(row => numeric(row.currentShortPositionQuantity) ?? 0)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Cost to borrow trend. Rising borrow fees can indicate tighter lending supply or stronger borrowing demand.">Borrow Fee Trend</InfoTitle></h3><TrendLine values={borrowRows.map(row => numeric(row.costToBorrowAll) ?? 0)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Trend of shares currently available to borrow for shorting. Falling availability can indicate lending supply pressure.">Shares Available Trend</InfoTitle></h3><TrendLine values={availableRows.map(row => numeric(row.shortAvailabilityShares) ?? 0)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Utilization is currently mapped to shortAvailabilityPct from shares availability data in the MVP import pool.">Utilization Trend</InfoTitle></h3><TrendLine values={availableRows.map(row => numeric(row.shortAvailabilityPct) ?? 0)} /></div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div>
            <span>Section 8</span>
            <h2><InfoTitle text="Borrow-pressure view focused on whether short sellers can still find shares to borrow and whether maintaining short positions is becoming difficult or expensive.">Lending Pressure Intelligence</InfoTitle></h2>
            <p className="section-subtitle">Monitor share availability, borrowing conditions, and lending pressure affecting short sellers.</p>
          </div>
          {headActions(<>{sourceChip(sharesEnvelope.sourcePlatform ?? 'Ortex')}{sourceChip('Internal Lending Model')}{viewMore(company.ticker, 'short-interest')}</>)}
        </div>

        <div className="lending-pressure-hero-grid">
          <div className={`lending-pressure-hero ${lendingPressureLevel.toLowerCase()}`}>
            <span>Lending Pressure Score</span>
            <strong>{lendingPressureScore} / 100</strong>
            <em>{lendingPressureLevel}</em>
            <p>Borrowing conditions indicate {lendingPressureLevel.toLowerCase()} pressure on short sellers.</p>
            <div className="lending-health-card">
              <span>Current Status</span>
              <strong>{lendingHealthStatus}</strong>
              <small>Available inventory is {availabilityPressure >= 61 ? 'limited' : 'available'} while utilization remains {utilizationPressure >= 61 ? 'elevated' : 'controlled'}.</small>
            </div>
          </div>
          <div className="lending-gauge-card">
            <div className="triggered-gauge lending-gauge" style={{ background: `conic-gradient(#be123c 0% ${lendingPressureScore}%, #e8eef7 ${lendingPressureScore}% 100%)` }}>
              <div><strong>{lendingPressureScore}</strong><span>pressure score</span></div>
            </div>
            <p>{lendingPressureLevel} Pressure</p>
          </div>
        </div>

        <div className="lending-kpi-row">
          <div className="terminal-card terminal-stat"><span>Shares Available</span><strong>{formatNumber(sharesAvailable)}</strong><small className="dev-source-inline">{sharesEnvelope.sourcePlatform ?? 'Ortex'} latest inventory</small></div>
          <div className="terminal-card terminal-stat"><span>Utilization</span><strong>{formatPercent(utilizationPct, { maximumFractionDigits: 2 })}</strong><small className="dev-source-inline">shortAvailabilityPct</small></div>
          <div className="terminal-card terminal-stat"><span>Borrow Fee</span><strong>{formatPercent(borrowFeePct, { maximumFractionDigits: 2 })}</strong><small>cost to borrow</small></div>
          <div className="terminal-card terminal-stat"><span>Borrow Demand</span><strong>{borrowDemandLabel}</strong><small>Availability, utilization, and borrow fee proxy</small></div>
        </div>

        <div className="lending-pressure-grid">
          <div className="terminal-card lending-breakdown-card">
            <h3>Lending Pressure Components</h3>
            <div className="lending-component-list">
              {lendingComponents.map(component => (
                <div key={component.name}>
                  <span>{component.name}</span>
                  <strong>{component.value}</strong>
                  <small>Weight: {component.weight}</small>
                  <em className={component.status.toLowerCase().includes('extreme') ? 'extreme' : component.status.toLowerCase().includes('high') ? 'high' : component.status.toLowerCase().includes('moderate') ? 'moderate' : 'low'}>{component.status}</em>
                  <small className="dev-source-inline">Source: {component.source}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="terminal-card borrow-demand-card">
            <h3>{borrowDemandLabel} Borrow Demand</h3>
            <p>Current borrow activity suggests {borrowDemandLabel.toLowerCase()} demand for available shares based on utilization, borrow fee, and available inventory.</p>
            <div className="lending-view-tabs"><span>7 Day</span><span>30 Day</span><span>90 Day</span></div>
            {sourceChip('Internal Lending Model')}
          </div>
        </div>

        <div className="grid cols-4 dashboard-chart-row compact-chart-row lending-trend-grid">
          <div className="terminal-card chart-card"><h3><InfoTitle text="Trend of shares available to borrow. Declining availability can indicate tightening borrow supply.">Shares Available Trend</InfoTitle></h3><TrendLine values={availableRows.map(row => numeric(row.shortAvailabilityShares) ?? 0)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Utilization is currently mapped to shortAvailabilityPct from shares availability data in the MVP import pool.">Utilization Trend</InfoTitle></h3><TrendLine values={availableRows.map(row => numeric(row.shortAvailabilityPct) ?? 0)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Borrow fee trend shows whether short sellers are paying more to maintain or open short positions.">Borrow Fee Trend</InfoTitle></h3><TrendLine values={borrowRows.map(row => numeric(row.costToBorrowAll) ?? 0)} /></div>
        </div>

        <div className="lending-bottom-grid">
          <div className="terminal-card squeeze-impact-card">
            <h3>Impact on Short Squeeze Risk</h3>
            <div className="contributors-grid">
              <div>
                <h4>Positive Contributors</h4>
                <ul>{(lendingPositiveFactors.length ? lendingPositiveFactors : ['High Borrow Fee', 'High Utilization', 'Limited Share Availability']).map(factor => <li key={String(factor)}>{factor}</li>)}</ul>
              </div>
              <div>
                <h4>Negative Contributors</h4>
                <ul>{(lendingNegativeFactors.length ? lendingNegativeFactors : ['Large Remaining Inventory', 'Falling Borrow Demand']).map(factor => <li key={String(factor)}>{factor}</li>)}</ul>
              </div>
            </div>
          </div>
          <div className="terminal-card ai-lending-card">
            <h3>AI Lending Analysis</h3>
            <p>Borrowing conditions remain increasingly restrictive. Elevated utilization and high borrow fees indicate that a large portion of lendable shares are already committed. Available inventory remains limited relative to current demand, increasing the probability of future short covering activity.</p>
            {sourceChip('Internal Lending Model')}
          </div>
        </div>

        <details className="advanced-lending-panel">
          <summary>
            <span>Advanced Lending Intelligence</span>
            <em>Future Premium Data Provider Required</em>
          </summary>
          <div className="advanced-lending-content">
            <div className="dev-source-inline"><strong>Potential Future Sources</strong><p>EquiLend · DataLend · Hazeltree · S&amp;P Global Securities Finance</p></div>
            <div><strong>Potential Future Metrics</strong><p>Global Lending Pool Size · Institutional Borrow Concentration · Prime Broker Lending Inventory · Global Securities Finance Data</p></div>
          </div>
        </details>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 9</span><h2>Institutional Ownership</h2></div>{headActions(<>{sourceChip(topHoldersEnvelope.sourcePlatform ?? 'Fintel')}{viewMore(company.ticker, 'institutional')}</>)}</div>
        <div className="grid cols-3 dashboard-metric-row">
          <div className="terminal-card terminal-stat"><span>Institutional Ownership</span><strong>{formatPercent(topHolders.reduce((sum, row) => sum + (numeric(row.ownershipPercent) ?? 0), 0), { maximumFractionDigits: 2 })}</strong><small>Top holder sample</small></div>
          <div className="terminal-card terminal-stat"><span>Increased Positions</span><strong>{increasedPositions.length}</strong><small>Ownership changes</small></div>
          <div className="terminal-card terminal-stat"><span>Reduced / Sold Out</span><strong>{reducedPositions.length}</strong><small>Reduced positions</small></div>
        </div>
        <div className="grid cols-3 dashboard-chart-row compact-chart-row">
          <div className="terminal-card chart-card"><h3><InfoTitle text="Largest institutional holders in the imported ownership file. Duplicate holder names may appear if multiple filings or securities are present.">Top Holders</InfoTitle></h3><MiniBars values={topHolders.map((row, index) => ({ label: `${String(row.investorName ?? 'Holder')}${topHolders.filter(holder => String(holder.investorName) === String(row.investorName)).length > 1 ? ` ${index + 1}` : ''}`, value: numeric(row.shares) ?? 0 }))} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Historical ownership direction based on imported institutional ownership trend records.">Ownership Trend</InfoTitle></h3><TrendLine values={rows(ownershipTrendEnvelope.data).map(row => numeric(row.institutionalOwnershipPercent) ?? numeric(row.ownershipPercent) ?? 0)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Measures whether ownership is concentrated among a small number of holders or broadly distributed. Advanced concentration scoring is a future model.">Concentration Analysis</InfoTitle></h3><p className="terminal-note">Top holder distribution is visible. Advanced concentration scoring requires the future institutional analytics engine.</p>{sourceChip('Internal Model')}</div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div>
            <span>Section 10</span>
            <h2><InfoTitle text="Executive view of how shareholders, insiders, and options traders are positioning around the company. This section emphasizes direction and signal quality rather than raw record counts.">Positioning Intelligence</InfoTitle></h2>
            <p className="section-subtitle">Monitor how shareholders, insiders, and options traders are positioning around the company.</p>
          </div>
          {headActions(<>{sourceChip('Internal Model')}{viewMore(company.ticker, 'shareholder-watch')}{viewMore(company.ticker, 'insider')}{viewMore(company.ticker, 'options')}</>)}
        </div>

        <div className="positioning-summary-bar">
          <div><span>Ownership</span><strong className={ownershipSignal.toLowerCase()}>{ownershipSignal}</strong></div>
          <div><span>Insider</span><strong className={insiderSignal.toLowerCase()}>{insiderSignal}</strong></div>
          <div><span>Options</span><strong className={optionsSignal.toLowerCase()}>{optionsSignal}</strong></div>
          <div className="positioning-score-summary"><span>Overall Positioning Score</span><strong>{overallPositioningScore} / 100</strong><small>{overallPositioningSignal}</small></div>
        </div>

        <div className="positioning-intel-grid">
          <article className="terminal-card positioning-intel-card">
            <div className="card-title-row"><h3>Ownership Intelligence</h3>{sourceChip(topHoldersEnvelope.sourcePlatform ?? 'Fintel')}</div>
            <div className="positioning-score-row"><span>Ownership Score</span><strong>{ownershipScore} / 100</strong><em className={`signal-pill ${ownershipSignal.toLowerCase()}`}>{ownershipSignal}</em></div>
            <div className="positioning-events">
              <div><span>Largest New Holder</span><strong>{String(largestNewHolder.investorName ?? 'BlackRock')}</strong><small>+{formatNumber(numeric(largestNewHolder.sharesChange) ?? numeric(largestNewHolder.shares))} shares · {String(largestNewHolder.fileDate ?? 'May 23')}</small></div>
              <div><span>Largest Increase</span><strong>{String(largestIncrease.investorName ?? 'Institutional Holder')}</strong><small>+{formatNumber(numeric(largestIncrease.sharesChange) ?? numeric(largestIncrease.shares))} shares · Ownership increased</small></div>
              <div><span>Largest Reduction</span><strong>{String(largestReduction.investorName ?? 'Vanguard')}</strong><small>{formatNumber(numeric(largestReduction.sharesChange) ?? -500000)} shares · Position reduced</small></div>
              <div><span>Latest 13D / 13G Activity</span><strong>{String(latestActivistFiling.formType ?? '13G')} Filed</strong><small>{String(latestActivistFiling.fileDate ?? 'May 23')} · {String(latestActivistFiling.investorName ?? 'Institutional holder added')}</small></div>
            </div>
          </article>

          <article className="terminal-card positioning-intel-card">
            <div className="card-title-row"><h3>Insider Intelligence</h3>{sourceChip(insiderEnvelope.sourcePlatform ?? 'SEC EDGAR / Fintel')}</div>
            <div className="positioning-score-row"><span>Insider Score</span><strong>{insiderScore} / 100</strong><em className={`signal-pill ${insiderSignal.toLowerCase()}`}>{insiderSignal}</em></div>
            <div className="positioning-events">
              <div><span>Latest Insider Purchase</span><strong>{String(latestInsiderPurchase.insiderName ?? 'CEO Purchase')}</strong><small>{formatNumber(latestInsiderPurchase.shares)} shares · {formatCurrency((numeric(latestInsiderPurchase.value) ?? 0) / Math.max(numeric(latestInsiderPurchase.shares) ?? 1, 1))} · {String(latestInsiderPurchase.transactionDate ?? latestInsiderPurchase.fileDate ?? 'May 20')}</small></div>
              <div><span>Latest Insider Sale</span><strong>{String(latestInsiderSale.insiderName ?? 'Director Sale')}</strong><small>{formatNumber(latestInsiderSale.shares)} shares · {formatCurrency((numeric(latestInsiderSale.value) ?? 0) / Math.max(numeric(latestInsiderSale.shares) ?? 1, 1))} · {String(latestInsiderSale.transactionDate ?? latestInsiderSale.fileDate ?? 'May 17')}</small></div>
              <div><span>Largest Insider Transaction</span><strong>{String(largestInsiderTransaction.insiderName ?? 'Insider Transaction')}</strong><small>{formatNumber(largestInsiderTransaction.shares)} shares · Form {String(largestInsiderTransaction.formType ?? 4)}</small></div>
              <div><span>Recent Form 4 Activity</span><strong>{insiderSignal}</strong><small>Recent activity is interpreted as {insiderSignal.toLowerCase()} by the internal positioning model.</small></div>
            </div>
          </article>

          <article className="terminal-card positioning-intel-card">
            <div className="card-title-row"><h3>Options Intelligence</h3>{sourceChip(optionsEnvelope.sourcePlatform ?? 'Ortex')}</div>
            <div className="positioning-score-row"><span>Options Score</span><strong>{optionsScore} / 100</strong><em className={`signal-pill ${optionsSignal.toLowerCase()}`}>{optionsSignal}</em></div>
            <div className="positioning-events">
              <div><span>Put / Call Ratio</span><strong>{formatNumber(putCallRatio, { maximumFractionDigits: 2 })}</strong><small>{optionsBias} options bias</small></div>
              <div><span>Gamma Risk</span><strong>{gammaScore >= 80 ? 'High' : gammaScore >= 60 ? 'Elevated' : 'Controlled'}</strong><small>Gamma score {formatNumber(gammaScore, { maximumFractionDigits: 0 })}</small></div>
              <div><span>Largest OI Strike</span><strong>$7.00</strong><small>Demo strike from pending options chain connector</small></div>
              <div><span>Most Active Expiration</span><strong>Jun 2026</strong><small>Options activity favors {optionsSignal.toLowerCase()} positioning.</small></div>
            </div>
          </article>
        </div>

        <div className="positioning-bottom-grid">
          <div className="terminal-card positioning-matrix-card">
            <h3>Positioning Matrix</h3>
            <div className="positioning-matrix">
              <div><span>Ownership</span><strong className={ownershipSignal.toLowerCase()}>{ownershipSignal}</strong></div>
              <div><span>Insider</span><strong className={insiderSignal.toLowerCase()}>{insiderSignal}</strong></div>
              <div><span>Options</span><strong className={optionsSignal.toLowerCase()}>{optionsSignal}</strong></div>
            </div>
          </div>
          <div className="terminal-card overall-positioning-card">
            <span>Overall Positioning Score</span>
            <strong>{overallPositioningScore} / 100</strong>
            <em>{overallPositioningSignal}</em>
            <small>Top 10% of monitored companies</small>
          </div>
          <div className="terminal-card ai-positioning-card">
            <h3>AI Positioning Summary</h3>
            <p>Institutional positioning remains constructive with recent accumulation by major holders. Insider activity is {insiderSignal.toLowerCase()} with limited directional pressure from recent transactions. Options activity continues to favor {optionsSignal.toLowerCase()} positioning, supported by a favorable put/call ratio and elevated gamma exposure.</p>
            <p>Overall positioning remains positive despite minor reductions from select institutional investors.</p>
          </div>
        </div>

        <div className="positioning-contributors">
          <div className="terminal-card">
            <h3>Strongest Positive Factors</h3>
            <ul>{(positivePositioningFactors.length ? positivePositioningFactors : ['Institutional accumulation', 'Low Put/Call Ratio', 'Positive Gamma Structure']).map(factor => <li key={String(factor)}>{factor}</li>)}</ul>
          </div>
          <div className="terminal-card">
            <h3>Strongest Negative Factors</h3>
            <ul>{(negativePositioningFactors.length ? negativePositioningFactors : ['Recent insider selling', 'Declining ownership concentration']).map(factor => <li key={String(factor)}>{factor}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div>
            <span>Section 13</span>
            <h2><InfoTitle text="Real-time evaluation of key squeeze conditions and market pressure indicators. The score measures how many major conditions are active, not whether a squeeze is guaranteed.">Short Squeeze Readiness</InfoTitle></h2>
            <p className="section-subtitle">Real-time evaluation of key squeeze conditions and market pressure indicators.</p>
          </div>
          {headActions(<>{sourceChip('Internal Model')}{viewMore(company.ticker, 'risk-alerts')}</>)}
        </div>

        <div className="readiness-hero-grid">
          <div className={`readiness-hero-card ${readinessTone}`}>
            <span>Short Squeeze Readiness</span>
            <strong>{readinessScore} / 100</strong>
            <em>{readinessLevel}</em>
            <small>Top 2% of monitored stocks</small>
            <div className="readiness-status-block">
              <p><b>Current Status:</b> {readinessLevel} Readiness</p>
              <p><b>Summary:</b> Most major squeeze conditions have been satisfied. Short sellers are experiencing increasing pressure from elevated borrow costs, limited share availability, high utilization, and management-adjusted float constraints.</p>
            </div>
          </div>
          <div className="triggered-gauge-card">
            <div className="triggered-gauge" style={{ background: `conic-gradient(#be123c 0% ${activeConditionPercent}%, #e8eef7 ${activeConditionPercent}% 100%)` }}>
              <div><strong>{triggeredConditions.length} / {readinessConditions.length}</strong><span>conditions active</span></div>
            </div>
            <p>{activeConditionPercent}% of monitored squeeze conditions are currently triggered.</p>
          </div>
        </div>

        <div className="conditions-matrix">
          {readinessConditions.map(condition => (
            <article className="condition-card" key={condition.name}>
              <div className="condition-card__head">
                <h3>{condition.name}</h3>
                <span className={`condition-status ${condition.status.toLowerCase().replaceAll(' ', '-')}`}>{condition.status}</span>
              </div>
              <div className="condition-card__metrics">
                <div><span>Current</span><strong>{condition.current}</strong></div>
                <div><span>Threshold</span><strong>{condition.threshold}</strong></div>
              </div>
              <p>{condition.explanation}</p>
              <div className="condition-card__source dev-source-inline">Source: {condition.source}</div>
            </article>
          ))}
        </div>

        <div className="readiness-bottom-grid">
          <div className="terminal-card condition-summary-card">
            <h3>Condition Summary</h3>
            <div className="condition-summary-stats">
              <div><span>Triggered</span><strong>{triggeredConditions.length}</strong></div>
              <div><span>Monitoring</span><strong>{monitoringConditions.length}</strong></div>
              <div><span>Not Active</span><strong>{inactiveConditions.length}</strong></div>
              <div><span>Readiness</span><strong>{readinessScore} / 100</strong></div>
            </div>
            <div className="contributors-grid">
              <div>
                <h4>Strongest Positive Contributors</h4>
                <ul>
                  {triggeredConditions.slice(0, 3).map(condition => <li key={condition.name}>{condition.name}</li>)}
                </ul>
              </div>
              <div>
                <h4>Weakest Contributors</h4>
                <ul>
                  {[...monitoringConditions, ...inactiveConditions].slice(0, 3).map(condition => <li key={condition.name}>{condition.name}</li>)}
                </ul>
              </div>
            </div>
          </div>
          <div className="terminal-card ai-squeeze-assessment">
            <h3>AI Squeeze Assessment</h3>
            <p>Current conditions indicate elevated squeeze readiness. Borrow costs, utilization, share availability, and adjusted float metrics all suggest increasing pressure on short sellers. While options activity and social sentiment remain below peak levels, the majority of core squeeze conditions are already satisfied.</p>
            <p>The highest-risk scenario for short sellers would be a positive catalyst combined with continued borrow scarcity and further reduction in available lendable shares.</p>
            {sourceChip('Internal Model')}
          </div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Sections 14-16</span><h2>Advanced Short Position & Lending Models</h2></div>{sourceChip('Future Premium Data Provider Required', 'future')}</div>
        <div className="grid cols-3">
          <div className="terminal-card warning-card"><h3>Institutional Short Concentration</h3><p>No Reliable Public Data Source Available. Institutional short positions are generally not publicly disclosed.</p>{sourceChip('Future Data Provider Required', 'warning')}</div>
          <div className="terminal-card warning-card"><h3>Real Short Position Model</h3><p>Official short position available; estimated real short position, synthetic exposure, and OTC exposure require future premium data providers.</p>{sourceChip('Future Premium Data Provider Required', 'future')}</div>
          <div className="terminal-card warning-card"><h3>Global Lending Pool Analysis</h3><p>Global inventory, remaining capacity, and borrow exhaustion risk require securities lending datasets not yet connected.</p>{sourceChip('Future Premium Data Provider Required', 'future')}</div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div>
            <span>Section 17</span>
            <h2><InfoTitle text="Scenario-based price projections derived from short interest, float structure, options positioning, and market activity. This is not an analyst target price.">Price Scenario Engine</InfoTitle></h2>
            <p className="section-subtitle">Scenario-based price projections derived from short interest, float structure, options positioning, and market activity.</p>
          </div>
          {headActions(<>{sourceChip('Internal Model')}{sourceChip('Ortex')}{sourceChip('Internal Float Intelligence')}</>)}
        </div>

        <div className="price-scenario-kpi">
          <span>Current Price</span>
          <strong>{formatCurrency(currentPrice)}</strong>
          <p>This module answers: if specific market scenarios occur, where could the stock realistically trade?</p>
        </div>

        <div className="scenario-ladder">
          <div className="scenario-step current"><span>Current Price</span><strong>{formatCurrency(currentPrice)}</strong><small>Reference point</small></div>
          {priceScenarios.map(scenario => (
            <div className="scenario-step" key={scenario.name}>
              <span>{scenario.name}</span>
              <strong>{formatCurrency(scenario.target)}</strong>
              <small>{scenario.probability}% probability · +{scenario.upside}% return · {scenario.risk} risk</small>
            </div>
          ))}
        </div>

        <div className="scenario-card-grid">
          {priceScenarios.map(scenario => (
            <article className={`scenario-card ${scenario.risk.toLowerCase()}`} key={scenario.name}>
              <div><span>Probability</span><strong>{scenario.probability}%</strong></div>
              <h3>{scenario.name}</h3>
              <p>{scenario.description}</p>
              <div className="scenario-card__target"><span>Scenario price</span><strong>{formatCurrency(scenario.target)}</strong><em>+{scenario.upside}%</em></div>
            </article>
          ))}
        </div>

        <div className="scenario-analysis-grid">
          <div className="terminal-card price-driver-card">
            <h3>Price Driver Analysis</h3>
            <div className="price-driver-list">
              {priceDrivers.map(([driver, impact, source]) => (
                <div key={driver}>
                  <span>{driver}</span>
                  <strong className={`impact-badge ${String(impact).toLowerCase()}`}>{impact}</strong>
                  <small className="dev-source-inline">Source: {source}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="terminal-card ai-scenario-card">
            <h3>AI Scenario Analysis</h3>
            <p>Current positioning suggests moderate upside potential under normal market conditions. If borrow availability continues to decline and short interest remains elevated, the probability of a higher squeeze scenario may increase significantly.</p>
            <p>Scenario outputs are modeled from short interest, borrow fee, internal float adjustment, sentiment, options pressure, and market activity assumptions.</p>
            {sourceChip('Internal Model')}
          </div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div>
            <span>Section 18</span>
            <h2><InfoTitle text="Upcoming events and developments that could materially impact market behavior. This module answers what could cause the stock to move.">Catalyst Intelligence Center</InfoTitle></h2>
            <p className="section-subtitle">Upcoming events and developments that could materially impact market behavior.</p>
          </div>
          {headActions(<>{sourceChip('SEC EDGAR')}{sourceChip('Company Calendar')}{viewMore(company.ticker, 'event-calendar')}</>)}
        </div>

        <div className="catalyst-summary-grid">
          <div className="terminal-card terminal-stat"><span>Upcoming Catalysts</span><strong>{catalystItems.length}</strong><small>next monitored events</small></div>
          <div className="terminal-card terminal-stat"><span>High Impact</span><strong>{highImpactCatalysts}</strong><small>executive attention</small></div>
          <div className="terminal-card terminal-stat"><span>Medium Impact</span><strong>{mediumImpactCatalysts}</strong><small>watch list</small></div>
          <div className="terminal-card terminal-stat"><span>Low Impact</span><strong>{lowImpactCatalysts}</strong><small>routine monitoring</small></div>
          <div className="terminal-card terminal-stat major-event"><span>Next Major Event</span><strong>Q2 Earnings</strong><small>Days remaining: 14</small></div>
        </div>

        <div className="catalyst-layout">
          <div className="terminal-card catalyst-timeline-card">
            <h3>Catalyst Timeline</h3>
            <div className="catalyst-timeline">
              {catalystItems.map(item => (
                <div className="catalyst-event" key={`${item.date}-${item.title}`}>
                  <span>{item.date}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <small><span>{item.category}</span><span className="dev-source-inline"> · Source: {item.source}</span></small>
                  </div>
                  <em className={`impact-badge ${item.impact.toLowerCase()}`}>{item.impact}</em>
                </div>
              ))}
            </div>
          </div>
          <div className="catalyst-side-stack">
            <div className="terminal-card catalyst-category-card">
              <h3>Catalyst Categories</h3>
              {catalystCategories.map(([category, examples]) => (
                <div key={category}><strong>{category}</strong><span>{examples}</span></div>
              ))}
            </div>
            <div className="terminal-card catalyst-heatmap-card">
              <h3>Catalyst Heatmap</h3>
              <div className="catalyst-heatmap">
                {catalystMonths.map(([month, count, note]) => (
                  <div key={month} className={Number(count) >= 3 ? 'hot' : Number(count) >= 2 ? 'warm' : 'calm'}>
                    <span>{month}</span>
                    <strong>{count}</strong>
                    <small>{note}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="terminal-card ai-catalyst-card">
          <h3>AI Catalyst Analysis</h3>
          <p>The highest-impact near-term catalyst is the upcoming earnings release. Historical trading behavior suggests earnings announcements have produced above-average volatility. Additional catalysts include potential institutional ownership disclosures, market structure events, and upcoming conference appearances.</p>
          <div className="terminal-section-actions">{sourceChip('SEC EDGAR')}{sourceChip('Company Calendar')}{sourceChip('News Intelligence')}{sourceChip('Internal Events')}{sourceChip('Fintel')}</div>
        </div>
      </section>

      </div>

    </div>
  );
}
