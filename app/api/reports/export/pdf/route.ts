import { NextResponse } from 'next/server';
import { buildExecutiveReport } from '../../../../../lib/mock-data';
import { buildPdfBuffer } from '../../../../../lib/report-export';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticker = url.searchParams.get('ticker') ?? 'CURR';
  const report = buildExecutiveReport(ticker);
  const pdf = await buildPdfBuffer(report);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${report.ticker}-executive-report.pdf"`,
    },
  });
}
