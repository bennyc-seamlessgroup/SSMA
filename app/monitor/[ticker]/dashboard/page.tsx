import Link from 'next/link';
import { InfoTooltip } from '@/components/InfoTooltip';
import { buildImportDashboard, readImportFile } from '@/lib/import-data';

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

function latest(rows: Row[], dateKey = 'date') {
  return [...rows].sort((a, b) => String(b[dateKey] ?? '').localeCompare(String(a[dateKey] ?? '')))[0] ?? {};
}

function sourceChip(source: string, tone: 'ready' | 'future' | 'warning' = 'ready') {
  return <span className={`source-chip ${tone}`}>Source: {source}</span>;
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

function TrendLine({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
    const y = 100 - (value / max) * 82 - 8;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="terminal-line-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} />
    </svg>
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
  return (
    <div className="radar-shell">
      <div className="radar-web" aria-hidden="true">
        <span className="radar-ring r1" />
        <span className="radar-ring r2" />
        <span className="radar-ring r3" />
        {items.map((item, index) => {
          const angle = ((Math.PI * 2) / items.length) * index - Math.PI / 2;
          const radius = 18 + (item.score / item.max) * 72;
          const x = 105 + Math.cos(angle) * radius;
          const y = 105 + Math.sin(angle) * radius;
          return <i key={item.label} style={{ left: `${x}px`, top: `${y}px` }} />;
        })}
      </div>
      <div className="radar-score-list">
        {items.map(item => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.score} / {item.max}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function CompanyDashboardPage() {
  const dashboard = buildImportDashboard();
  const { company, scores, metrics, summaries } = dashboard;

  const shortInterestEnvelope = readImportFile<Row>('short/short_interest.json');
  const borrowFeeEnvelope = readImportFile<Row>('short/borrow_fee.json');
  const sharesEnvelope = readImportFile<Row[]>('short/shares_available.json');
  const utilizationEnvelope = readImportFile<Row[]>('short/utilization.json');
  const onLoanEnvelope = readImportFile<Row[]>('short/on_loan.json');
  const shortScoreEnvelope = readImportFile<Row[]>('short/short_score.json');
  const topHoldersEnvelope = readImportFile<Row[]>('ownership/top_holders.json');
  const ownershipChangesEnvelope = readImportFile<Row[]>('ownership/ownership_changes.json');
  const activistEnvelope = readImportFile<Row[]>('ownership/activist_filings.json');
  const ownershipTrendEnvelope = readImportFile<Row[]>('ownership/ownership_trend.json');
  const insiderEnvelope = readImportFile<Row[]>('insider/insider_transactions.json');
  const insiderNetEnvelope = readImportFile<Row>('insider/net_insider_activity.json');
  const optionsEnvelope = readImportFile<Row>('options/options_summary.json');
  const putCallEnvelope = readImportFile<Row>('options/put_call_ratio.json');
  const openInterestEnvelope = readImportFile<Row[]>('options/open_interest.json');
  const gammaEnvelope = readImportFile<Row[]>('options/gamma_exposure.json');
  const alertsEnvelope = readImportFile<Row[]>('alerts/alerts.json');
  const newsEnvelope = readImportFile<Row[]>('news_filings/news.json');
  const filingsEnvelope = readImportFile<Row[]>('news_filings/sec_filings.json');
  const sentimentEnvelope = readImportFile<Row[]>('sentiment/social_mentions.json');

  const shortCurrent = record(record(shortInterestEnvelope.data).current);
  const shortHistory = rows(record(shortInterestEnvelope.data).finraHistory).slice(0, 10).reverse();
  const borrowRows = rows(record(borrowFeeEnvelope.data).all);
  const borrowCurrent = record(record(borrowFeeEnvelope.data).current);
  const availableRows = rows(sharesEnvelope.data);
  const utilizationRows = rows(utilizationEnvelope.data);
  const onLoanRows = rows(onLoanEnvelope.data);
  const shortScoreRows = rows(shortScoreEnvelope.data);
  const latestShortScore = latest(shortScoreRows);
  const latestAvailable = latest(availableRows);
  const latestUtilization = latest(utilizationRows);
  const latestOnLoan = latest(onLoanRows);
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
  const squeezeProbability = Math.min(92, Math.max(8, Math.round(squeezeScore * 0.82)));
  const overallRisk = squeezeScore >= 75 ? 'Elevated' : squeezeScore >= 55 ? 'Watch' : 'Controlled';
  const marketRanking = 37;
  const marketUniverse = 4126;
  const percentile = Math.max(1, Math.round((marketRanking / marketUniverse) * 100));

  const kpis = [
    { label: 'Short Squeeze Score', value: `${squeezeScore} / 100`, average: 'Market avg 42', rank: `Top ${percentile}%`, detail: `#${marketRanking} of ${marketUniverse}`, source: 'Internal Model' },
    { label: 'US Market Ranking', value: `#${marketRanking}`, average: `${marketUniverse} stock universe`, rank: `Top ${percentile}%`, detail: 'Internal ranking engine placeholder', source: 'Internal Model' },
    { label: 'Short Squeeze Probability', value: `${squeezeProbability}%`, average: 'Market avg 18%', rank: squeezeProbability >= 70 ? 'High probability band' : 'Watch band', detail: 'Model-calculated MVP estimate', source: 'Internal Model' },
    { label: 'Market Sentiment Score', value: `${sentimentScore} / 100`, average: `${socialMentions.length} social mentions`, rank: `${pct((positiveMentions / Math.max(socialMentions.length, 1)) * 100)} positive`, detail: 'Social media scan', source: 'Social Media Engine' },
    { label: 'Overall Risk Level', value: overallRisk, average: 'Management review', rank: 'Capital markets watch', detail: 'Short, options, sentiment, and ownership composite', source: 'Internal Model' },
    { label: 'Company Health Score', value: `${scores.healthScore} / 100`, average: 'Market avg 61', rank: scores.healthScore >= 70 ? 'Above market' : 'Needs review', detail: 'Import data pool composite', source: 'Internal Model' },
  ];

  const breakdown = [
    { label: 'Short Interest Ratio', score: 28, max: 30, weight: '30%', contribution: 'High', source: shortInterestEnvelope.sourcePlatform ?? 'Ortex/FINRA' },
    { label: 'Securities Lending Utilization', score: 24, max: 25, weight: '25%', contribution: 'High', source: utilizationEnvelope.sourcePlatform ?? 'Ortex' },
    { label: 'Short Position Trend', score: 13, max: 15, weight: '15%', contribution: 'Medium', source: shortInterestEnvelope.sourcePlatform ?? 'FINRA' },
    { label: 'Borrow Rate Pressure', score: 14, max: 15, weight: '15%', contribution: 'High', source: borrowFeeEnvelope.sourcePlatform ?? 'Ortex' },
    { label: 'Volume & Turnover Validation', score: 8, max: 10, weight: '10%', contribution: 'Medium', source: 'FINRA / Market Data' },
    { label: 'Institutional Short Concentration', score: 3, max: 5, weight: '5%', contribution: 'Pending', source: 'Future Data Provider Required' },
  ];

  const rankingRows = [
    ['AURX', 92, 1], ['QNTM', 89, 4], ['VRME', 86, 11], ['MIRA', 83, 19], ['CURR', squeezeScore, marketRanking],
    ['LTRY', 74, 48], ['SNTI', 72, 63], ['BFRG', 70, 88], ['WKEY', 68, 114], ['PBM', 66, 137],
  ];

  const triggerLevels = [
    ['Level 1', 'Initial Squeeze', squeezeScore >= 50 ? 'Triggered' : 'Preparing', Math.min(100, squeezeScore + 12)],
    ['Level 2', 'Trend Squeeze', squeezeScore >= 70 ? 'Triggered' : 'Preparing', Math.max(24, squeezeScore - 8)],
    ['Level 3', 'Extreme Squeeze', squeezeScore >= 88 ? 'Active' : 'Not Triggered', Math.max(8, squeezeScore - 32)],
  ] as const;

  return (
    <div className="page dashboard-page squeeze-dashboard">
      <div className="page__header dashboard-command-header">
        <div>
          <div className="terminal-eyebrow">Short Squeeze Monitoring & Analysis Report</div>
          <h1 className="page__title">{company.companyName} Intelligence Command Center</h1>
          <p className="page__desc">Institutional dashboard for short squeeze risk, market defense, shareholder intelligence, sentiment monitoring, and capital markets decision support.</p>
        </div>
        <div className="command-header__meta">
          <strong>{company.ticker}</strong>
          <span>{company.exchange}</span>
          {sourceChip('Standardized import_data pool')}
        </div>
      </div>

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
            <article className="executive-kpi-card" key={kpi.label}>
              <div className="kpi-card__top"><span><InfoTitle text={`${kpi.label} is an executive summary metric used to help compare the company against the broader monitored universe. Demo values use the current import data pool and placeholder internal models where noted.`}>{kpi.label}</InfoTitle></span>{sourceChip(kpi.source)}</div>
              <strong>{kpi.value}</strong>
              <div className="kpi-card__meter"><i style={{ width: `${kpi.label === 'US Market Ranking' ? 99 - percentile : numeric(kpi.value) ?? squeezeScore}%` }} /></div>
              <div className="kpi-card__meta"><span>{kpi.average}</span><span>{kpi.rank}</span><span>{kpi.detail}</span></div>
            </article>
          ))}
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head">
          <div><span>Section 2</span><h2 className="with-info">Short Squeeze Score Breakdown <InfoTooltip text="Model score decomposition by the major drivers of squeeze risk. Weights are placeholders for the future internal scoring engine." /></h2></div>
          {sourceChip('Internal Model')}
        </div>
        <div className="score-breakdown-grid">
          <div className="terminal-card radar-card">
            <RadarChart items={breakdown} />
          </div>
          <div className="terminal-card breakdown-table">
            {breakdown.map(item => (
              <div className="breakdown-row" key={item.label}>
                <div><strong>{item.label}</strong><small>Weight {item.weight} - Contribution {item.contribution}</small></div>
                <span>{item.score} / {item.max}</span>
                {sourceChip(item.source, item.source.includes('Future') ? 'future' : 'ready')}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 3</span><h2>Market Ranking</h2></div>{sourceChip('Internal Model')}</div>
        <div className="grid cols-4">
          <div className="terminal-card terminal-stat"><span>Market Ranking</span><strong>#{marketRanking}</strong><small>#37 of 4,126</small></div>
          <div className="terminal-card terminal-stat"><span>Percentile Ranking</span><strong>Top {percentile}%</strong><small>US listed universe</small></div>
          <div className="terminal-card terminal-stat"><span>Industry Ranking</span><strong>#4</strong><small>FinTech / digital infrastructure</small></div>
          <div className="terminal-card terminal-stat"><span>Sector Ranking</span><strong>#9</strong><small>Financial technology sector</small></div>
        </div>
        <div className="terminal-card ranking-panel">
          {rankingRows.map(([ticker, score, rank]) => (
            <div className={`ranking-row ${ticker === company.ticker ? 'current' : ''}`} key={ticker}>
              <span>#{rank}</span><strong>{ticker}</strong><div><i style={{ width: `${score}%` }} /></div><em>{score}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 4</span><h2>Social Media Sentiment</h2></div>{sourceChip('Social Media Engine')}</div>
        <div className="grid cols-4">
          <div className="terminal-card terminal-stat"><span>Total Mentions</span><strong>{socialMentions.length}</strong><small>Existing sentiment JSON</small></div>
          <div className="terminal-card terminal-stat"><span>Positive</span><strong>{pct((positiveMentions / Math.max(socialMentions.length, 1)) * 100)}</strong><small>{positiveMentions} mentions</small></div>
          <div className="terminal-card terminal-stat"><span>Negative</span><strong>{pct((negativeMentions / Math.max(socialMentions.length, 1)) * 100)}</strong><small>{negativeMentions} mentions</small></div>
          <div className="terminal-card terminal-stat"><span>Neutral</span><strong>{pct((neutralMentions / Math.max(socialMentions.length, 1)) * 100)}</strong><small>{neutralMentions} mentions</small></div>
        </div>
        <div className="grid cols-3">
          <div className="terminal-card chart-card"><h3><InfoTitle text="Breakdown of social-media mentions classified as positive, neutral, or negative in the imported sentiment JSON.">Sentiment Pie</InfoTitle></h3><Donut segments={[{ label: 'Positive', value: positiveMentions, color: '#16a34a' }, { label: 'Neutral', value: neutralMentions, color: '#64748b' }, { label: 'Negative', value: negativeMentions, color: '#e11d48' }]} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Shows where company mentions are coming from. Other includes platforms outside X, Reddit, and StockTwits.">Platform Breakdown</InfoTitle></h3><MiniBars values={['X', 'Reddit', 'StockTwits', 'Other'].map(label => ({ label, value: platformCounts[label] ?? 0 }))} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Seven-day sentiment trend placeholder using the current imported social sentiment score as the latest value.">7 Day Trend</InfoTitle></h3><TrendLine values={[42, 48, 53, 59, 63, 61, sentimentScore]} /><p className="terminal-note">Demo trend derived from current social sentiment score.</p></div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 5</span><h2>Social Narrative Intelligence</h2></div>{sourceChip('Social Media Engine')}</div>
        <div className="grid cols-3">
          <div className="terminal-card narrative-card"><h3>Top Bullish Narratives</h3><ul><li>Short squeeze incoming</li><li>Borrow fee rising</li><li>Institutions trapped</li><li>Fintech and AI narrative improving</li></ul></div>
          <div className="terminal-card narrative-card"><h3>Top Bearish Narratives</h3><ul><li>Overvalued</li><li>No catalyst</li><li>Meme stock volatility</li><li>Disclosure risk</li></ul></div>
          <div className="terminal-card narrative-card"><h3>Topics, Influencers, Communities</h3><p><strong>Topics:</strong> {topics.join(', ') || 'Pending scan'}</p><p><strong>Influencers:</strong> {influencers.join(', ') || 'Pending scan'}</p><p><strong>Communities:</strong> {communities.join(', ') || 'Pending scan'}</p></div>
        </div>
      </section>

      <section className="terminal-section large-section">
        <div className="terminal-section__head"><div><span>Section 6</span><h2>Short Interest Intelligence</h2></div>{sourceChip(shortInterestEnvelope.sourcePlatform ?? 'Ortex/FINRA')}</div>
        <div className="grid cols-5">
          <div className="terminal-card terminal-stat"><span>Short Interest</span><strong>{formatNumber(shortCurrent.shortInterestShares)}</strong><small>Shares</small></div>
          <div className="terminal-card terminal-stat"><span>SI % Float</span><strong>{formatPercent(shortCurrent.shortInterestPcFreeFloat, { maximumFractionDigits: 2 })}</strong><small>{metrics.shortInterestPercentFloat}</small></div>
          <div className="terminal-card terminal-stat"><span>Days To Cover</span><strong>{formatNumber(shortCurrent.daysToCoverQuantity ?? record(shortInterestEnvelope.data).daysToCover, { maximumFractionDigits: 2 })}</strong><small>FINRA / Ortex</small></div>
          <div className="terminal-card terminal-stat"><span>Borrow Fee</span><strong>{formatPercent(borrowCurrent.costToBorrowAll, { maximumFractionDigits: 2 })}</strong><small>CTB all</small></div>
          <div className="terminal-card terminal-stat"><span>Short Score</span><strong>{squeezeScore}</strong><small>Internal model</small></div>
          <div className="terminal-card terminal-stat"><span>CTB Min</span><strong>No Source</strong><small>Pending Institutional Data Source</small></div>
          <div className="terminal-card terminal-stat"><span>CTB Avg</span><strong>{formatPercent(borrowCurrent.costToBorrowAll, { maximumFractionDigits: 2 })}</strong><small>Current borrow fee</small></div>
          <div className="terminal-card terminal-stat"><span>CTB Max</span><strong>No Source</strong><small>Pending Institutional Data Source</small></div>
          <div className="terminal-card terminal-stat"><span>Shares Available</span><strong>{formatNumber(latestAvailable.shortAvailabilityShares)}</strong><small>Latest inventory</small></div>
          <div className="terminal-card terminal-stat"><span>Utilization</span><strong>{formatPercent(latestUtilization.utilization, { maximumFractionDigits: 2 })}</strong><small>Ortex style</small></div>
        </div>
        <div className="grid cols-4">
          <div className="terminal-card chart-card"><h3><InfoTitle text="Trend of reported short interest shares. Higher values may indicate more shares have been sold short.">SI Trend</InfoTitle></h3><TrendLine values={shortHistory.map(row => numeric(row.currentShortPositionQuantity) ?? 0)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Cost to borrow trend. Rising borrow fees can indicate tighter lending supply or stronger borrowing demand.">Borrow Fee Trend</InfoTitle></h3><TrendLine values={borrowRows.map(row => numeric(row.costToBorrowAll) ?? 0)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Trend of shares currently available to borrow for shorting. Falling availability can indicate lending supply pressure.">Shares Available Trend</InfoTitle></h3><TrendLine values={availableRows.map(row => numeric(row.shortAvailabilityShares) ?? 0)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Utilization estimates how much of the lendable share inventory is already borrowed. High utilization can indicate tighter borrow conditions.">Utilization Trend</InfoTitle></h3><TrendLine values={utilizationRows.map(row => numeric(row.utilization) ?? 0)} /></div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 7</span><h2>Securities Lending Intelligence</h2></div>{sourceChip('Future Data Provider Required', 'future')}</div>
        <div className="grid cols-4">
          <div className="terminal-card terminal-stat future"><span>Lending Pool Size</span><strong>No Source Available</strong><small>Future Data Provider Required</small></div>
          <div className="terminal-card terminal-stat"><span>Borrow Demand</span><strong>{formatNumber(latestOnLoan.sharesOnLoan)}</strong><small>{onLoanEnvelope.sourcePlatform ?? 'Ortex'} / on loan</small></div>
          <div className="terminal-card terminal-stat"><span>Available Inventory</span><strong>{formatNumber(latestAvailable.shortAvailabilityShares)}</strong><small>{sharesEnvelope.sourcePlatform ?? 'Ortex'}</small></div>
          <div className="terminal-card terminal-stat"><span>Inventory Utilization</span><strong>{formatPercent(latestUtilization.utilization, { maximumFractionDigits: 2 })}</strong><small>{utilizationEnvelope.sourcePlatform ?? 'Ortex'}</small></div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 8</span><h2>Institutional Ownership</h2></div>{sourceChip(topHoldersEnvelope.sourcePlatform ?? 'Fintel')}</div>
        <div className="grid cols-3">
          <div className="terminal-card terminal-stat"><span>Institutional Ownership</span><strong>{formatPercent(topHolders.reduce((sum, row) => sum + (numeric(row.ownershipPercent) ?? 0), 0), { maximumFractionDigits: 2 })}</strong><small>Top holder sample</small></div>
          <div className="terminal-card terminal-stat"><span>Increased Positions</span><strong>{increasedPositions.length}</strong><small>Ownership changes</small></div>
          <div className="terminal-card terminal-stat"><span>Reduced / Sold Out</span><strong>{reducedPositions.length}</strong><small>Reduced positions</small></div>
        </div>
        <div className="grid cols-3">
          <div className="terminal-card chart-card"><h3><InfoTitle text="Largest institutional holders in the imported ownership file. Duplicate holder names may appear if multiple filings or securities are present.">Top Holders</InfoTitle></h3><MiniBars values={topHolders.map((row, index) => ({ label: `${String(row.investorName ?? 'Holder')}${topHolders.filter(holder => String(holder.investorName) === String(row.investorName)).length > 1 ? ` ${index + 1}` : ''}`, value: numeric(row.shares) ?? 0 }))} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Historical ownership direction based on imported institutional ownership trend records.">Ownership Trend</InfoTitle></h3><TrendLine values={rows(ownershipTrendEnvelope.data).map(row => numeric(row.institutionalOwnershipPercent) ?? numeric(row.ownershipPercent) ?? 0)} /></div>
          <div className="terminal-card chart-card"><h3><InfoTitle text="Measures whether ownership is concentrated among a small number of holders or broadly distributed. Advanced concentration scoring is a future model.">Concentration Analysis</InfoTitle></h3><p className="terminal-note">Top holder distribution is visible. Advanced concentration scoring requires the future institutional analytics engine.</p>{sourceChip('Internal Model')}</div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Sections 9-11</span><h2>Shareholder, Insider & Options Intelligence</h2></div>{sourceChip('Fintel / SEC EDGAR / Ortex')}</div>
        <div className="grid cols-3">
          <div className="terminal-card narrative-card"><h3>Activist & Shareholder Watch</h3><p>13D filings: {rows(activistEnvelope.data).filter(row => String(row.formType).includes('13D')).length}</p><p>13G filings: {rows(activistEnvelope.data).filter(row => String(row.formType).includes('13G')).length}</p><p>New major shareholders: {newHolders.length}</p>{sourceChip(activistEnvelope.sourcePlatform ?? 'SEC EDGAR')}</div>
          <div className="terminal-card narrative-card"><h3>Insider Activity</h3><p>Insider buys: {formatNumber(insiderNet.buyCount)}</p><p>Insider sells: {formatNumber(insiderNet.sellCount)}</p><p>Form 3 / 4 / 5 and option exercises: {insiderRows.length ? `${insiderRows.length} records` : 'No Source Available'}</p>{sourceChip(insiderEnvelope.sourcePlatform ?? 'Fintel')}</div>
          <div className="terminal-card narrative-card"><h3>Options Intelligence</h3><p>Put/call ratio: {formatNumber(latestPutCall.putCallRatio ?? latestPutCall.putCallOIRatio ?? latestPutCall.putCallVolumeRatio, { maximumFractionDigits: 2 })}</p><p>Open interest: {openInterestRows.length ? `${openInterestRows.length} records` : 'Pending Institutional Data Source'}</p><p>Gamma exposure: {gammaRows.length ? `${gammaRows.length} records` : 'Future Data Provider Required'}</p><p>Implied volatility: {rows(optionSummary.impliedVolatility).length ? 'Available' : 'Pending Institutional Data Source'}</p>{sourceChip(optionsEnvelope.sourcePlatform ?? 'Ortex')}</div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Section 12</span><h2>Short Squeeze Trigger Engine</h2></div>{sourceChip('Internal Model')}</div>
        <div className="trigger-grid">
          {triggerLevels.map(([level, title, status, progress]) => (
            <div className="terminal-card trigger-card" key={level}>
              <span>{level}</span><h3>{title}</h3><strong>{status}</strong><div className="trigger-progress"><i style={{ width: `${progress}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Sections 13-15</span><h2>Advanced Short Position & Lending Models</h2></div>{sourceChip('Future Premium Data Provider Required', 'future')}</div>
        <div className="grid cols-3">
          <div className="terminal-card warning-card"><h3>Institutional Short Concentration</h3><p>No Reliable Public Data Source Available. Institutional short positions are generally not publicly disclosed.</p>{sourceChip('Future Data Provider Required', 'warning')}</div>
          <div className="terminal-card warning-card"><h3>Real Short Position Model</h3><p>Official short position available; estimated real short position, synthetic exposure, and OTC exposure require future premium data providers.</p>{sourceChip('Future Premium Data Provider Required', 'future')}</div>
          <div className="terminal-card warning-card"><h3>Global Lending Pool Analysis</h3><p>Global inventory, remaining capacity, and borrow exhaustion risk require securities lending datasets not yet connected.</p>{sourceChip('Future Premium Data Provider Required', 'future')}</div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="terminal-section__head"><div><span>Sections 16-17</span><h2>Price Target Engine & Catalyst Monitor</h2></div>{sourceChip('Internal Model / SEC EDGAR')}</div>
        <div className="grid cols-2">
          <div className="terminal-card target-card">
            <h3>Price Target Engine</h3>
            <div className="target-grid"><div><span>Target 1</span><strong>Initial Covering</strong><small>Risk level: Watch</small></div><div><span>Target 2</span><strong>Institutional Covering</strong><small>Risk level: Elevated</small></div><div><span>Target 3</span><strong>Extreme Squeeze</strong><small>Risk level: Critical</small></div></div>
            <p className="terminal-note">Support and resistance levels are placeholders pending technical model integration.</p>
          </div>
          <div className="terminal-card">
            <h3>Catalyst Monitor</h3>
            <div className="timeline-list">
              {[...filings, ...news].slice(0, 6).map((item, index) => (
                <div key={index}><span>{String(item.filingDate ?? item.publishDate ?? item.date ?? 'Upcoming')}</span><strong>{String(item.formType ?? item.title ?? 'Catalyst')}</strong><small>{String(item.summary ?? item.source ?? 'Earnings, calls, conferences, product launches, M&A, and regulatory events are monitored here.')}</small></div>
              ))}
              {!filings.length && !news.length && <div><span>Pending</span><strong>No Source Available</strong><small>Future event calendar provider required.</small></div>}
            </div>
          </div>
        </div>
      </section>

      <section className="terminal-section ai-summary-section">
        <div className="terminal-section__head"><div><span>Section 18</span><h2>AI Executive Summary</h2></div>{sourceChip('Internal Model')}</div>
        <div className="ai-summary-grid">
          <div><h3>Current Situation</h3><p>{company.ticker} is ranked in the top {percentile}% of the demo squeeze-risk universe with elevated borrow pressure, active social discussion, and visible institutional ownership movement.</p></div>
          <div><h3>Key Risks</h3><p>Borrow fee pressure, options positioning, fast-moving retail narratives, and incomplete public disclosure of institutional short concentration require ongoing executive monitoring.</p></div>
          <div><h3>Key Opportunities</h3><p>Positive social sentiment, institutional holder visibility, and a structured report cadence can help management maintain a disciplined market-defense record.</p></div>
          <div><h3>Short Squeeze Outlook</h3><p>Current model status is {overallRisk}. Trigger Level 1 is {triggerLevels[0][2].toLowerCase()}, while higher-order squeeze validation requires additional lending and institutional data sources.</p></div>
          <div><h3>Management Recommendations</h3><p>Review borrow fee, short interest, and sentiment movement daily. Preserve report history for board review and capital markets advisor coordination.</p></div>
          <div><h3>IR Recommendations</h3><p>Maintain precise disclosure language, monitor rumor sources, prepare FAQ responses for short-pressure questions, and route major alerts to executives quickly.</p></div>
        </div>
        <div className="terminal-alert-strip">
          {alerts.length ? alerts.map((alert, index) => <span key={index}>{String(alert.title ?? alert.alertType ?? 'Alert')}</span>) : <span>No active alerts imported.</span>}
        </div>
      </section>
    </div>
  );
}
