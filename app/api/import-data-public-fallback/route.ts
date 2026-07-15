import { NextResponse } from 'next/server';
import { readImportJson } from '@/lib/import-data';

const maxFilesPerRequest = 12;

function validImportPath(value: string) {
  return value.length > 0
    && value.length <= 240
    && !value.includes('..')
    && value.startsWith('social/')
    && /^[a-zA-Z0-9_./%+-]+\.json$/.test(value);
}

export async function GET(request: Request) {
  const files = Array.from(new Set(new URL(request.url).searchParams.getAll('file')));
  if (!files.length || files.length > maxFilesPerRequest || files.some(file => !validImportPath(file))) {
    return NextResponse.json({ error: 'Invalid import data file request.' }, { status: 400 });
  }

  const entries = await Promise.all(files.map(async file => {
    try {
      return [file, await readImportJson(file)] as const;
    } catch {
      return [file, null] as const;
    }
  }));

  return NextResponse.json({ files: Object.fromEntries(entries) }, {
    headers: {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
    },
  });
}
