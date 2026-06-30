import { getImportFileStatus } from '@/lib/import-data';
import { getPublicSocialPrefixes, publicSocialPrefixVersion } from '@/lib/social-s3-data';
import { normalizeTicker, stocktwitsFile } from '@/lib/ticker-data';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const ticker = normalizeTicker(new URL(request.url).searchParams.get('ticker'));
    const publicSocialPrefixes = getPublicSocialPrefixes(ticker);
    const [reddit, x, stocktwits] = await Promise.all([
      publicSocialPrefixVersion(publicSocialPrefixes.reddit).catch(() => null),
      publicSocialPrefixVersion(publicSocialPrefixes.x).catch(() => null),
      getImportFileStatus(stocktwitsFile(ticker)).catch(() => null),
    ]);

    const updatedAtValues = [
      reddit?.updatedAt,
      x?.updatedAt,
      stocktwits?.updatedAt,
    ].filter((value): value is string => Boolean(value));

    const latestMs = updatedAtValues.reduce((latest, value) => {
      const time = Date.parse(value);
      return Number.isFinite(time) ? Math.max(latest, time) : latest;
    }, 0);

    return NextResponse.json({
      updatedAt: latestMs ? new Date(latestMs).toISOString() : null,
      version: [
        `reddit:${reddit?.version ?? 'unavailable'}`,
        `x:${x?.version ?? 'unavailable'}`,
        `stocktwits:${stocktwits?.versionKey ?? stocktwits?.updatedAt ?? 'missing'}`,
      ].join('|'),
      sources: { reddit, x, stocktwits },
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    return NextResponse.json(
      { updatedAt: null, version: 'social:unavailable', error: error instanceof Error ? error.message : 'Unable to load social data status.' },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}
