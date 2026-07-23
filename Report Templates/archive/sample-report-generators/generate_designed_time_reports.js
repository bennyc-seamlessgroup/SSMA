const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const OUT_DIR = path.join(process.cwd(), 'sample-reports');
const COMPANY = 'CURRENC Group Inc.';
const TICKER = 'CURR';
const REPORT_DATE = '2026-05-20';

const PALETTE = {
  ink: '#111827',
  muted: '#667085',
  faint: '#98A2B3',
  page: '#F6F7F9',
  card: '#FFFFFF',
  line: '#E5E7EB',
  soft: '#F2F4F7',
  green: '#16A34A',
  amber: '#D97706',
  red: '#DC2626',
  blue: '#2563EB',
  indigo: '#4F46E5',
  violet: '#7C3AED',
};

const REPORTS = [
  {
    slug: 'pre-market',
    filename: 'curr-pre-market-sample-report.pdf',
    time: '8:00 AM NYT',
    title: 'Pre-Market Risk Brief',
    subtitle: 'What management should know before the open',
    accent: PALETTE.blue,
    label: 'PRE-MARKET',
    thesis: 'Risk is elevated but manageable. Today’s priority is preparation, not reaction.',
    metrics: [
      ['Prior Close', '$1.70', '+2.4% AH'],
      ['Pre-Mkt Tone', 'Watch', 'thin liquidity'],
      ['Rel. Volume', '2.1x', 'early read'],
      ['Risk Level', 'Medium', 'monitor'],
    ],
    chart: {
      title: 'Pre-Market Setup',
      labels: ['4:00', '5:00', '6:00', '7:00', '8:00'],
      series: [{ name: 'Indicative price', color: PALETTE.blue, values: [1.70, 1.72, 1.71, 1.76, 1.78] }],
    },
    sections: [
      {
        title: 'Opening Risk Questions',
        bullets: [
          'Is volume confirming the pre-market move or only reacting to thin liquidity?',
          'Are filings, PR, or sector headlines likely to change the first-hour narrative?',
          'Does short pressure increase enough to justify a more active IR response?',
        ],
      },
      {
        title: 'Data Status',
        pairs: [
          ['FINRA short volume', 'Available sample'],
          ['Borrow / cost-to-borrow', 'Pending API'],
          ['Options gamma', 'Pending API'],
          ['X / Reddit / Stocktwits', 'Pending API'],
          ['SEC filings', 'Monitor'],
        ],
      },
    ],
    risks: [
      ['Low float volatility', 72, 'High'],
      ['Short attack risk', 61, 'Watch'],
      ['News sensitivity', 58, 'Watch'],
      ['Liquidity depth', 44, 'Moderate'],
    ],
    actionTitle: 'Recommended Management Actions Before Open',
    actions: [
      'Keep IR, finance, and legal aligned on one concise message set.',
      'Do not issue reactive communication unless misinformation appears.',
      'Watch first-hour volume quality versus VWAP and short-volume indicators.',
    ],
  },
  {
    slug: 'mid-market',
    filename: 'curr-mid-market-sample-report.pdf',
    time: '11:50 AM NYT',
    title: 'Midday Flow Report',
    subtitle: 'Diagnose whether the intraday move is durable or fading',
    accent: PALETTE.indigo,
    label: 'MID-MARKET',
    thesis: 'Price is above VWAP with strong participation, but the quality of the move still needs confirmation into the close.',
    metrics: [
      ['Current Price', '$1.93', 'above VWAP'],
      ['% Change', '+13.5%', 'intraday'],
      ['Volume', '9.1M', '3.8x rel vol'],
      ['Flow Quality', 'Positive', 'watch fade'],
    ],
    chart: {
      title: 'Intraday Price vs VWAP',
      labels: ['Open', '9:45', '10:30', '11:00', '11:30', '11:50'],
      series: [
        { name: 'Price', color: PALETTE.indigo, values: [1.70, 1.76, 1.81, 1.88, 1.91, 1.93] },
        { name: 'VWAP', color: '#0EA5E9', values: [1.70, 1.73, 1.76, 1.78, 1.79, 1.79] },
      ],
    },
    sections: [
      {
        title: 'Intraday Flow Diagnosis',
        bullets: [
          'Above-VWAP trading suggests real momentum rather than only a headline spike.',
          'Volume concentration is active enough to warrant management monitoring.',
          'The key risk is afternoon fade if liquidity thins or narrative attention rotates away.',
        ],
      },
      {
        title: 'Live Inputs Needed',
        pairs: [
          ['Bid / ask spread', 'Pending API'],
          ['Borrow changes', 'Pending API'],
          ['Unusual option flow', 'Pending API'],
          ['Retail sentiment', 'Pending API'],
          ['News / filing change', 'Monitor'],
        ],
      },
    ],
    risks: [
      ['Momentum strength', 76, 'Strong'],
      ['Short pressure', 64, 'Watch'],
      ['Liquidity stress', 67, 'Watch'],
      ['Narrative heat', 71, 'Active'],
    ],
    actionTitle: 'Suggested Management Actions Into Close',
    actions: [
      'Keep IR and finance aligned; avoid long-form commentary during the tape.',
      'Prepare concise response language if unusual flow or misinformation persists.',
      'Use the close, not the 11:50 snapshot, as the basis for external-facing framing.',
    ],
  },
  {
    slug: 'post-market',
    filename: 'curr-post-market-sample-report.pdf',
    time: '7:00 PM NYT',
    title: 'Post-Market Strategic Review',
    subtitle: 'End-of-day explanation, attribution, and tomorrow watchlist',
    accent: PALETTE.violet,
    label: 'POST-MARKET',
    thesis: 'This is the executive squeeze version: combine day-close market review with squeeze score, rank, social sentiment, and trigger stages.',
    metrics: [
      ['Squeeze Score', '78/100', 'market avg 58'],
      ['US Rank', '#37', 'top 1%'],
      ['Mentions', '12,847', '7-day social'],
      ['Close', '$1.84', '+8.2%'],
    ],
    chart: {
      title: 'Full-Day Price Action',
      labels: ['Open', '10AM', '11:30', '1PM', '3PM', 'Close', 'AH'],
      series: [
        { name: 'Price', color: PALETTE.violet, values: [1.76, 1.82, 1.88, 1.91, 1.86, 1.84, 1.88] },
        { name: 'VWAP', color: '#0EA5E9', values: [1.76, 1.78, 1.79, 1.79, 1.80, 1.79, 1.80] },
      ],
    },
    sections: [
      {
        title: 'Executive Squeeze Summary',
        bullets: [
          'Company squeeze score is 78/100 versus US market average of 58/100.',
          'CURR ranks #37 out of 4,126 US listed stocks — top 1% highest squeeze potential.',
          'Seven-day social activity is 12,847 mentions, with positive sentiment leading negative sentiment.',
          'The report should become the daily strategic version for CEO / CFO review.',
        ],
      },
      {
        title: 'Tomorrow Watchlist',
        pairs: [
          ['VWAP reference', '$1.79'],
          ['Squeeze score', '78/100'],
          ['US market rank', '#37 of 4,126'],
          ['Positive sentiment', '62%'],
          ['X / StockTwits / Reddit', 'Pending API'],
        ],
      },
    ],
    risks: [
      ['Short interest ratio', 93, '28/30'],
      ['Lending utilization', 96, '24/25'],
      ['Short trend', 87, '13/15'],
      ['Borrow pressure', 90, '9/10'],
    ],
    actionTitle: 'Strategic Recommendations',
    actions: [
      'Monitor as a high-squeeze-potential name; keep messaging simple: score, rank, sentiment, and trigger stages.',
      'Prepare next-day IR talking points and FAQ language if volume and sentiment continue.',
      'Track whether after-hours strength converts into real next-day liquidity and sustained social confirmation.',
    ],
  },
];

function ensureOutDir() { fs.mkdirSync(OUT_DIR, { recursive: true }); }
function hexToRgb(hex) { const h = hex.replace('#', ''); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; }
function tint(hex, alpha = 0.12) { const [r,g,b] = hexToRgb(hex); return `rgba(${r},${g},${b},${alpha})`; }

function newDoc(filePath) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 0, bufferPages: true });
  doc.pipe(fs.createWriteStream(filePath));
  return doc;
}

function pageBg(doc) {
  doc.rect(0, 0, 612, 792).fill(PALETTE.page);
}

function text(doc, str, x, y, opts = {}) {
  doc.fillColor(opts.color || PALETTE.ink)
    .font(opts.font || 'Helvetica')
    .fontSize(opts.size || 10)
    .text(str, x, y, { width: opts.width, align: opts.align, lineGap: opts.lineGap ?? 2, continued: opts.continued || false });
}

function card(doc, x, y, w, h, opts = {}) {
  doc.save();
  doc.roundedRect(x, y, w, h, opts.radius ?? 14).fillAndStroke(opts.fill || PALETTE.card, opts.stroke || PALETTE.line);
  doc.restore();
}

function header(doc, r, pageName) {
  card(doc, 32, 28, 548, 92, { fill: '#111827', stroke: '#111827', radius: 18 });
  doc.roundedRect(48, 46, 94, 24, 12).fill(r.accent);
  text(doc, r.label, 48, 53, { width: 94, align: 'center', color: '#FFFFFF', size: 8.2, font: 'Helvetica-Bold' });
  text(doc, `${r.time} · ${pageName}`, 156, 49, { width: 260, color: '#D1D5DB', size: 9.2, font: 'Helvetica-Bold' });
  text(doc, `${COMPANY} (${TICKER}) · ${REPORT_DATE}`, 156, 69, { width: 260, color: '#9CA3AF', size: 8.5 });
  text(doc, r.title, 48, 86, { width: 360, color: '#FFFFFF', size: 19, font: 'Helvetica-Bold' });
  text(doc, r.subtitle, 392, 49, { width: 156, color: '#D1D5DB', size: 8.8, align: 'right', lineGap: 2 });
}

function metricCards(doc, r, y = 138) {
  const x = 32, w = 548, gap = 10;
  const cw = (w - gap * 3) / 4;
  r.metrics.forEach((m, i) => {
    const cx = x + i * (cw + gap);
    card(doc, cx, y, cw, 74, { radius: 14 });
    doc.circle(cx + 15, y + 18, 4).fill(r.accent);
    text(doc, m[0].toUpperCase(), cx + 26, y + 12, { width: cw - 36, color: PALETTE.muted, size: 7.5, font: 'Helvetica-Bold' });
    text(doc, m[1], cx + 14, y + 31, { width: cw - 28, size: 18, font: 'Helvetica-Bold' });
    text(doc, m[2], cx + 14, y + 55, { width: cw - 28, color: r.accent, size: 8.2, font: 'Helvetica-Bold' });
  });
}

function bullets(doc, items, x, y, w, opts = {}) {
  let cy = y;
  items.forEach((b) => {
    doc.circle(x + 3, cy + 5, 2.2).fill(opts.dot || PALETTE.ink);
    text(doc, b, x + 12, cy, { width: w - 12, color: opts.color || PALETTE.ink, size: opts.size || 9.2, lineGap: 2 });
    cy += doc.heightOfString(b, { width: w - 12, lineGap: 2 }) + (opts.gap ?? 8);
  });
  return cy;
}

function pairs(doc, rows, x, y, w) {
  let cy = y;
  rows.forEach(([k, v]) => {
    text(doc, k, x, cy, { width: w * 0.58, color: PALETTE.muted, size: 8.5, font: 'Helvetica-Bold' });
    text(doc, v, x + w * 0.58, cy, { width: w * 0.42, color: v.includes('Pending') ? PALETTE.amber : PALETTE.ink, size: 8.6, align: 'right' });
    doc.moveTo(x, cy + 17).lineTo(x + w, cy + 17).strokeColor(PALETTE.line).lineWidth(0.7).stroke();
    cy += 22;
  });
}

function lineChart(doc, r, x, y, w, h) {
  card(doc, x, y, w, h, { radius: 16 });
  text(doc, r.chart.title, x + 18, y + 16, { width: w - 36, size: 11.5, font: 'Helvetica-Bold' });
  const plot = { x: x + 42, y: y + 50, w: w - 62, h: h - 84 };
  const values = r.chart.series.flatMap(s => s.values);
  const min = Math.min(...values) - 0.02;
  const max = Math.max(...values) + 0.02;
  const sx = i => plot.x + (i * plot.w) / (r.chart.labels.length - 1 || 1);
  const sy = v => plot.y + plot.h - ((v - min) / (max - min || 1)) * plot.h;
  for (let i = 0; i <= 4; i++) {
    const gy = plot.y + (plot.h * i) / 4;
    doc.moveTo(plot.x, gy).lineTo(plot.x + plot.w, gy).strokeColor(PALETTE.line).lineWidth(0.7).stroke();
    const value = max - ((max - min) * i) / 4;
    text(doc, `$${value.toFixed(2)}`, x + 10, gy - 4, { width: 28, align: 'right', color: PALETTE.muted, size: 6.8 });
  }
  r.chart.series.forEach((s, idx) => {
    doc.strokeColor(s.color).lineWidth(idx === 0 ? 2.6 : 1.8);
    s.values.forEach((v, i) => { const px = sx(i), py = sy(v); if (i === 0) doc.moveTo(px, py); else doc.lineTo(px, py); });
    doc.stroke();
    s.values.forEach((v, i) => doc.circle(sx(i), sy(v), idx === 0 ? 3 : 2.2).fill(s.color));
    text(doc, s.name, x + w - 116, y + 17 + idx * 14, { width: 88, align: 'right', color: s.color, size: 8, font: 'Helvetica-Bold' });
  });
  r.chart.labels.forEach((l, i) => text(doc, l, sx(i) - 22, y + h - 24, { width: 44, align: 'center', color: PALETTE.muted, size: 7.5 }));
}

function riskBars(doc, r, x, y, w, h) {
  card(doc, x, y, w, h, { radius: 16 });
  text(doc, 'Risk / Signal Dashboard', x + 18, y + 16, { width: w - 36, size: 11.5, font: 'Helvetica-Bold' });
  let cy = y + 48;
  r.risks.forEach(([label, score, note]) => {
    text(doc, label, x + 18, cy, { width: 146, size: 8.7, color: PALETTE.ink, font: 'Helvetica-Bold' });
    const bx = x + 164, bw = w - 236;
    doc.roundedRect(bx, cy + 3, bw, 8, 4).fill(PALETTE.soft);
    doc.roundedRect(bx, cy + 3, bw * score / 100, 8, 4).fill(score >= 70 ? PALETTE.red : score >= 58 ? PALETTE.amber : r.accent);
    text(doc, note, x + w - 60, cy - 1, { width: 42, align: 'right', size: 8, color: PALETTE.muted });
    cy += 30;
  });
}

function executiveThesis(doc, r, y) {
  card(doc, 32, y, 548, 86, { fill: '#FFFFFF', radius: 16 });
  doc.rect(32, y, 6, 86).fill(r.accent);
  text(doc, 'Executive Thesis', 54, y + 17, { width: 190, size: 10.5, font: 'Helvetica-Bold' });
  text(doc, r.thesis, 54, y + 40, { width: 500, size: 12, color: PALETTE.ink, font: 'Helvetica-Bold', lineGap: 3 });
}

function page1(doc, r) {
  pageBg(doc); header(doc, r, 'Management View'); metricCards(doc, r); executiveThesis(doc, r, 228);
  lineChart(doc, r, 32, 334, 548, 210);
  const s = r.sections[0];
  card(doc, 32, 562, 548, 116, { radius: 16 });
  text(doc, s.title, 52, 579, { width: 250, size: 11.5, font: 'Helvetica-Bold' });
  bullets(doc, s.bullets, 52, 606, 502, { size: 8.9, dot: r.accent, gap: 6 });
  footer(doc, r, 1);
}

function page2(doc, r) {
  doc.addPage({ size: 'LETTER', margin: 0 }); pageBg(doc); header(doc, r, 'Intelligence Detail');
  const section = r.sections[1];
  card(doc, 32, 144, 264, 196, { radius: 16 });
  text(doc, section.title, 52, 162, { width: 220, size: 11.5, font: 'Helvetica-Bold' });
  pairs(doc, section.pairs, 52, 196, 224);
  riskBars(doc, r, 316, 144, 264, 196);

  if (r.slug === 'post-market') {
    card(doc, 32, 362, 548, 142, { radius: 16 });
    text(doc, 'Social Media Sentiment Analysis', 52, 380, { width: 260, size: 11.5, font: 'Helvetica-Bold' });
    const social = [
      ['X / Twitter', '5,210 posts', '+68% / -14% / 18% neutral'],
      ['StockTwits', '4,872 posts', '+61% / -19% / 20% neutral'],
      ['Reddit', '2,765 posts', '+53% / -22% / 25% neutral'],
    ];
    social.forEach((row, idx) => {
      const cx = 52 + idx * 166;
      card(doc, cx, 412, 150, 66, { fill: '#F9FAFB', radius: 12 });
      text(doc, row[0], cx + 12, 426, { width: 126, size: 8.8, font: 'Helvetica-Bold' });
      text(doc, row[1], cx + 12, 445, { width: 126, size: 13, font: 'Helvetica-Bold', color: r.accent });
      text(doc, row[2], cx + 12, 465, { width: 126, size: 7.6, color: PALETTE.muted });
    });

    card(doc, 32, 526, 548, 122, { fill: '#111827', stroke: '#111827', radius: 16 });
    text(doc, 'Executive Brief Integration', 52, 546, { width: 220, color: '#FFFFFF', size: 11.5, font: 'Helvetica-Bold' });
    text(doc, 'Included from sample-executive-report: squeeze score 78/100, US rank #37 of 4,126, 12,847 mentions, short squeeze component scores, social sentiment mix, trigger stages, and Pending API source labels.', 52, 576, { width: 502, color: '#E5E7EB', size: 9.2, lineGap: 3 });
  } else {
    card(doc, 32, 362, 548, 150, { radius: 16 });
    text(doc, 'Signal Interpretation', 52, 380, { width: 220, size: 11.5, font: 'Helvetica-Bold' });
    bullets(doc, [
      r.thesis,
      'This sample keeps paid or not-yet-integrated feeds clearly labeled as Pending API.',
      'The goal is not more data; the goal is faster management judgment with clear confidence labels.',
    ], 52, 410, 502, { size: 9.2, dot: r.accent, gap: 8 });
    card(doc, 32, 532, 548, 116, { fill: '#111827', stroke: '#111827', radius: 16 });
    text(doc, 'Design Principle', 52, 552, { width: 180, color: '#FFFFFF', size: 11.5, font: 'Helvetica-Bold' });
    text(doc, 'These reports should share one executive-grade visual system, but the content should remain different by time slot. The old executive report style fits best as the post-market strategic version, not as a replacement for all three reports.', 52, 582, { width: 502, color: '#E5E7EB', size: 9.5, lineGap: 3 });
  }
  footer(doc, r, 2);
}

function page3(doc, r) {
  doc.addPage({ size: 'LETTER', margin: 0 }); pageBg(doc); header(doc, r, 'Action Plan');
  card(doc, 32, 146, 548, 166, { radius: 16 });
  text(doc, r.actionTitle, 52, 166, { width: 300, size: 12, font: 'Helvetica-Bold' });
  bullets(doc, r.actions, 52, 198, 502, { size: 9.8, dot: r.accent, gap: 10 });
  card(doc, 32, 338, 548, 166, { radius: 16 });
  text(doc, r.slug === 'post-market' ? 'Trigger Conditions from Executive Brief' : 'Next Review Checklist', 52, 358, { width: 300, size: 12, font: 'Helvetica-Bold' });
  if (r.slug === 'post-market') {
    bullets(doc, [
      'Stage 1: score above 70 and borrow pressure continues to rise.',
      'Stage 2: sentiment and volume confirm sustained momentum.',
      'Stage 3: rank enters top 1% and lending supply remains tight.',
      'Pending APIs: X / Twitter, StockTwits, Reddit, ORTEX, Fintel, WhaleWisdom.',
    ], 52, 392, 502, { size: 9.1, dot: r.accent, gap: 8 });
  } else {
    const checks = ['Price vs VWAP', 'Volume quality', 'Short-volume pressure', 'Options / gamma change', 'Filing or PR trigger', 'Social narrative heat'];
    checks.forEach((c, idx) => {
      const col = idx % 2, row = Math.floor(idx / 2);
      const cx = 52 + col * 250, cy = 394 + row * 31;
      doc.roundedRect(cx, cy, 16, 16, 4).strokeColor(r.accent).lineWidth(1.2).stroke();
      text(doc, c, cx + 26, cy + 2, { width: 190, size: 9.2, color: PALETTE.ink });
    });
  }
  card(doc, 32, 530, 548, 104, { fill: '#FFFFFF', radius: 16 });
  doc.rect(32, 530, 548, 5).fill(r.accent);
  text(doc, 'Bottom Line', 52, 552, { width: 120, size: 11.5, font: 'Helvetica-Bold' });
  text(doc, r.thesis, 52, 580, { width: 502, size: 11, color: PALETTE.ink, font: 'Helvetica-Bold', lineGap: 3 });
  footer(doc, r, 3);
}

function footer(doc, r, pageNum) {
  text(doc, 'Sample report · Not investment advice · Live feeds marked Pending API until integration', 32, 736, { width: 390, color: PALETTE.muted, size: 7.8 });
  text(doc, `${r.slug} · page ${pageNum}/3`, 464, 736, { width: 116, align: 'right', color: PALETTE.muted, size: 7.8 });
}

function render(r) {
  const filePath = path.join(OUT_DIR, r.filename);
  const doc = newDoc(filePath);
  page1(doc, r); page2(doc, r); page3(doc, r);
  doc.end();
  return filePath;
}

ensureOutDir();
const written = REPORTS.map(render);
console.log(JSON.stringify({ ok: true, written }, null, 2));
