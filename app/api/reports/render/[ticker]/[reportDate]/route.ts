import { createServer } from 'http';
import { readFile } from 'fs/promises';
import * as path from 'path';
import { chromium } from 'playwright';
import { reportDataUrl } from '@/lib/report-archive';
import { reportFooterDisclaimer, reportFullDisclaimer } from '@/lib/legal/disclaimers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const templateRoot = path.join(process.cwd(), 'Report Templates', 'currenc-closing-digest-report-demo');

function contentTypeFor(filePath: string) {
  const ext = path.extname(filePath);
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

async function fetchReportData(ticker: string, reportDate: string) {
  const response = await fetch(reportDataUrl(ticker, reportDate), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to load report data for ${ticker} ${reportDate}: ${response.status} ${response.statusText}`);
  }
  const payload = await response.json() as Record<string, unknown>;
  return JSON.stringify({
    ...payload,
    legalDisclaimers: {
      footer: reportFooterDisclaimer,
      full: reportFullDisclaimer,
    },
  });
}

async function createTemplateServer(reportDataJson: string) {
  const server = createServer(async (request, response) => {
    try {
      const urlPath = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
      if (urlPath === '/report-data.json') {
        response.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        response.end(reportDataJson);
        return;
      }

      const filePath = path.resolve(templateRoot, urlPath === '/' ? 'template.html' : `.${urlPath}`);
      if (!filePath.startsWith(templateRoot)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      const content = await readFile(filePath);
      response.writeHead(200, {
        'Content-Type': contentTypeFor(filePath),
        'Cache-Control': 'no-store',
      });
      response.end(content);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return server;
}

export async function GET(request: Request, context: { params: Promise<{ ticker: string; reportDate: string }> }) {
  const { ticker, reportDate } = await context.params;
  const normalizedTicker = ticker.toUpperCase();
  const reportDataJson = await fetchReportData(normalizedTicker, reportDate);
  const templateServer = await createTemplateServer(reportDataJson);
  const address = templateServer.address();
  const port = typeof address === 'object' && address ? address.port : null;

  if (!port) {
    templateServer.close();
    return new Response('Unable to start report renderer.', { status: 500 });
  }

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
    await page.goto(`http://127.0.0.1:${port}/template.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction('window.__REPORT_READY__ === true', { timeout: 30000 });
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    const url = new URL(request.url);
    const shouldDownload = url.searchParams.get('download') === '1';
    const dispositionType = shouldDownload ? 'attachment' : 'inline';
    const filename = `${normalizedTicker.toLowerCase()}-${reportDate}-post-market-report.pdf`;

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${dispositionType}; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } finally {
    if (browser) await browser.close();
    templateServer.close();
  }
}
