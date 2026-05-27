import { NextResponse } from 'next/server';
import { getReportsByTicker } from '@/lib/db';
import { buildReports } from '@/lib/mock-data';

export async function GET(_: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await context.params;
  const reports = getReportsByTicker(ticker);
  return NextResponse.json({ reports: reports.length ? reports : buildReports(ticker), history: reports });
}
