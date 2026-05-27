import { NextResponse } from 'next/server';
import { getRecipientsByTicker } from '@/lib/db';

export async function GET(_: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await context.params;
  return NextResponse.json({ recipients: getRecipientsByTicker(ticker) });
}
