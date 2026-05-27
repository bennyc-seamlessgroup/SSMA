import { NextResponse } from 'next/server';
import { buildReports } from '@/lib/mock-data';
import { upsertReports } from '@/lib/db';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ticker = String(body.ticker ?? 'CURR').toUpperCase();
  const reports = buildReports(ticker);
  upsertReports(ticker, reports);
  return NextResponse.json({ ok: true, ticker, reports });
}
