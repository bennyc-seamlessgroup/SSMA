import { facebookSocialPrefix, linkedinSocialPrefix, redditSocialPrefix, xSocialPrefix } from '@/lib/ticker-data';

export type PublicSocialPlatform = 'Reddit' | 'X' | 'Facebook' | 'Linkedin';

export type PublicSocialMention = {
  id: string;
  platform: PublicSocialPlatform;
  author: string;
  timestamp: string;
  text: string;
  url: string;
  sentiment_label: string;
  sentiment_score: null;
  followers?: number | null;
  likes?: number | null;
  retweets?: number | null;
  upvotes?: number | null;
  subreddit?: string;
  source_key: string;
  source_last_modified: string;
};

type S3Object = {
  key: string;
  lastModified: string;
  etag: string;
  size: number;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const bucketListBase = 'https://data-sync-platform-website-data.s3.amazonaws.com';
const bucketObjectBase = 'https://data-sync-platform-website-data.s3.us-east-1.amazonaws.com';
const cacheMs = 30_000;
const listCache = new Map<string, CacheEntry<S3Object[]>>();
const mentionsCache = new Map<string, CacheEntry<PublicSocialMention[]>>();

function stableVersion(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function tagValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? decodeXml(match[1]) : '';
}

function objectUrl(key: string) {
  return `${bucketObjectBase}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

function stableObjectId(platform: PublicSocialPlatform, sourceKey: string, index: number) {
  return `${platform.toLowerCase()}-${sourceKey.replace(/[^a-zA-Z0-9]+/g, '-')}-${index}`;
}

function numeric(value: unknown) {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTwitterFollowers(author: string) {
  const match = author.match(/:\s*([\d,]+)\s+followers/i);
  return match ? numeric(match[1]) : null;
}

function cleanTwitterAuthor(author: string) {
  return author.replace(/\s*:\s*[\d,]+\s+followers\s*$/i, '').trim();
}

function cleanAuthor(platform: PublicSocialPlatform, author: string) {
  return platform === 'X' ? cleanTwitterAuthor(author) : author;
}

function payloadRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object');
  }
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.data)) return payloadRows(record.data);
  if (Array.isArray(record.mentions)) return payloadRows(record.mentions);
  if (Array.isArray(record.records)) return payloadRows(record.records);
  return [record];
}

export function normalizePublicSocialPayload(
  platform: PublicSocialPlatform,
  sourceKey: string,
  sourceLastModified: string,
  payload: unknown,
): PublicSocialMention[] {
  return payloadRows(payload).map((row, index) => {
  const payload = row;
  const author = String(payload.author ?? '').trim();
  return {
    id: String(payload.id ?? stableObjectId(platform, sourceKey, index)),
    platform,
    author: cleanAuthor(platform, author),
    timestamp: String(payload.datetime ?? payload.timestamp ?? payload.created_utc ?? sourceLastModified ?? ''),
    text: String(payload.content ?? payload.text ?? payload.text_snippet ?? ''),
    url: String(payload.link ?? payload.url ?? payload.content_source_url ?? ''),
    sentiment_label: String(payload.sentiment ?? payload.sentiment_label ?? payload.sentiment_score ?? 'neutral').toLowerCase(),
    sentiment_score: null,
    followers: numeric(payload.followers) ?? (platform === 'X' ? parseTwitterFollowers(author) : null),
    likes: numeric(payload.likes),
    retweets: numeric(payload.retweets),
    upvotes: numeric(payload.upvotes),
    subreddit: String(payload.subreddit ?? ''),
    source_key: sourceKey,
    source_last_modified: sourceLastModified,
  };
  });
}

export async function listPublicSocialObjects(prefix: string): Promise<S3Object[]> {
  const cached = listCache.get(prefix);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const objects: S3Object[] = [];
  let continuationToken = '';

  do {
    const params = new URLSearchParams({ 'list-type': '2', prefix });
    if (continuationToken) params.set('continuation-token', continuationToken);
    const response = await fetch(`${bucketListBase}/?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Unable to list public social S3 prefix ${prefix}: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    const contents = xml.match(/<Contents>[\s\S]*?<\/Contents>/g) ?? [];
    objects.push(...contents.map(item => ({
      key: tagValue(item, 'Key'),
      lastModified: tagValue(item, 'LastModified'),
      etag: tagValue(item, 'ETag').replace(/^"|"$/g, ''),
      size: Number(tagValue(item, 'Size')) || 0,
    })).filter(item => item.key.endsWith('.json')));
    continuationToken = tagValue(xml, 'NextContinuationToken');
  } while (continuationToken);

  objects.sort((a, b) => Date.parse(b.lastModified) - Date.parse(a.lastModified));
  listCache.set(prefix, { expiresAt: Date.now() + cacheMs, value: objects });
  return objects;
}

export async function readPublicSocialMentions(prefix: string, platform: PublicSocialPlatform): Promise<PublicSocialMention[]> {
  const cacheKey = `${platform}:${prefix}`;
  const cached = mentionsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const objects = await listPublicSocialObjects(prefix);
  const settled = await Promise.allSettled(objects.map(async item => {
    const response = await fetch(objectUrl(item.key), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Unable to fetch ${item.key}`);
    const payload = await response.json() as unknown;
    return normalizePublicSocialPayload(platform, item.key, item.lastModified, payload);
  }));

  const mentions = settled
    .filter((result): result is PromiseFulfilledResult<PublicSocialMention[]> => result.status === 'fulfilled')
    .flatMap(result => result.value)
    .filter(item => item.text || item.url || item.author)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  mentionsCache.set(cacheKey, { expiresAt: Date.now() + cacheMs, value: mentions });
  return mentions;
}

export async function publicSocialPrefixVersion(prefix: string) {
  const objects = await listPublicSocialObjects(prefix);
  const latest = objects.reduce((current, item) => {
    const time = Date.parse(item.lastModified);
    return Number.isFinite(time) && time > current ? time : current;
  }, 0);
  return {
    prefix,
    updatedAt: latest ? new Date(latest).toISOString() : null,
    version: stableVersion(objects.map(item => `${item.key}:${item.etag || item.lastModified || item.size}`).join('|')),
    count: objects.length,
  };
}

export function getPublicSocialPrefixes(ticker: string) {
  return {
    reddit: redditSocialPrefix(ticker),
    x: xSocialPrefix(ticker),
    facebook: facebookSocialPrefix(ticker),
    linkedin: linkedinSocialPrefix(ticker),
  } as const;
}
