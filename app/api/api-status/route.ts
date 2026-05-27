import { NextResponse } from 'next/server';
import { listApiStatus } from '@/lib/db';

export async function GET() {
  return NextResponse.json({ api_status: listApiStatus() });
}
