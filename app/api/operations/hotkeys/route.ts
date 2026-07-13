import { NextResponse } from 'next/server';
import { deleteOperationsHotkey, readOperationsHotkeys, saveOperationsHotkey } from '@/lib/operations/hotkeys-store';
import { normalizeTicker } from '@/lib/ticker-data';

export async function GET(request: Request) {
  try {
    const ticker = normalizeTicker(new URL(request.url).searchParams.get('ticker'));
    const data = await readOperationsHotkeys(ticker);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to load hotkey mappings.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await saveOperationsHotkey({ ...body, ticker: normalizeTicker(body.ticker) });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to save hotkey mapping.' },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const ticker = normalizeTicker(params.get('ticker'));
    const kwatchHotkey = String(params.get('kwatchHotkey') ?? '').trim();
    if (!kwatchHotkey) {
      return NextResponse.json({ ok: false, error: 'Hotkey is required.' }, { status: 400 });
    }
    const data = await deleteOperationsHotkey(ticker, kwatchHotkey);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to delete hotkey mapping.' },
      { status: 400 },
    );
  }
}
