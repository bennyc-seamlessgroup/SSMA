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
  drawSentimentGauge(document.querySelector('.report-sentiment-gauge'), data.sentiment?.overall);
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

function isoDatePart(value) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function formatWindowDate(value) {
  const datePart = isoDatePart(value);
  if (!datePart) return '';
  const [year, month, day] = datePart.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function sentimentWindowMeta(sentiment, reportDateIso) {
  const rawWindow = String(sentiment?.window || '7D').trim().toUpperCase();
  const isSevenDay = ['7D', '7 DAYS', '7-DAY', 'PREVIOUS 7 DAYS'].includes(rawWindow);
  const shortLabel = isSevenDay ? '7D' : rawWindow || '7D';
  const periodLabel = isSevenDay ? 'Previous 7 Days' : `${shortLabel} Window`;
  const comparisonLabel = isSevenDay ? 'vs previous 7 days' : `vs previous ${shortLabel}`;
  const startLabel = formatWindowDate(sentiment?.windowStart);
  const endLabel = formatWindowDate(reportDateIso || sentiment?.windowEnd);
  const dateRange = startLabel && endLabel ? `${startLabel} – ${endLabel}` : '';

  return { isSevenDay, shortLabel, periodLabel, comparisonLabel, dateRange };
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
      <span>${esc(item.changePercent || '--')} ${esc(item.comparisonLabel || 'vs previous trading day')}</span>
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
  const accessibleLabel = `Overall sentiment ${sentiment?.scoreDisplay || 'N/A'} ${sentiment?.label || ''}`;
  return `<canvas class="report-sentiment-gauge" width="360" height="210" role="img" aria-label="${esc(accessibleLabel)}">${esc(accessibleLabel)}</canvas>`;
}

function drawSentimentGauge(canvas, sentiment) {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const hasScore = sentiment?.score != null && Number.isFinite(Number(sentiment.score));
  const score = Math.max(0, Math.min(100, hasScore ? Number(sentiment.score) : 0));
  const scale = canvas.width / 180;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, 180, 105);

  const gradient = context.createLinearGradient(30, 0, 150, 0);
  gradient.addColorStop(0, '#ef4444');
  gradient.addColorStop(0.31, '#ef4444');
  gradient.addColorStop(0.38, '#f2be22');
  gradient.addColorStop(0.62, '#f2be22');
  gradient.addColorStop(0.69, '#16a34a');
  gradient.addColorStop(1, '#16a34a');
  context.beginPath();
  context.arc(90, 80, 60, Math.PI, Math.PI * 2);
  context.strokeStyle = gradient;
  context.lineWidth = 16;
  context.lineCap = 'round';
  context.stroke();

  if (hasScore) {
    const angle = (180 - score * 1.8) * Math.PI / 180;
    const markerX = 90 + Math.cos(angle) * 60;
    const markerY = 80 - Math.sin(angle) * 60;
    context.beginPath();
    context.arc(markerX, markerY, 6, 0, Math.PI * 2);
    context.fillStyle = '#10233d';
    context.fill();
    context.strokeStyle = '#ffffff';
    context.lineWidth = 3;
    context.stroke();
  }

  context.textAlign = 'center';
  context.fillStyle = '#10233d';
  context.font = '800 22px Arial, sans-serif';
  context.fillText(sentiment?.scoreDisplay || 'N/A', 90, 67);
  context.fillStyle = '#0c8a63';
  context.font = '800 8px Arial, sans-serif';
  context.fillText(String(sentiment?.label || '').toUpperCase(), 90, 80);
}

function sentimentDistribution(distribution) {
  const bullish = Number(distribution?.bullishPercent || 0);
  const neutral = Number(distribution?.neutralPercent || 0);
  const bearish = Number(distribution?.bearishPercent || 0);
  const stop1 = bullish;
  const stop2 = bullish + neutral;
  return `<div class="sentiment-block">
    <svg class="sentiment-ring-svg" viewBox="0 0 132 132" role="img" aria-label="${esc(distribution?.label)} ${esc(distribution?.scoreDisplay)}"><circle class="sentiment-ring-track" cx="66" cy="66" r="48" pathLength="100"/><circle class="sentiment-ring-segment bullish" cx="66" cy="66" r="48" pathLength="100" stroke-dasharray="${Math.max(0, Math.min(100, bullish))} 100" stroke-dashoffset="0"/><circle class="sentiment-ring-segment neutral" cx="66" cy="66" r="48" pathLength="100" stroke-dasharray="${Math.max(0, Math.min(100 - stop1, neutral))} 100" stroke-dashoffset="${-stop1}"/><circle class="sentiment-ring-segment bearish" cx="66" cy="66" r="48" pathLength="100" stroke-dasharray="${Math.max(0, Math.min(100 - stop2, bearish))} 100" stroke-dashoffset="${-stop2}"/><text x="66" y="64" text-anchor="middle" class="sentiment-ring-score">${esc(distribution?.scoreDisplay)}</text><text x="66" y="79" text-anchor="middle" class="sentiment-ring-label">${esc(distribution?.label)}</text></svg>
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

function tradingSnapshot(snapshot) {
  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  return `<section class="trading-snapshot" aria-label="Daily trading snapshot">
    <span class="trading-snapshot-date">As of ${esc(snapshot?.asOfDate || 'N/A')}</span>
    ${items.map(item => `<div class="trading-snapshot-item"><span>${esc(item.label)}</span><strong>${esc(item.value)}</strong></div>`).join('')}
  </section>`;
}

function renderReport(data) {
  const legal = data.legalDisclaimers || {};
  const shortLending = data.shortLending || {};
  const sentiment = data.sentiment || {};
  const sentimentWindow = sentimentWindowMeta(sentiment, data.reportDateIso);

  return `
<section class="page cover">
  <div class="cover-brand"><span class="brand-mark">CI</span><span>CURRENC<br/>INTELLIGENCE</span></div>
  <div class="cover-main"><span class="cover-kicker">Post-Market Intelligence</span><h1>Daily Market<br/>Close Report</h1><p>A concise view of short positioning, lending conditions, social sentiment, and recent regulatory filings.</p></div>
  <div class="cover-status single"><div><span>Current posture</span><strong>${esc(data.status)}</strong></div></div>
  <div class="cover-meta"><div><span>Company</span><strong>${esc(data.company)}</strong><small>${esc(data.ticker)}</small></div><div><span>Report date</span><strong>${esc(data.reportDate)}</strong><small>${esc(data.generatedAtDisplay || data.generatedAt)}</small></div></div>
  <div class="cover-scope"><span>Short positioning</span><span>Lending conditions</span><span>Social sentiment</span><span>SEC filings</span></div>
  ${reportFooter(1, legal.footer)}
</section>

<section class="page">
  ${pageHeader('Daily Snapshot', 'Key Closing Signals', data.status)}
  ${tradingSnapshot(data.tradingSnapshot)}
  <div class="metric-grid metric-grid-8">${kpiCards(data.snapshotKpis)}</div>
  ${shortScorePanel(data.shortInterestScore)}
  ${reportFooter(2, legal.footer)}
</section>

<section class="page">
  ${pageHeader('Seven-Day Trends', 'Short and Lending Movement', shortLending.posture)}
  <div class="two-column chart-grid compact-chart-grid">
    <div class="card chart-card">${chartSvg(shortLending.shortVolumeChart)}</div>
    <div class="card chart-card">${chartSvg(shortLending.borrowFeeChart)}</div>
    <div class="card chart-card">${chartSvg(shortLending.shortableSharesChart)}</div>
    <div class="card chart-card">${chartSvg(shortLending.ftdChart)}</div>
    <div class="card chart-card">${chartSvg(shortLending.utilizationChart)}</div>
    <div class="card chart-card">${chartSvg(shortLending.daysToCoverChart)}</div>
  </div>
  ${reportFooter(3, legal.footer)}
</section>

<section class="page">
  ${pageHeader('Market Perception', sentimentWindow.isSevenDay ? 'Seven-Day Social Sentiment and Recent Filings' : 'Social Sentiment and Recent Filings', sentimentWindow.periodLabel)}
  <div class="sentiment-window-summary"><span>Sentiment observation period</span><strong>${esc(sentimentWindow.dateRange || sentimentWindow.periodLabel)}</strong></div>
  <div class="two-column sentiment-primary-grid">
    <div class="card sentiment-overall-card"><div class="card-head"><h3>${sentimentWindow.isSevenDay ? '7-Day Overall Sentiment' : 'Overall Sentiment'}</h3><span class="count-badge">${esc(sentimentWindow.shortLabel)}</span></div>${sentimentGauge(sentiment.overall)}<div class="sentiment-delta ${esc(sentiment.overall?.deltaTone || '')}">${esc(sentiment.overall?.changeDisplay || '--')} <span>${esc(sentimentWindow.comparisonLabel)}</span></div><small>${esc(sentiment.mentionsDisplay)} mentions</small></div>
    <div class="card sentiment-distribution-card"><div class="card-head"><h3>Sentiment Distribution</h3><span class="count-badge">${esc(sentiment.mentionsDisplay)} mentions</span></div>${sentimentDistribution(sentiment.distribution)}</div>
  </div>
  <div class="card platform-breakdown-card"><div class="card-head"><h3>Platform Breakdown</h3><span class="count-badge">${esc(sentimentWindow.shortLabel)}</span></div>${platformRows(sentiment.platforms)}</div>
  <div class="card filings-card"><div class="card-head"><h3>Latest SEC Filings</h3><span class="count-badge">${data.secFilings?.length || 0}</span></div>${filingRows(data.secFilings)}</div>
  ${reportFooter(4, legal.footer)}
</section>`;
}
