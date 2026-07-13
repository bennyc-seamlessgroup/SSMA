import { NextResponse } from 'next/server';
import { readOperationsSecFilings, replaceOperationsSecFilings, saveOperationsSecFiling } from '@/lib/operations/sec-filings-store';
import { normalizeTicker } from '@/lib/ticker-data';

export async function GET(request: Request) {
  try {
    const ticker = normalizeTicker(new URL(request.url).searchParams.get('ticker'));
    const data = await readOperationsSecFilings(ticker);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to load SEC filing records.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await saveOperationsSecFiling({ ...body, ticker: normalizeTicker(body.ticker) });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to save SEC filing record.' },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const records = Array.isArray(body) ? body : Array.isArray(body.records) ? body.records : [];
    const requestedTicker = normalizeTicker(Array.isArray(body) ? records[0]?.ticker : body.ticker);
    if (Array.isArray(body) && records.length === 1) {
      const data = await saveOperationsSecFiling({ ...records[0], ticker: requestedTicker });
      return NextResponse.json({ ok: true, data });
    }
    const data = await replaceOperationsSecFilings(
      records,
      String(Array.isArray(body) ? records[0]?.createdBy ?? 'operations-import' : body.savedBy ?? 'operations-import'),
      requestedTicker,
    );
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to replace SEC filing records.' },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const ticker = normalizeTicker(params.get('ticker'));
    const accessionNumber = String(params.get('accessionNumber') ?? '').trim();
    const id = String(params.get('id') ?? '').trim();

    if (!accessionNumber && !id) {
      return NextResponse.json({ ok: false, error: 'Accession number or record ID is required.' }, { status: 400 });
    }

    const current = await readOperationsSecFilings(ticker);
    const records = current.records.filter(record => {
      if (accessionNumber) return record.accessionNumber !== accessionNumber;
      return record.id !== id;
    });
    const data = await replaceOperationsSecFilings(records, 'operations-delete', ticker);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to delete SEC filing record.' },
      { status: 400 },
    );
  }
}
