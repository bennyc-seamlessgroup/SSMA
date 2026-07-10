import { NextResponse } from 'next/server';
import { readManagementHoldingsInputs, saveManagementHoldingInput } from '@/lib/operations/management-holdings-store';
import { normalizeTicker } from '@/lib/ticker-data';

export async function GET(request: Request) {
  try {
    const ticker = normalizeTicker(new URL(request.url).searchParams.get('ticker'));
    const data = await readManagementHoldingsInputs(ticker);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to load management holdings inputs.' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const data = await saveManagementHoldingInput(body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to save management holdings input.' },
      { status: 400 },
    );
  }
}
