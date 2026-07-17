(async function initReport() {
  const response = await fetch('report-data.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load report-data.json: ${response.status}`);
  const data = await response.json();
  document.getElementById('report-root').innerHTML = renderReport(data);
  window.__REPORT_READY__ = true;
})();

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

function compactNumber(value) {
  if (value == null || !Number.isFinite(Number(value))) return 'N/A';
  const number = Number(value);
  const absolute = Math.abs(number);
  if (absolute >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(1)}B`;
  if (absolute >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(number / 1_000).toFixed(1)}K`;
  return number.toFixed(0);
}

function formatAxisValue(value, unit) {
  if (value == null || !Number.isFinite(Number(value))) return 'N/A';
  const number = Number(value);
  if (unit === 'percent') return `${number.toFixed(Math.abs(number) >= 10 ? 1 : 2)}%`;
  if (unit === 'shares' || unit === 'volume') return compactNumber(number);
  if (unit === 'money') return `$${number.toFixed(2)}`;
  if (unit === 'days') return `${number.toFixed(2)}d`;
  return number.toFixed(2);
}

function chartSvg(chart, compact = false) {
  if (!chart) return '<div class="empty-chart">Data pending</div>';
  const rows = (chart.values || [])
    .map((value, index) => ({ value: Number(value), date: chart.dates?.[index] }))
    .filter((row) => Number.isFinite(row.value) && row.date)
    .filter((row) => chart.minValid == null || row.value >= Number(chart.minValid))
    .filter((row) => chart.maxValid == null || row.value <= Number(chart.maxValid));
  const series = rows.slice(-60);
  if (series.length < 2) return `<div class="empty-chart"><b>${esc(chart.title)}</b><span>Historical data pending</span></div>`;

  const width = 560;
  const height = compact ? 190 : 226;
  const left = 58;
  const right = 18;
  const top = 42;
  const bottom = 36;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const rawMin = Math.min(...series.map((row) => row.value));
  const rawMax = Math.max(...series.map((row) => row.value));
  const padding = Math.max((rawMax - rawMin) * 0.12, Math.abs(rawMax || 1) * 0.025, 1e-9);
  const min = rawMin - padding;
  const max = rawMax + padding;
  const y = (value) => top + (1 - ((value - min) / (max - min))) * plotHeight;
  const x = (index) => left + (index / Math.max(series.length - 1, 1)) * plotWidth;
  const points = series.map((row, index) => `${x(index).toFixed(1)},${y(row.value).toFixed(1)}`).join(' ');
  const area = `${left},${top + plotHeight} ${points} ${left + plotWidth},${top + plotHeight}`;
  const ticks = [rawMax, (rawMax + rawMin) / 2, rawMin];
  const labelIndexes = [0, Math.floor((series.length - 1) / 2), series.length - 1];
  const color = chart.color || '#2563eb';

  return `<svg viewBox="0 0 ${width} ${height}" class="chart" role="img" aria-label="${esc(chart.title)}">
    <defs><linearGradient id="fill-${esc(chart.id)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${esc(color)}" stop-opacity=".20"/><stop offset="1" stop-color="${esc(color)}" stop-opacity="0"/></linearGradient></defs>
    <text x="18" y="21" class="chart-title">${esc(chart.title)}</text>
    <text x="${width - 18}" y="21" class="chart-latest" text-anchor="end">${esc(chart.latestDisplay || formatAxisValue(series.at(-1).value, chart.unit))}</text>
    ${chart.subtitle ? `<text x="18" y="35" class="chart-subtitle">${esc(chart.subtitle)}</text>` : ''}
    ${ticks.map((tick) => `<line x1="${left}" x2="${width - right}" y1="${y(tick).toFixed(1)}" y2="${y(tick).toFixed(1)}" class="gridline"/><text x="${left - 8}" y="${(y(tick) + 4).toFixed(1)}" text-anchor="end" class="axis-label">${esc(formatAxisValue(tick, chart.unit))}</text>`).join('')}
    <polygon points="${area}" fill="url(#fill-${esc(chart.id)})"/>
    <polyline points="${points}" stroke="${esc(color)}" class="chart-line"/>
    ${labelIndexes.map((index) => `<circle cx="${x(index).toFixed(1)}" cy="${y(series[index].value).toFixed(1)}" r="3" fill="${esc(color)}"/>`).join('')}
    ${labelIndexes.map((index) => `<text x="${x(index).toFixed(1)}" y="${height - 11}" text-anchor="middle" class="axis-label">${esc(series[index].date.slice(5))}</text>`).join('')}
  </svg>`;
}

function aiSection(title, section, className = '') {
  const ready = section?.status === 'ready' && section.text;
  return `<div class="card ai-card ${className}">
    <div class="card-head"><h3>${esc(title)}</h3><span class="ai-badge ${ready ? 'ready' : ''}">${ready ? 'AI ANALYSIS' : 'PENDING AI'}</span></div>
    <p class="analysis-copy">${esc(ready ? section.text : section?.placeholder || 'Analysis will be generated when the AI analysis pipeline is available.')}</p>
  </div>`;
}

function kpiCards(items, className = '') {
  return (items || []).map((item) => `<div class="metric-card ${className}">
    <div class="metric-label">${esc(item.label)}</div>
    <div class="metric-value">${esc(item.value)}</div>
    <div class="metric-delta ${esc(item.tone || '')}">${esc(item.delta || '')}</div>
  </div>`).join('');
}

function alertRows(items, numbered = true) {
  if (!items?.length) return '<div class="empty-state">No material signals were triggered for this section.</div>';
  return items.map((item, index) => `<div class="signal-row">
    <span class="signal-marker ${esc(item.severity || 'info')}">${numbered ? index + 1 : ''}</span>
    <div><strong>${esc(item.title || item.label || '')}</strong><p>${esc(item.text || item)}</p></div>
  </div>`).join('');
}

function filingRows(items) {
  if (!items?.length) return '<div class="empty-state">No new filings in the report window.</div>';
  return `<table class="table"><thead><tr><th>Date</th><th>Form</th><th>Filing</th></tr></thead><tbody>${items.slice(0, 4).map((row) => `<tr><td>${esc(row.date)}</td><td><span class="form-pill">${esc(row.formType)}</span></td><td><b>${esc(row.title)}</b></td></tr>`).join('')}</tbody></table>`;
}

function sentimentDistribution(distribution) {
  const bullish = Number(distribution?.bullishPercent || 0);
  const neutral = Number(distribution?.neutralPercent || 0);
  const bearish = Number(distribution?.bearishPercent || 0);
  const hasDistribution = bullish + neutral + bearish > 0;
  const stop1 = bullish;
  const stop2 = bullish + neutral;
  return `<div class="sentiment-block">
    <div class="sentiment-ring" style="background:${hasDistribution ? `conic-gradient(#16a34a 0 ${stop1}%, #f2be22 ${stop1}% ${stop2}%, #ef4444 ${stop2}% 100%)` : '#dfe7f1'}"><div><b>${esc(distribution?.scoreDisplay || 'N/A')}</b><span>${esc(distribution?.label || 'No signal')}</span></div></div>
    <div class="sentiment-legend">
      <span><i class="bullish"></i>Bullish <b>${bullish.toFixed(0)}%</b></span>
      <span><i class="neutral"></i>Neutral <b>${neutral.toFixed(0)}%</b></span>
      <span><i class="bearish"></i>Bearish <b>${bearish.toFixed(0)}%</b></span>
    </div>
  </div>`;
}

function platformRows(platforms) {
  if (!platforms?.length) return '<div class="empty-state">Platform data pending.</div>';
  return `<div class="platform-list">${platforms.map((platform) => `<div class="platform-row"><span>${esc(platform.name)}</span><div><i style="width:${Math.max(0, Math.min(100, Number(platform.sharePercent || 0)))}%"></i></div><b>${esc(platform.mentionsDisplay || compactNumber(platform.mentions))}</b><small>${esc(platform.sentimentLabel || 'No data')}</small></div>`).join('')}</div>`;
}

function reportFooter(pageNumber, legalText) {
  return `<div class="footer"><span class="report-legal">${esc(legalText)}</span><span>${pageNumber}</span></div>`;
}

function pageHeader(kicker, title, badge) {
  return `<div class="page-header"><div><span class="eyebrow">${esc(kicker)}</span><h2>${esc(title)}</h2></div><span class="page-badge">${esc(badge)}</span></div>`;
}

function renderReport(data) {
  const legal = data.legalDisclaimers || {};
  const market = data.market || {};
  const shortLending = data.shortLending || {};
  const sentiment = data.sentiment || {};
  const catalysts = data.catalysts || {};
  const nextSession = data.nextSession || {};
  const llm = data.llmSections || {};

  return `
<section class="page cover">
  <div class="cover-brand"><span class="brand-mark">CI</span><span>CURRENC<br/>INTELLIGENCE</span></div>
  <div class="cover-main"><span class="cover-kicker">Management Intelligence</span><h1>Daily Market<br/>Close Report</h1><p>One concise view of the closing tape, short pressure, lending conditions, market narrative, material events, and next-session priorities.</p></div>
  <div class="cover-status"><div><span>Closing posture</span><strong>${esc(data.status)}</strong></div><div><span>Data coverage</span><strong>${esc(data.dataCoverage?.label || 'Review pending')}</strong></div></div>
  <div class="cover-meta"><div><span>Company</span><strong>${esc(data.company)}</strong><small>${esc(data.ticker)}</small></div><div><span>Report date</span><strong>${esc(data.reportDate)}</strong><small>${esc(data.generatedAt)}</small></div></div>
  <div class="cover-scope"><span>Market close</span><span>Short and lending</span><span>Social sentiment</span><span>Filings and events</span><span>Next session</span></div>
  ${reportFooter(1, legal.footer)}
</section>

<section class="page">
  ${pageHeader('Executive Close', 'What Management Needs to Know', data.status)}
  <div class="metric-grid metric-grid-6">${kpiCards(data.executiveKpis)}</div>
  ${aiSection('AI Executive Brief', llm.executiveSummary, 'featured-ai')}
  <div class="two-column executive-bottom">
    <div class="card"><div class="card-head"><h3>Material Changes Today</h3><span class="count-badge">${data.topDailyAlerts?.length || 0}</span></div>${alertRows(data.topDailyAlerts)}</div>
    <div class="card"><h3>Report Readiness</h3><div class="coverage-list">${(data.dataCoverage?.items || []).map((item) => `<div><span>${esc(item.label)}</span><b class="${esc(item.status)}">${esc(item.display || item.status)}</b></div>`).join('')}</div><p class="fine-print">Missing values remain visibly marked. The report must not replace unavailable observations with inferred market data.</p></div>
  </div>
  ${reportFooter(2, legal.footer)}
</section>

<section class="page">
  ${pageHeader('Market Performance', 'Closing Tape and Liquidity', 'Daily Close')}
  <div class="metric-grid metric-grid-4">${kpiCards(market.kpis)}</div>
  <div class="two-column chart-grid"><div class="card chart-card">${chartSvg(market.priceChart)}</div><div class="card chart-card">${chartSvg(market.volumeChart)}</div></div>
  ${aiSection('AI Market Close Analysis', llm.marketCloseAnalysis)}
  <div class="card compact-card"><h3>Market Context</h3><div class="context-grid">${(market.context || []).map((item) => `<div><span>${esc(item.label)}</span><b>${esc(item.value)}</b><small>${esc(item.note || '')}</small></div>`).join('')}</div></div>
  ${reportFooter(3, legal.footer)}
</section>

<section class="page">
  ${pageHeader('Short and Lending', 'Pressure, Capacity, and Covering Risk', shortLending.posture || 'Daily Close')}
  <div class="metric-grid metric-grid-6">${kpiCards(shortLending.kpis)}</div>
  <div class="two-column chart-grid compact-charts"><div class="card chart-card">${chartSvg(shortLending.borrowFeeChart, true)}</div><div class="card chart-card">${chartSvg(shortLending.shortableSharesChart, true)}</div><div class="card chart-card">${chartSvg(shortLending.utilizationChart, true)}</div><div class="card chart-card">${chartSvg(shortLending.daysToCoverChart, true)}</div></div>
  ${aiSection('AI Short and Lending Analysis', llm.shortLendingAnalysis)}
  <div class="metric-strip">${(shortLending.operatingMetrics || []).map((item) => `<div><span>${esc(item.label)}</span><b>${esc(item.value)}</b><small>${esc(item.delta || '')}</small></div>`).join('')}</div>
  ${reportFooter(4, legal.footer)}
</section>

<section class="page">
  ${pageHeader('Narrative and Catalysts', 'Market Perception and Material Events', '24-Hour View')}
  <div class="three-column sentiment-layout">
    <div class="card"><h3>Sentiment Distribution</h3>${sentimentDistribution(sentiment.distribution)}</div>
    <div class="card platform-card"><h3>Platform Contribution</h3>${platformRows(sentiment.platforms)}</div>
    <div class="card"><h3>Discussion Activity</h3><div class="activity-stat"><strong>${esc(sentiment.mentionsDisplay || 'N/A')}</strong><span>mentions</span><small>${esc(sentiment.mentionsDelta || 'Comparison pending')}</small></div>${chartSvg(sentiment.trendChart, true)}</div>
  </div>
  <div class="two-column catalyst-grid">
    <div class="card"><div class="card-head"><h3>New and Recent Filings</h3><span class="count-badge">${catalysts.secFilings?.length || 0}</span></div>${filingRows(catalysts.secFilings)}</div>
    ${aiSection('AI Narrative and Catalyst Analysis', llm.narrativeCatalystAnalysis)}
  </div>
  <div class="card compact-card"><h3>Material Event Monitor</h3>${alertRows(catalysts.materialEvents, false)}</div>
  ${reportFooter(5, legal.footer)}
</section>

<section class="page">
  ${pageHeader('Next Session', 'Risk Outlook and Management Priorities', nextSession.riskLevel || 'Monitor')}
  ${aiSection('AI Next-Session Risk Outlook', llm.nextSessionOutlook, 'featured-ai')}
  <div class="two-column action-grid">
    <div class="card"><h3>Threshold Watchlist</h3>${alertRows(nextSession.thresholdWatch)}</div>
    ${aiSection('AI Management Action Queue', llm.managementActionQueue)}
  </div>
  <div class="card"><h3>Scheduled and Known Events</h3>${alertRows(nextSession.scheduledEvents, false)}</div>
  <div class="decision-note"><b>Decision standard</b><span>AI analysis should explain evidence, uncertainty, and management relevance. It must not generate unsupported price targets, trading instructions, or claims that are not traceable to the report inputs.</span></div>
  ${reportFooter(6, legal.footer)}
</section>

<section class="page legal-page">
  ${pageHeader('Legal and Compliance', 'Important Disclaimer', 'Information Only')}
  <div class="legal-card"><div class="cover-brand dark"><span class="brand-mark">CI</span><span>CURRENC<br/>INTELLIGENCE</span></div><h3>Daily Market Close Report</h3><p>${esc(legal.full)}</p></div>
  <div class="method-note"><h3>Report Method</h3><p>This report combines closing market observations, short and lending data, social sentiment, regulatory filings, deterministic alerts, and clearly labeled AI-assisted analysis. Data timing varies by source and may not represent a synchronized market snapshot.</p></div>
  ${reportFooter(7, legal.footer)}
</section>`;
}
