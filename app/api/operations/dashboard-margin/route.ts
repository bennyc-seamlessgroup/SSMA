import { NextResponse } from 'next/server';
import { readDashboardMargins, saveDashboardMargin } from '@/lib/operations/dashboard-margin-store';

export async function GET() {
  try {
    const data = await readDashboardMargins();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to load dashboard margin records.' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const data = await saveDashboardMargin(body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to save dashboard margin record.' },
      { status: 400 },
    );
  }
}
