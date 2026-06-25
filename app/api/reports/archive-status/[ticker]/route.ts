import { NextResponse } from 'next/server';
import { listReportArchive } from '@/lib/report-archive';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await context.params;
  const reports = await listReportArchive(ticker);
  const latestUpdatedAt = reports.reduce((latest, report) => {
    const time = Date.parse(report.generatedAt);
    return Number.isFinite(time) ? Math.max(latest, time) : latest;
  }, 0);
  const version = reports
    .map(report => `${report.dataKey}:${report.generatedAt}:${report.sizeBytes}`)
    .join('|');

  return NextResponse.json({
    ticker: ticker.toUpperCase(),
    count: reports.length,
    updatedAt: latestUpdatedAt ? new Date(latestUpdatedAt).toISOString() : null,
    version: version || 'empty',
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
