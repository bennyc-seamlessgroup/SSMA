import { NextResponse } from 'next/server';
import { buildDashboardWithFintel } from '@/lib/fintel-provider';

export async function GET(_: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await context.params;
  return NextResponse.json({ dashboard: await buildDashboardWithFintel(ticker) });
}
