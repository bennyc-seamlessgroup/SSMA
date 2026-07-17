import type { ReportArchiveRecord } from '@/lib/report-archive';

declare global {
  interface Window {
    __REPORT_READY__?: boolean;
  }
}

const TEMPLATE_URL = '/report-templates/daily-close/template.html';
const TEMPLATE_STYLES_URL = '/report-templates/daily-close/styles.css';

function waitForReport(iframe: HTMLIFrameElement) {
  return new Promise<Document>((resolve, reject) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const frameWindow = iframe.contentWindow;
      const frameDocument = iframe.contentDocument;

      if (frameWindow?.__REPORT_READY__ && frameDocument?.querySelectorAll('.page').length) {
        window.clearInterval(timer);
        resolve(frameDocument);
        return;
      }

      if (Date.now() - startedAt > 30_000) {
        window.clearInterval(timer);
        reject(new Error('The report template did not finish loading.'));
      }
    }, 100);
  });
}

export async function generateClientReportPdf(report: ReportArchiveRecord) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const params = new URLSearchParams({
    data: report.dataUrl,
    ticker: report.ticker,
    reportDate: report.reportDate,
    generatedAt: report.generatedAt,
  });
  const iframe = document.createElement('iframe');
  iframe.title = 'Daily market close report renderer';
  iframe.src = `${TEMPLATE_URL}?${params.toString()}`;
  iframe.style.position = 'fixed';
  iframe.style.left = '-100000px';
  iframe.style.top = '0';
  iframe.style.width = '1240px';
  iframe.style.height = '1754px';
  iframe.style.border = '0';
  iframe.style.pointerEvents = 'none';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  try {
    const frameDocument = await waitForReport(iframe);
    await frameDocument.fonts?.ready;
    const stylesheet = await fetch(TEMPLATE_STYLES_URL, { cache: 'no-store' });
    if (!stylesheet.ok) throw new Error('The report stylesheet could not be loaded.');
    const inlineStyles = frameDocument.createElement('style');
    inlineStyles.dataset.reportPdfStyles = 'true';
    inlineStyles.textContent = await stylesheet.text();
    frameDocument.head.appendChild(inlineStyles);
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    const pages = Array.from(frameDocument.querySelectorAll<HTMLElement>('.page'));
    if (!pages.length) throw new Error('The report template contains no printable pages.');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    for (let index = 0; index < pages.length; index += 1) {
      const canvas = await html2canvas(pages[index], {
        backgroundColor: '#ffffff',
        scale: 1.35,
        useCORS: true,
        logging: false,
        windowWidth: 1240,
        windowHeight: 1754,
      });
      if (index > 0) pdf.addPage('a4', 'portrait');
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    return pdf.output('blob');
  } finally {
    iframe.remove();
  }
}

export function reportFileName(report: ReportArchiveRecord) {
  return `${report.ticker}-${report.reportDate}-post-market-digest.pdf`;
}
