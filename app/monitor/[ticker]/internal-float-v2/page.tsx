import { redirect } from 'next/navigation';

export default async function InternalFloatCompatibilityPage({
  params,
}: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  redirect(`/monitor/${encodeURIComponent(ticker)}/internal-float`);
}
