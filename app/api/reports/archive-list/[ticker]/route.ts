import { NextResponse } from 'next/server';
import { listReportArchive } from '@/lib/report-archive';
import { normalizeTicker } from '@/lib/ticker-data';

export async function GET(_request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await context.params;
  try {
    const reports = await listReportArchive(normalizeTicker(ticker));
    return NextResponse.json({ reports }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unable to load report archive.',
    }, { status: 502 });
  }
}
