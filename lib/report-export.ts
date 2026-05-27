// @ts-nocheck
import type { ExecutiveReport } from './types';
const PptxGenJS = require('pptxgenjs');

type PDFDoc = any;

function toPct(n: number) {
  return `${Math.round(n)}%`;
}

function pdfBuffer(doc: PDFDoc) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function addPdfHeader(doc: PDFKit.PDFDocument, report: ExecutiveReport, title: string) {
  doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold').text(title, 40, 40);
  doc.fillColor('#475569').fontSize(10).font('Helvetica').text(`${report.companyName} (${report.ticker}) · ${report.date}`, 40, 62);
  doc.moveTo(40, 78).lineTo(572, 78).strokeColor('#cbd5e1').stroke();
}

function addPdfMetric(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: string, note?: string) {
  doc.roundedRect(x, y, 160, 72, 10).fillAndStroke('#f8fafc', '#cbd5e1');
  doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text(label.toUpperCase(), x + 12, y + 12);
  doc.fillColor('#0f172a').fontSize(22).font('Helvetica-Bold').text(value, x + 12, y + 26);
  if (note) doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(note, x + 12, y + 53, { width: 136 });
}

function addPdfBars(doc: PDFKit.PDFDocument, x: number, y: number, width: number, factors: ExecutiveReport['scoreBreakdown']) {
  const cols = 2;
  const gapX = 14;
  const gapY = 12;
  const cardW = (width - gapX) / cols;
  const cardH = 48;

  factors.forEach((factor, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = x + col * (cardW + gapX);
    const cy = y + row * (cardH + gapY);
    const pct = Math.max(0, Math.min(100, (factor.score / factor.max) * 100));

    doc.roundedRect(cx, cy, cardW, cardH, 8).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(factor.label, cx + 10, cy + 8, { width: cardW - 20, height: 12 });
    doc.fillColor('#2563eb').fontSize(15).font('Helvetica-Bold').text(`${factor.score}/${factor.max}`, cx + 10, cy + 22, { width: cardW - 20, align: 'left' });
    doc.roundedRect(cx + 10, cy + 36, cardW - 20, 6, 3).fillAndStroke('#e2e8f0', '#e2e8f0');
    doc.roundedRect(cx + 10, cy + 36, (cardW - 20) * (pct / 100), 6, 3).fill('#2563eb');
  });
}

function addPdfBullets(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  bullets: string[],
  options?: { width?: number; color?: string; fontSize?: number; lineGap?: number }
) {
  const width = options?.width ?? 250;
  const fontSize = options?.fontSize ?? 10;
  const color = options?.color ?? '#0f172a';
  const lineGap = options?.lineGap ?? 4;
  let cursorY = y;

  bullets.forEach(bullet => {
    const text = `• ${bullet}`;
    doc.fillColor(color).fontSize(fontSize).font('Helvetica').text(text, x, cursorY, { width, continued: false });
    const height = doc.heightOfString(text, { width });
    cursorY += height + lineGap;
  });

  return cursorY;
}

function addPdfPlatformSummary(doc: PDFKit.PDFDocument, report: ExecutiveReport, x: number, y: number) {
  const total = report.sentiment.totalMentions || 1;
  report.sentiment.platforms.forEach((platform, idx) => {
    const rowY = y + idx * 70;
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`${platform.platform} — ${platform.posts.toLocaleString()} posts`, x, rowY);
    doc.roundedRect(x, rowY + 18, 220, 10, 5).fillAndStroke('#e2e8f0', '#e2e8f0');
    const positiveWidth = 220 * (platform.positive / 100);
    const negativeWidth = 220 * (platform.negative / 100);
    doc.roundedRect(x, rowY + 18, positiveWidth, 10, 5).fill('#22c55e');
    doc.roundedRect(x + positiveWidth, rowY + 18, negativeWidth, 10, 0).fill('#ef4444');
    doc.roundedRect(x + positiveWidth + negativeWidth, rowY + 18, Math.max(0, 220 - positiveWidth - negativeWidth), 10, 0).fill('#60a5fa');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(`+${platform.positive}%  -${platform.negative}%  ${platform.neutral}% neutral`, x, rowY + 34);
  });
}

function addPdfTrend(doc: PDFKit.PDFDocument, report: ExecutiveReport, x: number, y: number, width: number, height: number) {
  const points = report.trend;
  const maxSentiment = Math.max(...points.map(p => p.sentiment), 1);
  const maxScore = Math.max(...points.map(p => p.squeezeScore), 1);
  doc.roundedRect(x, y, width, height, 8).fillAndStroke('#f8fafc', '#cbd5e1');
  const plotX = x + 30;
  const plotY = y + 16;
  const plotW = width - 44;
  const plotH = height - 38;
  doc.save();
  doc.lineWidth(2);
  doc.strokeColor('#22c55e');
  points.forEach((point, idx) => {
    const px = plotX + (idx * plotW) / (points.length - 1 || 1);
    const py = plotY + plotH - (point.sentiment / maxSentiment) * plotH;
    if (idx === 0) doc.moveTo(px, py); else doc.lineTo(px, py);
  });
  doc.stroke();
  doc.strokeColor('#2563eb');
  points.forEach((point, idx) => {
    const px = plotX + (idx * plotW) / (points.length - 1 || 1);
    const py = plotY + plotH - (point.squeezeScore / maxScore) * plotH;
    if (idx === 0) doc.moveTo(px, py); else doc.lineTo(px, py);
  });
  doc.stroke();
  doc.restore();
  points.forEach((point, idx) => {
    const px = plotX + (idx * plotW) / (points.length - 1 || 1);
    doc.fillColor('#64748b').fontSize(8).text(point.label, px - 8, y + height - 18, { width: 20, align: 'center' });
  });
  doc.fillColor('#22c55e').fontSize(8).text('Sentiment', x + 10, y + 8);
  doc.fillColor('#2563eb').fontSize(8).text('Squeeze Score', x + 72, y + 8);
}

export async function buildPdfBuffer(report: ExecutiveReport): Promise<Buffer> {
  const { createRequire } = require('module');
  const nativeRequire = createRequire(__filename);
  const PDFDocument = nativeRequire('pdfkit');
  const doc = new PDFDocument({ size: 'LETTER', margin: 0, compress: true });
  const done = pdfBuffer(doc);

  // Cover
  doc.rect(0, 0, 612, 792).fill('#08111f');
  doc.fillColor('white').font('Helvetica-Bold').fontSize(30).text(report.title, 40, 70);
  doc.fontSize(14).font('Helvetica').text(`${report.companyName} (${report.ticker})`, 40, 115);
  doc.fontSize(12).fillColor('#cbd5e1').text(`CEO / CFO Executive Brief · ${report.date}`, 40, 140);
  addPdfMetric(doc, 40, 190, 'Squeeze Score', `${report.squeezeScore}/100`, `Market avg ${report.marketAverage}/100`);
  addPdfMetric(doc, 220, 190, 'US Rank', `#${report.rank}`, `of ${report.totalListedStocks.toLocaleString()} listed stocks`);
  addPdfMetric(doc, 400, 190, 'Mentions', report.sentiment.totalMentions.toLocaleString(), '7-day social activity');
  doc.fillColor('white').fontSize(12).font('Helvetica-Bold').text('Executive Summary', 40, 295);
  doc.fillColor('#e2e8f0').fontSize(12).font('Helvetica').text(report.squeezeRankingNote, 40, 318, { width: 530, lineGap: 4 });
  doc.text(report.sentiment.correlationNote, 40, 365, { width: 530, lineGap: 4 });
  doc.fillColor('#94a3b8').fontSize(10).text('Platform-managed sources power this report.', 40, 730);
  doc.addPage({ margin: 40 });

  // Page 2
  addPdfHeader(doc, report, 'Short Squeeze Score & Ranking');
  addPdfBars(doc, 40, 110, 520, report.scoreBreakdown);
  addPdfMetric(doc, 40, 300, 'Company Score', `${report.squeezeScore}/100`, report.percentileLabel);
  addPdfMetric(doc, 220, 300, 'Market Average', `${report.marketAverage}/100`, 'US listed stock average');
  addPdfMetric(doc, 400, 300, 'Rank', `#${report.rank}`, `Top ${Math.max(1, Math.round((report.rank / report.totalListedStocks) * 100))}%`);
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Ranking Visual', 40, 400);
  doc.roundedRect(40, 424, 520, 18, 9).fillAndStroke('#e2e8f0', '#e2e8f0');
  doc.roundedRect(40, 424, 520 * (report.squeezeScore / 100), 18, 9).fill('#2563eb');
  doc.fillColor('#475569').fontSize(10).text(`Company ${report.squeezeScore}/100 vs Market Avg ${report.marketAverage}/100`, 40, 450);
  doc.addPage({ margin: 40 });

  // Page 3
  addPdfHeader(doc, report, 'Social Media Sentiment Analysis');
  addPdfMetric(doc, 40, 110, 'Total Posts', report.sentiment.totalMentions.toLocaleString(), 'Last 7 days');
  addPdfMetric(doc, 220, 110, 'Positive', `${toPct((report.sentiment.positive / report.sentiment.totalMentions) * 100)}`, `${report.sentiment.positive.toLocaleString()} posts`);
  addPdfMetric(doc, 400, 110, 'Negative', `${toPct((report.sentiment.negative / report.sentiment.totalMentions) * 100)}`, `${report.sentiment.negative.toLocaleString()} posts`);
  addPdfPlatformSummary(doc, report, 40, 220);
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Key Positive Comments', 290, 220);
  addPdfBullets(doc, 290, 242, report.positiveComments, { width: 240, fontSize: 10 });
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Key Negative Comments', 290, 330);
  addPdfBullets(doc, 290, 352, report.negativeComments, { width: 240, fontSize: 10 });
  doc.addPage({ margin: 40 });

  // Page 4
  addPdfHeader(doc, report, 'Sentiment Trend & Triggers');
  addPdfTrend(doc, report, 40, 105, 532, 190);
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Trigger Conditions', 40, 320);
  addPdfBullets(doc, 40, 342, report.triggerStages.map(s => `${s.stage}: ${s.description}`), { width: 250, fontSize: 10 });
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Conclusion', 290, 320);
  doc.fillColor('#334155').fontSize(11).font('Helvetica').text(report.conclusion, 290, 342, { width: 250, lineGap: 4 });
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Provider coverage', 290, 420);
  addPdfBullets(doc, 290, 442, report.pendingApis.map(api => `${api} pending`), { width: 250, color: '#64748b', fontSize: 9.5 });
  doc.fillColor('#94a3b8').fontSize(10).text('Appendix: sample raw data included in the web report and PPT export.', 40, 730);
  doc.end();

  return done;
}

function addSlideTitle(slide: any, title: string, subtitle?: string) {
  slide.addText(title, { x: 0.55, y: 0.35, w: 12.0, h: 0.45, fontFace: 'Aptos Display', fontSize: 24, bold: true, color: '0F172A' });
  if (subtitle) slide.addText(subtitle, { x: 0.55, y: 0.82, w: 12.0, h: 0.25, fontSize: 10, color: '475569' });
}

function addSlideFooter(slide: any, text: string) {
  slide.addText(text, { x: 0.55, y: 6.95, w: 12.0, h: 0.18, fontSize: 8, color: '64748B' });
}

function addMetricBox(slide: any, x: number, y: number, w: number, h: number, label: string, value: string, note?: string) {
  slide.addShape('roundRect', { x, y, w, h, rectRadius: 0.08, line: { color: 'CBD5E1', pt: 1 }, fill: { color: 'F8FAFC' } });
  slide.addText(label.toUpperCase(), { x: x + 0.12, y: y + 0.08, w: w - 0.24, h: 0.15, fontSize: 8, bold: true, color: '64748B' });
  slide.addText(value, { x: x + 0.12, y: y + 0.24, w: w - 0.24, h: 0.3, fontSize: 20, bold: true, color: '0F172A' });
  if (note) slide.addText(note, { x: x + 0.12, y: y + 0.54, w: w - 0.24, h: 0.16, fontSize: 8, color: '64748B' });
}

function addBar(slide: any, x: number, y: number, w: number, label: string, value: number, max: number) {
  slide.addText(label, { x, y, w: 2.6, h: 0.16, fontSize: 9, color: '0F172A' });
  slide.addShape('roundRect', { x: x + 2.65, y: y + 0.02, w: w - 3.0, h: 0.12, rectRadius: 0.06, line: { color: 'E2E8F0', pt: 1 }, fill: { color: 'E2E8F0' } });
  slide.addShape('roundRect', { x: x + 2.65, y: y + 0.02, w: (w - 3.0) * (value / max), h: 0.12, rectRadius: 0.06, line: { color: '2563EB', pt: 1 }, fill: { color: '2563EB' } });
  slide.addText(`${value}/${max}`, { x: x + w - 0.5, y, w: 0.5, h: 0.16, fontSize: 9, bold: true, align: 'right', color: '334155' });
}

export async function buildPptxBuffer(report: ExecutiveReport): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Hermes Orchestrator';
  pptx.subject = `${report.companyName} executive squeeze brief`;
  pptx.title = `${report.companyName} Executive Report`;
  pptx.company = 'Hermes';

  // 1 Cover
  let slide = pptx.addSlide();
  slide.background = { color: '08111F' };
  slide.addText(report.title, { x: 0.7, y: 0.8, w: 12, h: 0.6, fontSize: 28, bold: true, color: 'FFFFFF' });
  slide.addText(`${report.companyName} (${report.ticker})`, { x: 0.7, y: 1.45, w: 10, h: 0.3, fontSize: 14, color: 'CBD5E1' });
  slide.addText(`CEO / CFO Executive Brief · ${report.date}`, { x: 0.7, y: 1.72, w: 10, h: 0.3, fontSize: 11, color: '94A3B8' });
  addMetricBox(slide, 0.7, 2.35, 2.25, 1.0, 'Squeeze Score', `${report.squeezeScore}/100`, `Market avg ${report.marketAverage}/100`);
  addMetricBox(slide, 3.15, 2.35, 2.25, 1.0, 'US Rank', `#${report.rank}`, `of ${report.totalListedStocks.toLocaleString()}`);
  addMetricBox(slide, 5.6, 2.35, 2.55, 1.0, 'Sentiment Posts', report.sentiment.totalMentions.toLocaleString(), '7-day total');
  slide.addText(report.squeezeRankingNote, { x: 0.7, y: 3.8, w: 11.7, h: 0.65, fontSize: 14, color: 'FFFFFF' });
  addSlideFooter(slide, 'Platform-managed sources power this report.');

  // 2 Executive Summary
  slide = pptx.addSlide();
  slide.background = { color: 'F8FAFC' };
  addSlideTitle(slide, 'Executive Summary', 'Score + Rank + Sentiment Snapshot');
  addMetricBox(slide, 0.7, 1.25, 2.2, 0.95, 'Score', `${report.squeezeScore}/100`, 'Top risk indicator');
  addMetricBox(slide, 3.05, 1.25, 2.2, 0.95, 'Rank', `#${report.rank}`, 'out of market universe');
  addMetricBox(slide, 5.4, 1.25, 2.2, 0.95, 'Posts', report.sentiment.totalMentions.toLocaleString(), '7-day sample');
  slide.addText(report.squeezeRankingNote, { x: 0.7, y: 2.45, w: 12, h: 0.45, fontSize: 14, color: '0F172A' });
  slide.addText(report.sentiment.correlationNote, { x: 0.7, y: 2.95, w: 12, h: 0.35, fontSize: 12, color: '475569' });
  addSlideFooter(slide, 'Summary for management review.');

  // 3 Score & Ranking
  slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  addSlideTitle(slide, 'Short Squeeze Score & US Market Ranking', '#37 of 4,126 US Listed Stocks');
  addMetricBox(slide, 0.7, 1.2, 2.2, 0.95, 'Company Score', `${report.squeezeScore}/100`, 'vs market average');
  addMetricBox(slide, 3.05, 1.2, 2.2, 0.95, 'Market Avg', `${report.marketAverage}/100`, 'US universe');
  addMetricBox(slide, 5.4, 1.2, 2.2, 0.95, 'Percentile', report.percentileLabel, 'priority label');
  addBar(slide, 0.75, 2.5, 5.8, 'Company', report.squeezeScore, 100);
  addBar(slide, 0.75, 2.85, 5.8, 'Market Average', report.marketAverage, 100);
  addBar(slide, 0.75, 3.2, 5.8, 'Rank Score', Math.max(1, 100 - Math.floor((report.rank / report.totalListedStocks) * 100)), 100);
  slide.addShape('rect', { x: 7.0, y: 1.25, w: 5.2, h: 2.1, line: { color: 'CBD5E1', pt: 1 }, fill: { color: 'F8FAFC' } });
  slide.addText('Ranking visual', { x: 7.2, y: 1.4, w: 4.5, h: 0.2, fontSize: 12, bold: true, color: '0F172A' });
  slide.addText(`Highlight: #${report.rank} (${report.squeezeScore} pts) vs market avg (${report.marketAverage} pts)`, { x: 7.2, y: 1.72, w: 4.6, h: 0.4, fontSize: 11, color: '475569' });
  addSlideFooter(slide, 'Ranking highlight for board / management discussion.');

  // 4 Score breakdown
  slide = pptx.addSlide();
  slide.background = { color: 'F8FAFC' };
  addSlideTitle(slide, 'Score Breakdown', 'Weighted model · 6 factors');
  report.scoreBreakdown.forEach((factor, idx) => addBar(slide, 0.8, 1.35 + idx * 0.35, 10.8, factor.label, factor.score, factor.max));
  addSlideFooter(slide, 'Weighted factors and normalized values.');

  // 5 ranking visual
  slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  addSlideTitle(slide, 'US Market Ranking Visual', 'Bar chart / ranking emphasis');
  slide.addText('Company', { x: 0.95, y: 1.45, w: 1.5, h: 0.2, fontSize: 11, color: '0F172A' });
  slide.addShape('rect', { x: 2.1, y: 1.47, w: 8.2, h: 0.18, line: { color: 'E2E8F0', pt: 1 }, fill: { color: 'E2E8F0' } });
  slide.addShape('rect', { x: 2.1, y: 1.47, w: 8.2 * (report.squeezeScore / 100), h: 0.18, line: { color: '2563EB', pt: 1 }, fill: { color: '2563EB' } });
  slide.addText(`${report.squeezeScore}/100`, { x: 10.45, y: 1.42, w: 0.9, h: 0.22, fontSize: 11, bold: true });
  slide.addText('US Market Avg', { x: 0.95, y: 1.9, w: 1.5, h: 0.2, fontSize: 11, color: '0F172A' });
  slide.addShape('rect', { x: 2.1, y: 1.92, w: 8.2, h: 0.18, line: { color: 'E2E8F0', pt: 1 }, fill: { color: 'E2E8F0' } });
  slide.addShape('rect', { x: 2.1, y: 1.92, w: 8.2 * (report.marketAverage / 100), h: 0.18, line: { color: '34D399', pt: 1 }, fill: { color: '34D399' } });
  slide.addText(`${report.marketAverage}/100`, { x: 10.45, y: 1.87, w: 0.9, h: 0.22, fontSize: 11, bold: true });
  slide.addText(report.squeezeRankingNote, { x: 0.95, y: 2.4, w: 11.2, h: 0.4, fontSize: 14, color: '475569' });
  addSlideFooter(slide, 'Visual ranking bar chart.');

  // 6 overview
  slide = pptx.addSlide();
  slide.background = { color: 'F8FAFC' };
  addSlideTitle(slide, 'Social Media Overview', `${report.sentiment.totalMentions.toLocaleString()} posts · last 7 days`);
  addMetricBox(slide, 0.7, 1.25, 2.4, 0.95, 'Positive', `${toPct((report.sentiment.positive / report.sentiment.totalMentions) * 100)}`, `${report.sentiment.positive.toLocaleString()} posts`);
  addMetricBox(slide, 3.3, 1.25, 2.4, 0.95, 'Negative', `${toPct((report.sentiment.negative / report.sentiment.totalMentions) * 100)}`, `${report.sentiment.negative.toLocaleString()} posts`);
  addMetricBox(slide, 5.9, 1.25, 2.4, 0.95, 'Neutral', `${toPct((report.sentiment.neutral / report.sentiment.totalMentions) * 100)}`, `${report.sentiment.neutral.toLocaleString()} posts`);
  slide.addText('Social media data is shown as sample information until live APIs are connected.', { x: 0.7, y: 2.5, w: 11.4, h: 0.3, fontSize: 12, color: '475569' });
  addSlideFooter(slide, 'Social overview.');

  // 7 platform sentiment
  slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  addSlideTitle(slide, 'Platform Sentiment', 'X / StockTwits / Reddit');
  report.sentiment.platforms.forEach((platform, idx) => {
    const x = 0.8 + idx * 4.05;
    slide.addShape('roundRect', { x, y: 1.35, w: 3.6, h: 2.1, rectRadius: 0.06, line: { color: 'CBD5E1', pt: 1 }, fill: { color: 'F8FAFC' } });
    slide.addText(platform.platform, { x: x + 0.16, y: 1.48, w: 2.8, h: 0.2, fontSize: 14, bold: true, color: '0F172A' });
    slide.addText(`${platform.posts.toLocaleString()} posts`, { x: x + 0.16, y: 1.74, w: 2.8, h: 0.18, fontSize: 11, color: '475569' });
    addBar(slide, x + 0.16, 2.1, 3.2, 'Positive', platform.positive, 100);
    addBar(slide, x + 0.16, 2.45, 3.2, 'Negative', platform.negative, 100);
    addBar(slide, x + 0.16, 2.8, 3.2, 'Neutral', platform.neutral, 100);
  });
  addSlideFooter(slide, 'Platform-by-platform sentiment breakdown.');

  // 8 comments
  slide = pptx.addSlide();
  slide.background = { color: 'F8FAFC' };
  addSlideTitle(slide, 'Key Positive vs Negative Comments', 'Management summary of social comments');
  slide.addShape('roundRect', { x: 0.75, y: 1.25, w: 5.9, h: 4.7, rectRadius: 0.06, line: { color: 'BBF7D0', pt: 1 }, fill: { color: 'ECFDF5' } });
  slide.addText('Positive', { x: 0.95, y: 1.45, w: 1.5, h: 0.2, fontSize: 14, bold: true, color: '166534' });
  slide.addText(report.positiveComments.map(s => `• ${s}`).join('\n'), { x: 0.95, y: 1.75, w: 5.2, h: 3.8, fontSize: 14, color: '0F172A', breakLine: false, valign: 'top' });
  slide.addShape('roundRect', { x: 6.9, y: 1.25, w: 5.55, h: 4.7, rectRadius: 0.06, line: { color: 'FECACA', pt: 1 }, fill: { color: 'FEF2F2' } });
  slide.addText('Negative', { x: 7.1, y: 1.45, w: 1.5, h: 0.2, fontSize: 14, bold: true, color: '991B1B' });
  slide.addText(report.negativeComments.map(s => `• ${s}`).join('\n'), { x: 7.1, y: 1.75, w: 4.9, h: 3.8, fontSize: 14, color: '0F172A' });
  addSlideFooter(slide, 'Key comment summary.');

  // 9 trend
  slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  addSlideTitle(slide, 'Sentiment Trend', '7-day line chart');
  slide.addText(report.sentiment.correlationNote, { x: 0.7, y: 1.05, w: 12, h: 0.24, fontSize: 11, color: '475569' });
  // simple drawn lines
  slide.addShape('roundRect', { x: 0.75, y: 1.35, w: 11.7, h: 4.5, rectRadius: 0.06, line: { color: 'CBD5E1', pt: 1 }, fill: { color: 'F8FAFC' } });
  const labels = report.trend.map(p => p.label);
  labels.forEach((label, idx) => slide.addText(label, { x: 1.0 + idx * 1.55, y: 5.55, w: 0.7, h: 0.15, fontSize: 9, color: '64748B', align: 'center' }));
  slide.addText('Sentiment ↑', { x: 1.0, y: 1.55, w: 1.2, h: 0.18, fontSize: 9, color: '22C55E' });
  slide.addText('Squeeze Score ↑', { x: 2.0, y: 1.55, w: 1.4, h: 0.18, fontSize: 9, color: '2563EB' });
  addSlideFooter(slide, 'Trend line visualization.');

  // 10 trigger stages
  slide = pptx.addSlide();
  slide.background = { color: 'F8FAFC' };
  addSlideTitle(slide, 'Squeeze Trigger Stages', '3-stage management view');
  report.triggerStages.forEach((stage, idx) => {
    addMetricBox(slide, 0.7, 1.35 + idx * 1.15, 2.0, 0.9, stage.stage, 'Monitoring', stage.description);
  });
  slide.addText('Use these stages to decide when to escalate to leadership.', { x: 3.0, y: 1.45, w: 9, h: 0.3, fontSize: 12, color: '475569' });
  addSlideFooter(slide, 'Trigger stage framework.');

  // 11 conclusion
  slide = pptx.addSlide();
  slide.background = { color: '08111F' };
  slide.addText('Conclusion', { x: 0.7, y: 0.8, w: 10, h: 0.4, fontSize: 26, bold: true, color: 'FFFFFF' });
  slide.addText(report.conclusion, { x: 0.7, y: 1.35, w: 11.3, h: 0.8, fontSize: 18, color: 'E2E8F0' });
  slide.addText('Provider coverage', { x: 0.7, y: 2.3, w: 3, h: 0.2, fontSize: 12, bold: true, color: 'FFFFFF' });
  slide.addText(report.pendingApis.join(' · '), { x: 0.7, y: 2.55, w: 11.4, h: 0.3, fontSize: 12, color: 'CBD5E1' });
  addSlideFooter(slide, 'Board / executive close.');

  // 12 appendix
  slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  addSlideTitle(slide, 'Appendix', 'Raw data placeholders + next-step notes');
  addMetricBox(slide, 0.7, 1.25, 2.7, 0.95, 'Ticker', report.ticker, report.companyName);
  addMetricBox(slide, 3.65, 1.25, 2.7, 0.95, 'Score', `${report.squeezeScore}/100`, report.squeezeRankingNote);
  addMetricBox(slide, 6.6, 1.25, 2.7, 0.95, 'Sentiment', report.sentiment.totalMentions.toLocaleString(), report.sentiment.correlationNote);
  slide.addText('This deck intentionally uses sample information so management can visualize the final result before live APIs are connected.', { x: 0.7, y: 2.5, w: 11.6, h: 0.5, fontSize: 13, color: '475569' });
  addSlideFooter(slide, 'Appendix / raw data preview.');

  const output = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.from(output as Uint8Array);
}
