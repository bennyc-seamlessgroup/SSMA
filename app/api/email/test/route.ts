import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ ok: true, message: 'Test email request accepted. Delivery provider configuration is managed by the account administrator.' });
}
