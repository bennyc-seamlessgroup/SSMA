import { NextResponse } from 'next/server';
import { buildExecutiveReport } from '../../../../../lib/mock-data';
import { buildPptxBuffer } from '../../../../../lib/report-export';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticker = url.searchParams.get('ticker') ?? 'CURR';
  const report = buildExecutiveReport(ticker);
  const pptx = await buildPptxBuffer(report);
  return new Response(new Uint8Array(pptx), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${report.ticker}-executive-report.pptx"`,
    },
  });
}
