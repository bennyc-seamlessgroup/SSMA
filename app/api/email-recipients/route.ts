import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { addRecipient, getRecipientsByTicker } from '@/lib/db';
import { normalizeTicker } from '@/lib/mock-data';
import type { EmailRecipient } from '@/lib/types';

export async function POST(request: Request) {
  const body = await request.json();
  const ticker = normalizeTicker(body.ticker ?? 'CURR');
  const recipient: EmailRecipient = {
    id: randomUUID(),
    company_id: `company-${ticker}`,
    email: String(body.email || '').trim(),
    receive_8am: Boolean(body.receive_8am),
    receive_1150am: Boolean(body.receive_1150am),
    receive_7pm: Boolean(body.receive_7pm),
    active: true,
    created_at: new Date().toISOString(),
    source_type: 'mock',
    source_label: 'Platform-managed data',
  };
  addRecipient(recipient);
  return NextResponse.json({ ok: true, recipients: getRecipientsByTicker(ticker) });
}
