import { redirect } from 'next/navigation';

export default async function DashboardCompatibilityPage({
  params,
}: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  redirect(`/monitor/${encodeURIComponent(ticker)}/dashboard`);
}
