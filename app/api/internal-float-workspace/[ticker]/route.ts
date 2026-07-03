import { NextResponse } from 'next/server';
import { readImportFile, writeImportJson, type ImportEnvelope } from '@/lib/import-data';
import {
  defaultInternalFloatV2UserInput,
  internalFloatV2UserInputPaths,
  internalFloatWorkspaceId,
  selectInternalFloatWorkspaceInput,
  type InternalFloatV2UserInput,
} from '@/lib/internal-float';
import { normalizeTicker } from '@/lib/ticker-data';
import {
  buildInternalFloatActivity,
  type InternalFloatEditableSection,
} from '@/lib/internal-float-audit';

export const dynamic = 'force-dynamic';

type UserInputsEnvelope = {
  users: InternalFloatV2UserInput[];
};

function unauthorized(message: string, status = 401) {
  return NextResponse.json({ message }, { status });
}

function actorFromToken(authorization: string) {
  try {
    const payload = authorization.replace(/^Bearer\s+/i, '').split('.')[1];
    if (!payload) return 'Authenticated user';
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
    return String(decoded.email || decoded.name || decoded.nickname || decoded.sub || 'Authenticated user');
  } catch {
    return 'Authenticated user';
  }
}

async function authenticatedActor(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
  if (!apiGatewayUrl) return actorFromToken(authorization);
  try {
    const response = await fetch(`${apiGatewayUrl}/profile`, {
      cache: 'no-store',
      headers: { Authorization: authorization },
    });
    if (!response.ok) return actorFromToken(authorization);
    const profile = await response.json() as Record<string, unknown>;
    return String(profile.email || profile.name || profile.nickname || profile.sub || actorFromToken(authorization));
  } catch {
    return actorFromToken(authorization);
  }
}

async function authorizeTicker(request: Request, ticker: string) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return false;
  const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
  if (!apiGatewayUrl) throw new Error('Missing API Gateway configuration.');

  const response = await fetch(`${apiGatewayUrl}/user-inputs?ticker=${encodeURIComponent(ticker)}`, {
    cache: 'no-store',
    headers: { Authorization: authorization },
  });
  return response.ok;
}

async function readWorkspaceEnvelope(ticker: string) {
  const paths = internalFloatV2UserInputPaths(ticker);
  for (const path of paths) {
    try {
      const envelope = await readImportFile<UserInputsEnvelope>(path);
      return { path, envelope };
    } catch {
      // Try the next compatibility path.
    }
  }
  throw new Error(`No Internal Float input file found for ${ticker}.`);
}

function workspaceInput(envelope: ImportEnvelope<UserInputsEnvelope>, ticker: string) {
  const users = Array.isArray(envelope.data?.users) ? envelope.data.users : [];
  return users.length
    ? selectInternalFloatWorkspaceInput(users, ticker)
    : { ...defaultInternalFloatV2UserInput, userId: internalFloatWorkspaceId(ticker), workspaceId: ticker, ticker };
}

export async function GET(request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker: rawTicker } = await context.params;
  const ticker = normalizeTicker(rawTicker);
  if (!await authorizeTicker(request, ticker)) return unauthorized('You do not have access to this workspace.', 403);

  const { envelope } = await readWorkspaceEnvelope(ticker);
  return NextResponse.json(workspaceInput(envelope, ticker), {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

export async function PUT(request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker: rawTicker } = await context.params;
  const ticker = normalizeTicker(rawTicker);
  if (!await authorizeTicker(request, ticker)) return unauthorized('You do not have access to this workspace.', 403);

  const body = await request.json() as { section?: InternalFloatEditableSection; rows?: unknown };
  if (!body.section || !['privateHoldings', 'tokenChains', 'collateralChains'].includes(body.section)) {
    return NextResponse.json({ message: 'Invalid Internal Float section.' }, { status: 400 });
  }
  if (!Array.isArray(body.rows)) {
    return NextResponse.json({ message: 'Rows must be an array.' }, { status: 400 });
  }

  const { path, envelope } = await readWorkspaceEnvelope(ticker);
  const users = Array.isArray(envelope.data?.users) ? envelope.data.users : [];
  const current = workspaceInput(envelope, ticker);
  const section = body.section;
  const currentRows = Array.isArray(current[section]) ? current[section] as unknown as Record<string, unknown>[] : [];
  const nextRows = body.rows as Record<string, unknown>[];
  const actor = await authenticatedActor(request);
  const activity = buildInternalFloatActivity(section, currentRows, nextRows, actor);
  const updated: InternalFloatV2UserInput = {
    ...current,
    [section]: body.rows,
    activityLog: [...activity, ...(current.activityLog ?? [])],
  };
  const workspaceUserId = internalFloatWorkspaceId(ticker);
  const nextUsers = [
    ...users.filter(row => row.userId !== workspaceUserId && row.workspaceId !== ticker),
    updated,
  ];
  const now = new Date().toISOString();

  await writeImportJson(path, {
    ...envelope,
    ticker,
    importedAt: now,
    asOfDate: now.slice(0, 10),
    recordCount: nextUsers.length,
    notes: 'Workspace-scoped Internal Float inputs shared by all authorized ticker users.',
    data: { ...envelope.data, users: nextUsers },
  });

  return NextResponse.json(updated, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
