const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_HTML = path.resolve(__dirname, 'portal-backed-post-market-report.html');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(ROOT, relativePath), 'utf8'));
}

function n(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function fmtNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return 'N/A';
  return Math.round(Number(value)).toLocaleString('en-US');
}

function fmtCompact(value) {
  if (value == null || Number.isNaN(Number(value))) return 'N/A';
  const abs = Math.abs(Number(value));
  if (abs >= 1_000_000) return `${(Number(value) / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(Number(value) / 1_000).toFixed(1)}K`;
  return `${Number(value).toFixed(0)}`;
}

function fmtPct(value, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return 'N/A';
  return `${Number(value).toFixed(digits)}%`;
}

function fmtDate(value) {
  if (!value) return 'N/A';
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function fmtShortDate(value) {
  if (!value) return 'N/A';
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function userFacingText(value) {
  return String(value ?? '')
    .replace(/\bORTEX\s+daily\s+records\b/gi, 'daily short-interest records')
    .replace(/\bORTEX\b/gi, 'daily data')
    .replace(/\bFintel\b/gi, 'filing data')
    .replace(/\bWhaleWisdom\b/gi, 'ownership data')
    .replace(/\s+/g, ' ')
    .trim();
}

function seriesValue(row, keys) {
  for (const key of keys) {
    if (row?.[key] != null && Number.isFinite(Number(row[key]))) return Number(row[key]);
  }
  return null;
}

function normalizeFiling(row) {
  return {
    date: fmtShortDate(row.publishDate || row.filingDate || row.date || row.publishAt),
    formType: row.formType || row.form || row.type || 'N/A',
    title: row.title || row.description || row.summary || row.excerpt || 'Untitled filing',
    excerpt: row.excerpt || '',
  };
}

function buildData() {
  const dashboard = readJson('import_data/dashboard_v2_CURR_consolidated_4_web.json');
  const short = readJson('import_data/ortex_CURR_consolidated_4_web.json');
  const lending = readJson('import_data/lending_pressure_CURR_consolidated_4_web.json');
  const reddit = readJson('import_data/adanos-reddit_CURR_consolidated_4_web.json');
  const x = readJson('import_data/adanos-x_CURR_consolidated_4_web.json');
  const filings = readJson('import_data/news_filings/sec_filings.json');

  const current = dashboard.data.current || {};
  const trends = Array.isArray(dashboard.data.trends) ? dashboard.data.trends : [];
  const cardSet = dashboard.data.derived?.dashboardV2?.cards?.['1D']?.cards || {};
  const shortCards = short.data.derived?.shortInterestPage?.cards || {};
  const lendingSummary = lending.data.derived?.lendingPressurePage?.summary || {};
  const secRows = Array.isArray(filings.data) ? filings.data : Object.values(filings.data || {});

  const marketPressure = Math.round(
    n(current.borrowFee) * 0.25 +
    n(current.utilization) * 0.25 +
    n(current.daysToCover) * 5 +
    n(current.sourceRecords?.shortScore?.score) * 0.25
  );

  return {
    company: 'Currenc Group Inc.',
    ticker: 'CURR',
    reportDate: fmtDate(current.date || dashboard.asOfDate),
    generatedAt: new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }),
    status: marketPressure >= 70 ? 'Elevated Closing Risk' : marketPressure >= 45 ? 'Moderate Closing Risk' : 'Low Closing Risk',
    marketPressure,
    current,
    cardSet,
    shortCards,
    lendingSummary,
    managementWatchItems: (short.data.managementWatchItems || []).map(userFacingText),
    social: {
      redditCount: Array.isArray(reddit) ? reddit.length : 0,
      xCount: Array.isArray(x) ? x.length : 0,
      total: (Array.isArray(reddit) ? reddit.length : 0) + (Array.isArray(x) ? x.length : 0),
    },
    filings: secRows.slice(0, 3).map(normalizeFiling),
    trends: {
      dates: trends.map((row) => row.date).filter(Boolean),
      price: trends.map((row) => seriesValue(row, ['price', 'close'])),
      borrowFee: trends.map((row) => seriesValue(row, ['borrowFee', 'feeRate', 'costToBorrowAll'])),
      shortableShares: trends.map((row) => seriesValue(row, ['availableShares', 'shortableShares', 'shortAvailabilityShares'])),
      volume: trends.map((row) => seriesValue(row, ['tradeVolume', 'volume'])),
      utilization: trends.map((row) => seriesValue(row, ['utilization', 'shortAvailabilityPct'])),
      daysToCover: trends.map((row) => seriesValue(row, ['daysToCover', 'daysToCoverQuantity'])),
    },
  };
}

function formatAxisValue(value, unit) {
  if (value == null || Number.isNaN(Number(value))) return 'N/A';
  if (unit === 'percent') return fmtPct(value, Number(value) >= 10 ? 1 : 2);
  if (unit === 'shares' || unit === 'volume') return fmtCompact(value);
  if (unit === 'money') return `$${Number(value).toFixed(2)}`;
  if (unit === 'days') return `${Number(value).toFixed(2)}d`;
  return Number(value).toFixed(2);
}

function chartSvg({ title, values, dates, color, unit, subtitle }) {
  const mapped = values
    .map((value, index) => ({ value, date: dates[index] }))
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
    <text x="18" y="21" class="chart-title">${esc(title)}</text>
    <text x="${width - 18}" y="21" class="chart-latest" text-anchor="end">${esc(formatAxisValue(last.value, unit))}</text>
    ${subtitle ? `<text x="18" y="36" class="chart-subtitle">${esc(subtitle)}</text>` : ''}
    ${ticks.map((tick) => `<line x1="${left}" x2="${width - right}" y1="${y(tick).toFixed(1)}" y2="${y(tick).toFixed(1)}" class="gridline"/><text x="${left - 8}" y="${(y(tick) + 4).toFixed(1)}" text-anchor="end" class="axis-label">${esc(formatAxisValue(tick, unit))}</text>`).join('')}
    <line x1="${left}" x2="${width - right}" y1="${top + chartH}" y2="${top + chartH}" class="axis"/>
    <line x1="${left}" x2="${left}" y1="${top}" y2="${top + chartH}" class="axis"/>
    <polyline points="${points}" stroke="${color}" class="chart-line"/>
    <circle cx="${left}" cy="${y(first.value).toFixed(1)}" r="3.4" fill="${color}"/>
    <circle cx="${left + chartW / 2}" cy="${y(mid.value).toFixed(1)}" r="3.4" fill="${color}"/>
    <circle cx="${left + chartW}" cy="${y(last.value).toFixed(1)}" r="3.4" fill="${color}"/>
    <text x="${left}" y="${height - 15}" text-anchor="middle" class="axis-label">${esc(first.date?.slice(5) || '')}</text>
    <text x="${left + chartW / 2}" y="${height - 15}" text-anchor="middle" class="axis-label">${esc(mid.date?.slice(5) || '')}</text>
    <text x="${left + chartW}" y="${height - 15}" text-anchor="middle" class="axis-label">${esc(last.date?.slice(5) || '')}</text>
  </svg>`;
}

function pendingLLM(text) {
  return `<span class="pending">PENDING FOR LLM INTEGRATION</span><p class="summary">${esc(text)}</p>`;
}

function htmlReport(data) {
  const kpis = [
    ['Market Pressure', `${data.marketPressure} / 100`, data.status],
    ['Borrow Fee', fmtPct(data.current.borrowFee), data.cardSet.borrowFee?.deltaDisplay || 'vs prior close'],
    ['Shortable Shares', fmtCompact(data.current.availableShares), data.cardSet.availableShares?.deltaDisplay || 'vs prior close'],
    ['Utilization', fmtPct(data.current.utilization), data.cardSet.utilization?.deltaDisplay || 'vs prior close'],
    ['Days to Cover', n(data.current.daysToCover).toFixed(2), data.cardSet.daysToCover?.deltaDisplay || 'vs prior close'],
    ['SI / Float', fmtPct(data.current.sourceRecords?.shortInterest?.shortInterestPcFreeFloat), 'reported short interest'],
  ];

  const charts = [
    { title: 'Price Trend', values: data.trends.price, color: '#2b7fc3', unit: 'money', subtitle: 'Daily close price' },
    { title: 'Borrow Fee Trend', values: data.trends.borrowFee, color: '#d84b42', unit: 'percent', subtitle: 'Daily borrow cost' },
    { title: 'Shortable Shares Trend', values: data.trends.shortableShares, color: '#e19713', unit: 'shares', subtitle: 'Available shares' },
    { title: 'Trade Volume Trend', values: data.trends.volume, color: '#8f98a6', unit: 'volume', subtitle: 'Daily share volume' },
    { title: 'Utilization Trend', values: data.trends.utilization, color: '#15936f', unit: 'percent', subtitle: 'Lending pool utilization' },
    { title: 'Days to Cover Trend', values: data.trends.daysToCover, color: '#6757d8', unit: 'days', subtitle: 'Short interest relative to volume' },
  ];

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>CURR Post-Market Daily Close Report</title>
<style>
@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#eaf0f8;color:#081d35;font-family:Inter,Arial,sans-serif}.page{width:210mm;height:297mm;margin:0 auto;background:white;page-break-after:always;padding:17mm 16mm;position:relative;overflow:hidden}.cover{background:linear-gradient(135deg,#071426,#12355f);color:white}.brand{color:#d7b54a;letter-spacing:6px;font-size:12px;font-weight:800}.cover h1{font-size:39px;line-height:1.05;margin:58px 0 16px}.sub{font-size:16px;line-height:1.5;color:#d7e2f1;max-width:650px}.coverbox{position:absolute;left:16mm;right:16mm;bottom:28mm;border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:22px;background:rgba(255,255,255,.07);display:grid;grid-template-columns:1.4fr 1fr;gap:16px}.footer{position:absolute;left:16mm;right:16mm;bottom:8mm;display:flex;justify-content:space-between;color:#7d8aa0;font-size:10px}.cover .footer{color:#b9c9df}.kicker{color:#2457b8;letter-spacing:3px;font-size:11px;font-weight:900;text-transform:uppercase;margin:0 0 7px}.title{font-size:25px;margin:0;color:#081d35}.top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:15px}.badge{background:#fff2cb;color:#7a5200;border:1px solid #e5c55f;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:900}.grid{display:grid;gap:11px}.grid2{grid-template-columns:1fr 1fr}.grid3{grid-template-columns:repeat(3,1fr)}.card{border:1px solid #d9e4f2;border-radius:14px;background:#fff;padding:14px;margin-bottom:12px}.kpi .label{font-size:10px;text-transform:uppercase;letter-spacing:1.8px;color:#63728a;font-weight:900}.kpi .value{font-size:23px;font-weight:900;margin:8px 0 3px}.kpi .delta{font-size:11px;color:#49617f;font-weight:700}.alert{display:flex;gap:9px;border-bottom:1px solid #eef3f9;padding:8px 0;font-size:13px;line-height:1.35}.alert:last-child{border:0}.dot{width:21px;height:21px;border-radius:50%;background:#2457b8;color:white;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;flex:0 0 auto}.summary{font-size:13px;line-height:1.55;color:#233b5c}.pending{display:inline-block;margin-bottom:9px;border-radius:999px;background:#fff2cb;border:1px solid #e5c55f;color:#7a5200;font-size:10px;font-weight:900;letter-spacing:1px;padding:5px 9px}.chart-card{padding:10px}.chart{width:100%;height:220px;display:block}.chart-title{font-size:13px;font-weight:800;fill:#081d35}.chart-subtitle,.axis-label{font-size:10px;fill:#6a778b;font-weight:700}.chart-latest{font-size:12px;fill:#2457b8;font-weight:900}.gridline{stroke:#e7edf5;stroke-width:1}.axis{stroke:#c8d4e4;stroke-width:1.2}.chart-line{fill:none;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}.empty-chart{height:220px;display:flex;align-items:center;justify-content:center;color:#7d8aa0;background:#f7f9fc;border-radius:10px}.table{width:100%;border-collapse:collapse;font-size:12px}.table th{text-align:left;font-size:10px;color:#61728b;background:#f4f7fb;padding:8px;text-transform:uppercase;letter-spacing:1px}.table td{padding:9px 8px;border-bottom:1px solid #edf2f8}.small{font-size:12px;color:#536780;line-height:1.45}.note{background:#f8f2dc;border-left:4px solid #d7b54a;border-radius:10px;padding:11px 12px;font-size:12px;line-height:1.45;color:#403507}.toc{margin-top:38px}.toc div{display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.18);padding:12px 0;color:#d7e2f1}.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.action{background:#f7f9fc;border:1px solid #dce5f1;border-radius:12px;padding:11px;min-height:72px}.action b{display:block;margin-bottom:5px}
</style>
</head>
<body>
<section class="page cover">
  <div class="brand">CURRENC INTELLIGENCE</div>
  <h1>Daily Close<br/>Post-Market Report</h1>
  <p class="sub">A management-focused daily close report covering price action, borrow conditions, short pressure, social narrative, catalysts, and the next-session watchlist.</p>
  <div class="toc"><div><span>Executive Snapshot</span><span>Page 2</span></div><div><span>Daily Market Battlefield</span><span>Page 3</span></div><div><span>Pressure Detail</span><span>Page 4</span></div><div><span>Narrative, Catalysts & Actions</span><span>Pages 5-6</span></div></div>
  <div class="coverbox"><div><div class="brand">COMPANY</div><h2>${esc(data.company)} (${esc(data.ticker)})</h2></div><div><div class="brand">REPORT DATE</div><h2>${esc(data.reportDate)}</h2><p class="sub" style="font-size:12px">${esc(data.generatedAt)}</p></div></div>
  <div class="footer"><span>Daily close prototype</span><span>Page 1</span></div>
</section>

<section class="page">
  <div class="top"><div><p class="kicker">Executive Snapshot</p><h2 class="title">Closing Intelligence Dashboard</h2></div><span class="badge">${esc(data.status)}</span></div>
  <div class="grid grid3">${kpis.map(([label, value, delta]) => `<div class="card kpi"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="delta">${esc(delta)}</div></div>`).join('')}</div>
  <div class="grid grid2">
    <div class="card"><h3>Top Daily Alerts</h3>
      <div class="alert"><span class="dot">1</span><span>Borrow fee closed at ${fmtPct(data.current.borrowFee)} while utilization was ${fmtPct(data.current.utilization)}.</span></div>
      <div class="alert"><span class="dot">2</span><span>Shortable shares ended at ${fmtNumber(data.current.availableShares)}, with days to cover at ${n(data.current.daysToCover).toFixed(2)}.</span></div>
      <div class="alert"><span class="dot">3</span><span>Reddit and X feeds contain ${fmtNumber(data.social.total)} monitored records for narrative review.</span></div>
    </div>
    <div class="card"><h3>Executive Summary</h3>${pendingLLM('Daily close summary placeholder. The final version should explain what changed today, whether pressure increased or eased, and what management should watch before the next open.')}</div>
  </div>
  <div class="note"><b>Daily report scope:</b> this report is focused on same-day market, borrow, short pressure, social, and catalyst signals that are relevant to the next trading session.</div>
  <div class="footer"><span>CURRENC Intelligence - Daily Close Report</span><span>Page 2</span></div>
</section>

<section class="page">
  <div class="top"><div><p class="kicker">Daily Market Battlefield</p><h2 class="title">Price, Borrow Cost, Volume, and Availability</h2></div><span class="badge">Daily Close</span></div>
  <div class="grid grid2">
    <div class="card chart-card">${chartSvg({ ...charts[0], dates: data.trends.dates })}</div>
    <div class="card chart-card">${chartSvg({ ...charts[1], dates: data.trends.dates })}</div>
  </div>
  <div class="grid grid2">
    <div class="card chart-card">${chartSvg({ ...charts[2], dates: data.trends.dates })}</div>
    <div class="card chart-card">${chartSvg({ ...charts[3], dates: data.trends.dates })}</div>
  </div>
  <div class="footer"><span>CURRENC Intelligence - Daily Close Report</span><span>Page 3</span></div>
</section>

<section class="page">
  <div class="top"><div><p class="kicker">Pressure Detail</p><h2 class="title">Utilization, Days to Cover, and Short Pressure</h2></div><span class="badge">Daily Close</span></div>
  <div class="grid grid2">
    <div class="card chart-card">${chartSvg({ ...charts[4], dates: data.trends.dates })}</div>
    <div class="card chart-card">${chartSvg({ ...charts[5], dates: data.trends.dates })}</div>
  </div>
  <div class="grid grid2">
    <div class="card"><h3>Borrow / Short Interpretation</h3>${pendingLLM('Placeholder interpretation. The LLM should explain whether borrow cost, availability, utilization, and days to cover point to rising, stable, or easing pressure.')}</div>
    <div class="card"><h3>Management Watch Items</h3>${data.managementWatchItems.slice(0, 4).map((item) => `<div class="alert"><span class="dot">•</span><span>${esc(item)}</span></div>`).join('')}</div>
  </div>
  <div class="footer"><span>CURRENC Intelligence - Daily Close Report</span><span>Page 4</span></div>
</section>

<section class="page">
  <div class="top"><div><p class="kicker">Narrative & Catalysts</p><h2 class="title">Social Feed and Filing Watch</h2></div><span class="badge">After Close</span></div>
  <div class="grid grid3">
    <div class="card kpi"><div class="label">Reddit Records</div><div class="value">${fmtNumber(data.social.redditCount)}</div><div class="delta">daily feed</div></div>
    <div class="card kpi"><div class="label">X Records</div><div class="value">${fmtNumber(data.social.xCount)}</div><div class="delta">daily feed</div></div>
    <div class="card kpi"><div class="label">Total Records</div><div class="value">${fmtNumber(data.social.total)}</div><div class="delta">Reddit + X combined</div></div>
  </div>
  <div class="grid grid2">
    <div class="card"><h3>Latest SEC Filings</h3><p class="small">Most recent filing records only. Full filing history should remain in the portal.</p><table class="table compact-table"><thead><tr><th>Date</th><th>Form</th><th>Title</th></tr></thead><tbody>${data.filings.map((row) => `<tr><td>${esc(row.date)}</td><td>${esc(row.formType)}</td><td><b>${esc(row.title.length > 96 ? `${row.title.slice(0, 96)}...` : row.title)}</b></td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h3>Narrative Summary</h3>${pendingLLM('Placeholder narrative summary. The LLM should summarize top Reddit/X themes, sentiment direction, unusual narrative shifts, and management-facing risk.')}</div>
  </div>
  <div class="footer"><span>CURRENC Intelligence - Daily Close Report</span><span>Page 5</span></div>
</section>

<section class="page">
  <div class="top"><div><p class="kicker">Decision Output</p><h2 class="title">Tomorrow Watchlist & Management Actions</h2></div><span class="badge">Next Session</span></div>
  <div class="grid grid2">
    <div class="card"><h3>Tomorrow Watchlist</h3>
      <div class="alert"><span class="dot">1</span><span>Watch borrow fee moving above ${fmtPct(n(data.current.borrowFee) + 5)}.</span></div>
      <div class="alert"><span class="dot">2</span><span>Watch shortable shares falling below ${fmtCompact(n(data.current.availableShares) * 0.85)}.</span></div>
      <div class="alert"><span class="dot">3</span><span>Watch utilization moving above ${fmtPct(Math.min(100, n(data.current.utilization) + 5))}.</span></div>
      <div class="alert"><span class="dot">4</span><span>Watch filings, PR timing, and social narrative acceleration before the open.</span></div>
    </div>
    <div class="card"><h3>Management Action Queue</h3>${pendingLLM('Placeholder action queue. The LLM should translate the daily data into CEO/CFO, IR, legal, and capital-markets action items.')}</div>
  </div>
  <div class="card"><h3>Data Timing Note</h3><p class="small">This daily report uses market, borrow, social, and filing signals that can inform the next-session watchlist. Longer-cycle strategic datasets should be handled in separate periodic reports.</p></div>
  <div class="footer"><span>CURRENC Intelligence - Daily Close Report</span><span>Page 6</span></div>
</section>
</body></html>`;
}

const data = buildData();
fs.writeFileSync(OUT_HTML, userFacingText(htmlReport(data)));
console.log(`Wrote ${OUT_HTML}`);
