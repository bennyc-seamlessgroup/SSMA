import { NextResponse } from 'next/server';
import { readOperationsMarketData, saveOperationsMarketData } from '@/lib/operations/market-data-store';
import { normalizeTicker } from '@/lib/ticker-data';

export async function GET(request: Request) {
  try {
    const ticker = normalizeTicker(new URL(request.url).searchParams.get('ticker'));
    const data = await readOperationsMarketData(ticker);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to load market data.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await saveOperationsMarketData({ ...body, ticker: normalizeTicker(body.ticker) });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to save market data.' },
      { status: 400 },
    );
  }
}
