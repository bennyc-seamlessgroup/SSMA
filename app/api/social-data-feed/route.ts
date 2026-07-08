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

type SocialPrefixPayload = {
  prefixes?: Partial<Record<'reddit' | 'x' | 'facebook' | 'linkedin', string[]>>;
};

function normalizePrefixes(values: unknown, fallback: string) {
  if (!Array.isArray(values)) return [fallback];
  const cleaned = values
    .map(value => String(value ?? '').trim().replace(/^\/+/, ''))
    .filter(Boolean)
    .map(value => value.startsWith('social-data/') ? value : `social-data/${value}`);
  return Array.from(new Set([fallback, ...cleaned]));
}

async function readPlatform(prefixes: string[], platform: PublicSocialPlatform) {
  const files = (await listImportDataFiles()).filter(file => (
    file.endsWith('.json') && prefixes.some(prefix => file.startsWith(prefix))
  ));
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
    const [reddit, x, facebook, linkedin] = await Promise.all([
      readPlatform([prefixes.reddit], 'Reddit'),
      readPlatform([prefixes.x], 'X'),
      readPlatform([prefixes.facebook], 'Facebook'),
      readPlatform([prefixes.linkedin], 'Linkedin'),
    ]);

    return NextResponse.json({ reddit, x, facebook, linkedin }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    return NextResponse.json({
      reddit: [],
      x: [],
      facebook: [],
      linkedin: [],
      error: error instanceof Error ? error.message : 'Unable to load social data.',
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ticker = normalizeTicker(new URL(request.url).searchParams.get('ticker'));
    const defaults = getPublicSocialPrefixes(ticker);
    const payload = await request.json().catch(() => ({})) as SocialPrefixPayload;
    const requested = payload.prefixes ?? {};
    const prefixes = {
      reddit: normalizePrefixes(requested.reddit, defaults.reddit),
      x: normalizePrefixes(requested.x, defaults.x),
      facebook: normalizePrefixes(requested.facebook, defaults.facebook),
      linkedin: normalizePrefixes(requested.linkedin, defaults.linkedin),
    };
    const [reddit, x, facebook, linkedin] = await Promise.all([
      readPlatform(prefixes.reddit, 'Reddit'),
      readPlatform(prefixes.x, 'X'),
      readPlatform(prefixes.facebook, 'Facebook'),
      readPlatform(prefixes.linkedin, 'Linkedin'),
    ]);

    return NextResponse.json({ reddit, x, facebook, linkedin }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    return NextResponse.json({
      reddit: [],
      x: [],
      facebook: [],
      linkedin: [],
      error: error instanceof Error ? error.message : 'Unable to load social data.',
    }, { status: 500 });
  }
}
