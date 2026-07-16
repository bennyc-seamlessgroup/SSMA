import { redirect } from 'next/navigation';
import { normalizeTicker } from '@/lib/ticker-data';

export default async function DailyMarketActivityPage({ params }: Readonly<{ params: Promise<{ ticker: string; date: string }> }>) {
  const { ticker } = await params;
  redirect(`/monitor/${normalizeTicker(ticker)}/dashboard`);
}
