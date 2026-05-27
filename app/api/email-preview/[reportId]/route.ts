import { NextResponse } from 'next/server';
import { buildEmailPreviewHtml } from '@/lib/email';
import { readDB } from '@/lib/db';
import { buildReports } from '@/lib/mock-data';

export async function GET(_: Request, context: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await context.params;
  const db = readDB();
  const report = db.reports.find(r => r.id === reportId) ?? db.reports[0] ?? buildReports('CURR')[0];
  return new NextResponse(buildEmailPreviewHtml(report), { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
