'use client';

import { authenticatedFetch } from '@/lib/auth-client';

export type SocialPlatform = 'Reddit' | 'X' | 'Facebook' | 'Linkedin' | 'Stocktwits';

export type SocialMention = {
  id: string;
  key: string;
  platform: SocialPlatform;
  query: string;
  timestamp: string;
  url: string;
  author: string;
  text: string;
  sentiment_label: string;
  sentiment_score: number | null;
  catalyst_tag: string;
  followers: number | null;
  likes: number | null;
  comments: number | null;
  retweets: number | null;
  reshares: number | null;
  upvotes: number | null;
  subreddit: string;
  raw: Record<string, unknown>;
};

export type SocialDataPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type SocialDataPage = {
  records: SocialMention[];
  pagination: SocialDataPagination;
  raw: unknown;
};

export type SentimentCurrentPayload = Record<string, unknown>;
export type SentimentEventsPayload = Record<string, unknown>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown) {
  return value == null ? '' : String(value);
}

function numberOrNull(value: unknown) {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeSocialPlatform(value: unknown): SocialPlatform {
  const normalized = text(value).trim().toLowerCase();
  if (normalized === 'twitter' || normalized === 'x') return 'X';
  if (normalized === 'facebook') return 'Facebook';
  if (normalized === 'linkedin' || normalized === 'linked_in') return 'Linkedin';
  if (normalized === 'stocktwits') return 'Stocktwits';
  return 'Reddit';
}

export function normalizeSocialMention(value: unknown): SocialMention {
  const row = record(value);
  const key = text(row.key);
  const id = text(row.id ?? row.messages__id ?? key);

  return {
    id,
    key,
    platform: normalizeSocialPlatform(row.platform),
    query: text(row.query),
    timestamp: text(row.datetime ?? row.timestamp ?? row.date ?? row.eventDate ?? row.event_date ?? row.createdAt ?? row.created_at),
    url: text(row.link ?? row.url),
    author: text(row.author ?? row.username ?? row.user__username),
    text: text(row.content ?? row.text ?? row.message ?? row.summary),
    sentiment_label: text(row.sentiment ?? row.sentimentLabel ?? row.sentiment_label ?? row.analysis_sentiment),
    sentiment_score: numberOrNull(row.score ?? row.sentimentScore ?? row.sentiment_score ?? row.analysis_sentiment_score),
    catalyst_tag: text(row.analysis_catalyst_tag ?? row.catalyst_tag),
    followers: numberOrNull(row.user__followers ?? row.followers),
    likes: numberOrNull(row.likes),
    comments: numberOrNull(row.comments ?? row.replies),
    retweets: numberOrNull(row.retweets ?? row.Retweets),
    reshares: numberOrNull(row.reshares ?? row.Reshares),
    upvotes: numberOrNull(row.upvotes ?? row.score),
    subreddit: text(row.subreddit),
    raw: row,
  };
}

function pagination(value: unknown, fallbackPage: number, fallbackLimit: number, recordCount: number): SocialDataPagination {
  const row = record(value);
  const page = numberOrNull(row.page) ?? fallbackPage;
  const limit = numberOrNull(row.limit) ?? fallbackLimit;
  const totalItems = numberOrNull(row.totalItems ?? row.total_items) ?? recordCount;
  const totalPages = numberOrNull(row.totalPages ?? row.total_pages) ?? Math.max(1, Math.ceil(totalItems / Math.max(limit, 1)));
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: Boolean(row.hasNextPage ?? row.has_next_page ?? page < totalPages),
    hasPreviousPage: Boolean(row.hasPreviousPage ?? row.has_previous_page ?? page > 1),
  };
}

export async function getSocialDataPage({
  ticker,
  platform,
  page = 1,
  limit = 100,
}: {
  ticker: string;
  platform?: SocialPlatform;
  page?: number;
  limit?: number;
}): Promise<SocialDataPage> {
  const params = new URLSearchParams({
    ticker,
    page: String(page),
    limit: String(limit),
  });
  if (platform) params.set('platform', platform === 'X' ? 'Twitter' : platform === 'Linkedin' ? 'LinkedIn' : platform);
  const raw = await authenticatedFetch(`/social-data?${params.toString()}`);
  const payload = record(raw);
  const records = Array.isArray(payload.records) ? payload.records.map(normalizeSocialMention) : [];
  return {
    records,
    pagination: pagination(payload.pagination, page, limit, records.length),
    raw,
  };
}

export async function getAllSocialData(ticker: string, maxPages = 50) {
  const first = await getSocialDataPage({ ticker, page: 1, limit: 100 });
  const pages = Math.min(first.pagination.totalPages, maxPages);
  if (pages <= 1) return { records: first.records, pages: [first.raw], pagination: first.pagination };

  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) => getSocialDataPage({ ticker, page: index + 2, limit: 100 })),
  );
  return {
    records: [first, ...rest].flatMap(result => result.records),
    pages: [first.raw, ...rest.map(result => result.raw)],
    pagination: first.pagination,
  };
}

export async function getSentimentCurrent(ticker: string) {
  return authenticatedFetch(
    `/market-data/current?ticker=${encodeURIComponent(ticker)}&category=sentiment-current`,
    { cache: 'no-store' },
  ) as Promise<SentimentCurrentPayload>;
}

export async function getSentimentEvents(ticker: string) {
  return authenticatedFetch(
    `/market-data/history?ticker=${encodeURIComponent(ticker)}&category=sentiment-events`,
    { cache: 'no-store' },
  ) as Promise<SentimentEventsPayload>;
}

export async function uploadStocktwitsCsv(ticker: string, file: File) {
  const formData = new FormData();
  formData.append('ticker', ticker);
  formData.append('file', file);
  return authenticatedFetch(`/social-data?ticker=${encodeURIComponent(ticker)}`, {
    method: 'POST',
    body: formData,
  }) as Promise<{ message?: string; uploadedCount?: number }>;
}

export function recordsFromSentimentEvents(payload: unknown): SocialMention[] {
  const root = record(payload);
  const row = Object.keys(record(root.data)).length ? record(root.data) : root;
  const records = Array.isArray(row.records) ? row.records : [];
  return records.map(normalizeSocialMention);
}

export function sentimentPeriod(payload: unknown, range: string) {
  const payloadRecord = record(payload);
  const root = Object.keys(record(payloadRecord.data)).length ? record(payloadRecord.data) : payloadRecord;
  const periods = record(root.periods);
  return record(periods[range] ?? periods[range.toLowerCase()] ?? periods[range.toUpperCase()]);
}
