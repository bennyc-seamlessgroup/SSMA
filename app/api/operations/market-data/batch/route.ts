import { NextResponse } from 'next/server';
import { saveOperationsMarketDataBatch } from '@/lib/operations/market-data-store';
import { normalizeTicker } from '@/lib/ticker-data';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const ticker = normalizeTicker(String(formData.get('ticker') ?? new URL(request.url).searchParams.get('ticker') ?? 'CURR'));

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'CSV file is required.' }, { status: 400 });
    }

    const data = await saveOperationsMarketDataBatch(await file.text(), ticker);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to upload market data CSV.' },
      { status: 400 },
    );
  }
}
