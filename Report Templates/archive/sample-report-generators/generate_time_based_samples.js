const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const OUT_DIR = path.join(__dirname, '..', 'sample-reports');
const REPORT_DATE = new Date().toISOString().slice(0, 10);
const COMPANY = 'CURRENC Group Inc.';
const TICKER = 'CURR';

const COMMON = {
  marketSnapshot: [
    ['Last Close', '$1.70'],
    ['Market Cap', '$63.4M'],
    ['Float', '34.4M'],
    ['Average Volume', '4.1M'],
    ['Relative Volume', '3.8x'],
    ['52W High / Low', '$3.12 / $0.92'],
    ['Beta', 'Pending API'],
  ],
  shortFree: [
    ['Official short interest', '18.2% of float'],
    ['Days to cover', '4.7'],
    ['Short % float', '18.2%'],
    ['FINRA short volume', '3.8M'],
    ['SEC FTD data', '92,400'],
  ],
  shortPending: [
    ['ORTEX estimated SI', 'Pending API'],
    ['ORTEX CTB', 'Pending API'],
    ['ORTEX utilization', 'Pending API'],
    ['ORTEX shares on loan', 'Pending API'],
    ['ORTEX live SI trend', 'Pending API'],
    ['ORTEX borrow availability', 'Pending API'],
  ],
  ownershipFree: [
    ['SEC 13F filings', 'Latest filings reviewed'],
    ['Latest institutional holders', 'BlackRock / Vanguard / State Street'],
    ['New positions', 'Digital Asset Fund'],
    ['Increased positions', 'BlackRock'],
    ['Reduced positions', 'State Street'],
    ['Exited positions', 'None this period'],
  ],
  ownershipPending: [
    ['WhaleWisdom smart money flow', 'Pending API'],
    ['WhaleWisdom fund ranking', 'Pending API'],
    ['Fintel ownership score', 'Pending API'],
    ['Fintel accumulation score', 'Pending API'],
  ],
  optionsFree: [
    ['Put/call ratio', '1.18'],
    ['Open interest', '162K'],
    ['Option volume', '41K'],
    ['Major expirations', 'This week / monthly'],
  ],
  optionsPending: [
    ['Fintel gamma exposure', 'Pending API'],
    ['Fintel options flow', 'Pending API'],
    ['Fintel dealer gamma flip', 'Pending API'],
    ['Fintel max pain', 'Pending API'],
    ['Fintel unusual options activity', 'Pending API'],
  ],
  newsItems: [
    'Latest company PR: continued focus on digital asset infrastructure and fintech strategy.',
    'SEC filings: recent 8-K / 13D / 4 items on the radar.',
    'Analyst / media actions: monitor for coverage changes and new price targets.',
    'Sector events: crypto / fintech / web3 headlines can influence the tape.',
  ],
  riskRows: [
    { label: 'Short Attack Risk', score: 68, level: 'warn', explanation: 'Elevated short pressure may require monitoring.' },
    { label: 'Liquidity Risk', score: 61, level: 'warn', explanation: 'Lower float can amplify moves.' },
    { label: 'Volatility Risk', score: 74, level: 'warn', explanation: 'Intraday swings may remain above normal.' },
    { label: 'Dilution Sensitivity', score: 58, level: 'warn', explanation: 'Capital structure sensitivity should be tracked.' },
    { label: 'Institutional Confidence', score: 63, level: 'good', explanation: '13F activity suggests selective accumulation.' },
    { label: 'Retail Momentum', score: 71, level: 'warn', explanation: 'Retail narrative remains active.' },
    { label: 'Catalyst Risk', score: 69, level: 'warn', explanation: 'Filing / PR events may move price sharply.' },
  ],
};

const REPORTS = {
  '8AM': {
    slug: 'pre-market',
    title: '8:00 AM NYT Pre-Market Risk Brief',
    subtitle: '5-minute CEO / CFO view · Overnight tape, catalyst risk, and opening liquidity',
    accent: 'F97316',
    deep: '08111F',
    reportType: '8AM',
    tag: 'PRE-MARKET',
    summary: [
      'Overnight tone is constructive, with CURR holding the AI fintech / tokenization narrative.',
      'Pre-market price action implies continuing speculative demand ahead of the open.',
      'Short pressure remains visible, but no conclusive evidence of a coordinated event.',
      'Recent filings and PR items may keep volatility elevated into the session.',
      'Management should monitor opening liquidity and retail narrative acceleration.',
      'Potential catalyst sensitivity remains high given the low-float profile.',
    ],
    chartTitle: 'Overnight Move vs Last Close',
    chartLabels: ['Last Close', '10 PM', '2 AM', '5 AM', '7 AM', 'Pre-Market'],
    chartSeries: [
      { label: 'Price', color: 'F97316', points: [1.7, 1.74, 1.78, 1.84, 1.89, 1.93] },
      { label: 'Reference', color: '94A3B8', points: [1.7, 1.7, 1.71, 1.72, 1.74, 1.75] },
    ],
    metrics: [
      { label: 'Pre-Market Price', value: '$1.93', note: '+13.5% gap' },
      { label: 'Pre-Market Vol', value: '2.86M', note: 'early liquidity' },
      { label: 'VWAP', value: '$1.79', note: 'reference price' },
      { label: 'Day Range', value: '$1.61 - $1.96', note: 'expected range' },
    ],
    details: {
      aiInterpretation: ['CURR may see continued opening volatility because the float is limited and speculative narrative interest remains active.'],
      actions: ['Prepare investor FAQ', 'Monitor opening tape', 'Avoid reactive financing during weak liquidity'],
      signal: 'Open-sensitive risk remains elevated; the best use is pre-bell decision support for the first 15 minutes of trading.',
      sections: [
        { title: 'Short Interest Intelligence', left: COMMON.shortFree, right: COMMON.shortPending },
        { title: 'Institutional Ownership Intelligence', left: COMMON.ownershipFree, right: COMMON.ownershipPending },
        { title: 'Options / Gamma Overview', left: COMMON.optionsFree, right: COMMON.optionsPending },
      ],
    },
    themeBullets: [
      'Overnight gap is the key signal.',
      'Assess whether the open can hold VWAP.',
      'Watch for news / filing catalysts before the bell.',
    ],
  },
  '1150AM': {
    slug: 'mid-market',
    title: '11:50 AM NYT Midday Flow Report',
    subtitle: 'Intraday anomaly detection · Short pressure, options flow, and sentiment shifts',
    accent: '0EA5E9',
    deep: '071A2E',
    reportType: '1150AM',
    tag: 'MID-MARKET',
    summary: [
      'Intraday flow shows above-average participation versus recent norms.',
      'Price action is trading above VWAP, suggesting constructive momentum.',
      'Volume concentration points to an active retail / momentum bid.',
      'Short pressure may be contributing to the move, pending confirmation from ORTEX.',
    ],
    chartTitle: 'Intraday Price vs VWAP',
    chartLabels: ['Open', '9:45', '10:30', '11:00', '11:30', '11:50'],
    chartSeries: [
      { label: 'Price', color: '0EA5E9', points: [1.74, 1.81, 1.86, 1.88, 1.9, 1.93] },
      { label: 'VWAP', color: '22C55E', points: [1.74, 1.76, 1.78, 1.79, 1.79, 1.8] },
    ],
    metrics: [
      { label: 'Current Price', value: '$1.93', note: 'above VWAP' },
      { label: '% Change', value: '+13.5%', note: 'vs prior close' },
      { label: 'Volume', value: '9.1M', note: 'active session' },
      { label: 'Relative Vol', value: '3.8x', note: 'vs average' },
    ],
    details: {
      aiInterpretation: ['The midday tape suggests a possible mix of short covering, retail momentum, and narrative-driven buying.'],
      actions: ['Alert IR team', 'Track volume into the close', 'Prepare talking points for after-market questions'],
      signal: 'Today’s move looks partly momentum-driven, but the quality of the move still depends on whether volume continues to expand.',
      sections: [
        { title: 'Intraday Short Pressure', left: [
          ['FINRA short volume', '3.8M'],
          ['Short volume ratio', '24.9%'],
          ['Off-exchange volume', '58%'],
        ], right: [
          ['ORTEX live borrow changes', 'Pending API'],
          ['ORTEX intraday SI change', 'Pending API'],
          ['ORTEX CTB spike', 'Pending API'],
          ['ORTEX borrow availability', 'Pending API'],
        ] },
        { title: 'Options Flow', left: [
          ['Option volume', '41K'],
          ['Put/call activity', '1.18'],
          ['Open interest change', 'Moderate'],
        ], right: [
          ['Fintel unusual options flow', 'Pending API'],
          ['Fintel gamma exposure', 'Pending API'],
          ['Fintel max pain', 'Pending API'],
          ['Fintel dealer positioning', 'Pending API'],
        ] },
        { title: 'News / Social / Sentiment', left: [
          ['Retail sentiment', 'Positive'],
          ['Institutional sentiment', 'Neutral'],
          ['Media sentiment', 'Watch'],
          ['Viral narrative', 'AI fintech / tokenization'],
        ], right: [
          ['X / Twitter', 'Active'],
          ['Reddit', 'Active'],
          ['Stocktwits', 'Active'],
          ['Company news', 'Monitored'],
        ] },
      ],
    },
    themeBullets: [
      'Key question: is the move still accumulating?',
      'Watch the tape into the close for continuation or fade.',
      'Avoid reactive PR unless misinformation appears.',
    ],
  },
  '7PM': {
    slug: 'post-market',
    title: '7:00 PM NYT Post-Market Strategic Analysis',
    subtitle: 'End-of-day explanation · Price action attribution, narrative, and tomorrow watchlist',
    accent: '7C3AED',
    deep: '12091F',
    reportType: '7PM',
    tag: 'POST-MARKET',
    summary: [
      'CURR closed with a wider-than-average range and meaningful participation.',
      'The session appears to reflect a blend of narrative demand and short-pressure sensitivity.',
      'Institutional ownership signals remain supportive but incomplete without paid data.',
      'The market narrative is still centered on AI fintech, web3, and tokenization themes.',
      'Volatility risk remains elevated enough to justify continued management monitoring.',
    ],
    chartTitle: 'Full-Day Price Action vs VWAP',
    chartLabels: ['Open', '10 AM', '11:30', '1 PM', '3 PM', 'Close', 'AH'],
    chartSeries: [
      { label: 'Price', color: '7C3AED', points: [1.76, 1.82, 1.88, 1.91, 1.86, 1.84, 1.88] },
      { label: 'VWAP', color: '0EA5E9', points: [1.76, 1.78, 1.79, 1.79, 1.8, 1.79, 1.8] },
    ],
    metrics: [
      { label: 'Close', value: '$1.84', note: '+8.2% on the day' },
      { label: 'After Hours', value: '$1.88', note: 'steady tone' },
      { label: 'Volume', value: '15.2M', note: 'full-session' },
      { label: 'Range', value: '$1.61 - $1.96', note: 'wide dispersion' },
    ],
    details: {
      aiInterpretation: ['The day likely reflected a combination of short pressure, retail participation, and tokenization / fintech narrative reinforcement.'],
      actions: ['Publish clarification PR if needed', 'Prepare shareholder letter', 'Plan next-day IR outreach', 'Escalate legal/compliance review if manipulation indicators emerge'],
      signal: 'This is the strongest strategic version: use it for end-of-day management framing and tomorrow’s action plan.',
      sections: [
        { title: 'Daily Market Recap', left: [
          ['Close price', '$1.84'],
          ['Daily change', '+8.2%'],
          ['Intraday high / low', '$1.96 / $1.61'],
          ['Relative volume', '3.8x'],
        ], right: [
          ['After-hours price', '$1.88'],
          ['Market cap change', '+$5.2M'],
          ['Sector comparison', 'Outperformed fintech peers'],
          ['Index comparison', 'Outpaced small-cap benchmark'],
        ] },
        { title: 'Attribution / Review', left: [
          ['Price action attribution', 'Short covering + retail momentum'],
          ['Narrative analysis', 'AI fintech / tokenization'],
          ['Institutional ownership', 'Mixed but supportive'],
        ], right: [
          ['Short interest update', '18.2% float'],
          ['FINRA short volume', '3.8M'],
          ['SEC FTD update', '92,400'],
          ['ORTEX / Fintel / WhaleWisdom', 'Pending API'],
        ] },
      ],
    },
    themeBullets: [
      'Use this as the strategic day-close version.',
      'It should feel like the old executive report, but sharper and more actionable.',
      'Keep tomorrow’s watchlist visible to management.',
    ],
  },
};

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function drawCard(doc, x, y, w, h, fill = 'FFFFFF', stroke = 'CBD5E1', radius = 10) {
  doc.roundedRect(x, y, w, h, radius).fillAndStroke(fill, stroke);
}

function drawSectionBar(doc, x, y, w, accent, title, subtitle) {
  drawCard(doc, x, y, w, 28, 'F8FAFC', 'E2E8F0', 8);
  doc.rect(x, y, w, 5).fill(`#${accent}`);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text(title, x + 12, y + 10, { width: w - 24 });
  if (subtitle) doc.fillColor('#64748B').font('Helvetica').fontSize(8.5).text(subtitle, x + 12, y + 12, { width: w - 24, align: 'right' });
}

function drawHeader(doc, cfg) {
  doc.rect(0, 0, 612, 142).fill(`#${cfg.deep}`);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(21).text(cfg.title, 40, 22, { width: 495, lineGap: 1 });
  doc.fillColor('#CBD5E1').font('Helvetica').fontSize(10.5).text(cfg.subtitle, 40, 62, { width: 470, lineGap: 2 });
  doc.roundedRect(456, 22, 116, 30, 14).fillAndStroke('#FFFFFF', '#FFFFFF');
  doc.fillColor(`#${cfg.accent}`).font('Helvetica-Bold').fontSize(10).text(cfg.tag, 458, 31, { width: 112, align: 'center' });
  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8.5).text(`${COMPANY} (${TICKER}) · ${REPORT_DATE}`, 40, 96, { width: 340 });
}

function drawMetricGrid(doc, x, y, w, h, metrics, accent) {
  const gap = 12;
  const cardW = (w - gap * (metrics.length - 1)) / metrics.length;
  metrics.forEach((m, idx) => {
    const cx = x + idx * (cardW + gap);
    drawCard(doc, cx, y, cardW, h, 'F8FAFC', 'CBD5E1', 10);
    doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(8).text(m.label.toUpperCase(), cx + 12, y + 10, { width: cardW - 24 });
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(18).text(m.value, cx + 12, y + 26, { width: cardW - 24 });
    doc.fillColor(`#${accent}`).font('Helvetica').fontSize(8).text(m.note, cx + 12, y + h - 16, { width: cardW - 24 });
  });
}

function drawBullets(doc, x, y, w, bullets, options = {}) {
  const fontSize = options.fontSize ?? 10;
  const color = options.color ?? '#0F172A';
  const gap = options.gap ?? 4;
  let cursor = y;
  bullets.forEach(bullet => {
    const text = `• ${bullet}`;
    doc.fillColor(color).font('Helvetica').fontSize(fontSize).text(text, x, cursor, { width: w, lineGap: 2 });
    cursor += doc.heightOfString(text, { width: w, fontSize }) + gap;
  });
  return cursor;
}

function drawKeyValueRows(doc, x, y, w, rows, options = {}) {
  const labelW = options.labelW ?? 0.62;
  const rowGap = options.rowGap ?? 0;
  const rowH = options.rowH ?? 22;
  const lineColor = options.lineColor ?? 'E2E8F0';
  const labelColor = options.labelColor ?? '#475569';
  const valueColor = options.valueColor ?? '#0F172A';
  const labelSize = options.labelSize ?? 8.9;
  const valueSize = options.valueSize ?? 9.3;
  let cursor = y;
  rows.forEach(([label, value]) => {
    doc.fillColor(labelColor).font('Helvetica-Bold').fontSize(labelSize).text(label, x, cursor, {
      width: Math.max(40, w * labelW - 6),
      ellipsis: true,
      lineBreak: false,
    });
    doc.fillColor(valueColor).font('Helvetica').fontSize(valueSize).text(value, x + w * labelW, cursor, {
      width: Math.max(44, w * (1 - labelW)),
      align: 'right',
      ellipsis: true,
      lineBreak: false,
    });
    doc.moveTo(x, cursor + rowH - 8).lineTo(x + w, cursor + rowH - 8).strokeColor(`#${lineColor}`).lineWidth(0.8).stroke();
    cursor += rowH + rowGap;
  });
  return cursor;
}

function drawTrafficLightList(doc, x, y, w, rows) {
  const rowH = 54;
  const colGap = 12;
  const colW = (w - colGap) / 2;
  rows.forEach((risk, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const cx = x + col * (colW + colGap);
    const cy = y + row * (rowH + 8);
    drawCard(doc, cx, cy, colW, rowH, 'FFFFFF', 'E2E8F0', 8);
    const pillFill = risk.level === 'good' ? 'DCFCE7' : risk.level === 'warn' ? 'FEF3C7' : 'FEE2E2';
    const pillText = risk.level === 'good' ? '166534' : risk.level === 'warn' ? '92400E' : '991B1B';
    doc.roundedRect(cx + 10, cy + 10, 58, 16, 8).fillAndStroke(`#${pillFill}`, `#${pillFill}`);
    doc.fillColor(`#${pillText}`).font('Helvetica-Bold').fontSize(8).text(`${risk.score}/100`, cx + 10, cy + 14, { width: 58, align: 'center' });
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9).text(risk.label, cx + 76, cy + 10, { width: colW - 86 });
    doc.fillColor('#475569').font('Helvetica').fontSize(8.1).text(risk.explanation, cx + 76, cy + 26, { width: colW - 86, lineGap: 2 });
  });
}

function drawLineChart(doc, x, y, w, h, labels, series, accent) {
  drawCard(doc, x, y, w, h, 'F8FAFC', 'CBD5E1', 10);
  const padL = 44;
  const padR = 18;
  const padT = 18;
  const padB = 28;
  const plotX = x + padL;
  const plotY = y + padT;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const allValues = series.flatMap(s => s.points);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = Math.max(0.01, max - min);
  const scaleY = v => plotY + plotH - ((v - min) / range) * plotH;
  const scaleX = idx => plotX + (idx * plotW) / (labels.length - 1 || 1);

  for (let i = 0; i <= 4; i++) {
    const gy = plotY + (plotH * i) / 4;
    doc.moveTo(plotX, gy).lineTo(plotX + plotW, gy).strokeColor('E2E8F0').lineWidth(0.8).stroke();
  }
  series.forEach((s, idx) => {
    const yLabel = y + 8 + idx * 12;
    doc.fillColor(`#${s.color}`).font('Helvetica-Bold').fontSize(8).text(s.label, x + 10, yLabel);
  });

  series.forEach(s => {
    doc.save();
    doc.strokeColor(`#${s.color}`).lineWidth(2.2);
    s.points.forEach((p, i) => {
      const px = scaleX(i);
      const py = scaleY(p);
      if (i === 0) doc.moveTo(px, py); else doc.lineTo(px, py);
    });
    doc.stroke();
    doc.restore();

    s.points.forEach((p, i) => {
      const px = scaleX(i);
      const py = scaleY(p);
      doc.circle(px, py, 2.7).fill(`#${s.color}`);
    });
  });

  labels.forEach((label, i) => {
    const px = scaleX(i);
    doc.fillColor('#64748B').font('Helvetica').fontSize(8).text(label, px - 16, y + h - 18, { width: 32, align: 'center' });
  });

  doc.fillColor(`#${accent}`).font('Helvetica-Bold').fontSize(10).text('Chart', x + w - 50, y + 8, { width: 40, align: 'right' });
}

function drawStackedBars(doc, x, y, w, rows, title, accent) {
  drawCard(doc, x, y, w, 148, 'FFFFFF', 'E2E8F0', 10);
  doc.rect(x, y, w, 5).fill(`#${accent}`);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text(title, x + 12, y + 13, { width: w - 24 });
  rows.forEach((row, idx) => {
    const rowY = y + 38 + idx * 30;
    doc.fillColor('#334155').font('Helvetica').fontSize(9).text(row.label, x + 12, rowY - 1, { width: 90 });
    const barX = x + 110;
    const barW = w - 160;
    doc.roundedRect(barX, rowY, barW, 10, 5).fillAndStroke('E2E8F0', 'E2E8F0');
    let cursor = barX;
    row.parts.forEach(part => {
      const segW = barW * part.pct;
      doc.roundedRect(cursor, rowY, segW, 10, 5).fill(part.color);
      cursor += segW;
    });
    doc.fillColor('#475569').font('Helvetica').fontSize(8).text(row.note, x + w - 42, rowY - 1, { width: 30, align: 'right' });
  });
}

function drawFlowGraphic(doc, x, y, w, items, accent) {
  const boxW = (w - 20) / items.length;
  items.forEach((item, idx) => {
    const cx = x + idx * (boxW + 10);
    drawCard(doc, cx, y, boxW, 90, 'F8FAFC', 'CBD5E1', 10);
    doc.roundedRect(cx + 10, y + 10, 24, 24, 12).fillAndStroke(`#${accent}`, `#${accent}`);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text(String(idx + 1), cx + 10, y + 16, { width: 24, align: 'center' });
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text(item.title, cx + 42, y + 11, { width: boxW - 52, lineGap: 1 });
    doc.fillColor('#475569').font('Helvetica').fontSize(8.2).text(item.body, cx + 10, y + 40, { width: boxW - 20, lineGap: 2 });
    if (idx < items.length - 1) {
      const ax = cx + boxW + 1;
      const ay = y + 45;
      doc.moveTo(ax, ay).lineTo(ax + 8, ay).strokeColor(`#${accent}`).lineWidth(2).stroke();
      doc.moveTo(ax + 8, ay - 4).lineTo(ax + 14, ay).lineTo(ax + 8, ay + 4).fillAndStroke(`#${accent}`, `#${accent}`);
    }
  });
}

function drawVerticalRiskList(doc, x, y, w, items, accent) {
  drawCard(doc, x, y, w, 34 + items.length * 38, 'FFFFFF', 'E2E8F0', 10);
  doc.rect(x, y, w, 5).fill(`#${accent}`);
  items.forEach((item, idx) => {
    const rowY = y + 12 + idx * 38;
    doc.roundedRect(x + 12, rowY, 56, 20, 10).fillAndStroke(item.level === 'good' ? 'DCFCE7' : item.level === 'warn' ? 'FEF3C7' : 'FEE2E2', item.level === 'good' ? 'DCFCE7' : item.level === 'warn' ? 'FEF3C7' : 'FEE2E2');
    doc.fillColor(item.level === 'good' ? '#166534' : item.level === 'warn' ? '#92400E' : '#991B1B').font('Helvetica-Bold').fontSize(8.5).text(`${item.score}/100`, x + 12, rowY + 5, { width: 56, align: 'center' });
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(9.2).text(item.label, x + 80, rowY - 1, { width: w - 92 });
    doc.fillColor('#475569').font('Helvetica').fontSize(8.1).text(item.explanation, x + 80, rowY + 14, { width: w - 92, lineGap: 1 });
    if (idx < items.length - 1) {
      doc.moveTo(x + 12, rowY + 31).lineTo(x + w - 12, rowY + 31).strokeColor('#E2E8F0').lineWidth(0.8).stroke();
    }
  });
}

function renderPageOne(doc, cfg) {
  drawHeader(doc, cfg);
  drawMetricGrid(doc, 40, 152, 532, 80, cfg.metrics, cfg.accent);

  drawCard(doc, 40, 248, 318, 160, 'F8FAFC', 'CBD5E1', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(13).text('Executive Summary', 54, 262);
  drawBullets(doc, 54, 288, 288, cfg.summary.slice(0, 5), { fontSize: 9.3, color: '#334155', gap: 4 });

  drawCard(doc, 374, 248, 198, 160, 'FFFFFF', 'CBD5E1', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(13).text('Market Snapshot', 388, 262);
  drawKeyValueRows(doc, 388, 288, 172, COMMON.marketSnapshot, { labelW: 0.58, labelSize: 8.6, valueSize: 9.1 });

  drawLineChart(doc, 40, 424, 532, 170, cfg.chartLabels, cfg.chartSeries, cfg.accent);
  doc.fillColor('#64748B').font('Helvetica').fontSize(8.8).text(cfg.signal, 54, 582, { width: 500, lineGap: 2 });

  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8.5).text('Sample data and layout for management review until live API integrations are connected.', 40, 736, { width: 532 });
}

function renderPremarketPageTwo(doc, cfg) {
  doc.addPage({ size: 'LETTER', margin: 0 });
  doc.rect(0, 0, 612, 792).fill('#FFFFFF');
  doc.rect(0, 0, 612, 10).fill(`#${cfg.accent}`);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(17).text('Detailed Intelligence', 40, 26);
  doc.fillColor('#64748B').font('Helvetica').fontSize(10).text('Short interest, ownership, options, and catalyst monitoring', 40, 50, { width: 500 });

  drawSectionBar(doc, 40, 84, 532, cfg.accent, 'Short Interest Intelligence', 'free data + pending API');
  drawCard(doc, 40, 116, 256, 190, 'FFFFFF', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('Free Data', 54, 130);
  drawKeyValueRows(doc, 54, 152, 224, COMMON.shortFree, { labelW: 0.55 });
  drawCard(doc, 316, 116, 256, 190, 'F8FAFC', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('Pending API', 330, 130);
  drawKeyValueRows(doc, 330, 152, 224, COMMON.shortPending, { labelW: 0.62 });

  drawSectionBar(doc, 40, 324, 532, cfg.accent, 'Institutional Ownership Intelligence', '13F and smart money signals');
  drawCard(doc, 40, 356, 256, 186, 'FFFFFF', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('Free Data', 54, 370);
  drawKeyValueRows(doc, 54, 392, 224, COMMON.ownershipFree, { labelW: 0.55 });
  drawCard(doc, 316, 356, 256, 186, 'F8FAFC', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('Pending API', 330, 370);
  drawKeyValueRows(doc, 330, 392, 224, COMMON.ownershipPending, { labelW: 0.62 });

  drawSectionBar(doc, 40, 560, 532, cfg.accent, 'Options / Gamma Overview', 'free + partial data');
  drawCard(doc, 40, 592, 256, 150, 'FFFFFF', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('Free or Partial Data', 54, 606);
  drawKeyValueRows(doc, 54, 628, 224, COMMON.optionsFree, { labelW: 0.55 });
  drawCard(doc, 316, 592, 256, 150, 'F8FAFC', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('Pending API', 330, 606);
  drawKeyValueRows(doc, 330, 628, 224, COMMON.optionsPending, { labelW: 0.62 });

  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8.5).text('Morning brief designed for the first 5 minutes of management review before the open.', 40, 748, { width: 532 });
}

function renderPremarketPageThree(doc, cfg) {
  doc.addPage({ size: 'LETTER', margin: 0 });
  doc.rect(0, 0, 612, 792).fill('#FFFFFF');
  doc.rect(0, 0, 612, 10).fill(`#${cfg.accent}`);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(17).text('Catalysts, Risks, and Management Actions', 40, 26);
  doc.fillColor('#64748B').font('Helvetica').fontSize(10).text('News, filings, traffic-light risk dashboard, and recommendations', 40, 50, { width: 500 });

  drawCard(doc, 40, 84, 532, 138, 'FFFFFF', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text('News / Filing / Catalyst Monitor', 54, 98);
  drawBullets(doc, 54, 124, 500, COMMON.newsItems, { fontSize: 9.2, color: '#334155', gap: 4 });

  drawVerticalRiskList(doc, 40, 238, 532, COMMON.riskRows, cfg.accent);

  drawCard(doc, 40, 522, 532, 124, 'FFFFFF', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text('AI Interpretation', 54, 536);
  drawBullets(doc, 54, 562, 500, cfg.details.aiInterpretation.concat([
    'Volatility risk is elevated today because the float is limited and both news and positioning can move the tape quickly.',
    'Management action is recommended: keep communication ready, avoid unnecessary urgency, and monitor unusual trading activity.',
  ]), { fontSize: 9.3, color: '#334155', gap: 4 });

  drawCard(doc, 40, 662, 532, 60, 'F8FAFC', 'E2E8F0', 10);
  doc.fillColor(`#${cfg.accent}`).font('Helvetica-Bold').fontSize(11).text('Management Attention Items', 54, 676);
  doc.fillColor('#475569').font('Helvetica').fontSize(8.8).text('Use this page to decide whether to stay passive, communicate, or escalate before the open.', 54, 696, { width: 500, lineGap: 2 });

  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8.5).text('Pre-market sample report complete.', 40, 744, { width: 532 });
}

function renderMidPageOne(doc, cfg) {
  drawHeader(doc, cfg);
  drawMetricGrid(doc, 40, 152, 532, 80, cfg.metrics, cfg.accent);
  drawLineChart(doc, 40, 248, 346, 184, cfg.chartLabels, cfg.chartSeries, cfg.accent);
  drawCard(doc, 402, 248, 170, 184, 'FFFFFF', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text('Executive Summary', 416, 262);
  drawBullets(doc, 416, 288, 142, cfg.summary.slice(0, 2), { fontSize: 8.6, color: '#334155', gap: 3 });
  doc.fillColor('#64748B').font('Helvetica').fontSize(7.2).text('Midday purpose: detect whether the move is real or fading.', 416, 392, { width: 140 });

  drawCard(doc, 40, 450, 532, 214, 'F8FAFC', 'CBD5E1', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text('Intraday Snapshot', 54, 464);
  drawKeyValueRows(doc, 54, 492, 488, [
    ['Current price', '$1.93'],
    ['% change', '+13.5%'],
    ['Day high / low', '$1.96 / $1.61'],
    ['VWAP', '$1.79'],
    ['Price vs VWAP', '+7.8%'],
    ['Intraday volatility', 'Elevated'],
    ['Bid / ask spread', 'Pending API'],
  ], { labelW: 0.53, labelSize: 8.7, valueSize: 9.1 });

  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8.5).text('Mid-market sample for intraday review, not a close-of-day replacement.', 40, 742, { width: 532 });
}

function renderMidPageTwo(doc, cfg) {
  doc.addPage({ size: 'LETTER', margin: 0 });
  doc.rect(0, 0, 612, 792).fill('#FFFFFF');
  doc.rect(0, 0, 612, 10).fill(`#${cfg.accent}`);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(17).text('Intraday Pressure, Options, and Sentiment', 40, 26);
  doc.fillColor('#64748B').font('Helvetica').fontSize(10).text('This is the time slot that helps diagnose abnormal flow and narrative shifts.', 40, 50, { width: 500 });

  const pressureRows = [
    { label: 'Short Pressure', parts: [{ pct: 0.58, color: '#0EA5E9' }, { pct: 0.42, color: '#E2E8F0' }], note: 'watch' },
    { label: 'Options Flow', parts: [{ pct: 0.49, color: '#7C3AED' }, { pct: 0.51, color: '#E2E8F0' }], note: 'mixed' },
    { label: 'News / Social', parts: [{ pct: 0.62, color: '#22C55E' }, { pct: 0.38, color: '#E2E8F0' }], note: 'active' },
  ];
  drawStackedBars(doc, 40, 86, 532, pressureRows, 'Threat / Pressure Signal', cfg.accent);

  drawCard(doc, 40, 252, 256, 230, 'FFFFFF', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('Intraday Short Pressure', 54, 266);
  drawKeyValueRows(doc, 54, 292, 224, [
    ['FINRA short volume', '3.8M'],
    ['Short volume ratio', '24.9%'],
    ['Off-exchange volume', '58%'],
    ['Borrow changes', 'Pending API'],
    ['Intraday SI change', 'Pending API'],
    ['CTB spike', 'Pending API'],
  ], { labelW: 0.62 });

  drawCard(doc, 316, 252, 256, 230, 'F8FAFC', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('Options Flow', 330, 266);
  drawKeyValueRows(doc, 330, 292, 224, [
    ['Option volume', '41K'],
    ['Put/call activity', '1.18'],
    ['Open interest change', 'Moderate'],
    ['Gamma exposure', 'Pending API'],
    ['Dealer positioning', 'Pending API'],
    ['Unusual flow', 'Pending API'],
  ], { labelW: 0.58 });

  drawCard(doc, 40, 500, 532, 164, 'FFFFFF', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('News / Social / Sentiment', 54, 514);
  drawFlowGraphic(doc, 54, 538, 500, [
    { title: 'Retail Sentiment', body: 'X, Reddit, and Stocktwits are the main signal sources; note whether the narrative is heating up or fading.' },
    { title: 'Institutional Sentiment', body: 'If institutions are adding, the move is more likely to persist; if not, watch for a fade.' },
    { title: 'Media / Viral Narrative', body: 'Check whether the story is becoming contagious or simply staying inside one trading community.' },
  ], cfg.accent);

  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8.5).text('Midday sample report complete.', 40, 742, { width: 532 });
}

function renderMidPageThree(doc, cfg) {
  doc.addPage({ size: 'LETTER', margin: 0 });
  doc.rect(0, 0, 612, 792).fill('#FFFFFF');
  doc.rect(0, 0, 612, 10).fill(`#${cfg.accent}`);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(17).text('AI Intraday Threat Level and Actions', 40, 26);
  doc.fillColor('#64748B').font('Helvetica').fontSize(10).text('This is the decision page: should management wait, communicate, or prepare a response?', 40, 50, { width: 500 });

  drawVerticalRiskList(doc, 40, 86, 532, [
    { label: 'Short Attack Risk', score: 64, level: 'warn', explanation: 'Short pressure is present but not yet conclusive.' },
    { label: 'Gamma Squeeze Risk', score: 52, level: 'warn', explanation: 'Options activity matters only if the trend sustains.' },
    { label: 'Liquidity Stress', score: 67, level: 'warn', explanation: 'Any fade in volume could reverse the move quickly.' },
    { label: 'Momentum Strength', score: 73, level: 'good', explanation: 'Price remains above VWAP, so trend strength is intact.' },
    { label: 'News-Driven Volatility', score: 59, level: 'warn', explanation: 'Keep an eye on filings or PRs that may hit before the close.' },
    { label: 'Narrative Heat', score: 71, level: 'good', explanation: 'Retail and media attention appear active.' },
  ], cfg.accent);

  drawCard(doc, 40, 350, 532, 112, 'FFFFFF', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text('AI Interpretation', 54, 364);
  drawBullets(doc, 54, 388, 500, [
    'Momentum is real, but durability still depends on whether volume expands into the close.',
    'If tape quality weakens, short-covering becomes the more likely explanation than new demand.',
  ], { fontSize: 9, color: '#1E293B', gap: 3 });

  drawCard(doc, 40, 476, 532, 102, 'FFFFFF', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text('Suggested Management Actions', 54, 490);
  drawBullets(doc, 54, 516, 500, [
    'Keep IR and finance aligned on talking points.',
    'Prepare a concise response if unusual flow persists.',
  ], { fontSize: 9, color: '#1E293B', gap: 3 });

  drawCard(doc, 40, 592, 532, 90, 'F8FAFC', 'E2E8F0', 10);
  doc.fillColor(`#${cfg.accent}`).font('Helvetica-Bold').fontSize(11).text('Decision Summary', 54, 606);
  doc.fillColor('#334155').font('Helvetica').fontSize(8.8).text(cfg.details.signal, 54, 628, { width: 500, lineGap: 2 });

  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8.5).text('Mid-market sample report complete.', 40, 744, { width: 532 });
}

function renderPostPageOne(doc, cfg) {
  drawHeader(doc, cfg);
  drawMetricGrid(doc, 40, 146, 532, 84, cfg.metrics, cfg.accent);
  drawLineChart(doc, 40, 246, 532, 204, cfg.chartLabels, cfg.chartSeries, cfg.accent);
  drawCard(doc, 40, 468, 532, 152, 'F8FAFC', 'CBD5E1', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text('Executive Summary', 54, 482);
  drawBullets(doc, 54, 508, 500, cfg.summary, { fontSize: 10, color: '#334155', gap: 5 });
  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8.5).text('This is the strongest strategic version and can reuse the style of the prior executive report.', 40, 742, { width: 532 });
}

function renderPostPageTwo(doc, cfg) {
  doc.addPage({ size: 'LETTER', margin: 0 });
  doc.rect(0, 0, 612, 792).fill('#FFFFFF');
  doc.rect(0, 0, 612, 10).fill(`#${cfg.accent}`);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(17).text('Daily Market Recap and Attribution', 40, 26);
  doc.fillColor('#64748B').font('Helvetica').fontSize(10).text('The goal is to explain the full day in management language, not trading jargon.', 40, 50, { width: 500 });

  drawCard(doc, 40, 86, 532, 170, 'FFFFFF', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text('Daily Market Recap', 54, 100);
  drawKeyValueRows(doc, 54, 128, 488, [
    ['Close price', '$1.84'],
    ['Daily change', '+8.2%'],
    ['Intraday high / low', '$1.96 / $1.61'],
    ['Volume', '15.2M'],
    ['Relative volume', '3.8x'],
    ['After-hours price', '$1.88'],
    ['Market cap change', '+$5.2M'],
    ['Sector comparison', 'Outperformed fintech peers'],
  ], { labelW: 0.56 });

  drawCard(doc, 40, 272, 532, 210, 'F8FAFC', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text('Price Action Attribution', 54, 286);
  drawStackedBars(doc, 54, 314, 500, [
    { label: 'Short covering', parts: [{ pct: 0.34, color: '#7C3AED' }, { pct: 0.66, color: '#E2E8F0' }], note: '34%' },
    { label: 'Retail momentum', parts: [{ pct: 0.27, color: '#0EA5E9' }, { pct: 0.73, color: '#E2E8F0' }], note: '27%' },
    { label: 'Narrative demand', parts: [{ pct: 0.19, color: '#22C55E' }, { pct: 0.81, color: '#E2E8F0' }], note: '19%' },
    { label: 'Options-driven', parts: [{ pct: 0.11, color: '#F59E0B' }, { pct: 0.89, color: '#E2E8F0' }], note: '11%' },
  ], 'Attribution Mix', cfg.accent);

  drawCard(doc, 40, 494, 250, 140, 'FFFFFF', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('Narrative Analysis', 54, 508);
  drawBullets(doc, 54, 534, 216, [
    'AI fintech company',
    'Web3 / tokenization company',
    'Short squeeze candidate',
    'Institutional turnaround story',
  ], { fontSize: 9.4, color: '#334155', gap: 4 });

  drawCard(doc, 322, 494, 250, 140, 'F8FAFC', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('Short Interest / FTD / Ownership', 336, 508);
  drawKeyValueRows(doc, 336, 534, 222, [
    ['FINRA short volume', '3.8M'],
    ['SEC FTD update', '92,400'],
    ['Official SI', '18.2% of float'],
    ['WhaleWisdom / Fintel', 'Pending API'],
  ], { labelW: 0.56 });

  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8.5).text('Post-market sample report complete.', 40, 742, { width: 532 });
}

function renderPostPageThree(doc, cfg) {
  doc.addPage({ size: 'LETTER', margin: 0 });
  doc.rect(0, 0, 612, 792).fill('#FFFFFF');
  doc.rect(0, 0, 612, 10).fill(`#${cfg.accent}`);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(17).text('Catalyst Review and Tomorrow Watchlist', 40, 26);
  doc.fillColor('#64748B').font('Helvetica').fontSize(10).text('The finish page turns the day into an action plan for tomorrow.', 40, 50, { width: 500 });

  drawCard(doc, 40, 86, 532, 160, 'FFFFFF', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text('News / Filing / Catalyst Review', 54, 100);
  drawBullets(doc, 54, 126, 500, [
    'New SEC filings: 8-K, 13D, and insider transaction review.',
    'PRs: monitor for follow-up communication or clarification.',
    'Competitor / sector news: especially crypto, fintech, and small-cap sentiment.',
    'Macro themes: risk-on / risk-off rotation can alter tomorrow’s setup.',
  ], { fontSize: 9.6, color: '#334155', gap: 5 });

  drawCard(doc, 40, 262, 532, 150, 'F8FAFC', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text('Narrative Analysis', 54, 276);
  drawBullets(doc, 54, 302, 500, [
    'AI fintech company',
    'Web3 / tokenization company',
    'Reverse merger / restructuring story',
    'Meme stock / short squeeze candidate',
    'Institutional turnaround story',
  ], { fontSize: 9.5, color: '#334155', gap: 4 });

  drawFlowGraphic(doc, 40, 430, 532, [
    { title: 'Key Price Levels', body: 'Keep $1.79 as the VWAP reference and $1.96 as the first extension area.' },
    { title: 'Volume Threshold', body: 'Watch for 10M+ shares early to confirm whether the move has real depth.' },
    { title: 'Risk Alerts', body: 'If narrative weakens or liquidity dries up, reassess short-covering assumptions.' },
    { title: 'Tomorrow Catalyst', body: 'Monitor filings, PR timing, and any sectorwide fintech / crypto news.' },
  ], cfg.accent);

  drawCard(doc, 40, 538, 532, 122, 'FFFFFF', 'E2E8F0', 10);
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text('Strategic Management Recommendations', 54, 552);
  drawBullets(doc, 54, 576, 500, cfg.details.actions.concat([
    'Increase IR outreach if the move continues tomorrow.',
    'Prepare FAQ language in case the market asks about volatility.',
  ]), { fontSize: 9.3, color: '#334155', gap: 4 });

  drawCard(doc, 40, 676, 532, 62, 'F8FAFC', 'E2E8F0', 10);
  doc.fillColor(`#${cfg.accent}`).font('Helvetica-Bold').fontSize(11).text('Tomorrow Watchlist', 54, 690);
  doc.fillColor('#475569').font('Helvetica').fontSize(8.9).text('Key price levels · key volume threshold · key news to monitor · catalyst calendar · risk alerts', 54, 710, { width: 500 });

  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8.5).text('Post-market sample report complete.', 40, 744, { width: 532 });
}

function buildPdf(cfg, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 0, compress: true });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    if (cfg.reportType === '8AM') {
      renderPageOne(doc, cfg);
      renderPremarketPageTwo(doc, cfg);
      renderPremarketPageThree(doc, cfg);
    } else if (cfg.reportType === '1150AM') {
      renderMidPageOne(doc, cfg);
      renderMidPageTwo(doc, cfg);
      renderMidPageThree(doc, cfg);
    } else {
      renderPostPageOne(doc, cfg);
      renderPostPageTwo(doc, cfg);
      renderPostPageThree(doc, cfg);
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function main() {
  ensureOutDir();
  const written = [];
  for (const key of ['8AM', '1150AM', '7PM']) {
    const cfg = REPORTS[key];
    const outputPath = path.join(OUT_DIR, `curr-${cfg.slug}-sample-report.pdf`);
    await buildPdf(cfg, outputPath);
    written.push(outputPath);
  }
  console.log(JSON.stringify({ ok: true, written }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
