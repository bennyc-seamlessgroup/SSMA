import { redirect } from 'next/navigation';

export default async function ObsoleteDashboardPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  redirect(`/monitor/${encodeURIComponent(ticker)}/dashboard-v2`);
}
