import { redirect } from 'next/navigation';

export default async function CustomAlertSettingsPage({ params }: Readonly<{ params: Promise<{ ticker: string }> }>) {
  const { ticker } = await params;
  redirect(`/monitor/${ticker}/alert-rules`);
}
