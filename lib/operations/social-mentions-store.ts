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

export function writeSocialMentions(platform: SocialPlatform, file: SocialMentionsFile) {
  const config = platformConfig[platform];
  fs.mkdirSync(path.dirname(config.path), { recursive: true });
  fs.writeFileSync(config.path, `${JSON.stringify(file, null, 2)}\n`);
  return file;
}

export function replaceSocialMentionsFromCsv(platform: SocialPlatform, csvText: string, originalFileName = '') {
  return writeSocialMentions(platform, parseSocialMentionsCsv(platform, csvText, originalFileName));
}

export function readAllSocialMentions() {
  return {
    x: readSocialMentions('x'),
    reddit: readSocialMentions('reddit'),
    stocktwits: readSocialMentions('stocktwits'),
  };
}
