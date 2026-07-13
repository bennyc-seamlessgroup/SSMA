import { NextResponse } from 'next/server';
import { readInternalFloatV2UserInputs } from '@/lib/internal-float';
import { deleteManagementHoldingInput, readManagementHoldingsInputs, saveManagementHoldingInput } from '@/lib/operations/management-holdings-store';
import { normalizeTicker } from '@/lib/ticker-data';

export async function GET(request: Request) {
  try {
    const ticker = normalizeTicker(new URL(request.url).searchParams.get('ticker'));
    const data = await readManagementHoldingsInputs(ticker);
    const internalFloatInputs = await readInternalFloatV2UserInputs('operations', ticker);
    return NextResponse.json({
      ok: true,
      data: {
        ...data,
        workspacePrivateHoldings: internalFloatInputs.privateHoldings,
      },
    });
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
    const ticker = normalizeTicker(body?.ticker);
    const internalFloatInputs = await readInternalFloatV2UserInputs('operations', ticker);
    return NextResponse.json({
      ok: true,
      data: {
        ...data,
        workspacePrivateHoldings: internalFloatInputs.privateHoldings,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to save management holdings input.' },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const ticker = normalizeTicker(url.searchParams.get('ticker'));
    const id = url.searchParams.get('id') ?? '';
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing management holding record id.' }, { status: 400 });
    }
    const data = await deleteManagementHoldingInput(ticker, id);
    const internalFloatInputs = await readInternalFloatV2UserInputs('operations', ticker);
    return NextResponse.json({
      ok: true,
      data: {
        ...data,
        workspacePrivateHoldings: internalFloatInputs.privateHoldings,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to delete management holdings input.' },
      { status: 400 },
    );
  }
}
