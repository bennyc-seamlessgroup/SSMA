import { NextResponse } from 'next/server';
import { getImportDataVersion } from '@/lib/import-data-version';
import { getImportFileStatus } from '@/lib/import-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');

  return NextResponse.json(file ? await getImportFileStatus(file) : await getImportDataVersion(), {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
