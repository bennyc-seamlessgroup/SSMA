import { getImportFileStatus, getLocalImportFileUpdatedAt, readLocalImportText } from '@/lib/import-data';
import { publicSocialPrefixes, publicSocialPrefixVersion } from '@/lib/social-s3-data';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function localSocialVersion(path: string, label: string) {
  try {
    const content = readLocalImportText(path);
    const updatedAtMs = getLocalImportFileUpdatedAt(path);
    return {
      prefix: label,
      updatedAt: new Date(updatedAtMs).toISOString(),
      version: `${label}:local:${updatedAtMs}:${content.length}`,
      count: 1,
      source: 'local-fallback',
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const [reddit, x, stocktwits] = await Promise.all([
      publicSocialPrefixVersion(publicSocialPrefixes.reddit).catch(() => localSocialVersion('social/reddit_CURR_mentions.json', publicSocialPrefixes.reddit)),
      publicSocialPrefixVersion(publicSocialPrefixes.x).catch(() => localSocialVersion('social/x_CURR_mentions.json', publicSocialPrefixes.x)),
      getImportFileStatus('social/stocktwits_CURR_mentions.json').catch(() => null),
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
