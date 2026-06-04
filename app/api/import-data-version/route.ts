import { NextResponse } from 'next/server';
import { getImportDataVersion } from '@/lib/import-data-version';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getImportDataVersion(), {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
