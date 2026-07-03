(async function initReport() {
  const response = await fetch('report-data.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load report-data.json: ${response.status}`);
  const data = await response.json();
  document.getElementById('report-root').innerHTML = renderReport(data);
  window.__REPORT_READY__ = true;
})();

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatAxisValue(value, unit) {
  if (value == null || Number.isNaN(Number(value))) return 'N/A';
  if (unit === 'percent') return `${Number(value).toFixed(Number(value) >= 10 ? 1 : 2)}%`;
  if (unit === 'shares' || unit === 'volume') return compactNumber(value);
  if (unit === 'money') return `$${Number(value).toFixed(2)}`;
  if (unit === 'days') return `${Number(value).toFixed(2)}d`;
  return Number(value).toFixed(2);
}

function compactNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return 'N/A';
  const abs = Math.abs(Number(value));
  if (abs >= 1_000_000) return `${(Number(value) / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(Number(value) / 1_000).toFixed(1)}K`;
  return `${Number(value).toFixed(0)}`;
}

function chartSvg(chart) {
  const mapped = (chart.values || [])
    .map((value, index) => ({ value, date: chart.dates?.[index] }))
    .filter((row) => row.value != null && Number.isFinite(Number(row.value)));
  const series = mapped.slice(-90);
  const width = 560;
  const height = 236;
  if (series.length < 2) {
    return `<div class="empty-chart">Not enough daily data for chart.</div>`;
  }

  const minRaw = Math.min(...series.map((row) => row.value));
  const maxRaw = Math.max(...series.map((row) => row.value));
  const pad = Math.max((maxRaw - minRaw) * 0.12, Math.abs(maxRaw || 1) * 0.03, 1e-9);
  const min = minRaw - pad;
  const max = maxRaw + pad;
  const left = 54;
  const right = 20;
  const top = 38;
  const bottom = 42;
  const chartW = width - left - right;
  const chartH = height - top - bottom;
  const y = (value) => top + (1 - ((value - min) / (max - min))) * chartH;
  const points = series.map((row, index) => {
    const x = left + (index / (series.length - 1)) * chartW;
    return `${x.toFixed(1)},${y(row.value).toFixed(1)}`;
  }).join(' ');
  const first = series[0];
  const mid = series[Math.floor(series.length / 2)];
  const last = series[series.length - 1];
  const ticks = [maxRaw, (maxRaw + minRaw) / 2, minRaw];

  return `<svg viewBox="0 0 ${width} ${height}" class="chart">
    <text x="18" y="21" class="chart-title">${esc(chart.title)}</text>
    <text x="${width - 18}" y="21" class="chart-latest" text-anchor="end">${esc(formatAxisValue(last.value, chart.unit))}</text>
    ${chart.subtitle ? `<text x="18" y="36" class="chart-subtitle">${esc(chart.subtitle)}</text>` : ''}
    ${ticks.map((tick) => `<line x1="${left}" x2="${width - right}" y1="${y(tick).toFixed(1)}" y2="${y(tick).toFixed(1)}" class="gridline"/><text x="${left - 8}" y="${(y(tick) + 4).toFixed(1)}" text-anchor="end" class="axis-label">${esc(formatAxisValue(tick, chart.unit))}</text>`).join('')}
    <line x1="${left}" x2="${width - right}" y1="${top + chartH}" y2="${top + chartH}" class="axis"/>
    <line x1="${left}" x2="${left}" y1="${top}" y2="${top + chartH}" class="axis"/>
    <polyline points="${points}" stroke="${esc(chart.color)}" class="chart-line"/>
    <circle cx="${left}" cy="${y(first.value).toFixed(1)}" r="3.4" fill="${esc(chart.color)}"/>
    <circle cx="${left + chartW / 2}" cy="${y(mid.value).toFixed(1)}" r="3.4" fill="${esc(chart.color)}"/>
    <circle cx="${left + chartW}" cy="${y(last.value).toFixed(1)}" r="3.4" fill="${esc(chart.color)}"/>
    <text x="${left}" y="${height - 15}" text-anchor="middle" class="axis-label">${esc(first.date?.slice(5) || '')}</text>
    <text x="${left + chartW / 2}" y="${height - 15}" text-anchor="middle" class="axis-label">${esc(mid.date?.slice(5) || '')}</text>
    <text x="${left + chartW}" y="${height - 15}" text-anchor="middle" class="axis-label">${esc(last.date?.slice(5) || '')}</text>
  </svg>`;
}

function pendingLLM(section) {
  if (section?.status === 'ready' && section.text) {
    return `<p class="summary">${esc(section.text)}</p>`;
  }
  return `<span class="pending">PENDING FOR LLM INTEGRATION</span><p class="summary">${esc(section?.placeholder || '')}</p>`;
}

function alertRows(items, numbered = true) {
  return (items || []).map((item, index) => (
    `<div class="alert"><span class="dot">${numbered ? index + 1 : '•'}</span><span>${esc(item.text || item)}</span></div>`
  )).join('');
}

function kpiCards(items) {
  return (items || []).map((item) => (
    `<div class="card kpi"><div class="label">${esc(item.label)}</div><div class="value">${esc(item.value)}</div><div class="delta">${esc(item.delta)}</div></div>`
  )).join('');
}

function reportFooter(pageNumber, text) {
  return `<div class="footer"><span class="report-legal">${esc(text)}</span><span>Page ${pageNumber}</span></div>`;
}

function renderReport(data) {
  const charts = data.charts || [];
  const social = data.social || {};
  const llm = data.llmSections || {};
  const filings = data.secFilings || [];
  const legal = data.legalDisclaimers || {};

  return `
<section class="page cover">
  <div class="brand">CURRENC INTELLIGENCE</div>
  <h1>Daily Close<br/>Post-Market Report</h1>
  <p class="sub">A management-focused daily close report covering price action, borrow conditions, short pressure, social narrative, catalysts, and the next-session watchlist.</p>
  <div class="toc"><div><span>Executive Snapshot</span><span>Page 2</span></div><div><span>Daily Market Battlefield</span><span>Page 3</span></div><div><span>Pressure Detail</span><span>Page 4</span></div><div><span>Narrative, Catalysts & Actions</span><span>Pages 5-6</span></div><div><span>Legal Disclaimer</span><span>Page 7</span></div></div>
  <div class="coverbox"><div><div class="brand">COMPANY</div><h2>${esc(data.company)} (${esc(data.ticker)})</h2></div><div><div class="brand">REPORT DATE</div><h2>${esc(data.reportDate)}</h2><p class="sub" style="font-size:12px">${esc(data.generatedAt)}</p></div></div>
  ${reportFooter(1, legal.footer)}
</section>

<section class="page">
  <div class="top"><div><p class="kicker">Executive Snapshot</p><h2 class="title">Closing Intelligence Dashboard</h2></div><span class="badge">${esc(data.status)}</span></div>
  <div class="grid grid3">${kpiCards(data.kpis)}</div>
  <div class="grid grid2">
    <div class="card"><h3>Top Daily Alerts</h3>${alertRows(data.topDailyAlerts)}</div>
    <div class="card"><h3>Executive Summary</h3>${pendingLLM(llm.executiveSummary)}</div>
  </div>
  <div class="note"><b>Daily report scope:</b> this report is focused on same-day market, borrow, short pressure, social, and catalyst signals that are relevant to the next trading session.</div>
  ${reportFooter(2, legal.footer)}
</section>

<section class="page">
  <div class="top"><div><p class="kicker">Daily Market Battlefield</p><h2 class="title">Price, Borrow Cost, Volume, and Availability</h2></div><span class="badge">Daily Close</span></div>
  <div class="grid grid2"><div class="card chart-card">${chartSvg(charts[0])}</div><div class="card chart-card">${chartSvg(charts[1])}</div></div>
  <div class="grid grid2"><div class="card chart-card">${chartSvg(charts[2])}</div><div class="card chart-card">${chartSvg(charts[3])}</div></div>
  ${reportFooter(3, legal.footer)}
</section>

<section class="page">
  <div class="top"><div><p class="kicker">Pressure Detail</p><h2 class="title">Utilization, Days to Cover, and Short Pressure</h2></div><span class="badge">Daily Close</span></div>
  <div class="grid grid2"><div class="card chart-card">${chartSvg(charts[4])}</div><div class="card chart-card">${chartSvg(charts[5])}</div></div>
  <div class="grid grid2">
    <div class="card"><h3>Borrow / Short Interpretation</h3>${pendingLLM(llm.borrowShortInterpretation)}</div>
    <div class="card"><h3>Management Watch Items</h3>${alertRows(data.managementWatchItems, false)}</div>
  </div>
  ${reportFooter(4, legal.footer)}
</section>

<section class="page">
  <div class="top"><div><p class="kicker">Narrative & Catalysts</p><h2 class="title">Social Feed and Filing Watch</h2></div><span class="badge">After Close</span></div>
  <div class="grid grid3">
    <div class="card kpi"><div class="label">Reddit Records</div><div class="value">${esc(social.redditCountDisplay)}</div><div class="delta">daily feed</div></div>
    <div class="card kpi"><div class="label">X Records</div><div class="value">${esc(social.xCountDisplay)}</div><div class="delta">daily feed</div></div>
    <div class="card kpi"><div class="label">Total Records</div><div class="value">${esc(social.totalDisplay)}</div><div class="delta">Reddit + X combined</div></div>
  </div>
  <div class="grid grid2">
    <div class="card"><h3>Latest SEC Filings</h3><p class="small">Most recent filing records only. Full filing history should remain in the portal.</p><table class="table"><thead><tr><th>Date</th><th>Form</th><th>Title</th></tr></thead><tbody>${filings.map((row) => `<tr><td>${esc(row.date)}</td><td>${esc(row.formType)}</td><td><b>${esc(row.title)}</b></td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h3>Narrative Summary</h3>${pendingLLM(llm.narrativeSummary)}</div>
  </div>
  ${reportFooter(5, legal.footer)}
</section>

<section class="page">
  <div class="top"><div><p class="kicker">Decision Output</p><h2 class="title">Tomorrow Watchlist & Management Actions</h2></div><span class="badge">Next Session</span></div>
  <div class="grid grid2">
    <div class="card"><h3>Tomorrow Watchlist</h3>${alertRows(data.tomorrowWatchlist)}</div>
    <div class="card"><h3>Management Action Queue</h3>${pendingLLM(llm.managementActionQueue)}</div>
  </div>
  <div class="card"><h3>Data Timing Note</h3><p class="small">This daily report uses market, borrow, social, and filing signals that can inform the next-session watchlist. Longer-cycle strategic datasets should be handled in separate periodic reports.</p></div>
  ${reportFooter(6, legal.footer)}
</section>

<section class="page report-disclaimer-page">
  <div class="top"><div><p class="kicker">Legal & Compliance</p><h2 class="title">Important Disclaimer</h2></div><span class="badge">Information Only</span></div>
  <div class="report-disclaimer-copy">
    <h3>Currenc Intelligence Daily Close Report</h3>
    <p>${esc(legal.full)}</p>
  </div>
  <div class="report-disclaimer-note">This disclaimer applies to all data, analytics, scores, alerts, scenarios, summaries, and AI-assisted content presented in this report.</div>
  ${reportFooter(7, legal.footer)}
</section>`;
}
