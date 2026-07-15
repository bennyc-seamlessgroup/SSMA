import { redirect } from 'next/navigation';
import { normalizeTicker } from '@/lib/ticker-data';

export default async function WorkspacePortalPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  redirect(`/monitor/${normalizeTicker(ticker)}/dashboard-v2`);
}
