import { NextResponse } from 'next/server';
import { buildCompany } from '@/lib/mock-data';
import { getCompanyByTicker, readDB, writeDB } from '@/lib/db';

export async function GET(_: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await context.params;
  const existing = getCompanyByTicker(ticker) ?? buildCompany(ticker);
  if (!getCompanyByTicker(ticker)) {
    const db = readDB();
    db.companies.push(existing);
    writeDB(db);
  }
  return NextResponse.json({ company: existing });
}
