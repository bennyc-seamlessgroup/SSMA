import { redirect } from 'next/navigation';

export default async function ManualFloatInputsPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  redirect(`/monitor/${ticker}/internal-float`);
}
