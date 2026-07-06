import { NextResponse } from 'next/server';
import { getImportFileStatus, listImportDataFiles, readImportJson } from '@/lib/import-data';
import {
  getPublicSocialPrefixes,
  normalizePublicSocialPayload,
  type PublicSocialMention,
  type PublicSocialPlatform,
} from '@/lib/social-s3-data';
import { normalizeTicker } from '@/lib/ticker-data';

export const dynamic = 'force-dynamic';

async function readPlatform(prefix: string, platform: PublicSocialPlatform) {
  const files = (await listImportDataFiles()).filter(file => file.startsWith(prefix) && file.endsWith('.json'));
  const settled = await Promise.allSettled(files.map(async file => {
    const [payload, status] = await Promise.all([
      readImportJson<unknown>(file),
      getImportFileStatus(file),
    ]);
    return normalizePublicSocialPayload(platform, file, status.updatedAt ?? '', payload);
  }));

  return settled
    .filter((result): result is PromiseFulfilledResult<PublicSocialMention[]> => result.status === 'fulfilled')
    .flatMap(result => result.value)
    .filter(item => item.text || item.url || item.author)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

export async function GET(request: Request) {
  try {
    const ticker = normalizeTicker(new URL(request.url).searchParams.get('ticker'));
    const prefixes = getPublicSocialPrefixes(ticker);
    const [reddit, x] = await Promise.all([
      readPlatform(prefixes.reddit, 'Reddit'),
      readPlatform(prefixes.x, 'X'),
    ]);

    return NextResponse.json({ reddit, x }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    return NextResponse.json({
      reddit: [],
      x: [],
      error: error instanceof Error ? error.message : 'Unable to load social data.',
    }, { status: 500 });
  }
}
