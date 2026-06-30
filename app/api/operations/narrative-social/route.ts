import { NextResponse } from 'next/server';
import {
  readAllSocialMentionsForOperations,
  replaceSocialMentionsFromCsv,
  type SocialPlatform,
} from '@/lib/operations/social-mentions-store';
import { normalizeTicker } from '@/lib/ticker-data';

const platforms = ['x', 'reddit', 'stocktwits'] as const;
const uploadablePlatforms = ['stocktwits'] as const;

function isPlatform(value: string): value is SocialPlatform {
  return platforms.includes(value as SocialPlatform);
}

export async function GET(request: Request) {
  try {
    const ticker = normalizeTicker(new URL(request.url).searchParams.get('ticker'));
    return NextResponse.json({ ok: true, data: await readAllSocialMentionsForOperations(ticker) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to read narrative social data.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const ticker = normalizeTicker(formData.get('ticker'));
    const updated: Record<string, unknown> = {};

    for (const platform of uploadablePlatforms) {
      const file = formData.get(platform);
      if (!(file instanceof File)) continue;

      const csvText = await file.text();
      updated[platform] = await replaceSocialMentionsFromCsv(platform, csvText, file.name, ticker);
    }

    const platform = formData.get('platform');
    const csvText = formData.get('csvText');
    if (typeof platform === 'string' && platform === 'stocktwits' && isPlatform(platform) && typeof csvText === 'string') {
      updated[platform] = await replaceSocialMentionsFromCsv(platform, csvText, String(formData.get('fileName') ?? 'manual-upload.csv'), ticker);
    }

    if (!Object.keys(updated).length) {
      return NextResponse.json({ ok: false, error: 'No valid CSV files were attached.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: await readAllSocialMentionsForOperations(ticker), updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unable to upload narrative social CSV files.' },
      { status: 400 },
    );
  }
}
