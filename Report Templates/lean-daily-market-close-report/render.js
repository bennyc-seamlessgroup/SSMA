(async function initReport() {
  const params = new URLSearchParams(window.location.search);
  const dataUrl = params.get('data') || 'report-data.json';
  const response = await fetch(dataUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load report data: ${response.status}`);
  const data = await response.json();
  if (params.get('ticker')) data.ticker = params.get('ticker');
  if (params.get('reportDate')) data.reportDate = params.get('reportDate');
  if (params.get('generatedAt')) data.generatedAt = params.get('generatedAt');
  document.getElementById('report-root').innerHTML = renderReport(data);
  window.__REPORT_READY__ = true;
})();

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
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
  if (unit === 'shares') return compactNumber(number);
  if (unit === 'days') return `${number.toFixed(2)}d`;
  return number.toFixed(2);
}

function chartSvg(chart) {
  const rows = (chart?.values || [])
    .map((value, index) => ({ value: Number(value), date: chart.dates?.[index] }))
    .filter(row => Number.isFinite(row.value) && row.date)
    .filter(row => chart.minValid == null || row.value >= Number(chart.minValid))
    .filter(row => chart.maxValid == null || row.value <= Number(chart.maxValid))
    .slice(-60);
  if (rows.length < 2) return '';

  const width = 560;
  const height = 206;
  const left = 58;
  const right = 18;
  const top = 42;
  const bottom = 34;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const rawMin = Math.min(...rows.map(row => row.value));
  const rawMax = Math.max(...rows.map(row => row.value));
  const padding = Math.max((rawMax - rawMin) * 0.12, Math.abs(rawMax || 1) * 0.025, 1e-9);
  const min = rawMin - padding;
  const max = rawMax + padding;
  const y = value => top + (1 - ((value - min) / (max - min))) * plotHeight;
  const x = index => left + (index / Math.max(rows.length - 1, 1)) * plotWidth;
  const points = rows.map((row, index) => `${x(index).toFixed(1)},${y(row.value).toFixed(1)}`).join(' ');
  const area = `${left},${top + plotHeight} ${points} ${left + plotWidth},${top + plotHeight}`;
  const ticks = [rawMax, (rawMax + rawMin) / 2, rawMin];
  const labelIndexes = [0, Math.floor((rows.length - 1) / 2), rows.length - 1];
  const color = chart.color || '#1769e8';

  return `<svg viewBox="0 0 ${width} ${height}" class="chart" role="img" aria-label="${esc(chart.title)}">
    <defs><linearGradient id="fill-${esc(chart.id)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${esc(color)}" stop-opacity=".18"/><stop offset="1" stop-color="${esc(color)}" stop-opacity="0"/></linearGradient></defs>
    <text x="18" y="21" class="chart-title">${esc(chart.title)}</text>
    <text x="${width - 18}" y="21" class="chart-latest" text-anchor="end">${esc(chart.latestDisplay || formatAxisValue(rows.at(-1).value, chart.unit))}</text>
    ${chart.subtitle ? `<text x="18" y="35" class="chart-subtitle">${esc(chart.subtitle)}</text>` : ''}
    ${ticks.map(tick => `<line x1="${left}" x2="${width - right}" y1="${y(tick).toFixed(1)}" y2="${y(tick).toFixed(1)}" class="gridline"/><text x="${left - 8}" y="${(y(tick) + 4).toFixed(1)}" text-anchor="end" class="axis-label">${esc(formatAxisValue(tick, chart.unit))}</text>`).join('')}
    <polygon points="${area}" fill="url(#fill-${esc(chart.id)})"/>
    <polyline points="${points}" stroke="${esc(color)}" class="chart-line"/>
    ${labelIndexes.map(index => `<circle cx="${x(index).toFixed(1)}" cy="${y(rows[index].value).toFixed(1)}" r="3" fill="${esc(color)}"/>`).join('')}
    ${labelIndexes.map(index => `<text x="${x(index).toFixed(1)}" y="${height - 10}" text-anchor="middle" class="axis-label">${esc(rows[index].date.slice(5))}</text>`).join('')}
  </svg>`;
}

function kpiCards(items) {
  return (items || []).map(item => `<div class="metric-card">
    <div class="metric-label">${esc(item.label)}</div>
    <div class="metric-value">${esc(item.value)}</div>
    <div class="metric-delta ${esc(item.tone || '')}">
      <strong>${esc(item.changeValue || '--')}</strong>
      <span>${esc(item.changePercent || '--')} vs yesterday</span>
    </div>
  </div>`).join('');
}

function richText(value) {
  return esc(value || 'AI analysis is not available for this report date.')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .split(/\n{2,}/)
    .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

function shortScorePanel(scoreData) {
  const score = Math.max(0, Math.min(100, Number(scoreData?.score || 0)));
  return `<div class="score-analysis-grid">
    <div class="card short-score-card">
      <div class="card-head"><h3>Short Interest Score</h3><span class="risk-pill ${esc(scoreData?.tone || '')}">${esc(scoreData?.level || 'Unavailable')} Risk</span></div>
      <div class="score-card-content">
        <div class="short-score-ring" style="background:conic-gradient(${esc(scoreData?.color || '#cf3e4f')} ${score}%, #e7edf5 ${score}% 100%)"><div><b>${esc(scoreData?.scoreDisplay || 'N/A')}</b><small>/ 100</small></div></div>
        <div class="score-copy"><div class="score-change ${esc(scoreData?.deltaTone || '')}">${esc(scoreData?.changeDisplay || '--')} <span>vs yesterday</span></div><p>${esc(scoreData?.summary || '')}</p></div>
      </div>
      <div class="score-ranges">${(scoreData?.ranges || []).map(row => `<div class="${row.active ? 'active' : ''}"><b>${esc(row.range)}</b><span><strong>${esc(row.level)}</strong>${esc(row.description)}</span></div>`).join('')}</div>
    </div>
    <div class="card ai-analysis-card"><div class="card-head"><h3>AI Analysis</h3><span class="count-badge">Daily</span></div><div class="ai-copy">${richText(scoreData?.aiAnalysis)}</div><small>AI-assisted interpretation. Review the underlying market data before making decisions.</small></div>
  </div>`;
}

function sentimentGauge(sentiment) {
  const score = Math.max(0, Math.min(100, Number(sentiment?.score || 0)));
  const angle = (180 - score * 1.8) * Math.PI / 180;
  const needleX = 90 + Math.cos(angle) * 48;
  const needleY = 85 - Math.sin(angle) * 48;
  return `<svg class="report-sentiment-gauge" viewBox="0 0 180 105" role="img" aria-label="Overall sentiment ${esc(sentiment?.scoreDisplay)} ${esc(sentiment?.label)}">
    <path d="M20 85 A70 70 0 0 1 55 24.4" fill="none" stroke="#16a34a" stroke-width="18"/>
    <path d="M55 24.4 A70 70 0 0 1 125 24.4" fill="none" stroke="#f2be22" stroke-width="18"/>
    <path d="M125 24.4 A70 70 0 0 1 160 85" fill="none" stroke="#ef4444" stroke-width="18"/>
    <line x1="90" y1="85" x2="${needleX.toFixed(1)}" y2="${needleY.toFixed(1)}" stroke="#10233d" stroke-width="2.5"/>
    <circle cx="90" cy="85" r="4" fill="#10233d"/>
    <text x="90" y="65" text-anchor="middle" class="gauge-score">${esc(sentiment?.scoreDisplay || 'N/A')}</text>
    <text x="90" y="77" text-anchor="middle" class="gauge-label">${esc(sentiment?.label || '')}</text>
  </svg>`;
}

function sentimentDistribution(distribution) {
  const bullish = Number(distribution?.bullishPercent || 0);
  const neutral = Number(distribution?.neutralPercent || 0);
  const bearish = Number(distribution?.bearishPercent || 0);
  const stop1 = bullish;
  const stop2 = bullish + neutral;
  return `<div class="sentiment-block">
    <div class="sentiment-ring" style="background:conic-gradient(#16a34a 0 ${stop1}%, #f2be22 ${stop1}% ${stop2}%, #ef4444 ${stop2}% 100%)"><div><b>${esc(distribution?.scoreDisplay)}</b><span>${esc(distribution?.label)}</span></div></div>
    <div class="sentiment-legend">
      <span><i class="bullish"></i>Bullish <b>${bullish.toFixed(0)}%</b></span>
      <span><i class="neutral"></i>Neutral <b>${neutral.toFixed(0)}%</b></span>
      <span><i class="bearish"></i>Bearish <b>${bearish.toFixed(0)}%</b></span>
    </div>
  </div>`;
}

function platformRows(platforms) {
  return `<div class="platform-list">${(platforms || []).map(platform => `<div class="platform-row">
    <span>${esc(platform.name)}</span><div><i style="width:${Math.max(0, Math.min(100, Number(platform.sharePercent || 0)))}%"></i></div>
    <b>${esc(platform.mentionsDisplay || compactNumber(platform.mentions))}</b><small>${esc(platform.sentimentLabel)}</small>
  </div>`).join('')}</div>`;
}

function filingRows(items) {
  if (!items?.length) return '<div class="empty-state">No filing records are available for this report.</div>';
  return `<table class="table"><thead><tr><th>Date</th><th>Form</th><th>Filing</th></tr></thead><tbody>${items.slice(0, 5).map(row => `<tr><td>${esc(row.date)}</td><td><span class="form-pill">${esc(row.formType)}</span></td><td><b>${esc(row.title)}</b></td></tr>`).join('')}</tbody></table>`;
}

function reportFooter(pageNumber, legalText) {
  return `<div class="footer"><span class="report-legal">${esc(legalText)}</span><span>${pageNumber}</span></div>`;
}

function pageHeader(kicker, title, badge) {
  return `<div class="page-header"><div><span class="eyebrow">${esc(kicker)}</span><h2>${esc(title)}</h2></div><span class="page-badge">${esc(badge)}</span></div>`;
}

function renderReport(data) {
  const legal = data.legalDisclaimers || {};
  const shortLending = data.shortLending || {};
  const sentiment = data.sentiment || {};

  return `
<section class="page cover">
  <div class="cover-brand"><span class="brand-mark">CI</span><span>CURRENC<br/>INTELLIGENCE</span></div>
  <div class="cover-main"><span class="cover-kicker">Post-Market Intelligence</span><h1>Daily Market<br/>Close Report</h1><p>A concise view of short positioning, lending conditions, social sentiment, and recent regulatory filings.</p></div>
  <div class="cover-status single"><div><span>Current posture</span><strong>${esc(data.status)}</strong></div></div>
  <div class="cover-meta"><div><span>Company</span><strong>${esc(data.company)}</strong><small>${esc(data.ticker)}</small></div><div><span>Report date</span><strong>${esc(data.reportDate)}</strong><small>${esc(data.generatedAt)}</small></div></div>
  <div class="cover-scope"><span>Short positioning</span><span>Lending conditions</span><span>Social sentiment</span><span>SEC filings</span></div>
  ${reportFooter(1, legal.footer)}
</section>

<section class="page">
  ${pageHeader('Daily Snapshot', 'Key Closing Signals', data.status)}
  <div class="metric-grid metric-grid-8">${kpiCards(data.snapshotKpis)}</div>
  ${shortScorePanel(data.shortInterestScore)}
  ${reportFooter(2, legal.footer)}
</section>

<section class="page">
  ${pageHeader('Seven-Day Trends', 'Short and Lending Movement', shortLending.posture)}
  <div class="two-column chart-grid compact-chart-grid">
    <div class="card chart-card">${chartSvg(shortLending.borrowFeeChart)}</div>
    <div class="card chart-card">${chartSvg(shortLending.shortableSharesChart)}</div>
    <div class="card chart-card">${chartSvg(shortLending.utilizationChart)}</div>
    <div class="card chart-card">${chartSvg(shortLending.daysToCoverChart)}</div>
  </div>
  ${reportFooter(3, legal.footer)}
</section>

<section class="page">
  ${pageHeader('Market Perception', 'Social Sentiment and Recent Filings', '1D Window')}
  <div class="two-column sentiment-primary-grid">
    <div class="card sentiment-overall-card"><div class="card-head"><h3>Overall Sentiment</h3><span class="count-badge">1D</span></div>${sentimentGauge(sentiment.overall)}<div class="sentiment-delta ${esc(sentiment.overall?.deltaTone || '')}">${esc(sentiment.overall?.changeDisplay || '--')} <span>vs previous 1D</span></div><small>${esc(sentiment.mentionsDisplay)} mentions</small></div>
    <div class="card sentiment-distribution-card"><div class="card-head"><h3>Sentiment Distribution</h3><span class="count-badge">${esc(sentiment.mentionsDisplay)} mentions</span></div>${sentimentDistribution(sentiment.distribution)}</div>
  </div>
  <div class="card platform-breakdown-card"><div class="card-head"><h3>Platform Breakdown</h3><span class="count-badge">1D</span></div>${platformRows(sentiment.platforms)}</div>
  <div class="card filings-card"><div class="card-head"><h3>Latest SEC Filings</h3><span class="count-badge">${data.secFilings?.length || 0}</span></div>${filingRows(data.secFilings)}</div>
  ${reportFooter(4, legal.footer)}
</section>`;
}
