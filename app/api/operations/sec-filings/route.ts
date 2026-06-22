import { NextResponse } from 'next/server';
import { readOperationsSecFilings, replaceOperationsSecFilings, saveOperationsSecFiling } from '@/lib/operations/sec-filings-store';

export async function GET() {
  try {
    const data = await readOperationsSecFilings();
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
    const data = await saveOperationsSecFiling(body);
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
    const records = Array.isArray(body.records) ? body.records : [];
    const data = await replaceOperationsSecFilings(records, String(body.savedBy ?? 'operations-import'));
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to replace SEC filing records.' },
      { status: 400 },
    );
  }
}
