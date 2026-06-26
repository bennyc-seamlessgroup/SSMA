import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type SocialPlatform = 'x' | 'reddit' | 'stocktwits';

export type SocialMentionRecord = {
  id: string;
  platform: 'X' | 'Reddit' | 'Stocktwits';
  author: string;
  timestamp: string;
  text: string;
  url: string;
  sentiment_label: string;
  sentiment_score: number | null;
  catalyst_tag: string;
  followers?: number | null;
  likes?: number | null;
  retweets?: number | null;
  reshares?: number | null;
  upvotes?: number | null;
  subreddit?: string;
  post_id?: string;
  comment_id?: string;
  source_row: Record<string, string>;
};

export type SocialMentionsFile = {
  source: 'operations_csv_upload';
  schemaVersion: 1;
  ticker: 'CURR';
  platform: SocialMentionRecord['platform'];
  updatedAt: string;
  recordCount: number;
  originalFileName: string;
  data: SocialMentionRecord[];
};

const platformConfig = {
  x: {
    label: 'X' as const,
    path: path.join(process.cwd(), 'import_data', 'social', 'x_CURR_mentions.json'),
    importPath: 'social/x_CURR_mentions.json',
  },
  reddit: {
    label: 'Reddit' as const,
    path: path.join(process.cwd(), 'import_data', 'social', 'reddit_CURR_mentions.json'),
    importPath: 'social/reddit_CURR_mentions.json',
  },
  stocktwits: {
    label: 'Stocktwits' as const,
    path: path.join(process.cwd(), 'import_data', 'social', 'stocktwits_CURR_mentions.json'),
    importPath: 'social/stocktwits_CURR_mentions.json',
  },
} satisfies Record<SocialPlatform, { label: SocialMentionRecord['platform']; path: string; importPath: string }>;

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function numeric(value: unknown): number | null {
  const text = normalizeText(value).replace(/,/g, '');
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeHeader(value: string) {
  return value.trim().replace(/^\uFEFF/, '');
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);

  if (!rows.length) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, normalizeText(values[index])])) as Record<string, string>);
}

function sentimentScore(row: Record<string, string>) {
  return numeric(row['sentiment_score (AI)'] ?? row.sentiment_score);
}

function catalystTag(row: Record<string, string>) {
  return normalizeText(row['analysis_catalyst_tag (AI)'] ?? row.analysis_catalyst_tag);
}

function stableId(platform: SocialPlatform, row: Record<string, string>, fallbackIndex: number) {
  const candidate = row.tweet_id || row.post_id || row.comment_id || row.messages__id || row.id;
  if (candidate) return `${platform}-${candidate}`;

  const source = [
    platform,
    row.author || row.user__username,
    row.created_utc,
    row.content_source_url,
    row.text_snippet,
    fallbackIndex,
  ].join('|');
  return `${platform}-${crypto.createHash('sha256').update(source).digest('hex').slice(0, 16)}`;
}

function normalizeDate(value: string) {
  const trimmed = normalizeText(value);
  if (!trimmed) return '';
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
}

function normalizeRecord(platform: SocialPlatform, row: Record<string, string>, index: number): SocialMentionRecord {
  const config = platformConfig[platform];
  const common = {
    id: stableId(platform, row, index),
    platform: config.label,
    author: normalizeText(row.author || row.user__username),
    timestamp: normalizeDate(row.created_utc),
    text: normalizeText(row.text_snippet),
    url: normalizeText(row.content_source_url),
    sentiment_label: normalizeText(row.sentiment_label),
    sentiment_score: sentimentScore(row),
    catalyst_tag: catalystTag(row),
    source_row: row,
  };

  if (platform === 'x') {
    return {
      ...common,
      followers: numeric(row.Follwers ?? row.followers),
      likes: numeric(row.likes),
      retweets: numeric(row.retweets),
    };
  }

  if (platform === 'reddit') {
    return {
      ...common,
      subreddit: normalizeText(row.subreddit),
      post_id: normalizeText(row.post_id),
      comment_id: normalizeText(row.comment_id),
      upvotes: numeric(row.upvotes),
    };
  }

  return {
    ...common,
    followers: numeric(row.user__followers),
    likes: numeric(row.likes),
    reshares: numeric(row.Reshares ?? row.reshares),
  };
}

export function platformImportPath(platform: SocialPlatform) {
  return platformConfig[platform].importPath;
}

export function localSocialMentionsPath(platform: SocialPlatform) {
  return platformConfig[platform].path;
}

export function parseSocialMentionsCsv(platform: SocialPlatform, csvText: string, originalFileName = ''): SocialMentionsFile {
  const records = parseCsv(csvText)
    .map((row, index) => normalizeRecord(platform, row, index))
    .filter(record => record.text || record.url || record.author);

  return {
    source: 'operations_csv_upload',
    schemaVersion: 1,
    ticker: 'CURR',
    platform: platformConfig[platform].label,
    updatedAt: new Date().toISOString(),
    recordCount: records.length,
    originalFileName,
    data: records,
  };
}

export function readSocialMentions(platform: SocialPlatform): SocialMentionsFile {
  const config = platformConfig[platform];
  if (!fs.existsSync(config.path)) {
    return {
      source: 'operations_csv_upload',
      schemaVersion: 1,
      ticker: 'CURR',
      platform: config.label,
      updatedAt: '',
      recordCount: 0,
      originalFileName: '',
      data: [],
    };
  }
  return JSON.parse(fs.readFileSync(config.path, 'utf8')) as SocialMentionsFile;
}

function shouldUseS3() {
  return process.env.IMPORT_DATA_SOURCE === 's3' && Boolean(process.env.AWS_S3_BUCKET_NAME);
}

function s3Config() {
  const region = process.env.AWS_REGION?.trim() || 'us-east-1';
  const bucket = process.env.AWS_S3_BUCKET_NAME?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 social upload requires AWS_REGION, AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.');
  }
  return { region, bucket, accessKeyId, secretAccessKey };
}

function awsEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeS3Key(key: string) {
  return key.split('/').map(awsEncode).join('/');
}

function formatAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function hmac(key: crypto.BinaryLike, value: string) {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest();
}

function sha256Hex(value: string) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function signingKey(secretAccessKey: string, dateStamp: string, region: string) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
}

async function signedS3Request(method: 'GET' | 'PUT', key: string, body = '') {
  const { region, bucket, accessKeyId, secretAccessKey } = s3Config();
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const canonicalUri = `/${encodeS3Key(key)}`;
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [method, canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');
  const signature = crypto.createHmac('sha256', signingKey(secretAccessKey, dateStamp, region)).update(stringToSign, 'utf8').digest('hex');

  return fetch(`https://${host}${canonicalUri}`, {
    method,
    cache: 'no-store',
    body: method === 'PUT' ? body : undefined,
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'content-type': 'application/json',
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
  });
}

function blankSocialMentions(platform: SocialPlatform): SocialMentionsFile {
  return {
    source: 'operations_csv_upload',
    schemaVersion: 1,
    ticker: 'CURR',
    platform: platformConfig[platform].label,
    updatedAt: '',
    recordCount: 0,
    originalFileName: '',
    data: [],
  };
}

async function readS3SocialMentions(platform: SocialPlatform): Promise<SocialMentionsFile> {
  const response = await signedS3Request('GET', platformImportPath(platform));
  if (response.status === 404) return blankSocialMentions(platform);
  if (!response.ok) throw new Error(`Unable to read ${platformImportPath(platform)} from S3: ${response.status} ${response.statusText}`);
  return await response.json() as SocialMentionsFile;
}

async function writeS3SocialMentions(platform: SocialPlatform, file: SocialMentionsFile) {
  const response = await signedS3Request('PUT', platformImportPath(platform), `${JSON.stringify(file, null, 2)}\n`);
  if (!response.ok) throw new Error(`Unable to write ${platformImportPath(platform)} to S3: ${response.status} ${response.statusText}`);
}

export async function readSocialMentionsForOperations(platform: SocialPlatform): Promise<SocialMentionsFile> {
  if (!shouldUseS3()) return readSocialMentions(platform);
  return await readS3SocialMentions(platform);
}

export async function writeSocialMentions(platform: SocialPlatform, file: SocialMentionsFile) {
  if (shouldUseS3()) {
    await writeS3SocialMentions(platform, file);
    return file;
  }

  const config = platformConfig[platform];
  fs.mkdirSync(path.dirname(config.path), { recursive: true });
  fs.writeFileSync(config.path, `${JSON.stringify(file, null, 2)}\n`);
  return file;
}

export async function replaceSocialMentionsFromCsv(platform: SocialPlatform, csvText: string, originalFileName = '') {
  return writeSocialMentions(platform, parseSocialMentionsCsv(platform, csvText, originalFileName));
}

export function readAllSocialMentions() {
  return {
    x: readSocialMentions('x'),
    reddit: readSocialMentions('reddit'),
    stocktwits: readSocialMentions('stocktwits'),
  };
}

export async function readAllSocialMentionsForOperations() {
  const [x, reddit, stocktwits] = await Promise.all([
    readSocialMentionsForOperations('x'),
    readSocialMentionsForOperations('reddit'),
    readSocialMentionsForOperations('stocktwits'),
  ]);
  return { x, reddit, stocktwits };
}
