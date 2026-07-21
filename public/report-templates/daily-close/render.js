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
    <div class="metric-delta ${esc(item.tone || '')}">${esc(item.delta || '')}</div>
  </div>`).join('');
}

function riskRows(items) {
  return (items || []).map(item => `<div class="risk-row"><span>${esc(item.label)}</span><b class="${esc(item.tone || '')}">${esc(item.value)}</b></div>`).join('');
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
  <div class="metric-grid metric-grid-7">${kpiCards(data.snapshotKpis)}</div>
  <div class="two-column snapshot-grid">
    <div class="card"><h3>Risk Classification</h3><div class="risk-list">${riskRows(data.riskSignals)}</div></div>
    <div class="card"><h3>Data As Of</h3><div class="as-of-list">${(data.dataAsOf || []).map(item => `<div><span>${esc(item.label)}</span><b>${esc(item.value)}</b></div>`).join('')}</div></div>
  </div>
  <div class="two-column chart-grid"><div class="card chart-card">${chartSvg(shortLending.borrowFeeChart)}</div><div class="card chart-card">${chartSvg(shortLending.shortableSharesChart)}</div></div>
  ${reportFooter(2, legal.footer)}
</section>

<section class="page">
  ${pageHeader('Short and Lending', 'Capacity and Covering Pressure', shortLending.posture)}
  <div class="two-column chart-grid primary-charts"><div class="card chart-card">${chartSvg(shortLending.utilizationChart)}</div><div class="card chart-card">${chartSvg(shortLending.daysToCoverChart)}</div></div>
  <div class="card metric-explanation"><h3>How to Read These Signals</h3><div class="three-column">${(shortLending.signalGuide || []).map(item => `<div><span>${esc(item.label)}</span><b>${esc(item.value)}</b><p>${esc(item.description)}</p></div>`).join('')}</div></div>
  ${reportFooter(3, legal.footer)}
</section>

<section class="page">
  ${pageHeader('Market Perception', 'Social Sentiment and Recent Filings', 'Latest Available')}
  <div class="two-column sentiment-layout">
    <div class="card"><div class="card-head"><h3>Sentiment Distribution</h3><span class="count-badge">${esc(sentiment.mentionsDisplay)} mentions</span></div>${sentimentDistribution(sentiment.distribution)}</div>
    <div class="card"><h3>Platform Contribution</h3>${platformRows(sentiment.platforms)}</div>
  </div>
  <div class="card filings-card"><div class="card-head"><h3>Latest SEC Filings</h3><span class="count-badge">${data.secFilings?.length || 0}</span></div>${filingRows(data.secFilings)}</div>
  <div class="method-note"><h3>Report Scope</h3><p>This first release reports only verified values currently available to the portal. It excludes unsupported forecasts, incomplete market context, event interpretation, and placeholder analysis.</p></div>
  ${reportFooter(4, legal.footer)}
</section>`;
}
