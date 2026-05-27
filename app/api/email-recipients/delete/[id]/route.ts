import { NextResponse } from 'next/server';
import { deleteRecipient, getRecipientsByTicker } from '@/lib/db';

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const removed = deleteRecipient(id);
  const ticker = removed?.company_id.replace('company-', '') ?? 'CURR';
  return NextResponse.json({ ok: true, recipients: getRecipientsByTicker(ticker) });
}
