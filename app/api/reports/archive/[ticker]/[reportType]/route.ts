import { readFile } from 'fs/promises';
import * as path from 'path';
import { normalizeTicker } from '../../../../../../lib/mock-data';

export const runtime = 'nodejs';

const reportFiles: Record<string, string> = {
  '8AM': 'curr-pre-market-sample-report.pdf',
  '1150AM': 'curr-mid-market-sample-report.pdf',
  '7PM': 'curr-post-market-sample-report.pdf',
};

export async function GET(_request: Request, context: { params: Promise<{ ticker: string; reportType: string }> }) {
  const { ticker, reportType } = await context.params;
  const normalizedTicker = normalizeTicker(ticker);
  const fileName = reportFiles[reportType];

  if (normalizedTicker !== 'CURR' || !fileName) {
    return new Response('Archive not found for this workspace.', { status: 404 });
  }

  const filePath = path.join(process.cwd(), 'sample-reports', fileName);
  const pdf = await readFile(filePath);

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${normalizedTicker.toLowerCase()}-${reportType.toLowerCase()}-report.pdf"`,
    },
  });
}
